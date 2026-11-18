# 3단계 P2 구현 기록 (type07 · 09 · 10 · 02 · 03)

작성: 2026-11-15. 기준 원본 마크업은 `fixtures/original/typeNN.html`(원본 CMS 도구 `TypeNN.jsx`와 같은 HTML, `fixtures/original/README.md` 참고)이다.

## 1. 구현 요약

| 타입 | 원본 구조 (요지) | 호스트 프리셋 출력 | 데이터 |
|---|---|---|---|
| type07 | `.cms-visual`(PC/MO) + `ul.cms-bullet-list > li > p.cms-description` | `section.type-07 > .mig-body > .mig-content > .mig-visual`(직접 자식, PC 4:6 격자) + `ul.mig-list > li.mig-item > span.mig-desc` | 머리글, 이미지 쌍, 글머리 목록 |
| type09 | `ul.cms-column-list > li.col-N > .cms-figure.check(svg) + p.cms-description` | `section.type-09 > .mig-body > ul.mig-list > li.mig-item > .mig-content > span.mig-icon(체크 svg) + p.mig-desc` | 머리글, 한 줄 항목 수(1~3), 항목 |
| type10 | `.cms-visual` + `ol.cms-figure-list > li > .cms-figure.hexagon(svg + 번호·핵심 단어) + .cms-description-box(소제목·설명·ul.cms-border-list)` | `section.type-10 > .mig-body > .mig-visual + .mig-content > ul.mig-list > li.mig-item(span.mig-num, strong.mig-title, p.mig-desc, 하위 ul.mig-list)` | 머리글, 이미지 쌍, 항목(번호·핵심 단어·소제목·설명·하위 목록) |
| type02 | `ol.cms-figure-list > li > .cms-figure.pentagon(svg + 작은 글·핵심 글) + .cms-description-box > p.cms-description` | `section.type-02 > .mig-body > .mig-content > ul.mig-list > li.mig-item(span.mig-label, strong.mig-title, p.mig-desc)` | 머리글, 항목(작은 글·핵심 글·설명) |
| type03 | `ol.cms-tile-list.array-zigzag(.reverse) > li > .cms-visual + .cms-description-box(번호·제목·설명)` | `section.type-03 > .mig-body > ul.mig-list > li.mig-item > .mig-content > .mig-visual + .mig-text-wrap` | 머리글, 반전 여부, 항목(번호·제목·설명·이미지 쌍) |

공통 모듈:
- `packages/core/src/parse/original.ts`: 원본 머리글(`cms-eyebrow`·`cms-title`·`cms-thin-title`), 목록 항목, 이미지 쌍, 열 클래스, 마무리(`finish`).
- `packages/core/src/types/preset.ts`: 프리셋 섹션 골격(배경·머리글·본문), 목록 인라인 초기화.

## 2. 구현 중 결정과 발견

1. **조용한 손실 방지(공통)**: `finish`가 담지 못한 글뿐 아니라 **섹션의 이미지 수와 데이터에 담긴 이미지 수**도 비교한다. 타입이 읽는 자리 밖의 이미지(예: 목록 안에 끼어든 이미지)가 있으면 섹션 전체를 fallback으로 보존한다. 처음 구현에서 이 검사가 없어 이미지가 조용히 빠지는 것을 테스트로 확인하고 고쳤다.
2. **장식 도형 SVG**(type02 오각형, type10 육각형)는 옮기지 않는다. 안의 글(번호·핵심 단어 등)은 옮긴다. type09 체크 도형은 항목 의미의 일부라 원본 경로를 브랜드 색으로 넣는다(`span.mig-icon`).
3. **호스트가 고정한 배치**: type09의 "한 줄 1~3개"와 type03의 "반전(이미지 오른쪽부터)"은 호스트 프리셋이 각각 PC 3열·왼쪽부터로 고정한다. 인라인으로 바꾸면 모바일 배치까지 바뀌므로 화면에는 반영하지 않고 **값은 데이터에 보존**하며 `PRESET_LAYOUT_FIXED`(info) 진단을 남긴다.
4. **목록 초기화**: 호스트 `style.css`는 `ul`의 글머리 기호·들여쓰기를 초기화하지 않는다(손으로 만든 샘플도 인라인으로 지움). 모든 프리셋 목록에 `list-style: none; padding-left: 0; margin: 0`을 인라인으로 붙인다. 이것이 없으면 type10 하위 목록이 카드 밖으로 넘쳤다.
5. **type03 칸 비율**: 호스트 type-03은 이미지 칸을 줄이지 않고(`.mig-visual:has(img) { flex-shrink: 0 }`) 비율도 없어서, 큰 이미지가 칸을 다 차지하고 글이 화면 밖으로 밀렸다(PC 1145px 넘침). 원본 `col-lg-6`처럼 이미지·글 칸에 `flex: 1 1 50%; min-width: 0`을 인라인으로 준다(세로 배치인 모바일에는 영향 없음).
6. **type10 하위 항목**: 호스트 규칙이 `width: 100%` + 좌우 padding이라 content-box에서 넘친다. 하위 항목에 `box-sizing: border-box`를 인라인으로 준다.
7. **type-bg만 있는 경우**: 원본 `cms.css`(배경 매핑표)대로 `#f9f3ec` 배경을 쓴다.

## 3. 검증

- `packages/core/test/p2-types.test.ts`: 타입마다 원본 마크업 → 정확한 데이터, 손실 없음(경고·fallback 없음), 호스트 계약의 **자식 결합자 경로**대로 출력, 이미지 주소 보존, 스냅샷(`fixtures/types/typeNN/original.expected.{json,html}`). type09 열 수 3종·type03 반전 보존과 진단, 끼어든 이미지·문단 → fallback, 목록 초기화, 편집기 선택값(문자열) 처리.
- `tests/visual/preset-layout.test.ts`(P3 단계에서 이름 변경, P3 타입도 포함) (실제 Chromium, 호스트 CSS): 다섯 타입 × PC 1100 / MO 360 / 에디터 1100에서 가로 넘침 없음, type03 글 칸이 찌그러지지 않음, type10 하위 목록이 카드 안. 큰 이미지(1200×800)로 검사한다. type03 비율 수정을 빼면 실패함을 확인했다.
- 전체: `npm test` 206 passed · 1 skipped(inventory, `cms/` 필요), `npm run test:browser` 27 passed, lint·typecheck 오류 없음.

## 4. 계획서 DoD 대비

| DoD | 상태 |
|---|---|
| 1. 호스트 DOM 계약 | 있음 (`docs/host-dom-contract.md` 5장) |
| 2. 실제 contents 대표 섹션 2개 이상 + 기대 JSON·HTML | **부분**: 원본과 같은 구조의 fixture 1개 + 변형 입력(열 수·반전·끼어든 이미지/문단). 실제 `cms/contents` 표본은 원본이 있어야 추가 가능 |
| 3. parse → render 스냅샷 | 충족 |
| 4. PC/MO/에디터 시각 비교 B등급 이상 | **부분**: 넘침·찌그러짐 자동 검사와 화면 확인까지. 원본 화면과의 등급 비교는 원본 CSS·페이지가 있어야 가능 |
| 5. inventory 기준 fallback 비율 | 미실행 (`cms/` 필요) |
