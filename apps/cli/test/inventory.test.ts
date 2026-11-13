import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { buildInventory, writeInventory } from '../src/commands/inventory.js';

describe('inventory', () => {
  it('parses the complete contents tree and writes both reports', async () => {
    const root = path.resolve(import.meta.dirname, '../../..');
    const inventory = await buildInventory(root);

    expect(inventory.summary.htmlFileCount).toBe(703);
    expect(inventory.files).toHaveLength(703);
    expect(inventory.nonTargetFiles).toHaveLength(12);
    expect(inventory.typeSectionCounts.type01).toBeGreaterThan(0);
    expect(inventory.variantClassCounts['type-bg']).toBeGreaterThan(0);
    expect(inventory.summary.filesWithScript).toBeGreaterThan(0);
    expect(inventory.summary.filesWithStyle).toBeGreaterThan(0);
    expect(inventory.images.counts.https).toBeGreaterThan(0);
    expect(inventory.images.locations.length).toBe(
      Object.values(inventory.images.counts).reduce((sum, count) => sum + count, 0),
    );
    expect(inventory.nonContentFiles.length).toBeGreaterThan(0);
    expect(inventory.comparison.notes.length).toBeGreaterThan(0);
    expect(inventory.comparison.typeCountDifferences.some((item) => item.type === 'type01')).toBe(true);
    expect(inventory.comparison.variantCountDifferences.some((item) => item.className === 'type-bg')).toBe(true);
    expect(inventory.comparison.notes.some((note) => note.includes('제안서 재집계 151'))).toBe(true);

    await writeInventory(root, inventory);
    const json = JSON.parse(await readFile(path.join(root, 'output/reports/inventory.json'), 'utf8')) as typeof inventory;
    const markdown = await readFile(path.join(root, 'output/reports/inventory.md'), 'utf8');
    expect(json.summary.htmlFileCount).toBe(703);
    expect(markdown).toContain('## 계획서·제안서 수치 비교');
  }, 30_000);
});
