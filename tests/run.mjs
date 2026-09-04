// Headless runner for the engine suite: `node tests/run.mjs`
import fs from 'node:fs';
import { suite } from './engine.test.js';

const bank = JSON.parse(fs.readFileSync(new URL('../data/items.json', import.meta.url), 'utf8'));
const results = suite({ bank });
for (const r of results) {
  console.log(`${r.ok ? 'ok  ' : 'FAIL'}  ${r.name}${r.ok ? '' : `\n        ${r.message}`}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
