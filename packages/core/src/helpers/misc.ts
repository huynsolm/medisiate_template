import { h, raw, type StyleObject } from '../html/h.ts';
import { sanitizeRichText } from '../html/rich-text.ts';
import type { RichText } from '../model/index.ts';

/** 모든 화면에서 보이는 줄바꿈 */
export const brVisible = () => h('br', { class: 'br-migration is-visible' });
/** 호스트 CSS가 기본으로 숨기는 줄바꿈 */
export const brPcOnly = () => h('br', { class: 'br-migration' });

/** 에디터가 빈 태그를 지우지 않도록 &nbsp;를 넣은 장식 요소 */
export const emptyDeco = (style: StyleObject) => h('div', { style }, [' ']);

/** 저장된 RichText를 다시 한 번 allowlist에 통과시켜 노드로 만든다. */
export const rich = (value: RichText | undefined) => raw(sanitizeRichText(value ?? ''));

export const isBlank = (value: string | undefined): boolean => !value || !value.replace(/<br[^>]*>|&nbsp;|\s/giu, '');
