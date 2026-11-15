import type { Diagnostic, ImagePair, SectionModifiers } from '../model/index.ts';
import type { ParseResult } from '../types/definition.ts';
import { duplicateReads, pairImages, richFrom, textStructureProblems, uncoveredText } from './common.ts';
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

/** 직접 자식 중 원본 목록 항목(li.cms-list-item) */
export const listItems = (list: DomElement | undefined) => (list ? children(list).filter(byClass('cms-list-item')) : []);

/** 요소 안의 첫 번째 해당 클래스 글(rich). 없으면 빈 문자열. */
export function textOf(root: DomElement | undefined, name: string): string {
  const el = root ? descendants(root, byClass(name))[0] : undefined;
  return el ? richFrom(el) : '';
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
