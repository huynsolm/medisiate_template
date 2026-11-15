import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { convertDocument, defaultRegistry } from '@cms-medisay/core';
import { loadPlaywright, type Browser } from '../support/browser.ts';

const repo = path.resolve(import.meta.dirname, '../..');
const pw = await loadPlaywright();
// 3단계 P2 + P3, 4단계 P4 타입
const TYPES = ['type07', 'type09', 'type10', 'type02', 'type03', 'type26', 'type11', 'type04', 'type25', 'type15', 'type17', 'type18', 'type23', 'type13', 'type06', 'type16', 'type14', 'type19'] as const;
// 원래 크기가 큰 이미지: 호스트 CSS가 이미지 칸을 줄이지 않을 때(flex-shrink: 0) 넘침을 드러낸다.
const big = (label: string, color: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="100%" height="100%" fill="${color}"/><text x="40" y="80" font-size="48">${label}</text></svg>`)}`;

/** 3단계 P2·P3, 4단계 P4 타입(원본 마크업 → 호스트 프리셋)이 호스트 CSS 위에서 넘치거나 찌그러지지 않는지 */
describe.skipIf(!pw)('P2/P3/P4 preset types on the host css', () => {
  let browser: Browser;
  let css: string;
  const html: Record<string, string> = {};

  beforeAll(async () => {
    browser = await pw!.chromium.launch();
    css = await readFile(path.join(repo, 'reference/host-style.css'), 'utf8');
    const opts = { registry: defaultRegistry, theme: { primary: '#164aa0', source: 'default' as const }, coreVersion: '0', hostCss: { sha256: '', savedAt: '' } };
    for (const id of TYPES) {
      const body = (await readFile(path.join(repo, 'fixtures/original', `${id}.html`), 'utf8'))
        .replaceAll('/images/cms-sample-m.svg', big('MO', '#c98'))
        .replaceAll('/images/cms-sample.svg', big('PC', '#79c'));
      html[id] = convertDocument(`<div class="cms-container">${body}</div>`, `${id}.html`, opts).html;
    }
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
  });

  async function measure(body: string, width: number, editor: boolean) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    // 출력은 loading="lazy"라 화면 밖 이미지를 불러오지 않는다. 이미지 크기가 배치에 반영되도록 테스트에서만 즉시 불러온다.
    const eager = body.replaceAll('loading="lazy"', 'loading="eager"');
    await page.setContent(`<!doctype html><html${editor ? ' class="design-edit-page"' : ''}><head><style>${css}</style></head><body>${eager}</body></html>`);
    await page.evaluate(() => Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => undefined))));
    const result = await page.evaluate(() => {
      const rect = (el: Element) => el.getBoundingClientRect();
      const nested = Array.from(document.querySelectorAll('.mig-item .mig-list > .mig-item')).map((li) => {
        const card = li.parentElement!.closest('.mig-item')!;
        return rect(li).right - rect(card).right;
      });
      return {
        scrollWidth: document.documentElement.scrollWidth,
        textWidths: Array.from(document.querySelectorAll('.type-03 .mig-text-wrap, .type-04 .mig-text-wrap')).map((el) => rect(el).width),
        sectionWidth: rect(document.querySelector('section.mig-section')!).width,
        // 본문(.mig-body)이 섹션 안쪽 폭을 다 써야 한다. 배경 섹션은 호스트가 가운데 정렬 flex라 내용 폭으로 줄어들 수 있다.
        bodyRatio: (() => {
          const section = document.querySelector('section.mig-section')!;
          const cs = getComputedStyle(section);
          const inner = rect(section).width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
          return rect(section.querySelector(':scope > .mig-body')!).width / inner;
        })(),
        nestedOverflow: Math.max(0, ...nested),
        // 프리셋 표(.mig-table)는 호스트가 min-width: 0으로 화면 폭에 맞춘다. 표가 화면 밖으로 나가지 않아야 한다
        tables: Array.from(document.querySelectorAll('.table-responsive')).map((el) => ({ scroll: el.scrollWidth, client: el.clientWidth, right: rect(el).right })),
      };
    });
    await page.close();
    return result;
  }

  for (const id of TYPES) {
    for (const [label, width, editor] of [['PC 1100', 1100, false], ['MO 360', 360, false], ['editor 1100', 1100, true]] as const) {
      it(`${id} · ${label}: no horizontal overflow, text not squeezed, nested lists inside cards, tables fit, body uses the full width`, async () => {
        const r = await measure(html[id]!, width, editor);
        expect(r.scrollWidth).toBeLessThanOrEqual(width);
        for (const w of r.textWidths) expect(w).toBeGreaterThan(r.sectionWidth * (width >= 1024 && !editor ? 0.3 : 0.6));
        expect(r.nestedOverflow).toBeLessThanOrEqual(0.5);
        expect(r.bodyRatio).toBeGreaterThan(0.99);
        for (const t of r.tables) {
          expect(t.right).toBeLessThanOrEqual(width);
          expect(t.scroll).toBeLessThanOrEqual(t.client);
        }
      }, 30_000);
    }
  }
});
