import { h, type Child, type ElementNode } from '../html/h.ts';
import type { SectionModel } from '../model/index.ts';
import { backgroundScopeAttrs, fullBleedInnerStyle, pcBackgroundLayer, sectionBoxStyle } from './background.ts';

/** 일반 모드 섹션 골격: section.mig-section.type-text > div.mig-inner */
export function generalSection(section: SectionModel, children: Child[]): ElementNode {
  return h('section', { class: 'mig-section type-text', ...backgroundScopeAttrs(section.modifiers), style: sectionBoxStyle(section.modifiers) }, [
    pcBackgroundLayer(section.modifiers),
    h('div', { class: 'mig-inner', style: section.modifiers.fullBleed ? fullBleedInnerStyle() : undefined }, children),
  ]);
}
