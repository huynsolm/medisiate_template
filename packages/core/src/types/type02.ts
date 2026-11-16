import { z } from 'zod';
import { h } from '../html/h.ts';
import { visualPcMo } from '../helpers/image.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { richFrom, scanSection } from '../parse/common.ts';
import { byClass, childText, finish, firstByClass, imagesIn, itemPart, listItems, optional, originalHeader, textOf } from '../parse/original.ts';
import { descendants, type DomElement } from '../parse/dom.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, LIST_RESET, presetSection } from './preset.ts';

const schema = z.object({
  ...headerShape,
  items: z.array(z.object({
    label: z.string().optional(), title: z.string().optional(), desc: z.string().optional(),
    /** 도형 안 아이콘 이미지(원본 옵션: 글 대신 아이콘) */
    icon: imagePairSchema.default({}),
  })).default([]),
  /** 목록 아래 글(원본 .cms-bottom-text, 말풍선 등). 순서대로 */
  bottom: z.array(z.object({ text: z.string().default('') })).default([]),
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
        { key: 'icon', label: '도형 안 아이콘 (PC/MO)', kind: 'imagePair' },
        { key: 'desc', label: '설명', kind: 'richText' },
      ],
    },
    { key: 'bottom', label: '목록 아래 글', kind: 'repeat', min: 0, max: 6, fields: [{ key: 'text', label: '글', kind: 'richText' }] },
  ],
  defaults: { items: [{ label: '항목', title: '핵심 문구', desc: '설명', icon: {} }], bottom: [] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const list = descendants(src.element, byClass('cms-figure-list'))[0];
    const used: string[] = [...header.used];
    const extra: DomElement[] = [];
    const items = listItems(list).map((li) => {
      const figure = descendants(li, byClass('cms-figure-text'))[0];
      const { pair: icon, extra: more } = imagesIn(figure, src, diagnostics);
      extra.push(...more);
      const box = itemPart(li, 'cms-description-box');
      const item = {
        ...optional('label', textOf(figure, 'cms-eyebrow')),
        ...optional('title', textOf(figure, 'cms-description')),
        ...optional('desc', childText(box, 'cms-description')),
        icon,
      };
      used.push(item.label ?? '', item.title ?? '', item.desc ?? '');
      return item;
    });
    const bottomBox = firstByClass(src.element, 'cms-bottom-text');
    const bottom = (bottomBox ? descendants(bottomBox, byClass('cms-description')) : []).map((p) => ({ text: richFrom(p) }));
    used.push(...bottom.map((b) => b.text));
    const data: Type02Data = { ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}), items, bottom };
    return finish(src, data, used, extra, { modifiers, diagnostics });
  },
  render(section) {
    return presetSection('type-02', section, [
      h('div', { class: 'mig-content' }, [
        h('ul', { class: 'mig-list', style: LIST_RESET }, section.data.items.map((item) =>
          h('li', { class: 'mig-item' }, [
            visualPcMo(item.icon),
            !isBlank(item.label) && h('span', { class: 'mig-label' }, [rich(item.label)]),
            !isBlank(item.title) && h('strong', { class: 'mig-title' }, [rich(item.title)]),
            !isBlank(item.desc) && h('p', { class: 'mig-desc' }, [rich(item.desc)]),
          ])),
        ),
        section.data.bottom.length > 0 && h('div', { class: 'mig-text-wrap' }, section.data.bottom.map((b) => h('p', { class: 'mig-desc' }, [rich(b.text)]))),
      ]),
    ]);
  },
};
