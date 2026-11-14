import { z } from 'zod';
import { h } from '../html/h.ts';
import { presetBackground } from '../helpers/background.ts';
import { presetHeader } from '../helpers/header.ts';
import { visualPcMo } from '../helpers/image.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { descendants } from '../parse/dom.ts';
import { isHeading, pairImages, richFrom, scanSection, uncoveredText, variantFromClasses } from '../parse/common.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  image: imagePairSchema.default({}),
  title: z.string().optional(),
  desc: z.string().optional(),
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
    const heading = descendants(src.element, isHeading)[0];
    const paragraphs = descendants(src.element, (el) => el.tagName === 'p' && !(heading && descendants(heading).includes(el)));
    const desc = paragraphs.map(richFrom).filter(Boolean).join('<br>');
    const data: Type01Data = { image };
    const title = heading ? richFrom(heading) : '';
    if (title) data.title = title;
    if (desc) data.desc = desc;
    const lostText = uncoveredText(src.element, [title, ...paragraphs.map(richFrom)]);
    const fallbackReason = extra.length
      ? `이미지 ${extra.length + (image.pc ? 1 : 0) + (image.mo ? 1 : 0)}장 중 ${extra.length}장을 담을 자리가 없음`
      : lostText
        ? `제목·문단 밖 텍스트를 담을 자리가 없음: ${lostText.slice(0, 40)}`
        : undefined;
    return { data, variant, modifiers, diagnostics, lossless: !fallbackReason && !diagnostics.some((d) => d.level !== 'info'), fallbackReason };
  },
  render(section) {
    const d = section.data;
    const bg = presetBackground(section.modifiers);
    const text =
      !isBlank(d.title) || !isBlank(d.desc)
        ? h('div', { class: 'mig-text-wrap' }, [
            !isBlank(d.title) && h('strong', { class: 'mig-title' }, [rich(d.title)]),
            !isBlank(d.desc) && h('p', { class: 'mig-desc' }, [rich(d.desc)]),
          ])
        : null;
    return h('section', { class: ['mig-section', 'type-01', ...bg.classes].join(' '), ...bg.attrs, style: bg.style }, [
      presetHeader({ eyebrow: d.eyebrow, title: d.heading }),
      h('div', { class: 'mig-body' }, [
        h('div', { class: 'mig-content' }, [
          visualPcMo(d.image, { wide: true }),
          section.variant === 'highlight' && text ? h('div', { class: 'mig-highlight-box' }, [text]) : text,
        ]),
      ]),
    ]);
  },
};
