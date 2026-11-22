// Node-only. The logic behind scripts/check-contribution.mjs, split into
// small functions so it can be tested without git or GitHub.
//
// checkContribution() receives the list of changed files (from git diff
// --name-status) and returns { problems, warnings, rows }:
//   - problems: block the PR (exit code 1)
//   - warnings: shown in the report, do not block
//   - rows:     one line per student file for the summary table
import path from 'node:path';
import { QUIZ_TOPICS } from '../config/topics.js';
import { duplicateRules, getContentType } from '../config/contentTypes.js';
import { resolveSocialProfile } from '../config/socialNetworks.js';
import {
  STUDENT_CODE_PATTERN,
  findCrossDuplicates,
  findProfileConflicts,
  isValidCategoryName,
  isValidStudentCode,
  validateNoDuplicateKeys,
  validateTopicNames,
} from './contentRules.js';
import { REPO_ROOT, listSubfolders, readJson } from './contentFiles.js';
import { parseInfoText } from './jsonText.js';

const TOPIC_BY_FOLDER = new Map(QUIZ_TOPICS.map((t) => [t.folder, t]));

// Files the professor keeps in the root of public/ (icons, PWA images...).
const ROOT_ASSET = /^[^/]+\.(png|ico|svg|webp|jpg|jpeg|webmanifest|txt|xml)$/i;

/** Parses `git diff --name-status` output into [{ status, file, from? }]. */
export const parseNameStatus = (output) =>
  output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [status, ...paths] = line.split('\t');
      const letter = status[0];
      if ((letter === 'R' || letter === 'C') && paths.length === 2) {
        return { status: letter, from: paths[0], file: paths[1] };
      }
      return { status: letter, file: paths[0] };
    });

/** Best guess of where a misplaced file should go, for the error message. */
export const suggestPath = (file) => {
  const parts = file.split('/');
  const code = parts.find((p) => STUDENT_CODE_PATTERN.test(p)) || '<your-student-code>';
  const section = parts[1] || '';
  const topic =
    TOPIC_BY_FOLDER.get(section) ||
    QUIZ_TOPICS.find((t) => [t.folder, t.id, t.path].includes(section.toLowerCase()));
  if (section.toLowerCase() === 'vocabulary') {
    const category = parts.length > 3 && !STUDENT_CODE_PATTERN.test(parts[2]) ? parts[2].toLowerCase() : '<category>';
    return `public/vocabulary/${category}/${code}/info.json`;
  }
  return `public/${topic ? topic.folder : '<topic>'}/${code}/info.json`;
};

/**
 * Says what a changed path is:
 *   content  public/<topic>/<code>/info.json or public/vocabulary/<cat>/<code>/info.json
 *   index    a generated index.json
 *   asset    an icon in the root of public/
 *   code     anything outside public/
 *   misplaced anything else inside public/ (with `reason`)
 */
export const classifyFile = (file) => {
  const parts = file.split('/');
  if (parts[0] !== 'public') return { kind: 'code' };
  if (parts.at(-1) === 'index.json') return { kind: 'index' };
  if (parts.length === 2 && ROOT_ASSET.test(parts[1])) return { kind: 'asset' };

  const misplaced = (reason) => ({ kind: 'misplaced', reason, suggestion: suggestPath(file) });

  if (parts[1] === 'vocabulary') {
    if (parts.length !== 5) return misplaced('vocabulary files go in public/vocabulary/<category>/<student-code>/info.json');
    if (parts[4] !== 'info.json') return misplaced(`the file must be named exactly "info.json" (found "${parts[4]}")`);
    if (!isValidCategoryName(parts[2])) {
      return misplaced(`category "${parts[2]}" must be lowercase letters, numbers and dashes (e.g. "animals")`);
    }
    return { kind: 'content', type: 'vocabulary', section: `vocabulary/${parts[2]}`, code: parts[3] };
  }

  const topic = TOPIC_BY_FOLDER.get(parts[1]);
  if (!topic) {
    const similar = QUIZ_TOPICS.find((t) => t.folder === parts[1].toLowerCase());
    return misplaced(
      similar
        ? `the folder is "${parts[1]}" but must be written exactly "${similar.folder}"`
        : `"${parts[1]}" is not a topic. Topics: ${QUIZ_TOPICS.map((t) => t.folder).join(', ')} (new topics must be added to src/config/topics.js)`,
    );
  }
  if (parts.length !== 4) return misplaced('the file must be inside your student-code folder: public/<topic>/<student-code>/info.json');
  if (parts[3] !== 'info.json') {
    return misplaced(
      /^info\.json/i.test(parts[3])
        ? `the file must be named exactly "info.json" (found "${parts[3]}"; check your editor did not add an extension)`
        : `only info.json is allowed inside your folder (found "${parts[3]}")`,
    );
  }
  return { kind: 'content', type: topic.type, section: topic.folder, code: parts[2], topic };
};

/** Student code in a branch name like feature/2212345-3743/verbs, or null. */
export const codeFromBranch = (branch = '') => branch.split('/').find((p) => STUDENT_CODE_PATTERN.test(p)) || null;

/** Every info.json of a student code in the whole repo: [{ studentCode, info, where }]. */
const findStudentFiles = (code, publicDir) => {
  const sections = [
    ...QUIZ_TOPICS.map((t) => t.folder),
    ...listSubfolders(path.join(publicDir, 'vocabulary')).map((c) => `vocabulary/${c}`),
  ];
  return sections.flatMap((section) => {
    const result = readJson(path.join(publicDir, section, code, 'info.json'));
    return result.data ? [{ studentCode: code, info: result.data, where: section }] : [];
  });
};

/** Other students of the same section: [{ studentCode, info }]. */
const readSection = (sectionDir, exceptCode) =>
  listSubfolders(sectionDir)
    .filter((f) => f !== exceptCode)
    .map((f) => ({ studentCode: f, info: readJson(path.join(sectionDir, f, 'info.json')).data }))
    .filter((e) => e.info);

/** Quiz questions of the same student code in OTHER quiz topics are fine; other students' are not. */
const readOtherQuizTopics = (publicDir, exceptFolder) =>
  QUIZ_TOPICS.filter((t) => t.type === 'quiz' && t.folder !== exceptFolder).flatMap((t) =>
    readSection(path.join(publicDir, t.folder)).map((e) => ({ ...e, studentCode: `${e.studentCode} (${t.folder})` })),
  );

/** The strict rules that only look at the file itself. */
const fileErrors = (text, info, contentType, topic) => [
  ...validateNoDuplicateKeys(text),
  ...contentType.validate(info, { strict: true }),
  ...validateTopicNames(info, topic),
];

/**
 * Validates one changed info.json with strict rules. Returns
 * { errors, preexisting, row }.
 *
 * baseText: the file before the PR (for modified files). Problems that were
 * already there are returned in `preexisting` instead of `errors`, so fixing
 * one thing in an old file (for example a typo) does not force the editor to
 * fix everything else in it. New problems still block the PR.
 */
export const checkContentFile = ({ file, type, section, code, topic }, { repoRoot = REPO_ROOT, baseText } = {}) => {
  const publicDir = path.join(repoRoot, 'public');
  const errors = [];
  const contentType = getContentType(type);
  if (!isValidStudentCode(code)) errors.push(`folder "${code}" must be your student code (1234567-1234)`);

  const result = readJson(path.join(repoRoot, file));
  if (result.error) return { errors: [...errors, result.error], preexisting: [], row: null };
  const info = result.data;

  const before = typeof baseText === 'string' ? parseInfoText(baseText) : null;
  const old = before?.data ? new Set(fileErrors(before.text, before.data, contentType, topic)) : new Set();
  const own = fileErrors(result.text, info, contentType, topic);
  const preexisting = own.filter((e) => old.has(e));
  errors.push(...own.filter((e) => !old.has(e)));

  // Copies inside the same section (questions, sentences, whole puzzles).
  const sectionDir = path.join(publicDir, section);
  const rules = duplicateRules(type);
  const others = readSection(sectionDir, code);
  errors.push(
    ...findCrossDuplicates([...others, { studentCode: code, info }], rules).filter((e) => e.includes(`from ${code} `)),
  );
  // Quiz questions copied from another quiz topic.
  if (type === 'quiz') {
    const otherTopics = readOtherQuizTopics(publicDir, section).filter((e) => !e.studentCode.startsWith(`${code} `));
    errors.push(
      ...findCrossDuplicates([...otherTopics, { studentCode: code, info }], rules).filter((e) => e.includes(`from ${code} `)),
    );
  }
  // Same name in every file of this student.
  const mine = findStudentFiles(code, publicDir).filter((e) => e.where !== section);
  errors.push(...findProfileConflicts([...mine, { studentCode: code, info, where: section }]));

  const user = info.user || {};
  const social = resolveSocialProfile(user.socialNetwork, user.socialLink);
  const row = {
    name: user.username || '?',
    code,
    section,
    social: `${social.label} @${social.handle}`,
    items: `${contentType.listItems(info).length} ${contentType.itemName}`,
    ok: errors.length === 0,
  };
  return { errors, preexisting, row };
};

/**
 * changes: [{ status: 'A'|'M'|'D'|'R'|'C', file, from? }]
 * branch:  the PR branch (used to warn when a PR touches another student's folder)
 */
export const checkContribution = (changes, { repoRoot = REPO_ROOT, branch = '', readBase = () => null } = {}) => {
  const problems = [];
  const warnings = [];
  const rows = [];
  const codeFiles = [];
  const touchedCodes = new Set();
  const add = (list, file, message) => {
    const existing = list.find((p) => p.file === file);
    if (existing) existing.errors.push(message);
    else list.push({ file, errors: [message] });
  };

  // A rename/copy is checked as "added at the new path"; a rename also
  // removes the old path.
  const expanded = changes.flatMap((c) =>
    c.status === 'R' ? [{ status: 'D', file: c.from }, { status: 'A', file: c.file }] : [{ status: c.status, file: c.file }],
  );

  expanded.forEach(({ status, file }) => {
    const info = classifyFile(file);
    if (info.kind === 'code') {
      if (status !== 'D') codeFiles.push(file);
      return;
    }
    if (status === 'D') {
      if (info.kind === 'content') {
        touchedCodes.add(info.code);
        add(problems, file, 'this PR deletes a student contribution. Only the professor can remove content');
      }
      return;
    }
    if (info.kind === 'index') {
      add(problems, file, 'delete this file: index.json is generated automatically from the folders');
    } else if (info.kind === 'misplaced') {
      add(problems, file, `wrong place: ${info.reason}. Expected something like ${info.suggestion}`);
    } else if (info.kind === 'content') {
      touchedCodes.add(info.code);
      const baseText = status === 'M' ? readBase(file) : null;
      const { errors, preexisting, row } = checkContentFile({ file, ...info }, { repoRoot, baseText });
      if (row) rows.push(row);
      errors.forEach((e) => add(problems, file, e));
      preexisting.forEach((e) => add(warnings, file, `already there before this PR (please fix when you can): ${e}`));
    }
  });

  const branchCode = codeFromBranch(branch);
  if (branchCode) {
    [...touchedCodes]
      .filter((c) => c !== branchCode)
      .forEach((c) =>
        add(warnings, `student ${c}`, `this PR (branch ${branch}) changes the folder of ${c}. Make sure it is yours`),
      );
  }
  if (touchedCodes.size > 1 && !branchCode) {
    add(warnings, 'pull request', `this PR changes content of ${touchedCodes.size} students: ${[...touchedCodes].join(', ')}`);
  }

  return { problems, warnings, rows, codeFiles };
};

/** Markdown report for the console and the GitHub run summary. */
export const buildReport = ({ problems, warnings, rows, codeFiles }) => {
  const cell = (value) => String(value).replace(/[|\n\r]/g, ' ');
  const lines = ['## 🐱 Contribution check', ''];
  if (rows.length === 0) {
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
  if (warnings.length) {
    lines.push('', '### ⚠️ Warnings', '');
    warnings.forEach(({ file, errors }) => lines.push(`**${cell(file)}**`, ...errors.map((e) => `- ${e}`), ''));
  }
  if (problems.length) {
    lines.push('', '### ❌ Problems to fix', '');
    problems.forEach(({ file, errors }) => lines.push(`**\`${file}\`**`, ...errors.map((e) => `- ${e}`), ''));
  }
  return lines.join('\n');
};
