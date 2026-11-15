# 4단계 P4 검수 요청

작성: 2026-11-15. 이 문서는 Codex 검수용이다. 검수 결과는 `docs/review-stage4.md`에 쓰고 **같은 브랜치에 커밋·푸시**해 주세요. 코드는 고치지 말고, 판정과 재현 결과만 기록해 주세요.

## 1. 범위

- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`
- 범위: `745ee86..a378da6` (1커밋, 29파일, +1273/−9). 3단계 검수 완료(`8a9d79d`, 문서 정정 `745ee86`) 이후 전부다.
- 내용: P4 타입 type18·23·13·06·16·14·19, 이미지 배경 섹션 본문 폭 공통 수정, 검사 확장.
- 참고 문서: `docs/stage4-p4.md`(구현 기록), `docs/host-dom-contract.md`, `fixtures/original/README.md`, 3단계 검수 기록 `docs/review-stage3.md`·`docs/review-stage3-fixes.md`(같은 기준을 P4에도 적용했다).

## 2. 기준 자료에 대한 전제

- 3단계와 같다. 원본 `cms/`와 `cms.css`는 없고, biny cms-preview 타입 정의를 원본 구조의 기준으로 쓴다.
- type33·28·30은 기준 자료가 없어 범위 밖이다(변환 시 fallback).

## 3. 확인해 주실 것

### 3.1 기능 정확성
1. 원본 마크업 → 데이터가 빠짐없이 옮겨지는가. 기대값은 `packages/core/test/p4-types.test.ts`와 스냅샷 `fixtures/types/typeNN/original.expected.{json,html}`.
2. 출력이 호스트 선택자와 맞는가. 특히:
   - type13·14: `.mig-body > .mig-list:first-child > .mig-item > .mig-content`(격자 `auto 1fr 18px`)에 번호·글·체크 세 칸. 번호가 비어도 빈 `span.mig-num`이 남는지.
   - type13: `.mig-highlight-box`가 목록 다음에 와도 목록이 `.mig-body`의 첫 자식으로 남는지.
   - type16: `.mig-item > .mig-content`(격자 `30px 1fr`)에 아이콘·글 두 칸. PC 전용 큰 이미지(`common-display-pc`)와 모바일 전용 글(`common-display-mo`).
3. 웹 편집기에서 새 타입을 고치고 저장·다시 불러오기가 되는가. 특히 type06 하위 글머리(반복 안의 반복), type18 글 스타일 선택, type16 이미지 칸(PC 칸만 사용).

### 3.2 조용한 손실 방지 (가장 중요)
3단계 검수에서 찾은 유형을 P4에도 확인해 주세요.
- **읽었지만 출력하지 않는 값**: 모든 글 칸을 채워 출력에 나오는지 확인하는 일반 테스트가 있다(`stage3-review.test.ts`). 원본 마크업 쪽에서 같은 문제가 생기는 조합이 있는지(예: type06 칸에 글머리와 여러 문단, type23 설명 상자 안 여러 문단, type18 `.cms-visual-text` 안에 같은 클래스 요소가 둘).
- **같은 클래스가 여러 개**: 파서는 대부분 "첫 번째 해당 클래스"를 읽는다(`textOf`). 같은 클래스 요소가 두 번 나오면 두 번째가 `finish()`의 텍스트 비교로 fallback 되는지.
- **이미지**: type16 도형 안 이미지, type06 아이콘 칸에 이미지 3장, type18·23 `.cms-visual` 밖 이미지.
- type13·14: 체크 칸(`.cms-fixed-cell` 두 번째)에 글이나 이미지가 들어오면.
- 요청 전에 반영 측에서 직접 돌려 본 12가지(모두 섹션 fallback으로 원본 보존 확인): type06 둘째 문단·글머리 뒤 문단·아이콘 칸 이미지 3장, type18 둘째 제목·같은 글 제목 중복, type13 체크 칸 글·이미지·둘째 강조 상자, type23 설명 상자 문단 2개·`.cms-visual` 밖 이미지, type16 둘째 모바일 글, type19 도형 안 추가 문단. 이 밖의 조합을 봐 주세요.

### 3.3 보안
- type13·14 체크 SVG는 코드 고정 값만 쓰는지(입력의 SVG를 옮기지 않는지).
- 새 rich 칸(type06 글, type16 모바일 글 등)이 기존 allowlist를 통과하는지.

### 3.4 공통 수정: 이미지 배경 섹션의 본문 폭
- 호스트 `.mig-section[data-migration-bg="true"]`는 가운데 정렬 flex(`align-items: center`)라 `.mig-body`가 내용 폭으로 줄어든다. type06 카드가 PC에서 약 130px로 찌그러졌고 P3의 type11도 같았다.
- 수정: `packages/core/src/types/preset.ts`의 `presetSection`이 이미지 배경 섹션의 본문에만 `align-self: stretch`.
- 확인 요청: 머리글·배경 레이어 배치, 에디터 화면(`html.design-edit-page`), type01(다른 경로)에 부작용이 없는지. 색 배경(`type-bg`만, `data-migration-bg` 없음) 섹션은 원래 본문 폭이 정상이라 손대지 않았다.

### 3.5 호스트가 고정한 배치·디자인
- type18 `text-type-3`: 값 보존 + `PRESET_LAYOUT_FIXED`(info).
- 원본의 고정 열 수(type18 PC 3, type06 PC 4, type16 2, type19 균등)와 type23 가운데 정렬은 진단 없이 호스트를 따른다. 이 구분(원본 도구의 "선택지"만 진단)이 타당한지.

## 4. 실행 방법

```bash
git fetch origin claude/fervent-volta-ilc7hk
git checkout claude/fervent-volta-ilc7hk
npm ci
npm test              # 기대: 387 passed, 1 skipped (inventory: cms/ 필요)
npm run lint
npm run typecheck
npm run test:browser  # Playwright 필요. 기대: 66 passed
```

- 브라우저 배치 검사: `tests/visual/preset-layout.test.ts` — P2·P3·P4 18개 타입 × PC 1100 / MO 360 / 에디터 1100. 가로 넘침, 글 칸 찌그러짐, 하위 목록, 표, 본문 폭.
- 웹 도구: `npm run dev -w apps/web`.

## 5. 알려진 한계 (지적에서 제외해도 되는 것)

- 실제 `cms/contents` 표본 검증, 원본 화면과의 시각 등급 비교, inventory 기준 fallback 비율은 `cms/` 원본이 있어야 한다.
- 장식 도형 SVG(type16·19 육각형)는 옮기지 않는다(안의 글은 옮김).
- 3단계에서 합의한 제한(칸 안 여러 문단은 `<br>`, type15 글머리 → 문단 순서)은 그대로다.

## 6. 판정 기준과 보고 형식

3단계와 같다.
- **Critical**: 데이터·원본 손실, 보안 문제, 다수 페이지 출력 깨짐
- **Important**: 특정 타입·조건에서 내용이 경고 없이 빠지거나 화면이 깨짐, 편집기에서 저장 불가
- **Minor**: 문서·테스트 보강, 일관성

항목마다 위치(파일:줄), 재현 입력, 실제 결과, 기대 결과를 적고, 직접 실행한 것과 정적 판독만 한 것을 구분해 주세요. 마지막에 판정(완료 / 수정 후 재확인 필요)을 적어 주세요.

## 7. 재검수 (지적 반영 후)

- 반영 기록: `docs/review-stage4-fixes.md`. 재검수 범위는 `0db22f1..` 이후 커밋이다.
- 공통 도우미(`richFrom`, `finish`)를 바꿔 P2·P3 타입에도 영향이 있다. 3단계에서 확인한 사례(표 칸, type15 등)에 회귀가 없는지도 봐 주세요.
- 결과는 `docs/review-stage4.md`를 갱신해 같은 브랜치에 커밋·푸시해 주세요.
