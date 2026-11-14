import { describe, expect, it } from 'vitest';
import { serialize } from '../src/html/h.ts';
import { createRenderContext } from '../src/render/context.ts';
import { fluid } from '../src/helpers/fluid.ts';
import { renderImage, visualPcMo } from '../src/helpers/image.ts';
import { generalHeader, presetHeader } from '../src/helpers/header.ts';
import { fullBleedInnerStyle, sectionBoxStyle, presetBackground } from '../src/helpers/background.ts';
import { hexBox, hexClipUrl } from '../src/helpers/hex.ts';
import { brPcOnly, brVisible, emptyDeco } from '../src/helpers/misc.ts';
import { classifyImageSrc, imageRef } from '../src/helpers/image-ref.ts';

const img = (src: string, width?: number, height?: number) => imageRef(src, '', width, height);

describe('fluid', () => {
  it('uses the host 375~1024 range by default', () => {
    expect(fluid(15, 22)).toBe('clamp(15px, calc(15px + (100vw - 375px) * 7 / 649), 22px)');
  });
  it('reproduces the sample formula with fluid.sample', () => {
    expect(fluid.sample(15, 22)).toBe('clamp(15px, calc(15px + (100vw - 375px) * 7 / 617), 22px)');
  });
  it('returns a plain size when min equals max', () => {
    expect(fluid(18, 18)).toBe('18px');
  });
  it('rejects min greater than max', () => {
    expect(() => fluid(20, 10)).toThrow();
  });
});

describe('images', () => {
  it('renders attributes in a fixed order', () => {
    expect(serialize(renderImage(img('/api/file/a', 1200, 600)))).toBe(
      '<img decoding="async" loading="lazy" src="/api/file/a" alt="" width="1200" height="600" style="border: 0;">',
    );
  });
  it('outputs a pc/mo pair with display classes', () => {
    const out = serialize(visualPcMo({ pc: img('p.jpg'), mo: img('m.jpg') }, { wide: true }));
    expect(out).toContain('<div class="mig-visual type-wide common-display-pc"><img');
    expect(out).toContain('<div class="mig-visual type-wide common-display-mo"><img');
  });
  it('outputs a single visual without display classes when only one image exists', () => {
    const out = serialize(visualPcMo({ mo: img('m.jpg') }));
    expect(out).toBe('<div class="mig-visual"><img decoding="async" loading="lazy" src="m.jpg" alt="" style="border: 0;"></div>');
  });
  it('outputs nothing when both images are missing', () => {
    expect(serialize(visualPcMo({}))).toBe('');
  });
  it('classifies image sources without changing them', () => {
    expect(classifyImageSrc('https://a/b.jpg')).toBe('https');
    expect(classifyImageSrc('http://a/b.jpg')).toBe('http');
    expect(classifyImageSrc('//a/b.jpg')).toBe('protocol-relative');
    expect(classifyImageSrc('/api/file/x')).toBe('relative');
    expect(classifyImageSrc('../img/x.png')).toBe('relative');
    expect(classifyImageSrc('data:image/png;base64,AA')).toBe('data');
    expect(classifyImageSrc('javascript:x')).toBe('other');
  });
});

describe('headers', () => {
  const ctx = createRenderContext({ fluidRange: 'sample' });
  it('renders the general-mode bar + eyebrow + title', () => {
    const out = serialize(generalHeader({ eyebrow: '여드름 발생과정', title: '왜 생길까요?' }, ctx));
    expect(out).toBe(
      '<div style="text-align: center;">\n' +
        '<div style="width: 40px; height: 3px; background-color: var(--mig-primary-color); border-radius: 2px; margin: 0 auto 12px;">&nbsp;</div>\n' +
        '<p style="margin: 0 0 6px; color: var(--mig-primary-color); font-size: clamp(14px, calc(14px + (100vw - 375px) * 4 / 617), 18px);">여드름 발생과정</p>\n' +
        '<strong class="mig-title" style="color: #414141; font-size: clamp(26px, calc(26px + (100vw - 375px) * 24 / 617), 50px);">왜 생길까요?</strong></div>',
    );
  });
  it('turns bar and title white on dark backgrounds', () => {
    const out = serialize(generalHeader({ title: 't' }, ctx, { white: true }));
    expect(out).toContain('background-color: #fff;');
    expect(out).toContain('class="mig-title" style="color: #fff;');
  });
  it('renders the preset header with host classes', () => {
    expect(serialize(presetHeader({ eyebrow: 'e', title: 't', desc: 'd' }))).toBe(
      '<header class="mig-header">\n<span class="mig-eyebrow">e</span><strong class="mig-title">t</strong>\n<p class="mig-desc">d</p>\n</header>',
    );
  });
  it('returns nothing for an empty preset header', () => {
    expect(presetHeader({})).toBeNull();
  });
});

describe('backgrounds', () => {
  it('builds a full-bleed colored section style', () => {
    const style = sectionBoxStyle({ background: { kind: 'color', value: 'rgb(249, 233, 227)' }, fullBleed: { paddingY: '70px' } });
    expect(serialize({ kind: 'element', tag: 'section', attrs: [], children: [] })).toBe('<section></section>');
    expect(Object.entries(style ?? {}).map(([k, v]) => `${k}:${v}`).join('|')).toBe(
      'backgroundColor:rgb(249, 233, 227)|width:100vw|position:relative|left:50%|transform:translateX(-50%)|padding:70px 0',
    );
    expect(fullBleedInnerStyle()).toEqual({ maxWidth: '1200px', margin: '0 auto', padding: '0 15px' });
  });
  it('puts the overlay before the image url', () => {
    const style = sectionBoxStyle({ background: { kind: 'image', value: 'http://x/bg.jpg', overlay: 'rgba(0,0,0,0.5)' } });
    expect(style?.backgroundImage).toBe("linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('http://x/bg.jpg')");
  });
  it('rejects urls that could break out of the style attribute', () => {
    expect(() => sectionBoxStyle({ background: { kind: 'image', value: "x');color:red" } })).toThrow();
  });
  it('maps preset backgrounds to type-bg and data-migration-bg', () => {
    const bg = presetBackground({ background: { kind: 'color', value: '#f4f4f4', token: 'bg-color-2' }, textWhite: true });
    expect(bg.classes).toEqual(['type-bg']);
    expect(bg.attrs['data-migration-bg']).toBe('true');
    expect(bg.style).toEqual({ backgroundColor: '#f4f4f4' });
    expect(presetBackground({}).classes).toEqual([]);
  });
});

describe('hex defs', () => {
  it('registers the clip path once per context', () => {
    const ctx = createRenderContext();
    hexBox({ top: '01', label: 'a' }, ctx);
    hexBox({ top: '02', label: 'b' }, ctx);
    expect(ctx.defs.size).toBe(1);
    expect(serialize(ctx.defs.render()!)).toContain('<clipPath id="hexClip" clipPathUnits="objectBoundingBox">');
  });
  it('prefixes ids so two contexts can coexist', () => {
    const a = createRenderContext({ idPrefix: 'p1-' });
    const b = createRenderContext({ idPrefix: 'p2-' });
    expect(hexClipUrl(a)).not.toBe(hexClipUrl(b));
    expect(hexClipUrl(a)).toBe("url('#p1-hexClip')");
  });
  it('renders no defs when nothing was registered', () => {
    expect(createRenderContext().defs.render()).toBeNull();
  });
});

describe('misc', () => {
  it('renders line breaks and empty decorations', () => {
    expect(serialize(brVisible())).toBe('<br class="br-migration is-visible">');
    expect(serialize(brPcOnly())).toBe('<br class="br-migration">');
    expect(serialize(emptyDeco({ width: '1px' }))).toBe('<div style="width: 1px;">&nbsp;</div>');
  });
});
