import { describe, expect, it } from 'vitest';
import { convert, convertFull } from './support/original.ts';

/** 출력은 줄바꿈으로 들여 써지므로 태그 사이 공백을 지우고 비교한다 */
const flat = (html: string) => html.replace(/>\s+</gu, '><');
// 실제 페이지(13279 SLAP병변 #3)와 같은 모양: 설명 상자에 소제목 + 문단·글머리 목록이 번갈아(원본의 잘못된 <p><ul> 중첩 포함)
const item = (n: string, box: string) => `<li class="cms-list-item"><div class="row align-items-center"><div class="cms-figure hexagon col-lg-auto"><svg viewBox="0 0 1 1"><path d="M0 0"/></svg><div class="cms-figure-text"><p class="cms-eyebrow">${n}</p><p class="cms-description">원인</p></div></div><div class="cms-description-box col-lg">${box}</div></div></li>`;
const type10 = (box: string) => `<section class="cms type10"><div class="cms-inner"><div class="cms-list-wrap"><ol class="cms-figure-list text-type-1">${item('01', box)}</ol></div></div></section>`;
const mixed = '<p class="cms-eyebrow">ABOUT</p><p class="cms-description"><strong>비수술적 치료</strong></p><ul class="list-box"><li>약물 <em>치료</em></li><li>주사 치료</li></ul><p></p><p class="cms-description"><strong>수술적 치료</strong></p><ul class="list-box"><li>관절경 고정술</li></ul>';

describe('type10: paragraphs and bullet lists mixed in the description box', () => {
  it('keeps them in the original order as description parts (type10 preset, not block order)', () => {
    const r = convertFull(type10(mixed));
    const s = r.page.sections[0]!;
    expect(s.type).toBe('type10');
    const it0 = (s.data as { items: Array<Record<string, unknown>> }).items[0]!;
    expect(it0.subtitle).toBe('ABOUT');
    expect(it0.desc).toBeUndefined();
    expect(it0.parts).toEqual([
      { text: '<strong>비수술적 치료</strong>' },
      { bullets: [{ text: '약물 <em>치료</em>' }, { text: '주사 치료' }] },
      { text: '<strong>수술적 치료</strong>' },
      { bullets: [{ text: '관절경 고정술' }] },
    ]);
    expect(r.page.diagnostics.some((d) => d.code === 'LAYOUT_SIMPLIFIED' || d.code === 'LOSSY_PARSE')).toBe(false);
    const html = flat(r.html);
    expect(html).toContain('<p class="mig-desc"><strong>ABOUT</strong></p><p class="mig-desc"><strong>비수술적 치료</strong></p><ul style="list-style: disc; padding-left: 1.25em; margin: 0;"><li><span class="mig-desc">약물 <em>치료</em></span></li>');
    // 목록에 mig-list를 붙이지 않는다(호스트 하위 목록 카드 규칙을 받지 않게)
    expect(html).not.toMatch(/<ul class="mig-list[^"]*"[^>]*><li><span class="mig-desc">약물/u);
  });

  it.each([
    ['a nested list', '<p class="cms-description">글</p><ul><li>항목<ul><li>안쪽</li></ul></li></ul>'],
    ['an image in a bullet', '<p class="cms-description">글</p><ul><li><img src="https://example.com/a.png" alt="">항목</li></ul>'],
    ['loose text next to the list', '<p class="cms-description">글</p>떠 있는 글<ul><li>항목</li></ul>'],
    ['a table', '<p class="cms-description">글</p><ul><li>항목</li></ul><table><tbody><tr><td>표</td></tr></tbody></table>'],
  ])('%s is not read as description parts (type10 keeps the original)', (_, box) => {
    expect(convert(type10(box)).page.sections[0]!.type).toBe('fallback');
  });

  it('the original tool border list (cms-border-list) still goes to sub items', () => {
    const r = convert(type10('<p class="cms-description">설명</p><ul class="cms-border-list"><li class="cms-list-item"><p class="cms-title">목록 1</p></li></ul>'));
    const it0 = (r.page.sections[0]!.data as { items: Array<Record<string, unknown>> }).items[0]!;
    expect(it0.subitems).toEqual([{ text: '목록 1' }]);
    expect(it0.parts).toEqual([]);
  });
});
