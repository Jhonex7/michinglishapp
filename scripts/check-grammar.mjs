#!/usr/bin/env node
// Grammar and spelling hints (Harper, offline) for ALL student content.
// Only a report for the professor: it never fails.
//
//   npm run check:grammar                 # every section
//   npm run check:grammar -- verbs        # one section (folder name)

import path from 'node:path';
import { listContentSections, listSubfolders, readJson } from '../src/validation/contentFiles.js';
import { lintTexts, loadLinter, textsToCheck } from '../src/validation/grammarCheck.js';

const only = process.argv[2];
const linter = await loadLinter();
if (!linter) {
  console.error('harper.js is not installed. Run "npm install" first.');
  process.exit(2);
}

let checked = 0;
let flagged = 0;
for (const section of listContentSections().filter((s) => !only || s.name === only)) {
  const lines = [];
  for (const code of listSubfolders(section.dir)) {
    const { data } = readJson(path.join(section.dir, code, 'info.json'));
    if (!data) continue;
    const texts = textsToCheck(section.type, data);
    checked += texts.length;
    const results = await lintTexts(texts, { linter });
    flagged += results.length;
    results.forEach(({ label, text, problems }) => {
      lines.push(`- ${code} ${label}: "${text}"`, ...problems.map((p) => `    → ${p}`));
    });
  }
  if (lines.length) console.log(`\n## ${section.name}\n${lines.join('\n')}`);
}
console.log(`\n${flagged} of ${checked} texts have grammar hints. They are suggestions: check each one.`);
