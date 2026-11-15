import { z } from 'zod';
import { h } from '../html/h.ts';
import { visualPcMo } from '../helpers/image.ts';
import { rich } from '../helpers/misc.ts';
import { scanSection } from '../parse/common.ts';
import { byClass, finish, firstByClass, imagesIn, listItems, originalHeader, textOf } from '../parse/original.ts';
import { descendants } from '../parse/dom.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, LIST_RESET, presetSection } from './preset.ts';

const schema = z.object({
  ...headerShape,
  image: imagePairSchema.default({}),
  items: z.array(z.object({ text: z.string().default('') })).default([]),
});
export type Type07Data = z.infer<typeof schema>;

/**
 * 원본: .cms-column-wrap > .cms-visual(PC/MO) + .cms-list-wrap > ul.cms-bullet-list > li.cms-list-item > p.cms-description
 * 호스트: section.type-07 > .mig-body > .mig-content > .mig-visual(직접 자식, PC 4:6 격자) + ul.mig-list > li.mig-item
 */
export const type07: TypeDefinition<Type07Data> = {
  id: 'type07',
  label: 'type07 이미지 + 글머리 목록',
  strategy: 'preset',
  hostPreset: 'type-07',
  variants: ['default'],
  schema: schema as z.ZodType<Type07Data>,
  fields: [
    ...headerFields,
    { key: 'image', label: '이미지 (PC/MO)', kind: 'imagePair' },
    { key: 'items', label: '글머리', kind: 'repeat', min: 0, max: 12, fields: [{ key: 'text', label: '글', kind: 'richText' }] },
  ],
  defaults: { image: {}, items: [{ text: '내용' }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const { pair: image, extra } = imagesIn(firstByClass(src.element, 'cms-visual'), src, diagnostics);
    const list = descendants(src.element, byClass('cms-bullet-list'))[0];
    const items = listItems(list).map((li) => ({ text: textOf(li, 'cms-description') }));
    const data: Type07Data = { ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}), image, items };
    return finish(src, data, [...header.used, ...items.map((i) => i.text)], extra, { modifiers, diagnostics });
  },
  render(section) {
    const d = section.data;
    return presetSection('type-07', section, [
      h('div', { class: 'mig-content' }, [
        visualPcMo(d.image),
        d.items.length > 0 && h('ul', { class: 'mig-list', style: LIST_RESET }, d.items.map((item) => h('li', { class: 'mig-item' }, [h('span', { class: 'mig-desc' }, [rich(item.text)])]))),
      ]),
    ]);
  },
};
