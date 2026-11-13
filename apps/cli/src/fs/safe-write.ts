import { mkdir, realpath, writeFile } from 'node:fs/promises';
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

export async function safeWrite(root: string, target: string, data: string): Promise<void> {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const cmsRoot = path.join(resolvedRoot, 'cms');
  const outputRoot = path.join(resolvedRoot, 'output');

  if (isWithin(cmsRoot, resolvedTarget)) throw new Error(`cms is read-only: ${resolvedTarget}`);
  if (!isWithin(outputRoot, resolvedTarget) || resolvedTarget === outputRoot) {
    throw new Error(`generated files must be written below output: ${resolvedTarget}`);
  }

  await mkdir(outputRoot, { recursive: true });
  const realOutputRoot = await realpath(outputRoot);
  const resolvedAncestor = await nearestExistingAncestor(path.dirname(resolvedTarget));
  if (!isResolvedWithinOutput(realOutputRoot, resolvedAncestor)) {
    throw new Error(`output link escapes the generated output directory: ${resolvedTarget}`);
  }

  await mkdir(path.dirname(resolvedTarget), { recursive: true });
  await writeFile(resolvedTarget, data, 'utf8');
}
