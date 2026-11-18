# 4단계 P5 재검수 결과 — e460cfe

- 검수일: 2026-11-16 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `e460cfe7383bfe0b783953b0c428f476fa93fcb2`.
- 범위: `78065f2..e460cfe`. 반영 기록: `docs/review-stage4-p5-fixes.md` 마지막 장 R-I-1.
- 애플리케이션·테스트·fixture 코드는 수정하지 않았다. 이번 변경은 이 검수 문서뿐이다.

## 판정

**이번 재검수 범위 완료.** 이전 빈 제목 오탐은 수정됐고, 빈 값 제외로 실제 글의 중복 검사가 빠지는 사례는 이번 입력군에서 발견하지 못했다.

| 등급 | 현재 미해결 건수 | 판정 |
|---|---:|---|
| Critical | 0 | 이번 범위에서 확정한 항목 없음 |
| Important | 0 | 이전 R-I-1 수정 확인 |
| Minor | 0 | 별도 확정 항목 없음 |

아래는 직접 실행과 정적 판독의 근거다. 모든 가능한 입력에 대한 무결함을 의미하지 않는다.

## 이전 R-I-1 재현 — 직접 실행

이전 검수의 최소 type18 HTML을 그대로 다시 변환했다.

```html
<div class="cms-container">
  <section class="cms type18"><div class="cms-inner">
    <ol class="cms-img-list">
      <li class="cms-list-item"><div class="cms-visual-text">
        <p class="cms-description"><span class="cms-title"></span>BODY</p>
      </div></li>
    </ol>
  </div></section>
</div>
```

- 기대: 정상 type18 변환, BODY 한 번, 중복 읽기로 인한 fallback 없음.
- 현재 코어: success, diagnostics [], fallback 0.
- 실제 Chromium: 원본과 현재 출력의 표시 글은 모두 BODY. 이전 78065f2 코드의 동일 입력은 LOSSY_PARSE 및 미지원 fallback이었으므로 오탐 해소를 확인했다.

## 빈 값 제외와 실제 중복 방어 — 직접 실행

추가 **64건**을 실행했다.

| 검사 | 입력·기대 | 실제 |
|---|---|---|
| type18 제목 자리표시 8종 | 빈 문자열, 공백, 탭/줄바꿈, &nbsp;, &#160;, br, 빈 strong, 공백 span | 모두 정상 변환, fallback 0, BODY 유지 |
| type18 제목에 글이 있는 7종 | FIRST, 앞뒤 공백, NBSP로 감싼 FIRST, 문자 엔티티로 쓴 FIRST, strong/span 서식, br 뒤 FIRST | 설명과 함께 읽히는 위험 입력은 계속 fallback |
| 같은 요소 두 번 읽기 | 위 빈 값·글 있는 값 15종 | 글 있는 7종만 중복 감지 |
| 부모→자식 포함 읽기 | 같은 15종 | 글 있는 7종만 중복 감지 |
| 자식→부모 포함 읽기 | 같은 15종 | 글 있는 7종만 중복 감지 |
| 최초 P5 I-1 A·B | type22 하위 제목, type24 설명 내부 제목 | 성공 변환, FIRST 한 번씩 |
| 글 없는 지원 불가 구조 2종 | type22 짧은 목록의 빈 중첩 ul, 빈 span 안 section | 둘 다 계속 섹션 fallback |

동일 요소·포함 읽기 검사는 실제 DOM 요소에 richFrom을 호출한 뒤 duplicateReads의 결과를 직접 대조했다. `&#70;IRST`처럼 엔티티로 적힌 글도 비어 있지 않은 값으로 처리된다. 빈 ul이나 숨은 블록의 경우 글자 수가 0이어도 구조 검사가 유지되어, 이번 변경이 지원 불가 구조를 성공으로 통과시키지는 않았다.

추가 기존 방어 검사도 재실행했다.

- 서로 다른 두 요소의 글이 둘 다 FIRST여도 중복으로 취급하지 않음.
- richFrom 한 번 안에서 문단을 나누는 내부 재귀는 중복으로 취급하지 않음.
- 검사 후 읽기 횟수가 정리됨.
- type18·22·24·26의 같은 DOM 객체를 두 번 parse해도 정상 결과·데이터가 유지됨.

## 변경 판독

**정적 판독 위치:** `packages/core/src/parse/common.ts`의 richFrom, readCount 및 duplicateReads. 실제 코드 변경은 richFrom의 읽기 집계 조건에 한정된다.

richFrom은 구조 검사용 readAsText 기록을 먼저 남기고, richInner 결과에서 서식을 걷은 글이 비어 있지 않을 때만 readCount를 증가시킨다. 따라서 빈 제목은 포함 읽기의 텍스트 중복 대상에서 제외하면서도, 읽은 요소의 내부 구조 검사는 유지한다. duplicateReads의 동일 객체·조상 관계 검사와 읽기 횟수 정리 코드는 바꾸지 않았다.

이번에 확인한 P2~P5 글 읽기 경로에서 실제 글이 있는 요소를 빈 값으로 오판해 중복을 놓치는 경로는 찾지 못했다. 공백·NBSP·br만 있는 읽기는 사용자가 지정한 빈 값 정책과 일치한다. 글 없는 서식 요소의 출력 여부를 실제 글의 중복과 동일하게 취급하지 않았다.

## 정상 입력·기존 결과 회귀 — 직접 실행

이전 78065f2 코드를 임시 디렉터리에 펼쳐 현재 코드와 비교했다. 저장소 소스는 바꾸지 않았다.

| 입력군 | 결과 |
|---|---|
| type01 및 P2~P5 24타입 × 원본/무배경/이미지 배경/색 배경 100조합 | HTML 전부 동일 |
| P2~P5 24타입 × 공백/이미지 제거/인라인 서식/문단 변형 96조합 | HTML 전부 동일, 모두 fallback 0 |

일반 변형은 기존 검수와 동일한 방식(공백·탭 추가, img 제거, 첫 해당 글의 strong/br/em 서식, 첫 p.cms-description을 div.cms-description > p+p로 변경)이다. 해당 문단 요소가 없는 타입은 원본을 그대로 대조했다. 이 기본 입력군은 이전에도 정상 변환됐고, 이번에도 새 fallback이 없었다.

## 실행 결과와 한계

| 직접 실행한 검사 | 결과 |
|---|---|
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm test` | 종료 0, **674 passed / 1 skipped**, 파일 27 passed / 1 skipped |
| 같은 환경의 `npm run test:browser` | 종료 0, **156 passed**, 파일 4 passed |
| `npm run lint` | 종료 0 |
| `npm run typecheck` | 종료 0 |
| 이전 오탐 입력 | 코어·Chromium에서 정상 type18 변환 확인 |
| 추가 입력 | 64건 예상 결과 확인 |
| 기본 원본·일반 변형 | 100+96조합 동일 |
| 기존 읽기 방어·동일 DOM 재파싱 | 정상 결과 유지 |

- 전체 검사에 브라우저 검사가 포함되므로 전체 통과 수와 별도 브라우저 통과 수를 합산하지 않는다. inventory 1개 건너뜀은 실제 cms/ 자료 부재에 따른 기존 조건이다.
- Linux, Node v24.22.1, Chromium 156.0.8078.79 사용. 저장소 런처를 바꾸지 않고 기존 임시 Playwright 경로를 사용했다.
- Windows·실제 운영 CMS·원본 CSS 시각 등급 비교는 실행하지 않았다. 별도 웹 편집기 저장·가져오기 흐름은 이번에는 다시 실행하지 않았다.
- 임시 재현 입력·스크립트·관측값은 `/tmp/p5-empty/`, 공식 검사 로그는 `/tmp/p5-empty-*.log`에 있다. 핵심 입력과 실제 결과는 위에 직접 기재했다.

**최종 판정: 이번 재검수 범위 완료.**

## 이전 검수 기록 보존

아래는 be1b3cc의 이전 검수 원문(보고 커밋 78065f2)과 그 안의 최초 P5 기록이다. 과거 Important는 현재 미해결 항목이 아니며, 현재 판정은 위 결과를 따른다.

<details>
<summary>이전 재검수 원문 — be1b3cc</summary>

# 4단계 P5 재검수 결과 — be1b3cc

- 검수일: 2026-11-15.
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `be1b3ccd94f7591111fc9f4705d713e04052622f`.
- 범위: `5240b60..be1b3cc`. 기준 문서: `docs/review-stage4-p5-fixes.md` 및 검수 요청서 재검수 항목.
- 애플리케이션·테스트·fixture 코드는 수정하지 않았다. 이번 변경은 이 검수 문서뿐이다.

## 판정

**수정 후 재확인 필요.** 이전 I-1의 두 입력은 수정됐다. 실제 중복 읽기 방어는 확인했지만, 빈 글 읽기까지 중복으로 취급하여 정상 본문을 미지원 fallback으로 바꾸는 회귀를 재현했다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 이번 범위에서 확정한 항목 없음 |
| Important | 1 | R-I-1: 빈 제목 요소도 포함 읽기로 집계하여 불필요한 fallback |
| Minor | 0 | 별도 확정 항목 없음 |

## 이전 I-1 수정 확인 — 직접 실행

이전 검수의 전체 HTML A·B를 그대로 코어와 Chromium에서 실행했다.

| 원문 입력 | 실제 결과 | 판정 |
|---|---|---|
| A: type22 짧은 목록 안에만 p.cms-title(FIRST) | success, diagnostics [], fallback 0. 카드 제목을 별도 생성하지 않고 짧은 목록에 FIRST 한 번 | 수정 확인 |
| B: type24 설명 안 span.cms-title(FIRST) | success, diagnostics [], fallback 0. 자동 순번 외 FIRST 한 번 | 수정 확인 |

원본에 한 번 있는 FIRST가 출력에서 두 번 보이던 증상은 사라졌다. type22·24가 제목·설명을 직접 자식에서 읽도록 바꾼 효과와 일치한다.

## Important

### R-I-1. 빈 제목 요소를 읽었을 뿐인데 같은 글의 중복으로 판정하여 정상 설명을 fallback함

**위치:** `packages/core/src/parse/common.ts:149`~`:152`(빈 결과도 횟수 기록), `:160`~`:168`(값을 보지 않고 포함 관계로 거부). 실제 호출은 `packages/core/src/types/type18.ts:59`, fallback 적용은 `packages/core/src/parse/original.ts`의 finish다.

**확인 방식:** 이전 5240b60과 현재 코드에 같은 HTML을 전달한 코어 비교, 실제 Chromium 원본/이전/현재 출력 비교로 **직접 실행**했다. 원인 설명은 **정적 판독**이다.

**재현 입력:**

```html
<div class="cms-container">
  <section class="cms type18"><div class="cms-inner">
    <ol class="cms-img-list">
      <li class="cms-list-item">
        <div class="cms-visual-text">
          <p class="cms-description"><span class="cms-title"></span>BODY</p>
        </div>
      </li>
    </ol>
  </div></section>
</div>
```

이는 빈 서식/자리표시 요소가 남은 유효한 HTML 변형이다. 표준 fixture가 이 형태를 생성한다는 주장은 아니며, 기존 파서가 정상적으로 처리하던 사용자 편집 입력의 회귀다. 제목은 스키마에서도 선택 사항이다.

**이전 실제 결과:** success, diagnostics [], fallback 0. 항목 제목은 생성하지 않고 설명에서 BODY를 한 번 출력한다. Chromium 원본과 이전 출력의 표시 글은 모두 BODY다.

**현재 실제 결과:** status failed, `LOSSY_PARSE`, 섹션 fallback 1. 사유는 다음과 같다.

```text
같은 글을 두 칸으로 읽음: <span> 글이 다른 칸의 글 안에 있음
```

Chromium에서도 정상 type18 프리셋 대신 `[변환 미지원] type18 ...` fallback을 표시한다. 원본은 보존되지만 정상 프리셋 변환이 거부된다. 빈 span에 공백 하나만 넣어도 동일하게 이전 success / 현재 fallback이다.

**기대:** 빈 요소를 읽어 제목 값이 생기지 않고 BODY도 한 번만 출력되는 경우는 정상 변환되어야 한다. 실제 두 필드에 남는 글이 중복되는 경우와, 선택적 빈 필드를 조회한 경우를 구분해야 한다. 비어 있지 않은 `<span class="cms-title">FIRST</span>`을 설명으로도 읽는 기존 중복 사례는 계속 fallback되어야 한다.

**원인 — 정적 판독:** type18의 textOf는 빈 제목 span과 설명 p를 각각 richFrom으로 읽는다. 빈 span의 반환값은 빈 문자열이므로 optional('title', ...)은 필드를 만들지 않는다. 그러나 richFrom은 반환값을 구하기 전에 빈 span도 읽기 횟수에 기록한다. duplicateReads는 이 반환값이나 실제 생성 필드를 보지 않고, 읽은 span의 조상 p도 읽혔다는 이유만으로 중복이라고 판정한다. 따라서 여기서는 두 번 출력될 글이 존재하지 않는데도 거부된다.

이 항목은 데이터 손실이나 중복 방어 누락이 아니라 **정상 본문이 미지원 결과로 바뀌는 오탐 회귀**로 Important에 집계했다. 기본 원본 전체가 실패한다는 의미는 아니다.

## 공통 중복 방어 확인

### 직접 실행

- 같은 요소를 두 번 richFrom으로 읽음 → duplicateReads가 중복을 찾음.
- 부모→자식, 자식→부모 순서로 읽음 → 두 경우 모두 포함 읽기를 찾음.
- 서로 다른 두 요소에 같은 글 FIRST가 있음 → 중복으로 취급하지 않음.
- 한 번의 richFrom 내부에서 문단을 나누는 재귀 → 중복으로 취급하지 않음.
- 검사 후 duplicateReads를 다시 호출 → 이전 횟수 잔여 없음.
- type18·22·24·26 원본을 **동일한 DOM 객체로 두 번 parse** → 두 번 모두 fallback 사유 없음, 데이터 동일. 횟수 정리가 재파싱을 방해하지 않음.
- 추가 비어 있지 않은 type18 포함 읽기 → LOSSY_PARSE 및 fallback. 빈 결과의 R-I-1과 대조했다.

### 정적 판독

읽기 기록은 DOM 객체별 WeakMap이며 내부 재귀는 richInner로 분리되어 외부 필드 조회와 구분된다. duplicateReads는 루트와 후손의 동일 객체·조상 관계를 검사하고 횟수를 지운다. finish는 다른 fallback 사유가 있어도 duplicateReads를 호출하므로 일반적인 조기 fallback 선택 때문에 횟수가 남는 경로는 아니다.

현재 P2~P5의 글 읽기 도우미는 richFrom을 경유하며, type20·21의 새 border-list 도우미도 textOf를 쓴다. 이번에 조사한 실제 읽기 경로와 위 실행 입력에서는 비어 있지 않은 같은 요소/포함 읽기의 누락을 확인하지 못했다. 모든 가능한 미래 파서의 재사용·중복 출력까지 증명한 것은 아니다.

## 기본 원본 및 일반 변형 비교 — 직접 실행

이전 5240b60 코드를 임시 디렉터리에 펼쳐 비교했다. 저장소 코드는 변경하지 않았다.

| 입력군 | 결과 |
|---|---|
| type01 및 P2~P5 24타입 × 원본/무배경/이미지 배경/색 배경 100조합 | 이전/현재 HTML 전부 동일 |
| P2~P5 24타입 × 공백/이미지 제거/인라인 서식/문단 변형 96조합 | 이전/현재 HTML 전부 동일, 모두 fallback 0 |

일반 변형은 공백·탭 추가, img 제거, 첫 해당 제목/설명에 strong·br·em 추가, 첫 p.cms-description을 div.cms-description > p+p로 바꾸는 방식이다. 해당 문단 요소가 없는 타입은 그 변형에서 원본을 대조했다. 따라서 기본 fixture·이 일반 입력군에서는 새 오탐이 없었지만, 빈 제목이 설명 안에 있는 R-I-1 입력은 이 검사와 별도로 실패한다.

## 실행 결과와 한계

| 직접 실행한 검사 | 결과 |
|---|---|
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm test` | 종료 0, **670 passed / 1 skipped**, 파일 27 passed / 1 skipped |
| 같은 환경의 `npm run test:browser` | 종료 0, **156 passed**, 파일 4 passed |
| `npm run lint` | 종료 0 |
| `npm run typecheck` | 종료 0 |
| 이전 I-1 A·B | 코어·Chromium에서 글 한 번 출력 확인 |
| 빈 제목 대조 | 빈 문자열·공백은 이전 success / 현재 fallback, 비어 있지 않은 중복도 fallback |
| 공통 방어 검사 | 동일 요소/포함 양방향/별개 요소/재귀/정리 및 동일 DOM 재파싱 확인 |
| 기본 원본·일반 변형 비교 | 100+96조합 동일 |

- 전체 검사에 브라우저 검사가 포함되므로 670과 156을 합산하지 않는다. inventory 1개 건너뜀은 실제 cms/ 자료 부재에 따른 기존 조건이다.
- Linux, Node v24.22.1, Chromium 156.0.8078.79 사용. 저장소 런처를 바꾸지 않고 기존 임시 Playwright 경로를 사용했다.
- Windows·실제 운영 CMS·원본 CSS 시각 등급 비교는 실행하지 않았다. 별도 웹 편집기 저장·가져오기 흐름은 이번에는 다시 실행하지 않았다.
- 임시 스크립트·입력·관측값은 `/tmp/p5-recheck/`, 공식 검사 로그는 `/tmp/p5-recheck-*.log`에 있다. 핵심 재현 입력과 결과는 위에 직접 기재했다.

**최종 판정: 수정 후 재확인 필요.**

## 이전 검수 원문 보존

아래는 f620f79의 과거 검수 원문(보고 커밋 5240b60)이다. 과거 I-1은 수정 확인됐으며 현재 미해결 항목은 위 R-I-1이다.

<details>
<summary>최초 P5 검수 원문 — f620f79</summary>

# 4단계 P5 검수 결과

- 검수일: 2026-11-15.
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 체크아웃: `f620f7946ab2f87e035b0d950a7e48272b1569ac`.
- 코드 범위: `15a3312..d3ae49f` — 1커밋, 24파일, +1040/−5. `d3ae49f..f620f79`는 검수 요청서 추가뿐이다.
- 기준: `docs/review-request-stage4-p5.md`, 구현 기록, 호스트 DOM 계약, 이전 단계의 손실 방지 기준.
- 애플리케이션·테스트·fixture 코드는 수정하지 않았다. 이 검수 문서만 추가했다.

## 판정 요약

| 등급 | 건수 | 판정 |
|---|---:|---|
| Critical | 0 | 이번 범위에서 확정한 항목 없음 |
| Important | 1 | I-1: 겹치는 글 선택 범위로 원본 글을 제목과 본문에 중복 출력 |
| Minor | 0 | 별도 확정 항목 없음 |

**수정 후 재확인 필요.** 자동 테스트는 통과하지만 type22·24에서 원본에 한 번만 있는 글이 경고 없이 두 번 출력되는 입력을 직접 재현했다. 원본 자료 부재와 요청서에 명시된 호스트 디자인 정규화는 결함으로 세지 않았다.

## Important

### I-1. 하위 목록·설명 안의 제목까지 선택하여 한 글을 두 필드로 중복 출력

**위치:** `packages/core/src/types/type22.ts:53`~`:54`, `packages/core/src/types/type24.ts:43`~`:44`. 관련 선택 도우미는 `packages/core/src/parse/original.ts:36`~`:38`의 textOf다.

**확인 방식:** 최소 HTML 코어 변환과 실제 Chromium 원본/출력 텍스트 및 DOM 요소 개수 비교로 **직접 실행**했다. 원인 설명은 **정적 판독**이다.

**재현 입력 A — type22:** 카드의 직접 제목은 없고 짧은 목록 안에만 cms-title 글이 있는 경우다.

```html
<div class="cms-container">
  <section class="cms type22"><div class="cms-inner">
    <ul class="cms-img-list">
      <li class="cms-list-item">
        <div class="cms-visual-text">
          <ul class="list-unstyled">
            <li><p class="cms-title">FIRST</p></li>
          </ul>
        </div>
      </li>
    </ul>
  </div></section>
</div>
```

**실제:** `status="success"`, diagnostics `[]`, fallback 0. 데이터는 다음처럼 같은 원본 글을 카드 제목과 하위 항목 양쪽에 담는다.

```json
{ "items": [{ "title": "FIRST", "image": {}, "subitems": [{ "text": "FIRST" }] }] }
```

출력은 `strong.mig-title`과 하위 `span.mig-desc`에 FIRST가 각각 한 번씩 있다. Chromium 원본 `innerText`는 `FIRST`, 출력은 `FIRST\nFIRST`이며 FIRST를 가진 제목/본문 요소는 2개다.

**재현 입력 B — type24:** 설명 안의 서식 요소에 cms-title 클래스가 있는 경우다.

```html
<div class="cms-container">
  <section class="cms type24"><div class="cms-inner">
    <ol class="cms-ordered-list">
      <li class="cms-list-item"><div class="cms-description-box">
        <div class="cms-description"><span class="cms-title">FIRST</span></div>
      </div></li>
    </ol>
  </div></section>
</div>
```

**실제:** 역시 success, diagnostics `[]`, fallback 0. 항목 데이터는 `title="FIRST"`와 `desc="<span class=\"cms-title\">FIRST</span>"`를 모두 갖는다. Chromium 원본은 FIRST 한 번, 출력은 자동 번호 1 외에 FIRST가 제목과 설명에 두 번 보인다.

**기대:** 각각의 원본 글은 원래 항목 위치에서 한 번만 출력되어야 한다. 하위 목록의 제목을 카드의 독립 제목으로 추가하거나 설명 내부의 글을 별도 제목으로 복제하면 안 된다. 필드 범위가 불명확하여 안전하게 구분할 수 없는 입력이라면 경고와 섹션 fallback으로 원본을 보존할 수 있다.

**원인 — 정적 판독:** textOf는 직접 자식이 아니라 모든 후손 중 첫 해당 클래스를 읽는다. type22는 목록을 포함한 cms-visual-text 전체에서 제목을 찾고, 같은 하위 li 전체도 richFrom으로 읽는다. type24는 li 전체에서 제목과 설명을 독립적으로 찾으므로 두 요소가 포함 관계여도 각각 소비한다. finish의 uncoveredText는 원본에서 남은 글이 있는지는 찾지만, 이미 소비한 글을 다시 담은 경우의 중복 소비는 거부하지 않는다. 구조 검사에도 p/span 자체는 허용되는 요소라 통과한다.

두 입력 모두 선택 범위가 겹치는 같은 원인이므로 한 건으로 집계했다. 공통 도우미를 이번에 바꾸지 않았다는 사실과 별개로, 새 파서의 호출 범위에서 드러나는 기능 오류다.

## Critical / Minor

별도 확정 항목 없음. Critical 0은 모든 가능한 입력과 환경에 대한 무결함 보증이 아니다.

## 정상 동작 및 추가 입력 확인

### 변환·구조 검사 — 직접 실행

- 공식 6타입 데이터·HTML 스냅샷 및 호스트 자식 선택자 검사 통과.
- 6타입 각각에 대해 첫 제목 클래스 중복 추가, 섹션 끝 이미지 추가, 글 안 문단 2개, 글 안 목록, span 안 블록, 이벤트 속성·script를 넣은 **36건**을 실행했다. 문단은 br로 보존되고, 중복 클래스의 남는 고유 글·추가 이미지·지원하지 않는 구조는 fallback이었다.
- type22의 클래스 없는 짧은 목록 li 안에서 FIRST를 직접 글 / p / p.cms-description / span.cms-extra / strong으로 바꾸고 뒤에 중첩 ul을 넣은 **5건**도 모두 fallback이었다. 이전 WeakSet 수정이 새 파서의 richFrom(li) 호출에도 적용된다.
- 이벤트·script 입력은 EVENT_ATTRIBUTE_REMOVED·SCRIPT_REMOVED를 기록했다. 출력 HTML을 DOM으로 다시 파싱하여 실행 가능한 script 요소와 이벤트 속성이 없는 것을 확인했다. fallback 안에 이스케이프된 원본 문자열이 남는 것은 실행 가능한 요소와 구분했다.

### 웹 편집·저장·재로드 — 직접 실행

실제 Chromium 웹에서 6타입의 제목을 각각 수정한 뒤 JSON 다운로드→가져오기→브라우저 새로고침을 수행했다. 모두 편집 값과 출력 HTML이 유지됐다.

- type22: `items.0.subitems.0.text`를 NESTED_REVIEW로 바꾸고 저장·재로드하여 유지 확인.
- type20: boxEyebrow·boxTitle을 서로 다른 값 BOX_SMALL_REVIEW·BOX_TITLE_REVIEW로 수정하고 두 값이 저장 JSON 및 재로드 결과에 남는 것을 확인.

### 호스트 배치·본문 읽기 — 실행 및 정적 판독 구분

- **직접 실행:** 공식 브라우저 156개 검사 통과. P2~P5 24타입 × PC 1100 / 모바일 360 / 에디터 1100 × 이미지 있음/없음의 배치 검사를 포함한다.
- **정적 판독:** type20은 바깥 mig-content의 직접 자식으로 이미지와 안쪽 mig-content를 출력하며, 안쪽에 강조 상자·목록을 둔다. type21도 직접 자식 이미지와 목록으로 호스트의 :has(> .mig-visual) 선택자를 만족한다.
- **정적 판독 및 공식 DOM 검사:** type22 하위 ul에는 mig-list 클래스를 붙이지 않으므로 카드용 후손 grid가 다시 걸리지 않는다. type24는 ol.mig-list > li.mig-item과 span.mig-num을 출력한다.
- **정적 판독:** 새 P5 본문 읽기는 richFrom 직접 호출 또는 originalHeader·textOf·childText를 경유한다. 새 border-list.ts도 textOf를 사용한다. 파서가 선택한 범위 자체가 겹치는 I-1은 별개다.
- **git diff 확인:** richFrom·finish·presetSection 공통 구현에는 이번 범위의 변경이 없다.

## type24 번호 출력 판단

**직접 실행:** 원본 fixture의 첫 항목 제목에 `1. FIRST`를 적으면 출력 첫 항목은 자동 span 번호 `1`과 제목 `1. FIRST`를 함께 보여 준다. ol의 list-style-type은 none이므로 브라우저 기본 번호가 추가된 경우는 아니다.

원본이 CSS 카운터로 번호를 만드는 계약에서는 순서 번호를 렌더 시 생성하고 데이터에는 넣지 않는 결정이 타당하다. 항목 이동 시 번호도 현재 순서로 다시 만들어진다. 사용자가 제목 안에 적은 수동 번호까지 그대로 남기면 위처럼 번호가 중복돼 보일 수 있다는 점도 실제로 확인했다.

수동 번호처럼 보이는 접두어를 자동 삭제하면 원문 내용을 바꿀 수 있고, 원본 CMS의 CSS 카운터도 수동 접두어와 별개로 붙는다는 전제가 있으므로 **자동 순번과 원문 제목을 모두 유지하는 현재 결정을 이 범위에서는 수용한다.** I-1처럼 한 원본 요소를 두 모델 필드로 읽어 새 제목을 합성한 문제와는 구분한다. 원본 cms.css 부재로 실제 원본의 번호 모양·픽셀 결과는 판단하지 않았다.

호스트가 고정한 type20 비율·열 수, type21 비율·머리글 정렬도 이전 단계와 같은 프리셋 정규화 기준으로 수용한다. 원본 도구에서 선택 가능한 값이 아니라는 요청서의 전제에 따른 판단이다.

## 실행 결과와 한계

| 직접 실행한 검사 | 결과 |
|---|---|
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm test` | 종료 0, **611 passed / 1 skipped**, 파일 27 passed / 1 skipped |
| 같은 환경의 `npm run test:browser` | 종료 0, **156 passed**, 파일 4 passed |
| `npm run lint` | 종료 0 |
| `npm run typecheck` | 종료 0 |
| 추가 손실·보안 입력 | 41건 예상 결과 확인 |
| I-1 재현 | 최소 HTML 2종, 코어 및 실제 Chromium에서 한 번의 글이 두 번 출력됨 |
| 웹 편집·저장·가져오기·새로고침 | P5 6타입 모두 유지 |
| 수동 번호 | type24 자동 순번·수동 접두어 동시 출력 확인 |

- 전체 검사에 브라우저 검사가 포함되므로 611과 156을 합산하지 않는다. inventory 1개 건너뜀은 실제 cms/ 자료 부재에 따른 기존 조건이다.
- Linux, Node v24.22.1, Chromium 156.0.8078.79에서 실행했다. 기존 임시 Playwright 경로를 사용했고 저장소 런처는 바꾸지 않았다.
- 실제 운영 CMS·원본 CSS 시각 등급 비교·Windows 환경·inventory 기준 fallback 비율은 실행하지 않았다. 외부 이미지 다운로드 성공도 이번 검사 대상이 아니다.
- 임시 입력·스크립트·관측값은 `/tmp/p5-review/`, 공식 검사 로그는 `/tmp/p5-*.log`에 있다. 핵심 재현 입력과 관측 결과는 위에 직접 기재했다.

**최종 판정: 수정 후 재확인 필요.**

</details>

</details>
