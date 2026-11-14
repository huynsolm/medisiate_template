import { describe, expect, it } from 'vitest';
import { parseFragment } from 'parse5';
import { convertDocument } from '../src/convert/convert-document.ts';
import { defaultRegistry } from '../src/types/index.ts';
import { sanitizeRichText } from '../src/html/rich-text.ts';

const opts = { registry: defaultRegistry, theme: { primary: '#b1926a', source: 'default' as const }, coreVersion: '0', hostCss: { sha256: 'x', savedAt: 'y' } };
const doc = (body: string) => `<div class="cms-container">${body}</div>`;
const convert = (body: string) => convertDocument(doc(body), 'a.html', opts);

/** 주석은 파서가 무시하므로 실제로 렌더되는 img만 센다 */
function renderedSrcs(html: string): string[] {
  const out: string[] = [];
  const visit = (n: { tagName?: string; attrs?: Array<{ name: string; value: string }>; childNodes?: unknown[] }) => {
    if (n.tagName === 'img') out.push(n.attrs?.find((a) => a.name === 'src')?.value ?? '');
    (n.childNodes as typeof n[] | undefined)?.forEach(visit);
  };
  visit(parseFragment(html) as never);
  return out.sort();
}

describe('I-2 type01 variants', () => {
  it('keeps a known source variant class', () => {
    const r = convert('<section class="cms type01 highlight"><p>강조</p></section>');
    expect(r.page.sections[0]?.variant).toBe('highlight');
    expect(r.html).toContain('mig-highlight-box');
    expect(r.page.diagnostics.some((d) => d.code === 'UNKNOWN_CLASS')).toBe(false);
  });
});

describe('I-3 lossless parsing', () => {
  it('sends a section with more than two images to fallback and still renders every image', () => {
    const r = convert('<section class="cms type01"><img src="a.jpg"><img src="b.jpg"><img src="c.jpg"><p>세 장</p></section>');
    expect(r.page.sections[0]?.type).toBe('fallback');
    expect(r.page.diagnostics.some((d) => d.code === 'LOSSY_PARSE' && d.level === 'warn')).toBe(true);
    expect(renderedSrcs(r.html)).toEqual(['a.jpg', 'b.jpg', 'c.jpg']);
    expect(r.status).toBe('failed');
  });

  it('sends a section to fallback when text outside headings and paragraphs would be lost', () => {
    const r = convert('<section class="cms type01"><p>문단</p><div class="note">문단 밖 안내문</div></section>');
    expect(r.page.sections[0]?.type).toBe('fallback');
    expect(r.html).toContain('문단 밖 안내문');
  });

  it('keeps the input and output img[src] multisets equal across a mixed page', () => {
    const body =
      '<section class="cms type00"><h2>제목</h2></section>' +
      '<section class="cms type01"><img class="pc" src="p.jpg"><img class="mo" src="m.jpg"><p>a</p></section>' +
      '<section class="cms type01"><img src="x1.jpg"><img src="x2.jpg"><img src="x3.jpg"></section>' +
      '<section class="cms type27"><img src="t.jpg"><img src="t.jpg"></section>';
    const r = convert(body);
    expect(renderedSrcs(r.html)).toEqual(r.images.map((i) => i.src).sort());
  });
});

describe('I-1 inline styles', () => {
  it('keeps allowlisted inline styles inside rich text', () => {
    expect(sanitizeRichText('<span style="color: #c00; font-weight: bold; position: fixed">빨강</span>')).toBe(
      '<span style="color: #c00; font-weight: bold;">빨강</span>',
    );
    expect(sanitizeRichText('<span style="color: red;background:url(x)">t</span>')).toBe('<span style="color: red;">t</span>');
    expect(sanitizeRichText('<b style="color: expression(alert(1))">t</b>')).toBe('<b>t</b>');
  });

  it('reports dropped declarations, including on the section itself', () => {
    const r = convert('<section class="cms type01" style="padding-top:30px" onclick="x()"><p style="text-align:center">설명 <span style="color:#c00">강조</span></p></section>');
    const dropped = r.page.diagnostics.filter((d) => d.code === 'INLINE_STYLE_DROPPED');
    expect(dropped.map((d) => d.detail?.declarations)).toEqual([['padding-top:30px'], ['text-align:center']]);
    expect(dropped.every((d) => d.level === 'warn')).toBe(true);
    expect(r.page.diagnostics.some((d) => d.code === 'EVENT_ATTRIBUTE_REMOVED')).toBe(true);
    expect(r.html).toContain('<span style="color: #c00;">강조</span>');
    expect(r.status).toBe('partial');
  });
});

describe('decision 2: image url warnings', () => {
  it('marks http and relative images as warnings so the file is partial', () => {
    const r = convert('<section class="cms type01"><img src="http://x/a.jpg"><p>a</p></section>');
    expect(r.page.diagnostics.find((d) => d.code === 'IMAGE_HTTP')?.level).toBe('warn');
    expect(r.status).toBe('partial');
    expect(convert('<section class="cms type01"><img src="https://x/a.jpg"><p>a</p></section>').status).toBe('success');
  });
});
