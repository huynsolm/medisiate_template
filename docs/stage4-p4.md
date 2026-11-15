# 4단계 P4 구현 기록 (type18 · 23 · 13 · 06 · 16 · 14 · 19)

작성: 2026-11-15. 기준 원본 마크업은 `fixtures/original/typeNN.html`(원본 CMS 도구 `TypeNN.jsx`와 같은 HTML, `fixtures/original/README.md` 참고)이다.
**type33 · 28 · 30은 제외**: 원본 구조 자료(biny cms-preview)에 없어 기준 마크업을 만들 수 없다. 변환 시 계속 fallback으로 보존된다.

## 1. 구현 요약

| 타입 | 원본 구조 (요지) | 호스트 프리셋 출력 | 데이터 |
|---|---|---|---|
| type18 | `ol.cms-img-list.text-type-N > li.col-6.col-lg-4 > .cms-visual(PC/MO) + .cms-visual-text(번호·제목·설명)` | `section.type-18 > .mig-body > ul.mig-list > li.mig-item > .mig-visual(PC/MO) + .mig-text-wrap(span.mig-num, strong.mig-title, p.mig-desc)` | 머리글, 글 스타일(text-type-1/3), 항목 |
| type23 | `[.cms-description-box.text-center > p.cms-description] + .cms-visual(PC/MO)` | `section.type-23 > .mig-body > [.mig-text-wrap > p.mig-desc] + .mig-visual(PC/MO)` | 머리글, 설명, 이미지 쌍 |
| type13 | `ul.cms-table-list > li > .cms-inner-box.row > 번호 칸 + 글 칸 + 체크 도형` + `.cms-description-box.em-box`(아래 강조 문구), 배경 `type-bg` | `section.type-13 > .mig-body > ul.mig-list > li.mig-item > .mig-content(grid auto·1fr·18px) > span.mig-num + p.mig-desc + span.mig-icon(체크)` + `.mig-highlight-box > p.mig-desc` | 머리글, 행(번호·글), 아래 강조 문구 |
| type14 | type13과 같은 행 목록, 강조 문구·배경 없음 | type13과 같은 행 구조(`type-14`) | 머리글, 행(번호·글) |
| type06 | `ul.cms-column-list.item-bg-box > li.col-6.col-lg-3 > .cms-inner-box > .cms-icon(PC/MO) + .cms-description-box(p.cms-description [+ ul.cms-bullet-list])`, 어두운 이미지 배경 | `section.type-06 > .mig-body > ul.mig-list(카드) > li.mig-item > .mig-visual(아이콘) + p.mig-desc [+ ul.mig-list.type-dot]` | 머리글, 칸(글·아이콘 쌍·글머리) |
| type16 | `.cms-visual > img(PC 전용) + .cms-figure.hexagon(모바일 전용 도형 + 글)` + `ul.cms-column-list > li.col-6 > .cms-icon(한 장) + 제목·설명` | `section.type-16 > .mig-body > .mig-visual.common-display-pc + .mig-text-wrap.common-display-mo > strong.mig-title` + `ul.mig-list > li.mig-item > .mig-content(grid 30px·1fr) > .mig-visual + .mig-text-wrap` | 머리글, PC 큰 이미지, 모바일 전용 글, 칸(제목·설명·아이콘) |
| type19 | `ol.cms-figure-list > li.col-6.col-lg > .cms-figure.hexagon(svg + 번호 + 글)` | `section.type-19 > .mig-body > ul.mig-list(2열 → PC 4열) > li.mig-item > span.mig-num + p.mig-desc` | 머리글, 단계(번호·글) |

type13·type14는 공통 생성 함수 `packages/core/src/types/check-rows.ts`를 쓴다.

## 2. 구현 중 결정과 발견

1. **이미지 배경 섹션의 본문 폭(공통 수정)**: 호스트는 `data-migration-bg="true"` 섹션을 가운데 정렬 flex로 만들어(`align-items: center`) `.mig-body`가 내용 폭으로 줄어든다. type06 카드가 PC에서 약 130px로 찌그러져 가운데에 몰렸고, P3의 type11도 같은 상태였다(화면 확인에서 발견). `presetSection`이 이미지 배경 섹션의 본문에만 `align-self: stretch`를 붙인다(머리글의 가운데 정렬은 그대로). type01(배너)은 다른 경로라 영향 없음. 브라우저 검사에 "본문이 섹션 안쪽 폭을 다 쓴다"를 추가했고, 수정 전에는 type11·type06이 실패함을 확인했다. type11 스냅샷이 이 한 줄만큼 바뀌었다.
2. **장식 도형은 옮기지 않고 안의 글은 옮긴다**: type19 육각형, type16 모바일 육각형(안의 글은 모바일 전용 글로). type13·14의 체크 도형은 행 의미의 일부라 원본과 같은 경로(18×14)를 고정 값으로 넣는다(입력의 SVG는 옮기지 않음).
3. **type13·14 번호 칸**: 호스트 행 격자가 `auto 1fr 18px`라 번호가 비면 글이 첫 칸으로 밀린다. 번호가 비어도 `span.mig-num`을 남긴다.
4. **type06 굵은 글**: 원본 도구는 글머리가 있는 칸의 글을 `<strong>`으로 감싼다. 이 서식은 글(rich)에 그대로 남겨 출력한다.
5. **호스트가 고정한 배치**: type18 `text-type-3`(번호에 위아래 선)은 호스트에 글 스타일 변형이 없어 값만 보존하고 `PRESET_LAYOUT_FIXED`(info)를 남긴다. 원본의 열 수(type18 PC 3열, type06 PC 4열, type16 2열, type19 PC 균등)는 원본 도구의 선택지가 아니라 고정값이라 진단하지 않고 호스트 열 수를 따른다.
6. **type23 정렬**: 원본은 설명을 가운데 정렬하지만 호스트 `type-23 .mig-text-wrap`은 왼쪽 정렬이다. 호스트 디자인을 따른다.
7. **type16 큰 이미지**: PC 전용 한 장만 담는다. 도형 안 등 다른 자리에 이미지가 더 있으면 이미지 수 검사로 섹션 전체를 fallback으로 보존한다.

## 3. 검증

- `packages/core/test/p4-types.test.ts`(32개): 타입마다 원본 마크업 → 정확한 데이터, 손실 없음, 호스트 계약의 자식 결합자 경로, 스냅샷(`fixtures/types/typeNN/original.expected.{json,html}`). type18 글 스타일 보존·진단, type23 설명 없음, type13 번호 빈 칸 유지, type16 도형 안 이미지 → fallback, 머리글 앞·항목 안 끼어든 문단/이미지 → fallback, 목록 초기화.
- `packages/core/test/stage3-review.test.ts`: 3단계 검수에서 만든 일반 검사(모든 글 칸이 출력에 나옴, 반복 항목의 글을 비워도 검증 통과)를 P4 7개 타입에도 적용.
- `tests/visual/preset-layout.test.ts`(실제 Chromium): P2·P3·P4 18개 타입 × PC 1100 / MO 360 / 에디터 1100. 가로 넘침, 글 칸 찌그러짐, 하위 목록, 표, **본문 폭**.
- 화면 확인: P4 일곱 타입 PC·MO 스크린샷(type06 본문 폭 문제를 여기서 발견해 고침).
- 전체: `npm test` 387 passed · 1 skipped(inventory, `cms/` 필요), `npm run test:browser` 66 passed, lint·typecheck 오류 없음.

## 4. 계획서 DoD 대비

| DoD | 상태 |
|---|---|
| 1. 호스트 DOM 계약 | 있음 (`docs/host-dom-contract.md`) |
| 2. 실제 contents 대표 섹션 2개 이상 + 기대 JSON·HTML | **부분**: 원본과 같은 구조의 fixture 1개 + 변형 입력. 실제 `cms/contents` 표본은 원본이 있어야 추가 가능 |
| 3. parse → render 스냅샷 | 충족 |
| 4. PC/MO/에디터 시각 비교 B등급 이상 | **부분**: 넘침·찌그러짐·본문 폭 자동 검사와 화면 확인까지. 원본 화면과의 등급 비교는 원본 CSS·페이지가 있어야 가능 |
| 5. inventory 기준 fallback 비율 | 미실행 (`cms/` 필요) |
