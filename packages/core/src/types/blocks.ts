import { z } from 'zod';
import { h, type Child } from '../html/h.ts';
import { generalSection } from '../helpers/general-section.ts';
import { generalHeader } from '../helpers/header.ts';
import { visualPcMo } from '../helpers/image.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import type { ImagePair } from '../model/index.ts';
import { imageFromElement, isHeading, markReadInParts, richFrom, richFromNodes, scanSection, structureProblemsInNodes, TEXT_INLINE, visibilityOf, VIEWS } from '../parse/common.ts';
import { childNodes, children, descendants, hasClass, isElement, plainText, attr, type DomElement, type DomNode } from '../parse/dom.ts';
import { finish } from '../parse/original.ts';
import { imagePairSchema } from '../schema/page.ts';
import type { TypeDefinition } from './definition.ts';
import { colWidthsOf, readTable, renderTable, rowSchema, widthSchema, withoutKeptColWidths } from './type26.ts';

/*
 * 블록 순서 변환(일반 모드). 적힌 타입으로도, 같은 구조의 다른 타입으로도 옮기지 못한 섹션을
 * 머리글·제목·글·이미지·목록·표를 원본 순서대로 늘어놓아 옮긴다. 원본 고유 배치(열 수·카드·장식)는 호스트 기본 모양이 된다.
 * 손실 검사(finish)와 글 순서 검사는 다른 타입과 똑같이 적용되고, 옮길 수 없는 요소(동영상·지도·입력란 등)가 있으면 원본을 보존한다.
 */

export type BlockKind = 'eyebrow' | 'heading' | 'title' | 'text' | 'image' | 'list' | 'table';
export interface Block {
  kind: BlockKind;
  text?: string | undefined;
  /** 한쪽 화면 전용(원본 표시 클래스). 이미지는 image.only를 쓴다 */
  only?: 'pc' | 'mo' | undefined;
  image?: ImagePair | undefined;
  ordered?: boolean | undefined;
  start?: number | undefined;
  /** 목록 항목. only는 항목(li) 전체가 한쪽 화면 전용일 때(번호·글머리까지 함께 숨는다) */
  items?: Array<{ blocks: Block[]; only?: 'pc' | 'mo' | undefined }> | undefined;
  caption?: string | undefined;
  captionVisible?: boolean | undefined;
  colWidths?: Array<{ width: string }> | undefined;
  head?: Array<z.infer<typeof rowSchema>> | undefined;
  body?: Array<z.infer<typeof rowSchema>> | undefined;
}

const blockSchema: z.ZodType<Block> = z.lazy(() => z.object({
  kind: z.enum(['eyebrow', 'heading', 'title', 'text', 'image', 'list', 'table']),
  text: z.string().optional(),
  only: z.enum(['pc', 'mo']).optional(),
  image: imagePairSchema.optional(),
  ordered: z.boolean().optional(),
  start: z.number().int().optional(),
  items: z.array(z.object({ blocks: z.array(blockSchema).default([]), only: z.enum(['pc', 'mo']).optional() })).optional(),
  caption: z.string().optional(),
  captionVisible: z.boolean().optional(),
  colWidths: z.array(z.object({ width: widthSchema })).optional(),
  head: z.array(rowSchema).optional(),
  body: z.array(rowSchema).optional(),
})) as z.ZodType<Block>;

const schema = z.object({ blocks: z.array(blockSchema).default([]) });
export type BlocksData = z.infer<typeof schema>;

/** 글이 없어 옮길 것이 없는 장식 요소 */
const SKIP = new Set(['script', 'style', 'template', 'noscript', 'hr', 'colgroup', 'col', 'source', 'track']);
/** 블록 순서로 옮길 수 없는 요소(원본 보존) */
const UNSUPPORTED = new Set(['iframe', 'video', 'audio', 'object', 'embed', 'canvas', 'form', 'input', 'select', 'textarea', 'map', 'picture', 'math']);
/** 호스트 목록은 3단계까지 번호·글머리를 그린다 */
const MAX_LIST_DEPTH = 3;

interface Walk { used: string[]; problems: string[] }

function onlyOf(el: DomElement): 'pc' | 'mo' | undefined {
  const v = visibilityOf(el);
  if (v.pc === true && v.tablet === false && v.mo === false) return 'pc';
  if (v.pc === false && v.tablet === true && v.mo === true) return 'mo';
  return undefined;
}

/** 모든 화면에서 숨고(조상 포함) 글·이미지가 하나도 없는 요소 */
function hiddenAndEmpty(el: DomElement): boolean {
  const shown = visibilityOf(el);
  return VIEWS.every((v) => shown[v] === false) && plainText(el).trim() === '' && el.tagName !== 'img' && !descendants(el).some((d) => d.tagName === 'img');
}

const leafText = (el: DomElement) => descendants(el).every((d) => TEXT_INLINE.has(d.tagName) && d.tagName !== 'img');

function textBlock(el: DomElement, kind: BlockKind, w: Walk): Block | undefined {
  const text = richFrom(el);
  if (isBlank(text)) return undefined;
  w.used.push(text);
  const only = onlyOf(el);
  return { kind, text, ...(only ? { only } : {}) };
}

function walk(node: DomElement, w: Walk, depth: number, inHeader: boolean): Block[] {
  const out: Block[] = [];
  let run: DomNode[] = [];
  let parts = false;
  const flush = () => {
    if (run.some((n) => plainText(n).trim() !== '')) {
      w.problems.push(...structureProblemsInNodes(run));
      const text = richFromNodes(run);
      if (!isBlank(text)) {
        w.used.push(text);
        const only = onlyOf(node);
        out.push({ kind: 'text', text, ...(only ? { only } : {}) });
      }
    }
    run = [];
  };
  for (const child of childNodes(node)) {
    if (!isElement(child)) {
      if (child.nodeName === '#text') run.push(child);
      continue;
    }
    const tag = child.tagName;
    if (SKIP.has(tag)) continue;
    // 모든 화면에서 숨은 빈 요소(빈 목록·빈 표 등)는 원본 화면에 아무것도 남기지 않으므로 옮기지 않는다
    if (hiddenAndEmpty(child)) continue;
    if (tag === 'svg') {
      if (plainText(child).trim()) w.problems.push('도형(svg) 안의 글');
      continue;
    }
    if (UNSUPPORTED.has(tag)) {
      w.problems.push(`<${tag}>`);
      continue;
    }
    const isImage = tag === 'img' || (tag === 'a' && plainText(child).trim() === '' && children(child).length === 1 && children(child)[0]!.tagName === 'img');
    if (isImage) {
      flush();
      parts = true;
      const img = tag === 'img' ? child : children(child)[0]!;
      const ref = imageFromElement(img);
      const only = onlyOf(img);
      out.push({ kind: 'image', image: { pc: ref, ...(only ? { only } : {}) } });
      continue;
    }
    if (TEXT_INLINE.has(tag)) {
      run.push(child);
      continue;
    }
    flush();
    parts = true;
    if (tag === 'ul' || tag === 'ol') {
      if (depth >= MAX_LIST_DEPTH) {
        w.problems.push(`${MAX_LIST_DEPTH}단계보다 깊은 목록`);
        continue;
      }
      const items = children(child).filter((li) => li.tagName === 'li').flatMap((li) => {
        markReadInParts(li);
        // 항목 전체가 한쪽 화면 전용이면 항목(li)에 표시를 둔다. 글에만 두면 번호·글머리가 남고 다음 번호가 밀린다 (검수 I-3)
        const only = onlyOf(li);
        if (attr(li, 'value') !== undefined) w.problems.push('항목 번호 지정(li value)');
        // 모든 화면에서 숨은, 글·이미지 없는 항목은 원본에서 번호·자리를 차지하지 않으므로 옮기지 않는다
        // (빈 목록·빈 표 같은 빈 구조가 들어 있어도 같다. 재검수 I-2, 3차 I-1).
        // 글·이미지가 든 숨은 항목은 남겨 두어 글 순서 검사가 차이를 찾아 원본을 보존하게 한다.
        if (hiddenAndEmpty(li)) return [];
        const inner = walk(li, w, depth + 1, false);
        return [{ blocks: inner, ...(only && only !== onlyOf(child) ? { only } : {}) }];
      });
      if (children(child).some((c) => c.tagName !== 'li')) w.problems.push('목록 안의 항목 밖 요소');
      // 호스트 번호는 CSS 카운터(mig-counter)라 역순은 옮기지 않는다(원본 보존). 시작 번호는 카운터 시작값으로 옮긴다 (검수 I-1·I-2)
      if (attr(child, 'reversed') !== undefined) w.problems.push('역순 번호 목록(reversed)');
      const start = Number(attr(child, 'start'));
      const only = onlyOf(child);
      out.push({ kind: 'list', ordered: tag === 'ol', ...(tag === 'ol' && Number.isInteger(start) && attr(child, 'start') ? { start } : {}), items, ...(only ? { only } : {}) });
      continue;
    }
    if (tag === 'table') {
      const table = readTable(child, w.problems);
      w.used.push(table.caption, ...[...table.head, ...table.body].flatMap((r) => r.cells.map((c) => c.text)));
      if (children(child).some((c) => c.tagName === 'tfoot')) w.problems.push('표의 tfoot');
      const colWidths = colWidthsOf(descendants(child, (el) => el.tagName === 'col'));
      const only = onlyOf(child);
      out.push({ kind: 'table', ...table, colWidths, ...(only ? { only } : {}) });
      continue;
    }
    const header = inHeader || hasClass(child, 'cms-header');
    if (leafText(child)) {
      const kind: BlockKind = header
        ? (hasClass(child, 'cms-eyebrow') ? 'eyebrow' : 'heading')
        : (isHeading(child) || tag === 'dt' ? 'title' : 'text');
      const block = textBlock(child, kind, w);
      if (block) out.push(block);
      continue;
    }
    markReadInParts(child);
    out.push(...walk(child, w, depth, header));
  }
  flush();
  if (parts) markReadInParts(node);
  return pairAlternatives(out);
}

/** 이어진 PC 전용 이미지 + 모바일 전용 이미지(원본의 PC/MO 대안)는 한 쌍으로 묶는다 */
function pairAlternatives(blocks: Block[]): Block[] {
  const out: Block[] = [];
  for (const b of blocks) {
    const prev = out[out.length - 1];
    const a = prev?.kind === 'image' ? prev.image : undefined;
    const c = b.kind === 'image' ? b.image : undefined;
    if (a && c && a.only && c.only && a.only !== c.only && !a.mo && !c.mo) {
      const pc = a.only === 'pc' ? a.pc! : c.pc!;
      const mo = a.only === 'mo' ? a.pc! : c.pc!;
      prev!.image = { pc, mo };
      continue;
    }
    out.push(b);
  }
  return out;
}

/** 호스트 번호 카운터: ol > li > ol로 바로 이어진 번호 목록의 단계마다 다르다(1단계 mig-counter, 2단계 -sub, 3단계 -sub-sub) */
const COUNTERS = ['mig-counter', 'mig-counter-sub', 'mig-counter-sub-sub'];

/** chain: 바로 바깥 항목이 몇 단계 이어진 번호 목록 안에 있는지(0 = 번호 목록 밖) */
function renderBlocks(blocks: Block[], white: boolean, ctx: Parameters<TypeDefinition['render']>[1], chain = 0): Child[] {
  const out: Child[] = [];
  const display = (b: Block) => (b.only ? ` common-display-${b.only}` : '');
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    if (b.kind === 'eyebrow' || b.kind === 'heading') {
      // 머리글: 작은 글 + 제목을 한 묶음으로(샘플의 막대 + 작은 제목 + 큰 제목)
      const next = blocks[i + 1];
      const pairWithNext = b.kind === 'eyebrow' && next?.kind === 'heading';
      out.push(generalHeader({ eyebrow: b.kind === 'eyebrow' ? b.text : undefined, title: b.kind === 'heading' ? b.text : pairWithNext ? next!.text : undefined }, ctx, { white }));
      if (pairWithNext) i++;
      continue;
    }
    if (b.kind === 'title') out.push(h('div', { class: `mig-title-wrap${display(b)}` }, [h('strong', { class: 'mig-title' }, [rich(b.text)])]));
    else if (b.kind === 'text') out.push(h('p', { class: `mig-desc${display(b)}` }, [rich(b.text)]));
    else if (b.kind === 'image' && b.image) out.push(visualPcMo(b.image));
    else if (b.kind === 'list') {
      // 호스트는 ol의 기본 번호 대신 ::before의 counter(mig-counter)를 그린다. start 속성은 그 카운터를 바꾸지 않으므로
      // 카운터 시작값(start - 1)을 함께 준다 (검수 I-1)
      // 중첩 번호 목록은 단계마다 다른 카운터를 그리므로 그 단계의 카운터에 준다 (재검수 I-1)
      const level = b.ordered ? chain + 1 : 0;
      const counter = b.ordered && b.start !== undefined ? { counterReset: `${COUNTERS[Math.min(level, COUNTERS.length) - 1]} ${b.start - 1}` } : undefined;
      out.push(h(b.ordered ? 'ol' : 'ul', { class: `mig-list ${b.ordered ? 'type-ordered' : 'type-bullet'}${display(b)}`, start: b.start, style: counter },
        (b.items ?? []).map((item) => h('li', { class: `mig-item${item.only ? ` common-display-${item.only}` : ''}` }, renderBlocks(item.blocks, white, ctx, level)))));
    } else if (b.kind === 'table') {
      const table = renderTable({ caption: b.caption ?? '', captionVisible: b.captionVisible ?? false, colWidths: b.colWidths ?? [], head: b.head ?? [], body: b.body ?? [] });
      out.push(b.only ? h('div', { class: display(b).trim() }, [table]) : table);
    }
  }
  return out;
}

export const blocks: TypeDefinition<BlocksData> = {
  id: 'blocks',
  label: 'blocks 블록 순서 (일반 모드)',
  strategy: 'general',
  variants: ['default'],
  schema: schema as z.ZodType<BlocksData>,
  fields: [
    {
      key: 'blocks', label: '블록 (원본 순서)', kind: 'repeat', min: 0, max: 60,
      help: '표 블록의 칸은 편집기에서 고치지 않고 그대로 둡니다.',
      fields: [
        { key: 'kind', label: '종류', kind: 'select', options: [
          { value: 'eyebrow', label: '머리 작은 글' }, { value: 'heading', label: '머리 제목' }, { value: 'title', label: '제목' },
          { value: 'text', label: '글' }, { value: 'image', label: '이미지' }, { value: 'list', label: '목록' }, { value: 'table', label: '표' },
        ] },
        { key: 'text', label: '글', kind: 'richText' },
        { key: 'image', label: '이미지 (PC/MO)', kind: 'imagePair' },
        { key: 'ordered', label: '번호 목록', kind: 'checkbox' },
        { key: 'items', label: '목록 항목', kind: 'repeat', min: 0, max: 30, fields: [
          { key: 'blocks', label: '항목 안 블록', kind: 'repeat', min: 0, max: 10, fields: [
            { key: 'kind', label: '종류', kind: 'select', options: [{ value: 'title', label: '제목' }, { value: 'text', label: '글' }, { value: 'image', label: '이미지' }] },
            { key: 'text', label: '글', kind: 'richText' },
            { key: 'image', label: '이미지 (PC/MO)', kind: 'imagePair' },
          ] },
        ] },
      ],
    },
  ],
  defaults: { blocks: [{ kind: 'text', text: '글' }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const w: Walk = { used: [], problems: [] };
    const data: BlocksData = { blocks: walk(src.element, w, 0, false) };
    const result = finish(src, data, w.used, [], { modifiers, diagnostics: withoutKeptColWidths(diagnostics) });
    if (w.problems.length && !result.fallbackReason) {
      return { ...result, lossless: false, fallbackReason: `블록 순서로 옮길 수 없음: ${[...new Set(w.problems)].slice(0, 3).join(', ')}` };
    }
    return result;
  },
  render(section, ctx) {
    return generalSection(section, [
      h('div', { class: 'mig-content' }, [
        h('div', { class: 'mig-content-inner' }, renderBlocks(section.data.blocks, section.modifiers.textWhite ?? false, ctx)),
      ]),
    ]);
  },
};
