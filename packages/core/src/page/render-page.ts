import { h, serialize, type HNode } from '../html/h.ts';
import { cssColor } from '../helpers/background.ts';
import type { Diagnostic, ImageRef, PageModel, SectionModel, Strategy } from '../model/index.ts';
import { classifyImageSrc } from '../helpers/image-ref.ts';
import { createRenderContext, DefsCollector, type RenderContext } from '../render/context.ts';
import type { FluidRange } from '../helpers/fluid.ts';
import type { StyleObject } from '../html/h.ts';
import { FALLBACK_ID, fallbackType, type FallbackData } from '../types/fallback.ts';
import type { TypeDefinition, TypeRegistry } from '../types/definition.ts';
import { richTextToPlain } from '../html/rich-text.ts';

export interface RenderPageOptions {
  registry: TypeRegistry;
  fluidRange?: FluidRange;
  idPrefix?: string;
  /** 일반 모드 .inner 스타일 (샘플 기본값: row-gap) */
  generalInnerStyle?: StyleObject;
}

export interface RenderedBlock {
  mode: Strategy;
  sectionIds: string[];
  html: string;
}

export interface RenderPageResult {
  html: string;
  blocks: RenderedBlock[];
  diagnostics: Diagnostic[];
  fallbackCount: number;
}

interface Prepared {
  section: SectionModel;
  def: TypeDefinition<unknown>;
  strategy: Strategy | 'any';
}

function toFallback(section: SectionModel, reason: string): SectionModel<FallbackData> {
  const text = section.data && typeof section.data === 'object' ? collectText(section.data) : '';
  const images = collectImages(section.data);
  return { ...section, type: FALLBACK_ID, data: { reason, originalType: section.type, text, ...(images.length ? { images } : {}) } };
}

/** 검증에 실패한 데이터에서도 이미지는 잃지 않는다 */
function collectImages(value: unknown, out: ImageRef[] = []): ImageRef[] {
  if (Array.isArray(value)) value.forEach((v) => collectImages(v, out));
  else if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if (typeof v.src === 'string' && v.src) out.push({ src: v.src, alt: typeof v.alt === 'string' ? v.alt : '', kind: classifyImageSrc(v.src) });
    else Object.values(v).forEach((child) => collectImages(child, out));
  }
  return out;
}

function collectText(value: unknown): string {
  if (typeof value === 'string') return richTextToPlain(value);
  if (Array.isArray(value)) return value.map(collectText).filter(Boolean).join('\n');
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([k]) => !['src', 'kind', 'alt', 'width', 'height'].includes(k))
      .map(([, v]) => collectText(v))
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

function prepare(page: PageModel, registry: TypeRegistry, diagnostics: Diagnostic[]): Prepared[] {
  return page.sections.map((section, i) => {
    const sectionIndex = i + 1;
    const def = section.type === FALLBACK_ID ? (fallbackType as TypeDefinition<unknown>) : registry.get(section.type);
    if (!def) {
      diagnostics.push({ level: 'warn', code: 'UNSUPPORTED_TYPE', message: `등록되지 않은 타입: ${section.type}`, sectionIndex });
      return { section: toFallback(section, '등록되지 않은 타입'), def: fallbackType as TypeDefinition<unknown>, strategy: 'any' };
    }
    const parsed = def.schema.safeParse(section.data);
    if (!parsed.success) {
      diagnostics.push({
        level: 'error',
        code: 'INVALID_DATA',
        message: `${section.type} 데이터 검증 실패: ${parsed.error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`).join('; ')}`,
        sectionIndex,
      });
      return { section: toFallback(section, '데이터 검증 실패'), def: fallbackType as TypeDefinition<unknown>, strategy: 'any' };
    }
    return { section: { ...section, data: parsed.data }, def, strategy: def.strategy };
  });
}

/** 'any'는 앞 섹션, 없으면 뒤 섹션, 그래도 없으면 general */
function resolveStrategies(items: Prepared[]): Strategy[] {
  const out: Array<Strategy | undefined> = items.map((item) => (item.strategy === 'any' ? undefined : item.strategy));
  for (let i = 1; i < out.length; i++) out[i] ??= out[i - 1];
  for (let i = out.length - 2; i >= 0; i--) out[i] ??= out[i + 1];
  return out.map((s) => s ?? 'general');
}

export function renderPage(page: PageModel, options: RenderPageOptions): RenderPageResult {
  const diagnostics: Diagnostic[] = [];
  const items = prepare(page, options.registry, diagnostics);
  const strategies = resolveStrategies(items);
  const primary = cssColor(page.theme.primary);

  const groups: Array<{ mode: Strategy; items: Prepared[] }> = [];
  items.forEach((item, i) => {
    const mode = strategies[i]!;
    const last = groups.at(-1);
    if (last && last.mode === mode) last.items.push(item);
    else {
      if (last) {
        diagnostics.push({
          level: 'info',
          code: 'MIXED_MODE_SPLIT',
          message: `${last.mode} → ${mode} 모드가 바뀌어 블록을 나눔`,
          sectionIndex: i + 1,
        });
      }
      groups.push({ mode, items: [item] });
    }
  });

  const blocks = groups.map((group, blockIndex): RenderedBlock => {
    const idPrefix = `${options.idPrefix ?? ''}${blockIndex > 0 ? `b${blockIndex + 1}-` : ''}`;
    const ctx: RenderContext = createRenderContext({
      theme: page.theme,
      mode: group.mode,
      idPrefix,
      defs: new DefsCollector(idPrefix),
      ...(options.fluidRange ? { fluidRange: options.fluidRange } : {}),
    });
    const sections: HNode[] = group.items.map((item) => item.def.render(item.section, ctx));
    const defs = ctx.defs.render();
    const inner =
      group.mode === 'preset'
        ? h('div', { class: 'mig-container' }, [defs, sections])
        : h('div', { class: 'inner', style: options.generalInnerStyle ?? { rowGap: 'clamp(40px, 4em, 60px)' } }, [defs, sections]);
    const wrapper = h(
      'div',
      {
        class: ['migration-content', page.theme.preset ? `theme-${page.theme.preset}` : ''].filter(Boolean).join(' '),
        style: { '--mig-primary-color': primary },
      },
      [inner],
    );
    return { mode: group.mode, sectionIds: group.items.map((item) => item.section.id), html: `${serialize(wrapper)}\n` };
  });

  return {
    html: blocks.map((b) => b.html).join(''),
    blocks,
    diagnostics,
    fallbackCount: items.filter((item) => item.def.id === FALLBACK_ID).length,
  };
}
