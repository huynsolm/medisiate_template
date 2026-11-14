import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repo = path.resolve(import.meta.dirname, '../..');

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  // 호스트 CSS 스냅샷과 샘플 fixture를 저장소 루트에서 읽는다
  server: { fs: { allow: [repo] } },
  build: { outDir: 'dist', emptyOutDir: true },
});
