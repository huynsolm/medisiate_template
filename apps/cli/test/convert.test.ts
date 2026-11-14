import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { runConvert } from '../src/commands/convert.ts';

const repo = path.resolve(import.meta.dirname, '../../..');
let root: string;

const page = (body: string) => `<!--#include virtual="/inc/head.html" -->\n<div class="cms-container">${body}</div>`;

async function put(rel: string, content: string) {
  await mkdir(path.dirname(path.join(root, rel)), { recursive: true });
  await writeFile(path.join(root, rel), content);
}

async function hashTree(dir: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile()) continue;
    const full = path.join(entry.parentPath, entry.name);
    out[path.relative(dir, full)] = createHash('sha256').update(await readFile(full)).digest('hex');
  }
  return out;
}

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'cms-convert-'));
  await mkdir(path.join(root, 'reference'), { recursive: true });
  await cp(path.join(repo, 'reference/host-css.manifest.json'), path.join(root, 'reference/host-css.manifest.json'));
  await put('config/themes/default.json', '{ "primary": "#c7b195" }');
  await put('config/themes/01.json', '{ "primary": "#164aa0" }');
  await put('cms/contents/01/botox.html', page('<section class="cms type00"><h2>보톡스</h2></section><section class="cms type01"><img src="http://x/a.jpg"><p>설명</p></section>'));
  await put('cms/contents/01/filler.html', page('<section class="cms type01"><p>필러</p></section><section class="cms type26"><table><tr><td>가격</td></tr></table></section>'));
  await put('cms/contents/02/laser.html', page('<section class="cms type01"><img src="../img/l.jpg"><p>레이저</p></section>'));
  await put('cms/contents/include/menu.html', '<ul><li>메뉴</li></ul>');
  await put('cms/contents/01/old.html.bak', 'old');
});

describe('convert', () => {
  it('converts every html file 1:1 and writes reports', async () => {
    const before = await hashTree(path.join(root, 'cms'));
    const code = await runConvert(root, ['--all']);
    expect(code).toBe(0);

    for (const rel of ['01/botox', '01/filler', '02/laser', 'include/menu']) {
      await readFile(path.join(root, 'output/contents', `${rel}.html`), 'utf8');
      JSON.parse(await readFile(path.join(root, 'output/data', `${rel}.json`), 'utf8'));
    }
    const botox = await readFile(path.join(root, 'output/contents/01/botox.html'), 'utf8');
    expect(botox).toContain('--mig-primary-color: #164aa0;');
    expect(botox).toContain('src="http://x/a.jpg"');
    const laser = await readFile(path.join(root, 'output/contents/02/laser.html'), 'utf8');
    expect(laser).toContain('--mig-primary-color: #c7b195;');

    const report = JSON.parse(await readFile(path.join(root, 'output/reports/report.json'), 'utf8'));
    // http·상대경로 이미지는 warn이라 botox·laser도 partial (리뷰 결정 2)
    expect(report.summary).toMatchObject({ total: 4, success: 0, partial: 3, failed: 1 });
    expect(report.nonTargetFiles).toEqual(['01/old.html.bak']);
    expect(report.hostCss.sha256).toMatch(/^00657D80/u);

    const csv = await readFile(path.join(root, 'output/reports/report.csv'), 'utf8');
    expect(csv.split('\n')[0]).toBe('file,status,types,fallbackCount,warnCount,errorCount,httpImages,relativeImages');
    expect(csv).toContain('01/filler.html,partial,type01|type26,1,');

    const images = await readFile(path.join(root, 'output/reports/images.csv'), 'utf8');
    expect(images).toContain('01/botox.html,2,http://x/a.jpg,http');
    expect(images).toContain('02/laser.html,1,../img/l.jpg,relative');

    const unsupported = await readFile(path.join(root, 'output/reports/unsupported.csv'), 'utf8');
    expect(unsupported).toContain('01/filler.html,2,type26');

    const summary = await readFile(path.join(root, 'output/reports/summary.md'), 'utf8');
    expect(summary).toContain('| partial | 3 |');
    expect(summary).toContain('type26');

    expect(await hashTree(path.join(root, 'cms'))).toEqual(before);
  });

  it('converts one directory and rebuilds reports from all existing data', async () => {
    await runConvert(root, ['--all']);
    await put('cms/contents/02/laser.html', page('<section class="cms type27"><p>바뀜</p></section>'));
    const code = await runConvert(root, ['--dir', 'cms/contents/02']);
    expect(code).toBe(0);
    const report = JSON.parse(await readFile(path.join(root, 'output/reports/report.json'), 'utf8'));
    expect(report.summary.total).toBe(4);
    expect(report.files.find((f: { file: string }) => f.file === '02/laser.html').status).toBe('failed');
  });

  it('converts a single file', async () => {
    expect(await runConvert(root, ['--file', 'cms/contents/01/botox.html'])).toBe(0);
    const report = JSON.parse(await readFile(path.join(root, 'output/reports/report.json'), 'utf8'));
    expect(report.summary.total).toBe(1);
  });

  it('refuses paths outside cms/contents and missing selections', async () => {
    expect(await runConvert(root, ['--dir', '../etc'])).toBe(1);
    expect(await runConvert(root, [])).toBe(1);
  });

  it('honours --fail-on', async () => {
    expect(await runConvert(root, ['--all', '--fail-on', 'warn'])).toBe(2);
  });
});
