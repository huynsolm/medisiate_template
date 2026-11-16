import { z } from 'zod';
import { h } from '../html/h.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { scanSection } from '../parse/common.ts';
import { byClass, childText, finish, itemPart, listItems, optional, originalHeader, textOf } from '../parse/original.ts';
import { descendants } from '../parse/dom.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, LIST_RESET, presetSection } from './preset.ts';

const schema = z.object({
  ...headerShape,
  items: z.array(z.object({ label: z.string().optional(), title: z.string().optional(), desc: z.string().optional() })).default([]),
});
export type Type02Data = z.infer<typeof schema>;


/**
 * 원본: ol.cms-figure-list > li.cms-list-item > .cms-figure.pentagon(svg + .cms-figure-text: p.cms-eyebrow 작은 글, p.cms-description 핵심 글)
 *       + .cms-description-box > p.cms-description 설명
 * 호스트: section.type-02 > .mig-body > .mig-content > ul.mig-list > li.mig-item(span.mig-label + strong.mig-title + p.mig-desc)
 * 오각형 SVG는 장식이라 옮기지 않는다.
 */
export const type02: TypeDefinition<Type02Data> = {
  id: 'type02',
  label: 'type02 핵심 글 + 설명 카드 목록',
  strategy: 'preset',
  hostPreset: 'type-02',
  variants: ['default'],
  schema: schema as z.ZodType<Type02Data>,
  fields: [
    ...headerFields,
    {
      key: 'items', label: '항목', kind: 'repeat', min: 0, max: 12,
      fields: [
        { key: 'label', label: '작은 글', kind: 'text' },
        { key: 'title', label: '핵심 글', kind: 'text' },
        { key: 'desc', label: '설명', kind: 'richText' },
      ],
    },
  ],
  defaults: { items: [{ label: '항목', title: '핵심 문구', desc: '설명' }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const list = descendants(src.element, byClass('cms-figure-list'))[0];
    const used: string[] = [...header.used];
    const items = listItems(list).map((li) => {
      const figure = descendants(li, byClass('cms-figure-text'))[0];
      const box = itemPart(li, 'cms-description-box');
      const item = {
        ...optional('label', textOf(figure, 'cms-eyebrow')),
        ...optional('title', textOf(figure, 'cms-description')),
        ...optional('desc', childText(box, 'cms-description')),
      };
      used.push(item.label ?? '', item.title ?? '', item.desc ?? '');
      return item;
    });
    const data: Type02Data = { ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}), items };
    return finish(src, data, used, [], { modifiers, diagnostics });
  },
  render(section) {
    return presetSection('type-02', section, [
      h('div', { class: 'mig-content' }, [
        h('ul', { class: 'mig-list', style: LIST_RESET }, section.data.items.map((item) =>
          h('li', { class: 'mig-item' }, [
            !isBlank(item.label) && h('span', { class: 'mig-label' }, [rich(item.label)]),
            !isBlank(item.title) && h('strong', { class: 'mig-title' }, [rich(item.title)]),
            !isBlank(item.desc) && h('p', { class: 'mig-desc' }, [rich(item.desc)]),
          ])),
        ),
      ]),
    ]);
  },
};
