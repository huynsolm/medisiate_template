import { z } from 'zod';
import { h, type Child } from '../html/h.ts';
import { generalSection } from '../helpers/general-section.ts';
import { generalHeader } from '../helpers/header.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { richFrom, scanSection } from '../parse/common.ts';
import { byClass, finish, originalHeader } from '../parse/original.ts';
import { children, hasClass, type DomElement } from '../parse/dom.ts';
import type { TypeDefinition } from './definition.ts';
import { headerFields, headerShape } from './preset.ts';

const LINE_KINDS = ['item', 'subtitle', 'note', 'mark'] as const;
const lineSchema = z.object({
  /** item: 원본 dd.cms-description(앞에 짧은 선), subtitle: dd.cms-title(굵은 소제목), note: dd.cms-list-item(* 주석), mark: dd.cms-list-item.type01(※ 주석) */
  kind: z.enum(LINE_KINDS).default('item'),
  text: z.string().default(''),
});
const groupSchema = z.object({ title: z.string().optional(), lines: z.array(lineSchema).default([]) });
const schema = z.object({ ...headerShape, groups: z.array(groupSchema).default([]) });
export type Type31Data = z.infer<typeof schema>;
type Line = z.infer<typeof lineSchema>;

function lineKind(dd: DomElement): Line['kind'] {
  if (hasClass(dd, 'cms-list-item')) return hasClass(dd, 'type01') ? 'mark' : 'note';
  if (hasClass(dd, 'cms-title')) return 'subtitle';
  return 'item';
}

/**
 * 원본(reference/cms-original/component/type31.html, 실제 페이지 19개 섹션):
 *   .cms-list-wrap > dl.cms-list-item > dt.cms-title(제목) + dd.cms-description…(줄 종류는 클래스로: cms-title 소제목, cms-list-item 주석)
 *   원본 cms.css: 줄 앞 짧은 선, 주석 앞 `*`(type01은 `※`)을 CSS ::before로 그린다.
 * 호스트: 프리셋이 없어 일반 모드. section.mig-section.type-text > .mig-inner > .mig-content > .mig-content-inner(묶음마다) >
 *   .mig-title-wrap > strong.mig-title + ul.mig-list.type-bullet > li.mig-item > p.mig-desc (줄 표시는 호스트가 그림)
 *   소제목은 p.mig-desc > strong, 주석은 작은 p.mig-desc에 `*`·`※`를 글로 붙인다(원본 CSS 표시 대신).
 *   주석 표시는 원본에 글로 없는 생성 글이라 글 순서 검사용 출력에서는 뺀다.
 */
export const type31: TypeDefinition<Type31Data> = {
  id: 'type31',
  label: 'type31 제목별 안내 줄 목록',
  strategy: 'general',
  variants: ['default'],
  schema: schema as z.ZodType<Type31Data>,
  fields: [
    ...headerFields,
    {
      key: 'groups', label: '묶음', kind: 'repeat', min: 0, max: 30,
      fields: [
        { key: 'title', label: '제목', kind: 'richText' },
        {
          key: 'lines', label: '줄', kind: 'repeat', min: 0, max: 40,
          fields: [
            { key: 'kind', label: '종류', kind: 'select', options: [
              { value: 'item', label: '줄(앞 표시)' }, { value: 'subtitle', label: '굵은 소제목' },
              { value: 'note', label: '* 주석' }, { value: 'mark', label: '※ 주석' },
            ] },
            { key: 'text', label: '글', kind: 'richText' },
          ],
        },
      ],
    },
  ],
  defaults: { groups: [{ title: '제목', lines: [{ kind: 'item', text: '내용' }] }] },
  parse(src) {
    const { modifiers, diagnostics } = scanSection(src);
    const header = originalHeader(src.element);
    const used: string[] = [...header.used];
    const inner = children(src.element).find(byClass('cms-inner')) ?? src.element;
    // 묶음 = .cms-list-wrap 안의 dl.cms-list-item. 그 밖의 요소(표, 설명 상자 등)는 읽지 않아 남은 글 검사가 fallback한다
    const groups = children(inner).filter(byClass('cms-list-wrap'))
      .flatMap((wrap) => children(wrap).filter((el) => el.tagName === 'dl' && hasClass(el, 'cms-list-item')))
      .map((dl) => {
        const dt = children(dl).find((c) => c.tagName === 'dt');
        const title = dt ? richFrom(dt) : '';
        const lines = children(dl).filter((c) => c.tagName === 'dd').map((dd) => ({ kind: lineKind(dd), text: richFrom(dd) }));
        used.push(title, ...lines.map((l) => l.text));
        return { ...(title ? { title } : {}), lines };
      });
    const data: Type31Data = { ...(header.eyebrow ? { eyebrow: header.eyebrow } : {}), ...(header.heading ? { heading: header.heading } : {}), groups };
    return finish(src, data, used, [], { modifiers, diagnostics });
  },
  render(section, ctx) {
    const d = section.data;
    const note = (line: Line, mark: string) => h('p', { class: 'mig-desc', style: { fontSize: '0.875em' } }, [
      !ctx.orderCheck && `${mark} `, rich(line.text),
    ]);
    const body = (lines: Line[]): Child[] => {
      const out: Child[] = [];
      let bullets: Line[] = [];
      const flush = () => {
        if (bullets.length) out.push(h('ul', { class: 'mig-list type-bullet' }, bullets.map((b) => h('li', { class: 'mig-item' }, [h('p', { class: 'mig-desc' }, [rich(b.text)])]))));
        bullets = [];
      };
      for (const line of lines) {
        if (line.kind === 'item') { bullets.push(line); continue; }
        flush();
        if (line.kind === 'subtitle') out.push(h('p', { class: 'mig-desc' }, [h('strong', {}, [rich(line.text)])]));
        else out.push(note(line, line.kind === 'mark' ? '※' : '*'));
      }
      flush();
      return out;
    };
    return generalSection(section, [
      (!isBlank(d.heading) || !isBlank(d.eyebrow)) && generalHeader({ eyebrow: d.eyebrow, title: d.heading }, ctx, { white: section.modifiers.textWhite ?? false }),
      h('div', { class: 'mig-content' }, d.groups.map((g) => h('div', { class: 'mig-content-inner' }, [
        !isBlank(g.title) && h('div', { class: 'mig-title-wrap' }, [h('strong', { class: 'mig-title' }, [rich(g.title)])]),
        ...body(g.lines),
      ]))),
    ]);
  },
};
