// npm run test:browser: 브라우저·시각 테스트를 Playwright 필수로 실행한다.
// Windows에서도 동작하도록 셸의 `VAR=1 cmd` 문법 대신 Node에서 환경변수를 넣고 vitest를 실행한다.
import process from 'node:process';
import { startVitest } from 'vitest/node';

process.env.REQUIRE_BROWSER = '1';
const vitest = await startVitest('test', ['tests/web', 'tests/visual', ...process.argv.slice(2)], { run: true, watch: false });
// 테스트가 실패하면 startVitest가 process.exitCode를 1로 설정한다
await vitest?.close();
if (!vitest) process.exitCode = 1;
