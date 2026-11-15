import { z } from 'zod';
import { h, type Child, type ElementNode } from '../html/h.ts';
import { presetBackground } from '../helpers/background.ts';
import { presetHeader } from '../helpers/header.ts';
import type { SectionModel } from '../model/index.ts';
import type { FieldSpec } from './definition.ts';

/**
 * 호스트 CSS는 ul의 기본 글머리 기호·들여쓰기를 초기화하지 않는다(샘플 sample-inline-acne.html도 인라인으로 지움).
 * 프리셋 목록은 항상 이 인라인 초기화를 붙여, 사이트 초기화 CSS 유무와 관계없이 같은 모양이 되게 한다.
 */
export const LIST_RESET = { listStyle: 'none', paddingLeft: '0', margin: '0' } as const;

/** 프리셋 타입이 함께 쓰는 원본 머리글(작은 글 + 큰 글) */
export const headerShape = {
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
};

export const headerFields: FieldSpec[] = [
  { key: 'eyebrow', label: '머리 작은 제목', kind: 'richText' },
  { key: 'heading', label: '머리 제목', kind: 'richText' },
];

/**
 * 호스트 프리셋 골격: section.mig-section.type-NN(+배경) > [bg layer] + header.mig-header + div.mig-body.
 * header와 body는 바로 다음 형제여야 호스트 간격 규칙(.mig-header + .mig-body)을 받는다.
 */
export function presetSection(
  typeClass: string,
  section: SectionModel<{ eyebrow?: string | undefined; heading?: string | undefined }>,
  body: Child[],
): ElementNode {
  const bg = presetBackground(section.modifiers);
  return h('section', { class: ['mig-section', typeClass, ...bg.classes].join(' '), ...bg.attrs, style: bg.style }, [
    bg.layer,
    presetHeader({ eyebrow: section.data.eyebrow, title: section.data.heading }),
    h('div', { class: 'mig-body' }, body),
  ]);
}
