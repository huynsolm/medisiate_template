import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

interface HostCssManifest {
  file: string;
  sha256: string;
}

export async function checkHostCss(root: string) {
  const manifestPath = path.join(root, 'reference', 'host-css.manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as HostCssManifest;
  const css = await readFile(path.resolve(root, manifest.file));
  const actual = createHash('sha256').update(css).digest('hex').toUpperCase();
  const expected = manifest.sha256.toUpperCase();

  return { actual, expected, matches: actual === expected };
}

export async function runCssCheck(root: string): Promise<number> {
  const result = await checkHostCss(root);
  console.log(`host CSS SHA-256 expected: ${result.expected}`);
  console.log(`host CSS SHA-256 actual:   ${result.actual}`);
  console.log(result.matches ? 'MATCH' : 'MISMATCH');
  return result.matches ? 0 : 1;
}

