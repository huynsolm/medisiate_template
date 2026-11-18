import { h, type ElementNode } from '../html/h.ts';
import { isBlank, rich } from '../helpers/misc.ts';
import { byClass, listItems, textOf } from '../parse/original.ts';
import { descendants, type DomElement } from '../parse/dom.ts';
import { LIST_RESET } from './preset.ts';

/** 원본 테두리 목록(type20·21): ul.cms-border-list > li > .cms-description-box > p.cms-title */
export function readBorderList(root: DomElement): Array<{ text: string }> {
  return listItems(descendants(root, byClass('cms-border-list'))[0]).map((li) => ({ text: textOf(li, 'cms-title') }));
}

/** 호스트 테두리 목록: ul.mig-list > li.mig-item(테두리 카드) > strong.mig-title */
export function renderBorderList(items: Array<{ text: string }>): ElementNode {
  return h('ul', { class: 'mig-list', style: LIST_RESET }, items.map((item) =>
    h('li', { class: 'mig-item' }, [!isBlank(item.text) && h('strong', { class: 'mig-title' }, [rich(item.text)])])));
}
