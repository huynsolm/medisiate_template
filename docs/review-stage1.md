# 1단계 구현 검수 보고서

## 1. 요약

**판정: 조건부 완료**

1-1~1-6의 core 기반, 결정적 렌더, fallback, 샘플 DOM 재현은 계획의 핵심 조건을 대체로 충족한다. 다만 type01 변형의 조용한 유실, 세 번째 이후 이미지의 출력 누락, inline style 진단 누락, 전체 재변환 시 오래된 리포트가 남는 문제 때문에 2단계로 바로 넘어가기에는 위험이 있다. type00·type01 실데이터와 Playwright 시각 비교는 현재 증거만으로 완료 판정할 수 없다.

이번 검수는 GitHub의 `db2a4b0..41c12ce` 10개 커밋을 정적으로 확인했다. 현재 실행 환경에는 저장소 clone과 `cms/` 원본이 없어 `npm test`, lint, typecheck, 실제 일괄 변환은 직접 재실행하지 못했다. 커밋 `41c12ce`에는 GitHub CI 상태도 등록되어 있지 않았다.

## 2. 작업별 판정표

| 작업 | 판정 | 근거 |
|---|---|---|
| 1-1 모델·schema | 충족 | `packages/core/test/model.test.ts`: 최소 PageModel, 버전·색·진단·중복 ID 검증. 타입별 data는 `renderPage()`에서 각 정의의 schema로 추가 검증한다. |
| 1-2 HTML 빌더·allowlist | 충족 | `packages/core/test/html.test.ts`: 텍스트·속성 escape, void 요소, 속성 순서, 허용 태그와 위험 속성 제거. |
| 1-3 공통 헬퍼 | 부분 | fluid, 이미지, 헤더, defs, 배경 테스트는 있으나 `fullBleed.paddingY` 검증이 없어 임의 CSS 선언이 들어갈 수 있다. |
| 1-4 renderPage·테마·레지스트리 | 충족 | `packages/core/test/render-page.test.ts`: 모드 분리, 테마 변수, fallback, 결정성. 블록별 defs와 ID 접두사 구조도 계획과 일치한다. |
| 1-5 샘플 재현 | 충족 | `packages/core/test/sample-acne.test.ts`: 수제 샘플과 정규화 DOM 동일, 두 번 렌더 byte 동일. 다만 정규화기가 주석을 무시한다. |
| 1-6 fallback | 충족 | `packages/core/test/fallback.test.ts`: 경고 블록, 원본 텍스트, escape된 주석, 인접 모드 채택 확인. |
| 1-7 type00·type01 | 부분 | DOM 계약과 parse/render 스냅샷은 있으나 fixture가 실제 `cms/` 표본이 아니고 DoD의 대표 섹션 2개·시각 등급·fallback 비율을 충족하지 못했다. type01 변형 파싱도 유실된다. |
| 1-8 convert·리포트 | 부분 | 합성 트리의 경로·원본 해시·리포트 테스트는 있다. 실제 `cms/contents/01` 8개 변환은 미실행이며, 삭제된 입력의 오래된 파일별 리포트가 남을 수 있다. |
| 1-9 웹 편집기 | 부분 | reducer, schema 기반 폼, 3모드 미리보기, JSON 입출력, core 렌더 공유가 구현됐다. Playwright가 없으면 E2E 전체가 건너뛰어져 현재 브랜치에서 실제 브라우저 통과 증거는 없다. |
| 1-10 시각 비교 | 부분 | PC/MO/에디터 1% 임계값 테스트는 구현됐지만 `describe.skipIf(!pw)`라 Playwright가 없으면 완료 조건을 검증하지 않는다. |

## 3. 발견 사항

### Critical

없음.

### Important

#### I-1. 기존 inline style이 진단 없이 전부 사라진다

- 위치: `packages/core/src/parse/common.ts:14-34`
- 문제: 계획 5.2는 허용 style을 이관하고 나머지를 `INLINE_STYLE_DROPPED`로 기록하도록 했지만, 현재 스캐너는 `style` 속성을 읽지 않는다. 루트 `section` 자체도 `descendants()` 순회에서 제외된다.
- 재현: `<section class="cms type01" style="color:red"><p style="text-align:center">설명</p></section>` → 출력에서 두 style이 사라지지만 해당 진단이 없고 다른 경고가 없으면 success가 될 수 있다.
- 제안: 루트 포함 요소 순회를 만들고 style allowlist를 파싱해 모델로 옮긴 뒤, 이관하지 못한 선언마다 `INLINE_STYLE_DROPPED`를 남긴다. 루트의 `on*` 속성도 같은 순회로 진단한다.

#### I-2. type01의 알려진 변형이 조용히 default로 바뀐다

- 위치: `packages/core/src/types/type01.ts:41-50`
- 문제: `scanSection(src, this.variants)`로 변형 클래스를 “알려진 클래스”로 인정하지만 반환값은 항상 `variant: 'default'`다.
- 재현: `<section class="cms type01 highlight">...</section>` → UNKNOWN_CLASS 없이 `default`로 변환되고 highlight 래퍼가 사라진다.
- 제안: 원본 클래스에서 허용 변형을 결정해 반환하고, 동시에 여러 변형 또는 알 수 없는 조합은 `UNKNOWN_VARIANT`로 기록한다. synthetic fixture에도 highlight parse 사례를 추가한다.

#### I-3. 세 번째 이후 이미지가 출력에서 누락되어 src 불변 조건을 깨뜨린다

- 위치: `packages/core/src/parse/common.ts:75-85`, `packages/core/test/convert.test.ts:51-55`
- 문제: `pairImages()`는 세 번째 이후 이미지를 경고 후 버린다. 테스트도 입력 3장 중 앞 2장만 출력에 존재하는지 확인해 계획 9.1의 img[src] 다중집합 동일 조건을 우회한다.
- 재현: type01 안에 표시 없는 이미지 `a.jpg`, `b.jpg`, `c.jpg` 세 장 → 출력에는 a/b만 남고 c는 사라진다.
- 제안: 손실이 생기면 해당 섹션 전체를 fallback으로 보내거나, 초과 이미지를 보존할 수 있는 lossless 구조를 만든다. 불변성 테스트는 입력·출력의 전체 src 다중집합을 직접 비교한다.

#### I-4. fullBleed.paddingY를 통한 임의 CSS 선언 삽입이 가능하다

- 위치: `packages/core/src/schema/page.ts:40`, `packages/core/src/helpers/background.ts:28`
- 문제: `paddingY`가 임의 문자열인데 그대로 `style.padding`에 들어간다. JSON 파일과 localStorage 초안은 PageModel schema를 통과하므로 style 속성에 추가 CSS 선언을 주입할 수 있다.
- 재현: `paddingY: "0; background-image: url(https://example.test/track)"` → `padding: 0; background-image: ... 0;` 형태의 style이 생성된다.
- 제안: `0` 또는 단일 안전 길이 단위(px, rem, em, %, vh 등)만 허용하는 공용 schema를 만들고 렌더 직전에도 방어적으로 검증한다.

#### I-5. --all 재실행 후 삭제된 입력의 리포트와 출력이 남는다

- 위치: `apps/cli/src/commands/convert.ts:108-122`
- 문제: `--all`은 현재 입력을 다시 쓰지만 `output/reports/files`를 정리하지 않고 디렉터리의 모든 기존 JSON을 합친다. 삭제·이름 변경된 원본의 record가 계속 집계되며 기존 HTML/JSON도 남는다.
- 재현: a.html/b.html로 `--all` 실행 → b.html 삭제 → 다시 `--all` 실행 → report total과 output에 b가 남는다.
- 제안: `--all`에서 현재 입력 상대경로 집합과 기존 record/output을 비교해 stale 항목을 안전하게 제거하거나, 임시 output에 완성 후 원자적으로 교체한다.

#### I-6. 기존 target 파일 symlink는 safeWrite 검사에서 빠진다

- 위치: `apps/cli/src/fs/safe-write.ts:38-46`
- 문제: 부모 디렉터리의 realpath만 검사한 뒤 `writeFile(resolvedTarget)`을 호출한다. target 파일 자체가 output 밖 파일을 가리키는 symlink라면 writeFile이 링크를 따라간다.
- 재현: `output/reports/x.json`을 저장소 밖 또는 `cms/` 파일로 향하는 파일 symlink로 만든 후 safeWrite → 링크 대상이 덮어써질 수 있다.
- 제안: target이 존재하면 `lstat`으로 symlink를 거부하고 realpath가 output 내부인지 확인한다. 가능하면 임시 파일을 같은 디렉터리에 만들고 링크를 따르지 않는 방식으로 rename한다.

### Minor

#### M-1. 이미지 진단 수준이 계획과 다르다

- 위치: `packages/core/src/parse/common.ts:25-37`, `packages/core/src/convert/convert-document.ts:40-44`
- 문제: 계획 5.2는 HTTP/상대경로 이미지를 경고로 설명하지만 구현은 info라 success를 유지한다.
- 재현: 상대경로 이미지만 있는 정상 type01 → `IMAGE_RELATIVE`가 있어도 success.
- 제안: 마이그레이션 완료 상태에서 후속 조치가 필요하다면 warn으로 유지한다. info 정책을 택한다면 계획서와 KPI 정의를 함께 수정한다.

#### M-2. 샘플 정규화가 HTML 주석 차이를 보지 않는다

- 위치: `packages/core/src/html/normalize.ts:19`
- 문제: 모든 주석을 제거하고 비교하여 필요한 주석의 누락·변경을 샘플 재현 테스트가 잡지 못한다.
- 재현: 기준 HTML에 의미 있는 주석을 추가해도 normalize 비교는 동일할 수 있다.
- 제안: 일반 공백 주석만 무시하거나, 보존이 필요한 주석은 별도 assertion으로 검사한다.

#### M-3. 파서 복구 판정은 보조 휴리스틱이다

- 위치: `packages/core/src/convert/convert-document.ts:46-66`
- 문제: 닫는 태그 개수 비교는 RCDATA·특수 파싱 문맥에서 오탐/누락 가능성이 있다.
- 재현: textarea 등에 태그처럼 보이는 문자열이 있는 문서에서 원문 정규식 수와 parse5 트리의 endTag 수가 달라질 수 있다.
- 제안: info 진단으로만 유지하고 깨진 HTML corpus 테스트를 추가한다. 완료/실패 상태의 근거로 사용하지 않는다.

#### M-4. optional Playwright가 완료 조건을 조용히 건너뛴다

- 위치: `tests/support/browser.ts:13-31`, `tests/visual/sample.test.ts:25`, `tests/web/editor.e2e.test.ts:10-12`
- 문제: 일반 테스트 통과만으로는 1-9/1-10 통과 여부를 알 수 없다.
- 재현: Playwright가 없는 환경에서 `npm test` → 브라우저·시각 테스트가 실패가 아니라 skip.
- 제안: 로컬 기본 테스트의 선택적 skip은 유지하되, 1단계 완료용 CI/명령은 Playwright 부재를 실패로 처리하고 결과 이미지·ratio를 artifact로 남긴다.

## 4. Ruling 판정

| # | 판정 | 이유 |
|---:|---|---|
| 1 | 동의 | 풀블리드는 콘텐츠 의미보다 섹션 배치 옵션에 가까워 `text-visual + modifiers` 재사용이 적절하다. 단, padding schema 보강이 필요하다. |
| 2 | 동의 | renderPage가 레지스트리에 의존하므로 1-4 선행은 자연스러운 의존성 정리다. |
| 3 | 동의 | 호스트의 `:has(.mig-container)` 때문에 블록이 분리되며 SVG ID 충돌을 막으려면 블록별 defs와 접두사가 필요하다. |
| 4 | 동의 | fallback이 주변 블록과 같은 모드에 들어가는 것이 구조 보존에 유리하다. fallback만 있는 페이지의 general 기본값도 합리적이다. |
| 5 | 동의 | `<`, `>`, `&`, `--`를 escape해 주석 종료와 “주석 해제 시 실행” 위험을 줄였다. |
| 6 | 확인 필요 | 호스트 계약을 그대로 따르면 숨김이 맞고 PageModel.title 보존도 타당하다. 다만 운영 화면에서 제목을 보여야 한다는 요구가 있으면 프리셋 자체를 바꿔야 한다. |
| 7 | 수정 필요 | 계획은 HTTP/상대경로를 경고로 정의했다. 마이그레이션 후 깨질 가능성이 있는 자산이므로 현재는 warn/partial이 더 안전하다. info를 유지하려면 계획과 완료 KPI를 명시적으로 변경해야 한다. |
| 8 | 수정 필요 | 2~7번 URL은 추정이며 bg-image-1/2의 모바일 전환이 빠졌다. cms.css 기반 정적 PC/MO 매핑으로 교체해야 한다. |
| 9 | 확인 필요 | parse5 한계를 보완하는 info 휴리스틱으로는 타당하지만 정확한 복구 판정으로 간주하면 안 된다. corpus 검증 후 유지 여부를 결정한다. |
| 10 | 수정 필요 | 파일별 요약 저장 방식은 재생성에 유용하다. 다만 `--all`에서 stale record/output을 제거하지 않아 전체 집계가 부정확해질 수 있다. |
| 11 | 동의 | 현재 옵션 규모에는 `parseArgs`가 충분하며 commander 도입 이점이 작다. |
| 12 | 동의 | 최소판에서는 키보드 접근성이 좋은 ↑↓ 버튼이 drag보다 낫다. 향후 drag를 추가해도 버튼은 유지하는 편이 좋다. |
| 13 | 수정 필요 | 개발 환경의 선택적 실행은 가능하지만 1-10 완료 판정은 Playwright가 반드시 있는 별도 CI/명령에서 강제해야 한다. |

## 5. 실데이터 검증 결과

**미실행**

검수 환경에 `cms/` 원본과 실행 가능한 clone이 없어 다음을 실행하지 못했다.

- `npm test -- apps/cli/test/inventory.test.ts`
- `npm run convert -- --dir cms/contents/01`
- 실제 type00/type01 구조와 추정 parser의 일치 여부
- 상태별 개수와 fallback 비율
- 변환 전후 `cms/` 전체 해시 비교

구현 측이 기록한 “109개 통과, 1개 건너뜀, lint·typecheck 통과”는 코드 내 테스트 구성과 모순되지는 않지만 이번 검수에서 재현한 결과는 아니다.

## 6. 2단계 전에 꼭 고칠 것

1. type01 변형 파싱을 보존하고 실제 `cms/` fixture로 교체한다.
2. 세 번째 이후 이미지가 사라지지 않도록 lossless/fallback 정책과 전체 src 다중집합 테스트를 적용한다.
3. inline style allowlist 이관과 `INLINE_STYLE_DROPPED` 진단을 구현한다.
4. `fullBleed.paddingY`를 안전한 CSS 길이 schema로 제한하고 safeWrite의 target symlink를 막는다.
5. `--all` stale 출력·리포트를 정리하고 Playwright 필수 완료 검증을 CI 또는 별도 명령으로 고정한다.

## 7. 확인 질문

1. type00 제목은 운영 공개 화면에서도 숨기는 것이 최종 요구사항인가?
2. HTTP/상대경로 이미지가 하나라도 있으면 파일을 `partial`로 분류할 것인가, 아니면 리포트 정보만 남기고 `success`로 둘 것인가?
3. 이미지가 3장 이상인 원본 섹션은 fallback으로 보존할 것인가, type01 데이터 모델을 확장할 것인가?
4. bg-image-1/2 모바일 전용 배경 URL을 호스트 DOM에 실제 PC/MO 배경 노드 두 개로 출력해도 되는가?
5. 1단계 완료 판정용 CI에 Playwright와 Chromium을 고정 의존성으로 두어도 되는가?

## 8. 처리 결과 (구현 측, 2026-11-14)

사용자가 7장 확인 질문에 아래처럼 답했고, 그에 맞춰 수정했다.

| 질문 | 답 |
|---|---|
| 1. type00 숨김 | 숨김 유지 (제목은 PageModel.title에 보존) |
| 2. http·상대경로 이미지 | warn으로 올려 파일을 partial로 분류 (계획서 5.2와 일치) |
| 3. 이미지 3장 이상 | 지금은 fallback으로 보존. 실데이터 빈도를 보고 모델 확장 결정 |
| 4. bg-image-1/2 모바일 배경 | PC/MO 배경 요소 2개로 출력 |
| 5. Playwright 필수 | `npm run test:browser`에서만 필수, `npm test`는 기존처럼 skip 허용 |

| 항목 | 결과 | 커밋 | 확인 테스트 |
|---|---|---|---|
| I-1 inline style | 수정. 서식 태그의 `color`·`background-color`·`font-weight`는 이관, 나머지 선언은 루트 section 포함 `INLINE_STYLE_DROPPED`(warn). 루트의 `on*` 속성도 진단 | `43b5a65` | `packages/core/test/review-fixes.test.ts` "I-1 inline styles" |
| I-2 type01 변형 | 수정. 원본 클래스 → 변형 표(`TYPE01_SOURCE_VARIANTS`, highlight는 **추정** 클래스명)로 판정, 둘 이상이면 `UNKNOWN_VARIANT` | `43b5a65` | "I-2 type01 variants" |
| I-3 이미지 누락 | 수정. 담을 자리가 없는 이미지·텍스트가 있으면 `LOSSY_PARSE`(warn) + 섹션 전체 fallback. fallback이 원본 이미지를 화면에 출력. type00도 같은 검사 적용. 입력·출력 img[src] 다중집합 비교 테스트 추가 | `43b5a65` | "I-3 lossless parsing" |
| I-4 paddingY 주입 | 수정. schema(`lengthSchema`)와 렌더 직전(`cssLength`) 모두 단일 길이 값만 허용 | `5efad68` | `helpers.test.ts`, `model.test.ts` "I-4" |
| I-5 오래된 출력 | 수정. `--all`에서 현재 원본에 없는 contents/data/reports/files 항목 삭제(`safeRemove`, output 밖·디렉터리 거부, 링크는 링크만 삭제) | `7f29b45` | `apps/cli/test/convert.test.ts` "I-5", `safe-write.test.ts` "safeRemove" |
| I-6 symlink 쓰기 | 수정. 대상이 링크·비정규 파일이면 거부, 새 파일은 `wx`로 생성 | `5efad68` | `safe-write.test.ts` "I-6" |
| M-1 이미지 진단 수준 | 수정 (질문 2 답) | `43b5a65` | "decision 2" |
| M-2 정규화가 주석 무시 | 유지. 샘플의 유일한 주석은 설명용이고 출력 대상이 아니다. 보존이 필요한 주석이 생기면 별도 assertion 추가 | — | — |
| M-3 복구 판정 휴리스틱 | 유지. info 진단으로만 쓰며 상태 판정에 영향 없음 | — | — |
| M-4 Playwright skip | 수정. `npm run test:browser`는 Playwright가 없으면 실패 | `b47fffb` | 환경에서 playwright를 숨기고 실행해 실패 확인 |
| Ruling 8 배경 매핑 | 부분 수정. bg-image-1/2 모바일 이미지·배경색을 cms.css 값으로 반영. 이미지 기준 URL(`http://fxfile.drline.net/cms/public/images/common/`)은 여전히 샘플 1건 근거의 **추정** | `b47fffb` | `tests/visual/background.test.ts` (PC/MO/에디터 × 일반/프리셋) |

추가 발견: 호스트의 `data-bg-scope="desktop"`은 인라인 배경과 함께 쓸 수 없다(`docs/host-dom-contract.md` 4장 주의). PC 배경은 `common-display-pc` 레이어로 출력한다.

검증: `npm test` 128 통과·1 skip(inventory, `cms/` 필요), `npm run test:browser` 통과, `npm run typecheck`·`npm run lint` 통과.

여전히 남은 것: `cms/` 원본으로 type00·type01 parse 규칙과 fixture 교체, `convert --dir cms/contents/01` 실행(5장).
