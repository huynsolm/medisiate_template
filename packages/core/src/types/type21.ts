import { z } from 'zod';
import { h } from '../html/h.ts';
import { visualPcMo } from '../helpers/image.ts';
import { scanSection } from '../parse/common.ts';
import { byClass, finish, imagesIn, originalHeader } from '../parse/original.ts';
import { descendants } from '../parse/dom.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { readBorderList, renderBorderList } from './border-list.ts';
import { headerFields, headerShape, presetSection } from './preset.ts';

const schema = z.object({ ...headerShape, image: imagePairSchema.default({}), items: z.array(z.object({ text: z.string().default('') })).default([]) });
export type Type21Data = z.infer<typeof schema>;

/**
 * 원본: .cms-header.left-type(왼쪽 정렬) + .cms-column-wrap > .cms-visual.col-lg-5(PC/MO) + .cms-box.col-lg-7 > ul.cms-border-list
 * 호스트: section.type-21 > .mig-body > .mig-content(PC 4:6 격자) > .mig-visual(PC/MO) + ul.mig-list(테두리 카드, PC 2열)
 * 머리글 왼쪽 정렬과 5:7 비율은 원본 도구의 고정값이라 진단 없이 호스트 디자인을 따른다.
 */
export const type21: TypeDefinition<Type21Data> = {
  id: 'type21',
  label: 'type21 이미지 + 테두리 목록',
  strategy: 'preset',
  hostPreset: 'type-21',
  variants: ['default'],
  schema: schema as z.ZodType<Type21Data>,
  fields: [
    ...headerFields,
    { key: 'image', label: '이미지 (PC/MO)', kind: 'imagePair' },
    { key: 'items', label: '목록', kind: 'repeat', min: 0, max: 12, fields: [{ key: 'text', label: '글', kind: 'richText' }] },
  ],
  defaults: { image: {}, items: [{ text: '목록' }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const { pair, extra } = imagesIn(descendants(src.element, byClass('cms-visual'))[0], src, diagnostics);
    const items = readBorderList(src.element);
    const data: Type21Data = { ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}), image: pair, items };
    return finish(src, data, [...header.used, ...items.map((i) => i.text)], extra, { modifiers, diagnostics });
  },
  render(section) {
    return presetSection('type-21', section, [h('div', { class: 'mig-content' }, [visualPcMo(section.data.image), renderBorderList(section.data.items)])]);
  },
};
