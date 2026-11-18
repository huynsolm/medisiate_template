import { z } from 'zod';
import { h } from '../html/h.ts';
import { visualPcMo } from '../helpers/image.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { safeHref } from '../html/rich-text.ts';
import { richFrom, scanSection } from '../parse/common.ts';
import { byClass, finish, firstByClass, imagesIn, originalHeader } from '../parse/original.ts';
import { attr, children, descendants, hasClass } from '../parse/dom.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, presetSection } from './preset.ts';

const buttonSchema = z.object({
  text: z.string().default(''),
  link: z.string().refine((v) => safeHref(v) === v, '링크 주소는 http(s)·mailto·tel 또는 상대 주소여야 합니다').optional(),
  newTab: z.boolean().optional(),
});
const schema = z.object({
  ...headerShape,
  image: imagePairSchema.default({}),
  paragraphs: z.array(z.object({ text: z.string().default('') })).default([]),
  /** 버튼 링크(원본 .cms-button-wrap > a.cms-square-button) */
  buttons: z.array(buttonSchema).default([]),
});
export type Type29Data = z.infer<typeof schema>;

/**
 * 원본(reference/cms-original/component/type29.html):
 *   .cms-bg-box(또는 실제 페이지의 .cms-column-wrap) > .cms-visual(PC/MO) + .cms-description-box.text-center >
 *   p.cms-description… + [p.cms-button-wrap > a.cms-square-button]
 * 호스트: section.type-29 > .mig-body > .mig-visual + .mig-text-wrap(p.mig-desc…, p.mig-desc > a)
 */
export const type29: TypeDefinition<Type29Data> = {
  id: 'type29',
  label: 'type29 이미지 + 가운데 설명 (+ 버튼)',
  strategy: 'preset',
  hostPreset: 'type-29',
  variants: ['default'],
  schema: schema as z.ZodType<Type29Data>,
  fields: [
    ...headerFields,
    { key: 'image', label: '이미지 (PC/MO)', kind: 'imagePair' },
    { key: 'paragraphs', label: '설명 문단', kind: 'repeat', min: 0, max: 10, fields: [{ key: 'text', label: '글', kind: 'richText' }] },
    {
      key: 'buttons', label: '버튼', kind: 'repeat', min: 0, max: 4,
      fields: [{ key: 'text', label: '버튼 글', kind: 'text' }, { key: 'link', label: '링크 주소', kind: 'text' }, { key: 'newTab', label: '새 창으로', kind: 'checkbox' }],
    },
  ],
  defaults: { image: {}, paragraphs: [{ text: '설명' }], buttons: [] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const { pair: image, extra } = imagesIn(firstByClass(src.element, 'cms-visual'), src, diagnostics);
    const box = firstByClass(src.element, 'cms-description-box');
    const paragraphs = (box ? children(box).filter(byClass('cms-description')) : []).map((p) => ({ text: richFrom(p) })).filter((p) => p.text);
    const anchors = box ? descendants(box, (el) => el.tagName === 'a' && (hasClass(el, 'cms-square-button') || hasClass(el, 'cms-button'))) : [];
    const buttons = anchors.map((a) => {
      const link = safeHref(attr(a, 'href'));
      return { text: richFrom(a), ...(link !== undefined ? { link } : {}), ...(attr(a, 'target') === '_blank' ? { newTab: true } : {}) };
    });
    const data: Type29Data = { ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}), image, paragraphs, buttons };
    return finish(src, data, [...header.used, ...paragraphs.map((p) => p.text), ...buttons.map((b) => b.text)], extra, { modifiers, diagnostics });
  },
  render(section) {
    const d = section.data;
    return presetSection('type-29', section, [
      visualPcMo(d.image),
      (d.paragraphs.length > 0 || d.buttons.length > 0) && h('div', { class: 'mig-text-wrap' }, [
        ...d.paragraphs.map((p) => h('p', { class: 'mig-desc' }, [rich(p.text)])),
        ...d.buttons.filter((b) => !isBlank(b.text)).map((b) => h('p', { class: 'mig-desc' }, [
          b.link ? h('a', { href: b.link, ...(b.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {}) }, [rich(b.text)]) : rich(b.text),
        ])),
      ]),
    ]);
  },
};
