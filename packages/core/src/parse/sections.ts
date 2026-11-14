import { classesOf, descendants, hasClass, parseDocument, type SourceSection } from './dom.ts';

const TYPE_CLASS = /^type(\d{2})$/u;

export function sectionTypeId(classList: string[]): string | null {
  const found = classList.find((c) => TYPE_CLASS.test(c));
  return found ?? null;
}

/** 문서 안의 section.cms를 문서 순서대로 꺼낸다. */
export function sourceSections(html: string, file: string): SourceSection[] {
  const doc = parseDocument(html);
  return descendants(doc, (el) => el.tagName === 'section' && hasClass(el, 'cms')).map((element, i) => {
    const classList = classesOf(element);
    const line = element.sourceCodeLocation?.startLine;
    return { file, index: i + 1, classList, typeId: sectionTypeId(classList), element, ...(line ? { line } : {}) };
  });
}
