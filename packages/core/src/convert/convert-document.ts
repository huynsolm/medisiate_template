import { parse } from 'parse5';
import type { Diagnostic, FileStatus, ImageKind, PageMeta, PageModel, SectionModel, Theme } from '../model/index.ts';
import { renderPage } from '../page/render-page.ts';
import { attr, descendants, hasClass, parseHtmlFragment, type DomElement, type DomNode, type SourceSection } from '../parse/dom.ts';
import { sectionTypeId } from '../parse/sections.ts';
import { classesOf } from '../parse/dom.ts';
import { classifyImageSrc } from '../helpers/image-ref.ts';
import { richTextToPlain, safeHref } from '../html/rich-text.ts';
import { fallbackFromSource } from '../types/fallback.ts';
import { ownVisibility, VIEWS, type View } from '../parse/common.ts';
import type { TypeRegistry } from '../types/definition.ts';
import type { FluidRange } from '../helpers/fluid.ts';

export interface ConvertOptions {
  registry: TypeRegistry;
  theme: Theme;
  coreVersion: string;
  hostCss: PageMeta['hostCss'];
  fluidRange?: FluidRange;
}

export interface ImageRecord {
  sectionIndex: number | null;
  src: string;
  kind: ImageKind;
}

export interface ConvertResult {
  page: PageModel;
  html: string;
  status: FileStatus;
  images: ImageRecord[];
  fallbackCount: number;
}

const SSI = /<!--#[a-z]+[\s\S]*?-->/giu;
/** 조각 파일이라 항상 나오는 오류는 복구로 치지 않는다 */
const BENIGN_PARSE_ERRORS = new Set(['missing-doctype']);

/** 상태 판정: error 또는 전부 fallback → failed, warn 또는 fallback 1개 이상 → partial */
export function fileStatus(diagnostics: Diagnostic[], sectionCount: number, fallbackCount: number): FileStatus {
  if (diagnostics.some((d) => d.level === 'error') || (sectionCount > 0 && fallbackCount === sectionCount)) return 'failed';
  if (fallbackCount > 0 || diagnostics.some((d) => d.level === 'warn')) return 'partial';
  return 'success';
}

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
/** 끝 태그를 생략해도 되는 요소와 파서가 스스로 만드는 요소 */
const OPTIONAL_END = new Set(['html', 'head', 'body', 'p', 'li', 'dt', 'dd', 'option', 'optgroup', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot', 'colgroup', 'rt', 'rp']);

/**
 * parse5는 트리 구성 단계의 복구를 알려주지 않는다.
 * 원문 끝 태그 수와 트리에 반영된 끝 태그 수를 비교하고, 닫히지 않은 요소를 찾는다.
 */
function treeRecoveries(doc: DomNode, html: string): Array<{ code: string; line: number; col: number }> {
  const out: Array<{ code: string; line: number; col: number }> = [];
  const elements = descendants(doc);
  const plain = html.replace(/<!--[\s\S]*?-->/gu, '').replace(/<(script|style)\b[\s\S]*?<\/\1>/giu, '');
  const sourceEnd = (plain.match(/<\/[a-z][a-z0-9-]*\s*>/giu) ?? []).length;
  const scriptStyleEnd = elements.filter((el) => (el.tagName === 'script' || el.tagName === 'style') && el.sourceCodeLocation?.endTag).length;
  const treeEnd = elements.filter((el) => el.sourceCodeLocation?.endTag).length - scriptStyleEnd;
  if (sourceEnd !== treeEnd) out.push({ code: 'misplaced-end-tag', line: 0, col: 0 });
  for (const el of elements) {
    const loc = el.sourceCodeLocation;
    if (!loc || loc.endTag || VOID_TAGS.has(el.tagName) || OPTIONAL_END.has(el.tagName)) continue;
    out.push({ code: `unclosed-${el.tagName}`, line: loc.startLine, col: loc.startCol });
  }
  return out;
}

export function convertDocument(input: string, file: string, options: ConvertOptions): ConvertResult {
  const diagnostics: Diagnostic[] = [];
  const ssi = input.match(SSI) ?? [];
  for (const directive of ssi) {
    diagnostics.push({ level: 'info', code: 'SSI_REMOVED', message: 'SSI 지시문 제거', detail: { directive } });
  }
  const html = input.replace(SSI, '');

  const parseErrors: Array<{ code: string; line: number; col: number }> = [];
  const doc = parse(html, {
    sourceCodeLocationInfo: true,
    onParseError: (err) => {
      if (!BENIGN_PARSE_ERRORS.has(err.code)) parseErrors.push({ code: err.code, line: err.startLine, col: err.startCol });
    },
  });
  parseErrors.push(...treeRecoveries(doc, html));
  if (parseErrors.length) {
    diagnostics.push({
      level: 'info',
      code: 'PARSE_RECOVERED',
      message: `HTML 파서가 깨진 마크업 ${parseErrors.length}곳을 복구함`,
      location: { line: parseErrors[0]!.line, col: parseErrors[0]!.col },
      detail: { errors: parseErrors },
    });
  }

  const container = descendants(doc, (el) => hasClass(el, 'cms-container'))[0];
  const sectionEls = container ? descendants(container, (el) => el.tagName === 'section' && hasClass(el, 'cms')) : [];
  const sources: SourceSection[] = sectionEls.map((element, i) => {
    const classList = classesOf(element);
    const line = element.sourceCodeLocation?.startLine;
    return { file, index: i + 1, classList, typeId: sectionTypeId(classList), element, ...(line ? { line } : {}) };
  });

  const sections: SectionModel[] = [];
  if (!sources.length) {
    const body = descendants(doc, (el) => el.tagName === 'body')[0] as DomElement;
    diagnostics.push({
      level: 'warn',
      code: 'NON_CONTENT_FILE',
      message: container ? '.cms-container 안에 section.cms가 없음' : '.cms-container가 없는 비콘텐츠 파일',
    });
    sections.push(fallbackFromSource({ file, index: 1, classList: [], typeId: null, element: container ?? body }, 's1', '콘텐츠 섹션 없음'));
  }

  for (const src of sources) {
    const id = `s${src.index}`;
    const def = options.registry.match(src);
    if (!def?.parse) {
      diagnostics.push({
        level: 'warn',
        code: 'UNSUPPORTED_TYPE',
        message: `아직 지원하지 않는 섹션: ${src.typeId ?? src.classList.join(' ')}`,
        sectionIndex: src.index,
        ...(src.line ? { location: { line: src.line, col: 1 } } : {}),
      });
      sections.push(fallbackFromSource(src, id, src.typeId ? '미구현 타입' : '타입 번호 없음'));
      continue;
    }
    const result = def.parse(src, { diagnostics });
    diagnostics.push(...result.diagnostics);
    if (result.fallbackReason) {
      diagnostics.push({ level: 'warn', code: 'LOSSY_PARSE', message: `${def.id}: ${result.fallbackReason} → 원본을 fallback으로 보존`, sectionIndex: src.index });
      sections.push(fallbackFromSource(src, id, result.fallbackReason));
      continue;
    }
    const section: SectionModel = {
      id,
      type: def.id,
      variant: result.variant,
      modifiers: result.modifiers,
      data: result.data,
      source: { file: src.file, index: src.index, classList: src.classList },
    };
    // 글을 모두 담았어도 순서가 바뀔 수 있다(예: 버튼 뒤 문단이 버튼 앞으로). 이 섹션만 출력해 원본과 글 순서를 비교하고,
    // 다르면 원본을 보존한다 (실제 원본 대조 재검수 R-I-2, I-3). 비교 규칙은 real-pages 테스트와 같다.
    const reordered = textOrderDiffers(src.element, section, options, def.orderCheckIgnores);
    if (reordered) {
      diagnostics.push({ level: 'warn', code: 'LOSSY_PARSE', message: `${def.id}: ${reordered} → 원본을 fallback으로 보존`, sectionIndex: src.index });
      sections.push(fallbackFromSource(src, id, reordered));
      continue;
    }
    sections.push(section);
  }

  const titleSection = sections.find((s) => s.type === 'type00');
  const title = titleSection ? richTextToPlain((titleSection.data as { title: string }).title) : undefined;

  const page: PageModel = {
    version: 1,
    source: file,
    ...(title ? { title } : {}),
    theme: options.theme,
    sections,
    diagnostics,
    meta: { coreVersion: options.coreVersion, hostCss: options.hostCss },
  };

  const rendered = renderPage(page, { registry: options.registry, ...(options.fluidRange ? { fluidRange: options.fluidRange } : {}) });
  page.diagnostics = [...diagnostics, ...rendered.diagnostics];
  // 파싱 단계 fallback + 렌더 단계 검증 실패 fallback 모두 rendered.fallbackCount에 들어 있다
  const fallbackCount = rendered.fallbackCount;

  const scope = container ?? doc;
  const images: ImageRecord[] = descendants(scope, (el) => el.tagName === 'img').map((el) => {
    const owner = sectionEls.findIndex((s) => s === el || descendants(s).includes(el));
    const src = attr(el, 'src') ?? '';
    return { sectionIndex: owner >= 0 ? owner + 1 : null, src, kind: classifyImageSrc(src) };
  });

  return {
    page,
    html: rendered.html,
    status: fileStatus(page.diagnostics, sections.length, fallbackCount),
    images,
    fallbackCount,
  };
}

type Run = [href: string, text: string];
type Segment = { kind: 't'; runs: Run[]; soft: Set<number> } | { kind: 'i'; href: string; src: string };

const BLOCK_TAGS = new Set(['p', 'div', 'li', 'dt', 'dd', 'td', 'th', 'tr', 'caption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'article', 'header', 'footer', 'ul', 'ol', 'dl', 'table', 'figure', 'blockquote', 'pre', 'address', 'aside', 'nav', 'main']);

/**
 * 한 화면(PC 또는 MO)에서 보이는 내용을 글 덩어리·이미지 순서로 나눈다.
 * - 블록 요소가 덩어리를 나눈다. <br>은 나누지 않는다(같은 덩어리 안의 줄바꿈).
 * - 덩어리 = 글 조각 목록([링크 주소, 공백 없는 글]). 같은 링크의 이어진 글은 합친다.
 * - 이미지 = 따로 하나의 덩어리(링크 주소, 이미지 주소).
 * - 다른 화면 전용 요소(원본 d-lg-none/d-lg-block 등, 출력 common-display-pc/mo)는 그 화면에서 뺀다.
 *   그래서 PC/MO 대안 이미지는 각 화면에 하나씩만 남아 나열 순서가 비교에 영향을 주지 않고,
 *   동시에 보이는 독립 이미지들의 앞뒤는 그대로 비교된다(6차 재검수 I-2).
 * - 원본 쪽 위험한 링크는 출력에서 링크를 빼므로(UNSAFE_LINK_REMOVED) 링크 없는 글로 본다.
 * - ignore가 고른 원본 요소(호스트 CSS가 다시 그리는 표시)와 주석·script·style·template은 뺀다.
 */
function segments(node: DomNode, view: View, ignore: ((el: DomElement) => boolean) | undefined, href = '', out: Segment[] = [], state = { open: false }): Segment[] {
  const close = () => { state.open = false; };
  // 열린 글 덩어리 안의 지금 위치를 "구분 자리"로 기록한다(<br>, 줄 안 요소의 시작·끝). 덩어리 합치기는 이 자리에서만 허용된다
  const mark = () => {
    const last = out[out.length - 1];
    if (state.open && last && last.kind === 't') last.soft.add(runText(last.runs).length);
  };
  if (node.nodeName === '#text') {
    const text = ((node as { value?: string }).value ?? '').replace(/\s+/gu, '');
    if (!text) return out;
    let last = out[out.length - 1];
    if (!state.open || !last || last.kind !== 't') {
      last = { kind: 't', runs: [], soft: new Set() };
      out.push(last);
      state.open = true;
    }
    const runs = last.runs;
    const prev = runs[runs.length - 1];
    if (prev && prev[0] === href) prev[1] += text;
    else runs.push([href, text]);
    return out;
  }
  if (!('childNodes' in node)) return out;
  let link = href;
  let block = false;
  if ('tagName' in node) {
    const el = node as DomElement;
    if (['script', 'style', 'template'].includes(el.tagName) || ignore?.(el)) return out;
    if (ownVisibility(el)?.[view] === false) return out;
    if (el.tagName === 'br') {
      mark();
      return out;
    }
    if (el.tagName === 'img') {
      close();
      out.push({ kind: 'i', href, src: attr(el, 'src') ?? '' });
      return out;
    }
    if (el.tagName === 'a') link = safeHref(attr(el, 'href')) ?? href;
    block = BLOCK_TAGS.has(el.tagName);
  }
  const inline = !block && 'tagName' in node;
  if (block) close();
  if (inline) mark();
  for (const child of node.childNodes as DomNode[]) segments(child, view, ignore, link, out, state);
  if (inline) mark();
  if (block) close();
  return out;
}

const joinRuns = (list: Run[][]): Run[] => {
  const out: Run[] = [];
  for (const runs of list) for (const [h, t] of runs) {
    const prev = out[out.length - 1];
    if (prev && prev[0] === h) prev[1] += t;
    else out.push([h, t]);
  }
  return out;
};
const sameRuns = (a: Run[], b: Run[]) => a.length === b.length && a.every((r, i) => r[0] === b[i]![0] && r[1] === b[i]![1]);
const runText = (runs: Run[]) => runs.map((r) => r[1]).join('');
const showSeg = (s: Segment | undefined) => (!s ? '(없음)' : s.kind === 'i' ? `이미지 ${s.src.slice(-30)}${s.href ? ' (링크)' : ''}` : `"${runText(s.runs).slice(0, 24)}"${s.runs.some((r) => r[0]) ? ' (링크 포함)' : ''}`);

/**
 * 출력 덩어리 하나하나가 원본에서 **연속된 덩어리 몇 개를 이어 붙인 것**과 정확히 같아야 한다.
 * 원본 문단 둘 → 출력 한 문단(줄바꿈)·머리글 두 블록 → 줄 안 요소 묶음 같은 합침은 허용하고,
 * 덩어리의 앞뒤가 바뀌면(같은 글자라도) 맞지 않는다(6차 재검수 I-1). 맞지 않는 첫 자리를 돌려준다.
 */
function matchSegments(source: Segment[], output: Segment[]): string | undefined {
  let i = 0;
  for (const o of output) {
    const s = source[i];
    if (!s) return `원본에 없는 ${showSeg(o)}`;
    if (o.kind === 'i' || s.kind === 'i') {
      if (o.kind !== s.kind || (o.kind === 'i' && s.kind === 'i' && (o.href !== s.href || o.src !== s.src))) return `원본 ${showSeg(s)} 자리에 출력 ${showSeg(o)}`;
      i++;
      continue;
    }
    const target = runText(o.runs);
    const parts: Run[][] = [];
    let k = i;
    while (k < source.length && source[k]!.kind === 't' && runText(joinRuns(parts)).length < target.length) {
      parts.push((source[k] as { runs: Run[] }).runs);
      k++;
    }
    if (!sameRuns(joinRuns(parts), o.runs)) return `원본 ${showSeg(s)} 자리에 출력 ${showSeg(o)}`;
    // 원본 덩어리 여럿을 합쳤다면, 출력에서 이어 붙인 자리마다 실제 구분(<br>, 요소 경계)이 있어야 한다 (7차 재검수 I-2)
    let join = 0;
    for (const part of parts.slice(0, -1)) {
      join += runText(part).length;
      if (!o.soft.has(join)) return `원본 덩어리 여럿이 출력 ${showSeg(o)} 안에 구분 없이 합쳐짐`;
    }
    i = k;
  }
  return i < source.length ? `출력에 없는 원본 ${showSeg(source[i])}` : undefined;
}

export function textOrderDiffers(element: DomElement, section: SectionModel, options: ConvertOptions, ignore?: (el: DomElement) => boolean): string | undefined {
  const single: PageModel = {
    version: 1, theme: options.theme, sections: [section], diagnostics: [],
    meta: { coreVersion: options.coreVersion, hostCss: options.hostCss },
  };
  // orderCheck: 렌더러가 원본에 없는 생성 글(type24 순서 번호 등)을 빼고, CSS로 화면 순서를 뒤집는 타입(type30)은 화면 순서대로 출력한다
  const rendered = renderPage(single, { registry: options.registry, orderCheck: true });
  if (rendered.fallbackCount > 0) return undefined; // 데이터 검증 실패는 아래 전체 렌더가 INVALID_DATA로 따로 보고한다
  const outputRoot = parseHtmlFragment(rendered.html) as unknown as DomNode;
  for (const view of VIEWS) {
    const problem = matchSegments(segments(element, view, ignore), segments(outputRoot, view, undefined));
    if (problem) return `원본과 글 순서가 다름(${{ pc: 'PC', tablet: '태블릿', mo: '모바일' }[view]} 화면): ${problem}`;
  }
  return undefined;
}
