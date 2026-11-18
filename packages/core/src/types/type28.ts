import { z } from 'zod';
import { h } from '../html/h.ts';
import { visualPcMo } from '../helpers/image.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { richFrom, scanSection } from '../parse/common.ts';
import { byClass, finish, imagesIn, listItems, optional, originalHeader, textOf, textsOf } from '../parse/original.ts';
import { children, descendants, hasClass } from '../parse/dom.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, LIST_RESET, presetSection } from './preset.ts';

const LISTS = ['cms-row-list', 'cms-figure-list', 'cms-column-list'];
const schema = z.object({
  ...headerShape,
  /** 작은 강조 상자(원본 .cms-description-box.em-box-3 > p.cms-title, 예: CHECK POINT) */
  badge: z.string().optional(),
  image: imagePairSchema.default({}),
  /** 설명 문단(원본 .cms-description-box 안 p.cms-description). 문단마다 하나 */
  paragraphs: z.array(z.object({ text: z.string().default('') })).default([]),
  /** 원본에서 설명이 이미지보다 앞에 있었는지(순서를 그대로 출력) */
  textFirst: z.boolean().default(false),
  /** 목록(원본 row/figure/column 목록 항목의 제목·설명) */
  items: z.array(z.object({ title: z.string().optional(), desc: z.string().optional() })).default([]),
});
export type Type28Data = z.infer<typeof schema>;

/**
 * 원본(reference/cms-original/component/type28.html):
 *   .cms-header + [.cms-description-box.em-box-3 > p.cms-title] + .cms-visual(PC/MO) + .cms-description-box(p.cms-description 여러 개)
 *   실제 페이지는 설명 상자 대신·함께 목록(cms-row-list 등, 항목마다 제목·설명)을 두기도 한다.
 * 호스트: section.type-28 > .mig-body > [.mig-text-wrap > span.mig-badge] + .mig-visual + .mig-text-wrap(p.mig-desc…) + [ul.mig-list]
 */
export const type28: TypeDefinition<Type28Data> = {
  id: 'type28',
  label: 'type28 강조 표시 + 이미지 + 설명',
  strategy: 'preset',
  hostPreset: 'type-28',
  variants: ['default'],
  schema: schema as z.ZodType<Type28Data>,
  fields: [
    ...headerFields,
    { key: 'badge', label: '작은 강조 글 (예: CHECK POINT)', kind: 'text' },
    { key: 'image', label: '이미지 (PC/MO)', kind: 'imagePair' },
    { key: 'paragraphs', label: '설명 문단', kind: 'repeat', min: 0, max: 10, fields: [{ key: 'text', label: '글', kind: 'richText' }] },
    { key: 'textFirst', label: '설명을 이미지보다 먼저', kind: 'checkbox' },
    { key: 'items', label: '목록', kind: 'repeat', min: 0, max: 12, fields: [{ key: 'title', label: '제목', kind: 'text' }, { key: 'desc', label: '설명', kind: 'richText' }] },
  ],
  defaults: { image: {}, paragraphs: [{ text: '설명' }], textFirst: false, items: [] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const inner = children(src.element).find(byClass('cms-inner')) ?? src.element;
    const kids = children(inner);
    const badgeBox = kids.find((k) => hasClass(k, 'cms-description-box') && hasClass(k, 'em-box-3'));
    const badge = textOf(badgeBox, 'cms-title');
    const visual = kids.find(byClass('cms-visual'));
    const { pair: image, extra } = imagesIn(visual, src, diagnostics);
    const textBox = kids.find((k) => hasClass(k, 'cms-description-box') && k !== badgeBox);
    const paragraphs = (textBox ? children(textBox).filter(byClass('cms-description')) : []).map((p) => ({ text: richFrom(p) })).filter((p) => p.text);
    const textFirst = Boolean(textBox && visual && kids.indexOf(textBox) < kids.indexOf(visual));
    const list = descendants(inner, (el) => LISTS.some((c) => hasClass(el, c)))[0];
    const items = listItems(list).map((li) => ({ ...optional('title', textOf(li, 'cms-title')), ...optional('desc', textsOf(li, 'cms-description')) }));
    const data: Type28Data = {
      ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}),
      ...optional('badge', badge), image, paragraphs, textFirst, items,
    };
    return finish(src, data, [...header.used, badge, ...paragraphs.map((p) => p.text), ...items.flatMap((i) => [i.title ?? '', i.desc ?? ''])], extra, { modifiers, diagnostics });
  },
  render(section) {
    const d = section.data;
    const text = d.paragraphs.length > 0 && h('div', { class: 'mig-text-wrap' }, d.paragraphs.map((p) => h('p', { class: 'mig-desc' }, [rich(p.text)])));
    return presetSection('type-28', section, [
      !isBlank(d.badge) && h('div', { class: 'mig-text-wrap' }, [h('span', { class: 'mig-badge' }, [rich(d.badge)])]),
      d.textFirst && text,
      visualPcMo(d.image),
      !d.textFirst && text,
      d.items.length > 0 && h('ul', { class: 'mig-list', style: LIST_RESET }, d.items.map((item) => h('li', { class: 'mig-item' }, [
        !isBlank(item.title) && h('strong', { class: 'mig-title' }, [rich(item.title)]),
        !isBlank(item.desc) && h('p', { class: 'mig-desc' }, [rich(item.desc)]),
      ]))),
    ]);
  },
};
