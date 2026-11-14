import type { SectionModifiers } from '../model/index.ts';
import { CMS_VARIANT_MAP, type CmsVariantName } from './variant-map.ts';

/**
 * 원본 공통 배경 이미지의 공개 URL.
 * 근거: reference/sample-inline-acne.html이 bg-image-1 자리에 이 주소를 썼다. (나머지 번호는 같은 규칙으로 **추정**)
 */
export const CMS_COMMON_IMAGE_BASE = 'http://fxfile.drline.net/cms/public/images/common/';

const SHARED = new Set(Object.keys(CMS_VARIANT_MAP));
const STRUCTURAL = /^(cms|type\d{2}|type)$/u;

function imageUrl(name: CmsVariantName): string {
  const css = (CMS_VARIANT_MAP[name].base as Record<string, string>).backgroundImage ?? '';
  const file = /cms_bg_\d+\.jpg/u.exec(css)?.[0];
  return `${CMS_COMMON_IMAGE_BASE}${file ?? ''}`;
}

/** 원본 section 클래스에서 공통 변형(modifiers)을 뽑고, 해석하지 못한 클래스를 돌려준다. */
export function modifiersFromClasses(classList: string[], typeVariants: Iterable<string> = []): { modifiers: SectionModifiers; unknown: string[] } {
  const known = new Set(typeVariants);
  const modifiers: SectionModifiers = {};
  const unknown: string[] = [];
  let color: CmsVariantName | undefined;
  let image: CmsVariantName | undefined;
  for (const cls of classList) {
    if (STRUCTURAL.test(cls) || known.has(cls)) continue;
    if (!SHARED.has(cls)) {
      unknown.push(cls);
      continue;
    }
    if (cls.startsWith('bg-color-')) color = cls as CmsVariantName;
    else if (cls.startsWith('bg-image-')) image = cls as CmsVariantName;
    else if (cls === 'text-white') modifiers.textWhite = true;
  }
  if (image) modifiers.background = { kind: 'image', value: imageUrl(image), token: image };
  else if (color) modifiers.background = { kind: 'color', value: (CMS_VARIANT_MAP[color].base as Record<string, string>).background ?? '', token: color };
  else if (classList.includes('type-bg')) modifiers.background = { kind: 'color', value: CMS_VARIANT_MAP['type-bg'].base.background, token: 'type-bg' };
  return { modifiers, unknown };
}
