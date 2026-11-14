/**
 * 미디어쿼리 없이 글자 크기를 화면 폭에 맞춰 키운다.
 * 기본 범위는 호스트 분기점과 같은 375~1024px이다.
 * 'sample'은 수작업 샘플(375~992px)을 그대로 재현할 때만 쓴다.
 */
export type FluidRange = 'host' | 'sample';

export const FLUID_RANGES: Record<FluidRange, [number, number]> = {
  host: [375, 1024],
  sample: [375, 992],
};

function fluidBase(min: number, max: number, from = 375, to = 1024): string {
  if (min > max) throw new Error(`fluid: min(${min}) > max(${max})`);
  if (min === max) return `${min}px`;
  return `clamp(${min}px, calc(${min}px + (100vw - ${from}px) * ${max - min} / ${to - from}), ${max}px)`;
}

export const fluid = Object.assign(fluidBase, {
  sample: (min: number, max: number) => fluidBase(min, max, ...FLUID_RANGES.sample),
});

export function serializeFluid(min: number, max: number, range: FluidRange): string {
  return fluidBase(min, max, ...FLUID_RANGES[range]);
}
