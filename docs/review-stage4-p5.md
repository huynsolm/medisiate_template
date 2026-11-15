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
