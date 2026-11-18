# 4단계 P5 검수 요청

작성: 2026-11-15. 이 문서는 Codex 검수용이다. 검수 결과는 `docs/review-stage4-p5.md`에 쓰고 **같은 브랜치에 커밋·푸시**해 주세요. 코드는 고치지 말고, 판정과 재현 결과만 기록해 주세요.

## 1. 범위

- 저장소·브랜치: `huynsolm/medisiate_template`, `claude/fervent-volta-ilc7hk`
- 범위: `15a3312..d3ae49f` (1커밋, 24파일, +1040/−5). P4 검수 완료(`15a3312`) 이후 전부다.
- 내용: P5 타입 type24·22·20·21·12·05, 일반 검사·브라우저 검사 확장. **공통 도우미(`richFrom`, `finish`, `presetSection`)는 바꾸지 않았다.**
- 참고 문서: `docs/stage4-p5.md`(구현 기록), `docs/host-dom-contract.md`, P4 검수 기록 `docs/review-stage4.md`·`docs/review-stage4-fixes.md`(같은 기준).

## 2. 기준 자료에 대한 전제

- 이전 단계와 같다. 원본 `cms/`와 `cms.css`는 없고 biny cms-preview 타입 정의를 원본 구조의 기준으로 쓴다.
- type29·31·34·32·08은 기준 자료가 없어 범위 밖이다(변환 시 fallback).

## 3. 확인해 주실 것

### 3.1 기능 정확성
1. 원본 마크업 → 데이터가 빠짐없이 옮겨지는가. 기대값은 `packages/core/test/p5-types.test.ts`와 스냅샷 `fixtures/types/typeNN/original.expected.{json,html}`.
2. 호스트 선택자와 맞는가. 특히:
   - type20·21: `.mig-content:has(> .mig-visual)`(PC 4:6 격자)의 직접 자식이 이미지와 글 쪽 묶음인지. type20은 안쪽 `.mig-content`에 강조 상자와 목록.
   - type22: 하위 목록이 `.mig-list`가 아니어서 호스트 `.type-22 .mig-list`(후손 선택자, PC 3열 격자)를 받지 않는지.
   - type24: `ol.mig-list > li.mig-item` 카드와 `span.mig-num`.
3. 웹 편집기에서 새 타입을 고치고 저장·다시 불러오기가 되는가. type22 짧은 목록(반복 안의 반복), type20 강조 상자 두 칸.

### 3.2 조용한 손실 방지
- 3·4단계에서 찾은 유형(읽었지만 출력하지 않는 값, 같은 클래스가 여러 개, 글 안의 문단·목록 경계, 클래스 없이 통째로 읽는 요소)을 P5에도 봐 주세요. 클래스 없이 통째로 읽는 요소는 type22 짧은 목록의 `li`다.
- 요청 전에 반영 측에서 직접 돌려 본 10가지(모두 줄바꿈으로 보존되거나 섹션 fallback): type22 짧은 목록 항목 안 문단 2개(줄바꿈)·짧은 목록 2개·제목 뒤 설명, type20 강조 상자 2개·테두리 항목 안 설명, type21 이미지 묶음 2개, type24 번호 목록 2개·항목 상자 밖 글, type12 글머리 추가, type05 이미지 아래 글. 이 밖의 조합을 봐 주세요.

### 3.3 type24 번호 출력
- 원본 번호는 CSS 카운터라 HTML 글에 없다. 호스트에 카운터가 없어 순서 번호를 `span.mig-num` 글로 출력하고 데이터에는 넣지 않았다. 이 결정이 타당한지, 원본에 이미 번호 글이 있는 경우(예: 손으로 `1.`을 써 넣은 페이지) 번호가 두 번 보이는 문제가 생길 수 있는지 봐 주세요.

### 3.4 호스트가 고정한 배치
- type20 3:9, type21 5:7 비율, type21 머리글 왼쪽 정렬, type20 PC 4열 목록은 진단 없이 호스트 배치를 따른다(P4와 같은 기준: 원본 도구의 "선택지"만 진단).

## 4. 실행 방법

```bash
git fetch origin claude/fervent-volta-ilc7hk
git checkout claude/fervent-volta-ilc7hk
npm ci
npm test              # 기대: 611 passed, 1 skipped (inventory: cms/ 필요)
npm run lint
npm run typecheck
npm run test:browser  # Playwright 필요. 기대: 156 passed
```

- 브라우저 배치 검사: `tests/visual/preset-layout.test.ts` — P2~P5 24개 타입 × PC 1100 / MO 360 / 에디터 1100 × 이미지 있음/없음.
- 웹 도구: `npm run dev -w apps/web`.

## 5. 알려진 한계 (지적에서 제외해도 되는 것)

- 실제 `cms/contents` 표본 검증, 원본 화면과의 시각 등급 비교, inventory 기준 fallback 비율은 `cms/` 원본이 있어야 한다.
- type24 번호 모양(동그라미 등)은 원본 `cms.css`가 없어 확인하지 못했다.
- 이전 단계에서 합의한 제한(글 안 여러 문단은 `<br>`, type15 글머리 → 문단 순서)은 그대로다.

## 6. 판정 기준과 보고 형식

이전 단계와 같다(Critical / Important / Minor, 위치·재현 입력·실제/기대 결과, 직접 실행과 정적 판독 구분, 마지막에 판정).

## 7. 재검수 (지적 반영 후)

- 반영 기록: `docs/review-stage4-p5-fixes.md`. 재검수 범위는 `5240b60..` 이후 커밋이다.
- 공통 도우미(`richFrom`의 읽기 횟수 기록, `finish`의 중복 읽기 검사)를 바꿔 P2~P4 타입에도 영향이 있다. 정상 원본이 잘못 fallback 되는 경우가 없는지도 봐 주세요.
- 결과는 `docs/review-stage4-p5.md`를 갱신해 같은 브랜치에 커밋·푸시해 주세요.
