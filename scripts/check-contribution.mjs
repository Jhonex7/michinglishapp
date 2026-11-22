#!/usr/bin/env node
// Validates the content files a pull request adds, changes, moves or deletes,
// with STRICT rules (favorite social network required, https image, files in
// the right place, etc.), and prints a report of who contributed what. Used by
// .github/workflows/ci.yml. The logic lives in src/validation/contributionCheck.js.
//
//   npm run check:contribution                    # compare with origin/develop
//   npm run check:contribution -- --base origin/main
//   npm run check:contribution -- --files public/verbs/2212345-3743/info.json
//
// When GITHUB_STEP_SUMMARY is set (GitHub Actions) the report is also written
// there, so the professor sees it on the PR's "Checks" tab.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { REPO_ROOT } from '../src/validation/contentFiles.js';
import { buildReport, checkContribution, parseNameStatus } from '../src/validation/contributionCheck.js';

const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const git = (...gitArgs) => execFileSync('git', gitArgs, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();

const baseRef = () => argValue('--base') || process.env.BASE_REF || 'origin/develop';

const changedFiles = () => {
  const explicit = argValue('--files');
  if (explicit) {
    return explicit
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean)
      .map((file) => ({ status: 'A', file }));
  }
  const base = baseRef();
  try {
    return parseNameStatus(git('diff', '--name-status', '-M', `${base}...HEAD`));
  } catch (error) {
    console.error(`Could not diff against "${base}". Run "git fetch origin" first.\n${error.message}`);
    process.exit(2);
  }
};

const currentBranch = () => {
  if (process.env.HEAD_REF) return process.env.HEAD_REF;
  try {
    return git('rev-parse', '--abbrev-ref', 'HEAD');
  } catch {
    return '';
  }
};

// The version of a file before this PR (merge base), to tell new problems
// from old ones. Not available with --files.
const readBase = (file) => {
  if (argValue('--files')) return null;
  try {
    const mergeBase = git('merge-base', baseRef(), 'HEAD');
    return execFileSync('git', ['show', `${mergeBase}:${file}`], { cwd: REPO_ROOT, encoding: 'utf8' });
  } catch {
    return null;
  }
};

const result = checkContribution(changedFiles(), { branch: currentBranch(), readBase });
const report = buildReport(result);
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
process.exit(result.problems.length ? 1 : 0);
