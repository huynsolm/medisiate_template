# Codex 요청: 1단계 구현 검수

> 이 문서를 Codex에 그대로 전달하세요. **코드 수정이 아니라 검수(리뷰) 보고서 작성**을 요청합니다.

---

## 1. 역할과 요청

당신은 프런트엔드 아키텍트이자 코드 리뷰어입니다. `docs/implementation-plan.md` 10장의 **1단계(1-1~1-10)** 구현이 계획대로 됐는지, 그리고 버그나 보안 문제가 없는지 검수해 주세요.

- 산출물: `docs/review-stage1.md` (한국어, 마크다운)
- **코드를 고치지 마세요.** 발견한 문제는 보고서에만 적습니다.
- 추측한 내용은 추측이라고 표시하고, 직접 실행하거나 코드로 확인한 것과 구분하세요.

## 2. 검수 범위

- 브랜치: `claude/upbeat-shannon-rfbjil`
- 범위: `db2a4b0`(0단계 기준선) 다음부터 `41c12ce`까지 커밋 10개
  ```bash
  git log --oneline db2a4b0..41c12ce
  git diff --stat db2a4b0..41c12ce
  ```
- 커밋과 계획 작업 ID 대응

| 커밋 | 작업 | 주요 파일 |
|---|---|---|
| `975fbcf` | 1-1 모델·schema | `packages/core/src/model/index.ts`, `packages/core/src/schema/page.ts` |
| `742ad87` | 1-2 HTML 빌더·서식 허용 목록 | `packages/core/src/html/h.ts`, `packages/core/src/html/rich-text.ts` |
| `3f8c9b5` | 1-3 공통 헬퍼 | `packages/core/src/helpers/*.ts`, `packages/core/src/render/context.ts` |
| `1d4953e` | 1-4 renderPage·테마·레지스트리 | `packages/core/src/page/render-page.ts`, `packages/core/src/theme/resolve.ts`, `packages/core/src/types/definition.ts`, `config/themes/default.json` |
| `f8e5cf3` | 1-5 샘플 재현 | `packages/core/src/types/text-sample/*.ts`, `fixtures/sample-acne/page.json`, `packages/core/src/html/normalize.ts` |
| `26ba826` | 1-6 fallback | `packages/core/src/types/fallback.ts`, `packages/core/src/parse/sections.ts`, `packages/core/src/parse/dom.ts` |
| `1e5c245` | 1-7 type00·type01 | `packages/core/src/types/type00.ts`, `type01.ts`, `packages/core/src/parse/common.ts`, `parse/modifiers.ts`, `fixtures/types/**` |
| `a1f3664` | 1-8 convert·리포트 | `packages/core/src/convert/convert-document.ts`, `apps/cli/src/commands/convert.ts`, `apps/cli/src/report/build.ts` |
| `48c17c0` | 1-9 웹 편집기 | `apps/web/src/**` |
| `41c12ce` | 1-10 시각 비교 | `tests/visual/sample.test.ts`, `tests/support/*.ts` |

## 3. 먼저 읽을 자료

1. `docs/implementation-plan.md` 3장(모델), 4장(헬퍼), 5장(변환 규칙), 7장(출력), 9장(테스트), 10장 1단계 표
2. `docs/host-dom-contract.md` 2장, 5장 type00·type01, 6장 일반 모드
3. `reference/sample-inline-acne.html` (목표 출력)
4. `reference/host-style.css` (필요한 행만. 예: 2958~3080행 공통 프리셋, 3286~3314행 type-00/01)

## 4. 실행 방법

```bash
npm install
npm test            # vitest 전체 (웹 e2e와 시각 비교는 Playwright가 있을 때만 실행)
npm run lint
npm run typecheck
npm run web         # 편집기 개발 서버
```

- 구현 측 마지막 실행 결과: 테스트 109개 통과, 1개 건너뜀(inventory, `cms/` 필요), lint·typecheck 통과
- Playwright는 프로젝트 의존성이 아닙니다. `playwright` 모듈을 찾지 못하면 `tests/web`, `tests/visual`은 건너뜁니다. 있으면 `PLAYWRIGHT_NODE_MODULES=<node_modules 경로>`로 지정할 수 있습니다(`tests/support/browser.ts`).
- 시각 비교 결과 이미지: `output/visual/sample/{pc,mo,editor}-{orig,conv,diff}.png`

## 5. 알려진 한계 (구현 측이 이미 인지함)

`cms/` 원본(SVN)이 구현 환경에 없었습니다. 그래서 다음은 **실데이터로 검증하지 못했습니다.**

- **1-7:** type00·type01의 `parse()`는 원본 구조를 **추정**한 규칙입니다. `fixtures/types/**/*.source.html`도 합성 예시입니다(`fixtures/types/README.md`).
- **1-8:** 완료 조건 `convert --dir cms/contents/01 → HTML 8개`를 실행하지 못했습니다. 임시 폴더의 합성 트리로만 검증했습니다(`apps/cli/test/convert.test.ts`).
- 미리보기에서 `/api/file/...` 이미지가 깨집니다(기준 URL 미정, 계획서 확인 질문 6).

**`cms/`가 있는 환경이라면** 아래를 실행하고 결과를 보고서에 넣어 주세요.

```bash
npm test -- apps/cli/test/inventory.test.ts
npm run convert -- --dir cms/contents/01
```

- `cms/component/type00.html`, `type01.html`과 `cms/contents/01/*.html`의 실제 type00·type01 섹션을 읽고, `packages/core/src/parse/common.ts`의 추정 규칙(제목 = h1~h6 또는 `*-tit`, 설명 = `<p>`, PC/MO 이미지 = 클래스·파일명 표시, 없으면 순서)이 실제 구조와 맞는지 판정해 주세요.
- `output/reports/summary.md`의 상태별 개수와 fallback 비율을 적어 주세요.
- 변환 전후 `cms/` 파일이 바뀌지 않았는지 확인해 주세요.

## 6. 구현 측 판단(Ruling) — 타당성을 판정해 주세요

각 항목에 **동의 / 수정 필요 / 확인 필요**와 이유를 적어 주세요.

1. 샘플 조각 6종을 타입 5개로 구현. "풀블리드 이미지"는 별도 타입 없이 `text-visual` + 섹션 공통 옵션(`modifiers.fullBleed`, `modifiers.background`)으로 처리
2. `TypeDefinition`/`TypeRegistry`를 1-6이 아니라 1-4에서 먼저 만듦
3. SVG defs는 `migration-content` 블록마다 따로 넣고, 두 번째 블록부터 id에 `b{n}-` 접두사를 붙임
4. fallback처럼 `strategy: 'any'`인 섹션은 앞(없으면 뒤) 섹션의 모드를 따름
5. fallback의 원본 HTML은 주석 안에 넣되 `<`, `>`, `&`까지 escape함
6. type00은 호스트 프리셋 그대로 출력함(호스트가 `display:none`으로 숨김). 제목은 `PageModel.title`에도 남김
7. 이미지 진단(`IMAGE_HTTP`, `IMAGE_RELATIVE`)은 info 레벨이라 파일 상태를 partial로 낮추지 않음. 계획서 5.2와 다르니 판단해 주세요
8. `bg-image-N`을 `http://fxfile.drline.net/cms/public/images/common/cms_bg_N.jpg`로 매핑함(근거는 샘플의 1번뿐). `bg-image-1/2`의 MO 전용 배경은 아직 반영하지 않음
9. parse5가 트리 구성 단계의 복구를 알려주지 않아서, `PARSE_RECOVERED`를 "원문 끝 태그 수 ≠ 트리 끝 태그 수" 또는 "닫히지 않은 요소"로 판정함
10. 리포트 재생성용 파일별 요약을 `output/reports/files/<rel>.json`에 따로 저장함. 대상 외 파일 목록은 `--all`일 때만 갱신함
11. CLI 인자는 commander 대신 `node:util` `parseArgs`로 처리함
12. 웹 편집기의 순서 변경은 드래그 대신 ↑↓ 버튼으로 함
13. Playwright를 의존성에 넣지 않고, 환경에 있으면 쓰고 없으면 건너뜀

## 7. 중점 검수 항목

### 7.1 보안·출력 안전성
- `h()`/`serialize()`: 텍스트·속성 escape, 태그·속성 이름 검증, void 요소 처리
- `sanitizeRichText()`: 허용 태그 밖 요소, `on*` 속성, `style`, `javascript:` URL, 깨진 마크업, 중첩 주석으로 우회할 수 있는지
- style 값 주입: `cssColor`, `cssUrl`(`helpers/background.ts`), `colorSchema`, `itemPadding`·`titleWeight` 정규식. **검증이 없는 값**이 style 속성에 들어가는 경로가 있는지(예: `modifiers.fullBleed.paddingY`는 형식 검증이 없음, 구현 측이 인지한 작은 문제)
- fallback 주석: 원본 HTML 때문에 주석이 일찍 끝나거나, 에디터가 주석을 풀었을 때 실행 가능한 마크업이 생기는지
- CLI 쓰기: `safeWrite()`가 `output/` 밖이나 `cms/` 안에 쓰는 경로를 막는지. `--dir`/`--file`이 `cms/contents` 밖을 가리킬 때의 처리
- 웹: JSON 불러오기, localStorage 초안이 schema 검증을 거치는지

### 7.2 정확성
- 샘플 재현: `normalizeHtml()`이 너무 느슨해서 실제 차이를 놓치지는 않는지(공백, class 정렬, style 공백 통일)
- `renderPage()`: 모드 경계에서 블록 분리, 테마 변수, `theme-*` 클래스, defs 위치·중복, 결정성
- 상태 판정 `fileStatus()`가 계획서 5.2 규칙과 같은지
- `convertDocument()`: SSI 제거, `.cms-container` 없음, 섹션 0개, 타입 번호 없음(`class="cms type"`), 이미지 `src` 불변성, 이미지와 섹션 번호 연결
- type01 렌더가 `docs/host-dom-contract.md` 5장 DOM 계약(직접 자식 관계 포함)과 정확히 맞는지
- 웹 reducer: 섹션 id 중복, 복제 시 `source` 제거, 경로 기반 수정이 원본 객체를 바꾸지 않는지

### 7.3 계획 대비 누락
- 계획서 9.1 표에 있는 테스트 중 빠진 것. 예: "parse→render→parse 왕복 시 data 동일"은 구현되지 않음(원본 형식과 출력 형식이 달라서). 대안이 필요한지 판단
- 8장 타입 완료 정의(DoD) 1~5 중 type00·type01이 충족하지 못한 항목
- 6장 웹 편집기 항목 중 최소판에서 빠진 것(단일 타입 빠른 생성 화면, `output/data/*.json` 재편집 흐름 등)

### 7.4 유지보수성
- core가 `fs`, `window`, DOM API를 직접 쓰지 않는지(계획서 1장 원칙). `parse5`를 어댑터 주입 없이 core에서 직접 쓴 점의 타당성
- 웹과 CLI가 렌더 로직을 중복하지 않는지
- `exactOptionalPropertyTypes` 대응으로 모델에 `| undefined`를 넓게 붙인 점의 부작용

## 8. 보고서 형식 (`docs/review-stage1.md`)

1. **요약:** 1단계 완료 판정(완료 / 조건부 완료 / 미완료)과 이유, 3~5줄
2. **작업별 판정표:** 1-1~1-10 각각 `충족 / 부분 / 미충족`, 근거(테스트 이름 또는 파일:행)
3. **발견 사항:** 심각도 순서(Critical → Important → Minor). 항목마다 아래를 적어 주세요.
   - 위치: `파일:행`
   - 문제: 한 문장
   - 재현: 구체적인 입력 → 잘못된 출력
   - 제안: 고치는 방향 (코드는 짧은 스케치만)
4. **Ruling 판정:** 6장 13개 항목 각각 동의 / 수정 필요 / 확인 필요
5. **실데이터 검증 결과:** `cms/`가 있었다면 5장 결과, 없었다면 "미실행"
6. **2단계 전에 꼭 고칠 것:** 최대 5개
7. **확인 질문:** 사용자에게 물어야 할 것
