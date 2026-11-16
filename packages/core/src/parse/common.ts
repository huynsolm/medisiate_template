import type { Diagnostic, ImagePair, ImageRef } from '../model/index.ts';
import { imageRef } from '../helpers/image-ref.ts';
import { blockStyleSpan, filterInlineStyle, richTextToPlain, safeHref, sanitizeRichText } from '../html/rich-text.ts';
import { ancestors, attr, childNodes, classesOf, descendants, innerHtml, isElement, nodesHtml, plainText, type DomElement, type DomNode, type SourceSection } from './dom.ts';
import { modifiersFromClasses } from './modifiers.ts';

/** script, on* 속성, 이미지 URL, 미등록 클래스를 진단으로 남긴다. */
export function scanSection(src: SourceSection, typeVariants: Iterable<string> = []) {
  const diagnostics: Diagnostic[] = [];
  const at = (el: DomElement) => {
    const loc = el.sourceCodeLocation;
    return loc ? { location: { line: loc.startLine, col: loc.startCol } } : {};
  };
  for (const el of [src.element, ...descendants(src.element)]) {
    const style = attr(el, 'style');
    if (style) {
      const { dropped } = filterInlineStyle(el.tagName, style);
      if (dropped.length) {
        diagnostics.push({ level: 'warn', code: 'INLINE_STYLE_DROPPED', message: `${el.tagName}의 inline style 일부 제거: ${dropped.join('; ')}`, sectionIndex: src.index, ...at(el), detail: { tag: el.tagName, declarations: dropped } });
      }
    }
    if (el.tagName === 'script') {
      diagnostics.push({ level: 'warn', code: 'SCRIPT_REMOVED', message: 'script 제거', sectionIndex: src.index, ...at(el), detail: { source: innerHtml(el) } });
    }
    for (const a of el.attrs) {
      if (/^on/iu.test(a.name)) {
        diagnostics.push({ level: 'warn', code: 'EVENT_ATTRIBUTE_REMOVED', message: `${a.name} 속성 제거`, sectionIndex: src.index, ...at(el), detail: { tag: el.tagName, value: a.value } });
      }
    }
    if (el.tagName === 'a' && attr(el, 'href') !== undefined && safeHref(attr(el, 'href')) === undefined) {
      diagnostics.push({ level: 'warn', code: 'UNSAFE_LINK_REMOVED', message: `안전하지 않은 링크 주소 제거(글은 유지): ${(attr(el, 'href') ?? '').slice(0, 60)}`, sectionIndex: src.index, ...at(el), detail: { href: attr(el, 'href') } });
    }
    if (el.tagName === 'img') {
      const kind = imageRef(attr(el, 'src') ?? '').kind;
      if (kind === 'http' || kind === 'relative') {
        diagnostics.push({
          level: 'warn',
          code: kind === 'http' ? 'IMAGE_HTTP' : 'IMAGE_RELATIVE',
          message: `이미지 주소가 ${kind === 'http' ? 'http://' : '상대경로'}임 (주소는 그대로 둠)`,
          sectionIndex: src.index,
          ...at(el),
          detail: { src: attr(el, 'src') },
        });
      }
    }
  }
  const { modifiers, unknown } = modifiersFromClasses(src.classList, typeVariants);
  if (unknown.length) {
    diagnostics.push({ level: 'warn', code: 'UNKNOWN_CLASS', message: `해석하지 못한 클래스: ${unknown.join(', ')}`, sectionIndex: src.index, detail: { classes: unknown } });
  }
  return { modifiers, diagnostics };
}

function toInt(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/u.test(value.trim())) return undefined;
  const n = Number(value);
  return n > 0 ? n : undefined;
}

export function imageFromElement(el: DomElement): ImageRef {
  const ref = imageRef(attr(el, 'src') ?? '', attr(el, 'alt') ?? '', toInt(attr(el, 'width')), toInt(attr(el, 'height')));
  // 이미지를 감싼 링크(<a href><img></a>)도 옮긴다. 위험한 주소는 scanSection이 경고하고 링크 없이 둔다.
  const anchor = ancestors(el).find((a) => a.tagName === 'a');
  const link = anchor ? safeHref(attr(anchor, 'href')) : undefined;
  if (anchor && link !== undefined) return { ...ref, link, ...(attr(anchor, 'target') === '_blank' ? { newTab: true } : {}) };
  return ref;
}

const PC_MARK = /^(pc|pc-only|only-pc|show-pc|visible-lg|visible-md|hidden-xs|d-lg-block|d-md-block|img-pc|pc-img)$|[-_]pc$/u;
const MO_MARK = /^(mo|m|mobile|mo-only|only-mo|show-mo|visible-xs|visible-sm|d-lg-none|d-md-none|img-mo|mo-img|m-img)$|[-_](mo|m|mobile)$/u;

/** 화면 구분: 모바일(768 미만), 태블릿(768~991, 호스트 출력에서는 모바일 쪽), PC(992 이상, 호스트 출력은 1024 이상) */
export type View = 'mo' | 'tablet' | 'pc';
export const VIEWS: readonly View[] = ['pc', 'tablet', 'mo'];
const VIEW_WIDTH: Record<View, number> = { mo: 0, tablet: 800, pc: 1100 };
const BREAKPOINT: Record<string, number> = { '': 0, sm: 576, md: 768, lg: 992, xl: 1200 };
const D_CLASS = /^d-(?:(sm|md|lg|xl)-)?(none|inline|inline-block|block|table|table-row|table-cell|flex|inline-flex|grid|inline-grid|contents)$/u;

/**
 * 요소 자신의 클래스 기준으로 화면마다 보이는지. 표시 클래스가 없으면 undefined(= 모든 화면에서 보임).
 * - Bootstrap 표시 클래스(d-none, d-md-block, d-lg-none, d-lg-inline-block …)는 기본값 + 화면 폭별 덮어쓰기로 계산한다.
 *   d-lg-block 하나만 있으면 큰 화면에서 block을 지정할 뿐이라 모든 화면에서 보인다 (7차 재검수 I-1).
 * - 그 밖의 표시 이름(pc, mo, visible-lg, common-display-pc/mo …)은 PC 전용·모바일(태블릿 포함) 전용으로 본다.
 */
export function ownVisibility(el: DomElement): Record<View, boolean> | undefined {
  const classes = classesOf(el);
  const rules = classes.map((c) => D_CLASS.exec(c)).filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ at: BREAKPOINT[m[1] ?? '']!, show: m[2] !== 'none' }));
  if (rules.length > 0) {
    const at = (width: number) => {
      const applicable = rules.filter((r) => r.at <= width).sort((a, b) => a.at - b.at);
      return applicable.length === 0 ? true : applicable[applicable.length - 1]!.show;
    };
    return { mo: at(VIEW_WIDTH.mo), tablet: at(VIEW_WIDTH.tablet), pc: at(VIEW_WIDTH.pc) };
  }
  const named = classes.filter((c) => !c.startsWith('d-'));
  if (named.some((c) => PC_MARK.test(c))) return { mo: false, tablet: false, pc: true };
  if (named.some((c) => MO_MARK.test(c))) return { mo: true, tablet: true, pc: false };
  return undefined;
}

/** 요소와 조상들의 표시를 합친 화면별 보임(조상이 숨기면 숨음) */
export function visibilityOf(el: DomElement): Record<View, boolean> {
  const out: Record<View, boolean> = { mo: true, tablet: true, pc: true };
  for (const node of [el, ...ancestors(el)]) {
    const v = ownVisibility(node);
    if (v) for (const view of VIEWS) out[view] &&= v[view];
  }
  return out;
}

export function deviceOf(el: DomElement): 'pc' | 'mo' | undefined {
  for (const node of [el, ...ancestors(el)]) {
    const classes = classesOf(node);
    if (classes.some((c) => PC_MARK.test(c))) return 'pc';
    if (classes.some((c) => MO_MARK.test(c))) return 'mo';
  }
  const src = attr(el, 'src') ?? '';
  if (/[_-](pc)\.[a-z]+$/iu.test(src)) return 'pc';
  if (/[_-](mo|m|mobile)\.[a-z]+$/iu.test(src)) return 'mo';
  return undefined;
}

/**
 * 이미지 목록을 PC/MO 쌍으로 묶는다. 표시가 없으면 첫 장 PC, 둘째 장 MO로 추정하고 진단을 남긴다.
 * 원본 구조를 확인하지 못한 상태의 **추정 규칙**이다. 쌍에 들어가지 못한 이미지는 extra로 돌려준다.
 */
export function pairImages(images: DomElement[], src: SourceSection, diagnostics: Diagnostic[]): { pair: ImagePair; extra: DomElement[] } {
  const pair: ImagePair = {};
  const unmarked: DomElement[] = [];
  const extra: DomElement[] = [];
  for (const el of images) {
    const device = deviceOf(el);
    if (device && !pair[device]) pair[device] = imageFromElement(el);
    else unmarked.push(el);
  }
  for (const el of unmarked) {
    const slot = !pair.pc ? 'pc' : !pair.mo ? 'mo' : undefined;
    if (!slot) {
      extra.push(el);
      continue;
    }
    pair[slot] = imageFromElement(el);
    if (images.length > 1) {
      diagnostics.push({ level: 'info', code: 'PARSE_HEURISTIC', message: `PC/MO 표시가 없어 순서로 ${slot.toUpperCase()} 이미지로 판단`, sectionIndex: src.index, detail: { src: attr(el, 'src') } });
    }
  }
  // 한 장뿐인데 원본에서 한쪽 화면 전용으로 표시돼 있으면 그 화면에서만 보이게 기록한다
  // (예: PC 전용 이미지가 출력에서는 모바일에도 보이던 문제. 6차 재검수 대응 중 화면별 비교로 발견)
  // 화면 전용 여부는 표시 클래스(원본 브라우저가 실제로 숨기는 근거)로만 정한다. 파일 이름(_m.png)은 칸 배정 짐작일 뿐 숨기지 않는다.
  // 표현할 수 있는 것은 "PC에서만"과 "모바일·태블릿에서만" 둘이다. 그 밖의 조합(태블릿에서만 등)은 only를 두지 않고,
  // 화면별 글 순서 검사가 화면마다의 차이를 찾아 원본을 보존한다.
  if (images.length === 1 && extra.length === 0) {
    const v = visibilityOf(images[0]!);
    if (v.pc && !v.tablet && !v.mo) pair.only = 'pc';
    else if (!v.pc && v.tablet && v.mo) pair.only = 'mo';
  }
  return { pair, extra };
}

const squash = (value: string) => value.replace(/\s+/gu, '');

/**
 * 원본 섹션의 텍스트 중 추출한 서식 텍스트에 들어가지 못한 부분을 돌려준다.
 * 비어 있지 않으면 parse가 텍스트를 잃는다는 뜻이다.
 */
export function uncoveredText(element: DomElement, extracted: string[]): string {
  let rest = squash(plainText(element));
  for (const part of extracted.map((html) => squash(richTextToPlain(html))).filter(Boolean)) {
    const i = rest.indexOf(part);
    if (i >= 0) rest = rest.slice(0, i) + rest.slice(i + part.length);
  }
  return rest;
}

/** 원본 클래스에서 타입 변형을 고른다. 둘 이상이면 첫 번째를 쓰고 UNKNOWN_VARIANT를 남긴다. */
export function variantFromClasses(src: SourceSection, sourceVariants: Record<string, string>, diagnostics: Diagnostic[]): string {
  const found = src.classList.filter((c) => c in sourceVariants);
  if (found.length > 1) {
    diagnostics.push({ level: 'warn', code: 'UNKNOWN_VARIANT', message: `변형 클래스가 여러 개: ${found.join(', ')} (첫 번째 사용)`, sectionIndex: src.index, detail: { classes: found } });
  }
  return found.length ? sourceVariants[found[0]!]! : 'default';
}

/** 글 안에서 줄바꿈(<br>)으로 경계를 나타낼 수 있는 블록: 문단(p)과 문단을 감싸기만 하는 상자들 */
export const TEXT_BLOCKS: ReadonlySet<string> = new Set(['p', 'div', 'section', 'article', 'aside', 'header', 'footer', 'main', 'nav', 'address']);
/** 글 안에 있어도 경계·구조를 잃지 않는 줄 안 요소 (img는 이미지 수 검사가 따로 맡는다) */
// button: 원본 Q&A 질문의 아코디언 버튼 등. 글은 그대로 두고 동작(펼치기)은 정적 표현 원칙대로 없앤다
export const TEXT_INLINE: ReadonlySet<string> = new Set(['em', 'strong', 'b', 'i', 'u', 'sup', 'sub', 'span', 'br', 'a', 'small', 'mark', 'font', 'img', 'button']);

const cleanRich = (html: string) => sanitizeRichText(html).replace(/\s+/gu, ' ').replace(/\s*<br>\s*/gu, '<br>').trim();

/**
 * 요소 안 HTML을 서식 allowlist에 통과시킨다.
 * 안에 문단 블록(TEXT_BLOCKS)이 있으면 블록마다 줄바꿈(<br>)으로 이어 경계를 지킨다.
 * allowlist가 블록 태그를 풀면서 "FIRST" "SECOND"가 "FIRSTSECOND"로 붙던 문제 (4단계 검수 I-2).
 * 목록·표처럼 줄바꿈으로 나타낼 수 없는 구조는 여기서 처리하지 않는다. 원본 마크업 파서는 finish()가 찾아 fallback한다.
 */
/**
 * richFrom이 글로 읽은 요소. finish()의 구조 검사가 "파서가 실제로 글로 읽은 범위"를 그대로 보도록 기록한다.
 * 어떤 요소를 글로 읽는지 클래스·구조로 짐작하면 파서와 어긋난다(4단계 재검수에서 두 번 놓침).
 * WeakSet이라 원본 DOM이 사라지면 함께 사라진다.
 */
const readAsText = new WeakSet<DomElement>();
/** 파서가 자식들을 나눠 읽은 요소(예: Q&A 답 = 글 + 목록). 통째 글 요소로 보지 않고, 나눠 읽은 부분만 구조 검사를 받는다 */
const readInParts = new WeakSet<DomElement>();
export function markReadInParts(el: DomElement): void {
  readInParts.add(el);
}
/** 요소마다 richFrom으로 읽어 글이 나온 횟수(바깥 호출만). 같은 원본 글을 두 필드로 읽었는지 finish()가 확인한다. */
const readCount = new WeakMap<DomElement, number>();

export function richFrom(el: DomElement): string {
  readAsText.add(el);
  const value = richInner(el);
  // 글이 나온 읽기만 센다. 빈 요소(빈 제목 등)를 읽은 것은 필드를 만들지 않아 두 번 나올 글이 없다 (P5 재검수 R-I-1).
  if (richTextToPlain(value).trim() !== '') readCount.set(el, (readCount.get(el) ?? 0) + 1);
  return value;
}

/**
 * 섹션 안에서 같은 원본 글을 두 번 읽은 곳을 찾는다(4단계 P5 검수 I-1).
 * - 같은 요소를 두 번 읽음, 또는 읽은 요소 안에 또 읽은 요소가 있음 → 그 글이 두 필드에 들어가 두 번 출력된다.
 * 확인한 요소의 읽은 횟수는 지워, 같은 DOM을 다시 parse해도 이전 횟수가 남지 않게 한다.
 */
export function duplicateReads(root: DomElement): string[] {
  const read = [root, ...descendants(root)].filter((el) => readCount.has(el));
  const problems: string[] = [];
  for (const el of read) {
    if ((readCount.get(el) ?? 0) > 1) problems.push(`<${el.tagName}> 글을 두 번 읽음`);
    else if (ancestors(el).some((a) => readCount.has(a) && (a === root || descendants(root).includes(a)))) problems.push(`<${el.tagName}> 글이 다른 칸의 글 안에 있음`);
  }
  for (const el of read) readCount.delete(el);
  return [...new Set(problems)];
}

/** 노드 목록을 서식 글로. 문단 블록은 줄바꿈으로 잇는다. 요소의 일부(자식 몇 개)만 글로 읽을 때도 쓴다(예: Q&A 답의 목록 앞 글) */
export function richFromNodes(nodes: DomNode[]): string {
  if (!nodes.some((n) => isElement(n) && TEXT_BLOCKS.has(n.tagName))) return cleanRich(nodesHtml(nodes));
  const lines: string[] = [];
  let run: DomNode[] = [];
  const flush = () => {
    const line = cleanRich(nodesHtml(run));
    if (line) lines.push(line);
    run = [];
  };
  for (const n of nodes) {
    if (isElement(n) && TEXT_BLOCKS.has(n.tagName)) {
      flush();
      const line = richInner(n);
      if (line) lines.push(line);
    } else {
      run.push(n);
    }
  }
  flush();
  return lines.join('<br>');
}

/** 노드들 안에서 줄바꿈으로 나타낼 수 없는 구조(허용 목록 밖 요소, 줄 안 요소 속 블록)를 찾는다 */
export function structureProblemsInNodes(nodes: DomNode[]): string[] {
  const problems: string[] = [];
  for (const n of nodes) {
    if (!isElement(n)) continue;
    for (const d of [n, ...descendants(n)]) {
      if (!TEXT_BLOCKS.has(d.tagName) && !TEXT_INLINE.has(d.tagName)) problems.push(`글 안의 <${d.tagName}>`);
      const parent = d.parentNode as DomNode | null;
      if (TEXT_BLOCKS.has(d.tagName) && d !== n && parent && isElement(parent) && TEXT_INLINE.has(parent.tagName)) problems.push(`줄 안 요소 속의 <${d.tagName}>`);
    }
  }
  return [...new Set(problems)];
}

function richInner(el: DomElement): string {
  const inner = richFromNodes(childNodes(el));
  // 단락·제목 자신의 허용 style(정렬·색·폭 등)은 블록 span으로 보존한다 (review I-8)
  return blockStyleSpan(el.tagName, attr(el, 'style'), inner);
}

/**
 * 섹션 안의 "글 요소"에서 줄바꿈으로 나타낼 수 없는 구조를 찾는다. 하나라도 있으면 그 글은 경계를 잃는다.
 * 글 요소: **파서가 richFrom으로 실제로 읽은 요소**(기본), 그리고 읽지 않았더라도 원본 글 클래스
 * (cms-description · cms-title · cms-thin-title · cms-eyebrow)가 있거나, 글을 직접 담거나, cms- 클래스 자식이 없는 li.
 * 뒤의 세 가지는 파서가 읽지 않은 글이 finish()의 글 비교에서 빠지는 경우를 대비한 보수적 추가다.
 * - 글 요소 안에 블록 상자(TEXT_BLOCKS)·줄 안 요소(TEXT_INLINE) 밖의 요소(목록·표·제목 등)가 있으면 문제.
 * - 섹션 어디서든 줄 안 요소(span 등) 속에 블록 상자가 숨어 있으면 문제(richFrom이 줄로 나눌 수 없음).
 */
export function textStructureProblems(root: DomElement): string[] {
  const problems: string[] = [];
  const TEXT_CLASSES = ['cms-description', 'cms-title', 'cms-thin-title', 'cms-eyebrow'];
  const holdsText = (el: DomElement) => childNodes(el).some((n) => n.nodeName === '#text' && textContentOf(n).trim() !== '');
  const leafItem = (el: DomElement) => el.tagName === 'li' && !descendants(el).some((d) => classesOf(d).some((c) => c.startsWith('cms-')));
  const isText = (el: DomElement) => !readInParts.has(el) && (readAsText.has(el) || classesOf(el).some((c) => TEXT_CLASSES.includes(c)) || holdsText(el) || leafItem(el));
  for (const textEl of descendants(root, isText)) {
    // 글 요소 안의 글 요소(예: li 안의 p.cms-description)는 바깥에서 한 번만 보면 된다
    if (ancestors(textEl).some((a) => a !== root && descendants(root).includes(a) && isText(a))) continue;
    const bad = descendants(textEl).find((d) => !TEXT_BLOCKS.has(d.tagName) && !TEXT_INLINE.has(d.tagName));
    if (bad) problems.push(`글 안의 <${bad.tagName}>`);
  }
  for (const block of descendants(root, (el) => TEXT_BLOCKS.has(el.tagName))) {
    const parent = block.parentNode as DomNode | null;
    if (parent && isElement(parent) && TEXT_INLINE.has(parent.tagName)) problems.push(`줄 안 요소 속의 <${block.tagName}>`);
  }
  return [...new Set(problems)];
}

const textContentOf = (n: DomNode) => (n as { value?: string }).value ?? '';

export const HEADING = /^h[1-6]$/u;
export const isHeading = (el: DomElement) => HEADING.test(el.tagName) || classesOf(el).some((c) => /(^|-)tit(le)?$/u.test(c));
