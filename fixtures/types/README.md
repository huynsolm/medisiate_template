# 타입별 fixture

`source.html`은 **합성 예시**다. 이 저장소에는 `cms/` 원본이 없어서(SVN, `.gitignore`)
실제 `cms/contents`에서 고른 섹션으로 아직 바꾸지 못했다.
원본이 있는 환경에서 `cms/contents`의 대표 섹션으로 교체하고 기대 파일을 다시 만들어야 한다
(`npx vitest run -u packages/core/test/types`).

- `*.source.html`: 원본 섹션 (입력)
- `*.expected.json`: parse 결과 (SectionModel)
- `*.expected.html`: render 결과
