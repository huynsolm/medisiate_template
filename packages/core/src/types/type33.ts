import { figureFactsType } from './type27.ts';

/**
 * 원본 type33: 실제 페이지(56개 섹션)는 거의 모두 원 안의 아이콘 + 작은 글(cms-eyebrow) + 값(cms-description) 목록이다
 * (예: 수술 시간 / 3시간). type27과 같은 구조라 같은 읽기·출력을 쓴다.
 * 호스트 CSS에는 type-33 프리셋이 없다. 같은 내용을 위한 호스트 디자인인 type-27 카드 프리셋으로 출력한다.
 * 원본 컴포넌트 파일의 dl·상자 목록 형태(증명서 발급 안내 등)는 실제 페이지에 드물어 아직 fallback으로 보존한다.
 */
export const type33 = figureFactsType('type33', 'type33 원 안의 아이콘·작은 글·값 목록 (호스트 type-27 카드)');
