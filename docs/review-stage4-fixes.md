# 4단계(P4) 검수 지적 반영

작성: 2026-11-15. 대상 검수: Codex `docs/review-stage4.md` (`0db22f1`, 판정: 수정 후 재확인 필요, Important 2).
검수 문서의 재현 입력을 그대로 실행해 증상을 확인한 뒤 고쳤다. 두 건 모두 **보고된 사례보다 범위가 넓어** P2·P3·P4 18개 타입 전체에 대해 검사를 넣었다.

## I-1. type16: 아이콘이 없으면 글이 30px 칸에 들어감

- 재현: 검수 문서 입력(아이콘 없는 항목)과 편집기 기본 데이터 모두 글 묶음 폭 30px.
- 원인: 호스트 격자가 `30px 1fr`인데 아이콘이 없으면 글 묶음이 유일한 자식이라 첫 칸으로 들어간다.
- 수정(`packages/core/src/types/type16.ts`): 아이콘이 없는 항목은 글 묶음에 `grid-column: 2`를 붙여 글 칸에 둔다(아이콘 있는 행과 줄이 맞음).
- 검사가 놓친 이유와 보강: 브라우저 검사가 이미지가 있는 원본만 봤다. `tests/visual/preset-layout.test.ts`에
  - **이미지를 모두 뺀 원본**으로 18개 타입 × PC/MO/에디터를 한 번 더 돌리고,
  - "60px 이하 글 상자에서 글이 여러 줄로 꺾이는지"(좁은 칸에 갇힌 글)를 모든 경우에 검사한다.
  - 수정 전에는 type16(이미지 없음) 세 화면만 실패했다. 다른 17개 타입은 이미지가 없어도 문제없음을 확인했다.
  - 처음에는 "글 요소 최소 폭"으로 쟀으나, 짧은 글머리(예: "목록 1")가 원래 좁은 것까지 걸려 "좁은 상자 + 줄 꺾임"으로 바꿨다.

## I-2. 글 요소 안의 여러 문단·목록이 경고 없이 이어 붙음

- 재현: 검수 문서 입력(type06 글머리 안 `<p>FIRST</p><p>SECOND</p>`, 중첩 목록)과 P4 7개 타입의 `div.cms-description > p + p` 모두 `FIRSTSECOND`, 경고 없음.
- 원인: `richFrom()`이 allowlist 밖 블록 태그를 경계 없이 풀었고, `finish()`의 텍스트 비교는 공백을 지우고 비교해 경계 손실을 알 수 없었다. 공통 도우미 문제라 **P2·P3 타입도 같은 상태**였다(새 테스트로 확인: 17개 타입 모두 실패).
- 수정:
  - `richFrom()`(`packages/core/src/parse/common.ts`): 안에 문단 블록(`p`, `div`, `section`, `article` 등)이 있으면 블록마다 줄바꿈(`<br>`)으로 잇는다. 블록 밖의 글도 따로 한 줄. 3단계에서 표 칸에 합의한 규칙과 같다.
  - `finish()`(`packages/core/src/parse/original.ts`): 원본 글 요소(`cms-description` · `cms-title` · `cms-thin-title` · `cms-eyebrow`) 안에 줄바꿈으로 나타낼 수 없는 구조(목록·표·제목 등, 허용 목록 밖 요소)나 줄 안 요소 속에 숨은 블록이 있으면 섹션 전체를 fallback으로 보존한다.
  - type26 칸도 같은 공통 규칙(`TEXT_BLOCKS`, `TEXT_INLINE`, `richFrom`)을 쓰도록 정리했다. 이 때문에 **"칸 안 글 + 문단"(`<td>앞 글<p>문단</p></td>`)은 이제 fallback 대신 `앞 글<br>문단`** 으로 옮긴다(경계는 유지). 해당 테스트 기대값을 바꿨다.
- 검수 문서 입력 그대로 실행: type06 글머리 문단 → `FIRST<br>SECOND`(success), 중첩 목록 → fallback(원본 보존), P4 7개 타입 `div > p + p` → 모두 `FIRST<br>SECOND`.
- 기존 원본 마크업 출력에는 줄바꿈이 새로 생기지 않는다(18개 타입 검사). 기존 스냅샷 변화 없음.

## 검증

- `packages/core/test/stage3-review.test.ts`: 18개 타입 × (글 요소 안 문단 → 줄바꿈, 글 요소 안 목록 → fallback), type06 글머리 2종, 원본에 줄바꿈이 새로 생기지 않음, 표 칸 "글 + 문단". 수정 전 36개 실패.
- `tests/visual/preset-layout.test.ts`: 108개(18 타입 × 3 화면 × 이미지 있음/없음). 수정 전 type16 이미지 없음 3개 실패.
- 전체: `npm test` 478 passed · 1 skipped(inventory, `cms/` 필요), `npm run test:browser` 120 passed, lint·typecheck 오류 없음.
