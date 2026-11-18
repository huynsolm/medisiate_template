import { z } from 'zod';
import { toNumberInput } from '../schema/page.ts';
import { h, raw } from '../html/h.ts';
import { rich } from '../helpers/misc.ts';
import { scanSection } from '../parse/common.ts';
import { byClass, finish, itemText, layoutFixed, listItems, originalHeader, perRowFrom } from '../parse/original.ts';
import { descendants } from '../parse/dom.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, LIST_RESET, presetSection } from './preset.ts';

const schema = z.object({
  ...headerShape,
  /** 원본 선택(한 줄 1~3개). 호스트 프리셋은 PC 3열 고정이라 화면에는 반영하지 않고 값만 보존한다. */
  // 편집기 선택 상자는 '1'~'3' 문자열을 넘기므로 숫자로 바꿔 받는다
  perRow: z.preprocess(toNumberInput, z.union([z.literal(1), z.literal(2), z.literal(3)])).default(3),
  items: z.array(z.object({ text: z.string().default('') })).default([]),
});
export type Type09Data = z.infer<typeof schema>;

/** 원본 체크 도형(40×40)을 브랜드 색으로 */
const CHECK = '<svg width="25" height="25" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path fill="var(--mig-primary-color)" d="M323,9872.8a16.985,16.985,0,1,1-16.981,16.98A17,17,0,0,1,323,9872.8m0-3.01a20,20,0,1,0,20,19.99,19.993,19.993,0,0,0-20-19.99h0Zm8.444,12.94-10.216,10.21-4.028-4.02-2.013,2.01,4.027,4.03,2.014,2.01,2.014-2.01,10.216-10.22-2.014-2.01h0Z" transform="translate(-303 -9869.78)"></path></svg>';

/**
 * 원본: .cms-list-wrap > ul.cms-column-list > li.cms-list-item.col-N > .cms-inner-box > .cms-figure.check(svg) + p.cms-description
 * 호스트: section.type-09 > .mig-body > ul.mig-list > li.mig-item > .mig-content(아이콘 칸 + 본문 격자)
 */
export const type09: TypeDefinition<Type09Data> = {
  id: 'type09',
  label: 'type09 체크 표시 목록',
  strategy: 'preset',
  hostPreset: 'type-09',
  variants: ['default'],
  schema: schema as z.ZodType<Type09Data>,
  fields: [
    ...headerFields,
    { key: 'perRow', label: '원본의 한 줄 항목 수 (호스트는 PC 3열 고정)', kind: 'select', options: [{ value: '1', label: '1개' }, { value: '2', label: '2개' }, { value: '3', label: '3개' }] },
    { key: 'items', label: '항목', kind: 'repeat', min: 0, max: 12, fields: [{ key: 'text', label: '글', kind: 'richText' }] },
  ],
  defaults: { perRow: 3, items: [{ text: '항목' }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const list = descendants(src.element, byClass('cms-column-list'))[0];
    const lis = listItems(list);
    const perRow = perRowFrom(lis[0]) ?? 3;
    if (perRow !== 3) diagnostics.push(layoutFixed(src, `원본은 한 줄에 ${perRow}개이지만 호스트 프리셋은 PC에서 3개로 고정됩니다`, { perRow }));
    const items = lis.map((li) => ({ text: itemText(li, 'cms-description') }));
    const data: Type09Data = { ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}), perRow, items };
    return finish(src, data, [...header.used, ...items.map((i) => i.text)], [], { modifiers, diagnostics });
  },
  render(section) {
    return presetSection('type-09', section, [
      h('ul', { class: 'mig-list', style: LIST_RESET }, section.data.items.map((item) =>
        h('li', { class: 'mig-item' }, [
          h('div', { class: 'mig-content' }, [h('span', { class: 'mig-icon' }, [raw(CHECK)]), h('p', { class: 'mig-desc' }, [rich(item.text)])]),
        ])),
      ),
    ]);
  },
};
