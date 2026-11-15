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
import { type04 } from './type04.ts';
import { type05 } from './type05.ts';
import { type12 } from './type12.ts';
import { type20 } from './type20.ts';
import { type21 } from './type21.ts';
import { type22 } from './type22.ts';
import { type24 } from './type24.ts';
import { type06 } from './type06.ts';
import { type13 } from './type13.ts';
import { type14 } from './type14.ts';
import { type16 } from './type16.ts';
import { type18 } from './type18.ts';
import { type19 } from './type19.ts';
import { type23 } from './type23.ts';
import { type07 } from './type07.ts';
import { type09 } from './type09.ts';
import { type10 } from './type10.ts';
import { type11 } from './type11.ts';
import { type15 } from './type15.ts';
import { type17 } from './type17.ts';
import { type25 } from './type25.ts';
import { type26 } from './type26.ts';

/** 웹 번들과 CLI가 함께 쓰는 정적 타입 목록 */
export const ALL_TYPES: AnyTypeDefinition[] = [type00, type01, type02, type03, type04, type05, type06, type07, type09, type10, type11, type12, type13, type14, type15, type16, type17, type18, type19, type20, type21, type22, type23, type24, type25, type26, textVisual, textZigzag, textSteps, textHex, textIconGrid];

export const defaultRegistry = new TypeRegistry(ALL_TYPES);
