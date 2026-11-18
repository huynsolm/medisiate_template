import { z } from 'zod';
import { h, type Child } from '../html/h.ts';
import { visualPcMo } from '../helpers/image.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { scanSection } from '../parse/common.ts';
import { byClass, childText, finish, imagesIn, itemPart, itemText, listItems, optional, originalHeader, textOf, textsOf } from '../parse/original.ts';
import { children, type DomElement } from '../parse/dom.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, LIST_RESET, presetSection } from './preset.ts';

const stepSchema = z.object({ num: z.string().optional(), text: z.string().default('') });
const blockSchema = z.object({
  image: imagePairSchema.default({}),
  /** 작은 글(원본 p.cms-eyebrow, 예: 제조사) */
  brand: z.string().optional(),
  /** 제목(원본 p.cms-title, 예: 모델명) */
  model: z.string().optional(),
  desc: z.string().optional(),
  /** 단계 목록 위 소제목(원본 p.cms-sub-title) */
  subTitle: z.string().optional(),
  steps: z.array(stepSchema).default([]),
});
const schema = z.object({ ...headerShape, blocks: z.array(blockSchema).default([]) });
export type Type30Data = z.infer<typeof schema>;

/**
 * 원본(reference/cms-original/component/type30.html, 실제 페이지): .cms-list-wrap 하나가 장비 하나다.
 *   ol.cms-img-list > li > .cms-visual(PC/MO) + .cms-visual-text(p.cms-eyebrow 작은 글, [p.cms-title 제목], p.cms-line 장식, p.cms-description)
 *   [+ p.cms-sub-title + ul.cms-column-list > li > .cms-inner-box > .cms-description-box(p.cms-eyebrow 번호, p.cms-description)]
 * 호스트: section.type-30 > .mig-body > (.mig-content > .mig-text-wrap + .mig-visual) [+ strong.mig-title + ul.mig-list > li.mig-item] …
 *   호스트 .type-30 .mig-content는 column-reverse라 마지막 자식이 위에 온다. 원본처럼 이미지를 위에 두려고 글 → 이미지 순서로 출력한다.
 */
export const type30: TypeDefinition<Type30Data> = {
  id: 'type30',
  label: 'type30 장비 소개(이미지·설명 + 단계)',
  strategy: 'preset',
  hostPreset: 'type-30',
  variants: ['default'],
  schema: schema as z.ZodType<Type30Data>,
  fields: [
    ...headerFields,
    {
      key: 'blocks', label: '장비', kind: 'repeat', min: 0, max: 8,
      fields: [
        { key: 'image', label: '이미지 (PC/MO)', kind: 'imagePair' },
        { key: 'brand', label: '작은 글', kind: 'text' },
        { key: 'model', label: '제목', kind: 'text' },
        { key: 'desc', label: '설명', kind: 'richText' },
        { key: 'subTitle', label: '단계 위 소제목', kind: 'text' },
        { key: 'steps', label: '단계', kind: 'repeat', min: 0, max: 10, fields: [{ key: 'num', label: '번호', kind: 'text' }, { key: 'text', label: '글', kind: 'richText' }] },
      ],
    },
  ],
  defaults: { blocks: [{ image: {}, brand: '작은 글', desc: '설명', steps: [] }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const used: string[] = [...header.used];
    const extra: DomElement[] = [];
    const inner = children(src.element).find(byClass('cms-inner')) ?? src.element;
    const blocks = children(inner).filter(byClass('cms-list-wrap')).map((wrap) => {
      const product = listItems(children(wrap).find(byClass('cms-img-list')))[0];
      const { pair: image, extra: more } = imagesIn(itemPart(product, 'cms-visual'), src, diagnostics);
      extra.push(...more);
      const text = itemPart(product, 'cms-visual-text');
      const steps = listItems(children(wrap).find(byClass('cms-column-list'))).map((li) => ({
        ...optional('num', textOf(li, 'cms-eyebrow')), text: itemText(itemPart(li, 'cms-description-box') ?? li, 'cms-description'),
      }));
      const block = {
        image,
        ...optional('brand', childText(text, 'cms-eyebrow')), ...optional('model', childText(text, 'cms-title')), ...optional('desc', textsOf(text, 'cms-description')),
        ...optional('subTitle', childText(wrap, 'cms-sub-title')), steps,
      };
      used.push(block.brand ?? '', block.model ?? '', block.desc ?? '', block.subTitle ?? '', ...steps.flatMap((s) => [s.num ?? '', s.text]));
      return block;
    });
    const data: Type30Data = { ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}), blocks };
    return finish(src, data, used, extra, { modifiers, diagnostics });
  },
  render(section, ctx) {
    // 순서 검사용 출력은 화면 순서(이미지 → 글)로: 실제 출력은 호스트 column-reverse에 맞춘 DOM 순서(글 → 이미지)
    const inOrder = (text: Child, visual: Child): Child[] => (ctx.orderCheck ? [visual, text] : [text, visual]);
    return presetSection('type-30', section, section.data.blocks.flatMap((b) => [
      h('div', { class: 'mig-content' }, inOrder(
        h('div', { class: 'mig-text-wrap' }, [
          !isBlank(b.brand) && h('span', { class: 'mig-eyebrow' }, [rich(b.brand)]),
          !isBlank(b.model) && h('strong', { class: 'mig-title' }, [rich(b.model)]),
          !isBlank(b.desc) && h('p', { class: 'mig-desc' }, [rich(b.desc)]),
        ]),
        visualPcMo(b.image),
      )),
      !isBlank(b.subTitle) && h('div', { class: 'mig-text-wrap' }, [h('strong', { class: 'mig-title' }, [rich(b.subTitle)])]),
      b.steps.length > 0 && h('ul', { class: 'mig-list', style: LIST_RESET }, b.steps.map((st) => h('li', { class: 'mig-item' }, [
        !isBlank(st.num) && h('span', { class: 'mig-num' }, [rich(st.num)]),
        h('p', { class: 'mig-desc' }, [rich(st.text)]),
      ]))),
    ]));
  },
};
