import type { Theme } from '../model/index.ts';

export type ThemeInput = Partial<Pick<Theme, 'primary' | 'preset'>>;

export interface ThemeLayers {
  default: ThemeInput & { primary: string };
  hospital?: ThemeInput;
  file?: ThemeInput;
}

/** 우선순위: 파일별 override → 병원 설정 → 공통 기본값 */
export function resolveTheme(layers: ThemeLayers): Theme {
  let theme: Theme = { primary: layers.default.primary, source: 'default' };
  if (layers.default.preset) theme.preset = layers.default.preset;
  for (const source of ['hospital', 'file'] as const) {
    const layer = layers[source];
    if (!layer) continue;
    if (layer.primary) theme = { ...theme, primary: layer.primary, source };
    if (layer.preset) theme = { ...theme, preset: layer.preset, source };
  }
  return theme;
}
