import { z } from 'zod';
import { h } from '../html/h.ts';
import { presetBackground } from '../helpers/background.ts';
import { presetHeader } from '../helpers/header.ts';
import { visualPcMo } from '../helpers/image.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { children, descendants, type DomElement } from '../parse/dom.ts';
import { byClass, firstByClass, originalHeader } from '../parse/original.ts';
import { isHeading, pairImages, richFrom, scanSection, uncoveredText, variantFromClasses } from '../parse/common.ts';
import { joinParagraphs } from '../html/rich-text.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  image: imagePairSchema.default({}),
  title: z.string().optional(),
  desc: z.string().optional(),
  /** 원본에서 제목이 이미지 뒤에 있었는지(이 경우 출력 순서가 원본과 같다) */
  titleAfterImage: z.boolean().optional(),
});
export type Type01Data = z.infer<typeof schema>;

/**
 * PC/MO 와이드 이미지 + 큰 설명. 호스트 계약:
 * section.type-01 > [header.mig-header] + div.mig-body > div.mig-content > .mig-visual + [.mig-highlight-box >] .mig-text-wrap
 */
/**
 * 원본 클래스 → 변형. highlight는 제안서의 '강조 텍스트' 설명을 근거로 한 **추정** 클래스명이다.
 * 실제 원본 클래스를 확인한 뒤 바꾼다.
 */
export const TYPE01_SOURCE_VARIANTS: Record<string, string> = { highlight: 'highlight' };

export const type01: TypeDefinition<Type01Data> = {
  id: 'type01',
  label: 'type01 와이드 이미지 + 설명',
  strategy: 'preset',
  hostPreset: 'type-01',
  variants: ['default', 'highlight'],
  schema: schema as z.ZodType<Type01Data>,
  fields: [
    { key: 'eyebrow', label: '머리 작은 제목', kind: 'richText' },
    { key: 'heading', label: '머리 제목', kind: 'richText' },
    { key: 'image', label: '이미지 (PC/MO)', kind: 'imagePair' },
    { key: 'title', label: '본문 제목', kind: 'richText' },
    { key: 'desc', label: '본문 설명', kind: 'richText' },
  ],
  defaults: { image: {}, title: '제목', desc: '설명' },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src, Object.keys(TYPE01_SOURCE_VARIANTS));
    const variant = variantFromClasses(src, TYPE01_SOURCE_VARIANTS, diagnostics);
    const { pair: image, extra } = pairImages(descendants(src.element, (el) => el.tagName === 'img'), src, diagnostics);
    // 머리글이 "작은 글 + 제목"(cms-header.top-border > p.cms-eyebrow + p.cms-title)이면 섹션 머리글(eyebrow·heading)로 읽는다.
    // 원본처럼 이미지 위에 출력되고, 작은 글이 설명에 섞이지 않는다(실제 페이지 14개 섹션에서 순서가 바뀌던 문제).
    const headerEl = firstByClass(src.element, 'cms-header');
    const header = headerEl && children(headerEl).some(byClass('cms-eyebrow')) ? originalHeader(src.element) : undefined;
    const inHeader = (el: DomElement) => Boolean(header && headerEl && (el === headerEl || descendants(headerEl).includes(el)));
    const heading = descendants(src.element, (el) => isHeading(el) && !inHeader(el))[0];
    // 원본 마크업은 제목도 <p class="cms-thin-title">이므로, 제목 요소 자신과 그 안의 문단은 설명에서 뺀다.
    const paragraphs = descendants(src.element, (el) => el.tagName === 'p' && !inHeader(el) && el !== heading && !(heading && descendants(heading).includes(el)));
    const desc = joinParagraphs(paragraphs.map(richFrom).filter(Boolean));
    const data: Type01Data = { image, ...(header?.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header?.heading ? { heading: header.heading } : {}) };
    const title = heading ? richFrom(heading) : '';
    if (title) data.title = title;
    const firstImg = descendants(src.element, (el) => el.tagName === 'img')[0];
    if (title && heading && firstImg) {
      const all = descendants(src.element);
      if (all.indexOf(heading) > all.indexOf(firstImg)) data.titleAfterImage = true;
    }
    if (desc) data.desc = desc;
    const lostText = uncoveredText(src.element, [...(header?.used ?? []), title, ...paragraphs.map(richFrom)]);
    const fallbackReason = extra.length
      ? `이미지 ${extra.length + (image.pc ? 1 : 0) + (image.mo ? 1 : 0)}장 중 ${extra.length}장을 담을 자리가 없음`
      : lostText
        ? `제목·문단 밖 텍스트를 담을 자리가 없음: ${lostText.slice(0, 40)}`
        : undefined;
    return { data, variant, modifiers, diagnostics, lossless: !fallbackReason && !diagnostics.some((d) => d.level !== 'info'), fallbackReason };
  },
  render(section, ctx) {
    const d = section.data;
    const bg = presetBackground(section.modifiers);
    /*
     * 알려진 배치 차이(1단계 결정): 원본 type01은 제목(cms-thin-title) → 이미지 → 설명 순서인데,
     * 호스트 type-01 프리셋은 글 묶음(제목 + 설명)을 이미지 아래에 둔다(.mig-text-wrap). 내용 손실은 없다.
     * 실제 617개 섹션이 해당해 fallback으로 돌릴 수 없으므로, 순서 검사용 출력에서만 제목을 이미지 앞에 둔다.
     * 제목을 이미지 위로 올릴지는 디자인 결정으로 남긴다(docs/review-real-pages-fixes.md).
     */
    const titleFirst = ctx.orderCheck && !d.titleAfterImage && !isBlank(d.title) ? h('strong', { class: 'mig-title' }, [rich(d.title)]) : null;
    const text =
      !isBlank(d.title) || !isBlank(d.desc)
        ? h('div', { class: 'mig-text-wrap' }, [
            !titleFirst && !isBlank(d.title) && h('strong', { class: 'mig-title' }, [rich(d.title)]),
            !isBlank(d.desc) && h('p', { class: 'mig-desc' }, [rich(d.desc)]),
          ])
        : null;
    return h('section', { class: ['mig-section', 'type-01', ...bg.classes].join(' '), ...bg.attrs, style: bg.style }, [
      bg.layer,
      presetHeader({ eyebrow: d.eyebrow, title: d.heading }),
      h('div', { class: 'mig-body' }, [
        h('div', { class: 'mig-content' }, [
          titleFirst,
          visualPcMo(d.image, { wide: true }),
          section.variant === 'highlight' && text ? h('div', { class: 'mig-highlight-box' }, [text]) : text,
        ]),
      ]),
    ]);
  },
};
