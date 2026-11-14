import type { ImagePair, ImageRef } from '../model/index.ts';
import { fragment, h, type Attrs, type FragmentNode, type StyleObject } from '../html/h.ts';

export interface RenderImageOptions {
  style?: StyleObject;
}

/** 속성 순서 고정: decoding, loading, src, alt, width, height, style */
export function renderImage(img: ImageRef, options: RenderImageOptions = {}) {
  return h('img', {
    decoding: 'async',
    loading: 'lazy',
    src: img.src,
    alt: img.alt,
    width: img.width,
    height: img.height,
    style: { border: '0', ...options.style },
  });
}

export interface VisualOptions {
  wide?: boolean;
  /** mig-visual 뒤에 붙일 클래스 (예: 'img-contain') */
  extraClass?: string;
  attrs?: Attrs;
  imageStyle?: StyleObject;
}

function visualClass(options: VisualOptions, display?: 'pc' | 'mo'): string {
  return ['mig-visual', options.wide ? 'type-wide' : '', options.extraClass ?? '', display ? `common-display-${display}` : '']
    .filter(Boolean)
    .join(' ');
}

/**
 * PC/MO 이미지가 둘 다 있으면 common-display-pc/-mo 쌍으로,
 * 하나만 있으면 표시 클래스 없이 한 장만 출력한다.
 */
export function visualPcMo(pair: ImagePair, options: VisualOptions = {}): FragmentNode {
  const imgOpts = options.imageStyle ? { style: options.imageStyle } : {};
  const one = (img: ImageRef, display?: 'pc' | 'mo') =>
    h('div', { class: visualClass(options, display), ...options.attrs }, [renderImage(img, imgOpts)]);
  if (pair.pc && pair.mo) return fragment(one(pair.pc, 'pc'), one(pair.mo, 'mo'));
  const single = pair.pc ?? pair.mo;
  return single ? fragment(one(single)) : fragment();
}
