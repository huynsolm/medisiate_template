import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { h, serialize } from '../src/html/h.ts';
import { createRenderContext } from '../src/render/context.ts';
import { fallbackFromSource, fallbackType } from '../src/types/fallback.ts';
import { TypeRegistry, type TypeDefinition } from '../src/types/definition.ts';
import { sourceSections } from '../src/parse/sections.ts';
import { defaultRegistry } from '../src/types/index.ts';

const html = `<div class="cms-container"><section class="cms type27 foo"><h3>제목 --> 깨기</h3><p>본문&nbsp;텍스트</p><script>alert(1)</script></section></div>`;

describe('fallback', () => {
  it('renders a visible warning, the original text and the original html as an escaped comment', () => {
    const [src] = sourceSections(html, '01/a.html');
    const section = fallbackFromSource(src!, 's1', '미구현 타입');
    const out = serialize(fallbackType.render(section, createRenderContext()));
    expect(out).toContain('data-migration-fallback="true"');
    expect(out).toContain('[변환 미지원] type27 미구현 타입');
    expect(out).toContain('제목 --&gt; 깨기');
    expect(out).toContain('제목 --&gt; 깨기\n본문&nbsp;텍스트');
    // 주석은 한 번만 열리고 닫혀야 한다
    expect(out.match(/<!--/gu)).toHaveLength(1);
    expect(out.match(/-->/gu)).toHaveLength(1);
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('<h3>');
    expect(section.source).toEqual({ file: '01/a.html', index: 1, classList: ['cms', 'type27', 'foo'] });
  });

  it('is hidden from the type picker and adopts neighbouring mode', () => {
    expect(fallbackType.hidden).toBe(true);
    expect(fallbackType.strategy).toBe('any');
  });
});

describe('sourceSections', () => {
  it('finds cms sections in document order with type ids', () => {
    const sections = sourceSections('<section class="cms type01"></section><div><section class="cms type"></section></div>', 'x.html');
    expect(sections.map((s) => [s.index, s.typeId])).toEqual([
      [1, 'type01'],
      [2, null],
    ]);
  });
});

describe('TypeRegistry', () => {
  const def = (id: string, match?: boolean): TypeDefinition<{ a?: string | undefined }> => ({
    id,
    label: id,
    strategy: 'general',
    variants: ['default'],
    schema: z.object({ a: z.string().optional() }),
    fields: [],
    defaults: {},
    render: () => h('section'),
    parse: () => ({ data: {}, variant: 'default', modifiers: {}, diagnostics: [], lossless: true }),
    ...(match === undefined ? {} : { match: () => match }),
  });

  it('rejects duplicate ids', () => {
    expect(() => new TypeRegistry([def('a'), def('a')])).toThrow();
  });

  it('matches by explicit type class first, then by structure', () => {
    const registry = new TypeRegistry([def('type01'), def('structural', true)]);
    const [a, b] = sourceSections('<section class="cms type01"></section><section class="cms type99"></section>', 'x');
    expect(registry.match(a!)?.id).toBe('type01');
    expect(registry.match(b!)?.id).toBe('structural');
  });

  it('returns undefined when nothing matches', () => {
    const registry = new TypeRegistry([def('type01', false)]);
    const [s] = sourceSections('<section class="cms type50"></section>', 'x');
    expect(registry.match(s!)).toBeUndefined();
  });

  it('lists the default types without fallback', () => {
    expect(defaultRegistry.list().some((t) => t.id === 'fallback')).toBe(false);
    expect(defaultRegistry.get('text-visual')).toBeDefined();
  });
});
