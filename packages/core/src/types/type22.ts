import { z } from 'zod';
import { h } from '../html/h.ts';
import { visualPcMo } from '../helpers/image.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { richFrom, scanSection } from '../parse/common.ts';
import { byClass, childText, finish, imagesIn, itemPart, listItems, optional, originalHeader } from '../parse/original.ts';
import { children, descendants, type DomElement } from '../parse/dom.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, LIST_RESET, presetSection } from './preset.ts';

const itemSchema = z.object({ title: z.string().optional(), image: imagePairSchema.default({}), subitems: z.array(z.object({ text: z.string().default('') })).default([]) });
const schema = z.object({ ...headerShape, items: z.array(itemSchema).default([]) });
export type Type22Data = z.infer<typeof schema>;

/**
 * 원본: ul.cms-img-list.text-bottom > li.col-6.col-lg-3 > .cms-visual(PC/MO) + .cms-visual-text(p.cms-title [+ ul.list-unstyled > li])
 * 호스트: section.type-22 > .mig-body > ul.mig-list(1열 → PC 3열) > li.mig-item > .mig-visual(1:1 cover) +
 *   .mig-text-wrap(strong.mig-title [+ ul > li > span.mig-desc])
 * 호스트 `.type-22 .mig-list`는 후손 선택자라 하위 목록에 mig-list를 붙이면 카드 안에서 3열 격자가 된다.
 * 원본도 글머리 없는 짧은 목록(list-unstyled)이라 하위 목록은 클래스 없는 ul(인라인 초기화)로 둔다.
 */
export const type22: TypeDefinition<Type22Data> = {
  id: 'type22',
  label: 'type22 이미지 카드 + 짧은 목록',
  strategy: 'preset',
  hostPreset: 'type-22',
  variants: ['default'],
  schema: schema as z.ZodType<Type22Data>,
  fields: [
    ...headerFields,
    {
      key: 'items', label: '칸', kind: 'repeat', min: 0, max: 12,
      fields: [
        { key: 'title', label: '제목', kind: 'text' },
        { key: 'image', label: '이미지 (PC/MO)', kind: 'imagePair' },
        { key: 'subitems', label: '짧은 목록', kind: 'repeat', min: 0, max: 8, fields: [{ key: 'text', label: '글', kind: 'text' }] },
      ],
    },
  ],
  defaults: { items: [{ title: '제목', image: {}, subitems: [] }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const used: string[] = [...header.used];
    const extra: DomElement[] = [];
    const items = listItems(descendants(src.element, byClass('cms-img-list'))[0]).map((li) => {
      const { pair, extra: more } = imagesIn(itemPart(li, 'cms-visual'), src, diagnostics);
      extra.push(...more);
      const text = itemPart(li, 'cms-visual-text');
      const short = text ? children(text).find((el) => el.tagName === 'ul') : undefined;
      const item = {
        // 제목은 글 묶음의 직접 자식만 읽는다. 짧은 목록 안의 같은 클래스까지 집으면 글이 두 번 나온다 (P5 검수 I-1)
        ...optional('title', childText(text, 'cms-title')), image: pair,
        subitems: (short ? children(short).filter((el) => el.tagName === 'li') : []).map((s) => ({ text: richFrom(s) })),
      };
      used.push(item.title ?? '', ...item.subitems.map((s) => s.text));
      return item;
    });
    const data: Type22Data = { ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}), items };
    return finish(src, data, used, extra, { modifiers, diagnostics });
  },
  render(section) {
    return presetSection('type-22', section, [
      h('ul', { class: 'mig-list', style: LIST_RESET }, section.data.items.map((item) =>
        h('li', { class: 'mig-item' }, [
          visualPcMo(item.image),
          h('div', { class: 'mig-text-wrap' }, [
            !isBlank(item.title) && h('strong', { class: 'mig-title' }, [rich(item.title)]),
            item.subitems.length > 0 && h('ul', { style: LIST_RESET }, item.subitems.map((s) => h('li', {}, [h('span', { class: 'mig-desc' }, [rich(s.text)])]))),
          ]),
        ])),
      ),
    ]);
  },
};
