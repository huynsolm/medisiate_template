import { h } from '../html/h.ts';
import { z } from 'zod';
import { richFrom, scanSection } from '../parse/common.ts';
import { byClass, finish, imagesIn, itemPart, layoutFixed, listItems, optional, originalHeader, textOf } from '../parse/original.ts';
import { ancestors, children, descendants, hasClass, type DomElement } from '../parse/dom.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, imageTextItem, LIST_RESET, presetSection } from './preset.ts';

const itemSchema = z.object({
  num: z.string().optional(), title: z.string().optional(), desc: z.string().optional(), image: imagePairSchema.default({}),
  /** 설명 상자 안 번호 목록(원본 ul.cms-description-list > li > 번호 + p.cms-lt-text) */
  steps: z.array(z.object({ num: z.string().optional(), text: z.string().default('') })).default([]),
});
const schema = z.object({
  ...headerShape,
  /** 원본 '반전'(이미지가 오른쪽부터). 호스트 프리셋은 왼쪽부터 지그재그로 고정이라 값만 보존한다. */
  reverse: z.boolean().default(false),
  items: z.array(itemSchema).default([]),
});
export type Type03Data = z.infer<typeof schema>;


/**
 * 원본: ol.cms-tile-list.array-zigzag(.reverse) > li.cms-list-item > .cms-visual(PC/MO)
 *       + .cms-description-box > .cms-box-inner > p.cms-eyebrow.type-number + p.cms-title + p.cms-description
 * 호스트: section.type-03 > .mig-body > ul.mig-list > li.mig-item > .mig-content > .mig-visual + .mig-text-wrap
 */
export const type03: TypeDefinition<Type03Data> = {
  id: 'type03',
  label: 'type03 이미지·글 지그재그 목록',
  strategy: 'preset',
  hostPreset: 'type-03',
  variants: ['default'],
  schema: schema as z.ZodType<Type03Data>,
  fields: [
    ...headerFields,
    { key: 'reverse', label: '원본 반전 배치 (호스트는 왼쪽부터 고정)', kind: 'checkbox' },
    {
      key: 'items', label: '항목', kind: 'repeat', min: 0, max: 12,
      fields: [
        { key: 'num', label: '번호', kind: 'text' },
        { key: 'title', label: '제목', kind: 'richText' },
        { key: 'desc', label: '설명', kind: 'richText' },
        { key: 'image', label: '이미지 (PC/MO)', kind: 'imagePair' },
        { key: 'steps', label: '번호 목록', kind: 'repeat', min: 0, max: 10, fields: [{ key: 'num', label: '번호', kind: 'text' }, { key: 'text', label: '글', kind: 'richText' }] },
      ],
    },
  ],
  defaults: { reverse: false, items: [{ num: '01', title: '제목', desc: '설명', image: {}, steps: [] }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const list = descendants(src.element, byClass('cms-tile-list'))[0];
    const reverse = Boolean(list && hasClass(list, 'reverse'));
    if (reverse) diagnostics.push(layoutFixed(src, '원본은 이미지가 오른쪽부터 시작하는 반전 배치지만 호스트 프리셋은 왼쪽부터 시작합니다', { reverse }));
    const used: string[] = [...header.used];
    const extra: DomElement[] = [];
    const items = listItems(list).map((li) => {
      const { pair, extra: more } = imagesIn(itemPart(li, 'cms-visual'), src, diagnostics);
      extra.push(...more);
      const box = itemPart(li, 'cms-description-box');
      const stepList = box ? descendants(box, byClass('cms-description-list'))[0] : undefined;
      // 항목 자신의 번호·제목·설명은 번호 목록 밖에서만 읽는다(목록 안 번호를 항목 번호로 잡으면 같은 글을 두 번 읽음)
      const own = (name: string) => {
        const el = box ? descendants(box, (d) => hasClass(d, name) && !(stepList && (d === stepList || ancestors(d).includes(stepList))))[0] : undefined;
        return el ? richFrom(el) : '';
      };
      const steps = (stepList ? children(stepList).filter((c) => c.tagName === 'li') : []).map((step) => ({
        ...optional('num', textOf(step, 'cms-eyebrow')), text: textOf(step, 'cms-lt-text') || textOf(step, 'cms-description'),
      }));
      const item = {
        ...optional('num', own('cms-eyebrow')),
        ...optional('title', own('cms-title')),
        ...optional('desc', own('cms-description')),
        image: pair,
        steps,
      };
      used.push(item.num ?? '', item.title ?? '', item.desc ?? '', ...steps.flatMap((st) => [st.num ?? '', st.text]));
      return item;
    });
    const data: Type03Data = { ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}), reverse, items };
    return finish(src, data, used, extra, { modifiers, diagnostics });
  },
  render(section) {
    return presetSection('type-03', section, [
      h('ul', { class: 'mig-list', style: LIST_RESET }, section.data.items.map(imageTextItem)),
    ]);
  },
};
