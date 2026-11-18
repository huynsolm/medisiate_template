import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 웹 미리보기가 호스트 CSS를 ?raw 문자열로 읽으므로 CSS도 처리한다
    css: { include: [/.+/u] },
    exclude: ['**/node_modules/**', 'output/**', 'cms/**'],
  },
});
