import type { Diagnostic, ImagePair, ImageRef } from '../model/index.ts';
import { imageRef } from '../helpers/image-ref.ts';
import { sanitizeRichText } from '../html/rich-text.ts';
import { ancestors, attr, classesOf, descendants, innerHtml, type DomElement, type SourceSection } from './dom.ts';
import { modifiersFromClasses } from './modifiers.ts';

/** script, on* 속성, 이미지 URL, 미등록 클래스를 진단으로 남긴다. */
export function scanSection(src: SourceSection, typeVariants: Iterable<string> = []) {
  const diagnostics: Diagnostic[] = [];
  const at = (el: DomElement) => {
    const loc = el.sourceCodeLocation;
    return loc ? { location: { line: loc.startLine, col: loc.startCol } } : {};
  };
  for (const el of descendants(src.element)) {
    if (el.tagName === 'script') {
      diagnostics.push({ level: 'warn', code: 'SCRIPT_REMOVED', message: 'script 제거', sectionIndex: src.index, ...at(el), detail: { source: innerHtml(el) } });
    }
    for (const a of el.attrs) {
      if (/^on/iu.test(a.name)) {
        diagnostics.push({ level: 'warn', code: 'EVENT_ATTRIBUTE_REMOVED', message: `${a.name} 속성 제거`, sectionIndex: src.index, ...at(el), detail: { tag: el.tagName, value: a.value } });
      }
    }
    if (el.tagName === 'img') {
      const kind = imageRef(attr(el, 'src') ?? '').kind;
      if (kind === 'http' || kind === 'relative') {
        diagnostics.push({
          level: 'info',
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
  return imageRef(attr(el, 'src') ?? '', attr(el, 'alt') ?? '', toInt(attr(el, 'width')), toInt(attr(el, 'height')));
}

const PC_MARK = /^(pc|pc-only|only-pc|show-pc|visible-lg|visible-md|hidden-xs|d-lg-block|d-md-block|img-pc|pc-img)$|[-_]pc$/u;
const MO_MARK = /^(mo|m|mobile|mo-only|only-mo|show-mo|visible-xs|visible-sm|d-lg-none|d-md-none|img-mo|mo-img|m-img)$|[-_](mo|m|mobile)$/u;

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
 * 원본 구조를 확인하지 못한 상태의 **추정 규칙**이다.
 */
export function pairImages(images: DomElement[], src: SourceSection, diagnostics: Diagnostic[]): ImagePair {
  const pair: ImagePair = {};
  const unmarked: DomElement[] = [];
  for (const el of images) {
    const device = deviceOf(el);
    if (device && !pair[device]) pair[device] = imageFromElement(el);
    else unmarked.push(el);
  }
  for (const el of unmarked) {
    const slot = !pair.pc ? 'pc' : !pair.mo ? 'mo' : undefined;
    if (!slot) {
      diagnostics.push({ level: 'warn', code: 'PARSE_HEURISTIC', message: '세 번째 이후 이미지는 버림', sectionIndex: src.index, detail: { src: attr(el, 'src') } });
      continue;
    }
    pair[slot] = imageFromElement(el);
    if (images.length > 1) {
      diagnostics.push({ level: 'info', code: 'PARSE_HEURISTIC', message: `PC/MO 표시가 없어 순서로 ${slot.toUpperCase()} 이미지로 판단`, sectionIndex: src.index, detail: { src: attr(el, 'src') } });
    }
  }
  return pair;
}

/** 요소 안 HTML을 서식 allowlist에 통과시킨다. */
export function richFrom(el: DomElement): string {
  return sanitizeRichText(innerHtml(el)).replace(/\s+/gu, ' ').replace(/\s*<br>\s*/gu, '<br>').trim();
}

export const HEADING = /^h[1-6]$/u;
export const isHeading = (el: DomElement) => HEADING.test(el.tagName) || classesOf(el).some((c) => /(^|-)tit(le)?$/u.test(c));
