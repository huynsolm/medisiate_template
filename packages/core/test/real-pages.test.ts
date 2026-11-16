import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { convertDocument } from '../src/convert/convert-document.ts';
import { defaultRegistry } from '../src/types/index.ts';

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
});
