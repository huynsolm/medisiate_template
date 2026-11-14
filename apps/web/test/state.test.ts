import { describe, expect, it } from 'vitest';
import { defaultRegistry } from '@cms-medisay/core';
import { createReducer, emptyPage, setIn, type EditorState } from '../src/state.ts';
import { previewDocument, renderForWeb } from '../src/render.ts';

const reducer = createReducer(defaultRegistry);
const start = (): EditorState => ({ page: emptyPage(), selectedId: null });

describe('editor reducer', () => {
  it('adds a section with the type defaults and selects it', () => {
    const s = reducer(start(), { type: 'add', typeId: 'text-steps' });
    expect(s.page.sections).toHaveLength(1);
    expect(s.page.sections[0]).toMatchObject({ id: 's1', type: 'text-steps', variant: 'default', modifiers: {} });
    expect(s.selectedId).toBe('s1');
    // 기본값을 복사해야 한다 (타입 정의를 오염시키지 않음)
    expect(s.page.sections[0]!.data).not.toBe(defaultRegistry.get('text-steps')!.defaults);
  });

  it('ignores unknown types', () => {
    expect(reducer(start(), { type: 'add', typeId: 'nope' }).page.sections).toHaveLength(0);
  });

  it('duplicates, moves and removes with unique ids', () => {
    let s = reducer(start(), { type: 'add', typeId: 'type00' });
    s = reducer(s, { type: 'add', typeId: 'type01' });
    s = reducer(s, { type: 'duplicate', id: 's1' });
    expect(s.page.sections.map((x) => x.id)).toEqual(['s1', 's3', 's2']);
    s = reducer(s, { type: 'move', id: 's2', delta: -1 });
    expect(s.page.sections.map((x) => x.id)).toEqual(['s1', 's2', 's3']);
    s = reducer(s, { type: 'move', id: 's1', delta: -1 });
    expect(s.page.sections.map((x) => x.id)).toEqual(['s1', 's2', 's3']);
    s = reducer(s, { type: 'remove', id: 's3' });
    expect(s.selectedId).toBe('s2');
    s = reducer(s, { type: 'add', typeId: 'type00' });
    expect(new Set(s.page.sections.map((x) => x.id)).size).toBe(3);
  });

  it('sets nested data by path and removes cleared fields', () => {
    let s = reducer(start(), { type: 'add', typeId: 'text-steps' });
    s = reducer(s, { type: 'setData', id: 's1', path: ['items', 0, 'label'], value: '첫 단계' });
    expect((s.page.sections[0]!.data as { items: Array<{ label: string }> }).items[0]!.label).toBe('첫 단계');
    s = reducer(s, { type: 'setData', id: 's1', path: ['title'], value: undefined });
    expect(s.page.sections[0]!.data).not.toHaveProperty('title');
  });

  it('setIn does not mutate the input', () => {
    const input = { a: [{ b: 1 }] };
    const out = setIn(input, ['a', 0, 'b'], 2);
    expect(input.a[0]!.b).toBe(1);
    expect(out).toEqual({ a: [{ b: 2 }] });
  });
});

describe('web render', () => {
  it('produces the same html as core renderPage', () => {
    let s = reducer(start(), { type: 'add', typeId: 'type01' });
    s = reducer(s, { type: 'add', typeId: 'text-hex' });
    expect(renderForWeb(s.page).html).toContain('mig-container');
    expect(renderForWeb(s.page).html).toContain('<clipPath');
  });

  it('marks the editor preview with design-edit-page and embeds host css', () => {
    expect(previewDocument('<p>x</p>', 'editor')).toContain('<html lang="ko" class="design-edit-page">');
    expect(previewDocument('<p>x</p>', 'pc')).toContain('<html lang="ko"><head>');
    expect(previewDocument('', 'mo')).toContain('.migration-content');
  });
});
