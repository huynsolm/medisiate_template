import { describe, expect, it } from 'vitest';
import { parsePageModel, safeParsePageModel } from '../src/schema/page.ts';

const minimal = {
  version: 1,
  theme: { primary: '#c7b195', source: 'default' },
  sections: [{ id: 's1', type: 'type00', variant: 'default', modifiers: {}, data: { title: '여드름' } }],
  diagnostics: [],
  meta: { coreVersion: '0.1.0', hostCss: { sha256: 'abc', savedAt: '2026-11-13' } },
};

describe('PageModel schema', () => {
  it('accepts a minimal page', () => {
    const page = parsePageModel(minimal);
    expect(page.sections[0]?.type).toBe('type00');
  });

  it('fills modifiers with an empty object when omitted', () => {
    const section: Record<string, unknown> = { ...minimal.sections[0]! };
    delete section.modifiers;
    const page = parsePageModel({ ...minimal, sections: [section] });
    expect(page.sections[0]?.modifiers).toEqual({});
  });

  it('rejects an unknown version', () => {
    expect(safeParsePageModel({ ...minimal, version: 2 }).success).toBe(false);
  });

  it('rejects an invalid primary color', () => {
    expect(safeParsePageModel({ ...minimal, theme: { primary: 'red;x', source: 'default' } }).success).toBe(false);
  });

  it('rejects unsafe full-bleed padding (I-4)', () => {
    const s = { ...minimal.sections[0]!, modifiers: { fullBleed: { paddingY: '0; color: red' } } };
    expect(safeParsePageModel({ ...minimal, sections: [s] }).success).toBe(false);
    const ok = { ...minimal.sections[0]!, modifiers: { fullBleed: { paddingY: '70px' } } };
    expect(safeParsePageModel({ ...minimal, sections: [ok] }).success).toBe(true);
  });

  it('rejects an unknown diagnostic level', () => {
    const bad = { ...minimal, diagnostics: [{ level: 'fatal', code: 'UNSUPPORTED_TYPE', message: 'x' }] };
    expect(safeParsePageModel(bad).success).toBe(false);
  });

  it('rejects duplicate section ids', () => {
    const s = minimal.sections[0]!;
    expect(safeParsePageModel({ ...minimal, sections: [s, s] }).success).toBe(false);
  });
});
