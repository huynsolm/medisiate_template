import { describe, expect, it } from 'vitest';
import { CMS_VARIANT_MAP } from '../src/parse/variant-map.js';

describe('CMS_VARIANT_MAP', () => {
  it('pins every shared background and text variant to source lines', () => {
    expect(Object.keys(CMS_VARIANT_MAP)).toEqual([
      'type-bg', 'bg-color-1', 'bg-color-2', 'bg-color-3',
      'bg-image-1', 'bg-image-2', 'bg-image-3', 'bg-image-4', 'bg-image-5', 'bg-image-6', 'bg-image-7',
      'text-white',
    ]);
    expect(CMS_VARIANT_MAP['type-bg'].desktop?.padding).toBe('150px 0');
    expect(CMS_VARIANT_MAP['bg-image-1'].base.backgroundImage).toContain('cms_bg_1.jpg');
    expect(CMS_VARIANT_MAP['bg-image-1'].mobile?.backgroundImage).toContain('cms_bg_1_m.jpg');
    expect(CMS_VARIANT_MAP['text-white'].base.color).toBe('#fff');
    expect(CMS_VARIANT_MAP['bg-image-7'].sources).toContain('cms/css/cms.css:63-65');
  });
});
