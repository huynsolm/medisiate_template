export interface VariantStyle {
  base: Record<string, string>;
  desktop?: Record<string, string>;
  mobile?: Record<string, string>;
  sources: string[];
}

export type CmsVariantName =
  | 'type-bg'
  | 'bg-color-1'
  | 'bg-color-2'
  | 'bg-color-3'
  | 'bg-image-1'
  | 'bg-image-2'
  | 'bg-image-3'
  | 'bg-image-4'
  | 'bg-image-5'
  | 'bg-image-6'
  | 'bg-image-7'
  | 'text-white';

export const CMS_VARIANT_MAP = {
  'type-bg': {
    base: { background: '#f9f3ec' },
    desktop: { padding: '150px 0' },
    mobile: { padding: '65px 0', backgroundPosition: '50% 0 !important', backgroundSize: '100% auto' },
    sources: ['cms/css/cms.css:19-21', 'cms/css/cms.css:80-82', 'cms/css/cms.css:106-110'],
  },
  'bg-color-1': { base: { background: '#f9e9e3' }, sources: ['cms/css/cms.css:23-25'] },
  'bg-color-2': { base: { background: '#f4f4f4' }, sources: ['cms/css/cms.css:27-29'] },
  'bg-color-3': { base: { background: '#f1e6e1' }, sources: ['cms/css/cms.css:31-33'] },
  'bg-image-1': {
    base: {
      backgroundImage: 'url(./../images/common/cms_bg_1.jpg)',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: '50% 50%',
      backgroundSize: 'cover',
    },
    desktop: { paddingBottom: '150px' },
    mobile: {
      backgroundImage: 'url(./../images/common/cms_bg_1_m.jpg)',
      backgroundColor: '#38405e',
    },
    sources: ['cms/css/cms.css:35-38', 'cms/css/cms.css:88-90', 'cms/css/cms.css:116-119'],
  },
  'bg-image-2': {
    base: {
      backgroundImage: 'url(./../images/common/cms_bg_2.jpg)',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: '50% 50%',
      backgroundSize: 'cover',
    },
    mobile: {
      backgroundImage: 'url(./../images/common/cms_bg_2_m.jpg)',
      backgroundColor: '#181a27',
    },
    sources: ['cms/css/cms.css:40-43', 'cms/css/cms.css:121-124'],
  },
  'bg-image-3': {
    base: { backgroundImage: 'url(./../images/common/cms_bg_3.jpg)', backgroundRepeat: 'no-repeat', backgroundPosition: '50% 50%', backgroundSize: 'cover' },
    sources: ['cms/css/cms.css:45-48'],
  },
  'bg-image-4': {
    base: { backgroundImage: 'url(./../images/common/cms_bg_4.jpg)', backgroundRepeat: 'no-repeat', backgroundPosition: '50% 50%', backgroundSize: 'cover' },
    sources: ['cms/css/cms.css:50-53'],
  },
  'bg-image-5': {
    base: { backgroundImage: 'url(./../images/common/cms_bg_5.jpg)', backgroundRepeat: 'no-repeat', backgroundPosition: '50% 50%', backgroundSize: 'cover' },
    sources: ['cms/css/cms.css:55-58'],
  },
  'bg-image-6': {
    base: { backgroundImage: 'url(./../images/common/cms_bg_6.jpg)', backgroundRepeat: 'no-repeat', backgroundPosition: '50% 50%', backgroundSize: 'cover' },
    sources: ['cms/css/cms.css:59-62'],
  },
  'bg-image-7': {
    base: { backgroundImage: 'url(./../images/common/cms_bg_7.jpg)', backgroundRepeat: 'no-repeat', backgroundPosition: '50% 50%', backgroundSize: 'cover' },
    sources: ['cms/css/cms.css:63-65'],
  },
  'text-white': { base: { color: '#fff' }, sources: ['cms/css/cms.css:67-69'] },
} satisfies Record<CmsVariantName, VariantStyle>;
