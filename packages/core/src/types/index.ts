import { TypeRegistry, type AnyTypeDefinition } from './definition.ts';
import { textVisual } from './text-sample/text-visual.ts';
import { textZigzag } from './text-sample/text-zigzag.ts';
import { textSteps } from './text-sample/text-steps.ts';
import { textHex } from './text-sample/text-hex.ts';
import { textIconGrid } from './text-sample/text-icon-grid.ts';

/** 웹 번들과 CLI가 함께 쓰는 정적 타입 목록 */
export const ALL_TYPES: AnyTypeDefinition[] = [textVisual, textZigzag, textSteps, textHex, textIconGrid];

export const defaultRegistry = new TypeRegistry(ALL_TYPES);
