import { z } from 'zod';
import { h } from '../../html/h.ts';
import { cssColor } from '../../helpers/background.ts';
import { generalHeader } from '../../helpers/header.ts';
import { isBlank, rich } from '../../helpers/misc.ts';
import { generalSection } from '../../helpers/general-section.ts';
import type { TypeDefinition } from '../definition.ts';
import { colorSchema, headerFields, headerShape } from './common.ts';

const schema = z.object({
  ...headerShape,
  itemBg: colorSchema.default('rgb(250, 248, 246)'),
  items: z.array(z.object({ label: z.string(), desc: z.string().optional() })).min(1),
});
export type TextStepsData = z.infer<typeof schema>;

/** 왼쪽 단계명 + 오른쪽 설명의 가로 카드 목록 */
export const textSteps: TypeDefinition<TextStepsData> = {
  id: 'text-steps',
  label: '일반: 단계 목록',
  strategy: 'general',
  variants: ['default'],
  schema: schema as z.ZodType<TextStepsData>,
  fields: [
    ...headerFields,
    { key: 'itemBg', label: '항목 배경색', kind: 'color' },
    {
      key: 'items',
      label: '단계',
      kind: 'repeat',
      min: 1,
      fields: [
        { key: 'label', label: '단계명', kind: 'richText' },
        { key: 'desc', label: '설명', kind: 'richText' },
      ],
    },
  ],
  defaults: { title: '제목', itemBg: 'rgb(250, 248, 246)', items: [{ label: '1단계', desc: '설명' }] },
  render(section, ctx) {
    const d = section.data;
    return generalSection(section, [
      (!isBlank(d.title) || !isBlank(d.eyebrow)) && generalHeader(d, ctx, { white: section.modifiers.textWhite ?? false }),
      h('div', { class: 'mig-content' }, [
        h(
          'ul',
          { class: 'mig-list', style: { rowGap: '16px', listStyle: 'none', paddingLeft: '0' } },
          d.items.map((it) =>
            h(
              'li',
              {
                class: 'mig-item',
                style: {
                  display: 'flex', alignItems: 'center', gap: '20px', padding: '18px 24px', borderRadius: '8px',
                  backgroundColor: cssColor(d.itemBg), listStyle: 'none',
                },
              },
              [
                h('strong', {
                  class: 'mig-title',
                  style: { flex: '0 0 auto', minWidth: '90px', textAlign: 'center', color: 'var(--mig-primary-color)', fontSize: ctx.fluid(22, 30) },
                }, [rich(it.label)]),
                !isBlank(it.desc) && h('p', { class: 'mig-desc', style: { margin: '0', flex: '1', fontSize: ctx.fluid(13, 18) } }, [rich(it.desc)]),
              ],
            ),
          ),
        ),
      ]),
    ]);
  },
};
