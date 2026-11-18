import { z } from 'zod';
import { h } from '../html/h.ts';
import { visualPcMo } from '../helpers/image.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { scanSection } from '../parse/common.ts';
import { byClass, childText, finish, firstByClass, imagesIn, optional, originalHeader } from '../parse/original.ts';
import { children, descendants, hasClass } from '../parse/dom.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { readBorderList, renderBorderList } from './border-list.ts';
import { headerFields, headerShape, presetSection } from './preset.ts';

const schema = z.object({
  ...headerShape,
  image: imagePairSchema.default({}),
  boxEyebrow: z.string().optional(),
  boxTitle: z.string().optional(),
  items: z.array(z.object({ text: z.string().default('') })).default([]),
});
export type Type20Data = z.infer<typeof schema>;

/**
 * 원본: .cms-column-wrap > .cms-visual.col-lg-3(PC/MO) + .cms-box.col-lg-9 >
 *   .cms-description-box.em-box-2(p.cms-eyebrow 작은 글 + p.cms-title 강조 글) + ul.cms-border-list
 * 호스트: section.type-20 > .mig-body > .mig-content(PC 4:6 격자) > .mig-visual(PC/MO) +
 *   .mig-content > [.mig-highlight-box > span.mig-eyebrow + strong.mig-title] + ul.mig-list(테두리 카드, PC 2열)
 * 원본 3:9 비율과 PC 4열 목록은 원본 도구의 고정값이라 진단 없이 호스트 배치를 따른다.
 */
export const type20: TypeDefinition<Type20Data> = {
  id: 'type20',
  label: 'type20 이미지 + 강조 상자 + 테두리 목록',
  strategy: 'preset',
  hostPreset: 'type-20',
  variants: ['default'],
  schema: schema as z.ZodType<Type20Data>,
  fields: [
    ...headerFields,
    { key: 'image', label: '이미지 (PC/MO)', kind: 'imagePair' },
    { key: 'boxEyebrow', label: '강조 상자 작은 글', kind: 'richText' },
    { key: 'boxTitle', label: '강조 상자 글', kind: 'richText' },
    { key: 'items', label: '목록', kind: 'repeat', min: 0, max: 12, fields: [{ key: 'text', label: '글', kind: 'richText' }] },
  ],
  defaults: { image: {}, boxTitle: '강조 문구', items: [{ text: '목록' }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const { pair, extra } = imagesIn(descendants(src.element, byClass('cms-visual'))[0], src, diagnostics);
    const box = firstByClass(src.element, 'cms-box');
    const em = box ? children(box).find((el) => hasClass(el, 'cms-description-box') && hasClass(el, 'em-box-2')) : undefined;
    const boxEyebrow = childText(em, 'cms-eyebrow');
    const boxTitle = childText(em, 'cms-title');
    const items = readBorderList(src.element);
    const data: Type20Data = {
      ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}),
      image: pair, ...optional('boxEyebrow', boxEyebrow), ...optional('boxTitle', boxTitle), items,
    };
    return finish(src, data, [...header.used, boxEyebrow, boxTitle, ...items.map((i) => i.text)], extra, { modifiers, diagnostics });
  },
  render(section) {
    const d = section.data;
    const hasBox = !isBlank(d.boxEyebrow) || !isBlank(d.boxTitle);
    return presetSection('type-20', section, [
      h('div', { class: 'mig-content' }, [
        visualPcMo(d.image),
        h('div', { class: 'mig-content' }, [
          hasBox && h('div', { class: 'mig-highlight-box' }, [
            !isBlank(d.boxEyebrow) && h('span', { class: 'mig-eyebrow' }, [rich(d.boxEyebrow)]),
            !isBlank(d.boxTitle) && h('strong', { class: 'mig-title' }, [rich(d.boxTitle)]),
          ]),
          renderBorderList(d.items),
        ]),
      ]),
    ]);
  },
};
