import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { convertDocument, defaultRegistry } from '@cms-medisay/core';
import { loadPlaywright, type Browser } from '../support/browser.ts';

const repo = path.resolve(import.meta.dirname, '../..');
const pw = await loadPlaywright();

/** bg-image-1은 PC/모바일 배경 이미지가 다르다. 호스트 CSS 위에서 화면별로 맞는 쪽만 보여야 한다. */
describe.skipIf(!pw)('pc/mobile section backgrounds on the host css', () => {
  let browser: Browser;
  let css: string;
  const modes = ['general', 'preset'] as const;
  const html: Record<(typeof modes)[number], string> = { general: '', preset: '' };

  beforeAll(async () => {
    browser = await pw!.chromium.launch();
    css = await readFile(path.join(repo, 'reference/host-style.css'), 'utf8');
    const opts = { registry: defaultRegistry, theme: { primary: '#c7b195', source: 'default' as const }, coreVersion: '0', hostCss: { sha256: '', savedAt: '' } };
    html.preset = convertDocument('<div class="cms-container"><section class="cms type01 type-bg bg-image-1"><p>배경 섹션</p></section></div>', 'a.html', opts).html;
    const page = {
      version: 1 as const,
      theme: opts.theme,
      sections: [{ id: 's1', type: 'text-visual', variant: 'default', modifiers: { background: { kind: 'image' as const, value: 'https://x/pc.jpg', mobile: { value: 'https://x/mo.jpg' } }, fullBleed: { paddingY: '70px' } }, data: { title: '일반', image: {} } }],
      diagnostics: [],
      meta: opts,
    };
    const { renderPage } = await import('@cms-medisay/core');
    html.general = renderPage(page, { registry: defaultRegistry }).html;
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
  });

  async function probe(body: string, width: number, editor: boolean) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    await page.route(/^https?:/u, (route: { abort(): Promise<void> }) => route.abort());
    await page.setContent(`<!doctype html><html${editor ? ' class="design-edit-page"' : ''}><head><style>${css}</style></head><body>${body}</body></html>`);
    const result = await page.evaluate(() => {
      const section = document.querySelector('section.mig-section')!;
      const layer = section.querySelector(':scope > .common-display-pc');
      return {
        section: getComputedStyle(section).backgroundImage,
        layerShown: layer ? getComputedStyle(layer).display !== 'none' : false,
        layer: layer ? getComputedStyle(layer).backgroundImage : '',
      };
    });
    await page.close();
    return result;
  }

  for (const mode of modes) {
    it(`${mode}: PC 1100 shows only the pc image`, async () => {
      const r = await probe(html[mode], 1100, false);
      expect(r.section).toBe('none');
      expect(r.layerShown).toBe(true);
      expect(r.layer).toMatch(/(cms_bg_1|pc)\.jpg/u);
    }, 30_000);

    it(`${mode}: mobile 360 shows only the mobile image`, async () => {
      const r = await probe(html[mode], 360, false);
      expect(r.section).toMatch(/(cms_bg_1_m|mo)\.jpg/u);
      expect(r.layerShown).toBe(false);
    }, 30_000);

    it(`${mode}: editor screen behaves like mobile`, async () => {
      const r = await probe(html[mode], 1100, true);
      expect(r.section).toMatch(/(cms_bg_1_m|mo)\.jpg/u);
      expect(r.layerShown).toBe(false);
    }, 30_000);
  }
});
