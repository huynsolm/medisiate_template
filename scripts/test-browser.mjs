// npm run test:browser: 브라우저·시각 테스트를 Playwright 필수로 실행한다.
// Windows에서도 동작하도록 셸의 `VAR=1 cmd` 문법 대신 Node에서 환경변수를 넣고 vitest를 실행한다.
import process from 'node:process';
import { startVitest } from 'vitest/node';

// startVitest의 두 번째 인자는 파일 필터라서, `--reporter=dot` 같은 옵션을 넘기면 필터로 잘못 해석된다 (review M-5).
// 추가 인자는 지원하지 않는다. 옵션이 필요하면 vitest를 직접 실행한다.
const extra = process.argv.slice(2);
if (extra.length > 0) {
  process.stderr.write(`test:browser는 추가 인자를 받지 않습니다: ${extra.join(' ')}\n`
    + '옵션이 필요하면 직접 실행하세요 (Playwright 필수 검사도 켜려면 REQUIRE_BROWSER=1 설정):\n'
    + '  npx vitest run tests/web tests/visual <옵션>\n');
  process.exit(2);
}

process.env.REQUIRE_BROWSER = '1';
const vitest = await startVitest('test', ['tests/web', 'tests/visual'], { run: true, watch: false });
// 테스트가 실패하면 startVitest가 process.exitCode를 1로 설정한다
await vitest?.close();
if (!vitest) process.exitCode = 1;
