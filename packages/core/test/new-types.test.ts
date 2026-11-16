import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { convert, follow, snapshot } from './support/original.ts';

// 진짜 원본 컴포넌트(reference/cms-original/component)를 기준으로 새로 만든 타입.
const root = path.resolve(import.meta.dirname, '../../..');
const component = (id: string) => readFileSync(path.join(root, 'reference/cms-original/component', `${id}.html`), 'utf8');
/** 컴포넌트 파일의 n번째 섹션만 */
const sectionOf = (id: string, n: number) => component(id).split(/(?=<section\b)/u).filter((s) => s.startsWith('<section'))[n - 1]!.replace(/<\/section>[^]*$/u, '</section>');

describe('type27 · 원 안의 작은 글·값 목록', () => {
  it('parses the original component (section 1) with the note after the list', async () => {
    const result = convert(sectionOf('type27', 1));
    const section = result.page.sections[0]!;
    expect(section.type).toBe('type27');
    expect(section.data).toEqual({
      eyebrow: '운동치료의', heading: '소요시간',
      note: '운동치료의 소요시간은 각 운동 별로 차이가 있으나 일반적으로 운동은 한 번에 30분에서 1시간씩, 1주일에 3~5회 중등도 이상의 강도가 권장됩니다.',
      items: [
        { label: '1회', text: '30분 ~ 1시간', icon: {} },
        { label: '운동강도', text: '중등도 이상', icon: {} },
        { label: '1주일', text: '3회 ~ 5회', icon: {} },
      ],
    });
    expect(follow(result.html, ['section.type-27', 'div.mig-body', 'ul.mig-list', 'li.mig-item', 'span.mig-label'])).toHaveLength(3);
    expect(follow(result.html, ['section.type-27', 'div.mig-body', 'div.mig-text-wrap', 'p.mig-desc'])).toHaveLength(1);
    await expect(JSON.stringify(section, null, 2) + '\n').toMatchFileSnapshot(snapshot('type27/component.expected.json'));
    await expect(result.html).toMatchFileSnapshot(snapshot('type27/component.expected.html'));
  });

  it('keeps a description placed under the circle', () => {
    const body = sectionOf('type27', 1).replace('<p class="cms-description">30분 ~ 1시간</p>\n                        </div>\n                    </div>',
      '<p class="cms-description">30분 ~ 1시간</p>\n                        </div>\n                    </div><p class="cms-description">원 아래 설명</p>');
    const result = convert(body);
    expect(result.page.sections[0]!.type).toBe('type27');
    expect((result.page.sections[0]!.data as { items: Array<{ desc?: string }> }).items[0]!.desc).toBe('원 아래 설명');
    expect(result.html).toContain('원 아래 설명');
  });
});

describe('type28 · 강조 표시 + 이미지 + 설명', () => {
  it('parses the original component (section 1)', async () => {
    const result = convert(sectionOf('type28', 1));
    const section = result.page.sections[0]!;
    expect(section.type).toBe('type28');
    expect(section.data).toMatchObject({
      eyebrow: '우리아이는', heading: '잘 크고 있나요?', badge: 'CHECK POINT', textFirst: false, items: [],
    });
    const paragraphs = (section.data as { paragraphs: Array<{ text: string }> }).paragraphs;
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]!.text).toContain('아이의 키는 유전적인 영향도 있지만 아이의 건강과 환경이 최종적인 키를 완성합니다.');
    expect(paragraphs[1]!.text).toBe('아이의 키, 현재 상태와 방해 요소를 예측하여<br>꾸준하고 건강하게 자랄 수 있는 환경을 만들어 주는 것이 중요합니다.');
    expect(follow(result.html, ['section.type-28', 'div.mig-body', 'div.mig-text-wrap', 'span.mig-badge'])).toHaveLength(1);
    expect(follow(result.html, ['section.type-28', 'div.mig-body', 'div.mig-text-wrap', 'p.mig-desc'])).toHaveLength(2);
    await expect(JSON.stringify(section, null, 2) + '\n').toMatchFileSnapshot(snapshot('type28/component.expected.json'));
    await expect(result.html).toMatchFileSnapshot(snapshot('type28/component.expected.html'));
  });

  it('keeps the text before the image when the original has it first', () => {
    const body = sectionOf('type28', 1).replace(/(<div class="cms-visual">[\s\S]*?<\/div>)\s*(<div class="cms-description-box text-center">[\s\S]*?<\/div>)/u, '$2$1');
    const result = convert(body);
    expect((result.page.sections[0]!.data as { textFirst: boolean }).textFirst).toBe(true);
    expect(result.html.indexOf('mig-desc')).toBeLessThan(result.html.indexOf('mig-visual'));
  });
});

describe('type30 · 장비 소개(이미지·설명 + 단계)', () => {
  it('parses the original component (section 1)', async () => {
    const result = convert(sectionOf('type30', 1));
    const section = result.page.sections[0]!;
    expect(section.type).toBe('type30');
    const blocks = (section.data as { blocks: Array<{ brand?: string; desc?: string; steps: unknown[] }> }).blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ brand: 'QUANTUM', steps: [] });
    expect(blocks[0]!.desc).toContain('최신기술Smart FAN BEAM 방식');
    // 호스트 .mig-content가 column-reverse라 글 → 이미지 순서로 출력해야 이미지가 위에 온다
    expect(result.html.indexOf('mig-text-wrap')).toBeLessThan(result.html.indexOf('mig-visual'));
    await expect(JSON.stringify(section, null, 2) + '\n').toMatchFileSnapshot(snapshot('type30/component.expected.json'));
    await expect(result.html).toMatchFileSnapshot(snapshot('type30/component.expected.html'));
  });

  it('reads the sub title and numbered steps of a block', () => {
    const body = sectionOf('type30', 1).replace('</ol>', '</ol><p class="cms-sub-title">간편한 3단계</p><ul class="cms-column-list item-color-box row"><li class="cms-list-item col-4"><div class="cms-inner-box"><div class="cms-description-box"><p class="cms-eyebrow type-number">1</p><p class="cms-description">검체 채취</p></div></div></li></ul>');
    const result = convert(body);
    expect(result.page.sections[0]!.type).toBe('type30');
    expect((result.page.sections[0]!.data as { blocks: Array<{ subTitle?: string; steps: unknown[] }> }).blocks[0]).toMatchObject({ subTitle: '간편한 3단계', steps: [{ num: '1', text: '검체 채취' }] });
    expect(follow(result.html, ['section.type-30', 'div.mig-body', 'ul.mig-list', 'li.mig-item', 'span.mig-num'])).toHaveLength(1);
  });
});

describe('type29 · 이미지 + 가운데 설명 (+ 버튼)', () => {
  it('parses the original component (section 1) and keeps the button link', async () => {
    const result = convert(sectionOf('type29', 1));
    const section = result.page.sections[0]!;
    expect(section.type).toBe('type29');
    // 원본 버튼의 빈 화살표 아이콘(<i class="arrow">)도 서식 글에 그대로 남는다
    expect(section.data).toMatchObject({ buttons: [{ text: '러시아 아바이스크 녹용 자세히 보기<i class="arrow"></i>', link: '#' }] });
    expect((section.data as { paragraphs: unknown[] }).paragraphs).toHaveLength(1);
    expect(result.html).toContain('<a href="#">러시아 아바이스크 녹용 자세히 보기<i class="arrow"></i></a>');
    await expect(JSON.stringify(section, null, 2) + '\n').toMatchFileSnapshot(snapshot('type29/component.expected.json'));
    await expect(result.html).toMatchFileSnapshot(snapshot('type29/component.expected.html'));
  });

  it('rejects an unsafe button link from the editor or JSON', async () => {
    const { defaultRegistry } = await import('../src/types/index.ts');
    expect(defaultRegistry.get('type29')!.schema.safeParse({ buttons: [{ text: 'x', link: 'javascript:alert(1)' }] }).success).toBe(false);
  });
});
