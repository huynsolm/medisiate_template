import { z } from 'zod';
import { h } from '../html/h.ts';
import { visualPcMo } from '../helpers/image.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { scanSection } from '../parse/common.ts';
import { byClass, finish, firstByClass, imagesIn, itemText, listItems, optional, originalHeader, readNotes, textOf } from '../parse/original.ts';
import { descendants } from '../parse/dom.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, LIST_RESET, notesFields, notesShape, presetSection, withNotes } from './preset.ts';

const schema = z.object({
  ...headerShape,
  ...notesShape,
  image: imagePairSchema.default({}),
  /** 항목: 글(원본 p.cms-description), 선택 제목(원본 옵션 p.cms-title) */
  items: z.array(z.object({ title: z.string().optional(), text: z.string().default('') })).default([]),
});
export type Type07Data = z.infer<typeof schema>;

/**
 * 원본: .cms-column-wrap > .cms-visual(PC/MO) + .cms-list-wrap > ul.cms-bullet-list > li.cms-list-item > p.cms-description
 * 호스트: section.type-07 > .mig-body > .mig-content > .mig-visual(직접 자식, PC 4:6 격자) + ul.mig-list > li.mig-item
 */
export const type07: TypeDefinition<Type07Data> = {
  id: 'type07',
  label: 'type07 이미지 + 글머리 목록',
  strategy: 'preset',
  hostPreset: 'type-07',
  variants: ['default'],
  schema: schema as z.ZodType<Type07Data>,
  fields: [
    ...headerFields,
    { key: 'image', label: '이미지 (PC/MO)', kind: 'imagePair' },
    { key: 'items', label: '글머리', kind: 'repeat', min: 0, max: 12, fields: [{ key: 'title', label: '제목 (선택)', kind: 'text' }, { key: 'text', label: '글', kind: 'richText' }] },
    ...notesFields,
  ],
  defaults: { image: {}, items: [{ text: '내용' }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const { pair: image, extra } = imagesIn(firstByClass(src.element, 'cms-visual'), src, diagnostics);
    const list = descendants(src.element, byClass('cms-bullet-list'))[0];
    const items = listItems(list).map((li) => ({ ...optional('title', textOf(li, 'cms-title')), text: itemText(li, 'cms-description') }));
    const notes = readNotes(src.element, firstByClass(src.element, 'cms-column-wrap'));
    const data: Type07Data = {
      ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}),
      ...optional('intro', notes.intro), ...optional('note', notes.note), image, items,
    };
    return finish(src, data, [...header.used, notes.intro, notes.note, ...items.flatMap((i) => [i.title ?? '', i.text])], extra, { modifiers, diagnostics });
  },
  render(section) {
    const d = section.data;
    return presetSection('type-07', section, withNotes(d, [
      h('div', { class: 'mig-content' }, [
        visualPcMo(d.image),
        d.items.length > 0 && h('ul', { class: 'mig-list', style: LIST_RESET }, d.items.map((item) => h('li', { class: 'mig-item' }, [
          !isBlank(item.title) && h('strong', { class: 'mig-title' }, [rich(item.title)]),
          h('span', { class: 'mig-desc' }, [rich(item.text)]),
        ]))),
      ]),
    ]));
  },
};
