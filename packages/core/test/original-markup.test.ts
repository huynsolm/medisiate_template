import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseFragment } from 'parse5';
import { describe, expect, it } from 'vitest';
import { convertDocument } from '../src/convert/convert-document.ts';
import { defaultRegistry } from '../src/types/index.ts';

// fixtures/original: 원본 CMS 도구와 같은 HTML을 만드는 biny 타입 정의로 생성한 타입별 원본 마크업 (README 참고)
const ORIGINAL = path.resolve(import.meta.dirname, '../../../fixtures/original');
const opts = { registry: defaultRegistry, theme: { primary: '#164aa0', source: 'default' as const }, coreVersion: '0', hostCss: { sha256: 'x', savedAt: 'y' } };
const read = (name: string) => readFileSync(path.join(ORIGINAL, name), 'utf8');
const convert = (body: string) => convertDocument(`<div class="cms-container">${body}</div>`, 'original.html', opts);

type P5 = { tagName?: string; attrs?: Array<{ name: string; value: string }>; childNodes?: P5[]; content?: P5 };
function imgSrcs(html: string): string[] {
  const out: string[] = [];
  const visit = (n: P5) => {
    if (n.tagName === 'img') out.push(n.attrs?.find((a) => a.name === 'src')?.value ?? '');
    n.childNodes?.forEach(visit);
  };
  visit(parseFragment(html) as unknown as P5);
  return out.sort();
}

describe('type01 on the original markup', () => {
  const result = convert(read('type01.html'));
  const section = result.page.sections[0]!;

  it('is parsed by type01 without losing anything (no fallback)', () => {
    expect(section.type).toBe('type01');
    expect(result.page.diagnostics.filter((d) => d.level !== 'info' && d.code !== 'IMAGE_RELATIVE')).toEqual([]);
  });

  it('takes the title from .cms-thin-title and the description from .cms-description only once', () => {
    const data = section.data as { title?: string; desc?: string; image: { pc?: { src: string }; mo?: { src: string } } };
    expect(data.title).toBe('제목을 입력해 보세요');
    expect(data.desc).toBe('입력한 내용이 HTML 소스와 미리보기에 바로 반영돼요.');
    expect(data.image.pc?.src).toBe('/images/cms-sample.svg');      // img-fluid d-none d-lg-block
    expect(data.image.mo?.src).toBe('/images/cms-sample-m.svg');    // w-100 d-block d-lg-none
    expect(result.html.split('제목을 입력해 보세요').length - 1).toBe(1);
  });
});

describe('every original type markup', () => {
  const files = readdirSync(ORIGINAL).filter((f) => f.endsWith('.html')).sort();

  it('covers the 25 types biny reproduces plus types taken from the real components', () => {
    // biny 재현본 25개 + 진짜 원본 컴포넌트에서 가져온 타입(fixtures/original/README.md)
    expect(files).toHaveLength(26);
  });

  it.each(files)('%s converts without dropping any image', (file) => {
    const body = read(file);
    const result = convert(body);
    expect(result.page.sections).toHaveLength(1);
    expect(imgSrcs(result.html)).toEqual(imgSrcs(body));
  });
});
