import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { convertDocument } from '../src/convert/convert-document.ts';
import { defaultRegistry } from '../src/types/index.ts';
import { outerHtml, parseHtmlFragment, plainText } from '../src/parse/dom.ts';
import { sourceSections } from '../src/parse/sections.ts';

const root = path.resolve(import.meta.dirname, '../../..');
const contents = path.join(root, 'cms/contents');
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = path.join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : [];
});
const opts = { registry: defaultRegistry, theme: { primary: '#164aa0', source: 'default' as const }, coreVersion: '0', hostCss: { sha256: 'x', savedAt: 'y' } };

// 실제 페이지 703개(로컬 cms/, reference/cms-original 복사본)가 있는 환경에서만 실행한다.
describe.skipIf(!existsSync(contents))('real pages', () => {
  it('parsers never produce data their own schema rejects (no INVALID_DATA)', () => {
    const invalid: string[] = [];
    for (const file of walk(contents)) {
      const rel = path.relative(contents, file);
      const result = convertDocument(readFileSync(file, 'utf8'), rel, opts);
      for (const d of result.page.diagnostics) if (d.code === 'INVALID_DATA') invalid.push(`${rel}: ${d.message}`);
    }
    expect(invalid).toEqual([]);
  }, 300_000);

  // 검수(docs/review-real-pages.md I-3)가 찾은 방식: 변환된 섹션마다 원본·출력의 글을 공백 없이 순서까지 비교한다.
  // 글을 모두 담았는지만 보는 검사로는 순서가 바뀐 것(표 뒤 주의 글이 앞으로 등)을 잡지 못했다.
  it('every converted section keeps the original text in the same order', () => {
    const squash = (s: string) => s.replace(/\s+/gu, '');
    const text = (html: string) => squash(plainText(parseHtmlFragment(html.replace(/<!--[\s\S]*?-->|<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gu, '')) as never));
    const mismatched: string[] = [];
    let compared = 0;
    for (const file of walk(contents)) {
      const rel = path.relative(contents, file);
      for (const section of sourceSections(readFileSync(file, 'utf8'), rel)) {
        const source = outerHtml(section.element);
        const result = convertDocument(`<div class="cms-container">${source}</div>`, rel, opts);
        const converted = result.page.sections[0];
        if (result.page.sections.length !== 1 || !converted || converted.type === 'fallback') continue;
        compared++;
        // type24는 원본 CSS 카운터 번호를 글로 출력한다(합의된 생성 글) → 비교에서 뺀다
        const output = result.html.replace(/<span class="mig-num">\d+<\/span>/gu, converted.type === 'type24' ? '' : '$&');
        if (text(source) !== text(output)) mismatched.push(`${converted.type} ${rel}#${section.index}`);
      }
    }
    expect(compared).toBeGreaterThan(2500);
    expect(mismatched).toEqual([]);
  }, 600_000);
});
