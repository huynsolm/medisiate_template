import { parseFragment } from 'parse5';
import { escapeAttr, escapeText } from './h.ts';
import { CSS_COLOR, CSS_LENGTH } from '../schema/page.ts';

/** 제목·설명 같은 짧은 서식 텍스트에 허용하는 태그 */
export const RICH_TEXT_TAGS = new Set(['em', 'strong', 'b', 'i', 'br', 'span', 'u', 'sup', 'sub']);
const DROP_WITH_CONTENT = new Set(['script', 'style', 'template', 'iframe', 'object', 'noscript']);
const CLASS_TOKEN = /^[a-zA-Z0-9_-]+$/u;

type StyleCheck = (value: string) => boolean;

/** 서식 태그에 남기는 inline style */
const TEXT_STYLE: Record<string, StyleCheck> = {
  color: (v) => CSS_COLOR.test(v),
  'background-color': (v) => CSS_COLOR.test(v),
  'font-weight': (v) => /^(normal|bold|bolder|lighter|[1-9]00)$/u.test(v),
};

/** 계획서 5.2 허용 목록 중 블록 단위 속성 */
const BLOCK_STYLE: Record<string, StyleCheck> = {
  'text-align': (v) => /^(left|center|right|justify|start|end)$/u.test(v),
  width: (v) => CSS_LENGTH.test(v),
  'max-width': (v) => CSS_LENGTH.test(v),
};

/**
 * 단락·제목 자신의 style을 담는 요소. 이 요소들의 style은 parse 단계에서
 * `<span style="display: block; …">`로 감싸 서식 텍스트 안에 보존한다 (blockStyleSpan).
 */
export const BLOCK_STYLE_CARRIERS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

function allowedStyles(tag: string): Record<string, StyleCheck> {
  if (BLOCK_STYLE_CARRIERS.has(tag)) return { ...TEXT_STYLE, ...BLOCK_STYLE };
  // span은 블록 단락을 옮겨 담을 때 display:block과 정렬·폭을 함께 가진다
  if (tag === 'span') return { ...TEXT_STYLE, ...BLOCK_STYLE, display: (v) => v === 'block' };
  if (RICH_TEXT_TAGS.has(tag) && tag !== 'br') return TEXT_STYLE;
  return {};
}

/** style 속성을 선언 단위로 나눠 허용 목록을 통과한 것(kept)과 버린 것(dropped)으로 가른다. */
export function filterInlineStyle(tag: string, style: string): { kept: string[]; dropped: string[] } {
  const kept: string[] = [];
  const dropped: string[] = [];
  const allowed = allowedStyles(tag);
  for (const raw of style.split(';').map((d) => d.trim()).filter(Boolean)) {
    const i = raw.indexOf(':');
    const prop = raw.slice(0, i).trim().toLowerCase();
    const value = raw.slice(i + 1).trim();
    const check = allowed[prop];
    if (i > 0 && check?.(value)) kept.push(`${prop}: ${value};`);
    else dropped.push(raw);
  }
  return { kept, dropped };
}

/** 단락·제목의 허용 style을 블록 span으로 옮겨 담는다. 옮길 것이 없으면 내용 그대로. */
export function blockStyleSpan(tag: string, style: string | undefined, inner: string): string {
  if (!inner || !style || !BLOCK_STYLE_CARRIERS.has(tag)) return inner;
  const kept = filterInlineStyle(tag, style).kept;
  return kept.length ? `<span style="display: block; ${escapeAttr(kept.join(' '))}">${inner}</span>` : inner;
}

const BLOCK_SPAN_START = '<span style="display: block;';

/** 단락들을 이어 붙인다. 블록 span 옆에는 줄바꿈을 넣지 않는다 (span이 이미 줄을 바꾼다). */
export function joinParagraphs(parts: string[]): string {
  return parts.reduce((out, part, i) => {
    if (i === 0) return part;
    const prevBlock = parts[i - 1]!.startsWith(BLOCK_SPAN_START);
    return out + (prevBlock || part.startsWith(BLOCK_SPAN_START) ? '' : '<br>') + part;
  }, '');
}

interface P5Node {
  nodeName: string;
  tagName?: string;
  value?: string;
  attrs?: Array<{ name: string; value: string }>;
  childNodes?: P5Node[];
  content?: P5Node;
}

function walk(nodes: P5Node[] | undefined): string {
  let out = '';
  for (const node of nodes ?? []) {
    if (node.nodeName === '#text') {
      out += escapeText(node.value ?? '');
      continue;
    }
    const tag = node.tagName;
    if (!tag || DROP_WITH_CONTENT.has(tag)) continue;
    const inner = walk(node.childNodes);
    if (!RICH_TEXT_TAGS.has(tag)) {
      out += inner;
      continue;
    }
    const classes = (node.attrs?.find((a) => a.name === 'class')?.value ?? '')
      .split(/\s+/u)
      .filter((token) => CLASS_TOKEN.test(token));
    const style = filterInlineStyle(tag, node.attrs?.find((a) => a.name === 'style')?.value ?? '').kept.join(' ');
    const attr = `${classes.length ? ` class="${escapeAttr(classes.join(' '))}"` : ''}${style ? ` style="${escapeAttr(style)}"` : ''}`;
    out += tag === 'br' ? `<br${attr}>` : `<${tag}${attr}>${inner}</${tag}>`;
  }
  return out;
}

/** 허용 목록 밖의 태그는 풀고(텍스트 유지), class 외 속성은 모두 지운다. */
export function sanitizeRichText(html: string): string {
  const fragment = parseFragment(html) as unknown as P5Node;
  return walk(fragment.childNodes);
}

/** 서식을 모두 걷어낸 순수 텍스트 */
export function richTextToPlain(html: string): string {
  const fragment = parseFragment(html.replace(/<br\b[^>]*>/giu, ' ')) as unknown as P5Node;
  const collect = (nodes: P5Node[] | undefined): string =>
    (nodes ?? []).map((n) => (n.nodeName === '#text' ? (n.value ?? '') : DROP_WITH_CONTENT.has(n.tagName ?? '') ? '' : collect(n.childNodes))).join('');
  return collect(fragment.childNodes).replace(/\s+/gu, ' ').trim();
}
