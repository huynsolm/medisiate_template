import { defaultRegistry, renderPage, type PageModel, type RenderPageResult } from '@cms-medisay/core';
import hostCss from '../../../reference/host-style.css?raw';

export type FluidRange = 'host' | 'sample';
export type PreviewMode = 'pc' | 'mo' | 'editor';

export const PREVIEW_WIDTH: Record<PreviewMode, number> = { pc: 1100, mo: 360, editor: 1100 };

/** CLI와 같은 core renderPage를 그대로 쓴다. 웹에서 렌더 로직을 복제하지 않는다. */
export function renderForWeb(page: PageModel, fluidRange: FluidRange = 'host'): RenderPageResult {
  return renderPage(page, { registry: defaultRegistry, fluidRange });
}

/** 미리보기 iframe 문서. 에디터 모드는 html.design-edit-page로 실제 편집 화면 동작(항상 모바일 쪽)을 재현한다. */
export function previewDocument(html: string, mode: PreviewMode): string {
  return `<!doctype html><html lang="ko"${mode === 'editor' ? ' class="design-edit-page"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${hostCss}</style><style>body{margin:0;padding:24px 15px;background:#fff}</style></head><body>${html}</body></html>`;
}
