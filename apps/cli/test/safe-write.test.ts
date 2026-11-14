import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { isResolvedWithinOutput, safeRemove, safeWrite } from '../src/fs/safe-write.js';

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

  it('refuses to write through a target file that is a symlink (I-6)', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'cms-safe-write-'));
    const victim = path.join(tempRoot, 'cms', 'contents', 'a.html');
    await mkdir(path.dirname(victim), { recursive: true });
    await writeFile(victim, 'original');
    const link = path.join(tempRoot, 'output', 'reports', 'x.json');
    await mkdir(path.dirname(link), { recursive: true });
    await symlink(victim, link);
    await expect(safeWrite(tempRoot, link, 'overwritten')).rejects.toThrow(/symlink/iu);
    expect(await readFile(victim, 'utf8')).toBe('original');
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

describe('safeRemove', () => {
  it('only removes files below output and never follows links', async () => {
    const { safeRemove } = await import('../src/fs/safe-write.js');
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'cms-safe-rm-'));
    const victim = path.join(tempRoot, 'cms', 'a.html');
    await mkdir(path.dirname(victim), { recursive: true });
    await writeFile(victim, 'keep');
    await expect(safeRemove(tempRoot, victim)).rejects.toThrow(/output/u);
    const link = path.join(tempRoot, 'output', 'link.html');
    await mkdir(path.dirname(link), { recursive: true });
    await symlink(victim, link);
    await safeRemove(tempRoot, link);
    expect(await readFile(victim, 'utf8')).toBe('keep');
  });
});

describe('safeRemove through linked directories (C-1)', () => {
  it('refuses a target whose parent directory is a link out of output', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'cms-safe-remove-'));
    const victim = path.join(tempRoot, 'victim');
    await mkdir(victim, { recursive: true });
    await writeFile(path.join(victim, 'important.html'), 'keep');
    await mkdir(path.join(tempRoot, 'output'), { recursive: true });
    await symlink(victim, path.join(tempRoot, 'output', 'contents'), 'junction');
    await expect(safeRemove(tempRoot, path.join(tempRoot, 'output', 'contents', 'important.html'))).rejects.toThrow(/link/iu);
    expect(await readFile(path.join(victim, 'important.html'), 'utf8')).toBe('keep');
  });
});

describe('output root that is a link (C-1)', () => {
  it('refuses to write or remove when output itself links into cms', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'cms-safe-output-'));
    const cmsContents = path.join(tempRoot, 'cms', 'contents');
    await mkdir(cmsContents, { recursive: true });
    await writeFile(path.join(cmsContents, 'a.html'), 'original');
    await symlink(cmsContents, path.join(tempRoot, 'output'), 'junction');
    await expect(safeWrite(tempRoot, path.join(tempRoot, 'output', 'a.html'), 'overwritten')).rejects.toThrow(/link/iu);
    await expect(safeRemove(tempRoot, path.join(tempRoot, 'output', 'a.html'))).rejects.toThrow(/link/iu);
    expect(await readFile(path.join(cmsContents, 'a.html'), 'utf8')).toBe('original');
  });
});
