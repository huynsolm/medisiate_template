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
