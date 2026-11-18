import { z } from 'zod';
import { h } from '../html/h.ts';
import { visualPcMo } from '../helpers/image.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { scanSection } from '../parse/common.ts';
import { byClass, childText, finish, imagesIn, itemPart, listItems, optional, originalHeader } from '../parse/original.ts';
import { children, descendants } from '../parse/dom.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, LIST_RESET, presetSection } from './preset.ts';

const schema = z.object({
  ...headerShape,
  image: imagePairSchema.default({}),
  items: z.array(z.object({ title: z.string().optional(), desc: z.string().optional() })).default([]),
});
export type Type24Data = z.infer<typeof schema>;

/**
 * 원본: .cms-visual(PC/MO) + ol.cms-ordered-list > li > .cms-description-box(p.cms-title, p.cms-description)
 *   번호는 원본 CSS 카운터(1, 2, 3…)가 붙인다(글로는 없음).
 * 호스트: section.type-24 > .mig-body > .mig-visual(PC/MO) + ol.mig-list > li.mig-item(카드) > span.mig-num + .mig-text-wrap
 *   호스트에는 카운터가 없고 목록 초기화로 번호가 사라지므로, 순서 번호를 글(span.mig-num)로 출력한다. 데이터에는 넣지 않는다.
 */
export const type24: TypeDefinition<Type24Data> = {
  id: 'type24',
  label: 'type24 이미지 + 번호 목록',
  strategy: 'preset',
  hostPreset: 'type-24',
  variants: ['default'],
  schema: schema as z.ZodType<Type24Data>,
  fields: [
    ...headerFields,
    { key: 'image', label: '이미지 (PC/MO)', kind: 'imagePair' },
    { key: 'items', label: '항목 (번호는 순서대로 자동)', kind: 'repeat', min: 0, max: 12, fields: [{ key: 'title', label: '제목', kind: 'text' }, { key: 'desc', label: '설명', kind: 'richText' }] },
  ],
  defaults: { image: {}, items: [{ title: '제목', desc: '설명' }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const inner = children(src.element).find(byClass('cms-inner')) ?? src.element;
    const { pair, extra } = imagesIn(children(inner).find(byClass('cms-visual')), src, diagnostics);
    // 제목·설명은 설명 상자의 직접 자식만 읽는다. 설명 안의 같은 클래스까지 집으면 글이 두 번 나온다 (P5 검수 I-1)
    const items = listItems(descendants(src.element, byClass('cms-ordered-list'))[0]).map((li) => {
      const box = itemPart(li, 'cms-description-box');
      return { ...optional('title', childText(box, 'cms-title')), ...optional('desc', childText(box, 'cms-description')) };
    });
    const data: Type24Data = { ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}), image: pair, items };
    return finish(src, data, [...header.used, ...items.flatMap((i) => [i.title ?? '', i.desc ?? ''])], extra, { modifiers, diagnostics });
  },
  render(section, ctx) {
    const d = section.data;
    return presetSection('type-24', section, [
      visualPcMo(d.image),
      h('ol', { class: 'mig-list', style: LIST_RESET }, d.items.map((item, i) =>
        h('li', { class: 'mig-item' }, [
          // 순서 번호는 원본 CSS 카운터를 대신하는 생성 글이라 글 순서 검사용 출력에서는 뺀다(작성된 같은 모양의 숫자는 그대로 비교됨)
          !ctx.orderCheck && h('span', { class: 'mig-num' }, [String(i + 1)]),
          h('div', { class: 'mig-text-wrap' }, [
            !isBlank(item.title) && h('strong', { class: 'mig-title' }, [rich(item.title)]),
            !isBlank(item.desc) && h('p', { class: 'mig-desc' }, [rich(item.desc)]),
          ]),
        ])),
      ),
    ]);
  },
};
