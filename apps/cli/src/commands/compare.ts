import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import {
  CORE_VERSION,
  convertDocument,
  defaultRegistry,
  FALLBACK_ID,
  outerHtml,
  renderPage,
  sourceSections,
  type PageModel,
} from '@cms-medisay/core';
import { safeWrite } from '../fs/safe-write.ts';
import { themeFor } from './convert.ts';
import { filePage, indexPage, type CompareFile, type CompareSection, type IndexRow, type SectionOutcome } from '../compare/pages.ts';

const SRC = 'cms/contents';
const posix = (p: string) => p.split(path.sep).join('/');

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])));
  return nested.flat();
}

/** 섹션마다 변환 결과 분류. 진단과 섹션 모델로 정한다 */
export function outcomeOf(page: PageModel, index: number): SectionOutcome {
  const section = page.sections[index - 1]!;
  const codes = page.diagnostics.filter((d) => d.sectionIndex === index).map((d) => d.code);
  if (section.type === FALLBACK_ID) return 'fallback';
  if (codes.includes('LAYOUT_SIMPLIFIED')) return 'blocks';
  if (codes.includes('STRUCTURE_RETYPED')) return 'retyped';
  if (section.notes?.intro || section.notes?.note) return 'notes';
  return 'converted';
}

/** 원본 파일 하나를 변환하고 섹션마다 원본·출력 HTML을 짝짓는다 */
export function compareFile(html: string, rel: string, convertOptions: Parameters<typeof convertDocument>[2]): CompareFile {
  const result = convertDocument(html, rel, convertOptions);
  const page = result.page;
  const sources = sourceSections(html.replace(/<!--#[a-z]+[\s\S]*?-->/giu, ''), rel);
  const render = (sections: PageModel['sections']) => renderPage({ ...page, sections, diagnostics: [] }, { registry: convertOptions.registry }).html;
  // 섹션 수가 맞으면 섹션끼리, 아니면(비콘텐츠 파일·컨테이너 밖 섹션) 파일 전체를 한 쌍으로 보여 준다
  const paired = sources.length === page.sections.length && page.sections.every((s) => s.source);
  const sections: CompareSection[] = paired
    ? page.sections.map((section, i) => ({
      index: i + 1,
      declared: sources[i]!.typeId ?? '',
      type: section.type === FALLBACK_ID ? '원본 보존' : section.type,
      outcome: outcomeOf(page, i + 1),
      diagnostics: page.diagnostics.filter((d) => d.sectionIndex === i + 1),
      original: outerHtml(sources[i]!.element),
      output: render([section]),
    }))
    : [{
      index: 1,
      declared: '파일 전체',
      type: page.sections.every((s) => s.type === FALLBACK_ID) ? '원본 보존' : '섹션 여럿',
      outcome: page.sections.every((s) => s.type === FALLBACK_ID) ? 'fallback' : 'converted',
      diagnostics: page.diagnostics.filter((d) => d.sectionIndex !== undefined),
      original: html.replace(/<!--#[a-z]+[\s\S]*?-->/giu, ''),
      output: result.html,
    }];
  return { file: rel, status: result.status, sections, diagnostics: page.diagnostics.filter((d) => d.sectionIndex === undefined) };
}

export function indexRow(file: CompareFile): IndexRow {
  const counts: Record<SectionOutcome, number> = { converted: 0, notes: 0, retyped: 0, blocks: 0, fallback: 0 };
  for (const s of file.sections) counts[s.outcome]++;
  const warns = [...file.diagnostics, ...file.sections.flatMap((s) => s.diagnostics)].filter((d) => d.level !== 'info').length;
  return { file: file.file, status: file.status, sections: file.sections.length, counts, warns };
}

/** output/compare/에 비교 페이지를 쓴다 */
export async function runCompare(root: string, argv: string[]): Promise<number> {
  const { values } = parseArgs({ args: argv, options: { file: { type: 'string' } }, strict: true });
  const contents = path.resolve(root, SRC);
  const all = (await walk(contents).catch(() => [])).filter((f) => f.endsWith('.html')).sort();
  const targets = values.file ? all.filter((f) => posix(path.relative(contents, f)) === values.file) : all;
  if (targets.length === 0) {
    console.error(values.file ? `${SRC} 아래에 ${values.file}이(가) 없습니다.` : `${SRC} 아래에 .html이 없습니다. cp -r reference/cms-original cms 로 원본을 준비하세요.`);
    return 1;
  }
  const manifest = JSON.parse(await readFile(path.join(root, 'reference/host-css.manifest.json'), 'utf8')) as { sha256: string; savedAt: string };
  const out = path.join(root, 'output/compare');
  const rows: IndexRow[] = [];
  for (const full of targets) {
    const rel = posix(path.relative(contents, full));
    const file = compareFile(await readFile(full, 'utf8'), rel, {
      registry: defaultRegistry, theme: await themeFor(root, rel), coreVersion: CORE_VERSION, hostCss: { sha256: manifest.sha256, savedAt: manifest.savedAt },
    });
    rows.push(indexRow(file));
    // output/compare/files/<원본 경로> → 저장소 최상위까지 거슬러 올라가는 상대 경로
    const depth = rel.split('/').length + 2;
    const root2 = '../'.repeat(depth);
    const home = '../'.repeat(rel.split('/').length);
    await safeWrite(root, path.join(out, 'files', rel), filePage(file, root2, home));
  }
  if (!values.file) await safeWrite(root, path.join(out, 'index.html'), indexPage(rows, new Date().toISOString().slice(0, 16).replace('T', ' ')));
  console.log(`비교 페이지 ${rows.length}개 → output/compare/${values.file ? `files/${values.file}` : 'index.html'}`);
  return 0;
}
