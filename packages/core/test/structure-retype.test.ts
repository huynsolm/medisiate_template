import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { classesOf, descendants } from '../src/parse/dom.ts';
import { sourceSections } from '../src/parse/sections.ts';
import { STRUCTURE_CLASSES } from '../src/types/structure-classes.ts';
import { convert } from './support/original.ts';

const root = path.resolve(import.meta.dirname, '../../..');
const dir = path.join(root, 'reference/cms-original/component');

// 실제 페이지(13168 평발 #4)와 같은 모양: type02로 적혔지만 type17의 행 목록(cms-row-list)
const rowList = (extra = '') => `<section class="cms type02 type-bg"><div class="cms-inner"><div class="cms-header top-border"><p class="cms-eyebrow">평발은</p><p class="cms-title">어떻게 치료하나요?</p></div><div class="cms-list-wrap"><ol class="cms-row-list text-type-1"><li class="cms-list-item"><div class="cms-description-box row"><p class="cms-title col-auto">비수술 치료</p><p class="cms-description col">약물 치료, 물리 치료</p></div></li><li class="cms-list-item"><div class="cms-description-box row"><p class="cms-title col-auto">수술 치료</p><p class="cms-description col">건 이전술</p></div></li></ol></div>${extra}</div></section>`;

describe('structure retype: a section is converted as the original tool type with the same structure', () => {
  it('the structure table matches the original components', () => {
    const fresh: Record<string, string[]> = {};
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.html')).sort()) {
      const set = new Set<string>();
      for (const s of sourceSections(readFileSync(path.join(dir, f), 'utf8'), f)) for (const el of descendants(s.element)) for (const c of classesOf(el)) if (c.startsWith('cms-')) set.add(c);
      fresh[f.replace('.html', '')] = [...set].sort();
    }
    expect(STRUCTURE_CLASSES).toEqual(fresh);
  });

  it('type02 written, type17 row list inside → converted as type17 with an info diagnostic', () => {
    const r = convert(rowList());
    const s = r.page.sections[0]!;
    expect(s.type).toBe('type17');
    expect(s.source?.classList).toContain('type02');
    const d = r.page.diagnostics.find((x) => x.code === 'STRUCTURE_RETYPED');
    expect(d?.level).toBe('info');
    expect(d?.detail).toMatchObject({ declared: 'type02', used: 'type17' });
    expect(r.page.diagnostics.some((x) => x.code === 'LOSSY_PARSE')).toBe(false);
    expect(r.html).toContain('type-17');
  });

  it('loss checks still apply to the other type: an extra paragraph keeps the original', () => {
    const r = convert(rowList('<p>끼어든 문단</p>'));
    expect(r.page.sections[0]!.type).toBe('fallback');
    expect(r.page.diagnostics.some((x) => x.code === 'STRUCTURE_RETYPED')).toBe(false);
    expect(r.page.diagnostics.some((x) => x.code === 'LOSSY_PARSE' && x.message.startsWith('type02'))).toBe(true);
  });

  it('a class that no single original type uses keeps the original (no guessing)', () => {
    const r = convert(rowList('<div class="cms-table-wrap"><table class="cms-table"><tbody><tr><td>표</td></tr></tbody></table></div>'));
    expect(r.page.sections[0]!.type).toBe('fallback');
  });

  it('only common classes (header + description) is not a structure match', () => {
    const r = convert('<section class="cms type02"><div class="cms-inner"><div class="cms-header"><p class="cms-title">제목</p></div><div class="cms-description-box"><p class="cms-description">글</p><img src="https://example.com/a.png" alt=""><img src="https://example.com/b.png" alt=""><img src="https://example.com/c.png" alt=""></div></div></section>');
    expect(r.page.diagnostics.some((x) => x.code === 'STRUCTURE_RETYPED')).toBe(false);
  });
});
