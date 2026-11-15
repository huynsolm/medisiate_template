import { z } from 'zod';
import { h } from '../html/h.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { scanSection } from '../parse/common.ts';
import { byClass, finish, layoutFixed, listItems, optional, originalHeader, textOf } from '../parse/original.ts';
import { classesOf, descendants } from '../parse/dom.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, LIST_RESET, presetSection } from './preset.ts';

const schema = z.object({
  ...headerShape,
  /** 원본 제목 칸 폭(col-auto = 'auto', col-2 = 'wide'). 호스트 프리셋은 카드 목록이라 값만 보존한다. */
  titleWidth: z.enum(['auto', 'wide']).default('auto'),
  items: z.array(z.object({ title: z.string().optional(), desc: z.string().optional() })).default([]),
});
export type Type17Data = z.infer<typeof schema>;

/**
 * 원본: ol.cms-row-list > li > .cms-description-box.row > p.cms-title.col-auto|col-2 + p.cms-description.col
 * 호스트: section.type-17 > .mig-body > ul.mig-list > li.mig-item(카드, PC 3열) > strong.mig-title + p.mig-desc
 */
export const type17: TypeDefinition<Type17Data> = {
  id: 'type17',
  label: 'type17 제목 + 설명 목록',
  strategy: 'preset',
  hostPreset: 'type-17',
  variants: ['default'],
  schema: schema as z.ZodType<Type17Data>,
  fields: [
    ...headerFields,
    { key: 'titleWidth', label: '원본의 제목 칸 폭 (호스트는 카드 목록)', kind: 'select', options: [{ value: 'auto', label: '글자 길이만큼' }, { value: 'wide', label: '넓게' }] },
    { key: 'items', label: '행', kind: 'repeat', min: 0, max: 12, fields: [{ key: 'title', label: '제목', kind: 'text' }, { key: 'desc', label: '설명', kind: 'richText' }] },
  ],
  defaults: { titleWidth: 'auto', items: [{ title: '제목', desc: '설명' }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const lis = listItems(descendants(src.element, byClass('cms-row-list'))[0]);
    const firstTitle = lis[0] ? descendants(lis[0], byClass('cms-title'))[0] : undefined;
    const titleWidth = firstTitle && classesOf(firstTitle).includes('col-2') ? 'wide' : 'auto';
    if (titleWidth === 'wide') diagnostics.push(layoutFixed(src, '원본은 제목 칸을 넓게 두지만 호스트 프리셋은 카드 목록이라 칸 폭이 없습니다', { titleWidth }));
    const items = lis.map((li) => ({ ...optional('title', textOf(li, 'cms-title')), ...optional('desc', textOf(li, 'cms-description')) }));
    const data: Type17Data = { ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}), titleWidth, items };
    return finish(src, data, [...header.used, ...items.flatMap((i) => [i.title ?? '', i.desc ?? ''])], [], { modifiers, diagnostics });
  },
  render(section) {
    return presetSection('type-17', section, [
      h('ul', { class: 'mig-list', style: LIST_RESET }, section.data.items.map((item) =>
        h('li', { class: 'mig-item' }, [
          !isBlank(item.title) && h('strong', { class: 'mig-title' }, [rich(item.title)]),
          !isBlank(item.desc) && h('p', { class: 'mig-desc' }, [rich(item.desc)]),
        ])),
      ),
    ]);
  },
};
