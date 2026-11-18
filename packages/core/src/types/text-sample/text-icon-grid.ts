import { z } from 'zod';
import { h } from '../../html/h.ts';
import { generalHeader } from '../../helpers/header.ts';
import { renderImage } from '../../helpers/image.ts';
import { isBlank, rich } from '../../helpers/misc.ts';
import { generalSection } from '../../helpers/general-section.ts';
import type { TypeDefinition } from '../definition.ts';
import { headerFields, headerShape, imageRefSchema } from './common.ts';

const schema = z.object({
  ...headerShape,
  columns: z.number().int().min(1).max(6).default(4),
  itemPadding: z.string().regex(/^\d+(px|em|rem|%)?( \d+(px|em|rem|%)?){0,3}$/u).default('50px'),
  items: z.array(z.object({ icon: imageRefSchema.optional(), desc: z.string().optional() })).min(1),
});
export type TextIconGridData = z.infer<typeof schema>;

/** 아이콘 + 설명 갤러리 (호스트 .mig-gallery-grid, PC 열 수는 --pc-col) */
export const textIconGrid: TypeDefinition<TextIconGridData> = {
  id: 'text-icon-grid',
  label: '일반: 아이콘 그리드',
  strategy: 'general',
  variants: ['default'],
  schema: schema as z.ZodType<TextIconGridData>,
  fields: [
    ...headerFields,
    { key: 'columns', label: 'PC 열 수', kind: 'number', min: 1, max: 6 },
    { key: 'itemPadding', label: '항목 안쪽 여백', kind: 'text' },
    {
      key: 'items',
      label: '항목',
      kind: 'repeat',
      min: 1,
      fields: [
        { key: 'icon', label: '아이콘', kind: 'image' },
        { key: 'desc', label: '설명', kind: 'richText' },
      ],
    },
  ],
  defaults: { title: '제목', columns: 4, itemPadding: '50px', items: [{ desc: '설명' }] },
  render(section, ctx) {
    const d = section.data;
    return generalSection(section, [
      (!isBlank(d.title) || !isBlank(d.eyebrow)) && generalHeader(d, ctx, { white: section.modifiers.textWhite ?? false }),
      h('div', { class: 'mig-content' }, [
        h(
          'div',
          { class: 'mig-gallery-grid', style: { '--pc-col': d.columns } },
          d.items.map((it) => {
            const w = it.icon?.width ? `${it.icon.width}px` : undefined;
            return h('div', { class: 'mig-gallery-item', style: { border: 'none', textAlign: 'center', padding: d.itemPadding } }, [
              it.icon &&
                h('div', { class: 'mig-visual img-contain', style: { margin: '0 auto 12px', width: w, maxWidth: w, aspectRatio: 'auto' } }, [
                  renderImage(ctx.image(it.icon), { style: { width: w, height: w ? 'auto' : undefined, aspectRatio: 'auto' } }),
                ]),
              !isBlank(it.desc) && h('p', { class: 'mig-desc', style: { fontSize: ctx.fluid(13, 18) } }, [rich(it.desc)]),
            ]);
          }),
        ),
      ]),
    ]);
  },
};
