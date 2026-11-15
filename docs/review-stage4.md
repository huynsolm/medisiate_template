# 4단계 P4 검수 결과

- 검수일: 2026-11-15.
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 체크아웃: `97cd9afb80f3c7af567b47da2543bed34e4552e1`.
- 코드 검수 범위: `745ee86..a378da6` — 1커밋, 29파일, +1273/−9. `a378da6..97cd9af`는 검수 요청서 추가뿐이다.
- 기준: `docs/review-request-stage4.md`, `docs/stage4-p4.md`, 호스트 DOM 계약, 원본 구조 fixture 및 이전 검수의 손실 방지 기준.
- 애플리케이션·테스트·fixture 코드는 수정하지 않았다. 이 검수 문서만 추가했다.

## 판정 요약

| 등급 | 건수 | 판정 |
|---|---:|---|
| Critical | 0 | 이번 검수에서 확정한 항목 없음 |
| Important | 2 | I-1 아이콘 없는 type16 글 폭, I-2 rich 입력 내부의 문단·목록 경계 소실 |
| Minor | 0 | 별도 확정 항목 없음 |

**수정 후 재확인 필요.** 자동 테스트는 통과하지만, 기본 데이터에서도 발생하는 type16 배치 문제와 P4의 새 파서가 경계 손실을 경고 없이 수용하는 경우를 직접 재현했다. 기준 자료 부재로 제외한 실제 운영 CMS 화면 비교와 장식 SVG 미이관은 결함으로 세지 않았다.

## Critical

이번 범위에서 확정한 항목 없음. 아래 검사는 모든 가능한 입력에 대한 보안·무결함 보증은 아니다.

## Important

### I-1. type16에서 아이콘이 없으면 글이 30px 아이콘 칸에 배치됨

**위치:** `packages/core/src/types/type16.ts:83`~`:88`(아이콘과 글 출력), `:12`(빈 아이콘 허용), `:50`(기본 데이터도 빈 아이콘). 관련 호스트 규칙: `reference/host-style.css:4060`~`:4070`.

**확인 방식:** 코어 변환·기본 데이터 렌더 및 실제 Chromium의 PC 1100 / 모바일 360 / 에디터 1100 폭 측정으로 **직접 실행**했다. 모바일 스크린샷도 직접 열어 글이 한두 글자씩 세로로 꺾이는 것을 확인했다. 원인 설명은 **정적 판독**이다.

**재현 입력:** 다음 HTML을 변환하고 출력에 `reference/host-style.css`를 적용한다.

```html
<div class="cms-container">
  <section class="cms type16"><div class="cms-inner">
    <ul class="cms-column-list">
      <li class="cms-list-item">
        <div class="cms-description-box">
          <p class="cms-title">TITLE</p>
          <p class="cms-description">DESCRIPTION</p>
        </div>
      </li>
    </ul>
  </div></section>
</div>
```

`fixtures/original/type16.html`의 첫 `.cms-icon`만 삭제해도 같다. 코어의 `defaultRegistry.get('type16').defaults`를 그대로 `renderPage()`에 전달하는 경우에도 발생한다.

**실제 결과:** 최소 입력은 `status="success"`, diagnostics `[]`, fallback 0이다. `visualPcMo({})`가 아무 요소도 출력하지 않아 아래처럼 글 묶음만 남는다.

```html
<div class="mig-content">
  <div class="mig-text-wrap">
    <strong class="mig-title">TITLE</strong>
    <p class="mig-desc">DESCRIPTION</p>
  </div>
</div>
```

호스트 grid가 `30px minmax(0, 1fr)`이므로 유일한 자식인 글이 첫 번째 30px 칸으로 들어간다. 원본 fixture의 첫 아이콘만 제거한 출력의 실제 측정값:

| 화면 | mig-content 폭 | 글 묶음 폭 | 계산된 grid 열 |
|---|---:|---:|---|
| PC 1100 | 1020px | **30px** | 30px / 944px |
| 모바일 360 | 288px | **30px** | 30px / 약 212.094px |
| 에디터 1100 | 1028px | **30px** | 30px / 약 952.094px |

기본 데이터도 세 화면 모두 글 폭 30px이다. 스키마는 빈 아이콘을 정상 값으로 받으며, 새 타입 추가 시 사용하는 기본 항목에도 아이콘이 없다.

**기대 결과:** 아이콘이 없는 정상 항목에서도 글은 본문용 칸에 배치되어 읽을 수 있어야 한다. 아이콘 자리 유지 또는 빈 아이콘에 맞는 배치 처리가 필요하며, 첫 번째 좁은 칸으로 밀려서는 안 된다.

**테스트가 놓친 이유 — 정적 판독:** `tests/visual/preset-layout.test.ts`는 type16 원본 fixture의 아이콘 있는 항목만 검사한다. `textWidths` 측정 대상도 type03·04뿐이다. 섹션 전체 본문 폭 검사는 통과해도 type16 행 내부의 30px 글 폭은 잡지 못한다. 이 누락은 같은 결함의 검증 보강 사항으로 묶고 별도 Minor로 중복 집계하지 않았다.

### I-2. 새 rich 입력 안의 여러 문단·목록이 경고 없이 이어 붙음

**위치:** 대표적으로 `packages/core/src/types/type06.ts:53`(글머리 항목 전체를 `richFrom()`으로 읽음), `:66`(그 결과 출력). 관련 공통 경로: `packages/core/src/parse/common.ts:109`~`:115`, `:128`~`:131`, `packages/core/src/html/rich-text.ts`의 미허용 태그 풀기 처리.

**확인 방식:** 최소 HTML 코어 변환, 원본 fixture 변형, Chromium 원본/출력 텍스트 비교로 **직접 실행**했다. 파서가 경계 손실을 감지하지 못하는 원인 설명은 **정적 판독**이다.

**재현 입력:**

```html
<div class="cms-container">
  <section class="cms type06"><div class="cms-inner">
    <ul class="cms-column-list">
      <li class="cms-list-item"><div class="cms-inner-box">
        <div class="cms-description-box">
          <p class="cms-description">CARD</p>
          <ul class="cms-bullet-list">
            <li class="cms-list-item cms-description"><p>FIRST</p><p>SECOND</p></li>
          </ul>
        </div>
      </div></li>
    </ul>
  </div></section>
</div>
```

**실제 결과:** `status="success"`, diagnostics `[]`, fallback 0. 데이터는 `items[0].subitems[0].text = "FIRSTSECOND"`, 출력은 다음과 같다.

```html
<li class="mig-item"><span class="mig-desc">FIRSTSECOND</span></li>
```

Chromium `innerText`는 원본 `FIRST\n\nSECOND`에서 출력 `FIRSTSECOND`로 변한다. 같은 글머리 항목 내부를 `FIRST<ul><li>SECOND</li><li>THIRD</li></ul>`로 바꾸면 원본의 목록 경계도 `FIRSTSECONDTHIRD`로 합쳐진다. 두 경우 모두 경계 손실을 알리는 `LOSSY_PARSE`가 없다. 원본 fixture를 변형한 경우에는 기존 상대 이미지 경고만 있으며 경계 손실 경고는 없다.

**기대 결과:** 지원 가능한 문단은 `<br>` 등으로 구분하고, 중첩 목록처럼 현재 모델로 나타내지 못하는 구조는 `LOSSY_PARSE`와 섹션 fallback으로 보존해야 한다. 텍스트 글자 수가 같다는 이유로 읽기 경계가 사라진 결과를 성공으로 처리하면 안 된다.

**범위 추가 확인 — 직접 실행:** P4 7개 타입의 원본 fixture에서 첫 번째

```html
<p class="cms-description">원래 글</p>
```

을 다음 유효한 블록 구조로 교체했다.

```html
<div class="cms-description"><p>FIRST</p><p>SECOND</p></div>
```

`type18·23·13·06·16·14·19` 모두 fallback 0이고 `FIRSTSECOND`를 출력했다. type13·14에서는 첫 해당 요소가 번호 칸이라 번호 값에서 경계가 합쳐지고, 나머지는 설명/글 값에서 합쳐진다. 같은 원인이므로 한 건으로 집계했다.

**원인 — 정적 판독:** P4 파서가 사용하는 `richFrom()`은 rich allowlist 밖의 p·div·ul·li를 경계 없이 풀어 텍스트를 합친다. `uncoveredText()`는 원본과 소비한 텍스트의 공백을 제거해 비교하므로 문단·목록 경계가 사라져도 남은 텍스트가 없다고 판단한다. 이 공통 도우미 자체는 이전부터 있었지만, 이번 P4 파서들의 새 입력 경로에서 동일한 문제가 발생한다. 이전 표 셀 수정에서 허용한 `<br>` 경계 보존과도 다른 결과다.

## Minor

별도 확정 항목 없음.

## 요청 항목별 확인 및 정상 동작

### 원본 마크업·편집

- **직접 실행:** 전체 테스트의 7개 타입 데이터·HTML 스냅샷과 DOM 계약 검사 통과. type13·14의 빈 번호 슬롯, 목록 다음 강조 상자 배치는 자동 검사로 확인했다.
- **직접 실행:** Chromium 웹에서 7개 타입의 제목을 편집한 뒤 JSON 다운로드→가져오기→브라우저 새로고침을 수행했다. 모두 값과 출력 HTML 유지. type06의 `items.0.subitems.0.text`도 실제로 수정하고 유지되는 것을 확인했다.
- **직접 실행:** type18 글 스타일을 `text-type-3`으로 변경하여 저장·재로드했다. type16은 큰 이미지의 PC 주소를 `https://example.com/review-pc.png`로 바꿔 저장·재로드하고 JSON의 PC 이미지 값 유지까지 확인했다. 이미지 요청 성공 여부는 외부 요청을 차단한 이번 검사 범위 밖이다.
- **직접 실행:** 7개 타입 각각에서 첫 `cms-description` 뒤에 같은 클래스의 고유 문구 `EXTRA_UNIQUE`를 추가한 7건, 섹션 끝에 추가 이미지 1장을 넣은 7건 모두 `LOSSY_PARSE` 및 섹션 fallback. 다만 선택한 rich 요소 **내부** 경계는 I-2처럼 감지하지 못한다.

### 보안

- **직접 실행:** 7개 타입의 첫 `cms-description`에 `<strong onclick="alert(1)">SECURE_TEXT</strong><script>alert(2)</script>`를 넣었다. 모두 `EVENT_ATTRIBUTE_REMOVED`·`SCRIPT_REMOVED`를 기록하며, 출력에는 실행 가능한 script나 이벤트 속성이 남지 않는다. 텍스트는 유지된다.
- **정적 판독:** type13·14는 `check-rows.ts`의 상수 CHECK만 `raw()`로 출력한다. 입력 SVG를 실행 가능한 출력으로 복사하는 경로는 없다. type16·19 장식 SVG 미이관은 요청서의 제외 범위다.

### 공통 이미지 배경 폭 수정과 회귀

- **직접 실행:** `745ee86` 코드를 임시 디렉터리에 펼쳐 현재 코드와 비교했다. 기존 type01 및 P2/P3 11개 타입 × 원본/무배경/이미지 배경/색 배경 **48개 조합**에서 출력 HTML을 대조했다. 36개는 동일했고, 나머지 12개는 `.mig-body`에 `style="align-self: stretch;"`가 추가된 차이뿐이었다. type01은 이 변경의 영향을 받지 않았다.
- **직접 실행:** type01·11·07 × 무배경/이미지/색 배경 × PC 1100/모바일 360/에디터 1100 **27개 조합**에서 이전/현재 Chromium 배치를 비교했다. 머리글 x·y·폭은 0.5px 이내로 동일했고, type11·07의 현재 본문은 섹션 안쪽 폭의 99% 이상을 사용했다. type11 이미지 배경의 본문 비율은 PC 약 0.700→1, 모바일 약 0.797→1, 에디터 약 0.223→1이었다.
- **직접 실행:** 공식 배치 테스트의 P2/P3/P4 18개 타입 × 세 화면 검사도 통과했다. 다만 이는 I-1의 아이콘 없는 행 내부 폭까지 검증한 것은 아니다.
- **정적 판독:** `presetSection()`은 `data-migration-bg`가 있는 경우에만 본문에 stretch를 적용하고, 머리글·배경 레이어 코드는 바꾸지 않는다. 색 배경만 있는 섹션과 다른 경로의 type01은 그대로다. 이 공통 수정에서 새 회귀는 확인하지 못했다.

### 호스트 고정 배치·디자인 판단

- type18의 선택 가능한 글 스타일은 데이터에 보존하고, 원본 변환 시 `PRESET_LAYOUT_FIXED`(info)를 알리는 방식이 타당하다. 글 누락 없이 호스트 디자인으로 정규화되기 때문이다. 해당 동작은 자동 테스트로 실행 확인했다.
- 고정 열 수와 type23의 기본 정렬은 원본 도구의 사용자 선택값을 무시한 경우와 구분할 수 있다. 요청서가 명시한 호스트 프리셋 변환 범위에서는 별도 경고 없이 호스트를 따르는 결정을 수용한다. 이 의견은 원본과의 픽셀 동일성을 확인했다는 뜻이 아니다.

## 실행 결과와 한계

| 직접 실행한 검사 | 결과 |
|---|---|
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm test` | 종료 0, **387 passed / 1 skipped**, 파일 26 passed / 1 skipped |
| 같은 환경의 `npm run test:browser` | 종료 0, **66 passed**, 파일 4 passed |
| `npm run lint` | 종료 0 |
| `npm run typecheck` | 종료 0 |
| 실제 웹 7타입 편집·저장·가져오기·새로고침 | 정상 입력의 값·출력 유지 |
| 결함 추가 입력 | I-1·I-2 코어/Chromium 재현, 위 위치·입력·결과 참조 |
| 기존 타입 공통 수정 비교 | 코어 48조합, 브라우저 27조합 |

- `npm test`에 브라우저 검사가 포함되므로 387과 66을 합산하지 않는다. inventory 1개 건너뜀은 운영 `cms/` 부재에 따른 기존 조건이다.
- Linux, Node v24.22.1, Chromium 156.0.8078.79에서 실행했다. 설치된 Chromium을 임시 Playwright 경로에 연결한 기존 설정을 사용했고 저장소 런처는 변경하지 않았다.
- 별도 웹 재현은 공식 테스트의 빌드 디렉터리 재생성과 충돌하여 첫 실행 중 404가 발생했다. 공식 검사 완료 후 빌드를 임시 위치에 복사해 재실행했고 7개 타입을 모두 확인했다. 이는 제품 결함에 포함하지 않았다.
- Windows, 실제 운영 `cms/contents`, 원본 CMS CSS를 사용한 시각 등급 비교, inventory fallback 비율은 이번에 실행하지 않았다. 배경 외부 이미지 다운로드 성공 여부도 확인하지 않았다.
- 임시 재현 스크립트·입력·관측 JSON·스크린샷은 `/tmp/stage4-review/`, 공식 검사 로그는 `/tmp/stage4-*.log`에 있다. 임시 경로는 저장소 산출물이 아니므로 재현 핵심 입력과 관측값을 위에 기재했다.

**최종 판정: 수정 후 재확인 필요.**
