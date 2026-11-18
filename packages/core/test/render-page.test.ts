import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { h } from '../src/html/h.ts';
import type { PageModel, SectionModel } from '../src/model/index.ts';
import { renderPage } from '../src/page/render-page.ts';
import { TypeRegistry, type TypeDefinition } from '../src/types/definition.ts';
import { resolveTheme } from '../src/theme/resolve.ts';
import { hexClipUrl } from '../src/helpers/hex.ts';

const textSchema = z.object({ text: z.string() });
const stub = (id: string, strategy: 'preset' | 'general' | 'any', hex = false): TypeDefinition<{ text: string }> => ({
  id,
  label: id,
  strategy,
  variants: ['default'],
  schema: textSchema,
  fields: [{ key: 'text', label: 'text', kind: 'text' }],
  defaults: { text: '' },
  render: (section, ctx) =>
    h('section', { class: `mig-section ${id}`, 'data-clip': hex ? hexClipUrl(ctx) : undefined }, [section.data.text]),
});

const registry = new TypeRegistry([stub('p', 'preset'), stub('g', 'general'), stub('hx', 'general', true), stub('any', 'any')]);
const section = (id: string, type: string, data: unknown = { text: id }): SectionModel => ({ id, type, variant: 'default', modifiers: {}, data });
const page = (sections: SectionModel[], primary = '#123456'): PageModel => ({
  version: 1,
  theme: { primary, source: 'default' },
  sections,
  diagnostics: [],
  meta: { coreVersion: '0', hostCss: { sha256: 'x', savedAt: 'y' } },
});

describe('renderPage', () => {
  it('wraps preset sections in mig-container', () => {
    const { html } = renderPage(page([section('s1', 'p')]), { registry });
    expect(html).toBe(
      '<div class="migration-content" style="--mig-primary-color: #123456;">\n<div class="mig-container">\n<section class="mig-section p">s1</section>\n</div>\n</div>\n',
    );
  });

  it('wraps general sections in .inner without mig-container', () => {
    const { html } = renderPage(page([section('s1', 'g')]), { registry });
    expect(html).toContain('<div class="inner" style="row-gap: clamp(40px, 4em, 60px);">');
    expect(html).not.toContain('mig-container');
  });

  it('splits blocks where the mode changes and reports it', () => {
    const result = renderPage(page([section('s1', 'p'), section('s2', 'g'), section('s3', 'p')]), { registry });
    expect(result.html.match(/class="migration-content"/gu)).toHaveLength(3);
    expect(result.diagnostics.filter((d) => d.code === 'MIXED_MODE_SPLIT')).toHaveLength(2);
  });

  it('lets "any" sections join the neighbouring block', () => {
    const result = renderPage(page([section('s1', 'any'), section('s2', 'p'), section('s3', 'any')]), { registry });
    expect(result.html.match(/class="migration-content"/gu)).toHaveLength(1);
    expect(result.html).toContain('mig-container');
  });

  it('writes the theme variable once per block and adds the preset class', () => {
    const p = page([section('s1', 'g')]);
    p.theme.preset = 'blue';
    const { html } = renderPage(p, { registry });
    expect(html.match(/--mig-primary-color/gu)).toHaveLength(1);
    expect(html).toContain('class="migration-content theme-blue"');
  });

  it('puts svg defs once at the start of the block that uses them', () => {
    const { html } = renderPage(page([section('s1', 'hx'), section('s2', 'hx')]), { registry });
    expect(html.match(/<clipPath /gu)).toHaveLength(1);
    expect(html.indexOf('<svg')).toBeLessThan(html.indexOf('<section'));
  });

  it('gives defs in later blocks a distinct id', () => {
    const { html } = renderPage(page([section('s1', 'hx'), section('s2', 'p'), section('s3', 'hx')]), { registry });
    expect(html).toContain('id="hexClip"');
    expect(html).toContain('id="b3-hexClip"');
  });

  it('is deterministic', () => {
    const p = page([section('s1', 'p'), section('s2', 'hx')]);
    expect(renderPage(p, { registry }).html).toBe(renderPage(p, { registry }).html);
  });

  it('renders unknown types and invalid data as fallback with diagnostics', () => {
    const result = renderPage(page([section('s1', 'nope'), section('s2', 'g', { text: 1 })]), { registry });
    expect(result.diagnostics.map((d) => d.code)).toEqual(expect.arrayContaining(['UNSUPPORTED_TYPE', 'INVALID_DATA']));
    expect(result.html.match(/data-migration-fallback="true"/gu)).toHaveLength(2);
    expect(result.fallbackCount).toBe(2);
  });

  it('rejects an unsafe primary color', () => {
    expect(() => renderPage(page([section('s1', 'g')], 'red;}'), { registry })).toThrow();
  });
});

describe('resolveTheme', () => {
  it('prefers file over hospital over default', () => {
    expect(resolveTheme({ default: { primary: '#000' } })).toEqual({ primary: '#000', source: 'default' });
    expect(resolveTheme({ default: { primary: '#000' }, hospital: { primary: '#111' } }).source).toBe('hospital');
    expect(resolveTheme({ default: { primary: '#000' }, hospital: { primary: '#111' }, file: { primary: '#222' } })).toEqual({
      primary: '#222',
      source: 'file',
    });
  });
  it('keeps a preset from a lower layer when the higher one only sets a color', () => {
    expect(resolveTheme({ default: { primary: '#000', preset: 'gold' }, file: { primary: '#222' } }).preset).toBe('gold');
  });
});
