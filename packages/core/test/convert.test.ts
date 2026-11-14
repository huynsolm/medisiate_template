import { describe, expect, it } from 'vitest';
import { convertDocument, fileStatus } from '../src/convert/convert-document.ts';
import { defaultRegistry } from '../src/types/index.ts';

const theme = { primary: '#b1926a', source: 'hospital' as const };
const opts = { registry: defaultRegistry, theme, coreVersion: '0.1.0', hostCss: { sha256: 'x', savedAt: 'y' } };

const doc = (body: string) => `<!--#include virtual="/include/header.html" -->\n<div class="cms-container">${body}</div>\n<!--#include virtual="/include/footer.html" -->`;

describe('convertDocument', () => {
  it('converts supported sections, keeps the page title and reports success', () => {
    const result = convertDocument(
      doc('<section class="cms type00"><h2>보톡스</h2></section><section class="cms type01"><img src="https://a/x.jpg" alt=""><p>설명</p></section>'),
      '01/botox.html',
      opts,
    );
    expect(result.page.title).toBe('보톡스');
    expect(result.page.source).toBe('01/botox.html');
    expect(result.page.sections.map((s) => [s.id, s.type])).toEqual([
      ['s1', 'type00'],
      ['s2', 'type01'],
    ]);
    expect(result.page.sections[1]?.source).toEqual({ file: '01/botox.html', index: 2, classList: ['cms', 'type01'] });
    expect(result.page.diagnostics.filter((d) => d.code === 'SSI_REMOVED')).toHaveLength(2);
    expect(result.status).toBe('success');
    expect(result.page.diagnostics.some((d) => d.code === 'PARSE_RECOVERED')).toBe(false);
    expect(result.html).toContain('<div class="mig-container">');
    expect(result.html).toContain('src="https://a/x.jpg"');
  });

  it('falls back for unsupported types and reports partial', () => {
    const result = convertDocument(doc('<section class="cms type01"><p>a</p></section><section class="cms type27"><p>표</p></section>'), 'a.html', opts);
    expect(result.page.sections[1]?.type).toBe('fallback');
    expect(result.page.diagnostics.some((d) => d.code === 'UNSUPPORTED_TYPE' && d.sectionIndex === 2)).toBe(true);
    expect(result.status).toBe('partial');
    expect(result.html).toContain('data-migration-fallback="true"');
  });

  it('marks files without a cms container as non-content failures but still outputs html', () => {
    const result = convertDocument('<ul><li>메뉴</li></ul>', 'include/menu.html', opts);
    expect(result.status).toBe('failed');
    expect(result.page.diagnostics[0]?.code).toBe('NON_CONTENT_FILE');
    expect(result.html).toContain('메뉴');
  });

  it('records parser recovery', () => {
    const result = convertDocument(doc('<section class="cms type01"><p>열림<div></p></section>'), 'b.html', opts);
    expect(result.page.diagnostics.some((d) => d.code === 'PARSE_RECOVERED')).toBe(true);
  });

  it('keeps every image src unchanged', () => {
    const srcs = ['../img/a.jpg', 'http://x/b.jpg', '/api/file/c'];
    const result = convertDocument(doc(`<section class="cms type01">${srcs.map((s) => `<img src="${s}">`).join('')}</section><section class="cms type99"><img src="//cdn/d.png"></section>`), 'c.html', opts);
    for (const s of [...srcs.slice(0, 2), '//cdn/d.png']) expect(result.html).toContain(s);
    expect(result.images.map((i) => i.src)).toEqual([...srcs, '//cdn/d.png']);
  });

  it('is deterministic', () => {
    const html = doc('<section class="cms type01"><p>a</p></section>');
    expect(JSON.stringify(convertDocument(html, 'a.html', opts))).toBe(JSON.stringify(convertDocument(html, 'a.html', opts)));
  });
});

describe('fileStatus', () => {
  it('follows the plan rules', () => {
    expect(fileStatus([], 2, 0)).toBe('success');
    expect(fileStatus([{ level: 'info', code: 'IMAGE_HTTP', message: '' }], 2, 0)).toBe('success');
    expect(fileStatus([{ level: 'warn', code: 'UNKNOWN_CLASS', message: '' }], 2, 0)).toBe('partial');
    expect(fileStatus([], 2, 1)).toBe('partial');
    expect(fileStatus([], 2, 2)).toBe('failed');
    expect(fileStatus([{ level: 'error', code: 'INVALID_DATA', message: '' }], 2, 0)).toBe('failed');
  });
});
