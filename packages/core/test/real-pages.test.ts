import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { convertDocument, textOrderDiffers } from '../src/convert/convert-document.ts';
import { defaultRegistry } from '../src/types/index.ts';
import { typedRegistry } from './support/original.ts';
import { outerHtml } from '../src/parse/dom.ts';
import { sourceSections } from '../src/parse/sections.ts';

const root = path.resolve(import.meta.dirname, '../../..');
const contents = path.join(root, 'cms/contents');
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = path.join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : [];
});
const opts = { registry: defaultRegistry, theme: { primary: '#164aa0', source: 'default' as const }, coreVersion: '0', hostCss: { sha256: 'x', savedAt: 'y' } };

// 실제 페이지 703개(로컬 cms/, reference/cms-original 복사본)가 있는 환경에서만 실행한다.
describe.skipIf(!existsSync(contents))('real pages', () => {
  it('parsers never produce data their own schema rejects (no INVALID_DATA)', () => {
    const invalid: string[] = [];
    for (const file of walk(contents)) {
      const rel = path.relative(contents, file);
      const result = convertDocument(readFileSync(file, 'utf8'), rel, opts);
      for (const d of result.page.diagnostics) if (d.code === 'INVALID_DATA') invalid.push(`${rel}: ${d.message}`);
    }
    expect(invalid).toEqual([]);
  }, 300_000);

  // 검수(docs/review-real-pages.md I-3)가 찾은 방식: 변환된 섹션마다 원본·출력의 글을 공백 없이 순서까지 비교한다.
  // 변환기도 같은 비교(textOrderDiffers)를 섹션마다 하므로, 여기서는 그 함수를 그대로 써서 실제 페이지 전체에 다시 확인한다
  // (타입이 선언한 표시 요소 예외 포함, 예: type33 Q&A의 Q·A span).
  it('every converted section keeps the original text in the same order', () => {
    const mismatched: string[] = [];
    let compared = 0;
    for (const file of walk(contents)) {
      const rel = path.relative(contents, file);
      for (const section of sourceSections(readFileSync(file, 'utf8'), rel)) {
        const result = convertDocument(`<div class="cms-container">${outerHtml(section.element)}</div>`, rel, opts);
        const converted = result.page.sections[0];
        if (result.page.sections.length !== 1 || !converted || converted.type === 'fallback') continue;
        compared++;
        const reason = textOrderDiffers(section.element, converted, opts, defaultRegistry.get(converted.type)?.orderCheckIgnores);
        if (reason) mismatched.push(`${converted.type} ${rel}#${section.index}: ${reason}`);
      }
    }
    expect(compared).toBeGreaterThan(2500);
    expect(mismatched).toEqual([]);
  }, 600_000);

  // 순서 검사는 fallback 섹션을 만든다. 정상 섹션을 잘못 걸러내는 회귀(3차 재검수 I-1: 링크 안 PC/MO 이미지 쌍)를 잡기 위해
  // 실제 페이지에서 순서 사유로 보존되는 섹션을 정확히 고정한다. 아래 9개는 원본에서 글이 이미지보다 앞에 있어
  // 호스트 프리셋 배치(이미지 → 글)로 옮기면 순서가 바뀌는 진짜 차이다.
  // 타입 parser만으로(블록 순서 변환 없이) 본다. 이 9개는 전체 변환기에서는 블록 순서 변환이 원본 순서대로 옮긴다.
  it('only the known sections are preserved because of a reorder', () => {
    const preserved: string[] = [];
    for (const file of walk(contents)) {
      const rel = path.relative(contents, file);
      const result = convertDocument(readFileSync(file, 'utf8'), rel, { ...opts, registry: typedRegistry });
      for (const d of result.page.diagnostics) if (d.code === 'LOSSY_PARSE' && /글 순서가 다름/u.test(d.message)) preserved.push(`${d.message.split(':')[0]} ${rel}#${d.sectionIndex}`);
    }
    expect(preserved.sort()).toEqual([
      'type01 13271/0404_종합검진프로그램.html#2',
      'type01 13271/0404_클래식검진.html#2',
      'type01 13271/0404_프리미엄검진.html#2',
      'type01 13271/0405_기업건강검진.html#2',
      'type01 13289/0503_성병.html#2',
      'type01 13289/0503_성병.html#5',
      'type01 13289/0602_리쥬란힐러물광주사.html#2',
      'type01 13289/0602_리쥬란힐러물광주사.html#5',
      'type10 13289/0502_임신피임상담.html#11',
    ].sort());
  }, 600_000);

  // 전체 변환기(구조 재분류 + 블록 순서 변환 포함)에서도 원본 보존으로 남는 섹션을 고정한다.
  // 비콘텐츠 파일(include·option·list 등) 14개와, 동영상(iframe)·표 칸 안 목록·순서 문제처럼 어떤 방식으로도 그대로 옮길 수 없는 섹션이다.
  // 줄어들면 목록을 고치고, 늘어나면 회귀다.
  it('only the known sections stay preserved with the full converter', () => {
    const preserved: string[] = [];
    for (const file of walk(contents)) {
      const rel = path.relative(contents, file);
      const result = convertDocument(readFileSync(file, 'utf8'), rel, opts);
      result.page.sections.forEach((s, i) => { if (s.type === 'fallback') preserved.push(`${rel.split(path.sep).join('/')}#${i + 1}`); });
    }
    expect(preserved.sort()).toEqual([
      '05/studentCheckup.html#3',
      '10429/04_01_소아청소년종합검진센터.html#3',
      '13168/sub01_intro.html#1',
      '13168/sub_04_06_퇴행성 관절염.html#3',
      '13225/sub01_intro.html#1',
      '13225/sub02_06.html#3',
      '13225/sub08_08.html#2',
      '13253/예방주사.html#2',
      '13257/04_01_진료과.html#2',
      '13257/05_02_재증명안내.html#5',
      '13257/06_02_검진종류.html#2',
      '13267/0205_자궁경부무력증수술.html#3',
      '13267/0403_이용약관_220829.html#3',
      '13267/0405_교육프로그램.html#4',
      '13280/0502_검진센터소개.html#2',
      '13280/0503_종합검진.html#2',
      '13280/0603_이용및예약안내.html#3',
      '13286/back/0204_목주름필러.html#6',
      '13286/back/0205_이물질제거.html#3',
      '13286/back/0401_초음파히알라제.html#10',
      '13286/back/0401_초음파히알라제.html#8',
      '13286/back/0403_내시경이마지방종제거술.html#11',
      '13286/back/0403_내시경이마지방종제거술.html#12',
      '13286/back/sub02_03.html#1',
      '13286/back/내시경이마제거종_230310.html#11',
      '13286/back/내시경이마제거종_230310.html#12',
      '13286/back/목주름필러_230310.html#6',
      '13286/back/이물질제거_230310.html#3',
      '13286/back/초음파히말레이제_230310.html#10',
      '13286/back/초음파히말레이제_230310.html#8',
      '13286/내시경이마제거종_230322.html#11',
      '13286/내시경이마제거종_230322.html#12',
      '13286/목주름필러_230322.html#6',
      '13286/초음파히알리제_230322.html#10',
      '13286/초음파히알리제_230322.html#8',
      '13287/0401_검진센터안내.html#4',
      '13287/0403_공단건강검진.html#4',
      '13289/0301_질필러.html#10',
      '13289/0304_금실코아썸.html#2',
      'include/footer.html#1',
      'include/header.html#1',
      'list.html#1',
      'option/list.html#1',
      'option/slider/slider_01.html#1',
      'option/slider/slider_02.html#1',
      'option/slider/slider_03.html#1',
      'option/slider/slider_04.html#1',
      'option/slider/slider_05.html#1',
      'plainLayout.html#1',
      '새 폴더/list.html#1',
    ]);
  }, 600_000);
});
