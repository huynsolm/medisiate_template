import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { serialize } from '../src/html/h.ts';
import { normalizeHtml } from '../src/html/normalize.ts';
import { createRenderContext } from '../src/render/context.ts';
import { sourceSections } from '../src/parse/sections.ts';
import { modifiersFromClasses } from '../src/parse/modifiers.ts';
import { defaultRegistry } from '../src/types/index.ts';
import { type00 } from '../src/types/type00.ts';
import { type01 } from '../src/types/type01.ts';
import type { SectionModel } from '../src/model/index.ts';

const root = path.resolve(import.meta.dirname, '../../..');
const fixture = (rel: string) => path.join(root, 'fixtures/types', rel);
const ctx = () => createRenderContext({ mode: 'preset' });

function parseFixture(rel: string) {
  const [src] = sourceSections(readFileSync(fixture(rel), 'utf8'), rel);
  const def = defaultRegistry.match(src!);
  const result = def!.parse!(src!, { diagnostics: [] });
  const section: SectionModel = { id: 's1', type: def!.id, variant: result.variant, modifiers: result.modifiers, data: result.data };
  return { def: def!, result, section };
}

describe('type00', () => {
  it('renders the host preset that the host hides', () => {
    const out = serialize(type00.render({ id: 's1', type: 'type00', variant: 'default', modifiers: {}, data: { title: '여드름' } }, ctx()));
    expect(out).toBe('<section class="mig-section type-00"><strong class="mig-title">여드름</strong></section>');
  });

  it('parses the page title', async () => {
    const { def, result, section } = parseFixture('type00/basic.source.html');
    expect(def.id).toBe('type00');
    expect(result.data).toEqual({ title: '여드름 치료' });
    await expect(JSON.stringify(section, null, 2) + '\n').toMatchFileSnapshot(fixture('type00/basic.expected.json'));
    await expect(serialize(def.render(section, ctx())) + '\n').toMatchFileSnapshot(fixture('type00/basic.expected.html'));
  });

  it('rejects data without a title', () => {
    expect(type00.schema.safeParse({}).success).toBe(false);
  });
});

describe('type01', () => {
  it('follows the host DOM contract: mig-body > mig-content > visual + text-wrap', () => {
    const out = serialize(
      type01.render(
        {
          id: 's1',
          type: 'type01',
          variant: 'default',
          modifiers: {},
          data: {
            image: { pc: { src: 'p.jpg', alt: 'a', kind: 'relative' }, mo: { src: 'm.jpg', alt: 'a', kind: 'relative' } },
            title: '제목',
            desc: '설명',
          },
        },
        ctx(),
      ),
    );
    expect(normalizeHtml(out)).toBe(
      normalizeHtml(
        '<section class="mig-section type-01"><div class="mig-body"><div class="mig-content">' +
          '<div class="mig-visual type-wide common-display-pc"><img decoding="async" loading="lazy" src="p.jpg" alt="a" style="border: 0;"></div>' +
          '<div class="mig-visual type-wide common-display-mo"><img decoding="async" loading="lazy" src="m.jpg" alt="a" style="border: 0;"></div>' +
          '<div class="mig-text-wrap"><strong class="mig-title">제목</strong><p class="mig-desc">설명</p></div>' +
          '</div></div></section>',
      ),
    );
  });

  it('wraps text in mig-highlight-box for the highlight variant', () => {
    const out = serialize(
      type01.render({ id: 's1', type: 'type01', variant: 'highlight', modifiers: {}, data: { image: {}, desc: 'x' } }, ctx()),
    );
    expect(out).toContain('<div class="mig-highlight-box">\n<div class="mig-text-wrap">');
  });

  it('omits the text wrap when there is no text', () => {
    const out = serialize(type01.render({ id: 's1', type: 'type01', variant: 'default', modifiers: {}, data: { image: {} } }, ctx()));
    expect(out).not.toContain('mig-text-wrap');
  });

  it('parses pc/mo images, heading and paragraphs', async () => {
    const { result, section, def } = parseFixture('type01/pc-mo.source.html');
    expect(result.data).toEqual({
      image: {
        pc: { src: 'https://cdn.example.com/acne_pc.jpg', alt: '여드름 치료 대표 이미지', width: 1200, height: 600, kind: 'https' },
        mo: { src: 'https://cdn.example.com/acne_mo.jpg', alt: '여드름 치료 대표 이미지', width: 720, height: 600, kind: 'https' },
      },
      title: '건드리지 말고<br>치료받자',
      desc: '여드름은 모낭 피지선에 발생하는 <strong>염증성 질환</strong>입니다.<br>초기에 치료하는 것이 중요합니다.',
    });
    expect(result.diagnostics).toEqual([]);
    await expect(JSON.stringify(section, null, 2) + '\n').toMatchFileSnapshot(fixture('type01/pc-mo.expected.json'));
    await expect(serialize(def.render(section, ctx())) + '\n').toMatchFileSnapshot(fixture('type01/pc-mo.expected.html'));
  });

  it('parses background variants, single images and reports what it dropped', async () => {
    const { result, section, def } = parseFixture('type01/bg-single.source.html');
    expect(result.modifiers).toEqual({ background: { kind: 'color', value: '#f4f4f4', token: 'bg-color-2' } });
    expect((result.data as { image: unknown }).image).toEqual({ pc: { src: 'http://old.example.com/single.jpg', alt: '', kind: 'http' } });
    expect(result.diagnostics.map((d) => d.code).sort()).toEqual(['IMAGE_HTTP', 'SCRIPT_REMOVED', 'UNKNOWN_CLASS']);
    expect(result.lossless).toBe(false);
    const html = serialize(def.render(section, ctx()));
    expect(html).toContain('class="mig-section type-01 type-bg"');
    expect(html).toContain('style="background-color: #f4f4f4;"');
    await expect(html + '\n').toMatchFileSnapshot(fixture('type01/bg-single.expected.html'));
  });

  it('accepts 0, 1 or 2 images', () => {
    expect(type01.schema.safeParse({ image: {} }).success).toBe(true);
    expect(type01.schema.safeParse({ image: { pc: { src: 'a', alt: '', kind: 'relative' } } }).success).toBe(true);
    expect(type01.schema.safeParse({ image: { pc: { src: 1 } } }).success).toBe(false);
  });
});

describe('modifiersFromClasses', () => {
  it('maps shared background classes', () => {
    expect(modifiersFromClasses(['cms', 'type01', 'type-bg']).modifiers).toEqual({ background: { kind: 'color', value: '#f9f3ec', token: 'type-bg' } });
    const img = modifiersFromClasses(['cms', 'type05', 'type-bg', 'bg-image-1', 'text-white']);
    expect(img.modifiers.background).toEqual({
      kind: 'image',
      value: 'http://fxfile.drline.net/cms/public/images/common/cms_bg_1.jpg',
      token: 'bg-image-1',
    });
    expect(img.modifiers.textWhite).toBe(true);
    expect(img.unknown).toEqual([]);
  });
  it('returns unknown classes', () => {
    expect(modifiersFromClasses(['cms', 'type01', 'foo']).unknown).toEqual(['foo']);
  });
});
