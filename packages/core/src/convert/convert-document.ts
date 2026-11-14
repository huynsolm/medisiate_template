import { parse } from 'parse5';
import type { Diagnostic, FileStatus, ImageKind, PageMeta, PageModel, SectionModel, Theme } from '../model/index.ts';
import { renderPage } from '../page/render-page.ts';
import { attr, descendants, hasClass, type DomElement, type DomNode, type SourceSection } from '../parse/dom.ts';
import { sectionTypeId } from '../parse/sections.ts';
import { classesOf } from '../parse/dom.ts';
import { classifyImageSrc } from '../helpers/image-ref.ts';
import { richTextToPlain } from '../html/rich-text.ts';
import { fallbackFromSource } from '../types/fallback.ts';
import type { TypeRegistry } from '../types/definition.ts';
import type { FluidRange } from '../helpers/fluid.ts';

export interface ConvertOptions {
  registry: TypeRegistry;
  theme: Theme;
  coreVersion: string;
  hostCss: PageMeta['hostCss'];
  fluidRange?: FluidRange;
}

export interface ImageRecord {
  sectionIndex: number | null;
  src: string;
  kind: ImageKind;
}

export interface ConvertResult {
  page: PageModel;
  html: string;
  status: FileStatus;
  images: ImageRecord[];
  fallbackCount: number;
}

const SSI = /<!--#[a-z]+[\s\S]*?-->/giu;
/** 조각 파일이라 항상 나오는 오류는 복구로 치지 않는다 */
const BENIGN_PARSE_ERRORS = new Set(['missing-doctype']);

/** 상태 판정: error 또는 전부 fallback → failed, warn 또는 fallback 1개 이상 → partial */
export function fileStatus(diagnostics: Diagnostic[], sectionCount: number, fallbackCount: number): FileStatus {
  if (diagnostics.some((d) => d.level === 'error') || (sectionCount > 0 && fallbackCount === sectionCount)) return 'failed';
  if (fallbackCount > 0 || diagnostics.some((d) => d.level === 'warn')) return 'partial';
  return 'success';
}

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
/** 끝 태그를 생략해도 되는 요소와 파서가 스스로 만드는 요소 */
const OPTIONAL_END = new Set(['html', 'head', 'body', 'p', 'li', 'dt', 'dd', 'option', 'optgroup', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot', 'colgroup', 'rt', 'rp']);

/**
 * parse5는 트리 구성 단계의 복구를 알려주지 않는다.
 * 원문 끝 태그 수와 트리에 반영된 끝 태그 수를 비교하고, 닫히지 않은 요소를 찾는다.
 */
function treeRecoveries(doc: DomNode, html: string): Array<{ code: string; line: number; col: number }> {
  const out: Array<{ code: string; line: number; col: number }> = [];
  const elements = descendants(doc);
  const plain = html.replace(/<!--[\s\S]*?-->/gu, '').replace(/<(script|style)\b[\s\S]*?<\/\1>/giu, '');
  const sourceEnd = (plain.match(/<\/[a-z][a-z0-9-]*\s*>/giu) ?? []).length;
  const scriptStyleEnd = elements.filter((el) => (el.tagName === 'script' || el.tagName === 'style') && el.sourceCodeLocation?.endTag).length;
  const treeEnd = elements.filter((el) => el.sourceCodeLocation?.endTag).length - scriptStyleEnd;
  if (sourceEnd !== treeEnd) out.push({ code: 'misplaced-end-tag', line: 0, col: 0 });
  for (const el of elements) {
    const loc = el.sourceCodeLocation;
    if (!loc || loc.endTag || VOID_TAGS.has(el.tagName) || OPTIONAL_END.has(el.tagName)) continue;
    out.push({ code: `unclosed-${el.tagName}`, line: loc.startLine, col: loc.startCol });
  }
  return out;
}

export function convertDocument(input: string, file: string, options: ConvertOptions): ConvertResult {
  const diagnostics: Diagnostic[] = [];
  const ssi = input.match(SSI) ?? [];
  for (const directive of ssi) {
    diagnostics.push({ level: 'info', code: 'SSI_REMOVED', message: 'SSI 지시문 제거', detail: { directive } });
  }
  const html = input.replace(SSI, '');

  const parseErrors: Array<{ code: string; line: number; col: number }> = [];
  const doc = parse(html, {
    sourceCodeLocationInfo: true,
    onParseError: (err) => {
      if (!BENIGN_PARSE_ERRORS.has(err.code)) parseErrors.push({ code: err.code, line: err.startLine, col: err.startCol });
    },
  });
  parseErrors.push(...treeRecoveries(doc, html));
  if (parseErrors.length) {
    diagnostics.push({
      level: 'info',
      code: 'PARSE_RECOVERED',
      message: `HTML 파서가 깨진 마크업 ${parseErrors.length}곳을 복구함`,
      location: { line: parseErrors[0]!.line, col: parseErrors[0]!.col },
      detail: { errors: parseErrors },
    });
  }

  const container = descendants(doc, (el) => hasClass(el, 'cms-container'))[0];
  const sectionEls = container ? descendants(container, (el) => el.tagName === 'section' && hasClass(el, 'cms')) : [];
  const sources: SourceSection[] = sectionEls.map((element, i) => {
    const classList = classesOf(element);
    const line = element.sourceCodeLocation?.startLine;
    return { file, index: i + 1, classList, typeId: sectionTypeId(classList), element, ...(line ? { line } : {}) };
  });

  const sections: SectionModel[] = [];
  if (!sources.length) {
    const body = descendants(doc, (el) => el.tagName === 'body')[0] as DomElement;
    diagnostics.push({
      level: 'warn',
      code: 'NON_CONTENT_FILE',
      message: container ? '.cms-container 안에 section.cms가 없음' : '.cms-container가 없는 비콘텐츠 파일',
    });
    sections.push(fallbackFromSource({ file, index: 1, classList: [], typeId: null, element: container ?? body }, 's1', '콘텐츠 섹션 없음'));
  }

  for (const src of sources) {
    const id = `s${src.index}`;
    const def = options.registry.match(src);
    if (!def?.parse) {
      diagnostics.push({
        level: 'warn',
        code: 'UNSUPPORTED_TYPE',
        message: `아직 지원하지 않는 섹션: ${src.typeId ?? src.classList.join(' ')}`,
        sectionIndex: src.index,
        ...(src.line ? { location: { line: src.line, col: 1 } } : {}),
      });
      sections.push(fallbackFromSource(src, id, src.typeId ? '미구현 타입' : '타입 번호 없음'));
      continue;
    }
    const result = def.parse(src, { diagnostics });
    diagnostics.push(...result.diagnostics);
    sections.push({
      id,
      type: def.id,
      variant: result.variant,
      modifiers: result.modifiers,
      data: result.data,
      source: { file: src.file, index: src.index, classList: src.classList },
    });
  }

  const titleSection = sections.find((s) => s.type === 'type00');
  const title = titleSection ? richTextToPlain((titleSection.data as { title: string }).title) : undefined;

  const page: PageModel = {
    version: 1,
    source: file,
    ...(title ? { title } : {}),
    theme: options.theme,
    sections,
    diagnostics,
    meta: { coreVersion: options.coreVersion, hostCss: options.hostCss },
  };

  const rendered = renderPage(page, { registry: options.registry, ...(options.fluidRange ? { fluidRange: options.fluidRange } : {}) });
  page.diagnostics = [...diagnostics, ...rendered.diagnostics];
  // 파싱 단계 fallback + 렌더 단계 검증 실패 fallback 모두 rendered.fallbackCount에 들어 있다
  const fallbackCount = rendered.fallbackCount;

  const scope = container ?? doc;
  const images: ImageRecord[] = descendants(scope, (el) => el.tagName === 'img').map((el) => {
    const owner = sectionEls.findIndex((s) => s === el || descendants(s).includes(el));
    const src = attr(el, 'src') ?? '';
    return { sectionIndex: owner >= 0 ? owner + 1 : null, src, kind: classifyImageSrc(src) };
  });

  return {
    page,
    html: rendered.html,
    status: fileStatus(page.diagnostics, sections.length, fallbackCount),
    images,
    fallbackCount,
  };
}
