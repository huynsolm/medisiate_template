import { z } from 'zod';
import { visualPcMo } from '../helpers/image.ts';
import { scanSection } from '../parse/common.ts';
import { byClass, finish, imagesIn, originalHeader } from '../parse/original.ts';
import { children } from '../parse/dom.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape, presetSection } from './preset.ts';

const schema = z.object({ ...headerShape, image: imagePairSchema.default({}) });
export type Type05Data = z.infer<typeof schema>;

/**
 * 원본: .cms-inner > .cms-header + .cms-visual(PC/MO)
 * 호스트: section.type-05 > .mig-body > .mig-visual(PC/MO, 폭 100%)
 */
export const type05: TypeDefinition<Type05Data> = {
  id: 'type05',
  label: 'type05 큰 이미지',
  strategy: 'preset',
  hostPreset: 'type-05',
  variants: ['default'],
  schema: schema as z.ZodType<Type05Data>,
  fields: [...headerFields, { key: 'image', label: '이미지 (PC/MO)', kind: 'imagePair' }],
  defaults: { image: {} },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const inner = children(src.element).find(byClass('cms-inner')) ?? src.element;
    const { pair, extra } = imagesIn(children(inner).find(byClass('cms-visual')), src, diagnostics);
    const data: Type05Data = { ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}), image: pair };
    return finish(src, data, header.used, extra, { modifiers, diagnostics });
  },
  render(section) {
    return presetSection('type-05', section, [visualPcMo(section.data.image)]);
  },
};
