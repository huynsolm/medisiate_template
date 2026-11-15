# 3단계(P2·P3) 검수 지적 반영

작성: 2026-11-15. 대상 검수: Codex `docs/review-stage3.md` (판정: 수정 후 재확인 필요, Important 4).

> 1차 반영(`86e0cec`)은 검수 원문을 읽지 못해 사용자가 전한 요약을 직접 재현해 고쳤다.
> 재검수(`0aea169`, `docs/review-stage3.md`)에서 원문 입력과 대조해 4건 모두 수정이 확인되었고, 새 지적 3건은 4장에 반영했다.

## 1. 지적별 반영

### I-1. 문단 출력 누락 (type15)
- 재현: type15 칸에 글머리 목록과 `p.cms-description`이 **함께** 있으면, 문단을 데이터에는 읽지만(그래서 fallback도 안 됨) 출력에서는 글머리만 그렸다. 문단이 경고 없이 화면에서 사라졌다.
- 수정: 둘 다 있으면 둘 다 그린다(글머리 → 문단 순서). `packages/core/src/types/type15.ts`
- 일반화 검사: P2·P3 11개 타입 모두에 대해, 편집기의 **모든 글 칸을 서로 다른 값으로 채우고 출력에 그 값이 모두 나오는지** 확인하는 테스트를 추가했다. type15 외 다른 타입에서는 누락이 없었다.

### I-2. 셀 병합값 변경 (type26)
- 재현: `colspan="25"`, `rowspan="0"` 등 2~20 밖의 값은 경고 없이 버려져 표 모양이 바뀌었다.
- 수정: HTML 규격 범위를 그대로 따른다. colspan 1~1000, rowspan 0~65534(0은 "그룹 끝까지"). 1은 기본값이라 생략.
  범위 밖·숫자가 아닌 값(`0`, `2000`, `2x`, `-1`, `99999`, 빈 값)은 브라우저가 다른 값으로 해석하므로 **바꿔 옮기지 않고 섹션 전체를 fallback으로 보존**한다(사유에 해당 속성 표시).
- 편집기 숫자 칸에 min/max를 붙였다.

### I-3. 셀 내부 문단·목록 경계 소실 (type26)
- 재현: `<td><p>첫 문단</p><p>둘째 문단</p><ul><li>a</li><li>b</li></ul></td>` → `<td>첫 문단둘째 문단ab</td>`. 글이 이어 붙었다.
- 수정:
  - 칸 안의 문단(`p`, `div`, 중첩 포함)은 `<br>`로 이어 경계를 지킨다. 문단이 하나면 그대로 글.
  - 목록·표·제목·인용·pre·figure가 칸 안에 있거나, 문단과 문단 밖 글이 섞인 칸은 `<br>`로 나타낼 수 없으므로 **섹션 전체를 fallback으로 보존**한다.

### I-4. 빈 문자열 편집 오류
- 재현: 편집기는 비운 칸을 데이터에서 지운다(`apps/web/src/state.ts`). type26에서 열 너비를 비우거나, 병합 칸에 1을 넣거나, 칸 글을 비우면 스키마 검증이 실패해 섹션이 "데이터 검증 실패" fallback으로 바뀌었다.
- 수정:
  - type26 열 너비: 비우면 `auto`. 앞뒤 공백은 지운다(검증은 그대로 `auto` 또는 CSS 길이만).
  - type26 병합: 비움·`''`·1은 "병합 없음", 숫자 문자열은 숫자로.
  - type26 칸 글, type07·09·10·11·15 항목 글: 비우면 `''`.
- 일반화 검사: 11개 타입 모두 "반복 항목의 글을 모두 비운 상태"가 검증을 통과하는지 테스트. 편집기 경로(reducer → 미리보기 렌더)로도 type26을 확인하고, 수정 전 코드에서는 실패함을 확인했다.

## 2. 검증

- 추가 테스트: `packages/core/test/stage3-review.test.ts`(46개), `apps/web/test/state.test.ts`(1개).
- 처음 실행에서 27개 실패(재현) → 수정 후 전부 통과.
- 전체: `npm test` **294** passed · 1 skipped(inventory, `cms/` 필요), `npm run test:browser` 45 passed, lint·typecheck 오류 없음. (처음에 293으로 잘못 적었다. 재검수 R-M-1로 정정)
- 기존 스냅샷(`fixtures/types/*/original.expected.*`) 변화 없음.

## 3. 남은 판단 (재검수 때 의견 부탁)

- type15에서 원본이 "문단 → 글머리" 순서였어도 출력은 "글머리 → 문단"이다. 원본 도구는 둘 중 하나만 만들기 때문에 순서 정보를 데이터에 두지 않았다.
- 칸 안 여러 문단을 `<br>`로 잇기 때문에 문단 사이 여백은 사라진다(글 경계는 유지).

## 4. 재검수(`0aea169`) 지적 반영

### R-I-1. section/article로 감싼 표 칸의 문단 경계 소실
- 재현: 검수 문서의 입력 `<td><section><p>FIRST</p><p>SECOND</p></section></td>`(article도 같음) → `success`, `<td>FIRSTSECOND</td>`.
- 원인: 경계를 지키는 처리가 p·div 상자만 따라 내려갔다. 다른 상자 안의 문단은 `richFrom()`이 이어 붙였다.
- 수정(`packages/core/src/types/type26.ts`):
  - 문단을 감싸기만 하는 상자(`div`, `section`, `article`, `aside`, `header`, `footer`, `main`, `nav`, `address`)를 모두 따라 내려가 문단마다 `<br>`로 잇는다.
  - 칸 안의 요소를 **허용 목록 방식**으로 바꿨다. 위 블록 상자와 줄 안 요소(`em`, `strong`, `b`, `i`, `u`, `sup`, `sub`, `span`, `br`, `a`, `small`, `mark`, `font`, `img`) 밖의 요소(목록·표·제목·`hr`·`details`·`fieldset` 등)가 있으면 섹션 전체를 fallback으로 보존한다. 이전에는 "모르는 블록"이 막아야 할 목록에 없으면 그대로 통과했다.
  - `span` 같은 줄 안 요소 안에 블록이 숨은 경우도 fallback.
- 검수 원문 입력 그대로 실행: section·article 모두 `<td>FIRST<br>SECOND</td>`.

### R-I-2. 병합 값의 Number 강제 변환
- 재현: `rowspan: { "toString": "x" }` → 예외로 웹 미리보기 전체가 빔. `false` → `rowspan="0"`(행 그룹 끝까지 병합), `[2]` → 2로 받아들임.
- 같은 문제를 다른 숫자 칸에서도 찾음: type09·type25 `perRow`의 `z.coerce.number()`는 객체 예외는 잡지만 `[3]` → 3으로 경고 없이 받아들였다.
- 수정:
  - 공통 `toNumberInput()`(`packages/core/src/schema/page.ts`): 숫자와 숫자 문자열(`'3'`, `' 3 '`)만 숫자로 바꾸고, 그 밖의 값(boolean, 배열, 객체, `'0x10'`)은 그대로 넘겨 다음 검증에서 거부되게 한다. type26 병합, type09·type25 `perRow`가 이것을 쓴다.
  - `renderPage()`(`packages/core/src/page/render-page.ts`): 스키마 검증이 예외를 던져도 그 섹션만 `INVALID_DATA` fallback으로 격리하고 나머지 섹션은 계속 출력한다(앞으로 다른 타입의 전처리 실수에 대한 방어).
- 검수 문서의 JSON 모델 그대로: `INVALID_DATA`, 잘못된 섹션만 fallback, 정상 섹션의 `KEEP_VISIBLE` 유지.

### R-M-1. 테스트 개수
- 3장의 개수를 294로 정정했다.

### 재검수 반영 검증
- `packages/core/test/stage3-review.test.ts`에 26개 추가(블록 상자 8종, fallback 4종, 잘못된 숫자 입력 10종, 정상 숫자 문자열 3종, 예외를 던지는 스키마 격리 1종). 수정 전 19개 실패 → 수정 후 전부 통과. (`hr` 사례는 수정 전에도 fallback이었다.)
- 전체: `npm test` 320 passed · 1 skipped, `npm run test:browser` 45 passed, lint·typecheck 오류 없음.

### 남은 판단에 대한 정리
- type15 문단·글머리 순서: 재검수 의견대로 "문서화된 순서 정규화"로 둔다. 원문 입력(문단 → 글머리)을 그대로 옮긴다고 보고하지 않는다. 출력 순서는 항상 글머리 → 문단이다.
