import type { SectionModifiers } from '@cms-medisay/core';

/** 모든 섹션 공통 옵션: 배경, 풀블리드, 흰 글자 */
export function ModifiersForm({ value, onChange }: { value: SectionModifiers; onChange: (m: SectionModifiers) => void }) {
  const bg = value.background;
  const set = (patch: Partial<SectionModifiers>) => {
    const next: SectionModifiers = { ...value, ...patch };
    for (const k of Object.keys(next) as Array<keyof SectionModifiers>) if (next[k] === undefined) delete next[k];
    onChange(next);
  };
  return (
    <fieldset className="modifiers">
      <legend>섹션 공통 옵션</legend>
      <label>
        배경
        <select
          value={bg?.kind ?? ''}
          onChange={(e) => {
            const kind = e.target.value as '' | 'color' | 'image';
            set({ background: kind ? { kind, value: bg?.kind === kind ? bg.value : kind === 'color' ? '#f4f4f4' : '' } : undefined });
          }}
        >
          <option value="">없음</option>
          <option value="color">색</option>
          <option value="image">이미지</option>
        </select>
      </label>
      {bg && (
        <label>
          {bg.kind === 'color' ? '배경색' : '배경 이미지 주소'}
          <input value={bg.value} onChange={(e) => set({ background: { ...bg, value: e.target.value } })} />
        </label>
      )}
      {bg?.kind === 'image' && (
        <label>
          어둡게 덮을 색 (예: rgba(0,0,0,0.5))
          <input
            value={bg.overlay ?? ''}
            onChange={(e) => {
              const { overlay: _old, ...rest } = bg;
              void _old;
              set({ background: e.target.value ? { ...rest, overlay: e.target.value } : rest });
            }}
          />
        </label>
      )}
      {bg?.kind === 'image' && (
        <label>
          모바일 전용 배경 이미지 (비우면 PC와 같음)
          <input
            value={bg.mobile?.value ?? ''}
            onChange={(e) => {
              const { mobile: _old, ...rest } = bg;
              void _old;
              set({ background: e.target.value ? { ...rest, mobile: { value: e.target.value } } : rest });
            }}
          />
        </label>
      )}
      <label className="check">
        <input type="checkbox" checked={Boolean(value.fullBleed)} onChange={(e) => set({ fullBleed: e.target.checked ? { paddingY: '70px' } : undefined })} />
        화면 전체 폭 (일반 모드)
      </label>
      {value.fullBleed && (
        <label>
          위아래 여백
          <input value={value.fullBleed.paddingY ?? ''} onChange={(e) => set({ fullBleed: e.target.value ? { paddingY: e.target.value } : {} })} />
        </label>
      )}
      <label className="check">
        <input type="checkbox" checked={Boolean(value.textWhite)} onChange={(e) => set({ textWhite: e.target.checked || undefined })} />
        흰 글자
      </label>
    </fieldset>
  );
}
