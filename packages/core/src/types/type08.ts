import { imageBulletsType } from './type07.ts';

/**
 * 원본 type08(reference/cms-original/component/type08.html, 실제 페이지 4개 섹션): type07과 같은 구조
 * (.cms-column-wrap > .cms-visual + .cms-list-wrap > ul.cms-bullet-list, 항목 col-6로 2열).
 * 호스트에 type-08 프리셋이 따로 있다(PC에서 이미지·목록 가로 배치, 목록 3열). 읽기·출력은 type07과 같고 프리셋만 다르다.
 */
export const type08 = imageBulletsType('type08', 'type08 이미지 + 글머리 목록 (2열)', 'type-08');
