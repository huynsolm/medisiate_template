import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { defaultRegistry, parsePageModel, renderPage } from '@cms-medisay/core';
import { loadPlaywright, type Browser } from '../support/browser.ts';

const repo = path.resolve(import.meta.dirname, '../..');
const outDir = path.join(repo, 'output/visual/sample');
const pw = await loadPlaywright();

/** 계획서 9.2: 360(MO), 1100(PC), 1100 + html.design-edit-page(에디터) */
const MODES = [
  { name: 'pc', width: 1100, editor: false },
  { name: 'mo', width: 360, editor: false },
  { name: 'editor', width: 1100, editor: true },
] as const;
const THRESHOLD = 0.01;

function documentFor(css: string, body: string, editor: boolean): string {
  return `<!doctype html><html lang="ko"${editor ? ' class="design-edit-page"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><style>body{margin:0;padding:24px 15px;background:#fff}img{background:#ccc}</style></head><body>${body}</body></html>`;
}

describe.skipIf(!pw)('sample visual comparison', () => {
  let browser: Browser;
  let css: string;
  let original: string;
  let converted: string;

  beforeAll(async () => {
    browser = await pw!.chromium.launch();
    css = await readFile(path.join(repo, 'reference/host-style.css'), 'utf8');
    original = await readFile(path.join(repo, 'reference/sample-inline-acne.html'), 'utf8');
    const page = parsePageModel(JSON.parse(await readFile(path.join(repo, 'fixtures/sample-acne/page.json'), 'utf8')));
    converted = renderPage(page, { registry: defaultRegistry, fluidRange: 'sample' }).html;
    await mkdir(outDir, { recursive: true });
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
  });

  async function shot(html: string, width: number): Promise<PNG> {
    const page = await browser.newPage({ viewport: { width, height: 800 }, deviceScaleFactor: 1 });
    // 외부 요청(이미지·배경)은 양쪽 모두 똑같이 막는다
    await page.route(/^https?:/u, (route: { abort(): Promise<void> }) => route.abort());
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const png = PNG.sync.read(await page.screenshot({ fullPage: true }));
    await page.close();
    return png;
  }

  for (const mode of MODES) {
    it(`${mode.name}: tool output differs from the hand-made sample by at most ${THRESHOLD * 100}%`, async () => {
      const a = await shot(documentFor(css, original, mode.editor), mode.width);
      const b = await shot(documentFor(css, converted, mode.editor), mode.width);
      await writeFile(path.join(outDir, `${mode.name}-orig.png`), PNG.sync.write(a));
      await writeFile(path.join(outDir, `${mode.name}-conv.png`), PNG.sync.write(b));
      expect({ width: b.width, height: b.height }).toEqual({ width: a.width, height: a.height });
      const diff = new PNG({ width: a.width, height: a.height });
      const pixels = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
      await writeFile(path.join(outDir, `${mode.name}-diff.png`), PNG.sync.write(diff));
      const ratio = pixels / (a.width * a.height);
      await writeFile(path.join(outDir, `${mode.name}-ratio.txt`), `${ratio}\n`);
      expect(ratio).toBeLessThanOrEqual(THRESHOLD);
    }, 60_000);
  }

  it('the comparison is sensitive: a changed title is detected', async () => {
    const a = await shot(documentFor(css, original, false), 1100);
    const b = await shot(documentFor(css, converted.replace('왜 생길까요?', '전혀 다른 제목입니다 정말로'), false), 1100);
    const same = a.width === b.width && a.height === b.height;
    const pixels = same ? pixelmatch(a.data, b.data, undefined, a.width, a.height, { threshold: 0.1 }) : Infinity;
    expect(pixels).toBeGreaterThan(0);
  }, 60_000);
});
