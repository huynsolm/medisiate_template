import { z } from 'zod';
import { h } from '../html/h.ts';
import { rich } from '../helpers/misc.ts';
import { scanSection } from '../parse/common.ts';
import { byClass, finish, listItems, originalHeader, textOf } from '../parse/original.ts';
import { descendants } from '../parse/dom.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, LIST_RESET, presetSection } from './preset.ts';

const schema = z.object({ ...headerShape, items: z.array(z.object({ text: z.string().default('') })).default([]) });
export type Type11Data = z.infer<typeof schema>;

/**
 * 원본: (어두운 배경 bg-image-* + text-white) ul.cms-bullet-list.list-bg-box > li > p.cms-description
 * 호스트: section.type-11 > .mig-body > ul.mig-list > li.mig-item(카드) > p.mig-desc
 */
export const type11: TypeDefinition<Type11Data> = {
  id: 'type11',
  label: 'type11 바탕 위 글머리 카드 목록',
  strategy: 'preset',
  hostPreset: 'type-11',
  variants: ['default'],
  schema: schema as z.ZodType<Type11Data>,
  fields: [...headerFields, { key: 'items', label: '항목', kind: 'repeat', min: 0, max: 12, fields: [{ key: 'text', label: '글', kind: 'richText' }] }],
  defaults: { items: [{ text: '항목' }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const items = listItems(descendants(src.element, byClass('cms-bullet-list'))[0]).map((li) => ({ text: textOf(li, 'cms-description') }));
    const data: Type11Data = { ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}), items };
    return finish(src, data, [...header.used, ...items.map((i) => i.text)], [], { modifiers, diagnostics });
  },
  render(section) {
    return presetSection('type-11', section, [
      h('ul', { class: 'mig-list', style: LIST_RESET }, section.data.items.map((item) => h('li', { class: 'mig-item' }, [h('p', { class: 'mig-desc' }, [rich(item.text)])]))),
    ]);
  },
};
