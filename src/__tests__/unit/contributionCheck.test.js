// @vitest-environment node
// Tests for the PR check (scripts/check-contribution.mjs): every way a
// student can put a file in the wrong place, break someone else's work or
// send an incomplete profile must make the check FAIL with a clear message.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  buildReport,
  checkContribution,
  classifyFile,
  codeFromBranch,
  parseNameStatus,
  suggestPath,
} from '../../validation/contributionCheck.js';
import { REPO_ROOT } from '../../validation/contentFiles.js';

const CODE = '2212345-3743';
const OTHER = '1111111-1111';

const user = (username = 'Ana Gómez') => ({
  username,
  profileImage: 'https://github.com/ana.png',
  socialNetwork: 'instagram',
  socialLink: '@ana_g',
});
const quiz = (prefix = 'Q', username) => ({
  user: user(username),
  topics: [
    {
      topic: 'verbs',
      questions: [1, 2, 3].map((i) => ({
        question: `${prefix}${i}: she _____ to school.`,
        options: ['go', 'goes', 'going', 'gone'],
        answer: 'goes',
      })),
    },
  ],
});
const puzzle = (username) => ({
  user: user(username),
  words: [
    { id: 1, en: 'cat', es: 'gato' },
    { id: 2, en: 'dog', es: 'perro' },
    { id: 3, en: 'bird', es: 'pájaro' },
    { id: 4, en: 'fish', es: 'pez' },
  ],
});

describe('parseNameStatus', () => {
  test('reads added, modified, deleted and renamed files', () => {
    const output = [
      'A\tpublic/verbs/2212345-3743/info.json',
      'M\tsrc/App.jsx',
      'D\tpublic/verbs/1111111-1111/info.json',
      'R100\tpublic/Verbs/2212345-3743/info.json\tpublic/verbs/2212345-3743/info.json',
      '',
    ].join('\n');
    expect(parseNameStatus(output)).toEqual([
      { status: 'A', file: 'public/verbs/2212345-3743/info.json' },
      { status: 'M', file: 'src/App.jsx' },
      { status: 'D', file: 'public/verbs/1111111-1111/info.json' },
      { status: 'R', from: 'public/Verbs/2212345-3743/info.json', file: 'public/verbs/2212345-3743/info.json' },
    ]);
  });
});

describe('classifyFile', () => {
  test.each([
    [`public/verbs/${CODE}/info.json`, { kind: 'content', type: 'quiz', section: 'verbs', code: CODE }],
    [`public/sentencebuilder/${CODE}/info.json`, { kind: 'content', type: 'sentence-builder' }],
    [`public/errorhunter/${CODE}/info.json`, { kind: 'content', type: 'error-hunter' }],
    [`public/vocabulary/animals/${CODE}/info.json`, { kind: 'content', type: 'vocabulary', section: 'vocabulary/animals' }],
    ['public/verbs/index.json', { kind: 'index' }],
    ['public/favicon.ico', { kind: 'asset' }],
    ['src/App.jsx', { kind: 'code' }],
    ['README.md', { kind: 'code' }],
  ])('%s', (file, expected) => {
    expect(classifyFile(file)).toMatchObject(expected);
  });

  // Each of these used to pass the check silently: the student believed they
  // had contributed but nothing showed up in the app.
  test.each([
    [`public/verbs/${CODE}/Info.json`, 'named exactly "info.json"'],
    [`public/verbs/${CODE}/info.json.txt`, 'named exactly "info.json"'],
    [`public/verbs/${CODE}/info.JSON`, 'named exactly "info.json"'],
    [`public/verbs/${CODE}/photo.jpg`, 'only info.json is allowed'],
    [`public/verbs/${CODE}/sub/info.json`, 'inside your student-code folder'],
    ['public/verbs/info.json', 'inside your student-code folder'],
    [`public/Verbs/${CODE}/info.json`, 'must be written exactly "verbs"'],
    [`public/passivevoice/${CODE}/info.json`, '"passivevoice" is not a topic'],
    [`public/${CODE}/info.json`, 'is not a topic'],
    ['public/info.json', 'is not a topic'],
    ['public/data.json', 'is not a topic'],
    ['public/vocabulary/animals/info.json', 'public/vocabulary/<category>/<student-code>/info.json'],
    [`public/vocabulary/${CODE}/info.json`, 'public/vocabulary/<category>/<student-code>/info.json'],
    [`public/vocabulary/Animals/${CODE}/info.json`, 'lowercase letters'],
    [`public/vocabulary/body parts/${CODE}/info.json`, 'lowercase letters'],
    [`public/vocabulary/animals/${CODE}/words.json`, 'named exactly "info.json"'],
  ])('misplaced: %s', (file, reason) => {
    const result = classifyFile(file);
    expect(result.kind).toBe('misplaced');
    expect(result.reason).toContain(reason);
  });

  test('suggests the right path', () => {
    expect(suggestPath(`public/Verbs/${CODE}/info.json`)).toBe(`public/verbs/${CODE}/info.json`);
    expect(suggestPath(`public/verbs/${CODE}/Info.json`)).toBe(`public/verbs/${CODE}/info.json`);
    expect(suggestPath('public/verbs/info.json')).toBe('public/verbs/<your-student-code>/info.json');
    expect(suggestPath(`public/Vocabulary/Animals/${CODE}/x.json`)).toBe(`public/vocabulary/animals/${CODE}/info.json`);
  });
});

describe('codeFromBranch', () => {
  test.each([
    [`feature/${CODE}/verbs`, CODE],
    ['feature/Group3', null],
    ['', null],
    [undefined, null],
  ])('%s -> %s', (branch, code) => {
    expect(codeFromBranch(branch)).toBe(code);
  });
});

describe('checkContribution (on a temporary repo)', () => {
  let root;
  const write = (file, data) => {
    const full = path.join(root, file);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  };
  const check = (changes, options = {}) => checkContribution(changes, { repoRoot: root, ...options });
  const errorsOf = (result, file) => result.problems.find((p) => p.file === file)?.errors || [];

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'michi-check-'));
    write(`public/verbs/${OTHER}/info.json`, quiz('Other', 'Pedro'));
    write(`public/vocabulary/animals/${OTHER}/info.json`, puzzle('Pedro'));
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  test('a correct new file passes and appears in the summary', () => {
    const file = `public/verbs/${CODE}/info.json`;
    write(file, quiz());
    const result = check([{ status: 'A', file }]);
    expect(result.problems).toEqual([]);
    expect(result.rows).toEqual([
      { name: 'Ana Gómez', code: CODE, section: 'verbs', social: 'Instagram @ana_g', items: '3 questions', ok: true },
    ]);
  });

  test('a misplaced file is a problem with a suggestion', () => {
    const file = `public/Verbs/${CODE}/info.json`;
    const result = check([{ status: 'A', file }]);
    expect(errorsOf(result, file)).toEqual([expect.stringContaining(`Expected something like public/verbs/${CODE}/info.json`)]);
  });

  test('an index.json in the PR is a problem, deleting an old one is fine', () => {
    expect(check([{ status: 'A', file: 'public/verbs/index.json' }]).problems).toHaveLength(1);
    expect(check([{ status: 'D', file: 'public/verbs/index.json' }]).problems).toEqual([]);
  });

  test('deleting a student contribution is a problem', () => {
    const file = `public/verbs/${OTHER}/info.json`;
    expect(errorsOf(check([{ status: 'D', file }]), file)).toEqual([
      expect.stringContaining('deletes a student contribution'),
    ]);
  });

  test('moving someone else\'s file to your folder counts as deleting theirs', () => {
    const to = `public/verbs/${CODE}/info.json`;
    write(to, quiz());
    const result = check([{ status: 'R', from: `public/verbs/${OTHER}/info.json`, file: to }]);
    expect(errorsOf(result, `public/verbs/${OTHER}/info.json`)).toEqual([
      expect.stringContaining('deletes a student contribution'),
    ]);
  });

  test('fixing a misplaced file with a rename passes', () => {
    const to = `public/verbs/${CODE}/info.json`;
    write(to, quiz());
    expect(check([{ status: 'R', from: `public/Verbs/${CODE}/info.json`, file: to }]).problems).toEqual([]);
  });

  test('invalid JSON, BOM and repeated keys', () => {
    const broken = `public/verbs/${CODE}/info.json`;
    write(broken, '{ "user": { "username": "Ana", }, }');
    expect(errorsOf(check([{ status: 'A', file: broken }]), broken)).toEqual([
      expect.stringContaining('remove the comma before } or ]'),
    ]);

    write(broken, `\uFEFF${JSON.stringify(quiz())}`);
    expect(check([{ status: 'A', file: broken }]).problems).toEqual([]);

    write(broken, JSON.stringify(quiz()).replace('"username":"Ana Gómez"', '"username":"Ana Gómez","username":"Ana G"'));
    expect(errorsOf(check([{ status: 'A', file: broken }]), broken)).toEqual([
      expect.stringContaining('repeated keys in the same object: "username"'),
    ]);
  });

  test('a file that does not exist on disk (bad --files argument)', () => {
    const file = `public/verbs/${CODE}/info.json`;
    expect(errorsOf(check([{ status: 'A', file }]), file)).toEqual([expect.stringContaining('file not found')]);
  });

  test('an invalid student-code folder', () => {
    const file = 'public/verbs/my-group/info.json';
    write(file, quiz());
    expect(errorsOf(check([{ status: 'A', file }]), file)).toEqual([expect.stringContaining('must be your student code')]);
  });

  test('an incomplete profile lists every missing field', () => {
    const file = `public/verbs/${CODE}/info.json`;
    write(file, { ...quiz(), user: { username: 'Your Name', profileImage: 'https://www.instagram.com/ana' } });
    const errors = errorsOf(check([{ status: 'A', file }]), file);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('user.socialLink must be a non-empty string'),
        expect.stringContaining('user.socialNetwork is required'),
        expect.stringContaining('is a web page, not an image'),
        expect.stringContaining('replace the template text: "Your Name"'),
      ]),
    );
  });

  test('wrong content type for the folder (a quiz inside a game)', () => {
    const file = `public/sentencebuilder/${CODE}/info.json`;
    write(file, quiz());
    expect(errorsOf(check([{ status: 'A', file }]), file)).toEqual(
      expect.arrayContaining([
        '"sentences" must be a non-empty array',
        expect.stringContaining('unexpected key "topics"'),
      ]),
    );
  });

  test('topic name copied from another folder', () => {
    const file = `public/adverbs/${CODE}/info.json`;
    write(file, quiz());
    expect(errorsOf(check([{ status: 'A', file }]), file)).toEqual([
      expect.stringContaining('topics[0].topic is "verbs" but the file is in public/adverbs'),
    ]);
  });

  test('a question copied from a classmate in the same topic', () => {
    const file = `public/verbs/${CODE}/info.json`;
    write(file, quiz('Other'));
    expect(errorsOf(check([{ status: 'A', file }]), file)).toEqual([
      expect.stringContaining(`from ${CODE} already exists in ${OTHER}`),
      expect.stringContaining(`from ${CODE} already exists in ${OTHER}`),
      expect.stringContaining(`from ${CODE} already exists in ${OTHER}`),
    ]);
  });

  test('a question copied from a classmate in ANOTHER topic', () => {
    const file = `public/data/${CODE}/info.json`;
    write(file, { ...quiz('Other'), topics: [{ ...quiz('Other').topics[0], topic: 'grammar' }] });
    expect(errorsOf(check([{ status: 'A', file }]), file)).toContainEqual(
      expect.stringContaining(`already exists in ${OTHER} (verbs)`),
    );
  });

  test('reusing your OWN question in another topic is allowed', () => {
    write(`public/verbs/${CODE}/info.json`, quiz('Mine'));
    const file = `public/data/${CODE}/info.json`;
    write(file, { ...quiz('Mine'), topics: [{ ...quiz('Mine').topics[0], topic: 'grammar' }] });
    expect(check([{ status: 'A', file }]).problems).toEqual([]);
  });

  test('a vocabulary puzzle with the same 4 words as a classmate', () => {
    const file = `public/vocabulary/animals/${CODE}/info.json`;
    write(file, puzzle());
    expect(errorsOf(check([{ status: 'A', file }]), file)).toEqual([
      expect.stringContaining(`from ${CODE} already exists in ${OTHER}`),
    ]);
  });

  test('your name must be the same in all your files', () => {
    write(`public/verbs/${CODE}/info.json`, quiz('Mine', 'Ana Gómez'));
    const file = `public/adverbs/${CODE}/info.json`;
    write(file, { ...quiz('Adv', 'Ana G.'), topics: [{ ...quiz('Adv').topics[0], topic: 'adverbs' }] });
    expect(errorsOf(check([{ status: 'A', file }]), file)).toEqual([
      expect.stringContaining(`student ${CODE} uses different names: "Ana Gómez" in verbs, "Ana G." in adverbs`),
    ]);
  });

  test('warns when a PR changes the folder of another student', () => {
    const file = `public/verbs/${OTHER}/info.json`;
    const result = check([{ status: 'M', file }], { branch: `feature/${CODE}/verbs` });
    expect(result.warnings).toEqual([
      { file: `student ${OTHER}`, errors: [expect.stringContaining(`changes the folder of ${OTHER}`)] },
    ]);
  });

  test('warns (without failing) when a group PR touches many students', () => {
    write(`public/verbs/${CODE}/info.json`, quiz());
    const result = check(
      [
        { status: 'A', file: `public/verbs/${CODE}/info.json` },
        { status: 'M', file: `public/vocabulary/animals/${OTHER}/info.json` },
      ],
      { branch: 'feature/Group3' },
    );
    expect(result.warnings).toEqual([{ file: 'pull request', errors: [expect.stringContaining('2 students')] }]);
  });

  test('code changes are listed, not validated as content', () => {
    const result = check([
      { status: 'M', file: 'src/App.jsx' },
      { status: 'D', file: 'src/old.js' },
    ]);
    expect(result).toMatchObject({ problems: [], codeFiles: ['src/App.jsx'] });
  });
});

describe('buildReport', () => {
  test('shows table, warnings and problems, and escapes table cells', () => {
    const report = buildReport({
      rows: [{ name: 'Ana | <b>', code: CODE, section: 'verbs', social: 'Instagram @ana', items: '3 questions', ok: false }],
      codeFiles: ['src/App.jsx'],
      warnings: [{ file: 'pull request', errors: ['many students'] }],
      problems: [{ file: `public/verbs/${CODE}/info.json`, errors: ['bad'] }],
    });
    expect(report).toContain('| Ana   <b> |');
    expect(report).toContain('### Code changes (1 files)');
    expect(report).toContain('### ⚠️ Warnings');
    expect(report).toContain('### ❌ Problems to fix');
  });

  test('says so when there is no content', () => {
    expect(buildReport({ rows: [], codeFiles: [], warnings: [], problems: [] })).toContain('No student content files');
  });
});

// End to end: run the real script the pipeline runs.
describe('scripts/check-contribution.mjs', () => {
  const run = (files) => {
    try {
      const stdout = execFileSync('node', ['scripts/check-contribution.mjs', '--files', files], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        env: { ...process.env, GITHUB_STEP_SUMMARY: '', HEAD_REF: '' },
      });
      return { code: 0, stdout };
    } catch (error) {
      return { code: error.status, stdout: error.stdout };
    }
  };

  test('exit 0 for a valid existing contribution', () => {
    expect(run('public/secondconditional/1802038-5555/info.json').code).toBe(0);
  });

  test.each([
    `public/verbs/${CODE}/Info.json`,
    `public/passivevoice/${CODE}/info.json`,
    'public/vocabulary/animals/info.json',
    'public/verbs/index.json',
  ])('exit 1 for %s', (file) => {
    const { code, stdout } = run(file);
    expect(code).toBe(1);
    expect(stdout).toContain('Problems to fix');
  });
});
