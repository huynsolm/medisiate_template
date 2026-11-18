import { cp, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runCompare } from '../../apps/cli/src/commands/compare.ts';
import { loadPlaywright, type Browser } from '../support/browser.ts';

const repo = path.resolve(import.meta.dirname, '../..');
const pw = await loadPlaywright();
const section = '<section class="cms type01"><div class="cms-inner"><div class="cms-header"><p class="cms-thin-title">비교 제목</p></div><div class="cms-visual"><img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22300%22/%3E" alt=""></div><div class="cms-description-box"><p class="cms-description">설명 글</p></div><div class="cms-visual"><img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22300%22/%3E" alt=""></div></div></section>';

describe.skipIf(!pw)('compare pages in Chromium (opened as local files)', () => {
  let browser: Browser;
  let root: string;

  beforeAll(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'cms-compare-browser-'));
    // 비교 페이지는 저장소 최상위의 reference CSS를 상대 경로로 읽는다
    await cp(path.join(repo, 'reference'), path.join(root, 'reference'), { recursive: true });
    await mkdir(path.join(root, 'cms/contents/01'), { recursive: true });
    await writeFile(path.join(root, 'cms/contents/01/a.html'), `<div class="cms-container">${section}</div>`);
    await writeFile(path.join(root, 'cms/contents/b.html'), `<div class="cms-container"><section class="cms type01"><p>둘째</p></section></div>`);
    expect(await runCompare(root, [])).toBe(0);
    browser = await pw!.chromium.launch();
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
  });

  it('sizes both sides, switches to the mobile width and keeps the review mark', async () => {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
    await page.route(/^https?:/u, (route: { abort(): Promise<void> }) => route.abort());
    await page.goto(pathToFileURL(path.join(root, 'output/compare/files/01/a.html')).href);
    const sizes = async (): Promise<Array<{ w: string; h: number }>> => page.evaluate(() => Array.from(document.querySelectorAll('iframe')).map((f) => ({ w: f.style.width, h: parseFloat(f.style.height) })));
    await expect.poll(async () => (await sizes()).every((s) => s.h > 0)).toBe(true);
    expect((await sizes()).every((s) => s.w === '1100px')).toBe(true);
    // 원본은 cms.css, 출력은 호스트 CSS가 실제로 적용된다(상대 경로가 맞음)
    const styled: number[] = await page.evaluate(() => Array.from(document.querySelectorAll('iframe')).map((f) => f.contentDocument!.styleSheets.length));
    expect(styled.every((n) => n > 0)).toBe(true);
    await page.getByRole('button', { name: '모바일 360' }).click();
    await expect.poll(async () => (await sizes()).every((s) => s.w === '360px' && s.h > 0)).toBe(true);
    await page.getByLabel('확인함').check();
    await page.getByRole('link', { name: '← 목록' }).click();
    await expect.poll(() => page.locator('tbody tr').count()).toBe(2);
    expect(await page.getByRole('checkbox', { name: '확인함: 01/a.html' }).isChecked()).toBe(true);
    await page.getByLabel('확인한 파일 숨기기').check();
    await expect.poll(() => page.locator('tbody tr').count()).toBe(1);
    await page.getByLabel('섹션').selectOption('blocks');
    await page.getByLabel('확인한 파일 숨기기').uncheck();
    await expect.poll(() => page.locator('tbody tr').count()).toBe(1);
    await page.close();
  }, 60_000);
});
