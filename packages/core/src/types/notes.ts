import { serialize } from '../html/h.ts';
import type { SectionModel } from '../model/index.ts';
import { createRenderContext } from '../render/context.ts';
import type { TypeDefinition } from './definition.ts';

const PROBE_INTRO = 'MIGNOTESPROBEINTRO';
const PROBE_NOTE = 'MIGNOTESPROBENOTE';

/**
 * 이 섹션의 렌더러가 본문 앞뒤 설명(section.notes)을 실제로 출력하는지. 프리셋 골격(presetSection)을 쓰는 타입만 출력하고,
 * 자체 렌더러를 쓰는 타입(type00·type01, 섹션마다 일반 모드가 되는 type33 Q&A 등)은 출력하지 않는다.
 * 타입 목록을 따로 두면 렌더러와 어긋나므로, 표시 글을 넣어 실제로 렌더해 본다 (검수 I-1).
 */
export function rendersNotes(def: TypeDefinition<unknown>, section: SectionModel): boolean {
  let parsed: ReturnType<typeof def.schema.safeParse>;
  try {
    parsed = def.schema.safeParse(section.data);
  } catch {
    return false;
  }
  if (!parsed.success) return false;
  const strategyOf = (section: SectionModel) => {
    const strategy = def.strategyFor ? def.strategyFor(section) : def.strategy;
    return strategy === 'any' ? 'general' : strategy;
  };
  const render = (notes: SectionModel['notes']) => {
    const s: SectionModel = { ...section, data: parsed.data, notes };
    return serialize(def.render(s, createRenderContext({ mode: strategyOf(s) })));
  };
  const count = (html: string, token: string) => html.split(token).length - 1;
  try {
    // 본문에 같은 표시 글이 이미 있을 수 있으므로(검수 M-1), 설명 없이 렌더한 결과보다 표시 글이 늘어나는지로 판정한다
    const base = render(undefined);
    const probe = render({ intro: PROBE_INTRO, note: PROBE_NOTE });
    return count(probe, PROBE_INTRO) > count(base, PROBE_INTRO) && count(probe, PROBE_NOTE) > count(base, PROBE_NOTE);
  } catch {
    return false;
  }
}
