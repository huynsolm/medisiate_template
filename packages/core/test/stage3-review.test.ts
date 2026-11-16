import { describe, expect, it } from 'vitest';
import { serialize } from '../src/html/h.ts';
import { createRenderContext } from '../src/render/context.ts';
import { defaultRegistry } from '../src/types/index.ts';
import type { FieldSpec } from '../src/types/definition.ts';
import { check, convert, original } from './support/original.ts';

// 3단계(P2·P3) 검수 지적 사항 (docs/review-stage3.md)에 대한 회귀 테스트
// 3단계 P2·P3 + 4단계 P4·P5 (같은 일반 검사를 적용한다)
const STAGE3 = ['type07', 'type09', 'type10', 'type02', 'type03', 'type26', 'type11', 'type04', 'type25', 'type15', 'type17', 'type18', 'type23', 'type13', 'type06', 'type16', 'type14', 'type19', 'type24', 'type22', 'type20', 'type21', 'type12', 'type05', 'type27'];
const ctx = () => createRenderContext({ mode: 'preset' });

/** 편집기에서 모든 글 칸을 채운 데이터. 글마다 서로 다른 값을 넣고 그 값 목록을 돌려준다. */
function filled(fields: FieldSpec[], texts: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.kind === 'text' || f.kind === 'richText' || f.kind === 'textarea') {
      if (f.key === 'width') continue; // 열 너비는 글이 아니다
      const value = `값${texts.length + 1}끝`;
      texts.push(value);
      out[f.key] = value;
    } else if (f.kind === 'repeat') {
      out[f.key] = [filled(f.fields ?? [], texts), filled(f.fields ?? [], texts)];
    }
  }
  return out;
}

function render(id: string, data: unknown) {
  const def = defaultRegistry.get(id)!;
  const parsed = def.schema.safeParse(data);
  return { parsed, html: parsed.success ? serialize(def.render({ id: 's1', type: id, variant: 'default', modifiers: {}, data: parsed.data }, ctx())) : '' };
}

describe('every editable text reaches the output (review: 문단 출력 누락)', () => {
  it.each(STAGE3)('%s', (id) => {
    const texts: string[] = [];
    const data = filled(defaultRegistry.get(id)!.fields, texts);
    const { parsed, html } = render(id, data);
    expect(parsed.success).toBe(true);
    for (const t of texts) expect(html, `${t} 누락`).toContain(t);
  });

  it('type15 keeps both the bullets and the paragraph from the original', () => {
    const both = original('type15').replace('</ul>', '</ul><p class="cms-description">함께 있는 문단</p>');
    const result = convert(both);
    expect(result.page.sections[0]!.type).toBe('type15');
    expect(result.html).toContain('함께 있는 문단');
    expect(result.html).toContain('글머리 1');
  });
});

describe('type26 merged cells keep their exact values (review: 병합값 변경)', () => {
  const t26 = (cell: string) => original('type26').replace('<td>내용 1</td>', cell);

  it.each([
    ['colspan="25"', 'colspan="25"'],
    ['colspan="1000"', 'colspan="1000"'],
    ['rowspan="0"', 'rowspan="0"'],
    ['rowspan="40"', 'rowspan="40"'],
  ])('keeps %s', (attrs, expected) => {
    const result = convert(t26(`<td ${attrs}>내용 1</td>`));
    expect(result.page.sections[0]!.type).toBe('type26');
    expect(result.html).toContain(`<td ${expected}>내용 1</td>`);
  });

  it('treats colspan="1" as the default', () => {
    expect(convert(t26('<td colspan="1">내용 1</td>')).html).toContain('<td>내용 1</td>');
  });

  it.each(['colspan="0"', 'colspan="2000"', 'colspan="2x"', 'rowspan="-1"', 'rowspan="99999"', 'colspan=""'])(
    'falls back instead of changing %s', (attrs) => {
      const result = convert(t26(`<td ${attrs}>내용 1</td>`));
      expect(result.page.sections[0]!.type).toBe('fallback');
      expect(result.html).toContain(attrs.replace('=""', ''));
    },
  );
});

describe('type26 cells keep paragraph boundaries (review: 셀 내부 문단·목록 경계 소실)', () => {
  const t26 = (cell: string) => original('type26').replace('<td>내용 1</td>', cell);

  it('keeps paragraphs in a cell as line breaks', () => {
    const { result, data } = check('type26', t26('<td><p>첫 문단</p><p>둘째 문단</p></td>'));
    expect((data.body as Array<{ cells: Array<{ text: string }> }>)[0]!.cells[1]!.text).toBe('첫 문단<br>둘째 문단');
    expect(result.html).toContain('<td>첫 문단<br>둘째 문단</td>');
  });

  it('keeps loose text before a paragraph as its own line (shared rule since stage 4 review)', () => {
    const { result } = check('type26', t26('<td>앞 글<p>문단</p></td>'));
    expect(result.html).toContain('<td>앞 글<br>문단</td>');
  });

  it('keeps a single paragraph cell as plain text', () => {
    const { data } = check('type26', t26('<td><p>한 문단</p></td>'));
    expect((data.body as Array<{ cells: Array<{ text: string }> }>)[0]!.cells[1]!.text).toBe('한 문단');
  });

  it.each([
    '<td><ul><li>a</li><li>b</li></ul></td>',
    '<td><p>문단</p><ol><li>a</li></ol></td>',
    '<td><table><tr><td>안쪽 표</td></tr></table></td>',
  ])('falls back for %s', (cell) => {
    const result = convert(t26(cell));
    expect(result.page.sections[0]!.type).toBe('fallback');
  });
});

describe('editor: clearing a field never breaks the section (review: 빈 문자열 편집 오류)', () => {
  // 편집기는 비운 칸을 데이터에서 지운다 (apps/web state.ts setIn: undefined → 키 삭제)
  it('type26 cleared column width renders as auto', () => {
    const { parsed, html } = render('type26', { colWidths: [{}, { width: '' }, { width: '120px' }], head: [], body: [] });
    expect(parsed.success).toBe(true);
    expect(html).toContain('<col style="width: auto;"><col style="width: auto;"><col style="width: 120px;">');
  });

  it.each([undefined, '', 1, '1', '3'])('type26 merge number %s is accepted', (value) => {
    const { parsed } = render('type26', { body: [{ cells: [{ text: 'x', colspan: value, rowspan: value }] }] });
    expect(parsed.success).toBe(true);
  });

  it.each(STAGE3)('%s: every repeat item with all text cleared still renders', (id) => {
    const def = defaultRegistry.get(id)!;
    const data = structuredClone(def.defaults) as Record<string, unknown>;
    // 모든 반복 항목을 빈 객체로 바꾼다 (항목 안의 칸을 모두 비운 상태)
    const clear = (spec: FieldSpec[], value: Record<string, unknown>) => {
      for (const f of spec) {
        if (f.kind !== 'repeat') continue;
        value[f.key] = [{}];
      }
    };
    clear(def.fields, data);
    const { parsed } = render(id, data);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });
});

// ---- 재검수 (86e0cec) 지적: R-I-1, R-I-2 ----

describe('type26 cells inside other block wrappers (re-review R-I-1)', () => {
  const t26 = (cell: string) => original('type26').replace('<td>내용 1</td>', cell);

  it.each(['section', 'article', 'aside', 'header', 'footer', 'main', 'nav', 'address'])('keeps paragraphs inside <%s> as line breaks', (tag) => {
    const { result, data } = check('type26', t26(`<td><${tag}><p>FIRST</p><p>SECOND</p></${tag}></td>`));
    expect((data.body as Array<{ cells: Array<{ text: string }> }>)[0]!.cells[1]!.text).toBe('FIRST<br>SECOND');
    expect(result.html).toContain('<td>FIRST<br>SECOND</td>');
  });

  it.each([
    '<td><span><p>FIRST</p><p>SECOND</p></span></td>',
    '<td><details><summary>S</summary><p>D</p></details></td>',
    '<td><p>FIRST</p><hr><p>SECOND</p></td>',
    '<td><fieldset><p>FIRST</p></fieldset></td>',
  ])('falls back when the boundary cannot be kept: %s', (cell) => {
    const result = convert(t26(cell));
    expect(result.page.sections[0]!.type).toBe('fallback');
  });
});

describe('number fields accept only numbers and digit strings (re-review R-I-2)', () => {
  const page = (type: string, data: unknown) => ({
    version: 1 as const,
    theme: { primary: '#164aa0', source: 'default' as const },
    sections: [
      { id: 'good', type: 'type11', variant: 'default', modifiers: {}, data: { heading: 'KEEP_VISIBLE', items: [{ text: 'GOOD' }] } },
      { id: 'bad', type, variant: 'default', modifiers: {}, data },
    ],
    diagnostics: [],
    meta: { coreVersion: 'x', hostCss: { sha256: 'x', savedAt: 'y' } },
  });
  const bad: Array<[string, unknown]> = [
    ['type26', { body: [{ cells: [{ text: 'X', rowspan: { toString: 'x' } }] }] }],
    ['type26', { body: [{ cells: [{ text: 'X', rowspan: false }] }] }],
    ['type26', { body: [{ cells: [{ text: 'X', colspan: [2] }] }] }],
    ['type26', { body: [{ cells: [{ text: 'X', colspan: true }] }] }],
    ['type26', { body: [{ cells: [{ text: 'X', colspan: '0x10' }] }] }],
    ['type26', { colWidths: [{ width: 30 }] }],
    ['type09', { perRow: [2] }],
    ['type09', { perRow: { toString: 'x' } }],
    ['type25', { perRow: [3] }],
    ['type25', { perRow: true }],
  ];

  it.each(bad)('%s %j is rejected as INVALID_DATA and the other sections still render', async (type, data) => {
    const { renderPage } = await import('../src/page/render-page.ts');
    const out = renderPage(page(type, data), { registry: defaultRegistry });
    expect(out.diagnostics.map((d) => d.code)).toContain('INVALID_DATA');
    expect(out.html).toContain('KEEP_VISIBLE');
  });

  it.each([2, '2', ' 2 '])('type09 perRow %j is accepted', (value) => {
    expect(defaultRegistry.get('type09')!.schema.safeParse({ perRow: value }).success).toBe(true);
  });

  it('a schema that throws only breaks its own section', async () => {
    const { renderPage } = await import('../src/page/render-page.ts');
    const { TypeRegistry } = await import('../src/types/definition.ts');
    const { z } = await import('zod');
    const registry = new TypeRegistry(defaultRegistry.list());
    registry.register({ ...defaultRegistry.get('type11')!, id: 'boom', schema: z.preprocess(() => { throw new Error('boom'); }, z.object({})) });
    const out = renderPage(page('boom', {}), { registry });
    expect(out.diagnostics.map((d) => d.code)).toContain('INVALID_DATA');
    expect(out.html).toContain('KEEP_VISIBLE');
  });
});

// ---- 4단계 검수 (a378da6) 지적: I-2 글 요소 안의 문단·목록 경계 (P2·P3·P4 전체) ----

describe('text elements keep paragraph boundaries or fall back (stage 4 review I-2)', () => {
  const first = /<p class="cms-description">([^<]*)<\/p>/u;
  const withBlock = (id: string, inner: string) => original(id).replace(first, `<div class="cms-description">${inner}</div>`);

  it.each(STAGE3.filter((id) => first.test(original(id))))('%s: paragraphs inside a text element become line breaks', (id) => {
    const result = convert(withBlock(id, '<p>FIRST</p><p>SECOND</p>'));
    const type = result.page.sections[0]!.type;
    if (type !== 'fallback') expect(result.html).toMatch(/FIRST<br>SECOND/u);
    expect(result.html).not.toMatch(/FIRSTSECOND/u);
  });

  it.each(STAGE3.filter((id) => first.test(original(id))))('%s: a list inside a text element falls back', (id) => {
    const result = convert(withBlock(id, 'FIRST<ul><li>SECOND</li><li>THIRD</li></ul>'));
    expect(result.page.sections[0]!.type).toBe('fallback');
  });

  it('type06 bullet with two paragraphs keeps the boundary', () => {
    const body = original('type06').replace('<li class="cms-list-item cms-description">세부 내용 1</li>', '<li class="cms-list-item cms-description"><p>FIRST</p><p>SECOND</p></li>');
    const result = convert(body);
    expect(result.page.sections[0]!.type).toBe('type06');
    expect(result.html).toContain('<span class="mig-desc">FIRST<br>SECOND</span>');
  });

  it('type06 bullet with a nested list falls back', () => {
    const body = original('type06').replace('<li class="cms-list-item cms-description">세부 내용 1</li>', '<li class="cms-list-item cms-description">FIRST<ul><li>SECOND</li></ul></li>');
    expect(convert(body).page.sections[0]!.type).toBe('fallback');
  });

  it('original markup without nested blocks is unchanged (no new line breaks)', () => {
    for (const id of STAGE3) expect(convert(original(id)).html, id).not.toContain('<br>');
  });
});

// ---- 4단계 재검수 (da153b1) 지적: R-I-1 글 클래스가 없는 글 요소도 같은 구조 검사 ----

describe('every text container gets the structure check, with or without a text class (stage 4 re-review R-I-1)', () => {
  const card = (bullet: string) => `<section class="cms type06"><div class="cms-inner"><ul class="cms-column-list"><li class="cms-list-item"><div class="cms-inner-box"><div class="cms-description-box"><p class="cms-description">CARD</p><ul class="cms-bullet-list">${bullet}</ul></div></div></li></ul></div></section>`;

  it.each([
    ['A nested list', '<li class="cms-list-item">FIRST<ul><li>SECOND</li><li>THIRD</li></ul></li>'],
    ['B block hidden in span', '<li class="cms-list-item"><span><section><p>FIRST</p><p>SECOND</p></section></span></li>'],
    ['A with the text class', '<li class="cms-list-item cms-description">FIRST<ul><li>SECOND</li></ul></li>'],
    ['B with the text class', '<li class="cms-list-item cms-description"><span><section><p>FIRST</p><p>SECOND</p></section></span></li>'],
  ])('type06 bullet: %s falls back', (_label, bullet) => {
    const result = convert(card(bullet));
    expect(result.page.sections[0]!.type).toBe('fallback');
    expect(result.html).not.toMatch(/FIRSTSECOND/u);
  });

  it('type06 bullet without the class still keeps plain paragraphs as lines', () => {
    const result = convert(card('<li class="cms-list-item"><p>FIRST</p><p>SECOND</p></li>'));
    expect(result.page.sections[0]!.type).toBe('type06');
    expect(result.html).toContain('FIRST<br>SECOND');
  });

  const first = /<p class="cms-description">([^<]*)<\/p>/u;
  it.each(STAGE3.filter((id) => first.test(original(id))))('%s: a block hidden in an inline element falls back', (id) => {
    const result = convert(original(id).replace(first, '<p class="cms-description"><span><section><p>FIRST</p><p>SECOND</p></section></span></p>'.replace('<p class="cms-description">', '<div class="cms-description">').replace(/<\/p>$/u, '</div>')));
    expect(result.page.sections[0]!.type).toBe('fallback');
  });
});

// ---- 4단계 3차 재검수 (75ffd4d) 지적: 검사 범위 = 파서가 실제로 글로 읽은 요소 ----

describe('the structure check covers exactly what the parser reads as text (stage 4 re-review, R-I-1 remainder)', () => {
  const card = (bullet: string) => `<section class="cms type06"><div class="cms-inner"><ul class="cms-column-list"><li class="cms-list-item"><div class="cms-inner-box"><div class="cms-description-box"><p class="cms-description">CARD</p><ul class="cms-bullet-list">${bullet}</ul></div></div></li></ul></div></section>`;

  it.each([
    '<p class="cms-description">FIRST</p>',
    '<p>FIRST</p>',
    '<span class="cms-description">FIRST</span>',
    '<span class="cms-extra">FIRST</span>',
    '<strong>FIRST</strong>',
  ])('bullet "%s" + nested list falls back', (head) => {
    const result = convert(card(`<li class="cms-list-item">${head}<ul><li>SECOND</li><li>THIRD</li></ul></li>`));
    expect(result.page.sections[0]!.type).toBe('fallback');
    expect(result.html).not.toMatch(/SECONDTHIRD/u);
  });

  it('a bullet with a class-bearing paragraph pair still converts as lines', () => {
    const result = convert(card('<li class="cms-list-item"><p class="cms-description">FIRST</p><p class="cms-description">SECOND</p></li>'));
    expect(result.page.sections[0]!.type).toBe('type06');
    expect(result.html).toContain('FIRST<br>SECOND');
  });
});

describe('stage 3/4 parsers read text only through richFrom (so the structure check sees it)', () => {
  it.each([...STAGE3, 'check-rows'])('%s', async (id) => {
    const { readFileSync } = await import('node:fs');
    const file = id === 'check-rows' ? 'check-rows' : id;
    const source = readFileSync(new URL(`../src/types/${file}.ts`, import.meta.url), 'utf8');
    // type13·14는 check-rows.ts에 구현이 있다
    if (/checkRowsType\(/u.test(source) && file !== 'check-rows') return;
    expect(source).not.toMatch(/\b(plainText|textContent|innerHtml|blockText|nodesHtml)\b/u);
  });
});

// ---- 4단계 P5 검수 (d3ae49f) 지적 I-1: 한 원본 글을 두 필드로 읽어 두 번 출력 ----

describe('one original text is never output twice (stage 4 P5 review I-1)', () => {
  const count = (html: string, text: string) => html.split(text).length - 1;

  it('A: type22 title only inside the short list', () => {
    const result = convert('<section class="cms type22"><div class="cms-inner"><ul class="cms-img-list"><li class="cms-list-item"><div class="cms-visual-text"><ul class="list-unstyled"><li><p class="cms-title">FIRST</p></li></ul></div></li></ul></div></section>');
    expect(result.page.sections[0]!.type).toBe('type22');
    expect(count(result.html, 'FIRST')).toBe(1);
  });

  it('B: type24 title class inside the description', () => {
    const result = convert('<section class="cms type24"><div class="cms-inner"><ol class="cms-ordered-list"><li class="cms-list-item"><div class="cms-description-box"><div class="cms-description"><span class="cms-title">FIRST</span></div></div></li></ol></div></section>');
    expect(result.page.sections[0]!.type).toBe('type24');
    expect(count(result.html, 'FIRST')).toBe(1);
  });

  const first = /<p class="cms-description">([^<]*)<\/p>/u;
  it.each(STAGE3.filter((id) => first.test(original(id))).flatMap((id) => ['cms-title', 'cms-eyebrow', 'cms-description'].map((cls) => [id, cls])))(
    '%s: a %s nested inside a description is output at most once',
    (id, cls) => {
      // 머리글 뒤 첫 항목의 자기 제목·작은 글을 지워, "첫 번째 해당 클래스"가 설명 안의 것을 집게 만든다
      const body = original(id);
      const after = body.indexOf('</div>', body.indexOf('cms-header'));
      const rest = body.slice(after).replace(/<p class="cms-(title|eyebrow)">[^<]*<\/p>/u, '').replace(first, `<div class="cms-description"><span class="${cls}">DUPCHK</span></div>`);
      const result = convert(body.slice(0, after) + rest);
      if (result.page.sections[0]!.type !== 'fallback') expect(count(result.html, 'DUPCHK')).toBeLessThanOrEqual(1);
    },
  );
});

// ---- 4단계 P5 재검수 (be1b3cc) 지적 R-I-1: 빈 요소를 읽은 것은 중복이 아니다 ----

describe('reading an empty element is not a duplicate (stage 4 P5 re-review R-I-1)', () => {
  const t18 = (desc: string) => `<section class="cms type18"><div class="cms-inner"><ol class="cms-img-list"><li class="cms-list-item"><div class="cms-visual-text">${desc}</div></li></ol></div></section>`;

  it.each(['<span class="cms-title"></span>', '<span class="cms-title"> </span>', '<span class="cms-title"><br></span>'])('empty title %s inside the description converts normally', (empty) => {
    const result = convert(t18(`<p class="cms-description">${empty}BODY</p>`));
    expect(result.page.sections[0]!.type).toBe('type18');
    expect(result.html.split('BODY').length - 1).toBe(1);
  });

  it('a non-empty title inside the description still falls back', () => {
    expect(convert(t18('<p class="cms-description"><span class="cms-title">FIRST</span>BODY</p>')).page.sections[0]!.type).toBe('fallback');
  });
});
