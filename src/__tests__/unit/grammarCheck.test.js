// @vitest-environment node
// Grammar hints with Harper (offline). They are warnings, so the important
// things to test are: WHAT text is checked, that common false alarms are
// filtered out, and that real mistakes are reported.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { grammarWarnings, lintTexts, loadLinter, textsToCheck } from '../../validation/grammarCheck.js';
import { addGrammarWarnings } from '../../validation/contributionCheck.js';

let linter;
beforeAll(async () => {
  linter = await loadLinter();
}, 30000);

const q = (question, answer, options = [answer, 'x', 'y', 'z']) => ({ question, options, answer });
const quiz = (...questions) => ({ topics: [{ topic: 'verbs', questions }] });

describe('textsToCheck: the text a player reads when answering correctly', () => {
  test('quiz: the blank is filled with the answer', () => {
    expect(textsToCheck('quiz', quiz(q('She _____ to school.', 'goes')))).toEqual([
      { label: 'question 1', text: 'She goes to school.' },
    ]);
  });

  test('quiz without a blank: the question, plus the answer when it is a sentence', () => {
    expect(textsToCheck('quiz', quiz(q('Which sentence is correct?', 'She goes to school.')))).toEqual([
      { label: 'question 1', text: 'Which sentence is correct?' },
      { label: 'question 1 (answer)', text: 'She goes to school.' },
    ]);
  });

  test.each([
    'Which sentence is not correct?',
    "Identify the error in: 'If I would have seen you'",
    'Which sentence uses the adverb incorrectly?',
    'Which sentence contains a misplaced adverb?',
  ])('nothing is checked when the question shows a mistake on purpose: %s', (question) => {
    expect(textsToCheck('quiz', quiz(q(question, 'He go home.')))).toEqual([]);
  });

  test('two blanks: only the question', () => {
    expect(textsToCheck('quiz', quiz(q('If it _____, we _____ home.', 'rains / stay')))).toEqual([
      { label: 'question 1', text: 'If it _____, we _____ home.' },
    ]);
  });

  test('games and vocabulary', () => {
    expect(textsToCheck('sentence-builder', { sentences: [{ sentence: 'I like tea.' }] })).toEqual([
      { label: 'sentence 1', text: 'I like tea.' },
    ]);
    expect(
      textsToCheck('error-hunter', {
        errors: [{ sentence: 'She go home.', wrong: 'go', correct: 'goes', explanation: 'Third person.' }],
      }),
    ).toEqual([
      { label: 'sentence 1 (corrected)', text: 'She goes home.' },
      { label: 'sentence 1 (explanation)', text: 'Third person.' },
    ]);
    expect(textsToCheck('vocabulary', { words: [{ en: 'cat', es: 'gato' }] })).toEqual([{ label: 'word 1', text: 'cat' }]);
  });

  test('broken items are skipped, not crashed on', () => {
    expect(textsToCheck('quiz', quiz({ question: 1 }, null))).toEqual([]);
    expect(textsToCheck('error-hunter', { errors: [{}, null] })).toEqual([]);
  });
});

describe('lintTexts with Harper', () => {
  const lint = async (text) => (await lintTexts([{ label: 't', text }], { linter }))[0]?.problems || [];

  test('harper.js is installed', () => {
    expect(linter).not.toBeNull();
  });

  test.each([
    ["She don't like coffee.", "doesn't"],
    ['She bought an uniform.', 'Incorrect indefinite article'],
    ['which one its a real adverb?', "it's"],
    ['What is the continous tense?', 'continuous'],
    ['He acts as as though he were the boss.', 'repeat this word'],
    ['Complete  the sentence.', '2 spaces'],
  ])('reports "%s"', async (text, hint) => {
    expect((await lint(text)).join(' ')).toContain(hint);
  });

  test.each([
    'If I had had more time, I would have traveled.',
    "How do you say 'caballo' in English?",
    'They just signed a player at the Santiago Bernabéu.',
    "They can't be at school; it's Sunday.",
    'If the sun sets, it gets dark.',
    'She might call us later.',
    "In the sentence 'If I had time, I would travel', the verb is in the...",
    'The verb functions as a(n)...',
    '_____ the weather improves, we will have the picnic.',
  ])('does not complain about "%s"', async (text) => {
    expect(await lint(text)).toEqual([]);
  });
});

describe('grammarWarnings', () => {
  test('only new or changed texts are checked', async () => {
    const before = quiz(q("She don't _____ coffee.", 'like'));
    const now = quiz(q("She don't _____ coffee.", 'like'), q('He bought an _____.', 'uniform'));
    const lines = await grammarWarnings('quiz', now, { baseInfo: before, linter });
    expect(lines).toEqual([expect.stringContaining('grammar hint, question 2: "He bought an uniform."')]);
  });
});

describe('addGrammarWarnings (PR check)', () => {
  let root;
  const file = 'public/verbs/2212345-3743/info.json';
  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'michi-grammar-'));
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), JSON.stringify(quiz(q('She _____ an uniform.', 'bought'))));
  });
  afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

  test('adds warnings, never problems', async () => {
    const result = { problems: [], warnings: [] };
    expect(await addGrammarWarnings(result, [{ status: 'A', file }, { status: 'D', file: 'x' }], { repoRoot: root, linter })).toBe(true);
    expect(result.problems).toEqual([]);
    expect(result.warnings).toEqual([{ file, errors: [expect.stringContaining('Incorrect indefinite article')] }]);
  });
});
