import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';

type Node = DefaultTreeAdapterMap['node'];

function normalizeStyle(value: string): string {
  return value
    .split(';')
    .map((decl) => decl.trim())
    .filter(Boolean)
    .map((decl) => {
      const i = decl.indexOf(':');
      return `${decl.slice(0, i).trim().toLowerCase()}: ${decl.slice(i + 1).trim().replace(/\s+/gu, ' ')}`;
    })
    .join('; ');
}

function lines(node: Node, depth: number, out: string[]): void {
  const pad = '  '.repeat(depth);
  if (node.nodeName === '#comment' || node.nodeName === '#documentType') return;
  if (node.nodeName === '#text') {
    const value = (node as DefaultTreeAdapterMap['textNode']).value.replace(/\s+/gu, ' ');
    if (value.trim()) out.push(`${pad}"${value}"`);
    return;
  }
  if ('tagName' in node) {
    const attrs = [...node.attrs]
      .map((a) => [a.name, a.name === 'style' ? normalizeStyle(a.value) : a.name === 'class' ? a.value.split(/\s+/u).filter(Boolean).sort().join(' ') : a.value] as const)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, value]) => ` ${name}="${value}"`)
      .join('');
    out.push(`${pad}<${node.tagName}${attrs}>`);
    depth += 1;
  }
  const kids = 'tagName' in node && node.tagName === 'template'
    ? (node as unknown as { content: { childNodes: Node[] } }).content.childNodes
    : 'childNodes' in node ? (node.childNodes as Node[]) : [];
  kids.forEach((child) => lines(child, depth, out));
}

/**
 * 비교용 정규화: 주석과 공백만 있는 텍스트 노드 제거, 공백 축약,
 * 속성 이름순 정렬, class 토큰 정렬, style 선언 공백 통일.
 */
export function normalizeHtml(html: string): string {
  const out: string[] = [];
  lines(parseFragment(html), 0, out);
  return out.join('\n');
}
