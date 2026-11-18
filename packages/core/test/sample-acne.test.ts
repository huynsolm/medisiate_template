import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeHtml } from '../src/html/normalize.ts';
import { parsePageModel } from '../src/schema/page.ts';
import { renderPage } from '../src/page/render-page.ts';
import { defaultRegistry } from '../src/types/index.ts';

const root = path.resolve(import.meta.dirname, '../../..');
const expected = readFileSync(path.join(root, 'reference/sample-inline-acne.html'), 'utf8');
const page = parsePageModel(JSON.parse(readFileSync(path.join(root, 'fixtures/sample-acne/page.json'), 'utf8')));

describe('sample reproduction', () => {
  it('renders the acne page with the same normalized DOM as the hand-made sample', () => {
    const { html, diagnostics } = renderPage(page, { registry: defaultRegistry, fluidRange: 'sample' });
    expect(diagnostics).toEqual([]);
    expect(normalizeHtml(html)).toBe(normalizeHtml(expected));
  });

  it('is byte-identical across renders', () => {
    const a = renderPage(page, { registry: defaultRegistry, fluidRange: 'sample' }).html;
    const b = renderPage(page, { registry: defaultRegistry, fluidRange: 'sample' }).html;
    expect(a).toBe(b);
  });

  it('uses the host 1024px range by default', () => {
    const { html } = renderPage(page, { registry: defaultRegistry });
    expect(html).toContain('/ 649)');
    expect(html).not.toContain('/ 617)');
  });
});

describe('normalizeHtml', () => {
  it('ignores attribute order, comments and whitespace between tags', () => {
    expect(normalizeHtml('<!-- c --><div  b="1" a="2" style="color:red;  margin : 0">\n <p>x</p></div>')).toBe(
      normalizeHtml('<div a="2" b="1" style="color: red; margin: 0;"><p>x</p></div>'),
    );
  });
  it('detects different text', () => {
    expect(normalizeHtml('<p>a</p>')).not.toBe(normalizeHtml('<p>b</p>'));
  });
});
