# 인라인 CMS 컴포넌트 생성기 구현 계획

> 근거: `CODEX_제안서_요청.md`, `docs/proposal.md`, `reference/sample-inline-acne.html`, `reference/host-style.css`, `cms/component/type00~36.html`, `cms/css/cms.css`, `cms/contents/**`
> 작성일: 2026-11-13. 이번 단계는 계획 문서만 작성하며 코드는 구현하지 않는다.
> 자료로 확정할 수 없는 내용은 **추정**으로 표시한다.

---

## 0. 전제와 계획 중 새로 확인한 사실

### 0.1 확정된 결정 (다시 묻지 않음)
- 호스트 `mig-*` CSS를 최대한 재사용하고, 부족한 것만 인라인으로 보완한다.
- 반응형 분기점은 호스트와 같은 **1024px**이다. `fluid()`의 기본 범위는 375~1024px이다.
- `cms/contents/**/*.html` 703개를 `output/contents/`에 원본 폴더 구조 그대로 1:1 변환한다.
- 이미지 URL은 바꾸지 않는다. 상대경로와 `http://`는 리포트에만 기록한다.
- 웹 도구와 CLI는 같은 타입 정의, parser, `render()`를 공유한다.
- 지원하지 못한 섹션은 눈에 보이는 fallback과 리포트로 남긴다.
- `cms/`는 SVN 작업본이다. 읽기만 한다.

### 0.2 계획 수립 중 직접 확인한 사실
| 항목 | 확인 내용 | 계획에 미치는 영향 |
|---|---|---|
| 개발 환경 | Node v24.22.1, npm 11.19.1, git 2.43 있음. pnpm 없음 | 패키지 매니저는 **npm workspaces**를 쓴다 (추가 설치 불필요) |
| 프로젝트 루트 | `D:\자동화\cms_medisay`는 git 저장소가 아님. `cms/`만 SVN | 도구 코드는 루트에 새로 만든다. git 초기화 여부는 확인 질문 |
| 호스트 프리셋 DOM | `.mig-container .mig-section.type-XX` 규칙은 `.mig-header`, `.mig-body > .mig-content > .mig-list > .mig-item`, `.mig-visual + .mig-content` 같은 **자식 결합자**에 의존함 (예: `type-09`, `type-10`) | 프리셋 모드에서는 DOM 깊이까지 정확히 맞춰야 한다. **0단계에서 타입별 DOM 계약을 추출해야 한다** |
| 호스트 데이터 속성 | `[data-migration-bg="true"]` 13회 (배경 섹션의 글자를 흰색으로, 가운데 정렬), `img[data-migration-slot="hero"]` 1회 | 호스트에 이미 "마이그레이션 출력 형식"이 있다는 증거다. **추정:** 호스트 측에 공식 변환기나 예시 출력이 있을 수 있다. 확인 질문 1 |
| `type-bg` | 호스트에 `.mig-section.type-bg` 20회 (type-02/06/09/10/11 등) | 원본 `type-bg`는 호스트 클래스로 그대로 옮기고, `bg-color-*`·`bg-image-*`는 인라인 배경과 `data-migration-bg`로 옮긴다 |
| 원본 변형 정의 | `cms.css` 19~67행: `.cms.type-bg`, `bg-color-1~3`, `bg-image-1~7`, `text-white` | 변형 매핑표의 근거로 쓴다 |
| 원본 반응형 | `cms.css` 분기점: 991px와 479px | 시각 비교 폭을 360 / 1100 / 에디터(1100 + `design-edit-page`)로 정하고, 991~1024px 구간 차이는 허용 차이로 기록한다 |
| type31~34 사용량 | type30 33, type31 21, type32 5, type33 56, type34 11. type35·36은 contents에서 사용되지 않음 | type35·36은 웹 도구 전용으로 마지막 단계에 둔다 |

---

## 1. 디렉터리와 패키지 구조

```text
D:\자동화\cms_medisay\
├─ cms/                         # SVN 원본. 읽기 전용 (절대 쓰지 않음)
├─ reference/
│  ├─ sample-inline-acne.html   # 목표 출력 기준
│  ├─ host-style.css            # 호스트 CSS 스냅샷
│  └─ host-css.manifest.json    # [신규] URL, 저장일, SHA-256
├─ docs/
│  ├─ proposal.md
│  ├─ implementation-plan.md    # 이 문서
│  ├─ host-dom-contract.md      # [신규] 0단계 산출물: 프리셋별 DOM 계약
│  └─ editor-sanitizer-report.md# [신규] 2단계 산출물
├─ package.json                 # npm workspaces 루트
├─ tsconfig.base.json
├─ packages/
│  └─ core/                     # 브라우저와 Node 모두에서 동작하는 순수 TS
│     ├─ src/
│     │  ├─ model/              # PageModel, SectionModel, Diagnostic, Theme
│     │  ├─ schema/             # 필드 정의 DSL과 검증 (zod)
│     │  ├─ html/               # h() 빌더, escape, allowlist sanitizer, style 직렬화
│     │  ├─ helpers/            # fluid, sectionHeader, visualPcMo, fullBleed, hexDefs/hexBox, renderImage, renderFallback
│     │  ├─ theme/              # 테마 해석 (파일 → 병원 → 기본)
│     │  ├─ page/               # renderPage: 모드 분리, migration-content 래퍼, svg defs 수집
│     │  ├─ parse/              # 원본 DOM 공통 유틸 (텍스트·이미지·변형 추출)
│     │  ├─ types/              # 타입별 정의 파일 type00.ts ~ type36.ts, textSample.ts
│     │  ├─ registry.ts         # 타입 레지스트리
│     │  └─ index.ts
│     └─ test/
├─ apps/
│  ├─ cli/                      # cms-migrate
│  │  └─ src/ (inventory, convert, report, verify, css-check)
│  └─ web/                      # React + Vite 편집기
│     └─ src/ (pages, editor, builder, preview, io)
├─ fixtures/
│  ├─ sample-acne/              # 샘플 재현용 PageModel JSON과 기대 HTML
│  └─ types/typeXX/             # 타입별 원본 섹션 HTML, 기대 JSON, 기대 HTML
├─ config/
│  └─ themes/                   # default.json, {hospitalId}.json
├─ tests/
│  └─ visual/                   # Playwright 시각 회귀
└─ output/                      # 생성물 (버전 관리 제외)
   ├─ contents/                 # 1:1 HTML
   ├─ data/                     # 1:1 편집용 JSON
   ├─ reports/                  # report.json, report.csv, summary.md, images.csv
   └─ visual/                   # 스크린샷과 diff
```

원칙:
- `packages/core`는 DOM API, `fs`, `window`를 직접 쓰지 않는다. HTML 파싱은 주입된 파서 어댑터로 처리한다(Node는 parse5, 웹은 `DOMParser` 또는 parse5 브라우저 번들).
- `apps/*`는 `core`만 호출한다. 렌더 로직을 UI나 CLI에 복제하지 않는다.
- CLI의 쓰기 경로는 `output/` 아래로만 제한한다. `cms/` 아래 경로에 쓰려고 하면 즉시 실패시킨다(가드 함수와 테스트로 확인).

---

## 2. 기술 스택과 의존성

| 영역 | 선택 | 이유 |
|---|---|---|
| 언어 | TypeScript 5.x (strict) | 타입 정의와 schema를 웹과 CLI가 공유 |
| 런타임 | Node 24 (설치 확인됨) | CLI, 테스트 |
| 패키지 | npm workspaces | pnpm 미설치, 추가 도구 불필요 |
| 빌드 | Vite (web), tsup 또는 `tsc` (core, cli) | 단순, 빠름 |
| UI | React 18 | 폼과 섹션 목록 상태 관리 |
| schema 검증 | zod | 필드 검증과 기본값, JSON 로드 검증 |
| HTML 파싱 | parse5 + `parse5-htmlparser2-tree-adapter`, 탐색은 `css-select` 또는 cheerio | HTML5 복구 규칙, 위치 정보 |
| CLI 인자 | commander | 서브커맨드 |
| CSV | 직접 직렬화 (의존성 없음) | 단순 |
| 드래그 정렬 | @dnd-kit/sortable | 섹션·항목 순서 변경 |
| 단위 테스트 | Vitest + 인라인 스냅샷 | core·cli |
| 시각 테스트 | Playwright (Chromium) + pixelmatch | PC/MO/에디터 스크린샷 비교 |
| 포맷 | Prettier, ESLint | 결정적 출력과 코드 품질 |

출력 HTML은 Prettier로 정리하지 않는다. 대신 core의 `h()` 빌더가 고정된 순서로 속성과 줄바꿈을 직렬화해서 **byte 단위로 같은 결과**를 보장한다.

---

## 3. 핵심 데이터 모델과 인터페이스

```ts
// packages/core/src/model
type Strategy = 'preset' | 'general';

interface Theme { primary: string; preset?: 'blue' | 'gold' | 'green'; source: 'file' | 'hospital' | 'default'; }

interface ImageRef {
  src: string;              // 원본 문자열 그대로 (resolveImageSrc는 identity)
  alt: string;              // 장식이면 ''
  width?: number; height?: number;
  kind: 'https' | 'http' | 'relative' | 'protocol-relative' | 'data' | 'other'; // 리포트용 분류
}
interface ImagePair { pc?: ImageRef; mo?: ImageRef; }

type RichText = string;     // allowlist(em, strong, b, i, br, span.br-migration)를 통과한 HTML

interface SectionModel<T = unknown> {
  id: string;               // s1, s2 … (결정적)
  type: string;             // 'type01' … 'type36' | 'fallback' | 'text-sample'
  variant: string;          // 'default' 또는 타입별 변형명
  modifiers: SectionModifiers; // bg, textWhite, fullBleed, align 등 공통 변형
  data: T;
  source?: { file: string; index: number; classList: string[] }; // 변환 추적용
}

interface SectionModifiers {
  background?: { kind: 'color' | 'image'; value: string; overlay?: string; token?: string }; // token = 'bg-color-2' 등 원본 이름
  textWhite?: boolean;
  fullBleed?: { paddingY?: string };
}

interface PageModel {
  version: 1;
  source?: string;          // 'cms/contents/01/botox.html' 기준 상대경로
  title?: string;           // type00 page title
  theme: Theme;
  sections: SectionModel[];
  diagnostics: Diagnostic[];
  meta: { coreVersion: string; hostCss: { sha256: string; savedAt: string } };
}

interface Diagnostic {
  level: 'info' | 'warn' | 'error';
  code: DiagnosticCode;     // 'UNSUPPORTED_TYPE' | 'UNKNOWN_VARIANT' | 'UNKNOWN_CLASS' | 'SCRIPT_REMOVED'
                            // | 'INLINE_STYLE_DROPPED' | 'PARSE_RECOVERED' | 'IMAGE_HTTP' | 'IMAGE_RELATIVE'
                            // | 'NON_CONTENT_FILE' | 'EMPTY_FIELD' | 'MIXED_MODE_SPLIT' …
  message: string;
  sectionIndex?: number;
  location?: { line: number; col: number };
  detail?: Record<string, unknown>;
}

type FileStatus = 'success' | 'partial' | 'failed';
```

```ts
// packages/core/src/types
interface TypeDefinition<T> {
  id: string;                         // 'type01'
  label: string;                      // '이미지 한 장 + 제목 + 설명'
  strategy: Strategy;
  hostPreset?: string;                // 'type-01' (preset일 때)
  variants: string[];                 // ['default', 'box-list', …]
  schema: z.ZodType<T>;
  fields: FieldSpec[];                // 웹 폼 생성용 메타 (label, kind, repeat min/max, help)
  defaults: T;
  match(section: SourceSection): boolean;            // 원본 섹션이 이 타입인지
  parse(section: SourceSection, ctx: ParseContext): ParseResult<T>;
  render(section: SectionModel<T>, ctx: RenderContext): HNode;   // 문자열이 아닌 노드 트리
}

interface ParseResult<T> { data: T; variant: string; modifiers: SectionModifiers; diagnostics: Diagnostic[]; lossless: boolean; }

interface RenderContext {
  theme: Theme;
  mode: Strategy;                     // 이 섹션이 놓인 블록의 모드
  defs: DefsCollector;                // hexClip 등 SVG defs를 페이지당 1회 수집
  idPrefix: string;                   // clipPath ID 충돌 방지
  image: (img: ImageRef) => ImageRef; // resolveImageSrc (현재 identity)
}
```

`render()`는 문자열 대신 `HNode` 트리를 돌려준다. 마지막 직렬화는 `serialize()` 한 곳에서만 해서 escape 누락과 속성 순서 흔들림을 막는다.

---

## 4. 타입 레지스트리와 공통 렌더 헬퍼

### 4.1 레지스트리
```ts
// packages/core/src/registry.ts
const registry = new Map<string, TypeDefinition<any>>();
export function register(def) {…}
export function getType(id) {…}
export function matchSection(src): TypeDefinition | undefined // match() 순서: 명시 type 클래스 → 구조 판별
export const FALLBACK: TypeDefinition<FallbackData>        // 항상 마지막
```
- 타입 파일 하나가 schema, fields, defaults, match, parse, render를 모두 가진다.
- 레지스트리는 정적 import 목록(`types/index.ts`)으로 만든다. 웹 번들과 CLI가 같은 목록을 쓴다.

### 4.2 렌더 헬퍼 (`packages/core/src/helpers`)
| 헬퍼 | 역할 | 근거 |
|---|---|---|
| `fluid(min, max, from=375, to=1024)` | `clamp(min, calc(min + (100vw - from) * (max-min)/(to-from)), max)` 문자열 | 샘플의 clamp 패턴, 분기점 1024 |
| `fluid.sample(min, max)` | `to=992` 샘플 호환 모드 | `sample-inline-acne.html` 재현 테스트 전용 |
| `sectionHeader({eyebrow, title, desc, align, accentBar})` | 프리셋 모드: `.mig-header > .mig-eyebrow/.mig-title/.mig-desc`. 일반 모드: 샘플의 막대+제목 구조 | 호스트 3045행 `.mig-header`, 샘플 |
| `visualPcMo({pc, mo, wide})` | `.mig-visual.common-display-pc` / `-mo` 쌍. 한쪽만 있으면 클래스 없이 하나만 출력 | 호스트 357~376행 |
| `fullBleed(node, {background, paddingY})` | 100vw 풀블리드 인라인 | 샘플 2·6번 섹션 |
| `bgSection(modifiers)` | `type-bg` 클래스, 인라인 배경, `data-migration-bg="true"` | 호스트 `[data-migration-bg]`, cms.css 19~67행 |
| `hexDefs(ctx)` / `hexBox(item)` | 페이지당 `<svg><defs><clipPath id="{prefix}-hex">` 1회 | 샘플 |
| `renderImage(img)` | `decoding="async" loading="lazy"`, `width/height`, `alt` 고정 순서 | 샘플 |
| `brVisible()` / `brPcOnly()` | `<br class="br-migration is-visible">` / `<br class="br-migration">` | 호스트 2469행 |
| `emptyDeco()` | 빈 장식 요소에 `&nbsp;` | 샘플 |
| `renderFallback(src, diagnostics)` | 눈에 보이는 경고 섹션 + 원본 텍스트 + escape한 원본 HTML 주석 | 제안서 9.5 |

### 4.3 페이지 렌더 (`renderPage`)
1. 섹션을 순서대로 렌더한다.
2. 연속한 섹션을 `strategy` 기준으로 묶는다. 프리셋 묶음은 `<div class="migration-content" style="--mig-primary-color:…"><div class="mig-container">…</div></div>`, 일반 묶음은 `<div class="migration-content" …><div class="inner">…</div></div>`.
3. 모드가 바뀌는 곳마다 블록을 나누고 `MIXED_MODE_SPLIT` info 진단을 남긴다. 이유는 호스트의 `:has(.mig-container)`가 블록 전체의 모드를 바꾸기 때문이다.
4. SVG defs는 해당 블록의 맨 앞에 한 번만 넣는다.

---

## 5. 기존 HTML parser와 일괄 변환 파이프라인

### 5.1 단계
```text
discover → read(UTF-8, CRLF 보존 불필요) → strip SSI → parse5 → locate .cms-container
→ split sections(section.cms) → classify(type, variants, unknown classes)
→ scan(script, on* 속성, style, img src) → type.parse() → PageModel
→ renderPage() → write HTML / JSON → collect diagnostics → reports
```

### 5.2 세부 규칙
- **파일 탐색:** `cms/contents/**/*.html`을 경로 기준으로 정렬한다(결정적 순서). `.bak`, `.lnk`, `.code-workspace`는 "대상 외"로 기록한다.
- **SSI:** `<!--#include … -->` 주석은 제거하고 `info` 진단을 남긴다.
- **컨테이너가 없는 파일**(`include/`, `option/`, `list.html`, `plainLayout.html` 등): `NON_CONTENT_FILE`로 표시하고, fallback HTML 하나를 만든 뒤 `failed` 또는 `partial`로 집계한다. 제외하지 않는다.
- **타입 판별:** `class="cms typeXX …"`에서 `typeXX`를 읽는다. `class="cms type"`처럼 번호가 없는 7건은 `UNSUPPORTED_TYPE`으로 fallback한다.
- **변형 클래스:** 3계층으로 처리한다(제안서 6장).
  - 공통 변형(`type-bg`, `bg-color-1~3`, `bg-image-1~7`, `text-white`)은 `modifiers`로 옮긴다. 값은 `cms.css` 19~67행에서 추출한 **정적 매핑표**(`parse/variant-map.ts`)를 쓴다.
  - 타입 내부 변형은 각 타입의 `parse()`가 `variant`로 판정한다.
  - 미등록 클래스는 `UNKNOWN_CLASS` 경고로 남기고 섹션은 계속 변환한다. 해당 클래스 때문에 레이아웃이 달라지는 것으로 알려진 경우(`d-none`, `doctor-list` 등)는 `partial`로 처리한다.
- **script와 `on*` 속성:** 출력에서 제거하고, 원문은 진단 JSON에만 남긴다. 운영 HTML 안에 원문을 남길지는 확인 질문 4.
- **기존 inline style:** 속성 allowlist(`color`, `text-align`, `font-weight`, `background-color`, `width`/`max-width`)만 이관한다. 나머지는 `INLINE_STYLE_DROPPED`로 기록한다.
- **이미지:** `src` 문자열은 그대로 쓴다. `ImageRef.kind`만 분류해서 `http`·`relative`를 `IMAGE_HTTP`·`IMAGE_RELATIVE` 경고로 남긴다. 테스트로 원본과 출력의 `src` 집합이 같은지 확인한다.
- **상태 판정:** 진단에 `error`가 있거나 렌더된 섹션이 모두 fallback이면 `failed`, `warn`이 있거나 fallback 섹션이 하나라도 있으면 `partial`, 그 밖은 `success`.

### 5.3 CLI 명령 (`apps/cli`)
```text
npx cms-migrate inventory                       # 0단계: 파일·타입·변형·script·style·이미지 현황 → output/reports/inventory.*
npx cms-migrate convert --all
npx cms-migrate convert --dir cms/contents/01
npx cms-migrate convert --file cms/contents/01/botox.html
npx cms-migrate report                          # output/data/*.json에서 리포트만 다시 생성
npx cms-migrate verify [--sample <spec>]        # 1:1 개수, src 불변성, 쓰기 경로 검사
npx cms-migrate css-check [--remote]            # 호스트 CSS 해시와 원격본 비교
```
- 공통 옵션: `--src cms/contents`(기본), `--out output`(기본), `--theme-dir config/themes`, `--fail-on <level>`.
- 부분 변환 시 전체 리포트는 기존 `output/data/` 전체를 다시 읽어 합친다.

---

## 6. 웹 편집기와 미리보기 구현 순서

1. **셸:** Vite + React 앱, `core` 연결, 빈 PageModel 상태(`useReducer`).
2. **섹션 목록:** 추가(타입 선택 목록), 삭제, 복제, 드래그 정렬.
3. **schema 기반 폼:** `FieldSpec`으로 text, richText(허용 태그 안내), image(PC/MO 주소, alt, 크기), select(variant), repeat(항목 추가·삭제·순서 변경) 컨트롤을 자동 생성한다.
4. **테마:** 병원 선택(config/themes 목록) 또는 색 직접 입력.
5. **미리보기 iframe:** `srcdoc`에 고정 `host-style.css`와 생성 HTML을 넣는다. 모드 3가지:
   - **PC:** iframe 폭 1100px, `<html>`
   - **MO:** iframe 폭 360px
   - **에디터:** iframe 폭 1100px, `<html class="design-edit-page">` (PC 폭에서도 모바일 이미지만 보이는 실제 동작 재현)
   - 상단에 기준 CSS 저장일과 SHA-256 앞 8자리를 표시한다.
6. **출력:** HTML 복사, HTML 다운로드, PageModel JSON 저장·불러오기, `output/data/*.json` 불러오기(재편집).
7. **진단 패널:** 현재 페이지의 Diagnostic 목록, fallback 섹션으로 이동.
8. **단일 타입 빠른 생성 화면:** 섹션 1개짜리 PageModel로 같은 컴포넌트를 재사용한다.

`localStorage`에는 편집 중 초안만 저장한다(실패해도 동작하도록 try/catch).

---

## 7. 출력 구조

```text
output/
├─ contents/01/botox.html        # 붙여넣기 조각만: <div class="migration-content">…</div> (블록이 여러 개일 수 있음)
├─ data/01/botox.json            # PageModel (재편집용)
└─ reports/
   ├─ report.json                # 파일별 상태, 타입 목록, 진단 전체, coreVersion, hostCss
   ├─ report.csv                 # file, status, types, fallbackCount, warnCount, errorCount, httpImages, relativeImages
   ├─ images.csv                 # file, sectionIndex, src, kind
   ├─ unsupported.csv            # file, sectionIndex, type, variant/class, reason
   ├─ summary.md                 # 사람이 읽는 요약: 상태별 개수, 타입별 성공률, 상위 미지원 항목, 다음 조치
   └─ inventory.json / .md       # 0단계 기준선
```

- HTML 파일 첫 줄에 생성 정보 주석을 넣을지(`<!-- generated by cms-migrate vX, source: 01/botox.html -->`)는 에디터가 주석을 보존하는지 2단계에서 확인한 뒤 정한다. 기본은 **넣지 않음**.
- 출력 줄바꿈은 LF, 인코딩은 UTF-8(BOM 없음)이다.

---

## 8. 타입별 구현 우선순위

| 순위 | 묶음 | 타입 (contents 사용 횟수) | 메모 |
|---|---|---|---|
| P0 | 샘플 재현 | `text-sample`(일반 모드 조각 6종: 텍스트+이미지, 풀블리드 이미지, 지그재그 미디어, 단계 목록, 육각형 3칸, 아이콘 그리드) | 1단계 기준. 일반 모드 helper 검증 |
| P1 | 최다 사용 | type01(736), type00(706) | 703개 파일 대부분의 첫 섹션 |
| P2 | 상위 | type07(166), type09(165), type10(135), type02(133), type03(129) | 01~07 폴더에 많이 나옴 |
| P3 | 고빈도·고위험 | type26 표(116), type11(118), type04(115), type25(111), type15(87, Swiper→정적), type17(80), type27(66) | type26은 표라서 앞당김 |
| P4 | 중빈도 | type18(65), type23(59), type33(56), type13(55), type06(51), type28(48), type16(43), type14(43), type19(37), type30(33) | type33은 Q&A 변형 먼저 확보 |
| P5 | 저빈도 | type24(28), type29(23), type31(21), type22(20), type20(15), type21(14), type12(12), type34(11), type32(5), type08(4), type05(4) | type31~34는 일반 모드 |
| P6 | 도구 전용 | type35, type36 (contents 사용 0) | 웹 도구에서만 필요 |

각 타입의 완료 정의(DoD):
1. `docs/host-dom-contract.md`에 해당 프리셋의 DOM 계약이 있다(일반 모드 타입은 구조 설명).
2. `fixtures/types/typeXX/`에 실제 contents에서 고른 대표 섹션 2개 이상(변형마다 1개)과 기대 JSON·HTML이 있다.
3. parse → render 스냅샷 테스트가 통과한다.
4. PC/MO/에디터 시각 비교에서 대표 섹션이 B등급 이상이다.
5. inventory 기준으로 해당 타입 섹션의 fallback 비율이 리포트에 나온다.

---

## 9. 테스트 계획

### 9.1 자동 테스트 (Vitest)
| 대상 | 테스트 |
|---|---|
| `html/` | escape, 속성 순서 고정, richText allowlist(허용 외 태그 제거), `&nbsp;` 유지 |
| `helpers/` | `fluid()` 수식 값, `fluid.sample()`이 샘플 문자열과 일치, defs 1회 수집, clipPath ID 고유성 |
| 각 타입 | schema 검증(필수값, 반복 0/1/N), parse 스냅샷, render 스냅샷, parse→render→parse 왕복 시 data 동일 |
| `renderPage` | 모드 분리, 테마 변수 1회 출력, 결정성(두 번 렌더 결과 byte 동일) |
| 샘플 재현 | `fixtures/sample-acne/page.json` → HTML이 `reference/sample-inline-acne.html`과 **정규화 후 DOM 동일**(공백·속성 순서 정규화) |
| CLI | 임시 디렉터리 fixture로 1:1 경로, 대상 외 파일 기록, `cms/` 쓰기 가드, 상태 판정 |
| 불변성 | 703개 전체 변환 후 원본·출력의 `img[src]` 다중집합 동일, 입력 703 = 출력 HTML 703 = 출력 JSON 703 |
| 원본 보호 | 변환 전후 `cms/` 전체 파일의 SHA-256 목록이 같음 |

### 9.2 시각 회귀 (Playwright)
- **비교 대상:** 원본은 `cms/css/cms.css` + 원본 섹션 HTML(SSI 제거, `cms-container` 래핑), 변환본은 `host-style.css` + 출력 HTML.
- **폭:** 360(MO), 1100(PC), 1100 + `html.design-edit-page`(에디터).
- **캡처 조건:** 폰트와 이미지 로딩 완료 후. 네트워크 실패 이미지는 리포트에 따로 기록한다.
- **결과:** `output/visual/{file}/{mode}-{orig|conv|diff}.png`와 `visual-report.md`(A~D 등급 기입란).
- **기준선:** 1단계에서는 샘플 재현 비교(`sample-inline-acne.html` vs 도구 출력)만 픽셀 diff 임계값(예: 1% 이하)으로 자동 판정한다. 원본과 변환본은 디자인이 다르므로 자동 판정 없이 사람이 등급을 매긴다.
- **샘플링:** 제안서 12.3 기준(타입별 1개 이상, 상위 10개 타입은 변형별, script 포함 31개 전수, 병원 ID별 1개, 공통CMS 10개).

### 9.3 실제 에디터 테스트 (수동, 2단계)
`docs/editor-sanitizer-report.md`에 기능별 결과를 표로 기록한다: CSS 변수/`var()`, `color-mix()`, inline SVG/defs/clipPath, `clip-path:url()`, `aspect-ratio`, `clamp()`, grid, `data-migration-*`, `loading/decoding/width/height`, 빈 태그와 `&nbsp;`, HTML 주석, 100vw 풀블리드. 항목마다 "붙여넣기 → 저장 → 다시 열기 → 공개 PC/MO" 결과를 적는다.

---

## 10. 단계별 작업 목록과 완료 조건

각 작업은 독립적으로 실행하고 검증할 수 있는 크기다. 괄호 안은 생성·수정할 예상 파일이다.

### 0단계. 기준선 고정과 호스트 DOM 계약 (2~3일, 추정)
| ID | 작업 | 예상 파일 | 완료 조건 |
|---|---|---|---|
| 0-1 | 워크스페이스 뼈대, TS·Vitest·ESLint 설정 | `package.json`, `tsconfig.base.json`, `packages/core/package.json`, `apps/cli/package.json`, `.gitignore`(`output/`, `node_modules/`) | `npm install`, `npm test`(빈 테스트) 통과 |
| 0-2 | 호스트 CSS manifest와 해시 검사 | `reference/host-css.manifest.json`, `apps/cli/src/commands/css-check.ts` | `css-check`가 SHA-256 `00657D80…`와 일치를 보고 |
| 0-3 | `cms/` 쓰기 가드 | `apps/cli/src/fs/safe-write.ts`, 테스트 | `cms/` 아래 쓰기 시도 시 예외 테스트 통과 |
| 0-4 | inventory 명령 (파서 기반 재집계) | `apps/cli/src/commands/inventory.ts`, `packages/core/src/parse/source.ts` | `output/reports/inventory.{json,md}`에 HTML 703개, 타입별 섹션 수, 변형 클래스, script·style·이미지 분류가 나옴. 숫자를 이 문서와 제안서 수치와 대조해 차이를 설명 |
| 0-5 | 호스트 프리셋 DOM 계약 문서 | `docs/host-dom-contract.md` | type-00~30 각각의 필수 DOM 경로(자식 결합자 포함), 사용 클래스, `type-bg`·`data-migration-bg` 반응을 표로 정리. P1·P2 타입은 최소 HTML 예시 포함 |
| 0-6 | 원본 변형 매핑표 | `packages/core/src/parse/variant-map.ts`, `docs/host-dom-contract.md` 부록 | `cms.css` 19~67행의 `bg-color-*`, `bg-image-*`, `text-white` 실제 값이 매핑표에 들어감 |

### 1단계. core 기반과 샘플 재현 (5~7일, 추정)
| ID | 작업 | 예상 파일 | 완료 조건 |
|---|---|---|---|
| 1-1 | 모델과 schema | `packages/core/src/model/*.ts`, `schema/*.ts` | zod로 PageModel 검증 테스트 통과 |
| 1-2 | `h()` 빌더, 직렬화, escape, richText allowlist | `packages/core/src/html/*.ts` | 9.1의 html 테스트 통과 |
| 1-3 | 공통 helper | `packages/core/src/helpers/*.ts` | 9.1의 helper 테스트 통과 |
| 1-4 | `renderPage`, 테마 해석 | `packages/core/src/page/*.ts`, `theme/*.ts`, `config/themes/default.json` | 모드 분리, 테마 1회 출력, 결정성 테스트 통과 |
| 1-5 | 일반 모드 샘플 타입 6종 | `packages/core/src/types/text-sample/*.ts`, `fixtures/sample-acne/page.json` | 도구 출력이 `reference/sample-inline-acne.html`과 정규화 DOM 동일 |
| 1-6 | 레지스트리와 FALLBACK 타입 | `packages/core/src/registry.ts`, `types/fallback.ts` | 미지원 섹션이 경고 블록 + 원본 텍스트 + escape 주석으로 렌더 |
| 1-7 | type00, type01 (프리셋) | `packages/core/src/types/type00.ts`, `type01.ts`, `fixtures/types/type00|01/*` | 8장 DoD 1~3 충족 |
| 1-8 | convert 명령과 리포트 | `apps/cli/src/commands/convert.ts`, `report.ts`, `apps/cli/src/report/*.ts` | `convert --dir cms/contents/01`로 `output/contents/01/` HTML 8개, `output/data/01/` JSON 8개, `output/reports/*` 생성. 미구현 타입은 fallback으로 표시되고 `partial` 집계 |
| 1-9 | 웹 편집기 최소판 | `apps/web/**` (shell, 섹션 목록, 폼 생성기, 미리보기 3모드, 복사, JSON 저장·불러오기) | 샘플 페이지를 웹에서 편집하고 3모드로 볼 수 있음. 웹 출력과 CLI 출력이 같은 PageModel에서 byte 동일 |
| 1-10 | 샘플 시각 비교 | `tests/visual/sample.spec.ts` | 샘플 원본과 도구 출력의 PC/MO/에디터 diff 1% 이하 |

**1단계 완료 조건:** 1-1~1-10 통과. 제안서 14.1 기준 중 "실제 에디터 붙여넣기"는 2단계에서 판정한다.

### 2단계. 실제 에디터 검증 (2~4일, 추정)
| ID | 작업 | 예상 파일 | 완료 조건 |
|---|---|---|---|
| 2-1 | 검증용 테스트 페이지 묶음 생성 | `fixtures/editor-probe/*.html` (기능별 1개) | 9.3의 기능이 하나씩 분리된 조각 |
| 2-2 | 붙여넣기 왕복 테스트 (사용자 또는 담당자) | `docs/editor-sanitizer-report.md` | 기능별 보존/변형/삭제 결과 기록 |
| 2-3 | 폴백 옵션 반영 | `packages/core/src/render-options.ts`, helper 수정 | 삭제되는 기능에 대해 대체 출력(예: `var()` 펼침, hex 폴백)이 옵션으로 동작하고 테스트 통과 |

### 3단계. 상위 타입 확장 (2~3주, 추정)
- 작업 단위: **타입 1개 = 작업 1개** (`packages/core/src/types/typeXX.ts`, `fixtures/types/typeXX/*`, 테스트).
- 순서: P2(type07, 09, 10, 02, 03) → P3(type26, 11, 04, 25, 15, 17, 27).
- 타입마다 8장의 DoD 충족.
- **단계 완료 조건:** `convert --all` 기준 P1~P3 타입 섹션의 fallback 비율 5% 이하(추정 목표치, 0단계 inventory 후 조정).

### 4단계. 나머지 타입과 변형 (2~4주, 추정)
- P4 → P5 → P6 순서. 작업 단위는 3단계와 같다.
- 페이지 전용 클래스(`sub0201`, `doctor-list` 등)는 inventory 상위 항목부터 개별 작업으로 등록한다(`packages/core/src/parse/variant-map.ts` 확장).
- **단계 완료 조건:** 37개 타입 모두 레지스트리에 등록되고, 남은 fallback은 모두 리포트에 사유가 있음.

### 5단계. 전체 일괄 변환 (3~5일, 추정)
| ID | 작업 | 완료 조건 |
|---|---|---|
| 5-1 | `convert --all` 실행 | 입력 703 = 출력 HTML 703 = 출력 JSON 703 |
| 5-2 | `verify` | 이미지 `src` 불변, `cms/` 해시 불변, 경로 1:1 통과 |
| 5-3 | 리포트 검토 | `summary.md`에 상태별 개수, 타입별 성공률, http/상대 이미지 목록 수 |

### 6단계. 시각 QA와 보완 (1~3주, 추정)
| ID | 작업 | 완료 조건 |
|---|---|---|
| 6-1 | 샘플링 스크린샷 생성 | `tests/visual/migration.spec.ts`, `output/visual/**` 생성 |
| 6-2 | 등급 기입과 보완 작업 등록 | C·D 등급마다 수정 작업이 등록되고, 수정 후 재검증 |
| 6-3 | 인수 리포트 | `output/reports/acceptance.md`: 최종 상태, 남은 수동 조치 목록 |

---

## 11. 위험과 선행 검증 항목

| 위험 | 선행 검증 | 시점 |
|---|---|---|
| 호스트 프리셋 DOM을 잘못 추정해 스타일이 적용되지 않음 | 0-5 DOM 계약을 작성하고, P1 타입을 iframe 미리보기에서 적용 여부(계산된 스타일) 확인 | 0~1단계 |
| 호스트에 이미 공식 마이그레이션 출력 형식이 있음 (`data-migration-*` 근거, **추정**) | 확인 질문 1. 있다면 그 형식을 DOM 계약의 기준으로 삼는다 | 0단계 전 |
| 에디터가 SVG, `var()`, `style` 일부를 삭제 | 2단계 왕복 테스트. 결과 전까지 hexBox는 옵션 폴백을 준비 | 2단계 |
| `:has()`, `color-mix()` 미지원 브라우저 | 확인 질문 3. 미지원 대상이 있으면 구체값 펼침 출력 | 2단계 |
| 원본 991px 분기와 호스트 1024px 분기 차이 | 992~1023px 구간은 허용 차이로 문서화, 시각 테스트 폭에서 제외 | 6단계 |
| 파서 복구로 의미가 바뀜 | `PARSE_RECOVERED` 진단 파일을 시각 샘플에 전수 포함 | 5~6단계 |
| fallback에 원본 HTML이 노출됨 | escape만 사용, 실행 불가. 운영 HTML에 남길지는 확인 질문 4 | 1단계 |
| 호스트 CSS 원격 변경 | `css-check --remote`. 변경 시 자동 교체 없이 시각 회귀 후 승인 | 상시 |
| 703개 중 비콘텐츠 파일 처리 기준이 모호 | `NON_CONTENT_FILE`로 별도 집계해 리포트에서 분리 | 1단계 |
| 이미지 상대경로가 미리보기에서 깨짐 | 미리보기·시각 테스트에서만 `<base href>`를 원본 위치로 설정(출력 HTML은 그대로). 기준 URL은 확인 질문 6 | 1단계 |

---

## 12. 구현 전에 답이 필요한 확인 질문

1. **호스트의 공식 마이그레이션 형식:** 호스트 CSS에 `data-migration-bg`, `data-migration-slot="hero"`, `.mig-container .mig-section.type-00~30` 프리셋이 이미 있습니다. 이 형식을 만든 기존 변환기나 **프리셋 모드 예시 HTML**(실제 사이트에 붙여 넣은 페이지)이 있나요? 있으면 DOM 계약의 기준으로 삼습니다.
2. **에디터 검증 환경:** 에디터 제품명과 버전, 붙여넣기 테스트를 할 수 있는 계정이나 테스트 페이지가 있나요? 2단계 왕복 테스트를 누가 수행하나요?
3. **지원 브라우저:** `:has()`와 `color-mix()`를 지원하지 않는 브라우저(구형 iOS Safari, 인앱 웹뷰 등)도 지원해야 하나요?
4. **fallback 원문 위치:** 변환하지 못한 섹션의 원본 HTML을 출력 HTML 안에 escape 주석으로 남길까요, 아니면 출력 HTML에는 경고 문구만 두고 원문은 `output/data/*.json`에만 둘까요?
5. **병원별 테마 색:** 병원 ID 폴더(10413, 13168 등)별 기본 색 목록이 있나요? 없으면 전부 기본색(`#164AA0`, 호스트 기본값)으로 변환하고 나중에 `config/themes/`에서 바꾸는 방식으로 진행합니다.
6. **상대경로 이미지의 기준 주소:** `./images`, `../img` 같은 상대경로 이미지는 미리보기와 시각 테스트에서 어떤 기준 URL로 열어야 하나요? (출력 HTML의 주소는 바꾸지 않습니다.)
7. **버전 관리:** 도구 코드를 이 폴더에서 git으로 관리해도 되나요? (`cms/`는 SVN이라 git 대상에서 제외합니다.) 원격 저장소와 배포 위치(Vercel 등)도 정해졌나요?
