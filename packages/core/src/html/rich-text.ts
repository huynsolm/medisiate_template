import { parseFragment } from 'parse5';
import { escapeAttr, escapeText } from './h.ts';

/** 제목·설명 같은 짧은 서식 텍스트에 허용하는 태그 */
export const RICH_TEXT_TAGS = new Set(['em', 'strong', 'b', 'i', 'br', 'span', 'u', 'sup', 'sub']);
const DROP_WITH_CONTENT = new Set(['script', 'style', 'template', 'iframe', 'object', 'noscript']);
const CLASS_TOKEN = /^[a-zA-Z0-9_-]+$/u;

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
    const attr = classes.length ? ` class="${escapeAttr(classes.join(' '))}"` : '';
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
