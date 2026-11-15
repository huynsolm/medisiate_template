import { describe, expect, it } from 'vitest';
import { serialize } from '../src/html/h.ts';
import { createRenderContext } from '../src/render/context.ts';
import { defaultRegistry } from '../src/types/index.ts';
import type { FieldSpec } from '../src/types/definition.ts';
import { check, convert, original } from './support/original.ts';

// 3단계(P2·P3) 검수 지적 사항 (docs/review-stage3.md)에 대한 회귀 테스트
const STAGE3 = ['type07', 'type09', 'type10', 'type02', 'type03', 'type26', 'type11', 'type04', 'type25', 'type15', 'type17'];
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

  it('keeps a single paragraph cell as plain text', () => {
    const { data } = check('type26', t26('<td><p>한 문단</p></td>'));
    expect((data.body as Array<{ cells: Array<{ text: string }> }>)[0]!.cells[1]!.text).toBe('한 문단');
  });

  it.each([
    '<td><ul><li>a</li><li>b</li></ul></td>',
    '<td><p>문단</p><ol><li>a</li></ol></td>',
    '<td>앞 글<p>문단</p></td>',
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
