# 호스트 마이그레이션 DOM 계약

## 1. 범위와 판독 기준

이 문서는 `reference/host-style.css`(2026-11-13 저장본, SHA-256 `00657D8091192C5C8BC7AF7C3F43F51FB3CA762694ABEDAC35C195B56FE3B16F`)의 선택자만으로 추출한 계약이다. 호스트 공식 예시 HTML은 없다고 전제한다. 따라서 선택자로 확인되지 않는 의미는 **추정**하지 않았고, 아래 경로는 “해당 규칙이 매치되기 위한 최소 관계”를 뜻한다.

- `>`는 반드시 직접 자식이어야 한다.
- 공백은 임의 깊이의 후손이다.
- `+`는 바로 다음 형제다.
- `:has(> X)`는 `X`가 직접 자식이어야 한다.
- 프리셋 모드는 `.migration-content > .mig-container` 안에서 활성화된다.
- `type-26` 전용 선택자는 없다. 표는 공통 `.mig-table-wrap`, `.table-responsive`, `.mig-table` 계약을 사용한다.
- `type-banner`는 프리셋이 아니라 `.mig-container`가 없는 일반 모드에만 정의돼 있다.

## 2. 프리셋 공통 골격

```html
<div class="migration-content" style="--mig-primary-color:#164AA0">
  <div class="mig-container">
    <section class="mig-section type-XX">
      <header class="mig-header">
        <span class="mig-eyebrow">소제목</span>
        <strong class="mig-title">제목</strong>
        <p class="mig-desc">설명</p>
      </header>
      <div class="mig-body">
        <div class="mig-content">…</div>
      </div>
    </section>
  </div>
</div>
```

공통 프리셋 규칙은 `.mig-container`(2958~2968행), 이미지(2970~2999행), 섹션(3000~3043행), 헤더와 본문(3045~3078행), 콘텐츠·타이포·목록(3079~3195행), 강조 상자(3196~3229행), 표(3230~3285행)에 있다. `.mig-header + .mig-body`의 간격을 받으려면 둘이 바로 다음 형제여야 한다(3069~3078행).

## 3. 타입별 DOM 계약

“필수 경로”는 타입 고유 규칙을 받는 경로다. 단순 후손 규칙뿐인 타입에는 `>`가 필요하지 않지만, 공통 골격은 유지한다.

| 타입 | 타입 고유 규칙을 받는 필수 DOM 경로 | 사용 클래스·반응 | 근거 행 |
|---|---|---|---:|
| `type-00` | `.mig-container .mig-section.type-00` | 섹션 전체를 `display:none !important`로 숨김 | 3287~3289 |
| `type-01` | `.type-01 .mig-text-wrap`; `.mig-highlight-box .mig-text-wrap`; `.mig-visual img` | 텍스트 중앙 스택, highlight 안에서는 상단 여백 제거, 이미지 100% | 3291~3314 |
| `type-02` | `.mig-body > .mig-list:first-child:not(.type-dot) > .mig-item` 또는 `.mig-body > .mig-content > .mig-list:not(.type-dot) > .mig-item` | 목록/카드 직접 자식 관계 필수. `.mig-badge`, `.mig-label`, `.mig-item .mig-title`; `type-bg`이면 카드 배경 투명 | 3316~3380 |
| `type-03` | `.type-03 .mig-list .mig-item`; 항목 자체 또는 `.mig-item > .mig-content` | item은 목록의 후손이면 되고, content만 직접 자식 관계를 사용. 지그재그·PC 짝수 반전은 `html:not(.design-edit-page)` | 3381~3454 |
| `type-04` | `.type-04 .mig-list .mig-item`; 항목 자체 또는 `.mig-item > .mig-content` | item은 목록의 후손이면 되고, content만 직접 자식 관계를 사용. PC 반전은 편집 화면에서 비활성 | 3455~3519 |
| `type-05` | `.type-05 .mig-visual img` | 섹션 배경과 이미지 폭 규칙 | 3520~3530 |
| `type-06` | type-02와 같은 `.mig-body > … > .mig-list > .mig-item` 경로 | 카드 목록, `.mig-list`, `.mig-visual img`; `type-bg` 카드 투명 | 3531~3586 |
| `type-07` | `.mig-content:has(> .mig-visual)` | visual이 content의 직접 자식이어야 1열→PC 4:6 grid. `.mig-list` PC 2열, visual 4:3 cover | 3587~3627 |
| `type-08` | `.type-08 .mig-content`; `.mig-content > .mig-visual` 권장 | content grid, 목록, visual. PC 규칙은 편집 화면에서 비활성 | 3628~3682 |
| `type-09` | `.mig-body > .mig-list:first-child:not(.type-dot) > .mig-item` 또는 `.mig-body > .mig-content > .mig-list:not(.type-dot) > .mig-item`; `.mig-item > .mig-content` | 1열→PC 3열 카드. item content는 아이콘+본문 grid. `type-bg` 카드 투명 | 3683~3733 |
| `type-10` | type-09와 같은 직접 자식 카드 경로; `.mig-visual + .mig-content`; `.mig-item .mig-list .mig-item` | 1열→PC 3열 카드, 이미지 바로 다음 content 여백, 중첩 목록. `type-bg` 카드 투명 | 3734~3814 |
| `type-11` | `.mig-body > … > .mig-list > .mig-item` | 카드 목록; `type-bg` 카드 투명 | 3815~3851 |
| `type-12` | `.mig-body > … > .mig-list > .mig-item`; 항목 자체 또는 `.mig-item > .mig-content` | 카드/미디어 목록, visual; `type-bg` 카드 투명 | 3852~3915 |
| `type-13` | `.mig-body > … > .mig-list > .mig-item`; 항목 자체 또는 `.mig-item > .mig-content` | 행/카드 목록; `type-bg` 카드 투명 | 3916~3962 |
| `type-14` | `.mig-body > … > .mig-list > .mig-item`; 항목 자체 또는 `.mig-item > .mig-content` | 행/카드 목록; `type-bg` 카드 투명 | 3963~4003 |
| `type-15` | `.mig-content .mig-list:first-of-type:not(.type-dot) .mig-item` | 첫 목록의 item은 후손 관계. 카드 grid, visual cover | 4004~4041 |
| `type-16` | `.type-16 .mig-list .mig-item`; 항목 자체 또는 `.mig-item > .mig-content` | item은 후손 관계, content만 직접 자식. 배경 섹션, visual과 목록 카드 | 4042~4070 |
| `type-17` | `.mig-body > … > .mig-list > .mig-item` | 카드 목록; `type-bg` 카드 투명 | 4071~4107 |
| `type-18` | `.type-18 .mig-list .mig-item` | item은 후손 관계. 이미지 카드 grid, visual cover | 4108~4145 |
| `type-19` | `.type-19 .mig-list .mig-item` | item은 후손 관계. 단계/도형 목록 grid | 4146~4166 |
| `type-20` | `.mig-content:has(> .mig-visual)`; `.mig-list > .mig-item` | visual 직접 자식일 때 미디어 grid, highlight/list/visual 규칙 | 4167~4239 |
| `type-21` | `.mig-content:has(> .mig-visual)`; `.mig-list > .mig-item` | visual 직접 자식일 때 미디어 grid, 목록/visual 규칙 | 4240~4304 |
| `type-22` | `.type-22 .mig-list .mig-item` | item은 후손 관계. 이미지 카드 grid, visual cover | 4305~4342 |
| `type-23` | `.type-23 .mig-visual img`; `.type-23 .mig-text-wrap` | 와이드 이미지와 중앙 텍스트 스택 | 4343~4360 |
| `type-24` | `.type-24 .mig-list .mig-item`; `.mig-visual img` | item은 후손 관계. 배경 섹션, 순서 목록 | 4361~4386 |
| `type-25` | `.type-25 .mig-list .mig-item`; `.mig-visual` | item은 후손 관계. 이미지 카드 grid와 visual 비율 | 4387~4429 |
| `type-26` | 전용 선택자 없음. `.mig-table-wrap .table-responsive .mig-table` 및 `.mig-content:has(.table-responsive + .table-responsive)` | 공통 표 계약만 사용. 두 table-responsive가 인접하면 PC grid 가능 | 3230~3285 |
| `type-27` | `.mig-body > … > .mig-list > .mig-item` | 카드 목록; `type-bg` 카드 투명 | 4430~4460 |
| `type-28` | `.type-28 .mig-visual img`; `.type-28 .mig-text-wrap` | 배경 섹션, 이미지와 중앙 텍스트 스택 | 4461~4483 |
| `type-29` | `.type-29 .mig-visual img`; `.type-29 .mig-text-wrap` | 이미지와 중앙 텍스트 스택 | 4484~4500 |
| `type-30` | `.type-30 .mig-content`; `.type-30 .mig-list .mig-item` | item은 후손 관계. 배경 섹션, content/목록 grid, item 카드 | 4501~4543 |
| `type-banner` | `.migration-content:not(:has(.mig-container)) .mig-section.type-banner .mig-inner` | 일반 모드 전용. 섹션 padding과 inner gap을 0으로 만듦 | 4807~4813 |

### 3.1 `type-bg` 반응

타입 고유 `type-bg` 선택자는 `type-02`, `06`, `09`, `10`, `11`, `12`, `13`, `14`, `17`, `27`에 존재하며, 첫 카드 목록의 `.mig-item` 배경을 `transparent`로 바꾼다(각 타입 표의 행 범위). 이 클래스만으로 원본 `bg-color-*` 또는 `bg-image-*` 값이 생기지는 않는다. 원본 배경값은 부록의 매핑을 인라인/background data로 옮겨야 한다.

## 4. 데이터 속성 계약

| 속성 | 필요한 위치/경로 | 반응 | 근거 행 |
|---|---|---|---:|
| `data-migration-bg="true"` | `.migration-content` 아래 임의 요소 | `--bg-img-height` 기반 min-height, no-repeat, center | 2640~2644 |
| `data-bg-ratio="true"` | 위 요소와 같은 노드 | min-height 0, `--bg-img-width/height` aspect-ratio, cover | 2646~2650 |
| `data-bg-scope="mobile"` | 배경 노드 | 1024px 이상 공개 화면에서 배경 제거. `design-edit-page`에는 적용하지 않음 | 2652~2656 |
| `data-bg-scope="desktop"` | 배경 노드 | 기본/편집 화면에서는 제거, 1024px 이상 공개 화면에서 복원 | 2658~2666 |
| 섹션의 `data-migration-bg="true"` | `.mig-container .mig-section[data-migration-bg="true"]` | flex 중앙 정렬, 좌우 padding, aspect-ratio 해제, primary를 흰색으로 변경 | 3015~3034 |
| 후손의 `data-migration-bg="true"` | `.mig-section [data-migration-bg="true"]` | 같은 중앙 정렬·흰색 테마 반응 | 3015~3034 |
| 배경 안 `mig-eyebrow/title/desc` | 위 배경 노드의 후손 | 글자색 흰색 | 3036~3043 |
| `data-migration-slot="hero"` | `.mig-container .mig-visual.type-wide img[data-migration-slot="hero"]` | 이미지 width 100% | 2992~2999 |

주의: `data-migration-bg="true"`는 배경 이미지 URL을 설정하지 않는다. 렌더러가 `background-image`와 `--bg-img-width/height` 값을 별도로 제공해야 한다.

주의 (2026-11-14 브라우저 확인): `data-bg-scope="desktop"`은 **인라인 배경과 함께 쓸 수 없다.** 기본 규칙 `background: none !important`(2658행)가 1024px 이상의 `background: initial`(important 아님)보다 항상 이기기 때문이다. 인라인에 `!important`를 붙이면 반대로 모바일에서도 보인다. 그래서 렌더러는 PC/MO 배경이 다를 때 다음처럼 출력한다(`packages/core/src/helpers/background.ts`, `tests/visual/background.test.ts`).

- 섹션: 모바일 이미지 인라인 + `data-migration-bg="true" data-bg-scope="mobile"` + `position: relative; isolation: isolate`
- 섹션 첫 자식: `<div class="common-display-pc" aria-hidden="true" style="position: absolute; inset: 0; z-index: -1; background-image: …">` (PC 공개 화면에서만 보임)

## 5. P1·P2 최소 HTML

아래 예시는 선택자를 매치시키는 최소 골격이다. 콘텐츠 의미와 접근성 속성은 1단계 타입 구현에서 보강한다.

### type00

```html
<div class="migration-content"><div class="mig-container">
  <section class="mig-section type-00"><strong class="mig-title">페이지 제목</strong></section>
</div></div>
```

`type-00`은 호스트에서 숨겨진다(3287~3289행). 원본 type00 제목을 화면에 보여야 한다면 이 프리셋을 그대로 사용할 수 없다는 점이 1단계 설계 이슈다.

### type01

```html
<div class="migration-content"><div class="mig-container">
  <section class="mig-section type-01">
    <div class="mig-body"><div class="mig-content">
      <div class="mig-visual"><img src="image.jpg" alt=""></div>
      <div class="mig-text-wrap"><strong class="mig-title">제목</strong><p class="mig-desc">설명</p></div>
    </div></div>
  </section>
</div></div>
```

### type07

```html
<div class="migration-content"><div class="mig-container">
  <section class="mig-section type-07"><div class="mig-body">
    <div class="mig-content">
      <div class="mig-visual"><img src="image.jpg" alt=""></div>
      <ul class="mig-list"><li class="mig-item"><span class="mig-desc">항목</span></li></ul>
    </div>
  </div></section>
</div></div>
```

`mig-visual`은 `.mig-content`의 직접 자식이어야 `:has(> .mig-visual)` grid가 적용된다(3593~3603행).

### type09

```html
<div class="migration-content"><div class="mig-container">
  <section class="mig-section type-09"><div class="mig-body">
    <ul class="mig-list">
      <li class="mig-item"><div class="mig-content"><span class="mig-num">01</span><p class="mig-desc">설명</p></div></li>
    </ul>
  </div></section>
</div></div>
```

### type10

```html
<div class="migration-content"><div class="mig-container">
  <section class="mig-section type-10"><div class="mig-body">
    <div class="mig-visual"><img src="image.jpg" alt=""></div>
    <div class="mig-content"><ul class="mig-list">
      <li class="mig-item"><strong class="mig-title">제목</strong><ul class="mig-list"><li class="mig-item"><span class="mig-num">01</span><span class="mig-desc">설명</span></li></ul></li>
    </ul></div>
  </div></section>
</div></div>
```

### type02

```html
<div class="migration-content"><div class="mig-container">
  <section class="mig-section type-02"><div class="mig-body">
    <div class="mig-content"><ul class="mig-list">
      <li class="mig-item"><span class="mig-badge">01</span><strong class="mig-title">제목</strong></li>
    </ul></div>
  </div></section>
</div></div>
```

### type03

```html
<div class="migration-content"><div class="mig-container">
  <section class="mig-section type-03"><div class="mig-body"><ul class="mig-list">
    <li class="mig-item"><div class="mig-content"><div class="mig-visual"><img src="image.jpg" alt=""></div><div class="mig-text-wrap"><strong class="mig-title">제목</strong><p class="mig-desc">설명</p></div></div></li>
  </ul></div></section>
</div></div>
```

## 6. 일반 모드 계약 (`.mig-container` 없음)

일반 모드는 `.migration-content:not(:has(.mig-container))`에서만 활성화된다(4544행). 한 블록 어디에든 `.mig-container`가 있으면 이 규칙 전체가 매치되지 않는다.

| 구조 | 반응 | 근거 행 |
|---|---|---:|
| `.mig-section .mig-inner` | 세로 flex, 기본 gap 22px, 공개 PC 30px | 4566~4582 |
| `.mig-section .mig-content` | 세로 flex와 gap | 4583~4593 |
| `.mig-content-inner > * + *` | 직접 자식 형제 간 여백 | 4594~4613 |
| `.mig-content-inner > .mig-title + .mig-desc` | 바로 인접한 제목/설명 전용 간격 | 4614~4623 |
| `.mig-content-inner > .mig-list` | 직접 자식 목록 상단 간격 | 4624~4633 |
| `.mig-content > .mig-content-inner + .mig-content-inner` | 인접 content-inner 묶음 간격 | 4634~4637 |
| `.mig-visual[.img-contain|.size-sm|.size-md|.type-wide] img` | 반응형 이미지, contain/크기/와이드 변형 | 4638~4667 |
| `.group-mig-visual` | 1열, 공개 PC에서 `--pc-col` 기반 grid | 4668~4680 |
| `.mig-title`, `.mig-desc` | 일반 모드 타이포와 PC 크기 | 4681~4725 |
| `.mig-title-wrap .mig-title` | 좌측 색 막대(`::before`)와 강조 제목 | 4726~4766 |
| `.mig-text-wrap > * + *` | 직접 자식 텍스트 간격 | 4767~4806 |
| `.mig-section.type-banner .mig-inner` | padding/gap 0 | 4807~4813 |
| `.mig-section.type-text .mig-content` | type-text 콘텐츠 규칙 | 4815행 이후 |
| `.mig-section .mig-media` | 일반 미디어 컴포넌트 | 4826행 이후 |
| `.mig-media.media-left/media-right/media-center` | 공개 PC에서 좌우 배치·순서 또는 중앙 폭 적용. `.mig-media-box`, `.mig-text-box`는 후손 관계 | 4826~4963 |
| `.mig-list .mig-item:has(.mig-desc, .mig-list)` | 설명/하위 목록이 있는 item의 카드형 스택. 직접 자식 제약 없음 | 4964~5020 |
| `.mig-list.type-grid` | 기본 grid 목록, 공개 PC 열 수 증가 | 5021~5031 |
| `.mig-list.type-card > .mig-item` | 카드 변형은 item이 직접 자식이어야 함 | 5032~5044 |
| `.mig-list.type-timeline > .mig-item` | timeline item과 마커는 직접 자식이어야 함 | 5045~5100 |
| `.mig-list.type-ordered/type-bullet .mig-item:has(...)` | 제목·설명·하위 목록/표 간격. 중첩 목록 일부는 `> .mig-list` 직접 자식 계약 | 5101~5154 |
| `.mig-list.type-ordered > .mig-item` | 3단계까지 직접 자식 ordered 목록과 번호 마커 | 5155~5271 |
| `.mig-list.type-bullet > .mig-item` | 3단계까지 직접 자식 bullet 목록과 마커 | 5272~5333 |
| `.table-responsive .mig-table[.is-scroll/.is-mix-align/.is-sentence]` | 일반 모드 표, 셀·정렬·스크롤 변형 | 5334~5379 |
| `.mig-gallery-grid .mig-gallery-item` | 갤러리 grid, visual, caption/title. item은 후손 관계 | 5380~5434 |
| `.mig-featured-wrap .mig-featured-main/.mig-featured-sub .mig-sub-item` | 대표 이미지와 보조 항목/캡션 조합 | 5435~5573 |
| `.mig-thumb-wrap .mig-thumb-item` | 썸네일·텍스트 조합, 공개 PC 배치 | 5574~5664 |
| `.mig-illust-wrap .mig-illust-item` | 일러스트 항목, visual/text/list와 연결 장식 | 5665~5771 |
| `.mig-faq-wrap .mig-faq-item .mig-faq-question/.mig-faq-answer` | Q/A 마커는 pseudo-element, title/desc 후손 | 5772~5891 |
| `.mig-callout .mig-callout-title` | 강조 callout | 5892~5926 |
| `.mig-notice[.is-mark]` | 공지와 선택적 마커, 앞 요소 뒤 간격 | 5927~5945 |
| `.mig-legend-wrap .mig-legend-item .mig-legend-chip` | 범례 flex 목록과 색상 chip | 5946~5985 |

PC 규칙은 대부분 `@media (min-width:1024px)`와 `html:not(.design-edit-page)` 조건을 함께 사용한다. 따라서 1100px 편집 화면도 모바일 쪽 레이아웃을 유지한다.

## 부록 A. 원본 공통 변형 매핑

코드 기준은 `packages/core/src/parse/variant-map.ts`다. 아래 값은 `cms/css/cms.css`에서 직접 옮겼다.

| 클래스 | 기본값 | PC(≥992px) | MO(≤991px) | 근거 |
|---|---|---|---|---|
| `type-bg` | `background:#f9f3ec` | `padding:150px 0` | `padding:65px 0; background-position:50% 0 !important; background-size:100% auto` | 19~21, 80~82, 106~110 |
| `bg-color-1` | `background:#f9e9e3` | type-bg 상속 | type-bg 상속 | 23~25 |
| `bg-color-2` | `background:#f4f4f4` | type-bg 상속 | type-bg 상속 | 27~29 |
| `bg-color-3` | `background:#f1e6e1` | type-bg 상속 | type-bg 상속 | 31~33 |
| `bg-image-1` | `url(./../images/common/cms_bg_1.jpg) no-repeat 50% 50%; background-size:cover` | `padding-bottom:150px` | `url(./../images/common/cms_bg_1_m.jpg); background-color:#38405e` | 35~38, 88~90, 116~119 |
| `bg-image-2` | `url(./../images/common/cms_bg_2.jpg) no-repeat 50% 50%; background-size:cover` | type-bg 상속 | `url(./../images/common/cms_bg_2_m.jpg); background-color:#181a27` | 40~43, 121~124 |
| `bg-image-3` | `url(./../images/common/cms_bg_3.jpg) no-repeat 50% 50%; background-size:cover` | type-bg 상속 | type-bg의 position/size 적용 | 45~48 |
| `bg-image-4` | `url(./../images/common/cms_bg_4.jpg) no-repeat 50% 50%; background-size:cover` | type-bg 상속 | type-bg의 position/size 적용 | 50~53 |
| `bg-image-5` | `url(./../images/common/cms_bg_5.jpg) no-repeat 50% 50%; background-size:cover` | type-bg 상속 | type-bg의 position/size 적용 | 55~58 |
| `bg-image-6` | `url(./../images/common/cms_bg_6.jpg) no-repeat 50% 50%; background-size:cover` | type-bg 상속 | type-bg의 position/size 적용 | 59~62 |
| `bg-image-7` | `url(./../images/common/cms_bg_7.jpg) no-repeat 50% 50%; background-size:cover` | type-bg 상속 | type-bg의 position/size 적용 | 63~65 |
| `text-white` | `color:#fff` | 동일 | 동일 | 67~69 |

원본의 992px/991px 분기와 호스트의 1024px 분기는 다르다. 1단계 렌더러는 원본 URL과 색을 보존하되 호스트 출력 계약에 맞춰야 하며, 특히 `bg-image-1/2`의 PC/MO URL 전환은 인라인 스타일만으로 구현할 수 없다. `data-bg-scope`를 사용한 배경 노드 2개 또는 PC/MO 실제 요소가 필요하다.
