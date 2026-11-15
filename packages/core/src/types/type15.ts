import { z } from 'zod';
import { h } from '../html/h.ts';
import { visualPcMo } from '../helpers/image.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { scanSection } from '../parse/common.ts';
import { byClass, childText, finish, imagesIn, listItems, optional, originalHeader, textOf } from '../parse/original.ts';
import { children, descendants, type DomElement } from '../parse/dom.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, LIST_RESET, presetSection } from './preset.ts';

const itemSchema = z.object({
  title: z.string().optional(),
  /** 원본은 글머리가 없을 때만 이 문단을 보여 준다 */
  desc: z.string().optional(),
  image: imagePairSchema.default({}),
  subitems: z.array(z.object({ text: z.string() })).default([]),
});
const schema = z.object({ ...headerShape, items: z.array(itemSchema).default([]) });
export type Type15Data = z.infer<typeof schema>;

/**
 * 원본: ul.cms-column-list > li.col-12.col-lg-4 > .cms-visual(PC/MO) + .cms-description-box(p.cms-title + ul.cms-bullet-list 또는 p.cms-description)
 * 호스트: section.type-15 > .mig-body > .mig-content > ul.mig-list > li.mig-item > .mig-visual + strong.mig-title + (ul.mig-list.type-dot | p.mig-desc)
 * 하위 글머리는 type-dot: 호스트의 3열 격자(.mig-list:first-of-type:not(.type-dot))가 하위 목록에 걸리지 않게 하고 점 글머리를 받는다.
 */
export const type15: TypeDefinition<Type15Data> = {
  id: 'type15',
  label: 'type15 이미지 3칸 목록 (글머리 또는 문단)',
  strategy: 'preset',
  hostPreset: 'type-15',
  variants: ['default'],
  schema: schema as z.ZodType<Type15Data>,
  fields: [
    ...headerFields,
    {
      key: 'items', label: '칸', kind: 'repeat', min: 0, max: 12,
      fields: [
        { key: 'title', label: '제목', kind: 'text' },
        { key: 'image', label: '이미지 (PC/MO)', kind: 'imagePair' },
        { key: 'subitems', label: '글머리', kind: 'repeat', min: 0, max: 8, fields: [{ key: 'text', label: '글', kind: 'text' }] },
        { key: 'desc', label: '문단 (글머리가 없을 때)', kind: 'richText' },
      ],
    },
  ],
  defaults: { items: [{ title: '제목', image: {}, subitems: [] }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const used: string[] = [...header.used];
    const extra: DomElement[] = [];
    const items = listItems(descendants(src.element, byClass('cms-column-list'))[0]).map((li) => {
      const { pair, extra: more } = imagesIn(children(li).find(byClass('cms-visual')), src, diagnostics);
      extra.push(...more);
      const box = children(li).find(byClass('cms-description-box'));
      const bullets = box ? children(box).find(byClass('cms-bullet-list')) : undefined;
      const item = {
        ...optional('title', childText(box, 'cms-title')),
        ...optional('desc', childText(box, 'cms-description')),
        image: pair,
        subitems: listItems(bullets).map((b) => ({ text: textOf(b, 'cms-description') })),
      };
      used.push(item.title ?? '', item.desc ?? '', ...item.subitems.map((s) => s.text));
      return item;
    });
    const data: Type15Data = { ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}), items };
    return finish(src, data, used, extra, { modifiers, diagnostics });
  },
  render(section) {
    return presetSection('type-15', section, [
      h('div', { class: 'mig-content' }, [
        h('ul', { class: 'mig-list', style: LIST_RESET }, section.data.items.map((item) =>
          h('li', { class: 'mig-item' }, [
            visualPcMo(item.image),
            !isBlank(item.title) && h('strong', { class: 'mig-title' }, [rich(item.title)]),
            item.subitems.length > 0
              ? h('ul', { class: 'mig-list type-dot', style: LIST_RESET }, item.subitems.map((s) => h('li', { class: 'mig-item' }, [h('span', { class: 'mig-desc' }, [rich(s.text)])])))
              : !isBlank(item.desc) && h('p', { class: 'mig-desc' }, [rich(item.desc)]),
          ])),
        ),
      ]),
    ]);
  },
};
