import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  buildThemeGraph,
  getRepoRoot,
  renderThemeFile,
} from './theme-contract.mjs';

const repoRoot = getRepoRoot(import.meta.url);
const graph = buildThemeGraph(repoRoot);
const checkOnly = process.argv.includes('--check');

let changed = 0;

for (const file of graph.themeFiles) {
  const filePath = path.join(repoRoot, file);
  const currentText = readFileSync(filePath, 'utf8');
  const nextText = renderThemeFile(file, graph);

  if (currentText === nextText) {
    continue;
  }

  changed += 1;
  if (checkOnly) {
    process.exitCode = 1;
    console.error(`out of date: ${file}`);
    continue;
  }

  writeFileSync(filePath, nextText);
}

if (!checkOnly) {
  console.log(`normalized ${changed} theme file(s)`);
}
