import { describe, expect, it } from 'vitest';
import { sanitizeRichText } from '../src/html/rich-text.ts';
import { convert } from './support/original.ts';

// 실제 페이지에 <a href> 링크가 359개 있다. 글만 남기고 주소를 버리면 경고 없는 손실이었다.
describe('links in rich text', () => {
  it.each([
    ['https://example.com/a?b=1', 'https://example.com/a?b=1'],
    ['http://example.com', 'http://example.com'],
    ['/sub/page.html', '/sub/page.html'],
    ['../page.html', '../page.html'],
    ['page.html', 'page.html'],
    ['#section2', '#section2'],
    ['mailto:info@example.com', 'mailto:info@example.com'],
    ['tel:02-123-4567', 'tel:02-123-4567'],
  ])('keeps a safe address %s', (href, kept) => {
    expect(sanitizeRichText(`see <a href="${href}">link</a>`)).toBe(`see <a href="${kept}">link</a>`);
  });

  it.each(['javascript:alert(1)', ' JavaScript:alert(1)', 'java\tscript:alert(1)', 'jav&#x09;ascript:alert(1)', 'data:text/html,<b>x</b>', 'vbscript:x', 'file:///etc/passwd'])(
    'removes an unsafe address %j but keeps the text', (href) => {
      expect(sanitizeRichText(`see <a href="${href}">link</a>`)).toBe('see link');
    },
  );

  it('keeps target=_blank with rel=noopener and drops other attributes', () => {
    expect(sanitizeRichText('<a href="https://x.example" target="_blank" onclick="x()" data-toggle="tab" id="a">x</a>'))
      .toBe('<a href="https://x.example" target="_blank" rel="noopener noreferrer">x</a>');
  });

  it('a link inside a converted section keeps its address', () => {
    const result = convert('<section class="cms type11"><div class="cms-inner"><div class="cms-header"><p class="cms-title">T</p></div><ul class="cms-bullet-list"><li class="cms-list-item"><p class="cms-description">see <a href="https://example.com/x">link</a></p></li></ul></div></section>');
    expect(result.page.sections[0]!.type).toBe('type11');
    expect(result.html).toContain('<a href="https://example.com/x">link</a>');
  });

  it('an unsafe link is reported, not silently dropped', () => {
    const result = convert('<section class="cms type11"><div class="cms-inner"><div class="cms-header"><p class="cms-title">T</p></div><ul class="cms-bullet-list"><li class="cms-list-item"><p class="cms-description">see <a href="javascript:alert(1)">link</a></p></li></ul></div></section>');
    expect(result.html).not.toContain('javascript:');
    expect(result.page.diagnostics.some((d) => d.code === 'UNSAFE_LINK_REMOVED')).toBe(true);
  });
});

describe('links around images', () => {
  const t23 = (visual: string) => `<section class="cms type23"><div class="cms-inner"><div class="cms-header"><p class="cms-title">T</p></div><div class="cms-visual">${visual}</div></div></section>`;

  it('keeps a link wrapped around an image (e.g. a video thumbnail)', () => {
    const result = convert(t23('<a href="https://www.youtube.com/watch?v=abc" target="_blank"><img src="https://cdn.example.com/a.jpg" alt="영상"></a>'));
    expect(result.page.sections[0]!.type).toBe('type23');
    expect(result.html).toMatch(/<a href="https:\/\/www\.youtube\.com\/watch\?v=abc" target="_blank" rel="noopener noreferrer"><img [^>]*src="https:\/\/cdn\.example\.com\/a\.jpg"/u);
  });

  it('an unsafe link around an image is reported and not output', () => {
    const result = convert(t23('<a href="javascript:alert(1)"><img src="https://cdn.example.com/a.jpg" alt=""></a>'));
    expect(result.html).not.toContain('javascript:');
    expect(result.page.diagnostics.some((d) => d.code === 'UNSAFE_LINK_REMOVED')).toBe(true);
  });

  it('the image link is validated when data comes from the editor or JSON', async () => {
    const { imageRefSchema } = await import('../src/schema/page.ts');
    expect(imageRefSchema.safeParse({ src: 'a.jpg', alt: '', kind: 'relative', link: 'javascript:alert(1)' }).success).toBe(false);
    expect(imageRefSchema.safeParse({ src: 'a.jpg', alt: '', kind: 'relative', link: 'https://x.example' }).success).toBe(true);
  });
});
