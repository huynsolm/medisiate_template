import { randomBytes } from 'node:crypto';
import { lstat, mkdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
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

export interface SafeWriteOptions {
  /** 테스트 전용: 경로 검사가 끝난 직후 호출된다 (검사와 쓰기 사이의 경쟁 상황 재현용) */
  afterCheck?: () => Promise<void>;
}

async function assertParentInsideOutput(realOutputRoot: string, resolvedTarget: string): Promise<void> {
  const resolvedAncestor = await nearestExistingAncestor(path.dirname(resolvedTarget));
  if (!isResolvedWithinOutput(realOutputRoot, resolvedAncestor)) {
    throw new Error(`output link escapes the generated output directory: ${resolvedTarget}`);
  }
}

/**
 * output 아래에만 쓴다. 같은 폴더의 새 임시 파일(wx)에 쓴 뒤 rename으로 바꿔 넣으므로,
 * 검사 뒤 대상이 링크로 바뀌어도 링크를 따라가지 않고 링크 자체를 교체한다 (I-7).
 * 한계: 마지막 부모 검사와 rename 사이에 부모 폴더가 링크로 바뀌는 경우는 경로 기반 API로 막을 수 없다.
 * 변환 중에는 output 폴더를 다른 프로세스가 바꾸지 않는다고 가정한다.
 */
export async function safeWrite(root: string, target: string, data: string, options: SafeWriteOptions = {}): Promise<void> {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const cmsRoot = path.join(resolvedRoot, 'cms');
  const outputRoot = path.join(resolvedRoot, 'output');

  if (isWithin(cmsRoot, resolvedTarget)) throw new Error(`cms is read-only: ${resolvedTarget}`);
  if (!isWithin(outputRoot, resolvedTarget) || resolvedTarget === outputRoot) {
    throw new Error(`generated files must be written below output: ${resolvedTarget}`);
  }

  const realOutputRoot = await verifiedOutputRoot(resolvedRoot);
  await assertParentInsideOutput(realOutputRoot, resolvedTarget);
  await mkdir(path.dirname(resolvedTarget), { recursive: true });
  // 대상 파일 자체가 링크면 거부한다 (링크를 의도한 사용자의 실수를 알리기 위해)
  const existing = await lstat(resolvedTarget).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  });
  if (existing?.isSymbolicLink()) throw new Error(`refusing to write through a symlink: ${resolvedTarget}`);
  if (existing && !existing.isFile()) throw new Error(`target is not a regular file: ${resolvedTarget}`);

  await options.afterCheck?.();

  const temp = path.join(path.dirname(resolvedTarget), `.${path.basename(resolvedTarget)}.${randomBytes(6).toString('hex')}.tmp`);
  try {
    await writeFile(temp, data, { encoding: 'utf8', flag: 'wx' });
    await assertParentInsideOutput(realOutputRoot, resolvedTarget);
    await rename(temp, resolvedTarget);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
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
