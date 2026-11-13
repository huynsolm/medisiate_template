# 병원 홈페이지 CMS 컴포넌트 인라인 HTML 생성기 제안서

## 1. 문서 목적과 근거

이 문서는 기존 CMS 콘텐츠를 호스트 사이트의 웹 에디터에 붙여 넣을 수 있는 HTML 조각으로 생성·변환하는 도구의 설계를 제안한다. 이번 단계의 산출물은 설계뿐이며 구현 코드는 범위에 포함하지 않는다.

제안은 다음 자료를 직접 비교한 결과에 근거한다.

- 목표 출력: `reference/sample-inline-acne.html`
- 호스트 CSS: `reference/host-style.css` (2026-11-13 저장본, SHA-256 `00657D8091192C5C8BC7AF7C3F43F51FB3CA762694ABEDAC35C195B56FE3B16F`)
- 원본 타입: `cms/component/type00.html`~`type36.html`
- 원본 디자인: `cms/css/cms.css`
- 변환 대상: `cms/contents/**`

직접 집계한 현재 상태는 HTML 703개, `.bak` 10개, 기타 파일 2개이며, HTML 중 SSI include가 있는 파일 644개, `<script>`가 있는 파일 31개(태그 73개), 기존 `style` 속성이 있는 파일 199개(속성 603개)이다. 상대 이미지 참조는 199건, `http://` 이미지 참조는 151건으로 확인된다. 요청서의 경로별 세부 수량과 이 집계의 차이는 정규식 범위 차이일 수 있으므로, 구현 시 HTML 파서 기반으로 다시 산출해 기준선을 고정한다.

별도 표기가 없는 설계는 위 자료에서 확인한 사실을 바탕으로 한 제안이다. 자료만으로 확정할 수 없는 내용은 **추정**으로 표시한다.

## 2. 목표와 범위

### 2.1 목표

1. 사용자가 타입과 콘텐츠를 입력해 `reference/sample-inline-acne.html`과 같은 `<div class="migration-content">…</div>` 조각을 생성한다.
2. 호스트의 `mig-*` 디자인 시스템을 최대한 재사용하고, 원본 디자인 재현에 필요한 차이만 인라인 스타일로 보완한다.
3. 단일 타입 생성과 여러 섹션을 조립하는 페이지 빌더를 모두 제공한다.
4. `cms/contents`의 HTML 703개를 원본 폴더 구조 그대로 `output/contents/`에 1:1 변환하고, 결과와 진단 리포트를 남긴다.
5. 웹 도구와 CLI가 동일한 타입 정의·렌더러를 사용해 결과의 일관성과 재편집 가능성을 보장한다.
6. 실제 에디터와 공개 페이지의 PC/MO 차이를 재현하고 검증할 수 있게 한다.

### 2.2 이번 구축 범위

- 타입 정의 레지스트리, 공통 렌더 헬퍼, 테마 처리
- 단일 타입 편집기와 페이지 빌더
- PC, MO, `html.design-edit-page` 미리보기
- HTML 복사, 프로젝트 JSON 저장·불러오기
- 전체/폴더/파일 단위 CLI 변환
- HTML/JSON 결과와 JSON·CSV·Markdown 요약 리포트
- 스냅샷, 시각 회귀, 실제 에디터 붙여넣기 검증 체계

### 2.3 하지 않을 것

- `cms/` 아래 원본 파일의 수정·삭제
- 이미지 업로드, URL 교체, `http`→`https` 자동 보정
- 호스트 사이트 CSS 자체의 변경
- 에디터에서 실행할 임의 스크립트의 보존
- 원본의 모든 병원별 임시 클래스를 근거 없이 자동 해석
- 원본과 픽셀 단위로 무조건 동일하게 만드는 것. 의미·정보·레이아웃 위계를 보존하되 호스트 디자인 시스템을 우선한다.

## 3. 핵심 설계 결정

### 3.1 하이브리드 출력 전략

출력은 “모든 선언을 인라인화”하지 않는다. 호스트 CSS가 안정적으로 제공하는 구조·반응형·기본 타이포그래피는 `mig-*` 클래스로 맡기고, 다음 경우에만 인라인 스타일을 넣는다.

- 병원별 색상과 섹션별 배경색처럼 데이터에 따라 달라지는 값
- 샘플의 큰 제목 크기, 풀블리드, 특정 이미지 비율처럼 프리셋으로 재현되지 않는 값
- 원본 타입의 의미를 유지하는 데 필수이나 호스트 클래스에 없는 레이아웃
- 에디터 화면에서도 반드시 보여야 하는 값

호스트가 이미 담당하는 `display`, 기본 gap, 이미지의 `max-width/height:auto`, 표 기본색, 1024px PC 전환 등은 중복 인라인하지 않는다. 중복 선언은 호스트 CSS 변경을 무력화하고 유지보수 비용을 높이므로 금지 목록으로 관리한다.

### 3.2 타입별 모드 선택

- **프리셋 모드**: `<div class="mig-container">`를 두고 `.mig-section.type-XX`를 사용한다. 원본 타입과 호스트 프리셋의 구조적 대응이 높을 때 기본 선택이다.
- **일반 모드**: `.mig-container`를 두지 않고 `mig-section type-text`와 인라인 보정을 사용한다. 수작업 샘플과 같은 고유 디자인, 호스트 프리셋이 없는 `type31~36`, 복합 변형에 사용한다.
- 한 페이지의 최상위 모드는 일관되게 유지하는 것을 원칙으로 한다. 프리셋 섹션과 일반 섹션을 섞어야 하면, 일반 섹션을 별도 `migration-content` 블록으로 분리한다. `:has(.mig-container)`가 전체 블록의 모드를 바꾸기 때문이다.

### 3.3 반응형 기준

호스트의 실제 전환점인 **1024px**를 기준으로 한다. 샘플의 `fluid(375, 992)` 수식은 연속적인 크기 조절에만 사용하되 상한 도달 폭을 1024px로 맞춘 새 기본값을 쓴다.

```ts
fluid(minPx: number, maxPx: number, from = 375, to = 1024): string
// clamp(minPx, calc(minPx + (100vw - from) * (maxPx-minPx)/(to-from)), maxPx)
```

기존 샘플과 완전히 같은 외형을 요구하는 “샘플 호환 모드”에만 `to=992`를 허용한다. PC/MO 이미지 전환은 호스트의 `common-display-pc/mo`를 사용한다. 단, `html.design-edit-page`에서는 모바일 이미지만 표시되는 실제 동작을 미리보기와 QA에 명시적으로 반영한다.

## 4. 출력 HTML 규칙

### 4.1 최상위 계약

모든 출력 파일은 SSI, `<html>`, `<head>`, `<style>`, 실행 스크립트 없이 다음 조각만 포함한다.

```html
<div class="migration-content" style="--mig-primary-color: #b1926a;">
  <div class="mig-container">…</div>
</div>
```

일반 모드일 때는 `mig-container`를 생략하고 샘플처럼 `.inner` 아래 섹션을 둔다. 테마 프리셋은 `theme-blue/gold/green`을 사용할 수 있지만, 병원별 임의 색은 최상위의 `--mig-primary-color` 한 곳에만 기록한다. 파생색은 호스트의 `color-mix()` 변수에 맡긴다.

### 4.2 남길 클래스와 역할

| 클래스군 | 호스트 CSS에서 확인된 역할 | 출력 원칙 | 인라인 보완 |
|---|---|---|---|
| `migration-content` | 글꼴, 기본 14px/PC 16px, 테마·간격 변수 | 항상 유지 | 병원 기본색만 |
| `mig-container` | 프리셋 모드, 세로 스택과 타입별 규칙 활성화 | 대응 프리셋에서 유지 | 없음이 원칙 |
| `mig-section`, `mig-inner`, `mig-header`, `mig-body`, `mig-content` | 섹션 패딩, 헤더/본문 간격, 콘텐츠 스택 | 구조에 맞춰 유지 | 풀블리드·고유 배경만 |
| `mig-eyebrow`, `mig-title`, `mig-desc`, `mig-num` | 타이포 위계와 테마색 | 의미에 맞춰 유지 | 샘플 고유 크기·굵기만 |
| `mig-visual`, `type-wide`, `img-contain`, 크기 변형 | 반응형 이미지, object-fit, 폭 | 유지 | 고유 비율·테두리만 |
| `mig-list`, `mig-item`, `type-dot` 및 프리셋 목록 | 목록 배치와 마커 | 유지 | 프리셋에 없는 카드 배경 등 |
| `mig-highlight-box`, `mig-text-wrap` | 강조 상자와 텍스트 스택 | 유지 | 데이터 기반 배경만 |
| `table-responsive`, `mig-table-wrap`, `mig-table` | 표 스크롤·헤더·테두리·테마색 | 표에 사용 | 셀별 예외 정렬만 |
| `common-display-pc/mo` | 1024px 기준 이미지 전환 | PC/MO 쌍에 사용 | display 인라인 금지 |
| `br-migration` | 기본 숨김, `.is-visible`일 때 표시 | 의도적 줄바꿈만 | display 인라인 금지 |
| 갤러리·미디어·FAQ·callout·notice 등 `mig-*` | 호스트가 제공하는 조합 컴포넌트 | CSS에 실제 규칙이 있을 때 우선 사용 | 고유 데이터 값만 |

호스트 CSS에 정의되지 않은 이름을 그럴듯하게 새 `mig-*` 클래스로 만들지 않는다. 새 표현은 기존 원자 조합 또는 인라인 스타일로 구현한다.

### 4.3 인라인 스타일 허용·금지 기준

**허용**

- `--mig-primary-color`, 섹션별 `background-color/background-image`
- 풀블리드의 `width:100vw; position:relative; left:50%; transform:translateX(-50%)`
- 콘텐츠에 종속된 `max-width`, `aspect-ratio`, `object-position`
- 샘플 호환 타이포그래피의 `font-size:clamp(...)`
- SVG clip-path 적용, 명시적 flex 비율처럼 타입 고유의 필수 값

**금지 또는 최소화**

- 호스트가 정한 PC/MO `display`
- 기본 이미지 `max-width:100%; height:auto`
- 일반 제목·본문의 색·line-height·gap을 일괄 덮어쓰기
- `!important` 사용. 외부 오염으로 불가피한 경우 타입 정의에 이유와 검증 사례를 기록한다.
- `position`과 고정 높이를 이용한 장식성 배치. 접근성과 작은 화면을 우선해 흐름 기반 레이아웃으로 대체한다.

### 4.4 미디어쿼리 없는 반응형

출력 조각에는 `<style>`과 미디어쿼리를 넣지 않는다.

- 크기: `clamp()`와 `fluid()`
- 수평 묶음: `display:flex; flex-wrap:wrap`과 합리적인 `min-width`
- 카드/갤러리: `grid-template-columns:repeat(auto-fit,minmax(min(100%, Npx),1fr))`
- PC/MO 이미지: `common-display-pc/mo`
- 실제 행·열 전환: 가능하면 호스트 프리셋 클래스가 가진 1024px 규칙을 사용
- 줄바꿈: 항상 필요한 줄은 `<br class="br-migration is-visible">`; PC 전용 줄은 `.br-migration`을 사용하되 에디터/모바일 결과를 별도 확인

CSS만으로 컨테이너 폭에 따른 정확한 분기를 만들 수 없는 경우 억지로 인라인 처리하지 않고 해당 타입의 호스트 프리셋을 사용한다.

### 4.5 인라인으로 옮길 수 없는 효과

| 원본 효과 | 대체 원칙 |
|---|---|
| `:hover`, `:focus` | 핵심 정보는 기본 상태에 노출. 링크는 텍스트·밑줄·명시적 버튼 형태로 정적 표현 |
| `::before/::after` 장식 | 의미 있는 마커는 실제 `<span aria-hidden="true">`로 렌더. 단순 장식은 생략 가능 |
| CSS counter | 렌더 시 번호 텍스트를 실제 DOM에 생성 |
| 배경 전환 애니메이션 | 정적 대표 상태 사용 |
| Bootstrap/기존 유틸리티에만 의존한 배치 | `mig-*` 구조로 재구성하고 필요한 최소 인라인만 사용 |
| Swiper 등 JS UI | 정적 갤러리로 펼침. 원본 순서·캡션은 유지 |

### 4.6 에디터 정제(sanitization) 대응

샘플의 빈 막대처럼 비어 있는 장식 요소에는 `&nbsp;` 또는 실제 장식 `<span>`을 넣는다. 다음 기능은 브라우저 미리보기 통과만으로 지원 판정하지 않고 “에디터에 붙여 넣기 → 저장 → 다시 열기 → 공개 페이지 확인”의 왕복 테스트로 판정한다.

- `style`의 CSS 변수와 `var()`
- `color-mix()` 결과(호스트 CSS 의존)
- inline SVG, `<defs>`, `<clipPath>`, `clip-path:url(#id)`
- `aspect-ratio`, `clamp()`, CSS grid
- `data-*`, `loading`, `decoding`, `width`, `height`
- 빈 태그와 `&nbsp;`

SVG ID는 페이지 전체에서 충돌하지 않도록 `hexClip-{pageId}`처럼 생성한다. 에디터가 SVG 또는 `clip-path:url()`을 제거하면 육각형은 `border-radius` 이미지 또는 사전 제작 이미지로 단계적으로 폴백한다. `aspect-ratio`가 제거되면 이미지의 `width/height` 속성으로 레이아웃 이동을 줄인다. 에디터가 `var()`를 지우면 테마 값을 렌더 시 각 인라인 선언에 구체값으로 펼치는 “호환 출력”을 제공한다. 이 폴백의 사용 여부는 확인 질문의 에디터 검증 후 확정한다.

### 4.7 이미지 규칙

- `src`는 원본 문자열 그대로 보존한다.
- `http://`, `./images`, `../img` 등도 자동 변경하지 않는다.
- 모든 이미지 URL 처리는 `resolveImageSrc(original, context)` 한 곳을 통과시키되 현재 구현은 identity 함수로 둔다.
- URL 분류와 원본 파일·섹션 위치는 리포트에 남긴다.
- 원본에 크기가 있으면 보존하고, 없으면 파서가 임의 추정하지 않는다. 사용자가 웹 도구에서 크기를 입력할 수 있게 한다.
- 의미 있는 이미지에는 alt 입력을 필수로 하고, 장식 이미지는 `alt=""`를 명시한다.

## 5. 원본 타입과 호스트 프리셋 대응

호스트 CSS의 프리셋 번호와 기존 `cms typeXX`를 실제 선택자·구조로 비교하면, 00~25와 27~30은 같은 번호의 레이아웃 의도를 계승한다. `type-26` 전용 선택자는 없지만 공통 `mig-table` 규칙이 있다. `type31~36`에는 번호별 호스트 프리셋이 없다.

아래의 “직접”은 같은 번호 프리셋을 사용한다는 뜻이지 원본 DOM을 그대로 복사한다는 뜻은 아니다. 원본 Bootstrap 계열 클래스와 `cms-*` DOM은 대응하는 `mig-*` 스키마로 정규화한다.

| 기존 타입 | 원본의 주된 형태 | 호스트 대응 | 권장 모드·처리 |
|---|---|---|---|
| `type00` | 페이지 제목 | `type-00` | 직접, 프리셋 |
| `type01` | PC/MO 와이드 이미지+큰 설명 | `type-01` | 직접, 프리셋; 강조 텍스트는 `mig-highlight-box/text-wrap` |
| `type02` | 오각형/아이콘 카드·여러 변형 | `type-02` | 직접, 프리셋; 변형별 스키마 분기 |
| `type03` | 이미지·텍스트 지그재그 | `type-03` | 직접, 프리셋 |
| `type04` | 이미지·텍스트 교차/화살표 | `type-04` | 직접, 프리셋; 화살표는 실제 요소 또는 생략 |
| `type05` | 배경 섹션+와이드 이미지 | `type-05` | 직접, 프리셋 |
| `type06` | 배경 이미지+아이콘 카드 | `type-06` | 직접, 프리셋 |
| `type07` | 이미지+불릿 목록 | `type-07` | 직접, 프리셋 |
| `type08` | 이미지+2열 불릿 | `type-08` | 직접, 프리셋 |
| `type09` | 체크/색상 카드 목록 | `type-09` | 직접, 프리셋 |
| `type10` | 와이드 이미지+육각 단계 | `type-10` | 직접, 프리셋; SVG 장식은 에디터 검증 |
| `type11` | 배경 이미지+목록 | `type-11` | 직접, 프리셋 |
| `type12` | 배경 이미지+아이콘 카드 | `type-12` | 직접, 프리셋 |
| `type13` | 강조형 행 목록 | `type-13` | 직접, 프리셋 |
| `type14` | 일반 행 목록 | `type-14` | 직접, 프리셋 |
| `type15` | 이미지 카드/Swiper 갤러리 | `type-15` | 프리셋; Swiper는 정적 갤러리로 변환 |
| `type16` | PC 와이드 이미지, MO 아이콘 목록 | `type-16` | 직접, 프리셋; 편집 화면은 MO 기준 검증 |
| `type17` | 제목 셀+설명 행 목록 | `type-17` | 직접, 프리셋 |
| `type18` | 이미지 카드 갤러리 | `type-18` | 직접, 프리셋 |
| `type19` | 육각형 단계 목록 | `type-19` | 직접, 프리셋 |
| `type20` | 인물/이미지+강조 박스·목록 | `type-20` | 직접, 프리셋 |
| `type21` | 좌측 헤더, 이미지+목록 | `type-21` | 직접, 프리셋 |
| `type22` | 이미지 카드+하단 텍스트 | `type-22` | 직접, 프리셋 |
| `type23` | 와이드 이미지+중앙 설명 | `type-23` | 직접, 프리셋 |
| `type24` | 배경 섹션+이미지+순서 목록 | `type-24` | 직접, 프리셋 |
| `type25` | 이미지 카드 그리드·다수 변형 | `type-25` | 직접, 프리셋; 변형별 스키마 분기 |
| `type26` | 반응형 표 | 전용 번호 없음, 공통 `mig-table` 존재 | 프리셋 컨테이너+공통 표 조합 |
| `type27` | 원형 단계/연산 흐름·복합 변형 | `type-27` | 직접, 프리셋; 장식 연산자는 실제 요소 |
| `type28` | 강조 문구+이미지+설명 | `type-28` | 직접, 프리셋 |
| `type29` | 배경 박스+이미지+버튼 | `type-29` | 직접, 프리셋; hover 없이 정적 버튼 |
| `type30` | 이미지+선/색상 카드 복합 목록 | `type-30` | 직접, 프리셋; 변형별 스키마 분기 |
| `type31` | 정의 목록/박스 목록 | 없음 | 일반 모드; `mig-list`, 실제 번호/마커 조합 |
| `type32` | 중앙 문구+원형 단계 | 없음 | 일반 모드; 정적 단계 조합 |
| `type33` | 프로세스·표형 목록·Q&A | 없음 | 일반 모드; `mig-faq-*` 또는 표/카드 조합 |
| `type34` | 원형 이미지+텍스트·복합 목록 | 없음 | 일반 모드; 미디어/카드 조합 |
| `type35` | 세로 프로세스 정의 목록 | 없음 | 일반 모드; 실제 연결선 요소 사용 |
| `type36` | 원형 이미지 카드 | 없음 | 일반 모드; auto-fit 카드 그리드 |

`type31~36`을 억지로 가장 비슷한 번호 프리셋에 넣지 않는다. 호스트 CSS 변경 시 의미가 뒤틀릴 가능성이 크기 때문이다. 다만 향후 호스트에 정식 프리셋이 추가되면 타입 레지스트리의 전략만 바꿀 수 있게 한다.

## 6. 변형 클래스 처리

703개 파일에서 섹션 변형은 `type-bg` 912회, `text-white` 183회, `bg-color-3` 162회, `bg-image-2` 124회, `bg-color-2` 74회, `bg-image-1` 60회로 특히 많다. `sub0201`, `doctor-list`, `sub0401` 같은 페이지 전용 클래스도 존재한다.

변형은 다음 세 계층으로 판정한다.

1. **공식 공통 변형**: `type-bg`, `bg-color-1~3`, `bg-image-1~2`, `text-white`, 여백 유틸리티. `cms.css` 선언을 명시적 데이터 속성 또는 인라인 값으로 매핑한다.
2. **타입 내부 변형**: `box-list`, `circle-icon-list`, `color-box`, `list-type` 등. 타입별 schema의 `variant`로 승격한다.
3. **페이지 전용·미확인 변형**: `sub0201`, `doctor-list`, `sect01`, 병원별 클래스 등. CSS 선언과 실제 DOM을 분석해 등록된 규칙만 변환한다. 미등록 클래스는 부분 성공으로 표시하고 원본 섹션을 눈에 보이는 fallback에 남긴다.

`d-none` 같은 가시성 클래스는 정보 유실 가능성이 있으므로 무조건 제거하지 않는다. 원본 CSS의 화면 조건과 목적을 판정해 PC/MO 전환으로 치환하거나, 변환 제외 사유를 리포트한다.

## 7. 아키텍처

### 7.1 패키지 경계

```text
packages/core       타입 schema, parser용 중간 모델, render, 공통 helper, theme
apps/web            타입 편집기, 페이지 빌더, iframe 미리보기
apps/cli            일괄 변환, 리포트, 검증 명령
fixtures            타입별 대표 입력과 기대 HTML
config/themes       병원 ID별 테마 설정
```

웹과 CLI는 `packages/core`만 호출한다. 렌더링 로직을 UI 컴포넌트 안에 중복 작성하지 않는다.

### 7.2 타입 정의

```ts
interface TypeDefinition<T> {
  id: string;
  label: string;
  strategy: 'preset' | 'general';
  schema: Schema;
  defaults: T;
  parse(sectionHtml: string, context: ParseContext): ParseResult<T>;
  render(data: T, theme: Theme, context: RenderContext): string;
}
```

- `schema`: 필드 타입, 필수 여부, 반복 최소/최대, alt·크기 검증
- `defaults`: UI 미리보기와 신규 생성 예시
- `parse`: 원본 DOM을 정규화 데이터로 변환
- `render`: 웹과 CLI가 공유하는 순수 함수
- `strategy`: 프리셋/일반 모드 선택
- `variant`: 타입별 구조 변형을 명시적으로 표현

사용자 입력 문자열은 HTML 문맥에 맞춰 escape하고, “서식 있는 설명”은 허용 태그 allowlist를 거친다. 원본 임의 HTML을 템플릿 문자열에 그대로 삽입하지 않는다.

### 7.3 공통 헬퍼

```ts
fluid(min, max, from?, to?)
sectionHeader({ eyebrow, title, description, align, accentBar })
visualPcMo({ pc, mo, alt, width, height, fit })
fullBleed(content, { background, padding })
hexBox(item, { clipId })
renderImage(image, context)
renderFallback(originalHtml, diagnostics)
```

`hexBox()`는 페이지당 `<defs>` 한 번만 만들고 고유 ID를 배정한다. `renderFallback()`은 지원하지 못한 원본을 조용히 누락하지 않는다.

### 7.4 중간 데이터 모델과 재편집

파일 단위 모델은 테마, 원본 상대경로, 섹션 배열, 진단을 포함한다.

```json
{
  "version": 1,
  "source": "01/botox.html",
  "theme": { "primary": "#b1926a" },
  "sections": [
    { "id": "s1", "type": "type01", "variant": "default", "data": {} }
  ],
  "diagnostics": []
}
```

`output/data/01/botox.json`처럼 HTML과 평행한 JSON을 저장한다. 웹 도구는 이 JSON을 불러와 수정하고 같은 `render()`로 HTML을 다시 만든다. JSON은 생성물이며 원본 CMS를 대체하지 않는다.

### 7.5 테마

병원 폴더별 설정을 `config/themes/{hospitalId}.json`에 둔다. 우선순위는 파일별 override → 병원 ID 설정 → 공통 기본값이다. 색상은 최상위 CSS 변수에만 출력한다. 폰트는 호스트의 `Noto Sans KR`을 기본으로 하며, 호스트에 실제 로드되지 않은 병원 전용 폰트를 도구가 임의로 참조하지 않는다.

## 8. 웹 도구 UI

### 8.1 편집 흐름

1. 신규 페이지 또는 기존 JSON 불러오기
2. 병원/테마 선택
3. 타입 검색·추가
4. schema 기반 폼 편집
5. 섹션 추가·삭제·복제·드래그 순서 변경
6. 반복 항목 추가·삭제·순서 변경
7. 이미지 PC/MO URL, alt, 원본 크기 입력
8. 세 모드 미리보기와 진단 확인
9. HTML 복사, HTML/JSON 다운로드

단일 타입 생성 화면은 빠른 작업용으로 유지하되 내부적으로는 섹션 1개짜리 페이지 빌더 모델을 사용한다.

### 8.2 미리보기

iframe에 고정 버전의 `reference/host-style.css`와 생성 HTML을 넣고 다음 세 모드를 제공한다.

- **PC**: viewport 1100px 이상, 일반 `<html>`
- **MO**: viewport 360px
- **에디터**: `html.design-edit-page`, 1024px 이상에서도 모바일 분기 유지

CSS를 앱 번들에 복제하지 않고 검증된 snapshot 자산으로 관리한다. 현재 파일의 해시를 메타데이터에 기록한다. 미리보기 상단에는 “기준 CSS 날짜/해시”를 표시해 실제 사이트와의 불일치를 추적한다.

## 9. 기존 콘텐츠 일괄 변환기

### 9.1 대상과 제외 정책

기본 대상은 `cms/contents/**/*.html` 703개 전부다. 사용자가 “전체 일괄 변환”을 결정했으므로 `include/`, `option/`, `새 폴더/`, 루트 `list.html`, `plainLayout.html`도 임의 제외하지 않는다. 다만 이들은 일반 콘텐츠가 아닐 가능성이 높으므로 **추정: 대부분 부분 성공 또는 실패**로 분류될 수 있다.

- `.bak`, `.lnk`, `.code-workspace` 등 비-HTML은 변환하지 않고 “대상 외” 목록에 기록
- HTML 703개는 모두 결과 경로를 갖는다.
- include/option처럼 붙여넣기 조각으로 의미가 없는 파일도 결과를 누락하지 않고 진단용 fallback HTML과 리포트를 생성한다.
- 원본은 읽기만 하며 수정 시각·인코딩·내용을 변경하지 않는다.

### 9.2 파이프라인

1. 파일 탐색 및 상대경로 확정
2. UTF-8 파싱, SSI header/footer 제거
3. `.cms-container`와 섹션 추출
4. `typeXX`, 변형 클래스, inline style, script, 이미지 URL 진단
5. 타입별 `parse()`로 중간 모델 생성
6. 동일한 `render()`로 HTML 조각 생성
7. HTML·편집용 JSON·파일별 진단 저장
8. 전체 JSON/CSV 및 사람이 읽는 Markdown 요약 생성

HTML은 정규식이 아닌 HTML5 파서를 사용한다. 깨진 마크업도 브라우저와 유사하게 복구하되 복구 발생 사실과 위치를 진단에 기록한다.

### 9.3 CLI 인터페이스 예시

```text
cms-migrate convert --all
cms-migrate convert --dir cms/contents/01
cms-migrate convert --file cms/contents/01/botox.html
cms-migrate report
cms-migrate verify --sample type01,type07,type26
```

기본 출력은 `output/contents/{원본 상대경로}`이며 JSON은 `output/data/`, 리포트는 `output/reports/`에 둔다. 재실행은 결정적이어야 하며 같은 입력·설정·호스트 CSS 버전에서 byte-stable 출력을 목표로 한다.

### 9.4 script와 기존 inline style

- `<script>`는 실행 가능한 출력에 포함하지 않는다.
- 슬라이더/탭/아코디언은 정적 펼침 구조로 변환하고 상태를 “부분 성공”으로 기록한다.
- 데이터 처리 등 의미를 자동 보존할 수 없는 스크립트는 원문을 실행되지 않는 escaped `<details>` 진단 블록 또는 HTML 주석에 남긴다.
- 기존 `style`은 속성별 allowlist로 분석한다. 색·정렬·폭 등 의미 있는 값만 새 구조에 이관하고, `position`·고정 높이·외부 CSS에 결합된 값은 진단한다.

### 9.5 실패 가시화

변환하지 못한 섹션은 삭제하지 않는다. 결과 HTML에 다음과 같은 눈에 보이는 진단 블록을 넣고, 원본은 escaped 형태 또는 주석으로 보존한다.

```html
<!-- MIGRATION-PARTIAL: unsupported type/variant; source section 4 -->
<section class="mig-section" data-migration-status="unsupported" style="border:2px solid #c00;padding:16px;">
  <strong>자동 변환이 필요한 섹션입니다.</strong>
  …안전하게 표시할 수 있는 원본 텍스트…
</section>
```

상태 기준은 다음과 같다.

- `success`: 모든 의미 콘텐츠와 지원 스타일이 변환됨
- `partial`: 콘텐츠는 보존했지만 스크립트·변형·장식 일부가 폴백됨
- `failed`: 유효한 붙여넣기 조각을 만들 수 없어 진단 블록만 생성됨

### 9.6 리포트

기계 처리용 `report.json`, 스프레드시트용 `report.csv`, 사람이 읽는 `summary.md`를 함께 만든다.

- 원본/출력 상대경로, 상태, 타입 목록
- 지원하지 않는 타입·변형·클래스
- 제거/정적화된 script와 이벤트 속성
- 파싱 복구, 알 수 없는 마크업, 보존하지 못한 style
- 이미지 URL 원문, 분류(`https`, `http`, `relative`, 기타), 파일·섹션 위치
- 테마 출처와 렌더러/호스트 CSS 버전
- fallback 수와 수동 조치 제안

이미지 주소 문제는 목록으로만 남기며 자동 수정하지 않는다.

## 10. 타입 이전 순서와 통합 원칙

### 10.1 우선순위

빈도와 위험을 함께 고려한다.

1. 기반·최다 사용: `type01`, `type00`, `type07`, `type09`, `type10`, `type02`, `type03`
2. 고빈도 구조: `type11`, `type26`, `type04`, `type25`, `type15`, `type17`, `type27`
3. 중빈도: `type18`, `type23`, `type33`, `type13`, `type06`, `type28`, `type16`, `type14`, `type19`, `type30`
4. 저빈도: `type24`, `type29`, `type31`, `type22`, `type20`, `type21`, `type12`, `type34`, `type32`, `type08`, `type05`
5. 요청서 빈도표에 없는 `type35`, `type36`도 실제 원본 타입으로 존재하므로 마지막 호환 단계에 포함한다.

`type26`은 표라는 고위험 콘텐츠라 빈도 순서보다 앞당긴다. `type33`은 Q&A 등 복합 변형이 있어 대표 샘플을 먼저 확보한다.

### 10.2 이전 절차

각 타입마다 원본 템플릿, `cms.css`의 PC/991px/479px 규칙, 실제 사용 파일과 변형을 비교한다. 그 후 의미 모델 → 호스트 프리셋 매핑 → 최소 인라인 → parser → fixture → 시각 검증 순으로 완료한다.

### 10.3 통합 여부

타입별 외부 ID는 보존하되 내부 렌더 패턴은 공유한다. 예를 들어 이미지+텍스트, 카드 그리드, 단계 목록, 표는 같은 helper를 쓸 수 있다. 기존 타입 번호를 합쳐 없애면 일괄 변환 추적성과 사용 빈도 기반 QA가 어려워지므로 하지 않는다.

## 11. 기술 스택 제안

### 11.1 권장안: 독립 TypeScript 프로젝트

- React + TypeScript + Vite(또는 Next.js 정적 배포)
- schema/검증: Zod 계열
- 폼: schema 기반 폼 라이브러리
- HTML 파싱: parse5/Cheerio 계열의 HTML5 파서
- 테스트: Vitest + Playwright
- 배포: Vercel 또는 사내 정적 호스팅

핵심은 프레임워크보다 `core`를 UI와 분리하는 것이다. CLI가 Node에서 같은 코드를 실행해야 하므로 타입 정의와 렌더러는 브라우저 전용 API에 의존하지 않는다.

### 11.2 기존 사이트에 추가하는 안

장점은 인증·배포·운영 체계를 재사용할 수 있다는 점이다. 단점은 기존 빌드 체계와 호스트 CSS 업데이트에 강하게 결합되고, CLI 공유 패키지 구성이 어려울 수 있다는 점이다.

### 11.3 별도 프로젝트 안

장점은 독립 배포, 고정 CSS 미리보기, CLI와 core 공유, 안전한 실험이 쉽다는 점이다. 단점은 별도 접근 제어와 운영 주체가 필요하다는 점이다.

**권장**: 별도 프로젝트로 시작하고, 인증·메뉴만 기존 관리자에서 연결한다. 1단계 검증 후 조직의 배포 제약에 따라 모듈을 기존 사이트에 통합한다. 기존 사이트의 기술 스택은 자료에 없으므로 이 통합 난이도는 **추정**이다.

## 12. 품질 보증

### 12.1 자동 테스트

- 타입별 `render()` HTML 스냅샷
- escape, 누락 필수값, 반복 0/1/N개, 매우 긴 텍스트 테스트
- parser→model→render 계약 테스트
- 원본 상대경로와 출력 상대경로 1:1 검증
- 입력 703개에 대해 결과 703개 존재 검증
- URL 불변성 테스트: 모든 이미지 `src`가 원본과 동일한지 확인
- unsupported 섹션 무손실/fallback 검증
- 호스트 CSS 해시 변경 감지

### 12.2 시각 회귀

Playwright로 원본에는 `cms.css`, 변환본에는 고정 `host-style.css`를 적용한다. PC 1100px, MO 360px, 에디터 모드에서 전체 페이지 스크린샷을 생성해 좌우 비교와 픽셀 diff를 저장한다. 폰트·이미지 로딩 완료 후 촬영하고 네트워크 실패도 리포트한다.

시각 차이는 다음 등급으로 판정한다.

- A: 정보·계층·레이아웃 동일, 호스트 디자인 차이만 존재
- B: 장식/간격 차이, 사용 가능
- C: 줄바꿈·배치·이미지 문제로 수동 확인 필요
- D: 정보 누락 또는 사용 불가

### 12.3 샘플링

- 모든 타입별 최소 1개
- 사용량 상위 10개 타입은 기본/배경/목록 수가 큰 사례 각 1개 이상
- `script` 포함 31개는 전수 확인
- `style` 포함 파일은 각 고유 패턴별 대표 확인
- `type31~36`, 표, SVG, full bleed, PC/MO 쌍은 전수 또는 강화 표본
- 병원 ID별 최소 1개, 공통CMS 최소 10개
- 상대/http 이미지 참조 파일은 경로 유형별 대표와 링크 실패 전수 리포트

### 12.4 실제 에디터 체크리스트

1. 붙여넣기 직후 DOM과 저장 후 DOM 비교
2. 재편집 후 SVG, style, CSS 변수, data 속성 보존 여부
3. `design-edit-page`에서 MO 이미지와 조작성 확인
4. 공개 PC/MO에서 올바른 이미지 전환 확인
5. 긴 제목·목록·표 가로 스크롤 확인
6. 링크, alt, 키보드 이동, 텍스트 대비 확인
7. 다른 페이지 CSS와 충돌 여부 확인

## 13. 호스트 CSS 버전 관리와 변경 감지

- 검증된 CSS를 날짜·SHA-256·원본 URL과 함께 manifest에 고정한다.
- 도구 빌드와 변환 리포트에 CSS 버전을 기록한다.
- 정기 또는 배포 전 원격 CSS를 내려받아 해시와 관련 선택자(`migration-content`, `mig-*`, 1024px, `design-edit-page`)의 구조 diff를 생성한다.
- 변경 감지 시 자동으로 기준을 교체하지 않고 시각 회귀를 통과한 뒤 승인한다.
- 실제 사이트 CSS와 미리보기 snapshot이 다르면 UI에 경고한다.

원격 CSS 접근·배포 자동화 방식은 운영 환경이 정해진 후 확정한다.

## 14. 단계별 일정과 완료 기준

실제 인력·배포 절차가 확정되지 않았으므로 아래는 **추정 일정(프런트엔드 1명+검수 담당 1명 기준)**이다.

| 단계 | 예상 | 산출물·게이트 |
|---|---:|---|
| 0. 기준선 고정 | 2~3일 | 703개 inventory, CSS 해시, 변형/스크립트/이미지 리포트 |
| 1. 프로토타입 | 5~7일 | 샘플 여드름 6개 섹션 재현, 단일 편집+3모드 미리보기 |
| 2. 실제 에디터 검증 | 2~4일 | sanitizer 왕복 결과, SVG/var/clip-path 폴백 확정 |
| 3. 상위 타입 확장 | 2~3주 | 빈도 상위 타입과 type26, parser/render/test |
| 4. 나머지 타입·변형 | 2~4주 | type00~36 및 등록 변형, fallback 체계 |
| 5. 일괄 변환 | 3~5일 | 703개 HTML+JSON+리포트 |
| 6. 시각 QA·보완 | 1~3주 | 대표 샘플 diff, 실패/부분 성공 보완, 인수 리포트 |

### 14.1 1단계 완료 기준

- 도구 출력이 `reference/sample-inline-acne.html`과 같은 구조·모양을 재현한다.
- 실제 에디터에 붙여 넣고 저장·재편집·공개해도 허용된 차이 외에는 깨지지 않는다.
- `cms/contents/01`의 HTML 8개를 `output/contents/01/`에 1:1 생성한다.
- 해당 8개의 편집용 JSON과 성공/부분 성공/실패, 이미지 경로 문제를 담은 리포트를 생성한다.
- 원본 `cms/`에는 변경이 없다.

## 15. 위험 요소와 대응

| 위험 | 영향 | 대응 |
|---|---|---|
| 호스트 CSS 변경 | 기존 출력 외형 변화 | 해시 고정, diff, 회귀 테스트, 승인 기반 갱신 |
| 에디터 sanitizer | SVG/style/var 제거 | 실제 왕복 테스트, 구체값 펼침·이미지 폴백 |
| `design-edit-page`의 MO 강제 | 편집 화면과 공개 PC 불일치 | 세 모드 미리보기, UI 경고, 공개 화면 검수 |
| `:has()`/`color-mix()` 브라우저 지원 | 구형 환경에서 프리셋 실패 | 지원 브라우저 확정, 필요 시 호환 출력 |
| 병원별 임시 클래스 | 자동 변환 오판 | allowlist, 부분 성공, 눈에 보이는 fallback |
| script 기반 UI | 기능 소실 | 정적 펼침, 리포트, 필요한 기능은 별도 승인 |
| 상대/http 이미지 | 공개 환경에서 이미지 실패 | URL 불변 유지, 파일·위치별 리포트 |
| 잘못된/중첩 HTML | 파서 복구로 의미 변화 | HTML5 파서, 복구 진단, 대표 시각 비교 |
| 인라인 과다 | 유지보수·출력 크기 증가 | 호스트 클래스 우선, 공통 helper, 중복 선언 검사 |
| 타입 통합으로 추적성 상실 | 원본과 결과 대응 어려움 | 외부 type ID 보존, 내부 helper만 공유 |
| fallback에 민감 정보/스크립트 노출 | 보안·운영 문제 | escape, 실행 불가, 운영 출력/진단 파일 분리 옵션 |

## 16. 확인 질문

다음은 구현 전에 답이 필요하지만, 이번 제안서의 결정 사항을 되묻는 질문은 아니다.

1. 실제 웹 에디터의 제품명·버전과 HTML sanitizer 정책을 확인할 수 있는 테스트 계정 또는 검증 환경을 제공할 수 있는가?
2. 지원해야 할 브라우저/웹뷰의 최소 버전은 무엇인가? 특히 `:has()`, `color-mix()`, `clamp()`, `aspect-ratio` 지원 기준이 필요하다.
3. 도구의 배포 위치, 접근 권한 방식, 기존 관리자 기술 스택은 무엇인가?
4. 병원 ID별 기본 테마 색과 예외 폰트의 확정 목록은 어디에서 관리하는가?
5. 실제 운영 호스트가 현재 `host-style.css`를 쓰는 한 사이트뿐인지, 서로 다른 버전의 CSS를 쓰는 다른 병원 사이트도 대상인지?
6. `<script>`가 있는 원본 31개 중 정적 펼침으로 바꾸면 안 되고 상호작용을 반드시 유지해야 하는 기능이 있는가?
7. 자동 변환 fallback의 원본 HTML을 운영용 결과 안에도 보이게 둘지, 운영 HTML에는 경고만 두고 원문은 별도 진단 파일에만 둘지?
8. QA 승인 기준에서 원본과의 시각 유사도보다 호스트 `mig-*` 디자인 일관성을 우선한다는 원칙의 최종 승인자는 누구인가?
9. `include/`, `option/`, `새 폴더/`, 루트 보조 HTML도 703개 1:1 결과는 만들되 부분 성공/실패로 보고하는 정책에서, 실제 에디터 납품 대상으로 별도 집계할 범위를 누가 확정하는가?
