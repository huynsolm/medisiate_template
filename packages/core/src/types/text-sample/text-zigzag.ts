import { z } from 'zod';
import { h } from '../../html/h.ts';
import { generalHeader } from '../../helpers/header.ts';
import { visualPcMo } from '../../helpers/image.ts';
import { isBlank, rich } from '../../helpers/misc.ts';
import { generalSection } from '../../helpers/general-section.ts';
import type { TypeDefinition } from '../definition.ts';
import { BR_HELP, headerFields, headerShape, imagePairSchema } from './common.ts';

const item = z.object({
  num: z.string().optional(),
  title: z.string().optional(),
  desc: z.string().optional(),
  image: imagePairSchema.default({}),
});
const schema = z.object({
  ...headerShape,
  startSide: z.enum(['left', 'right']).default('left'),
  items: z.array(item).min(1),
});
export type TextZigzagData = z.infer<typeof schema>;

/** 이미지와 텍스트가 좌우로 번갈아 나오는 목록 (호스트 .mig-media) */
export const textZigzag: TypeDefinition<TextZigzagData> = {
  id: 'text-zigzag',
  label: '일반: 지그재그 이미지 + 텍스트',
  strategy: 'general',
  variants: ['default'],
  schema: schema as z.ZodType<TextZigzagData>,
  fields: [
    ...headerFields,
    { key: 'startSide', label: '첫 이미지 위치', kind: 'select', options: [{ value: 'left', label: '왼쪽' }, { value: 'right', label: '오른쪽' }] },
    {
      key: 'items',
      label: '항목',
      kind: 'repeat',
      min: 1,
      fields: [
        { key: 'num', label: '번호', kind: 'text' },
        { key: 'title', label: '제목', kind: 'richText' },
        { key: 'desc', label: '설명', kind: 'richText', help: BR_HELP },
        { key: 'image', label: '이미지 (PC/MO)', kind: 'imagePair' },
      ],
    },
  ],
  defaults: { startSide: 'left', items: [{ num: '01', title: '제목', desc: '설명', image: {} }] },
  render(section, ctx) {
    const d = section.data;
    const sides = d.startSide === 'left' ? ['left', 'right'] : ['right', 'left'];
    return generalSection(section, [
      !isBlank(d.title) && generalHeader(d, ctx, { white: section.modifiers.textWhite ?? false }),
      h(
        'div',
        { class: 'mig-content' },
        d.items.map((it, i) =>
          h('div', { class: `mig-media media-${sides[i % 2]}`, style: i > 0 ? { marginTop: '3em' } : undefined }, [
            h('div', { class: 'mig-media-box', style: { border: '0', flex: '0 0 55%' } }, [visualPcMo(it.image)]),
            h('div', { class: 'mig-text-box' }, [
              !isBlank(it.num) &&
                h('p', { style: { margin: '0 0 4px', color: 'var(--mig-primary-color)', fontSize: '20px', fontWeight: 'bold' } }, [it.num ?? '']),
              !isBlank(it.title) &&
                h('strong', { class: 'mig-title', style: { color: 'var(--mig-primary-color)', fontSize: ctx.fluid(20, 32) } }, [rich(it.title)]),
              !isBlank(it.desc) && h('p', { class: 'mig-desc', style: { fontSize: ctx.fluid(13, 18) } }, [rich(it.desc)]),
            ]),
          ]),
        ),
      ),
    ]);
  },
};
