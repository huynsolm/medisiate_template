import type { Diagnostic, ImagePair, SectionModifiers } from '../model/index.ts';
import type { ParseResult } from '../types/definition.ts';
import { duplicateReads, markReadInParts, ownVisibility, pairImages, richFrom, TEXT_BLOCKS, TEXT_INLINE, textStructureProblems, uncoveredText } from './common.ts';
import { children, classesOf, descendants, hasClass, type DomElement, type SourceSection } from './dom.ts';

/*
 * 원본 CMS 마크업(fixtures/original/typeNN.html, 원본 TypeNN.jsx와 같은 HTML)을 읽는 공통 도우미.
 * 원본 공통 규칙: section.cms.typeNN > .cms-inner > .cms-header(.top-border) > p.cms-eyebrow + p.cms-title(.cms-thin-title)
 */

export const byClass = (name: string) => (el: DomElement) => hasClass(el, name);
export const firstByClass = (root: DomElement, name: string) => descendants(root, byClass(name))[0];

/** 원본 머리글: 작은 글(cms-eyebrow)과 큰 글(cms-title / cms-thin-title). 소비한 요소를 함께 돌려준다. */
export function originalHeader(root: DomElement): { eyebrow?: string; heading?: string; used: string[] } {
  const header = firstByClass(root, 'cms-header');
  if (!header) return { used: [] };
  const eyebrowEl = children(header).find(byClass('cms-eyebrow'));
  const titleEl = children(header).find((el) => hasClass(el, 'cms-title') || hasClass(el, 'cms-thin-title'));
  const out: { eyebrow?: string; heading?: string; used: string[] } = { used: [] };
  if (eyebrowEl) {
    const value = richFrom(eyebrowEl);
    if (value) { out.eyebrow = value; out.used.push(value); }
  }
  if (titleEl) {
    const value = richFrom(titleEl);
    if (value) { out.heading = value; out.used.push(value); }
  }
  return out;
}

/**
 * 목록 항목 안의 부분(이미지 칸, 설명 상자 등). 원본 템플릿은 li의 직접 자식이지만, 실제 페이지는
 * `li > div.row > .cms-visual`처럼 감싸는 상자를 넣은 경우가 많다. 이 항목 안에서(하위 목록 항목 안은 제외) 첫 번째로 찾는다.
 */
export function itemPart(li: DomElement | undefined, name: string): DomElement | undefined {
  if (!li) return undefined;
  const owner = (el: DomElement) => {
    let node = el.parentNode as DomElement | null;
    while (node && node !== li && node.tagName !== 'li') node = node.parentNode as DomElement | null;
    return node;
  };
  return descendants(li, (el) => hasClass(el, name) && owner(el) === li)[0];
}

/** 직접 자식 중 원본 목록 항목(li.cms-list-item) */
export const listItems = (list: DomElement | undefined) => (list ? children(list).filter(byClass('cms-list-item')) : []);

/** 요소 안의 첫 번째 해당 클래스 글(rich). 없으면 빈 문자열. */
export function textOf(root: DomElement | undefined, name: string): string {
  const el = root ? descendants(root, byClass(name))[0] : undefined;
  return el ? richFrom(el) : '';
}

/**
 * 범위 안의 해당 클래스 글을 모두 읽어 줄바꿈(<br>)으로 잇는다. 실제 페이지는 설명 상자에 같은 클래스 문단을 여러 개 두는 경우가 많다
 * (원본 템플릿은 하나). 서로 안에 든 요소는 바깥 것만 읽는다. 문단 경계는 줄바꿈으로 지킨다(표 칸과 같은 규칙).
 */
export function textsOf(root: DomElement | undefined, name: string): string {
  if (!root) return '';
  const found = descendants(root, byClass(name));
  return found.filter((el) => !found.some((other) => other !== el && descendants(other).includes(el)))
    .map((el) => richFrom(el)).filter(Boolean).join('<br>');
}

/**
 * 본문 앞뒤의 설명 상자(원본 .cms-inner의 직접 자식 .cms-description-box). 실제 페이지는 표·목록 앞에 안내 글을,
 * 뒤에 주의 글(예: "예약 및 상담전화 …")을 두는 경우가 많다. 본문 요소(content)보다 앞이면 intro, 뒤면 note.
 */
export function readNotes(root: DomElement, content: DomElement | undefined): { intro: string; note: string } {
  const inner = children(root).find(byClass('cms-inner')) ?? root;
  const kids = children(inner);
  const at = content ? kids.findIndex((k) => k === content || descendants(k).includes(content)) : -1;
  const boxes = kids.filter((k) => hasClass(k, 'cms-description-box'));
  const read = (list: DomElement[]) => list.map((b) => textsOf(b, 'cms-description')).filter(Boolean).join('<br>');
  if (at < 0) return { intro: '', note: '' };
  return { intro: read(boxes.filter((b) => kids.indexOf(b) < at)), note: read(boxes.filter((b) => kids.indexOf(b) > at)) };
}

/**
 * 목록 항목의 글. 원본 템플릿은 `li > .cms-description-box > p.cms-description`이지만, 실제 컴포넌트·페이지는
 * `li.cms-list-item.cms-description`처럼 항목 자체에 클래스를 붙이기도 한다. 항목 자체가 해당 클래스면 항목 글 전체,
 * 아니면 안의 해당 클래스 글들을 읽는다.
 */
export function itemText(li: DomElement | undefined, name: string): string {
  if (!li) return '';
  return hasClass(li, name) ? richFrom(li) : textsOf(li, name);
}

/** 값이 있을 때만 { key: value }를 만든다(빈 칸은 데이터에 넣지 않는다). */
export const optional = <K extends string>(key: K, value: string): Partial<Record<K, string>> =>
  (value ? { [key]: value } : {}) as Partial<Record<K, string>>;

/** 직접 자식 중 해당 클래스 요소의 글(rich). 하위 목록 안의 같은 클래스와 섞이지 않게 한다. */
export function childText(root: DomElement | undefined, name: string): string {
  const el = root ? children(root).find(byClass(name)) : undefined;
  return el ? richFrom(el) : '';
}

/** PC/MO 이미지 쌍과, 쌍에 들어가지 못한 이미지 */
export function imagesIn(root: DomElement | undefined, src: SourceSection, diagnostics: Diagnostic[]): { pair: ImagePair; extra: DomElement[] } {
  if (!root) return { pair: {}, extra: [] };
  return pairImages(descendants(root, (el) => el.tagName === 'img'), src, diagnostics);
}

/** Bootstrap 열 클래스(col-12 / col-6 / col-4)에서 한 줄 항목 수 */
export function perRowFrom(item: DomElement | undefined): 1 | 2 | 3 | undefined {
  const col = item ? classesOf(item).find((c) => /^col-(12|6|4)$/u.test(c)) : undefined;
  return col ? ({ 'col-12': 1, 'col-6': 2, 'col-4': 3 } as const)[col as 'col-12' | 'col-6' | 'col-4'] : undefined;
}

/**
 * 공통 마무리: 원본 텍스트 중 담지 못한 것이 있거나 남는 이미지가 있으면 fallbackReason을 붙여
 * 변환기가 섹션 전체를 fallback으로 보존하게 한다(조용한 손실 금지).
 */
export function finish<T>(
  src: SourceSection,
  data: T,
  used: string[],
  extraImages: DomElement[],
  base: { variant?: string; modifiers: SectionModifiers; diagnostics: Diagnostic[] },
): ParseResult<T> {
  const lost = uncoveredText(src.element, used.filter(Boolean));
  // 타입이 읽는 자리 밖의 이미지도 잃지 않도록, 섹션의 이미지 수와 데이터에 담긴 이미지 수를 비교한다.
  const missing = descendants(src.element, (el) => el.tagName === 'img').length - countImages(data);
  // 글 요소 안의 목록·표 등은 글(rich)로 옮기면 경계가 사라진다 (4단계 검수 I-2)
  const structure = textStructureProblems(src.element);
  // 한 원본 글을 두 필드로 읽으면 출력에 두 번 나온다 (4단계 P5 검수 I-1)
  const duplicates = duplicateReads(src.element);
  const fallbackReason = extraImages.length || missing > 0
    ? `이미지 ${Math.max(extraImages.length, missing)}장을 담을 자리가 없음`
    : lost
      ? `담을 자리가 없는 텍스트: ${lost.slice(0, 40)}`
      : structure.length
        ? `글 안의 구조를 그대로 옮길 수 없음: ${structure.slice(0, 3).join(', ')}`
        : duplicates.length
          ? `같은 글을 두 칸으로 읽음: ${duplicates.slice(0, 3).join(', ')}`
          : undefined;
  return {
    data,
    variant: base.variant ?? 'default',
    modifiers: base.modifiers,
    diagnostics: base.diagnostics,
    lossless: !fallbackReason && !base.diagnostics.some((d) => d.level !== 'info'),
    fallbackReason,
  };
}

/** 데이터 안의 이미지 참조(src가 있는 객체) 수 */
function countImages(value: unknown): number {
  if (Array.isArray(value)) return value.reduce((n: number, v) => n + countImages(v), 0);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.src === 'string') return 1;
    return Object.values(record).reduce((n: number, v) => n + countImages(v), 0);
  }
  return 0;
}

/** 호스트 프리셋이 고정한 배치와 원본 선택이 다를 때 남기는 진단 (내용 손실 없음) */
export function layoutFixed(src: SourceSection, message: string, detail: Record<string, unknown>): Diagnostic {
  return { level: 'info', code: 'PRESET_LAYOUT_FIXED', message, sectionIndex: src.index, detail };
}

/** 설명 칸의 한 덩어리: 문단 글 또는 글머리 목록 */
export interface TextPart { text?: string | undefined; bullets?: Array<{ text: string }> | undefined }

/**
 * 설명 상자 안에서 문단과 글머리 목록(ul/ol)이 섞인 경우를 원본 순서대로 읽는다.
 * 실제 페이지(type10 등)는 `p.cms-description` + `ul.list-box > li` 를 번갈아 둔다.
 * 직접 자식만 본다(skip은 다른 칸으로 읽은 요소, 예: 소제목): 문단(p·글 블록) → text, 글머리 목록(ul) → bullets(항목은 줄 안 글만).
 * 그 밖의 요소, 번호 목록(ol), 중첩 목록, 목록 밖 글, 화면에 따라 숨는 요소가 있으면 undefined.
 * 원본의 잘못된 중첩(<p><ul>)으로 생긴 빈 문단은 건너뛴다.
 */
export function readTextParts(box: DomElement, skip: DomElement[] = []): TextPart[] | undefined {
  // 화면에 따라 숨는 문단·목록·항목은 글머리 목록으로 옮기면 숨김이 사라진다(빈 항목이면 글머리만 남는다).
  // 표시 조건을 담을 자리가 없으므로 읽지 않는다 (검수 I-2)
  if (descendants(box).some((d) => Object.values(ownVisibility(d) ?? {}).some((v) => v !== true))) return undefined;
  const parts: TextPart[] = [];
  for (const node of box.childNodes as Array<{ nodeName: string; value?: string }>) {
    if (node.nodeName === '#text') {
      if ((node.value ?? '').trim()) return undefined;
      continue;
    }
    if (node.nodeName === '#comment') continue;
    const el = node as unknown as DomElement;
    if (skip.includes(el)) continue;
    // 번호 목록(ol)은 번호·시작값·역순·항목 번호를 글머리 목록으로 옮길 수 없으므로 읽지 않는다 (검수 I-1)
    if (el.tagName === 'ol') return undefined;
    if (el.tagName === 'ul') {
      const items = children(el);
      if (items.some((li) => li.tagName !== 'li' || descendants(li).some((d) => !TEXT_INLINE.has(d.tagName) || d.tagName === 'img'))) return undefined;
      parts.push({ bullets: items.map((li) => ({ text: richFrom(li) })) });
      continue;
    }
    if (!TEXT_BLOCKS.has(el.tagName) || descendants(el).some((d) => !TEXT_INLINE.has(d.tagName) || d.tagName === 'img')) return undefined;
    const text = richFrom(el);
    if (text) parts.push({ text });
  }
  markReadInParts(box);
  return parts;
}
