import { parse, parseFragment, serializeOuter, type DefaultTreeAdapterMap } from 'parse5';

/** 원본 HTML 탐색용 얇은 유틸. parse5는 순수 JS라 브라우저에서도 동작한다. */
export type DomNode = DefaultTreeAdapterMap['node'];
export type DomElement = DefaultTreeAdapterMap['element'];
export type DomParent = DefaultTreeAdapterMap['parentNode'];

export function parseDocument(html: string) {
  return parse(html, { sourceCodeLocationInfo: true });
}

export function parseHtmlFragment(html: string) {
  return parseFragment(html, { sourceCodeLocationInfo: true });
}

export function isElement(node: DomNode): node is DomElement {
  return 'tagName' in node;
}

export function childNodes(node: DomNode): DomNode[] {
  if (isElement(node) && node.tagName === 'template') return (node as unknown as { content: { childNodes: DomNode[] } }).content.childNodes;
  return 'childNodes' in node ? (node.childNodes as DomNode[]) : [];
}

export function children(node: DomNode): DomElement[] {
  return childNodes(node).filter(isElement);
}

export function attr(element: DomElement, name: string): string | undefined {
  return element.attrs.find((a) => a.name === name)?.value;
}

export function classesOf(element: DomElement): string[] {
  return (attr(element, 'class') ?? '').split(/\s+/u).filter(Boolean);
}

export function hasClass(element: DomElement, name: string): boolean {
  return classesOf(element).includes(name);
}

/** 깊이 우선, 문서 순서 */
export function descendants(node: DomNode, predicate: (el: DomElement) => boolean = () => true): DomElement[] {
  const out: DomElement[] = [];
  const visit = (n: DomNode) => {
    for (const child of childNodes(n)) {
      if (isElement(child)) {
        if (predicate(child)) out.push(child);
        visit(child);
      }
    }
  };
  visit(node);
  return out;
}

export function first(node: DomNode, predicate: (el: DomElement) => boolean): DomElement | undefined {
  return descendants(node, predicate)[0];
}

export function ancestors(element: DomElement): DomElement[] {
  const out: DomElement[] = [];
  let current = element.parentNode as DomNode | null;
  while (current && isElement(current)) {
    out.push(current);
    current = current.parentNode as DomNode | null;
  }
  return out;
}

export function textContent(node: DomNode): string {
  if (node.nodeName === '#text') return (node as DefaultTreeAdapterMap['textNode']).value;
  if (isElement(node) && (node.tagName === 'script' || node.tagName === 'style')) return '';
  return childNodes(node).map(textContent).join('');
}

/** 공백을 한 칸으로 줄인 텍스트 */
export function plainText(node: DomNode): string {
  return textContent(node).replace(/\s+/gu, ' ').trim();
}

const BLOCK_TEXT = new Set(['p', 'div', 'li', 'section', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'tr', 'dt', 'dd', 'ul', 'ol', 'table']);

/** 블록 요소 경계를 줄바꿈으로 남긴 텍스트 (fallback 표시용) */
export function blockText(node: DomNode): string {
  const parts: string[] = [];
  const visit = (n: DomNode) => {
    if (n.nodeName === '#text') parts.push((n as DefaultTreeAdapterMap['textNode']).value.replace(/[ \t\r\n]+/gu, ' '));
    else if (isElement(n)) {
      if (n.tagName === 'script' || n.tagName === 'style') return;
      const block = BLOCK_TEXT.has(n.tagName);
      if (block) parts.push('\n');
      childNodes(n).forEach(visit);
      if (block) parts.push('\n');
    } else childNodes(n).forEach(visit);
  };
  visit(node);
  return parts.join('').split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
}

export function outerHtml(element: DomElement): string {
  return serializeOuter(element);
}

/** 요소의 자식 HTML (서식 텍스트 추출용) */
export function innerHtml(element: DomElement): string {
  return childNodes(element)
    .map((n) => (isElement(n) ? serializeOuter(n) : n.nodeName === '#text' ? escapeForHtml((n as DefaultTreeAdapterMap['textNode']).value) : ''))
    .join('');
}

function escapeForHtml(value: string): string {
  return value.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/ /gu, '&nbsp;');
}

export interface SourceSection {
  /** 원본 파일 (cms/contents 기준 상대경로) */
  file: string;
  /** 파일 안에서 1부터 시작하는 섹션 순번 */
  index: number;
  classList: string[];
  /** 'type01' 등. 번호가 없으면 null */
  typeId: string | null;
  element: DomElement;
  line?: number;
}
