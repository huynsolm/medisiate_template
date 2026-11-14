import { classifyImageSrc, type FieldSpec, type ImageRef } from '@cms-medisay/core';
import type { Path } from './state.ts';

type OnChange = (path: Path, value: unknown) => void;

function ImageEditor({ label, value, path, onChange }: { label: string; value: ImageRef | undefined; path: Path; onChange: OnChange }) {
  const set = (patch: Partial<ImageRef>) => {
    const next = { src: '', alt: '', ...value, ...patch };
    if (!next.src) return onChange(path, undefined);
    onChange(path, { ...next, kind: classifyImageSrc(next.src) });
  };
  const num = (v: string) => (/^\d+$/u.test(v) && Number(v) > 0 ? Number(v) : undefined);
  return (
    <fieldset className="image-field">
      <legend>{label}</legend>
      <label>
        주소
        <input value={value?.src ?? ''} placeholder="/api/file/..." onChange={(e) => set({ src: e.target.value })} />
      </label>
      <label>
        대체 텍스트 (장식이면 비움)
        <input value={value?.alt ?? ''} onChange={(e) => set({ alt: e.target.value })} disabled={!value} />
      </label>
      <div className="row">
        <label>
          너비
          <input inputMode="numeric" value={value?.width ?? ''} onChange={(e) => set({ width: num(e.target.value) })} disabled={!value} />
        </label>
        <label>
          높이
          <input inputMode="numeric" value={value?.height ?? ''} onChange={(e) => set({ height: num(e.target.value) })} disabled={!value} />
        </label>
      </div>
      {value?.kind === 'http' && <p className="hint warn">http:// 이미지는 https 사이트에서 막힐 수 있습니다.</p>}
    </fieldset>
  );
}

function Field({ spec, value, path, onChange }: { spec: FieldSpec; value: unknown; path: Path; onChange: OnChange }) {
  const id = path.join('.');
  const help = spec.help && <p className="hint">{spec.help}</p>;
  switch (spec.kind) {
    case 'text':
    case 'color':
      return (
        <label htmlFor={id}>
          {spec.label}
          <input id={id} value={(value as string | undefined) ?? ''} onChange={(e) => onChange(path, e.target.value || undefined)} />
          {help}
        </label>
      );
    case 'richText':
    case 'textarea':
      return (
        <label htmlFor={id}>
          {spec.label}
          <textarea id={id} rows={spec.kind === 'textarea' ? 5 : 2} value={(value as string | undefined) ?? ''} onChange={(e) => onChange(path, e.target.value || undefined)} />
          {help}
        </label>
      );
    case 'number':
      return (
        <label htmlFor={id}>
          {spec.label}
          <input id={id} type="number" min={spec.min} max={spec.max} value={(value as number | undefined) ?? ''} onChange={(e) => onChange(path, e.target.value === '' ? undefined : Number(e.target.value))} />
        </label>
      );
    case 'checkbox':
      return (
        <label className="check">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(path, e.target.checked || undefined)} />
          {spec.label}
        </label>
      );
    case 'select':
      return (
        <label htmlFor={id}>
          {spec.label}
          <select id={id} value={(value as string | undefined) ?? ''} onChange={(e) => onChange(path, e.target.value || undefined)}>
            <option value="">(기본)</option>
            {spec.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      );
    case 'image':
      return <ImageEditor label={spec.label} value={value as ImageRef | undefined} path={path} onChange={onChange} />;
    case 'imagePair': {
      const pair = (value as { pc?: ImageRef; mo?: ImageRef } | undefined) ?? {};
      return (
        <div className="pair">
          <p className="field-title">{spec.label}</p>
          <ImageEditor label="PC" value={pair.pc} path={[...path, 'pc']} onChange={onChange} />
          <ImageEditor label="모바일" value={pair.mo} path={[...path, 'mo']} onChange={onChange} />
          <p className="hint">하나만 넣으면 PC/모바일 구분 없이 한 장만 출력합니다.</p>
        </div>
      );
    }
    case 'repeat': {
      const items = (value as unknown[] | undefined) ?? [];
      const set = (next: unknown[]) => onChange(path, next);
      const move = (i: number, d: number) => {
        const next = [...items];
        [next[i], next[i + d]] = [next[i + d], next[i]];
        set(next);
      };
      return (
        <div className="repeat">
          <p className="field-title">
            {spec.label} <span className="count">{items.length}개</span>
          </p>
          {items.map((item, i) => (
            <div className="repeat-item" key={i}>
              <div className="repeat-head">
                <strong>#{i + 1}</strong>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="위로">↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="아래로">↓</button>
                <button type="button" onClick={() => set([...items.slice(0, i + 1), structuredClone(item), ...items.slice(i + 1)])}>복제</button>
                <button type="button" onClick={() => set(items.filter((_, j) => j !== i))} disabled={items.length <= (spec.min ?? 0)}>
                  삭제
                </button>
              </div>
              {spec.fields?.map((f) => (
                <Field key={f.key} spec={f} value={(item as Record<string, unknown>)[f.key]} path={[...path, i, f.key]} onChange={onChange} />
              ))}
            </div>
          ))}
          <button type="button" onClick={() => set([...items, structuredClone(items.at(-1) ?? {})])} disabled={spec.max !== undefined && items.length >= spec.max}>
            + 항목 추가
          </button>
        </div>
      );
    }
  }
}

export function FieldForm({ fields, data, onChange }: { fields: FieldSpec[]; data: unknown; onChange: OnChange }) {
  return (
    <div className="field-form">
      {fields.map((f) => (
        <Field key={f.key} spec={f} value={(data as Record<string, unknown> | undefined)?.[f.key]} path={[f.key]} onChange={onChange} />
      ))}
    </div>
  );
}
