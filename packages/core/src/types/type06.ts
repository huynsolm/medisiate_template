import { z } from 'zod';
import { h } from '../html/h.ts';
import { visualPcMo } from '../helpers/image.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { byClass, childText, finish, imagesIn, listItems, originalHeader } from '../parse/original.ts';
import { richFrom, scanSection } from '../parse/common.ts';
import { children, descendants, type DomElement } from '../parse/dom.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, LIST_RESET, presetSection } from './preset.ts';

const itemSchema = z.object({ text: z.string().default(''), image: imagePairSchema.default({}), subitems: z.array(z.object({ text: z.string().default('') })).default([]) });
const schema = z.object({ ...headerShape, items: z.array(itemSchema).default([]) });
export type Type06Data = z.infer<typeof schema>;

/**
 * 원본: ul.cms-column-list.item-bg-box > li.col-6.col-lg-3 > .cms-inner-box > .cms-icon(PC/MO) +
 *   .cms-description-box > p.cms-description [+ ul.cms-bullet-list > li.cms-description]
 *   하위 목록이 있는 칸은 원본 도구가 글을 <strong>으로 감싼다. 이 서식은 글(rich)에 그대로 남긴다.
 * 호스트: section.type-06 > .mig-body > ul.mig-list(카드, 1열 → PC 3열) > li.mig-item > .mig-visual(아이콘, 최대 56px) +
 *   p.mig-desc [+ ul.mig-list.type-dot]
 */
export const type06: TypeDefinition<Type06Data> = {
  id: 'type06',
  label: 'type06 아이콘 카드 (글머리 선택)',
  strategy: 'preset',
  hostPreset: 'type-06',
  variants: ['default'],
  schema: schema as z.ZodType<Type06Data>,
  fields: [
    ...headerFields,
    {
      key: 'items', label: '칸', kind: 'repeat', min: 0, max: 12,
      fields: [
        { key: 'text', label: '글', kind: 'richText' },
        { key: 'image', label: '아이콘 (PC/MO)', kind: 'imagePair' },
        { key: 'subitems', label: '글머리', kind: 'repeat', min: 0, max: 8, fields: [{ key: 'text', label: '글', kind: 'text' }] },
      ],
    },
  ],
  defaults: { items: [{ text: '칸', image: {}, subitems: [] }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const used: string[] = [...header.used];
    const extra: DomElement[] = [];
    const items = listItems(descendants(src.element, byClass('cms-column-list'))[0]).map((li) => {
      const box = children(li).find(byClass('cms-inner-box')) ?? li;
      const { pair, extra: more } = imagesIn(children(box).find(byClass('cms-icon')), src, diagnostics);
      extra.push(...more);
      const desc = children(box).find(byClass('cms-description-box'));
      const bullets = desc ? children(desc).find(byClass('cms-bullet-list')) : undefined;
      const item = { text: childText(desc, 'cms-description'), image: pair, subitems: listItems(bullets).map((b) => ({ text: richFrom(b) })) };
      used.push(item.text, ...item.subitems.map((s) => s.text));
      return item;
    });
    const data: Type06Data = { ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}), items };
    return finish(src, data, used, extra, { modifiers, diagnostics });
  },
  render(section) {
    return presetSection('type-06', section, [
      h('ul', { class: 'mig-list', style: LIST_RESET }, section.data.items.map((item) =>
        h('li', { class: 'mig-item' }, [
          visualPcMo(item.image),
          !isBlank(item.text) && h('p', { class: 'mig-desc' }, [rich(item.text)]),
          item.subitems.length > 0 && h('ul', { class: 'mig-list type-dot', style: LIST_RESET }, item.subitems.map((s) => h('li', { class: 'mig-item' }, [h('span', { class: 'mig-desc' }, [rich(s.text)])]))),
        ])),
      ),
    ]);
  },
};
