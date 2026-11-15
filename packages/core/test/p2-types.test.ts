import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseFragment } from 'parse5';
import { describe, expect, it } from 'vitest';
import { convertDocument } from '../src/convert/convert-document.ts';
import { defaultRegistry } from '../src/types/index.ts';

// 3단계 P2 타입: fixtures/original/typeNN.html(원본 CMS 도구와 같은 마크업)을 기준으로 parse → 호스트 프리셋 render.
const root = path.resolve(import.meta.dirname, '../../..');
const original = (id: string) => readFileSync(path.join(root, 'fixtures/original', `${id}.html`), 'utf8');
const opts = { registry: defaultRegistry, theme: { primary: '#164aa0', source: 'default' as const }, coreVersion: '0', hostCss: { sha256: 'x', savedAt: 'y' } };
const convert = (body: string) => convertDocument(`<div class="cms-container">${body}</div>`, 'p2.html', opts);
const snapshot = (rel: string) => path.join(root, 'fixtures/types', rel);

type P5 = { tagName?: string; attrs?: Array<{ name: string; value: string }>; childNodes?: P5[] };
const fragment = (html: string) => parseFragment(html) as unknown as P5;
const cls = (n: P5) => (n.attrs?.find((a) => a.name === 'class')?.value ?? '').split(/\s+/u);
const kids = (n: P5) => (n.childNodes ?? []).filter((c) => c.tagName);
/** Follow a child-combinator path like ['section.type-07', 'div.mig-body', 'div.mig-content', 'div.mig-visual'] from the top. */
function follow(html: string, steps: string[]): P5[] {
  let level = kids(fragment(html)).flatMap((n) => [n, ...descend(n)]);
  for (const [i, step] of steps.entries()) {
    const [tag, ...classes] = step.split('.');
    const matches = level.filter((n) => n.tagName === tag && classes.every((c) => cls(n).includes(c)));
    if (i === steps.length - 1) return matches;
    level = matches.flatMap(kids);
  }
  return [];
}
function descend(n: P5): P5[] {
  return kids(n).flatMap((c) => [c, ...descend(c)]);
}
function imgSrcs(html: string): string[] {
  return follow(html, ['img']).map((n) => n.attrs?.find((a) => a.name === 'src')?.value ?? '').sort();
}

function check(id: string, body = original(id)) {
  const result = convert(body);
  const section = result.page.sections[0]!;
  expect(section.type).toBe(id);                                     // not a fallback
  expect(result.page.diagnostics.filter((d) => d.level !== 'info' && d.code !== 'IMAGE_RELATIVE')).toEqual([]);
  expect(imgSrcs(result.html)).toEqual(imgSrcs(body));               // every image kept
  return { result, section, data: section.data as Record<string, unknown> };
}

describe('type07 · 이미지 + 글머리 목록', () => {
  it('parses the original markup', async () => {
    const { result, section, data } = check('type07');
    expect(data).toEqual({
      eyebrow: '작은 제목', heading: '제목을 입력해 보세요',
      image: { pc: { src: '/images/cms-sample.svg', alt: '', kind: 'relative' }, mo: { src: '/images/cms-sample-m.svg', alt: '', kind: 'relative' } },
      items: [{ text: '내용 1' }, { text: '내용 2' }, { text: '내용 3' }],
    });
    expect(section.modifiers.background?.token).toBe('bg-color-3');
    // visual must be a direct child of .mig-content (host :has(> .mig-visual) grid)
    expect(follow(result.html, ['section.mig-section.type-07', 'div.mig-body', 'div.mig-content', 'div.mig-visual'])).toHaveLength(2);
    expect(follow(result.html, ['section.type-07', 'div.mig-body', 'div.mig-content', 'ul.mig-list', 'li.mig-item'])).toHaveLength(3);
    await expect(JSON.stringify(section, null, 2) + '\n').toMatchFileSnapshot(snapshot('type07/original.expected.json'));
    await expect(result.html).toMatchFileSnapshot(snapshot('type07/original.expected.html'));
  });
});

describe('type09 · 체크 표시 목록', () => {
  it('parses the original markup', async () => {
    const { result, section, data } = check('type09');
    expect(data).toEqual({ eyebrow: '작은 제목', heading: '제목을 입력해 보세요', perRow: 2, items: [1, 2, 3, 4].map((n) => ({ text: `항목 ${n}` })) });
    const items = follow(result.html, ['section.type-09', 'div.mig-body', 'ul.mig-list', 'li.mig-item']);
    expect(items).toHaveLength(4);
    expect(follow(result.html, ['li.mig-item', 'div.mig-content', 'p.mig-desc'])).toHaveLength(4);
    expect(follow(result.html, ['li.mig-item', 'div.mig-content', 'span.mig-icon', 'svg'])).toHaveLength(4);
    await expect(JSON.stringify(section, null, 2) + '\n').toMatchFileSnapshot(snapshot('type09/original.expected.json'));
    await expect(result.html).toMatchFileSnapshot(snapshot('type09/original.expected.html'));
  });

  it.each([['col-12', 1], ['col-6', 2], ['col-4', 3]] as const)('keeps the original per-row choice %s', (col, perRow) => {
    const { result, data } = check('type09', original('type09').replaceAll('col-6', col));
    expect(data.perRow).toBe(perRow);
    // the host preset is always 3 per row on PC; any other choice is reported, never silently changed
    expect(result.page.diagnostics.some((d) => d.code === 'PRESET_LAYOUT_FIXED')).toBe(perRow !== 3);
  });
});

describe('type10 · 큰 이미지 + 번호 목록', () => {
  it('parses the original markup including the nested list', async () => {
    const { result, section, data } = check('type10');
    expect(data.items).toEqual([
      { num: '01', title: '핵심 단어', subtitle: '소제목', desc: '설명을 입력해 보세요.', subitems: [{ text: '목록 1' }, { text: '목록 2' }] },
      { num: '02', title: '핵심 단어', subtitle: '소제목', desc: '설명을 입력해 보세요.', subitems: [] },
      { num: '03', title: '핵심 단어', subtitle: '소제목', desc: '설명을 입력해 보세요.', subitems: [] },
    ]);
    expect(follow(result.html, ['section.type-10', 'div.mig-body', 'div.mig-visual'])).toHaveLength(2);
    const cards = follow(result.html, ['section.type-10', 'div.mig-body', 'div.mig-content', 'ul.mig-list', 'li.mig-item']);
    expect(cards).toHaveLength(3);
    expect(follow(result.html, ['li.mig-item', 'ul.mig-list', 'li.mig-item', 'span.mig-desc'])).toHaveLength(2);
    expect(result.html).not.toContain('<svg');                        // decorative hexagon is not carried over
    await expect(JSON.stringify(section, null, 2) + '\n').toMatchFileSnapshot(snapshot('type10/original.expected.json'));
    await expect(result.html).toMatchFileSnapshot(snapshot('type10/original.expected.html'));
  });
});

describe('type02 · 도형 안의 핵심 글 + 설명 목록', () => {
  it('parses the original markup', async () => {
    const { result, section, data } = check('type02');
    expect(data).toEqual({
      eyebrow: '작은 제목', heading: '제목을 입력해 보세요',
      items: [1, 2, 3].map((n) => ({ label: `항목 ${n}`, title: '핵심 문구', desc: '설명을 입력해 보세요.' })),
    });
    expect(follow(result.html, ['section.type-02', 'div.mig-body', 'div.mig-content', 'ul.mig-list', 'li.mig-item'])).toHaveLength(3);
    expect(follow(result.html, ['li.mig-item', 'span.mig-label'])).toHaveLength(3);
    expect(follow(result.html, ['li.mig-item', 'strong.mig-title'])).toHaveLength(3);
    // a bare type-bg has its own background in the original cms.css (variant-map: #f9f3ec)
    expect(section.modifiers.background).toEqual({ kind: 'color', value: '#f9f3ec', token: 'type-bg' });
    await expect(JSON.stringify(section, null, 2) + '\n').toMatchFileSnapshot(snapshot('type02/original.expected.json'));
    await expect(result.html).toMatchFileSnapshot(snapshot('type02/original.expected.html'));
  });
});

describe('type03 · 이미지와 글 지그재그 목록', () => {
  it('parses the original markup', async () => {
    const { result, section, data } = check('type03');
    const pair = { pc: { src: '/images/cms-sample.svg', alt: '', kind: 'relative' }, mo: { src: '/images/cms-sample-m.svg', alt: '', kind: 'relative' } };
    expect(data).toEqual({
      eyebrow: '작은 제목', heading: '제목을 입력해 보세요', reverse: false,
      items: [1, 2].map((n) => ({ num: `0${n}`, title: `항목 ${n} 제목`, desc: '설명을 입력해 보세요.', image: pair })),
    });
    const items = follow(result.html, ['section.type-03', 'div.mig-body', 'ul.mig-list', 'li.mig-item']);
    expect(items).toHaveLength(2);
    expect(follow(result.html, ['li.mig-item', 'div.mig-content', 'div.mig-visual'])).toHaveLength(4);
    expect(follow(result.html, ['li.mig-item', 'div.mig-content', 'div.mig-text-wrap', 'strong.mig-title'])).toHaveLength(2);
    await expect(JSON.stringify(section, null, 2) + '\n').toMatchFileSnapshot(snapshot('type03/original.expected.json'));
    await expect(result.html).toMatchFileSnapshot(snapshot('type03/original.expected.html'));
  });

  it('keeps the original reverse layout and reports that the host starts on the left', () => {
    const { result, data } = check('type03', original('type03').replace('array-zigzag text-type-1 ', 'array-zigzag reverse text-type-1 '));
    expect(data.reverse).toBe(true);
    expect(result.page.diagnostics.some((d) => d.code === 'PRESET_LAYOUT_FIXED')).toBe(true);
  });
});

describe('content the P2 types have no place for', () => {
  it('falls back instead of dropping an extra paragraph', () => {
    const body = original('type07').replace('<p class="cms-description">내용 1</p>', '<p class="cms-description">내용 1</p><p>추가 문단</p>');
    const result = convert(body);
    expect(result.page.sections[0]!.type).toBe('fallback');
    expect(result.html).toContain('추가 문단');
  });
});

describe('editor values', () => {
  it('type09 accepts the editor select value as text', async () => {
    const { type09 } = await import('../src/types/type09.ts');
    expect(type09.schema.parse({ perRow: '2', items: [] }).perRow).toBe(2);
    expect(type09.schema.safeParse({ perRow: '5', items: [] }).success).toBe(false);
  });
});

describe('images outside the places a type reads', () => {
  it.each(['type07', 'type09', 'type10', 'type02', 'type03'])('%s falls back instead of dropping an unexpected image', (id) => {
    const body = original(id).replace('<p class="cms-title">', '<img src="https://cdn.example.com/stray.jpg" alt=""/><p class="cms-title">');
    const result = convert(body);
    expect(result.page.sections[0]!.type).toBe('fallback');
    expect(imgSrcs(result.html)).toEqual(imgSrcs(body));
  });
});

describe('list reset', () => {
  it.each(['type07', 'type09', 'type10', 'type02', 'type03'])('%s lists never show browser bullets or indentation', (id) => {
    const html = convert(original(id)).html;
    const lists = [...html.matchAll(/<ul class="mig-list"([^>]*)>/gu)];
    expect(lists.length).toBeGreaterThan(0);
    for (const [, attrs] of lists) expect(attrs).toContain('style="list-style: none; padding-left: 0; margin: 0;"');
  });
});
