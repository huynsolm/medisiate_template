# 타입별 fixture

`source.html`은 **합성 예시**다. 이 저장소에는 `cms/` 원본이 없어서(SVN, `.gitignore`)
실제 `cms/contents`에서 고른 섹션으로 아직 바꾸지 못했다.

type01은 2026-11-15에 `fixtures/original/type01.html`(원본 CMS 도구와 같은 마크업)의 **구조**를 따르도록 바꿨다.
문구·이미지 주소만 예시 값이다. type00은 원본 구조 자료가 없어 여전히 추정 구조다.
원본이 있는 환경에서 `cms/contents`의 대표 섹션으로 교체하고 기대 파일을 다시 만들어야 한다
(`npx vitest run -u packages/core/test/types`).

- `*.source.html`: 원본 섹션 (입력)
- `*.expected.json`: parse 결과 (SectionModel)
- `*.expected.html`: render 결과
