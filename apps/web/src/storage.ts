const KEY = 'cms-inline-editor:draft';

/** 초안 저장은 편의 기능이다. 저장소가 막혀 있어도 편집은 계속 된다. */
export function loadDraft(): unknown {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

export function saveDraft(value: unknown): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* 저장 실패는 무시 */
  }
}
