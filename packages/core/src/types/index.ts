import { TypeRegistry, type AnyTypeDefinition } from './definition.ts';
import { textVisual } from './text-sample/text-visual.ts';
import { textZigzag } from './text-sample/text-zigzag.ts';
import { textSteps } from './text-sample/text-steps.ts';
import { textHex } from './text-sample/text-hex.ts';
import { textIconGrid } from './text-sample/text-icon-grid.ts';
import { type00 } from './type00.ts';
import { type01 } from './type01.ts';
import { type02 } from './type02.ts';
import { type03 } from './type03.ts';
import { type07 } from './type07.ts';
import { type09 } from './type09.ts';
import { type10 } from './type10.ts';

/** 웹 번들과 CLI가 함께 쓰는 정적 타입 목록 */
export const ALL_TYPES: AnyTypeDefinition[] = [type00, type01, type02, type03, type07, type09, type10, textVisual, textZigzag, textSteps, textHex, textIconGrid];

export const defaultRegistry = new TypeRegistry(ALL_TYPES);
