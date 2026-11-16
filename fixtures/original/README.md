# 원본 CMS 타입 마크업 (기준 fixture)

원본 `cms/`(SVN)가 없는 환경에서 타입별 **원본 HTML 구조**의 기준으로 쓰는 파일이다.

- 출처: `huynsolm/biny` 저장소의 CMS 미리보기(https://biny-gilt.vercel.app/cms-preview) 타입 정의 `lib/cms/types/typeNN.tsx`.
  이 정의는 원본 CMS 도구의 `TypeNN.jsx`와 **같은 HTML**(클래스 문자열·요소 중첩·조건부 요소·도형 SVG)을 만들도록 작성·테스트돼 있다
  (`docs/superpowers/plans/2026-10-14-cms-original-markup.md`, `tests/cms-original*.test.ts`).
- 생성: biny 커밋 `831be1a7551ecd880c9c67b427c3585fa94bd178`에서 각 타입의 기본값으로 `renderHtml(type, type.defaults)`를 실행한 결과. 2026-11-15.
- 포함: type01~type26 (type08 없음). **type00·type27·type28은 biny에 없다.**
- 원본과 다른 점(biny가 의도적으로 바꾼 것): 이미지 `alt`는 원본의 `"box"` 대신 `""`, 문구·이미지 주소는 일반 샘플(`/images/cms-sample.svg` 등).
- 원본 `cms.css`(http://fxfile.drline.net/cms/public/css/cms.css)는 이 작업 환경에서 받을 수 없었다(http 전용 서버, 세션 프록시는 https만 통과).

실제 `cms/contents` 표본을 받으면 그 표본을 `fixtures/types/typeNN/`에 추가하고, 이 파일들과 구조가 같은지 확인한다.

## 진짜 원본 컴포넌트에서 가져온 파일

biny 재현본에 없던 타입은 진짜 원본 컴포넌트(`reference/cms-original/component/typeNN.html`, 사용자가 2026-11-16 제공)의 첫 섹션을 그대로 쓴다.

| 파일 | 출처 |
|---|---|
| `type27.html` | `reference/cms-original/component/type27.html` 1번째 섹션 |
| `type28.html` | `reference/cms-original/component/type28.html` 1번째 섹션 |
| `type30.html` | `reference/cms-original/component/type30.html` 1번째 섹션 |
