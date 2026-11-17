import { describe, expect, it } from 'vitest';
import { convertFull as convert } from './support/original.ts';

/** 출력은 줄바꿈으로 들여 써지므로 태그 사이 공백을 지우고 비교한다 */
const flat = (html: string) => html.replace(/>\s+</gu, '><');
// 실제 페이지(13168 그외질환 #3)와 같은 모양: type09 목록 뒤에 강조 설명 상자
const item = (text: string) => `<li class="cms-list-item col-6 col-lg-4"><div class="cms-inner-box row"><div class="cms-figure check col-auto"><svg viewBox="0 0 10 10"><path d="M0 0"/></svg></div><div class="cms-description-box col"><p class="cms-description">${text}</p></div></div></li>`;
const type09 = (before = '', after = '') => `<section class="cms type09 type-bg"><div class="cms-inner"><div class="cms-header top-border"><p class="cms-eyebrow">작은 글</p><p class="cms-title">제목</p></div>${before}<div class="cms-list-wrap"><ul class="cms-column-list item-bg-box text-type-3 row justify-content-start">${item('칸 1')}${item('칸 2')}</ul></div>${after}</div></section>`;
const box = (text: string, cls = 'cms-description-box em-box') => `<div class="${cls}"><p class="cms-description">${text}</p></div>`;

describe('section notes: description boxes outside the type structure', () => {
  it('a box after the list becomes the note at the end of the preset body (no layout simplification)', () => {
    const r = convert(type09('', box('뒤 설명 <strong>강조</strong>')));
    const s = r.page.sections[0]!;
    expect(s.type).toBe('type09');
    expect(s.notes).toEqual({ note: '뒤 설명 <strong>강조</strong>' });
    expect(r.page.diagnostics.some((d) => d.code === 'LAYOUT_SIMPLIFIED' || d.code === 'LOSSY_PARSE')).toBe(false);
    expect(flat(r.html)).toMatch(/<\/ul><div class="mig-text-wrap"><p class="mig-desc">뒤 설명 <strong>강조<\/strong><\/p><\/div><\/div><\/section>/u);
  });

  it('a box before the list becomes the header description (the list stays the first body child)', () => {
    const r = convert(type09(box('앞 설명', 'cms-description-box')));
    expect(r.page.sections[0]!.notes).toEqual({ intro: '앞 설명' });
    expect(flat(r.html)).toContain('<strong class="mig-title">제목</strong><p class="mig-desc">앞 설명</p></header><div class="mig-body"><ul');
  });

  it('several boxes on one side are joined with line breaks, both sides at once work', () => {
    const r = convert(type09(box('앞'), `${box('뒤 1')}${box('뒤 2')}`));
    expect(r.page.sections[0]!.notes).toEqual({ intro: '앞', note: '뒤 1<br>뒤 2' });
  });

  it('a box between two body parts is not moved out (order would change)', () => {
    const r = convert(`<section class="cms type09"><div class="cms-inner"><div class="cms-list-wrap"><ul class="cms-column-list"><li class="cms-list-item"><p class="cms-title">A</p></li></ul></div>${box('사이')}<div class="cms-list-wrap"><ul class="cms-column-list"><li class="cms-list-item"><p class="cms-title">B</p></li></ul></div></div></section>`);
    expect(r.page.sections[0]!.notes).toBeUndefined();
    expect(r.page.sections[0]!.type).not.toBe('type09');
  });

  it.each([
    ['a list', '<div class="cms-description-box"><ul><li>목록</li></ul></div>'],
    ['an image', '<div class="cms-description-box"><p class="cms-description">글</p><img src="https://example.com/a.png" alt=""></div>'],
  ])('a box holding %s is not turned into a note', (_, extra) => {
    const r = convert(type09('', extra));
    expect(r.page.sections[0]!.notes).toBeUndefined();
    expect(r.page.sections[0]!.type).not.toBe('type09');
  });

  it('notes survive the page schema (no INVALID_DATA) and the original DOM is left as it was', () => {
    const r = convert(type09(box('앞'), box('뒤')));
    expect(r.page.diagnostics.some((d) => d.code === 'INVALID_DATA')).toBe(false);
    // 두 번 변환해도 같은 결과(상자를 떼었다 되돌린 DOM이 그대로)
    expect(convert(type09(box('앞'), box('뒤'))).html).toBe(r.html);
  });
});
