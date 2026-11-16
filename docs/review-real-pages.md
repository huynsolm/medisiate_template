# 실제 원본·703페이지 2차 재검수 — b5ae00b

- 검수일: 2026-11-16 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `b5ae00b5b02ac8d3466366375773bd98ddbf83e3`.
- 범위: `f2e48e4..b5ae00b`. 기준: 반영 기록 마지막 장 및 검수 요청서 8장.
- reference/cms-original의 로컬 cms/ 복사본을 사용했다. cms/는 gitignore이며 커밋하지 않는다. 코드·테스트·원본 자료는 수정하지 않고 이 문서만 갱신했다.

## 판정

**수정 후 재확인 필요.** 이전 입력과 type15 정책 변경은 반영됐다. 다만 새 순서 검사에서 작성된 숫자를 생성 순번으로 오인하는 오탐과, 같은 글을 가진 버튼/문단의 위치 변경을 통과시키는 잔여 사례를 확인했다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 이번 범위에서 확정한 항목 없음 |
| Important | 2 | I-1 작성된 숫자까지 비교에서 제거, I-2 동일 글 버튼/문단의 구조적 순서 변경 통과 |
| Minor | 0 | 별도 확정 항목 없음 |

두 건은 추가 최소 입력이며 실제 703페이지에서 같은 문제가 발생했다고 주장하지 않는다. 기본 원본과 일반 변형의 대조 결과는 아래에 별도로 적었다.

## 이전 지적·정책 변경 확인 — 직접 실행

| 이전 입력 | 현재 실제 결과 | 판정 |
|---|---|---|
| type26 width=80%, style=width:20 | success, 첫 열 80% 보존 | 이전 R-I-1 수정 확인 |
| type29 FIRST→BUTTON→LAST | LOSSY_PARSE, 섹션 fallback 1, 원본 순서 보존 | 이전 원문 R-I-2 수정 확인 |
| type15 CARD→EXTRA_PARA 문단→BULLET | LOSSY_PARSE, 섹션 fallback 1 | 사용자 지정 새 정책과 일치 |

type29와 type15는 코어 및 실제 Chromium에서 확인했다. type15는 예전의 목록→문단 정규화 허용을 이번에는 적용하지 않고, 명시된 fallback 정책으로 판단했다.

## Important

### I-1. type24의 원본 숫자 span까지 생성 순번으로 지워 정상 입력을 fallback함

**위치:** `packages/core/src/convert/convert-document.ts:199`. type24 출력 전체에서 특정 span 문자열을 일괄 제거한다.

**재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type24"><div class="cms-inner">
    <ol class="cms-ordered-list">
      <li class="cms-list-item"><div class="cms-description-box">
        <p class="cms-title">YEAR</p>
        <p class="cms-description"><span class="mig-num">2026</span> BODY</p>
      </div></li>
    </ol>
  </div></section>
</div>
```

이 span은 작성된 본문 서식 요소이며, 항목 밖에서 렌더러가 생성하는 순번이 아니다. 원본 도구의 기본 fixture가 이 클래스를 생성한다는 주장은 아니고, 허용되는 class/span 서식을 가진 추가 입력이다.

**이전 실제 결과:** f2e48e4는 success, 경고 없음, fallback 0. Chromium 출력은 자동 순번 1 외에 원래 YEAR·2026 BODY를 그대로 표시했다.

**현재 실제 결과:** status failed, LOSSY_PARSE, fallback 1. 사유는 `원본과 글 순서가 다름: …YEAR2026BODY`이다. 비교 직전 정상 renderer는 2026을 포함하지만, 비교용 출력에서 본문 숫자 2026이 지워져 원본과 다르다고 오판한다.

**대조 — 직접 실행:** span의 클래스만 제거하거나 cms-num으로 바꾸면 현재도 success다. 글·요소 순서가 동일해도 정확히 class=mig-num인 숫자 span에서만 fallback된다. 실제 Chromium에서도 원본은 YEAR / 2026 BODY, 현재 출력은 미지원 fallback이다.

**기대:** 합의된 생성 순번만 비교에서 제외하고, 원본에서 읽은 숫자는 비교에 남겨야 한다. 원래 글 순서가 보존되는 이 입력을 거부해서는 안 된다.

**원인 — 정적 판독:** 정규식은 생성 순번의 위치·출처를 확인하지 않고 `<span class="mig-num">숫자</span>`과 일치하는 모든 출력 노드를 지운다. rich allowlist는 본문의 같은 class를 허용하므로 충돌할 수 있다. 이 문제는 원본 글이 최종 renderer에서 빠진 것이 아니라, 비교 자료를 잘못 만들면서 생긴 오탐이다.

### I-2. 버튼과 뒤 문단의 글이 같으면 위치가 바뀌어도 순서 검사를 통과함

**위치:** `packages/core/src/convert/convert-document.ts:189`, `:200`~`:202`; 순서를 바꾸는 경로는 `packages/core/src/types/type29.ts:55`~`:62`, `:68`~`:72`.

**재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type29"><div class="cms-inner">
    <div class="cms-description-box">
      <p class="cms-description">FIRST</p>
      <p class="cms-button-wrap"><a class="cms-square-button" href="/go">예약</a></p>
      <p class="cms-description">예약</p>
    </div>
  </div></section>
</div>
```

**실제:** success, diagnostics [], fallback 0. 파서는 계속 문단과 버튼을 별도 배열로 모으고 모든 문단 다음에 버튼을 출력한다. Chromium에서 본문 p의 실제 순서를 확인했다.

| 순서 | 원본 | 출력 |
|---|---|---|
| 1 | FIRST 일반 글 | FIRST 일반 글 |
| 2 | 예약, /go 링크 있음 | 예약, 링크 없음 |
| 3 | 예약, 링크 없음 | 예약, /go 링크 있음 |

문자열만 보면 양쪽 모두 FIRST예약예약이다. **글자열은 같지만 버튼과 문단의 구조적 순서는 달라지고, 클릭 가능한 예약의 위치가 바뀐다.** 이를 글자 누락이나 서로 다른 글자열의 변경으로 주장하는 것은 아니다. 이전 R-I-2의 문단/버튼 위치 문제를 같은 글이라는 이유로 계속 허용하는 경우다.

**대조 — 직접 실행:** 마지막 문단 글만 다른문단으로 바꾸면 새 순서 검사가 fallback시킨다. 같은 글일 때만 기존 위치 변경이 무경고로 통과한다.

**기대:** 지원하지 않는 문단/버튼 교차 배치는 원본의 역할·순서를 유지하거나 fallback으로 보존해야 한다. 같은 표시 글이라도 링크인 요소와 일반 글의 위치를 교환한 결과를 동일한 것으로 취급하면 안 된다.

**원인 — 정적 판독:** squashText는 DOM 역할·링크 정보를 지우고 글자열만 비교한다. 따라서 같은 글을 가진 서로 다른 역할의 요소가 바뀌면 검사 결과가 같다. 타입별 순서 보존 없이 이 비교만으로 이전 문단/버튼 순서 문제 전체를 막을 수는 없다.

## 정상 원본 및 일반 입력 오탐 대조 — 직접 실행

이전 f2e48e4를 임시 디렉터리에 펼쳐 현재 코드와 대조했다. 저장소 코드는 바꾸지 않았다.

| 입력군 | 결과 |
|---|---|
| 기본 fixture 기반 29개 타입(type01 포함) × 원본/무배경/이미지 배경/색 배경 116조합 | 출력 HTML 전부 동일 |
| P2 이후 기본 fixture 28타입 × 공백/이미지 제거/인라인 서식/문단 변형 112조합 | 출력 HTML 전부 동일, 모두 fallback 0 |
| 실제 703파일 이전/현재 비교 | 파일별 status 및 섹션별 변환 타입/fallback 여부 모두 동일 |

일반 변형은 기존 검수와 같은 공백·탭 추가, img 제거, 첫 해당 글 strong/br/em 서식, 첫 p.cms-description을 div.cms-description > p+p로 바꾸는 방식이다. 해당 문단 요소가 없는 타입은 그 변형에서 원본을 비교했다. type33은 별도 fixtures/original 파일이 없어 이 fixture 조합에는 넣지 않았고, 실제 페이지 및 공식 검사 범위에 포함된다.

따라서 기본 자료에서 새 오탐이 발생했다는 결과는 없지만, I-1의 본문 숫자 span 입력은 별도로 실패했다. 일반 서식·공백 변형 전부를 보증하는 판정은 아니다.

## 실제 페이지 및 실행 결과

| 직접 실행한 검사 | 결과 |
|---|---|
| npm test(PLAYWRIGHT_BROWSERS_PATH 임시 경로 사용) | 종료 0, **804 passed**, 건너뜀 0, 33파일 통과 |
| npm run test:browser | 종료 0, **180 passed**, 4파일 통과 |
| npm run lint | 종료 0 |
| npm run typecheck | 종료 0 |
| npm run convert -- --all | 종료 0, **success 314 / partial 374 / failed 15** |
| 실제 파일 이전/현재 독립 비교 | 703파일의 status·섹션 타입/fallback 변화 0 |
| 최소 재현·대조 | I-1·I-2 및 이전 원문·type15 확인 |
| 실제 Chromium | I-1 오탐과 I-2의 링크 위치 변경, 이전 입력의 fallback 확인 |

- 전체 테스트에 브라우저 검사가 포함되므로 804와 180을 합산하지 않는다.
- 로컬 cms/는 reference/cms-original 복사본이며 gitignore임을 확인했다. 자료와 코드·테스트는 수정하지 않았다.
- Linux, Node v24.22.1, Chromium 156.0.8078.79 사용. 저장소 런처는 바꾸지 않았다. Windows·외부 링크 접속 성공·전수 시각 등급 비교는 실행하지 않았다.
- 이번 별도 브라우저 재현은 DOM 글·링크 역할 순서 검사이며, 웹 편집기 저장/가져오기 흐름은 다시 실행하지 않았다.
- 임시 입력·스크립트·관측값은 /tmp/real3-review, 공식 검사 로그는 /tmp/real3-*.log에 있다. 핵심 입력과 실제 결과는 위에 기재했다.

**최종 판정: 수정 후 재확인 필요.**

## 이전 재검수 원문 보존

아래는 f497c31의 과거 검수 원문(보고 커밋 f2e48e4)과 그 안의 이전 기록이다. 과거 원문 입력은 수정 확인됐으며, 현재 지적은 위 I-1·I-2다.

<details>
<summary>이전 재검수 원문 — f497c31</summary>

# 실제 원본·703페이지 재검수 결과 — f497c31

- 검수일: 2026-11-16 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `f497c31ff52bfd410036b68339da3f79802668ba`.
- 범위: `8abbcbd..f497c31`. 기준: `docs/review-real-pages-fixes.md` 및 검수 요청서 7장.
- 이전 I-1~I-3, type01 머리글 순서,글 순서 검사, type27·28·29·30·33, safeHref 링크 보존을 포함한다.
- reference/cms-original의 로컬 cms/ 복사본으로 실행했다. cms/는 gitignore이며 커밋하지 않는다. 애플리케이션·테스트·원본 자료는 수정하지 않았고 검수 문서만 갱신했다.

## 판정

**수정 후 재확인 필요.** 이전 세 재현 입력과 실제 페이지 순서는 수정됐다. 실제 페이지 수치·자동 검사는 재현했지만, 추가 입력에서 단위 없는 CSS 너비의 잘못된 적용과 type29 문단/버튼 순서 변경을 확인했다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 이번 범위에서 확정한 항목 없음 |
| Important | 2 | R-I-1 단위 없는 CSS 너비 우선 적용, R-I-2 type29 버튼 뒤 문단 순서 변경 |
| Minor | 0 | 별도 확정 항목 없음 |

두 항목은 **추가 최소 입력**이며 실제 703페이지에서 같은 문제가 발생했다고 주장하지 않는다. 직접 실행과 정적 판독을 아래에 구분했다.

## 이전 I-1~I-3 및 type01 — 직접 실행

| 이전 입력 | 현재 결과 | 판정 |
|---|---|---|
| 표시용 caption, sr-only 없음 | success, 경고 없음. Chromium에서 static·clip auto, 1px 숨김 해제 | 수정 확인 |
| sr-only caption | 공식 회귀 검사에서 화면 낭독기용 숨김 유지 | 수정 확인 |
| col width=80%, style=width:* | 80% 보존. 같은 외부 측정 조건에서 원본/출력 모두 약 80% 폭 | 원문 I-2 수정 확인. 다른 무효 CSS 값은 R-I-1 참조 |
| 실제 13256/02_02_입원생활안내.html 2번째 섹션 | success, 표→주의문 순서. Chromium 원본/출력 순서 일치 | 수정 확인 |
| type01 기존 14개 글 순서 차이 | 실제 섹션 글 대조에서 불일치 없음 | 수정 확인 |

이전 재현 HTML을 그대로 다시 실행했으며, 원문은 아래 과거 검수 기록에 보존했다. 표시용 caption은 원본/출력 모두 눈에 보이고, 출력 높이는 약 25.6px로 확인했다. 호스트 서체·표 디자인까지 픽셀 동일하다는 뜻은 아니다.

## Important

### R-I-1. 단위 없는 CSS width를 px로 인정하여 유효한 HTML width 속성을 여전히 가림

**위치:** `packages/core/src/types/type26.ts:134`~`:141`. style과 HTML 속성이 같은 validWidth 함수를 사용한다.

**재현 입력 — 직접 실행:** 표준 모드 문서에서 다음 HTML을 변환한다.

```html
<!doctype html>
<div class="cms-container">
  <section class="cms type26"><div class="cms-inner">
    <div class="cms-table-wrap"><table>
      <colgroup><col width="80%" style="width:20"><col></colgroup>
      <tbody><tr><td>FIRST</td><td>SECOND</td></tr></tbody>
    </table></div>
  </div></section>
</div>
```

**실제:** success, diagnostics [], fallback 0. 첫 열을 `colWidths[0].width="20px"`로 저장한다. Chromium 표준 모드에서 동일한 외부 측정 CSS(table width 1000px·fixed layout)를 적용하면 원본 첫 열은 약 **795.2px**(80%에 해당하는 표 내부 폭), 출력은 **20px**다.

**기대:** 표준 CSS의 `width:20`은 무효이므로 무시하고, 유효한 HTML 속성 width=80%를 적용해야 한다. HTML 속성의 숫자 20을 px로 변환하는 것과, 단위 없는 비영 CSS 길이를 유효하다고 인정하는 것은 구분해야 한다. 해석 불가라면 경고·fallback으로 보존할 수 있지만 성공·무경고로 20px를 적용하면 안 된다.

**원인 — 정적 판독:** validWidth는 style 값에도 숫자 문자열이면 px를 붙인다. 무효한 *는 거부하게 됐지만 20은 잘못 유효 판정되어 속성값보다 우선한다. width style 경고 필터도 그대로 적용된다.

**측정 조건:** `<!doctype html>` 표준 모드를 명시했다. 실제 원본 `cms/contents/include/header.html` 첫 줄과 미리보기 previewDocument도 doctype을 쓴다. Quirks 모드의 단위 없는 CSS 허용 동작을 근거로 하지 않았다. 측정 CSS는 입력 HTML에 주입하지 않고 브라우저 문서에만 공통 적용했다.

### R-I-2. type29에서 버튼 뒤 문단이 버튼 앞으로 이동하지만 success

**위치:** `packages/core/src/types/type29.ts:55`~`:62`, `:68`~`:72`.

**재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type29"><div class="cms-inner">
    <div class="cms-description-box">
      <p class="cms-description">FIRST</p>
      <p class="cms-button-wrap"><a class="cms-square-button" href="/go">BUTTON</a></p>
      <p class="cms-description">LAST</p>
    </div>
  </div></section>
</div>
```

**실제:** success, diagnostics [], fallback 0. paragraphs는 FIRST·LAST, buttons는 BUTTON으로 저장한다. 실제 Chromium 원본 표시 순서는 **FIRST→BUTTON→LAST**, 출력은 **FIRST→LAST→BUTTON**이다. 링크 /go는 보존되지만 순서가 달라진다.

**기대:** 원본의 문단·버튼 순서를 유지해야 한다. 현재 모델이 섞인 순서를 표현하지 못한다면 섹션 fallback으로 보존해야 하며, 글을 모두 담았다는 이유로 순서가 바뀐 결과를 성공 처리해서는 안 된다.

**원인 — 정적 판독:** 파서가 설명 문단과 버튼을 별도 배열로 모으고, renderer는 모든 문단 다음에 모든 버튼을 출력한다. finish의 남은 글·중복 읽기 검사는 서로 다른 요소의 위치 변경을 감지하지 않는다. 새 실제 페이지 글 순서 테스트도 이 입력이 703페이지에 없으면 실패하지 않는다.

원본 컴포넌트의 기본형처럼 버튼이 끝에 있는 경우는 정상이다. 이 항목은 추가 사용자 편집 변형의 조용한 순서 변경이며, type15에 별도로 합의한 순서 정규화와는 구분한다.

## 실제 703페이지·글 순서 대조

**직접 실행:** 요청서의 수치를 재현했다.

- success **314**, partial **374**, failed **15**, 합계 703.
- INVALID_DATA 0 및 새 글 순서 테스트 통과.
- 이전 검수의 독립 대조 스크립트도 현재 코드로 다시 실행했다. 별도 변환으로 비교 가능한 **3027개 섹션의 공백 제거 글 순서 불일치 0**.
- 원시 non-fallback 후보 3040개 중 따로 떼어 변환하면 fallback되는 13개는 비교에서 제외했다. 이 대조는 전수 시각 검증은 아니다.
- 변환 보고서 typeStats 기준 섹션 3391개 중 fallback 441개, 약 **13.01%**. 알려진 미구현·변형 범위가 남으므로 기존 전체 목표 5% 이하까지 완료됐다고 판단하지 않는다. 이 수치를 새 결함에 중복 집계하지 않았다.

## 새 타입·링크 검토

### type27·28·29·30·33

- **직접 실행:** 추가 25건 검사(각 타입의 기본 지원형, 고유 글 추가, 이미지 추가, 문단 2개, 중첩 목록). 기본 지원형은 변환되고, 지원하지 않는 글/이미지/목록이 남으면 fallback이었다. 문단은 br로 보존되거나 fallback됐다.
- type33 추가 입력은 지원하는 type27형 원 목록 구조를 사용했다. 원본 컴포넌트의 dl·상자·Q&A형이 모두 지원된다고 보지 않았다.
- **직접 실행:** 실제 Chromium 웹에서 5개 타입의 제목 편집→JSON 저장→가져오기→새로고침을 수행했고, 값과 출력 HTML이 유지됐다. type33은 지원하는 원 목록 구조로 검사했다.
- **공식 검사 실행:** 실제 컴포넌트·스냅샷·배치 검사 통과. type27 복합 묶음과 type33 dl/Q&A 등 명시된 fallback은 현재 모델/모드가 지원하지 않는 구조의 보존으로 수용한다.
- **정적 판독:** 새 파서는 richFrom 또는 기존 글 도우미를 경유하며 finish를 호출한다. type33이 type-27 카드 프리셋을 사용하는 결정은 요청서가 명시한 호스트 디자인 대체로 수용했다.

### safeHref 및 링크

- **직접 실행:** 위험 주소 14건(javaScript 대소문자·선행 제어문자·탭/줄바꿈·HTML 엔티티·data/vbscript/file/blob 등)은 링크를 제거하고 TEXT는 유지했다.
- **직접 실행:** 안전 주소 12건(http/https·mailto·tel·루트/상대/fragment/query·프로토콜 상대 등)은 보존됐다. target=_blank에는 noopener noreferrer가 남고 이벤트 속성은 제거됐다.
- 추가 이상 주소 7건(NUL·수직 탭·NBSP·percent 인코딩 colon·이중 엔티티·역슬래시·전각 colon)을 포함한 **총 33건**을 Chromium에서 base URL 아래 파싱해 실제 a.protocol을 확인했다. javascript/data/vbscript/file 프로토콜로 남는 우회는 없었다.
- HTML 입력의 NUL은 HTML 파서에서 대체 문자로 변한다. 이 경우 문자열이 남더라도 브라우저가 상대 URL로 해석하는지 확인했으며, 제거 여부만으로 위험을 판정하지 않았다.
- 이미지 링크 및 JSON 이미지 링크 검증, 위험 링크 경고는 공식 links.test.ts를 실제 실행해 확인했다. 이미지가 감싼 링크의 target/rel 출력 경로도 정적으로 대조했다.
- 이 검사는 href 처리와 DOM 프로토콜 해석이다. 외부 사이트의 리다이렉트·메일/전화 앱 동작까지 검증한 것은 아니다. 이번 입력군에서는 안전 주소 검사 우회 결함을 찾지 못했다.

## 실행 결과와 한계

| 직접 실행한 검사 | 결과 |
|---|---|
| 로컬 cms/ | reference/cms-original 복사본, gitignore 확인. 커밋하지 않음 |
| npm ci | 임시 캐시 지정, 종료 0 |
| npm test | 종료 0, **799 passed**, 건너뜀 0, 33파일 통과 |
| npm run test:browser | 종료 0, **180 passed**, 4파일 통과 |
| npm run lint | 종료 0 |
| npm run typecheck | 종료 0 |
| npm run convert -- --all | 종료 0, 314 / 374 / 15 |
| 독립 글 대조 | 3027개 비교, 순서 불일치 0 |
| 추가 안전 검사 | 새 타입 25건, 주소 33건 |
| 실제 웹 편집 | 새 타입 5개 저장·재로드 유지 |

- 전체 테스트에 브라우저 검사가 포함되므로 799와 180을 합산하지 않는다.
- Linux, Node v24.22.1, Chromium 156.0.8078.79 사용. 저장소 런처는 변경하지 않았고 기존 임시 Playwright 경로를 사용했다.
- Windows·외부 사이트 접속 성공·전수 시각 등급 비교는 실행하지 않았다. 원본 자료 자체를 수정하거나 정확성을 평가하지 않았다.
- 임시 입력·스크립트·관측값은 /tmp/real2-review, 공식 검사 로그는 /tmp/real2-*.log에 있다. 핵심 재현 입력과 실제 결과는 위에 기재했다.

**최종 판정: 수정 후 재확인 필요.**

## 이전 검수 원문 보존

아래는 eb16fea의 과거 검수 원문(보고 커밋 dc1f8c1)이다. 과거 I-1~I-3의 원문 입력은 수정 확인됐으며, 현재 미해결 항목은 위 R-I-1·R-I-2다.

<details>
<summary>이전 검수 원문 — eb16fea</summary>

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

</details>

</details>
