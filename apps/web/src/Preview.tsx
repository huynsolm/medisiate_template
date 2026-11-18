import { useMemo, useState } from 'react';
import { HOST_CSS } from './state.ts';
import { PREVIEW_WIDTH, previewDocument, type PreviewMode } from './render.ts';

const LABEL: Record<PreviewMode, string> = { pc: 'PC 1100', mo: '모바일 360', editor: '에디터 화면' };

export function Preview({ html }: { html: string }) {
  const [mode, setMode] = useState<PreviewMode>('pc');
  const doc = useMemo(() => previewDocument(html, mode), [html, mode]);
  const width = PREVIEW_WIDTH[mode];
  return (
    <section className="preview" aria-label="미리보기">
      <div className="preview-bar">
        <div role="tablist">
          {(Object.keys(LABEL) as PreviewMode[]).map((m) => (
            <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>
              {LABEL[m]}
            </button>
          ))}
        </div>
        <span className="css-ver" title={HOST_CSS.sha256}>
          기준 CSS {HOST_CSS.savedAt} · {HOST_CSS.sha256.slice(0, 8)}
        </span>
      </div>
      {mode === 'editor' && <p className="hint">에디터 화면은 PC 폭에서도 모바일 이미지와 모바일 배치가 보입니다 (html.design-edit-page).</p>}
      <div className="frame-scroll">
        <iframe title={`미리보기 ${LABEL[mode]}`} data-mode={mode} srcDoc={doc} style={{ width }} />
      </div>
    </section>
  );
}
