import { describe, expect, it } from 'vitest';
import { check, convert, follow, original, snapshot } from './support/original.ts';

// 4단계 P4 타입: fixtures/original/typeNN.html(원본 CMS 도구와 같은 마크업) → 호스트 프리셋.
// type33·28·30은 원본 구조 자료(biny cms-preview)가 없어 제외.
const pair = { pc: { src: '/images/cms-sample.svg', alt: '', kind: 'relative' }, mo: { src: '/images/cms-sample-m.svg', alt: '', kind: 'relative' } };
const pcOnly = { pc: { src: '/images/cms-sample.svg', alt: '', kind: 'relative' } };
const header = { eyebrow: '작은 제목', heading: '제목을 입력해 보세요' };
const P4 = ['type18', 'type23', 'type13', 'type06', 'type16', 'type14', 'type19'];

async function snapshots(id: string, section: unknown, html: string) {
  await expect(JSON.stringify(section, null, 2) + '\n').toMatchFileSnapshot(snapshot(`${id}/original.expected.json`));
  await expect(html).toMatchFileSnapshot(snapshot(`${id}/original.expected.html`));
}

describe('type18 · 이미지 카드 (번호·제목·설명)', () => {
  it('parses the original markup', async () => {
    const { result, section, data } = check('type18');
    expect(data).toEqual({ ...header, textStyle: 'text-type-1', items: [1, 2, 3].map((n) => ({ num: `0${n}`, title: `칸 ${n} 제목`, desc: '설명을 입력해 보세요.', image: pair })) });
    expect(result.page.diagnostics.some((d) => d.code === 'PRESET_LAYOUT_FIXED')).toBe(false);
    expect(follow(result.html, ['section.type-18', 'div.mig-body', 'ul.mig-list', 'li.mig-item', 'div.mig-visual'])).toHaveLength(6);
    expect(follow(result.html, ['li.mig-item', 'div.mig-text-wrap', 'span.mig-num'])).toHaveLength(3);
    await snapshots('type18', section, result.html);
  });

  it('keeps the text-type-3 style and reports that the host has no such style', () => {
    const { result, data } = check('type18', original('type18').replace('text-type-1', 'text-type-3'));
    expect(data.textStyle).toBe('text-type-3');
    expect(result.page.diagnostics.some((d) => d.code === 'PRESET_LAYOUT_FIXED')).toBe(true);
  });
});

describe('type23 · 가운데 설명 + 넓은 이미지', () => {
  it('parses the original markup', async () => {
    const { result, section, data } = check('type23');
    expect(data).toEqual({ ...header, desc: '가운데에 놓을 설명을 입력해 보세요.', image: pair });
    expect(follow(result.html, ['section.type-23', 'div.mig-body', 'div.mig-text-wrap', 'p.mig-desc'])).toHaveLength(1);
    expect(follow(result.html, ['section.type-23', 'div.mig-body', 'div.mig-visual'])).toHaveLength(2);
    await snapshots('type23', section, result.html);
  });

  it('works without the description', () => {
    const { result, data } = check('type23', original('type23').replace(/<div class="cms-description-box text-center">[^]*?<\/div>/u, ''));
    expect(data.desc).toBeUndefined();
    expect(result.html).not.toContain('mig-text-wrap');
  });
});

describe('type13 · 번호·체크 행 목록 + 강조 상자', () => {
  it('parses the original markup', async () => {
    const { result, section, data } = check('type13');
    expect(data).toEqual({ ...header, items: [1, 2, 3].map((n) => ({ num: `0${n}`, text: `${n}번째 내용을 입력해 보세요.` })), bottom: '마무리 문구를 입력해 보세요.' });
    expect(section.modifiers.background?.value).toBe('#f9f3ec');
    expect(follow(result.html, ['section.type-13', 'div.mig-body', 'ul.mig-list', 'li.mig-item', 'div.mig-content', 'span.mig-icon'])).toHaveLength(3);
    expect(follow(result.html, ['li.mig-item', 'div.mig-content', 'span.mig-num'])).toHaveLength(3);
    expect(follow(result.html, ['section.type-13', 'div.mig-body', 'div.mig-highlight-box', 'p.mig-desc'])).toHaveLength(1);
    await snapshots('type13', section, result.html);
  });

  it('keeps the number slot so the text stays in the middle column', () => {
    const { result } = check('type13', original('type13').replace('<p class="cms-description">01</p>', '<p class="cms-description"></p>'));
    expect(follow(result.html, ['li.mig-item', 'div.mig-content', 'span.mig-num'])).toHaveLength(3);
  });
});

describe('type14 · 번호·체크 행 목록', () => {
  it('parses the original markup', async () => {
    const { result, section, data } = check('type14');
    expect(data).toEqual({ ...header, items: [1, 2, 3, 4].map((n) => ({ num: `0${n}`, text: `${n}번째 내용을 입력해 보세요.` })) });
    expect(follow(result.html, ['section.type-14', 'div.mig-body', 'ul.mig-list', 'li.mig-item', 'div.mig-content', 'p.mig-desc'])).toHaveLength(4);
    expect(result.html).not.toContain('mig-highlight-box');
    await snapshots('type14', section, result.html);
  });
});

describe('type06 · 어두운 바탕 아이콘 카드', () => {
  it('parses cards with and without bullets', async () => {
    const { result, section, data } = check('type06');
    expect(data).toEqual({
      ...header,
      items: [
        { text: '<strong>칸 1</strong>', image: pair, subitems: [{ text: '세부 내용 1' }, { text: '세부 내용 2' }] },
        { text: '칸 2', image: pair, subitems: [] },
        { text: '<strong>칸 3</strong>', image: pair, subitems: [{ text: '세부 내용 1' }] },
        { text: '칸 4', image: pair, subitems: [] },
      ],
    });
    expect(section.modifiers.background?.token).toBe('bg-image-1');
    expect(section.modifiers.textWhite).toBe(true);
    expect(follow(result.html, ['section.type-06', 'div.mig-body', 'ul.mig-list', 'li.mig-item', 'div.mig-visual'])).toHaveLength(8);
    expect(follow(result.html, ['li.mig-item', 'ul.mig-list.type-dot', 'li.mig-item'])).toHaveLength(3);
    await snapshots('type06', section, result.html);
  });
});

describe('type16 · PC 큰 이미지 / 모바일 글 + 아이콘 목록', () => {
  it('parses the original markup', async () => {
    const { result, section, data } = check('type16');
    expect(data).toEqual({
      ...header,
      image: pcOnly,
      mobileText: '핵심 문구',
      items: [1, 2, 3, 4].map((n) => ({ title: `칸 ${n}`, desc: '설명을 입력해 보세요.', icon: pcOnly })),
    });
    expect(follow(result.html, ['section.type-16', 'div.mig-body', 'div.mig-visual.common-display-pc'])).toHaveLength(1);
    expect(follow(result.html, ['section.type-16', 'div.mig-body', 'div.mig-text-wrap.common-display-mo', 'strong.mig-title'])).toHaveLength(1);
    expect(follow(result.html, ['section.type-16', 'div.mig-body', 'ul.mig-list', 'li.mig-item', 'div.mig-content', 'div.mig-visual'])).toHaveLength(4);
    await snapshots('type16', section, result.html);
  });

  it('falls back when the mobile figure also holds an image (no place for it)', () => {
    const body = original('type16').replace('<div class="cms-figure-text">', '<img src="https://cdn.example.com/hex.png" alt=""/><div class="cms-figure-text">');
    expect(convert(body).page.sections[0]!.type).toBe('fallback');
  });
});

describe('type19 · 단계 목록', () => {
  it('parses the original markup', async () => {
    const { result, section, data } = check('type19');
    expect(data).toEqual({ ...header, items: [1, 2, 3, 4].map((n) => ({ num: `0${n}`, text: `${n}단계` })) });
    expect(follow(result.html, ['section.type-19', 'div.mig-body', 'ul.mig-list', 'li.mig-item', 'span.mig-num'])).toHaveLength(4);
    expect(result.html).not.toContain('<svg');
    await snapshots('type19', section, result.html);
  });
});

describe('P4 safety', () => {
  it.each(P4)('%s falls back instead of dropping an unexpected image or paragraph', (id) => {
    for (const extra of ['<img src="https://cdn.example.com/stray.jpg" alt=""/>', '<p>추가 문단</p>']) {
      const result = convert(original(id).replace('<p class="cms-title">', `${extra}<p class="cms-title">`));
      expect(result.page.sections[0]!.type).toBe('fallback');
    }
  });

  it.each(P4)('%s falls back for an unexpected paragraph inside a list item or box', (id) => {
    const body = original(id);
    const at = body.lastIndexOf('</li>') > 0 ? body.lastIndexOf('</li>') : body.lastIndexOf('</div>');
    const result = convert(`${body.slice(0, at)}<p>끼어든 문단</p>${body.slice(at)}`);
    expect(result.page.sections[0]!.type).toBe('fallback');
  });

  it.each(P4)('%s lists never show browser bullets', (id) => {
    for (const [, attrs] of convert(original(id)).html.matchAll(/<ul class="mig-list[^"]*"([^>]*)>/gu)) {
      expect(attrs).toContain('list-style: none; padding-left: 0; margin: 0;');
    }
  });
});
