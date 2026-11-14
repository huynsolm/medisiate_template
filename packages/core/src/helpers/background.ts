import type { SectionModifiers } from '../model/index.ts';
import { CSS_COLOR, CSS_LENGTH } from '../schema/page.ts';
import { h, type ElementNode, type StyleObject } from '../html/h.ts';

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

function overlayOf(bg: NonNullable<SectionModifiers['background']>): string {
  return bg.overlay ? `linear-gradient(${cssColor(bg.overlay)}, ${cssColor(bg.overlay)}), ` : '';
}

/**
 * 섹션 자체의 배경. 모바일 전용 이미지가 있으면 섹션에는 모바일 이미지를 두고
 * (data-bg-scope="mobile" → 호스트가 1024px 이상 공개 화면에서 지움), PC 이미지는 pcBackgroundLayer()가 맡는다.
 */
function backgroundStyle(modifiers: SectionModifiers): StyleObject {
  const bg = modifiers.background;
  if (!bg) return {};
  if (bg.kind === 'color') return { backgroundColor: cssColor(bg.value) };
  if (bg.mobile) {
    return {
      backgroundColor: bg.mobile.color ? cssColor(bg.mobile.color) : undefined,
      backgroundImage: `${overlayOf(bg)}${cssUrl(bg.mobile.value)}`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative',
      isolation: 'isolate',
    };
  }
  return { backgroundImage: `${overlayOf(bg)}${cssUrl(bg.value)}`, backgroundSize: 'cover', backgroundPosition: 'center' };
}

/** PC/MO 배경을 나눌 때 섹션에 붙는 호스트 속성 */
export function backgroundScopeAttrs(modifiers: SectionModifiers): Record<string, string> {
  return modifiers.background?.kind === 'image' && modifiers.background.mobile ? { 'data-migration-bg': 'true', 'data-bg-scope': 'mobile' } : {};
}

/**
 * PC 전용 배경 레이어. 호스트의 data-bg-scope="desktop"은 background:none !important가 항상 이겨
 * 인라인 배경으로는 켤 수 없으므로, PC에서만 보이는 common-display-pc 요소를 섹션 맨 뒤 층에 깐다.
 */
export function pcBackgroundLayer(modifiers: SectionModifiers): ElementNode | null {
  const bg = modifiers.background;
  if (bg?.kind !== 'image' || !bg.mobile) return null;
  return h(
    'div',
    {
      class: 'common-display-pc',
      'aria-hidden': 'true',
      style: { position: 'absolute', inset: '0', zIndex: '-1', backgroundImage: `${overlayOf(bg)}${cssUrl(bg.value)}`, backgroundSize: 'cover', backgroundPosition: 'center' },
    },
    ['\u00a0'],
  );
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
  layer: ElementNode | null;
} {
  if (!modifiers.background) return { classes: [], attrs: {}, style: undefined, layer: null };
  return {
    classes: ['type-bg'],
    attrs: {
      ...(modifiers.textWhite || modifiers.background.kind === 'image' ? { 'data-migration-bg': 'true' } : {}),
      ...backgroundScopeAttrs(modifiers),
    },
    style: backgroundStyle(modifiers),
    layer: pcBackgroundLayer(modifiers),
  };
}
