import {
  CORE_VERSION,
  FALLBACK_ID,
  type PageModel,
  type SectionModel,
  type SectionModifiers,
  type Theme,
  type TypeRegistry,
} from '@cms-medisay/core';
import manifest from '../../../reference/host-css.manifest.json';

export type Path = Array<string | number>;

export interface EditorState {
  page: PageModel;
  selectedId: string | null;
}

export type Action =
  | { type: 'add'; typeId: string }
  | { type: 'remove'; id: string }
  | { type: 'duplicate'; id: string }
  | { type: 'move'; id: string; delta: -1 | 1 }
  | { type: 'select'; id: string }
  | { type: 'setData'; id: string; path: Path; value: unknown }
  | { type: 'setVariant'; id: string; variant: string }
  | { type: 'setModifiers'; id: string; modifiers: SectionModifiers }
  | { type: 'setTheme'; theme: Theme }
  | { type: 'load'; page: PageModel };

export const HOST_CSS = { sha256: manifest.sha256, savedAt: manifest.savedAt };

export function emptyPage(): PageModel {
  return {
    version: 1,
    theme: { primary: '#c7b195', source: 'default' },
    sections: [],
    diagnostics: [],
    meta: { coreVersion: CORE_VERSION, hostCss: HOST_CSS },
  };
}

/** 값 사이 공유가 없도록 깊은 복사 */
const clone = <T>(value: T): T => structuredClone(value);

export function setIn(target: unknown, path: Path, value: unknown): unknown {
  if (!path.length) return value;
  const [head, ...rest] = path;
  if (typeof head === 'number') {
    const arr = Array.isArray(target) ? [...target] : [];
    arr[head] = setIn(arr[head], rest, value);
    return arr;
  }
  const obj = target && typeof target === 'object' ? { ...(target as Record<string, unknown>) } : {};
  const next = setIn(obj[head!], rest, value);
  if (next === undefined) delete obj[head!];
  else obj[head!] = next;
  return obj;
}

function nextId(page: PageModel): string {
  const used = new Set(page.sections.map((s) => s.id));
  let n = page.sections.length + 1;
  while (used.has(`s${n}`)) n += 1;
  return `s${n}`;
}

export function createReducer(registry: TypeRegistry) {
  return function reducer(state: EditorState, action: Action): EditorState {
    const sections = state.page.sections;
    const update = (next: SectionModel[], selectedId = state.selectedId): EditorState => ({
      page: { ...state.page, sections: next },
      selectedId,
    });
    const index = 'id' in action ? sections.findIndex((s) => s.id === action.id) : -1;

    switch (action.type) {
      case 'add': {
        const def = registry.get(action.typeId);
        if (!def) return state;
        const section: SectionModel = { id: nextId(state.page), type: def.id, variant: def.variants[0] ?? 'default', modifiers: {}, data: clone(def.defaults) };
        return update([...sections, section], section.id);
      }
      case 'remove': {
        if (index < 0) return state;
        const next = sections.filter((s) => s.id !== action.id);
        return update(next, next[Math.min(index, next.length - 1)]?.id ?? null);
      }
      case 'duplicate': {
        if (index < 0) return state;
        const copy = { ...clone(sections[index]!), id: nextId(state.page) };
        delete copy.source;
        const next = [...sections];
        next.splice(index + 1, 0, copy);
        return update(next, copy.id);
      }
      case 'move': {
        const to = index + action.delta;
        if (index < 0 || to < 0 || to >= sections.length) return state;
        const next = [...sections];
        [next[index], next[to]] = [next[to]!, next[index]!];
        return update(next);
      }
      case 'select':
        return { ...state, selectedId: action.id };
      case 'setData':
        if (index < 0) return state;
        return update(sections.map((s, i) => (i === index ? { ...s, data: setIn(s.data, action.path, action.value) } : s)));
      case 'setVariant':
        return update(sections.map((s, i) => (i === index ? { ...s, variant: action.variant } : s)));
      case 'setModifiers':
        return update(sections.map((s, i) => (i === index ? { ...s, modifiers: action.modifiers } : s)));
      case 'setTheme':
        return { ...state, page: { ...state.page, theme: action.theme } };
      case 'load':
        return { page: action.page, selectedId: action.page.sections[0]?.id ?? null };
    }
  };
}

export const isFallback = (s: SectionModel) => s.type === FALLBACK_ID;
