import { describe, expect, it } from 'vitest';
import { check, convert, follow, original, snapshot } from './support/original.ts';

// 4단계 P5 타입: fixtures/original/typeNN.html(원본 CMS 도구와 같은 마크업) → 호스트 프리셋.
// type29·31·34·32·08은 원본 구조 자료(biny cms-preview)가 없어 제외.
const pair = { pc: { src: '/images/cms-sample.svg', alt: '', kind: 'relative' }, mo: { src: '/images/cms-sample-m.svg', alt: '', kind: 'relative' } };
const header = { eyebrow: '작은 제목', heading: '제목을 입력해 보세요' };
const P5 = ['type24', 'type22', 'type20', 'type21', 'type12', 'type05'];

async function snapshots(id: string, section: unknown, html: string) {
  await expect(JSON.stringify(section, null, 2) + '\n').toMatchFileSnapshot(snapshot(`${id}/original.expected.json`));
  await expect(html).toMatchFileSnapshot(snapshot(`${id}/original.expected.html`));
}

describe('type24 · 이미지 + 번호 목록', () => {
  it('parses the original markup and numbers the items like the original counter', async () => {
    const { result, section, data } = check('type24');
    expect(data).toEqual({ ...header, image: pair, items: [1, 2, 3].map((n) => ({ title: `항목 ${n} 제목`, desc: '설명을 입력해 보세요.' })) });
    expect(section.modifiers.background?.token).toBe('bg-color-2');
    expect(follow(result.html, ['section.type-24', 'div.mig-body', 'div.mig-visual'])).toHaveLength(2);
    expect(follow(result.html, ['section.type-24', 'div.mig-body', 'ol.mig-list', 'li.mig-item', 'span.mig-num']).map((n) => (n as { childNodes: Array<{ value?: string }> }).childNodes[0]?.value)).toEqual(['1', '2', '3']);
    await snapshots('type24', section, result.html);
  });
});

describe('type22 · 이미지 카드 + 짧은 목록', () => {
  it('parses cards with and without the short list', async () => {
    const { result, section, data } = check('type22');
    const short = [{ text: '짧은 설명 1' }, { text: '짧은 설명 2' }];
    expect(data).toEqual({ ...header, items: [
      { title: '칸 1', image: pair, subitems: short },
      { title: '칸 2', image: pair, subitems: short },
      { title: '칸 3', image: pair, subitems: [] },
      { title: '칸 4', image: pair, subitems: [] },
    ] });
    expect(follow(result.html, ['section.type-22', 'div.mig-body', 'ul.mig-list', 'li.mig-item', 'div.mig-text-wrap', 'strong.mig-title'])).toHaveLength(4);
    // 호스트 .type-22 .mig-list는 후손 선택자라 하위 목록이 mig-list면 카드 안에서 3열 격자가 된다. 하위 목록은 mig-list가 아니어야 한다.
    expect(follow(result.html, ['li.mig-item', 'div.mig-text-wrap', 'ul', 'li', 'span.mig-desc'])).toHaveLength(4);
    expect(result.html).not.toMatch(/<ul class="mig-list[^"]*"[^>]*>\s*<li>/u);
    await snapshots('type22', section, result.html);
  });
});

describe('type20 · 이미지 + 강조 상자 + 테두리 목록', () => {
  it('parses the original markup', async () => {
    const { result, section, data } = check('type20');
    expect(data).toEqual({ ...header, image: pair, boxEyebrow: '작은 글', boxTitle: '강조할 문구를 입력해 보세요', items: [1, 2, 3, 4].map((n) => ({ text: `목록 ${n}` })) });
    expect(follow(result.html, ['section.type-20', 'div.mig-body', 'div.mig-content', 'div.mig-visual'])).toHaveLength(2);
    expect(follow(result.html, ['div.mig-body', 'div.mig-content', 'div.mig-content', 'div.mig-highlight-box', 'strong.mig-title'])).toHaveLength(1);
    expect(follow(result.html, ['div.mig-content', 'div.mig-content', 'ul.mig-list', 'li.mig-item'])).toHaveLength(4);
    await snapshots('type20', section, result.html);
  });

  it('works without the highlight box', () => {
    const { result, data } = check('type20', original('type20').replace(/<div class="cms-description-box em-box-2">[^]*?<\/div>/u, ''));
    expect(data.boxTitle).toBeUndefined();
    expect(result.html).not.toContain('mig-highlight-box');
  });
});

describe('type21 · 이미지 + 테두리 목록', () => {
  it('parses the original markup', async () => {
    const { result, section, data } = check('type21');
    expect(data).toEqual({ ...header, image: pair, items: [1, 2, 3, 4].map((n) => ({ text: `목록 ${n}` })) });
    expect(follow(result.html, ['section.type-21', 'div.mig-body', 'div.mig-content', 'div.mig-visual'])).toHaveLength(2);
    expect(follow(result.html, ['div.mig-body', 'div.mig-content', 'ul.mig-list', 'li.mig-item', 'strong.mig-title'])).toHaveLength(4);
    await snapshots('type21', section, result.html);
  });
});

describe('type12 · 어두운 바탕 아이콘 카드', () => {
  it('parses the original markup', async () => {
    const { result, section, data } = check('type12');
    expect(data).toEqual({ ...header, items: [1, 2, 3].map((n) => ({ text: `칸 ${n} 내용을 입력해 보세요.`, image: pair })) });
    expect(section.modifiers.textWhite).toBe(true);
    expect(follow(result.html, ['section.type-12', 'div.mig-body', 'ul.mig-list', 'li.mig-item', 'p.mig-desc'])).toHaveLength(3);
    await snapshots('type12', section, result.html);
  });
});

describe('type05 · 큰 이미지', () => {
  it('parses the original markup', async () => {
    const { result, section, data } = check('type05');
    expect(data).toEqual({ ...header, image: pair });
    expect(section.modifiers.background?.token).toBe('bg-color-1');
    expect(follow(result.html, ['section.type-05', 'div.mig-body', 'div.mig-visual'])).toHaveLength(2);
    await snapshots('type05', section, result.html);
  });
});

describe('P5 safety', () => {
  it.each(P5)('%s falls back instead of dropping an unexpected image or paragraph', (id) => {
    for (const extra of ['<img src="https://cdn.example.com/stray.jpg" alt=""/>', '<p>추가 문단</p>']) {
      const result = convert(original(id).replace('<p class="cms-title">', `${extra}<p class="cms-title">`));
      expect(result.page.sections[0]!.type).toBe('fallback');
    }
  });

  it.each(P5)('%s falls back for an unexpected paragraph or image inside a list item or box', (id) => {
    const body = original(id);
    const at = body.lastIndexOf('</li>') > 0 ? body.lastIndexOf('</li>') : body.lastIndexOf('</div>');
    for (const extra of ['<p>끼어든 문단</p>', '<img src="https://cdn.example.com/in.jpg" alt=""/>']) {
      expect(convert(`${body.slice(0, at)}${extra}${body.slice(at)}`).page.sections[0]!.type, extra).toBe('fallback');
    }
  });

  it.each(P5)('%s lists never show browser bullets', (id) => {
    for (const [, attrs] of convert(original(id)).html.matchAll(/<(?:ul|ol)\b([^>]*)>/gu)) {
      expect(attrs).toContain('list-style: none; padding-left: 0; margin: 0;');
    }
  });

  it('type22 short list keeps a nested structure out (falls back)', () => {
    const body = original('type22').replace('<li>짧은 설명 1</li>', '<li>짧은 설명 1<ul><li>안쪽</li></ul></li>');
    expect(convert(body).page.sections[0]!.type).toBe('fallback');
  });
});
