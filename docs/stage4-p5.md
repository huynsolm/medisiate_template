# 4단계 P5 구현 기록 (type24 · 22 · 20 · 21 · 12 · 05)

작성: 2026-11-15. 기준 원본 마크업은 `fixtures/original/typeNN.html`(원본 CMS 도구 `TypeNN.jsx`와 같은 HTML, `fixtures/original/README.md` 참고)이다.
**type29 · 31 · 34 · 32 · 08은 제외**: 원본 구조 자료(biny cms-preview)에 없어 기준 마크업을 만들 수 없다. 변환 시 계속 fallback으로 보존된다.

## 1. 구현 요약

| 타입 | 원본 구조 (요지) | 호스트 프리셋 출력 | 데이터 |
|---|---|---|---|
| type24 | `.cms-visual(PC/MO) + ol.cms-ordered-list > li > .cms-description-box(제목·설명)`, 번호는 원본 CSS 카운터 | `section.type-24 > .mig-body > .mig-visual(PC/MO) + ol.mig-list > li.mig-item(카드) > span.mig-num + .mig-text-wrap` | 머리글, 이미지 쌍, 항목(제목·설명) |
| type22 | `ul.cms-img-list.text-bottom > li.col-6.col-lg-3 > .cms-visual(PC/MO) + .cms-visual-text(p.cms-title [+ ul.list-unstyled > li])` | `section.type-22 > .mig-body > ul.mig-list > li.mig-item > .mig-visual + .mig-text-wrap(strong.mig-title [+ ul > li > span.mig-desc])` | 머리글, 칸(제목·이미지 쌍·짧은 목록) |
| type20 | `.cms-column-wrap > .cms-visual.col-lg-3 + .cms-box.col-lg-9 > .cms-description-box.em-box-2(작은 글·강조 글) + ul.cms-border-list` | `section.type-20 > .mig-body > .mig-content(PC 4:6) > .mig-visual + .mig-content > [.mig-highlight-box] + ul.mig-list(테두리 카드, PC 2열)` | 머리글, 이미지 쌍, 강조 상자(작은 글·글), 목록 |
| type21 | `.cms-header.left-type` + `.cms-column-wrap > .cms-visual.col-lg-5 + .cms-box.col-lg-7 > ul.cms-border-list` | `section.type-21 > .mig-body > .mig-content(PC 4:6) > .mig-visual + ul.mig-list(테두리 카드, PC 2열)` | 머리글, 이미지 쌍, 목록 |
| type12 | 어두운 이미지 배경 + `ul.cms-column-list.item-bg-box > li.col-lg-4 > .cms-inner-box > .cms-icon(PC/MO) + p.cms-description` | `section.type-12 > .mig-body > ul.mig-list(카드, PC 3열) > li.mig-item > .mig-visual(아이콘) + p.mig-desc` | 머리글, 칸(글·아이콘 쌍) |
| type05 | `.cms-header + .cms-visual(PC/MO)` | `section.type-05 > .mig-body > .mig-visual(PC/MO)` | 머리글, 이미지 쌍 |

type20·21의 테두리 목록 읽기·출력은 `packages/core/src/types/border-list.ts`로 함께 쓴다.

## 2. 구현 중 결정과 발견

1. **type24 번호**: 원본 번호는 CSS 카운터라 HTML 글에는 없다. 호스트에는 카운터가 없고 목록 초기화로 번호가 사라지므로, 순서 번호(1, 2, 3…)를 `span.mig-num` 글로 출력한다. 데이터에는 넣지 않는다(항목 순서를 바꾸면 번호도 따라감). 원본 `cms.css`가 없어 번호 모양(동그라미 등)은 확인하지 못했고, 숫자 형식은 biny 재현(`counter(cms-order)`, 1부터)을 따랐다.
2. **type22 짧은 목록**: 호스트 `.type-22 .mig-list`는 후손 선택자라, 하위 목록에 `mig-list`를 붙이면 카드 안에서 PC 3열 격자가 된다. 원본도 글머리 없는 목록(`list-unstyled`)이므로 하위 목록은 클래스 없는 `ul`(인라인 목록 초기화)로 둔다. 하위 항목 안의 문단은 3·4단계와 같은 규칙(줄바꿈 `<br>`, 목록 등은 fallback)을 받는다.
3. **원본 고정 비율·정렬**: type20 3:9, type21 5:7 비율, type21 머리글 왼쪽 정렬, type20 PC 4열 목록은 원본 도구의 선택지가 아니라 고정값이라 진단 없이 호스트 배치(4:6, 가운데 머리글, PC 2열)를 따른다(P4와 같은 기준).
4. **type12**: type06과 같은 아이콘 카드이고 글머리가 없다. 글머리가 끼어 있으면 담을 자리가 없어 fallback한다.

## 3. 검증

- `packages/core/test/p5-types.test.ts`(26개): 타입마다 원본 마크업 → 정확한 데이터, 손실 없음, 호스트 계약의 자식 결합자 경로, 스냅샷(`fixtures/types/typeNN/original.expected.{json,html}`). type24 번호 1·2·3, type22 하위 목록이 `mig-list`가 아님, type20 강조 상자 없음, 머리글 앞·항목 안 끼어든 문단/이미지 → fallback, 목록 초기화(ol 포함).
- `packages/core/test/stage3-review.test.ts`: 3·4단계 검수에서 만든 일반 검사를 P5 6개 타입에도 적용(모든 글 칸이 출력에 나옴, 빈 값, 글 안 문단 → 줄바꿈, 글 안 목록 → fallback, 줄 안 요소 속 블록 → fallback, `richFrom` 외 읽기 경로 없음).
- `tests/visual/preset-layout.test.ts`(실제 Chromium): P2~P5 24개 타입 × PC 1100 / MO 360 / 에디터 1100 × 이미지 있음/없음. 가로 넘침, 글 칸 찌그러짐, 좁은 칸에 갇힌 글, 하위 목록, 표, 본문 폭.
- 화면 확인: P5 여섯 타입 PC·MO 스크린샷.
- 검수 요청 전 직접 확인한 손실 위험 입력 10가지(아래 요청서 3.2)는 모두 줄바꿈으로 보존되거나 섹션 fallback.
- 전체: `npm test` 611 passed · 1 skipped(inventory, `cms/` 필요), `npm run test:browser` 156 passed, lint·typecheck 오류 없음.

## 4. 계획서 DoD 대비

P4와 같다. DoD 1·3 충족, 2·4 부분(원본 fixture 기준, 원본 화면 비교 불가), 5 미실행(`cms/` 필요).
