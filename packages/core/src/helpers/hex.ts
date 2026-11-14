import { h, type ElementNode } from '../html/h.ts';
import type { RichText } from '../model/index.ts';
import type { RenderContext } from '../render/context.ts';
import { cssColor } from './background.ts';
import { emptyDeco, rich } from './misc.ts';

const HEX_PATH =
  'M 0.145 0.067 Q 0.18 0 0.27 0 L 0.73 0 Q 0.82 0 0.855 0.067 L 0.99 0.433 Q 1.02 0.5 0.99 0.567 L 0.855 0.933 Q 0.82 1 0.73 1 L 0.27 1 Q 0.18 1 0.145 0.933 L 0.01 0.567 Q -0.02 0.5 0.01 0.433 Z';

/** 육각형 clipPath를 블록에 한 번만 등록하고 clip-path 값을 돌려준다. */
export function hexClipUrl(ctx: RenderContext): string {
  const id = ctx.defs.ensure('hexClip', (clipId) =>
    h('clipPath', { id: clipId, clipPathUnits: 'objectBoundingBox' }, [h('path', { d: HEX_PATH })]),
  );
  return `url('#${id}')`;
}

export interface HexItem {
  top?: string | undefined;
  label: RichText;
}

export interface HexOptions {
  ringColor?: string | undefined;
  fillColor?: string | undefined;
}

export function hexBox(item: HexItem, ctx: RenderContext, options: HexOptions = {}): ElementNode {
  const clip = hexClipUrl(ctx);
  return h(
    'div',
    {
      style: {
        position: 'relative', width: '100%', maxWidth: '220px', aspectRatio: '286/274', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: '16px', boxSizing: 'border-box',
      },
    },
    [
      emptyDeco({ position: 'absolute', inset: '0', backgroundColor: cssColor(options.ringColor ?? 'rgb(236, 228, 218)'), clipPath: clip, pointerEvents: 'none' }),
      emptyDeco({
        position: 'absolute', top: '6px', left: '6px', right: '6px', bottom: '6px',
        backgroundColor: cssColor(options.fillColor ?? '#fff'), clipPath: clip, pointerEvents: 'none',
      }),
      item.top !== undefined && item.top !== '' &&
        h('p', { style: { position: 'relative', fontSize: '14px', color: 'var(--mig-primary-color)', margin: '0 0 6px' } }, [item.top]),
      h(
        'p',
        { style: { position: 'relative', fontSize: 'clamp(16px, 2vw, 22px)', color: 'var(--mig-primary-color)', margin: '0', fontWeight: 'bold', lineHeight: '1.3' } },
        [rich(item.label)],
      ),
    ],
  );
}
