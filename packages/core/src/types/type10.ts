import { z } from 'zod';
import { h } from '../html/h.ts';
import { visualPcMo } from '../helpers/image.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { richFrom, scanSection } from '../parse/common.ts';
import { byClass, childText, finish, firstByClass, imagesIn, listItems, originalHeader, optional, readTextParts, textOf } from '../parse/original.ts';
import { children, descendants } from '../parse/dom.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, LIST_RESET, presetSection, renderTextParts, textPartsField, textPartsSchema } from './preset.ts';

const itemSchema = z.object({
  num: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  desc: z.string().optional(),
  /** 설명 상자에 문단과 글머리 목록이 섞였을 때 원본 순서대로(이때 desc는 비운다) */
  parts: textPartsSchema,
  subitems: z.array(z.object({ text: z.string().default('') })).default([]),
});
const schema = z.object({ ...headerShape, image: imagePairSchema.default({}), items: z.array(itemSchema).default([]) });
export type Type10Data = z.infer<typeof schema>;


/**
 * 원본: .cms-visual(PC/MO) + ol.cms-figure-list > li > .cms-figure.hexagon(svg + .cms-figure-text: 번호·핵심 단어)
 *       + .cms-description-box(p.cms-eyebrow 소제목, p.cms-description, ul.cms-border-list > li > p.cms-title)
 * 호스트: section.type-10 > .mig-body > .mig-visual + .mig-content > ul.mig-list > li.mig-item(카드, 하위 ul.mig-list)
 * 육각형 SVG는 장식이라 옮기지 않는다(번호·핵심 단어는 글로 옮김).
 * 호스트의 하위 항목은 width: 100% + 좌우 padding이라 content-box에서 카드 밖으로 넘친다 → border-box를 인라인으로.
 */
export const type10: TypeDefinition<Type10Data> = {
  id: 'type10',
  label: 'type10 큰 이미지 + 번호 카드 목록',
  strategy: 'preset',
  hostPreset: 'type-10',
  variants: ['default'],
  schema: schema as z.ZodType<Type10Data>,
  fields: [
    ...headerFields,
    { key: 'image', label: '이미지 (PC/MO)', kind: 'imagePair' },
    {
      key: 'items', label: '항목', kind: 'repeat', min: 0, max: 12,
      fields: [
        { key: 'num', label: '번호', kind: 'text' },
        { key: 'title', label: '핵심 단어', kind: 'text' },
        { key: 'subtitle', label: '소제목', kind: 'text' },
        { key: 'desc', label: '설명', kind: 'richText' },
        textPartsField,
        { key: 'subitems', label: '목록', kind: 'repeat', min: 0, max: 8, fields: [{ key: 'text', label: '글', kind: 'text' }] },
      ],
    },
  ],
  defaults: { image: {}, items: [{ num: '01', title: '핵심 단어', parts: [], subitems: [] }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const { pair: image, extra } = imagesIn(children(firstByClass(src.element, 'cms-inner') ?? src.element).find(byClass('cms-visual')), src, diagnostics);
    const list = descendants(src.element, byClass('cms-figure-list'))[0];
    const used: string[] = [...header.used];
    // 설명 상자 안의 원본 도구 밖 목록을 덩어리로 읽지 못했으면(번호 목록·화면별 숨김 등) 목록이 빠진다.
    // 빈 목록(글머리만 보임)은 글 비교에도 안 잡히므로 직접 기록해 원본 보존·다음 단계로 보낸다 (재검수 I-1)
    const unread: string[] = [];
    const items = listItems(list).map((li) => {
      const figure = descendants(li, byClass('cms-figure-text'))[0];
      const box = descendants(li, byClass('cms-description-box'))[0];
      const sub = box ? descendants(box, byClass('cms-border-list'))[0] : undefined;
      // 설명 상자에 원본 도구 밖의 글머리 목록(ul.list-box 등)이 문단과 섞여 있으면 순서대로 읽는다(실제 페이지 13개 섹션)
      const loose = box && !sub && descendants(box).some((d) => (d.tagName === 'ul' || d.tagName === 'ol'));
      const subtitleEl = loose ? children(box).find(byClass('cms-eyebrow')) : undefined;
      const parts = loose ? readTextParts(box, subtitleEl ? [subtitleEl] : []) : undefined;
      if (loose && !parts) unread.push('설명 상자 안 목록');
      const item = {
        ...optional('num', textOf(figure, 'cms-eyebrow')),
        // 진짜 원본은 육각형 안 핵심 단어가 p.cms-description이다(biny 재현본은 cms-title). 둘 다 받는다.
        ...optional('title', textOf(figure, 'cms-title') || textOf(figure, 'cms-description')),
        ...optional('subtitle', childText(box, 'cms-eyebrow')),
        // 실제 페이지는 설명 문단을 여러 개 두기도 한다. 상자의 직접 자식 설명 문단을 모두 줄바꿈으로 잇는다
        ...optional('desc', box && !parts ? children(box).filter(byClass('cms-description')).map((p) => richFrom(p)).filter(Boolean).join('<br>') : ''),
        parts: parts ?? [],
        subitems: listItems(sub).map((s) => ({ text: textOf(s, 'cms-title') })),
      };
      used.push(item.num ?? '', item.title ?? '', item.subtitle ?? '', item.desc ?? '', ...item.parts.flatMap((p) => [p.text ?? '', ...(p.bullets ?? []).map((b) => b.text)]), ...item.subitems.map((s) => s.text));
      return item;
    });
    const data: Type10Data = { ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}), image, items };
    const result = finish(src, data, used, extra, { modifiers, diagnostics });
    return unread.length && !result.fallbackReason
      ? { ...result, lossless: false, fallbackReason: `옮길 수 없는 ${unread[0]}(번호 목록·화면별 표시 등)` }
      : result;
  },
  render(section) {
    const d = section.data;
    return presetSection('type-10', section, [
      visualPcMo(d.image),
      d.items.length > 0 && h('div', { class: 'mig-content' }, [
        h('ul', { class: 'mig-list', style: LIST_RESET }, d.items.map((item) =>
          h('li', { class: 'mig-item' }, [
            !isBlank(item.num) && h('span', { class: 'mig-num' }, [rich(item.num)]),
            !isBlank(item.title) && h('strong', { class: 'mig-title' }, [rich(item.title)]),
            !isBlank(item.subtitle) && h('p', { class: 'mig-desc' }, [h('strong', {}, [rich(item.subtitle)])]),
            !isBlank(item.desc) && h('p', { class: 'mig-desc' }, [rich(item.desc)]),
            ...renderTextParts(item.parts),
            item.subitems.length > 0 && h('ul', { class: 'mig-list', style: LIST_RESET }, item.subitems.map((s) => h('li', { class: 'mig-item', style: { boxSizing: 'border-box' } }, [h('span', { class: 'mig-desc' }, [rich(s.text)])]))),
          ])),
        ),
      ]),
    ]);
  },
};
