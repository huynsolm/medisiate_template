import { describe, expect, it } from 'vitest';
import { parseElements } from '../src/parse/source.js';

describe('parseElements', () => {
  it('tracks CMS section ancestry without assigning header or footer images', () => {
    const elements = parseElements(`
      <img src="header.jpg">
      <section class="cms type01"><div><img src="section.jpg"></div></section>
      <img src="footer.jpg">
    `);
    const images = elements.filter((element) => element.tagName === 'img');

    expect(images.map((image) => image.cmsSectionIndex ?? null)).toEqual([null, 1, null]);
  });
});

