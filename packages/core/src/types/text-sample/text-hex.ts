import { z } from 'zod';
import { h } from '../../html/h.ts';
import { generalHeader } from '../../helpers/header.ts';
import { hexBox } from '../../helpers/hex.ts';
import { isBlank, rich } from '../../helpers/misc.ts';
import { generalSection } from '../../helpers/general-section.ts';
import type { TypeDefinition } from '../definition.ts';
import { colorSchema, headerFields, headerShape } from './common.ts';

const schema = z.object({
  ...headerShape,
  columns: z.number().int().min(1).max(6).default(3),
  ringColor: colorSchema.default('rgb(236, 228, 218)'),
  items: z.array(z.object({ top: z.string().optional(), label: z.string(), desc: z.string().optional() })).min(1),
});
export type TextHexData = z.infer<typeof schema>;

/** 육각형 도형 + 설명 N칸 (SVG clipPath를 블록당 한 번 정의) */
export const textHex: TypeDefinition<TextHexData> = {
  id: 'text-hex',
  label: '일반: 육각형 특징 N칸',
  strategy: 'general',
  variants: ['default'],
  schema: schema as z.ZodType<TextHexData>,
  fields: [
    ...headerFields,
    { key: 'columns', label: '열 수', kind: 'number', min: 1, max: 6 },
    { key: 'ringColor', label: '테두리 색', kind: 'color' },
    {
      key: 'items',
      label: '항목',
      kind: 'repeat',
      min: 1,
      fields: [
        { key: 'top', label: '번호', kind: 'text' },
        { key: 'label', label: '도형 안 문구', kind: 'richText' },
        { key: 'desc', label: '설명', kind: 'richText' },
      ],
    },
  ],
  defaults: { title: '제목', columns: 3, ringColor: 'rgb(236, 228, 218)', items: [{ top: '01', label: '특징', desc: '설명' }] },
  render(section, ctx) {
    const d = section.data;
    return generalSection(section, [
      (!isBlank(d.title) || !isBlank(d.eyebrow)) && generalHeader(d, ctx, { white: section.modifiers.textWhite ?? false }),
      h('div', { class: 'mig-content' }, [
        h(
          'div',
          { style: { display: 'grid', gridTemplateColumns: `repeat(${d.columns}, minmax(0, 1fr))`, gap: '24px' } },
          d.items.map((it) =>
            h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' } }, [
              hexBox({ label: it.label, ...(it.top !== undefined ? { top: it.top } : {}) }, ctx, { ringColor: d.ringColor }),
              !isBlank(it.desc) && h('p', { class: 'mig-desc', style: { textAlign: 'center', fontSize: ctx.fluid(13, 18) } }, [rich(it.desc)]),
            ]),
          ),
        ),
      ]),
    ]);
  },
};
