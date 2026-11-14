# 1단계 지적 사항 반영 재검수 보고서

## 1. 요약

**판정: 미완료 — Critical 회귀 수정 후 다시 확인 필요**

`f3f662a..8e0e431`의 5개 커밋은 I-3, I-4, M-1을 해결했고, I-1·I-2·I-6·M-4와 PC/MO 배경은 일부 개선했다. 그러나 I-5의 stale 출력 정리 과정에 추가된 `safeRemove()`가 상위 디렉터리 심볼릭 링크를 따라가 output 밖의 실제 파일을 삭제한다. 독립 재현에서 `victim/important.html` 삭제를 직접 확인했으며, 링크가 `cms/contents`를 가리키면 원본 손실로 이어질 수 있으므로 **Critical**로 판정한다.

코드는 수정하지 않았다. 이 문서는 정적 판독과 직접 실행 결과를 구분해 기록한다.

## 2. 검수 범위

- 브랜치: `claude/upbeat-shannon-rfbjil`
- 범위: `f3f662a..8e0e431` (5커밋)
- 대상 커밋
  - `5efad686`: fullBleed 길이 검증, safeWrite symlink 보강
  - `43b5a653`: inline style, type01 변형, lossless fallback, 이미지 경고
  - `7f29b45`: 삭제된 원본의 stale 출력 정리
  - `b47fffb`: PC/MO 배경 분리, 필수 브라우저 테스트 명령
  - `8e0e431`: 검수 반영 결과와 DOM 계약 문서화

스크래치패드의 `CODEX*재검수*요청.md`는 Claude 임시 환경 경로라 이 실행 환경에서 열 수 없었다. 따라서 사용자 메시지에 적힌 범위·재현 절차·판정 기준과 GitHub 변경분을 기준으로 검수했다.

## 3. 직접 실행 결과

### 3.1 실행함 — safeRemove 디렉터리 링크 재현

GitHub `8e0e431`의 `apps/cli/src/fs/safe-write.ts`를 그대로 분리해 다음 조건으로 실행했다.

1. 임시 루트 아래 `victim/important.html` 생성
2. `output/contents`를 `victim`으로 향하는 디렉터리 링크(Windows junction)로 생성
3. `output/contents`를 순회해 현재 `safeRemove(root, output/contents/important.html)` 호출

실행 명령:

```text
node work/review-repro/repro.ts
```

실제 결과:

```json
{"victimResult":"DELETED"}
```

판정: **재현됨.** `lstat(resolvedTarget)`은 부모 링크를 따라간 뒤 링크 너머의 일반 파일을 반환하고, `rm(resolvedTarget)`도 같은 파일을 삭제한다.

### 3.2 실행함 — Windows test:browser

현재 커밋의 npm script를 Windows에서 실행했다.

```text
npm run test:browser
```

실제 결과:

```text
> REQUIRE_BROWSER=1 vitest run tests/web tests/visual
'REQUIRE_BROWSER'은(는) 내부 또는 외부 명령 ... 아닙니다.
```

판정: **테스트 시작 전 실패.** POSIX 환경변수 문법이라 Windows npm에서 동작하지 않는다.

### 3.3 실행하지 못함

현재 환경은 GitHub connector로 파일을 읽고 쓸 수 있지만 터미널의 GitHub/npm 네트워크가 차단되어 전체 저장소 checkout과 의존성 설치를 할 수 없었다. 따라서 아래는 직접 실행하지 못했다.

- `npm test`
- `npm run lint`
- `npm run typecheck`
- 프로젝트의 실제 `convert --all`
- Playwright PC/MO/에디터 시각 테스트
- 실제 `cms/` 데이터 변환

커밋된 테스트 코드는 정적으로 읽어 입력·기대 결과를 확인했으며, 실행한 것으로 간주하지 않았다.

## 4. 항목별 판정

| 항목 | 판정 | 확인 결과 |
|---|---|---|
| I-1 inline style 이관·진단 | **부분 해결** | 루트 section까지 스캔하고 누락 선언을 warn으로 남긴다. 그러나 계획서 허용 목록 중 `text-align`, `width`, `max-width`가 구현되지 않았고, p/h 등의 요소 자체 style도 모두 버린다. |
| I-2 type01 변형 보존 | **부분 해결** | 코드상 `highlight → highlight`는 보존된다. 하지만 `highlight`가 추정 클래스라 실제 `cms/`에서 확인되기 전에는 완료로 볼 수 없다. |
| I-3 이미지·텍스트 손실 | **해결됨** | 3장 이상 이미지 또는 추출되지 않은 텍스트가 있으면 섹션 전체를 fallback으로 보내며 fallback이 원본 이미지를 모두 렌더한다. 보수적 판정으로 fallback이 늘 가능성은 있으나 조용한 손실은 막는다. |
| I-4 fullBleed CSS 주입 | **해결됨** | schema와 렌더 양쪽에서 단일 CSS 길이만 허용한다. `0; ...` 주입 입력도 테스트에 포함됐다. |
| I-5 stale 출력 정리 | **새 문제** | 일반 디렉터리의 stale 파일 정리는 구현됐지만, `safeRemove`가 디렉터리 링크 너머를 삭제하는 Critical 회귀를 만들었다. |
| I-6 symlink/쓰기 안전성 | **부분 해결** | 기존 target 파일 symlink와 이미 존재하는 부모 링크는 검사한다. 검사 후 부모/target이 링크로 교체되는 TOCTOU 경합은 남아 있다. 삭제 경로는 별도의 Critical 문제가 있다. |
| M-1 이미지 상태 수준 | **해결됨** | HTTP/상대경로 이미지를 warn으로 올려 파일을 partial로 분류한다. |
| M-4 Playwright 완료 게이트 | **부분 해결** | `REQUIRE_BROWSER=1` 강제 경로는 추가됐다. 그러나 Windows에서 npm script 문법이 동작하지 않고, 기본 `npm test`는 여전히 브라우저 테스트를 skip할 수 있다. |
| bg-image-1/2 PC/MO 분리 | **부분 해결** | 모델·파서·렌더·시각 테스트가 추가됐고 정적 구조는 의도와 맞는다. 필수 브라우저 명령이 Windows에서 실행되지 않고 이번 환경에서도 Playwright를 실행하지 못해 실제 화면 완료 증거는 없다. |

## 5. 발견 사항

### Critical

#### C-1. stale 정리가 output 디렉터리 링크 너머의 파일을 삭제한다

- 위치:
  - `apps/cli/src/commands/convert.ts:111-125`
  - `apps/cli/src/fs/safe-write.ts:57-67`
- 문제: cleanup 시작 디렉터리의 실제 경로를 검증하지 않은 채 `walk(dir)`로 순회하고, `safeRemove()`는 대상의 문자열 경로만 output 내부인지 검사한다.
- 직접 재현 입력:
  - 현재 변환 대상 HTML 0개
  - `output/contents -> victim/`
  - `victim/important.html` 존재
- 직접 확인 결과: `victim/important.html` 삭제.
- 영향:
  - output 밖 임의 디렉터리 파일 삭제
  - 링크가 `cms/contents`를 가리키면 원본 HTML 삭제
  - 삭제 대상 디렉터리가 크면 다수 파일 손실
- Critical 판정 이유: 도구의 핵심 안전 원칙인 “cms 원본 불변”을 깨고, 복구 불가능한 데이터 손실을 실제로 재현했다. 네트워크 공격자가 없어도 이전 작업이나 사용자가 만든 링크만으로 발생한다.
- 제안:
  1. cleanup의 세 루트(`output/contents`, `output/data`, `output/reports/files`)를 순회하기 전에 `lstat`으로 링크·junction을 거부한다.
  2. 각 루트와 삭제 대상 부모의 `realpath`가 실제 `output` realpath 아래인지 삭제 직전에 확인한다.
  3. 일반 `walk()` 대신 symlink를 절대 따라가지 않는 `safeWalkOutput()`을 사용한다.
  4. 가능하면 이번 실행에서 생성한 manifest와 기존 manifest의 차이만 삭제하고, 전체 디렉터리 스캔을 피한다.
  5. POSIX directory symlink와 Windows junction을 모두 포함한 “원본 0개” 회귀 테스트를 추가한다.
  6. 수정 전까지 `convert --all`의 stale 자동 삭제 기능을 비활성화하는 것이 안전하다.

### Important

#### I-7. safeWrite 검사와 실제 쓰기 사이의 TOCTOU가 남아 있다

- 위치: `apps/cli/src/fs/safe-write.ts:40-53`
- 문제: 부모 realpath 검사와 target `lstat` 이후 실제 `writeFile` 전에 부모 디렉터리 또는 target이 링크로 교체될 수 있다.
- 정적 재현 시나리오:
  1. 검사 시점에는 정상 output 경로
  2. 다른 프로세스가 검사 직후 부모를 외부 디렉터리 링크로 교체
  3. `writeFile(..., 'w'|'wx')`가 교체된 경로를 따라 외부 파일을 쓰거나 생성
- 제안: target 자체는 `O_NOFOLLOW`를 사용하는 file handle 기반 쓰기를 검토하고, 임시 파일 생성·fsync·rename을 같은 검증된 디렉터리에서 수행한다. 부모 경로 경합까지 공격 모델에 포함한다면 Node의 경로 기반 API만으로 완전한 보장은 어렵다는 점을 문서화하고, 실행 중 output 디렉터리에 대한 외부 변경을 금지해야 한다.

#### I-8. inline style 해결 범위가 계획서 허용 목록보다 좁다

- 위치:
  - `packages/core/src/html/rich-text.ts:11-27`
  - `packages/core/src/parse/common.ts:14-24`
- 문제:
  - 현재 유지: rich text 태그의 `color`, `background-color`, `font-weight`
  - 계획서 5.2 허용 목록: 위 속성 외 `text-align`, `width`, `max-width`
  - `p style="text-align:center;color:red"`처럼 허용 후보가 블록 요소 자체에 붙으면 전부 drop된다.
- 실제 입력별 정적 결과:
  - `<span style="color:red;position:fixed">x</span>` → color 유지, position 경고: 적절
  - `<span style="text-align:center;width:50%">x</span>` → 둘 다 제거·경고: 계획과 다름
  - `<p style="text-align:center;color:red">x</p>` → 둘 다 제거·경고: 계획과 다름
- 제안: 계획을 축소할지 구현을 넓힐지 먼저 결정한다. 구현을 넓히면 속성별 허용 태그와 값 schema를 별도로 정의하고, width 계열은 단일 안전 길이/퍼센트만 허용한다.

#### I-9. 필수 브라우저 테스트 명령이 Windows에서 실행되지 않는다

- 위치: `package.json:18`
- 문제: `"test:browser": "REQUIRE_BROWSER=1 vitest ..."`는 POSIX shell 문법이다.
- 직접 확인 결과: Windows npm에서 `REQUIRE_BROWSER` 명령을 찾지 못해 vitest가 시작되지 않았다.
- 제안: `cross-env REQUIRE_BROWSER=1 vitest ...`를 사용하거나, Node 스크립트에서 환경변수를 설정해 vitest를 spawn한다. CI에는 이 명령을 필수 job으로 등록한다.

### Minor

#### M-2. type01 변형명은 여전히 실데이터 확인이 필요하다

- 위치: `packages/core/src/types/type01.ts:25-29`
- 문제: 구현 주석 자체가 `highlight`를 추정 클래스라고 밝힌다.
- 입력과 결과: `class="cms type01 highlight"`는 highlight로 동작하지만 실제 원본이 다른 클래스명을 쓰면 UNKNOWN_CLASS 또는 default가 된다.
- 제안: 실제 `cms/component/type01.html`과 contents 표본에서 클래스명을 확정한 뒤 fixture를 교체한다.

#### M-3. uncoveredText는 안전 쪽으로 과도하게 fallback할 수 있다

- 위치:
  - `packages/core/src/parse/common.ts:103-116`
  - `packages/core/src/types/type01.ts:58-64`
- 문제: 공백을 제거한 전체 텍스트에서 추출 문자열을 순차 제거하는 휴리스틱이다. 조용한 손실보다는 안전하지만 특이한 중복·비정상 중첩 마크업에서 오탐하면 변환 가능한 섹션도 fallback이 된다.
- 영향: 원본 손실은 막지만 fallback 비율이 과대 집계될 수 있다.
- 제안: 실제 type00/type01 표본 corpus로 오탐률을 측정하고, 추출한 DOM 노드를 표시한 뒤 “미소비 텍스트 노드”를 직접 찾는 방식으로 발전시킨다.

## 6. 배경 PC/MO 분리 검토

정적 구조는 다음과 같아 의도와 일치한다.

- 모바일 이미지: section 배경 + `data-bg-scope="mobile"`
- PC 이미지: section 내부 `.common-display-pc` 절대 배경 레이어
- 편집 화면: 호스트의 `design-edit-page` 규칙에 따라 모바일 쪽 표시
- bg-image-1/2의 `*_m.jpg`와 모바일 배경색을 variant map에서 모델로 이관

다만 다음은 실행 확인이 남았다.

1. `z-index:-1` 레이어가 실제 호스트 CSS의 stacking context에서 모든 섹션 조합에 보이는지
2. preset/general 각각 PC 1100, MO 360, editor 1100 결과
3. bg-image-2와 overlay 조합
4. 모바일 원본 분기 991px와 호스트 분기 1024px 사이의 의도된 차이

따라서 코드 구조는 수용 가능하지만 브라우저 필수 테스트가 통과하기 전까지 **부분 해결**로 판정한다.

## 7. 테스트 보강 필요 사항

1. `output/contents` 자체가 외부를 가리키는 directory symlink/junction인 테스트
2. 변환 대상 HTML 0개인 `convert --all` 테스트
3. 링크 대상이 `cms/contents`인 경우 원본 해시 불변 테스트
4. cleanup 시작 디렉터리와 삭제 직전 부모 realpath 검증 테스트
5. safeWrite의 검사 직후 target/parent 교체 경합 테스트
6. inline style의 `text-align`, `width`, `max-width`, 대문자 속성, 중복 선언, 잘못된 선언 입력
7. 실제 type01 변형 클래스 fixture
8. Windows와 Linux에서 동일하게 실행되는 `test:browser`
9. bg-image-1/2 각각의 preset/general PC·MO·editor 실행 결과

## 8. 다음 단계 전 필수 조치

1. **최우선:** `safeRemove`와 cleanup 순회가 directory symlink/junction을 따라가지 않도록 수정한다.
2. 위 Critical 재현 테스트가 실패에서 통과로 바뀌기 전까지 stale 자동 삭제를 배포하지 않는다.
3. Windows 호환 `test:browser` 명령으로 바꾸고 실제 Playwright 결과를 남긴다.
4. inline style 허용 범위를 계획과 맞추거나 계획을 명시적으로 수정한다.
5. 실제 `cms/` 표본으로 type01 변형, 텍스트 lossless 판정, PC/MO 배경을 확인한다.

## 9. 처리 결과 (구현 측, 2026-11-14)

사용자 결정: I-8은 **구현을 계획서 5.2에 맞춘다.** 브랜치는 `claude/fervent-volta-ilc7hk`로 옮겨 이어서 작업한다 (`f912c1c` 위에 커밋).

| 항목 | 결과 | 커밋 | 확인 테스트 (수정 전 실패 확인) |
|---|---|---|---|
| C-1 링크 너머 삭제 | 수정. ① `safeRemove`가 부모의 실제 경로(realpath)가 output 안인지 확인 ② `output` 자체가 링크이거나 실제 위치가 `cms`와 겹치면 쓰기·삭제 모두 거부 ③ `--all` 정리 시작 폴더가 링크면 정리하지 않고 종료 코드 1 ④ `--all`인데 원본 `.html`이 0개면 정리하지 않고 종료 코드 1 | `39422cc` | `apps/cli/test/convert.test.ts` "C-1" 2건, `safe-write.test.ts` "C-1" 2건 |
| 추가 발견 | **`output` 자체가 `cms`를 가리키는 링크면 이전 `safeWrite`가 원본을 덮어쓸 수 있었다** (부모 realpath 검사가 링크된 output 기준으로 통과). 위 ②로 함께 막음 | `39422cc` | `safe-write.test.ts` "refuses to write or remove when output itself links into cms" |
| I-9 Windows test:browser | 수정. `node scripts/test-browser.mjs`가 `REQUIRE_BROWSER=1`을 넣고 vitest를 실행. npm script에 POSIX 환경변수 문법이 없는지 테스트 | `70a1df7`, `8d90b20` | `tests/scripts/package-scripts.test.ts`. Linux에서 Playwright 있음 → 12 통과·종료 0, 없음 → 종료 1 확인. **Windows 실행은 미확인** |
| I-7 TOCTOU | 부분 수정. 같은 폴더의 새 임시 파일(`wx`)에 쓰고 부모 경로를 다시 확인한 뒤 `rename`. 검사 뒤 대상이 링크로 바뀌어도 링크를 따라가지 않고 링크 자체를 교체 | `91f46d5` | `safe-write.test.ts` "I-7" (검사 훅에서 대상을 링크로 바꿔 재현) |
| I-7 남은 한계 | 마지막 부모 확인과 `rename` 사이에 부모 폴더가 링크로 바뀌는 경우는 Node 경로 API로 막을 수 없음. 변환 중 output을 다른 프로세스가 바꾸지 않는다고 가정하고 코드 주석에 명시 | — | — |
| I-8 inline style 범위 | 수정. `p`, `h1~h6` 자신의 `color`·`background-color`·`font-weight`·`text-align`·`width`·`max-width`를 `<span style="display: block; …">`로 서식 텍스트 안에 보존. 블록 span 옆에는 `<br>`를 넣지 않음. 그 밖의 요소(`div`, `li`, 루트 `section` 등)는 옮길 자리가 없어 계속 `INLINE_STYLE_DROPPED` | `e711430` | `packages/core/test/review-fixes.test.ts` "I-8" |
| M-2 type01 변형명, M-3 uncoveredText 오탐 | 미처리. 실제 `cms/` 표본이 있어야 확인 가능 | — | — |
| bg-image PC/MO 실행 확인 | 이 환경(Linux)에서 `npm run test:browser` 12 통과. 991~1024px 구간 차이는 계획서대로 허용 차이 | — | `tests/visual/background.test.ts` |

알려진 한계: I-8의 블록 span은 `isHeading`이 클래스로 찾은 `div.tit` 같은 제목에는 적용되지 않는다. 그 style은 계속 버리고 진단을 남긴다.

검증 (Linux): `npm test` 139 통과·1 건너뜀(inventory, `cms/` 필요), `npm run test:browser` 12 통과, `npm run typecheck`·`npm run lint` 오류 없음.


## 10. Codex 최종 재검수 (Windows, 2026-11-14)

### 10.1 범위와 판정

- 브랜치: `claude/fervent-volta-ilc7hk`
- 범위: `f912c1c..a6e3752` (수정 5커밋 + 문서 1커밋)
- 확인한 HEAD: `a6e375267967617a098e1b9e6f065b0e1604afbc`
- 코드 수정: 하지 않음

**판정: 조건부 완료 — C-1 Critical 회귀는 해결됨. 다만 일반 권한 Windows에서 `npm test`가 파일 symlink 테스트 준비 단계의 `EPERM`으로 실패할 수 있어, Windows 테스트 게이트 수정 후 최종 완료 판정이 필요하다.**

### 10.2 Windows에서 직접 실행한 결과

실행 환경: Windows `win32`, Node `v24.14.0`.

GitHub `a6e3752`의 `apps/cli/src/fs/safe-write.ts`를 그대로 분리해 실제 Windows junction으로 실행했다.

| 입력 | 실제 결과 | 판정 |
|---|---|---|
| `output/contents` junction → 외부 `victim`, 링크 너머 `important.html`에 `safeRemove` | `safeRemove`가 거부하고 `important.html` 내용 `keep` 유지 | **통과** |
| `output` junction → `cms/contents`, 같은 경로에 `safeWrite`·`safeRemove` | 두 작업 모두 거부하고 원본 `a.html` 내용 `original` 유지 | **통과** |
| 기존 일반 출력 파일에 `safeWrite` 두 번 | Windows에서도 임시 파일 + `rename`으로 `one → two` 교체 | **통과** |
| 검사 훅에서 대상 파일을 file symlink로 교체 | symlink 생성 시 Windows가 `EPERM` 반환 | **테스트 준비 실패** |

C-1의 실제 데이터 손실 재현 조건은 더 이상 성립하지 않았다. `convert --all`의 원본 HTML 0개 방어는 cleanup 전에 종료하도록 배치됐고, cleanup 시작 폴더 링크 거부와 삭제 대상 부모 `realpath` 검증도 정적으로 확인했다.

### 10.3 Windows `npm run test:browser`

현재 작업공간에는 저장소 checkout과 `node_modules`가 없고 터미널 npm 네트워크도 사용할 수 없어 실제 Vitest/Playwright 12개는 다시 실행하지 못했다. 실행한 것과 실행하지 못한 것을 구분하면 다음과 같다.

- **직접 확인함:** 동일한 `package.json` 명령과 동일한 `scripts/test-browser.mjs`를 Windows npm으로 시작했다. `npm → node` 진입이 성공했고, 제어된 `vitest/node` 대역에서 `REQUIRE_BROWSER=1`, mode `test`, 필터 `tests/web`, `tests/visual`, 옵션 `run:true`, `watch:false` 전달을 확인했다. 이전의 `'REQUIRE_BROWSER'은 ... 명령이 아닙니다` 오류는 재현되지 않았다.
- **직접 실행하지 못함:** 실제 Vitest와 Playwright를 사용한 브라우저 12개 테스트. 구현 측 Linux 결과(12개 통과)는 이 재검수에서 다시 실행한 것으로 간주하지 않는다.

따라서 I-9의 **Windows 실행기 시작 문제는 해결됨**으로 판정한다. 실제 Windows 브라우저 결과는 별도 확인이 남는다.

### 10.4 항목별 재판정

| 항목 | 재판정 | 근거 |
|---|---|---|
| C-1 링크 너머 삭제 | **해결됨** | 실제 Windows junction 두 조건에서 쓰기·삭제가 거부되고 원본이 유지됐다. 0 HTML guard와 cleanup 링크 거부도 cleanup 전에 적용된다. |
| I-7 target 교체 TOCTOU | **부분 해결** | 임시 파일 `wx` + 재검사 + `rename` 구조와 Windows 기존 파일 교체를 확인했다. 마지막 부모 검사와 rename 사이의 부모 교체 경합은 문서화된 한계로 남는다. |
| I-8 inline style | **해결됨(선택한 범위)** | `p`, `h1~h6`의 허용 속성을 block span으로 보존하고, 값은 단일 색/길이/정렬 allowlist로 제한한다. `div.tit` 등은 알려진 제외 범위로 진단을 남긴다. |
| I-9 Windows browser runner | **해결됨(시작)** | POSIX inline env 문법이 제거됐고 Windows npm에서 Node runner 및 환경변수 설정까지 직접 확인했다. 실제 Playwright 12개 Windows 실행은 미확인이다. |
| M-2 type01 `highlight` | **미확인 유지** | 실제 `cms/` 표본이 없어 추정 클래스 확정 불가. |
| M-3 `uncoveredText` 오탐 | **미확인 유지** | 실제 corpus가 없어 오탐률 측정 불가. |
| bg-image PC/MO | **부분 해결 유지** | Linux 브라우저 12개 통과 보고는 있으나 이 Windows 재검수에서 실제 브라우저를 실행하지 못했다. |

### 10.5 새 발견

#### Important I-10. 일반 권한 Windows에서 file symlink 테스트가 `EPERM`으로 실패한다

- 위치: `apps/cli/test/safe-write.test.ts`
- 해당 입력:
  - `refuses to write through a target file that is a symlink (I-6)`
  - `replaces a target that became a link instead of writing through it`
- 직접 결과: 현재 Windows 환경은 directory junction 생성은 허용하지만 file symlink 생성은 `EPERM: operation not permitted`로 거부했다.
- 영향: Windows 개발자 모드 또는 관리자 권한이 없는 CI/개발 PC에서는 구현 검증 전에 `npm test`가 실패한다. C-1 junction 테스트가 통과해도 전체 Windows 테스트 게이트를 통과했다고 보고할 수 없다.
- 제안: file symlink 전용 helper에서 `EPERM`을 명시적으로 skip하고, skip 사유를 출력한다. Windows에서 반드시 검증하려면 Developer Mode가 켜진 전용 CI job을 별도로 둔다. directory escape 방어는 현재처럼 junction 테스트로 항상 실행한다.

#### Minor M-5. browser runner의 추가 CLI 인자가 Vitest 옵션이 아니라 파일 필터가 된다

- 위치: `scripts/test-browser.mjs`
- 현재 호출: `startVitest('test', ['tests/web', 'tests/visual', ...process.argv.slice(2)], options)`
- Vitest 4.0.9 API에서 두 번째 인자는 `cliFilters`다. 따라서 `npm run test:browser -- --reporter=dot` 같은 인자는 reporter 옵션이 아니라 테스트 파일 필터로 전달된다.
- 기본 `npm run test:browser`에는 영향이 없다.
- 제안: 추가 인자를 지원하지 않을 것이면 제거하고, 지원할 것이면 Vitest CLI 파서로 옵션을 해석하거나 허용 옵션을 직접 매핑한다.

### 10.6 다음 조치

1. `safe-write.test.ts`의 file symlink 생성 두 곳에서 Windows `EPERM` 처리 방식을 정한다.
2. 일반 권한 Windows에서 `npm test`를 실제 실행해 junction 테스트 통과와 symlink 테스트 skip/통과를 확인한다.
3. 의존성이 설치된 Windows 환경에서 `npm run test:browser`의 실제 Playwright 12개 결과를 확인한다.
4. 위 두 Windows 명령이 통과하면 C-1 관련 재검수는 종료할 수 있다.
