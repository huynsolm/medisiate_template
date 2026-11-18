import { z } from 'zod';
import { h } from '../html/h.ts';
import { rich } from '../helpers/misc.ts';
import { descendants, plainText } from '../parse/dom.ts';
import { isHeading, richFrom, scanSection, uncoveredText } from '../parse/common.ts';
import type { TypeDefinition } from './definition.ts';

const schema = z.object({ title: z.string().min(1) });
export type Type00Data = z.infer<typeof schema>;

/**
 * 페이지 제목. 호스트 CSS가 `.mig-container .mig-section.type-00`을 display:none으로 숨긴다(3287행).
 * 호스트 의도대로 프리셋을 그대로 쓰고, 제목은 PageModel.title에도 남긴다.
 */
export const type00: TypeDefinition<Type00Data> = {
  id: 'type00',
  label: 'type00 페이지 제목 (호스트에서 숨김)',
  strategy: 'preset',
  hostPreset: 'type-00',
  variants: ['default'],
  schema: schema as z.ZodType<Type00Data>,
  fields: [{ key: 'title', label: '페이지 제목', kind: 'richText', required: true, help: '호스트 화면에서는 보이지 않습니다.' }],
  defaults: { title: '페이지 제목' },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const heading = descendants(src.element, isHeading)[0];
    const title = heading ? richFrom(heading) : plainText(src.element);
    if (!title) diagnostics.push({ level: 'warn', code: 'EMPTY_FIELD', message: 'type00 제목이 비어 있음', sectionIndex: src.index });
    const images = descendants(src.element, (el) => el.tagName === 'img').length;
    const lostText = heading ? uncoveredText(src.element, [title]) : '';
    const fallbackReason = images ? `type00에 이미지 ${images}장을 담을 자리가 없음` : lostText ? `제목 밖 텍스트를 담을 자리가 없음: ${lostText.slice(0, 40)}` : undefined;
    return { data: { title: title || ' ' }, variant: 'default', modifiers, diagnostics, lossless: !fallbackReason && !diagnostics.some((d) => d.level !== 'info'), fallbackReason };
  },
  render(section) {
    return h('section', { class: 'mig-section type-00' }, [h('strong', { class: 'mig-title' }, [rich(section.data.title)])]);
  },
};
