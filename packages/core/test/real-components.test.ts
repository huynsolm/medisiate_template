import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { convert } from './support/original.ts';

/*
 * 진짜 원본 컴포넌트(reference/cms-original/component/typeNN.html, 원본 CMS 도구 소스)로 검사한다.
 * 3·4단계는 biny cms-preview 재현본(fixtures/original)을 기준으로 만들었는데, 진짜 원본과 구조가 다른 곳이 있었다
 * (예: type10 육각형 안의 핵심 단어가 cms-title이 아니라 cms-description). 고친 타입을 이 목록에 넣는다.
 */
const root = path.resolve(import.meta.dirname, '../../..');
const component = (id: string) => readFileSync(path.join(root, 'reference/cms-original/component', `${id}.html`), 'utf8');
const FIXED = ['type10', 'type26', 'type25'];
/** 아직 지원하지 않는 원본 변형: 섹션 번호 → 이유. fallback(원본 보존)이 맞는 동작이다. */
const KNOWN: Record<string, Record<number, string>> = {
  type25: { 5: '증례 변형(번호·제목 + 설명 + 이미지 줄 여러 개)은 아직 모델에 없음' },
};

describe('real original components convert without falling back', () => {
  it.each(FIXED)('%s', (id) => {
    const result = convert(component(id));
    const known = KNOWN[id] ?? {};
    const lossy = result.page.diagnostics
      .filter((d) => (d.code === 'LOSSY_PARSE' || d.code === 'UNSUPPORTED_TYPE') && !(d.sectionIndex! in known))
      .map((d) => `${d.sectionIndex}: ${d.message}`);
    expect(lossy).toEqual([]);
    expect(result.page.sections.every((s, i) => s.type === id || (i + 1) in known)).toBe(true);
  });
});
