import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { defaultRegistry, safeParsePageModel, type PageModel } from '@cms-medisay/core';
import samplePage from '../../../fixtures/sample-acne/page.json';
import { FieldForm } from './FieldForm.tsx';
import { ModifiersForm } from './ModifiersForm.tsx';
import { Preview } from './Preview.tsx';
import { renderForWeb, type FluidRange } from './render.ts';
import { createReducer, emptyPage, isFallback, type EditorState } from './state.ts';
import { loadDraft, saveDraft } from './storage.ts';

const reducer = createReducer(defaultRegistry);
const pickable = defaultRegistry.list().filter((t) => !t.hidden);

function initialState(): EditorState {
  const draft = safeParsePageModel(loadDraft());
  const page = draft.success ? (draft.data as PageModel) : emptyPage();
  return { page, selectedId: page.sections[0]?.id ?? null };
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [fluidRange, setFluidRange] = useState<FluidRange>('host');
  const [addType, setAddType] = useState(pickable[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const { page, selectedId } = state;

  const result = useMemo(() => {
    try {
      return { ok: true as const, ...renderForWeb(page, fluidRange) };
    } catch (error) {
      return { ok: false as const, error: (error as Error).message, html: '', diagnostics: [] };
    }
  }, [page, fluidRange]);

  useEffect(() => saveDraft(page), [page]);

  const selected = page.sections.find((s) => s.id === selectedId);
  const def = selected ? defaultRegistry.get(selected.type) : undefined;

  const load = (input: unknown, label: string) => {
    const parsed = safeParsePageModel(input);
    if (!parsed.success) {
      setMessage(`${label}: 형식이 맞지 않습니다 (${parsed.error.issues[0]?.path.join('.')} ${parsed.error.issues[0]?.message})`);
      return;
    }
    dispatch({ type: 'load', page: parsed.data as PageModel });
    setMessage(`${label}을(를) 불러왔습니다.`);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.html);
      setMessage('HTML을 복사했습니다. 에디터 HTML 모드에 붙여 넣으세요.');
    } catch {
      setMessage('복사하지 못했습니다. 아래 소스를 직접 선택해 복사하세요.');
    }
  };

  const baseName = (page.source ?? 'page').replace(/^.*\//u, '').replace(/\.html$/u, '');

  return (
    <div className="app">
      <header className="topbar">
        <h1>CMS 인라인 편집기</h1>
        <div className="actions">
          <button onClick={() => dispatch({ type: 'load', page: emptyPage() })}>새 페이지</button>
          <button onClick={() => load(samplePage, '여드름 샘플')}>샘플 불러오기</button>
          <button onClick={() => fileInput.current?.click()}>JSON 불러오기</button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              try {
                load(JSON.parse(await file.text()), file.name);
              } catch {
                setMessage(`${file.name}: JSON을 읽지 못했습니다.`);
              }
            }}
          />
          <button onClick={() => download(`${baseName}.json`, `${JSON.stringify(page, null, 2)}\n`, 'application/json')}>JSON 저장</button>
        </div>
      </header>
      {message && (
        <p className="message" role="status">
          {message}
        </p>
      )}

      <aside className="sidebar">
        <fieldset>
          <legend>페이지</legend>
          <label>
            대표 색
            <span className="color-row">
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/iu.test(page.theme.primary) ? page.theme.primary : '#000000'}
                onChange={(e) => dispatch({ type: 'setTheme', theme: { ...page.theme, primary: e.target.value, source: 'file' } })}
              />
              <input value={page.theme.primary} onChange={(e) => dispatch({ type: 'setTheme', theme: { ...page.theme, primary: e.target.value, source: 'file' } })} />
            </span>
          </label>
          <label>
            글자 크기 기준
            <select value={fluidRange} onChange={(e) => setFluidRange(e.target.value as FluidRange)}>
              <option value="host">호스트 (375~1024px)</option>
              <option value="sample">샘플 호환 (375~992px)</option>
            </select>
          </label>
        </fieldset>

        <div className="add">
          <select aria-label="추가할 타입" value={addType} onChange={(e) => setAddType(e.target.value)}>
            {pickable.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <button onClick={() => dispatch({ type: 'add', typeId: addType })}>섹션 추가</button>
        </div>

        <ol className="section-list">
          {page.sections.map((s, i) => (
            <li key={s.id} className={[s.id === selectedId ? 'on' : '', isFallback(s) ? 'fallback' : ''].join(' ')}>
              <button className="pick" onClick={() => dispatch({ type: 'select', id: s.id })}>
                <span className="num">{i + 1}</span> {defaultRegistry.get(s.type)?.label ?? s.type}
              </button>
              <span className="tools">
                <button onClick={() => dispatch({ type: 'move', id: s.id, delta: -1 })} disabled={i === 0} aria-label="위로">↑</button>
                <button onClick={() => dispatch({ type: 'move', id: s.id, delta: 1 })} disabled={i === page.sections.length - 1} aria-label="아래로">↓</button>
                <button onClick={() => dispatch({ type: 'duplicate', id: s.id })} aria-label="복제">⧉</button>
                <button onClick={() => dispatch({ type: 'remove', id: s.id })} aria-label="삭제">✕</button>
              </span>
            </li>
          ))}
          {!page.sections.length && <li className="empty">섹션이 없습니다. 위에서 타입을 골라 추가하세요.</li>}
        </ol>
      </aside>

      <main className="editor">
        {selected && def ? (
          <>
            <h2>
              {selected.id} · {def.label}
            </h2>
            {def.variants.length > 1 && (
              <label>
                변형
                <select value={selected.variant} onChange={(e) => dispatch({ type: 'setVariant', id: selected.id, variant: e.target.value })}>
                  {def.variants.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            )}
            <FieldForm fields={def.fields} data={selected.data} onChange={(path, value) => dispatch({ type: 'setData', id: selected.id, path, value })} />
            <ModifiersForm value={selected.modifiers} onChange={(modifiers) => dispatch({ type: 'setModifiers', id: selected.id, modifiers })} />
          </>
        ) : selected ? (
          <p>알 수 없는 타입입니다: {selected.type}</p>
        ) : (
          <p className="empty">왼쪽에서 섹션을 고르세요.</p>
        )}
      </main>

      <section className="output">
        <Preview html={result.html} />
        <div className="diagnostics">
          <h2>진단 {result.diagnostics.length ? `(${result.diagnostics.length})` : ''}</h2>
          {!result.ok && <p className="error">렌더 실패: {result.error}</p>}
          <ul>
            {result.diagnostics.map((d, i) => (
              <li key={i} className={d.level}>
                <button
                  disabled={!d.sectionIndex}
                  onClick={() => d.sectionIndex && dispatch({ type: 'select', id: page.sections[d.sectionIndex - 1]!.id })}
                >
                  [{d.level}] {d.sectionIndex ? `${d.sectionIndex}번 ` : ''}
                  {d.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="source">
          <div className="source-bar">
            <h2>HTML 소스</h2>
            <button onClick={copy} disabled={!result.html}>복사</button>
            <button onClick={() => download(`${baseName}.html`, result.html, 'text/html')} disabled={!result.html}>
              HTML 다운로드
            </button>
          </div>
          <textarea readOnly aria-label="HTML 소스" value={result.html} rows={12} />
        </div>
      </section>
    </div>
  );
}
