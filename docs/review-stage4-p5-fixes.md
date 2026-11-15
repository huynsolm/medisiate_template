# 4단계 P5 검수 지적 반영

작성: 2026-11-15. 대상 검수: Codex `docs/review-stage4-p5.md` (`5240b60`, 판정: 수정 후 재확인 필요, Important 1).

## I-1. 한 원본 글을 두 필드로 읽어 두 번 출력

- 재현: 검수 문서 입력 A(type22 짧은 목록 안에만 `p.cms-title`) → 카드 제목과 짧은 목록에 `FIRST` 두 번, B(type24 설명 안 `span.cms-title`) → 제목과 설명에 두 번. 둘 다 success, 경고 없음.
- 원인: 파서가 필드마다 "범위 안 첫 번째 해당 클래스"(`textOf`, 후손 검색)를 따로 읽어, 한 필드의 요소가 다른 필드의 요소 안에 있으면 같은 글을 두 번 담았다. `finish()`는 "남은 글"만 보고 "두 번 읽은 글"은 보지 않았다.
- **범위가 P5보다 넓다**: 같은 읽기 방식이 10여 개 타입에 있다. 일반 테스트(항목의 자기 제목을 지우고 설명 안에 제목·작은 글 클래스를 넣음)로 확인하니 **type02·03·04·25(P2·P3), type18·19(P4), type24**도 같은 글을 두 번 출력했다.
- 수정:
  1. **공통 방어(`finish`)**: `richFrom()`이 요소마다 읽은 횟수를 기록한다(자기 안 문단을 나누는 내부 재귀는 세지 않음). `finish()`가 섹션 안에서 **같은 요소를 두 번 읽었거나, 읽은 요소 안에 또 읽은 요소가 있으면** 섹션 전체를 fallback으로 보존한다(`packages/core/src/parse/common.ts` `duplicateReads`, `packages/core/src/parse/original.ts`). 이것으로 위 7개 타입과 앞으로 같은 실수를 하는 타입을 모두 막는다.
  2. **읽기 범위 정확히(type22·24)**: type22 제목은 글 묶음의 직접 자식만, type24 제목·설명은 설명 상자의 직접 자식만 읽는다. 검수 문서 입력 A·B는 fallback 대신 **정상 변환되고 글이 한 번만** 나온다.
- 기존 원본 마크업 결과는 바뀌지 않는다(스냅샷 변화 없음).

## 검증

- `packages/core/test/stage3-review.test.ts`: 입력 A·B(정상 변환 + 글 한 번), 24개 타입 × (설명 안 `cms-title` / `cms-eyebrow` / `cms-description`) "한 번 이하 또는 fallback". 수정 전 9개 실패(A·B + type02·03·04·25·18·19·24).
- 전체: `npm test` 670 passed · 1 skipped(inventory, `cms/` 필요), `npm run test:browser` 156 passed, lint·typecheck 오류 없음.
