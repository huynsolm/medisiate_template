import { z } from 'zod';
import { DIAGNOSTIC_CODES, type PageModel } from '../model/index.ts';

/** style 속성에 그대로 들어가는 색 값. 세미콜론·따옴표 같은 주입 문자를 막는다. */
export const CSS_COLOR = /^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla)\([0-9.,%\s/deg]+\)|[a-z]+)$/iu;

/** 단일 CSS 길이 값. style 속성에 그대로 들어가므로 선언을 추가할 수 없는 형식만 허용한다. */
export const CSS_LENGTH = /^(0|\d+(\.\d+)?(px|em|rem|%|vh|vw))$/u;
export const lengthSchema = z.string().trim().regex(CSS_LENGTH, '길이 값은 0 또는 숫자+단위(px, em, rem, %, vh, vw)여야 합니다');

export const colorSchema = z.string().trim().regex(CSS_COLOR, '색 값은 #hex, rgb(), hsl() 또는 색 이름이어야 합니다');

export const imageKindSchema = z.enum(['https', 'http', 'relative', 'protocol-relative', 'data', 'other']);

export const imageRefSchema = z.object({
  src: z.string(),
  alt: z.string(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  kind: imageKindSchema,
});

export const imagePairSchema = z.object({
  pc: imageRefSchema.optional(),
  mo: imageRefSchema.optional(),
});

export const themeSchema = z.object({
  primary: colorSchema,
  preset: z.enum(['blue', 'gold', 'green']).optional(),
  source: z.enum(['file', 'hospital', 'default']),
});

export const modifiersSchema = z.object({
  background: z
    .object({
      kind: z.enum(['color', 'image']),
      value: z.string(),
      overlay: colorSchema.optional(),
      token: z.string().optional(),
    })
    .optional(),
  textWhite: z.boolean().optional(),
  fullBleed: z.object({ paddingY: lengthSchema.optional() }).optional(),
});

export const sectionSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  variant: z.string().default('default'),
  modifiers: modifiersSchema.default({}),
  data: z.unknown(),
  source: z
    .object({ file: z.string(), index: z.number().int(), classList: z.array(z.string()) })
    .optional(),
});

export const diagnosticSchema = z.object({
  level: z.enum(['info', 'warn', 'error']),
  code: z.enum(DIAGNOSTIC_CODES),
  message: z.string(),
  sectionIndex: z.number().int().optional(),
  location: z.object({ line: z.number().int(), col: z.number().int() }).optional(),
  detail: z.record(z.string(), z.unknown()).optional(),
});

export const pageModelSchema = z
  .object({
    version: z.literal(1),
    source: z.string().optional(),
    title: z.string().optional(),
    theme: themeSchema,
    sections: z.array(sectionSchema),
    diagnostics: z.array(diagnosticSchema).default([]),
    meta: z.object({
      coreVersion: z.string(),
      hostCss: z.object({ sha256: z.string(), savedAt: z.string() }),
    }),
  })
  .superRefine((page, ctx) => {
    const seen = new Set<string>();
    page.sections.forEach((section, index) => {
      if (seen.has(section.id)) {
        ctx.addIssue({ code: 'custom', path: ['sections', index, 'id'], message: `섹션 id 중복: ${section.id}` });
      }
      seen.add(section.id);
    });
  });

/** 검증 후 PageModel로 돌려준다. exactOptionalPropertyTypes 때문에 한 번 캐스팅한다. */
export function parsePageModel(input: unknown): PageModel {
  return pageModelSchema.parse(input) as PageModel;
}

export function safeParsePageModel(input: unknown) {
  return pageModelSchema.safeParse(input);
}
