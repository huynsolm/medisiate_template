import { parse } from 'parse5';
import type { Diagnostic, FileStatus, ImageKind, PageMeta, PageModel, SectionModel, Theme } from '../model/index.ts';
import { renderPage } from '../page/render-page.ts';
import { attr, descendants, hasClass, parseHtmlFragment, type DomElement, type DomNode, type SourceSection } from '../parse/dom.ts';
import { sectionTypeId } from '../parse/sections.ts';
import { classesOf } from '../parse/dom.ts';
import { classifyImageSrc } from '../helpers/image-ref.ts';
import { richTextToPlain, safeHref } from '../html/rich-text.ts';
import { fallbackFromSource } from '../types/fallback.ts';
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

/**
 * 글 순서 비교용 표현: 공백 없는 글 + 링크 위치·주소(⟦주소⟧글⟦/⟧). 같은 글이라도 링크와 일반 글이 자리를 바꾸면 다르게 나온다
 * (재검수 I-2: 버튼 "예약"과 문단 "예약"이 바뀌어도 글자열만 비교하면 같았다).
 * 원본 쪽 위험한 링크는 출력에서 의도적으로 링크를 빼고(UNSAFE_LINK_REMOVED) 글만 두므로 일반 글로 본다.
 * ignore가 고른 원본 요소(호스트 CSS가 다시 그리는 표시)와 주석·script·style·template은 뺀다.
 */
function orderSignature(node: DomNode, ignore?: (el: DomElement) => boolean): string {
  if (node.nodeName === '#text') return ((node as { value?: string }).value ?? '').replace(/\s+/gu, '');
  if (!('childNodes' in node)) return '';
  const inner = () => (node.childNodes as DomNode[]).map((c) => orderSignature(c, ignore)).join('');
  if (!('tagName' in node)) return inner();
  const el = node as DomElement;
  if (['script', 'style', 'template'].includes(el.tagName) || ignore?.(el)) return '';
  if (el.tagName === 'a') {
    const href = safeHref(attr(el, 'href'));
    if (href !== undefined) return `⟦${href}⟧${inner()}⟦/⟧`;
  }
  return inner();
}

/** 섹션 하나를 출력했을 때 원본과 글·링크 순서가 다르면 이유를, 같으면 undefined. */
export function textOrderDiffers(element: DomElement, section: SectionModel, options: ConvertOptions, ignore?: (el: DomElement) => boolean): string | undefined {
  const single: PageModel = {
    version: 1, theme: options.theme, sections: [section], diagnostics: [],
    meta: { coreVersion: options.coreVersion, hostCss: options.hostCss },
  };
  // orderCheck: 원본에 없는 생성 글(type24 순서 번호)을 렌더러가 빼고 출력한다(재검수 I-1: 출력에서 문자열로 지우면 작성된 숫자까지 지웠다)
  const rendered = renderPage(single, { registry: options.registry, orderCheck: true });
  if (rendered.fallbackCount > 0) return undefined; // 데이터 검증 실패는 아래 전체 렌더가 INVALID_DATA로 따로 보고한다
  const a = orderSignature(element, ignore);
  const b = orderSignature(parseHtmlFragment(rendered.html) as unknown as DomNode);
  if (a === b) return undefined;
  let at = 0;
  while (at < a.length && a[at] === b[at]) at++;
  return `원본과 글 순서가 다름: …${a.slice(Math.max(0, at - 10), at + 20)}`;
}
