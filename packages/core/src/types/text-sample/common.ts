import { z } from 'zod';
import { colorSchema, imagePairSchema, imageRefSchema } from '../../schema/page.ts';
import type { FieldSpec } from '../definition.ts';

export const headerShape = {
  eyebrow: z.string().optional(),
  title: z.string().optional(),
  titleSize: z.tuple([z.number().positive(), z.number().positive()]).optional(),
  titleWeight: z.string().regex(/^(normal|bold|[1-9]00)$/u).optional(),
};

export const headerFields: FieldSpec[] = [
  { key: 'eyebrow', label: '작은 제목', kind: 'richText' },
  { key: 'title', label: '제목', kind: 'richText' },
];

export { colorSchema, imagePairSchema, imageRefSchema };

export const BR_HELP = '줄바꿈: <br class="br-migration is-visible">(항상), <br class="br-migration">(PC만), <br>(일반)';
