import { z } from 'zod';
import { h } from '../html/h.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { richFrom, scanSection } from '../parse/common.ts';
import { byClass, childText, finish, firstByClass, originalHeader } from '../parse/original.ts';
import { attr, children, descendants, type DomElement } from '../parse/dom.ts';
import { CSS_LENGTH } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, presetSection } from './preset.ts';

const span = z.number().int().min(2).max(20).optional();
const cellSchema = z.object({ text: z.string(), th: z.boolean().default(false), colspan: span, rowspan: span });
const rowSchema = z.object({ cells: z.array(cellSchema) });
const widthSchema = z.string().refine((v) => v === 'auto' || CSS_LENGTH.test(v), '열 너비는 auto 또는 길이 값이어야 합니다');
const schema = z.object({
  ...headerShape,
  desc: z.string().optional(),
  colWidths: z.array(z.object({ width: widthSchema })).default([]),
  head: z.array(rowSchema).default([]),
  body: z.array(rowSchema).default([]),
});
export type Type26Data = z.infer<typeof schema>;
type Cell = z.infer<typeof cellSchema>;

const WIDTH = /^\s*width\s*:\s*([^;]+?)\s*;?\s*$/iu;

function spanOf(el: DomElement, name: 'colspan' | 'rowspan'): number | undefined {
  const n = Number(attr(el, name));
  return Number.isInteger(n) && n >= 2 && n <= 20 ? n : undefined;
}

function rowsOf(group: DomElement | undefined): Array<{ cells: Cell[] }> {
  if (!group) return [];
  return children(group).filter((tr) => tr.tagName === 'tr').map((tr) => ({
    cells: children(tr).filter((c) => c.tagName === 'th' || c.tagName === 'td').map((c) => {
      const colspan = spanOf(c, 'colspan');
      const rowspan = spanOf(c, 'rowspan');
      return { text: richFrom(c), th: c.tagName === 'th', ...(colspan ? { colspan } : {}), ...(rowspan ? { rowspan } : {}) };
    }),
  }));
}

/**
 * 원본: .cms-table-wrap > [.cms-description-box > p.cms-description] + table.cms-table(colgroup > col[style=width], thead, tbody)
 * 호스트: section.type-26 > .mig-body > .mig-table-wrap > [p.mig-desc] + .table-responsive(가로 스크롤) > table.mig-table
 * 칸 병합(colspan/rowspan)과 th/td 구분, 열 너비를 그대로 옮긴다.
 */
export const type26: TypeDefinition<Type26Data> = {
  id: 'type26',
  label: 'type26 설명 + 표',
  strategy: 'preset',
  hostPreset: 'type-26',
  variants: ['default'],
  schema: schema as z.ZodType<Type26Data>,
  fields: [
    ...headerFields,
    { key: 'desc', label: '표 위 설명', kind: 'richText' },
    { key: 'colWidths', label: '열 너비', kind: 'repeat', min: 0, max: 10, fields: [{ key: 'width', label: 'auto 또는 30% 같은 값', kind: 'text' }] },
    ...(['head', 'body'] as const).map((key) => ({
      key, label: key === 'head' ? '머리글 행' : '본문 행', kind: 'repeat' as const, min: 0, max: 20,
      fields: [{
        key: 'cells', label: '칸', kind: 'repeat' as const, min: 1, max: 10,
        fields: [
          { key: 'text', label: '글', kind: 'richText' as const },
          { key: 'th', label: '제목 칸(th)', kind: 'checkbox' as const },
          { key: 'colspan', label: '가로 병합', kind: 'number' as const },
          { key: 'rowspan', label: '세로 병합', kind: 'number' as const },
        ],
      }],
    })),
  ],
  defaults: { colWidths: [], head: [{ cells: [{ text: '구분', th: true }, { text: '내용', th: true }] }], body: [{ cells: [{ text: '행', th: true }, { text: '내용', th: false }] }] },
  parse(src) {
    const scan = scanSection(src);
    const table = descendants(src.element, (el) => el.tagName === 'table')[0];
    const cols = table ? descendants(table, (el) => el.tagName === 'col') : [];
    const colWidths = cols.map((col) => ({ width: WIDTH.exec(attr(col, 'style') ?? '')?.[1]?.trim() ?? 'auto' }));
    // 열 너비는 데이터로 옮기므로, width만 있는 col style은 "버린 style" 경고에서 뺀다.
    const diagnostics = scan.diagnostics.filter((d) => !(d.code === 'INLINE_STYLE_DROPPED' && d.detail?.tag === 'col'
      && (d.detail.declarations as string[]).every((decl) => WIDTH.test(decl))));
    const header = originalHeader(src.element);
    const wrap = firstByClass(src.element, 'cms-table-wrap');
    const desc = childText(wrap ? children(wrap).find(byClass('cms-description-box')) : undefined, 'cms-description');
    const head = rowsOf(table ? children(table).find((el) => el.tagName === 'thead') : undefined);
    const body = rowsOf(table ? children(table).find((el) => el.tagName === 'tbody') : undefined);
    const data: Type26Data = {
      ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}),
      ...(desc ? { desc } : {}), colWidths, head, body,
    };
    const used = [...header.used, desc, ...[...head, ...body].flatMap((r) => r.cells.map((c) => c.text))];
    return finish(src, data, used, [], { modifiers: scan.modifiers, diagnostics });
  },
  render(section) {
    const d = section.data;
    const cell = (c: Cell) => h(c.th ? 'th' : 'td', { colspan: c.colspan, rowspan: c.rowspan }, [rich(c.text)]);
    const rows = (list: Type26Data['head']) => list.map((r) => h('tr', {}, r.cells.map(cell)));
    return presetSection('type-26', section, [
      h('div', { class: 'mig-table-wrap' }, [
        !isBlank(d.desc) && h('p', { class: 'mig-desc' }, [rich(d.desc)]),
        h('div', { class: 'table-responsive' }, [
          h('table', { class: 'mig-table' }, [
            d.colWidths.length > 0 && h('colgroup', {}, d.colWidths.map((c) => h('col', { style: { width: c.width } }))),
            d.head.length > 0 && h('thead', {}, rows(d.head)),
            h('tbody', {}, rows(d.body)),
          ]),
        ]),
      ]),
    ]);
  },
};
