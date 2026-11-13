import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { checkHostCss } from '../src/commands/css-check.js';

describe('checkHostCss', () => {
  it('matches the pinned host CSS SHA-256', async () => {
    const root = path.resolve(import.meta.dirname, '../../..');
    const result = await checkHostCss(root);

    expect(result.actual).toBe('00657D8091192C5C8BC7AF7C3F43F51FB3CA762694ABEDAC35C195B56FE3B16F');
    expect(result.actual).toBe(result.expected);
    expect(result.matches).toBe(true);
  });
});
