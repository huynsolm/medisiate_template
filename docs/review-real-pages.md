# 실제 원본·703페이지 대조 검수 결과

- 검수일: 2026-11-16 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 검수 체크아웃: `eb16fea`. 코드 범위: `32af1b6..8abbcbd`(704cfcc·8abbcbd).
- 기준: `docs/review-request-real-pages.md`, 실제 페이지 기준선 기록, 이전 검수의 손실·경계·중복 읽기 기준.
- `reference/cms-original`은 입력 자료로 사용했으며 자료 자체의 정확성·변경을 검수하거나 수정하지 않았다.
- `/tmp/real-pages-review`에 eb16fea 별도 worktree를 만들고 요청대로 `cp -r reference/cms-original cms`를 수행했다. cms/는 gitignore임을 확인했고 커밋하지 않았다.
- 검수 시작 시 원격 HEAD는 c5b7de4로 더 진행돼 있었다. 후속 type27·28·30·링크 변경은 이번 코드 검수 범위 밖이다. 이 문서만 최신 브랜치에 추가한다. 아래 3건의 관련 type26 코드는 eb16fea와 당시 최신 c5b7de4 사이에 차이가 없었다.

## 판정

**수정 후 재확인 필요.** 요청한 일괄 변환 수치와 자동 테스트 결과는 재현됐지만, 실제 success 페이지의 주의문 위치 변경과 추가 표 입력의 조용한 표시·너비 변경을 확인했다.

| 등급 | 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 이번 범위에서 확정한 항목 없음 |
| Important | 3 | I-1 표시용 caption 숨김, I-2 유효한 열 너비 속성 무시, I-3 실제 페이지의 표 뒤 글 위치 변경 |
| Minor | 0 | 별도 확정 항목 없음 |

세 건 모두 코어 및 실제 Chromium에서 직접 실행했다. 원인 설명은 정적 판독으로 구분했다.

## Important

### I-1. sr-only가 없는 표시용 caption도 성공 변환 후 숨겨짐

**위치:** `packages/core/src/types/type26.ts:141`~`:142`, `:166`; 적용되는 호스트 CSS `reference/host-style.css:2508`.

**재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type26"><div class="cms-inner">
    <div class="cms-table-wrap"><table class="cms-table">
      <caption>VISIBLE_CAPTION</caption>
      <tbody><tr><td>FIRST</td></tr></tbody>
    </table></div>
  </div></section>
</div>
```

**실제:** success, diagnostics [], fallback 0. 데이터에 caption 문자열만 저장하고 원본의 숨김 여부는 보존하지 않는다. Chromium에서 원본 cms.css를 적용한 caption은 표시되고(측정 높이 22px), 출력은 호스트 CSS 때문에 1×1px·absolute·`clip: rect(0px, 0px, 0px, 0px)`가 되어 읽는 화면에서 사라진다.

**기대:** 원본이 sr-only인 표 제목은 화면 낭독기용으로 보존하되, 원본에서 표시되는 caption은 표시를 유지하거나 지원 불가 사유와 fallback으로 보존해야 한다. 성공·무경고 상태에서 숨기면 안 된다.

**원인 — 정적 판독:** 파서는 모든 caption을 같은 필드에 담고, renderer는 모든 caption을 호스트의 숨김 규칙이 걸리는 table-responsive 아래에 출력한다. 원본 sr-only 클래스 확인이나 표시용 대안이 없다.

이는 **추가 최소 입력의 결함**이다. 실제 자료에서 찾은 sr-only 없는 caption 한 건(`13267/0405_교육프로그램.html`)은 같은 표의 다른 caption 등 때문에 이미 fallback되므로, 그 실제 페이지가 이번 문제로 success 후 글을 잃었다고 주장하지 않는다.

### I-2. 무효한 CSS width가 유효한 width 속성보다 먼저 선택되어 너비가 경고 없이 사라짐

**위치:** `packages/core/src/types/type26.ts:130`~`:135`(너비 선택·진단 필터).

**재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type26"><div class="cms-inner">
    <div class="cms-table-wrap"><table class="cms-table">
      <colgroup><col width="80%" style="width:*"><col></colgroup>
      <tbody><tr><td>FIRST</td><td>SECOND</td></tr></tbody>
    </table></div>
  </div></section>
</div>
```

**실제:** success, diagnostics [], fallback 0. 첫 열은 `colWidths[0].width="auto"`로 저장된다. Chromium에서 같은 외부 테스트 조건(table width 1000px·fixed layout)을 적용하면 원본 첫 열은 width 속성을 따라 800px, 출력 첫 열은 약 499.5px다. 외부 테스트 CSS는 너비 차이를 일정하게 측정하기 위한 것으로 입력 HTML에는 넣지 않았다.

**기대:** 브라우저가 무효한 CSS width를 버린 뒤 유효한 HTML width 속성을 적용하는 경우, 80%를 유지해야 한다. 해석을 지원하지 못하면 경고·fallback으로 처리할 수 있지만 auto로 조용히 바꾸면 안 된다.

**원인 — 정적 판독:** 유효성 확인 전에 style에서 찾은 문자열을 width 속성보다 우선 선택한다. `*`가 선택된 다음 auto로 바뀌어, 여전히 유효한 width 속성으로 돌아가지 않는다. 관련 width style 경고도 필터링된다. 무효 값만 있는 입력을 auto로 옮기는 규칙과는 다른 경우다.

이는 추가 최소 입력에서 확인했으며 실제 703페이지에 같은 속성 조합이 있었다고 주장하지 않는다.

### I-3. 실제 success 페이지에서 표 뒤 주의문을 표 앞으로 옮김

**위치:** `packages/core/src/types/type26.ts:138`~`:139`, `:163`. `readNotes`는 cms-inner의 직접 자식 상자만 분류하여 이 경우의 순서를 처리하지 못한다.

**재현 입력 — 직접 실행:** `cms/contents/13256/02_02_입원생활안내.html`, 두 번째 섹션(type26). 자료를 바꾸지 않고 그대로 일괄/단독 변환했다. 핵심 순서는 다음과 같다.

```html
<div class="cms-table-wrap">
  <table class="cms-table">
    <caption class="sr-only">입원생활안내</caption>
    <!-- 회진시간·오전/오후 표 -->
  </table>
  <div class="cms-description-box">
    <p class="cms-description">* 단, 진료과의 특성에 따라 변동될 수 있사오니 문의는 간호스테이션으로 하시기 바랍니다.</p>
  </div>
</div>
```

위 코드는 위치 설명용 축약이며, 재실행에는 원본 파일 전체를 사용했다.

**실제:** eb16fea에서 파일은 success, 섹션 fallback 0. 출력은 주의문을 desc 필드로 읽어 표 앞에 배치한다. 실제 Chromium에서도 원본은 회진시간 표→주의문, 출력은 주의문→회진시간 표였다. 섹션 단독 변환의 diagnostics는 []다. 전체 파일에는 SSI 제거 정보만 있다.

이전 32af1b6에 같은 파일을 넣으면 partial, 해당 섹션 fallback 1(LOSSY_PARSE)이었다. 이번에 caption 등을 지원하면서 정상 변환으로 바뀌었지만, 순서를 잃은 상태가 success로 승인된다.

**기대:** 표 앞 설명과 표 뒤 주의문을 구분하여 원본 순서를 보존해야 한다. 현재 모델로 보존할 수 없는 구조라면 섹션 fallback으로 남겨야 한다. type15에서 별도로 합의한 순서 정규화를 이 표 주의문에 확대 적용하지 않았다.

**원인 — 정적 판독:** cms-table-wrap 안 첫 cms-description-box를 표 앞 설명이라고 가정해 읽고, 출력에서도 항상 table-responsive보다 앞에 둔다. readNotes는 wrap 바깥의 직접 자식 설명만 intro/note로 분류하므로 wrap 안의 뒤 설명을 교정하지 못한다.

## 703페이지 실행 및 독립 대조

### 직접 실행 결과

| 항목 | 결과 |
|---|---|
| 로컬 cms/ 복사 | reference/cms-original 복사, gitignore 확인 |
| npm ci | 임시 npm 캐시를 지정해 성공 |
| npm test | 종료 0, **702 passed**, 건너뜀 0, 30파일 통과 |
| npm run lint | 종료 0 |
| npm run typecheck | 종료 0 |
| npm run test:browser | 종료 0, **156 passed**, 4파일 통과 |
| npm run inventory | 종료 0, HTML 703 / 섹션 3467 |
| npm run convert -- --all | 종료 0, **success 270 / partial 418 / failed 15** |

일괄 보고서의 대상 외 파일은 12개다. 변환 보고서 typeStats 기준 섹션은 3391개, fallback 607개로 약 **17.90%**다. inventory의 원시 섹션 수와 대상 외 파일을 구분하는 변환 보고서의 집계 범위는 다르다. 따라서 기존 완료 조건의 fallback 5% 이하가 충족됐다고 보고할 수는 없다. 미구현 타입·긴 꼬리 변형은 이번 요청서의 알려진 한계로 별도 코드 결함에 중복 집계하지 않았다.

### 성공 판정의 글 대조 — 직접 실행

703개 파일을 다시 변환하고, non-fallback 섹션의 원본/출력을 독립적으로 비교했다. 공백은 제거하고 type24의 합의된 생성 순번은 제외했다.

- 비교 가능한 2861개 섹션 중 **2846개가 텍스트 순서까지 동일**했다.
- 불일치 15개 중 14개는 이번에 변경하지 않은 type01의 제목/본문 순서 문제였다. 이번 변경의 신규 결함으로 집계하지 않았다.
- 나머지 1개가 I-3의 실제 success 페이지다.
- 원시 non-fallback 후보 2874개 중 섹션을 따로 떼어 변환할 때 fallback되는 13개는 동일성 비교에서 제외했다. 이 검사는 문맥까지 완전히 동일한 전수 시각 검증이 아니다.
- 실제 success 페이지의 8개 섹션을 Chromium에서도 비교했다. type00·01·02·23·07 등이 포함되며, I-3 이외 표본의 공백 제거 텍스트는 같았다.

이 글 비교는 가시성·링크 주소·공백 의미까지 보증하지 않는다. 그래서 I-1은 별도 가시성 측정, I-2는 너비 측정으로 확인했다.

## 공통 도우미 및 예외 판단

- **직접 실행:** itemPart가 감싸는 row 안의 자기 이미지는 찾고, 하위 li 안의 이미지를 상위 항목 것으로 선택하지 않는 대조 통과. 추가 하위 이미지가 남으면 이미지 수 검사로 fallback됨도 확인했다.
- **직접 실행:** textsOf가 중첩된 같은 클래스에서는 바깥 요소만 한 번 읽고, 형제 문단은 br로 잇는 대조 통과. duplicateReads는 중복을 보고하지 않았다.
- **직접 실행:** cms-inner의 직접 자식 설명이 본문 앞뒤에 있는 정상 intro→표→note 입력은 순서 유지. 이는 I-3의 wrap 내부 뒤 설명과 다른 경우다.
- **공식 테스트 실행 및 정적 판독:** 26개 실제 원본 컴포넌트의 변환 검사가 통과했다. type25 #5의 증례 묶음, type04 #3의 별도 병원 마크업, type07 #2의 반복 이미지/목록 묶음은 현재 모델에 없는 구조를 원본 보존 fallback으로 남기는 예외로 수용한다. 이 예외를 성공 변환으로 간주하지 않았다.
- 기존 글 경계·중복 읽기·빈 값 방어 검사를 포함한 전체 테스트가 통과했다. 다만 글을 모두 데이터에 담았다는 검사는 I-1의 숨김, I-3의 순서 정규화를 감지하지 못한다.

## 범위와 한계

- 코드 검수는 eb16fea의 32af1b6..8abbcbd에 고정했다. 최신 원격 후속 구현 전체를 검수하거나 최신 코드에서 같은 수치를 재실행한 결과가 아니다.
- reference 자료의 내용·문구 자체는 평가하지 않았다. 원본 자료와 애플리케이션 코드를 수정하지 않았다.
- Linux, Node v24.22.1, 시스템 Chromium 156.0.8078.79에서 실행했다. 브라우저 외부 요청은 차단했다. Windows·외부 이미지 다운로드 성공·원본과의 전수 시각 등급 비교는 확인하지 않았다.
- 재현 스크립트·관측값은 /tmp/real-review, 테스트 로그는 /tmp/real-*.log, 변환·inventory 산출물은 검수 worktree의 output/reports에 있다. 임시 산출물과 cms/는 커밋하지 않는다.
- 복구된 환경의 기본 npm 캐시 경로를 사용할 수 없어 npm ci에 /tmp/real-npm-cache를 지정했다. 설치 성공 후의 테스트 결과이며 제품 결함에 포함하지 않았다.

**최종 판정: 수정 후 재확인 필요.**
