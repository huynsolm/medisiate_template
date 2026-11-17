import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { convertDocument, defaultRegistry } from '@cms-medisay/core';
import { loadPlaywright, type Browser } from '../support/browser.ts';

const repo = path.resolve(import.meta.dirname, '../..');
const pw = await loadPlaywright();
const big = (label: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="600"><rect width="100%" height="100%" fill="#9ac"/><text x="40" y="80" font-size="48">${label}</text></svg>`)}`;

// 블록 순서 변환(일반 모드): 이미지 묶음 둘 + 글 + 중첩 목록 + 넓은 표. 실제 페이지에서 나온 모양을 줄였다.
const body = `<section class="cms type01"><div class="cms-inner">
<div class="cms-header"><p class="cms-thin-title">제목 <em>강조</em></p></div>
<div class="cms-visual"><img src="${big('PC 1')}" alt="" class="d-none d-lg-block"><img src="${big('MO 1')}" alt="" class="d-block d-lg-none"></div>
<div class="cms-description-box"><p class="cms-description">첫 문단</p></div>
<ol class="cms-row-list"><li class="cms-list-item"><p class="cms-title">항목</p><p class="cms-description">설명</p><ul><li>하위 항목</li></ul></li></ol>
<table><thead><tr>${'<th>아주 긴 머리글 칸</th>'.repeat(8)}</tr></thead><tbody><tr>${'<td>값</td>'.repeat(8)}</tr></tbody></table>
<div class="cms-visual"><img src="${big('PC 2')}" alt="" class="d-none d-lg-block"><img src="${big('MO 2')}" alt="" class="d-block d-lg-none"></div>
</div></section>`;

// 번호 목록(검수 I-1·I-3): 시작 번호는 호스트 카운터로, 한쪽 화면 전용 항목은 번호까지 함께 숨는다
const numbered = `<section class="cms type01"><div class="cms-inner"><ol start="3"><li>FIRST</li><li>SECOND</li></ol>
<ol><li class="d-none d-lg-block">PC ITEM</li><li>ALL ITEM</li></ol>
<ol><li><p>OUTER</p><ol start="4"><li>INNER FIRST</li><li>INNER SECOND</li></ol></li></ol>
<ol><li class="d-none"></li><li>ALL ITEM</li></ol></div></section>`;

describe.skipIf(!pw)('blocks (general mode) on the host css', () => {
  let browser: Browser;
  let css: string;
  let html: string;

  beforeAll(async () => {
    browser = await pw!.chromium.launch();
    css = await readFile(path.join(repo, 'reference/host-style.css'), 'utf8');
    const opts = { registry: defaultRegistry, theme: { primary: '#164aa0', source: 'default' as const }, coreVersion: '0', hostCss: { sha256: '', savedAt: '' } };
    const result = convertDocument(`<div class="cms-container">${body}</div>`, 'blocks.html', opts);
    expect(result.page.sections[0]!.type).toBe('blocks');
    html = result.html.replaceAll('loading="lazy"', 'loading="eager"');
    numberedHtml = convertDocument(`<div class="cms-container">${numbered}</div>`, 'numbered.html', opts).html;
  }, 60_000);

  let numberedHtml: string;

  it.each([[1100, 2], [360, 1]] as const)('%ipx: numbered lists keep the start number and hide a screen-only item with its number', async (width, items) => {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body>${numberedHtml}</body></html>`);
    const m = await page.evaluate(() => {
      const lists = Array.from(document.querySelectorAll('ol.mig-list.type-ordered'));
      const visible = (ol: Element) => Array.from(ol.children).filter((li) => getComputedStyle(li).display !== 'none').length;
      const nested = lists[3]!;
      return {
        reset: getComputedStyle(lists[0]!).counterReset,
        shown: visible(lists[1]!),
        // 중첩 목록: 시작값을 준 카운터와 항목이 그리는 카운터가 같아야 한다
        nestedReset: getComputedStyle(nested).counterReset,
        nestedDraws: getComputedStyle(nested.children[0]!, '::before').content,
        hiddenEmpty: visible(lists[4]!),
      };
    });
    await page.close();
    expect(m.reset).toBe('mig-counter 2');
    expect(m.shown).toBe(items);
    expect(m.nestedReset).toBe('mig-counter-sub 3');
    expect(m.nestedDraws).toContain('counter(mig-counter-sub');
    expect(m.hiddenEmpty).toBe(1);
  });

  afterAll(async () => {
    await browser?.close();
  });

  it.each([[1100, 'pc'], [360, 'mo']] as const)('%ipx: no page overflow, one image per pair, list and table inside the section', async (width, view) => {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body>${html}</body></html>`);
    await page.evaluate(() => Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => undefined))));
    const m = await page.evaluate(() => {
      const shown = Array.from(document.images).filter((img) => img.offsetParent !== null).map((img) => decodeURIComponent(img.src).match(/>(PC|MO) \d</u)?.[1]);
      const section = document.querySelector('section.mig-section')!.getBoundingClientRect();
      const nested = document.querySelector('.mig-list .mig-list .mig-item')!.getBoundingClientRect();
      return { scrollWidth: document.documentElement.scrollWidth, shown, sectionRight: section.right, nestedRight: nested.right, table: !!document.querySelector('.table-responsive table.mig-table') };
    });
    await page.close();
    expect(m.scrollWidth).toBeLessThanOrEqual(width);
    expect(m.shown).toEqual(view === 'pc' ? ['PC', 'PC'] : ['MO', 'MO']);
    expect(m.nestedRight).toBeLessThanOrEqual(m.sectionRight + 1);
    expect(m.table).toBe(true);
  });
});
