import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { build } from 'vite';
import { defaultRegistry, parsePageModel, renderPage } from '@cms-medisay/core';
import { loadPlaywright, type Browser, type Page } from '../support/browser.ts';
import { serveStatic } from '../support/static-server.ts';

const repo = path.resolve(import.meta.dirname, '../..');
const pw = await loadPlaywright();

describe.skipIf(!pw)('web editor (built app in Chromium)', () => {
  let server: Awaited<ReturnType<typeof serveStatic>>;
  let browser: Browser;

  beforeAll(async () => {
    const outDir = path.join(repo, 'output/test-web');
    await build({ configFile: path.join(repo, 'apps/web/vite.config.ts'), logLevel: 'error', build: { outDir, emptyOutDir: true } });
    server = await serveStatic(outDir);
    browser = await pw!.chromium.launch();
  }, 120_000);

  afterAll(async () => {
    await browser?.close();
    await server?.close();
  });

  it('loads the sample, matches CLI output byte for byte and switches preview modes', async () => {
    const page: Page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    // 미리보기 iframe의 외부 이미지 요청은 막는다
    await page.route(/^(?!http:\/\/127\.0\.0\.1).*/u, (route: { abort(): Promise<void> }) => route.abort());
    await page.goto(server.url);
    await page.getByRole('button', { name: '샘플 불러오기' }).click();
    await page.getByLabel('글자 크기 기준').selectOption('sample');

    const sample = parsePageModel(JSON.parse(readFileSync(path.join(repo, 'fixtures/sample-acne/page.json'), 'utf8')));
    const cli = renderPage(sample, { registry: defaultRegistry, fluidRange: 'sample' }).html;
    expect(await page.getByLabel('HTML 소스').inputValue()).toBe(cli);

    await page.getByRole('tab', { name: '에디터 화면' }).click();
    const frame = page.frameLocator('iframe[data-mode="editor"]');
    await expect.poll(() => frame.locator('html').getAttribute('class')).toBe('design-edit-page');
    await page.getByRole('tab', { name: '모바일 360' }).click();
    expect(await page.locator('iframe[data-mode="mo"]').evaluate((el: Element) => (el as HTMLIFrameElement).offsetWidth)).toBe(360);

    // 폼 편집이 출력에 반영되는지
    await page.getByRole('button', { name: /4 일반: 단계 목록/u }).click();
    await page.locator('#title').fill('바뀐 제목');
    expect(await page.getByLabel('HTML 소스').inputValue()).toContain('바뀐 제목');
    await page.close();
  }, 60_000);

  it('builds a page from scratch with a preset type', async () => {
    const page: Page = await browser.newPage();
    await page.goto(server.url);
    await page.getByRole('button', { name: '새 페이지' }).click();
    await page.getByLabel('추가할 타입').selectOption('type01');
    await page.getByRole('button', { name: '섹션 추가' }).click();
    const html = await page.getByLabel('HTML 소스').inputValue();
    expect(html).toContain('<div class="mig-container">');
    expect(html).toContain('class="mig-section type-01"');
    await page.close();
  }, 30_000);
});
