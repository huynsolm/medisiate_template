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
// 구현한 타입 전부 (type08·31~36은 아직 없음)
const FIXED = ['type00', 'type01', 'type02', 'type03', 'type04', 'type05', 'type06', 'type07', 'type09', 'type10', 'type11', 'type12', 'type13', 'type14', 'type15', 'type16', 'type17', 'type18', 'type19', 'type20', 'type21', 'type22', 'type23', 'type24', 'type25', 'type26', 'type27', 'type28', 'type29', 'type30'];
/** 아직 지원하지 않는 원본 변형: 섹션 번호 → 이유. fallback(원본 보존)이 맞는 동작이다. */
const KNOWN: Record<string, Record<number, string>> = {
  type25: { 5: '증례 변형(번호·제목 + 설명 + 이미지 줄 여러 개)은 아직 모델에 없음' },
  type07: { 2: '이미지+목록 묶음을 한 섹션에 여러 번 반복(실제 페이지 160개 중 1개)' },
  type27: {
    3: '상자형 하위 목록(cms-type27-wrap·boxitem) 결합 변형',
    4: '원 목록 + 표 형태 설명 묶음을 여러 번 반복',
    5: '원 목록과 이미지 상자를 결합한 변형',
    6: '원형 이미지 8칸 + 제목 구성(circle-type)',
  },
  type04: { 3: '병원 전용 마크업(div.description > div.text-description 3칸 상자)은 원본 도구 클래스가 아님' },
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
