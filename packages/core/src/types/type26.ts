import { z } from 'zod';
import { h } from '../html/h.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { richFrom, scanSection, TEXT_BLOCKS, TEXT_INLINE } from '../parse/common.ts';
import { byClass, childText, finish, firstByClass, originalHeader } from '../parse/original.ts';
import { attr, children, descendants, type DomElement } from '../parse/dom.ts';
import { CSS_LENGTH, toNumberInput } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, presetSection } from './preset.ts';

/*
 * 병합 값은 HTML 규격 범위를 그대로 따른다: colspan 1~1000, rowspan 0~65534 (0은 "그룹 끝까지").
 * 1은 기본값이라 데이터에 넣지 않는다. 편집기에서 비운 칸('' / undefined)과 1도 "병합 없음"으로 받는다.
 */
const COLSPAN = { min: 1, max: 1000 } as const;
const ROWSPAN = { min: 0, max: 65534 } as const;
const spanSchema = (range: { min: number; max: number }) => z.preprocess(
  (v) => {
    if (v === '' || v === undefined || v === null) return undefined;
    const n = toNumberInput(v);
    return n === 1 ? undefined : n; // 숫자가 아닌 값은 그대로 넘겨 거부되게 한다 (re-review R-I-2)
  },
  z.number().int().min(range.min).max(range.max).optional(),
);
const cellSchema = z.object({ text: z.string().default(''), th: z.boolean().default(false), colspan: spanSchema(COLSPAN), rowspan: spanSchema(ROWSPAN) });
const rowSchema = z.object({ cells: z.array(cellSchema).default([]) });
// 편집기에서 비운 열 너비는 auto로 본다
const widthSchema = z.preprocess(
  (v) => (v === undefined || v === null || (typeof v === 'string' && v.trim() === '') ? 'auto' : typeof v === 'string' ? v.trim() : v),
  z.string().refine((v) => v === 'auto' || CSS_LENGTH.test(v), '열 너비는 auto 또는 길이 값이어야 합니다'),
);
const schema = z.object({
  ...headerShape,
  desc: z.string().optional(),
  /** 표 제목(원본 caption.sr-only, 화면 낭독기용). 호스트도 caption을 화면에서 숨긴다 */
  caption: z.string().optional(),
  colWidths: z.array(z.object({ width: widthSchema })).default([]),
  head: z.array(rowSchema).default([]),
  body: z.array(rowSchema).default([]),
});
export type Type26Data = z.infer<typeof schema>;
type Cell = z.infer<typeof cellSchema>;

const WIDTH = /^\s*width\s*:\s*([^;]+?)\s*;?\s*$/iu;

/**
 * 병합 값. 속성이 없거나 1이면 undefined(병합 없음).
 * 규격 범위 밖이거나 숫자가 아니면 브라우저가 값을 바꿔 해석하므로(예: 2000 → 1000, "2x" → 2) 옮기지 않고 problem에 기록한다.
 */
function spanOf(el: DomElement, name: 'colspan' | 'rowspan', range: { min: number; max: number }, problems: string[]): number | undefined {
  const raw = attr(el, name);
  if (raw === undefined) return undefined;
  const n = /^\s*\d+\s*$/u.test(raw) ? Number(raw) : Number.NaN;
  if (!Number.isInteger(n) || n < range.min || n > range.max) {
    problems.push(`${name}="${raw}"`);
    return undefined;
  }
  return n === 1 ? undefined : n;
}

/**
 * 칸 글. 칸 안의 문단은 줄바꿈(<br>)으로 이어 경계를 지킨다(richFrom, 공통 규칙).
 * 블록 상자(TEXT_BLOCKS)와 줄 안 요소(TEXT_INLINE) 밖의 요소(목록·표·제목·hr·details 등)가 있거나,
 * 줄 안 요소 안에 블록이 숨은 칸은 경계를 잃으므로 옮기지 않고 problem에 기록한다(섹션 fallback).
 */
function cellText(el: DomElement, problems: string[]): string {
  const unsupported = descendants(el, (d) => !TEXT_BLOCKS.has(d.tagName) && !TEXT_INLINE.has(d.tagName))[0];
  if (unsupported) {
    problems.push(`칸 안의 <${unsupported.tagName}>`);
    return '';
  }
  const hidden = descendants(el, (d) => TEXT_BLOCKS.has(d.tagName) && d.parentNode !== el && !TEXT_BLOCKS.has((d.parentNode as DomElement).tagName))[0];
  if (hidden) {
    problems.push(`줄 안 요소 안의 <${hidden.tagName}>`);
    return '';
  }
  return richFrom(el);
}

function rowsOf(group: DomElement | undefined, problems: string[]): Array<{ cells: Cell[] }> {
  if (!group) return [];
  return children(group).filter((tr) => tr.tagName === 'tr').map((tr) => ({
    cells: children(tr).filter((c) => c.tagName === 'th' || c.tagName === 'td').map((c) => {
      const colspan = spanOf(c, 'colspan', COLSPAN, problems);
      const rowspan = spanOf(c, 'rowspan', ROWSPAN, problems);
      return { text: cellText(c, problems), th: c.tagName === 'th', ...(colspan !== undefined ? { colspan } : {}), ...(rowspan !== undefined ? { rowspan } : {}) };
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
    { key: 'caption', label: '표 제목 (화면 낭독기용, 화면에는 안 보임)', kind: 'text' },
    { key: 'colWidths', label: '열 너비', kind: 'repeat', min: 0, max: 10, fields: [{ key: 'width', label: 'auto 또는 30% 같은 값 (비우면 auto)', kind: 'text' }] },
    ...(['head', 'body'] as const).map((key) => ({
      key, label: key === 'head' ? '머리글 행' : '본문 행', kind: 'repeat' as const, min: 0, max: 20,
      fields: [{
        key: 'cells', label: '칸', kind: 'repeat' as const, min: 1, max: 10,
        fields: [
          { key: 'text', label: '글', kind: 'richText' as const },
          { key: 'th', label: '제목 칸(th)', kind: 'checkbox' as const },
          { key: 'colspan', label: '가로 병합 (1~1000)', kind: 'number' as const, min: COLSPAN.min, max: COLSPAN.max },
          { key: 'rowspan', label: '세로 병합 (0은 끝까지, ~65534)', kind: 'number' as const, min: ROWSPAN.min, max: ROWSPAN.max },
        ],
      }],
    })),
  ],
  defaults: { colWidths: [], head: [{ cells: [{ text: '구분', th: true }, { text: '내용', th: true }] }], body: [{ cells: [{ text: '행', th: true }, { text: '내용', th: false }] }] },
  parse(src) {
    const scan = scanSection(src);
    const table = descendants(src.element, (el) => el.tagName === 'table')[0];
    const cols = table ? descendants(table, (el) => el.tagName === 'col') : [];
    // 너비는 style(width: 20%) 또는 width 속성(width="20%")에서 읽는다. 실제 페이지에는 width:* · width:% 같은 오타가 있는데,
    // 브라우저는 잘못된 값을 무시하므로(= 너비 지정 없음) auto로 옮긴다. 그대로 담으면 스키마가 섹션 전체를 거부했다.
    const colWidths = cols.map((col) => {
      const raw = (WIDTH.exec(attr(col, 'style') ?? '')?.[1] ?? attr(col, 'width') ?? '').trim();
      return { width: CSS_LENGTH.test(raw) ? raw : /^\d+(\.\d+)?$/u.test(raw) ? `${raw}px` : 'auto' };
    });
    // 열 너비는 데이터로 옮기므로, width만 있는 col style은 "버린 style" 경고에서 뺀다.
    const diagnostics = scan.diagnostics.filter((d) => !(d.code === 'INLINE_STYLE_DROPPED' && d.detail?.tag === 'col'
      && (d.detail.declarations as string[]).every((decl) => WIDTH.test(decl))));
    const header = originalHeader(src.element);
    const wrap = firstByClass(src.element, 'cms-table-wrap');
    const desc = childText(wrap ? children(wrap).find(byClass('cms-description-box')) : undefined, 'cms-description');
    const problems: string[] = [];
    const captionEl = table ? children(table).find((el) => el.tagName === 'caption') : undefined;
    const caption = captionEl ? richFrom(captionEl) : '';
    const head = rowsOf(table ? children(table).find((el) => el.tagName === 'thead') : undefined, problems);
    const body = rowsOf(table ? children(table).find((el) => el.tagName === 'tbody') : undefined, problems);
    const data: Type26Data = {
      ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}),
      ...(desc ? { desc } : {}), ...(caption ? { caption } : {}), colWidths, head, body,
    };
    const used = [...header.used, desc, caption, ...[...head, ...body].flatMap((r) => r.cells.map((c) => c.text))];
    const result = finish(src, data, used, [], { modifiers: scan.modifiers, diagnostics });
    // 표 구조를 바꾸지 않고는 옮길 수 없는 칸이 있으면 섹션 전체를 원본 그대로 보존한다
    return problems.length > 0 && !result.fallbackReason
      ? { ...result, lossless: false, fallbackReason: `표를 그대로 옮길 수 없음: ${[...new Set(problems)].slice(0, 3).join(', ')}` }
      : result;
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
            !isBlank(d.caption) && h('caption', {}, [rich(d.caption)]),
            d.colWidths.length > 0 && h('colgroup', {}, d.colWidths.map((c) => h('col', { style: { width: c.width } }))),
            d.head.length > 0 && h('thead', {}, rows(d.head)),
            h('tbody', {}, rows(d.body)),
          ]),
        ]),
      ]),
    ]);
  },
};
