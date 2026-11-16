import { z } from 'zod';
import { h } from '../html/h.ts';
import { visualPcMo } from '../helpers/image.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { scanSection } from '../parse/common.ts';
import { byClass, finish, imagesIn, itemPart, layoutFixed, listItems, optional, originalHeader, textOf } from '../parse/original.ts';
import { classesOf, descendants, type DomElement } from '../parse/dom.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, LIST_RESET, presetSection } from './preset.ts';

const TEXT_STYLES = ['text-type-1', 'text-type-3'] as const;
const itemSchema = z.object({ num: z.string().optional(), title: z.string().optional(), desc: z.string().optional(), image: imagePairSchema.default({}) });
const schema = z.object({
  ...headerShape,
  /** 원본 글 스타일(text-type-1 일반 / text-type-3 번호에 위아래 선). 호스트 프리셋에는 글 스타일 변형이 없어 값만 보존한다. */
  textStyle: z.enum(TEXT_STYLES).default('text-type-1'),
  items: z.array(itemSchema).default([]),
});
export type Type18Data = z.infer<typeof schema>;

/**
 * 원본: ol.cms-img-list.text-type-N > li.col-6.col-lg-4 > .cms-visual(PC/MO) + .cms-visual-text(p.cms-eyebrow 번호, p.cms-title, p.cms-description)
 * 호스트: section.type-18 > .mig-body > ul.mig-list(1열 → PC 3열) > li.mig-item > .mig-visual(1:1 cover) + .mig-text-wrap
 */
export const type18: TypeDefinition<Type18Data> = {
  id: 'type18',
  label: 'type18 이미지 카드 (번호·제목·설명)',
  strategy: 'preset',
  hostPreset: 'type-18',
  variants: ['default'],
  schema: schema as z.ZodType<Type18Data>,
  fields: [
    ...headerFields,
    { key: 'textStyle', label: '원본 글 스타일 (호스트는 한 가지)', kind: 'select', options: [{ value: 'text-type-1', label: '일반' }, { value: 'text-type-3', label: '번호에 위아래 선' }] },
    {
      key: 'items', label: '칸', kind: 'repeat', min: 0, max: 12,
      fields: [
        { key: 'num', label: '번호', kind: 'text' },
        { key: 'title', label: '제목', kind: 'text' },
        { key: 'desc', label: '설명', kind: 'richText' },
        { key: 'image', label: '이미지 (PC/MO)', kind: 'imagePair' },
      ],
    },
  ],
  defaults: { textStyle: 'text-type-1', items: [{ num: '01', title: '제목', desc: '설명', image: {} }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const list = descendants(src.element, byClass('cms-img-list'))[0];
    const textStyle = TEXT_STYLES.find((s) => list && classesOf(list).includes(s)) ?? 'text-type-1';
    if (textStyle !== 'text-type-1') diagnostics.push(layoutFixed(src, '원본 글 스타일(번호에 위아래 선)은 호스트 프리셋에 없어 일반 모양으로 보입니다', { textStyle }));
    const used: string[] = [...header.used];
    const extra: DomElement[] = [];
    const items = listItems(list).map((li) => {
      const { pair, extra: more } = imagesIn(itemPart(li, 'cms-visual'), src, diagnostics);
      extra.push(...more);
      const text = itemPart(li, 'cms-visual-text');
      const item = { ...optional('num', textOf(text, 'cms-eyebrow')), ...optional('title', textOf(text, 'cms-title')), ...optional('desc', textOf(text, 'cms-description')), image: pair };
      used.push(item.num ?? '', item.title ?? '', item.desc ?? '');
      return item;
    });
    const data: Type18Data = { ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}), textStyle, items };
    return finish(src, data, used, extra, { modifiers, diagnostics });
  },
  render(section) {
    return presetSection('type-18', section, [
      h('ul', { class: 'mig-list', style: LIST_RESET }, section.data.items.map((item) =>
        h('li', { class: 'mig-item' }, [
          visualPcMo(item.image),
          h('div', { class: 'mig-text-wrap' }, [
            !isBlank(item.num) && h('span', { class: 'mig-num' }, [rich(item.num)]),
            !isBlank(item.title) && h('strong', { class: 'mig-title' }, [rich(item.title)]),
            !isBlank(item.desc) && h('p', { class: 'mig-desc' }, [rich(item.desc)]),
          ]),
        ])),
      ),
    ]);
  },
};
