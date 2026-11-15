import { describe, expect, it } from 'vitest';
import { check, convert, follow, original, snapshot } from './support/original.ts';

// 3단계 P3 타입: fixtures/original/typeNN.html(원본 CMS 도구와 같은 마크업) → 호스트 프리셋. type27은 원본 구조 자료가 없어 제외.
const pair = { pc: { src: '/images/cms-sample.svg', alt: '', kind: 'relative' }, mo: { src: '/images/cms-sample-m.svg', alt: '', kind: 'relative' } };
const header = { eyebrow: '작은 제목', heading: '제목을 입력해 보세요' };

async function snapshots(id: string, section: unknown, html: string) {
  await expect(JSON.stringify(section, null, 2) + '\n').toMatchFileSnapshot(snapshot(`${id}/original.expected.json`));
  await expect(html).toMatchFileSnapshot(snapshot(`${id}/original.expected.html`));
}

describe('type26 · 설명 + 표', () => {
  it('parses the original table with column widths and header cells', async () => {
    const { result, section, data } = check('type26');
    const cell = (text: string, th = false) => ({ text, th });
    expect(data).toEqual({
      ...header,
      desc: '표 위에 놓을 설명을 입력해 보세요.',
      colWidths: [{ width: '30%' }, { width: 'auto' }, { width: 'auto' }],
      head: [{ cells: [cell('구분', true), cell('항목 A', true), cell('항목 B', true)] }],
      body: [{ cells: [cell('행 1', true), cell('내용 1'), cell('내용 2')] }, { cells: [cell('행 2', true), cell('내용 3'), cell('내용 4')] }],
    });
    // the column widths become data, so they are not reported as dropped inline styles
    expect(result.page.diagnostics.some((d) => d.code === 'INLINE_STYLE_DROPPED')).toBe(false);
    expect(follow(result.html, ['section.type-26', 'div.mig-body', 'div.mig-table-wrap', 'p.mig-desc'])).toHaveLength(1);
    expect(follow(result.html, ['div.mig-table-wrap', 'div.table-responsive', 'table.mig-table'])).toHaveLength(1);
    expect(result.html).toContain('<col style="width: 30%;">');
    await snapshots('type26', section, result.html);
  });

  it('rejects a column width that could inject css', async () => {
    const { type26 } = await import('../src/types/type26.ts');
    expect(type26.schema.safeParse({ colWidths: [{ width: '30%; position: fixed' }] }).success).toBe(false);
    expect(type26.schema.safeParse({ colWidths: [{ width: 'auto' }, { width: '120px' }] }).success).toBe(true);
  });

  it('keeps merged cells', () => {
    const body = original('type26')
      .replace('<th>항목 A</th>\n            <th>항목 B</th>', '<th colspan="2">항목 A·B</th>')
      .replace('<td>내용 3</td>\n            <td>내용 4</td>', '<td colspan="2" rowspan="1">내용 3·4</td>');
    const { result, data } = check('type26', body);
    expect((data.head as Array<{ cells: unknown[] }>)[0]!.cells[1]).toEqual({ text: '항목 A·B', th: true, colspan: 2 });
    expect(result.html).toContain('<th colspan="2">항목 A·B</th>');
    expect(result.html).toContain('<td colspan="2">내용 3·4</td>');
  });
});

describe('type11 · 어두운 바탕의 글머리 목록', () => {
  it('parses the original markup and keeps the background and white text', async () => {
    const { result, section, data } = check('type11');
    expect(data).toEqual({ ...header, items: [1, 2, 3].map((n) => ({ text: `항목 ${n} 내용을 입력해 보세요.` })) });
    expect(section.modifiers.background?.token).toBe('bg-image-2');
    expect(section.modifiers.textWhite).toBe(true);
    expect(follow(result.html, ['section.type-11', 'div.mig-body', 'ul.mig-list', 'li.mig-item', 'p.mig-desc'])).toHaveLength(3);
    await snapshots('type11', section, result.html);
  });
});

describe('type04 · 이미지와 글 목록 (항목 사이 화살표)', () => {
  it('parses the original markup', async () => {
    const { result, section, data } = check('type04');
    expect(data).toEqual({ ...header, items: [1, 2, 3].map((n) => ({ num: `0${n}`, title: `항목 ${n} 제목`, desc: '설명을 입력해 보세요.', image: pair })) });
    expect(follow(result.html, ['section.type-04', 'div.mig-body', 'ul.mig-list', 'li.mig-item', 'div.mig-content', 'div.mig-visual'])).toHaveLength(6);
    expect(follow(result.html, ['li.mig-item', 'div.mig-content', 'div.mig-text-wrap', 'strong.mig-title'])).toHaveLength(3);
    await snapshots('type04', section, result.html);
  });
});

describe('type25 · 이미지 + 제목·글 목록', () => {
  it('parses the original markup (4 per row) and reports that the host shows 3', async () => {
    const { result, section, data } = check('type25');
    expect(data).toEqual({ ...header, perRow: 4, items: [1, 2, 3, 4].map((n) => ({ title: `칸 ${n} 제목`, desc: '설명을 입력해 보세요.', image: pair })) });
    expect(result.page.diagnostics.some((d) => d.code === 'PRESET_LAYOUT_FIXED')).toBe(true);
    expect(follow(result.html, ['section.type-25', 'div.mig-body', 'ul.mig-list', 'li.mig-item', 'div.mig-visual'])).toHaveLength(8);
    expect(follow(result.html, ['li.mig-item', 'div.mig-text-wrap', 'strong.mig-title'])).toHaveLength(4);
    await snapshots('type25', section, result.html);
  });

  it('3 per row matches the host and is not reported', () => {
    const { result, data } = check('type25', original('type25').replaceAll('col-lg-3', 'col-lg-4'));
    expect(data.perRow).toBe(3);
    expect(result.page.diagnostics.some((d) => d.code === 'PRESET_LAYOUT_FIXED')).toBe(false);
  });
});

describe('type15 · 이미지 3칸 목록 (글머리 또는 문단)', () => {
  it('parses bullets or a paragraph per column', async () => {
    const { result, section, data } = check('type15');
    expect(data).toEqual({
      ...header,
      items: [
        { title: '칸 1', image: pair, subitems: [{ text: '글머리 1' }, { text: '글머리 2' }] },
        { title: '칸 2', desc: '글머리가 없으면 이 문단이 보여요.', image: pair, subitems: [] },
        { title: '칸 3', image: pair, subitems: [{ text: '글머리 1' }] },
      ],
    });
    expect(follow(result.html, ['section.type-15', 'div.mig-body', 'div.mig-content', 'ul.mig-list', 'li.mig-item'])).toHaveLength(3);
    // nested bullets are type-dot so the host's 3-column grid (.mig-list:first-of-type:not(.type-dot)) never applies to them
    expect(follow(result.html, ['li.mig-item', 'ul.mig-list.type-dot', 'li.mig-item'])).toHaveLength(3);
    await snapshots('type15', section, result.html);
  });
});

describe('type17 · 제목 + 설명 행 목록', () => {
  it('parses the original markup', async () => {
    const { result, section, data } = check('type17');
    expect(data).toEqual({ ...header, titleWidth: 'auto', items: [1, 2, 3, 4].map((n) => ({ title: `제목 ${n}`, desc: '설명을 입력해 보세요.' })) });
    expect(follow(result.html, ['section.type-17', 'div.mig-body', 'ul.mig-list', 'li.mig-item', 'strong.mig-title'])).toHaveLength(4);
    expect(result.page.diagnostics.some((d) => d.code === 'PRESET_LAYOUT_FIXED')).toBe(false);
    await snapshots('type17', section, result.html);
  });

  it('keeps the wide title column choice and reports it', () => {
    const { result, data } = check('type17', original('type17').replaceAll('cms-title col-auto', 'cms-title col-2'));
    expect(data.titleWidth).toBe('wide');
    expect(result.page.diagnostics.some((d) => d.code === 'PRESET_LAYOUT_FIXED')).toBe(true);
  });
});

describe('P3 safety', () => {
  it.each(['type26', 'type11', 'type04', 'type25', 'type15', 'type17'])('%s falls back instead of dropping an unexpected image or paragraph', (id) => {
    for (const extra of ['<img src="https://cdn.example.com/stray.jpg" alt=""/>', '<p>추가 문단</p>']) {
      const result = convert(original(id).replace('<p class="cms-title">', `${extra}<p class="cms-title">`));
      expect(result.page.sections[0]!.type).toBe('fallback');
    }
  });

  it.each(['type26', 'type11', 'type04', 'type25', 'type15', 'type17'])('%s lists never show browser bullets', (id) => {
    for (const [, attrs] of convert(original(id)).html.matchAll(/<ul class="mig-list[^"]*"([^>]*)>/gu)) {
      expect(attrs).toContain('list-style: none; padding-left: 0; margin: 0;');
    }
  });
});
