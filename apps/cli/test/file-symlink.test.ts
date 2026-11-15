import { describe, expect, it } from 'vitest';
import { fileSymlinkSkipReason } from './support/file-symlink.js';

const error = (code: string) => Object.assign(new Error(code), { code });

describe('fileSymlinkSkipReason (review I-10)', () => {
  it('skips only when Windows refuses file symlinks without Developer Mode or admin rights', () => {
    expect(fileSymlinkSkipReason('win32', error('EPERM'))).toMatch(/Developer Mode/u);
  });

  it('never hides failures on other platforms or other errors', () => {
    expect(fileSymlinkSkipReason('linux', error('EPERM'))).toBeUndefined();
    expect(fileSymlinkSkipReason('darwin', error('EPERM'))).toBeUndefined();
    expect(fileSymlinkSkipReason('win32', error('ENOENT'))).toBeUndefined();
    expect(fileSymlinkSkipReason('win32', new Error('no code'))).toBeUndefined();
  });
});
