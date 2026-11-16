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

// ---- 순서 검사 재검수(b5ae00b) 지적 ----

describe('order check: authored numbers are compared, only generated ones are skipped (I-1)', () => {
  const t24 = '<section class="cms type24"><div class="cms-inner"><ol class="cms-ordered-list"><li class="cms-list-item"><div class="cms-description-box"><p class="cms-title">YEAR</p><p class="cms-description"><span class="mig-num">2026</span> BODY</p></div></li></ol></div></section>';

  it('a written <span class="mig-num">2026</span> in type24 converts normally', () => {
    const result = convert(t24);
    expect(result.page.sections[0]!.type).toBe('type24');
    expect(result.html).toContain('2026');
  });

  it('the generated item numbers are still in the real output', () => {
    expect(convert(t24).html).toMatch(/<span class="mig-num">1<\/span>/u);
  });
});

describe('order check: a link and plain text with the same words are not interchangeable (I-2)', () => {
  it('type29 button "예약" and paragraph "예약" swapping places falls back', () => {
    const result = convert('<section class="cms type29"><div class="cms-inner"><div class="cms-description-box"><p class="cms-description">FIRST</p><p class="cms-button-wrap"><a class="cms-square-button" href="/go">예약</a></p><p class="cms-description">예약</p></div></div></section>');
    expect(result.page.sections[0]!.type).toBe('fallback');
    expect(result.page.diagnostics.some((d) => d.code === 'LOSSY_PARSE' && /순서/u.test(d.message))).toBe(true);
  });

  it('an unsafe link is compared as plain text (the link is removed on purpose, with a warning)', () => {
    const result = convert('<section class="cms type11"><div class="cms-inner"><div class="cms-header"><p class="cms-title">T</p></div><ul class="cms-bullet-list"><li class="cms-list-item"><p class="cms-description">see <a href="javascript:alert(1)">link</a></p></li></ul></div></section>');
    expect(result.page.sections[0]!.type).toBe('type11');
    expect(result.page.diagnostics.some((d) => d.code === 'UNSAFE_LINK_REMOVED')).toBe(true);
  });
});

// ---- 3차 재검수(2dd9193) 지적: 순서 비교를 토큰(글·링크·이미지)으로 ----

describe('order check v3', () => {
  it('I-1 one link around a PC/MO image pair converts normally', () => {
    const result = convert('<section class="cms type23"><div class="cms-inner"><div class="cms-visual"><a href="https://www.youtube.com/watch?v=abc" target="_blank"><img src="https://cdn.example.com/a.jpg" class="img-fluid d-none d-lg-block m-auto" alt="영상"><img src="https://cdn.example.com/a_m.jpg" class="w-100 d-block d-lg-none" alt="영상"></a></div></div></section>');
    expect(result.page.sections[0]!.type).toBe('type23');
    expect(result.html.match(/href="https:\/\/www\.youtube\.com\/watch\?v=abc"/gu)).toHaveLength(2);
  });

  it('I-3 text that looks like the old link notation cannot hide a reorder', () => {
    const result = convert('<section class="cms type29"><div class="cms-inner"><div class="cms-description-box"><p class="cms-description">FIRST</p><p class="cms-button-wrap"><a class="cms-square-button" href="/go">예약</a></p><p class="cms-description">⟦/go⟧예약⟦/⟧</p></div></div></section>');
    expect(result.page.sections[0]!.type).toBe('fallback');
  });

  it('I-4 an image moving relative to text is detected (type28 image before the badge)', () => {
    const result = convert('<section class="cms type28"><div class="cms-inner"><div class="cms-visual"><img src="https://example.com/image.png" alt="PIC"></div><div class="cms-description-box em-box-3"><p class="cms-title">BADGE</p></div><div class="cms-description-box"><p class="cms-description">BODY</p></div></div></section>');
    const html = result.html.replace(/<!--[\s\S]*?-->/gu, '');
    if (result.page.sections[0]!.type !== 'fallback') expect(html.indexOf('image.png')).toBeLessThan(html.indexOf('BADGE'));
    else expect(result.page.diagnostics.some((d) => d.code === 'LOSSY_PARSE' && /순서/u.test(d.message))).toBe(true);
  });
});

describe('I-2 type33 Q&A answers keep paragraph boundaries; wrapped lists fall back', () => {
  const qna = (answer: string) => `<section class="cms type33"><div class="cms-inner"><div class="cms-list-wrap"><div class="cms-list-item"><dl class="cms-inner-box"><dt><span>Q</span><div class="cms-description"><button>QUESTION</button></div></dt><dd><div class="copy"><span>A</span><div class="cms-description">${answer}</div></div></dd></dl></div></div></div></section>`;

  it('paragraphs become line breaks', () => {
    const result = convert(qna('<p>FIRST</p><p>SECOND</p>'));
    expect(result.page.sections[0]!.type).toBe('type33');
    expect(result.html).toContain('FIRST<br>SECOND');
  });

  it('a list wrapped in another element falls back', () => {
    expect(convert(qna('<div><ul><li>FIRST</li><li>SECOND</li></ul></div>')).page.sections[0]!.type).toBe('fallback');
  });
});

// ---- 4차 재검수(cadc0ef) 지적 ----

describe('order check v4', () => {
  it('I-1 a title and a description with repeated words swapping places is detected', () => {
    const result = convert('<section class="cms type10"><div class="cms-inner"><ol class="cms-figure-list"><li class="cms-list-item"><div class="cms-description-box"><p class="cms-description">검사검사</p></div><div class="cms-figure-text"><p class="cms-title">검사</p></div></li></ol></div></section>');
    const html = result.html.replace(/<!--[\s\S]*?-->/gu, '');
    if (result.page.sections[0]!.type !== 'fallback') expect(html.indexOf('검사검사')).toBeLessThan(html.indexOf('>검사<'));
    else expect(result.page.diagnostics.some((d) => d.code === 'LOSSY_PARSE' && /순서/u.test(d.message))).toBe(true);
  });

  it('I-1 two original paragraphs joined into one line-broken paragraph are still fine', () => {
    const result = convert('<section class="cms type04"><div class="cms-inner"><ol class="cms-tile-list"><li class="cms-list-item"><div class="cms-description-box"><p class="cms-description">첫 문단</p><p class="cms-description">둘째 문단</p></div></li></ol></div></section>');
    expect(result.page.sections[0]!.type).toBe('type04');
  });

  it('I-3 a mobile image written before the PC image is a normal responsive pair', () => {
    const result = convert('<section class="cms type23"><div class="cms-inner"><div class="cms-visual"><img src="https://example.com/mo.png" alt="" class="d-block d-lg-none"><img src="https://example.com/pc.png" alt="" class="d-none d-lg-block"></div></div></section>');
    expect(result.page.sections[0]!.type).toBe('type23');
  });
});

describe('I-2 type33 Q&A keeps an ordered list and its start number', () => {
  const qna = (answer: string) => `<section class="cms type33"><div class="cms-inner"><dl class="cms-inner-box"><dt><span>Q</span><div class="cms-description"><button>QUESTION</button></div></dt><dd><div class="copy"><span>A</span><div class="cms-description">${answer}</div></div></dd></dl></div></section>`;

  it('ol start=3 stays an ordered list starting at 3', () => {
    const result = convert(qna('<ol start="3"><li>FIRST</li><li>SECOND</li></ol>'));
    expect(result.page.sections[0]!.type).toBe('type33');
    expect(result.html).toMatch(/<ol start="3"[^>]*>/u);
    expect(result.html).not.toMatch(/<ul[^>]*>\s*<li class="mig-desc">FIRST/u);
  });

  it('a plain ul stays a bullet list', () => {
    expect(convert(qna('<ul><li>FIRST</li></ul>')).html).toMatch(/<ul[^>]*>\s*<li class="mig-desc">FIRST/u);
  });
});

// ---- 6차 재검수(37773d8) 지적: 블록 단위·화면별(PC/MO) 순서 비교 ----

describe('order check v5', () => {
  const fellBackForOrder = (r: ReturnType<typeof convert>) => r.page.sections[0]!.type === 'fallback' && r.page.diagnostics.some((d) => d.code === 'LOSSY_PARSE' && /순서/u.test(d.message));

  it('I-1 title/description swap is caught even when the description has a line break', () => {
    const result = convert('<section class="cms type10"><div class="cms-inner"><ol class="cms-figure-list"><li class="cms-list-item"><div class="cms-description-box"><p class="cms-description">검사<br>검사</p></div><div class="cms-figure-text"><p class="cms-title">검사</p></div></li></ol></div></section>');
    expect(fellBackForOrder(result)).toBe(true);
  });

  it('I-2A two images visible at the same time (icon list, then a big image) swapping places is caught', () => {
    const result = convert('<section class="cms type16"><div class="cms-inner"><ul class="cms-column-list"><li class="cms-list-item"><div class="cms-icon"><img src="https://example.com/icon.png" alt="ICON"></div></li></ul><div class="cms-visual"><img src="https://example.com/big.png" alt="BIG" class="d-none d-lg-block"></div></div></section>');
    expect(fellBackForOrder(result)).toBe(true);
  });

  it('I-2B a real PC/MO pair with different links, mobile written first, converts', () => {
    const result = convert('<section class="cms type23"><div class="cms-inner"><div class="cms-visual"><a href="/mobile"><img src="https://example.com/mo.png" alt="" class="d-block d-lg-none"></a><a href="/desktop"><img src="https://example.com/pc.png" alt="" class="d-none d-lg-block"></a></div></div></section>');
    expect(result.page.sections[0]!.type).toBe('type23');
  });
});

// ---- 7차 재검수(0efc580) 지적: 표시 클래스 해석, 합치기 자리의 구분 ----

describe('display classes are interpreted like Bootstrap (7th review I-1)', () => {
  const visual = (cls: string) => convert(`<section class="cms type23"><div class="cms-inner"><div class="cms-visual"><img src="https://example.com/image.png" alt="" class="${cls}"></div></div></section>`);
  const only = (r: ReturnType<typeof convert>) => (r.page.sections[0]!.data as { image?: { only?: string } }).image?.only;

  it('d-lg-block alone is visible everywhere: not hidden on mobile', () => {
    const r = visual('d-lg-block');
    expect(r.page.sections[0]!.type).toBe('type23');
    expect(only(r)).toBeUndefined();
    expect(r.html).not.toContain('common-display-pc');
  });

  it('d-none d-lg-inline-block is PC only', () => {
    const r = visual('d-none d-lg-inline-block');
    expect(only(r)).toBe('pc');
  });

  it('d-none d-lg-block is PC only, d-block d-lg-none is mobile only', () => {
    expect(only(visual('d-none d-lg-block'))).toBe('pc');
    expect(only(visual('d-block d-lg-none'))).toBe('mo');
  });

  it('a tablet-only image (d-none d-md-block d-lg-none) cannot be expressed and is preserved', () => {
    const r = visual('d-none d-md-block d-lg-none');
    expect(r.page.sections[0]!.type).toBe('fallback');
  });
});

describe('merging blocks needs a real separation at the join (7th review I-2)', () => {
  it('two description paragraphs cannot be matched to a single unbroken title', () => {
    const r = convert('<section class="cms type10"><div class="cms-inner"><ol class="cms-figure-list"><li class="cms-list-item"><div class="cms-description-box"><p class="cms-description">검사</p><p class="cms-description">검사</p></div><div class="cms-figure-text"><p class="cms-title">검사검사</p></div></li></ol></div></section>');
    expect(r.page.sections[0]!.type).toBe('fallback');
  });

  it('two paragraphs joined with a line break, and an eyebrow + title header, are still fine', () => {
    expect(convert('<section class="cms type04"><div class="cms-inner"><div class="cms-header top-border"><p class="cms-eyebrow">작은</p><p class="cms-title">제목</p></div><ol class="cms-tile-list"><li class="cms-list-item"><div class="cms-description-box"><p class="cms-description">첫 문단</p><p class="cms-description">둘째 문단</p></div></li></ol></div></section>').page.sections[0]!.type).toBe('type04');
  });
});

describe('display ranges inside one screen and CSS rule order (8th review I-1, I-2)', () => {
  const visual = (cls: string) => convert(`<section class="cms type23"><div class="cms-inner"><div class="cms-visual"><img src="https://example.com/image.png" alt="" class="${cls}"></div></div></section>`);
  const only = (r: ReturnType<typeof convert>) => (r.page.sections[0]!.data as { image?: { only?: string } }).image?.only;

  it.each(['d-block d-xl-none', 'd-block d-sm-none d-md-block', 'd-none d-sm-block'])('%s hides inside one screen width range and is preserved', (cls) => {
    const r = visual(cls);
    expect(r.page.sections[0]!.type).toBe('fallback');
    expect(r.page.diagnostics.some((d) => d.code === 'LOSSY_PARSE' && d.message.includes('폭에 따라'))).toBe(true);
  });

  it('a hidden range on an ancestor counts too', () => {
    const r = convert('<section class="cms type23"><div class="cms-inner"><div class="cms-visual d-block d-xl-none"><img src="https://example.com/image.png" alt=""></div></div></section>');
    expect(r.page.sections[0]!.type).toBe('fallback');
  });

  it('a range that matches whole screens (d-xl-block on top of d-lg-block) is still fine', () => {
    expect(only(visual('d-none d-lg-block d-xl-block'))).toBe('pc');
  });

  it.each([
    ['d-block d-none', 'd-none d-block', undefined],
    ['d-none d-lg-block d-lg-none', 'd-none d-lg-none d-lg-block', 'pc'],
  ])('the CSS declaration order decides, not the class order: %s = %s', (a, b, expected) => {
    for (const cls of [a, b]) {
      const r = visual(cls);
      expect(r.page.sections[0]!.type, cls).toBe('type23');
      expect(only(r), cls).toBe(expected);
    }
  });
});

describe('plain formatting is not a separation for merging blocks (8th review I-3)', () => {
  const t10 = (title: string) => convert(`<section class="cms type10"><div class="cms-inner"><ol class="cms-figure-list"><li class="cms-list-item"><div class="cms-description-box"><p class="cms-description">검사</p><p class="cms-description">검사</p></div><div class="cms-figure-text"><p class="cms-title">${title}</p></div></li></ol></div></section>`);

  it.each(['검사<em>검사</em>', '<strong>검사</strong>검사', '검사<span>검사</span>', '<b>검사</b><i>검사</i>', '검사<span class="text-point">검사</span>'])('two description paragraphs cannot become the title %s', (title) => {
    expect(t10(title).page.sections[0]!.type).toBe('fallback');
  });

  it('a span that the paragraph style turns into a block still separates', () => {
    expect(convert('<section class="cms type01"><p style="text-align:center">가</p><p>나</p></section>').page.sections[0]!.type).toBe('type01');
  });

  it('formatting inside a single paragraph is still fine', () => {
    expect(convert('<section class="cms type04"><div class="cms-inner"><ol class="cms-tile-list"><li class="cms-list-item"><div class="cms-description-box"><p class="cms-description">첫 <em>문단</em></p><p class="cms-description"><strong>둘째</strong> 문단</p></div></li></ol></div></section>').page.sections[0]!.type).toBe('type04');
  });
});
