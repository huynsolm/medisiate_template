import { z } from 'zod';
import { h } from '../html/h.ts';
import { visualPcMo } from '../helpers/image.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { scanSection } from '../parse/common.ts';
import { byClass, childText, finish, imagesIn, listItems, originalHeader } from '../parse/original.ts';
import { children, descendants, type DomElement } from '../parse/dom.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, LIST_RESET, presetSection } from './preset.ts';

const schema = z.object({ ...headerShape, items: z.array(z.object({ text: z.string().default(''), image: imagePairSchema.default({}) })).default([]) });
export type Type12Data = z.infer<typeof schema>;

/**
 * 원본: ul.cms-column-list.item-bg-box > li.col-12.col-lg-4 > .cms-inner-box > .cms-icon(PC/MO) + .cms-description-box > p.cms-description
 * 호스트: section.type-12 > .mig-body > ul.mig-list(카드, 1열 → PC 3열) > li.mig-item > .mig-visual(아이콘, 최대 56px) + p.mig-desc
 */
export const type12: TypeDefinition<Type12Data> = {
  id: 'type12',
  label: 'type12 아이콘 카드',
  strategy: 'preset',
  hostPreset: 'type-12',
  variants: ['default'],
  schema: schema as z.ZodType<Type12Data>,
  fields: [
    ...headerFields,
    { key: 'items', label: '칸', kind: 'repeat', min: 0, max: 12, fields: [{ key: 'text', label: '글', kind: 'richText' }, { key: 'image', label: '아이콘 (PC/MO)', kind: 'imagePair' }] },
  ],
  defaults: { items: [{ text: '내용', image: {} }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const extra: DomElement[] = [];
    const items = listItems(descendants(src.element, byClass('cms-column-list'))[0]).map((li) => {
      const box = children(li).find(byClass('cms-inner-box')) ?? li;
      const { pair, extra: more } = imagesIn(children(box).find(byClass('cms-icon')), src, diagnostics);
      extra.push(...more);
      return { text: childText(children(box).find(byClass('cms-description-box')), 'cms-description'), image: pair };
    });
    const data: Type12Data = { ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}), items };
    return finish(src, data, [...header.used, ...items.map((i) => i.text)], extra, { modifiers, diagnostics });
  },
  render(section) {
    return presetSection('type-12', section, [
      h('ul', { class: 'mig-list', style: LIST_RESET }, section.data.items.map((item) =>
        h('li', { class: 'mig-item' }, [visualPcMo(item.image), !isBlank(item.text) && h('p', { class: 'mig-desc' }, [rich(item.text)])])),
      ),
    ]);
  },
};
