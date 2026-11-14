import type { ImageRef, Strategy, Theme } from '../model/index.ts';
import { serializeFluid, type FluidRange } from '../helpers/fluid.ts';
import { h, type ElementNode, type HNode } from '../html/h.ts';

/** SVG <defs>를 블록당 한 번만 모은다. */
export class DefsCollector {
  #defs = new Map<string, HNode>();
  constructor(readonly idPrefix: string) {}

  id(name: string): string {
    return `${this.idPrefix}${name}`;
  }

  /** name이 처음일 때만 build()를 호출해 등록한다. 실제 id를 돌려준다. */
  ensure(name: string, build: (id: string) => HNode): string {
    const id = this.id(name);
    if (!this.#defs.has(id)) this.#defs.set(id, build(id));
    return id;
  }

  get size(): number {
    return this.#defs.size;
  }

  render(): ElementNode | null {
    if (!this.#defs.size) return null;
    return h('svg', { width: '0', height: '0', style: { position: 'absolute' } }, [h('defs', {}, [...this.#defs.values()])]);
  }
}

export interface RenderContext {
  theme: Theme;
  mode: Strategy;
  defs: DefsCollector;
  idPrefix: string;
  fluidRange: FluidRange;
  /** resolveImageSrc. 지금은 identity */
  image: (img: ImageRef) => ImageRef;
  fluid: (min: number, max: number) => string;
}

export interface RenderContextOptions {
  theme?: Theme;
  mode?: Strategy;
  idPrefix?: string;
  fluidRange?: FluidRange;
  defs?: DefsCollector;
}

export const DEFAULT_THEME: Theme = { primary: '#c7b195', source: 'default' };

export function createRenderContext(options: RenderContextOptions = {}): RenderContext {
  const idPrefix = options.idPrefix ?? '';
  const fluidRange = options.fluidRange ?? 'host';
  return {
    theme: options.theme ?? DEFAULT_THEME,
    mode: options.mode ?? 'general',
    defs: options.defs ?? new DefsCollector(idPrefix),
    idPrefix,
    fluidRange,
    image: (img) => img,
    fluid: (min, max) => serializeFluid(min, max, fluidRange),
  };
}
