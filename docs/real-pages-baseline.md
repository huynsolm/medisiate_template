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
| 1차 수정 후 (`704cfcc`) | 255 | 433 | 15 |
| 2차 수정 후 (구현한 26개 타입의 진짜 원본 컴포넌트 전부 통과) | 270 | 418 | 15 |
| 새 타입 type27·28·29·30·33 + 링크 수정 후 | **314** | 374 | **15** |

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

## 5. 2차: 구현한 26개 타입의 진짜 원본 컴포넌트

구현한 26개 타입의 진짜 원본 컴포넌트를 **모두** `real-components.test.ts`에 넣었다. 아래 원본 변형 3개만 이유와 함께 fallback(원본 보존)으로 남긴다.

| 타입·섹션 | 이유 |
|---|---|
| type25 #5 | 증례 변형(번호·제목 + 설명 + 이미지 줄 여러 개)은 아직 모델에 없음 |
| type04 #3 | 병원 전용 마크업(`div.description > div.text-description` 3칸 상자). 원본 도구 클래스가 아님 |
| type07 #2 | 이미지+목록 묶음을 한 섹션에 여러 번 반복(실제 페이지 160개 중 1개) |

고친 것:
1. type02: 도형 안 **아이콘 이미지**(원본 옵션), 목록 아래 글(`.cms-bottom-text` 말풍선 등).
2. type03: 설명 상자 안 **번호 목록**(`ul.cms-description-list`). 항목 자신의 번호·제목·설명은 번호 목록 밖에서만 읽는다. 호스트 지그재그 규칙이 후손 선택자라 하위 목록은 `mig-list`/`mig-item`을 쓰지 않는다.
3. 공통 `textsOf()`: 설명 상자에 같은 클래스 문단이 여러 개면 줄바꿈으로 잇는다(type04·10·16·25 설명).
4. 공통 `readNotes()`·`withNotes()`: 본문 앞뒤 설명 상자(안내 글·주의 글)를 `intro`·`note`로 옮긴다. type07·26부터 적용.
5. 공통 `itemText()`: `li.cms-list-item.cms-description`처럼 항목 자체에 글 클래스가 붙은 경우(type07·09·11·15 글머리).
6. type07: 글머리 항목의 선택 제목(`p.cms-title`).

기존 원본 fixture의 HTML 출력은 바뀌지 않았다(type02·03 JSON에 빈 새 칸만 추가).

## 6. 링크 (모든 타입 공통, 경고 없는 손실이었음)

실제 페이지에 `<a href>` 링크가 367개 있다(주석 안 제외 시 섹션 안 링크 기준). 서식 허용 목록에 `a`가 없어 **글만 남고 주소가 사라졌는데 success**였다(경고 없음). 제안서도 "링크는 텍스트·밑줄·명시적 버튼 형태로 정적 표현"이라 링크는 남아야 한다.

- 글 안 링크: `a`를 서식 허용 목록에 넣고 주소를 검사한다(`safeHref`, `packages/core/src/html/rich-text.ts`). http(s)·mailto·tel·상대 주소(`/a`, `../a`, `a.html`, `#id`)만 허용. 브라우저처럼 탭·줄바꿈을 지운 뒤 scheme을 본다(`java\tscript:` 차단). `target="_blank"`는 `rel="noopener noreferrer"`와 함께 유지. 다른 속성(onclick, data-toggle 등)은 버린다.
- 위험한 주소는 글만 남기고 **`UNSAFE_LINK_REMOVED` 경고**를 남긴다(실제 페이지에는 0건).
- 이미지를 감싼 링크(동영상 썸네일 `<a href><img></a>`): 이미지 참조에 `link`·`newTab`을 두고 같은 주소 검사를 거쳐 다시 감싸 출력한다. 편집기·JSON으로 들어온 링크도 스키마에서 검사한다.
- 확인: 페이지마다 "원본 섹션 안 링크 수(주석 제외)"와 "출력 링크 수(fallback 원본 보존분 포함)"를 비교해 **줄어든 페이지 0개**.

## 7. 새로 만든 타입 (진짜 원본 컴포넌트 기준)

| 타입 | 실제 섹션 | 변환 | 구조 | 호스트 출력 |
|---|---:|---:|---|---|
| type27 | 66 | 71% | 원 안 작은 글·값(+아이콘), 원 아래 설명, 목록 뒤 설명 | type-27 카드 |
| type28 | 46 | 70% | 작은 강조 상자, 이미지, 설명 문단, 설명·이미지 순서, 목록 | type-28 |
| type29 | 21 | 86% | 이미지, 가운데 설명, 버튼 링크 | type-29 |
| type30 | 33 | 100% | 장비 묶음(이미지·작은 글·제목·설명·소제목·번호 단계) | type-30(column-reverse에 맞춰 글→이미지 순서) |
| type33 | 56 | 63% | 실제 페이지 형태 = type27과 같은 원 목록(아이콘 위치만 다름) | **type-27 카드**(호스트에 type-33 프리셋 없음) |

### type33 Q&A (섹션별 모드)
type33의 Q&A 아코디언은 호스트 `mig-faq-*`가 맞는데, 이 규칙은 **일반 모드에만** 있다. 그래서 타입 정의에 섹션별 모드 선택(`strategyFor`)을 더했다.
- 원 목록 형태 → 프리셋(type-27 카드), Q&A 형태(원본 `dl.cms-inner-box` 또는 편집기에서 Q&A 항목을 넣은 경우) → 일반 모드. 한 페이지에 섞이면 변환기가 블록을 나눠 각자 `.migration-content`로 감싼다(호스트 FAQ 규칙은 `.mig-container`가 없는 감싸개에서만 적용).
- 출력: `.mig-faq-wrap > .mig-faq-item > .mig-faq-question(strong.mig-title) + .mig-faq-answer(p.mig-desc[, ul])`. 원본은 질문을 눌러 펼치지만 제안서 원칙대로 답을 모두 펼친다. 원본의 Q·A 표시 span은 호스트 CSS(::before)가 다시 그리므로 옮기지 않는다.
- 글 순서 검사는 타입이 선언한 표시 요소만 뺀다(`orderCheckIgnores`, type33은 dt·.copy 바로 아래의 Q/A 한 글자 span). 다른 곳의 "Q" 글자는 그대로 검사한다.
- 답 = 목록 앞 글 + 첫 목록(`ul.cms-list-box`). 목록 뒤 글이나 두 번째 목록은 담지 않아 fallback.
- 질문의 아코디언 `button`은 줄 안 요소로 인정(글 유지, 펼치기 동작은 정적 표현).
- Chromium(호스트 CSS) 확인: Q·A 표시가 그려지고 답이 모두 보인다. 실제 Q&A 섹션 3개 변환, type33 63% → 68%.

## 8. 남은 일 (다음 순서)

1. 실제 페이지의 손으로 고친 변형(설명 상자 안 소제목·문단 반복, 표 뒤 설명, 한 섹션에 표 여러 개 등) → 공통 "내용 블록" 모델 검토.
2. type33 Q&A(일반 모드 `mig-faq-*`): 형태별 모드 지원이 필요. 남은 타입 type31(19, 일반 모드 dl 목록), type34(11), type32(5), type08(4).
3. 원본 `cms.css`와 추정값 대조(배경 색상표, type24 번호 모양, type23 정렬 등).
