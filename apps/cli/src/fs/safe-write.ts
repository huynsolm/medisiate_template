import { lstat, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

function isWithin(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

export function isResolvedWithinOutput(outputRoot: string, resolvedPath: string): boolean {
  return isWithin(path.resolve(outputRoot), path.resolve(resolvedPath));
}

async function nearestExistingAncestor(target: string): Promise<string> {
  let candidate = target;
  while (true) {
    try {
      return await realpath(candidate);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const parent = path.dirname(candidate);
      if (parent === candidate) throw error;
      candidate = parent;
    }
  }
}

/**
 * output 폴더의 실제 경로를 돌려준다. output 자체가 링크(심볼릭 링크·junction)이거나
 * 실제 위치가 cms와 겹치면 거부한다.
 */
async function verifiedOutputRoot(resolvedRoot: string): Promise<string> {
  const outputRoot = path.join(resolvedRoot, 'output');
  await mkdir(outputRoot, { recursive: true });
  if ((await lstat(outputRoot)).isSymbolicLink()) throw new Error(`output must not be a link: ${outputRoot}`);
  const realOutput = await realpath(outputRoot);
  const realCms = await realpath(path.join(resolvedRoot, 'cms')).catch(() => undefined);
  if (realCms && (isWithin(realCms, realOutput) || isWithin(realOutput, realCms))) {
    throw new Error(`output overlaps cms: ${realOutput}`);
  }
  return realOutput;
}

export async function safeWrite(root: string, target: string, data: string): Promise<void> {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const cmsRoot = path.join(resolvedRoot, 'cms');
  const outputRoot = path.join(resolvedRoot, 'output');

  if (isWithin(cmsRoot, resolvedTarget)) throw new Error(`cms is read-only: ${resolvedTarget}`);
  if (!isWithin(outputRoot, resolvedTarget) || resolvedTarget === outputRoot) {
    throw new Error(`generated files must be written below output: ${resolvedTarget}`);
  }

  const realOutputRoot = await verifiedOutputRoot(resolvedRoot);
  const resolvedAncestor = await nearestExistingAncestor(path.dirname(resolvedTarget));
  if (!isResolvedWithinOutput(realOutputRoot, resolvedAncestor)) {
    throw new Error(`output link escapes the generated output directory: ${resolvedTarget}`);
  }

  await mkdir(path.dirname(resolvedTarget), { recursive: true });
  // 대상 파일 자체가 링크면 writeFile이 링크를 따라가므로 거부한다
  const existing = await lstat(resolvedTarget).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  });
  if (existing?.isSymbolicLink()) throw new Error(`refusing to write through a symlink: ${resolvedTarget}`);
  if (existing && !existing.isFile()) throw new Error(`target is not a regular file: ${resolvedTarget}`);
  await writeFile(resolvedTarget, data, { encoding: 'utf8', flag: existing ? 'w' : 'wx' });
}

/**
 * output 아래 생성물만 지운다. 대상이 링크면 링크 자체만 지우고 대상은 건드리지 않는다.
 * 부모 경로 중간에 output 밖으로 나가는 링크·junction이 있으면 거부한다 (C-1).
 */
export async function safeRemove(root: string, target: string): Promise<void> {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const outputRoot = path.join(resolvedRoot, 'output');
  if (!isWithin(outputRoot, resolvedTarget) || resolvedTarget === outputRoot) {
    throw new Error(`only generated files below output can be removed: ${resolvedTarget}`);
  }
  const realOutputRoot = await verifiedOutputRoot(resolvedRoot);
  const realParent = await realpath(path.dirname(resolvedTarget)).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  });
  if (!realParent) return;
  if (!isResolvedWithinOutput(realOutputRoot, realParent)) {
    throw new Error(`refusing to remove through a link that leaves output: ${resolvedTarget}`);
  }
  const stat = await lstat(resolvedTarget).catch(() => undefined);
  if (!stat) return;
  if (stat.isDirectory()) throw new Error(`refusing to remove a directory: ${resolvedTarget}`);
  await rm(resolvedTarget);
}
