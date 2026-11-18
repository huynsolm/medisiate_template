import { mkdir, mkdtemp, readFile, writeFile, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parse } from 'parse5';
import { describe, expect, it } from 'vitest';
import { CORE_VERSION, defaultRegistry, resolveTheme } from '@cms-medisay/core';
import { compareFile, indexRow, runCompare } from '../src/commands/compare.ts';
import { filePage, inert } from '../src/compare/pages.ts';

const repo = path.resolve(import.meta.dirname, '../../..');
const opts = { registry: defaultRegistry, theme: resolveTheme({ default: { primary: '#164aa0' } }), coreVersion: CORE_VERSION, hostCss: { sha256: 'x', savedAt: 'y' } };
const page = (body: string) => `<!--#include virtual="/inc/head.html" -->\n<div class="cms-container">${body}</div>`;
const twoVisuals = '<section class="cms type01"><div class="cms-inner"><div class="cms-header"><p class="cms-thin-title">제목</p></div><div class="cms-visual"><img src="https://example.com/a.jpg" alt=""></div><div class="cms-description-box"><p class="cms-description">설명</p></div><div class="cms-visual"><img src="https://example.com/b.jpg" alt=""></div></div></section>';

describe('compare pages', () => {
  it('pairs each original section with its own converted output and classifies the outcome', () => {
    const file = compareFile(page(`<section class="cms type00"><h2>제목</h2></section>${twoVisuals}<section class="cms type99"><iframe src="https://example.com/v"></iframe></section>`), 'a/b.html', opts);
    expect(file.sections.map((s) => [s.index, s.declared, s.outcome])).toEqual([[1, 'type00', 'converted'], [2, 'type01', 'blocks'], [3, 'type99', 'fallback']]);
    expect(file.sections[1]!.original).toContain('<section class="cms type01">');
    expect(file.sections[1]!.output).toContain('mig-section type-text');
    expect(file.sections[1]!.output).not.toContain('type-00');
    expect(file.sections[1]!.diagnostics.some((d) => d.code === 'LAYOUT_SIMPLIFIED')).toBe(true);
    expect(indexRow(file)).toMatchObject({ file: 'a/b.html', sections: 3, counts: { converted: 1, notes: 0, retyped: 0, blocks: 1, fallback: 1 } });
  });

  it('shows a non-content file as one whole-file pair', () => {
    const file = compareFile('<ul><li>메뉴</li></ul>', 'include/menu.html', opts);
    expect(file.sections).toHaveLength(1);
    expect(file.sections[0]!.outcome).toBe('fallback');
  });

  it('never lets original scripts or event handlers run (inert + sandbox without scripts)', () => {
    expect(inert('<p onclick="x()">a</p><script>alert(1)</script>')).toBe('<p>a</p>');
    const html = filePage(compareFile(page('<section class="cms type01"><p onmouseover="steal()">글</p><script>alert(1)</script></section>'), 'x.html', opts), '../../../', '../');
    // iframe 문서를 실제로 파싱해 요소·속성을 본다(원본은 변환 결과의 HTML 주석 안에 글로도 남는데, 그건 실행되지 않는다)
    const unescape = (v: string) => v.replace(/&quot;/gu, '"').replace(/&lt;/gu, '<').replace(/&gt;/gu, '>').replace(/&amp;/gu, '&');
    type N = { tagName?: string; attrs?: Array<{ name: string }>; childNodes?: N[] };
    const all = (n: N): N[] => [n, ...(n.childNodes ?? []).flatMap(all)];
    const frames = [...html.matchAll(/<iframe([^>]*)srcdoc="([^"]*)"/gu)];
    expect(frames.length).toBeGreaterThan(0);
    for (const [, attrs, srcdoc] of frames) {
      expect(attrs).toContain('sandbox="allow-same-origin"');
      const nodes = all(parse(unescape(srcdoc!)) as unknown as N);
      expect(nodes.some((n) => n.tagName === 'script')).toBe(false);
      expect(nodes.some((n) => n.attrs?.some((a) => /^on/iu.test(a.name)))).toBe(false);
    }
  });

  it('writes index.html and one page per source file with paths back to the repository css', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'cms-compare-'));
    await mkdir(path.join(root, 'reference'), { recursive: true });
    await cp(path.join(repo, 'reference/host-css.manifest.json'), path.join(root, 'reference/host-css.manifest.json'));
    await mkdir(path.join(root, 'cms/contents/01'), { recursive: true });
    await writeFile(path.join(root, 'cms/contents/01/a.html'), page(twoVisuals));
    expect(await runCompare(root, [])).toBe(0);
    const index = await readFile(path.join(root, 'output/compare/index.html'), 'utf8');
    expect(index).toContain('"file":"01/a.html"');
    const one = await readFile(path.join(root, 'output/compare/files/01/a.html'), 'utf8');
    // output/compare/files/01/ → 저장소 최상위까지 4단계
    expect(one).toContain('../../../../reference/host-style.css');
    expect(one).toContain('../../../../reference/cms-original/css/cms.css');
    expect(one).toContain('href="../../index.html"');
  });

  it('refuses when there is no source folder', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'cms-compare-empty-'));
    expect(await runCompare(root, [])).toBe(1);
  });
});
