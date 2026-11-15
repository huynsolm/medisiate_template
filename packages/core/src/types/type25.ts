import { z } from 'zod';
import { h } from '../html/h.ts';
import { visualPcMo } from '../helpers/image.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { scanSection } from '../parse/common.ts';
import { byClass, finish, imagesIn, layoutFixed, listItems, optional, originalHeader, textOf } from '../parse/original.ts';
import { children, classesOf, descendants, type DomElement } from '../parse/dom.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, LIST_RESET, presetSection } from './preset.ts';

const itemSchema = z.object({ title: z.string().optional(), desc: z.string().optional(), image: imagePairSchema.default({}) });
const schema = z.object({
  ...headerShape,
  /** 원본 선택(한 줄 3칸 col-lg-4 / 4칸 col-lg-3). 호스트 프리셋은 PC 3열 고정이라 값만 보존한다. */
  perRow: z.coerce.number().pipe(z.union([z.literal(3), z.literal(4)])).default(3),
  items: z.array(itemSchema).default([]),
});
export type Type25Data = z.infer<typeof schema>;

/**
 * 원본: ul.cms-column-list > li.col-6.col-lg-3|4 > .cms-visual(PC/MO) + .cms-description-box(p.cms-title, p.cms-description)
 * 호스트: section.type-25 > .mig-body > ul.mig-list > li.mig-item > .mig-visual + .mig-text-wrap
 */
export const type25: TypeDefinition<Type25Data> = {
  id: 'type25',
  label: 'type25 이미지 + 제목·글 목록',
  strategy: 'preset',
  hostPreset: 'type-25',
  variants: ['default'],
  schema: schema as z.ZodType<Type25Data>,
  fields: [
    ...headerFields,
    { key: 'perRow', label: '원본의 한 줄 칸 수 (호스트는 PC 3열 고정)', kind: 'select', options: [{ value: '3', label: '3개' }, { value: '4', label: '4개' }] },
    {
      key: 'items', label: '칸', kind: 'repeat', min: 0, max: 12,
      fields: [
        { key: 'title', label: '제목', kind: 'richText' },
        { key: 'desc', label: '글', kind: 'richText' },
        { key: 'image', label: '이미지 (PC/MO)', kind: 'imagePair' },
      ],
    },
  ],
  defaults: { perRow: 3, items: [{ title: '제목', desc: '글', image: {} }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const lis = listItems(descendants(src.element, byClass('cms-column-list'))[0]);
    const perRow = lis[0] && classesOf(lis[0]).includes('col-lg-3') ? 4 : 3;
    if (perRow !== 3) diagnostics.push(layoutFixed(src, '원본은 한 줄에 4칸이지만 호스트 프리셋은 PC에서 3칸으로 고정됩니다', { perRow }));
    const used: string[] = [...header.used];
    const extra: DomElement[] = [];
    const items = lis.map((li) => {
      const { pair, extra: more } = imagesIn(children(li).find(byClass('cms-visual')), src, diagnostics);
      extra.push(...more);
      const box = children(li).find(byClass('cms-description-box'));
      const item = { ...optional('title', textOf(box, 'cms-title')), ...optional('desc', textOf(box, 'cms-description')), image: pair };
      used.push(item.title ?? '', item.desc ?? '');
      return item;
    });
    const data: Type25Data = { ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}), perRow, items };
    return finish(src, data, used, extra, { modifiers, diagnostics });
  },
  render(section) {
    return presetSection('type-25', section, [
      h('ul', { class: 'mig-list', style: LIST_RESET }, section.data.items.map((item) =>
        h('li', { class: 'mig-item' }, [
          visualPcMo(item.image),
          (!isBlank(item.title) || !isBlank(item.desc)) && h('div', { class: 'mig-text-wrap' }, [
            !isBlank(item.title) && h('strong', { class: 'mig-title' }, [rich(item.title)]),
            !isBlank(item.desc) && h('p', { class: 'mig-desc' }, [rich(item.desc)]),
          ]),
        ])),
      ),
    ]);
  },
};
