#!/usr/bin/env node
// Validates the content files a pull request adds or changes, with STRICT
// rules (favorite social network required, https image, etc.), and prints a
// report of who contributed what. Used by .github/workflows/ci.yml.
//
//   npm run check:contribution                    # compare with origin/develop
//   npm run check:contribution -- --base origin/main
//   npm run check:contribution -- --files public/verbs/2212345-3743/info.json
//
// When GITHUB_STEP_SUMMARY is set (GitHub Actions) the report is also written
// there, so the professor sees it on the PR's "Checks" tab.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { QUIZ_TOPICS } from '../src/config/topics.js';
import { getContentType } from '../src/config/contentTypes.js';
import { resolveSocialProfile } from '../src/config/socialNetworks.js';
import { findCrossDuplicates, isValidStudentCode } from '../src/validation/contentRules.js';
import { REPO_ROOT, listSubfolders, readJson } from '../src/validation/contentFiles.js';

const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const changedFiles = () => {
  const explicit = argValue('--files');
  if (explicit) return explicit.split(',').map((f) => f.trim()).filter(Boolean);
  const base = argValue('--base') || process.env.BASE_REF || 'origin/develop';
  try {
    return execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean);
  } catch (error) {
    console.error(`Could not diff against "${base}". Run "git fetch origin" first.\n${error.message}`);
    process.exit(2);
  }
};

const topicTypes = new Map(QUIZ_TOPICS.map((t) => [t.folder, t.type]));

// public/<topic>/<code>/info.json  or  public/vocabulary/<category>/<code>/info.json
const classify = (file) => {
  const parts = file.split('/');
  if (parts[0] !== 'public') return null;
  if (parts[1] === 'vocabulary' && parts.length === 5 && parts[4] === 'info.json') {
    return { type: 'vocabulary', section: `vocabulary/${parts[2]}`, code: parts[3] };
  }
  if (topicTypes.has(parts[1]) && parts.length === 4 && parts[3] === 'info.json') {
    return { type: topicTypes.get(parts[1]), section: parts[1], code: parts[2] };
  }
  return null;
};

const files = changedFiles();
const contentFiles = files.map((f) => ({ file: f, ...classify(f) })).filter((f) => f.type);
const codeFiles = files.filter((f) => !f.startsWith('public/'));
const problems = [];
const rows = [];

// index.json files are generated (src/validation/contentIndex.js); a PR
// must not add or edit them, or students would conflict with each other again.
files
  .filter((f) => f.startsWith('public/') && f.endsWith('/index.json'))
  .forEach((file) =>
    problems.push({ file, errors: ['delete this file: index.json is generated automatically from the folders'] }),
  );

for (const { file, type, section, code } of contentFiles) {
  const errors = [];
  const contentType = getContentType(type);
  const sectionDir = path.join(REPO_ROOT, 'public', section);
  if (!isValidStudentCode(code)) errors.push(`folder "${code}" must be your student code (1234567-1234)`);


  const info = readJson(path.join(REPO_ROOT, file));
  if (info.error) {
    errors.push(info.error);
  } else {
    errors.push(...contentType.validate(info.data, { strict: true }));

    if (type !== 'vocabulary') {
      const others = listSubfolders(sectionDir)
        .filter((f) => f !== code)
        .map((f) => ({ studentCode: f, info: readJson(path.join(sectionDir, f, 'info.json')).data }))
        .filter((e) => e.info);
      errors.push(...findCrossDuplicates([...others, { studentCode: code, info: info.data }], contentType)
        .filter((e) => e.includes(`from ${code} `)));
    }

    const user = info.data.user || {};
    const social = resolveSocialProfile(user.socialNetwork, user.socialLink);
    rows.push({
      name: user.username || '?',
      code,
      section,
      social: `${social.label} @${social.handle}`,
      items: `${contentType.listItems(info.data).length} ${contentType.itemName}`,
      ok: errors.length === 0,
    });
  }
  if (errors.length) problems.push({ file, errors });
}

// ---- report ---------------------------------------------------------------
const cell = (value) => String(value).replace(/[|\n\r]/g, ' ');
const lines = ['## 🐱 Contribution check', ''];
if (contentFiles.length === 0) {
  lines.push('No student content files (`public/**/info.json`) changed in this PR.');
} else {
  lines.push('| Student | Code | Section | Favorite network | Items | Status |', '|---|---|---|---|---|---|');
  rows.forEach((r) =>
    lines.push(`| ${cell(r.name)} | \`${cell(r.code)}\` | ${r.section} | ${cell(r.social)} | ${r.items} | ${r.ok ? '✅' : '❌'} |`),
  );
}
if (codeFiles.length) {
  lines.push('', `### Code changes (${codeFiles.length} files)`, '', ...codeFiles.map((f) => `- \`${f}\``));
}
if (problems.length) {
  lines.push('', '### ❌ Problems to fix', '');
  problems.forEach(({ file, errors }) => {
    lines.push(`**\`${file}\`**`, ...errors.map((e) => `- ${e}`), '');
  });
}

const report = lines.join('\n');
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
process.exit(problems.length ? 1 : 0);
