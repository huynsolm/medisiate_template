import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '../../package.json'), 'utf8')) as { scripts: Record<string, string> };

describe('npm scripts (I-9)', () => {
  it('do not use POSIX-only inline environment variables, so they also run on Windows', () => {
    for (const [name, command] of Object.entries(pkg.scripts)) {
      expect(command, name).not.toMatch(/(^|&&|;)\s*[A-Z_][A-Z0-9_]*=\S/u);
    }
  });
});

describe('test:browser runner arguments (review M-5)', () => {
  it('refuses extra arguments instead of passing them to Vitest as file filters', async () => {
    const { spawnSync } = await import('node:child_process');
    const result = spawnSync(process.execPath, [path.resolve(import.meta.dirname, '../../scripts/test-browser.mjs'), '--reporter=dot'], {
      encoding: 'utf8',
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/--reporter=dot/u);
  });
});
