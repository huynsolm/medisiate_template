import { z } from 'zod';
import { h } from '../html/h.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { scanSection } from '../parse/common.ts';
import { byClass, finish, listItems, optional, originalHeader, textOf } from '../parse/original.ts';
import { descendants } from '../parse/dom.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, LIST_RESET, presetSection } from './preset.ts';

const schema = z.object({ ...headerShape, items: z.array(z.object({ num: z.string().optional(), text: z.string().default('') })).default([]) });
export type Type19Data = z.infer<typeof schema>;

/**
 * 원본: ol.cms-figure-list.item-between-border > li.col-6.col-lg > .cms-figure.hexagon(svg + .cms-figure-text > p.cms-eyebrow 번호 + p.cms-description)
 * 호스트: section.type-19 > .mig-body > ul.mig-list(2열 → PC 4열) > li.mig-item(카드) > span.mig-num + p.mig-desc
 * 육각형 도형과 항목 사이 선은 원본 CSS의 장식이라 옮기지 않는다(안의 글은 옮김).
 */
export const type19: TypeDefinition<Type19Data> = {
  id: 'type19',
  label: 'type19 단계 목록',
  strategy: 'preset',
  hostPreset: 'type-19',
  variants: ['default'],
  schema: schema as z.ZodType<Type19Data>,
  fields: [
    ...headerFields,
    { key: 'items', label: '단계', kind: 'repeat', min: 0, max: 12, fields: [{ key: 'num', label: '번호', kind: 'text' }, { key: 'text', label: '글', kind: 'richText' }] },
  ],
  defaults: { items: [{ num: '01', text: '1단계' }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const items = listItems(descendants(src.element, byClass('cms-figure-list'))[0]).map((li) => ({
      ...optional('num', textOf(li, 'cms-eyebrow')), text: textOf(li, 'cms-description'),
    }));
    const data: Type19Data = { ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}), items };
    return finish(src, data, [...header.used, ...items.flatMap((i) => [i.num ?? '', i.text])], [], { modifiers, diagnostics });
  },
  render(section) {
    return presetSection('type-19', section, [
      h('ul', { class: 'mig-list', style: LIST_RESET }, section.data.items.map((item) =>
        h('li', { class: 'mig-item' }, [
          !isBlank(item.num) && h('span', { class: 'mig-num' }, [rich(item.num)]),
          h('p', { class: 'mig-desc' }, [rich(item.text)]),
        ])),
      ),
    ]);
  },
};
