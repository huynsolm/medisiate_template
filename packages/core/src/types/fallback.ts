import { z } from 'zod';
import { comment, h } from '../html/h.ts';
import type { TypeDefinition } from './definition.ts';

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
