import { z } from 'zod';
import { h } from '../html/h.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { scanSection } from '../parse/common.ts';
import { finish, firstByClass, optional, originalHeader, textOf, textsOf } from '../parse/original.ts';
import { children, descendants, hasClass, type DomElement } from '../parse/dom.ts';
import type { TypeDefinition } from './definition.ts';
import { figureFactsSchema, readFigureItems, renderFigureItems } from './type27.ts';
import { headerFields, presetSection } from './preset.ts';

const schema = figureFactsSchema.extend({
  /** 강조 글 상자(원본 p.cms-text-box, 예: 전화예약 번호) */
  callout: z.string().optional(),
});
export type Type32Data = z.infer<typeof schema>;

/**
 * 원본(reference/cms-original/component/type32.html, 실제 페이지 5개 섹션):
 *   .cms-list-wrap > [div > p.cms-text-box(강조 글)] + [.cms-description-box(안내)] + ol.cms-figure-list1(원 목록, 클래스 끝에 1이 붙음)
 * 호스트: 프리셋이 없어 같은 내용의 호스트 디자인인 type-27 카드로 출력한다(type33과 같은 판단).
 *   section.type-27 > .mig-body > [.mig-highlight-box > strong.mig-title] + [.mig-text-wrap > p.mig-desc] + ul.mig-list(원 목록)
 */
export const type32: TypeDefinition<Type32Data> = {
  id: 'type32',
  label: 'type32 강조 글 + 안내 + 원 목록 (호스트 type-27 카드)',
  strategy: 'preset',
  hostPreset: 'type-27',
  variants: ['default'],
  schema: schema as z.ZodType<Type32Data>,
  fields: [
    ...headerFields,
    { key: 'callout', label: '강조 글 (예: 전화예약 번호)', kind: 'richText' },
    { key: 'intro', label: '안내 글', kind: 'richText' },
    {
      key: 'items', label: '원 항목', kind: 'repeat', min: 0, max: 12,
      fields: [{ key: 'label', label: '작은 글', kind: 'text' }, { key: 'text', label: '값', kind: 'richText' }],
    },
  ],
  defaults: { callout: '전화예약', items: [{ label: '평일', text: '오전 9시 ~ 오후 6시', icon: {} }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const wrap = firstByClass(src.element, 'cms-list-wrap');
    const list = wrap ? descendants(wrap, (el) => (el.tagName === 'ol' || el.tagName === 'ul') && [...el.attrs].some((a) => a.name === 'class' && /(^|\s)cms-figure-list\d*(\s|$)/u.test(a.value)))[0] : undefined;
    const callout = textOf(wrap, 'cms-text-box');
    // 목록 앞 안내 상자(목록 묶음 안). 목록 뒤 상자는 담을 자리가 없어 남은 글 검사가 fallback한다
    const kids = wrap ? children(wrap) : [];
    const at = list ? kids.findIndex((k) => k === list || descendants(k).includes(list)) : kids.length;
    const intro = kids.filter((k, i) => i < at && hasClass(k, 'cms-description-box')).map((b) => textsOf(b, 'cms-description')).filter(Boolean).join('<br>');
    const extra: DomElement[] = [];
    const items = readFigureItems(list, src, diagnostics, extra);
    const data: Type32Data = {
      ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}),
      ...optional('callout', callout), ...optional('intro', intro), items,
    };
    return finish(src, data, [...header.used, callout, intro, ...items.flatMap((i) => [i.label ?? '', i.text, i.desc ?? ''])], extra, { modifiers, diagnostics });
  },
  render(section) {
    const d = section.data;
    return presetSection('type-27', section, [
      !isBlank(d.callout) && h('div', { class: 'mig-highlight-box' }, [h('strong', { class: 'mig-title' }, [rich(d.callout)])]),
      !isBlank(d.intro) && h('div', { class: 'mig-text-wrap' }, [h('p', { class: 'mig-desc' }, [rich(d.intro)])]),
      d.items.length > 0 && renderFigureItems(d.items),
    ]);
  },
};
