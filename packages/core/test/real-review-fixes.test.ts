import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { sourceSections } from '../src/parse/sections.ts';
import { outerHtml } from '../src/parse/dom.ts';
import { convert } from './support/original.ts';

// 실제 원본 대조 검수(docs/review-real-pages.md) 지적 회귀 테스트
const table = (inner: string, after = '') => `<section class="cms type26"><div class="cms-inner"><div class="cms-table-wrap">${inner}${after}</div></div></section>`;

describe('I-1 visible table captions stay visible', () => {
  it('a caption without sr-only is shown (inline override of the host hiding rule)', () => {
    const result = convert(table('<table class="cms-table"><caption>VISIBLE_CAPTION</caption><tbody><tr><td>FIRST</td></tr></tbody></table>'));
    expect(result.page.sections[0]!.type).toBe('type26');
    expect(result.html).toMatch(/<caption style="[^"]*position: static;[^"]*">VISIBLE_CAPTION<\/caption>/u);
  });

  it('an sr-only caption stays for screen readers only (host hiding rule applies)', () => {
    const result = convert(table('<table class="cms-table"><caption class="sr-only">HIDDEN_CAPTION</caption><tbody><tr><td>FIRST</td></tr></tbody></table>'));
    expect(result.html).toContain('<caption>HIDDEN_CAPTION</caption>');
  });
});

describe('I-2 a valid width attribute wins over an invalid style width', () => {
  it('col width="80%" style="width:*" keeps 80%', () => {
    const result = convert(table('<table class="cms-table"><colgroup><col width="80%" style="width:*"><col></colgroup><tbody><tr><td>FIRST</td><td>SECOND</td></tr></tbody></table>'));
    expect(result.page.sections[0]!.type).toBe('type26');
    expect((result.page.sections[0]!.data as { colWidths: Array<{ width: string }> }).colWidths[0]!.width).toBe('80%');
  });

  it('a valid style width still wins over the attribute (browser order)', () => {
    const result = convert(table('<table class="cms-table"><colgroup><col width="80%" style="width:30%"></colgroup><tbody><tr><td>A</td></tr></tbody></table>'));
    expect((result.page.sections[0]!.data as { colWidths: Array<{ width: string }> }).colWidths[0]!.width).toBe('30%');
  });
});

describe('I-3 a note after the table stays after the table', () => {
  it('description box after the table inside the wrapper is output after the table', () => {
    const result = convert(table('<table class="cms-table"><tbody><tr><td>TABLE_CELL</td></tr></tbody></table>', '<div class="cms-description-box"><p class="cms-description">AFTER_NOTE</p></div>'));
    expect(result.page.sections[0]!.type).toBe('type26');
    expect(result.html.indexOf('TABLE_CELL')).toBeLessThan(result.html.indexOf('AFTER_NOTE'));
  });

  it('description box before the table stays before', () => {
    const result = convert(table('<div class="cms-description-box"><p class="cms-description">BEFORE_DESC</p></div><table class="cms-table"><tbody><tr><td>TABLE_CELL</td></tr></tbody></table>'));
    expect(result.html.indexOf('BEFORE_DESC')).toBeLessThan(result.html.indexOf('TABLE_CELL'));
  });

  const realFile = path.resolve(import.meta.dirname, '../../..', 'cms/contents/13256/02_02_입원생활안내.html');
  it.skipIf(!(() => { try { readFileSync(realFile); return true; } catch { return false; } })())('the real page keeps table → note order', () => {
    const section = sourceSections(readFileSync(realFile, 'utf8'), 'x').find((s) => s.index === 2)!;
    const result = convert(outerHtml(section.element));
    const html = result.html;
    expect(html.indexOf('회진')).toBeLessThan(html.indexOf('진료과의 특성에 따라'));
  });
});

describe('type01 with an eyebrow + title header keeps the header before the image (real pages: 14 sections)', () => {
  const sec = '<section class="cms type01 type-bg"><div class="cms-inner"><div class="cms-header top-border"><p class="cms-eyebrow">회전근개 파열의</p><p class="cms-title">어떤 증상이 있나요?</p></div>'
    + '<div class="cms-visual"><img src="https://cdn.example.com/a.png" alt="" class="img-fluid d-none d-lg-block"><img src="https://cdn.example.com/a_m.png" alt="" class="img-fluid d-block d-lg-none"></div>'
    + '<div class="cms-description-box row"><p class="cms-description col-6">첫 문단</p><p class="cms-description col-6">둘째 문단</p></div></div></section>';

  it('reads the header into eyebrow/heading and does not merge the eyebrow into the description', () => {
    const result = convert(sec);
    const data = result.page.sections[0]!.data as { eyebrow?: string; heading?: string; title?: string; desc?: string };
    expect(data).toMatchObject({ eyebrow: '회전근개 파열의', heading: '어떤 증상이 있나요?' });
    expect(data.title).toBeUndefined();
    expect(data.desc).not.toContain('회전근개 파열의');
    const html = result.html;
    expect(html.indexOf('어떤 증상이 있나요?')).toBeLessThan(html.indexOf('mig-visual'));
    expect(html.indexOf('회전근개 파열의')).toBeLessThan(html.indexOf('어떤 증상이 있나요?'));
  });
});

// ---- 재검수(f497c31) 지적 ----

describe('R-I-1 a unitless CSS width is invalid; the HTML width attribute applies', () => {
  it('col width="80%" style="width:20" keeps 80%', () => {
    const result = convert(table('<table class="cms-table"><colgroup><col width="80%" style="width:20"><col></colgroup><tbody><tr><td>FIRST</td><td>SECOND</td></tr></tbody></table>'));
    expect((result.page.sections[0]!.data as { colWidths: Array<{ width: string }> }).colWidths[0]!.width).toBe('80%');
  });

  it('a unitless HTML width attribute still means px', () => {
    const result = convert(table('<table class="cms-table"><colgroup><col width="120"></colgroup><tbody><tr><td>A</td></tr></tbody></table>'));
    expect((result.page.sections[0]!.data as { colWidths: Array<{ width: string }> }).colWidths[0]!.width).toBe('120px');
  });
});

describe('R-I-2 a section whose text order would change is preserved (runtime order check, all types)', () => {
  it('type29: paragraph after the button stays after it, or the section falls back', () => {
    const result = convert('<section class="cms type29"><div class="cms-inner"><div class="cms-description-box"><p class="cms-description">FIRST</p><p class="cms-button-wrap"><a class="cms-square-button" href="/go">BUTTON</a></p><p class="cms-description">LAST</p></div></div></section>');
    const html = result.html.replace(/<!--[\s\S]*?-->/gu, '');
    if (result.page.sections[0]!.type !== 'fallback') {
      expect(html.indexOf('FIRST')).toBeLessThan(html.indexOf('BUTTON'));
      expect(html.indexOf('BUTTON')).toBeLessThan(html.indexOf('LAST'));
    } else {
      expect(result.page.diagnostics.some((d) => d.code === 'LOSSY_PARSE' && /순서/u.test(d.message))).toBe(true);
    }
  });

  it('type15: a paragraph placed before the bullets is no longer silently moved after them', () => {
    const body = '<section class="cms type15"><div class="cms-inner"><ul class="cms-column-list"><li class="cms-list-item"><div class="cms-description-box"><p class="cms-title">CARD</p><p class="cms-description">EXTRA_PARA</p><ul class="cms-bullet-list"><li class="cms-list-item"><p class="cms-description">BULLET</p></li></ul></div></li></ul></div></section>';
    const result = convert(body);
    expect(result.page.sections[0]!.type).toBe('fallback');
    expect(result.page.diagnostics.some((d) => d.code === 'LOSSY_PARSE' && /순서/u.test(d.message))).toBe(true);
  });

  it('a normal section is not affected', () => {
    const result = convert('<section class="cms type29"><div class="cms-inner"><div class="cms-description-box"><p class="cms-description">FIRST</p><p class="cms-button-wrap"><a class="cms-square-button" href="/go">BUTTON</a></p></div></div></section>');
    expect(result.page.sections[0]!.type).toBe('type29');
  });
});
