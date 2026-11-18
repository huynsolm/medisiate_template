#!/usr/bin/env node
import path from 'node:path';
import { runCssCheck } from './commands/css-check.ts';
import { runInventory } from './commands/inventory.ts';
import { runConvert } from './commands/convert.ts';
import { runCompare } from './commands/compare.ts';

const command = process.argv[2];
const root = path.resolve(import.meta.dirname, '../../..');

if (command === 'css-check') {
  process.exitCode = await runCssCheck(root);
} else if (command === 'inventory') {
  process.exitCode = await runInventory(root);
} else if (command === 'convert') {
  process.exitCode = await runConvert(root, process.argv.slice(3));
} else if (command === 'compare') {
  process.exitCode = await runCompare(root, process.argv.slice(3));
} else {
  console.error(`Unknown command: ${command ?? '(none)'}`);
  process.exitCode = 1;
}
