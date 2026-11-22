// @vitest-environment node
// Editing an OLD file (for example to fix a typo) must not force the editor
// to fix every problem the file already had; new problems still block.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { checkContribution } from '../../validation/contributionCheck.js';

const CODE = '2212345-3743';
const FILE = `public/verbs/${CODE}/info.json`;
// A legacy profile: no socialNetwork (required by the strict rules).
const legacy = (question = 'Q1: she _____ to school.') => ({
  user: { username: 'Ana', profileImage: 'https://github.com/ana.png', socialLink: '@ana' },
  topics: [
    {
      topic: 'verbs',
      questions: [question, 'Q2: they _____ fast.', 'Q3: we _____ home.'].map((q) => ({
        question: q,
        options: ['go', 'goes', 'going', 'gone'],
        answer: 'goes',
      })),
    },
  ],
});

describe('modified files: old problems are warnings, new ones block', () => {
  let root;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'michi-base-'));
    fs.mkdirSync(path.dirname(path.join(root, FILE)), { recursive: true });
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));
  const run = (now, before, status = 'M') => {
    fs.writeFileSync(path.join(root, FILE), JSON.stringify(now));
    return checkContribution([{ status, file: FILE }], {
      repoRoot: root,
      readBase: () => (before ? JSON.stringify(before) : null),
    });
  };

  test('fixing a typo in a legacy file passes, with the old problem as a warning', () => {
    const result = run(legacy('Q1: she _____ to school.'), legacy('Q1: she _____ to scool.'));
    expect(result.problems).toEqual([]);
    expect(result.warnings).toEqual([
      { file: FILE, errors: [expect.stringContaining('already there before this PR (please fix when you can): user.socialNetwork is required')] },
    ]);
  });

  test('a new problem in a legacy file still blocks', () => {
    const broken = legacy();
    broken.topics[0].questions[0].answer = 'went';
    const result = run(broken, legacy());
    expect(result.problems).toEqual([{ file: FILE, errors: ['topics[0].questions[0]: "answer" must be exactly one of the options'] }]);
  });

  test('without the base version (new file or --files) every rule blocks', () => {
    expect(run(legacy(), null).problems[0].errors).toContainEqual(expect.stringContaining('socialNetwork is required'));
    expect(run(legacy(), legacy(), 'A').problems[0].errors).toContainEqual(
      expect.stringContaining('socialNetwork is required'),
    );
  });
});
