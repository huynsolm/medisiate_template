# Codex 요청: 인라인 CMS 컴포넌트 생성기 제안서 작성

> 이 문서를 Codex에 그대로 전달하세요. 코드 구현이 아니라 **제안서(설계 문서) 작성**을 요청합니다.

---

## 1. 역할과 요청

당신은 프런트엔드 아키텍트입니다. 아래 배경과 자료를 읽고, **"병원 홈페이지 CMS 컴포넌트를 인라인 스타일 HTML로 생성하는 웹 도구"의 제안서**를 작성해 주세요.

- 산출물: `docs/proposal.md` (한국어, 마크다운)
- 이번 단계에서는 **코드를 구현하지 마세요.** 필요하면 짧은 코드 스케치(함수 시그니처, 데이터 예시)만 넣으세요.
- 추측한 내용은 추측이라고 표시하고, 확인이 필요한 사항은 마지막 "확인 질문" 섹션에 모아 주세요.

## 2. 배경

### 지금까지의 방식
- `cms/component/type00.html` ~ `type36.html`: 컴포넌트 타입별 HTML 틀 (`<section class="cms typeXX">` 구조)
- `cms/css/cms.css` (약 4,600줄), `cms-blue.css`, `cms-nanum.css`: 위 타입들의 디자인 CSS
- `cms/contents/**`: 실제 병원 페이지들. 타입 HTML을 복사해 **텍스트와 이미지만 바꿔서** 만들었음
- 즉, "클래스 + 외부 CSS"에 의존하는 구조

### 앞으로의 방식
- 병원 사이트의 **웹 에디터에 HTML을 그대로 붙여 넣어** 사용함
- 에디터에는 `<style>` 블록이나 외부 CSS를 넣을 수 없음 → 스타일은 **인라인**이어야 함
- 수작업으로 만든 목표 출력 예시: `reference/sample-inline-acne.html` (여드름 페이지, 섹션 6개)

### 만들고 싶은 도구
- 참고 사이트: https://biny-gilt.vercel.app/cms-preview
  - 타입 선택 → 폼 입력(제목, 설명, PC/모바일 이미지, 반복 항목) → HTML 소스 생성 → 복사
  - PC(1100px) / 모바일(360px) 미리보기
- 이 도구처럼 동작하되, 출력은 **`reference/sample-inline-acne.html`과 같은 인라인 HTML**이어야 함

## 3. 반드시 먼저 읽을 자료

1. `reference/sample-inline-acne.html`: 목표 출력 형태 (가장 중요)
2. `reference/host-style.css`: **호스트 사이트 기본 CSS** (원본: https://www.onnuriskin.co.kr/assets/css/style.css, 2026-11-13 저장본, 약 20,500줄). 에디터에 붙여 넣은 HTML은 이 CSS 위에서 렌더링됨
3. `cms/component/type00.html` ~ `type36.html`: 원본 타입 구조
4. `cms/css/cms.css`: 타입별 디자인 규칙
5. `cms/contents/` 아래 페이지 몇 개 (예: `cms/contents/01/*.html`): 실제 사용 예
6. 참고 사이트 cms-preview: 입력 UI와 흐름

## 3-1. 호스트 기본 CSS 분석 결과 (사전 조사)

`reference/host-style.css`에는 이미 **`mig-*` 디자인 시스템**이 들어 있습니다. 제안서는 "모든 스타일을 인라인으로 넣기"가 아니라 **"호스트 CSS를 최대한 활용하고, 부족한 것만 인라인으로 덮어쓰기"**를 기본 전략으로 검토해 주세요.

- **두 가지 모드가 있음**
  - `.migration-content` 안에 `.mig-container`가 **있으면**: 프리셋 모드. `.mig-container .mig-section.type-00` ~ `type-30`, `type-banner` 규칙이 적용됨 (예: 3291행 부근 `type-01`, 3734행 부근 `type-10`)
  - `.mig-container`가 **없으면** (`.migration-content:not(:has(.mig-container))`): 일반 모드. 샘플 파일은 이 모드이며 `type-text`와 인라인 스타일로 디자인함
  - → 호스트의 `type-00~30`이 기존 `cms/component/typeXX`와 어떻게 대응하는지 확인하고, 타입별로 **프리셋 모드를 쓸지 일반 모드와 인라인을 쓸지** 정해 주세요
- **테마 변수** (2426행 부근): `--mig-primary-color`를 기준으로 `--mig-light-bg`, `--mig-border-color`, `--mig-table-head-bg` 등이 `color-mix()`로 계산됨. `.theme-blue / .theme-gold / .theme-green` 프리셋 클래스가 있음. 간격 변수 `--mig-content-gap-xs~lg`, `--mig-content-padding-x`도 있음
- **반응형 기준**: 모바일 우선이고 분기점은 **1024px** (`@media screen and (min-width: 1024px)` 648회). 기본 글자 크기는 14px이고 1024px 이상에서 16px
  - 샘플의 clamp 공식은 375~992px 기준이라 호스트 분기점(1024px)과 다름 → 어느 기준으로 맞출지 제안할 것
- **PC/MO 전환** (357~376행): `.common-display-mo`는 기본으로 보이고, `.common-display-pc`는 1024px 이상에서만 보임. 단, **`html.design-edit-page`(에디터 화면)에서는 항상 모바일 쪽만 보임** → 에디터 화면 미리보기와 실제 화면이 다르다는 점을 UI와 테스트에 반영
- **줄바꿈 제어**: `.br-migration`은 `.is-visible`이 없으면 숨김 (2469행)
- **사용 가능한 클래스 (일부)**: `mig-container`, `mig-section`, `mig-inner`, `mig-header`, `mig-title-wrap`, `mig-eyebrow`, `mig-title`, `mig-desc`, `mig-body`, `mig-content`, `mig-visual`(`type-wide`, `type-hexagon`, `type-pentagon`, `img-contain`), `mig-media`(`media-left/right/center`), `mig-media-box`, `mig-text-box`, `mig-list`(`type-bullet/card/dot/grid/ordered/timeline`), `mig-item`, `mig-gallery-grid`, `mig-gallery-item`, `mig-table`(`is-scroll/is-sentence/is-mix-align`), `mig-faq-*`, `mig-highlight-box`, `mig-callout`, `mig-notice`, `mig-badge`, `mig-num`, `mig-caption`, `mig-legend-*`, `mig-illust-*`, `mig-thumb-*`, `mig-featured-*`
  - → 클래스별로 호스트 CSS가 무엇을 해 주는지 표로 정리하고, 인라인으로 반드시 넣어야 하는 것과 넣지 말아야 하는 것(호스트와 충돌하는 것)을 구분해 주세요
- **주의**: 호스트 CSS는 외부 사이트 파일이라 바뀔 수 있음. 도구에 버전을 고정해 두는 방법과 변경을 감지하는 방법도 제안할 것

## 4. 샘플에서 확인된 규칙 (제안서에 반영)

| 패턴 | 의미 |
|---|---|
| `font-size: clamp(15px, calc(15px + (100vw - 375px) * 7 / 617), 22px)` | 미디어쿼리 대신 375~992px 사이에서 글자 크기가 조절됨. `fluid(min, max)` 같은 헬퍼로 일반화 |
| 맨 바깥 `style="--mig-primary-color: #c7b195"` + `var(--mig-primary-color)` | 병원별 테마 색을 한 곳에서 지정 |
| `common-display-pc` / `common-display-mo` | PC/모바일 이미지 전환. 호스트 사이트 CSS에 있다고 가정되는 클래스 |
| `mig-section`, `mig-inner`, `mig-title`, `mig-desc`, `mig-visual`, `mig-media`, `mig-gallery-grid`, `br-migration` | 호스트 쪽 기본 CSS에 의존하는 클래스로 추정. **어떤 클래스를 남기고 무엇을 인라인으로 넣을지 기준을 제안할 것** |
| 전체 폭 배경 (`width:100vw; position:relative; left:50%; transform:translateX(-50%)`) | 풀블리드 섹션 |
| 섹션 머리: 짧은 막대 + 작은 제목(eyebrow) + 큰 제목 | 반복되는 공통 조각 |
| `<svg><defs><clipPath id="hexClip">` + `clip-path:url('#hexClip')` | 육각형 도형. 페이지당 한 번만 정의 |
| 빈 `div` 안의 `&nbsp;` | 에디터가 빈 태그를 지우는 것을 막는 처리로 추정 |
| `/api/file/{uuid}` 이미지 주소, `width`/`height` 속성 | 이미지는 에디터에 먼저 올린 뒤 주소를 받아 씀 |

## 5. 사용 빈도 (우선순위 판단용)

`cms/contents`의 실제 사용 횟수:

```
type01 736 · type00 706 · type07 166 · type09 165 · type10 135 · type02 133
type03 129 · type11 118 · type26 116 · type04 115 · type25 111 · type15 87
type17 80  · type27 66  · type18 65  · type23 59  · type33 56  · type13 55
type06 51  · type28 48  · type16 43  · type14 43  · type19 37  · type30 33
type24 28  · type29 23  · type31 21  · type22 20  · type20 15  · type21 14
type12 12  · type34 11  · type32 5   · type08 4   · type05 4
```

## 6. 제안서에 포함할 내용

1. **목표와 범위**: 이번에 할 것과 하지 않을 것
2. **출력 HTML 규칙 (가장 중요)**
   - 남길 클래스와 인라인으로 넣을 스타일의 기준
   - 미디어쿼리 없이 반응형을 구현하는 방법 (clamp, flex-wrap, grid auto-fit, PC/MO 클래스 전환)
   - hover, `::before`/`::after` 등 인라인으로 옮길 수 없는 CSS의 대체 방법
   - 에디터가 지울 수 있는 요소(빈 태그, svg, `var()`, `clip-path:url()`, `aspect-ratio` 등)의 대응 방법과 검증 방법
3. **아키텍처**
   - 타입 정의 구조: `schema`(입력 필드) / `defaults`(샘플) / `render(data, theme) → HTML 문자열`
   - 공통 조각(헬퍼): `fluid()`, `sectionHeader()`, `visualPcMo()`, `fullBleed()`, `hexBox()` 등
   - 테마(병원별 색, 폰트) 처리
4. **도구 UI**
   - 타입 하나 생성(cms-preview 방식)과 **여러 섹션을 쌓는 페이지 빌더** (추가, 삭제, 순서 변경, 복제)
   - 반복 항목 편집, 이미지 주소와 크기 입력
   - 미리보기: iframe에 `reference/host-style.css`를 넣고 PC(1024px 이상) / MO / **에디터 화면(`html.design-edit-page`)** 세 가지 모드로 전환
   - 소스 복사, 작업 저장/불러오기(JSON, 로컬)
5. **기존 콘텐츠 일괄 변환기 (필수 범위)**: 아래 "6-1" 요구사항을 만족하는 설계
6. **타입 이전 전략**: 원본 타입 + cms.css → 인라인 render 함수로 옮기는 절차, 우선순위(위 사용 빈도 반영), 비슷한 타입 통합 여부
7. **기술 스택 제안**과 이유 (참고 사이트가 Vercel에 있음. 기존 사이트에 페이지로 추가하는 안과 별도 프로젝트로 만드는 안을 비교)
8. **품질 보증**: 타입별 출력 스냅샷 테스트, 샘플과의 시각 비교, 에디터 붙여넣기 테스트 체크리스트
9. **단계별 일정**: 1단계 프로토타입(샘플의 6개 섹션 패턴 재현) → 에디터 검증 → 타입 확장(사용 빈도순) → 703개 파일 일괄 변환과 리포트 → 실패 항목 보완
10. **위험 요소와 대응**
11. **확인 질문**: 진행 전에 사용자에게 받아야 할 정보 (예: 에디터 종류, 호스트 CSS를 쓰는 다른 병원 사이트가 있는지, 배포 위치)

## 6-1. 기존 콘텐츠 일괄 변환 요구사항 (필수)

`cms/contents/` 아래의 기존 페이지를 **모두 인라인 HTML로 변환해서 별도 파일로 만들어야 합니다.** 원본 파일은 수정하지 않습니다. 이 폴더는 SVN 작업본입니다.

### 대상 현황 (사전 조사, 2026-11-13 기준)
- HTML 파일 **703개**. 폴더별 분포:
  - 번호 폴더 `01`~`07`: 진료과별 공통 콘텐츠로 추정, 폴더당 8~10개
  - 병원 ID 폴더 `10413`, `10429`, `13168`~`13323`: 병원별 콘텐츠, 폴더당 1~43개
  - `공통CMS/`: 71개 (한글 파일명, 예: `고혈압.html`)
  - **제외 후보**: `include/`(header, footer), `option/`(list, slider), `새 폴더/`, `list.html`, `plainLayout.html`, `*.bak`. 포함 여부는 제안서에서 정리할 것
- 파일 구조: 맨 위에 `<!--#include virtual="/FlexX/cms/contents/include/header.html" -->`(SSI, 644개 파일) → `<div class="cms-container">`(일부는 `cms-singleness` 추가) → `<section class="cms typeXX ...">` 여러 개 → footer include
- 인코딩: UTF-8, CRLF 줄바꿈
- **섹션 변형 클래스**가 많음: `type-bg`, `bg-color-1~3`, `bg-image-1~2`, `text-white`, `d-none`, `doctor-list`, `sub0201` 등. 이 클래스들이 `cms.css`에서 무엇을 하는지 확인하고 변환 규칙에 넣을 것
- 특수 요소: `<script>`가 있는 파일 31개, 기존 `style=` 속성이 있는 파일 199개. 에디터에 넣을 수 없는 요소는 처리 방법을 정할 것
- 이미지 주소: 대부분 `https://fxfile.drline.net/...` 절대경로(약 7,700개). 그 밖에 `http://fxfile.drline.net`(78), `http://fx-hcs-05.sharebrain.co.kr`(43), 상대경로 `./images`(175), `../img`(24)가 섞여 있음
  - **결정 사항: 이미지 주소는 우선 원본 그대로 넣는다.** 경로를 바꾸거나 https로 고치거나 `/api/file/{uuid}`로 다시 업로드하지 않음
  - 다만 상대경로(`./images`, `../img`)와 `http://` 주소는 에디터에서 깨질 수 있으므로 **변환 리포트에 목록으로만 남길 것**. 나중에 주소를 바꿀 수 있도록 이미지 주소 처리를 한 곳(함수 하나)에 모아 두는 구조로 제안할 것

### 출력 요구사항
- **원본 폴더 구조를 그대로 유지한 별도 출력 폴더**에 1:1로 파일을 만들 것. 예: `cms/contents/01/botox.html` → `output/contents/01/botox.html`
- 출력 파일 내용은 **에디터에 바로 붙여 넣을 수 있는 조각**이어야 함: `<div class="migration-content">…</div>`만 담고, SSI include, `<html>`, `<head>`는 넣지 않음
- 파일마다 테마 색을 지정할 수 있어야 함 (병원 ID 폴더별 설정 파일 등 방법 제안)
- 한 번 실행으로 전체를 변환하는 **CLI 명령**이 있어야 하고, 폴더 하나나 파일 하나만 다시 변환할 수도 있어야 함
- **변환 리포트**(JSON 또는 CSV, 사람이 읽을 요약 포함)를 남길 것:
  - 파일별 성공/부분 성공/실패 상태
  - 지원하지 않는 타입이나 변형 클래스, 처리하지 못한 요소(script, 알 수 없는 마크업)
  - 이미지 경로 문제 목록
- 변환하지 못한 섹션은 조용히 빠뜨리지 말고, 원본 HTML을 주석과 함께 남기는 등 **눈에 보이게** 처리할 것
- 웹 도구의 `render()`와 **같은 코드**를 써서, 변환한 결과를 도구로 불러와 다시 편집할 수 있게 할 것 (파일별 데이터 JSON도 함께 저장하는 방안 검토)

### 검증 방법도 제안할 것
- 원본(`cms.css` 적용)과 변환본(`reference/host-style.css` 적용)을 PC와 MO 폭으로 스크린샷을 찍어 나란히 비교하는 방법
- 타입별 대표 파일 몇 개를 골라 사람이 확인하는 샘플링 기준

## 7. 1단계 완료 기준 (제안서에 명시)

- 도구로 만든 출력이 `reference/sample-inline-acne.html`과 **같은 구조와 같은 모양**으로 나온다
- 그 출력을 실제 에디터에 붙여 넣어도 깨지지 않는다
- 폴더 하나(예: `cms/contents/01`, 8개 파일)를 일괄 변환해서 `output/contents/01/`에 파일과 리포트가 생성된다
