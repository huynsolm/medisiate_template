# 실제 원본 대조 검수 지적 반영

작성: 2026-11-16. 대상 검수: Codex `docs/review-real-pages.md` (`dc1f8c1`, `eb16fea` 기준, 판정: 수정 후 재확인 필요, Important 3).
세 건 모두 type26이고, 검수 문서의 재현 입력을 그대로 회귀 테스트로 넣었다(`packages/core/test/real-review-fixes.test.ts`). 수정 전 4개 실패 → 수정 후 통과.

## I-1. 보이는 표 제목(caption)이 숨겨짐
- 원인: 모든 caption을 같은 칸에 담고, 호스트 CSS(`.table-responsive table caption`: absolute·1px·clip)가 모두 숨겼다.
- 수정: 원본 caption에 `sr-only`가 없으면 `captionVisible: true`로 보존하고, 출력 caption에 호스트 숨김 규칙을 되돌리는 인라인 스타일(position: static, width/height auto, overflow visible, clip auto)을 붙인다. `sr-only`는 지금처럼 화면 낭독기용.
- 확인(Chromium, 호스트 CSS): 보이는 caption 1084×26px로 표시, sr-only caption은 1×1px 그대로.

## I-2. 무효한 style 너비가 유효한 width 속성을 가림
- 원인: style에서 찾은 문자열을 유효성 확인 전에 먼저 골랐다(`width:*` → auto, `width="80%"` 무시).
- 수정: 브라우저 순서대로 **유효한** style 너비 → 유효한 width 속성 → auto.

## I-3. 표 뒤 주의 글이 표 앞으로 이동 (실제 success 페이지)
- 원인: 표 묶음(`.cms-table-wrap`) 안의 첫 설명 상자를 표 앞 설명으로 가정했다.
- 수정: 표 묶음 안 설명 상자를 표 앞(desc)·표 뒤(note, 출력은 표 다음)로 나눈다.
- 실제 페이지 `13256/02_02_입원생활안내.html` 2번째 섹션: 회진시간 표 → 주의 글 순서 유지.

## 검수의 글 순서 대조를 테스트로 고정
검수는 변환된 섹션마다 원본·출력 글을 순서까지 비교해 I-3을 찾았다. 기존 검사(글을 모두 담았는지)로는 순서 변화를 잡지 못했으므로 같은 비교를 `packages/core/test/real-pages.test.ts`에 넣었다(실제 703페이지, `cms/`가 있을 때).

이 비교에서 검수가 "이번 변경 밖의 기존 문제"로 분리한 **type01 14개 섹션**도 함께 고쳤다.
- 원인: 머리글이 "작은 글 + 제목"(`cms-header.top-border`)인 type01에서 작은 글을 설명에 섞고 제목을 이미지 아래(글 묶음)에 두었다. type01 모델에는 머리글 칸(eyebrow·heading)이 있었지만 읽지 않았다.
- 수정: 그런 머리글을 eyebrow·heading으로 읽어 이미지 위(호스트 머리글)에 출력한다. 제목만 있는 일반 type01(cms-thin-title)은 그대로.
- 결과: 변환된 실제 섹션 3,027개 **글 순서 불일치 0**. type01 수정을 빼면 이 테스트가 실패함을 확인했다.

## 검증
- `npm test` 799 passed(건너뜀 0, `cms/` 있음), `npm run test:browser` 180 passed, lint·typecheck 오류 없음. 기존 스냅샷 변화 없음.
- 703페이지: success 314 / partial 374 / failed 15 (수정으로 상태가 바뀐 파일 없음: I-3 페이지는 이미 success였고 순서만 바뀜).

## 재검수(`f2e48e4`) 지적 반영

### R-I-1. 단위 없는 CSS 너비(`width:20`)가 유효한 width 속성을 가림
- 원인: style 값과 HTML 속성에 같은 검사를 써서 CSS의 `20`도 px로 인정했다. 표준 모드 CSS에서 단위 없는 0 아닌 길이는 무효다.
- 수정: CSS 값은 단위가 있어야 길이(0만 예외), **HTML width 속성만** 숫자를 px로 본다. 순서는 그대로(유효한 style → 유효한 속성 → auto).

### R-I-2. type29 버튼 뒤 문단이 버튼 앞으로 이동 (그리고 같은 종류의 문제 전체)
- 원인: 한 상자 안에 섞인 문단·버튼을 따로 모아 문단 → 버튼 순서로 출력했다. I-3(표 뒤 주의 글)과 같은 종류다. "글을 모두 담았는가" 검사는 순서 변화를 보지 못하고, 실제 페이지 순서 테스트는 703페이지에 없는 입력을 잡지 못한다.
- 수정(모든 타입 공통): **변환 중 섹션마다 순서 검사**를 한다(`packages/core/src/convert/convert-document.ts` `textOrderDiffers`). 파싱한 섹션 하나를 출력해 원본과 공백 없는 글을 순서까지 비교하고, 다르면 `LOSSY_PARSE`("원본과 글 순서가 다름") + 섹션 fallback으로 원본을 보존한다. 규칙은 real-pages 테스트와 같고, type24 순서 번호(합의된 생성 글)만 뺀다.
- 결과:
  - 검수 문서 입력(type29 FIRST→BUTTON→LAST)은 fallback(원본 순서 보존).
  - **type15의 "문단이 글머리보다 앞" 입력도 이제 fallback**이다. 3단계에서 "글머리 → 문단 순서 정규화"로 수용했던 동작을 더 안전한 쪽(원본 보존)으로 바꾼 것이다.
  - 실제 703페이지 결과는 바뀌지 않음(순서 불일치가 원래 0이었음). 변환 시간 5.6초 → 약 8초.
- 각 테스트는 해당 수정을 되돌리면 실패함을 확인했다.

### 검증
- `npm test` 804 passed, `npm run test:browser` 180 passed, lint·typecheck 오류 없음. 기존 스냅샷 변화 없음.
- 703페이지: success 314 / partial 374 / failed 15.

## 순서 검사 재검수(`237d543`) 지적 반영

### I-1. type24 작성 숫자까지 생성 순번으로 지워 정상 입력을 fallback
- 원인: 생성 순번을 빼려고 출력에서 `<span class="mig-num">숫자</span>`를 문자열로 모두 지웠다. 서식 글에 같은 모양의 숫자 span을 쓰면 그것까지 지웠다.
- 수정: 출력에서 지우지 않고, 순서 검사용 렌더링에 `orderCheck` 표시를 넘겨 **렌더러가 생성 순번만 출력하지 않는다**(type24). 실제 출력은 그대로(순번 있음).

### I-2. 같은 글의 버튼·문단이 자리를 바꿔도 통과
- 원인: 순서 검사가 글자열만 비교해, 링크인 "예약"과 일반 글 "예약"이 바뀌어도 같았다.
- 수정: 비교에 **링크 위치와 주소**를 넣는다(`⟦주소⟧글⟦/⟧`, 원본·출력 모두). 원본의 위험한 링크는 출력에서 의도적으로 링크를 빼므로(경고 남김) 원본 쪽에서도 일반 글로 본다.
- 실제 703페이지 결과 변화 없음(링크 367개가 모두 같은 자리).

### 함께 들어간 작업 (지난 검수 이후)
- type33 Q&A: 타입 정의에 섹션별 모드(`strategyFor`)와 순서 검사 예외 표시(`orderCheckIgnores`)를 더해 호스트 일반 모드 FAQ(`mig-faq-*`)로 출력. `docs/real-pages-baseline.md` 7장.

### 검증
- 새 테스트는 수정을 되돌리면 3개 실패함을 확인.
- `npm test` 811 passed, `npm run test:browser` 180 passed, lint·typecheck 오류 없음, 기존 스냅샷 변화 없음.
- 703페이지: success 317 / partial 371 / failed 15.

## 3차 재검수(`242b7b6`) 지적 반영 — 순서 비교를 토큰으로

지난 수정은 순서 비교를 문자열 이어붙이기(글 + `⟦주소⟧` 표시)로 했다. 네 지적 모두 그 표현의 한계였다. 비교를 **토큰 목록**으로 바꿨다(`packages/core/src/convert/convert-document.ts` `orderTokens`).
- `['t', 링크 주소, 글]`, `['i', 링크 주소, 이미지 주소]`. 링크는 여닫는 표시가 아니라 글·이미지마다 붙은 주소다.

| 지적 | 원인 | 결과 |
|---|---|---|
| I-1 링크 하나 안 PC/MO 이미지 쌍을 오탐(실제 4개 섹션 회귀) | 원본은 링크 1개, 출력은 이미지마다 링크 → 여닫는 표시 수가 달랐다 | 이미지마다 같은 주소 토큰이 되어 일치. 실제 4개 섹션 다시 변환 |
| I-2 type33 Q&A 답 안 문단·감싼 목록 경계 소실 | 답의 목록 앞 글을 공통 경계 규칙 없이 읽었다 | 공통 `richFromNodes`(문단 → 줄바꿈)로 읽고, 그 안의 다른 구조는 `structureProblemsInNodes`로 찾아 fallback |
| I-3 본문 글이 비교용 표시와 같으면 통과 | 데이터와 구분 표시가 같은 문자열 공간 | 토큰은 배열 원소라 본문 글과 충돌하지 않음 |
| I-4 이미지와 글의 위치 변경 미검출 | 이미지가 비교에 없었다 | 이미지 토큰으로 글과의 앞뒤를 비교 |

### 이미지 위치를 비교하면서 드러난 기존 순서 차이
- **type23**: 실제 10개 섹션에서 원본은 이미지 → 설명인데 설명 → 이미지로 출력하고 있었다. 원본 순서를 `textAfter`로 보존해 그대로 출력한다.
- **type30**: 호스트 `column-reverse` 때문에 DOM은 글 → 이미지지만 화면은 이미지 → 글이다(의도된 배치). 순서 검사용 출력에서는 화면 순서로 낸다.
- **type01 (결정 필요)**: 원본은 제목(cms-thin-title) → 이미지 → 설명인데, 1단계부터 호스트 type-01 프리셋에 맞춰 **이미지 → 제목 → 설명**으로 출력해 왔다(실제 617개 섹션). 내용 손실은 없지만 화면 순서가 다르다. 617개를 fallback으로 돌릴 수는 없어, 순서 검사용 출력에서만 제목을 이미지 앞에 두는 **명시적 예외**로 두었다(`type01.ts` 주석). 제목을 이미지 위(머리글 자리)로 올려 원본 순서에 맞출지는 사용자 결정으로 남긴다.
- 그 밖에 원본에서 글이 이미지보다 앞에 있어 순서가 바뀌던 **9개 섹션**(type01 8, type10 1)은 이제 원본 보존(fallback)이다. 이전에는 순서가 바뀐 채 success였다.

### 놓친 이유와 보강
I-1 회귀를 지난번에 못 본 이유: 해당 파일이 원래 partial이라 파일 수 집계가 같았고, 실제 페이지 순서 테스트는 fallback 섹션을 건너뛴다. 실제 페이지에서 **순서 사유로 보존되는 섹션 목록을 정확히 고정**하는 테스트를 추가했다(`real-pages.test.ts`, 현재 위 9개). 정상 섹션이 새로 걸리면 실패한다.

### 검증
- 새 테스트 5개는 수정 전 모두 실패.
- `npm test` 817 passed, `npm run test:browser` 통과, lint·typecheck 오류 없음.
- 703페이지: success 312 / partial 376 / failed 15. success가 317 → 312로 줄어든 것은 순서가 바뀐 채 success였던 섹션을 원본 보존으로 돌린 결과다.

## 4차 재검수(`e6ed7ae`) 지적 반영

| 지적 | 원인 | 수정 |
|---|---|---|
| I-1 같은 글자로 된 제목·본문이 자리를 바꿔도 통과 | 같은 링크의 이어진 글을 블록 경계 없이 한 토큰으로 합쳤다 | 글 흐름의 **블록 경계 위치**(블록 요소 시작·끝, `<br>`)도 비교한다. 출력에 원본에 없던 경계가 생기면 순서 변경으로 본다. 경계가 줄어드는 것(문단 둘 → 줄바꿈 한 문단, 머리글 블록 → 줄 안 요소)은 허용 |
| I-2 type33 Q&A 답의 번호 목록(`ol start="3"`)을 글머리 목록으로 출력 | 목록 종류·시작 번호를 모델에 담지 않았다 | 답 목록에 `ordered`·`start`를 담아 `ol start`로 출력. 항목별 `value`, `reversed`, `type`(문자 번호 등)은 담을 자리가 없어 fallback |
| I-3 모바일 이미지를 먼저 쓴 정상 PC/MO 쌍을 거부 | 원본 DOM 나열 순서 그대로 이미지 토큰을 비교했다 | 같은 링크 아래 연달아 있는 이미지는 반응형 후보 묶음으로 보고 묶음 안에서는 순서를 따지지 않는다(묶음과 주변 글의 앞뒤는 그대로 비교) |

### 검증
- 새 테스트(5개 중 수정 대상 3개)는 수정을 되돌리면 실패함을 확인.
- `npm test` 822 passed, `npm run test:browser` 180 passed, lint·typecheck 오류 없음, 기존 스냅샷 변화 없음.
- 703페이지: success 312 / partial 376 / failed 15. 순서 사유로 보존되는 섹션은 고정된 9개 그대로(블록 경계 검사로 새로 걸린 정상 섹션 없음).


## type01 제목 위치 결정 반영 (사용자 결정: 원본 순서)

- 결정: 원본 type01의 **제목 → 이미지 → 설명** 순서를 따른다(2026-11-16, 선택지 2).
- 출력: 이미지가 있고 원본에서 제목이 이미지보다 앞이면 제목을 이미지 위로 올린다.
  - 섹션 머리글 자리가 비어 있으면 호스트 머리글(`header.mig-header > strong.mig-title`)로.
  - 이미 "작은 글 + 제목" 머리글이 있으면 이미지 바로 위 글 묶음(`.mig-text-wrap > strong.mig-title`)으로.
  - 원본에서 제목이 이미지 뒤였거나(`titleAfterImage`) 이미지가 없으면 지금처럼 이미지 아래 글 묶음.
- 순서 검사의 type01 예외(검사용 출력에서만 제목을 앞에 두던 것)를 **없앴다**. 예외 없이 실제 type01 섹션이 모두 순서 검사를 통과한다.
- 스냅샷 변화는 `fixtures/types/type01/pc-mo.expected.html`의 제목 위치 하나(글 묶음 → 머리글).
- Chromium 확인(호스트 CSS): 제목이 이미지 위 머리글로, 원본 `<em>` 강조색 유지, 모바일 넘침 없음.
- 검증: `npm test` 867 passed, `npm run test:browser` 192 passed, lint·typecheck 오류 없음. 703페이지 success 320 / partial 368 / failed 15, 순서 사유 보존 9개(변화 없음).


## 6차 재검수(`5e1d49b`) 지적 반영 — 순서 비교를 덩어리 단위·화면별로

지금까지 순서 비교를 지적마다 덧대 왔다(문자열 → 토큰 → 경계 위치 → 이미지 묶음). 두 지적은 그 방식의 한계였으므로 비교 자체를 다시 짰다(`packages/core/src/convert/convert-document.ts` `segments`, `matchSegments`).

1. **화면별 비교(I-2)**: 원본과 출력을 **PC 화면에 보이는 것**과 **모바일 화면에 보이는 것**으로 각각 만들어 비교한다. 화면 전용 표시는 요소 자신의 클래스로 판정한다(원본 `d-lg-block`/`d-lg-none` 등, 출력 `common-display-pc`/`-mo`, 공통 `ownDevice`).
   - 동시에 보이는 독립 이미지(아이콘 목록과 큰 이미지)의 앞뒤 변경 → 같은 화면 안의 순서가 달라 검출.
   - PC/MO 대안 쌍 → 각 화면에 하나씩만 남아, 원본 나열 순서나 링크가 달라도 같게 비교. 이전의 "같은 링크 아래 연속 이미지" 짐작은 없앴다.
2. **덩어리 단위 비교(I-1)**: 블록 요소가 글 덩어리를 나눈다(`<br>`은 나누지 않음). 출력 덩어리 하나하나가 원본의 **연속된 덩어리 몇 개를 이어 붙인 것**과 정확히 같아야 한다. 문단 둘 → 줄바꿈 한 문단, 머리글 두 블록 → 줄 안 요소 묶음 같은 합침은 허용되고, 제목·본문이 자리를 바꾸면 줄바꿈 유무와 상관없이 맞지 않는다. 이전의 경계 위치 집합 비교는 없앴다.

### 화면별 비교로 드러난 기존 문제: 한쪽 화면 전용 이미지
원본에서 한 장뿐인 이미지가 PC 전용(`d-none d-lg-block`)이면 원본 모바일 화면에는 이미지가 없다. 그런데 출력은 한 장짜리 이미지를 화면 구분 없이 내보내 **모바일에서도 보였다**(실제 type24 3개 섹션에서 검출).
- 이미지 쌍에 `only: 'pc' | 'mo'`를 두어, 한 장뿐이고 원본에서 **표시 클래스로** 한쪽 화면 전용이었으면 출력도 그 화면에서만 보이게 한다(`common-display-pc/mo`).
- 파일 이름(`_m.png`)으로 짐작한 PC/MO는 칸 배정에만 쓰고 숨기는 근거로 쓰지 않는다(원본 브라우저는 파일 이름과 무관하게 보여 준다). 처음에 이 구분을 놓쳐 type16 아이콘을 숨겼다가 진짜 원본 컴포넌트 검사로 잡아 고쳤다.
- 실제 703페이지에서 `only`가 붙은 이미지: 3개(모두 PC 전용).

### 검증
- 새 테스트 3개(Codex 입력 그대로)는 수정 전 모두 실패.
- `npm test` 870 passed, `npm run test:browser` 192 passed, lint·typecheck 오류 없음.
- 스냅샷 변화: `fixtures/types/type01/bg-single.expected.html`의 PC 전용 이미지에 `common-display-pc` 추가(원본 PC 전용).
- 703페이지: success 320 / partial 368 / failed 15, 순서 사유 보존 9개(type01 8, type10 1, 변화 없음).

## 7차 재검수(`5f2b966`) 지적 반영

### I-1. 표시 클래스를 하나만 보고 화면 전용으로 판정 → `d-lg-block` 단독 이미지가 모바일에서 사라짐
- 원인: PC 표시 이름(`d-lg-block` 포함) 중 하나라도 있으면 PC 전용으로 봤다. Bootstrap 표시 클래스는 기본값 + 화면 폭별 덮어쓰기라, `d-lg-block` 하나만으로는 모든 화면에서 보인다. 출력과 순서 검사가 같은 판정을 써서 손실도 검출되지 않았다.
- 수정(`packages/core/src/parse/common.ts` `ownVisibility`, `visibilityOf`): Bootstrap 표시 클래스(`d-{none,block,inline-block,flex …}`, `d-{sm,md,lg,xl}-…`)를 규칙대로 계산해 **모바일(768 미만)·태블릿(768~991)·PC(992 이상)** 세 폭의 보임을 구한다. 그 밖의 표시 이름(`pc`, `mo`, `common-display-pc/mo` 등)은 PC 전용·모바일(태블릿 포함) 전용. 조상의 숨김도 합친다.
  - 이미지 `only`: "PC에서만" → `pc`, "모바일·태블릿에서만" → `mo`. 그 밖의 조합(태블릿에서만 등)은 출력으로 표현할 수 없어 `only`를 두지 않고, 화면별 순서 검사가 차이를 찾아 원본을 보존한다.
  - 순서 검사도 같은 함수로 **세 화면**을 비교한다(출력의 `common-display-mo`는 1024 미만이라 태블릿에서 보임).
- 검수 표의 세 입력: `d-lg-block` → 모든 화면(only 없음), `d-none d-lg-inline-block` → PC 전용, `d-none d-md-block d-lg-none` → 원본 보존(fallback).
- 알려진 차이: 원본 PC 경계는 992px, 호스트 출력은 1024px이다(992~1023px에서 출력은 모바일 쪽 내용을 보임). 호스트 규칙이라 그대로 둔다.

### I-2. 덩어리 합치기가 제목·본문 역전을 가림
- 원인: 출력 덩어리 하나를 원본 연속 덩어리 여럿에 대응시킬 때, 출력에서 이어 붙인 자리에 실제 구분이 있는지 보지 않았다(본문 "검사"+"검사"를 제목 "검사검사"에 대응).
- 수정: 출력 덩어리 안의 **구분 자리**(`<br>`, 줄 안 요소의 시작·끝)를 기록하고, 원본 덩어리를 합칠 때 이어 붙인 자리마다 구분이 있어야 한다. 문단 둘 → 줄바꿈으로 이은 문단, 머리글 작은 글 + 제목(span + strong)은 통과.

### 검증
- 새 테스트 6개(Codex 입력·표의 세 행·정상 대조) 중 수정 대상 4개는 수정을 되돌리면 실패.
- `npm test` 876 passed, `npm run test:browser` 192 passed, lint·typecheck 오류 없음, 기존 스냅샷 변화 없음.
- 703페이지: success 320 / partial 368 / failed 15, 순서 사유 보존 9개(변화 없음), `only`가 붙은 실제 이미지 3개(모두 PC 전용, 변화 없음).

## 8차 재검수(`00f2827`) 지적 반영

### I-1. 화면마다 대표 폭 하나(0·800·1100)만 봐서 sm·xl 구간의 숨김을 놓침
- 원인: `d-block d-xl-none`(1200 이상에서 숨김), `d-block d-sm-none d-md-block`(576~767에서 숨김)은 세 화면 분류 안에서 폭에 따라 보였다 숨었다 하는데, 대표 폭에서는 모두 보이는 것으로 나왔다. 출력은 모든 폭에서 보였고 순서 검사도 같은 판정이라 무경고 success였다.
- 수정(`packages/core/src/parse/common.ts` `ownVisibility`): 화면마다 덮는 Bootstrap 구간의 시작점을 모두 평가한다(모바일 0·576, 태블릿 768, PC 992·1200). 한 화면 안의 구간끼리 결과가 다르면 `'mixed'`.
  - 출력은 화면 단위(PC / 모바일·태블릿)로만 숨길 수 있어 `'mixed'`는 옮길 수 없다. 순서 검사(`convert-document.ts` `partlyShown`)가 글이나 이미지를 담은 `'mixed'` 요소를 찾으면 사유를 남기고 원본을 보존한다. 조상의 `'mixed'`도 같다.
  - 이미지 `only`는 화면 전체가 확실히 보이거나 숨을 때만 붙인다.
- `d-none d-lg-block d-xl-block`처럼 구간이 화면 경계와 맞으면 그대로 PC 전용이다.

### I-2. 같은 폭 규칙 사이의 우선순위를 HTML 클래스 순서로 정함
- 원인: 같은 breakpoint의 규칙은 입력 문자열 뒤쪽 클래스가 이겼다. Bootstrap CSS에서는 같은 specificity·`!important`라 **CSS 선언 순서**가 정한다(`d-block d-none`과 `d-none d-block`은 같은 결과).
- 수정: 같은 breakpoint 안에서는 Bootstrap 4 `utilities/_display.scss` 선언 순서(none → inline → inline-block → block → table … → flex → inline-flex)로 정렬해 늦은 쪽이 이긴다. 원본 사이트의 `bootstrap.css`는 버전 표기가 없는데, `d-xl`이 최대 구간이고 Codex 대조 환경도 4.6.2라 Bootstrap 4 순서를 따른다(Bootstrap 5는 none이 마지막이라 결과가 반대).
- 검수 표의 네 입력: `d-block d-none`·`d-none d-block` → 모두 보임, `d-none d-lg-block d-lg-none`·`d-none d-lg-none d-lg-block` → 모두 PC 전용.

### I-3. 서식 요소(em) 경계를 구분 자리로 써서 제목·본문 역전이 통과
- 원인: 출력의 모든 줄 안 요소 경계를 구분 자리로 기록해, 제목 `검사<em>검사</em>`의 em 시작을 본문 두 문단의 이음매로 썼다.
- 수정(`segments`): 구분 자리는 `<br>`, **호스트 역할 클래스(`mig-*`)가 있는 줄 안 요소**(머리글 작은 글·제목 등, 호스트 CSS가 줄을 나눔), **인라인 스타일로 블록이 되는 요소**(정렬을 옮긴 `<span style="display: block">`)의 경계뿐이다. em·strong·b·i·span 같은 서식 요소는 원본에서 옮긴 클래스(`text-point` 등)가 있어도 줄을 나누지 않으므로 구분 자리가 아니다.
- 한 문단 안의 서식, 문단 둘 → 줄바꿈으로 이은 문단, 머리글 작은 글 + 제목은 지금처럼 통과.

### 검증
- 새 테스트 14개: Codex 입력 그대로, 같은 유형의 변형(`d-none d-sm-block`, 조상의 구간 숨김, strong·span·b/i·클래스 있는 span 경계), 정상 대조. 수정 대상 10개는 수정을 되돌리면 실패.
- 기존 테스트 하나(`review-fixes.test.ts` 블록 정렬 span)가 첫 수정안의 오탐을 잡아 `display: block` 스타일 규칙을 추가했다.
- `npm test` 890 passed, `npm run test:browser` 192 passed, lint·typecheck 오류 없음, 기존 스냅샷 변화 없음.
- 703페이지: success 320 / partial 368 / failed 15, 순서 사유 보존 9개(변화 없음). 실제 페이지의 sm 클래스는 1개 파일(`13267/0210_분만전검사.html`, `d-sm-block`)뿐이고 결과 변화가 없다.

## 9차 재검수(`684c505`) 지적 반영

### I-1. 부모가 그 화면 전체를 숨기는데 자식 자신의 폭 구간 변화만 보고 원본 보존
- 원인: `partlyShown`이 요소 자신의 클래스만 봤다. 부모 `d-none d-lg-block` 안의 이미지 `d-block d-sm-none d-md-block`은 모바일에서 부모가 늘 숨기므로 sm 변화가 화면에 나타나지 않는데도 거부했다(이미지 `only`는 조상까지 합쳐 PC 전용으로 맞게 판정하고 있었다).
- 수정(`convert-document.ts`): 표시 클래스가 있는 요소마다 **조상까지 합친 표시**(`visibilityOf`)로 판정하고, 그 화면에서 `'mixed'`이면서 **그 화면에서 숨지 않은 글·이미지가 안에 있을 때만** 원본을 보존한다(`hasContentIn`: 그 화면에서 숨는 자손은 뺀다).
- 부모를 뺀 같은 자식은 여전히 원본 보존. 폭 구간이 바뀌는 부모 안에 그 화면에서 숨는 내용만 있으면 통과.

### I-2. 입력에서 온 `mig-*` 클래스가 호스트 역할 경계로 쓰임
- 원인: 구분 자리 판정이 클래스 이름의 `mig-` 접두사만 봤고, 서식 정리(rich-text)는 입력의 클래스를 그대로 남겼다.
- 수정(`packages/core/src/html/rich-text.ts`): `mig-*`는 렌더러만 붙이는 호스트 역할 클래스로 보고 **입력에서 오면 지운다**. 그래서 출력의 `mig-*`는 모두 렌더러가 붙인 역할이다. 원본 서식이 호스트 역할 스타일(예: `mig-title` 글자 크기)을 받는 것도 함께 막는다. 다른 클래스(`text-point` 등)는 그대로.
- 실제 원본(703페이지, fixture)에는 `mig-` 클래스가 없어 출력 변화가 없다.

### I-3. Bootstrap 4에 없는 `d-*-grid`·`inline-grid`·`contents`를 표시 규칙으로 적용
- 수정(`common.ts` `D_ORDER`): Bootstrap 4 `_display.scss`에 있는 9개 값(none, inline, inline-block, block, table, table-row, table-cell, flex, inline-flex)만 둔다. 그 밖의 이름은 Bootstrap 4 CSS에 규칙이 없어 아무것도 바꾸지 않는다(`d-none d-lg-grid` → 모든 화면에서 숨김).
- Bootstrap 버전은 여전히 잠정 가정이다(원본 `bootstrap.css` 확보 실패, 정황상 4).

### 검증
- 새 테스트 10개(Codex 입력 그대로, 대조 입력, 같은 유형 변형). 수정 대상 7개는 수정을 되돌리면 실패.
- `npm test` 898 passed, `npm run test:browser` 192 passed, lint·typecheck 오류 없음, 기존 스냅샷 변화 없음.
- 703페이지: success 320 / partial 368 / failed 15, 순서 사유 보존 9개(변화 없음).

## 10차 재검수(`4877115`) 지적 반영

### I-1. 부모·자식이 서로 다른 폭 구간에서 숨는 경우를 합치지 못해 PC 전용 입력을 거부
- 원인: 요소마다 먼저 화면별 요약(`'mixed'`)으로 줄인 뒤 조상과 합쳤다. 부모 `d-block d-sm-none d-lg-block`(576~991 숨김)과 이미지 `d-none d-sm-block`(0~575 숨김)은 합치면 정확히 PC 전용인데, 요약 단계에서 어느 구간에서 숨는지가 사라져 계산할 수 없었다.
- 수정(`packages/core/src/parse/common.ts`): 표시를 **Bootstrap 폭 구간 5개(0·576·768·992·1200)마다의 보임**으로 계산한다(`ownSpans`). 조상과는 구간마다 먼저 합치고(`spansOf`), 화면별 요약(`toViews`)은 마지막에 한다. `ownVisibility`·`visibilityOf`는 이 위에서 동작한다.
- 수정(`convert-document.ts`):
  - `partlyShown`은 **내용 자체**(글 조각·이미지)의 실제 보임으로 판정한다. 합친 결과가 한 화면 안에서 폭에 따라 바뀔 때만 원본 보존.
  - 화면별 순서 비교(`segments`)도 요소 자신이 아니라 조상까지 합친 실제 보임으로 뺀다(같은 입력에서 순서 검사가 반대로 거부하지 않게).
- Codex 입력은 `only=pc`로 정상 변환, 반대 방향(합치면 모바일·태블릿 전용)도 `only=mo`. 합친 뒤에도 한 화면 안에서 바뀌는 입력(부모만 sm 구간 숨김, 이미지 `d-xl-none`, 글 `d-xl-none`)은 원본 보존.

### 검증
- 새 테스트 4개(Codex 입력, 반대 방향, 합친 뒤에도 남는 구간 변화, 글). 수정 대상 2개는 수정을 되돌리면 실패.
- `npm test` 902 passed, `npm run test:browser` 192 passed, lint·typecheck 오류 없음, 기존 스냅샷 변화 없음.
- 703페이지: success 320 / partial 368 / failed 15, 순서 사유 보존 9개(변화 없음).

## 11차 재검수(`bd084d0`) 지적 반영

### I-1. 출력에 남은 Bootstrap `d-none`을 호스트 CSS가 모르는데 순서 검사는 숨는다고 봄
- 원인: 서식 글(rich text)은 원본 클래스(`d-none` 등)를 남긴다. 순서 검사는 원본과 출력을 같은 Bootstrap 규칙으로 읽어, 출력의 `<span class="d-none">`도 숨는다고 보고 통과시켰다. 호스트 CSS(`reference/host-style.css`)에는 `.d-none`·`.d-lg-block` 같은 표시 규칙이 없어 실제 출력에서는 숨긴 글이 나타난다.
- 수정: 출력 쪽은 **호스트 CSS의 표시 규칙**으로만 읽는다(`common.ts` `hostVisibilityOf`). 호스트에 있는 것은 `common-display-pc`(1024 이상만)·`common-display-mo`(1024 미만만) 둘뿐이고, 다른 클래스는 아무것도 숨기지 않는다. 원본 쪽은 지금처럼 Bootstrap 규칙(`visibilityOf`)으로 읽는다.
- 결과: 원본에서 숨던 서식 글이 출력에서 보이게 되면 순서 검사가 차이를 찾아 원본을 보존한다(`d-none`, `d-none d-lg-block`, `d-lg-none` span 모두). 글이 없는 줄바꿈(`<br class="d-none d-lg-block">`)은 그대로 통과. 렌더러가 붙이는 `common-display-pc/mo`(한쪽 화면 전용 이미지)는 그대로 인정된다.
- 서식 글의 표시 클래스를 호스트 클래스로 옮기는 방법은 쓰지 않았다. `common-display-*`는 `display: block !important`라 줄 안 글에 붙이면 줄이 나뉜다.

### 검증
- 새 테스트 5개(Codex 입력 두 가지와 `d-lg-none` 변형, 글 없는 줄바꿈, 렌더러의 호스트 표시 클래스). 수정 대상 3개는 수정을 되돌리면 실패.
- `npm test` 907 passed, `npm run test:browser` 192 passed, lint·typecheck 오류 없음, 기존 스냅샷 변화 없음.
- 703페이지: success 320 / partial 368 / failed 15, 순서 사유 보존 9개(변화 없음).

## 12차 재검수(`3eb7113`) 지적 반영

### I-1. 같은 요소에 `common-display-pc`와 `common-display-mo`가 함께 있으면 모든 화면에서 숨는다고 판정
- 원인: `hostVisibilityOf`가 두 클래스를 서로 다른 숨김으로 보고 합쳤다. 호스트 CSS(`reference/host-style.css` 357~375줄)는 두 화면 모두 `common-display-pc` 규칙이 `common-display-mo` 규칙보다 뒤에 있고 우선순위(specificity·`!important`)가 같아, 한 요소에 둘 다 있으면 pc 쪽이 이긴다(= PC 전용).
- 수정: 같은 요소 안에서는 CSS 선언 순서로 먼저 정한다. `common-display-pc`가 있으면 PC 전용, 없고 `common-display-mo`만 있으면 모바일·태블릿 전용. 그다음 조상·자손 사이의 숨김을 합친다(부모 mo + 자식 pc는 지금처럼 모든 화면에서 숨음).
- 원본 쪽 판정(표시 이름은 PC 표시를 먼저 봄)과도 같은 결과다.

### 검증
- 새 테스트 4개(Codex 입력과 클래스 순서를 바꾼 입력, 부모·자식에 나뉜 경우와 같은 요소인 경우의 판정, 두 클래스가 있는데 원본은 모바일 전용인 입력). 수정 대상 3개는 수정을 되돌리면 실패.
- `npm test` 911 passed, `npm run test:browser` 192 passed, lint·typecheck 오류 없음, 기존 스냅샷 변화 없음.
- 703페이지: success 320 / partial 368 / failed 15, 순서 사유 보존 9개(변화 없음).

## 블록 순서 변환 검수(`16f0048`) 지적 반영

### I-1. 시작 번호(start)가 화면에서는 1부터
- 원인: 호스트 번호 목록은 ol의 기본 번호가 아니라 `::before`의 `counter(mig-counter)`를 그린다(`reference/host-style.css` 5155~5180줄). HTML `start` 속성은 이 카운터를 바꾸지 않는다.
- 수정(`types/blocks.ts`): `start`가 있으면 ol에 `counter-reset: mig-counter (start − 1)`을 함께 준다. 호스트 규칙에 `!important`가 없어 인라인 값이 이긴다.

### I-2. `reversed`·항목별 `value`가 사라짐
- 호스트 카운터로는 역순과 항목별 번호를 안전하게 그릴 수 없어, 이 속성이 있으면 블록 순서 변환이 원본을 보존한다(실제 703페이지에는 둘 다 없다).

### I-3. 한쪽 화면 전용 항목의 글만 숨어 빈 번호가 남음
- 수정: 항목(li) 전체가 한쪽 화면 전용이면 항목에 `only`를 두고 `li.mig-item.common-display-pc/mo`로 출력한다. 숨은 항목은 카운터도 올리지 않아 다음 번호가 밀리지 않는다.

### M-1. 보존한 표 열 너비를 "버린 style"로 경고
- type26의 걸러내기를 공통 함수(`withoutKeptColWidths`)로 빼서 블록 순서 변환에도 쓴다.

### 검증
- 새 테스트 5개(Codex 입력 그대로)는 수정을 되돌리면 모두 실패. 브라우저 검사 2개 추가(1100/360px: ol의 계산된 `counter-reset`이 `mig-counter 2`, PC 전용 항목은 360px에서 항목째 숨음).
- `npm test` 940 passed, `npm run test:browser` 196 passed, lint·typecheck 오류 없음.
- 703페이지: success 326 / partial 363 / failed 14, 원본 보존 50개(변화 없음).

## 블록 순서 재검수(`38ff8cf`) 지적 반영

### I-1. 중첩 번호 목록의 start가 그리는 카운터와 다른 카운터에 들어감
- 호스트는 `ol > li > ol`로 바로 이어진 번호 목록의 단계마다 다른 카운터를 그린다(1단계 `mig-counter`, 2단계 `mig-counter-sub`, 3단계 `mig-counter-sub-sub`; `reference/host-style.css` 5210~5260줄).
- 수정(`types/blocks.ts`): 출력할 때 바깥 번호 목록 단계를 세어 그 단계의 카운터에 시작값을 준다. 글머리 목록 안의 번호 목록은 호스트 규칙대로 다시 1단계(`mig-counter`)다.

### I-2. 모든 화면에서 숨은 빈 항목이 번호를 차지함
- 수정: 모든 화면에서 숨은 **빈** 항목은 옮기지 않는다(원본에서도 번호·자리를 차지하지 않는다). 글·이미지가 든 숨은 항목은 남겨 두어 글 순서 검사가 차이를 찾아 원본을 보존한다.

### 검증
- 새 테스트 4개 중 수정 대상 2개는 수정을 되돌리면 실패. 브라우저 검사에 중첩 목록(계산된 `counter-reset`이 `mig-counter-sub 3`이고 항목이 `counter(mig-counter-sub…)`를 그림)과 숨은 빈 항목(보이는 항목 1개)을 추가.
- `npm test` 944 passed, `npm run test:browser` 196 passed, lint·typecheck 오류 없음.
- 703페이지: success 326 / partial 363 / failed 14, 원본 보존 50개(변화 없음).

## 블록 순서 3차 검수(`f687c61`) 지적 반영

### I-1. 모든 화면에서 숨은 항목에 빈 목록·빈 표가 있으면 번호가 남음
- 원인: "숨은 빈 항목" 판정이 읽은 블록 수(0개)로만 봐서, 빈 `ul`·빈 칸뿐인 표처럼 글 없는 구조 블록이 있으면 항목을 남겼다.
- 수정(`types/blocks.ts` `hiddenAndEmpty`): 모든 화면에서 숨고(조상 포함) 글·이미지가 하나도 없는 요소는 **어디서든**(목록 항목이든 섹션 안 블록이든) 옮기지 않는다. 원본 화면에 아무것도 남기지 않기 때문이다. 글·이미지가 든 숨은 요소는 지금처럼 남겨 글 순서 검사가 원본을 보존하게 한다.

### 검증
- 새 테스트 5개(빈 목록·빈 표·빈 중첩 요소가 든 숨은 항목, 항목 밖의 숨은 빈 목록·표, 이미지가 든 숨은 항목). 수정 대상 4개는 수정을 되돌리면 실패.
- `npm test` 949 passed, `npm run test:browser` 196 passed, lint·typecheck 오류 없음.
- 703페이지: success 326 / partial 363 / failed 14, 원본 보존 50개(변화 없음).

## 블록 순서 4차 검수(`6de0666`) 지적 반영

### I-1. 표 안의 숨긴 빈 칸·행이 출력에 나타남
- 원인: 숨은 빈 요소 제외 규칙은 블록·목록 항목에만 적용되고, 표는 `readTable`에 맡겨 칸·행의 표시를 보지 않았다. 빈 칸·행은 글 순서 검사에도 나타나지 않는다.
- 수정(`types/type26.ts` `readTable`, type26 프리셋과 블록 순서 공통): 표 안의 행·칸·묶음(`caption`·`colgroup`·`col`·`thead`·`tbody`·`tfoot`·`tr`·`th`·`td`)에 화면에 따라 숨는 표시가 하나라도 있으면 원본을 보존한다. 칸을 빼거나 숨기면 열 위치와 병합이 바뀌어 안전하게 옮길 수 없다. 표 전체가 한쪽 화면 전용인 경우는 지금처럼 옮긴다.
- 실제 703페이지에는 해당 표가 없어 결과 변화가 없다.

### 검증
- 새 테스트 5개(숨은 빈 칸·빈 행·PC 전용 칸, type26 프리셋, 표 전체 PC 전용). 수정 대상 3개는 수정을 되돌리면 실패(PC 전용 칸은 글 순서 검사가 이미 잡고 있었다).
- `npm test` 954 passed, `npm run test:browser` 196 passed, lint·typecheck 오류 없음.
- 703페이지: success 326 / partial 363 / failed 14, 원본 보존 50개(변화 없음).

## 본문 앞뒤 설명 검수(`a448bc9`) 지적 반영

### I-1. 설명을 출력하지 않는 타입(type01 등)에서 편집기 입력이 데이터에만 남음
- 원인: 편집기가 전략(preset)만 보고 설명 칸을 보였는데, type00·type01과 섹션마다 일반 모드가 되는 type33 Q&A는 자체 렌더러라 `section.notes`를 출력하지 않는다.
- 수정:
  - `rendersNotes(def, section)`(`types/notes.ts`, core에서 내보냄): 표시 글을 넣어 **실제로 렌더해 보고** 설명이 출력되는지 판정한다. 타입 목록을 따로 두지 않아 렌더러와 어긋나지 않는다.
  - 편집기는 `rendersNotes`가 참인 섹션에만 설명 칸을 보인다.
  - `renderPage`는 설명이 있는데 출력하지 않는 섹션(직접 만든 JSON 등)에 `NOTES_NOT_RENDERED`(warn)를 남긴다.

### I-2. 떼어 낸 설명 상자 안의 위험한 링크·버린 style 경고가 사라짐
- 원인: 타입 parse(scanSection)는 상자를 뗀 DOM만 훑었다.
- 수정(`attemptWithNotes`): 떼어 낸 상자들만 따로 `scanSection`으로 훑어 진단을 더한다. 실제 703페이지에서 1개 파일(`10429/08_01_맞춤형영양수액클리닉.html`, 설명 상자의 `word-wrap` style 제거)이 success → partial이 됐다(정상 경고).

### M-1. 섹션 데이터 설명 칸과 공통 설명 칸의 id가 겹침
- 수정: `FieldForm`에 `idPrefix`를 두고 공통 설명 칸은 `section-notes.` 접두사를 쓴다.

### 검증
- 새 테스트 7개(core 6: type01·type00 미출력 판정과 경고, type09 출력, 링크·style 경고 / 편집기 e2e 1: type01에는 칸 없음, type26에서 공통 설명 라벨이 자기 칸에 포커스, 입력이 HTML에 반영, `id="intro"` 1개). 수정을 되돌리면 core 4개·e2e 1개 실패.
- `npm test` 968 passed, `npm run test:browser` 197 passed, lint·typecheck 오류 없음.
- 703페이지: success 345 / partial 344 / failed 14, 블록 순서 306, 원본 보존 50개.
