# 3단계 P3 구현 기록 (type26 · 11 · 04 · 25 · 15 · 17)

작성: 2026-11-15. 기준 원본 마크업은 `fixtures/original/typeNN.html`(원본 CMS 도구 `TypeNN.jsx`와 같은 HTML, `fixtures/original/README.md` 참고)이다.
**type27은 제외**: 원본 구조 자료(cms-preview)에 없어 기준 마크업을 만들 수 없다. 변환 시 계속 fallback으로 보존된다.

## 1. 구현 요약

| 타입 | 원본 구조 (요지) | 호스트 프리셋 출력 | 데이터 |
|---|---|---|---|
| type26 | `p.cms-description` + `table`(colgroup 너비, thead/tbody, th·td, colspan/rowspan) | `section.type-26 > .mig-body > .mig-table-wrap > p.mig-desc + .table-responsive > table.mig-table`(colgroup·thead·tbody) | 머리글, 설명, 열 너비(`auto` 또는 CSS 길이만), 머리 행·본문 행(셀 글·th 여부·병합) |
| type11 | 어두운 배경(`bg-image-2`, `text-white`) + `ul > li > p.cms-description` | `section.type-11 > .mig-body > ul.mig-list > li.mig-item > p.mig-desc` | 머리글, 항목 |
| type04 | `ol.cms-tile-list > li > .cms-visual + .cms-description-box(번호·제목·설명)` (항목 사이 화살표) | `section.type-04 > .mig-body > ul.mig-list > li.mig-item > .mig-content > .mig-visual + .mig-text-wrap` | 머리글, 항목(번호·제목·설명·이미지 쌍) |
| type25 | `ul > li.col-lg-3(또는 4) > .cms-visual + 제목·설명` | `section.type-25 > .mig-body > ul.mig-list > li.mig-item > .mig-visual + .mig-text-wrap` | 머리글, 한 줄 항목 수(3·4), 항목 |
| type15 | `ul > li > .cms-visual + 제목 + (글머리 목록 또는 문단)` | `section.type-15 > .mig-body > .mig-content > ul.mig-list > li.mig-item > .mig-visual + strong.mig-title + (ul.mig-list.type-dot 또는 p.mig-desc)` | 머리글, 항목(제목·이미지 쌍·글머리·문단) |
| type17 | `ul > li > p.cms-title.col-auto(또는 col-2) + p.cms-description` | `section.type-17 > .mig-body > ul.mig-list > li.mig-item > strong.mig-title + p.mig-desc` | 머리글, 제목 칸 폭(auto·wide), 항목 |

공통 모듈은 P2와 같다(`parse/original.ts`, `types/preset.ts`). type03의 이미지+글 항목 출력은 `imageTextItem()`으로 묶어 type04와 함께 쓴다.

## 2. 구현 중 결정과 발견

1. **표 열 너비(type26)**: 원본은 `<col style="width: 30%">`로 너비를 준다. 이것은 데이터(`colWidths`)로 옮기므로 `INLINE_STYLE_DROPPED` 진단을 남기지 않는다. 값은 `auto` 또는 CSS 길이만 허용해 CSS 주입(`30%; position: fixed`)을 막는다. 편집기에서 고칠 수 있게 `{ width }` 객체 목록으로 둔다.
2. **표 병합 셀**: `colspan`·`rowspan`이 2 이상일 때만 보존한다(1은 기본값이라 생략).
3. **표 모바일 배치**: 호스트 프리셋 표(`.mig-table`)는 `min-width: 0`으로 화면 폭에 맞춘다(일반 모드 표처럼 가로 스크롤하지 않음). 이 동작을 그대로 따르고, 화면 밖으로 나가지 않는지 검사한다.
4. **호스트가 고정한 배치**: type25 "한 줄 4개"(호스트 PC 3열 고정)와 type17 "넓은 제목 칸"(col-2)은 화면에 반영하지 않고 값만 데이터에 보존하며 `PRESET_LAYOUT_FIXED`(info)를 남긴다. 호스트와 같은 선택(3개, auto)이면 진단 없음.
5. **type15 하위 글머리**: 하위 목록에 `type-dot`을 붙인다. 호스트의 3열 격자 규칙(`.mig-list:first-of-type:not(.type-dot)`)이 하위 목록에 걸리지 않게 하기 위함이다.
6. **PC 배경 레이어 바탕색(공통 수정)**: 이미지 배경(`bg-image-N`)은 PC에서 호스트가 섹션 배경을 지우고(`data-bg-scope="mobile"`) PC 전용 레이어가 이미지를 맡는다. 이 레이어에 바탕색이 없어서, 이미지를 못 불러오면 흰 글자가 흰 바탕에 놓여 **글이 보이지 않았다**(type11 화면 확인에서 발견). 원본 이미지 서버(`fxfile.drline.net`)는 http 전용이라 https 페이지에서 막힐 수 있으므로, PC 레이어에도 모바일과 같은 어두운 바탕색을 깐다(`helpers/background.ts`). 이미지 배경을 쓰는 모든 타입에 적용된다.

## 3. 검증

- `packages/core/test/p3-types.test.ts`(22개): 타입마다 원본 마크업 → 정확한 데이터, 손실 없음, 호스트 계약의 자식 결합자 경로, 스냅샷(`fixtures/types/typeNN/original.expected.{json,html}`). 표 병합 셀, 열 너비 주입 차단, type25 열 수·type17 제목 폭 보존과 진단, 끼어든 이미지/문단 → fallback, 목록 초기화.
- `packages/core/test/types.test.ts`: PC 배경 레이어 바탕색 테스트 추가.
- `tests/visual/preset-layout.test.ts`(실제 Chromium, 호스트 CSS): P2·P3 11개 타입 × PC 1100 / MO 360 / 에디터 1100에서 가로 넘침 없음, type03·type04 글 칸이 찌그러지지 않음, 하위 목록이 카드 안, 표가 화면 안.
- 화면 확인: P3 여섯 타입 PC·MO 스크린샷 확인(type11 바탕색 문제를 여기서 발견해 고침).
- `apps/cli/test/convert.test.ts`: "지원하지 않는 섹션" 예시가 type26이었으므로 아직 미지원인 type27로 바꿨다.

## 4. 계획서 DoD 대비

| DoD | 상태 |
|---|---|
| 1. 호스트 DOM 계약 | 있음 (`docs/host-dom-contract.md`) |
| 2. 실제 contents 대표 섹션 2개 이상 + 기대 JSON·HTML | **부분**: 원본과 같은 구조의 fixture 1개 + 변형 입력. 실제 `cms/contents` 표본은 원본이 있어야 추가 가능 |
| 3. parse → render 스냅샷 | 충족 |
| 4. PC/MO/에디터 시각 비교 B등급 이상 | **부분**: 넘침·찌그러짐 자동 검사와 화면 확인까지. 원본 화면과의 등급 비교는 원본 CSS·페이지가 있어야 가능 |
| 5. inventory 기준 fallback 비율 | 미실행 (`cms/` 필요) |
