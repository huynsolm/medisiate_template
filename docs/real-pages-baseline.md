# 실제 페이지 기준선과 진짜 원본 대조 (진행 기록)

작성: 2026-11-16. 사용자가 `reference/cms-original/`(main `591cff6`)에 원본 자료를 올렸다.

| 폴더 | 내용 |
|---|---|
| `component/` | 원본 CMS 도구의 타입 컴포넌트 HTML 37개(type00~type36). 옵션 설명 주석 포함 |
| `css/` | 원본 `cms.css`, `cms-blue.css`, `cms-nanum.css` |
| `contents/` | **실제 콘텐츠 페이지 703개** (계획서의 `cms/contents`) |

CLI·inventory는 `<root>/cms/contents`를 읽으므로, 로컬에서 `cp -r reference/cms-original cms`로 복사해 실행한다(`cms/`는 gitignore, 커밋하지 않음).

## 1. 왜 다시 맞추는가

3·4단계 타입은 biny cms-preview 재현본(`fixtures/original`)을 원본 구조 기준으로 만들었다. 진짜 원본 컴포넌트와 실제 페이지로 돌려 보니 **재현본과 구조가 다른 곳**이 있었다.

- type10: 육각형 안 핵심 단어가 진짜 원본은 `p.cms-description`(재현본은 `p.cms-title`) → 실제 130개 섹션 **전부** fallback이었다.
- type26: 진짜 원본은 표에 `caption.sr-only`(표 제목)가 있다 → 실제 106개 중 103개 fallback이었다.
- 여러 타입: 실제 페이지는 `li > div.row > .cms-visual`처럼 항목 안에 감싸는 상자를 넣는다 → 직접 자식만 보던 파서가 이미지·글을 못 찾았다.
- type26: 실제 페이지에 `width:*`, `width:%` 같은 오타와 `width="20%"` 속성 표기가 있다 → 오타를 그대로 담아 스키마가 섹션을 거부(`INVALID_DATA`)했고, 속성 표기 너비는 잃고 있었다.

## 2. 일괄 변환 결과 (703개)

| 시점 | success | partial | failed |
|---|---:|---:|---:|
| 진짜 원본 대조 전 (자료 받은 직후) | 187 | 500 | 16 |
| 이번 수정 후 | **255** | 433 | **15** |

partial의 대부분은 섹션 단위 fallback(원본 보존)과 아직 없는 타입(type27~36, type08)이다. failed 15개 중 12개는 콘텐츠가 아닌 파일(header·footer·slider 등)이다.

타입별 섹션 성공률(주요 변화):

| 타입 | 섹션 | 전 | 후 |
|---|---:|---:|---:|
| type10 | 130 | 0% | 73% |
| type26 | 106 | 3% | 69% |
| type25 | 99 | 52% | 79% |

## 3. 이번에 고친 것

1. type10: 핵심 단어를 `cms-title` 또는 `cms-description`에서 읽음.
2. type26: 표 제목(`caption`)을 데이터·출력에 옮김(호스트도 caption을 화면에서 숨김). 열 너비를 style과 width 속성에서 읽고, 브라우저가 무시하는 잘못된 값은 auto로.
3. 공통 `itemPart()`(`packages/core/src/parse/original.ts`): 목록 항목 안의 부분을 감싸는 상자 안까지 찾는다(하위 목록 항목 안은 제외). 12개 타입에 적용.

## 4. 새 검사

- `packages/core/test/real-components.test.ts`: 진짜 원본 컴포넌트를 변환해 fallback이 없어야 한다. 고친 타입부터 넣는다(현재 type10·26·25). 아직 모델에 없는 원본 변형은 이유와 함께 명시(type25 증례 변형).
- `packages/core/test/real-pages.test.ts`: 실제 703페이지에서 **파서가 스키마가 거부하는 데이터를 만들지 않는다**(INVALID_DATA 0). 너비 규칙을 일부러 망가뜨리면 실패함을 확인했다.
- `apps/cli/test/inventory.test.ts`: `cms/`가 생겨 처음으로 실제 실행되어 통과.

## 5. 남은 일 (다음 순서)

1. 진짜 원본 컴포넌트가 아직 실패하는 타입: type02·03·04·07·15 (같은 방식으로 원인 확인 → 수정 → real-components 목록에 추가).
2. 실제 페이지의 손으로 고친 변형(설명 상자 안 소제목·문단 반복, 표 뒤 설명, 한 섹션에 표 여러 개 등) → 공통 "내용 블록" 모델 검토.
3. 아직 없는 타입: type27(66 섹션), type28(46), type30(33), type29(21), type31(19), type33·34·32·08 등. 진짜 원본 컴포넌트를 기준으로 구현.
4. 원본 `cms.css`와 추정값 대조(배경 색상표, type24 번호 모양, type23 정렬 등).
