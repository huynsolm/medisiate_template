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
