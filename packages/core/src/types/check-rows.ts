import { z } from 'zod';
import { h, raw } from '../html/h.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { scanSection } from '../parse/common.ts';
import { byClass, childText, finish, listItems, optional, originalHeader, textOf } from '../parse/original.ts';
import { children, descendants, hasClass } from '../parse/dom.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, LIST_RESET, presetSection } from './preset.ts';

/** 원본 체크 도형(18×14)과 같은 경로. 입력의 SVG는 옮기지 않고 이 고정 값만 쓴다. */
const CHECK = '<svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true" focusable="false"><path fill="var(--mig-primary-color)" d="M336.945,10423.6l-1.945,2,6.289,6.4L353,10420l-1.945-2-9.766,10Z" transform="translate(-335 -10418)"></path></svg>';

const itemSchema = z.object({ num: z.string().optional(), text: z.string().default('') });
const baseShape = { ...headerShape, items: z.array(itemSchema).default([]) };
const withBottom = z.object({ ...baseShape, bottom: z.string().optional() });
export type CheckRowsData = z.infer<typeof withBottom>;

/**
 * 원본(type13·type14): ul.cms-table-list > li > .cms-inner-box.row >
 *   .cms-fixed-cell.cms-description-box(번호) + .cms-description-box.col(글) + .cms-fixed-cell(체크 도형)
 *   type13만: 목록 뒤 .cms-description-box.em-box(마무리 강조 문구)
 * 호스트: section.type-NN > .mig-body > ul.mig-list > li.mig-item > .mig-content(grid: auto 1fr 18px) >
 *   span.mig-num + p.mig-desc + span.mig-icon  [+ .mig-highlight-box > p.mig-desc]
 * 번호가 비어도 span.mig-num을 남겨 글이 가운데 칸에 머물게 한다.
 */
export function checkRowsType(id: 'type13' | 'type14', options: { bottom: boolean }): TypeDefinition<CheckRowsData> {
  const preset = id === 'type13' ? 'type-13' : 'type-14';
  return {
    id,
    label: options.bottom ? `${id} 번호·체크 행 목록 + 강조 문구` : `${id} 번호·체크 행 목록`,
    strategy: 'preset',
    hostPreset: preset,
    variants: ['default'],
    schema: (options.bottom ? withBottom : z.object(baseShape)) as z.ZodType<CheckRowsData>,
    fields: [
      ...headerFields,
      { key: 'items', label: '행', kind: 'repeat', min: 0, max: 12, fields: [{ key: 'num', label: '번호', kind: 'text' }, { key: 'text', label: '글', kind: 'richText' }] },
      ...(options.bottom ? [{ key: 'bottom', label: '아래 강조 문구', kind: 'richText' as const }] : []),
    ],
    defaults: { items: [{ num: '01', text: '내용' }] },
    parse(src) {
      const { modifiers, diagnostics } = scanSection(src);
      const header = originalHeader(src.element);
      const items = listItems(descendants(src.element, byClass('cms-table-list'))[0]).map((li) => {
        const cells = children(children(li).find(byClass('cms-inner-box')) ?? li);
        const numCell = cells.find((c) => hasClass(c, 'cms-fixed-cell') && hasClass(c, 'cms-description-box'));
        const textCell = cells.find((c) => hasClass(c, 'cms-description-box') && !hasClass(c, 'cms-fixed-cell'));
        return { ...optional('num', textOf(numCell, 'cms-description')), text: textOf(textCell, 'cms-description') };
      });
      const inner = children(src.element).find(byClass('cms-inner')) ?? src.element;
      const bottomBox = options.bottom ? children(inner).find((c) => hasClass(c, 'cms-description-box') && hasClass(c, 'em-box')) : undefined;
      const bottom = childText(bottomBox, 'cms-description');
      const data: CheckRowsData = {
        ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}),
        items, ...optional('bottom', bottom),
      };
      return finish(src, data, [...header.used, ...items.flatMap((i) => [i.num ?? '', i.text]), bottom], [], { modifiers, diagnostics });
    },
    render(section) {
      const d = section.data;
      return presetSection(preset, section, [
        h('ul', { class: 'mig-list', style: LIST_RESET }, d.items.map((item) =>
          h('li', { class: 'mig-item' }, [
            h('div', { class: 'mig-content' }, [
              h('span', { class: 'mig-num' }, [rich(item.num ?? '')]),
              h('p', { class: 'mig-desc' }, [rich(item.text)]),
              h('span', { class: 'mig-icon' }, [raw(CHECK)]),
            ]),
          ])),
        ),
        options.bottom && !isBlank(d.bottom) && h('div', { class: 'mig-highlight-box' }, [h('p', { class: 'mig-desc' }, [rich(d.bottom)])]),
      ]);
    },
  };
}
