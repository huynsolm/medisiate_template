import type { SectionModifiers } from '../model/index.ts';
import { CSS_COLOR, CSS_LENGTH } from '../schema/page.ts';
import type { StyleObject } from '../html/h.ts';

export function cssUrl(value: string): string {
  if (/['"\\\n\r]/u.test(value)) throw new Error(`unsafe url in style: ${value}`);
  return `url('${value}')`;
}

export function cssLength(value: string): string {
  if (!CSS_LENGTH.test(value.trim())) throw new Error(`unsafe length in style: ${value}`);
  return value.trim();
}

export function cssColor(value: string): string {
  if (!CSS_COLOR.test(value.trim())) throw new Error(`unsafe color in style: ${value}`);
  return value.trim();
}

function backgroundStyle(modifiers: SectionModifiers): StyleObject {
  const bg = modifiers.background;
  if (!bg) return {};
  if (bg.kind === 'color') return { backgroundColor: cssColor(bg.value) };
  const overlay = bg.overlay ? `linear-gradient(${cssColor(bg.overlay)}, ${cssColor(bg.overlay)}), ` : '';
  return { backgroundImage: `${overlay}${cssUrl(bg.value)}`, backgroundSize: 'cover', backgroundPosition: 'center' };
}

/** 일반 모드 섹션 상자 스타일: 배경 → 풀블리드 → 세로 여백 순서 (샘플과 같은 순서) */
export function sectionBoxStyle(modifiers: SectionModifiers): StyleObject | undefined {
  const style: StyleObject = { ...backgroundStyle(modifiers) };
  if (modifiers.fullBleed) {
    Object.assign(style, { width: '100vw', position: 'relative', left: '50%', transform: 'translateX(-50%)' });
    if (modifiers.fullBleed.paddingY) style.padding = `${cssLength(modifiers.fullBleed.paddingY)} 0`;
  }
  return Object.keys(style).length ? style : undefined;
}

/** 풀블리드 섹션 안쪽 폭 제한 */
export function fullBleedInnerStyle(): StyleObject {
  return { maxWidth: '1200px', margin: '0 auto', padding: '0 15px' };
}

/** 프리셋 모드 배경: 호스트 type-bg 클래스 + 인라인 배경 + data-migration-bg */
export function presetBackground(modifiers: SectionModifiers): {
  classes: string[];
  attrs: Record<string, string>;
  style: StyleObject | undefined;
} {
  if (!modifiers.background) return { classes: [], attrs: {}, style: undefined };
  return {
    classes: ['type-bg'],
    attrs: modifiers.textWhite || modifiers.background.kind === 'image' ? { 'data-migration-bg': 'true' } : {},
    style: backgroundStyle(modifiers),
  };
}
