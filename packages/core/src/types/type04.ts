import { z } from 'zod';
import { h } from '../html/h.ts';
import { scanSection } from '../parse/common.ts';
import { byClass, finish, imagesIn, itemPart, listItems, optional, originalHeader, textOf } from '../parse/original.ts';
import { descendants, type DomElement } from '../parse/dom.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, imageTextItem, LIST_RESET, presetSection } from './preset.ts';

const itemSchema = z.object({ num: z.string().optional(), title: z.string().optional(), desc: z.string().optional(), image: imagePairSchema.default({}) });
const schema = z.object({ ...headerShape, items: z.array(itemSchema).default([]) });
export type Type04Data = z.infer<typeof schema>;

/**
 * 원본: ol.cms-tile-list.between-arrow > li > .cms-visual(PC/MO) + .cms-description-box > .cms-box-inner(번호·제목·설명)
 * 호스트: section.type-04 > .mig-body > ul.mig-list > li.mig-item > .mig-content > .mig-visual + .mig-text-wrap
 * 항목 사이 화살표(between-arrow)는 원본 CSS의 장식이라 옮기지 않는다.
 */
export const type04: TypeDefinition<Type04Data> = {
  id: 'type04',
  label: 'type04 이미지·글 목록',
  strategy: 'preset',
  hostPreset: 'type-04',
  variants: ['default'],
  schema: schema as z.ZodType<Type04Data>,
  fields: [
    ...headerFields,
    {
      key: 'items', label: '항목', kind: 'repeat', min: 0, max: 12,
      fields: [
        { key: 'num', label: '번호', kind: 'text' },
        { key: 'title', label: '제목', kind: 'text' },
        { key: 'desc', label: '설명', kind: 'richText' },
        { key: 'image', label: '이미지 (PC/MO)', kind: 'imagePair' },
      ],
    },
  ],
  defaults: { items: [{ num: '01', title: '제목', desc: '설명', image: {} }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const used: string[] = [...header.used];
    const extra: DomElement[] = [];
    const items = listItems(descendants(src.element, byClass('cms-tile-list'))[0]).map((li) => {
      const { pair, extra: more } = imagesIn(itemPart(li, 'cms-visual'), src, diagnostics);
      extra.push(...more);
      const box = itemPart(li, 'cms-description-box');
      const item = { ...optional('num', textOf(box, 'cms-eyebrow')), ...optional('title', textOf(box, 'cms-title')), ...optional('desc', textOf(box, 'cms-description')), image: pair };
      used.push(item.num ?? '', item.title ?? '', item.desc ?? '');
      return item;
    });
    const data: Type04Data = { ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}), items };
    return finish(src, data, used, extra, { modifiers, diagnostics });
  },
  render(section) {
    return presetSection('type-04', section, [h('ul', { class: 'mig-list', style: LIST_RESET }, section.data.items.map(imageTextItem))]);
  },
};
