import { z } from 'zod';
import { h } from '../html/h.ts';
import { visualPcMo } from '../helpers/image.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { scanSection } from '../parse/common.ts';
import { byClass, finish, imagesIn, itemPart, listItems, optional, originalHeader, textOf } from '../parse/original.ts';
import { children, descendants } from '../parse/dom.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, LIST_RESET, presetSection } from './preset.ts';

const itemSchema = z.object({ title: z.string().optional(), desc: z.string().optional(), icon: imagePairSchema.default({}) });
const schema = z.object({
  ...headerShape,
  /** PC에서만 보이는 큰 이미지 */
  image: imagePairSchema.default({}),
  /** 모바일에서만 보이는 글(원본은 육각형 도형 안에 놓는다) */
  mobileText: z.string().optional(),
  items: z.array(itemSchema).default([]),
});
export type Type16Data = z.infer<typeof schema>;

/**
 * 원본: .cms-visual > img(PC 전용, d-none d-lg-block) + .cms-figure.hexagon.d-block.d-lg-none(모바일 전용 도형 + p.cms-title)
 *   + ul.cms-column-list > li.col-6 > .cms-icon(img 한 장) + .cms-description-box(p.cms-title, p.cms-description)
 * 호스트: section.type-16 > .mig-body > .mig-visual.common-display-pc + .mig-text-wrap.common-display-mo > strong.mig-title
 *   + ul.mig-list > li.mig-item > .mig-content(grid: 30px 1fr) > .mig-visual(아이콘) + .mig-text-wrap
 * 육각형 도형은 장식이라 옮기지 않고, 안의 글은 모바일 전용 글로 옮긴다.
 */
export const type16: TypeDefinition<Type16Data> = {
  id: 'type16',
  label: 'type16 PC 큰 이미지 / 모바일 글 + 아이콘 목록',
  strategy: 'preset',
  hostPreset: 'type-16',
  variants: ['default'],
  schema: schema as z.ZodType<Type16Data>,
  fields: [
    ...headerFields,
    { key: 'image', label: 'PC 큰 이미지 (PC 칸만 사용)', kind: 'imagePair' },
    { key: 'mobileText', label: '모바일 전용 글', kind: 'text' },
    {
      key: 'items', label: '칸', kind: 'repeat', min: 0, max: 12,
      fields: [
        { key: 'title', label: '제목', kind: 'text' },
        { key: 'desc', label: '설명', kind: 'richText' },
        { key: 'icon', label: '아이콘', kind: 'imagePair' },
      ],
    },
  ],
  defaults: { image: {}, mobileText: '핵심 문구', items: [{ title: '제목', desc: '설명', icon: {} }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const inner = children(src.element).find(byClass('cms-inner')) ?? src.element;
    const visual = children(inner).find(byClass('cms-visual'));
    const figure = visual ? children(visual).find(byClass('cms-figure')) : undefined;
    // 큰 이미지는 한 장(PC 전용)만 담는다. 이미지가 더 있으면(예: 도형 안) 데이터의 이미지 수가 모자라 finish가 fallback한다.
    const { pair: image, extra } = imagesIn(visual, src, diagnostics);
    const mobileText = textOf(figure, 'cms-title');
    const used: string[] = [...header.used, mobileText];
    const items = listItems(descendants(src.element, byClass('cms-column-list'))[0]).map((li) => {
      const { pair: icon, extra: more } = imagesIn(itemPart(li, 'cms-icon'), src, diagnostics);
      extra.push(...more);
      const box = itemPart(li, 'cms-description-box');
      const item = { ...optional('title', textOf(box, 'cms-title')), ...optional('desc', textOf(box, 'cms-description')), icon };
      used.push(item.title ?? '', item.desc ?? '');
      return item;
    });
    const data: Type16Data = {
      ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}),
      image: image.pc || image.mo ? { pc: image.pc ?? image.mo } : {}, ...optional('mobileText', mobileText), items,
    };
    return finish(src, data, used, extra, { modifiers, diagnostics });
  },
  render(section) {
    const d = section.data;
    const big = d.image.pc ?? d.image.mo;
    return presetSection('type-16', section, [
      big && visualPcMo({ pc: big }, { extraClass: 'common-display-pc' }),
      !isBlank(d.mobileText) && h('div', { class: 'mig-text-wrap common-display-mo' }, [h('strong', { class: 'mig-title' }, [rich(d.mobileText)])]),
      h('ul', { class: 'mig-list', style: LIST_RESET }, d.items.map((item) =>
        h('li', { class: 'mig-item' }, [
          h('div', { class: 'mig-content' }, [
            visualPcMo(item.icon),
            // 호스트 격자가 "30px 아이콘 칸 + 글 칸"이라 아이콘이 없으면 글이 30px 칸으로 들어간다.
            // 아이콘이 없어도 글은 글 칸(2번째)에 두어 다른 행과 줄을 맞춘다 (4단계 검수 I-1).
            h('div', { class: 'mig-text-wrap', style: item.icon.pc || item.icon.mo ? undefined : { gridColumn: '2' } }, [
              !isBlank(item.title) && h('strong', { class: 'mig-title' }, [rich(item.title)]),
              !isBlank(item.desc) && h('p', { class: 'mig-desc' }, [rich(item.desc)]),
            ]),
          ]),
        ])),
      ),
    ]);
  },
};
