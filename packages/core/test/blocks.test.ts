import { describe, expect, it } from 'vitest';
import { blocks, type Block } from '../src/types/blocks.ts';
import { convert as convertTyped, convertFull as convert } from './support/original.ts';

const section = (cls: string, inner: string) => `<section class="cms ${cls}"><div class="cms-inner">${inner}</div></section>`;
const data = (r: ReturnType<typeof convert>, i = 0) => r.page.sections[i]!.data as { blocks: Block[] };
const kinds = (list: Block[]) => list.map((b) => b.kind);
/** 출력은 줄바꿈으로 들여 써지므로 태그 사이 공백을 지우고 비교한다 */
const flat = (html: string) => html.replace(/>\s+</gu, '><');

// 실제 페이지(13168 어깨탈구 #2)와 같은 모양: type01인데 이미지 묶음이 설명 앞뒤로 두 번
const twoVisuals = section('type01', '<div class="cms-header"><p class="cms-thin-title"><em>어깨 관절 불안정성</em>은 반복될수록 심해집니다</p></div>'
  + '<div class="cms-visual"><img src="https://example.com/a.jpg" alt="" class="img-fluid d-none d-lg-block"><img src="https://example.com/a_m.jpg" alt="" class="w-100 d-block d-lg-none"></div>'
  + '<div class="cms-description-box"><p class="cms-description larger">첫 문단<br>둘째 줄</p><p class="cms-description larger">셋째 문단</p></div>'
  + '<div class="cms-visual marT_90"><img src="https://example.com/b.png" alt="" class="img-fluid d-none d-lg-block m-auto"><img src="https://example.com/b_m.png" alt="" class="w-100 d-block d-lg-none"></div>');

describe('blocks: the last resort keeps every text and image in the original order (general mode)', () => {
  it('a type01 with two image groups becomes blocks in the original order, with PC/MO pairs', () => {
    const r = convert(twoVisuals);
    const s = r.page.sections[0]!;
    expect(s.type).toBe('blocks');
    expect(kinds(data(r).blocks)).toEqual(['heading', 'image', 'text', 'text', 'image']);
    expect(data(r).blocks[1]!.image).toMatchObject({ pc: { src: 'https://example.com/a.jpg' }, mo: { src: 'https://example.com/a_m.jpg' } });
    const d = r.page.diagnostics.find((x) => x.code === 'LAYOUT_SIMPLIFIED');
    expect(d?.level).toBe('warn');
    expect(d?.message).toContain('type01');
    expect(r.page.diagnostics.some((x) => x.code === 'LOSSY_PARSE')).toBe(false);
    expect(r.status).toBe('partial');
    expect(r.fallbackCount).toBe(0);
    // 일반 모드: mig-container 밖, type-text 섹션
    expect(r.html).toContain('class="mig-section type-text"');
    expect(r.html).not.toContain('mig-container');
    expect(r.html.indexOf('a.jpg')).toBeLessThan(r.html.indexOf('첫 문단'));
    expect(r.html.indexOf('셋째 문단')).toBeLessThan(r.html.indexOf('b.png'));
  });

  it('eyebrow + title of the header become one general header', () => {
    const r = convert(section('type99', '<div class="cms-header top-border"><p class="cms-eyebrow">작은 글</p><p class="cms-title">큰 제목</p></div><p>본문</p>'));
    expect(kinds(data(r).blocks)).toEqual(['eyebrow', 'heading', 'text']);
    expect(flat(r.html)).toMatch(/작은 글<\/p><strong class="mig-title"[^>]*>큰 제목<\/strong>/u);
  });

  it('lists keep nesting (up to 3 levels), numbering start and titles inside items', () => {
    const r = convert(section('type99', '<ol class="cms-row-list" start="3"><li class="cms-list-item"><div class="cms-description-box"><p class="cms-title">항목 제목</p><p class="cms-description">항목 설명</p></div><ul><li>하위 1</li><li>하위 2</li></ul></li></ol>'));
    const list = data(r).blocks[0]!;
    expect(list).toMatchObject({ kind: 'list', ordered: true, start: 3 });
    expect(kinds(list.items![0]!.blocks)).toEqual(['title', 'text', 'list']);
    expect(r.html).toContain('<ol class="mig-list type-ordered" start="3" style="counter-reset: mig-counter 2;">');
    expect(flat(r.html)).toContain('<ul class="mig-list type-bullet"><li class="mig-item"><p class="mig-desc">하위 1</p></li>');
  });

  it('tables keep head/body rows, merged cells and column widths', () => {
    const r = convert(section('type99', '<p>표 앞 글</p><table><colgroup><col style="width:30%"><col></colgroup><thead><tr><th>구분</th><th>내용</th></tr></thead><tbody><tr><th rowspan="2">가</th><td>1</td></tr><tr><td>2</td></tr></tbody></table>'));
    expect(kinds(data(r).blocks)).toEqual(['text', 'table']);
    expect(r.html).toContain('<th rowspan="2">가</th>');
    expect(r.html).toContain('<col style="width: 30%;">');
    expect(r.html).toContain('class="mig-table"');
  });

  it('a block that only one screen shows keeps the host display class', () => {
    const r = convert(section('type99', '<p class="d-none d-lg-block">PC 글</p><p class="d-lg-none">모바일 글</p>'));
    expect(r.html).toContain('<p class="mig-desc common-display-pc">PC 글</p>');
    expect(r.html).toContain('<p class="mig-desc common-display-mo">모바일 글</p>');
    expect(r.page.sections[0]!.type).toBe('blocks');
  });

  it.each([
    ['a video frame', '<iframe src="https://example.com/v"></iframe><p>글</p>'],
    ['text inside an svg shape', '<svg><text>도형 글</text></svg><p>글</p>'],
    ['a list deeper than 3 levels', '<ul><li>1<ul><li>2<ul><li>3<ul><li>4</li></ul></li></ul></li></ul></li></ul>'],
    ['a table cell holding a list', '<table><tbody><tr><td><ul><li>칸 안 목록</li></ul></td></tr></tbody></table>'],
    ['text that changes inside one screen width', '<p class="d-block d-xl-none">글</p>'],
    ['text hidden by a format class the host does not know', '<p>앞<span class="d-none">숨김</span>뒤</p>'],
  ])('%s keeps the original (fallback)', (_, inner) => {
    const r = convert(section('type99', inner));
    expect(r.page.sections[0]!.type).toBe('fallback');
  });

  it('a page mixing preset and block sections splits the general block out of the preset container', () => {
    const r = convert(`${section('type01', '<p>프리셋</p>')}${twoVisuals}`);
    expect(r.page.sections.map((s) => s.type)).toEqual(['type01', 'blocks']);
    expect(r.page.diagnostics.some((d) => d.code === 'MIXED_MODE_SPLIT')).toBe(true);
    expect(r.html.match(/class="migration-content"/gu)).toHaveLength(2);
  });

  it('the parsed data passes the schema (no INVALID_DATA) and the editor has fields', () => {
    const r = convert(twoVisuals);
    expect(r.page.diagnostics.some((d) => d.code === 'INVALID_DATA')).toBe(false);
    expect(blocks.schema.safeParse(r.page.sections[0]!.data).success).toBe(true);
    expect(blocks.fields.map((f) => f.key)).toEqual(['blocks']);
  });
});

describe('blocks review fixes: numbering and list item display', () => {
  it('I-1 the start number moves into the host counter (the host draws counter(mig-counter), not the native marker)', () => {
    const r = convert(section('type01', '<ol start="3"><li>FIRST</li><li>SECOND</li></ol>'));
    expect(r.page.sections[0]!.type).toBe('blocks');
    expect(r.html).toContain('<ol class="mig-list type-ordered" start="3" style="counter-reset: mig-counter 2;">');
  });

  it.each([
    ['reversed', '<ol reversed start="3"><li>FIRST</li><li>SECOND</li></ol>'],
    ['li value', '<ol><li value="7">FIRST</li><li>SECOND</li></ol>'],
  ])('I-2 %s cannot be drawn by the host counter, so the original is kept', (_, list) => {
    const r = convert(section('type01', list));
    expect(r.page.sections[0]!.type).toBe('fallback');
    expect(r.page.diagnostics.some((d) => d.code === 'LOSSY_PARSE' && d.message.includes('블록 순서'))).toBe(false);
  });

  it('I-3 a list item that only one screen shows hides as a whole item (number included)', () => {
    const r = convert(section('type01', '<ol><li class="d-none d-lg-block">PC ITEM</li><li>ALL ITEM</li></ol>'));
    const list = data(r).blocks[0]!;
    expect(list.items![0]!.only).toBe('pc');
    expect(list.items![1]!.only).toBeUndefined();
    expect(flat(r.html)).toContain('<li class="mig-item common-display-pc"><p class="mig-desc common-display-pc">PC ITEM</p></li>');
  });

  it('M-1 table column widths that are kept are not reported as dropped', () => {
    const r = convert(section('type01', '<p>BEFORE</p><table><colgroup><col style="width:30%"><col></colgroup><tbody><tr><td>A</td><td>B</td></tr></tbody></table><p>AFTER</p>'));
    expect(r.page.sections[0]!.type).toBe('blocks');
    expect(r.html).toContain('<col style="width: 30%;">');
    expect(r.page.diagnostics.some((d) => d.code === 'INLINE_STYLE_DROPPED')).toBe(false);
  });
});

describe('blocks re-review: nested counters and items hidden on every screen', () => {
  it('I-1 a nested ordered list starts its own host counter level (mig-counter-sub, then -sub-sub)', () => {
    const r = convert(section('type01', '<ol><li><p>OUTER</p><ol start="4"><li>INNER FIRST</li><li>INNER SECOND</li></ol></li></ol>'));
    expect(r.html).toContain('<ol class="mig-list type-ordered" start="4" style="counter-reset: mig-counter-sub 3;">');
    const third = convert(section('type01', '<ol><li>A<ol><li>B<ol start="2"><li>C</li></ol></li></ol></li></ol>'));
    expect(third.html).toContain('style="counter-reset: mig-counter-sub-sub 1;"');
  });

  it('I-1 an ordered list inside a bullet item is a first-level counter again (the host chain is ol > li > ol only)', () => {
    const r = convert(section('type01', '<ol><li>A<ul><li>B<ol start="5"><li>C</li></ol></li></ul></li></ol>'));
    expect(r.html).toContain('style="counter-reset: mig-counter 4;"');
  });

  it('I-2 an empty item hidden on every screen is not moved (no number, the next item stays 1)', () => {
    const r = convert(section('type01', '<ol><li class="d-none"></li><li>ALL ITEM</li></ol>'));
    expect(r.page.sections[0]!.type).toBe('blocks');
    expect(data(r).blocks[0]!.items).toHaveLength(1);
    expect(r.html.match(/<li class="mig-item/gu)).toHaveLength(1);
  });

  it('I-2 a hidden item that holds text still keeps the original (the text would appear)', () => {
    expect(convert(section('type01', '<ol><li class="d-none">HIDDEN ITEM</li><li>ALL ITEM</li></ol>')).page.sections[0]!.type).toBe('fallback');
  });
});

describe('blocks 3rd review: hidden items holding only empty structure', () => {
  it.each([
    ['an empty list', '<li class="d-none"><ul></ul></li>'],
    ['an empty table', '<li class="d-none"><table><tbody><tr><td></td></tr></tbody></table></li>'],
    ['an empty nested item', '<li class="d-none"><div><span></span></div></li>'],
  ])('a hidden item with %s takes no number', (_, hidden) => {
    const r = convert(section('type01', `<ol>${hidden}<li>ALL ITEM</li></ol>`));
    expect(r.page.sections[0]!.type).toBe('blocks');
    expect(data(r).blocks[0]!.items).toHaveLength(1);
    expect(r.html.match(/<li class="mig-item/gu)).toHaveLength(1);
  });

  it('a hidden empty list or table outside a list item is not moved either', () => {
    const r = convert(section('type99', '<p>BEFORE</p><ul class="d-none"></ul><table class="d-none"><tbody><tr><td></td></tr></tbody></table><p>AFTER</p>'));
    expect(kinds(data(r).blocks)).toEqual(['text', 'text']);
  });

  it('a hidden item with an image still keeps the original', () => {
    expect(convert(section('type01', '<ol><li class="d-none"><img src="https://example.com/a.png" alt=""></li><li>ALL ITEM</li></ol>')).page.sections[0]!.type).toBe('fallback');
  });
});

describe('blocks 4th review: screen-dependent cells and rows inside a table', () => {
  it.each([
    ['a hidden empty cell', '<table><tbody><tr><td class="d-none"></td><td>ALL ITEM</td></tr></tbody></table>'],
    ['a hidden empty row', '<table><tbody><tr class="d-none"><td></td></tr><tr><td>ALL ITEM</td></tr></tbody></table>'],
    ['a PC-only cell', '<table><tbody><tr><td class="d-none d-lg-table-cell">PC</td><td>ALL ITEM</td></tr></tbody></table>'],
  ])('%s would change the table grid, so the original is kept', (_, table) => {
    expect(convert(section('type01', table)).page.sections[0]!.type).toBe('fallback');
  });

  it('the same rule protects the type26 table preset', () => {
    const r = convertTyped('<section class="cms type26"><div class="cms-inner"><div class="cms-table-wrap"><table class="cms-table"><tbody><tr><td class="d-none"></td><td>ALL ITEM</td></tr></tbody></table></div></div></section>');
    expect(r.page.sections[0]!.type).toBe('fallback');
  });

  it('a whole table shown on one screen is still fine', () => {
    const r = convert(section('type99', '<p>글</p><table class="d-none d-lg-table"><tbody><tr><td>PC 표</td></tr></tbody></table>'));
    expect(r.page.sections[0]!.type).toBe('blocks');
    expect(r.html).toContain('common-display-pc');
  });
});

describe('unread plain list items', () => {
  it('an empty plain list hidden on every screen may still be left out', () => {
    const r = convert(section('type99', '<p>BEFORE</p><ul class="d-none"><li></li></ul><p>AFTER</p>'));
    expect(r.page.sections[0]!.type).toBe('blocks');
  });

  it('an empty visible bullet that a type does not read keeps the original (typed parser)', () => {
    const r = convertTyped('<section class="cms type23"><div class="cms-inner"><div class="cms-description-box text-center"><p class="cms-description">설명</p><ul><li></li></ul></div></div></section>');
    expect(r.page.sections[0]!.type).toBe('fallback');
  });
});

describe('unread plain list items are checked for every type, not only finish() users', () => {
  it.each([
    ['type01', '<section class="cms type01"><div class="cms-inner"><p class="cms-thin-title">제목</p><p>설명</p><ul><li></li></ul></div></section>'],
    ['type00', '<section class="cms type00"><div class="cms-inner"><div class="cms-header"><p class="cms-page-title">페이지</p></div><ul><li></li></ul></div></section>'],
  ])('%s with a visible empty bullet keeps it (typed parser falls back)', (_, html) => {
    const r = convertTyped(html);
    expect(r.page.sections[0]!.type).toBe('fallback');
  });
});
