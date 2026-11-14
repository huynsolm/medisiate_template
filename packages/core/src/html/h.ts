/**
 * 문자열 대신 노드 트리로 HTML을 만들고, 직렬화는 serialize() 한 곳에서만 한다.
 * 속성은 넘긴 순서 그대로 쓰므로 같은 입력은 항상 byte 단위로 같은 출력을 낸다.
 */

export type StyleValue = string | number | undefined | null | false;
export type StyleObject = Record<string, StyleValue>;
export type AttrValue = string | number | boolean | undefined | null | StyleObject;
export type Attrs = Record<string, AttrValue>;

export interface ElementNode {
  kind: 'element';
  tag: string;
  attrs: Array<[string, string]>;
  children: HNode[];
}
export interface TextNode {
  kind: 'text';
  value: string;
}
/** 이미 안전하다고 검증된 HTML (sanitizeRichText 결과 등) */
export interface RawNode {
  kind: 'raw';
  html: string;
}
export interface CommentNode {
  kind: 'comment';
  value: string;
}
export interface FragmentNode {
  kind: 'fragment';
  children: HNode[];
}
export type HNode = ElementNode | TextNode | RawNode | CommentNode | FragmentNode;
export type Child = HNode | string | number | null | undefined | false | Child[];

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const BLOCK = new Set([
  'div', 'section', 'header', 'footer', 'article', 'p', 'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'svg', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figure',
]);
const SAFE_NAME = /^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/u;

function kebab(key: string): string {
  if (key.startsWith('--')) return key;
  return key.replace(/[A-Z]/gu, (c) => `-${c.toLowerCase()}`);
}

export function styleText(style: StyleObject): string {
  return Object.entries(style)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined && entry[1] !== null && entry[1] !== false)
    .map(([k, v]) => `${kebab(k)}: ${v};`)
    .join(' ');
}

function flatten(children: Child[], out: HNode[] = []): HNode[] {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) flatten(child, out);
    else if (typeof child === 'string' || typeof child === 'number') out.push({ kind: 'text', value: String(child) });
    else if (child.kind === 'fragment') flatten(child.children, out);
    else out.push(child);
  }
  return out;
}

export function h(tag: string, attrs: Attrs = {}, children: Child[] = []): ElementNode {
  const list: Array<[string, string]> = [];
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (value === true) list.push([name, '']);
    else if (typeof value === 'object') {
      const css = styleText(value);
      if (css) list.push([name, css]);
    } else list.push([name, String(value)]);
  }
  return { kind: 'element', tag, attrs: list, children: flatten(children) };
}

export const text = (value: string): TextNode => ({ kind: 'text', value });
export const raw = (html: string): RawNode => ({ kind: 'raw', html });
export const comment = (value: string): CommentNode => ({ kind: 'comment', value });
export const fragment = (...children: Child[]): FragmentNode => ({ kind: 'fragment', children: flatten(children) });

export function escapeText(value: string): string {
  return value.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/ /gu, '&nbsp;');
}

export function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/gu, '&quot;');
}

/** 주석 안에서 주석이 끝나거나 다시 열리지 않게 한다. */
export function escapeComment(value: string): string {
  return value.replace(/--/gu, '- -').replace(/^>/u, ' >').replace(/-$/u, '- ');
}

function isBlock(node: HNode): boolean {
  return node.kind === 'element' && BLOCK.has(node.tag);
}

export function serialize(node: HNode | HNode[]): string {
  if (Array.isArray(node)) return node.map((n) => serialize(n)).join('');
  switch (node.kind) {
    case 'text':
      return escapeText(node.value);
    case 'raw':
      return node.html;
    case 'comment':
      return `<!-- ${escapeComment(node.value)} -->`;
    case 'fragment':
      return node.children.some(isBlock)
        ? node.children.map((c) => serialize(c)).join('\n')
        : serializeChildren(node.children);
    case 'element': {
      if (!SAFE_NAME.test(node.tag)) throw new Error(`unsafe tag name: ${node.tag}`);
      const attrs = node.attrs
        .map(([name, value]) => {
          if (!SAFE_NAME.test(name)) throw new Error(`unsafe attribute name: ${name}`);
          return ` ${name}="${escapeAttr(value)}"`;
        })
        .join('');
      if (VOID.has(node.tag)) return `<${node.tag}${attrs}>`;
      return `<${node.tag}${attrs}>${serializeChildren(node.children)}</${node.tag}>`;
    }
  }
}

function serializeChildren(children: HNode[]): string {
  if (!children.some(isBlock)) return children.map((c) => serialize(c)).join('');
  let out = '\n';
  for (const child of children) {
    if (isBlock(child) && !out.endsWith('\n')) out += '\n';
    out += serialize(child);
    if (isBlock(child) || child.kind === 'comment') out += '\n';
  }
  return out;
}
