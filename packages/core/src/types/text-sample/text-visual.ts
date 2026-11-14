import { z } from 'zod';
import { h } from '../../html/h.ts';
import { generalHeader } from '../../helpers/header.ts';
import { visualPcMo } from '../../helpers/image.ts';
import { isBlank, rich } from '../../helpers/misc.ts';
import { generalSection } from '../../helpers/general-section.ts';
import type { TypeDefinition } from '../definition.ts';
import { BR_HELP, headerFields, headerShape, imagePairSchema } from './common.ts';

const schema = z.object({
  ...headerShape,
  desc: z.string().optional(),
  image: imagePairSchema.default({}),
  contentAlign: z.enum(['left', 'center']).optional(),
});
export type TextVisualData = z.infer<typeof schema>;

/** 제목 + 와이드 이미지(PC/MO) + 설명. 풀블리드 배경은 섹션 공통 옵션으로 켠다. */
export const textVisual: TypeDefinition<TextVisualData> = {
  id: 'text-visual',
  label: '일반: 제목 + 와이드 이미지 + 설명',
  strategy: 'general',
  variants: ['default'],
  schema: schema as z.ZodType<TextVisualData>,
  fields: [
    ...headerFields,
    { key: 'image', label: '이미지 (PC/MO)', kind: 'imagePair' },
    { key: 'desc', label: '설명', kind: 'richText', help: BR_HELP },
    { key: 'contentAlign', label: '본문 정렬', kind: 'select', options: [{ value: 'left', label: '기본' }, { value: 'center', label: '가운데' }] },
  ],
  defaults: { title: '제목', desc: '설명', image: {}, contentAlign: 'center' },
  render(section, ctx) {
    const d = section.data;
    const header =
      !isBlank(d.title) || !isBlank(d.eyebrow)
        ? generalHeader(d, ctx, {
            white: section.modifiers.textWhite ?? false,
            ...(d.titleSize ? { titleSize: d.titleSize } : {}),
            ...(d.titleWeight ? { titleWeight: d.titleWeight } : {}),
          })
        : null;
    return generalSection(section, [
      header,
      h('div', { class: 'mig-content', style: d.contentAlign === 'center' ? { textAlign: 'center' } : undefined }, [
        visualPcMo(d.image, { wide: true }),
        !isBlank(d.desc) && h('p', { class: 'mig-desc', style: { fontSize: ctx.fluid(15, 22) } }, [rich(d.desc)]),
      ]),
    ]);
  },
};
