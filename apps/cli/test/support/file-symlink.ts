import { rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

type Skip = (condition: boolean, note?: string) => void;

/**
 * Windows lets ordinary users create directory junctions but not file symlinks (EPERM) unless
 * Developer Mode or administrator rights are on. Only that case is a skip; anything else is a failure.
 */
export function fileSymlinkSkipReason(platform: string, error: unknown): string | undefined {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  if (platform === 'win32' && code === 'EPERM') {
    return 'Windows: file symlinks need Developer Mode or administrator rights (EPERM). Directory junction tests still run.';
  }
  return undefined;
}

/** Call at the start of a test that creates file symlinks; skips it (with the reason) only where they cannot exist. */
export async function requireFileSymlinks(directory: string, skip: Skip): Promise<void> {
  const target = path.join(directory, '.symlink-probe-target');
  const link = path.join(directory, '.symlink-probe-link');
  await writeFile(target, 'probe');
  try {
    await symlink(target, link, 'file');
  } catch (error) {
    const reason = fileSymlinkSkipReason(process.platform, error);
    if (reason) skip(true, reason);
    throw error;
  } finally {
    await rm(link, { force: true });
    await rm(target, { force: true });
  }
}
