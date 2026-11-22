// The answer must fit in the blank: "It _____ have rained." with the answer
// "must have" reads "must have have rained", and the game marks the student
// who picks "must" as wrong.
import { describe, expect, test } from 'vitest';
import { findRepeatedWordAtBlank, validateQuestion } from '../../validation/contentRules.js';

describe('findRepeatedWordAtBlank', () => {
  test.each([
    ["It _____ have rained last night.", 'must have', 'have'],
    ["She _____ have left her phone.", 'might have', 'have'],
    ['They will _____ to the party.', 'will go', 'will'],
    ['He acts as _____ he were the boss.', 'as though', 'as'],
    ["Choose: 'It _____ HAVE rained.'", 'must have', 'have'],
  ])('"%s" + "%s" repeats "%s"', (text, answer, word) => {
    expect(findRepeatedWordAtBlank(text, answer)).toEqual([expect.stringContaining(`("${word} ${word}")`)]);
  });

  test('the message shows the sentence as the player would read it', () => {
    expect(findRepeatedWordAtBlank('It _____ have rained.', 'must have', 'q')[0]).toBe(
      'q: with the answer the sentence reads "It must have have rained." ("have have"). Remove "have" from the answer or from the sentence',
    );
  });

  test.each([
    ["It _____ have rained last night.", 'must'],
    ['If I had _____ more time, I would have helped.', 'had'],
    ['I know that _____ is true.', 'that'],
    ['If it _____ tomorrow, we _____ to the beach.', 'rains / won\'t go'],
    ['Which word is an adjective?', 'small'],
    ['She ____ to school.', 'goes'],
  ])('"%s" + "%s" is fine', (text, answer) => {
    expect(findRepeatedWordAtBlank(text, answer)).toEqual([]);
  });

  test('is part of the question rules (legacy and strict)', () => {
    const question = { question: 'It _____ have rained.', options: ['must', 'might', "can't", 'must have'], answer: 'must have' };
    expect(validateQuestion(question)).toEqual([expect.stringContaining('"have have"')]);
    expect(validateQuestion({ ...question, answer: 'must' })).toEqual([]);
  });
});
