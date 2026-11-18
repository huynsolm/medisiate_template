import { z } from 'zod';
import { h, type ElementNode } from '../html/h.ts';
import { visualPcMo } from '../helpers/image.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { richFrom, scanSection } from '../parse/common.ts';
import { byClass, finish, firstByClass, imagesIn, listItems, optional, originalHeader, readNotes, textOf, textsOf } from '../parse/original.ts';
import { ancestors, descendants, hasClass, type DomElement, type SourceSection } from '../parse/dom.ts';
import type { Diagnostic } from '../model/index.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, LIST_RESET, notesFields, notesShape, presetSection, withNotes } from './preset.ts';

const itemSchema = z.object({
  label: z.string().optional(), text: z.string().default(''), icon: imagePairSchema.default({}),
  /** 원 아래 설명(실제 페이지: li 안, 원 밖의 p.cms-description) */
  desc: z.string().optional(),
});
export const figureFactsSchema = z.object({ ...headerShape, ...notesShape, items: z.array(itemSchema).default([]) });
const schema = figureFactsSchema;
export type Type27Data = z.infer<typeof schema>;
export type FigureFactsData = Type27Data;

type FigureItem = z.infer<typeof itemSchema>;

/** 원 목록 항목 읽기(type27·32·33 공통): 원 안 작은 글·값, 아이콘(글 상자 안 또는 옆), 원 아래 설명 */
export function readFigureItems(list: DomElement | undefined, src: SourceSection, diagnostics: Diagnostic[], extra: DomElement[]): FigureItem[] {
  return listItems(list).map((li) => {
    const figure = descendants(li, byClass('cms-figure-text'))[0];
    // 아이콘은 글 상자 안(type27 실제 페이지) 또는 옆(type33 실제 페이지: .cms-figure > .cms-inner > .cms-icon + .cms-figure-text)
    const { pair: icon, extra: more } = imagesIn(descendants(li, byClass('cms-icon'))[0], src, diagnostics);
    extra.push(...more);
    const shape = descendants(li, byClass('cms-figure'))[0];
    const below = descendants(li, (d) => hasClass(d, 'cms-description') && !(shape && (d === shape || ancestors(d).includes(shape))))
      .map((p) => richFrom(p)).filter(Boolean).join('<br>');
    return { ...optional('label', textOf(figure, 'cms-eyebrow')), text: textsOf(figure, 'cms-description'), icon, ...optional('desc', below) };
  });
}

/** 원 목록 출력(호스트 type-27 카드) */
export function renderFigureItems(items: FigureItem[]): ElementNode {
  return h('ul', { class: 'mig-list', style: LIST_RESET }, items.map((item) =>
    h('li', { class: 'mig-item' }, [
      visualPcMo(item.icon),
      !isBlank(item.label) && h('span', { class: 'mig-label' }, [rich(item.label)]),
      !isBlank(item.text) && h('p', { class: 'mig-desc' }, [rich(item.text)]),
      !isBlank(item.desc) && h('p', { class: 'mig-desc' }, [rich(item.desc)]),
    ])));
}

/**
 * 원본(reference/cms-original/component/type27.html):
 *   ol.cms-figure-list.item-between-plus > li.col-N > .cms-figure.circle > .cms-figure-text > [.cms-icon] + p.cms-eyebrow(작은 글) + p.cms-description(값)
 *   + 목록 뒤 .cms-description-box(설명)
 * 호스트: section.type-27 > .mig-body > ul.mig-list(카드, 1열 → PC 3열) > li.mig-item > [.mig-visual 아이콘] + span.mig-label + p.mig-desc
 *   목록 뒤 설명은 공통 note.
 * 원 도형과 항목 사이 +·− 기호(item-between-plus, minus)는 원본 CSS 장식이라 옮기지 않는다(안의 글은 옮김).
 */
export function figureFactsType(id: string, label: string): TypeDefinition<Type27Data> {
  return {
  id,
  label,
  strategy: 'preset',
  hostPreset: 'type-27',
  variants: ['default'],
  schema: schema as z.ZodType<Type27Data>,
  fields: [
    ...headerFields,
    {
      key: 'items', label: '항목', kind: 'repeat', min: 0, max: 12,
      fields: [
        { key: 'label', label: '작은 글', kind: 'text' },
        { key: 'text', label: '값', kind: 'richText' },
        { key: 'icon', label: '아이콘 (PC/MO)', kind: 'imagePair' },
        { key: 'desc', label: '원 아래 설명', kind: 'richText' },
      ],
    },
    ...notesFields,
  ],
  defaults: { items: [{ label: '작은 글', text: '값', icon: {} }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const list = descendants(src.element, byClass('cms-figure-list'))[0];
    const extra: DomElement[] = [];
    const items = readFigureItems(list, src, diagnostics, extra);
    const notes = readNotes(src.element, firstByClass(src.element, 'cms-list-wrap'));
    const data: Type27Data = {
      ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}),
      ...optional('intro', notes.intro), ...optional('note', notes.note), items,
    };
    return finish(src, data, [...header.used, notes.intro, notes.note, ...items.flatMap((i) => [i.label ?? '', i.text, i.desc ?? ''])], extra, { modifiers, diagnostics });
  },
  render(section) {
    return presetSection('type-27', section, withNotes(section.data, [renderFigureItems(section.data.items)]));
  },
};
}

export const type27 = figureFactsType('type27', 'type27 원 안의 작은 글·값 목록');
