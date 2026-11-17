import { parse } from 'parse5';
import type { Diagnostic, FileStatus, ImageKind, PageMeta, PageModel, SectionModel, Theme } from '../model/index.ts';
import { renderPage } from '../page/render-page.ts';
import { ancestors as ancestorsOf, attr, children, descendants, hasClass, parseHtmlFragment, type DomElement, type DomNode, type SourceSection } from '../parse/dom.ts';
import { sectionTypeId } from '../parse/sections.ts';
import { classesOf } from '../parse/dom.ts';
import { classifyImageSrc } from '../helpers/image-ref.ts';
import { richTextToPlain, safeHref } from '../html/rich-text.ts';
import { fallbackFromSource } from '../types/fallback.ts';
import { hostVisibilityOf, resetReads, richFrom, scanSection, TEXT_BLOCKS, TEXT_INLINE, visibilityOf, VIEWS, type Shown, type View } from '../parse/common.ts';
import type { TypeDefinition, TypeRegistry } from '../types/definition.ts';
import { STRUCTURE_CLASSES } from '../types/structure-classes.ts';
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

type Attempt = { section: SectionModel; diagnostics: Diagnostic[] } | { reason: string; diagnostics: Diagnostic[] };

/** 한 타입으로 옮겨 본다. 글·이미지를 모두 담고(parse) 원본과 글 순서가 같아야(textOrderDiffers) 성공이다 */
function attempt(def: TypeDefinition<unknown>, src: SourceSection, id: string, options: ConvertOptions): Attempt {
  const local: Diagnostic[] = [];
  resetReads(src.element);
  const result = def.parse!(src, { diagnostics: local });
  const diagnostics = [...local, ...result.diagnostics];
  if (result.fallbackReason) return { reason: result.fallbackReason, diagnostics };
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
  if (reordered) return { reason: reordered, diagnostics };
  return { section, diagnostics };
}

/**
 * 본문 앞뒤 설명 상자를 떼고 옮겨 본다. 원본 .cms-inner 바로 아래의 .cms-description-box 중
 * 본문(머리글·설명 상자가 아닌 자식)보다 모두 앞에 있는 것은 intro, 모두 뒤에 있는 것은 note가 된다.
 * 본문 사이에 끼인 상자, 글로 옮길 수 없는 구조(목록·표·이미지)가 든 상자가 있으면 시도하지 않는다.
 * 상자를 뗀 나머지는 타입의 손실 검사(finish)를 받고, 설명을 붙인 결과 전체는 원본 전체와 글 순서 검사를 받는다.
 */
function attemptWithNotes(def: TypeDefinition<unknown>, src: SourceSection, id: string, options: ConvertOptions): { section: SectionModel; diagnostics: Diagnostic[] } | undefined {
  const inner = children(src.element).find((el) => hasClass(el, 'cms-inner')) ?? src.element;
  const kids = children(inner);
  const isBox = (el: DomElement) => hasClass(el, 'cms-description-box');
  const main = kids.filter((el) => !isBox(el) && !hasClass(el, 'cms-header'));
  const boxes = kids.filter(isBox);
  if (!boxes.length || !main.length) return undefined;
  const firstMain = kids.indexOf(main[0]!);
  const lastMain = kids.indexOf(main[main.length - 1]!);
  if (boxes.some((b) => kids.indexOf(b) > firstMain && kids.indexOf(b) < lastMain)) return undefined;
  if (boxes.some((b) => descendants(b).some((d) => !TEXT_BLOCKS.has(d.tagName) && !TEXT_INLINE.has(d.tagName)) || descendants(b).some((d) => d.tagName === 'img'))) return undefined;
  const read = (list: DomElement[]) => list.map((b) => richFrom(b)).filter((t) => richTextToPlain(t).trim() !== '').join('<br>');
  // 상자를 잠시 떼고 parse한다(원본 DOM은 끝나면 그대로 되돌린다)
  const parent = inner as unknown as { childNodes: DomNode[] };
  const saved = [...parent.childNodes];
  let result: ReturnType<NonNullable<TypeDefinition<unknown>['parse']>>;
  const local: Diagnostic[] = [];
  try {
    parent.childNodes = saved.filter((n) => !boxes.includes(n as DomElement));
    resetReads(src.element);
    result = def.parse!(src, { diagnostics: local });
  } finally {
    parent.childNodes = saved;
  }
  if (result.fallbackReason) return undefined;
  const intro = read(boxes.filter((b) => kids.indexOf(b) < firstMain));
  const note = read(boxes.filter((b) => kids.indexOf(b) > lastMain));
  const section: SectionModel = {
    id, type: def.id, variant: result.variant, modifiers: result.modifiers, data: result.data,
    notes: { ...(intro ? { intro } : {}), ...(note ? { note } : {}) },
    source: { file: src.file, index: src.index, classList: src.classList },
  };
  // 설명을 출력하지 않는 타입(프리셋 골격을 쓰지 않는 타입)은 여기서 글이 빠져 걸러진다
  if (textOrderDiffers(src.element, section, options, def.orderCheckIgnores)) return undefined;
  // 상자를 뗀 DOM으로 parse했으므로, 떼어 낸 상자 안의 정리(위험한 링크·버린 style 등) 진단은 상자만 따로 훑어 더한다 (검수 I-2)
  const holder = { nodeName: 'div', tagName: 'div', attrs: [], childNodes: boxes } as unknown as DomElement;
  const boxScan = scanSection({ ...src, element: holder, classList: [] }).diagnostics;
  return { section, diagnostics: [...local, ...result.diagnostics, ...boxScan] };
}

/** 원본 도구의 타입마다 공통인 클래스(구조를 가르지 않음) */
const COMMON_STRUCTURE = new Set(['cms-inner', 'cms-header', 'cms-title', 'cms-eyebrow', 'cms-description', 'cms-description-box', 'cms-visual', 'cms-list-item', 'cms-list-wrap']);

/**
 * 섹션 안의 cms-* 클래스가 모두 어떤 타입의 원본 컴포넌트에 있는 클래스이고, 그 타입을 가르는 구조 클래스(목록·상자 등)를
 * 하나 이상 쓰면 "같은 구조"로 본다. 그런 타입을 레지스트리 순서로 옮겨 보고 처음 성공한 것을 쓴다.
 * 손실·순서 검사는 적힌 타입과 똑같이 적용된다.
 */
function retype(src: SourceSection, id: string, options: ConvertOptions, declared: string | undefined): { section: SectionModel; diagnostics: Diagnostic[] } | undefined {
  const used = new Set(descendants(src.element).flatMap((el) => classesOf(el).filter((c) => c.startsWith('cms-'))));
  for (const def of options.registry.list()) {
    if (!def.parse || def.id === declared) continue;
    const own = STRUCTURE_CLASSES[def.id];
    if (!own) continue;
    const allowed = new Set(own);
    if (![...used].every((c) => allowed.has(c))) continue;
    if (![...used].some((c) => !COMMON_STRUCTURE.has(c))) continue;
    const tried = attempt(def, src, id, options);
    if ('section' in tried) return tried;
  }
  return undefined;
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
    const first = def?.parse ? attempt(def, src, id, options) : undefined;
    if (first && 'section' in first) {
      diagnostics.push(...first.diagnostics);
      sections.push(first.section);
      continue;
    }
    // 타입 구조 밖의 설명 상자(.cms-inner 바로 아래, 본문 앞뒤) 때문에 못 옮겼으면, 상자를 본문 앞뒤 설명(section.notes)으로
    // 떼어 같은 타입으로 다시 옮겨 본다(실제 페이지에서 블록 순서로 가던 섹션 중 가장 흔한 원인)
    const noted = def?.parse && first && 'reason' in first ? attemptWithNotes(def, src, id, options) : undefined;
    if (noted) {
      diagnostics.push(...noted.diagnostics);
      sections.push(noted.section);
      continue;
    }
    // 적힌 타입으로 옮기지 못하면, 구조가 원본 도구의 다른 타입과 같은지 본다 (예: type02로 적혔지만 type17의 행 목록).
    // 원본 CSS는 타입 번호가 아니라 목록·상자 클래스로 모양을 정하므로, 같은 구조의 타입으로 옮기면 모양도 같다.
    const other = retype(src, id, options, def?.id);
    if (other) {
      diagnostics.push(...other.diagnostics, {
        level: 'info', code: 'STRUCTURE_RETYPED', sectionIndex: src.index,
        message: `${src.typeId ?? '타입 없음'} 섹션이 원본 도구의 ${other.section.type} 구조와 같아 ${other.section.type}로 변환`,
        detail: { declared: src.typeId, used: other.section.type, ...(first ? { reason: first.reason } : {}) },
      });
      sections.push(other.section);
      continue;
    }
    // 그래도 못 옮기면 머리글·제목·글·이미지·목록·표를 원본 순서대로 일반 모드로 옮긴다(배치는 호스트 기본 모양).
    // 손실·순서 검사는 같다. 배치가 원본과 달라지므로 warn으로 남겨 파일을 확인 대상(partial)으로 둔다.
    const general = options.registry.get('blocks');
    const simple = general?.parse ? attempt(general, src, id, options) : undefined;
    if (simple && 'section' in simple) {
      // 지원하지 않는 타입은 블록 순서로 옮겨도 목록(unsupported.csv)에 남겨 어떤 타입을 더 만들지 알 수 있게 한다
      if (!first) {
        diagnostics.push({
          level: 'warn', code: 'UNSUPPORTED_TYPE', sectionIndex: src.index,
          message: `아직 지원하지 않는 섹션: ${src.typeId ?? src.classList.join(' ')} (블록 순서로 변환)`,
          ...(src.line ? { location: { line: src.line, col: 1 } } : {}),
        });
      }
      diagnostics.push(...simple.diagnostics, {
        level: 'warn', code: 'LAYOUT_SIMPLIFIED', sectionIndex: src.index,
        message: `${src.typeId ?? '타입 없음'}: ${first ? first.reason : '아직 지원하지 않는 타입'} → 글·이미지·순서는 그대로, 배치는 일반 모드 기본 모양(블록 순서)으로 변환`,
        detail: { declared: src.typeId, ...(first ? { reason: first.reason } : {}) },
      });
      sections.push(simple.section);
      continue;
    }
    if (!first) {
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
    diagnostics.push(...first.diagnostics, { level: 'warn', code: 'LOSSY_PARSE', message: `${def!.id}: ${first.reason} → 원본을 fallback으로 보존`, sectionIndex: src.index });
    sections.push(fallbackFromSource(src, id, first.reason));
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
function segments(node: DomNode, view: View, ignore: ((el: DomElement) => boolean) | undefined, seen: (el: DomElement) => Record<View, Shown>, href = '', out: Segment[] = [], state = { open: false }): Segment[] {
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
    // 조상까지 폭 구간마다 합친 실제 보임으로 뺀다(부모·자식이 서로 다른 구간에서 숨는 경우. 10차 재검수 I-1).
    // 원본은 Bootstrap 규칙, 출력은 호스트 CSS 규칙(seen)으로 본다 (11차 재검수 I-1)
    if (seen(el)[view] === false) return out;
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
  // 줄 안 요소 중 구분 자리로 치는 것은 호스트 역할 클래스(mig-*: 머리글 작은 글·제목 등, 호스트 CSS가 줄을 나눔)가 있는 요소와
  // 인라인 스타일로 블록이 되는 요소(정렬을 옮긴 <span style="display: block">)뿐이다.
  // em·strong·span 같은 서식 요소는 원본에서 옮긴 클래스가 있어도 글자 모양만 바꾸고 줄을 나누지 않으므로 합치기의 근거가 될 수 없다 (8차 재검수 I-3)
  const inline = !block && 'tagName' in node && separates(node as DomElement);
  if (block) close();
  if (inline) mark();
  for (const child of node.childNodes as DomNode[]) segments(child, view, ignore, seen, link, out, state);
  if (inline) mark();
  if (block) close();
  return out;
}

// 입력에서 온 mig-* 클래스는 서식 정리(rich-text)에서 지우므로 출력의 mig-*는 렌더러가 붙인 역할뿐이다 (9차 재검수 I-2)
const separates = (el: DomElement) => classesOf(el).some((c) => c.startsWith('mig-'))
  || /(?:^|;)\s*display\s*:\s*(?!inline\s*(?:;|$)|contents)/iu.test(attr(el, 'style') ?? '');

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

const VIEW_NAME: Record<View, string> = { pc: 'PC', tablet: '태블릿', mo: '모바일' };

/**
 * 원본에서 한 화면 안에서도 폭에 따라 보였다 숨었다 하는 내용(예: d-block d-xl-none, d-sm-none d-md-block)을 찾는다.
 * 출력은 화면 단위(PC / 모바일·태블릿)로만 숨길 수 있어 이런 표시를 옮길 수 없으므로 원본을 보존해야 한다 (8차 재검수 I-1).
 * 판정은 **내용 자체**(글 조각·이미지)의 실제 보임으로 한다: 조상까지 폭 구간마다 합친 뒤 화면별로 줄인다.
 * 부모가 그 화면 전체를 숨기거나(9차 I-1), 부모·자식이 서로 다른 구간에서 숨어 합치면 화면 단위가 되는 경우(10차 I-1)는 문제가 아니다.
 */
function partlyShown(node: DomNode, ignore: ((el: DomElement) => boolean) | undefined, parent?: DomElement): string | undefined {
  if (node.nodeName === '#text') {
    if (!parent || !((node as { value?: string }).value ?? '').trim()) return undefined;
    return mixedAt(parent);
  }
  if (!('childNodes' in node)) return undefined;
  let here = parent;
  if ('tagName' in node) {
    const el = node as DomElement;
    if (['script', 'style', 'template'].includes(el.tagName) || ignore?.(el)) return undefined;
    if (el.tagName === 'img') return mixedAt(el);
    here = el;
  }
  for (const child of node.childNodes as DomNode[]) {
    const found = partlyShown(child, ignore, here);
    if (found) return found;
  }
  return undefined;
}

function mixedAt(el: DomElement): string | undefined {
  const shown = visibilityOf(el);
  const view = VIEWS.find((v) => shown[v] === 'mixed');
  if (!view) return undefined;
  const marks = [el, ...ancestorsOf(el)].flatMap((n) => classesOf(n).filter((c) => c.startsWith('d-')));
  return `원본 내용이 ${VIEW_NAME[view]} 화면 안에서도 폭에 따라 보였다 숨었다 함(출력으로 옮길 수 없는 표시: ${marks.join(' ')})`;
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
  const partly = partlyShown(element, ignore);
  if (partly) return partly;
  for (const view of VIEWS) {
    const problem = matchSegments(segments(element, view, ignore, visibilityOf), segments(outputRoot, view, undefined, hostVisibilityOf));
    if (problem) return `원본과 글 순서가 다름(${VIEW_NAME[view]} 화면): ${problem}`;
  }
  return undefined;
}
