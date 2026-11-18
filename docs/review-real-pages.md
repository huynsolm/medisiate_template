# 블록 순서 목록 marker 초기화 재검수 — b4ab7b1

- 검수일: 2026-11-18 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `b4ab7b1`, 범위: `c8a3711..b4ab7b1`.
- 기준: `docs/review-real-pages-fixes.md` 마지막 장의 목록 기본 marker 중복 수정.
- 실행 전 `cp -r reference/cms-original/. cms/`로 로컬 cms/를 준비했다. cms/는 커밋하지 않는다. 코드·테스트·원본 자료는 수정하지 않았으며 이번 변경은 이 문서뿐이다.

## 판정

**이전 Minor M-1은 해결됐다. 이번 범위에서 추가 수정이 필요한 결함을 확인하지 못했다.**

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 확정 항목 없음 |
| Important | 0 | 확정 항목 없음 |
| Minor | 0 | 이전 기본 marker·호스트 장식 중복 해결, 추가 확정 항목 없음 |

## 이전 재현 입력 — 직접 실행

이전 문서의 정확한 type01 입력을 전체 변환기로 다시 실행했다.

```html
<div class="cms-container">
  <section class="cms type01"><div class="cms-inner">
    <div class="cms-description-box">
      <p class="cms-description">BODY</p>
      <ul class=""><li></li></ul>
    </div>
  </div></section>
</div>
```

**실제:** blocks·partial로 변환되며 BODY와 빈 목록 항목은 유지된다. 출력 ul.mig-list.type-bullet에 list-style:none·padding-left:0·margin:0이 있다. Chromium 1100/360px에서 계산된 list-style-type=none을 확인했다. 360px 전체 뷰포트 캡처를 직접 열어 **검정 기본 글머리는 없어지고 파란 호스트 장식 하나만 남는 것**을 확인했다. 빈 항목을 삭제해서 중복을 숨긴 것이 아니다.

**기대 결과 충족:** 데이터·항목은 유지하면서 두 marker 체계의 중복을 제거한다. 호스트 ::before의 원형 장식과 기본 marker를 동시에 그리던 이전 Minor는 재현되지 않았다.

## 번호·표시 회귀 — 직접 실행

| 입력 | 실제 결과 |
|---|---|
| 중첩 ol start=4 | 안쪽 counter-reset=mig-counter-sub 3, increment=mig-counter-sub 1, ::before는 해당 카운터 사용 |
| 연속 3단계 ol start=5 | 3단계 counter-reset=mig-counter-sub-sub 4, 해당 단계 lower-roman 카운터 사용 |
| ul 안의 ol start=4 | 번호 단계가 다시 1단계, counter-reset=mig-counter 3 |
| ol → ul → ol start=4 | 안쪽 번호 역시 mig-counter 3 유지 |
| 위 번호·혼합 목록 전체 | 1100/360px에서 모든 .mig-list의 list-style-type=none, padding-left=0px, margin=0px |
| PC 전용 목록·빈 항목 | 1100px 표시·360px 숨김 유지. 기존 list.only=pc 보존 |
| 모바일 전용 상자의 목록 | list.only=mo 유지. 기존 표시 조건 보존 |
| 완전 숨김 목록 | 이전처럼 안전하게 제외되고 불필요한 항목을 만들지 않음 |

번호의 각 단계·시작 순번과 CSS 생성 방식이 유지되는지 DOM/CSS로 측정했다. 프로젝트 브라우저 검사에서도 루트 start=3의 mig-counter 2, 중첩 시작값과 숨김 항목 수가 통과했다. 초기화가 실제 counter-reset을 덮어쓰지 않았다.

## 기타 회귀와 정적 판독

- **직접 실행:** 정상 type10 parts, 미읽기 type01/type23 입력, 이전 번호·숨김·지원 밖 구조 입력을 재실행했다. 이번 초기화 때문에 변환 경로·모델의 내용이 달라지는 추가 사례를 확인하지 못했다.
- **직접 실행:** 편집기 정상 parts의 문단·글머리 수정·이동·삭제·JSON 저장·재불러오기에서 배열 순서·링크·서식과 재불러오기 전후 HTML이 유지됐다.
- **정적 판독:** `packages/core/src/types/blocks.ts:231`~`:236`은 ul/ol 모두에 LIST_RESET을 적용하고 counterReset을 뒤에서 합친다. 빈 counter 객체를 사용해 시작값이 없는 목록에도 초기화가 들어간다. 각 재귀 단계의 목록마다 동일하게 적용된다.
- **정적 판독:** 이 변경은 blocks 렌더러에 한정된다. mig-list를 쓰지 않는 type10 parts의 일반 글머리 ul 출력 규칙이나 파서·손실 검사에는 변경이 없다.

## 실행 검증

| 검증 | 결과 |
|---|---|
| `npm test` | 38개 파일, 992개 통과 |
| `npm run test:browser` | 5개 파일, 197개 통과 |
| `npm run lint` / `npm run typecheck` | 오류 없음 |
| `npm run convert -- --all` | 703페이지: success 356 / partial 333 / failed 14 |
| 기준 c8a3711과 703페이지 대조 | 페이지별 상태·섹션 타입 배열 변화 0개, blocks 294 → 294, fallback 50 → 50 |
| 추가 직접 검증 | 이전 중복 재현 입력, 2·3단계/글머리 혼합 번호 카운터, PC·모바일 표시, 1100/360px DOM/CSS·전체 뷰포트 캡처, 편집기 저장·재불러오기 |

추가 스크립트·JSON·캡처는 `/tmp/list-reset-review/`에만 두었으며 커밋하지 않는다. 화면 확인에는 저장소 host-style.css를 적용했다. 실제 703페이지 전체의 원본 대비 시각 비교를 완료했다는 뜻은 아니다.

## 이전 검수 기록

아래는 이전 c8a3711 검수 문서 원문이다. 당시 판정이며 현재 유효한 결함 수는 위 표를 따른다.

<details>
<summary>이전 검수 문서 원문 (c8a3711)</summary>

# 변환기 공통 미읽기 목록 검사 재검수 — 465046c

- 검수일: 2026-11-18 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `465046c`, 범위: `4e1c0bf..465046c`.
- 기준: `docs/review-real-pages-fixes.md` 마지막 장의 attempt/attemptWithNotes 공통 검사.
- 실행 전 `cp -r reference/cms-original/. cms/`로 로컬 cms/를 준비했다. cms/는 커밋하지 않는다. 코드·테스트·원본 자료는 수정하지 않았으며 이번 변경은 이 문서뿐이다.

## 판정

**이전 Important I-1은 해결됐다. 이번 검사 변경에서 추가 Critical·Important를 확인하지 못했다.** 기존 blocks 출력에서 기본 글머리와 호스트 장식이 중복되는 시각적 문제를 후속 Minor 1건으로 구분한다. 해당 렌더링은 이번 변경 전부터 존재하며 공통 검사 적용 실패가 아니다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 확정 항목 없음 |
| Important | 0 | 이전 type01 검사 누락 해결, 추가 확정 항목 없음 |
| Minor | 1 | M-1 blocks의 기본 글머리·호스트 장식 중복(변경 범위 밖 기존 렌더링) |

## 이전 재현 입력 및 적용 범위 — 직접 실행

이전 문서의 정확한 type01 입력을 다시 사용했다.

```html
<div class="cms-container">
  <section class="cms type01"><div class="cms-inner">
    <div class="cms-description-box">
      <p class="cms-description">BODY</p>
      <ul class=""><li></li></ul>
    </div>
  </div></section>
</div>
```

| 입력·검사 | 실제 결과 / 기대 결과 |
|---|---|
| 위 type01 입력 | blocks·partial·fallback 0. BODY와 빈 목록 항목을 보존 / 미읽기 항목을 조용히 삭제하지 않음 |
| ul이 d-none d-lg-block인 이전 변형 | blocks의 list.only=pc. 1100px에서 항목 표시, 360px에서 숨김 / 기대 충족 |
| ul이 d-none인 변형 | type01·success, 숨긴 빈 목록 생략 / 모든 화면에서 숨은 항목을 불필요하게 거부하지 않음 |
| 같은 type23 대조 입력 | 일반/PC 전용은 blocks, 완전 숨김은 type23. 기존 finish 사용자와 처리 일치 |
| type00의 보이는 빈 목록 | 추가된 typed 변환 테스트에서 fallback 확인 / 별도 파서 적용 범위 포함 |
| 이전 type10 PC·모바일 전용 빈 상자 | blocks로 넘어가 list.only=pc/mo 유지 / 기존 수정 유지 |

Chromium 1100/360px에서 원본·출력 목록과 항목의 실제 표시 여부를 측정했다. 360px 출력 캡처도 직접 열어, 이전에 누락되던 항목이 blocks에 남는 것을 확인했다. 글머리 장식의 모양은 아래 별도 Minor로 기록했다.

## 설명 분리 재시도 — 직접 실행과 정적 판독

- **직접 실행:** 정상 type09 앞뒤 설명은 여전히 notes로 변환됐다. 안전한 링크·strong·문단 순서, 위험한 링크·버린 style의 warn 진단도 유지됐다.
- **직접 실행, 제어 실험:** finish를 사용하지 않고 빈 목록을 무시하도록 만든 검증용 type09 파서로, 머리글·앞 설명 상자·빈 ul/li 입력을 변환했다. parse는 두 번 호출됐고 두 번째에는 설명 상자가 실제로 분리되어 있었다. 결과는 미읽기 항목 1개 사유의 fallback이었으며 설명 분리 성공으로 통과하지 않았다. 원본 직렬화도 복원됐다. 이는 실제 원본에서 같은 파서 오류가 발생했다는 주장이 아니라 attemptWithNotes 경로의 별도 검증이다.
- **정적 판독:** attempt는 타입 parse가 명시적으로 실패하지 않은 경우 unreadListItems를 확인한 뒤 섹션 생성·순서 검사를 한다. 설명 분리 경로도 finally로 원본 DOM을 복원한 뒤 미읽기 항목을 확인한다. 재분류와 blocks 시도는 기존 attempt를 사용하므로 동일 검사를 받는다.
- **정적 판독:** readAsText/readInParts는 duplicateReads가 지우는 readCount와 별개라 finish 이후 재검사에도 읽기 기록이 남는다. 각 시도는 resetReads를 호출하므로 이전 시도의 읽기 기록이 다음 시도를 무조건 통과시키지 않는다.

정상 문단·글머리 parts, 중첩/이미지/표/떠 있는 글/늦은 소제목/li 밖 글, 번호 및 숨김 입력도 이전과 동일한 입력으로 재실행했다. 검사한 입력에서 새 공통 검사에 의한 추가 손실이나 정상 구조의 거부는 확인하지 못했다. 편집기 parts 수정·이동·삭제·JSON 저장·재불러오기에서도 배열 순서·링크·서식과 HTML이 유지됐다.

## Minor — 후속 관찰, 이번 변경의 회귀 아님

### M-1. blocks의 글머리 하나에 기본 marker와 호스트 ::before가 함께 보임

**위치:** `packages/core/src/types/blocks.ts:233`~`:234`의 ul.mig-list.type-bullet 출력; `reference/host-style.css:5295`~`:5305`의 li.mig-item::before 원형 장식.

**재현 — 직접 실행:** 위 type01 최소 입력을 현재 전체 변환기로 변환하고, 생성 HTML에 저장소 host-style.css를 적용해 Chromium 360px에서 연다.

**실제:** 데이터와 DOM의 항목은 1개지만, 화면에서는 **기본 검정 글머리와 파란 원형 장식**이 나란히 보인다. DOM/CSS 측정에서 ul의 list-style-type=disc·li의 display=list-item이 남아 있고, 같은 li에 호스트 ::before 장식이 적용된다. 360px 캡처를 직접 열어 확인했다. 새 검사가 빈 항목을 누락하지 않고 blocks로 보내면서 기존 렌더링 표현을 관찰한 것이다.

**기대:** 목록 항목 하나의 글머리 장식이 두 체계로 중복 표시되지 않아야 한다. 호스트 장식을 사용할 때 기본 marker가 함께 남지 않도록 렌더링 계약을 맞출 필요가 있다. 항목 데이터·화면별 표시 자체는 유지되므로 Minor로 분류한다.

**기준 버전 대조 — 직접 실행:** 4e1c0bf에서 같은 구조의 원문 타입을 type99로 바꿔 blocks 경로를 선택했다. 그때 생성한 HTML은 현재 type01 입력의 blocks HTML과 byte 단위로 동일했다. 이전 type01 자체가 blocks로 갔다는 뜻은 아니며, 중복 장식이 이번 가드 변경으로 새로 만들어진 렌더링이 아님을 구분하는 제어 입력이다.

## 실행 검증

| 검증 | 결과 |
|---|---|
| `npm test` | 38개 파일, 992개 통과 |
| `npm run test:browser` | 5개 파일, 197개 통과 |
| `npm run lint` / `npm run typecheck` | 오류 없음 |
| `npm run convert -- --all` | 703페이지: success 356 / partial 333 / failed 14 |
| 기준 4e1c0bf와 703페이지 대조 | 페이지별 상태·섹션 타입 배열 변화 0개, blocks 294 → 294, fallback 50 → 50 |
| 추가 직접 검증 | type01/type23 일반·완전 숨김·PC 전용 비교, type10 표시·번호·지원 밖 구조, notes 재시도 제어 실험, 1100/360px DOM/CSS·캡처, 편집기 저장·재불러오기 |

추가 입력은 실제 703페이지의 결함으로 집계하지 않는다. 원본 비교에는 Bootstrap 4.6.2와 원본 cms.css, 출력에는 저장소 host-style.css를 적용했다. 원본 배포 사이트의 Bootstrap 버전까지 확정한 검사는 아니다. 추가 스크립트·JSON·캡처는 `/tmp/unread-list-fix-review/`에만 두었으며 커밋하지 않는다.

## 이전 검수 기록

아래는 이전 4e1c0bf 검수 문서 원문이다. 당시 판정이며 현재 유효한 결함 수는 위 표를 따른다.

<details>
<summary>이전 검수 문서 원문 (4e1c0bf)</summary>

# 미읽기 목록 공통 손실 검사 재검수 — 533f825

- 검수일: 2026-11-18 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `533f825`, 범위: `c631f21..533f825`.
- 기준: `docs/review-real-pages-fixes.md` 마지막 장의 unreadListItems 및 type10 읽기 실패 처리.
- 실행 전 `cp -r reference/cms-original/. cms/`로 로컬 cms/를 준비했다. cms/는 커밋하지 않는다. 코드·테스트·원본 자료는 수정하지 않았으며 이번 변경은 이 문서뿐이다.

## 판정

**수정 후 재확인 필요.** 이전 type10의 PC·모바일 전용 빈 목록 입력은 이제 blocks로 넘어가 표시 조건을 유지한다. 다만 모든 타입에 적용한다는 공통 검사가 finish를 호출하지 않는 type01에는 적용되지 않아 같은 종류의 누락이 남는다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 확정 항목 없음 |
| Important | 1 | I-1 type01의 별도 파서가 공통 미읽기 목록 검사를 우회 |
| Minor | 0 | 확정 항목 없음 |

아래는 추가 최소 입력이다. 실제 703페이지에서 발생했다고 집계하지 않는다. 이번 변경 이전에도 있던 경로이며, 새 검사의 적용 범위 누락으로 기록한다.

## 이전 type10 입력 확인 — 직접 실행

| 입력 | 현재 결과 / 기대 결과 |
|---|---|
| PC 전용 상자 + 빈 ul/li | blocks·partial, 안쪽 list.only=pc·빈 항목 유지. 1100px에서 항목 표시, 360px에서 숨김 / 기대 충족 |
| 모바일 전용 상자 + 빈 ul/li | blocks·partial, list.only=mo 유지. 화면별 표시 보존 / 기대 충족 |
| 표시 클래스 없는 빈 ul/li | type10·success, parts의 빈 bullet 유지 / 정상 표시를 무조건 삭제하지 않음 |
| 모든 화면에서 숨긴 상자/조상 + 빈 ul/li | type10 실패 후 type02로 재분류되며 숨긴 빈 구조 제외. 불필요한 글머리 없음 / 기대 충족 |
| 번호 목록 start=4 / reversed·li value | blocks에서 시작값 보존 / 역순·개별 번호는 원본 보존. 기존 번호 방어 유지 |
| type23의 같은 원본 도구 밖 빈 ul/li | 직접 파서가 미읽기 1개 사유로 실패. 전체 변환은 blocks로 보존 / 공통 검사가 작동하는 대조군 |

모델·HTML·진단과 Chromium 1100/360px DOM/CSS를 대조했다. type10이 parts를 거부한 뒤 기존 desc만으로 성공하던 이전 경로는 검사한 재현 입력에서 막혔다.

## Important

### I-1. type01은 finish를 호출하지 않아 보이는 빈 목록을 여전히 조용히 버림

**위치:** `packages/core/src/types/type01.ts:72`~`:78` (별도 손실 판정과 직접 반환). 새 검사는 `packages/core/src/parse/original.ts:130` 부근 finish에서 호출되며, 이 type01 경로를 거치지 않는다.

**재현 입력 — 변환기·직접 파서·Chromium에서 실행:**

```html
<div class="cms-container">
  <section class="cms type01"><div class="cms-inner">
    <div class="cms-description-box">
      <p class="cms-description">BODY</p>
      <ul class=""><li></li></ul>
    </div>
  </div></section>
</div>
```

빈 class는 원본 도구 밖 목록 대조를 위한 것으로, 목록·항목에 cms-* 클래스가 없다.

**실제:** type01·success·fallback 0, diagnostics 빈 배열. 데이터는 image={}·desc=BODY뿐이고 안쪽 ul/li가 출력되지 않는다. Chromium 1100/360px의 원본에는 빈 글머리가 하나 보이고 출력에는 없다. 360px 원본·출력 캡처도 직접 열어 확인했다.

같은 ul을 `class="d-none d-lg-block"`으로 바꾸어도 type01·success·진단 없음이다. 원본은 1100px에서 항목이 보이는데 출력에는 없으며, 360px에서는 원본과 출력 모두 숨김 상태다. 즉 이전 type10에서 문제였던 “보이는 화면의 항목까지 삭제”가 다른 파서에 남는다.

**직접 파서 대조:** 같은 DOM에서 type01.parse 실행 후 unreadListItems를 호출하면 1개를 반환한다. 그러나 type01.parse의 반환값은 lossless=true·fallbackReason 없음이다. 같은 구조의 type23.parse는 lossless=false이고 “옮기지 않은 목록 항목 1개(빈 항목도 글머리·번호가 보임)” 사유를 반환한다. 검사 함수 자체가 이 li를 못 찾는 문제가 아니라 호출 경로 누락이다.

**기대:** 모든 타입에 적용하는 미읽기 항목 검사에 type01 같은 별도 손실 판정 경로도 포함되어야 한다. 보이는 미읽기 항목이 있으면 다음 안전 변환 또는 원본 보존으로 보내야 한다. type10에만 있는 로컬 실패 기록이나 finish 사용자만 보호하는 것으로는 범위가 충족되지 않는다.

**원인 — 정적 판독:** type01은 이미지 수·uncoveredText만으로 fallbackReason을 계산하고 직접 ParseResult를 반환한다. finish를 사용하지 않는다. 빈 li는 글·이미지가 없어 이 별도 검사와 글 순서 비교를 통과한다. 새 unreadListItems 호출은 finish 안에만 추가되어 해당 경로에 도달하지 않는다.

**기준 버전 대조 — 직접 실행:** c631f21에서도 같은 입력은 type01·success·desc=BODY·진단 없음이었다. 새 회귀라는 주장이 아니라 이번 “모든 타입” 방어에 포함되지 않은 잔여 경로다.

## 공통 검사와 회귀 확인

- **정적 판독:** unreadListItems는 richFrom의 readAsText와 markReadInParts 기록을 사용한다. 빈 richFrom 읽기도 readAsText에는 기록되므로, readCount가 빈 글 읽기를 세지 않는 기존 정책 때문에 정상 읽기를 미읽기로 오판하지는 않는다. duplicateReads가 지우는 readCount와도 별개다.
- **정적 판독:** 목록/항목 자체의 cms-* 클래스가 있는 원본 도구 구조는 명시적으로 제외한다. 모든 화면에서 숨은 항목은 조상까지 합친 visibilityOf로 제외한다. 시도별 resetReads가 기존 기록을 정리하는 흐름은 유지된다.
- **직접 실행:** type23의 일반·PC 전용 빈 목록은 전체 변환에서 blocks로 넘어가고, 모든 화면에서 숨은 빈 목록은 제외된다. type10의 정상 문단·ul, 안전한 링크·strong·em, 항상 보이는 표시 규칙은 기존대로 처리됐다.
- **직접 실행:** 중첩 목록·이미지·표·떠 있는 글·늦은 소제목·li 밖 글 및 이전 번호·숨김 입력을 재실행했다. 검사한 입력에서 새 검사로 정상 구조가 조용히 손상되는 추가 회귀는 확인하지 못했다.
- **편집기 직접 실행:** 정상 parts 수정·이동·삭제·JSON 저장·재불러오기를 실행했다. 배열 순서·링크·서식과 재불러오기 전후 HTML이 유지됐다.

## 실행 검증

| 검증 | 결과 |
|---|---|
| `npm test` | 38개 파일, 990개 통과 |
| `npm run test:browser` | 5개 파일, 197개 통과 |
| `npm run lint` / `npm run typecheck` | 오류 없음 |
| `npm run convert -- --all` | 703페이지: success 356 / partial 333 / failed 14 |
| 기준 c631f21과 703페이지 대조 | 페이지별 상태·섹션 타입 배열 변화 0개, blocks 294 → 294, fallback 50 → 50 |
| 추가 검증 | 이전 type10 입력·표시 변형, type01/type23 비교 6개, 직접 파서/미읽기 개수, 1100/360px DOM/CSS·캡처, 편집기 저장·재불러오기 |

기존 테스트 통과는 위 type01 잔여 경로까지 안전하다는 뜻이 아니다. 원본 화면 비교에는 Bootstrap 4.6.2와 원본 cms.css, 출력에는 저장소 host-style.css를 적용했다. 원본 배포 사이트의 Bootstrap 버전까지 확정한 검사는 아니다. 추가 스크립트·JSON·캡처는 `/tmp/unread-list-review/`에만 두었으며 커밋하지 않는다.

## 이전 검수 기록

아래는 이전 c631f21 검수 문서 원문이다. 당시 판정이며 현재 유효한 결함 수는 위 표를 따른다.

<details>
<summary>이전 검수 문서 원문 (c631f21)</summary>

# type10 설명 상자 표시 재검수 — 94a04bb

- 검수일: 2026-11-18 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `94a04bb`, 범위: `f327a06..94a04bb`.
- 기준: `docs/review-real-pages-fixes.md` 마지막 장의 상자·조상 visibilityOf 검사.
- 실행 전 `cp -r reference/cms-original/. cms/`로 로컬 cms/를 준비했다. cms/는 커밋하지 않는다. 코드·테스트·원본 자료는 수정하지 않았으며 이번 변경은 이 문서뿐이다.

## 판정

**수정 후 재확인 필요.** 상자·조상 숨김을 판정하는 새 검사 자체는 작동한다. 모든 화면에서 숨은 상자의 글머리 노출은 해결됐다. 그러나 한쪽 화면 전용 상자는 parts 거부 뒤 기존 desc 경로에서 목록 전체가 누락되어, 원래 보이는 화면에서도 글머리가 사라진다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 확정 항목 없음 |
| Important | 1 | I-1 parts 거부 뒤 빈 목록을 누락해 PC/모바일 전용 표시를 전부 삭제 |
| Minor | 0 | 확정 항목 없음 |

아래는 추가 대조로 확인한 최소 입력이다. 실제 703페이지에서 발생했다고 집계하지 않는다. 이전 PC 전용 상자 재현 입력의 모바일 노출은 막혔지만, PC에서의 정상 표시까지 사라지는 회귀가 남는다.

## 이전 입력 및 정상 대조 — 직접 실행

| 입력 | 현재 실제 결과 |
|---|---|
| 상자 d-none + 빈 ul/li | type10·success, parts=[]. 모든 화면에서 글머리가 없어 이전 불필요 노출 해결 |
| 조상 d-none + 상자 안 빈 ul/li | 같은 결과. 조상 숨김도 검사됨 |
| 상자 d-none d-lg-block + 빈 ul/li | parts=[]로 모든 화면에서 목록 삭제. 360px 노출은 해결됐지만 1100px의 원래 글머리도 삭제됨(I-1) |
| 같은 상자에 표시 클래스 없음 | parts=[{bullets:[{text:""}]}] 유지. 원본·출력 모두 빈 글머리 표시 |
| 일반 문단·안전한 링크·strong·em·ul | 기존 순서·서식·주소 유지, type10·success |
| 실제로 항상 보이는 규칙(d-lg-block 문단, d-none d-block 목록) | parts 정상 변환. 숨김 검사로 불필요하게 거부되지 않음 |
| ol start=4 / reversed·li value | 시작값은 blocks로 보존, 역순·개별 번호는 원본 보존. 이전 번호 방어 유지 |
| li 자체의 d-none / PC 전용 | blocks에서 완전 숨김 빈 항목 제외 / only=pc 유지. 이전 항목 표시 방어 유지 |

## Important

### I-1. PC 전용 상자의 parts 읽기를 거부한 뒤 type10이 성공해, PC에 보이던 빈 글머리까지 사라짐

**위치:** `packages/core/src/parse/original.ts:178` (거부 조건); `packages/core/src/types/type10.ts:68`~`:83` (parts 미정의 시 desc 경로로 진행해 finish 성공).

**재현 입력 — 변환기·Chromium에서 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type10"><div class="cms-inner">
    <div class="cms-header"><p class="cms-title">TITLE</p></div>
    <div class="cms-list-wrap"><ol class="cms-figure-list">
      <li class="cms-list-item">
        <div class="cms-description-box d-none d-lg-block">
          <ul><li></li></ul>
        </div>
      </li>
    </ol></div>
  </div></section>
</div>
```

**실제:** type10·success·fallback 0, diagnostics 빈 배열. `items[0].parts=[]`가 되어 안쪽 ul/li가 출력되지 않는다. Chromium 1100px의 원본에는 상자·ul·li가 보이고 빈 글머리(circle)가 하나 표시되지만, 출력에는 해당 목록 자체가 없다. 360px에서는 원본·출력 모두 글머리가 없다. 1100px 원본·출력 캡처를 직접 열어 차이를 확인했다.

**대조 입력 — 직접 실행:** 상자의 표시 클래스를 빼면 같은 빈 ul/li가 parts에 남고 출력된다. 즉 보이는 빈 목록이 일반적으로 지원되지 않는 것이 아니라, 화면별 표시 때문에 readTextParts가 undefined를 반환한 후에만 사라진다.

반대 방향도 재현했다.

```html
<div class="cms-description-box d-block d-lg-none"><ul><li></li></ul></div>
```

이 변형은 360px에서 원본 글머리가 보이지만 출력에는 없고, 여전히 type10·success·진단 없음이다.

**기대:** 한쪽 화면에서 숨는 상자는 보이는 화면의 목록을 보존해야 한다. parts로 표시 조건을 표현할 수 없어 거부했다면 기존 desc 경로가 빈 목록을 조용히 버리며 성공해서는 안 된다. 안전하게 표시를 유지하거나 원본을 보존해야 한다. 모든 화면에서 숨은 빈 구조를 제외하는 것과, 한쪽 화면에 보이는 구조를 전부 삭제하는 것은 구별해야 한다.

**원인 — 정적 판독:** 새 visibilityOf 검사로 parts가 undefined가 되는 것은 올바르다. 하지만 type10은 loose 목록의 읽기 실패를 명시적 실패로 전달하지 않고, 직접 자식 p.cms-description만 desc로 읽은 뒤 parts를 []로 만든다. 빈 li에는 글·이미지가 없어 finish와 순서 검사가 누락을 찾지 못한다. 결과적으로 다음 안전 경로로 넘어가지 않는다. visibility 계산보다 **거부 결과를 처리하는 type10 호출부**에 남은 문제다.

**기준 버전 대조 — 직접 실행:** f327a06은 같은 PC 전용 입력을 parts=[{bullets:[{text:""}]}]로 출력했다. 이는 모바일에서 과도하게 보이는 이전 결함이 있었지만 PC에서는 글머리가 남았다. 현재는 두 화면 모두 삭제되어 PC 표시가 손실된다. 이전 구현이 옳았다는 뜻이 아니라 두 화면의 기대 결과를 각각 보존해야 한다는 지적이다.

## 회귀·실행 검증

| 검증 | 결과 |
|---|---|
| `npm test` | 38개 파일, 985개 통과 |
| `npm run test:browser` | 5개 파일, 197개 통과 |
| `npm run lint` / `npm run typecheck` | 오류 없음 |
| `npm run convert -- --all` | 703페이지: success 356 / partial 333 / failed 14 |
| 기준 f327a06과 703페이지 대조 | 페이지별 상태·섹션 타입 배열 변화 0개, blocks 294 → 294, fallback 50 → 50 |
| 원본/출력 DOM·화면 대조 | 1100/360px에서 이전 입력 및 표시 없는 빈 목록·모바일 전용 목록을 대조, 1100px PC 전용 상자의 캡처 직접 확인 |
| 편집기 실제 조작 | 정상 parts 수정·이동·삭제·JSON 저장·재불러오기. 배열 순서·링크·서식 및 재불러오기 전후 HTML 유지 |

중첩 목록·이미지·표·떠 있는 글·늦은 소제목·li 밖 글도 이전 입력으로 재실행했고, parts가 이를 조용히 받아 버리는 추가 사례는 확인하지 못했다. 위 I-1은 기존 테스트들이 부재만 검사하는 화면과 원래 보이는 화면을 함께 대조하면서 확인한 사례다.

브라우저 비교는 원본에 Bootstrap 4.6.2와 원본 cms.css, 출력에 저장소 host-style.css를 적용했다. 원본 배포 사이트의 Bootstrap 버전까지 확정한 검사는 아니다. 추가 스크립트·JSON·캡처는 `/tmp/text-parts-fix2-review/`에만 두었으며 커밋하지 않는다.

## 이전 검수 기록

아래는 이전 f327a06 검수 문서 원문이다. 당시 판정이며 현재 유효한 결함 수는 위 표를 따른다.

<details>
<summary>이전 검수 문서 원문 (f327a06)</summary>

# type10 설명 덩어리 재검수 — 6e04ccf

- 검수일: 2026-11-18 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `6e04ccf`, 범위: `fc76d0e..6e04ccf`.
- 기준: `docs/review-real-pages-fixes.md` 마지막 장, `docs/review-request-real-pages.md` 29장.
- 실행 전 `cp -r reference/cms-original/. cms/`로 로컬 cms/를 준비했다. cms/는 커밋하지 않는다. 코드·테스트·원본 자료는 수정하지 않았으며 이번 변경은 이 문서뿐이다.

## 판정

**수정 후 재확인 필요.** 이전 I-1·I-2의 정확한 재현 입력은 해결됐다. 다만 설명 상자 자체 또는 조상의 숨김은 새 검사 대상에서 빠져, 빈 항목만 있는 상자의 글머리가 노출된다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 확정 항목 없음 |
| Important | 1 | I-1 설명 상자·조상의 숨김을 놓쳐 빈 글머리 노출 |
| Minor | 0 | 확정 항목 없음 |

추가 지적은 최소 입력이다. 실제 703페이지에서 발생했다고 집계하지 않는다. 기준 fc76d0e에도 있던 잔여 변형이며 이번 수정이 새로 만든 회귀라는 주장은 아니다.

## 이전 지적 확인 — 직접 실행

| 이전 입력 | 현재 결과 / 기대 결과 |
|---|---|
| 문단 → ol start=4(FIRST·SECOND) → 문단 | blocks·partial·fallback 0, ordered=true·start=4 유지. 실제 DOM에서 중첩 ol의 counter-reset=mig-counter-sub 3 / 번호 보존 기대 충족 |
| ol reversed start=4, 두 번째 li value=8 | LOSSY_PARSE·fallback 1로 원본 보존 / 지원하지 않는 번호 의미 보존 기대 충족 |
| ul의 첫 li가 d-none·빈 항목, 다음 ALL ITEM | blocks에서 숨긴 빈 항목 제외, 안쪽 ul에는 ALL ITEM 한 개만 남음 / 기대 충족 |
| 첫 빈 li가 d-none d-lg-block | blocks의 항목 only=pc. 360px에서 항목 전체가 숨고 1100px에서 표시 / 기대 충족 |
| PC 전용 문단과 일반 ul | parts로 읽지 않고 only=pc를 가진 blocks로 변환 / 기대 충족 |
| 항목 안 span d-none의 비어 있지 않은 글 | LOSSY_PARSE·fallback으로 원본 보존 / 숨긴 글을 노출하지 않음 |

번호·표시 결과는 Chromium 1100/360px의 DOM/CSS를 직접 측정했다. 원본 전체와 현재 변환 모델·HTML·진단을 함께 확인했다.

## Important

### I-1. 설명 상자 자체나 조상에 숨김이 있으면 readTextParts가 이를 놓쳐 빈 글머리가 나타남

**위치:** `packages/core/src/parse/original.ts:175`~`:178` (자손의 ownVisibility만 검사), `:190`~`:193` (빈 글 항목 유지); 출력은 `packages/core/src/types/preset.ts:112`.

**재현 입력 — 변환기·Chromium에서 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type10"><div class="cms-inner">
    <div class="cms-header"><p class="cms-title">TITLE</p></div>
    <div class="cms-list-wrap"><ol class="cms-figure-list">
      <li class="cms-list-item">
        <div class="cms-description-box d-none"><ul><li></li></ul></div>
      </li>
    </ol></div>
  </div></section>
</div>
```

**실제:** type10·success·fallback 0, diagnostics 빈 배열. parts는 `[{"bullets":[{"text":""}]}]`가 된다. 출력에는 숨김이 없는 ul/li가 만들어져 **빈 글머리 한 개**가 표시된다. 원본은 상자 전체가 display:none이라 해당 글머리가 보이지 않는다. Chromium 1100/360px에서 원본 li는 표시되지 않고 출력 li는 display=list-item·표시됨을 측정했다. 360px 원본·출력 캡처도 직접 열어 확인했다.

다음 변형도 직접 실행해 같은 경로를 확인했다.

```html
<!-- 360px에서 상자 전체가 숨는 경우 -->
<div class="cms-description-box d-none d-lg-block"><ul><li></li></ul></div>

<!-- 상자 자체에는 표시 클래스가 없고 조상이 숨는 경우 -->
<div class="d-none">
  <div class="cms-description-box"><ul><li></li></ul></div>
</div>
```

두 변형도 type10·success·진단 없음이며, 360px에서 숨겨야 하는 빈 글머리를 출력한다.

**기대:** 목록의 실제 보임에는 설명 상자와 조상의 숨김도 반영되어야 한다. 숨긴 빈 구조가 출력에 새 글머리·공간을 만들면 안 된다. parts로 표시 조건을 보존할 수 없다면 안전하게 생략하거나 다음 변환/원본 보존 경로로 보내야 한다.

**원인 — 정적 판독:** descendants(box)는 box 자신을 포함하지 않는다. 또한 ownVisibility(d)는 조상의 표시를 합치지 않는다. 따라서 내부 ul·li에 개별 숨김 클래스가 없으면 검사를 통과한다. 모델에는 컨테이너·항목의 표시가 없고 빈 글도 li로 출력된다. 글·이미지 순서 검사는 빈 항목의 글머리 차이를 검출하지 못한다.

**기준 버전 대조 — 직접 실행:** fc76d0e에서도 세 변형이 type10·success로 같은 빈 bullets 모델을 만들었다. 이전 정확한 li 자체의 숨김 입력은 이번에 고쳐졌지만, 컨테이너에 숨김을 둔 변형은 남아 있다.

## 정상·회귀 검사

- **직접 실행:** 일반 문단 → ul → 문단의 parts 순서·안전한 링크·strong·em은 유지됐다. 정상 글 블록의 d-lg-block, ul의 d-none d-block처럼 계산 결과 항상 보이는 규칙도 parts를 불필요하게 거부하지 않았다.
- **직접 실행:** 중첩 목록·이미지·표·항목 안 문단·떠 있는 글·늦은 소제목·ul의 li 밖 글을 이전과 같은 입력으로 재검사했다. 지원 밖 구조를 parts 성공으로 조용히 버리는 추가 사례는 이 입력들에서 없었다.
- **직접 실행:** 숨긴 목록만 비어 있는 입력은 parts로 읽지 않고 기존 desc 경로에서 빈 구조를 생략해 type10을 유지했다. 글머리 노출은 없었다. 모든 거부 입력이 반드시 blocks/fallback 타입이 되는 것은 아니므로, 위 확인은 경로와 실제 내용 보존을 구분했다.
- **편집기 직접 실행:** 정상 parts의 문단·글머리 편집, 한 part에 text+bullets 입력, 이동·삭제·JSON 저장·재불러오기를 확인했다. 저장 배열의 순서·링크·서식과 재불러오기 전후 HTML이 유지됐다.

원본 화면 비교에는 Bootstrap 4.6.2와 원본 cms.css, 출력에는 저장소 host-style.css를 적용했다. 원본 배포 사이트의 Bootstrap 버전까지 확정한 검사는 아니다.

## 실행 검증

| 검증 | 결과 |
|---|---|
| `npm test` | 38개 파일, 982개 통과 |
| `npm run test:browser` | 5개 파일, 197개 통과 |
| `npm run lint` / `npm run typecheck` | 오류 없음 |
| `npm run convert -- --all` | 703페이지: success 356 / partial 333 / failed 14 |
| 기준 fc76d0e와 703페이지 대조 | 페이지별 상태·섹션 타입 배열 변화 0개, blocks 294 → 294, fallback 50 → 50 |
| 추가 직접 검증 | 이전 13개 입력과 추가 7개 변형, 7개 입력의 1100/360px DOM/CSS·캡처, parts 편집·저장·재불러오기 |

기존 테스트 통과는 위 컨테이너 숨김 변형까지 안전하다는 뜻이 아니다.

추가 스크립트·JSON·캡처는 `/tmp/text-parts-fix-review/`에만 두었으며 커밋하지 않는다.

## 이전 검수 기록

아래는 이전 fc76d0e 검수 문서 원문이다. 당시 판정이며 현재 유효한 결함 수는 위 표를 따른다.

<details>
<summary>이전 검수 문서 원문 (fc76d0e)</summary>

# type10 문단·글머리 목록 검수 — ac9286d

- 검수일: 2026-11-18 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `ac9286d`, 범위: `57c3b7b..ac9286d`.
- 기준: `docs/real-pages-baseline.md` 11장, `docs/review-request-real-pages.md` 28장.
- 실행 전 `cp -r reference/cms-original/. cms/`로 로컬 cms/를 준비했다. cms/는 커밋하지 않는다. 코드·테스트·원본 자료는 수정하지 않았으며 이번 변경은 이 문서뿐이다.

## 판정

**수정 후 재확인 필요.** 일반적인 문단·ul의 순서·링크·서식과 편집기 parts 저장은 검사한 입력에서 유지된다. 그러나 readTextParts는 번호 목록도 일반 글머리로 읽고, 빈 항목의 화면별 표시를 버린다. 두 경우 모두 success·진단 없음으로 실제 화면 차이를 알리지 않는다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 확정 항목 없음 |
| Important | 2 | I-1 번호 목록·시작값 등이 글머리로 바뀜, I-2 숨긴 빈 항목의 글머리 노출 |
| Minor | 0 | 확정 항목 없음 |

아래 지적은 추가 최소 입력이다. 실제 703페이지에서 해당 결함이 발생했다고 집계하지 않는다. 기준 버전과 같은 입력을 대조했으며 새 type10 parts 경로에서 생기는 회귀다.

## Important

### I-1. ol을 받아들이지만 항상 ul로 출력해 번호·시작값·역순·항목 지정 번호가 사라짐

**위치:** `packages/core/src/parse/original.ts:184`~`:187` (ul/ol을 같은 bullets로 읽음); `packages/core/src/types/preset.ts:93`~`:96`, `:108`~`:112` (번호 속성 없는 모델과 ul 출력).

**재현 입력 — 변환기·Chromium에서 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type10"><div class="cms-inner">
    <div class="cms-list-wrap"><ol class="cms-figure-list">
      <li class="cms-list-item"><div class="cms-description-box">
        <p class="cms-description">BEFORE</p>
        <ol start="4"><li>FIRST</li><li>SECOND</li></ol>
        <p class="cms-description">AFTER</p>
      </div></li>
    </ol></div>
  </div></section>
</div>
```

**실제:** type10·success·fallback 0, diagnostics 빈 배열. parts에는 bullets의 글 두 개만 남고 ordered/start 정보는 없다. 출력은 `ul style="list-style: disc; ..."`다. Chromium 1100/360px에서 원본은 ol·start=4·list-style-type=decimal, 출력은 ul·start 없음·disc였다. 360px 캡처를 직접 열어 **4. FIRST / 5. SECOND가 글머리 FIRST / SECOND로 바뀐 것**을 확인했다.

BEFORE 뒤에 아래 목록만 둔 변형도 success·진단 없음으로 같은 글머리가 된다.

```html
<ol reversed start="4"><li>FIRST</li><li value="8">SECOND</li></ol>
```

**기대:** 번호 목록의 종류와 시작/역순/개별 번호 의미를 보존해야 한다. parts를 글머리 목록에 한정한다면 ol을 지원 입력으로 받아들이지 않고 다음 안전 경로로 보내야 한다. 지원하지 않는 번호 속성은 원본 보존 등으로 처리해야 한다.

**기준 대조 — 직접 실행:** 57c3b7b는 start=4 입력을 blocks·partial로 변환하며 ordered=true·start=4를 보존했다. reversed/value 변형은 fallback으로 원본을 보존했다. 현재는 새 경로가 먼저 성공하면서 이 방어를 우회한다.

**원인 — 정적 판독:** ul과 ol을 같은 분기에서 같은 TextPart.bullets로 읽고 렌더러는 ul만 만든다. 번호·start·reversed·li value는 모델에 없고 별도 실패 조건도 없다. 내용 순서 검사에는 네이티브 목록 번호가 나타나지 않아 차이를 검출하지 못한다.

### I-2. 모든 화면/한쪽 화면에서 숨긴 빈 li가 일반 글머리 항목으로 나타남

**위치:** `packages/core/src/parse/original.ts:185`~`:187`; `packages/core/src/types/preset.ts:95`, `:112`.

**재현 입력 — 직접 실행:** I-1의 안쪽 ol을 다음 ul로 바꾼다. 전체 section·BEFORE·AFTER는 그대로다.

```html
<ul><li class="d-none"></li><li>ALL ITEM</li></ul>
```

**실제:** type10·success·fallback 0, diagnostics 빈 배열. bullets는 `[{"text":""},{"text":"ALL ITEM"}]`로 읽히며 숨김은 없다. 출력은 두 li 모두 display=list-item이어서 **빈 글머리 한 줄 + ALL ITEM 글머리**가 보인다. 원본의 첫 li는 display=none이므로 보이는 항목은 ALL ITEM 하나뿐이다. Chromium 1100/360px DOM/CSS 측정과 360px 출력 캡처에서 확인했다.

첫 li를 `class="d-none d-lg-block"`으로 바꾸어도 같은 모델이 된다. 원본은 360px에서 첫 항목을 숨기지만 출력은 빈 글머리를 표시한다.

**기대:** 숨긴 빈 항목이 보이는 글머리·공간을 만들지 않아야 한다. 모든 화면에서 숨은 빈 항목은 안전하게 제외하고, 화면별 표시는 보존하거나 표현할 수 없으면 다음 안전 경로로 보내야 한다. 보이는 정상 빈 항목까지 무조건 삭제하라는 뜻은 아니다.

**기준 대조 — 직접 실행:** 57c3b7b의 blocks 경로는 d-none 빈 항목을 제외했고, d-none d-lg-block 변형은 only=pc로 보존했다. 현재 새 parts 경로가 먼저 성공하면서 두 동작이 적용되지 않는다. 글이 있는 숨긴 항목은 기존 순서 검사가 fallback으로 막지만, 빈 항목은 글·이미지가 없어 검사를 통과한다.

**원인 — 정적 판독:** 항목 모델은 richFrom(li)의 글만 담으며 li의 표시 상태를 읽지 않는다. 항목 수가 남으면 renderTextParts가 비어 있는 글에도 li를 출력한다.

## 정상·방어 경로와 편집기 — 직접 실행

| 입력·동작 | 결과 |
|---|---|
| BEFORE strong → ul의 안전한 링크·em → AFTER | type10·success. parts의 문단·항목 순서·서식·주소 보존 |
| 중첩 목록, 항목 안 이미지, 목록 옆 떠 있는 글, 설명 뒤 표, 항목 안 p | type10 parts로 성공하지 않음. 검사한 입력은 내용·순서를 담는 blocks로 넘어감 |
| ul의 li 밖 STRAY 글 | LOSSY_PARSE·fallback. 조용히 STRAY를 버리지 않음 |
| 본문 끝 cms-eyebrow 소제목 | 소제목을 앞으로 올린 type10 결과를 채택하지 않고 blocks로 감 |
| 숨긴 비어 있지 않은 항목 | 순서 검사에서 차이를 찾아 fallback |
| parts 문단·글머리 수정, 한 part에 text+bullets 동시 입력 | 두 값 모두 출력. text → bullets 순서 유지 |
| parts 순서 이동 → JSON 저장 → 새 페이지 → 재불러오기 | 배열 순서·링크·strong·em 보존, 재불러오기 전후 HTML 동일 |
| parts 항목 삭제 | 삭제한 AFTER 문구가 HTML에서 제거됨 |

편집기 검사는 Vite + Chromium으로 실제 입력·클릭·파일 다운로드/불러오기를 실행했다. 수정한 글 순서는 EDIT PARA → AFTER → LEAD TO BULLETS → EDIT ITEM이었다.

## 호스트 배치 확인

**직접 실행:** 일반 ul parts는 1100/360px에서 카드 안에 머물렀다. 출력의 안쪽 목록에는 mig-list가 없고 li에도 mig-item이 없어 type-10의 후손 카드 규칙을 받지 않았다. computed display는 안쪽 ul=block, li=list-item이며 측정한 항목의 가로 범위는 목록 안에 있었다. 번호/숨김 결함은 이 정상 배치와 별도로 기록했다.

원본 비교에는 Bootstrap 4.6.2와 원본 cms.css, 출력에는 저장소 host-style.css를 적용했다. 원본 배포 사이트의 Bootstrap 버전까지 확정한 검사는 아니다. 실제 703페이지 전체에 대한 시각 비교로 확대 해석하지 않는다.

## 실행 검증

| 검증 | 결과 |
|---|---|
| `npm test` | 38개 파일, 975개 통과 |
| `npm run test:browser` | 5개 파일, 197개 통과 |
| `npm run lint` / `npm run typecheck` | 오류 없음 |
| `npm run convert -- --all` | 703페이지: success 356 / partial 333 / failed 14 |
| 기준 57c3b7b와 703페이지 대조 | blocks 306 → 294, fallback 50 → 50. 페이지별 상태 또는 섹션 타입 배열이 바뀐 페이지 12개 |
| 추가 최소 입력 | 13개 입력을 현재/기준 버전에서 실행, 5개 입력의 1100/360px DOM/CSS 측정 및 360px 캡처 |
| 편집기 | 문단·글머리 편집, parts 이동·삭제·JSON 저장 및 재불러오기 |

기존 테스트는 모두 통과하지만 위 두 추가 입력의 목록 의미·표시 손실을 검출하지 않는다.

재현 스크립트·JSON·캡처는 `/tmp/text-parts-review/`에만 두었으며 커밋하지 않는다.

## 이전 검수 기록

아래는 이전 57c3b7b 검수 문서 원문이다. 당시 판정이며 현재 유효한 결함 수는 위 표를 따른다.

<details>
<summary>이전 검수 문서 원문 (57c3b7b)</summary>

# 본문 앞뒤 설명 판정 재검수 — 56a1fbc

- 검수일: 2026-11-18 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `56a1fbc`, 범위: `a662bb6..56a1fbc`.
- 기준: `docs/review-real-pages-fixes.md` 마지막 장의 rendersNotes 표시 글 충돌 수정.
- 실행 전 `cp -r reference/cms-original/. cms/`로 로컬 cms/를 준비했다. cms/는 커밋하지 않는다. 코드·테스트·원본 자료는 수정하지 않았으며 이번 변경은 이 문서뿐이다.

## 판정

**이전 Minor M-1은 해결됐다. 이번 범위에서 추가 수정이 필요한 결함을 확인하지 못했다.**

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 확정 항목 없음 |
| Important | 0 | 확정 항목 없음 |
| Minor | 0 | 이전 고정 문구 충돌 해결, 추가 확정 항목 없음 |

## 이전 재현 입력 대조 — 직접 실행

이전 문서의 정확한 섹션 입력을 정상 PageModel에 넣어 기준 a662bb6와 현재 56a1fbc 양쪽에서 실행했다.

```json
{
  "id": "s1",
  "type": "type01",
  "variant": "default",
  "modifiers": {},
  "data": {
    "image": {},
    "title": "제목",
    "desc": "MIGNOTESPROBEINTRO MIGNOTESPROBENOTE"
  },
  "notes": {
    "intro": "USER INTRO",
    "note": "USER NOTE"
  }
}
```

| 판정·출력 | 이전 a662bb6 | 현재 56a1fbc / 기대 결과 |
|---|---|---|
| rendersNotes | true (오탐) | false / 미지원 판정 충족 |
| 실제 USER INTRO·USER NOTE 출력 | 둘 다 없음 | 둘 다 없음. 미지원 렌더러 자체는 그대로이며 경고로 알림 |
| NOTES_NOT_RENDERED | 없음 | warn 있음 / 미출력 진단 기대 충족 |
| Chromium 편집기에서 같은 JSON 불러오기 | 이전 검수에서 칸 표시·경고 없음 | 공통 설명 칸 0개·경고 1개 / 기대 충족 |

추가로 고정 문구 두 개를 본문(type01 desc) 또는 머리글(type09 heading)에 각각 1·3·20회 반복했다. 모든 반복 수에서 type01은 false, type09는 true로 판정했다. 지원 타입에서 기존 같은 문구 때문에 잘못 미지원으로 판정하는 회귀도 이 입력들에서는 없었다.

## 회귀 검사 — 직접 실행

- preset 정의 전체의 기본 데이터에서 rendersNotes 결과를 실제 USER INTRO·USER NOTE의 출력 및 경고와 대조했다. type00·type01은 미지원·경고, 공통 골격을 쓰는 타입은 지원·실제 출력으로 맞았다. type33 Q&A도 별도로 미지원·경고를 확인했다.
- Chromium 편집기에서 type09 앞뒤 설명을 수정하고 JSON 저장 → 새 페이지 → 재불러오기를 실행했다. 두 값과 HTML 출력이 유지됐고, 둘 다 비우면 notes가 제거됐다.
- type01 일반 입력과 type33 Q&A는 설명 칸이 없고 미출력 경고가 있었다. type26 공통 라벨은 section-notes.intro에 포커스를 주었으며 기존 intro·공통 section-notes.intro ID는 각각 1개였다.
- 이전의 최소 링크·style 입력도 다시 변환했다. type09 설명 상자의 위험한 주소는 UNSAFE_LINK_REMOVED, position/top 제거는 INLINE_STYLE_DROPPED를 남기고 partial로 분류됐다.
- 이전 순서·내용 방어 입력(안전한 링크·strong·여러 문단, 숨긴/PC 전용 설명, 머리글보다 앞/본문 사이 상자, 이미지 포함 상자)을 재실행했다. 검사한 입력에서 결과 경로 회귀를 확인하지 못했다.

## 정적 판독

`packages/core/src/types/notes.ts:22`~`:35`에서 같은 검증 데이터와 섹션을 notes=undefined로 렌더한 기준 결과, 검사용 notes를 넣은 결과로 나눈다. 기존 section.notes는 기준 렌더에서 명시적으로 덮어쓴다. 두 표시 글 모두 기준보다 개수가 늘어야 true이므로 이전 본문의 고정 문구만으로 참이 되지 않는다. 각각 새 RenderContext를 사용하며 전략 선택과 렌더 예외도 try/catch 안에서 처리된다. 이번 변경은 실제 설명 출력 골격·DOM 분리/복원·편집기 저장 형식을 바꾸지 않는다.

## 실행 검증

| 검증 | 결과 |
|---|---|
| `npm test` | 37개 파일, 969개 통과 |
| `npm run test:browser` | 5개 파일, 197개 통과 |
| `npm run lint` / `npm run typecheck` | 오류 없음 |
| `npm run convert -- --all` | 703페이지: success 345 / partial 344 / failed 14 |
| 기준 a662bb6와 703페이지 대조 | 페이지별 상태·섹션 타입 배열 변화 0개, blocks 306 → 306, fallback 50 → 50 |
| 추가 직접 검증 | 정확한 이전 충돌 입력의 구버전/현재 비교, 표시 글 반복 1·3·20회, 기본 preset·Q&A 판정, 편집기 저장·재불러오기·삭제·라벨 연결 |

확정한 새 결함이 없으므로 새 결함의 위치·재현 입력·실제/기대 결과 항목은 없다. 이전 재현 입력과 현재 실제/기대 결과는 위에 기록했다. 추가 스크립트·JSON·캡처는 `/tmp/section-notes-fix2-review/`에만 두었으며 커밋하지 않는다.

## 이전 검수 기록

아래는 이전 a662bb6 검수 문서 원문이다. 당시 판정이며 현재 유효한 결함 수는 위 표를 따른다.

<details>
<summary>이전 검수 문서 원문 (a662bb6)</summary>

# 본문 앞뒤 설명 재검수 — b204ed6

- 검수일: 2026-11-18 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `b204ed6`, 범위: `a448bc9..b204ed6`.
- 기준: `docs/review-real-pages-fixes.md` 마지막 장, `docs/review-request-real-pages.md` 27장.
- 실행 전 `cp -r reference/cms-original/. cms/`로 로컬 cms/를 준비했다. cms/는 커밋하지 않는다. 코드·테스트·원본 자료는 수정하지 않았으며 이번 변경은 이 문서뿐이다.

## 판정

**이전 I-1·I-2·M-1의 재현 입력은 해결됐다.** 일반 입력에서 추가 Critical·Important는 확인하지 못했다. 새 rendersNotes가 고정 검사용 문구와 기존 본문을 구분하지 못하는 드문 충돌을 Minor 1건으로 기록한다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 확정 항목 없음 |
| Important | 0 | 이전 두 Important 해결, 추가 확정 항목 없음 |
| Minor | 1 | M-1 기존 본문에 고정 검사용 문구가 있으면 출력 지원 판정 오탐 |

추가 지적은 의도적으로 검사용 문구를 넣은 최소 입력이다. 일반적인 문장에서 발생하거나 실제 703페이지에 발생했다고 주장하지 않는다.

## 이전 세 지적 확인 — 직접 실행

| 이전 지적·입력 | 현재 실제 결과 / 기대 결과 |
|---|---|
| type01에 notes.intro=EDITOR INTRO, notes.note=EDITOR NOTE를 저장한 JSON | rendersNotes=false. 편집기 공통 설명 칸 0개, NOTES_NOT_RENDERED 경고 표시. 저장 데이터의 미출력을 조용히 넘기지 않음 / 기대 충족 |
| type00 기본 데이터 + notes | core 실행에서 미지원 판정과 NOTES_NOT_RENDERED 경고 확인 / 기대 충족 |
| type33 Q&A에 notes | core 실행 및 브라우저에서 공통 설명 칸 없음·경고 있음. 기본 목록 모드는 지원 판정 / 섹션 모드별 판정 기대 충족 |
| type09 뒤 설명의 `<a href="javascript:alert(1)">NOTE</a>` | type09·partial, notes.note=NOTE, UNSAFE_LINK_REMOVED(warn) / 경고 보존 기대 충족 |
| 같은 자리의 `<span style="position:fixed;top:0">NOTE</span>` | type09·partial, notes.note=&lt;span&gt;NOTE&lt;/span&gt;, INLINE_STYLE_DROPPED(warn) / 경고 보존 기대 충족 |
| type26의 공통 “본문 앞 설명” 라벨 글자 클릭 | 활성 요소 id=section-notes.intro. 라벨의 control이 자기 textarea를 가리킴. 기존 id=intro와 공통 id=section-notes.intro는 각각 1개 / 기대 충족 |

링크·style은 이전 검수의 정확한 최소 입력을 다시 실행했다. 편집기 type01은 이전에 저장한 동일 JSON을 불러왔다. type09는 앞뒤 설명을 수정하고 JSON 저장 → 새 페이지 → 재불러오기를 실행해 두 값과 HTML이 유지됨을 확인했다. 둘 다 비우면 notes가 제거됐다.

## Minor

### M-1. 본문에 검사용 고정 문구 두 개가 있으면 notes를 출력하지 않아도 지원한다고 판정

**위치:** `packages/core/src/types/notes.ts:6`~`:7`, `:22`~`:26`; 결과 사용처는 `apps/web/src/App.tsx:174`, `packages/core/src/page/render-page.ts:100`~`:103`이다.

**재현 입력 — core·Chromium에서 직접 실행:** 정상 PageModel의 sections에 다음 섹션을 넣는다. 기본 type01 데이터의 desc만 고정 검사용 문구로 바꾼 입력이다.

```json
{
  "id": "s1",
  "type": "type01",
  "variant": "default",
  "modifiers": {},
  "data": {
    "image": {},
    "title": "제목",
    "desc": "MIGNOTESPROBEINTRO MIGNOTESPROBENOTE"
  },
  "notes": {
    "intro": "USER INTRO",
    "note": "USER NOTE"
  }
}
```

**실제:** rendersNotes(defaultRegistry.get('type01'), section)는 true다. renderPage 출력에는 USER INTRO·USER NOTE가 둘 다 없는데 NOTES_NOT_RENDERED 경고도 없다. 편집기에서 이 JSON을 불러오면 공통 설명 칸이 다시 나타나며 경고는 없다. 충돌 문구를 넣지 않은 type01 입력에서는 false·칸 없음·경고 있음으로 정상이다.

**기대:** 기존 data.desc 내용과 관계없이 type01이 section.notes를 출력하지 않는다고 판정해야 한다. 검사 문구가 기존 본문에서 나온 것과 주입한 notes에서 나온 것을 구별해야 한다.

**원인 — 정적 판독:** 고정 문자열 두 개를 notes에 넣은 출력 HTML에서 includes만 확인한다. 원래 본문에도 같은 문자열이 있으면 notes가 사용됐는지 식별할 수 없다. 따라서 편집 칸 표시와 미출력 경고가 동시에 잘못된다.

**등급 근거:** 두 내부 고정 문자열이 우연히 모두 본문에 등장해야 하므로 일반 사용에서의 발생 가능성이 낮다. 이전 일반 입력의 수정은 유효하며 이 경계 입력을 Important의 재발로 집계하지 않는다.

## 추가 검증과 정적 판독

- **직접 실행:** preset 정의 전체의 기본 데이터를 사용해 rendersNotes 결과와 실제 USER INTRO/USER NOTE 출력, NOTES_NOT_RENDERED를 대조했다. 지원 렌더러는 두 값을 출력하고 경고가 없으며, type00·type01은 미지원·경고로 맞았다. type33 Q&A도 별도 실행했다. 위 고정 문자열 충돌 외의 불일치는 이 대조에서 없었다.
- **직접 실행:** 정상 type09의 링크·strong·여러 문단, 숨긴 설명, PC 전용 설명, 머리글보다 앞/본문 사이의 상자, 이미지 포함 상자를 이전과 같은 입력으로 재검사했다. 기존 순서·보존 경로에 회귀를 확인하지 못했다.
- **직접 실행, 제어 실험:** 재시도 parse에 의도적으로 예외를 주입해 finally 후 직렬화·자식 순서와 객체 identity·parentNode 연결이 복원됨을 확인했다. 실제 원본에서 예외가 발생했다는 뜻은 아니다.
- **정적 판독:** 떼어 낸 boxes를 holder의 자식으로 훑으므로 box 자체와 자손의 style·링크 진단이 포함된다. 실제 원본의 parentNode를 holder로 바꾸지 않는다. 소스 위치와 sectionIndex는 기존 요소/섹션 정보를 사용한다.
- **정적 판독:** FieldForm의 idPrefix는 반복 필드 자손에도 전달된다. 현재 공통 설명은 section-notes. 이름 공간을 쓰고 데이터 path는 그대로라 저장 위치는 바뀌지 않는다.

## 실행 검증

| 검증 | 결과 |
|---|---|
| `npm test` | 37개 파일, 968개 통과 |
| `npm run test:browser` | 5개 파일, 197개 통과 |
| `npm run lint` / `npm run typecheck` | 오류 없음 |
| `npm run convert -- --all` | 703페이지: success 345 / partial 344 / failed 14 |
| 기준 a448bc9와 703페이지 대조 | 섹션 타입 배열 변화 0개. blocks 306 → 306, fallback 50 → 50. 파일 상태 변화 1개 |
| 상태가 바뀐 파일 재실행 | 10429/08_01_맞춤형영양수액클리닉.html: success → partial, 3번 섹션 p의 word-wrap:break-word 제거에 대한 INLINE_STYLE_DROPPED 복원 |
| 편집기 실제 조작 | type09 설명 편집·저장·재불러오기·삭제, type01/Q&A 미지원 표시·경고, type26 라벨 포커스, 고정 문구 충돌 입력 |

추가 재현 스크립트·JSON·캡처는 `/tmp/section-notes-fix-review/`에만 두었으며 커밋하지 않는다.

## 이전 검수 기록

아래는 이전 a448bc9 검수 문서 원문이다. 당시 판정이며 현재 유효한 결함 수는 위 표를 따른다.

<details>
<summary>이전 검수 문서 원문 (a448bc9)</summary>

# 본문 앞뒤 설명 상자 검수 — b8e6c54

- 검수일: 2026-11-18 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `b8e6c54`, 범위: `7ff8874..b8e6c54`.
- 기준: `docs/real-pages-baseline.md` 10장, `docs/review-request-real-pages.md` 26장.
- 실행 전 `cp -r reference/cms-original/. cms/`로 로컬 cms/를 준비했다. cms/는 커밋하지 않는다. 코드·테스트·원본 자료는 수정하지 않았으며 이번 변경은 이 문서뿐이다.

## 판정

**수정 후 재확인 필요.** 정상 설명의 글·링크·강조·문단과 기본 호스트 배치는 검사한 입력에서 유지된다. 그러나 설명 상자를 떼는 동안 그 안의 제거 경고가 사라지며, 편집기는 설명을 출력하지 않는 타입에도 공통 설명 칸을 제공한다. 기존 설명 칸과 새 공통 설명 칸의 HTML ID 중복도 있다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 확정 항목 없음 |
| Important | 2 | I-1 편집한 공통 설명이 type01 HTML에서 누락, I-2 분리한 상자의 제거 경고 누락 |
| Minor | 1 | M-1 기존·공통 설명 칸 ID 중복으로 라벨 포커스 오동작 |

아래 결함은 추가 최소 입력·편집기 조작으로 확인했다. 실제 703페이지에 해당 결함이 발생했다고 집계하지 않는다.

## Important

### I-1. type01에 공통 설명을 입력·저장해도 미리보기와 HTML에는 출력되지 않음

**위치:** `apps/web/src/App.tsx:173`~`:176` (strategy만 보고 편집 칸 노출); `packages/core/src/types/type01.ts:80`~`:115` (notes를 읽지 않는 자체 렌더러). 공통 출력은 `packages/core/src/types/preset.ts:54`~`:62`에만 추가됐다.

**재현 — Chromium에서 직접 실행:**

1. 편집기에 type01 기본 섹션을 불러온다. 기본 데이터는 defaultRegistry.get('type01').defaults를 사용했다.
2. “본문 앞뒤 설명 (섹션 공통)”의 앞 칸에 `EDITOR INTRO`, 뒤 칸에 `EDITOR NOTE`를 입력한다.
3. HTML 소스를 확인하고 JSON 저장 → 새 페이지 → 저장한 JSON 불러오기를 실행한다.

저장되는 섹션의 핵심 입력은 다음과 같다.

```json
{
  "id": "s1",
  "type": "type01",
  "variant": "default",
  "modifiers": {},
  "notes": { "intro": "EDITOR INTRO", "note": "EDITOR NOTE" }
}
```

위 예시는 핵심 필드 발췌이며 실제 입력에는 type01 기본 data와 정상 PageModel 메타데이터도 포함했다.

**실제:** 입력 직후와 JSON 재불러오기 후 모두 두 값이 필드·저장 JSON에 남지만, HTML 소스에는 둘 다 없다. 기본 데이터에 notes를 넣어 core renderPage를 직접 실행해도 두 글이 없고 관련 진단도 없다. type01은 preset 전략이지만 presetSection을 사용하지 않아 notes를 출력하지 않는다.

**기대:** 사용자가 입력할 수 있는 설명은 미리보기·내보내기에도 반영되어야 한다. 렌더링을 지원하지 않는 타입/모드라면 해당 입력을 제공하지 않거나 명확하게 제한해야 한다. JSON에만 남는 것으로는 충분하지 않다.

**범위 — 정적 판독과 추가 실행 구분:** type00도 기본 모델 렌더 실행에서 notes 두 값을 출력하지 않았다. type33 Q&A는 일반 모드 자체 렌더러를 쓰면서 정의의 strategy는 preset이라 같은 UI 조건에 걸리는 경로가 있다(이 Q&A 편집 경로는 정적 판독이며 브라우저 재현 건수에 추가하지 않았다). 자동 변환의 순서 검사가 notes 미출력을 거르는 것과, 편집기에서 나중에 새 값을 입력하는 경로는 별개다.

### I-2. 설명 상자를 떼고 재파싱하면 그 안에서 제거한 링크·style의 경고가 사라짐

**위치:** `packages/core/src/convert/convert-document.ts:119`~`:136`. 기존 진단 생성은 `packages/core/src/parse/common.ts:8`~`:32`의 scanSection이다.

**최소 재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type09"><div class="cms-inner">
    <div class="cms-list-wrap"><ul class="cms-column-list">
      <li class="cms-list-item"><p class="cms-description">BODY</p></li>
    </ul></div>
    <div class="cms-description-box"><p class="cms-description">
      <a href="javascript:alert(1)">NOTE</a>
    </p></div>
  </div></section>
</div>
```

**실제:** status=success, type=type09, notes.note=`NOTE`, diagnostics는 빈 배열이다. 안전하지 않은 주소 자체는 제거되지만 `UNSAFE_LINK_REMOVED` 경고가 없다.

링크 부분을 아래로 바꾸어도 status=success, notes.note=`<span>NOTE</span>`, diagnostics 빈 배열이다. 제거된 position·top에 대한 `INLINE_STYLE_DROPPED`가 없다.

```html
<span style="position:fixed;top:0">NOTE</span>
```

**기대:** 설명을 section.notes로 옮기는 경로에서도 실제 제거한 주소·스타일의 기존 warn 진단을 보존해야 한다. 사용자가 조정·검수할 내용이 있는데 success로 분류되어서는 안 된다.

**원인 — 정적 판독:** def.parse의 scanSection은 상자를 뗀 DOM만 본다. 상자를 되돌린 뒤 richFrom으로 설명을 읽으면서 정리는 적용되지만, 마지막에 반환하는 진단은 축소 DOM에서 나온 local/result.diagnostics뿐이다. 최초 시도의 원본 진단도 성공한 notes 경로에 합쳐지지 않는다. safeHref·정리된 글을 사용하는 순서 검사는 이런 제거를 대신 경고하지 않는다.

**기준 버전 대조 — 직접 실행:** 같은 type09 구조에 제목·두 항목과 추가 설명을 둔 변형을 7ff8874와 b8e6c54 양쪽에서 실행했다. 이전은 blocks·partial이며 각각 UNSAFE_LINK_REMOVED / INLINE_STYLE_DROPPED가 있었다. 현재는 type09·success로 바뀌면서 해당 경고가 사라진다. 단순한 기존 경고 정책의 문제가 아니라 새 notes 경로에서 생긴 회귀다.

## Minor

### M-1. 기존 설명과 공통 설명이 id=intro/note를 공유해 라벨이 다른 칸을 가리킴

**위치:** `apps/web/src/App.tsx:172`~`:176` (FieldForm 두 번 렌더); `apps/web/src/FieldForm.tsx:40`, `:55`~`:57` (path만으로 id/htmlFor 생성).

**재현 — Chromium에서 직접 실행:** type26 기본 섹션을 불러오고, 새 “본문 앞뒤 설명 (섹션 공통)”의 “본문 앞 설명” 라벨 글자 부분을 클릭한다.

**실제:** 문서에 id=intro인 textarea가 2개 존재한다. 공통 설명 라벨의 HTMLLabelElement.control은 공통 textarea가 아니라 기존 data.intro textarea다. 라벨의 좌상단 글자 부분을 클릭했을 때 포커스도 공통 칸 밖의 기존 intro 칸으로 이동했다. note 역시 같은 이름 공간을 사용한다(같은 생성 규칙의 정적 확인).

**기대:** 기존 data 설명과 section.notes 설명의 DOM ID를 구분하고, 각 라벨이 자기 입력 칸에 연결되어야 한다. textarea 내부를 직접 클릭해 입력하는 기능은 동작하지만 라벨·접근성 연결이 잘못된다.

## 정상·방어 동작 확인

| 검사 | 직접 실행 결과 |
|---|---|
| type09 본문 전후 설명, 안전한 링크·strong·여러 문단 | notes에 글·주소·서식 보존. 두 문단은 PARA ONE<br>PARA TWO로 저장 |
| 설명이 머리글보다 먼저 있거나 본문 두 부분 사이에 있음 | notes 경로로 순서를 바꾸지 않고 blocks로 변환 |
| 설명 안 이미지 | notes로 읽지 않고 blocks로 변환 |
| 모든 화면에서 숨긴 설명 | 원본 보존. 숨긴 글을 노출하지 않음 |
| PC 전용 설명 | notes 경로를 채택하지 않고 only를 가진 blocks로 변환 |
| type09 공통 설명 편집·JSON 저장·재불러오기 | 두 값과 HTML 출력 유지. 둘 다 비우면 notes 제거 |
| type09 호스트 배치 1100/360px | header와 body가 바로 인접, 목록이 body 첫 자식. notes 유무와 관계없이 항목 폭은 각각 332px / 288px로 동일. 추가 note는 목록 밖·body 끝에 있음 |
| 재시도 파서에 의도적으로 예외 주입 | 상자를 뗀 상태에서 2번째 parse가 throw하도록 만든 제어 실험. finally 후 원본 직렬화·자식 순서와 객체 identity·parentNode 연결 모두 복원. 실제 원본에서 예외가 발생했다는 뜻은 아님 |

호스트 배치는 DOM/CSS 측정과 360px 캡처를 열어 확인했다. 정상 재시도 실패 후 다음 경로에서 설명·원본이 남는 것도 blocks/fallback 결과로 확인했다. 이 제어 실험은 임의의 다른 DOM 변경까지 복구하는지 검사한 것은 아니다.

## 실행 검증

| 검증 | 결과 |
|---|---|
| `npm test` | 37개 파일, 962개 통과 |
| `npm run test:browser` | 5개 파일, 196개 통과 |
| `npm run lint` / `npm run typecheck` | 오류 없음 |
| `npm run convert -- --all` | 703페이지: success 346 / partial 343 / failed 14 |
| 기준 7ff8874와 703페이지 대조 | blocks 352 → 306, fallback 50 → 50. 페이지별 상태 또는 섹션 타입 배열이 바뀐 페이지 43개 |
| 편집기 실제 조작 | Vite + Chromium으로 type09/type01 입력·JSON 저장·새 페이지·재불러오기·삭제, type26 라벨 클릭 |

테스트 통과는 위 추가 입력의 결함이 없다는 뜻이 아니다. 재현 스크립트·JSON·캡처는 `/tmp/section-notes-review/`에만 두었으며 커밋하지 않는다.

## 이전 검수 기록

아래는 이전 7ff8874 검수 문서 원문이다. 당시 판정이며 현재 유효한 결함 수는 위 표를 따른다.

<details>
<summary>이전 검수 문서 원문 (7ff8874)</summary>

# 블록 순서 5차 검수 — 94a0bac

- 검수일: 2026-11-17 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `94a0bac`, 범위: `6de0666..94a0bac`.
- 기준: `docs/review-request-real-pages.md` 25장, `docs/review-real-pages-fixes.md` 마지막 장.
- 실행 전 `cp -r reference/cms-original/. cms/`로 로컬 cms/를 준비했다. cms/는커밋하지 않는다. 코드·테스트·원본 자료는 수정하지 않았으며 이번 변경은 이 문서뿐이다.

## 판정

**이번 범위에서 추가 수정이 필요한 결함을 확인하지 못했다.** 이전 I-1의 숨긴 빈 셀·빈 행은 원본 보존으로 해결됐다. 표 내부의 9종 구조 요소에 대한 방어가 type26·blocks의 공통 표 읽기에 적용되고, 표 전체만 한쪽 화면 전용인 입력은 계속 변환된다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 확정 항목 없음 |
| Important | 0 | 이전 I-1 해결, 추가 확정 항목 없음 |
| Minor | 0 | 확정 항목 없음 |

## 직접 실행한 재현·대조

총 34개 최소 입력을 type01·type26 입력으로 변환했다. 별도로 blocks 또는 type26 파서를 직접 호출해, 앞선 타입의 실패나 기존 글 순서 검사 때문이 아니라 새 표 내부 검사 자체가 작동하는지도 확인했다.

| 입력 | 실제 결과 / 기대 결과 |
|---|---|
| 이전 원문: `<table><tbody><tr><td class="d-none"></td><td>ALL ITEM</td></tr></tbody></table>` | 두 입력 타입 모두 fallback 1로 원본 보존. 숨긴 빈 셀을 일반 빈 열로 출력하지 않음 / 원본 보존 기대 충족 |
| 이전 변형: `<tr class="d-none"><td></td></tr>` 뒤 일반 행 | 두 입력 타입 모두 fallback 1. 빈 첫 행을 화면에 추가하지 않음 / 원본 보존 기대 충족 |
| caption·colgroup·col·thead·tbody·tfoot·tr·th·td 각각에 d-none | 9종 × 2경로 모두 직접 파서가 lossless=false, 해당 태그의 표 내부 숨김 사유를 반환. 전체 변환도 원본 보존 / 빈 구조도 검출 기대 충족 |
| td에 `d-none d-lg-table-cell`, `d-block d-xl-none`, `d-none d-md-table-cell d-lg-none` | 3종 × 2경로 모두 원본 보존. PC 전용뿐 아니라 PC 폭 구간 내 변경·태블릿 전용도 검출 / 기대 충족 |
| td에 표시 클래스 없음, `d-lg-table-cell`, `d-none d-table-cell` | 3종 × 2경로 모두 정상 변환. type01 입력은 blocks, type26 입력은 type26. 직접 파서도 lossless=true / 실제로 숨지 않는 규칙을 오탐하지 않음 |
| 표 전체에 `d-none d-lg-table` 또는 `d-table d-lg-none`, 내부에는 표시 클래스 없음 | 2종 × 2입력 타입 모두 blocks로 정상 변환, fallback 0. PC 전용은 common-display-pc, 모바일·태블릿 전용은 common-display-mo / 전체 표 표시 유지 기대 충족 |

원본 보존 사례는 모델·진단·보존 HTML을 확인했다. type01 입력의 최종 fallback 사유에는 최초 타입 파서의 사유가 남을 수 있으므로, 새 방어의 작동 여부는 직접 파서의 실패 사유도 함께 대조했다. 표 전체 한쪽 화면 전용 입력의 type26 프리셋은 blocks로 재시도되어 표시를 보존한다. 이것을 type26 프리셋 모델 자체가 표시 속성을 지원한다는 뜻으로 해석하지 않는다.

표 전체 PC/모바일 전용은 Chromium 1100/360px에서도 원본·출력 표와 셀의 실제 표시 여부를 측정했다. 화면 비교용 원본에는 Bootstrap 4.6.2와 원본 cms.css, 출력에는 저장소 host-style.css를 적용했다. 원본 배포 사이트의 Bootstrap 버전까지 확정한 검사는 아니다.

## 정적 판독

- `packages/core/src/types/type26.ts:127`~`:138`: TABLE_PARTS가 요청한 9개 태그를 모두 포함한다. descendants(table)를 검사하므로 표 자체는 대상에서 제외된다. ownVisibility를 사용해 표 전체·표 바깥 조상의 한쪽 화면 전용 표시를 내부 요소의 숨김으로 잘못 간주하지 않는다.
- ownVisibility 결과 중 false 또는 mixed가 있으면 실패 사유를 남긴다. 따라서 한 화면의 일부 폭에서만 숨는 표시도 검출한다. 클래스가 없거나 모든 구간이 true이면 실패시키지 않는다.
- 공통 readTable의 problems는 type26.parse와 blocks.parse 양쪽에서 lossless=false로 전달된다. 글·이미지가 없는 빈 셀·행도 내용 순서 검사에 의존하지 않고 보호된다.
- 이번 변경은 표 구조 모델·렌더러·표 전체 only 판정을 바꾸지 않는다. colgroup/col·tfoot도 검사 목록에서 누락되지 않았다.

## 실행 검증

| 검증 | 결과 |
|---|---|
| `npm test` | 36개 파일, 954개 통과 |
| `npm run test:browser` | 5개 파일, 196개 통과 |
| `npm run lint` / `npm run typecheck` | 오류 없음 |
| `npm run convert -- --all` | 703페이지: success 326 / partial 363 / failed 14 |
| 기준 6de0666과 703페이지 대조 | 페이지별 상태·섹션 타입 배열 변화 0개 |
| 원본 보존 섹션 고정 목록 | 50개, 전체 테스트에서 검사 통과 |
| 추가 최소 입력 | 34개 전체 변환 및 직접 파서 호출, 표 전체 표시 1100/360px DOM/CSS 측정 |

최소 입력은 실제 703페이지 통계와 구분했다. 이번 검수에서 확정한 결함이 없으므로 새 결함의 위치·재현 입력·실제/기대 결과 항목은 없고, 이전 입력의 실제/기대 결과를 위 표에 기록했다. 검수 스크립트·JSON·화면 캡처는 `/tmp/blocks-fix4-review/`에만 두었으며 커밋하지 않는다.

## 이전 검수 기록

아래는 이전 6de0666 검수 문서 원문이다. 당시 판정이며 현재 유효한 결함 수는 위 표를 따른다.

<details>
<summary>이전 검수 문서 원문 (6de0666)</summary>

# 블록 순서 4차 검수 — 9f87d07

- 검수일: 2026-11-17 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `9f87d07`, 범위: `f687c61..9f87d07`.
- 기준: `docs/review-request-real-pages.md` 24장, `docs/review-real-pages-fixes.md` 마지막 장.
- 실행 전 `cp -r reference/cms-original/. cms/`로 로컬 cms/를 준비했다. cms/는 커밋하지 않는다. 코드·테스트·원본 자료는 수정하지 않았으며 이번 변경은 이 문서뿐이다.

## 판정

**수정 후 재확인 필요.** 이전 I-1의 빈 목록·빈 표를 포함하는 숨긴 li는 해결됐다. 목록 밖의 숨긴 빈 구조도 블록 순회 경로에서는 제외된다. 다만 표 내부의 빈 셀·빈 행은 별도 표 파서로 넘어가 새 규칙을 거치지 않고 출력에 나타난다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 확정 항목 없음 |
| Important | 1 | I-1 표 내부의 숨긴 빈 셀·행이 출력에 남음 |
| Minor | 0 | 확정 항목 없음 |

아래 항목은 **추가 최소 입력**이다. 실제 703페이지에서 발생했다고 집계하지 않는다. 기존에도 있던 잔여 경로이며 새 회귀라는 주장은 아니다.

## 수정 확인 — 직접 실행

| 입력 | 현재 결과 |
|---|---|
| `<ol><li class="d-none"><ul></ul></li><li>ALL ITEM</li></ol>` | blocks·partial·fallback 0. 모델·출력에 li 1개만 남고 ALL ITEM은 1번 |
| 위 첫 li 안에 빈 표(`<table><tbody><tr><td></td></tr></tbody></table>`) | 같은 결과. 이전 정확한 재현 입력 해결 |
| 목록 앵커 뒤 BEFORE / 숨긴 div 안의 빈 목록·표 / AFTER | blocks로 변환, 숨긴 빈 구조는 제외되고 ANCHOR·BEFORE·AFTER만 남음 |
| 조상 div가 d-none이고 그 안에 빈 중첩 목록 | blocks 경로에서 숨긴 구조 제외 |
| 모든 화면에서 숨긴 글 SECRET 또는 img | LOSSY_PARSE·fallback 1로 원본 보존 |
| 표시 클래스가 없는 빈 항목 | 삭제하지 않고 항목 유지 |
| d-none d-lg-block인 빈 항목 | only=pc 유지. 모든 화면에서 숨는 항목으로 잘못 삭제하지 않음 |

이전 두 재현 입력은 Chromium 1100/360px에서 DOM/CSS를 측정했고 360px 캡처도 직접 열어 확인했다. 그 밖의 표 항목은 변환 모델·HTML·진단을 직접 확인했다. 목록 밖·조상 숨김 사례에는 정상 목록 ANCHOR를 앞에 두어 blocks 변환 경로를 확인했다.

## Important

### I-1. 표 내부의 숨긴 빈 셀·행은 hiddenAndEmpty를 거치지 않아 다시 나타남

**위치:** `packages/core/src/types/blocks.ts:113` 및 `:163`~`:169`; 위임받는 `packages/core/src/types/type26.ts:85`~`:93`의 rowsOf.

**재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type01"><div class="cms-inner">
    <table><tbody><tr>
      <td class="d-none"></td><td>ALL ITEM</td>
    </tr></tbody></table>
  </div></section>
</div>
```

**실제:** blocks·partial·fallback 0, 진단은 `LAYOUT_SIMPLIFIED`뿐이다. 모델에 빈 첫 셀과 ALL ITEM 셀 두 개가 남는다. 출력에서는 d-none이 사라져 **빈 첫 열이 보이고 ALL ITEM은 두 번째 열**에 놓인다. 원본의 첫 셀은 display:none이어서 표시되는 셀은 ALL ITEM 하나뿐이다.

Chromium 1100/360px에서 원본의 첫 td는 표시되지 않고 출력의 첫 td는 표시됨을 측정했다. 360px 출력에서 첫 셀 x=8.5, ALL ITEM 셀 x=180으로 빈 열이 공간을 차지한다. 원본에서 ALL ITEM 셀은 x=15다. 원본·출력 캡처도 직접 열어 확인했다. 좌표·모양 자체의 호스트 차이가 아니라 **숨긴 셀의 표시 복원**이 지적 대상이다.

다음처럼 빈 행 전체를 숨겨도 같은 우회 경로다.

```html
<table><tbody>
  <tr class="d-none"><td></td></tr>
  <tr><td>ALL ITEM</td></tr>
</tbody></table>
```

이 변형도 blocks·partial·fallback 0이고 LAYOUT_SIMPLIFIED만 있다. 출력에는 빈 첫 행이 생긴다. 360px 출력 표 높이는 73.390625px이며 첫 빈 셀도 표시된다. 원본에는 첫 행이 표시되지 않는다.

**기대:** 모든 화면에서 숨긴 글·이미지 없는 구조가 출력의 표 격자·공간에 나타나지 않아야 한다. 셀·행 병합 등을 고려해 안전하게 제외할 수 없다면 원본을 보존해야 한다.

**원인 — 정적 판독:** hiddenAndEmpty는 walk가 방문하는 요소와 목록 항목에 적용된다. 표를 만나면 walk는 자손을 순회하지 않고 readTable에 위임한다. rowsOf는 모든 tr·td·th를 가져오며 숨김을 확인하지 않고 모델에도 표시 상태를 담지 않는다. 빈 셀·행에는 글·이미지가 없어 기존 내용 순서 검사도 차이를 검출하지 못한다. 따라서 새 규칙이 일반 블록·목록에는 적용돼도 표 내부에는 적용되지 않는다.

## 실행 검증

| 검증 | 결과 |
|---|---|
| `npm test` | 36개 파일, 949개 통과 |
| `npm run test:browser` | 5개 파일, 196개 통과 |
| `npm run lint` / `npm run typecheck` | 오류 없음 |
| `npm run convert -- --all` | 703페이지: success 326 / partial 363 / failed 14 |
| 기준 f687c61과 703페이지 대조 | 페이지별 상태·섹션 타입 배열 변화 0개 |
| 원본 보존 섹션 고정 목록 | 50개, 전체 테스트에서 검사 통과 |
| 추가 최소 입력 | 이전 빈 목록·표 입력, 목록 밖·조상 숨김, 숨긴 글·이미지, 표시되는 빈 항목, PC 전용 빈 항목, 숨긴 빈 셀·행을 직접 실행 |

기존 테스트는 모두 통과하지만 위 표 내부 변형까지 안전하다는 뜻은 아니다.

브라우저 비교는 원본에 Bootstrap 4.6.2와 원본 cms.css, 출력에 저장소 host-style.css를 적용했다. 원본 배포 사이트의 Bootstrap 버전까지 확정한 검사는 아니다. 추가 입력은 실제 703페이지 통계와 구분했다. 재현 스크립트·JSON·캡처는 `/tmp/blocks-fix3-review/`에만 두었으며 커밋하지 않는다.

## 이전 검수 기록

아래는 이전 f687c61 검수 문서 원문이다. 당시 판정이며 현재 유효한 결함 수는 위 표를 따른다.

<details>
<summary>이전 검수 문서 원문 (f687c61)</summary>

# 블록 순서 3차 검수 — 93c341e

- 검수일: 2026-11-17 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `93c341e`, 범위: `38ff8cf..93c341e`.
- 기준: `docs/review-request-real-pages.md` 23장, `docs/review-real-pages-fixes.md` 마지막 장.
- 실행 전 `cp -r reference/cms-original/. cms/`로 로컬 cms/를 준비했다. cms/는 커밋하지 않는다. 코드·테스트·원본 자료는 수정하지 않았으며 이번 변경은 검수 문서뿐이다.

## 판정

**수정 후 재확인 필요.** 이전 I-1·I-2의 정확한 재현 입력은 해결됐다. 다만 숨긴 항목에 빈 목록 또는 빈 표가 들어 있는 변형에서 빈 번호가 다시 나타난다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 확정 항목 없음 |
| Important | 1 | I-1 숨긴 항목 안의 빈 구조 블록이 번호를 차지함 |
| Minor | 0 | 확정 항목 없음 |

아래 지적은 추가 최소 입력이다. 실제 703페이지에서 발생했다고 집계하지 않는다. 이전 버전에도 있던 잔여 변형이며, 이번 수정으로 새로 발생한 회귀라는 주장은 아니다.

## 이전 지적 및 추가 정상 입력 — 직접 실행

| 입력 | 확인 결과 |
|---|---|
| 연속 중첩 ol의 안쪽 start=4 | blocks·partial·fallback 0. computed counter-reset은 `mig-counter-sub 3`, 해당 li는 `mig-counter-sub`를 증가시킨다. 호스트의 lower-alpha 표기에서 시작 순번 4에 맞음 |
| 3단계 ol start=5 | `mig-counter-sub-sub 4` 적용, 해당 단계의 lower-roman 카운터 사용 |
| ul 안의 ol start=4 | `mig-counter 3` 적용. 글머리 목록을 지나면 번호 단계가 다시 1단계 |
| ol → ul → ol start=4 | 안쪽 ol은 역시 `mig-counter 3` 적용 |
| `<li class="d-none"></li>` 다음에 ALL ITEM | 빈 li가 모델에서 제외됨. 출력에 보이는 항목 1개, 번호 1 |
| `<li class="d-none">HIDDEN</li>` 다음에 ALL ITEM | 숨긴 글을 노출하지 않고 fallback으로 원본 보존 |

카운터·표시 결과는 Chromium 1100/360px에서 DOM/CSS를 직접 측정했다. 이전 두 입력과 아래 결함 입력은 캡처도 열어 확인했다. 원본에는 Bootstrap 4.6.2 표시 규칙과 원본 cms.css, 출력에는 저장소의 host-style.css를 적용했다. 원본 배포 사이트의 Bootstrap 버전을 확정한 검사는 아니다.

## Important

### I-1. 모든 화면에서 숨긴 li 안에 빈 구조 블록이 있으면 빈 번호가 나타남

**위치:** `packages/core/src/types/blocks.ts:140`~`:145` (빈 항목 제외), `:66`~`:70` (onlyOf), `:225`~`:226` (항목 출력).

**재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type01"><div class="cms-inner">
    <ol>
      <li class="d-none"><ul></ul></li>
      <li>ALL ITEM</li>
    </ol>
  </div></section>
</div>
```

**실제:** blocks·partial·fallback 0, 진단은 `LAYOUT_SIMPLIFIED`뿐이다. 첫 항목 모델에 빈 ul 블록이 들어 있고 `only`는 없다. 출력은 두 li 모두 보이며 첫 번째에는 글 없는 **1번**, 다음 ALL ITEM에는 **2번**이 표시된다. 원본은 첫 li가 숨겨져 **1. ALL ITEM**만 보인다. Chromium 1100/360px의 DOM 측정 및 캡처에서 차이를 확인했다.

다음처럼 첫 항목을 빈 표로 바꿔도 같은 결과다.

```html
<li class="d-none"><table><tbody><tr><td></td></tr></tbody></table></li>
```

두 입력 모두 숨긴 항목에 글·이미지가 없다. 단순히 자식 노드가 전혀 없는 li만 정상 처리되고, 빈 구조 요소를 가진 항목은 빈 번호와 자리를 차지한다.

**기대:** 모든 화면에서 숨긴 내용 없는 항목이 출력의 번호·공간에 영향을 주지 않아야 한다. 안전하게 생략하거나 숨김을 보존할 수 없다면 원본을 보존해야 한다.

**원인 — 정적 판독:** 제외 조건은 `inner.length === 0`이다. 빈 ul 또는 빈 셀만 든 표도 블록 객체가 생성되므로 이 조건을 통과하지 못한다. 모든 화면이 false인 표시 상태는 onlyOf의 pc/mo 중 어느 쪽도 아니어서 항목에 숨김이 기록되지 않는다. 렌더러는 이를 일반 li로 출력한다. 글·이미지 순서 검사에는 이 빈 구조와 CSS 생성 번호의 차이가 나타나지 않아 fallback도 발생하지 않는다.

## 실행한 검증

| 검증 | 결과 |
|---|---|
| `npm test` | 36개 파일, 944개 통과 |
| `npm run test:browser` | 5개 파일, 196개 통과 |
| `npm run lint` / `npm run typecheck` | 오류 없음 |
| `npm run convert -- --all` | 703페이지: success 326 / partial 363 / failed 14 |
| 기준 38ff8cf와 703페이지 대조 | 페이지별 상태·섹션 타입 배열 변화 0개, 기존 집계 유지 |
| 추가 최소 입력 | 이전 재현 입력, 3단계·혼합 목록, 숨긴 빈 목록/표를 변환하고 DOM/CSS 확인 |

기존 테스트 통과는 위 추가 변형까지 안전하다는 뜻이 아니다. 원본 보존 50개에 관한 기존 고정 목록 검사는 전체 테스트에서 통과했다. 재현용 스크립트·JSON·캡처는 `/tmp/blocks-fix2-review/`에만 두었으며 커밋하지 않는다.

## 이전 검수 기록

아래는 이전 ce1baa9 검수 문서 원문이다. 당시 판정이며 현재 유효한 결함 수는 위 표를 따른다.

<details>
<summary>이전 검수 문서 원문 (ce1baa9)</summary>

# 블록 순서 변환 재검수 — ce1baa9

- 검수일: 2026-11-17 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `ce1baa9`, 범위: `16f0048..ce1baa9`.
- 기준: `docs/review-real-pages-fixes.md` 마지막 장 및 `docs/review-request-real-pages.md` 22장.
- 실행 전 `cp -r reference/cms-original/. cms/`로 로컬 복사본을 준비했다. cms/는 gitignore 대상으로 커밋하지 않는다. 코드·테스트·원본 자료는 수정하지 않았고 이번 변경은 이 문서뿐이다.

## 판정

**수정 후 재확인 필요.** 이전 네 재현 입력은 수정됐다. 다만 중첩 번호 목록의 시작값과 모든 화면에서 숨긴 빈 목록 항목의 추가 변형에서 번호 의미가 여전히 바뀐다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 이번 범위에서 확정한 항목 없음 |
| Important | 2 | I-1 중첩 목록의 다른 CSS 카운터에 start가 적용되지 않음, I-2 완전히 숨긴 빈 항목의 번호 잔존 |
| Minor | 0 | 이전 열 너비 경고 해결, 추가 확정 항목 없음 |

두 항목은 **추가 최소 입력**이며 실제 703페이지에서 발생했다고 집계하지 않는다. 둘 다 이전 구현에서도 남아 있던 변형으로, 이번 수정이 원래 입력에 적용되지 않았다는 주장은 아니다. 변환은 partial·LAYOUT_SIMPLIFIED 상태지만, 번호 의미 변경에 대한 별도 진단이나 fallback이 없다.

## 이전 네 지적 수정 확인 — 직접 실행

| 이전 입력 | 현재 결과 |
|---|---|
| 1단계 ol start=3 | blocks·partial·fallback 0. 모델/HTML start=3, computed counter-reset은 mig-counter 2. Chromium 1100/360px 실제 번호도 3·4 |
| ol reversed start=3 | LOSSY_PARSE·fallback 1로 원본 보존 |
| 첫 li value=7 | LOSSY_PARSE·fallback 1로 원본 보존 |
| 첫 li d-none d-lg-block, 다음 ALL ITEM | 첫 항목 모델에 only=pc. 360px에서 li 전체가 숨고 1번 ALL ITEM만 표시. 1100px에서는 두 항목 모두 표시 |
| 30% col 너비·rowspan=2 표와 앞뒤 글 | 너비·병합·글 순서 보존. INLINE_STYLE_DROPPED는 없어지고 LAYOUT_SIMPLIFIED만 남음 |

위 번호·표시 결과는 DOM/CSS 측정과 캡처를 직접 열어 확인했다. reversed·value는 지원하지 않는 속성을 버리는 대신 fallback하므로 원래의 손실 문제가 해결됐다.

## Important

### I-1. 중첩 ol은 mig-counter-sub를 표시하는데 start는 mig-counter에만 설정됨

**위치:** `packages/core/src/types/blocks.ts:210`~`:215`; 호스트의 2단계 번호 규칙은 `reference/host-style.css:5210`~`:5219`다.

**재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type01"><div class="cms-inner">
    <ol><li>
      <p>OUTER</p>
      <ol start="4"><li>INNER FIRST</li><li>INNER SECOND</li></ol>
    </li></ol>
  </div></section>
</div>
```

**실제:** blocks·partial·fallback 0, 진단은 LAYOUT_SIMPLIFIED뿐이다. 중첩 목록 모델의 start는 4이고 HTML에도 start=4가 남지만, 인라인 스타일은 `counter-reset: mig-counter 3`이다.

Chromium 1100/360px에서 원본의 안쪽 번호는 **4·5**, 출력은 **a·b**였다. 원본·출력 캡처를 직접 열어 확인했다. 호스트의 lower-alpha 모양을 따를 때 시작 순번 4는 d에 해당하므로, 현재 a의 순번 1과 다르다.

**DOM/CSS 측정 — 직접 실행:** 중첩 ol의 computed counterReset은 mig-counter 3, 자식 li의 counterIncrement는 mig-counter-sub 1, ::before content는 counter(mig-counter-sub, lower-alpha)다. 설정하는 카운터와 실제 표시하는 카운터가 다르다.

**기대:** 시작 번호는 해당 목록에서 호스트가 실제 사용하는 카운터에 적용되어야 한다. 중첩 구조도 지원 범위이므로 1단계에서만 맞는 것으로 충분하지 않다. 표현하지 못하면 원본을 보존해야 한다.

**원인 — 정적 판독:** renderBlocks는 모든 ordered 블록에 이름이 고정된 mig-counter를 설정한다. 반면 호스트 CSS는 연속으로 중첩된 ordered 목록의 2단계에서 mig-counter-sub, 3단계에서 mig-counter-sub-sub를 사용한다. 이번 변경은 루트 목록의 시작값은 고쳤지만 다른 카운터를 쓰는 중첩 목록까지 처리하지 않는다. 텍스트 순서 검사에는 CSS 생성 번호가 포함되지 않아 차이를 검출하지 못한다.

### I-2. d-none인 빈 li는 only를 만들지 않아 번호가 나타나고 다음 항목이 2번이 됨

**위치:** `packages/core/src/types/blocks.ts:135`~`:140` (항목 only 기록), `:214`~`:215` (li 출력). onlyOf는 PC 전용·모바일 전용 두 경우만 표현한다.

**재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type01"><div class="cms-inner">
    <ol><li class="d-none"></li><li>ALL ITEM</li></ol>
  </div></section>
</div>
```

**실제:** blocks·partial·fallback 0, 진단은 LAYOUT_SIMPLIFIED뿐이다. 첫 항목 모델은 `{blocks: []}`이고 표시 정보가 없다. 출력에서는 항상 li.mig-item으로 생성된다.

Chromium 1100/360px에서 원본은 첫 li가 숨으므로 **1. ALL ITEM만** 표시된다. 출력에서는 빈 첫 항목의 번호가 나타나고 **ALL ITEM은 2번**이 된다. 360px 캡처를 직접 확인했으며, 표시되는 li 수도 원본 1개 / 출력 2개다.

**대조 입력 — 직접 실행:** 숨긴 첫 li에 HIDDEN ITEM이라는 글을 넣으면 현재 순서 검사가 차이를 찾아 fallback한다. 빈 항목에서는 비교할 글·이미지가 없어 이 방어가 작동하지 않는다. 앞서 보고한 PC 전용 항목은 이번 수정대로 항목째 숨으며, 이 지적은 모든 화면에서 숨기는 추가 경우다.

**기대:** 항상 숨겨진 빈 항목이 새 번호·빈 공간을 만들거나 뒤의 항목 번호를 밀지 않아야 한다. 표시 의미를 보존하도록 처리하거나, 표현할 수 없다면 원본을 보존해야 한다.

**원인 — 정적 판독:** d-none은 모든 화면 false라 onlyOf가 pc/mo 어느 값도 반환하지 않는다. 빈 li에는 하위 블록도 없으므로 그대로 항상 보이는 항목이 된다. source/output의 글 스트림은 모두 ALL ITEM이라 통과하고, 호스트의 li 카운터가 빈 항목에서도 증가한다. 화면 한쪽 전용뿐 아니라 완전히 숨는 항목의 처리도 필요하다.

## 기타 회귀·실제 페이지 대조 — 직접 실행과 정적 판독 구분

**직접 실행:**

- 원래 start=3 및 PC 전용 항목 입력은 Chromium 1100/360px에서 수정된 실제 번호·표시를 확인했다. 새 변형과 원래 입력을 구분했다.
- 이전 표 입력은 30% 열 너비, rowspan=2, BEFORE → 표 → AFTER 순서를 그대로 보존하고 잘못된 열 너비 경고도 없다.
- 실제 703개 파일을 16f0048과 현재 코드로 각각 변환해 파일 상태와 섹션 type/fallback을 대조했다. 변화 0개다.
- 파일 집계 success 326 / partial 363 / failed 14, 원본 보존 50개를 유지한다. STRUCTURE_RETYPED 26개와 LAYOUT_SIMPLIFIED 352개도 같다. 고정 fallback 목록 검사도 통과했다.

**정적 판독·자동 테스트:**

- reversed·li value가 있으면 w.problems에 기록해 블록 변환을 거부한다. 번호 값이 조용히 사라지던 원래 경로는 막혔다.
- 항목 only가 스키마와 li 출력에 함께 추가돼, 기존의 ‘p만 숨음’ 문제는 원래 PC 전용 입력에서 해결됐다.
- 열 너비 경고 필터를 type26과 blocks가 함께 쓰며, 이전 type26 검사도 전체 테스트에 포함되어 통과했다.
- 재분류·모드 분리·resetReads 구현은 이번 범위에서 바뀌지 않았고 관련 기존 검사가 통과했다. 이번 범위에서 추가로 확정한 상태 누수·모드 분리 결함은 없다.

## 실행 결과

다음 명령을 ce1baa9에서 직접 실행했고 모두 종료 코드 0이었다.

| 명령 | 결과 |
|---|---|
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm test` | 36 files / 940 tests passed, 실패·건너뜀 0 |
| `npm run lint` | 오류 없음 |
| `npm run typecheck` | 오류 없음 |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm run test:browser` | 5 files / 196 tests passed, 실패·건너뜀 0 (전체 테스트와 중복되는 별도 실행) |
| `npm run convert -- --all` | 703 / success 326 / partial 363 / failed 14 / fallback 50 |
| 추가 직접 검사 | 이전 네 지적, 중첩 start·숨긴 빈 항목·숨긴 글 대조, 1100/360px DOM/CSS 및 캡처 확인, 이전 버전 703개 비교 |

브라우저 원본에는 보유한 [Bootstrap 4.6.2 배포 CSS](https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css) + cms.css, 출력에는 host-style.css를 적용했다. 실사이트 전체 CSS를 새로 확보한 비교가 아니다. 임시 스크립트·캡처는 /tmp에만 두고 커밋하지 않았다.

아래는 이전 보고서의 원문 보관이며 현재 판정 건수는 위 표만 적용한다.

<details>
<summary>이전 검수 원문 — 52cbe1b 및 그 이전 기록</summary>

# 구조 재분류·블록 순서 변환 검수 — 52cbe1b

- 검수일: 2026-11-17 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `52cbe1b`, 범위: `78133b4..52cbe1b`.
- 기준: `docs/real-pages-baseline.md` 9장, `docs/review-request-real-pages.md` 21장.
- 실행 전 `cp -r reference/cms-original/. cms/`로 로컬 복사본을 준비했다. cms/는 gitignore 대상으로 커밋하지 않는다. 코드·테스트·원본 자료는 고치지 않았고 이번 변경은 이 문서뿐이다.

## 판정

**수정 후 재확인 필요.** 재분류·일반 모드 분리·읽기 상태 초기화는 아래 대조에서 작동했다. 다만 블록 순서 변환이 목록의 시작 번호, 항목별 번호·역순, 항목 전체의 화면 전용 표시를 보존하지 못하는 입력을 재현했다. 표 열 너비의 보존 여부와 맞지 않는 경고도 있다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 이번 범위에서 확정한 항목 없음 |
| Important | 3 | I-1 시작 번호가 실제 화면에 적용되지 않음, I-2 번호 속성 소실, I-3 숨긴 항목의 번호·빈 행 잔존 |
| Minor | 1 | M-1 보존한 col 너비를 제거했다고 경고 |

모든 항목은 **추가 최소 입력**이다. 실제 703페이지에서 같은 오류가 발생했다고 주장하지 않는다. 새 블록 목록 471개를 포함하는 실제 변환 자료와 해당 원본을 추가 탐색했을 때, 이번 목록 재현과 같은 명시적 start/reversed/ol type/li value 또는 li의 d-* 조합은 발견하지 못했다.

재현된 블록 변환은 대부분 partial·LAYOUT_SIMPLIFIED 경고 상태다. 따라서 ‘진단이 전혀 없다’는 지적이 아니라, **배치 단순화 경고만 남기고 내용·번호·표시 의미의 변경을 검출하지 못한다**는 지적이다. 해당 경고 메시지는 글·이미지·순서가 그대로라고 안내한다.

## Important

### I-1. start=3을 데이터와 HTML에 보존해도 호스트 CSS 카운터는 1부터 표시

**위치:** `packages/core/src/types/blocks.ts:139`~`:141`, `:204`~`:206`; 실제 번호 규칙은 `reference/host-style.css:5155`~`:5180`이다.

**재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type01"><div class="cms-inner">
    <ol start="3"><li>FIRST</li><li>SECOND</li></ol>
  </div></section>
</div>
```

**실제:** blocks로 변환, partial, fallback 0, 진단은 LAYOUT_SIMPLIFIED뿐이다. 모델에는 start:3이 있고 출력 HTML도 `<ol class="mig-list type-ordered" start="3">`다. 그러나 Chromium 1100/360px의 실제 번호는 원본 **3·4**, 출력 **1·2**다. 두 폭의 원본·출력 캡처를 직접 열어 확인했다.

**기대:** 설계에서 보존한다고 한 시작 번호가 실제 출력에도 적용되어야 한다. 구현하지 못하면 원본을 보존해야 하며, start 속성이 HTML에 있다는 것만으로 완료로 판단하면 안 된다.

**원인 — 정적 판독·DOM/CSS 대조:** 호스트는 ol의 native marker 대신 `::before`의 `counter(mig-counter)`를 그린다. `.mig-list.type-ordered`는 counter-reset: mig-counter 0, 각 항목은 counter-increment: mig-counter 1이다. HTML start 값은 별도 CSS 카운터의 시작값을 바꾸지 않는다. Chromium의 computed counterReset/counterIncrement도 해당 값이었다. 텍스트 노드 비교는 생성된 번호를 포함하지 않으므로 변화를 검출하지 못한다.

### I-2. reversed와 li value가 모델에서 사라져 목록의 번호 의미가 바뀜

**위치:** `packages/core/src/types/blocks.ts:24`~`:35`의 모델, `:134`~`:141`의 목록 읽기, `:204`~`:206`의 출력.

**재현 입력 — 직접 실행:** I-1과 같은 바깥 컨테이너·type01·cms-inner 안에 아래 두 목록을 각각 넣었다.

```html
<ol reversed start="3"><li>FIRST</li><li>SECOND</li></ol>
```

```html
<ol><li value="7">FIRST</li><li>SECOND</li></ol>
```

**실제:** 둘 다 blocks·partial·fallback 0, 진단은 LAYOUT_SIMPLIFIED뿐이다. 첫 모델에는 ordered와 start:3만 남고 reversed가 없다. 두 번째 모델의 항목에는 blocks만 있고 value가 없다. 출력 DOM에서도 reversed=false, li value는 null이다.

Chromium 원본은 각각 3·2와 7·8에 해당하는 native 번호 목록이지만, 출력은 일반 증가 목록으로 생성된다. 현재 CSS에서는 I-1과 겹쳐 1·2로 표시된다. **I-1을 고쳐 start=3이 화면에 적용되더라도 역순 3·2가 3·4로 바뀌는 문제는 별도로 남는다.**

**기대:** 번호에 의미를 주는 reversed·항목별 value를 보존하거나, 지원하지 않는 번호 속성은 fallback으로 보존해야 한다. 번호 모양을 호스트 기본 디자인으로 바꾸는 것과 번호 값·진행 방향을 바꾸는 것은 구분해야 한다.

**원인 — 정적 판독:** 목록 parser는 ordered와 start만 읽고, li는 안쪽 블록만 읽는다. 원본의 번호 속성이 모델·출력에 없으며 w.problems에도 기록되지 않는다. finish의 글·이미지 검사와 순서 검사는 이 속성을 비교하지 않는다. 기존 type33의 제한된 번호 속성 방어와 달리 새 blocks 경로에는 해당 거부 규칙이 없다.

### I-3. 화면 전용 li의 글만 숨겨 빈 번호가 남고 다음 항목 번호도 달라짐

**위치:** `packages/core/src/types/blocks.ts:134`~`:136` (항목은 blocks만 기록), `:204`~`:206` (li에 표시 조건 없음). text 블록의 only는 `:202`에서 p에만 적용된다.

**재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type01"><div class="cms-inner">
    <ol>
      <li class="d-none d-lg-block">PC ITEM</li>
      <li>ALL ITEM</li>
    </ol>
  </div></section>
</div>
```

**실제:** blocks·partial·fallback 0, 진단은 LAYOUT_SIMPLIFIED뿐이다. 첫 항목 안의 text 블록에는 only=pc가 있지만 항목 자체에는 표시 조건이 없다.

Chromium 360px에서 원본은 첫 li가 display:none이라 **1. ALL ITEM 하나만** 표시된다. 출력은 첫 항목의 p만 숨고 li 및 ::before는 남아 **빈 1번 배지 + 2번 ALL ITEM**이 표시된다. 원본·출력 캡처를 직접 확인했다. 표시되는 li 수도 원본 1개 / 출력 2개다. 1100px에서는 두 항목의 글이 모두 보인다.

**기대:** 원본에서 li 전체가 화면 전용이면 번호·불릿·항목 공간을 포함한 항목 전체의 표시를 보존해야 한다. 글만 숨겨 항목을 남기는 것은 같은 표시가 아니다. 현재 모델로 표현하지 못하면 원본을 보존해야 한다.

**원인 — 정적 판독:** walk(li)의 글은 li의 표시를 only로 받아 p에 옮기지만, 목록 items 모델에는 only 필드가 없고 renderer의 li는 항상 생성된다. 호스트 CSS는 이 li 자체에서 번호를 증가시키고 배지를 그린다. 모바일의 글·이미지 스트림은 원본·출력 모두 ALL ITEM이라 순서 검사가 통과한다. 생성된 marker와 빈 항목 존재는 검사하지 않는다.

## Minor

### M-1. 블록 표에서 실제로 보존한 열 너비를 INLINE_STYLE_DROPPED라고 경고

**위치:** `packages/core/src/types/blocks.ts:145`~`:149`, `:244`~`:248`; 비교 경로는 `packages/core/src/types/type26.ts:185`~`:187`이다.

**재현 입력 — 직접 실행:**

```html
<div class="cms-container"><section class="cms type01"><div class="cms-inner">
  <p>BEFORE</p>
  <table>
    <colgroup><col style="width:30%"><col></colgroup>
    <thead><tr><th>A</th><th>B</th></tr></thead>
    <tbody><tr><td rowspan="2">MERGED</td><td>ONE</td></tr><tr><td>TWO</td></tr></tbody>
  </table>
  <p>AFTER</p>
</div></section></div>
```

**실제:** blocks로 정상 변환되고 colWidths에 30%가 보존되며, HTML도 `<col style="width: 30%;">`다. 표 앞뒤 글 순서와 rowspan=2도 보존된다. 그런데 진단에는 `INLINE_STYLE_DROPPED` / `col의 inline style 일부 제거: width:30%`가 함께 남는다.

**기대:** 실제로 보존한 속성을 제거했다고 보고하지 않아야 한다. LAYOUT_SIMPLIFIED 경고와 별개로 이 세부 진단의 내용이 결과와 맞아야 한다.

**원인 — 정적 판독:** blocks가 scanSection의 일반 style 제거 진단을 그대로 넘긴다. 같은 너비 읽기·표 출력 helper를 쓰는 type26은 모델로 옮긴 col width 경고를 따로 걸러내지만, blocks에는 이 보정이 없다. 데이터 손실은 아니고 이미 partial인 파일 상태도 바꾸지 않으므로 Minor다.

## 재분류·모드 분리·resetReads 확인

### 직접 실행

- 적힌 타입은 type02이고 안쪽이 cms-row-list / cms-list-item / cms-description-box / 제목·설명인 입력은 **type17**로 변환됐다. STRUCTURE_RETYPED는 info, detail은 declared:type02 / used:type17이며 같은 입력을 3회 더 변환해 HTML이 같았다.
- 그 입력에 `cms-unregistered-structure`와 추가 글을 넣으면 STRUCTURE_RETYPED가 발생하지 않고 blocks로 간다. 클래스가 맞지 않는 후보를 구조 재분류로 강행하지 않는다.
- `type01 프리셋 → 글·이미지·글·이미지·글의 blocks → type01 프리셋` 혼합 페이지는 fallback 0, renderPage 블록 모드 preset → general → preset이다. MIXED_MODE_SPLIT 정보 진단은 두 번이다.
- 같은 혼합 출력의 Chromium 1100/360px 직접 감싸개는 mig-container → inner → mig-container다. 섹션 세 개가 존재하고 일반 모드 selector `.migration-content:not(:has(.mig-container)) .mig-section.type-text`에 해당하는 섹션은 정확히 한 개다. 일반 섹션이 프리셋 컨테이너에 섞이지 않는다.
- 같은 SourceSection DOM을 type01.parse로 읽은 다음 blocks.parse로 옮기는 분리 실험을 했다. reset 없이 호출하면 `같은 글을 두 칸으로 읽음: <p> 글을 두 번 읽음`이 재현되고, resetReads를 사이에 호출하면 해당 fallbackReason이 사라진다. **이는 의도적으로 reset을 생략한 직접 호출 대조이며, 현재 제품 경로의 실패라고 집계하지 않는다.**
- 실제 convertDocument의 해당 입력은 blocks로 정상 이동한다. 새로운 attempt 함수가 매 시도 시작 시 resetReads를 호출하는 코드와 일치한다. 상태 초기화에서 추가 누수 경로는 이번 검사에서 확정하지 않았다.
- 표의 앞 글 → head/body·병합 표 → 뒤 글과 30% 열 너비는 M-1 입력에서 직접 보존을 확인했다. 행 자체의 PC 전용 표시가 옮겨지지 않는 별도 표 입력은 fallback되어 무경고로 내용을 노출하지 않았다.

### 정적 판독·자동 테스트 근거

- 재분류는 cms-* 클래스 허용 집합과 구분 클래스 존재 여부로 후보를 좁힌 다음, 각 후보에 finish와 순서 검사를 적용한다. 구조 표와 원본 component의 일치 테스트가 통과했다.
- 실제 26개 STRUCTURE_RETYPED의 타입 변경 기록도 확인했다. 위 대표 입력 외에 확정한 재분류 오판은 없다. 클래스 집합만으로 모든 원본 디자인의 픽셀 동일성이 증명된다고 주장하지 않는다.
- `convert-document.ts:75`~`:77`의 attempt는 적힌 타입·재분류 후보·blocks 모두에서 resetReads를 먼저 호출한다. `common.ts`의 resetReads는 하위 요소들의 readAsText·readInParts·readCount를 모두 지운다.
- LAYOUT_SIMPLIFIED를 warn으로 두어 partial로 만드는 정책 자체는 타당하다. 배치 단순화는 사용자가 확인해야 한다. 다만 I-1~I-3은 이 경고로 허용할 단순 배치 변경을 넘어서는 번호·항목 표시의 변경이다.

## 실제 703페이지 대조·검증 결과

**직접 실행:** 78133b4와 52cbe1b로 원본 703개를 각각 변환해 파일 상태 및 섹션 type/fallback을 비교했다.

- 파일 259개에서 섹션 타입 변화가 있었고, 원본 보존은 428 → **50**으로 378개 감소했다. 정상 타입에서 fallback으로 새로 바뀐 섹션은 없었다.
- 새 진단은 STRUCTURE_RETYPED **26개**, LAYOUT_SIMPLIFIED **352개**로 설계와 같다. INVALID_DATA는 0이다.
- 파일 집계는 success 320 → **326**, partial 368 → **363**, failed 15 → **14**다.
- 남은 fallback 50개 고정 목록과 실제 페이지의 글 순서 검사도 통과했다. I-1~I-3은 이 데이터에 없는 추가 목록 속성/표시 입력이며, 해당 테스트의 통과만으로 새 일반 모드의 모든 의미 보존이 보장되지는 않는다.

| 명령 | 결과 |
|---|---|
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm test` | 36 files / 933 tests passed, 실패·건너뜀 0 |
| `npm run lint` | 오류 없음 |
| `npm run typecheck` | 오류 없음 |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm run test:browser` | 5 files / 194 tests passed, 실패·건너뜀 0 (전체 테스트와 중복되는 별도 실행) |
| `npm run convert -- --all` | 703 / success 326 / partial 363 / failed 14 / fallback 50 |
| 추가 직접 검사 | 목록 번호·표시 재현, 표 보존·진단, 구조 재분류 대조, 혼합 모드·상태 초기화, 이전 버전 703개 비교 |

위 제품 검증 명령은 모두 종료 코드 0이다. 브라우저 원본에는 [Bootstrap 4.6.2 배포 CSS](https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css) + cms.css, 출력에는 host-style.css를 적용했다. 실사이트 전체 CSS를 확보한 비교가 아니다. 1100/360px의 DOM/CSS 측정과 캡처 확인을 구분해 위에 기록했다. 임시 스크립트·캡처는 /tmp에만 두고 커밋하지 않았다.

아래는 이전 보고서의 원문 보관이며 현재 판정 건수는 위 표만 적용한다.

<details>
<summary>이전 검수 원문 — bb06097 및 그 이전 기록</summary>

# 실제 원본·703페이지 13차 재검수 — bb06097

- 검수일: 2026-11-17 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `bb06097`, 범위: `3eb7113..bb06097`.
- 기준: `docs/review-real-pages-fixes.md` 마지막 장 및 `docs/review-request-real-pages.md` 20장.
- 실행 전 `cp -r reference/cms-original/. cms/`로 로컬 복사본을 준비했다. cms/는 gitignore 대상으로 커밋하지 않는다. 코드·테스트·원본 자료는 수정하지 않았고 이번 변경은 이 문서뿐이다.

## 판정

**이번 범위에서 추가 지적 없음.** 이전 I-1의 재현 입력이 정상 변환되며, 동일 요소의 CSS 선언 우선순위와 조상·자손 사이의 숨김이 분리되어 계산된다. 호스트 표시 조합의 기존 불일치 19건도 모두 해소됐다.

| 등급 | 현재 건수 | 결과 |
|---|---:|---|
| Critical | 0 | 확정한 항목 없음 |
| Important | 0 | 이전 I-1 해결, 추가 확정 항목 없음 |
| Minor | 0 | 확정한 항목 없음 |

이 판정은 요청한 변경 범위와 아래 직접 실행한 입력에 한정한다. 프로젝트 전체의 임의 HTML·CSS가 모두 지원된다는 뜻은 아니다.

## 이전 I-1 수정 확인 — 직접 실행

**재현 입력:** 지난 보고서의 전체 입력을 그대로 변환했다.

```html
<div class="cms-container">
  <section class="cms type23"><div class="cms-inner">
    <div class="cms-description-box"><p class="cms-description">BEFORE<span class="d-none d-lg-block common-display-pc common-display-mo">PC_TEXT</span>AFTER</p></div>
  </div></section>
</div>
```

**실제 결과:** success, diagnostics `[]`, fallback 0. 서식 안의 두 호스트 표시 클래스가 보존된 정상 HTML을 반환한다. common-display-mo를 제거한 대조 입력도 success·무경고·fallback 0이다.

**Chromium — 직접 실행:** 원본은 Bootstrap 4.6.2 + cms.css, 이번 변환이 실제 반환한 HTML은 host-style.css로 표시했다.

| 폭 | 원본 PC_TEXT | 실제 출력 PC_TEXT |
|---|---|---|
| 360px | 숨김 | 숨김 |
| 800px | 숨김 | 숨김 |
| 1100px | 표시(block) | 표시(block) |

이전 보고서에서 만들었던 출력 후보만 비교한 것이 아니라, 수정 후 정상 변환이 반환한 HTML을 직접 확인했다.

**정적 판독:** `packages/core/src/parse/common.ts:156`~`:167`의 hostVisibilityOf는 한 요소에 pc가 있으면 pc 규칙을 선택하고, pc 없이 mo만 있으면 mo 규칙을 선택한다. 그 결과를 조상마다 합치므로 같은 요소의 pc/mo 충돌과 서로 다른 요소 사이의 숨김이 구별된다. `reference/host-style.css:357`~`:375`의 실제 선언 순위와 일치한다.

## 호스트 표시 조합 재대조 — 직접 실행

부모·중간 상자·내용 요소 각각에 클래스 없음 / pc / mo / pc+mo의 네 상태를 넣은 **64개 조합**을 사용했다. hostVisibilityOf 결과와 Chromium의 host-style.css 실제 표시를 360/800/1100px에서 대조했다.

- 총 **192건 모두 일치**, 불일치 0.
- 이전 같은 대조에서 불일치했던 PC 폭의 19건도 모두 일치한다.
- 단독 pc/mo와 같은 요소의 pc+mo뿐 아니라, 부모 mo + 자식 pc처럼 서로 다른 요소에 나뉘어 모든 화면에서 숨는 경우도 포함한다.
- 클래스 순서를 바꾼 동일 요소 입력과 원본이 모바일 전용인데 출력의 두 클래스가 PC 전용이 되는 입력은 이번 추가 자동 테스트에도 포함돼 통과했다. 후자는 잘못 허용하지 않고 fallback한다.

## 이전 숨김 글 방어·기존 페이지 회귀 — 직접 실행

- `BEFORE<span class="d-none">HIDDEN</span>AFTER`: 계속 LOSSY_PARSE·fallback 1. 호스트 CSS에 없는 Bootstrap 표시 규칙을 출력에도 있다고 가정하지 않는다.
- `BEFORE<span class="d-none d-lg-block">HIDDEN</span>AFTER`: 계속 LOSSY_PARSE·fallback 1. 출력에서 태블릿 화면의 글이 나타나는 차이를 검출한다.
- 실제 703개 파일을 3eb7113과 현재 코드로 각각 변환해 파일 상태와 섹션 type/fallback을 비교했다. 변화 0개. success 320 / partial 368 / failed 15 유지.
- 순서 사유 fallback 9개 고정 목록 검사도 통과했다.
- 기존 28타입 × 4변형(공백·이미지 없음·인라인 서식·문단 블록) 총 112개 입력은 전부 fallback 0이며 이전 HTML과 byte 단위로 같다.

## 실행 결과

다음 명령을 bb06097에서 직접 실행했고 모두 종료 코드 0이었다.

| 명령 | 결과 |
|---|---|
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm test` | 33 files / 911 tests passed, 실패·건너뜀 0 |
| `npm run lint` | 오류 없음 |
| `npm run typecheck` | 오류 없음 |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm run test:browser` | 4 files / 192 tests passed, 실패·건너뜀 0 (전체 테스트와 중복되는 별도 실행) |
| `npm run convert -- --all` | 703 / success 320 / partial 368 / failed 15 |
| 추가 Chromium 대조 | 호스트 표시 조합 192건 일치, 이전 재현 입력의 실제 정상 출력 확인 |

대조에는 보유한 [Bootstrap 4.6.2 배포 CSS](https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css), reference/cms-original/css/cms.css, reference/host-style.css를 사용했다. 원본 Bootstrap 버전 미확인 및 원본 992px / 호스트 1024px 경계 차이는 이전과 같은 범위 한계로 남으며, 이번 수정에서 그 문제가 새로 확인되거나 바뀐 것은 아니다.

임시 실행 스크립트·브라우저 기록은 /tmp에만 두고 커밋하지 않았다. 아래는 이전 원문 보관이며 현재 판정 건수는 위 표만 적용한다.

<details>
<summary>이전 검수 원문 — 7407636 및 그 이전 기록</summary>

# 실제 원본·703페이지 12차 재검수 — 7407636

- 검수일: 2026-11-17 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `7407636`, 범위: `bd084d0..7407636`.
- 기준: `docs/review-real-pages-fixes.md` 마지막 장 및 `docs/review-request-real-pages.md` 19장.
- 실행 전 `cp -r reference/cms-original/. cms/`로 로컬 복사본을 준비했다. cms/는 gitignore 대상으로 커밋하지 않는다. 코드·테스트·원본 자료는 수정하지 않았고 이번 변경은 이 문서뿐이다.

## 판정

**수정 후 재확인 필요.** 이전의 숨김 서식 글 입력은 이제 원본 보존된다. 원본과 출력의 표시 함수를 분리한 방향도 맞다. 다만 같은 요소에 두 호스트 표시 클래스가 함께 있으면 새 함수가 CSS 선언 우선순위와 다르게 계산해 정상 변환을 거부하는 오탐이 있다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 이번 범위에서 확정한 항목 없음 |
| Important | 1 | I-1 동일 요소의 common-display-pc/mo 조합을 모든 화면에서 숨김으로 오판 |
| Minor | 0 | 별도 확정 항목 없음 |

I-1은 **추가 최소 입력**이며 실제 703페이지에서 발생했다고 집계하지 않는다. bd084d0에서는 정상 변환하던 입력의 새 오탐이다. 현재 렌더러가 두 클래스를 함께 생성한다는 주장은 아니다. 입력 서식에 남을 수 있는 클래스 조합과 새 출력 표시 함수의 실제 CSS 일치 여부를 검토했다.

## 이전 입력 수정 확인 — 직접 실행

- `BEFORE<span class="d-none">HIDDEN</span>AFTER`: LOSSY_PARSE·fallback 1. 원본에 없던 글이 출력 PC 화면에 나타난다는 사유로 보존한다.
- `BEFORE<span class="d-none d-lg-block">HIDDEN</span>AFTER`: LOSSY_PARSE·fallback 1. 원본에서 숨는 태블릿 화면에 글이 나타난다는 사유로 보존한다.
- 이전처럼 두 입력이 success·무경고로 넘어가지 않는다. 원본은 Bootstrap 표시 규칙, 출력은 hostVisibilityOf를 넘기는 분리가 코드에서 확인된다.
- 렌더러가 붙이는 common-display-pc/mo 단독 클래스의 정상 동작과, 실제 글이 없는 br 대조 입력은 기존 추가 테스트에서 통과했다.

## Important

### I-1. 두 호스트 표시 클래스를 같은 요소에 붙이면 CSS는 PC 전용인데 검사는 모든 화면에서 숨김으로 판단

**위치:** `packages/core/src/parse/common.ts:156`~`:161`의 hostVisibilityOf; 호출은 `packages/core/src/convert/convert-document.ts`의 textOrderDiffers 출력 쪽이다. 실제 기준 CSS는 `reference/host-style.css:357`~`:375`다.

**재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type23"><div class="cms-inner">
    <div class="cms-description-box"><p class="cms-description">BEFORE<span class="d-none d-lg-block common-display-pc common-display-mo">PC_TEXT</span>AFTER</p></div>
  </div></section>
</div>
```

**실제:** 현재 failed·LOSSY_PARSE·fallback 1. 사유는 PC 화면에서 원본 BEFOREPC_TEXTAFTER 자리에 출력 BEFOREAFTER가 온다는 것이다. bd084d0의 동일 입력은 success·무경고·fallback 0이다.

**대조 입력 — 직접 실행:** span에서 common-display-mo 하나만 지우면 현재도 success·무경고·fallback 0이다. 원본 Bootstrap CSS 조건에서 두 입력의 글 표시는 같다. 입력의 common-display-*는 mig-* 예약 클래스가 아니므로 서식 정리에 남으며, 이 조합을 금지하는 입력 검증도 없다.

**Chromium — 직접 실행:** 원본에는 Bootstrap 4.6.2 + cms.css를, 출력 후보에는 host-style.css를 적용했다.

| 폭 | 원본의 PC_TEXT | 단독 common-display-pc 출력 | 같은 요소에 pc/mo 둘 다 있는 출력 CSS 대조 |
|---|---|---|---|
| 360px | 숨김 | 숨김 | 숨김 |
| 800px | 숨김 | 숨김 | 숨김 |
| 1100px | 표시(block) | 표시(block) | 표시(block) |

출력 후보는 정상 대조 입력이 생성한 HTML이며, 마지막 열은 그 span에 common-display-mo도 붙여 CSS 동작을 직접 확인한 것이다. 현재 fallback 출력을 정상 출력이라고 측정한 것이 아니다. 두 클래스가 있어도 실제 호스트 CSS에서 해당 글은 PC에 보인다.

**기대:** 같은 요소 안에서는 CSS 선언 순위로 그 요소의 표시를 먼저 정하고, 서로 다른 조상·자손 사이의 숨김은 그 다음에 합쳐야 한다. 위 입력의 source/output 표시가 동등한데 PC 글이 사라졌다고 거부하지 않아야 한다.

**원인 — 정적 판독:** hostVisibilityOf는 common-display-pc가 있으면 모바일·태블릿을 false로, common-display-mo가 있으면 PC를 false로 만든다. 두 조건을 독립적인 숨김으로 AND하므로 동일 요소에 둘 다 있으면 모든 화면에서 false다.

그러나 실제 CSS에서 PC 폭의 html:not(.design-edit-page) .common-display-pc 규칙은 .common-display-mo의 PC 숨김 규칙보다 뒤에 선언되어 있고 specificity·important 조건이 같다. 따라서 같은 요소에 둘 다 있으면 PC의 display:block이 이겨 결과는 PC 전용이다. 서로 다른 조상·자손에 각각 붙은 경우와 동일 요소에 동시에 붙은 경우를 구별해야 한다. 알려진 992~1023px 경계 차이로 인한 지적이 아니며 1100px에서 확인했다.

## 호스트 표시 함수 추가 대조 — 직접 실행

3단계(부모·중간 상자·내용 요소) 각각에 클래스 없음 / pc / mo / pc+mo 네 상태를 넣은 64개 조합을 만들었다. core hostVisibilityOf와 Chromium의 host-style.css 표시를 360/800/1100px에서 비교했다.

- 총 192건 중 173건 일치, 19건 불일치.
- 19건 모두 PC 폭에서 같은 요소에 두 클래스가 있는 경우다. 실제 CSS는 표시하지만 함수는 숨김으로 계산한다.
- 두 클래스를 동일 요소에 함께 두지 않은 단독·조상 중첩 조합에서는 불일치가 없었다.
- 이는 I-1의 같은 원인을 여러 조합으로 확인한 것이며 19개 별도 결함으로 세지 않는다.

## 실제 페이지·회귀 대조 — 직접 실행

- 실제 703개 파일을 bd084d0와 현재 코드로 각각 변환해 파일 상태와 섹션 type/fallback을 대조했다. 변화 0개. success 320 / partial 368 / failed 15 유지.
- 순서 사유 fallback 9개 고정 목록 테스트도 통과했다. 이번 최소 입력의 오탐은 해당 실제 페이지 표본 밖의 사례다.
- 기존 28타입 × 4변형(공백·이미지 없음·인라인 서식·문단 블록) 총 112개 입력은 전부 fallback 0이며 이전 HTML과 byte 단위로 같다.
- 원본 Bootstrap 버전 미확인이라는 기존 한계는 남는다. 이번 I-1의 출력 판단은 버전을 알고 있는 로컬 host-style.css의 실제 선언을 근거로 한다.
- Chromium 비교에는 보유한 [Bootstrap 4.6.2 배포 CSS](https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css), reference/cms-original/css/cms.css, reference/host-style.css를 사용했다. 실사이트 전체 CSS를 새로 확보한 비교가 아니다.

## 실행 결과

다음 명령을 7407636에서 직접 실행했고 모두 종료 코드 0이었다.

| 명령 | 결과 |
|---|---|
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm test` | 33 files / 907 tests passed, 실패·건너뜀 0 |
| `npm run lint` | 오류 없음 |
| `npm run typecheck` | 오류 없음 |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm run test:browser` | 4 files / 192 tests passed, 실패·건너뜀 0 (전체 테스트와 중복되는 별도 실행) |
| `npm run convert -- --all` | 703 / success 320 / partial 368 / failed 15 |
| 추가 직접 검사 | 이전 숨김 글 입력, 새 오탐·대조 입력, 호스트 표시 조합 192건 |

임시 실행 스크립트·브라우저 기록은 /tmp에만 두고 커밋하지 않았다. 자동 테스트 통과와 위 검수 지적을 구분한다. 아래는 이전 원문 보관이며 현재 판정 건수는 위 표만 적용한다.

<details>
<summary>이전 검수 원문 — 9f452dc 및 그 이전 기록</summary>

# 실제 원본·703페이지 11차 재검수 — 9f452dc

- 검수일: 2026-11-17 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `9f452dc`, 범위: `4877115..9f452dc`.
- 기준: `docs/review-real-pages-fixes.md` 마지막 장 및 `docs/review-request-real-pages.md` 18장.
- 실행 전 `cp -r reference/cms-original/. cms/`로 로컬 복사본을 준비했다. cms/는 gitignore 대상이며 커밋하지 않는다. 코드·테스트·원본 자료는 수정하지 않았고 이번 변경은 이 문서뿐이다.

## 판정

**수정 후 재확인 필요.** 이전의 구간 상쇄 오탐은 해결됐다. 구간별 조상 합성 자체도 추가 브라우저 대조에서 일치했다. 다만 출력 서식에 남은 Bootstrap 표시 클래스를 검사에서는 유효한 것으로 보지만 실제 미리보기 CSS에는 그 규칙이 없어, 숨긴 글이 나타나도 success가 되는 잔여 사례를 확인했다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 이번 범위에서 확정한 항목 없음 |
| Important | 1 | I-1 출력에 없는 Bootstrap 표시 규칙을 가정해 숨긴 서식 글 노출을 놓침 |
| Minor | 0 | 별도 확정 항목 없음 |

I-1은 **추가 최소 입력**이다. 실제 703페이지에서 발생했다고 주장하지 않는다. 이전 기준 4877115에서도 같은 입력이 success여서 새 회귀로 집계하지 않는다. 이번에 바뀐 화면별 순서 비교가 실제 출력의 보임까지 검증하는지 대조해 찾은 잔여 사례다. 원본의 Bootstrap 표시 계산과 출력 CSS의 지원 범위를 구분한다.

## 이전 오탐 수정 확인 — 직접 실행

- 이전 입력: 부모 `d-block d-sm-none d-lg-block`, 이미지 `d-none d-sm-block`.
- 현재 success·무경고·fallback 0, only=pc. `visibilityOf` 결과도 모바일 false / 태블릿 false / PC true다. 부모·자식의 서로 반대인 모바일 구간 숨김이 이제 올바르게 합쳐진다.
- 반대 방향 대조: 부모 `d-block d-xl-none`, 이미지 `d-block d-lg-none d-xl-block`은 success·fallback 0, only=mo다.
- 합친 뒤에도 모바일 구간 변화가 남는 `d-block d-sm-none d-md-block` 입력은 계속 LOSSY_PARSE·fallback으로 보존된다.
- 과거 mig-* 역할 경계 위장 입력은 계속 fallback이며, Bootstrap 4에 없는 d-lg-grid를 d-none 위에 붙인 입력도 원본 보존된다.

**구간 합성 추가 대조 — 직접 실행:** 부모·중간 상자·이미지의 3단계 Bootstrap 표시 조합 96개를 고정 seed로 만들었다. 아홉 display 값과 다섯 breakpoint에서 클래스 3개씩을 선택하고, core의 spansOf 결과와 Chromium에서 실제 이미지가 표시되는지를 360/600/800/1100/1300px에서 대조했다. **480건 모두 일치, 불일치 0**이었다. 이는 Bootstrap 4 규칙의 구간별 조상 합성이 해당 표본에서 맞음을 보여 주며, 모든 입력이나 출력 CSS가 검증됐다는 뜻은 아니다.

## Important

### I-1. 출력 서식의 d-none을 실제로 숨길 CSS가 없는데 검사만 Bootstrap 규칙을 적용해 숨긴 글 노출을 통과

**위치:** `packages/core/src/convert/convert-document.ts:234`~`:235`, `:355`~`:359` (원본·출력 모두 visibilityOf로 표시 판단); `packages/core/src/html/rich-text.ts:121`~`:127` (d-* 클래스를 서식에 보존); `apps/web/src/render.ts:15`~`:16` (미리보기 문서에 host-style.css만 제공).

**재현 입력 — 직접 실행:** 아래 전체 입력을 convertDocument에 전달했다.

```html
<div class="cms-container">
  <section class="cms type23"><div class="cms-inner">
    <div class="cms-description-box"><p class="cms-description">BEFORE<span class="d-none">HIDDEN</span>AFTER</p></div>
  </div></section>
</div>
```

span의 class만 `d-none d-lg-block`으로 바꾼 입력도 별도로 실행했다.

**실제:** 두 입력 모두 success, diagnostics `[]`, fallback 0. 출력은 원본 클래스를 그대로 담은 다음 서식이다.

```html
<p class="mig-desc">BEFORE<span class="d-none">HIDDEN</span>AFTER</p>
```

PC 전용 변형도 `<span class="d-none d-lg-block">HIDDEN</span>`을 그대로 출력한다. 현재 미리보기는 host-style.css만 넣으며, 이 스타일에는 Bootstrap의 .d-none / .d-lg-block 표시 유틸리티 정의가 없다. 따라서 실제 출력에서는 span이 inline으로 표시된다.

**Chromium — 직접 실행:** 원본에는 Bootstrap 4.6.2 + cms.css, 출력에는 미리보기와 같은 스타일 소스인 host-style.css를 제공했다. DOM innerText와 computed display 및 실제 표시 여부를 확인했다.

| 입력 span class | 폭 | 원본의 HIDDEN | 출력의 HIDDEN |
|---|---:|---|---|
| d-none | 360 / 800 / 1100px | 숨김(display:none) | 표시(display:inline) |
| d-none d-lg-block | 360 / 800px | 숨김(display:none) | 표시(display:inline) |
| d-none d-lg-block | 1100px | 표시(display:block) | 표시(display:inline) |

숨겨야 하는 폭에서 원본 body.innerText는 `BEFOREAFTER`, 출력은 `BEFOREHIDDENAFTER`다. 실제 미리보기와 같은 CSS 조건에서 보이지 않던 글이 나타난 것이다. 1100px의 PC 전용 변형은 원본에서 줄도 나뉘지만, 이 항목은 우선 명확한 숨김 손실을 근거로 집계했다.

**기대:** 출력에서도 서식 글의 표시 범위를 실제로 보존하거나, 지원하지 못하면 원본을 보존하고 사유를 남겨야 한다. 출력에 원본 Bootstrap CSS가 없는데 있다고 가정해 동등하다고 판정해서는 안 된다. 출력 형식에 맞게 표시 조건을 옮기는 방법과 현재 후보를 거부하는 방법은 구현에서 선택할 수 있다.

**원인 — 정적 판독:** 입력의 Bootstrap 클래스는 rich-text의 허용 class로 남는다. textOrderDiffers는 원본과 출력 양쪽을 같은 segments → visibilityOf 경로로 읽으므로, 출력의 d-none도 Bootstrap 규칙대로 숨는다고 간주한다. 이에 따라 원본·출력의 숨긴 글을 비교에서 모두 빼고 통과한다. 그러나 렌더링 환경에 해당 CSS가 없어서 출력의 실제 글은 숨지 않는다. 이미지의 common-display-* 변환과 달리, 이 서식 span에는 호스트 표시 규칙으로 옮기는 단계가 없다.

**범위 구분:** 출력 노출 자체는 이번 변경에서 새로 생긴 것이 아니다. 현재 수정한 구간 합성 계산이 맞더라도, ‘출력에서도 동일 클래스가 동일한 CSS 의미를 가진다’는 전제가 틀리면 실제 보임 비교가 성립하지 않는다는 사례다. 원본 Bootstrap 버전이 미확인이라는 한계와 별개로, 프로젝트 미리보기의 CSS 공급 방식은 코드에서 확인된다. 실제 외부 호스트의 모든 추가 CSS에 대한 주장으로 확장하지 않는다.

## 실제 페이지·기존 입력 대조 — 직접 실행

- 703개 파일을 4877115와 현재 코드로 각각 변환해 파일 상태와 섹션 type/fallback을 대조했다. 변화 0개. success 320 / partial 368 / failed 15 유지.
- 순서 사유 fallback 9개 고정 목록 테스트도 통과했다. 이번 최소 입력의 문제가 실제 703페이지에서 발생했다고 집계하지 않았다.
- 기존 28타입 × 4변형(공백·이미지 없음·인라인 서식·문단 블록) 총 112개 입력은 전부 fallback 0이며 이전 HTML과 byte 단위로 같다.
- 구간별 표시 합성 96개 조합/480건 대조는 원본 Bootstrap 4 계산 검증이다. 출력 CSS의 실제 지원 범위는 별도로 검사해 위 I-1을 찾았다.
- 비교 CSS는 보유한 [Bootstrap 4.6.2 배포 CSS](https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css), reference/cms-original/css/cms.css, reference/host-style.css다. 원본 실사이트 Bootstrap 파일의 버전을 새로 확인한 것은 아니다.
- type01의 원본 제목 위치 및 과거 검사 예외 제거는 유지되고 관련 기존 테스트가 통과했다. 알려진 992~1023px 호스트 경계 차이는 이번 지적으로 세지 않았다.

## 실행 결과

다음 명령을 9f452dc에서 직접 실행했고 모두 종료 코드 0이었다.

| 명령 | 결과 |
|---|---|
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm test` | 33 files / 902 tests passed, 실패·건너뜀 0 |
| `npm run lint` | 오류 없음 |
| `npm run typecheck` | 오류 없음 |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm run test:browser` | 4 files / 192 tests passed, 실패·건너뜀 0 (전체 테스트와 중복되는 별도 실행) |
| `npm run convert -- --all` | 703 / success 320 / partial 368 / failed 15 |
| 추가 직접 검사 | 이전 오탐·반대 방향 대조, 480건 표시 합성 대조, 서식 글 노출 Chromium 재현 |

임시 실행 스크립트·브라우저 기록은 /tmp에만 두고 커밋하지 않았다. 자동 테스트 통과와 위 검수 지적을 구분한다. 아래는 이전 원문 보관이며 현재 판정 건수는 위 표만 적용한다.

<details>
<summary>이전 검수 원문 — 83e2737 및 그 이전 기록</summary>

# 실제 원본·703페이지 10차 재검수 — 83e2737

- 검수일: 2026-11-17 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `83e2737`, 범위: `684c505..83e2737`.
- 기준: `docs/review-real-pages-fixes.md` 마지막 장 및 `docs/review-request-real-pages.md` 17장.
- 실행 전 `cp -r reference/cms-original/. cms/`로 로컬 복사본을 준비했다. cms/는 gitignore 대상으로 커밋하지 않는다. 코드·테스트·원본 자료는 수정하지 않았고 이번 변경은 이 문서뿐이다.

## 판정

**수정 후 재확인 필요.** 이전 세 재현 입력은 해결됐다. 다만 부모와 자식이 서로 반대 구간에서 숨는 경우, 실제로는 일정한 PC 전용 표시인데도 mixed로 판단해 원본 보존하는 잔여 오탐을 확인했다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 이번 범위에서 확정한 항목 없음 |
| Important | 1 | I-1 구간별 표시를 조합하기 전에 mixed로 요약해 실제로 상쇄되는 숨김을 놓침 |
| Minor | 0 | 별도 확정 항목 없음 |

I-1은 **추가 최소 입력**이며 실제 703페이지에서 새로 발생한 결함으로 집계하지 않는다. 같은 입력은 이전 기준에서도 fallback이어서 새 회귀라고 주장하지 않는다. 이번 요청의 ‘조상까지 합친 실제 표시’가 놓치는 잔여 사례다.

## 이전 세 입력 수정 확인 — 직접 실행

| 이전 입력 | 83e2737 결과 |
|---|---|
| 부모 d-none d-lg-block / 자식 d-block d-sm-none d-md-block | success·무경고·fallback 0, only=pc. 부모가 모바일 전체를 숨기는 원래 오탐 해결 |
| 위 부모를 제거한 동일 자식 | 실제 모바일 구간 변화가 남으므로 LOSSY_PARSE·fallback 1 |
| 두 본문 검사·검사 → 제목 검사<em class="mig-inline-demo">검사</em> | LOSSY_PARSE·fallback 1. 입력의 mig-*가 역할 경계로 쓰이던 원래 우회 해결 |
| d-none d-lg-grid | 원본은 모든 화면에서 숨김으로 판정, only 없음, LOSSY_PARSE·fallback 1. 출력에서 원본에 없는 이미지를 표시하지 않도록 보존 |

서식 정리를 별도로 직접 호출해 span/em/strong의 mig-title, mig-inline-demo, mig-label, mig-num이 제거되는 것을 확인했다. 같은 요소의 text-point와 실제 글 `2026`은 유지된다. 예약 클래스 제거 정책을 의도된 변경으로 취급했으며, 제거 자체를 결함으로 세지 않았다.

Bootstrap 표시 값은 코드상 none·inline·inline-block·block·table·table-row·table-cell·flex·inline-flex의 아홉 값으로 제한됐다. grid·inline-grid·contents가 더 이상 Bootstrap 4 표시 규칙으로 취급되지 않는다. 원본 Bootstrap 버전 미확인은 이전 보고서의 한계로 남으며, 이번 범위에서 버전이 새로 확인된 것은 아니다.

## Important

### I-1. 부모·자식의 반대 구간 숨김을 결합하지 못해 실제 PC 전용 입력을 mixed로 거부

**위치:** `packages/core/src/parse/common.ts:120`~`:124` (요소별 mixed 요약값 합성), `packages/core/src/convert/convert-document.ts:322`~`:325`, `:336`~`:345` (mixed 판정과 내용 존재 검사).

**재현 입력 — 직접 실행:** 아래 전체 문자열을 convertDocument에 전달했다.

```html
<div class="cms-container">
  <section class="cms type23"><div class="cms-inner">
    <div class="cms-visual d-block d-sm-none d-lg-block">
      <img src="https://example.com/image.png" alt="" class="d-none d-sm-block">
    </div>
  </div></section>
</div>
```

**실제:** failed, LOSSY_PARSE, fallback 1. 사유는 부모 d-block d-sm-none d-lg-block 안의 내용이 모바일 화면에서도 폭에 따라 보였다 숨었다 한다는 것이다. 이미지에 visibilityOf를 직접 호출하면 `{mo: 'mixed', tablet: false, pc: true}`다. 그러나 원본의 실제 구간별 표시는 다음과 같다.

| 폭 구간 | 부모 | 이미지 자신 | 실제 이미지 |
|---|---|---|---|
| 0~575px | 표시 | 숨김 | 숨김 |
| 576~991px | 숨김 | 표시 | 숨김 |
| 992px 이상 | 표시 | 표시 | 표시 |

즉 이미지가 보이는 범위는 정확히 PC 전용이며, 모바일 안에서 실제 내용이 보였다 숨었다 하는 경우가 아니다.

**Chromium — 직접 실행:** 원본에 Bootstrap 4.6.2 + cms.css를 적용해 360/600/800px에서 이미지가 숨고 1100/1300px에서 표시되는 것을 확인했다.

대조 입력은 부모 class를 d-none d-lg-block, 자식 class를 d-block으로 바꾼 동일 이미지다. 이 입력은 현재 success·무경고·fallback 0, only=pc이고 출력은 common-display-pc를 쓴다. 이 **별도 정상 입력의 출력 후보**에 host-style.css를 적용했을 때 다섯 폭 모두 원본과 표시 여부·이미지 주소가 같았다. 현재 fallback 출력을 정상 출력처럼 측정한 것이 아니며, 기존 모델로 표현할 수 있는 PC 전용 내용이라는 점을 확인한 것이다.

**기대:** 부모와 자식의 조건을 각 Bootstrap 폭 구간에서 먼저 합성한 후, 최종 내용의 표시 범위를 판단해야 한다. 위 입력은 기존 only=pc로 보존할 수 있으므로 mixed 사유로 섹션 전체를 거부하지 않아야 한다. 실제 구간 변화가 남는 입력은 계속 원본 보존해야 한다.

**원인 — 정적 판독:** ownVisibility가 각 요소의 모바일 0·576 상태를 먼저 mixed 하나로 요약한다. visibilityOf는 mixed와 mixed의 관계를 모른 채 결과를 mixed로 유지한다. 부모와 자식이 각각 어느 구간에서 숨는지 정보가 이미 사라져, 실제로는 어느 모바일 구간에서도 동시에 보이지 않는다는 사실을 계산할 수 없다.

partlyShown이 부모에서 검사할 때도 hasContentIn은 자식의 모바일 ownVisibility가 false인지 여부만 보므로 mixed 자식을 ‘그 화면에 내용 있음’으로 취급한다. 이에 따라 부모·자식 조건이 동시에 참인 구간이 없다는 사실을 놓친다. 이전의 ‘부모가 그 화면 전체에서 false’인 사례는 해결됐으나 **구간끼리 상쇄되는 숨김**은 남는다. 이름상 visibilityOf를 공유하는 것만으로 구간 단위의 실제 가시성이 보장되지는 않는다.

## 실행 조건·범위 대조

**직접 실행:**

- Chromium 비교는 [Bootstrap 4.6.2 배포 CSS](https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css)와 `reference/cms-original/css/cms.css`, 출력에는 `reference/host-style.css`를 사용했다. 보유한 로컬 배포 CSS를 사용했으며 실사이트의 원본 Bootstrap 버전을 확보한 비교가 아니다.
- 외부 이미지 응답을 같은 로컬 100×80 SVG로 대체하고 360/600/800/1100/1300px에서 실제 이미지 표시 여부와 src를 측정했다. 알려진 992~1023px 호스트 경계 차이를 이 지적으로 세지 않았다.
- 실제 703개 파일을 684c505와 현재 코드로 각각 변환해 파일 상태와 섹션 type/fallback을 대조했다. 변화 0개. success 320 / partial 368 / failed 15 유지.
- 순서 사유 fallback 9개 고정 목록 테스트도 통과했다. 이번 추가 오탐은 해당 실제 페이지 표본 밖의 입력이다.
- 기존 28타입 × 4변형(공백·이미지 없음·인라인 서식·문단 블록) 총 112개 입력은 모두 fallback 0이며 이전 HTML과 byte 단위로 같다.
- 입력 클래스 정리에서 텍스트 손실이나 예약 클래스가 다시 역할 경계로 유입되는 추가 우회는 이번 검사에서 확정하지 않았다. Bootstrap 4 표시 값 아홉 개 제한에서도 이전 grid 관련 문제 외에 추가 결함을 확정하지 않았다.

## 실행 결과

다음 명령을 83e2737에서 직접 실행했고 모두 종료 코드 0이었다.

| 명령 | 결과 |
|---|---|
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm test` | 33 files / 898 tests passed, 실패·건너뜀 0 |
| `npm run lint` | 오류 없음 |
| `npm run typecheck` | 오류 없음 |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm run test:browser` | 4 files / 192 tests passed, 실패·건너뜀 0 (전체 테스트와 중복되는 별도 실행) |
| `npm run convert -- --all` | 703 / success 320 / partial 368 / failed 15 |
| 추가 최소 입력·Chromium 검사 | 위 재현·표시 대조 및 예약 클래스/텍스트 보존 확인 |

임시 실행 스크립트·브라우저 기록은 /tmp에만 두고 커밋하지 않았다. 자동 테스트 통과와 위 검수 지적을 구분한다. 아래는 이전 원문 보관이며 현재 판정 건수는 위 표만 적용한다.

<details>
<summary>이전 검수 원문 — bd8d1c2 및 그 이전 기록</summary>

# 실제 원본·703페이지 9차 재검수 — bd8d1c2

- 검수일: 2026-11-17 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `bd8d1c2`, 범위: `00f2827..bd8d1c2`.
- 기준: `docs/review-real-pages-fixes.md` 마지막 장 및 `docs/review-request-real-pages.md` 16장.
- 실행 전 `cp -r reference/cms-original/. cms/`로 로컬 복사본을 준비했다. cms/는 gitignore 대상이며 커밋하지 않는다. 코드·테스트·원본 자료는 수정하지 않았고 이번 변경은 이 문서뿐이다.

## 판정

**수정 후 재확인 필요.** 이전 세 입력은 해결됐다. 다만 조상에 가려진 mixed 자식 때문에 정상 PC 전용 이미지를 거부하는 새 오탐, 임의 mig-* 클래스에 의한 역할 역전 누락, 선택한 Bootstrap 4 모델에 없는 표시 유틸리티의 잘못된 적용을 재현했다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 이번 범위에서 확정한 항목 없음 |
| Important | 3 | I-1 가려진 mixed 오탐, I-2 입력 클래스의 역할 경계 위장, I-3 Bootstrap 4에 없는 유틸리티 적용 |
| Minor | 0 | 별도 확정 항목 없음 |

세 건은 **추가 최소 입력**이다. 실제 703페이지에 같은 결함이 발생했다고 주장하지 않는다. I-1은 00f2827에서 정상 변환하던 입력의 새 회귀다. I-2·I-3은 이번 규칙의 잔여 문제이며, 이전 기준에서도 존재했다. 알려진 992~1023px 호스트 경계 차이는 지적하지 않았다.

## 이전 입력 재확인 — 직접 실행

| 이전 입력 | bd8d1c2 결과 |
|---|---|
| d-block d-xl-none | 구간별 표시 차이 사유로 LOSSY_PARSE·fallback 1 |
| d-block d-sm-none d-md-block | 구간별 표시 차이 사유로 LOSSY_PARSE·fallback 1 |
| d-block d-none / d-none d-block | 둘 다 success·무경고·fallback 0, only 없음 |
| d-none d-lg-block d-lg-none / d-none d-lg-none d-lg-block | 둘 다 success·무경고·fallback 0, only=pc |
| 두 본문 검사·검사 다음 제목 검사<em>검사</em> | LOSSY_PARSE·fallback 1. em 경계만으로 통과하던 원래 입력 해결 |

기존 28타입 × 4변형(공백·이미지 없음·인라인 서식·문단 블록) 총 112개 입력도 전부 fallback 0이며, 00f2827과 출력 HTML이 byte 단위로 같다.

## Important

### I-1. 부모가 모바일 전체에서 숨는 정상 PC 전용 입력을 자식 자신의 mixed만 보고 fallback

**위치:** `packages/core/src/convert/convert-document.ts:314`~`:327`, 특히 ownVisibility만 쓰는 `:319`~`:321`. 대비되는 조상 합성 함수는 `packages/core/src/parse/common.ts`의 visibilityOf다.

**재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type23"><div class="cms-inner">
    <div class="cms-visual d-none d-lg-block">
      <img src="https://example.com/image.png" alt=""
           class="d-block d-sm-none d-md-block">
    </div>
  </div></section>
</div>
```

**실제:** 현재 failed·LOSSY_PARSE·fallback 1. 사유는 모바일 화면 안에서 d-block d-sm-none d-md-block이 폭에 따라 보였다 숨었다 한다는 것이다. 00f2827의 동일 입력은 success·무경고·fallback 0이며 only=pc로 출력된다.

**Chromium — 직접 실행:** 원본에 Bootstrap 4.6.2 + cms.css, 이전 정상 출력에 host-style.css를 적용했다. 360/600/800px에서 원본·이전 출력 모두 숨김, 1100/1300px에서 양쪽 모두 표시였다. 현재 fallback을 정상 출력처럼 비교한 것이 아니라 **이미 존재하는 PC 전용 출력 후보와 원본이 동등함**을 대조했다. 부모가 모바일·태블릿 전체를 숨기므로 자식의 sm 변화는 실제 화면에 나타나지 않는다.

**기대:** 조상까지 합친 실제 표시가 PC 전용으로 일정하면 정상 변환해야 한다. 부모 d-none d-lg-block을 제거한 별도 대조 입력은 실제 mixed이므로 fallback이 맞으며 현재도 그렇게 동작한다.

**원인 — 정적 판독:** pairImages는 visibilityOf로 부모 숨김을 합쳐 올바른 only=pc 후보를 만들 수 있다. 그러나 새 partlyShown은 각 요소 자신의 mixed만 보고 검사하며, 조상에 의해 해당 화면에서 계속 숨는지 보지 않는다. segments가 조상 숨김을 반영하더라도 그 비교 전에 partlyShown이 섹션을 거부한다. 서로 다른 표시 판정 경로의 결과가 어긋나는 경우다.

### I-2. 입력에서 보존된 임의 mig-* 클래스가 실제 호스트 역할인 것처럼 합치기 경계가 됨

**위치:** `packages/core/src/convert/convert-document.ts:259`의 separates; 원본의 임의 class를 보존하는 경로는 `packages/core/src/html/rich-text.ts:121`~`:125`다.

**재현 입력 — 직접 실행:** 지난 em 입력에 CSS 규칙이 없는 클래스 하나만 추가했다.

```html
<div class="cms-container">
  <section class="cms type10"><div class="cms-inner">
    <ol class="cms-figure-list"><li class="cms-list-item">
      <div class="cms-description-box">
        <p class="cms-description">검사</p>
        <p class="cms-description">검사</p>
      </div>
      <div class="cms-figure-text">
        <p class="cms-title">검사<em class="mig-inline-demo">검사</em></p>
      </div>
    </li></ol>
  </div></section>
</div>
```

**실제:** success, diagnostics `[]`, fallback 0. 원본의 본문 두 문단 → 제목이 출력에서 제목 → 검사<br>검사 본문으로 역전된다. 같은 입력에서 mig-inline-demo 클래스를 빼면 이번 수정대로 fallback이다.

**Chromium — 직접 실행:** 1100px 원본은 본문 y=50/98 다음 제목 y=128, 출력은 제목 y=65 다음 본문 y=123이다. 360/600/800/1300px에서도 같은 역전이다. em의 computed display는 원본·출력 모두 inline이고, 보유 cms.css·host-style.css에는 mig-inline-demo 규칙이 없다. 실제 줄 구분이 생긴 것이 아니다.

**기대:** 렌더러가 생성한 호스트 역할 경계와 입력에서 온 임의 서식 클래스를 구분해야 한다. 이름이 mig-로 시작한다는 이유만으로 본문 두 문단을 한 줄 제목과 대응시키면 안 된다. 임의 클래스를 입력에서 전부 금지한다는 계약도 현재 없으며, 서식 sanitizer는 이 클래스를 그대로 보존한다.

**원인 — 정적 판독:** separates는 실제 역할·CSS 표시·생성 출처와 관계없이 c.startsWith('mig-')면 true다. 따라서 원본 em에 보존된 클래스도 soft 경계를 만들고, matcher는 앞의 두 본문을 출력 제목에 합쳐 대응시킨다. ‘호스트 역할 클래스만 허용’이라는 취지와 단순 접두사 검사가 일치하지 않는다.

### I-3. Bootstrap 4 모델이라고 하면서 실제 Bootstrap 4에 없는 d-lg-grid를 표시 규칙으로 적용

**위치:** `packages/core/src/parse/common.ts:84`~`:85`의 D_ORDER/D_CLASS. grid·inline-grid·contents가 Bootstrap 4 유틸리티 값과 함께 들어 있다.

**재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type23"><div class="cms-inner"><div class="cms-visual">
    <img src="https://example.com/image.png" alt="" class="d-none d-lg-grid">
  </div></div></section>
</div>
```

**실제:** success, diagnostics `[]`, fallback 0, 모델 only=pc. 출력은 PC에서 이미지를 표시한다. Chromium에 Bootstrap 4.6.2를 적용한 원본은 d-none 때문에 1100/1300px에서도 숨김이지만 출력은 표시된다. 360/600/800px에서는 양쪽 모두 숨김이다.

**기대:** Bootstrap 4로 계산한다면 그 버전에 실제 존재하는 유틸리티와 CSS 선언 순서만 적용해야 한다. 원본 스타일 정의가 없는 클래스가 d-none을 덮어쓰는 것처럼 계산돼서는 안 된다. 사용자 정의 grid 유틸리티를 지원할 계획이라면 그 규칙의 출처와 버전을 별도로 확인해야 한다.

**원인 — 정적 판독·배포 CSS 대조:** Bootstrap 4.6.2에는 .d-lg-grid, .d-lg-inline-grid, .d-lg-contents가 없다. 현재 D_ORDER의 앞부분 none → inline → inline-block → block → table → table-row → table-cell → flex → inline-flex 순서는 배포 CSS와 일치하지만, 뒤에 덧붙인 세 값은 그 CSS에 존재하지 않는다. 코드가 가상의 d-lg-grid 규칙을 PC 표시로 적용하고 only와 순서 검사도 같은 가정을 써서 무경고로 통과한다.

이 항목은 **선택한 Bootstrap 4 가정 아래에서 확정한 불일치**이며, 원본 실사이트의 CSS가 실제로 이 클래스를 정의하는지까지 확인했다는 주장은 아니다. Bootstrap 버전 미확인 자체와 별도로, 현재 명시한 기준과 구현의 일관성을 지적한다.

## Bootstrap 4 가정에 대한 판단

**정적 판독:** 원본 header는 /FlexX/cms/Module/resources/css/bootstrap.css를 참조하지만 파일 자체나 버전은 보유 자료에 없다. 실제 페이지의 d-lg/d-xl, col-lg, data-toggle="collapse"·data-target 같은 사용은 Bootstrap 4 선택을 뒷받침하는 정황이다. 예를 들어 `13280/0301_소아예방접종.html`의 Q&A 버튼에 data-toggle가 있다. 다만 사용 중인 클래스의 최대가 xl이라는 사실만으로 Bootstrap 5나 커스텀 빌드를 배제할 수는 없다.

**직접 확인:** 기준으로 사용한 [Bootstrap 4.6.2 배포 CSS](https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css)의 실제 선언 순서는 현재 D_ORDER의 표준 아홉 값과 일치한다. 따라서 **Bootstrap 4를 전제로 한 동일 폭 우선순위 수정은 타당**하다. 이전 Codex가 4.6.2로 대조했다는 사실은 원본 버전에 대한 독립 증거가 아니다.

원본 CSS 확보도 시도했지만 `https://fxfile.drline.net/FlexX/cms/Module/resources/css/bootstrap.css` 요청이 403 오류로 실패했다. 원본이 4.6.2라고 확정하지 않는다. 보고서에서는 잠정 기준과 원본 검증을 구분하며, 버전 미확인 자체를 별도 결함 건수에 더하지 않았다. I-3의 미지원 값까지 Bootstrap 4 유틸리티로 받아들이는 것은 그 가정으로 정당화되지 않는다.

## 실행 조건·실제 페이지 대조

**직접 실행:**

- Chromium 원본에는 Bootstrap 4.6.2 + reference/cms-original/css/cms.css, 출력에는 reference/host-style.css를 적용했다. 실사이트 전체 CSS를 확보한 비교가 아니다. 외부 이미지는 동일한 로컬 100×80 SVG로 응답하고 360/600/800/1100/1300px에서 표시·글 위치를 측정했다.
- 703개 파일을 00f2827과 현재 코드로 각각 변환해 파일 상태 및 섹션 type/fallback을 대조했다. 변화 0개. success 320 / partial 368 / failed 15 유지.
- 순서 사유 fallback 9개 고정 목록 테스트도 통과했다. 이번 새 오탐 I-1은 이 703페이지 표본 밖의 입력이다.
- 위 112개 정상 변형 입력 모두 이전 HTML과 같으며, 기존 type01 원본 순서 복원·서식 문단·머리글 합침 검사도 통과했다.
- 임시 재현 스크립트·브라우저 기록은 /tmp에만 두고 커밋하지 않았다. 아래는 검수 당시 코드에서 직접 실행한 결과다.

| 명령 | 결과 |
|---|---|
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm test` | 33 files / 890 tests passed, 실패·건너뜀 0 |
| `npm run lint` | 오류 없음 |
| `npm run typecheck` | 오류 없음 |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm run test:browser` | 4 files / 192 tests passed, 실패·건너뜀 0 (전체 테스트와 중복되는 별도 실행) |
| `npm run convert -- --all` | 703 / success 320 / partial 368 / failed 15 |
| 추가 최소 입력·Chromium 검사 | 위 재현 및 대조 입력 확인 |

명령은 모두 종료 코드 0이었다. 자동 테스트 통과와 위 세 검수 지적을 구분한다. 아래는 이전 원문 보관이며 현재 판정 건수는 위 표만 적용한다.

<details>
<summary>이전 검수 원문 — 4014df5 및 그 이전 기록</summary>

# 실제 원본·703페이지 8차 재검수 — 4014df5

- 검수일: 2026-11-17 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `4014df5`, 범위: `5f2b966..4014df5`.
- 기준: `docs/review-real-pages-fixes.md` 마지막 장 및 `docs/review-request-real-pages.md` 15장.
- 실행 전 `cp -r reference/cms-original/. cms/`로 로컬 복사본을 준비했다. cms/는 gitignore 대상으로 커밋하지 않는다. 코드·테스트·원본 자료는 수정하지 않았고 이번 변경은 이 문서뿐이다.

## 판정

**수정 후 재확인 필요.** 지난 보고서의 원래 입력들은 해결됐다. 다만 세 대표 폭 사이의 표시 변화 누락, 같은 breakpoint에서의 잘못된 클래스 우선순위, 인라인 서식 경계를 이용한 역할 역전 누락을 추가 입력으로 재현했다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 이번 범위에서 확정한 항목 없음 |
| Important | 3 | I-1 sm/xl 표시 구간 누락, I-2 같은 breakpoint의 클래스 우선순위 오탐, I-3 인라인 서식 경계로 역할 역전 통과 |
| Minor | 0 | 별도 확정 항목 없음 |

세 항목은 **추가 최소 입력**이다. 실제 703페이지에서 같은 결함이 발생했다고 주장하지 않는다. 알려진 원본 992px / 호스트 1024px 경계 차이는 지적하지 않았다. I-1은 그 구간 밖인 600px·1300px에서 확인했다.

## 이전 입력 수정 확인 — 직접 실행

| 이전 입력 | 현재 결과 |
|---|---|
| type23 이미지 d-lg-block 단독 | success·무경고·fallback 0, only 없음. 360/600/800/1100/1300px에서 원본·출력 모두 표시 |
| type23 이미지 d-none d-lg-inline-block | success·무경고·fallback 0, only=pc. 360/600/800px 숨김, 1100/1300px 표시 |
| type23 이미지 d-none d-md-block d-lg-none | LOSSY_PARSE·fallback 1. 태블릿 전용을 무경고로 다른 폭에 표시하지 않음 |
| type10 두 본문 검사·검사 다음 서식 없는 제목 검사검사 | LOSSY_PARSE·fallback 1. 구분 없는 제목에 두 본문을 대응시키던 원래 입력 해결 |
| 이전 독립 이미지 역전 / 서로 다른 링크 PC·MO 대안 | 전자는 fallback, 후자는 success·무경고·fallback 0 유지 |

번호 목록, type01 원본 제목 위치, 이전 링크 비교 표시 충돌 등의 기존 검사는 전체 테스트에 포함되어 통과했다. 아래 재현 입력과 해당 원래 입력을 구분한다.

## 브라우저 비교 조건

직접 실행한 Chromium 비교에는 원본 `reference/cms-original/css/cms.css`와 [Bootstrap 4.6.2 배포 CSS](https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css)를 함께 적용했다. 출력에는 `reference/host-style.css`를 적용했다. 원본 header도 Bootstrap CSS를 참조하지만 저장소에는 해당 실사이트 파일의 버전 확정 자료가 없으므로, **실사이트 전체 CSS를 확보한 비교가 아닌 Bootstrap 규칙의 명시적 대조 환경**이다. 다운로드한 CSS·실행 스크립트는 /tmp에만 두었다.

외부 이미지 응답은 동일한 로컬 100×80 SVG로 대체했다. 폭은 360·600·800·1100·1300px이며 DOM의 실제 표시 여부·display·글 요소 위치를 측정했다. fallback인 출력은 정상 출력인 것처럼 비교하지 않았다.

## Important

### I-1. 대표 폭 0·800·1100만 검사해 sm/xl 구간의 실제 표시 변경을 누락

**위치:** `packages/core/src/parse/common.ts:75`~`:77`, `:90`~`:94`; 이 결과로 only를 정하는 pairImages와 같은 판정을 쓰는 segments 경로.

**재현 입력 — 직접 실행:** 아래 전체 입력을 convertDocument에 전달했다.

```html
<div class="cms-container">
  <section class="cms type23"><div class="cms-inner"><div class="cms-visual">
    <img src="https://example.com/image.png" alt="" class="d-block d-xl-none">
  </div></div></section>
</div>
```

이미지 class만 `d-block d-sm-none d-md-block`으로 바꾼 입력도 실행했다.

**실제:** 두 입력 모두 success, diagnostics `[]`, fallback 0, only 없음. 출력에는 원본의 표시 구간이 남지 않고 이미지가 모든 폭에 표시된다.

| 입력 class | Chromium 확인 폭 | 원본 | 출력 |
|---|---:|---|---|
| d-block d-xl-none | 1300px | display:none | 표시 |
| d-block d-sm-none d-md-block | 600px | display:none | 표시 |

원본은 첫 입력에서 1200px 이상, 두 번째 입력에서 576~767px만 숨긴다. 이 구간은 새 모바일/태블릿/PC 세 분류 안에 실제로 존재하지만, 각 분류의 대표 폭에서는 모두 보이는 것으로 나온다.

**기대:** 지원하는 breakpoint의 표시 변화가 출력 모델로 표현되지 않으면 적어도 그 변화를 검출해 원본을 보존해야 한다. 대표 폭 밖에서 원본이 숨긴 이미지가 나타나는데 무경고 success가 되어서는 안 된다.

**원인 — 정적 판독:** BREAKPOINT에는 sm=576, xl=1200이 있지만 ownVisibility는 mo=0, tablet=800, pc=1100에서만 규칙을 평가한다. sm의 중간 숨김과 xl 이후 숨김이 결과 세 값에 들어가지 않는다. only와 순서 검사 모두 같은 축약 결과를 쓰므로 두 경로가 동시에 손실을 놓친다. 세 화면 비교를 도입한 것만으로 그 화면 범위 안의 모든 Bootstrap 표시 상태가 검증되는 것은 아니다.

### I-2. 같은 breakpoint의 표시 우선순위를 CSS 선언 순서 대신 HTML 클래스 나열 순서로 결정해 정상 입력을 fallback

**위치:** `packages/core/src/parse/common.ts:86`~`:92`.

**재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type23"><div class="cms-inner"><div class="cms-visual">
    <img src="https://example.com/image.png" alt="" class="d-block d-none">
  </div></div></section>
</div>
```

대조 입력은 class 토큰 순서만 바꾼 `d-none d-block`이다. 별도로 `d-none d-lg-block d-lg-none`와 `d-none d-lg-none d-lg-block`도 대조했다.

**실제 — 직접 실행:**

| 원본 class | 변환 결과 |
|---|---|
| d-block d-none | failed·LOSSY_PARSE·fallback 1 |
| d-none d-block | success·무경고·fallback 0 |
| d-none d-lg-block d-lg-none | failed·LOSSY_PARSE·fallback 1 |
| d-none d-lg-none d-lg-block | success·무경고·fallback 0 |

fallback 사유는 원본에 없는 이미지가 출력에 있다는 것이다. Chromium의 Bootstrap 4.6.2 원본은 첫 입력이 전 폭에서 block, 세 번째 입력이 1100/1300px에서 block이다. Bootstrap CSS에서 같은 specificity의 block 규칙이 none 규칙보다 나중에 선언되므로, HTML class 토큰을 나열한 순서와 무관하게 같은 결과여야 한다.

**기대:** CSS 표시 결과가 같은 두 입력은 같은 표시 판정·변환 결과가 되어야 한다. 클래스 순서만으로 정상 원본이 손실 위험 입력으로 바뀌어서는 안 된다. 상충하는 표시 이름이 있더라도 HTML이 무효인 것은 아니며 CSS가 승자를 결정한다.

**원인 — 정적 판독:** classes.map으로 HTML 토큰 순서를 유지한 뒤 at 값으로만 정렬하고 마지막 규칙을 선택한다. breakpoint가 같은 규칙 사이에는 CSS 선언 순위가 없어서, 입력 문자열 뒤쪽 토큰이 승자가 된다. 이는 I-1의 대표 폭 누락과 별개의 우선순위 계산 문제다.

### I-3. 줄을 나누지 않는 em 서식 경계 하나로 제목·본문 역전이 다시 통과

**위치:** `packages/core/src/convert/convert-document.ts:247`~`:251` (모든 인라인 요소 경계를 soft 자리로 기록), `:292`~`:296` (그 자리에서 원본 덩어리 합침 허용); 실제 재배치는 `packages/core/src/types/type10.ts:85`~`:87`.

**재현 입력 — 직접 실행:** 지난 입력의 제목 두 번째 단어에 em만 추가했다.

```html
<div class="cms-container">
  <section class="cms type10"><div class="cms-inner">
    <ol class="cms-figure-list"><li class="cms-list-item">
      <div class="cms-description-box">
        <p class="cms-description">검사</p>
        <p class="cms-description">검사</p>
      </div>
      <div class="cms-figure-text"><p class="cms-title">검사<em>검사</em></p></div>
    </li></ol>
  </div></section>
</div>
```

**실제:** success, diagnostics `[]`, fallback 0. 원본 `본문 검사 → 본문 검사 → 제목 검사검사`가 출력 `strong.mig-title 검사<em>검사</em> → p.mig-desc 검사<br>검사`로 바뀐다. em을 제거한 원래 입력은 이번 수정대로 fallback 1이다.

**Chromium — 직접 실행:** 1100px에서 원본 본문 둘 y=50/98 다음 제목 y=128, 출력은 제목 y=65 다음 본문 y=123이다. 360/600/800/1300px에서도 같은 역할 역전이다. em은 글자 서식만 바꾸며 제목을 두 줄이나 두 문단으로 나누지 않는다. 출력 본문은 실제 br로 두 줄이다.

**기대:** 정상 머리글 span+strong 합침이나 본문 br 합침을 허용하더라도, 제목 안 임의 서식 경계가 본문 두 문단을 제목과 대응시키는 근거가 되어서는 안 된다. 역할·출처를 보존해 비교하거나 이처럼 모호한 대응은 원본을 보존해야 한다.

**원인 — 정적 판독:** 제목의 em 시작 위치가 글자 오프셋 2의 soft가 된다. matcher는 원본 본문 `[검사, 검사]`를 이 경계에서 합쳐 출력 제목과 대응시키고, 남은 원본 제목을 출력 본문과 대응시킨다. 글자·링크 값은 같아 통과한다. **구분 자리에 한정한다는 새 규칙 자체는 충족하지만**, 시각적 줄 구분이나 글 역할을 보장하지 않는 인라인 서식 경계까지 같은 근거로 사용해 실제 역전을 놓친다. 원래 입력은 해결됐으나 의미 있는 분리와 단순 서식의 차이가 남는다.

## 실제 페이지·기존 입력 대조 — 직접 실행

- 703개 파일을 5f2b966과 현재 코드 양쪽으로 변환해 파일 상태와 섹션 type/fallback을 대조했다. 변화 0개. success 320 / partial 368 / failed 15 유지.
- 순서 사유 fallback 9개 고정 목록 검사도 통과했다. 새 정상 원본이 이 703페이지에서 추가로 fallback된 사례는 없다.
- 기존 28타입 × 4변형(공백·이미지 없음·인라인 서식·문단 블록) 총 112개 입력은 모두 fallback 0이며 이전 출력 HTML과 byte 단위로 같다.
- type01 원본 제목 위치 복원과 과거 검사 예외 제거는 유지된다. 이번 변경 범위에 type01 renderer 변경은 없고 관련 기존 테스트가 통과했다.
- 사이트 전용 이름은 보유 CSS에서 실제 표시 규칙을 확인할 수 있는 범위를 넘어서 전부 검증했다고 주장하지 않는다. 위 판정은 버전을 명시해 직접 대조한 Bootstrap 클래스와 구분 자리 입력에 근거한다.

## 실행 결과

다음 명령을 4014df5에서 직접 실행했고 모두 종료 코드 0이었다.

| 명령 | 결과 |
|---|---|
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm test` | 33 files / 876 tests passed, 실패·건너뜀 0 |
| `npm run lint` | 오류 없음 |
| `npm run typecheck` | 오류 없음 |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm run test:browser` | 4 files / 192 tests passed, 실패·건너뜀 0 (전체 테스트와 중복되는 별도 실행) |
| `npm run convert -- --all` | 703 / success 320 / partial 368 / failed 15 |
| 추가 최소 입력·Chromium 검사 | 위 재현·정상 대조, 360/600/800/1100/1300px |

자동 테스트 통과와 위 세 검수 지적을 구분한다. 아래는 이전 원문 보관이며 현재 판정 건수는 위 표만 적용한다.

<details>
<summary>이전 검수 원문 — 0efc580 및 그 이전 기록</summary>

# 실제 원본·703페이지 7차 재검수 — 0efc580

- 검수일: 2026-11-17 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `0efc580`, 범위: `5e1d49b..0efc580`.
- 기준: `docs/review-real-pages-fixes.md` 마지막 두 장 및 `docs/review-request-real-pages.md` 14장.
- 실행 전 `cp -r reference/cms-original/. cms/`로 로컬 복사본을 준비했다. cms/는 gitignore 대상으로 커밋하지 않는다. 코드·테스트·원본 자료는 수정하지 않았고 이번 변경은 이 문서뿐이다.

## 판정

**수정 후 재확인 필요.** 이전 재현 입력들은 해결됐으며 type01도 사용자 결정대로 실제 제목 위치가 복원됐다. 다만 표시 클래스의 의미를 잘못 해석해 이미지를 숨기는 회귀와, 연속 덩어리 합침이 제목/본문 역전을 허용하는 회귀를 직접 재현했다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 이번 범위에서 확정한 항목 없음 |
| Important | 2 | I-1 표시 클래스 판정과 only의 잘못된 숨김/노출, I-2 역할을 구분하지 않는 덩어리 합침의 순서 변경 누락 |
| Minor | 0 | 별도 확정 항목 없음 |

두 지적은 **추가 최소 입력**이다. 실제 703페이지에서 같은 결함이 새로 발생했다고 주장하지 않는다. type01의 과거 배치 예외는 이제 적용하지 않고 원본 순서 복원 여부를 검사했다.

## 이전 입력 재확인 — 직접 실행

| 입력 | 현재 결과 |
|---|---|
| type10 `본문 검사<br>검사 → 제목 검사` | LOSSY_PARSE·fallback 1. 앞선 줄바꿈 우회 입력 해결 |
| type16 `독립 아이콘 목록 → 큰 이미지` | PC 순서 불일치로 LOSSY_PARSE·fallback 1. 연속 이미지 정렬로 역전을 지우던 문제 해결 |
| MO 먼저인 type23 쌍, 각각 /mobile·/desktop 링크 | success·무경고·fallback 0, 각 이미지의 링크 보존. 서로 다른 링크 때문에 거부하던 오탐 해결 |
| 기존 type33 `ol start="3"` | success·fallback 0, ordered=true/start=3 유지 |
| 이전 type29 비교 표시 충돌 / type28 이미지·강조 글 역전 | 계속 LOSSY_PARSE·fallback으로 보존 |

## Important

### I-1. d-lg-block 단독을 PC 전용으로 오판해 원래 보이던 모바일 이미지를 숨기고, 같은 판정으로 검사도 통과

**위치:** `packages/core/src/parse/common.ts:69`~`:77` 및 `:119`~`:121`; `packages/core/src/helpers/image.ts:44`~`:48`; 검사도 같은 판정을 쓰는 곳은 `packages/core/src/convert/convert-document.ts:229`~`:230`이다.

**재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type23"><div class="cms-inner"><div class="cms-visual">
    <img src="https://example.com/image.png" alt="" class="d-lg-block">
  </div></div></section>
</div>
```

**실제:** success, diagnostics `[]`, fallback 0. 모델 image.only가 pc가 되고 출력 이미지가 common-display-pc 안에 들어간다. 5e1d49b의 같은 입력은 success·무경고이며 only가 없어서 모든 화면에 표시한다. 현재 변경으로 모바일 이미지가 사라진 **새 회귀**다.

**Chromium — 직접 실행:** 원본 cms.css에 Bootstrap 표시 클래스의 표준 규칙을 보충하고, 출력에는 host-style.css를 적용했다. 이미지 응답은 동일한 로컬 100×80 SVG로 대체했다.

| 입력 이미지의 class | 모델 only | 1100px 원본 → 출력 | 800px 원본 → 출력 | 360px 원본 → 출력 |
|---|---|---|---|---|
| d-lg-block | pc | 표시 → 표시 | 표시 → 숨김 | 표시 → 숨김 |
| d-none d-lg-inline-block | 없음 | 표시 → 표시 | 숨김 → 표시 | 숨김 → 표시 |
| d-none d-md-block d-lg-none | pc | 숨김 → 표시 | 표시 → 숨김 | 숨김 → 숨김 |

세 입력 모두 success·무경고·fallback 0이다. 두 번째 행은 지원되지 않는 표시 클래스 조합의 기존 노출 문제를 새 화면별 검사도 놓치는 사례이고, 첫 번째 행이 이번 only 도입으로 확인한 명확한 신규 손실이다. 세 번째 행은 여러 breakpoint 클래스의 우선순위를 반영하지 못한다. 원본에 보충한 규칙은 d-none/d-block, 768px 이상 d-md-block, 992px 이상 d-lg-block/d-lg-none/d-lg-inline-block이다. 실제 운영 사이트 전체 CSS를 확보한 비교로 주장하지 않는다.

**기대:** d-lg-block은 큰 화면에서 display:block을 지정할 뿐, 작은 화면을 숨기는 규칙이 아니다. d-none 등과의 조합으로 실제 표시 범위를 판단해야 한다. 표현 가능한 PC/MO 전용은 보존하고, 중간 폭 전용처럼 only 두 값으로 표현할 수 없는 조합은 무경고로 다른 화면에 표시하지 말고 fallback 등으로 보존해야 한다.

**원인 — 정적 판독:** ownDevice는 PC_MARK 중 하나라도 있으면 무조건 pc를 반환한다. 기본 display, breakpoint별 덮어쓰기, block 이외 표시 값을 반영하지 않는다. pairImages가 이를 only로 기록하고, 순서 검사도 동일 함수로 원본 모바일 이미지를 제외한다. 따라서 출력과 비교 기준 양쪽에서 같은 오판이 발생해 손실을 검출하지 못한다. 파일명 추정과 표시 근거를 나눈 것은 맞지만, 표시 클래스 자체의 의미를 조합해 해석하는 단계가 부족하다.

**정상 대조 — 직접 실행:** d-none d-lg-block은 only=pc, d-block d-lg-none은 only=mo로 기록되고 1100/360px에서 원본·출력 표시가 맞는다. 표시 클래스 없이 image_m.png인 입력은 mo 칸에 배정되지만 only는 없으며 두 화면에 모두 표시된다. 파일명만으로 숨기지 않는 방어는 작동한다.

### I-2. 출력 제목이 앞선 두 본문 덩어리를 합친 글과 같으면 실제 역할 역전이 새 비교를 통과

**위치:** `packages/core/src/convert/convert-document.ts:189`~`:190` (역할 없는 Segment), `:273`~`:281` (연속 글 합침); 실제 재배치는 `packages/core/src/types/type10.ts:64`~`:68`, `:85`~`:87`이다.

**재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type10"><div class="cms-inner">
    <ol class="cms-figure-list"><li class="cms-list-item">
      <div class="cms-description-box">
        <p class="cms-description">검사</p>
        <p class="cms-description">검사</p>
      </div>
      <div class="cms-figure-text"><p class="cms-title">검사검사</p></div>
    </li></ol>
  </div></section>
</div>
```

**실제:** 5e1d49b에서는 새 경계 불일치로 LOSSY_PARSE·fallback 1이었다. 현재는 success, diagnostics `[]`, fallback 0이다. 원본 `본문 검사 → 본문 검사 → 제목 검사검사`가 출력 `strong.mig-title 검사검사 → p.mig-desc 검사<br>검사`로 바뀐다. 제목과 본문의 역할 및 눈에 보이는 줄 순서가 뒤집힌다.

**Chromium — 직접 실행:** 원본 cms.css / 출력 host-style.css 적용. 1100px 원본은 두 본문 y=74/122 다음 제목 y=168, 출력은 제목 y=65 다음 본문 y=123이다. 360px에서도 원본 두 본문 y=64/91.5 다음 제목 y=127, 출력 제목 y=60.94 다음 본문 y=116.16으로 같은 역전이다. 원본의 본문 두 줄과 한 줄 제목이 앞뒤를 바꾸는 실제 출력 차이를 확인했다.

**기대:** 원본의 본문 둘을 출력 본문 하나로 합치는 것은 허용하더라도, 그 본문 둘을 제목과 대응시키고 뒤의 제목을 본문과 대응시켜 실제 역전을 정상으로 판정하면 안 된다. 역할을 보존해 비교하거나 모호한 대응은 원본을 보존해야 한다.

**원인 — 정적 판독:** 원본 글 덩어리는 `[검사, 검사, 검사검사]`, 출력은 `[검사검사, 검사검사]`다. matcher는 첫 출력 제목을 앞의 두 원본 본문과 매칭하고, 두 번째 출력 본문을 원본 제목과 매칭하여 전부 소비한다. **새 연속 합침 규칙 자체는 충족하지만**, 역할 정보가 없어 잘못된 대응을 구분하지 못한다. 출력 본문의 br도 덩어리를 나누지 않으므로 실제 줄 배치 차이가 비교에 남지 않는다. 이전의 줄바꿈 입력 한 개는 해결됐으나 덩어리 합침으로 다른 역할의 재배치를 가리는 경우가 남았다. type01과 무관하다.

## type01 원본 순서 복원 — 직접 실행과 정적 판독 구분

**직접 실행:**

| 원본 형태 | 현재 출력·결과 |
|---|---|
| 제목 TITLE → 이미지 → 설명 BODY, 기존 머리글 없음 | success·fallback 0. 제목은 header.mig-header로, 이미지 위에 표시 |
| 작은 글 EYEBROW + 머리글 HEADING이 있고 TITLE → 이미지 | success·fallback 0. 기존 머리글 유지, TITLE은 이미지 바로 위 별도 mig-text-wrap |
| 이미지 → 제목 TITLE → 설명 BODY | success·fallback 0, titleAfterImage=true. 제목은 이미지 뒤 유지 |
| 이미지 없음, TITLE → BODY | success·fallback 0. 기존 글 묶음 안 제목/설명 유지 |
| TITLE → 설명 BEFORE → 이미지 | 계속 LOSSY_PARSE·fallback 1. 별도의 설명 이동은 허용하지 않음 |

Chromium 1100/360px에서 머리글 없는 첫 입력의 제목 y는 각각 40/36, 이미지 y는 125.80/97.67로 제목이 실제 이미지 위다. 이미지 선행 입력은 두 폭 모두 이미지가 제목보다 앞이다. 머리글 있음·이미지 없음 두 입력은 변환 HTML 구조로 확인했다.

**정적 판독:** type01 render가 ctx.orderCheck를 쓰지 않고 실제 출력 자체를 바꾼다. hasImage, titleAfterImage, 기존 heading/eyebrow 유무로 배치한다. 순서 검사에는 type01 전용 우회가 없다. 과거의 617개 배치 예외를 현재 승인 근거로 쓰지 않았다.

## 실제 페이지·기존 출력 대조 — 직접 실행

- 703개 파일을 5e1d49b와 현재 코드로 각각 변환해 파일 상태 및 섹션 type/fallback을 대조했다. 변화 0개. success 320 / partial 368 / failed 15 유지.
- 순서 사유 fallback 9개(type01 8, type10 1) 고정 목록 테스트도 통과했다. I-1·I-2는 이 표본 밖의 최소 입력에서 찾은 사례다.
- output/data의 only는 기록대로 세 이미지이며 모두 type24의 pc다: `06/caries.html#3`, `03/painTreatment.html#4`, `13259/03_통증치료.html#4` (cms/contents 기준).
- 기존 29타입 × 4모드 총 116개 입력 중 HTML 차이는 type01 네 모드뿐이다. 나머지 112개는 byte 단위로 같다. type01의 차이는 이번 사용자 결정에 따른 제목 위치 변경과 구분해 검토했다.
- 기존 28타입 × 4변형(공백·이미지 없음·인라인 서식·문단 블록) 총 112개 입력은 fallback 0이고 이전 HTML과 같다. 이번 추가 검사에서 위 두 항목 외의 정상 입력 오탐은 확정하지 않았다.

## 실행 결과

아래 명령을 0efc580에서 직접 실행했고 모두 종료 코드 0이었다.

| 명령 | 결과 |
|---|---|
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm test` | 33 files / 870 tests passed, 실패·건너뜀 0 |
| `npm run lint` | 오류 없음 |
| `npm run typecheck` | 오류 없음 |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm run test:browser` | 4 files / 192 tests passed, 실패·건너뜀 0 (전체 테스트와 중복되는 별도 실행) |
| `npm run convert -- --all` | 703 / success 320 / partial 368 / failed 15 |
| 추가 최소 입력·Chromium 검사 | 표시 조합 1100/800/360px, 역할 역전, type01 배치·대조 입력 확인 |

자동 테스트 통과와 위 두 검수 지적은 구분한다. 아래는 이전 원문 보관이며 현재 판정 건수는 위 표만 적용한다.

<details>
<summary>이전 검수 원문 — 37773d8 및 그 이전 기록</summary>

# 실제 원본·703페이지 6차 재검수 — 37773d8

- 검수일: 2026-11-16 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `37773d8`, 범위: `e6ed7ae..37773d8`.
- 기준: `docs/review-real-pages-fixes.md` 마지막 장, `docs/review-request-real-pages.md` 12장.
- 실행 전 `cp -r reference/cms-original/. cms/`로 로컬 복사본을 준비했다. `cms/`는 gitignore 대상이며 커밋하지 않는다. 코드·테스트·원본 자료는 고치지 않았고 이번 커밋은 이 문서만 변경한다.

## 판정

**수정 후 재확인 필요.** 이전 I-1~I-3의 원래 재현 입력은 모두 수정됐다. 다만 블록 경계가 있는 변형의 제목/본문 역전을 여전히 놓치며, 반응형 이미지 묶음 판정이 독립 이미지의 역전을 새로 허용한다. 새 타입 세 개에서는 이번 검사로 추가 결함을 확정하지 않았다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 이번 범위에서 확정한 항목 없음 |
| Important | 2 | I-1 블록 경계 비교의 역할 역전 누락, I-2 반응형 이미지 묶음 판정의 과도한 허용·오탐 |
| Minor | 0 | 별도 확정 항목 없음 |

두 항목은 모두 **추가 최소 입력**이다. 실제 703페이지에서 같은 결함이 발생했다고 주장하지 않는다. type01의 제목 → 이미지 배치 차이는 명시적 예외로 유지하고 결함으로 세지 않았다. type34 보류도 지적하지 않는다.

## 이전 세 입력의 수정 — 직접 실행

| 이전 입력 | 37773d8 결과 |
|---|---|
| type10 본문 `검사검사` → 제목 `검사` (줄바꿈 없음) | LOSSY_PARSE·fallback 1. 이전의 무경고 통과는 해결 |
| type33 답 `<ol start="3"><li>FIRST</li><li>SECOND</li></ol>` | success·무경고·fallback 0. 모델 ordered=true, start=3. Chromium 1100/360px에서 원본·출력 모두 OL/start=3/decimal |
| MO 먼저인 type23 PC/MO 쌍 (같은 href 또는 둘 다 링크 없음) | success·무경고·fallback 0. 이전 오탐은 해결 |

번호 목록의 `li value="8"`, `ol reversed`, `ol type="a"` 대조 입력은 각각 LOSSY_PARSE·fallback 1이다. 표현하지 않는 번호 속성의 원본 보존 방어도 작동했다.

## Important

### I-1. 본문 안에 줄바꿈이 있으면 제목/본문 역전이 블록 경계 검사까지 통과

**위치:** `packages/core/src/convert/convert-document.ts:248`~`:264`, `:280`~`:286`; 재배치 경로는 `packages/core/src/types/type10.ts:64`~`:68`, `:85`~`:87`.

**재현 입력 — 직접 실행:** 이전 I-1의 본문 `검사검사` 사이에 `<br>` 하나만 추가했다. 아래 전체 입력을 convertDocument에 전달했다.

```html
<div class="cms-container">
  <section class="cms type10"><div class="cms-inner">
    <ol class="cms-figure-list"><li class="cms-list-item">
      <div class="cms-description-box"><p class="cms-description">검사<br>검사</p></div>
      <div class="cms-figure-text"><p class="cms-title">검사</p></div>
    </li></ol>
  </div></section>
</div>
```

**실제:** success, diagnostics `[]`, fallback 0. 원본 `본문(검사↵검사) → 제목(검사)`가 출력 `strong.mig-title(검사) → p.mig-desc(검사<br>검사)`로 바뀐다. Chromium에 원본 cms.css / 출력 host-style.css를 적용해 확인했다. 1100px에서 원본 본문 y=74 / 제목 y=150, 출력 제목 y=65 / 본문 y=123이다. 360px에서도 같은 역전이다. 위에서 확인한 줄바꿈 없는 원래 입력은 현재 정상적으로 fallback한다.

**기대:** 제목·본문 등 서로 다른 역할의 글 블록이 실제로 역전됐으면 원본 순서를 유지하거나 fallback해야 한다. 본문 자체의 정상적인 줄바꿈 유무가 이 방어를 우회하게 해서는 안 된다.

**원인 — 정적 판독:** 글 토큰은 여전히 같은 href의 인접 글을 합친다. textBoundaries는 블록의 역할·시작/끝 구분·중복 횟수 없이 공백 제거 후 문자 오프셋의 Set만 만든다. 위 입력의 원본·출력은 글이 `검사검사검사`, 경계 위치도 모두 `{0, 2, 4, 6}`이다. `<br>` 경계와 제목/본문 경계를 구분하지 못해 extra가 비고 통과한다. 출력에 새 경계만 없으면 허용하는 방식이 역할 보존을 증명하지 못하는 사례이며, 단순히 양쪽 경계 Set을 같게 요구하는 것으로도 이 입력은 해결되지 않는다. type01 예외와 무관하다.

### I-2. 반응형 후보를 DOM 역할 대신 ‘연속 이미지 + 같은 href’로 판정해 독립 이미지 역전은 통과하고 정상 대안 쌍은 거부

**위치:** `packages/core/src/convert/convert-document.ts:230`~`:236`, `:277`~`:278`; 독립 이미지 재배치는 `packages/core/src/types/type16.ts:77`~`:84`.

#### A. 서로 다른 역할의 아이콘·큰 이미지 순서 변경이 새로 success

**재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type16"><div class="cms-inner">
    <ul class="cms-column-list"><li class="cms-list-item">
      <div class="cms-icon"><img src="https://example.com/icon.png" alt="ICON"></div>
    </li></ul>
    <div class="cms-visual">
      <img src="https://example.com/big.png" alt="BIG" class="d-none d-lg-block">
    </div>
  </div></section>
</div>
```

**실제:** 이전 기준 e6ed7ae에서는 LOSSY_PARSE·fallback 1이었다. 현재는 success, diagnostics `[]`, fallback 0. 원본 `아이콘 목록 → 큰 이미지`가 출력 `큰 이미지 → 아이콘 목록`으로 바뀐다. 두 이미지는 PC/MO 대안이 아니고 PC에서 **동시에 보이는 별도 콘텐츠**다.

**Chromium — 직접 실행:** 두 URL을 각각 같은 100×80 로컬 SVG로 응답하도록 라우팅하고 원본 cms.css / 출력 host-style.css를 적용했다. PC 1100px에서 원본 icon y=63 / big y=148, 출력 big y=40 / icon y=873이다. 크기·장식 차이가 아니라 두 역할의 실제 앞뒤 역전을 지적한다. 이 항목의 화면 판정은 두 이미지가 동시에 보이는 PC 폭을 기준으로 했다.

**기대:** 독립 이미지 역할 간 순서 변경은 계속 검출해야 한다. 명확한 PC/MO 대안 쌍의 나열 순서만 비교에서 정규화해야 한다.

#### B. 실제 PC/MO 쌍도 각기 다른 링크이면 기존 오탐이 남음

**재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type23"><div class="cms-inner"><div class="cms-visual">
    <a href="/mobile"><img src="https://example.com/mo.png" alt="" class="d-block d-lg-none"></a>
    <a href="/desktop"><img src="https://example.com/pc.png" alt="" class="d-none d-lg-block"></a>
  </div></div></section>
</div>
```

**실제:** failed·LOSSY_PARSE·fallback 1. MO와 PC 이미지의 DOM 순서가 다르다는 사유다. 두 a의 위치만 PC 먼저로 바꾸면 success·무경고·fallback 0이며, 모델은 pc.png → /desktop, mo.png → /mobile을 정확히 보존한다. 따라서 이미지/링크 모델로 표현할 수 없는 입력이 아니다.

**Chromium 대조 — 직접 실행:** MO 먼저인 원본과 PC 먼저인 대조 입력의 정상 출력을 비교했다. 원본 cms.css에 Bootstrap 표시 클래스의 표준 규칙(992px 경계)을 보충하고, 출력은 host-style.css를 적용했다. 1100px에서는 양쪽 모두 pc.png → /desktop, 360px에서는 양쪽 모두 mo.png → /mobile 하나만 표시된다. 외부 이미지는 받지 않고 표시 여부·src·href를 측정했다. 현재 fallback을 정상 출력이라고 측정한 것이 아니며, 운영 사이트 전체 CSS를 확보한 시각 비교로 주장하지 않는다.

**기대:** PC/MO 각 역할에 달린 링크가 보존되고 화면별 활성 이미지·링크가 같으면 정상 변환해야 한다. 두 대안의 링크가 다르다는 이유만으로 DOM 나열 순서에 의미를 부여하면 안 된다.

**공통 원인 — 정적 판독:** normalizeImageRuns는 DOM 컨테이너·PC/MO 표시·서로 배타적으로 보이는지 여부를 보지 않는다. 글 토큰 사이에 있는 같은 href의 모든 이미지 주소를 정렬한다. A에서는 href가 둘 다 빈 문자열이라 별도 역할까지 같은 묶음이 되어 역전을 지운다. 반대로 B에서는 진짜 PC/MO 대안이지만 href가 달라 두 묶음으로 나뉘어 오탐한다. 기존 최소 입력만 통과시키는 href 조건 대신 실제 대안 관계를 구분할 필요가 있다.

## 새 타입·요청한 클래스 판정 확인

**직접 실행:**

- type08: 실제 4개 섹션 모두 fallback 0. 원본 컴포넌트 fixture가 type-08로 출력되며 기존 type07과 함께 쓰는 공통 함수의 회귀도 대조했다.
- type32: 실제 5개 섹션 모두 fallback 0. fixture의 강조 글·안내·두 원 항목을 보존하고 type-27 카드로 출력한다.
- type31: 실제 19개 섹션 중 9개 변환·10개 fallback. 문서의 알려진 범위와 일치한다. 남은 사유는 표/상자 등의 미수용 글, 이미지, 글 안의 ul이며 새 순서 오탐으로 집계된 항목은 없다.
- type32 → type31 → type08 fixture를 한 페이지로 변환·renderPage 호출: fallback 0, blocks는 preset → general → preset. Chromium 1100/360px의 직접 감싸개는 mig-container → inner → mig-container이며 섹션 세 개가 모두 존재한다. fixture의 type08 상대 이미지 주소 때문에 전체 상태는 partial이고 IMAGE_RELATIVE 경고 두 개가 있으며, 모드 변경은 MIXED_MODE_SPLIT 정보 두 개로 기록된다.
- 같은 혼합 페이지에서 type31 소제목은 strong이고 두 주석에는 `*`가 실제 글로 붙는다. 별도의 기존 자동 테스트가 `※` 표시도 확인한다.
- 실제 원본 후보의 dd 클래스 조합에서 cms-description, cms-title 동반, cms-list-item 동반, type01/left 동반, bullet-list 동반을 대조했다. 기본 줄·소제목·별표·당구장 표시의 지원 조합에서 새 오분류를 확정하지 않았다.
- type32 최소 목록에서 cms-figure-list1과 cms-figure-list12는 success·fallback 0. cms-figure-list1-other는 목록으로 잡히지 않고 남은 글 때문에 LOSSY_PARSE·fallback 1이다.

**정적 판독:** type31은 직접 자식 목록 묶음의 dl > dt/dd만 읽고 나머지 글/이미지는 finish가 보존 여부를 검사한다. type32의 정규식은 클래스 토큰 전체와 숫자 접미사에만 일치한다. 목록 안 미지원 글이 무경고로 없어지는 우회는 이번 검사에서 확정하지 못했다. 이는 모든 클래스 조합이나 임의의 목록 구조를 지원한다는 뜻은 아니다.

## type01 예외 및 실제 페이지·회귀 대조

**직접 실행:**

- `제목 TITLE → 이미지 → 설명 BODY`: success·무경고·fallback 0. 명시적 예외 유지.
- `제목 TITLE → 설명 BEFORE → 이미지`: LOSSY_PARSE·fallback 1. 설명 이동까지 예외로 숨기지 않음.
- `이미지 → 제목 TITLE → 설명 BODY`: success·무경고·fallback 0, titleAfterImage=true.
- 703개 파일을 e6ed7ae와 현재 코드 양쪽으로 변환해 파일 상태와 섹션 type/fallback을 대조했다. 16개 파일에서 새 타입 섹션 18개(type31 9, type32 5, type08 4)가 fallback에서 정상 타입으로 바뀌었다. 그 밖의 섹션 type/fallback 변화는 없다.
- 703페이지: success 312 → 320, partial 376 → 368, failed 15 유지. 순서 사유 fallback은 고정 목록 9개 그대로이며 real-pages 테스트도 통과했다.
- 기존 29타입 × 4개 모드 총 116개 입력의 출력 HTML이 e6ed7ae와 byte 단위로 같다.
- 기존 28타입 × 4개 변형(공백·이미지 없음·인라인 서식·문단 블록) 총 112개 입력은 전부 fallback 0이고 이전 출력 HTML과 같다.

위 범위에서 type01 예외가 다른 설명 이동을 가리는 사례는 찾지 못했다. 다만 I-1·I-2는 type01과 무관한 일반 순서 검사의 잔여 문제다. 617개 제목 → 이미지 배치 예외 자체는 이번 판정에서 제외했다.

## 실행 결과

아래 명령은 37773d8의 코드에서 직접 실행했고 모두 종료 코드 0이었다.

| 명령 | 결과 |
|---|---|
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm test` | 33 files / 865 tests passed, 실패·건너뜀 0 |
| `npm run lint` | 오류 없음 |
| `npm run typecheck` | 오류 없음 |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm run test:browser` | 4 files / 192 tests passed, 실패·건너뜀 0 (전체 테스트와 중복되는 별도 실행) |
| `npm run convert -- --all` | 703 / success 320 / partial 368 / failed 15 |
| 추가 최소 입력·Chromium 검사 | 위 재현 및 대조 결과 확인 |

기존 자동 테스트 통과와 위 두 검수 지적을 구분한다. 아래는 이전 보고서의 원문 보관이며 현재 판정 건수는 위 표만 적용한다.

<details>
<summary>이전 검수 원문 — cadc0ef 및 그 이전 기록</summary>

# 실제 원본·703페이지 4차 재검수 — cadc0ef

- 검수일: 2026-11-16 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `cadc0efca61d7f3512fb7d3ca44e2b6f0abd444f`, 범위: `242b7b6..cadc0ef`.
- 기준: `docs/review-real-pages-fixes.md` 마지막 장, `docs/review-request-real-pages.md` 10장.
- 로컬 `cms/`는 `reference/cms-original` 복사본이며 `diff -qr reference/cms-original cms` 차이 없음. gitignore 대상이다. 코드·테스트·원본 자료는 수정하지 않았으며 이번 커밋은 이 검수 문서만 변경한다.

## 판정

**수정 후 재확인 필요.** 지난 네 지적의 입력은 해결됐다. 다만 글 토큰이 역할·경계를 합쳐 실제 재배치를 놓치는 사례, Q&A 번호 목록의 의미 소실, PC/MO 이미지의 DOM 나열 순서만으로 정상 반응형 입력을 거부하는 오탐을 직접 재현했다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 이번 범위에서 확정한 항목 없음 |
| Important | 3 | I-1 제목/본문 역할 경계 누락, I-2 Q&A 번호 목록 소실, I-3 반응형 이미지 순서 오탐 |
| Minor | 0 | 별도 확정 항목 없음 |

세 항목 모두 **추가 최소 입력**이다. 실제 703페이지에 같은 결함이 발생했다고 주장하지 않는다. type01의 합의 대기 중인 제목 → 이미지 배치 예외는 결함으로 집계하지 않았다. I-1·I-2의 출력 문제 자체는 이전 기준에서도 존재하나, 이번 요청의 토큰 비교가 놓치는 역할·경계에 대한 잔여 사례다. I-3은 이전 기준 242b7b6에서는 success인 새 오탐이다.

## 이전 네 지적 확인 — 직접 실행

| 이전 항목 | 동일 입력의 현재 결과 |
|---|---|
| I-1 한 링크 안 PC/MO 이미지 | 최소 입력 success·무경고·fallback 0. 실제 네 섹션도 fallback → type23으로 복구됨 |
| I-2 Q&A 답의 문단 / 감싼 목록 | `<p>FIRST</p><p>SECOND</p>`는 answer `FIRST<br>SECOND`, success. `<div><ul>…</ul></div>`는 LOSSY_PARSE·섹션 fallback |
| I-3 본문과 링크 비교 표시의 충돌 | type29 `FIRST → 예약 링크 → ⟦/go⟧예약⟦/⟧` 입력은 LOSSY_PARSE·fallback |
| I-4 이미지와 강조 글의 순서 | type28 `이미지 → BADGE → BODY` 입력은 LOSSY_PARSE·fallback |

복구된 실제 네 섹션(cms/contents 기준): `13289/0201_소음순수술.html#9`, `13289/0202_레이저질성형.html#9`, `13289/0203_음핵수술.html#8`, `13289/0401_유두소음순대음순미백.html#9`.

## Important

### I-1. 제목·본문의 경계를 합친 토큰 때문에 서로 다른 길이의 글이 실제로 앞뒤가 바뀌어도 success

**위치:** `packages/core/src/convert/convert-document.ts:200`~`:206` (역할/블록 경계 없이 인접 글 병합), `packages/core/src/types/type10.ts:64`~`:68`, `:85`~`:87` (역할별 읽기와 고정 출력 순서).

**재현 입력 — 직접 실행:** 아래 전체 문자열을 `convertDocument`에 전달했다.

```html
<div class="cms-container">
  <section class="cms type10"><div class="cms-inner">
    <ol class="cms-figure-list"><li class="cms-list-item">
      <div class="cms-description-box"><p class="cms-description">검사검사</p></div>
      <div class="cms-figure-text"><p class="cms-title">검사</p></div>
    </li></ol>
  </div></section>
</div>
```

**실제:** success, diagnostics `[]`, fallback 0. 원본의 `본문 검사검사 → 제목 검사`가 출력에서는 `<strong class="mig-title">검사</strong> → <p class="mig-desc">검사검사</p>`다. 서로 다른 길이의 글 블록이 실제로 역전됐다. 동일 입력을 Chromium에서 원본 cms.css / 출력 host-style.css와 함께 확인했다. 1100px에서 원본 본문 y=74, 제목 y=120; 출력 제목 y=65, 본문 y=123이다. 360px에서도 같은 역전이다.

**대조 입력 — 직접 실행:** 본문만 `다른 설명`으로 바꾸면 LOSSY_PARSE·fallback 1이다. 따라서 원래 순서를 지원하는 것이 아니라, 반복 문자열의 결합이 같을 때 검사가 누락되는 경우다.

**기대:** 제목/본문 역할과 해당 글 경계를 구분하여 순서 변경을 찾아 원본 순서를 유지하거나 fallback해야 한다. 이미지·링크가 없는 글 사이의 역할 변경도 비교 범위에서 빠지면 안 된다.

**원인 — 정적 판독:** 같은 href의 인접 텍스트는 DOM의 블록·역할 경계를 무시하고 한 토큰으로 합친다. 원본과 출력 모두 `['t', '', '검사검사검사']`가 된다. 토큰 배열로 바꾸어 문자열 구분자 충돌은 고쳤지만, 글의 역할과 경계는 여전히 비교하지 않는다. type01 예외와 무관한 type10 사례다.

### I-2. type33이 번호 목록을 읽은 뒤 불릿 목록으로 바꾸며 토큰 검사도 통과

**위치:** `packages/core/src/types/type33.ts:30`~`:39` (ul/ol을 구분 없이 읽음), `:12`~`:18` (번호 정보 없는 모델), `:112` (항상 ul/disc 출력); `packages/core/src/convert/convert-document.ts:200`~`:221` (목록 종류·시작 번호 미기록).

**재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type33"><div class="cms-inner">
    <dl class="cms-inner-box">
      <dt><span>Q</span><div class="cms-description"><button>QUESTION</button></div></dt>
      <dd><div class="copy"><span>A</span><div class="cms-description">
        <ol start="3"><li>FIRST</li><li>SECOND</li></ol>
      </div></div></dd>
    </dl>
  </div></section>
</div>
```

**실제:** success, diagnostics `[]`, fallback 0. qna 모델에는 list의 text만 남고, 출력은 `<ul style="list-style: disc; …">…</ul>`이다. Chromium 1100px·360px에서 원본은 OL / start=3 / computed list-style-type=decimal, 출력은 UL / start 없음 / disc다. 원본의 3·4번 항목이라는 정보가 사라진다. 직접 자식 ul로 바꾼 대조 입력은 정상적으로 success다.

**기대:** 순서 있는 목록 및 시작 번호를 표현할 수 있어야 하며, 현재 모델로 표현할 수 없다면 적어도 fallback으로 보존해야 한다. 글자열만 같다고 번호 목록의 의미 변경까지 무경고로 허용하면 안 된다.

**원인 — 정적 판독:** readAnswer가 첫 ul/ol을 모두 지원 대상으로 분리하여 일반 구조 검사에서 빼지만, listEl의 태그·start 및 li의 번호 정보를 모델에 담지 않는다. renderer는 ul을 고정 생성한다. 비교 토큰에도 목록 경계·번호 역할이 없으므로 같은 항목 글만 남아 검사를 통과한다. 이번 문단/감싼 목록 수정은 해결됐으나 직접 자식 번호 목록은 남는다.

### I-3. 모바일 이미지를 먼저 쓴 정상 PC/MO 쌍을 이미지 토큰의 원시 DOM 순서로 오탐

**위치:** `packages/core/src/convert/convert-document.ts:215`~`:216`, `:234`~`:237`; `packages/core/src/helpers/image.ts:41`~`:47` (출력은 PC → MO로 정규화).

**재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type23"><div class="cms-inner"><div class="cms-visual">
    <img src="https://example.com/mo.png" alt="" class="d-block d-lg-none">
    <img src="https://example.com/pc.png" alt="" class="d-none d-lg-block">
  </div></div></section>
</div>
```

**실제:** 242b7b6에서는 success·무경고·fallback 0. cadc0ef에서는 failed·LOSSY_PARSE·fallback 1이며 사유는 원본 mo.png 자리에 출력 pc.png라는 순서 차이다. 파서는 두 이미지의 PC/MO 역할을 올바르게 읽지만, 원본 MO → PC와 출력 PC → MO의 숨겨진 대안 이미지 순서가 달라 거부된다.

**Chromium 대조 — 직접 실행:** 원본에 cms.css와 위 Bootstrap 표시 클래스의 표준 규칙(992px 경계)만 보충하고, 242b7b6의 정상 출력에는 host-style.css를 적용했다. 1100px에서는 양쪽 모두 pc.png 하나, 360px에서는 양쪽 모두 mo.png 하나가 표시됐다. 출력 후보가 같은 반응형 결과임을 비교한 것이며, **현재 fallback 출력을 정상 출력이라고 측정한 것은 아니다**. 외부 이미지는 내려받지 않고 표시 여부·src를 DOM에서 측정했다. 실제 운영 사이트의 모든 CSS를 확보한 시각 비교로 주장하지 않는다.

**기대:** 같은 PC/MO 역할로 묶인 상호 배타적 대안 이미지의 DOM 나열 순서만 달라진 경우에는 정상 변환해야 한다. 이 쌍과 주변 글의 실제 앞뒤 변화는 계속 검사해야 한다.

**원인 — 정적 판독:** orderTokens는 모든 img를 조건과 무관한 독립 순서 토큰으로 남긴다. 반면 visualPcMo는 입력 DOM 나열 순서와 관계없이 PC 먼저 출력한다. 글·이미지 위치 검출을 추가하면서 반응형 대안 이미지의 동등성은 정규화하지 않았다. 이번 실제 703페이지에서는 이 최소 입력과 같은 새 오탐을 찾지 못했다.

## type01 명시적 예외 범위 — 직접 실행·정적 판독 구분

요청서가 지정한 617개 섹션의 제목 → 이미지 배치 차이는 사용자 결정 대기 중인 예외로 취급했다. 예외 자체를 지적하거나 전체 fallback 전환을 요구하지 않는다.

추가 최소 입력 세 개를 변환했다(각각 같은 이미지 한 장 사용).

| 원본 순서 | 실제 결과 |
|---|---|
| 제목 TITLE → 이미지 → 설명 BODY | success·무경고·fallback 0. 명시적 예외 허용 |
| 제목 TITLE → 설명 BEFORE → 이미지 | LOSSY_PARSE·fallback 1. 설명의 이동까지 예외로 숨기지 않음 |
| 이미지 → 제목 TITLE → 설명 BODY | success·무경고·fallback 0. titleAfterImage=true |

**정적 판독:** `type01.ts:66`~`:69`는 원본 제목이 첫 이미지 뒤인지 기록하고, `:83`~`:93`의 검사용 렌더만 제목을 선택적으로 이미지 앞으로 옮긴다. 설명은 계속 이미지 뒤에 있어 별도의 위치 변경은 토큰 비교에 남는다. 위 대조 입력 및 703페이지에서 이 예외가 설명의 이동까지 가리는 사례는 찾지 못했다. I-1처럼 역할 경계가 합쳐지는 일반 비교의 한계가 모두 해결됐다는 뜻은 아니다.

## 실제 페이지·회귀 대조 — 직접 실행

- 원본 703페이지를 242b7b6과 cadc0ef 양쪽으로 변환해 파일 상태뿐 아니라 섹션 type/fallback도 비교했다.
- 이전 네 반응형 링크 섹션이 복구됐고, 별도 9개 섹션이 정상 타입 → fallback으로 바뀌었다. 순서 사유 fallback 9개 목록은 현재 real-pages 테스트의 고정 목록과 일치한다(type01 8개, type10 1개). 이들은 원본 글/이미지 재배치를 새로 검출한 결과이며 오탐으로 집계하지 않았다.
- 11개 파일에서 섹션 타입 변화가 있었으며, 집계는 success 317 → 312, partial 371 → 376, failed 15 유지다. 파일 상태만 비교하면 복구된 네 섹션을 놓치므로 섹션 단위 대조도 사용했다.
- 기존 29타입 × 4개 모드(원 fixture·일반·이미지 배경·색 배경), 총 116개 입력의 출력 HTML이 242b7b6과 byte 단위로 같다.
- 기존 28타입 × 4개 변형(공백·이미지 없음·인라인 서식·문단 블록), 총 112개 추가 입력 모두 fallback 0이며 이전 HTML과 같다. 이는 해당 표본의 회귀 확인이며 모든 마크업의 무손실 증명은 아니다.

## 실행 결과

다음 명령은 cadc0ef의 코드에서 직접 실행했고 모두 종료 코드 0이었다. 브라우저 경로는 기존 로컬 Playwright 설치를 사용했다.

| 명령 | 결과 |
|---|---|
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm test` | 33 files / 817 tests passed, 실패·건너뜀 0 |
| `npm run lint` | 오류 없음 |
| `npm run typecheck` | 오류 없음 |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/stage3-pw-browsers npm run test:browser` | 4 files / 180 tests passed, 실패·건너뜀 0 (전체 테스트와 중복되는 별도 실행) |
| `npm run convert -- --all` | 총 703 / success 312 / partial 376 / failed 15 |
| 추가 최소 입력 및 Chromium 검사 | 위 I-1~I-3, 이전 네 입력, type01 예외·대조 입력 확인 |

I-1~I-3은 기존 테스트가 모두 통과해도 남는 직접 재현 결과다. 자동 테스트 통과와 검수 판정을 구분한다. 아래는 이전 판정의 원문 보관이며 현재 건수는 위 표만 적용한다.

<details>
<summary>이전 검수 원문 — 2dd9193 및 그 이전 기록</summary>

# 실제 원본·703페이지 3차 재검수 — 2dd9193

- 검수일: 2026-11-16 (KST).
- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`.
- 대상: `2dd919391ede5d46d2d54424ed60f8546ac85270`.
- 범위: `237d543..2dd9193`. 기준: 반영 기록 마지막 장 및 검수 요청서 9장.
- 로컬 cms/는 reference/cms-original 복사본이며 gitignore다. 코드·테스트·원본 자료는 수정하지 않았다. 이번 변경은 이 검수 문서뿐이다.

## 판정

**수정 후 재확인 필요.** 이전 두 입력은 해결됐다. 다만 실제 페이지의 반응형 이미지 링크가 새로 fallback되는 회귀와, Q&A 답 경계·링크 비교 표현·이미지 위치에 관한 잔여 문제를 직접 재현했다.

| 등급 | 현재 건수 | 내용 |
|---|---:|---|
| Critical | 0 | 이번 범위에서 확정한 항목 없음 |
| Important | 4 | I-1 실제 이미지 링크 오탐, I-2 Q&A 답 경계 소실, I-3 비교 표현 충돌, I-4 이미지/강조 글 위치 변경 |
| Minor | 0 | 별도 확정 항목 없음 |

I-1은 실제 703페이지에서 새로 발생했다. I-2~I-4는 추가 최소 입력이며 실제 페이지에서 동일한 손실이 발생했다고 주장하지 않는다. 각 항목의 실행 근거와 정적 원인 설명을 구분했다.

## 이전 입력 수정 확인 — 직접 실행

- type24 본문의 `<span class="mig-num">2026</span>`: success, fallback 0. 작성 숫자는 유지하고 검사용 렌더에서 생성 순번만 생략한다.
- type29 같은 글 예약의 링크/일반 문단 위치 변경: 이제 LOSSY_PARSE 및 섹션 fallback이다.
- type15 문단 선행 입력: 계속 fallback으로 원본 보존. 새 정책 유지.

## Important

### I-1. 하나의 링크 안 PC/MO 이미지 쌍을 새 링크 비교가 오탐하여 실제 4개 섹션을 fallback함

**위치:** `packages/core/src/convert/convert-document.ts:202`~`:204`, `:218`~`:220`; 반응형 링크 생성은 `packages/core/src/helpers/image.ts`와 `parse/common.ts`의 imageFromElement 경로다.

**재현 입력 — 직접 실행:** 아래 실제 원본을 그대로 변환했다.

| 파일(cms/contents 기준) | 섹션 |
|---|---:|
| 13289/0201_소음순수술.html | 9 |
| 13289/0202_레이저질성형.html | 9 |
| 13289/0203_음핵수술.html | 8 |
| 13289/0401_유두소음순대음순미백.html | 9 |

대표 입력의 구조는 다음과 같다. 원본 파일 전체 및 섹션 단독 변환을 모두 사용했다.

```html
<section class="cms type23"><div class="cms-inner">
  <div class="cms-visual">
    <a href="https://www.youtube.com/watch?v=CPSXRASy7yg" target="_blank">
      <img src="https://fxfile.drline.net/local/13289/cms/sub0201_img_0305.jpg"
           class="img-fluid d-none d-lg-block m-auto" alt="소음술수술 유투브영상">
      <img src="https://fxfile.drline.net/local/13289/cms/sub0201_img_0305_m.jpg"
           class="w-100 d-block d-lg-none" alt="소음술수술 유투브영상">
    </a>
  </div>
</div></section>
```

**실제:** 이전 237d543의 대표 섹션은 success, 경고 없음, fallback 0. 현재는 failed, LOSSY_PARSE, fallback 1이며 사유는 링크 비교에서의 글 순서 차이다. 네 파일은 원래 다른 미지원 섹션 때문에 partial이어서 파일 상태만 보면 이 회귀가 보이지 않는다.

**기대:** 한 링크를 공유하는 반응형 PC/MO 이미지 쌍을 정상 변환해야 한다. PC/MO 출력용 링크가 두 개라고 해서 실제 활성 링크의 위치나 주소가 달라진 것으로 판단하면 안 된다.

**원인 — 정적 판독:** 원본은 a 하나 안에 img 두 장이다. 기존 renderer는 PC/MO visual을 나누고 각 이미지에 같은 a를 감싼다. 원본 signature에는 빈 링크 표기가 한 번, 출력에는 두 번 들어가 비교가 실패한다. 이미지 자체는 signature에 없고 반응형 조건도 고려하지 않는다.

**Chromium 확인:** 이전 정상 출력에 현재 호스트 CSS를 적용하면 PC 1100에서는 PC visual만 block, 모바일 360에서는 MO visual만 block이다. 보이는 이미지 하나가 같은 YouTube 주소로 연결된다. 새 비교 때문에 본래 정상적인 반응형 출력을 거부하는 경우다. 단순 `<a href="/video">PC img + MO img</a>` 최소 입력으로도 재현했다.

### I-2. type33 Q&A 답 안의 문단·감싼 목록 경계가 경고 없이 사라짐

**위치:** `packages/core/src/types/type33.ts:28`~`:35`, 특히 `:29`와 `:33`; `parse/common.ts`의 readInParts 구조 검사 제외와 연결된다.

**재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type33"><div class="cms-inner">
    <div class="cms-list-wrap"><div class="cms-list-item">
      <dl class="cms-inner-box">
        <dt><span>Q</span><div class="cms-description"><button>QUESTION</button></div></dt>
        <dd><div class="copy"><span>A</span>
          <div class="cms-description"><p>FIRST</p><p>SECOND</p></div>
        </div></dd>
      </dl>
    </div></div>
  </div></section>
</div>
```

**실제:** success, diagnostics [], fallback 0. qna[0].answer는 FIRSTSECOND다. 실제 Chromium 원본 답은 `FIRST\n\nSECOND`, 출력 답은 FIRSTSECOND로 합쳐진다.

답의 내부를 아래처럼 바꿔도 success·무경고이며 FIRSTSECOND가 된다.

```html
<div><ul><li>FIRST</li><li>SECOND</li></ul></div>
```

**기대:** 문단은 기존 합의대로 br 경계를 남기고, 표현하지 못하는 목록 구조는 fallback으로 보존해야 한다. 직접 자식 ul만 지원하더라도 감싼 ul을 조용히 텍스트로 풀어서는 안 된다.

**원인 — 정적 판독:** readAnswer는 본문을 richFrom으로 읽지 않고 nodesHtml→sanitizeRichText로 처리해 블록 태그를 경계 없이 푼다. markReadInParts로 바깥 답 요소는 구조 검사에서 제외됐지만, 나눈 본문 부분을 공통 경계 보존 도우미로 검사·기록하지 않는다. 직접 자식이 아닌 ul도 목록으로 분리하지 못한다. 새 순서 비교는 글자열이 같으면 통과하므로 이 경계 소실을 막지 못한다.

### I-3. 본문이 링크 signature 표기와 같으면 실제 글 순서 변경이 통과함

**위치:** `packages/core/src/convert/convert-document.ts:196`, `:204`, `:218`~`:220`.

**재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type29"><div class="cms-inner">
    <div class="cms-description-box">
      <p class="cms-description">FIRST</p>
      <p class="cms-button-wrap"><a class="cms-square-button" href="/go">예약</a></p>
      <p class="cms-description">⟦/go⟧예약⟦/⟧</p>
    </div>
  </div></section>
</div>
```

**실제:** success, diagnostics [], fallback 0. Chromium 원본은 FIRST→예약 링크→`⟦/go⟧예약⟦/⟧` 일반 글, 출력은 FIRST→그 일반 글→예약 링크다. 이번에는 눈에 보이는 글자열의 순서도 실제로 다르다.

**기대:** 본문의 임의 문자와 비교용 구조 표시를 구분해야 한다. 이전 type29의 같은 순서 변경이므로 순서를 유지하거나 fallback해야 한다.

**원인 — 정적 판독:** 텍스트 노드를 그대로 문자열에 넣고, 링크도 `⟦주소⟧글⟦/⟧` 문자열로 덧붙인다. 일반 글에 같은 표기를 쓰면 원본·출력이 모두 아래 signature가 된다.

```text
FIRST⟦/go⟧예약⟦/⟧⟦/go⟧예약⟦/⟧
```

이는 위험 URL 실행 문제라는 지적이 아니라, 데이터와 비교용 구분자의 표현 충돌로 순서 검사가 누락되는 문제다. 이 문자는 입력에서 금지되거나 특별 취급되는 글자가 아니다.

### I-4. type28 이미지와 강조 글의 위치 변경은 새 signature에도 나타나지 않음

**위치:** `packages/core/src/convert/convert-document.ts:195`~`:206`(img/역할 위치 미기록), `packages/core/src/types/type28.ts:72`~`:76`(강조 글을 항상 이미지보다 먼저 출력).

**재현 입력 — 직접 실행:**

```html
<div class="cms-container">
  <section class="cms type28"><div class="cms-inner">
    <div class="cms-visual"><img src="https://example.com/image.png" alt="PIC"></div>
    <div class="cms-description-box em-box-3"><p class="cms-title">BADGE</p></div>
    <div class="cms-description-box"><p class="cms-description">BODY</p></div>
  </div></section>
</div>
```

**실제:** success, diagnostics [], fallback 0. 원본 이미지→BADGE→BODY가 출력 BADGE→이미지→BODY로 바뀐다. signature는 둘 다 BADGEBODY다.

**Chromium 확인:** 외부 이미지 대신 같은 로컬 data SVG(100×80)를 사용해 실제 배치를 측정했다. 원본은 이미지 y=98 / 강조 상자 y=222, 출력은 강조 글 y=64 / 이미지 y=112로 순서가 반대다. 이미지 확대·모양 차이를 결함으로 센 것이 아니라 위아래 순서의 역전을 확인한 것이다.

**기대:** 이 원본 변형의 이미지/강조 글 위치를 유지하거나, 지원하지 않는 순서라면 fallback으로 보존해야 한다.

**원인 — 정적 판독:** signature는 글과 링크만 기록하므로 링크 없는 이미지의 위치를 구분하지 못한다. type28의 textFirst는 설명 상자/이미지 위치만 다루고 badge 위치는 반영하지 않는다. type30처럼 CSS column-reverse를 위한 의도된 DOM 재배치와 달리 이 입력은 실제 화면 순서도 바뀐다.

해당 type28 renderer는 이번 범위에서 새로 바뀐 코드가 아니다. 요청서가 명시한 다른 역할·이미지 위치에 대한 새 순서 검사의 검출 범위를 대조하여 찾은 기존 재배치의 잔여 사례로 집계했다.

## type33 모드·표시 예외 확인

**직접 실행:** 프리셋 원 목록→Q&A→프리셋 원 목록을 한 페이지에 넣었다.

- renderPage 블록 모드: preset→general→preset.
- Chromium의 `.migration-content > div`: mig-container→inner→mig-container.
- FAQ 질문/답의 ::before content는 각각 Q와 A.
- 답은 display flex, 높이 약 58.4px로 열린 상태이며 ANSWER가 표시됨.
- 실제 답 글 Q / A / Q 등급은 높습니다. / span 안 Q·A / strong 안 Q를 각각 넣은 6종은 정상 변환되어 본문이 유지됨.

이 정상 구조에서 orderCheckIgnores가 실제 본문 Q/A를 지운 사례는 없었다. 다만 이는 모든 Q&A 변형의 안전 보증은 아니며, I-2의 별도 경계 손실이 남아 있다. 펼치기 동작을 제거하고 답을 항상 보이는 FAQ로 출력하는 결정 자체는 정적 표현 원칙으로 수용한다.

## 전체 결과 및 회귀 비교

| 직접 실행한 검사 | 결과 |
|---|---|
| npm test(임시 Playwright 경로) | 종료 0, **811 passed**, 건너뜀 0, 33파일 통과 |
| npm run test:browser | 종료 0, **180 passed**, 4파일 통과 |
| npm run lint / npm run typecheck | 각각 종료 0 |
| npm run convert -- --all | 종료 0, **success 317 / partial 371 / failed 15** |
| 기본 fixture 116조합 | 이전 237d543과 HTML 동일 |
| 일반 공백·이미지 제거·서식·문단 변형 112조합 | 이전과 HTML 동일, 모두 fallback 0 |
| 실제 703파일 이전/현재 비교 | 8파일의 섹션 타입 변화: Q&A 4개 새 변환, 이미지 링크 4개 새 fallback |
| 추가 브라우저 | I-1~I-4, 혼합 모드 및 FAQ 표시 확인 |

기본 fixture 비교에는 type33의 별도 실제 Q&A를 넣지 않았다. Q&A는 위 혼합 모드·본문 변형·실제 페이지 비교 및 공식 검사로 확인했다. 116/112조합의 동일성이 I-1의 실제 이미지 링크 오탐을 부정하지 않는다.

파일 상태는 314/374/15→317/371/15로 좋아졌지만, 네 이미지 섹션은 원래 partial인 파일 안에 있어 새 회귀가 집계에 가려졌다. Q&A 지원 4개와 이미지 fallback 4개가 상쇄되어 전체 섹션 fallback 수만으로도 회귀를 파악할 수 없다. 따라서 파일별·섹션별 비교 결과를 함께 기록했다.

## 범위·한계

- 코드·테스트·reference 자료는 수정하지 않았다. 로컬 cms/와 출력 산출물은 커밋하지 않는다.
- 전체 테스트에 브라우저 검사가 포함되므로 811과 180을 합산하지 않는다.
- Linux, Node v24.22.1, Chromium 156.0.8078.79에서 실행했다. 외부 요청은 차단했으며 필요한 이미지 배치는 data SVG로 확인했다. Windows·외부 사이트 접속 성공·전수 시각 등급 비교는 실행하지 않았다.
- 별도 웹 편집기 저장·가져오기 흐름은 이번에는 다시 실행하지 않았다.
- 임시 입력·스크립트·관측값은 /tmp/real4-review, 공식 검사 로그는 /tmp/real4-*.log에 있다. 핵심 재현 입력과 결과는 위에 직접 기재했다.

**최종 판정: 수정 후 재확인 필요.**

## 이전 재검수 기록 보존

아래는 b5ae00b의 과거 검수 원문(보고 커밋 237d543)과 그 안의 이전 기록이다. 과거 원문 입력은 수정 확인됐으며 현재 지적은 위 I-1~I-4다.

<details>
<summary>이전 재검수 원문 — b5ae00b</summary>

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

</details>

</details>

</details>

</details>

</details>

</details>

</details>

</details>

</details>

</details>

</details>

</details>

</details>

</details>

</details>

</details>

</details>

</details>

</details>

</details>

</details>

</details>

</details>

</details>
