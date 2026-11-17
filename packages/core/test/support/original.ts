import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseFragment } from 'parse5';
import { expect } from 'vitest';
import { convertDocument } from '../../src/convert/convert-document.ts';
import { ALL_TYPES, defaultRegistry } from '../../src/types/index.ts';
import { TypeRegistry } from '../../src/types/definition.ts';

// 3단계 P2 타입: fixtures/original/typeNN.html(원본 CMS 도구와 같은 마크업)을 기준으로 parse → 호스트 프리셋 render.
const root = path.resolve(import.meta.dirname, '../../../..');
export const original = (id: string) => readFileSync(path.join(root, 'fixtures/original', `${id}.html`), 'utf8');
/**
 * 타입 parser의 안전 검사용 레지스트리: 마지막 수단인 블록 순서 변환(blocks)을 뺀다.
 * "담지 못하면 섹션을 원본 보존(fallback)한다"는 각 타입의 약속을 그대로 검사한다. blocks 자체는 blocks.test.ts가 검사한다.
 */
export const typedRegistry = new TypeRegistry(ALL_TYPES.filter((t) => t.id !== 'blocks'));
const base = { theme: { primary: '#164aa0', source: 'default' as const }, coreVersion: '0', hostCss: { sha256: 'x', savedAt: 'y' } };
const opts = { registry: typedRegistry, ...base };
export const convert = (body: string) => convertDocument(`<div class="cms-container">${body}</div>`, 'p2.html', opts);
/** 실제 변환기와 같은 전체 레지스트리(블록 순서 변환 포함) */
export const convertFull = (body: string) => convertDocument(`<div class="cms-container">${body}</div>`, 'p2.html', { registry: defaultRegistry, ...base });
export const snapshot = (rel: string) => path.join(root, 'fixtures/types', rel);

type P5 = { tagName?: string; attrs?: Array<{ name: string; value: string }>; childNodes?: P5[] };
const fragment = (html: string) => parseFragment(html) as unknown as P5;
const cls = (n: P5) => (n.attrs?.find((a) => a.name === 'class')?.value ?? '').split(/\s+/u);
const kids = (n: P5) => (n.childNodes ?? []).filter((c) => c.tagName);
/** Follow a child-combinator path like ['section.type-07', 'div.mig-body', 'div.mig-content', 'div.mig-visual'] from the top. */
export function follow(html: string, steps: string[]): P5[] {
  let level = kids(fragment(html)).flatMap((n) => [n, ...descend(n)]);
  for (const [i, step] of steps.entries()) {
    const [tag, ...classes] = step.split('.');
    const matches = level.filter((n) => n.tagName === tag && classes.every((c) => cls(n).includes(c)));
    if (i === steps.length - 1) return matches;
    level = matches.flatMap(kids);
  }
  return [];
}
function descend(n: P5): P5[] {
  return kids(n).flatMap((c) => [c, ...descend(c)]);
}
export function imgSrcs(html: string): string[] {
  return follow(html, ['img']).map((n) => n.attrs?.find((a) => a.name === 'src')?.value ?? '').sort();
}

export function check(id: string, body = original(id)) {
  const result = convert(body);
  const section = result.page.sections[0]!;
  expect(section.type).toBe(id);                                     // not a fallback
  expect(result.page.diagnostics.filter((d) => d.level !== 'info' && d.code !== 'IMAGE_RELATIVE')).toEqual([]);
  expect(imgSrcs(result.html)).toEqual(imgSrcs(body));               // every image kept
  return { result, section, data: section.data as Record<string, unknown> };
}

