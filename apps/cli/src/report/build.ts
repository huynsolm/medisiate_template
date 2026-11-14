import type { Diagnostic, FileStatus, ImageRecord } from '@cms-medisay/core';

/** 파일 하나의 변환 결과 요약. output/reports/files/<rel>.json에 저장하고 리포트를 다시 만들 때 모두 읽는다. */
export interface FileRecord {
  file: string;
  status: FileStatus;
  types: string[];
  fallbackCount: number;
  fallbacks: Array<{ sectionIndex: number; type: string; reason: string }>;
  diagnostics: Diagnostic[];
  images: ImageRecord[];
}

export interface Report {
  generatedAt: string;
  coreVersion: string;
  hostCss: { sha256: string; savedAt: string };
  summary: { total: number; success: number; partial: number; failed: number };
  typeStats: Record<string, { sections: number; fallback: number }>;
  nonTargetFiles: string[];
  files: FileRecord[];
}

const csvCell = (value: string | number): string => {
  const s = String(value);
  return /[",\n\r]/u.test(s) ? `"${s.replace(/"/gu, '""')}"` : s;
};
const csv = (rows: Array<Array<string | number>>) => `${rows.map((r) => r.map(csvCell).join(',')).join('\n')}\n`;

export function buildReport(files: FileRecord[], nonTargetFiles: string[], meta: Pick<Report, 'coreVersion' | 'hostCss'>, now = new Date()): Report {
  const sorted = [...files].sort((a, b) => a.file.localeCompare(b.file));
  const summary = { total: sorted.length, success: 0, partial: 0, failed: 0 };
  const typeStats: Report['typeStats'] = {};
  for (const f of sorted) {
    summary[f.status] += 1;
    for (const t of f.types) (typeStats[t] ??= { sections: 0, fallback: 0 }).sections += 1;
    for (const fb of f.fallbacks) (typeStats[fb.type] ??= { sections: 0, fallback: 0 }).fallback += 1;
  }
  return { generatedAt: now.toISOString(), ...meta, summary, typeStats, nonTargetFiles: [...nonTargetFiles].sort(), files: sorted };
}

export function reportCsv(report: Report): string {
  return csv([
    ['file', 'status', 'types', 'fallbackCount', 'warnCount', 'errorCount', 'httpImages', 'relativeImages'],
    ...report.files.map((f) => [
      f.file,
      f.status,
      f.types.join('|'),
      f.fallbackCount,
      f.diagnostics.filter((d) => d.level === 'warn').length,
      f.diagnostics.filter((d) => d.level === 'error').length,
      f.images.filter((i) => i.kind === 'http').length,
      f.images.filter((i) => i.kind === 'relative').length,
    ]),
  ]);
}

export function imagesCsv(report: Report): string {
  return csv([
    ['file', 'sectionIndex', 'src', 'kind'],
    ...report.files.flatMap((f) => f.images.map((i) => [f.file, i.sectionIndex ?? '', i.src, i.kind])),
  ]);
}

export function unsupportedCsv(report: Report): string {
  const rows: Array<Array<string | number>> = [['file', 'sectionIndex', 'type', 'variant/class', 'reason']];
  for (const f of report.files) {
    for (const fb of f.fallbacks) rows.push([f.file, fb.sectionIndex, fb.type, '', fb.reason]);
    for (const d of f.diagnostics) {
      if (d.code === 'UNKNOWN_CLASS' || d.code === 'UNKNOWN_VARIANT') {
        rows.push([f.file, d.sectionIndex ?? '', '', ((d.detail?.classes as string[] | undefined) ?? []).join(' '), d.code]);
      }
    }
  }
  return csv(rows);
}

export function summaryMarkdown(report: Report): string {
  const s = report.summary;
  const types = Object.entries(report.typeStats).sort(([a], [b]) => a.localeCompare(b));
  const unsupported = types.filter(([, v]) => v.fallback > 0).sort(([, a], [, b]) => b.fallback - a.fallback);
  const codes = new Map<string, number>();
  for (const f of report.files) for (const d of f.diagnostics) if (d.level !== 'info') codes.set(d.code, (codes.get(d.code) ?? 0) + 1);
  return `# 변환 요약

생성 시각: ${report.generatedAt} · core ${report.coreVersion} · 호스트 CSS ${report.hostCss.savedAt} (${report.hostCss.sha256.slice(0, 8)})

## 상태별 파일 수

| 상태 | 파일 |
|---|---:|
| success | ${s.success} |
| partial | ${s.partial} |
| failed | ${s.failed} |
| 합계 | ${s.total} |

대상 외 파일: ${report.nonTargetFiles.length}개

## 타입별 섹션

| 타입 | 섹션 | fallback | 성공률 |
|---|---:|---:|---:|
${types.map(([t, v]) => `| ${t} | ${v.sections} | ${v.fallback} | ${v.sections ? Math.round(((v.sections - v.fallback) / v.sections) * 100) : 0}% |`).join('\n')}

## 상위 미지원 항목

${unsupported.length ? unsupported.slice(0, 15).map(([t, v]) => `- ${t}: ${v.fallback}개 섹션`).join('\n') : '- 없음'}

## 경고·오류 코드

${codes.size ? [...codes].sort(([, a], [, b]) => b - a).map(([c, n]) => `- ${c}: ${n}`).join('\n') : '- 없음'}

## 다음 조치

- fallback이 많은 타입부터 구현한다 (계획서 8장 우선순위).
- \`unsupported.csv\`의 UNKNOWN_CLASS를 검토해 타입 변형으로 등록할지 정한다.
- \`images.csv\`의 http/relative 이미지는 주소를 바꾸지 않았다. 에디터 업로드 여부를 확인한다.
`;
}
