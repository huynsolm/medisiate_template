import { createRequire } from 'node:module';
import path from 'node:path';

/* eslint-disable @typescript-eslint/no-explicit-any */
/** 이 저장소는 playwright를 의존성으로 두지 않으므로 쓰는 부분만 느슨하게 정의한다. */
export type Browser = any;
export type Page = any;
export interface PlaywrightLike {
  chromium: { launch(options?: Record<string, unknown>): Promise<Browser> };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * 이 환경에는 Playwright가 전역(/opt/node-tools)에 미리 설치돼 있다. 다른 버전을 설치하면 브라우저를 못 찾으므로
 * 프로젝트 의존성으로 넣지 않고, 있으면 쓰고 없으면 시각 테스트를 건너뛴다.
 */
export async function loadPlaywright(): Promise<PlaywrightLike | undefined> {
  try {
    const name = 'playwright';
    return (await import(/* @vite-ignore */ name)) as PlaywrightLike;
  } catch {
    /* 프로젝트에 없음 */
  }
  for (const base of [process.env.PLAYWRIGHT_NODE_MODULES, '/opt/node-tools/node_modules'].filter(Boolean) as string[]) {
    try {
      return createRequire(path.join(base, 'noop.js'))('playwright') as PlaywrightLike;
    } catch {
      /* 다음 후보 */
    }
  }
  return undefined;
}
