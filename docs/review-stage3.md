# 3단계 P2·P3 재검수 결과 — c14fe4b

- 검수일: 2026-11-15.
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `c14fe4bcada4d90a23f89802cbb8ed3291ad85fa`.
- 범위: `0aea169..c14fe4b`. 반영 기록: `docs/review-stage3-fixes.md` 4장.
- 애플리케이션·테스트·fixture는 수정하지 않았다. 이번 변경은 이 검수 문서뿐이다.

## 판정

**이번 반영 범위는 통과.** 이전 R-I-1, R-I-2, R-M-1의 수정을 직접 확인했다. 허용 목록 우회와 숫자 검증의 추가 입력에서도 새 결함을 확인하지 못했다.

| 등급 | 현재 미해결 건수 | 판정 |
|---|---:|---|
| Critical | 0 | 이번 범위에서 확정한 항목 없음 |
| Important | 0 | 이전 R-I-1·R-I-2 수정 확인 |
| Minor | 0 | 이전 R-M-1 정정 확인 |

아래는 실행한 입력과 관측 결과다. 테스트 통과만으로 결함이 없다고 판단하지 않았으며, 직접 실행과 정적 판독을 구분했다. 이전 판정과 재현 입력은 아래 역사적 기록에 그대로 보존했다.

## R-I-1: 표 칸 요소 허용 목록

**위치:** `packages/core/src/types/type26.ts:59`~`:90`.

### 이전 입력 재현 — 직접 실행

```html
<div class="cms-container">
  <section class="cms type26"><div class="cms-inner">
    <table class="cms-table"><tbody><tr>
      <td><section><p>FIRST</p><p>SECOND</p></section></td>
    </tr></tbody></table>
  </div></section>
</div>
```

내부 `section`을 `article`로 바꾼 입력도 실행했다.

- 기대: 문단 경계를 보존하거나 섹션 fallback. 경고 없는 `FIRSTSECOND` 출력은 허용하지 않음.
- 실제: 두 입력 모두 `success`, fallback 0, `<td>FIRST<br>SECOND</td>` 출력. Chromium `innerText`는 원본 `FIRST\n\nSECOND`, 출력 `FIRST\nSECOND`로, 줄 경계가 남는다. 이전에 수용한 문단 여백 차이는 유지된다.
- 판정: **수정 확인**.

### 허용 목록 누락·우회 입력 — 직접 실행

표 칸 변환 관련 **76개 입력**을 추가로 실행했다.

| 입력군 | 구체적 입력 | 기대·실제 결과 |
|---|---|---|
| 허용 블록 10종 | `p`, `div`, `section`, `article`, `aside`, `header`, `footer`, `main`, `nav`, `address`를 FIRST/SECOND 각각에 적용 | `FIRST<br>SECOND`, fallback 없음 |
| 블록 중첩 | p를 제외한 위 상자 내부에 `<div><p>FIRST</p></div><section><p>SECOND</p></section>` | 두 문단 사이 `<br>` 유지 |
| 줄 안 요소 12종 | `em`, `strong`, `b`, `i`, `u`, `sup`, `sub`, `span`, `a`, `small`, `mark`, `font`에 FIRST를 넣고 `<br>SECOND` 연결 | 두 값 유지, 오류 fallback 없음 |
| 줄 안 요소 내부의 블록 | 위 12종 각각에 `<section><p>FIRST</p><p>SECOND</p></section>` 삽입 | 경계 손실을 성공으로 처리하지 않음: fallback 또는 HTML 파서 복구 후 경계 유지 |
| 허용 목록 밖 요소 28종 | `ul`, `ol`, `dl`, `h1`, `h6`, `blockquote`, `pre`, `figure`, `hr`, `details`, `fieldset`, `button`, `select`, `textarea`, `ruby`, `wbr`, `kbd`, `samp`, `code`, `label`, `summary`, `dialog`, `svg`, `math`, `x-box`, `template`, `script`, `style`와 문단 조합 | 모두 섹션 fallback 및 `LOSSY_PARSE` |
| 혼합·이미지·링크 5종 | `FIRST<section><p>SECOND</p></section>`, `<section>FIRST<p>SECOND</p></section>`, `<p>FIRST</p><br><p>SECOND</p>`, `FIRST<img src="/img.png">SECOND`, `<a href="javascript:alert(1)">FIRST</a>SECOND` | 앞 4개는 fallback, 링크는 텍스트를 유지한 변환 |

**정적 판독:** 허용 목록 밖의 모든 후손 요소를 먼저 검사한다. 허용 블록은 재귀적으로 따라 내려가고, 블록이 직접 자식에 없더라도 후손에 숨어 있으면 fallback 사유를 남긴다. 블록과 바깥 텍스트가 섞이면 변환을 거부한다. 따라서 특정 미지원 태그가 차단 목록에 빠졌다는 이유로 조용히 풀리는 이전 경로는 제거됐다.

`code`, `kbd`, `samp`, `wbr` 같은 줄 안 요소도 현재 목록에서는 빠져 있지만, 이 경우는 텍스트를 조용히 잃는 대신 fallback으로 보존한다. 변환 지원 범위가 보수적인 것이므로 이번 검수에서 결함으로 세지 않았다. `a`, `small`, `mark`, `font`, `img`는 칸 구조 검사 통과와 최종 rich text 보존 여부가 같지 않다. 최종 서식 허용 목록과 이미지 누락 검사도 적용되는 것을 함께 대조했다.

## R-I-2: 숫자 입력 정규화와 예외 격리

**위치:** `packages/core/src/schema/page.ts:12`~`:15`, `packages/core/src/types/type26.ts:17`~`:25`, `packages/core/src/types/type09.ts`·`type25.ts`의 `perRow`, `packages/core/src/page/render-page.ts:77` 이후 검증 처리.

### 이전 JSON 입력 — 직접 실행

이전 문서의 JSON 모델을 그대로 사용했다. 정상 type11 섹션(`KEEP_VISIBLE`)과 아래 type26 데이터가 있는 잘못된 섹션을 함께 넣었다.

```json
{ "body": [{ "cells": [{ "text": "X", "rowspan": { "toString": "x" } }] }] }
```

동일한 `rowspan`을 `false`로 바꾼 모델도 실행했다. 원본 전체 JSON은 아래 이전 검수 기록의 R-I-2에 있다.

- 기대: `INVALID_DATA`, 잘못된 섹션만 fallback, 정상 섹션 유지. 예외와 `false → 0` 변환 없음.
- 실제 코어: 두 모델 모두 `INVALID_DATA`, fallback 1, `KEEP_VISIBLE` 유지.
- 실제 Chromium 웹: JSON 가져오기 후 해당 섹션의 데이터 검증 오류를 표시하고 정상 섹션 HTML을 유지. 전체 미리보기가 빈 문자열이 되지 않음.
- 판정: **수정 확인**.

### 숫자 필드 추가 입력 — 직접 실행

type26 `colspan`·`rowspan`, type09·25 `perRow`에 대해 **96개 조합**을 실행했다. 잘못된 섹션 앞뒤에 정상 섹션을 두고 둘 다 출력되는지도 검사했다.

| 입력군 | 입력 | 기대·실제 결과 |
|---|---|---|
| 잘못된 타입 | `false`, `true`, `[]`, `[2]`, `{ "toString": "x" }`, `{ "valueOf": "x" }` | 4개 필드 모두 `INVALID_DATA`, 해당 섹션 fallback |
| 잘못된 숫자 문자열 | `"0x10"`, `"1e0"`, `"2foo"`, `"-1"`, `"2.0"`, 공백만 있는 문자열 | 4개 필드 모두 거부 |
| 잘못된 숫자 | `NaN`, `Infinity`, `2.5`, `100000` | 거부. NaN/Infinity는 JSON이 아닌 코어 직접 호출로 검사 |
| 병합 경계 | colspan 0·1001, rowspan 65535 | 거부 |
| 허용 병합 값 | colspan 1·2·1000, rowspan 0·1·65534 및 해당 숫자 문자열·앞뒤 공백 | 수용, 1은 병합 속성 생략 |
| 비움 값 | 병합의 `undefined`·`""`·`null`, perRow의 `undefined` | 병합 없음 또는 기본 perRow 적용 |
| perRow 범위 | type09 1·`" 2 "`·3, type25 3·`" 4 "` | 수용 |
| perRow 비정상 비움 | `null`, `""` | 거부 |

모든 잘못된 조합에서 `INVALID_DATA` 및 해당 섹션 fallback을 확인했으며, 앞뒤 정상 섹션의 `KEEP_VISIBLE`·`AFTER_VISIBLE`이 유지됐다.

**정적 판독:** `toNumberInput`은 숫자 또는 공백으로 감싼 ASCII 숫자 문자열만 변환한다. 배열·객체·boolean에는 `Number()`를 호출하지 않는다. 부호·지수·소수 문자열을 거부하는 정책은 반영 기록과 일치하며, 이 함수가 쓰이는 필드는 모두 정수 범위/선택값 필드다. 변환 후 범위 검증은 각 스키마가 담당한다.

### 스키마 전처리 예외 — 직접 실행·정적 판독

임시 레지스트리에 예외를 던지는 스키마를 등록하고 `renderPage()`를 실행했다. `Error('boom')`, 문자열 `'boom'`, `null`을 던지는 3종 모두 해당 섹션만 `INVALID_DATA` 및 fallback으로 처리하고 앞뒤 정상 섹션을 출력했다.

정적 판독상 try/catch의 범위는 `schema.safeParse()` 및 검증 실패 메시지 구성이다. 이번 방어는 **스키마 검증 예외 격리**이며, 타입 renderer 내부에서 던지는 모든 예외까지 격리하는 기능으로 확대 해석하지 않았다.

## R-M-1: 테스트 개수 정정

**위치:** `docs/review-stage3-fixes.md` 2장과 4장.

- 재현 입력: 문서의 이전/현재 테스트 집계 대조 및 대상 커밋에서 전체 `npm test`.
- 기대: 86e0cec 결과는 294 passed / 1 skipped, 이번 26개 추가 후 320 passed / 1 skipped.
- 실제: 2장의 이전 값이 294로 정정됐고, 4장은 이번 결과를 320으로 구분한다. 직접 실행 결과도 **320 passed / 1 skipped**.
- 판정: **정정 확인**. 본문 중 “3장의 개수”라는 표현은 실제로는 2장의 수치를 가리키지만, 정정된 값과 검증 이력은 명확하므로 별도 결함으로 집계하지 않았다.

## 검증 결과와 범위

| 직접 실행 | 결과 |
|---|---|
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm test` | 종료 0, 320 passed / 1 skipped, 파일 25 passed / 1 skipped |
| 같은 환경의 `npm run test:browser` | 종료 0, 45 passed, 파일 4 passed |
| `npm run lint` | 종료 0 |
| `npm run typecheck` | 종료 0 |
| 별도 표 셀·숫자·예외 재현 | 76개 / 96개 / 3종, 예상 결과 확인 |
| 이전 R-I-1·R-I-2 실제 Chromium 검사 | 문단 경계 유지, 잘못된 JSON 격리 및 정상 섹션 유지 |

- 전체 테스트에 브라우저 검사가 포함되므로 320과 45를 합산하지 않는다. inventory 1개 건너뜀은 운영 `cms/` 부재에 따른 기존 조건이다.
- Linux, Node v24.22.1, 시스템 Chromium 156.0.8078.79 사용. 기존 임시 Playwright 경로를 사용했고 저장소의 테스트·런처를 변경하지 않았다. Windows 및 실제 운영 CMS는 이번에 실행하지 않았다.
- type15 문단 순서 정규화와 문단 여백 차이에 대한 이전 제한사항은 유지된다. type15 원문 입력에서도 누락 없이 목록→문단 순서로 출력되는 것을 다시 확인했다.
- 임시 재현 입력·스크립트·로그는 `/tmp/stage3-third/`, 공식 테스트 로그는 `/tmp/stage3-third-*.log`에 있다. 임시 경로는 저장소 산출물이 아니며, 재현 방법·입력군·관측 결과는 이 문서에 기재했다.

## 역사적 검수 기록 보존

아래는 `86e0cec` 재검수 결과와 그 안에 보존된 최초 검수 원문이다. 과거 Important 2 / Minor 1 또는 Important 4는 **현재 미해결 건수가 아니다.** 현재 판정은 이 문서 상단을 따른다.

<details>
<summary>이전 재검수 원문 — 86e0cec / 보고 커밋 0aea169</summary>

# 3단계 P2·P3 재검수 결과

- 검수일: 2026-11-15.
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `86e0cec6e92a24a70f9478d11576f37b9a64cc9d`.
- 재검수 범위: `9c3ccd5..86e0cec`. 기준 문서: `docs/review-stage3-fixes.md`, `docs/review-request-stage3.md`, 아래 부록의 최초 검수 원문.
- 애플리케이션·테스트·fixture 코드는 수정하지 않았다. 이 문서만 변경했다.

## 판정

**수정 후 재확인 필요.** 최초 4건의 구체적 재현 입력에서는 수정 효과를 확인했다. 다만 표 셀 경계 보존의 잔여 사례와 병합 값 정규화에서 생긴 검증 회귀가 남는다.

| 등급 | 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 이번 검수에서 확정한 항목 없음 |
| Important | 2 | R-I-1 문단 경계 소실 잔여, R-I-2 잘못된 JSON 병합 값의 강제 변환·전체 렌더 실패 |
| Minor | 1 | R-M-1 반영 기록의 테스트 통과 개수 불일치 |

아래 결함은 모두 **직접 실행하여 재현**했다. 코드 원인 설명은 별도로 정적 판독임을 표시했다. Critical 0은 모든 입력·환경의 무결함을 의미하지 않는다.

## 최초 재현 입력과 반영 내용 대조

최초 검수 원문을 작업 공간에서 회수하여 부록에 그대로 보존했다. HTML 코드 블록을 직접 추출해 다시 실행했고, I-4는 이전과 같은 실제 편집기 필드를 비웠다. 요약만으로 대조하지 않았다.

| 최초 항목 | 원문 입력과 이번 결과 | 판정 |
|---|---|---|
| I-1 type15 문단 누락 | 원문은 `CARD → EXTRA_PARA 문단 → BULLET 목록` 순서. 현재 두 값 모두 데이터·HTML에 있고 누락 없음. 다만 출력 순서는 `CARD → BULLET → EXTRA_PARA` | 누락 수정 확인. 반영 기록의 테스트와 원문의 요소 순서는 같지 않음. 순서 판단은 아래 참조 |
| I-2 type26 병합 | 원문의 `colspan="21"`, `rowspan="0"`은 해당 값 유지. `colspan="0x10"`, `colspan="2foo"`는 `LOSSY_PARSE` 및 섹션 fallback | 원문의 4가지 사례 수정 확인. 기록의 25와 원문의 21은 숫자가 다르지만 같은 원인이고, 21도 직접 확인 |
| I-3 type26 문단·목록 | 원문의 `<p>FIRST</p><p>SECOND</p><ul><li>THIRD</li><li>FOURTH</li></ul>` 셀은 `LOSSY_PARSE` 및 섹션 fallback으로 원본 HTML 보존 | 원문 사례 수정 확인. 목록 없는 직접 p/div 문단은 `<br>`로 구분. 다른 래퍼의 잔여 사례는 R-I-1 |
| I-4 빈 글 편집 | 실제 Chromium에서 type26 `body.0.cells.0.text`, type09·07 `items.0.text`를 비우고 JSON 저장·재로드·브라우저 새로고침 | `INVALID_DATA`와 오류 fallback 없음. 원문 3개 필드 수정 확인 |

HTML 사례가 섹션 하나뿐이고 그 섹션을 fallback 처리하면 변환 상태는 `failed`, fallback 수는 1이다. 위 I-2/I-3의 해당 결과는 누락을 성공으로 처리하는 대신 원본을 보존하는 의도된 동작이다.

## Important

### R-I-1. section/article로 감싼 표 셀의 문단 경계가 여전히 경고 없이 사라짐

- 위치: `packages/core/src/types/type26.ts:55`, `:62`~`:75`, 특히 `:68`~`:69`. 최초 I-3의 잔여 사례.
- 확인 방식: **직접 실행** — 코어 HTML 변환 및 Chromium 원본/출력 `innerText` 비교. **정적 판독** — 직접 자식 p/div가 없으면 `richFrom()`으로 넘기고, 그 안의 문단을 구분하는 처리를 거치지 않는다.
- 재현 입력(HTML 변환에 그대로 전달):

```html
<div class="cms-container">
  <section class="cms type26"><div class="cms-inner">
    <table class="cms-table"><tbody><tr>
      <td><section><p>FIRST</p><p>SECOND</p></section></td>
    </tr></tbody></table>
  </div></section>
</div>
```

- 실제: `status="success"`, diagnostics `[]`, fallback 0. 셀 데이터는 `FIRSTSECOND`, 출력은 `<td>FIRSTSECOND</td>`. Chromium `innerText`도 원본 `FIRST\n\nSECOND`에서 출력 `FIRSTSECOND`로 변한다. 내부 `section`을 `article`로 바꾸어도 동일하다. 표 셀에서 유효한 flow content를 사용한 사례다.
- 기대: 두 문단 사이를 `<br>` 등으로 보존하거나, 지원하지 않는 구조라면 `LOSSY_PARSE`를 남기고 섹션 fallback으로 보존해야 한다. 경계 소실을 성공으로 처리하면 안 된다.
- 영향: 반영 기록의 “중첩 포함” 문단 보존은 p/div만 통과하는 중첩에 한정된다. 다른 래퍼 안의 문단은 여전히 읽기 경계가 합쳐진다.

### R-I-2. 병합 값의 Number 강제 변환이 잘못된 JSON을 받아들이고 전체 미리보기를 중단시킴

- 위치: `packages/core/src/types/type26.ts:17`~`:21`. 호출 지점 `packages/core/src/page/render-page.ts:77`; 웹의 전체 렌더 예외 처리 `apps/web/src/App.tsx:37`~`:42`.
- 확인 방식: **직접 실행** — 아래 모델을 이전 `9c3ccd5`와 현재 `86e0cec`의 공개 `renderPage(model, { registry: defaultRegistry })`에 각각 전달. 현재 웹에서도 JSON 가져오기로 재현했다. **정적 판독** — `z.preprocess`가 타입 검사 전에 모든 값에 `Number(v)`를 호출한다. 전처리 중 예외는 `safeParse()`의 검증 실패 결과로 바뀌지 않는다.
- 재현 입력(웹 JSON 가져오기로도 사용):

```json
{
  "version": 1,
  "theme": { "primary": "#164aa0", "source": "default" },
  "sections": [
    {
      "id": "good", "type": "type11", "variant": "default", "modifiers": {},
      "data": { "heading": "KEEP_VISIBLE", "items": [{ "text": "GOOD" }] }
    },
    {
      "id": "bad", "type": "type26", "variant": "default", "modifiers": {},
      "data": { "body": [{ "cells": [{ "text": "X", "rowspan": { "toString": "x" } }] }] }
    }
  ],
  "diagnostics": [],
  "meta": { "coreVersion": "review", "hostCss": { "sha256": "x", "savedAt": "y" } }
}
```

- 실제: 현재 코어는 `TypeError: Cannot convert object to primitive value`를 던진다. 웹은 `렌더 실패: Cannot convert object to primitive value`를 표시하고 출력 HTML 전체를 빈 문자열로 만든다. 정상인 첫 섹션의 `KEEP_VISIBLE`도 사라진다.
- 같은 입력의 `rowspan` 값만 바꾼 비교:

| 값 | 이전 9c3ccd5 | 현재 86e0cec |
|---|---|---|
| `{ "toString": "x" }` | `INVALID_DATA`, 잘못된 섹션만 fallback, 정상 섹션 유지 | 예외 발생, 웹 전체 미리보기 비어 있음 |
| `false` | `INVALID_DATA`, 잘못된 섹션만 fallback | 경고 없이 `rowspan="0"`으로 출력(행 그룹 끝까지 병합) |
| `[2]` | `INVALID_DATA`, 잘못된 섹션만 fallback | 경고 없이 숫자 2로 수용 |

- 기대: 의도한 숫자·숫자 문자열과 비움 값만 정규화하고, boolean·배열·객체는 `INVALID_DATA`로 거부해야 한다. 잘못된 한 섹션은 fallback으로 격리하여 정상 섹션을 계속 출력해야 한다.
- 영향: 외부 JSON의 잘못된 타입이 표 의미를 바꾸거나 전체 미리보기를 중단한다. 일반 문자열을 숫자로 받는 개선과 달리, 이번 수정으로 생긴 검증 회귀다.

## Minor

### R-M-1. 반영 기록의 전체 테스트 개수가 실제 결과와 다름

- 위치: `docs/review-stage3-fixes.md:40`.
- 확인 방식: **직접 실행** — 대상 커밋에서 전체 `npm test` 실행.
- 재현 입력: 변경 없는 대상 커밋에서 `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm test`.
- 실제: 문서는 `293 passed · 1 skipped`, 이번 실행은 **294 passed · 1 skipped (295)**. 추가 테스트 46개+1개와 이전 247개를 합쳐도 294개다.
- 기대: 반영 기록의 숫자를 실제 결과에 맞춰 정정. 테스트 자체 실패는 아니다.

## 반영 기록 3장: 남은 판단에 대한 의견

### type15의 문단·목록 순서

원문의 문단 선행 입력을 직접 확인했다. Chromium 텍스트 순서가 `CARD → EXTRA_PARA → BULLET`에서 `CARD → BULLET → EXTRA_PARA`로 바뀐다. 따라서 **누락은 해결했지만 원본 순서까지 보존한 것은 아니다.**

현재 UI가 문단을 “글머리 아래”로 명시하고, 출력 모델이 원본 DOM 전체를 보존하는 것이 아니라 호스트 프리셋에 맞춰 재구성하는 점을 고려하면, 이번 누락 수정의 범위에서는 **문서화된 순서 정규화라는 제한으로 수용 가능**하다고 판단한다. 별도 결함 건수로 중복 집계하지 않았다. 다만 원문의 문단 선행 입력을 그대로 옮겼다고 보고해서는 안 되며, 순서에 의미가 있는 자료까지 동등하게 지원하려면 순서 보존 또는 경고/fallback이 필요하다. “원본 도구는 둘 중 하나만 만든다”는 주장은 실제 운영 CMS에서 검증하지 않았으므로 판단 근거로 확정하지 않았다.

### 표의 여러 문단을 br로 연결

직접 자식 p/div 및 p/div 중첩의 문단 구분이 `<br>`로 남는 것을 실행 확인했다. 문단 간 여백은 달라지지만 최초 I-3도 문단 경계 보존 방법으로 `<br>`를 허용했다. 호스트 프리셋으로 옮기는 현재 범위에서는 **수용 가능**하다. 목록 등 표현할 수 없는 구조를 fallback으로 보존하는 처리도 타당하다. 다만 R-I-1처럼 경계 자체가 없어지는 경우는 이 허용 범위에 포함되지 않는다.

## 실행한 검증 및 한계

| 검증 | 결과 |
|---|---|
| `npm test` | 종료 0, 294 passed / 1 skipped, 파일 25 passed / 1 skipped |
| `npm run test:browser` | 종료 0, 45 passed(4파일) |
| `npm run lint` | 종료 0 |
| `npm run typecheck` | 종료 0 |
| 최초 원문 HTML 재현 | I-1, I-2의 4가지 병합 값, I-3을 다시 실행 |
| 실제 웹 편집·JSON 저장/가져오기·새로고침 | P2/P3 11타입 모두 편집 값 및 재로드 후 출력 유지. 최초 I-4의 3개 필드 비우기 재확인 |
| 추가 재현 | R-I-1 원본/출력 Chromium 텍스트, R-I-2 이전/현재 코어 비교 및 실제 웹 JSON 가져오기 |

- `npm test`에 브라우저 검사가 포함되므로 294와 별도 실행한 45를 합산하지 않는다. 건너뜀은 운영 `cms/` 부재에 따른 inventory 검사다.
- Linux, Node v24.22.1, Chromium 156.0.8078.79에서 실행했다. 브라우저 실행은 설치된 Chromium을 임시 Playwright 브라우저 경로에 연결하여 사용했으며 저장소 런처·테스트는 수정하지 않았다.
- 이번 실행에서 Windows 환경이나 실제 운영 CMS를 재검증하지 않았다. 대상 범위 밖의 이전 판정은 아래 역사적 기록이며 이번 재검수 결과로 대체하지 않는다.
- 임시 재현 스크립트·로그·스크린샷은 작업 공간의 `/tmp/stage3-recheck/`에 보관했다. 이 경로는 저장소 산출물이 아니므로, 재현에 필요한 입력과 관측 결과는 위에 직접 실었다.

## 부록: 최초 검수 원문 보존

아래는 `9c3ccd5` 기준 최초 검수 문서의 원문이다. **역사적 판정(Important 4)이며 현재 판정은 위의 Important 2 / Minor 1이다.** 원문의 재현 입력을 저장소에서 확인할 수 있도록 보존했다.

<details>
<summary>최초 검수 원문 — 9c3ccd5</summary>

# 3단계 P2·P3 검수 결과

- 검수일: 2026-11-15 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 체크아웃 HEAD: `9c3ccd574ce921590971b7b1a04715027a57f049`.
- 코드 검수 범위: `0120908..c42b99e` — 4커밋, 85파일, +3827/−31. `c42b99e..9c3ccd5`는 검수 요청서 추가만 있으며 코드 차이는 없다.
- 기준: `docs/review-request-stage3.md`, P2/P3 기록, 호스트 DOM 계약, 구현 계획서의 3단계 DoD. 요청서가 인정한 원본 CMS·CSS 부재와 장식 SVG 제외는 결함으로 세지 않았다.
- 변경: **애플리케이션·테스트·fixture 코드를 수정하지 않았다. 이 검수 문서만 추가했다.**

## 판정 요약

| 등급 | 건수 | 판정 |
|---|---:|---|
| Critical | 0 | 이번 검수에서 확정한 항목 없음 |
| Important | 4 | 아래 I-1~I-4 수정 후 재확인 필요 |
| Minor | 0 | 별도 확정 항목 없음 |

기존 자동 테스트는 통과하지만, 추가 입력과 실제 웹 편집으로 **성공 판정인 출력 누락·표 구조 변경** 및 **유효한 빈 문자열 편집 실패**를 재현했다. 따라서 이번 범위의 완료 판정은 유보한다. Critical 0은 보안이나 모든 가능한 입력에 대한 무결함 보증이 아니다.

## 직접 실행한 검증

환경: Linux, Node `v24.22.1`, npm `11.9.0`, 실제 Chromium `156.0.8078.79`.

```bash
npm ci --cache /tmp/medisiate-npm-cache
PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm test
npm run lint
npm run typecheck
PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm run test:browser
npm run test:browser -- --reporter=dot
```

| 실행 | 실제 결과 |
|---|---|
| `npm ci --cache …` | 성공. 기본 npm 캐시 경로에 쓸 수 없어 최초 설치는 실패했으며, 쓰기 가능한 임시 캐시로 재시도했다. lockfile 변경 없음 |
| `npm test` | **247 passed, 1 skipped**, 종료 코드 0. 건너뛴 inventory는 실제 `cms/`가 필요한 알려진 제한 |
| `npm run lint` | 종료 코드 0 |
| `npm run typecheck` | 종료 코드 0 |
| `npm run test:browser` | **45 passed**, 종료 코드 0. 브라우저 테스트 건너뜀 없음 |
| `npm run test:browser -- --reporter=dot` | 추가 인자 거부 메시지와 **종료 코드 2** |

브라우저 준비 전 최초 `npm test`에서는 Playwright가 기대한 Chromium headless-shell 경로가 없어 브라우저 4개 suite의 setup이 실패했다. 테스트·런처 소스는 고치지 않고 `/tmp/stage3-pw-browsers`의 revision `1234` 실행 경로에 설치된 `/usr/bin/chromium`을 연결했다. 위 결과는 이 환경 설정 후 재실행한 최종 결과다. 모의 브라우저를 사용하거나 테스트를 비활성화하지 않았다. `npm test`에도 브라우저 테스트가 포함되므로 247과 45는 서로 독립인 테스트 개수로 합산하지 않는다.

추가 재현은 저장소 밖 `/tmp/stage3-review/`의 스크립트와 임시 입력·출력으로 실행했다. 아래 입력과 절차는 이 임시 파일 없이도 재현할 수 있도록 적었다.

## Critical

확정 항목 없음.

## Important

### I-1. type15: 글머리와 문단이 함께 있으면 문단이 경고 없이 출력에서 빠짐

- **검증 구분:** 직접 실행 — `convertDocument`, CLI 명령 함수 `runConvert`, 실제 Chromium의 원본/변환 후 `innerText` 비교. 원인은 소스 정적 판독으로 확인.
- **위치:** `packages/core/src/types/type15.ts:59`, `:63`, `:76`; 손실 검사의 연관 위치는 `packages/core/src/parse/original.ts:74`.
- **재현 입력:** `.cms-description-box` 안에 글머리와 문단을 함께 넣는다.

```html
<div class="cms-container">
  <section class="cms type15"><div class="cms-inner">
    <ul class="cms-column-list"><li class="cms-list-item">
      <div class="cms-description-box">
        <p class="cms-title">CARD</p>
        <p class="cms-description">EXTRA_PARA</p>
        <ul class="cms-bullet-list"><li class="cms-list-item">
          <p class="cms-description">BULLET</p>
        </li></ul>
      </div>
    </li></ul>
  </div></section>
</div>
```

- **실제 결과:** `status="success"`, `fallbackCount=0`, `diagnostics=[]`. 데이터에는 `desc: "EXTRA_PARA"`가 있지만 출력 HTML에는 없다. Chromium의 원본 텍스트는 `CARD\n\nEXTRA_PARA\n\nBULLET`, 변환 후에는 `CARD\nBULLET`이다. 임시 CMS 루트에 같은 입력을 넣고 `runConvert(root, ['--all', '--fail-on', 'warn'])`를 실행해도 종료 코드 0이며 파일 보고서는 `success 1 / partial 0 / failed 0`이다.
- **기대 결과:** 문단·글머리를 모두 출력하거나, 이 조합을 지원하지 않는다면 `LOSSY_PARSE`와 fallback으로 원본 내용을 보존해야 한다. 데이터 JSON에만 남아 있다는 이유로 실제 출력 누락을 성공 처리하면 안 된다.
- **원인(정적 판독):** 파서는 `desc`와 `subitems`를 모두 `used`에 넣는다. 렌더러는 `subitems.length > 0`이면 `desc`를 배제한다. `finish()`는 데이터로 읽었는지만 검사하므로 이 분기 손실을 감지하지 못한다.
- **원본 fixture 변형으로도 확인:** `fixtures/original/type15.html`의 첫 `칸 1` 제목 뒤에 위 문단을 추가해 같은 결과를 재현했다. 이미지 URL만 `https://example.invalid/images/…`로 바꿔 기존 `IMAGE_RELATIVE` 진단을 분리했으며, 결과는 여전히 진단 없는 `success`였다.

### I-2. type26: 셀 병합값을 조용히 삭제하거나 브라우저와 다르게 해석함

- **검증 구분:** 직접 실행 — 변환 결과와 실제 Chromium의 원본 `colSpan`/`rowSpan` 값을 확인. 원인은 정적 판독으로 확인.
- **위치:** `packages/core/src/types/type26.ts:11`, `:27`, `:35`.
- **재현 입력:** 다음 표의 첫 `<td>`에 아래 속성들을 각각 적용한다. `rowspan="0"`은 두 행 입력으로 검사했다.

```html
<div class="cms-container">
  <section class="cms type26"><div class="cms-inner">
    <table class="cms-table"><tbody>
      <tr><td colspan="21">CELL</td><td>SECOND</td></tr>
      <tr><td>THIRD</td></tr>
    </tbody></table>
  </div></section>
</div>
```

| 첫 셀 속성 | 원본 Chromium 속성값 | 변환 데이터·HTML |
|---|---:|---|
| `colspan="21"` | `colSpan=21` | 병합 필드·속성 삭제 |
| `rowspan="0"` | `rowSpan=0` — 남은 행 전체 병합 | 병합 필드·속성 삭제 |
| `colspan="0x10"` | `colSpan=1` | `colspan: 16`, 출력 `colspan="16"` |
| `colspan="2foo"` | `colSpan=2` | 병합 필드·속성 삭제 |

- **실제 결과:** 모두 `status="success"`, `fallbackCount=0`, `diagnostics=[]`. `1000000`처럼 큰 값도 진단 없이 삭제된다. `fixtures/original/type26.html`의 `내용 1` 셀에 `colspan="21"`을 넣은 경우도 진단 없는 성공으로 속성이 사라졌다.
- **기대 결과:** 지원하는 유효한 병합은 보존해야 한다. 상한이나 표현 제약으로 지원하지 못하면 명시적인 경고와 원본 보존/fallback이 필요하다. 비정상 표기를 브라우저 원본과 다른 병합값으로 조용히 확대해서는 안 된다. 특히 `rowspan=0`은 단순한 잘못된 숫자가 아니라 HTML에서 의미가 있는 값이다.
- **원인(정적 판독):** `Number(attr(...))`를 사용한 뒤 2~20 밖의 값을 `undefined`로 만들며 진단하지 않는다. 이 때문에 `21`·`0`은 사라지고 `0x10`은 16으로 변한다. 안전한 상한 자체가 문제라는 지적이 아니라, **지원 범위를 벗어난 원본을 성공으로 변경하는 것**이 문제다.

### I-3. type26: 셀 안의 여러 문단·목록 경계가 없어져 단어가 붙음

- **검증 구분:** 직접 실행 — core 변환 및 실제 Chromium `innerText` 비교. 정적 판독으로 평탄화 위치 확인.
- **위치:** `packages/core/src/types/type26.ts:38`; 연관 처리 `packages/core/src/html/rich-text.ts:93`, `packages/core/src/parse/common.ts:128`, `packages/core/src/parse/original.ts:74`.
- **재현 입력:** 위 type26 표의 한 셀 내용을 다음으로 바꾼다. 원본 `fixtures/original/type26.html`의 `내용 1` 셀을 바꾸는 방법으로도 확인했다.

```html
<td><p>FIRST</p><p>SECOND</p><ul><li>THIRD</li><li>FOURTH</li></ul></td>
```

- **실제 결과:** `status="success"`, `fallbackCount=0`, `diagnostics=[]`. 데이터의 셀 `text`와 출력 모두 `FIRSTSECONDTHIRDFOURTH`가 된다. 실제 Chromium에서 원본은 `FIRST\n\nSECOND\n\nTHIRD\nFOURTH`, 출력은 `FIRSTSECONDTHIRDFOURTH`였다. 셀 안에서 문단·목록이 구분되던 내용이 한 문자열로 붙는다.
- **기대 결과:** allowlist 태그만 출력하더라도 `<br>` 등으로 내용 경계를 보존하거나, 구조를 보존할 수 없으면 경고와 fallback이 필요하다. 태그 제거 정책이 문단·목록 항목 사이의 구분까지 무통보로 지워서는 안 된다.
- **원인(정적 판독):** `richFrom(c)`는 허용하지 않는 블록 태그를 구분자 없이 해체한다. `finish()`의 텍스트 비교도 블록 경계를 검증하지 않아 이를 손실 없는 변환으로 판정한다. sanitizer 공통 함수는 이번 범위의 변경 파일이 아니지만, P3에서 추가한 type26의 셀 변환이 이 문제를 노출한다.

### I-4. 웹 편집기: 빈 셀·항목 글을 만들면 유효한 빈 문자열 대신 키가 삭제되어 fallback

- **검증 구분:** 직접 실행 — 빌드한 웹 앱을 실제 Chromium에서 조작하고 재로드했다. type26 스키마가 `text: ''`를 허용하는 것도 별도로 직접 확인했다.
- **위치:** `apps/web/src/FieldForm.tsx:57`(`text` 입력은 `:48`도 동일), 새 타입의 필수 문자열 선언 `packages/core/src/types/type26.ts:12`, `packages/core/src/types/type07.ts:15`, `packages/core/src/types/type09.ts:15`.
- **재현 입력·절차:**
  1. `fixtures/original/type26.html`을 `convertDocument`로 JSON으로 변환하고 웹 앱의 **JSON 불러오기**로 연다.
  2. 첫 본문 셀의 **글**(`id="body.0.cells.0.text"`, 원본 값 `행 1`)을 모두 지운다.
  3. HTML 소스·진단을 확인하고 페이지를 재로드한다.
  4. type09 및 type07도 첫 항목의 글(`id="items.0.text"`)을 모두 지우면 같은 현상이다.
- **실제 결과:** type26은 `body.0.cells.0.text Invalid input: expected string, received undefined`로 전체 섹션이 fallback 렌더링된다. type09·type07도 `items.0.text`에서 동일한 오류다. localStorage의 해당 객체에서 `text` 키가 없어지고 재로드 후에도 오류가 유지된다. 의도한 빈 셀을 정상 표로 렌더링할 수 없다.
- **기대 결과:** 빈 셀은 `text: ''`로 유지되어 정상 렌더링·저장·다시 불러오기가 가능해야 한다. 실제 type26 스키마는 `{body:[{cells:[{text:'',th:false}]}]}`를 정상으로 허용한다.
- **원인(정적 판독):** 폼의 `e.target.value || undefined`가 빈 문자열을 `undefined`로 바꾸고 reducer `setIn()`은 키를 삭제한다. `FieldForm` 자체는 기존 코드이지만 새 타입이 `z.string()` 필수 필드를 사용하는 조합이 기존 폼과 호환되지 않는다. 기본 문자열 입력·코어의 문자열 coercion 테스트만으로는 이 실제 UI 경로를 발견하지 못한다.

## Minor

별도 확정 항목 없음. I-1~I-4의 회귀 테스트 보강은 각각의 수정 후 재확인 대상으로 묶으며 중복된 Minor로 세지 않았다.

## 나머지 요청 항목 대조 및 한계

### 직접 실행한 추가 확인

- **정상 웹 편집·저장·재열기:** P2/P3 11개 타입 모두 한 필드를 실제로 고치고 **JSON 저장 → JSON 불러오기** 및 브라우저 재로드 후 같은 HTML이 나오는지 확인했다. type09는 `perRow='1'`, type25는 `perRow='3'`, type26은 `colWidths[0].width='40%'`; 나머지 8개는 `heading`을 변경했다. 이 정상 입력들은 모두 유지됐다. 이는 모든 중첩 필드·이미지 편집 조합을 전수 검증했다는 뜻은 아니다. 별도로 빈 문자열은 I-4에서 실패했다.
- **중간 삽입:** 원본 11개 타입의 적용 가능한 `</li>`, 설명 상자 끝, `</td>` 앞에 고유 문단 또는 HTTPS 이미지 하나를 넣는 **42가지**를 실행했다. 41개는 fallback, 1개는 셀 글에 편입됐고 고유 텍스트/이미지 표식의 출력 누락은 없었다. 다만 글머리와 문단의 동시 존재(I-1), 셀의 문단·목록 경계(I-3)는 별도 입력으로 검출됐다.
- **type26 열 너비:** `30%; position: fixed`, `calc(30% + 1px)`, `30%/*x*/`, 공백 있는 ` 30% `, `30PX`, `1e9px`는 스키마 거부, `0`·`auto`·`10rem`은 허용됨을 직접 확인했다. 실행한 입력에서 선언 주입 우회는 발견하지 못했다.
- **셀 서식·위험 태그:** `em`, `strong`, `b`, `i`, `br`, `span`은 출력에 유지됐고 `onclick`과 `script`에는 제거 진단이 있었다. `iframe`은 출력에서 제거됐다. 기존 sanitizer의 실제 허용 태그에는 `u`, `sup`, `sub`도 포함되며 이 정의는 이번 범위에서 바뀌지 않았다. 보안 입력 전수 검증은 아니다.
- **배치·인라인 보정:** 공식 브라우저 suite의 45개가 통과했다. 여기에는 P2/P3 11개 타입 × PC 1100 / MO 360 / 에디터 1100의 33개 배치 검사가 포함된다. 따라서 검사한 샘플에서는 HALF·LIST_RESET·type10 border-box 때문에 가로 넘침이나 글 칸 찌그러짐이 발생하지 않았다.
- **이미지 배경 실패:** 외부 요청을 차단한 실제 Chromium에서 type11/bg-image-2를 추가 확인했다. PC 1100에서는 section이 투명하고 PC 레이어가 `rgb(24,26,39)`·표시 상태였고, MO 360/에디터 1100에서는 section이 같은 색이며 PC 레이어가 숨겨졌다. 제목은 세 모드 모두 흰색이었다. 기존 suite와 타입 unit test도 PC/MO 배경 동작을 검증한다.
- **M-5:** 추가 인자 `--reporter=dot`의 종료 코드 2를 직접 확인했다. 정상 브라우저 실행도 45개 통과했다.

### 정적 판독을 포함한 판단 / 미실행

- **I-10:** `fileSymlinkSkipReason()`의 조건은 정확히 `platform === 'win32' && code === 'EPERM'`이다. 다른 오류·플랫폼에서 skip 사유를 돌려주지 않으며 `requireFileSymlinks()`는 그 외 오류를 다시 던진다. 이를 검사하는 unit test와 Linux 파일 링크 테스트는 실행됐다. **실제 Windows 머신에서의 EPERM은 실행하지 않았다.** Windows 관련 평가는 조건 판독과 모의 오류 unit test에 한정한다.
- **`countImages()`의 중복:** 현재 11개 타입의 이미지 추출 경로, `pairImages()` 및 `finish()`를 정적으로 대조했다. 단일 이미지가 반응형 출력에 복제되는 것과 별개로 `countImages()`는 렌더 전 데이터 객체를 센다. 이번 삽입 검사에서 중복 때문에 미수집 이미지를 감추는 경우는 재현하지 못했다. 모든 비정형 중첩 구조를 증명한 것은 아니다.
- **고정 배치 info 판단:** type09/perRow, type03/reverse, type25/perRow, type17/titleWidth는 데이터를 보존하면서 호스트 배치를 우선하는 결정이 문서·필드 라벨에 드러나 있다. 이 전제 아래 `PRESET_LAYOUT_FIXED`를 info로 두고 `success`로 남기는 것은 일관적이다. 실제 원본 배치와 동일하다는 판정은 아니며, 원본 배치 완전 재현이 요구되면 정책 재검토가 필요하다.
- **type09 SVG:** 렌더러가 고정 `CHECK` 상수를 `raw()`에 전달하고 원본 SVG 경로를 이 값에 넣지 않는 것을 정적으로 확인했다. 기본 원본의 변환·출력은 unit/browser suite에서 실행됐다. 임의 SVG payload의 모든 조합을 브라우저에서 실행한 것은 아니다.
- **호스트 선택자:** type07 직접 자식 visual, type15 `type-dot`, 공통 header/body 인접 관계는 타입 스냅샷·DOM 경로 unit test와 정적 소스로 대조했다. 배치 suite가 검사하는 속성을 넘어 모든 호스트 선택자의 계산 스타일을 전수 측정하지는 않았다.
- **자료 한계:** 실제 `cms/contents` inventory·대표 표본, 원본 `cms.css` 기반 P2/P3 화면 등급 비교, type00·27·28은 요청서의 한계/범위 밖이다. 이를 새 결함으로 계상하지 않았고, 본 검수로 원본 화면과의 시각 동등성을 인증하지 않는다.

## 재현용 공통 변환 호출

위 최소 HTML 입력을 `input`에 넣고 저장소 루트에서 tsx로 다음 API를 호출하면 상태·데이터·출력을 확인할 수 있다. 동일 공개 core API가 CLI 변환에서도 사용된다.

```ts
import { convertDocument, defaultRegistry } from './packages/core/src/index.ts';

const result = convertDocument(input, 'review.html', {
  registry: defaultRegistry,
  theme: { primary: '#164aa0', source: 'default' },
  coreVersion: 'review',
  hostCss: { sha256: 'x', savedAt: 'y' },
});
console.log(result.status, result.fallbackCount, result.page.diagnostics);
console.log(result.page.sections[0]?.data);
console.log(result.html);
```

## 최종 판정

**수정 후 재확인 필요.** I-1~I-4를 수정한 뒤 해당 입력을 회귀 테스트에 넣고, 기존 unit·lint·typecheck·브라우저 suite를 다시 실행해야 한다. 이번 검수에서는 코드 수정·커밋·푸시를 하지 않았다.

</details>

</details>
