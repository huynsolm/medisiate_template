# 4단계 P4 재검수 결과 — 591dce9

- 검수일: 2026-11-15.
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `591dce9c19bb8428ed3d09fe4e3355bf510deaf1`.
- 범위: `8b0ca21..591dce9`. 반영 기록: `docs/review-stage4-fixes.md` 마지막 장.
- 애플리케이션·테스트·fixture 코드는 수정하지 않았다. 이번 변경은 이 검수 문서뿐이다.

## 판정

**이번 재검수 범위 완료.** 이전 R-I-1 잔여 입력과 변형의 수정이 확인됐다. 현재 P2~P4 본문 파서에서 richFrom을 우회하여 글을 읽는 경로를 찾지 못했고, 검사한 정상 입력 및 기존 사례에서도 새 회귀가 없었다.

| 등급 | 현재 미해결 건수 | 판정 |
|---|---:|---|
| Critical | 0 | 이번 범위에서 확정한 항목 없음 |
| Important | 0 | 이전 R-I-1 잔여 수정 확인 |
| Minor | 0 | 별도 확정 항목 없음 |

아래는 직접 실행한 결과와 정적 판독의 근거다. 모든 가능한 입력이나 미래 코드 변경까지 무결함을 보증하는 판정은 아니다.

## 이전 R-I-1 잔여 입력 — 직접 실행

이전 문서의 전체 최소 HTML을 그대로 재실행했다. 핵심 글머리 입력은 다음과 같다.

```html
<li class="cms-list-item">
  <p class="cms-description">FIRST</p>
  <ul><li>SECOND</li><li>THIRD</li></ul>
</li>
```

위 li는 type06의 `cms-column-list > li.cms-list-item > .cms-inner-box > .cms-description-box > ul.cms-bullet-list` 안에 들어간다. 전체 HTML은 아래 이전 검수 원문에 그대로 보존했다.

| 재현 입력 | 기대 | 실제 |
|---|---|---|
| p.cms-description(FIRST) + 중첩 ul | LOSSY_PARSE 및 섹션 fallback | 일치. 이전 FIRST<br>SECONDTHIRD 성공 결과가 사라짐 |
| span.cms-description(FIRST) + 중첩 ul | 동일 | 일치 |
| span.cms-extra(FIRST) + 중첩 ul | 동일 | 일치 |
| 이전 직접 글 FIRST + 중첩 ul | 동일 | 일치 |
| 이전 span 안 section > p+p | 동일 | 일치 |
| 클래스 있는/없는 p+p, 정상 인라인 글 | 성공 변환, 문단 경계 유지 | fallback 0. 문단은 FIRST<br>SECOND |

세 잔여 변형과 이전 직접 글·숨은 블록 입력은 **실제 Chromium**에서도 원본 및 변환 결과를 확인했다. 잘못된 구조는 원본 HTML과 줄 경계를 보존하는 fallback이 되며, 정상 문단은 br 경계를 유지한다.

추가로 FIRST를 직접 글 / p / p.cms-description / span.cms-description / span.cms-extra / strong으로 둔 6종과, 뒤 구조를 ul / ol / dl / table / h2 / span 안 section으로 둔 6종을 조합한 **36개 입력**을 실행했다. 모두 `LOSSY_PARSE`, 섹션 fallback 1이었다. 같은 프로세스에서 정상 문단과 잘못된 중첩 목록 변환을 3회 번갈아 실행해도 각 결과가 유지됐다.

## richFrom 우회 읽기 경로 검토 — 정적 판독

**관련 위치:** `packages/core/src/parse/common.ts:145`~`:148`(WeakSet 기록), `:190`~`:195`(검사 대상 포함), `packages/core/src/parse/original.ts`의 originalHeader·textOf·childText 및 finish.

P2/P3/P4 18개 타입과 type13·14 공통 구현 check-rows.ts의 파서 및 호출하는 도우미를 대조했다.

| 글 읽기 경로 | 확인한 처리 |
|---|---|
| 공통 머리글 | originalHeader가 제목·작은 제목 요소에 richFrom 호출 |
| 대부분의 본문·제목·번호·설명 | textOf 또는 childText가 실제 선택한 요소에 richFrom 호출 |
| type06 글머리 | li 전체를 richFrom으로 직접 읽음. 이번 수정으로 실제 li가 검사 대상에 포함됨 |
| type26 셀 | cellText의 구조 사전 검사 후 richFrom으로 읽음. 사전 거부한 구조는 이미 fallback 사유를 기록하므로 우회 읽기 아님 |
| type13·14 | 공통 check-rows.ts에서 textOf·childText 경유 |

**현재 P2~P4 본문 요소를 plainText·textContent·innerHtml 등으로 직접 읽어 모델의 글 값으로 저장하는 다른 경로는 확인하지 못했다.** type02의 label, 각 타입의 num, type16의 mobileText도 textOf를 통해 기록되는 것을 확인했다.

다음은 문자열을 읽지만 이 전제의 위반으로 보지 않았다.

- 이미지의 주소·alt·너비·높이는 속성값으로 읽는다. DOM의 문단·목록을 소비하는 본문 글 경로가 아니다.
- 표의 너비·병합 값, perRow 및 글 스타일 등은 속성·클래스로 읽는 설정값이다.
- scanSection의 script 원문 진단, finish의 uncoveredText 비교, fallback 원본·줄 경계 추출은 진단·손실 검사·원본 보존 경로다. 정상 본문 모델을 richFrom 없이 생성하는 경로가 아니다.

**실제 범위와 검사 범위:** 파서와 공통 도우미가 원본 DOM 요소 참조를 그대로 넘기며, richFrom 진입 시 그 참조를 WeakSet에 기록한다. finish는 같은 섹션의 동일 요소들을 순회한다. 이번 type06 사례처럼 클래스가 달라져도 실제 소비한 li가 isText가 되므로 내부 중첩 ul을 빠뜨리지 않는다. 재귀적으로 읽는 문단 요소도 기록된다. P2~P4에서는 섹션 루트 자체를 본문 글로 읽는 호출은 확인하지 못했다.

새 전제 검사는 타입 파일의 금지 함수명 검색을 이용한 회귀 방지 장치다. 이것만으로 간접 도우미나 앞으로 추가될 모든 읽기 경로를 증명한다고 보지 않았고, 이번에는 도우미 호출까지 정적으로 대조했다. 향후 다른 본문 읽기 경로를 추가하면 같은 기록·검사 계약이 필요하다. 현재의 결함으로 집계할 항목은 없다.

## 정상 입력 및 기존 사례 회귀 — 직접 실행

이전 8b0ca21 코드를 임시 디렉터리에 펼쳐 비교했다. 저장소 소스는 바꾸지 않았다.

| 입력군 | 결과 |
|---|---|
| type01 및 P2/P3/P4 18개 타입 × 원본/무배경/이미지 배경/색 배경 76조합 | HTML 전부 동일 |
| P2/P3/P4 18개 타입 × 공백/이미지 제거/인라인 서식/문단 변형 72조합 | HTML 전부 동일, 모두 fallback 0 |
| 기존 코어 재현·구조 변형 70건 재실행 | 이전 잔여 입력을 포함해 결과 기록. 새 경계 소실 없음 |
| type15 원문 문단+목록 | 두 값 모두 출력, 합의한 목록→문단 순서 유지 |
| type26 colspan 21 / rowspan 0 | 값 보존, success |
| type26 colspan 0x10 / 2foo, 문단+목록, span 안 블록 | LOSSY_PARSE 및 섹션 fallback |
| type26 section/article 안 문단, 칸 안 글+문단 | FIRST<br>SECOND, success |
| type16 아이콘 없는 행 | 공식 브라우저의 이미지 없는 18타입 × 세 화면 검사 통과 |

72조합은 이전 검사와 같은 변형이다. 공백·탭 추가, img 제거, 첫 해당 글의 strong/br/em 서식, 첫 p.cms-description을 div.cms-description > p+p로 바꾼 입력을 사용했다. 해당 요소가 없는 타입의 문단 변형은 원본을 그대로 대조했다. **이 검사 범위에서 정상 마크업을 새로 fallback시키는 사례는 없었다.**

## 실행 결과와 한계

| 직접 실행한 검사 | 결과 |
|---|---|
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm test` | 종료 0, **525 passed / 1 skipped**, 파일 26 passed / 1 skipped |
| 같은 환경의 `npm run test:browser` | 종료 0, **120 passed**, 파일 4 passed |
| `npm run lint` | 종료 0 |
| `npm run typecheck` | 종료 0 |
| 추가 최소 입력 | 이전 사례·정상 변형 8건 |
| 추가 위험 구조 조합 | 36건 모두 fallback, 정상/비정상 교대 3쌍도 일관됨 |
| Chromium 추가 재현 | 잔여 3변형·이전 2변형·정상 문단 확인 |
| 이전/현재 비교 | 정상 76+72조합, 기존 재현 70건 재실행 |

- 전체 검사에 브라우저 검사가 포함되므로 525와 120을 합산하지 않는다. inventory 1개 건너뜀은 실제 cms/ 자료가 없는 기존 조건이다.
- Linux, Node v24.22.1, Chromium 156.0.8078.79에서 실행했다. 저장소 런처를 바꾸지 않고 기존 임시 Playwright 경로를 사용했다.
- Windows·실제 운영 CMS·원본 CSS를 통한 시각 등급 비교는 실행하지 않았다. 별도 웹 편집기 저장·가져오기 흐름은 이번에는 다시 실행하지 않았다.
- 임시 재현 스크립트·관측값은 `/tmp/stage4-weakset/`, 공식 검사 로그는 `/tmp/stage4-weakset-*.log`에 있다. 핵심 입력·실제 결과는 위에 직접 기재했다.

**최종 판정: 이번 재검수 범위 완료.**

## 이전 검수 기록 보존

아래는 75ffd4d의 과거 검수 원문(보고 커밋 8b0ca21)과 그 안의 이전 기록이다. 과거 Important 항목은 현재 미해결 지적이 아니며, 현재 판정은 이 문서 상단을 따른다.

<details>
<summary>이전 재검수 원문 — 75ffd4d</summary>

# 4단계 P4 재검수 결과 — 75ffd4d

- 검수일: 2026-11-15.
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `75ffd4dcba3d9b3972cb949fb27e4f5dd682a310`.
- 범위: `3e27ba5..75ffd4d`. 반영 기록: `docs/review-stage4-fixes.md` 마지막 장 R-I-1.
- 애플리케이션·테스트·fixture는 수정하지 않았다. 이번 변경은 이 검수 문서뿐이다.

## 판정

**수정 후 재확인 필요.** 이전 A·B 입력은 수정됐다. 검사한 정상 마크업에서는 새로 잘못 fallback되는 사례가 없었지만, 글머리의 자식에 cms- 클래스가 있으면 중첩 목록을 검사하지 않는 잔여 경로가 있다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 이번 범위에서 확정한 항목 없음 |
| Important | 1 | R-I-1 잔여: cms- 클래스 후손이 있는 글머리의 중첩 목록 검사 누락 |
| Minor | 0 | 별도 확정 항목 없음 |

## 이전 R-I-1 입력 재현 — 직접 실행

- A: `<li class="cms-list-item">FIRST<ul><li>SECOND</li><li>THIRD</li></ul></li>` → `LOSSY_PARSE`, 섹션 fallback. 원본 HTML·텍스트 보존.
- B: `<li class="cms-list-item"><span><section><p>FIRST</p><p>SECOND</p></section></span></li>` → `LOSSY_PARSE`, 섹션 fallback.
- 클래스 없는 단순 `<p>FIRST</p><p>SECOND</p>` → `success`, fallback 0, `FIRST<br>SECOND`.
- 위 A·B는 코어와 실제 Chromium 양쪽에서 확인했다. 이전 입력의 수정 효과는 확인되지만, 아래 입력 때문에 전체 문제가 해결됐다고 판정하지 않는다.

## Important

### R-I-1 잔여. 글머리 안 cms- 클래스 후손 때문에 검사에서 빠진 중첩 목록이 조용히 합쳐짐

**위치:** `packages/core/src/parse/common.ts:180`~`:187`, 특히 `leafItem` 조건 `:181`. 파서의 소비 지점은 `packages/core/src/types/type06.ts:53`.

**확인 방식:** 최소 HTML 코어 변환, 클래스 하나만 제거한 대조 실험, 실제 Chromium 원본/출력 텍스트 비교로 **직접 실행**했다. 아래 원인 설명은 **정적 판독**이다. I-2/R-I-1의 잔여 사례이며, 정상 원본의 잘못된 fallback과는 다른 문제다.

**재현 입력:**

```html
<div class="cms-container">
  <section class="cms type06"><div class="cms-inner">
    <ul class="cms-column-list">
      <li class="cms-list-item"><div class="cms-inner-box">
        <div class="cms-description-box">
          <p class="cms-description">CARD</p>
          <ul class="cms-bullet-list">
            <li class="cms-list-item">
              <p class="cms-description">FIRST</p>
              <ul><li>SECOND</li><li>THIRD</li></ul>
            </li>
          </ul>
        </div>
      </div></li>
    </ul>
  </div></section>
</div>
```

**실제 결과:** `status="success"`, diagnostics `[]`, fallback 0. `items[0].subitems[0].text`는 `FIRST<br>SECONDTHIRD`, 출력은 다음과 같다.

```html
<li class="mig-item"><span class="mig-desc">FIRST<br>SECONDTHIRD</span></li>
```

Chromium 원본 글머리 `innerText`는 `FIRST\n\nSECOND\nTHIRD`이고, 출력 글머리는 `FIRST\nSECONDTHIRD`이다. SECOND와 THIRD의 목록 경계가 경고 없이 사라진다.

**대조 입력 — 직접 실행:** 위 FIRST의 `<p class="cms-description">`에서 클래스만 제거하면 `LOSSY_PARSE` 및 섹션 fallback이 된다. 반대로 그 문단을 `<span class="cms-description">FIRST</span>` 또는 `<span class="cms-extra">FIRST</span>`으로 바꾸면 다시 success·경고 없음이며 출력 텍스트가 `FIRSTSECONDTHIRD`로 합쳐진다. 실제 글 클래스가 아닌 임의의 cms- 클래스도 부모 li의 검사 여부를 바꾼다.

**기대 결과:** 파서가 한 글머리의 rich 값으로 읽는 전체 범위에 중첩 목록이 있으므로, 자식 클래스나 FIRST의 감싸는 방식과 관계없이 `LOSSY_PARSE` 및 섹션 fallback으로 보존해야 한다. 지원하지 않는 구조라면 그 이유로 거부할 수 있지만, 경계를 지운 성공 결과로 내보내서는 안 된다.

**원인 — 정적 판독:** 해당 li는 직접 텍스트 노드가 없고, `p.cms-description`이라는 cms- 후손이 있어 `holdsText`와 `leafItem`이 모두 false다. 검사 대상이 된 자식 p는 형제 ul을 포함하지 않는다. ul 자체도 직접 텍스트가 없고, 안쪽 li들은 SECOND/THIRD만 가져 문제를 찾지 못한다. 반면 type06 파서는 바깥 글머리 li 전체를 `richFrom()`으로 읽어 내부 ul을 텍스트로 풀어낸다. **구조 분류 대상과 파서가 소비하는 전체 글 범위의 불일치가 아직 남아 있다.**

이전 A·B의 수정이 잘못됐다는 뜻은 아니다. A의 직접 텍스트 FIRST를 문단/인라인 자식으로 감싸면 같은 손실이 남는다는 일반화 사례다. 같은 원인인 세 변형은 한 건으로 집계했다.

## 정상 원본의 잘못된 fallback 확인

다음은 모두 **직접 실행**하여 이전 `3e27ba5` 코드와 현재 코드를 비교했다. 이전 코드는 임시 디렉터리에 펼쳤고 저장소 소스는 변경하지 않았다.

| 입력군 | 비교 수 | 결과 |
|---|---:|---|
| type01 및 P2/P3/P4 18개 타입 × 원본/무배경/이미지 배경/색 배경 | 76 | 출력 HTML 전부 동일 |
| P2/P3/P4 18개 타입 × 공백 변형/이미지 제거/인라인 서식/문단 변형 | 72 | 이전·현재 HTML 동일, 모두 fallback 0 |
| 클래스 없는 글머리의 p+p, cms-description 문단+p, strong/span 인라인 글 | 3 | 모두 success, 문단은 br 경계 유지 |

72개 정상 변형의 구체적 구성은 다음과 같다.

- 공백: 원본의 요소 뒤 줄바꿈 앞에 공백·탭을 추가.
- 이미지 제거: 원본의 모든 img 요소를 제거. 아이콘 없는 type16도 포함.
- 인라인 서식: 첫 해당 `p.cms-description` 또는 `p.cms-title`의 글을 strong으로 감싸고 `br + em(EXTRA)` 추가.
- 문단 변형: 첫 `p.cms-description`을 `div.cms-description > p(기존 글) + p(EXTRA)`로 바꿈. 해당 요소가 없는 타입은 원본을 그대로 비교했다.

**이 범위에서는 정상 원본을 새로 fallback시키는 사례를 찾지 못했다.** 실제 운영 CMS 자료가 없으므로 모든 정상 원본에서 오탐이 없다고 확대 해석하지 않는다. 글이 없는 구조용 li를 무조건 검사하는 대신 cms- 후손으로 제외하는 의도는 이해되지만, 위 R-I-1처럼 실제 rich 소비 범위를 제외하는 부작용이 있다.

## P2·P3와 기존 사례 회귀 확인 — 직접 실행

이전 재현 입력 및 구조 변형 70건도 다시 실행하고 결과를 기록했다.

| 사례 | 현재 결과 |
|---|---|
| type15 원문 문단+목록 | 두 값 모두 출력, 합의한 목록→문단 순서 유지, success |
| type26 colspan 21 / rowspan 0 | 값 유지, success |
| type26 colspan 0x10 / 2foo | LOSSY_PARSE 및 섹션 fallback |
| type26 문단+목록, span 안 블록 | LOSSY_PARSE 및 섹션 fallback |
| type26 section/article 안 문단 2개 | FIRST<br>SECOND, success |
| type26 글+문단 / section 안 글+문단 | FIRST<br>SECOND, success. 사용자가 지정한 정책 유지 |
| I-1 아이콘 없는 type16 | 공식 브라우저의 이미지 없는 18타입 × 세 화면 검사 통과 |

정상 마크업 비교와 별개로, 위처럼 원본 보존이 필요한 입력은 계속 fallback되는 것도 확인했다. 이번 잔여 결함 외에 이 입력군에서 새 회귀는 확인하지 못했다.

## 실행 결과와 한계

| 직접 실행한 검사 | 결과 |
|---|---|
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm test` | 종료 0, **500 passed / 1 skipped**, 파일 26 passed / 1 skipped |
| 같은 환경의 `npm run test:browser` | 종료 0, **120 passed**, 파일 4 passed |
| `npm run lint` | 종료 0 |
| `npm run typecheck` | 종료 0 |
| 추가 최소 입력·대조 | 8개 변형과 클래스 제거 대조 1개 |
| 실제 Chromium | 잔여 결함 3변형, 정상 문단, 이전 A·B의 변환 결과 확인 |
| 이전/현재 정상 출력 비교 | 76개 + 72개 조합 |
| 기존 사례 재실행 | 70건 결과 기록 |

- 전체 검사에 브라우저 검사가 포함되므로 500과 120을 합산하지 않는다. inventory 1개 건너뜀은 실제 cms/ 자료 부재에 따른 기존 조건이다.
- Linux, Node v24.22.1, Chromium 156.0.8078.79에서 실행했다. 저장소 런처는 변경하지 않았고 기존 임시 Playwright 경로를 사용했다.
- Windows·실제 운영 CMS·원본 CSS를 통한 시각 등급 비교는 실행하지 않았다. 이번 별도 브라우저 재현은 HTML의 DOM·텍스트를 확인했고, 웹 편집기 저장/가져오기 흐름은 별도로 다시 실행하지 않았다.
- 임시 입력·스크립트·관측값은 `/tmp/stage4-lastcheck/`, 공식 검사 로그는 `/tmp/stage4-finalcheck-*.log`에 있다. 임시 경로는 저장소 산출물이 아니므로 핵심 재현 입력과 실제 결과를 위에 직접 기재했다.

**최종 판정: 수정 후 재확인 필요.**

## 이전 검수 기록 보존

아래는 `da153b1` 재검수 원문(보고 커밋 `3e27ba5`)과 그 안의 이전 기록이다. 과거 재현 입력의 이력을 보존하며, 현재 판정·재현 입력은 이 문서 상단을 따른다.

<details>
<summary>이전 재검수 원문 — da153b1</summary>

# 4단계 P4 재검수 결과 — da153b1

- 검수일: 2026-11-15.
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `da153b1eacb4b0a1579cf497cce8941266f1d29b`.
- 범위: `0db22f1..da153b1`. 기준 문서: `docs/review-stage4-fixes.md` 및 검수 요청서 7장.
- 애플리케이션·테스트·fixture 코드는변경하지 않았다. 이번 변경은 이 검수 문서뿐이다.

## 판정

**수정 후 재확인 필요.** 이전 I-1은 수정됐고, I-2도 최초 재현 입력에서는 해결됐다. 다만 type06에서 읽는 글머리 항목과 새 구조 검사 대상이 일치하지 않아 I-2의 우회 입력이 남아 있다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 이번 범위에서 확정한 항목 없음 |
| Important | 1 | R-I-1: 글머리 항목의 클래스에 따라 구조 검사 누락 |
| Minor | 0 | 별도 확정 항목 없음 |

## 이전 지적 수정 확인 — 직접 실행

### I-1: type16 아이콘 없는 행

이전 검수의 최소 HTML, 원본 fixture의 첫 아이콘만 제거한 HTML, type16 기본 데이터 세 가지를 모두 다시 렌더했다. 실제 Chromium에서 PC 1100 / 모바일 360 / 에디터 1100을 측정한 결과 세 입력 모두 다음과 같다.

| 화면 | 이전 글 묶음 폭 | 현재 글 묶음 폭 | 현재 grid-column |
|---|---:|---:|---|
| PC 1100 | 30px | 944px | 2 |
| 모바일 360 | 30px | 약 212.094px | 2 |
| 에디터 1100 | 30px | 약 952.094px | 2 |

**수정 확인.** `packages/core/src/types/type16.ts`의 빈 아이콘 조건에서 `grid-column: 2`가 적용되어 글이 본문 칸에 놓인다. 기존 아이콘 있는 원본 출력은 이전과 동일하다.

### I-2: 원문의 문단·목록 경계

- 이전 최소 입력의 `li.cms-list-item.cms-description > p + p`: `success`, diagnostics `[]`, fallback 0, `FIRST<br>SECOND`. Chromium에서도 FIRST/SECOND 사이 줄 경계 유지.
- 이전 원본 fixture 변형의 중첩 목록: `LOSSY_PARSE`, 섹션 fallback으로 원본 보존.
- P2·P3·P4 원본 fixture 18종 중 첫 `p.cms-description`이 있는 17종에 대해, 이를 `div.cms-description`으로 바꿔 문단 2개·중첩 목록·span 안 블록을 각각 넣었다. 글자 경계 소실 없이 변환하거나 fallback 처리됐고, 목록·숨은 블록은 모두 fallback이었다. type17은 해당 요소가 없어 이 변형 검사에서 제외했다.

**최초 입력의 수정은 확인했지만, 아래 R-I-1 때문에 일반화된 해결로 판정하지 않는다.**

## Important

### R-I-1. type06 글머리에서 cms-description 클래스가 없으면 구조 검사가 빠져 경계가 다시 사라짐

**위치:** `packages/core/src/types/type06.ts:53`(모든 글머리 li를 `richFrom()`으로 읽음), `packages/core/src/parse/common.ts:175`~`:176`(특정 글 클래스가 있는 요소만 검사), `:138` 이후 `richFrom()`의 직접 자식 블록 검사. 호출 지점은 `packages/core/src/parse/original.ts:78`.

**확인 방식:** 최소 HTML 코어 변환, 클래스 하나만 추가한 대조 실험, Chromium 원본/출력 텍스트 비교로 **직접 실행**했다. 원인 설명은 **정적 판독**이다. 새로 생긴 회귀라기보다 I-2 수정의 잔여 경로다.

**재현 입력 A — 중첩 목록:**

```html
<div class="cms-container">
  <section class="cms type06"><div class="cms-inner">
    <ul class="cms-column-list">
      <li class="cms-list-item"><div class="cms-inner-box">
        <div class="cms-description-box">
          <p class="cms-description">CARD</p>
          <ul class="cms-bullet-list">
            <li class="cms-list-item">FIRST<ul><li>SECOND</li><li>THIRD</li></ul></li>
          </ul>
        </div>
      </div></li>
    </ul>
  </div></section>
</div>
```

**실제 결과:** `status="success"`, diagnostics `[]`, fallback 0. `items[0].subitems[0].text`는 `FIRSTSECONDTHIRD`, 출력은 다음과 같다.

```html
<li class="mig-item"><span class="mig-desc">FIRSTSECONDTHIRD</span></li>
```

Chromium 원본 `innerText`의 `FIRST\nSECOND\nTHIRD`가 출력에서 `FIRSTSECONDTHIRD`로 합쳐진다.

**재현 입력 B — 줄 안 요소 안에 숨은 블록:** 위 입력의 안쪽 글머리 li만 아래처럼 바꾼다.

```html
<li class="cms-list-item"><span><section><p>FIRST</p><p>SECOND</p></section></span></li>
```

실제 HTML 파서가 만든 DOM과 Chromium에서도 확인했다. 역시 `success`, diagnostics `[]`, fallback 0이며 `FIRSTSECOND`를 출력한다. 원본의 문단 경계가 사라진다.

**클래스 대조 — 직접 실행:** A·B의 해당 글머리 li에 `cms-description` 클래스 하나만 추가하면 둘 다 `LOSSY_PARSE` 및 섹션 fallback이 된다. 반대로 클래스 없는 항목의 단순 `<p>FIRST</p><p>SECOND</p>`는 현재 파서가 정상 수용하여 `FIRST<br>SECOND`로 옮긴다. 따라서 문제는 항목 자체를 지원하지 않는다는 데 있지 않고, 파서가 수용하는 항목 중 일부에만 새 검사가 적용된다는 데 있다.

**기대 결과:** 파서가 소비하는 모든 글머리 항목에 동일한 구조 규칙을 적용해야 한다. 중첩 목록과 줄 안 요소 속 블록은, 클래스 유무에 관계없이 반영 기록이 정한 `LOSSY_PARSE` 및 섹션 fallback으로 보존해야 한다. 해당 마크업이 지원 범위 밖이라면 그 이유로 거부해도 되지만 조용히 합쳐서 성공 처리해서는 안 된다.

**원인 — 정적 판독:** type06은 `listItems()`가 고른 `li.cms-list-item` 전체를 읽으며 `cms-description`을 요구하지 않는다. 반면 `textStructureProblems()`는 `cms-description`·`cms-title`·`cms-thin-title`·`cms-eyebrow`가 있는 요소만 살핀다. 이 불일치 때문에 클래스 없는 글머리 내부 목록은 검사되지 않고, `richFrom()`과 공백을 지우는 `uncoveredText()`를 거쳐 손실을 성공으로 처리한다. 숨은 블록도 같은 검사 누락으로 통과한다.

## Critical / Minor

이번 범위에서 별도 확정한 항목 없음. 테스트가 통과해도 위 추가 입력의 성공 판정 손실은 남는다.

## P2·P3 및 3단계 사례 회귀 확인

아래 항목은 모두 **직접 실행**했다.

| 이전 사례 | 현재 결과 | 판단 |
|---|---|---|
| type15 원문: CARD → EXTRA_PARA 문단 → BULLET 목록 | 두 값 모두 출력, 목록→문단 순서 유지, success·경고 없음. Chromium에서도 확인 | 누락 재발 없음. 합의한 순서 정규화 유지 |
| 표 `colspan="21"` / `rowspan="0"` | 값 보존, success | 회귀 없음 |
| 표 `colspan="0x10"` / `colspan="2foo"` | `LOSSY_PARSE`, 섹션 fallback | 회귀 없음 |
| 표 안 문단 2개 + 목록(최초 I-3 원문) | `LOSSY_PARSE`, 섹션 fallback | 회귀 없음 |
| 표 안 section/article > p + p | `FIRST<br>SECOND`, success | 경계 유지 |
| 표 안 목록 / span 안 블록 | `LOSSY_PARSE`, 섹션 fallback | 회귀 없음 |
| 잘못된 JSON rowspan 객체·false·배열 | `INVALID_DATA`, 해당 섹션만 fallback, 정상 KEEP_VISIBLE 유지 | 숫자 검증·예외 격리 회귀 없음 |
| 웹 type26 칸 글, type09·07 항목 글 비우기 | INVALID_DATA 없음, 새로고침 후에도 유지 | 빈 글 편집 회귀 없음 |

### type26의 의도된 변경: 칸 안 글 + 문단

다음 두 입력을 코어 및 Chromium에서 확인했다.

```html
<td>FIRST<p>SECOND</p></td>
<td><section>FIRST<p>SECOND</p></section></td>
```

둘 다 `success`, diagnostics `[]`, fallback 0이며 `<td>FIRST<br>SECOND</td>`로 출력된다. 원본/출력 모두 FIRST와 SECOND 사이 줄 경계가 있다. **이전 fallback에서 성공 변환으로 바뀌었지만, 사용자가 지정한 정책 변경과 일치하므로 회귀로 세지 않는다.**

### 일반 원본 출력·웹 편집

- 이전 `0db22f1` 코드를 임시 디렉터리에 펼쳐 type01 및 P2/P3/P4 18개 타입 × 원본/무배경/이미지 배경/색 배경 **76개 조합**의 HTML을 대조했다. 원본 fixture처럼 중첩 블록이 없는 입력의 출력은 전부 동일했다. type16 아이콘 있는 원본도 동일하다.
- 실제 Chromium 웹에서 P2/P3 11개 타입을 각각 편집→JSON 다운로드→가져오기→브라우저 새로고침했다. 모든 입력에서 편집 값과 출력 HTML이 유지됐다. type15·type26을 포함한다.
- 공식 브라우저 검사 120개도 통과했다. 기존 이미지 있는 배치와 새로 추가된 18타입 × 3화면의 이미지 없는 배치 검사를 포함한다.

## 실행 결과와 한계

| 직접 실행한 검사 | 결과 |
|---|---|
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm test` | 종료 0, **478 passed / 1 skipped**, 파일 26 passed / 1 skipped |
| 같은 환경의 `npm run test:browser` | 종료 0, **120 passed**, 파일 4 passed |
| `npm run lint` | 종료 0 |
| `npm run typecheck` | 종료 0 |
| 별도 코어 변환 입력 | 70건 기록: 이전 입력·글 구조 변형·표·클래스 없는 글머리 등. 원인 대조 2건 및 숫자 검증 3건 별도 실행 |
| type16 글 폭 | 최소 입력 / fixture 아이콘 제거 / 기본 데이터 × 세 화면 확인 |
| 원본 HTML 비교 | 이전/현재 76개 조합 동일 |
| 웹 P2/P3 편집·저장·새로고침 | 11타입 및 빈 글 3필드 확인 |

- 전체 검사에 브라우저 검사가 포함되므로 478과 120을 합산하지 않는다. inventory 1개 건너뜀은 실제 `cms/` 자료가 없는 기존 조건이다.
- Linux, Node v24.22.1, 시스템 Chromium 156.0.8078.79 사용. 저장소 테스트·런처를 바꾸지 않고 기존 임시 Playwright 경로를 사용했다.
- Windows·실제 운영 CMS·원본 CSS를 통한 시각 등급 비교는 이번에도 실행하지 않았다. 모든 가능한 입력에 대한 무결함을 의미하지 않는다.
- 임시 입력·스크립트·관측 JSON은 `/tmp/stage4-recheck/`, 공식 검사 로그는 `/tmp/stage4-recheck-*.log`에 있다. 재현에 필요한 입력과 결과는 이 문서에 직접 기재했다.

**최종 판정: 수정 후 재확인 필요.**

## 부록: 최초 4단계 검수 원문

아래는 `97cd9af`를 검수한 과거 기록(보고 커밋 `0db22f1`)이다. 과거 Important 2는 현재 미해결 건수가 아니며, 현재 판정은 위의 Important 1이다. 원문의 재현 입력을 보존한다.

<details>
<summary>최초 4단계 검수 원문 — 97cd9af</summary>

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

</details>

</details>

</details>
