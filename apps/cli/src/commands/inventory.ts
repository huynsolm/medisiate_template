import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { classList, parseElements, type SourceElement } from '@cms-medisay/core/parse/source';
import { safeWrite } from '../fs/safe-write.ts';

type ImageKind = 'https' | 'http' | 'relative' | 'other';

interface FileInventory {
  path: string;
  hasCmsContainer: boolean;
  sections: Array<{ index: number; type: string | null; classes: string[]; line?: number }>;
  scripts: Array<{ line?: number }>;
  eventAttributes: Array<{ tag: string; name: string; line?: number }>;
  styleAttributes: Array<{ tag: string; line?: number }>;
  images: Array<{ src: string; kind: ImageKind; line?: number; sectionIndex: number | null }>;
}

export interface Inventory {
  generatedAt: string;
  sourceRoot: string;
  summary: {
    htmlFileCount: number;
    nonTargetFileCount: number;
    totalSections: number;
    filesWithScript: number;
    scriptElementCount: number;
    filesWithEventAttributes: number;
    eventAttributeCount: number;
    filesWithStyle: number;
    styleAttributeCount: number;
    filesWithoutCmsContainer: number;
  };
  files: FileInventory[];
  nonTargetFiles: string[];
  typeSectionCounts: Record<string, number>;
  variantClassCounts: Record<string, number>;
  images: {
    counts: Record<ImageKind, number>;
    locations: Array<{ file: string; sectionIndex: number | null; line?: number; src: string; kind: ImageKind }>;
  };
  nonContentFiles: string[];
  comparison: {
    expected: Record<string, number>;
    actual: Record<string, number>;
    notes: string[];
    typeCountDifferences: Array<{ type: string; planned: number; parsed: number; difference: number }>;
    variantCountDifferences: Array<{ className: string; planned: number; parsed: number; difference: number }>;
  };
}

const PLANNED_TYPE_COUNTS: Record<string, number> = {
  type00: 706, type01: 736, type02: 133, type03: 129, type04: 115, type05: 4, type06: 51, type07: 166,
  type08: 4, type09: 165, type10: 135, type11: 118, type12: 12, type13: 55, type14: 43, type15: 87,
  type16: 43, type17: 80, type18: 65, type19: 37, type20: 15, type21: 14, type22: 20, type23: 59,
  type24: 28, type25: 111, type26: 116, type27: 66, type28: 48, type29: 23, type30: 33, type31: 21,
  type32: 5, type33: 56, type34: 11,
};

const PLANNED_VARIANT_COUNTS: Record<string, number> = {
  'type-bg': 912,
  'text-white': 183,
  'bg-color-3': 162,
  'bg-image-2': 124,
  'bg-color-2': 74,
  'bg-image-1': 60,
};

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => (entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)])),
  );
  return nested.flat().sort((left, right) => left.localeCompare(right, 'ko'));
}

function normalizeRelative(root: string, file: string): string {
  return path.relative(root, file).split(path.sep).join('/');
}

function imageKind(src: string): ImageKind {
  if (/^https:\/\//iu.test(src)) return 'https';
  if (/^http:\/\//iu.test(src)) return 'http';
  if (/^(?:\.{0,2}\/|\/)/u.test(src) || !/^[a-z][a-z\d+.-]*:/iu.test(src)) return 'relative';
  return 'other';
}

function location(element: SourceElement): { line?: number } {
  return element.location ? { line: element.location.line } : {};
}

function inspectFile(relativePath: string, html: string): FileInventory {
  const elements = parseElements(html);
  const sectionElements = elements.filter((element) => element.tagName === 'section' && classList(element).includes('cms'));
  const sections = sectionElements.map((element, index) => {
    const classes = classList(element);
    return {
      index: index + 1,
      type: classes.find((token) => /^type\d{2}$/u.test(token)) ?? null,
      classes,
      ...location(element),
    };
  });

  const scripts = elements.filter((element) => element.tagName === 'script').map(location);
  const eventAttributes = elements.flatMap((element) =>
    Object.keys(element.attrs)
      .filter((name) => /^on/iu.test(name))
      .map((name) => ({ tag: element.tagName, name, ...location(element) })),
  );
  const styleAttributes = elements
    .filter((element) => Object.hasOwn(element.attrs, 'style'))
    .map((element) => ({ tag: element.tagName, ...location(element) }));
  const images = elements
    .filter((element) => element.tagName === 'img' && Object.hasOwn(element.attrs, 'src'))
    .map((element) => ({
      src: element.attrs.src ?? '',
      kind: imageKind(element.attrs.src ?? ''),
      ...location(element),
      sectionIndex: element.cmsSectionIndex ?? null,
    }));

  return {
    path: relativePath,
    hasCmsContainer: elements.some((element) => classList(element).includes('cms-container')),
    sections,
    scripts,
    eventAttributes,
    styleAttributes,
    images,
  };
}

function increment(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}

export async function buildInventory(root: string): Promise<Inventory> {
  const contentsRoot = path.join(root, 'cms', 'contents');
  const allFiles = await walk(contentsRoot);
  const htmlFiles = allFiles.filter((file) => path.extname(file).toLowerCase() === '.html');
  const nonTargetFiles = allFiles
    .filter((file) => path.extname(file).toLowerCase() !== '.html')
    .map((file) => normalizeRelative(contentsRoot, file));
  const files: FileInventory[] = [];

  for (const file of htmlFiles) {
    files.push(inspectFile(normalizeRelative(contentsRoot, file), await readFile(file, 'utf8')));
  }

  const typeSectionCounts: Record<string, number> = {};
  const variantClassCounts: Record<string, number> = {};
  const imageCounts: Record<ImageKind, number> = { https: 0, http: 0, relative: 0, other: 0 };
  const imageLocations: Inventory['images']['locations'] = [];

  for (const file of files) {
    for (const section of file.sections) {
      if (section.type) increment(typeSectionCounts, section.type);
      for (const token of section.classes) {
        if (token !== 'cms' && !/^type\d{2}$/u.test(token)) increment(variantClassCounts, token);
      }
    }
    for (const image of file.images) {
      imageCounts[image.kind] += 1;
      imageLocations.push({ file: file.path, ...image });
    }
  }

  const summary = {
    htmlFileCount: files.length,
    nonTargetFileCount: nonTargetFiles.length,
    totalSections: files.reduce((sum, file) => sum + file.sections.length, 0),
    filesWithScript: files.filter((file) => file.scripts.length > 0).length,
    scriptElementCount: files.reduce((sum, file) => sum + file.scripts.length, 0),
    filesWithEventAttributes: files.filter((file) => file.eventAttributes.length > 0).length,
    eventAttributeCount: files.reduce((sum, file) => sum + file.eventAttributes.length, 0),
    filesWithStyle: files.filter((file) => file.styleAttributes.length > 0).length,
    styleAttributeCount: files.reduce((sum, file) => sum + file.styleAttributes.length, 0),
    filesWithoutCmsContainer: files.filter((file) => !file.hasCmsContainer).length,
  };
  const expected = { htmlFileCount: 703, filesWithScript: 31, filesWithStyle: 199, httpImages: 121, relativeImages: 199 };
  const actual = {
    htmlFileCount: summary.htmlFileCount,
    filesWithScript: summary.filesWithScript,
    filesWithStyle: summary.filesWithStyle,
    httpImages: imageCounts.http,
    relativeImages: imageCounts.relative,
  };
  const notes = Object.entries(expected).map(([key, value]) => {
    const observed = actual[key as keyof typeof actual];
    if (observed === value) return `${key}: 계획/제안 ${value}, parse5 결과 ${observed} — 일치.`;
    const reason = key === 'filesWithStyle'
      ? '계획 수치는 원문 정규식 검색이고 inventory는 주석·script 문자열을 제외한 실제 요소의 style 속성만 집계한다.'
      : '계획 수치는 텍스트 검색·근삿값 또는 data-src를 포함하지만 inventory는 실제 img[src] DOM만 집계한다.';
    return `${key}: 계획/제안 ${value}, parse5 결과 ${observed} — ${reason}`;
  });
  notes.push(
    `httpImages: 요청서 사전 조사 121, 제안서 재집계 151, parse5 img[src] 결과 ${imageCounts.http} — 앞선 두 수치는 검색 패턴 범위가 서로 다르고, inventory는 실제 img의 src 속성만 센다.`,
  );
  const typeCountDifferences = Object.entries(PLANNED_TYPE_COUNTS)
    .map(([type, planned]) => ({ type, planned, parsed: typeSectionCounts[type] ?? 0, difference: (typeSectionCounts[type] ?? 0) - planned }))
    .filter((item) => item.difference !== 0);
  const variantCountDifferences = Object.entries(PLANNED_VARIANT_COUNTS)
    .map(([className, planned]) => ({ className, planned, parsed: variantClassCounts[className] ?? 0, difference: (variantClassCounts[className] ?? 0) - planned }))
    .filter((item) => item.difference !== 0);

  return {
    generatedAt: new Date().toISOString(),
    sourceRoot: 'cms/contents',
    summary,
    files,
    nonTargetFiles,
    typeSectionCounts: Object.fromEntries(Object.entries(typeSectionCounts).sort()),
    variantClassCounts: Object.fromEntries(Object.entries(variantClassCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    images: { counts: imageCounts, locations: imageLocations },
    nonContentFiles: files.filter((file) => !file.hasCmsContainer).map((file) => file.path),
    comparison: { expected, actual, notes, typeCountDifferences, variantCountDifferences },
  };
}

function markdownTable(record: Record<string, number>, limit?: number): string {
  const entries = Object.entries(record);
  const shown = limit === undefined ? entries : entries.slice(0, limit);
  return ['| 항목 | 수 |', '|---|---:|', ...shown.map(([key, value]) => `| \`${key}\` | ${value} |`)].join('\n');
}

function toMarkdown(inventory: Inventory): string {
  const s = inventory.summary;
  const typeDiffs = inventory.comparison.typeCountDifferences.map((item) => `| \`${item.type}\` | ${item.planned} | ${item.parsed} | ${item.difference} |`).join('\n');
  const variantDiffs = inventory.comparison.variantCountDifferences.map((item) => `| \`${item.className}\` | ${item.planned} | ${item.parsed} | ${item.difference} |`).join('\n');
  return `# CMS 콘텐츠 inventory\n\n생성 시각: ${inventory.generatedAt}\n\n## 요약\n\n- HTML 파일: ${s.htmlFileCount}\n- 대상 외 파일: ${s.nonTargetFileCount}\n- 섹션: ${s.totalSections}\n- script: ${s.filesWithScript}개 파일 / ${s.scriptElementCount}개 요소\n- on* 속성: ${s.filesWithEventAttributes}개 파일 / ${s.eventAttributeCount}개 속성\n- style 속성: ${s.filesWithStyle}개 파일 / ${s.styleAttributeCount}개 속성\n- .cms-container 없음: ${s.filesWithoutCmsContainer}개 파일\n\n## 타입별 섹션 수\n\n${markdownTable(inventory.typeSectionCounts)}\n\n## 섹션 변형 클래스 빈도\n\n${markdownTable(inventory.variantClassCounts)}\n\n## 이미지 src 분류\n\n${markdownTable(inventory.images.counts)}\n\n상세 위치는 \`inventory.json > images.locations\`에 기록했다.\n\n## 대상 외 파일\n\n${inventory.nonTargetFiles.map((file) => `- \`${file}\``).join('\n')}\n\n## .cms-container가 없는 비콘텐츠 파일\n\n${inventory.nonContentFiles.map((file) => `- \`${file}\``).join('\n')}\n\n## 계획서·제안서 수치 비교\n\n${inventory.comparison.notes.map((note) => `- ${note}`).join('\n')}\n\nDOM 기반 집계는 주석·script 문자열을 제외하므로 원문 정규식 집계보다 작을 수 있다.\n\n### 차이가 있는 타입\n\n| 타입 | 계획 | parse5 | 차이 |\n|---|---:|---:|---:|\n${typeDiffs}\n\n### 차이가 있는 주요 변형 클래스\n\n| 클래스 | 계획/제안 | parse5 | 차이 |\n|---|---:|---:|---:|\n${variantDiffs}\n`;
}

export async function writeInventory(root: string, inventory: Inventory): Promise<void> {
  await safeWrite(root, path.join(root, 'output', 'reports', 'inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`);
  await safeWrite(root, path.join(root, 'output', 'reports', 'inventory.md'), toMarkdown(inventory));
}

export async function runInventory(root: string): Promise<number> {
  const inventory = await buildInventory(root);
  await writeInventory(root, inventory);
  console.log(`HTML ${inventory.summary.htmlFileCount}, sections ${inventory.summary.totalSections}`);
  console.log(`wrote output/reports/inventory.json and inventory.md`);
  return 0;
}

