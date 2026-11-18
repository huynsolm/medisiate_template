# 3단계(P2·P3) 검수 요청

작성: 2026-11-15. 이 문서는 Codex 검수용이다. 검수 결과는 `docs/review-stage3.md`에 써 주세요. 코드를 고치지 말고, 판정과 재현 결과만 기록해 주세요.

## 1. 범위

- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`
- 범위: `0120908..c42b99e` (4커밋, 85파일, +3827/−31). 직전 검수(Windows 재검수 `0120908`) 이후 전부다.

| 커밋 | 내용 |
|---|---|
| `bf764a1` | I-10: Windows에서 파일 심볼릭 링크 권한(EPERM)이 없을 때만 해당 테스트 건너뜀 (`apps/cli/test/support/file-symlink.ts`). M-5: `npm run test:browser`가 추가 인자를 받으면 종료 코드 2로 거부 (`scripts/test-browser.mjs`) |
| `4c95651` | 원본 CMS 마크업 기준 fixture(`fixtures/original/type01~26.html`, type08 없음) 추가, type01이 원본 마크업에서 제목을 설명에 중복 넣던 문제 수정 |
| `4665888` | P2: type07·09·10·02·03 (원본 마크업 → 호스트 프리셋) |
| `c42b99e` | P3: type26·11·04·25·15·17, PC 배경 레이어 바탕색 공통 수정, 브라우저 배치 검사 확장 |

참고 문서: `docs/stage3-p2.md`, `docs/stage3-p3.md`, `docs/host-dom-contract.md`, `fixtures/original/README.md`, `docs/implementation-plan.md`(3단계 DoD).

## 2. 기준 자료에 대한 전제 (먼저 읽어 주세요)

- 원본 `cms/`(SVN)는 이 작업 환경에 없다. 사용자 지시에 따라 **biny 저장소의 cms-preview 타입 정의**(https://biny-gilt.vercel.app/cms-preview)를 원본 구조의 기준으로 삼았다. 출처와 생성 방법은 `fixtures/original/README.md`.
- 원본 `cms.css`는 받지 못했다(http 전용). 배경 변형 색상 등은 기존 1단계 매핑을 그대로 쓴다.
- type00·type27·type28은 기준 자료가 없어 이번 범위가 아니다. type27은 CLI 변환 테스트에서 "미지원 섹션" 예시로 쓴다.

## 3. 확인해 주실 것

### 3.1 기능 정확성 (타입별)
1. 원본 마크업(`fixtures/original/typeNN.html`) → 데이터가 빠짐없이 옮겨지는가. 기대값은 `packages/core/test/p2-types.test.ts`, `p3-types.test.ts`와 스냅샷 `fixtures/types/typeNN/original.expected.{json,html}`.
2. 출력이 `docs/host-dom-contract.md`의 호스트 선택자(자식 결합자 `>` 포함)와 맞는가. 특히 type07 `.mig-visual`이 `.mig-content`의 직접 자식인지, type15 하위 목록에 `type-dot`이 붙어 호스트 3열 격자가 걸리지 않는지.
3. 웹 편집기(`apps/web`)에서 새 타입의 필드를 고쳤을 때 저장·다시 렌더가 되는가. 특히 select 값이 문자열로 오는 type09 `perRow`, type25 `perRow`(`z.coerce`), type26 `colWidths`(`{ width }` 객체 목록).

### 3.2 조용한 손실 방지 (가장 중요)
- `packages/core/src/parse/original.ts`의 `finish()`는 (a) 담지 못한 텍스트, (b) 섹션 이미지 수 − 데이터에 담긴 이미지 수를 보고 남는 게 있으면 `fallbackReason`을 붙여 섹션 전체를 fallback으로 보존한다.
- 확인 요청: 원본 마크업 중간에 이미지·문단·목록 항목·표 셀을 끼워 넣었을 때 **경고 없이 사라지는 경우**가 있는지. 테스트는 머리글 앞에 끼워 넣는 경우만 다룬다(`P3 safety`, P2 동일). 다른 위치(목록 항목 안, 표 셀 안, `.cms-description-box` 안 등)도 봐 주세요.
- `countImages()`는 데이터 안의 `src` 문자열이 있는 객체를 센다. 같은 이미지가 PC/MO로 두 번 담기는 경우 등 셈이 어긋날 여지가 있는지.

### 3.3 보안
- type26 `colWidths`: `auto` 또는 CSS 길이만 허용(`30%; position: fixed`는 거부). 우회 가능한 값이 있는지(단위·공백·`calc()`·주석 등). 스키마는 `packages/core/src/types/type26.ts`.
- 표 셀 글은 rich text allowlist(em, strong, b, i, br, span)를 통과하는지. `colspan`/`rowspan`이 숫자 외 값·아주 큰 값일 때.
- type09 체크 아이콘 SVG는 코드에 고정된 경로만 쓰는지(입력에서 SVG를 옮기지 않는지).

### 3.4 호스트가 고정한 배치
- type09 한 줄 개수, type03 반전, type25 한 줄 4개, type17 넓은 제목 칸은 화면에 반영하지 않고 **값만 데이터에 보존**하고 `PRESET_LAYOUT_FIXED`(info)를 남긴다. 이 판단(인라인으로 바꾸면 모바일 배치까지 바뀜)이 타당한지, info 수준이 맞는지(파일 상태가 success로 남음).

### 3.5 인라인 보정
호스트 CSS를 바꿀 수 없어 출력에 인라인 스타일을 넣은 곳이다. 꼭 필요한지, 다른 화면(에디터 `html.design-edit-page`)에서 부작용이 없는지 봐 주세요.
- 모든 프리셋 `ul.mig-list`: `list-style: none; padding-left: 0; margin: 0` (호스트가 ul을 초기화하지 않음)
- type03·type04 이미지/글 칸: `flex: 1 1 50%; min-width: 0` (호스트 `.mig-visual:has(img) { flex-shrink: 0 }` 때문에 큰 이미지에서 PC 1145px 넘침)
- type10 하위 항목: `box-sizing: border-box`
- **PC 배경 레이어 바탕색** (`packages/core/src/helpers/background.ts`, 이미지 배경을 쓰는 모든 타입에 영향): PC에서는 호스트가 섹션 배경을 지우므로(`data-bg-scope="mobile"`), 이미지를 못 불러오면 흰 글자가 흰 바탕에 놓였다. PC 레이어에 모바일과 같은 바탕색을 추가했다. 1단계 출력이 바뀐 공통 수정이니 회귀 여부를 봐 주세요.

### 3.6 bf764a1 (1단계 잔여)
- I-10: 건너뛰기 조건이 "Windows + EPERM"으로만 좁혀졌는지(다른 오류는 실패해야 함).
- M-5: `npm run test:browser -- --reporter=dot`이 종료 코드 2로 거부되는지.

## 4. 실행 방법

```bash
git fetch origin claude/fervent-volta-ilc7hk
git checkout claude/fervent-volta-ilc7hk
npm ci
npm test            # 기대: 247 passed, 1 skipped (inventory: cms/ 필요)
npm run lint
npm run typecheck
npm run test:browser  # Playwright 필요. 기대: 45 passed
```

- 브라우저 배치 검사: `tests/visual/preset-layout.test.ts` — P2·P3 11개 타입 × PC 1100 / MO 360 / 에디터 1100. 가로 넘침, type03·type04 글 칸 찌그러짐, 하위 목록이 카드 밖으로 나감, 표가 화면 밖으로 나감을 본다.
- 화면 직접 확인: 웹 도구(`npm run dev -w apps/web`)에서 `fixtures/original/typeNN.html`을 불러와 PC/모바일 미리보기를 봐 주세요.
- Windows에서 실행해 주시면 3.6도 함께 확인됩니다.

## 5. 알려진 한계 (지적에서 제외해도 되는 것)

- 실제 `cms/contents` 표본으로 검증하지 못함(원본 없음). DoD 2·5는 부분/미실행으로 문서에 표시했다.
- 원본 화면과의 시각 등급 비교(DoD 4) 불가 — 원본 CSS 없음.
- 프리셋 표(`.mig-table`)는 호스트가 `min-width: 0`으로 화면 폭에 맞춰 줄인다(모바일에서 가로 스크롤 없음). 호스트 설계를 그대로 따랐다.
- 장식 도형 SVG(type02 오각형, type10 육각형)는 옮기지 않는다(안의 글은 옮김).

## 6. 판정 기준과 보고 형식

이전 검수와 같은 기준으로 부탁드립니다.
- **Critical**: 데이터·원본 손실, 보안 문제, 다수 페이지 출력 깨짐
- **Important**: 특정 타입·조건에서 내용이 경고 없이 빠지거나 화면이 깨짐, 편집기에서 저장 불가
- **Minor**: 문서·테스트 보강, 일관성

항목마다 위치(파일:줄), 재현 입력, 실제 결과, 기대 결과를 적고, **직접 실행한 것과 정적 판독만 한 것을 구분**해 주세요. 마지막에 판정(완료 / 수정 후 재확인 필요)을 적어 주세요.

## 7. 재검수 (지적 반영 후)

- 반영 기록: `docs/review-stage3-fixes.md`. 재검수 범위는 이 문서 이후 커밋(`9c3ccd5..`)이다.
- 검수 결과 문서 `docs/review-stage3.md`는 **저장소에 커밋·푸시해 주세요.** 지난 검수 문서는 Codex 작업 공간에만 있어 반영 측에서 원문을 읽지 못했다.
