import { z } from 'zod';
import { h } from '../html/h.ts';
import { visualPcMo } from '../helpers/image.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { scanSection } from '../parse/common.ts';
import { byClass, childText, finish, imagesIn, optional, originalHeader } from '../parse/original.ts';
import { children } from '../parse/dom.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, presetSection } from './preset.ts';

const schema = z.object({
  ...headerShape, desc: z.string().optional(), image: imagePairSchema.default({}),
  /** 원본에서 설명이 이미지 뒤에 있었는지(순서를 그대로 출력). 원본 도구 기본은 설명 → 이미지 */
  textAfter: z.boolean().optional(),
});
export type Type23Data = z.infer<typeof schema>;

/**
 * 원본: .cms-inner > .cms-header + [.cms-description-box.text-center > p.cms-description] + .cms-visual(PC/MO)
 * 호스트: section.type-23 > .mig-body > [.mig-text-wrap > p.mig-desc] + .mig-visual(PC/MO, 폭 100%)
 * 원본은 설명을 가운데 정렬하지만 호스트 type-23 글 묶음은 왼쪽 정렬이다(호스트 디자인을 따른다).
 */
export const type23: TypeDefinition<Type23Data> = {
  id: 'type23',
  label: 'type23 설명 + 넓은 이미지',
  strategy: 'preset',
  hostPreset: 'type-23',
  variants: ['default'],
  schema: schema as z.ZodType<Type23Data>,
  fields: [
    ...headerFields,
    { key: 'desc', label: '설명', kind: 'richText' },
    { key: 'image', label: '이미지 (PC/MO)', kind: 'imagePair' },
    { key: 'textAfter', label: '설명을 이미지 뒤에', kind: 'checkbox' },
  ],
  defaults: { desc: '설명', image: {} },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const inner = children(src.element).find(byClass('cms-inner')) ?? src.element;
    const kids = children(inner);
    const descBox = kids.find(byClass('cms-description-box'));
    const visual = kids.find(byClass('cms-visual'));
    const desc = childText(descBox, 'cms-description');
    const { pair, extra } = imagesIn(visual, src, diagnostics);
    const textAfter = Boolean(desc && descBox && visual && kids.indexOf(descBox) > kids.indexOf(visual));
    const data: Type23Data = { ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}), ...optional('desc', desc), image: pair, ...(textAfter ? { textAfter } : {}) };
    return finish(src, data, [...header.used, desc], extra, { modifiers, diagnostics });
  },
  render(section) {
    const d = section.data;
    const text = !isBlank(d.desc) && h('div', { class: 'mig-text-wrap' }, [h('p', { class: 'mig-desc' }, [rich(d.desc)])]);
    return presetSection('type-23', section, [!d.textAfter && text, visualPcMo(d.image), d.textAfter && text]);
  },
};
