import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import {
  CORE_VERSION,
  convertDocument,
  defaultRegistry,
  FALLBACK_ID,
  resolveTheme,
  type DiagnosticLevel,
  type ThemeInput,
} from '@cms-medisay/core';
import { safeRemove, safeWrite } from '../fs/safe-write.ts';
import { buildReport, imagesCsv, reportCsv, summaryMarkdown, unsupportedCsv, type FileRecord } from '../report/build.ts';

const SRC = 'cms/contents';
const LEVELS: DiagnosticLevel[] = ['info', 'warn', 'error'];

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])));
  return nested.flat();
}

const posix = (p: string) => p.split(path.sep).join('/');

async function readJson<T>(file: string): Promise<T | undefined> {
  if (!existsSync(file)) return undefined;
  return JSON.parse(await readFile(file, 'utf8')) as T;
}

async function themeFor(root: string, rel: string) {
  const dir = path.join(root, 'config/themes');
  const base = (await readJson<ThemeInput & { primary: string }>(path.join(dir, 'default.json'))) ?? { primary: '#c7b195' };
  const hospitalId = rel.includes('/') ? rel.split('/')[0] : undefined;
  const hospital = hospitalId && /^[\w-]+$/u.test(hospitalId) ? await readJson<ThemeInput>(path.join(dir, `${hospitalId}.json`)) : undefined;
  return resolveTheme({ default: base, ...(hospital ? { hospital } : {}) });
}

/** cms/contents 안쪽 경로만 허용한다. */
function selection(root: string, value: string): string | undefined {
  const contents = path.resolve(root, SRC);
  const target = path.resolve(root, value);
  const rel = path.relative(contents, target);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return undefined;
  return target;
}

export async function runConvert(root: string, argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      all: { type: 'boolean' },
      dir: { type: 'string' },
      file: { type: 'string' },
      'fail-on': { type: 'string' },
    },
    strict: true,
  });

  const contents = path.resolve(root, SRC);
  let targets: string[];
  if (values.all) targets = await walk(contents);
  else if (values.dir || values.file) {
    const sel = selection(root, (values.dir ?? values.file)!);
    if (!sel) {
      console.error(`${SRC} 아래 경로만 변환할 수 있습니다: ${values.dir ?? values.file}`);
      return 1;
    }
    targets = values.dir ? await walk(sel) : [sel];
  } else {
    console.error('사용법: cms-migrate convert --all | --dir <cms/contents/..> | --file <cms/contents/...html> [--fail-on warn|error]');
    return 1;
  }

  const manifest = (await readJson<{ sha256: string; savedAt: string }>(path.join(root, 'reference/host-css.manifest.json'))) ?? { sha256: '', savedAt: '' };
  const hostCss = { sha256: manifest.sha256, savedAt: manifest.savedAt };
  const out = path.join(root, 'output');
  const failLevel = values['fail-on'] as DiagnosticLevel | undefined;
  let worst = -1;

  const htmlFiles = targets.filter((f) => f.endsWith('.html')).sort();
  for (const full of htmlFiles) {
    const rel = posix(path.relative(contents, full));
    const result = convertDocument(await readFile(full, 'utf8'), rel, {
      registry: defaultRegistry,
      theme: await themeFor(root, rel),
      coreVersion: CORE_VERSION,
      hostCss,
    });
    const base = rel.replace(/\.html$/u, '');
    const record: FileRecord = {
      file: rel,
      status: result.status,
      types: result.page.sections.map((s) => (s.type === FALLBACK_ID ? ((s.data as { originalType?: string }).originalType ?? 'unknown') : s.type)),
      fallbackCount: result.fallbackCount,
      fallbacks: result.page.sections
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => s.type === FALLBACK_ID)
        .map(({ s, i }) => ({ sectionIndex: i + 1, type: (s.data as { originalType?: string }).originalType ?? 'unknown', reason: (s.data as { reason: string }).reason })),
      diagnostics: result.page.diagnostics,
      images: result.images,
    };
    await safeWrite(root, path.join(out, 'contents', `${base}.html`), result.html);
    await safeWrite(root, path.join(out, 'data', `${base}.json`), `${JSON.stringify(result.page, null, 2)}\n`);
    await safeWrite(root, path.join(out, 'reports/files', `${base}.json`), `${JSON.stringify(record, null, 2)}\n`);
    for (const d of result.page.diagnostics) worst = Math.max(worst, LEVELS.indexOf(d.level));
  }

  if (values.all) {
    // 지금 원본 목록에 없는 이전 생성물(삭제·이름 변경된 원본)을 지운다
    const current = new Set(htmlFiles.map((f) => posix(path.relative(contents, f)).replace(/\.html$/u, '')));
    const generated: Array<[string, string]> = [
      [path.join(out, 'contents'), '.html'],
      [path.join(out, 'data'), '.json'],
      [path.join(out, 'reports/files'), '.json'],
    ];
    let removed = 0;
    for (const [dir, ext] of generated) {
      if (!existsSync(dir)) continue;
      for (const file of await walk(dir)) {
        const base = posix(path.relative(dir, file));
        if (base.endsWith(ext) && current.has(base.slice(0, -ext.length))) continue;
        await safeRemove(root, file);
        removed += 1;
      }
    }
    if (removed) console.log(`이전 생성물 ${removed}개 삭제 (원본에 없는 파일)`);
  }

  const nonTargetPath = path.join(out, 'reports/non-target.json');
  let nonTarget = (await readJson<string[]>(nonTargetPath)) ?? [];
  if (values.all) {
    nonTarget = targets.filter((f) => !f.endsWith('.html')).map((f) => posix(path.relative(contents, f))).sort();
    await safeWrite(root, nonTargetPath, `${JSON.stringify(nonTarget, null, 2)}\n`);
  }

  const recordDir = path.join(out, 'reports/files');
  const records = await Promise.all(
    (existsSync(recordDir) ? await walk(recordDir) : []).filter((f) => f.endsWith('.json')).map(async (f) => JSON.parse(await readFile(f, 'utf8')) as FileRecord),
  );
  const report = buildReport(records, nonTarget, { coreVersion: CORE_VERSION, hostCss });
  const reports = path.join(out, 'reports');
  await safeWrite(root, path.join(reports, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await safeWrite(root, path.join(reports, 'report.csv'), reportCsv(report));
  await safeWrite(root, path.join(reports, 'images.csv'), imagesCsv(report));
  await safeWrite(root, path.join(reports, 'unsupported.csv'), unsupportedCsv(report));
  await safeWrite(root, path.join(reports, 'summary.md'), summaryMarkdown(report));

  const s = report.summary;
  console.log(`변환 ${htmlFiles.length}개 · 전체 리포트 ${s.total}개 (success ${s.success}, partial ${s.partial}, failed ${s.failed})`);
  if (failLevel && LEVELS.includes(failLevel) && worst >= LEVELS.indexOf(failLevel)) return 2;
  return 0;
}
