# 실제 원본 대조 검수 요청 (진짜 원본 컴포넌트 · 실제 703페이지)

작성: 2026-11-16. 이 문서는 Codex 검수용이다. 검수 결과는 `docs/review-real-pages.md`에 쓰고 **같은 브랜치에 커밋·푸시**해 주세요. 코드는 고치지 말고, 판정과 재현 결과만 기록해 주세요.

## 1. 범위

- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`
- 범위: `32af1b6..8abbcbd` (P5 검수 완료 이후). 이 안에 사용자가 올린 원본 자료 병합(`92dc44b`, `reference/cms-original/` 169+파일)이 있다. **자료 자체는 검수 대상이 아니다**(원본 그대로).
- 코드 변경 커밋: `704cfcc`(1차), `8abbcbd`(2차).
- 기록: `docs/real-pages-baseline.md`.

## 2. 배경

3·4단계 타입은 biny cms-preview 재현본을 원본 구조 기준으로 만들었다. 진짜 원본(`reference/cms-original/component/`)과 실제 페이지 703개(`reference/cms-original/contents/`)로 돌려 보니 구조가 다른 곳이 있어 맞췄다. 703페이지 결과: success 187 → **270**, failed 16 → 15(남은 15개 중 12개는 header·footer 등 콘텐츠가 아닌 파일).

## 3. 실행 방법

CLI·inventory·실제 페이지 테스트는 `<root>/cms/contents`를 읽는다. `cms/`는 gitignore다. 로컬에 복사해서 실행한다.

```bash
git fetch origin claude/fervent-volta-ilc7hk
git checkout claude/fervent-volta-ilc7hk
npm ci
cp -r reference/cms-original cms      # Windows: robocopy reference\cms-original cms /E
npm test              # 기대: 702 passed (cms/가 있으면 inventory·real-pages도 실행, 건너뜀 0)
npm run lint
npm run typecheck
npm run test:browser  # 기대: 156 passed
npm run convert -- --all   # 기대: success 270, partial 418, failed 15 (output/reports/summary.md)
```

`cms/`가 없으면 inventory·real-pages 테스트는 건너뛴다(그때 기대: 700 passed, 2 skipped 정도).

## 4. 확인해 주실 것

### 4.1 공통 파서 변경 (가장 중요)
아래는 여러 타입이 함께 쓰는 도우미다. 3·4단계 검수에서 만든 안전장치(조용한 손실 금지, 글 경계, 중복 읽기)와 충돌하거나 우회하는 경로가 없는지 봐 주세요.
- `itemPart()` (`packages/core/src/parse/original.ts`): 목록 항목 안의 부분을 감싸는 상자 안까지 찾는다(하위 목록 항목 안은 제외). 12개 타입에 적용. 하위 항목의 이미지·설명을 상위 항목 것으로 잘못 잡는 경우가 있는지.
- `textsOf()`: 같은 클래스 문단 여러 개를 줄바꿈으로 잇는다. 서로 안에 든 요소는 바깥 것만.
- `readNotes()`·`withNotes()`: `.cms-inner`의 직접 자식 설명 상자를 본문 앞(intro)·뒤(note)로 옮긴다. type07·26만 사용. 본문 판정(`content`)이 틀려 앞뒤가 바뀌거나 놓치는 경우.
- `itemText()`: 항목 자체에 글 클래스가 있으면 항목 글 전체, 아니면 안의 글들. type07·09·11·15. 항목 자체 글과 안쪽 글을 둘 다 읽는 경우가 생기는지(중복 읽기 검사가 잡아야 함).

### 4.2 타입별 변경
- type10: 육각형 핵심 단어를 `cms-title` 또는 `cms-description`에서. 설명 상자의 직접 자식 설명 문단 여러 개를 줄바꿈으로.
- type26: 표 제목(`caption`), 열 너비(style 또는 width 속성, 브라우저가 무시하는 잘못된 값은 auto, 숫자만이면 px), intro/note.
- type02: 도형 안 아이콘 이미지, 목록 아래 글(`.cms-bottom-text`).
- type03: 설명 상자 안 번호 목록(`ul.cms-description-list`). 하위 목록은 `mig-list`/`mig-item` 없이(호스트 지그재그 후손 선택자 회피).
- type07: 글머리 항목 제목, intro/note.

### 4.3 새 검사
- `packages/core/test/real-components.test.ts`: 구현한 26개 타입의 진짜 원본 컴포넌트가 fallback 없이 변환. 예외 3개(type25 #5, type04 #3, type07 #2)는 이유와 함께 명시. 예외가 타당한지.
- `packages/core/test/real-pages.test.ts`: 실제 703페이지에서 INVALID_DATA 0.
- 실제 페이지 결과(`output/reports/report.json`)에서 **success로 나왔지만 실제로는 글이 빠졌거나 두 번 나오는** 섹션이 있는지 표본으로 봐 주세요(브라우저 원본/출력 글 비교 등).

## 5. 알려진 한계 (지적에서 제외해도 되는 것)

- 아직 없는 타입(type08, 27~36)은 fallback으로 보존된다. 다음 단계에서 구현한다.
- 손으로 고친 변형의 긴 꼬리(설명 상자 안 소제목·문단 반복, 한 섹션에 표 여러 개, 표 칸 안 목록 등)는 아직 fallback이 많다. 다음 단계에서 공통 모델을 검토한다.
- 원본 `cms.css`와 추정값(배경 색상표, type24 번호 모양 등) 대조는 아직 하지 않았다.

## 6. 판정 기준과 보고 형식

이전과 같다(Critical / Important / Minor, 위치·재현 입력·실제/기대 결과, 직접 실행과 정적 판독 구분, 마지막에 판정).

## 7. 재검수 (지적 반영 + 이후 작업)

- 반영 기록: `docs/review-real-pages-fixes.md` (I-1~I-3, type01 머리글 순서, 글 순서 대조 테스트).
- 재검수 범위: `8abbcbd..` 이후 전부. 지난 검수 뒤에 들어간 작업도 포함한다:
  - 새 타입 type27·28·29·30·33 (진짜 원본 컴포넌트 기준, `docs/real-pages-baseline.md` 7장). type33은 호스트에 프리셋이 없어 type-27 카드로 출력.
  - **링크** (모든 타입 공통, `docs/real-pages-baseline.md` 6장): 서식 글 안 `<a href>`와 이미지를 감싼 링크를 안전한 주소만 보존(`safeHref`), 위험한 주소는 `UNSAFE_LINK_REMOVED` 경고. 우회 가능한 주소 형태가 있는지 봐 주세요.
- 기대 수치: `npm test` 799 passed, `npm run test:browser` 180 passed, 703페이지 success 314 / partial 374 / failed 15.
- 결과는 `docs/review-real-pages.md`를 갱신해 같은 브랜치에 커밋·푸시해 주세요.

## 8. 2차 재검수

- 반영 기록: `docs/review-real-pages-fixes.md` 마지막 장(R-I-1, R-I-2). 범위: `f2e48e4..` 이후.
- R-I-2는 type29만 고치지 않고 **변환 중 섹션별 글 순서 검사**(모든 타입)로 막았다. 이 검사가 정상 원본을 잘못 fallback시키는 경우(서식·공백·생성 글 차이 등)와, 순서가 바뀌었는데도 통과하는 경우가 있는지 봐 주세요.
- type15 "문단이 글머리 앞" 입력은 이제 fallback이다(3단계 순서 정규화 합의를 더 안전한 쪽으로 변경).
- 기대 수치: `npm test` 804 passed, `npm run test:browser` 180 passed, 703페이지 success 314 / partial 374 / failed 15.

## 9. 3차 재검수

- 반영 기록: `docs/review-real-pages-fixes.md` 마지막 장. 범위: `237d543..` 이후.
- 순서 검사: 생성 순번은 렌더러가 검사용 출력에서만 빼고(`orderCheck`), 비교에 링크 위치·주소를 넣었다. 다른 역할(이미지 위치, 표 칸 등)끼리 같은 글로 바뀌는 경우가 또 있는지 봐 주세요.
- type33 Q&A(섹션별 모드, `strategyFor`, `orderCheckIgnores`)도 범위에 넣었다. 일반 모드 블록이 프리셋 블록과 섞인 페이지에서 감싸개가 나뉘는지, Q·A 표시 예외가 실제 글을 숨기지 않는지 봐 주세요.
- 기대 수치: `npm test` 811 passed, `npm run test:browser` 180 passed, 703페이지 success 317 / partial 371 / failed 15.
