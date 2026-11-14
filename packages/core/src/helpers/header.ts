import { h, type ElementNode } from '../html/h.ts';
import type { RichText } from '../model/index.ts';
import type { RenderContext } from '../render/context.ts';
import { emptyDeco, isBlank, rich } from './misc.ts';

export interface HeaderData {
  eyebrow?: RichText;
  title?: RichText;
  desc?: RichText;
}

export interface GeneralHeaderOptions {
  white?: boolean;
  titleSize?: [number, number];
  titleWeight?: string;
  align?: 'center' | 'left';
}

/** 일반 모드 섹션 머리: 짧은 막대 + 작은 제목 + 큰 제목 (샘플 구조) */
export function generalHeader(data: HeaderData, ctx: RenderContext, options: GeneralHeaderOptions = {}): ElementNode {
  const accent = options.white ? '#fff' : 'var(--mig-primary-color)';
  const [min, max] = options.titleSize ?? [26, 50];
  return h('div', { style: { textAlign: options.align ?? 'center' } }, [
    emptyDeco({
      width: '40px',
      height: '3px',
      backgroundColor: accent,
      borderRadius: '2px',
      margin: options.align === 'left' ? '0 0 12px' : '0 auto 12px',
    }),
    !isBlank(data.eyebrow) &&
      h('p', { style: { margin: '0 0 6px', color: accent, fontSize: ctx.fluid(14, 18) } }, [rich(data.eyebrow)]),
    h(
      'strong',
      {
        class: 'mig-title',
        style: { color: options.white ? '#fff' : '#414141', fontWeight: options.titleWeight, fontSize: ctx.fluid(min, max) },
      },
      [rich(data.title)],
    ),
  ]);
}

/** 프리셋 모드 섹션 머리: 호스트 .mig-header 계약 */
export function presetHeader(data: HeaderData): ElementNode | null {
  const parts = [
    !isBlank(data.eyebrow) && h('span', { class: 'mig-eyebrow' }, [rich(data.eyebrow)]),
    !isBlank(data.title) && h('strong', { class: 'mig-title' }, [rich(data.title)]),
    !isBlank(data.desc) && h('p', { class: 'mig-desc' }, [rich(data.desc)]),
  ];
  if (!parts.some(Boolean)) return null;
  return h('header', { class: 'mig-header' }, parts);
}
