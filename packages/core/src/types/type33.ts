import { z } from 'zod';
import { h } from '../html/h.ts';
import { generalSection } from '../helpers/general-section.ts';
import { generalHeader } from '../helpers/header.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { markReadInParts, richFrom, scanSection } from '../parse/common.ts';
import { finish, originalHeader } from '../parse/original.ts';
import { childNodes, children, descendants, hasClass, isElement, nodesHtml, type DomElement } from '../parse/dom.ts';
import { sanitizeRichText } from '../html/rich-text.ts';
import type { TypeDefinition } from './definition.ts';
import { figureFactsSchema, figureFactsType, type FigureFactsData } from './type27.ts';

const qnaSchema = z.object({
  question: z.string().default(''),
  /** 답 글(목록 앞) */
  answer: z.string().optional(),
  /** 답 안 목록(원본 ul.cms-list-box) */
  list: z.array(z.object({ text: z.string().default('') })).default([]),
});
const schema = figureFactsSchema.extend({ qna: z.array(qnaSchema).default([]) });
export type Type33Data = FigureFactsData & { qna: Array<z.infer<typeof qnaSchema>> };

const facts = figureFactsType('type33', 'type33');
/** Q&A 형태: 원본에서 Q&A로 읽었거나, 편집기에서 Q&A 항목을 넣은 경우 */
const isQna = (section: { variant: string; data: { qna?: unknown[] } }) => section.variant === 'qna' || (section.data.qna?.length ?? 0) > 0;

/** 답 요소의 글(목록 앞)과 첫 목록. 목록 뒤의 글이나 두 번째 목록은 읽지 않는다(남은 글 검사가 fallback). */
function readAnswer(el: DomElement): { answer: string; list: Array<{ text: string }> } {
  markReadInParts(el);
  const nodes = childNodes(el);
  const at = nodes.findIndex((n) => isElement(n) && (n.tagName === 'ul' || n.tagName === 'ol'));
  const before = at < 0 ? nodes : nodes.slice(0, at);
  const answer = sanitizeRichText(nodesHtml(before)).replace(/\s+/gu, ' ').replace(/\s*<br>\s*/gu, '<br>').trim();
  const listEl = at < 0 ? undefined : (nodes[at] as DomElement);
  const list = listEl ? children(listEl).filter((c) => c.tagName === 'li').map((li) => ({ text: richFrom(li) })) : [];
  return { answer, list };
}

/**
 * 원본 type33은 두 형태가 실제 페이지에 있다.
 * 1) 원 안 아이콘·작은 글·값 목록 → type27과 같은 읽기, 호스트 type-27 카드 프리셋(기본)
 * 2) Q&A 아코디언: .cms-list-item > dl.cms-inner-box > dt(span Q + .cms-description > button 질문) + dd.collapse(span A + .cms-description 답 [ul.cms-list-box])
 *    → 호스트 일반 모드 FAQ: .mig-faq-wrap > .mig-faq-item > .mig-faq-question(strong.mig-title) + .mig-faq-answer(p.mig-desc, ul)
 *    원본은 질문을 눌러 답을 펼치지만, 제안서 원칙(동작은 정적 표현)대로 답을 모두 펼쳐 둔다. Q·A 표시는 호스트 CSS(::before)가 그린다.
 * 호스트 FAQ 규칙은 일반 모드에만 있어, Q&A 섹션만 strategyFor로 일반 모드를 쓴다.
 */
export const type33: TypeDefinition<Type33Data> = {
  id: 'type33',
  label: 'type33 원 목록(아이콘·작은 글·값) 또는 Q&A',
  strategy: 'preset',
  strategyFor: (section) => (isQna(section) ? 'general' : 'preset'),
  // Q&A의 Q·A 표시 span은 호스트 CSS(::before)가 다시 그린다
  orderCheckIgnores: (el) => el.tagName === 'span' && /^[QA]$/u.test(el.childNodes.map((n) => (n as { value?: string }).value ?? '').join('').trim())
    && Boolean(el.parentNode && 'tagName' in el.parentNode && (el.parentNode.tagName === 'dt' || hasClass(el.parentNode as DomElement, 'copy'))),
  hostPreset: 'type-27',
  variants: ['default', 'qna'],
  schema: schema as z.ZodType<Type33Data>,
  fields: [
    ...facts.fields,
    {
      key: 'qna', label: 'Q&A (있으면 Q&A 형태로 출력)', kind: 'repeat', min: 0, max: 30,
      fields: [
        { key: 'question', label: '질문', kind: 'richText' },
        { key: 'answer', label: '답', kind: 'richText' },
        { key: 'list', label: '답 안 목록', kind: 'repeat', min: 0, max: 12, fields: [{ key: 'text', label: '글', kind: 'richText' }] },
      ],
    },
  ],
  defaults: { ...facts.defaults, qna: [] },
  parse(src, ctx) {
    const boxes = descendants(src.element, (el) => el.tagName === 'dl' && hasClass(el, 'cms-inner-box'));
    if (boxes.length === 0) {
      const result = facts.parse!(src, ctx);
      return { ...result, data: { ...result.data, qna: [] } };
    }
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const used: string[] = [...header.used];
    const qna = boxes.map((dl) => {
      const dt = children(dl).find((c) => c.tagName === 'dt');
      const dd = children(dl).find((c) => c.tagName === 'dd');
      const qEl = dt ? descendants(dt, (el) => hasClass(el, 'cms-description'))[0] : undefined;
      const aEl = dd ? descendants(dd, (el) => hasClass(el, 'cms-description'))[0] : undefined;
      const question = qEl ? richFrom(qEl) : '';
      const { answer, list } = aEl ? readAnswer(aEl) : { answer: '', list: [] };
      // 원본의 Q·A 표시(span)는 호스트가 다시 그리는 표시라 옮기지 않는다
      used.push('Q', 'A', question, answer, ...list.map((l) => l.text));
      return { question, ...(answer ? { answer } : {}), list };
    });
    const data: Type33Data = {
      ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}),
      items: [], qna,
    };
    const result = finish(src, data, used, [], { variant: 'qna', modifiers, diagnostics });
    return result;
  },
  render(section, ctx) {
    if (!isQna(section)) return facts.render(section as never, ctx);
    const d = section.data;
    return generalSection(section, [
      (!isBlank(d.heading) || !isBlank(d.eyebrow)) && generalHeader({ eyebrow: d.eyebrow, title: d.heading }, ctx, { white: section.modifiers.textWhite ?? false }),
      h('div', { class: 'mig-faq-wrap' }, d.qna.map((item) => h('div', { class: 'mig-faq-item' }, [
        h('div', { class: 'mig-faq-question' }, [h('strong', { class: 'mig-title' }, [rich(item.question)])]),
        h('div', { class: 'mig-faq-answer' }, [
          !isBlank(item.answer) && h('p', { class: 'mig-desc' }, [rich(item.answer)]),
          item.list.length > 0 && h('ul', { style: { listStyle: 'disc', paddingLeft: '1.2em', margin: '0' } }, item.list.map((l) => h('li', { class: 'mig-desc' }, [rich(l.text)]))),
        ]),
      ]))),
    ]);
  },
};
