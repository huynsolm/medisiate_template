import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { isResolvedWithinOutput, safeWrite } from '../src/fs/safe-write.js';

let tempRoot: string | undefined;

afterEach(async () => {
  if (tempRoot) await rm(tempRoot, { recursive: true, force: true });
  tempRoot = undefined;
});

describe('safeWrite', () => {
  it('throws before writing anywhere below cms', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'cms-safe-write-'));
    await expect(safeWrite(tempRoot, path.join(tempRoot, 'cms', 'contents', 'bad.html'), 'no')).rejects.toThrow(
      /cms.*read-only/i,
    );
  });

  it('writes generated files below output', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'cms-safe-write-'));
    const target = path.join(tempRoot, 'output', 'reports', 'ok.txt');
    await safeWrite(tempRoot, target, 'ok');
    expect(await readFile(target, 'utf8')).toBe('ok');
  });

  it('recognizes a resolved link target outside output', () => {
    expect(isResolvedWithinOutput('C:\\repo\\output', 'C:\\repo\\cms')).toBe(false);
    expect(isResolvedWithinOutput('/repo/output', '/repo/cms')).toBe(false);
  });

  it('rejects an output link that resolves into cms when links are available', async (context) => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'cms-safe-write-'));
    const cms = path.join(tempRoot, 'cms');
    const output = path.join(tempRoot, 'output');
    await mkdir(cms);
    await mkdir(output);
    try {
      await symlink(cms, path.join(output, 'linked-cms'), process.platform === 'win32' ? 'junction' : 'dir');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EPERM') {
        context.skip();
        return;
      }
      throw error;
    }

    await expect(safeWrite(tempRoot, path.join(output, 'linked-cms', 'bad.html'), 'no')).rejects.toThrow(/link|escape|read-only/i);
  });
});
