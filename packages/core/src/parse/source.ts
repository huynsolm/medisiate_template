import { parse } from 'parse5';

export interface SourceLocation {
  line: number;
  column: number;
}

export interface SourceElement {
  tagName: string;
  attrs: Record<string, string>;
  location?: SourceLocation;
  cmsSectionIndex?: number;
}

interface Parse5Node {
  nodeName: string;
  tagName?: string;
  attrs?: Array<{ name: string; value: string }>;
  childNodes?: Parse5Node[];
  sourceCodeLocation?: { startLine?: number; startCol?: number };
}

export function parseElements(html: string): SourceElement[] {
  const document = parse(html, { sourceCodeLocationInfo: true }) as Parse5Node;
  const elements: SourceElement[] = [];

  let sectionCount = 0;

  function visit(node: Parse5Node, inheritedSectionIndex?: number): void {
    let sectionIndex = inheritedSectionIndex;
    if (node.tagName) {
      const attrs = Object.fromEntries((node.attrs ?? []).map(({ name, value }) => [name, value]));
      const classes = (attrs.class ?? '').split(/\s+/u);
      if (node.tagName === 'section' && classes.includes('cms')) sectionIndex = ++sectionCount;
      const line = node.sourceCodeLocation?.startLine;
      const column = node.sourceCodeLocation?.startCol;
      elements.push({
        tagName: node.tagName,
        attrs,
        ...(line !== undefined && column !== undefined ? { location: { line, column } } : {}),
        ...(sectionIndex !== undefined ? { cmsSectionIndex: sectionIndex } : {}),
      });
    }
    node.childNodes?.forEach((child) => visit(child, sectionIndex));
  }

  visit(document);
  return elements;
}

export function classList(element: SourceElement): string[] {
  return (element.attrs.class ?? '').split(/\s+/u).filter(Boolean);
}

