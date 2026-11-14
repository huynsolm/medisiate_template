import { z } from 'zod';
import { comment, h } from '../html/h.ts';
import type { TypeDefinition } from './definition.ts';
import type { SectionModel } from '../model/index.ts';
import { blockText, outerHtml, type SourceSection } from '../parse/dom.ts';

export interface FallbackData {
  /** 사람이 읽는 사유 */
  reason: string;
  originalType?: string;
  /** 원본에서 뽑은 텍스트 (화면에 보임) */
  text: string;
  /** 원본 HTML. 출력에는 escape한 주석으로만 들어간다 */
  html?: string;
}

export const fallbackSchema = z.object({
  reason: z.string(),
  originalType: z.string().optional(),
  text: z.string(),
  html: z.string().optional(),
});

export const FALLBACK_ID = 'fallback';

/** 지원하지 못한 원본을 조용히 버리지 않고 눈에 보이게 남긴다. */
export const fallbackType: TypeDefinition<FallbackData> = {
  id: FALLBACK_ID,
  label: '변환 미지원 (fallback)',
  strategy: 'any',
  variants: ['default'],
  hidden: true,
  schema: fallbackSchema as z.ZodType<FallbackData>,
  fields: [
    { key: 'reason', label: '사유', kind: 'text' },
    { key: 'text', label: '원본 텍스트', kind: 'textarea' },
  ],
  defaults: { reason: '', text: '' },
  render(section) {
    const { reason, originalType, text, html } = section.data;
    const label = `[변환 미지원]${originalType ? ` ${originalType}` : ''} ${reason}`.trim();
    return h(
      'section',
      {
        class: 'mig-section type-fallback',
        'data-migration-fallback': 'true',
        style: { border: '2px dashed #e0a800', backgroundColor: '#fff8e1', padding: '16px', margin: '16px 0' },
      },
      [
        h('p', { style: { margin: '0 0 8px', color: '#8a6d00', fontWeight: 'bold' } }, [label]),
        text && h('p', { style: { margin: '0', whiteSpace: 'pre-line' } }, [text]),
        html && comment(`original: ${html}`),
      ],
    );
  },
};

/** 원본 섹션을 fallback 섹션 모델로 만든다. 원본 HTML은 주석으로만 남는다. */
export function fallbackFromSource(src: SourceSection, id: string, reason: string): SectionModel<FallbackData> {
  return {
    id,
    type: FALLBACK_ID,
    variant: 'default',
    modifiers: {},
    data: { reason, originalType: src.typeId ?? src.classList.join(' '), text: blockText(src.element), html: outerHtml(src.element) },
    source: { file: src.file, index: src.index, classList: src.classList },
  };
}
