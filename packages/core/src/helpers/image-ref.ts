import type { ImageKind, ImageRef } from '../model/index.ts';

/** 리포트용 분류만 한다. src 문자열은 절대 바꾸지 않는다. */
export function classifyImageSrc(src: string): ImageKind {
  const value = src.trim();
  if (/^https:\/\//iu.test(value)) return 'https';
  if (/^http:\/\//iu.test(value)) return 'http';
  if (value.startsWith('//')) return 'protocol-relative';
  if (/^data:/iu.test(value)) return 'data';
  if (/^[a-z][a-z0-9+.-]*:/iu.test(value)) return 'other';
  return value ? 'relative' : 'other';
}

export function imageRef(src: string, alt = '', width?: number, height?: number): ImageRef {
  return {
    src,
    alt,
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    kind: classifyImageSrc(src),
  };
}
