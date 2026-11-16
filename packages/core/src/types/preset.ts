import { z } from 'zod';
import { h, type Child, type ElementNode } from '../html/h.ts';
import { visualPcMo } from '../helpers/image.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { presetBackground } from '../helpers/background.ts';
import { presetHeader } from '../helpers/header.ts';
import type { ImagePair, SectionModel } from '../model/index.ts';
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

/** 본문 앞뒤 설명(선택). readNotes()로 읽고 withNotes()로 출력한다 */
export const notesShape = {
  intro: z.string().optional(),
  note: z.string().optional(),
};
export const notesFields: FieldSpec[] = [
  { key: 'intro', label: '본문 앞 설명', kind: 'richText' },
  { key: 'note', label: '본문 뒤 설명', kind: 'richText' },
];
/** 본문 앞뒤 설명을 본문 자식 목록 앞뒤에 붙인다 */
export function withNotes(data: { intro?: string | undefined; note?: string | undefined }, body: Child[]): Child[] {
  const text = (value: string | undefined) => !isBlank(value) && h('div', { class: 'mig-text-wrap' }, [h('p', { class: 'mig-desc' }, [rich(value)])]);
  return [text(data.intro), ...body, text(data.note)];
}

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
    // 이미지 배경 섹션(data-migration-bg)은 호스트가 가운데 정렬 flex로 만들어 본문이 내용 폭으로 줄어든다.
    // 카드 목록이 찌그러지지 않도록 본문만 섹션 폭을 다 쓰게 한다(머리글의 가운데 정렬은 그대로).
    h('div', { class: 'mig-body', style: bg.attrs['data-migration-bg'] ? { alignSelf: 'stretch' } : undefined }, body),
  ]);
}

/**
 * 호스트 type-03/04는 이미지 칸을 줄이지 않고(flex-shrink: 0) 칸 비율도 없어 큰 이미지가 글을 밀어낸다.
 * 원본(col-lg-6)처럼 PC에서 이미지·글을 반반으로 둔다. 세로 배치(모바일)에서는 50%가 높이 기준이라 영향이 없다.
 */
export const HALF = { flex: '1 1 50%', minWidth: '0' } as const;

/** li.mig-item > .mig-content > .mig-visual(반) + .mig-text-wrap(반: 번호·제목·설명) */
export function imageTextItem(item: {
  num?: string | undefined; title?: string | undefined; desc?: string | undefined; image: ImagePair;
  steps?: Array<{ num?: string | undefined; text: string }> | undefined;
}): ElementNode {
  return h('li', { class: 'mig-item' }, [
    h('div', { class: 'mig-content' }, [
      visualPcMo(item.image, { attrs: { style: HALF } }),
      h('div', { class: 'mig-text-wrap', style: HALF }, [
        !isBlank(item.num) && h('span', { class: 'mig-num' }, [rich(item.num)]),
        !isBlank(item.title) && h('strong', { class: 'mig-title' }, [rich(item.title)]),
        !isBlank(item.desc) && h('p', { class: 'mig-desc' }, [rich(item.desc)]),
        // 번호 목록: 호스트 지그재그 규칙(.type-03 .mig-list .mig-item)이 후손 선택자라 mig-list/mig-item을 쓰지 않는다
        item.steps && item.steps.length > 0 && h('ul', { style: LIST_RESET }, item.steps.map((st) =>
          h('li', {}, [!isBlank(st.num) && h('span', { class: 'mig-num' }, [rich(st.num)]), ' ', h('span', { class: 'mig-desc' }, [rich(st.text)])]))),
      ]),
    ]),
  ]);
}
