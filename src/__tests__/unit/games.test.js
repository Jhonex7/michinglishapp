import { describe, expect, test } from 'vitest';
import {
  applyCorrection,
  cleanWord,
  errorTokenIndexes,
  findSpans,
  isSameSentence,
  tokenize,
} from '../../games/sentenceTools.js';
import {
  findCrossDuplicates,
  validateErrorHunterInfo,
  validateSentenceBuilderInfo,
} from '../../validation/contentRules.js';
import { CONTENT_TYPES, countItems, detectContentType, getContentType } from '../../config/contentTypes.js';
import { buildInfoTemplate } from '../../helpers/contributionTemplate.js';

const user = {
  username: 'Ana',
  profileImage: 'https://github.com/ana.png',
  socialNetwork: 'instagram',
  socialLink: '@ana',
};

describe('sentenceTools', () => {
  test('tokenize keeps punctuation attached to words', () => {
    expect(tokenize('  She  goes home. ')).toEqual(['She', 'goes', 'home.']);
  });

  test('cleanWord removes punctuation and case but keeps apostrophes', () => {
    expect(cleanWord('"Don\'t,')).toBe("don't");
  });

  test('findSpans finds single and multi-word mistakes', () => {
    expect(findSpans("She don't like coffee.", "don't")).toEqual([1]);
    expect(findSpans('He is more taller than me.', 'more taller')).toEqual([2]);
    expect(findSpans('The cat and the dog.', 'the')).toEqual([0, 3]);
    expect(findSpans('He goes.', 'went')).toEqual([]);
  });

  test('errorTokenIndexes marks every word of the mistake', () => {
    expect([...errorTokenIndexes('If I will see him, I will tell him.', 'will see')]).toEqual([2, 3]);
  });

  test('applyCorrection keeps the punctuation around the mistake', () => {
    expect(applyCorrection('Yesterday we goed.', 'goed', 'went')).toBe('Yesterday we went.');
    expect(applyCorrection('He is more taller than me.', 'more taller', 'taller')).toBe('He is taller than me.');
    expect(applyCorrection('No mistake here.', 'xyz', 'abc')).toBe('No mistake here.');
  });

  test('isSameSentence compares the picked words with the sentence', () => {
    expect(isSameSentence(['I', 'like', 'cats.'], 'I like cats.')).toBe(true);
    expect(isSameSentence(['like', 'I', 'cats.'], 'I like cats.')).toBe(false);
  });
});

describe('validateSentenceBuilderInfo', () => {
  const sentences = [
    { sentence: 'She goes to school by bus.' },
    { sentence: 'We are learning English together.', hint: 'Present continuous' },
    { sentence: 'Do you like my new cat?' },
  ];

  test('valid file passes strict rules', () => {
    expect(validateSentenceBuilderInfo({ user, sentences }, { strict: true })).toEqual([]);
  });

  test('sentence length must be between 4 and 15 words', () => {
    const errors = validateSentenceBuilderInfo({ user, sentences: [{ sentence: 'Go home.' }] });
    expect(errors).toEqual([expect.stringContaining('between 4 and 15 words (found 2)')]);
  });

  test('strict mode checks capital letter, final punctuation and count', () => {
    const errors = validateSentenceBuilderInfo({ user, sentences: [{ sentence: 'she goes to school' }] }, { strict: true });
    expect(errors).toEqual([
      expect.stringContaining('capital letter'),
      expect.stringContaining('end the sentence'),
      expect.stringContaining('at least 3 sentences'),
    ]);
  });

  test('detects repeated sentences and empty hints', () => {
    const errors = validateSentenceBuilderInfo({
      user,
      sentences: [{ sentence: 'I like green apples.' }, { sentence: 'i like green  apples.', hint: '' }],
    });
    expect(errors).toEqual([
      expect.stringContaining('hint must be a non-empty string'),
      expect.stringContaining('duplicate sentence'),
    ]);
  });
});

describe('validateErrorHunterInfo', () => {
  const item = (sentence, wrong, correct = 'fixed') => ({
    sentence,
    wrong,
    correct,
    explanation: 'Because grammar.',
  });
  const errors = [
    item("She don't like coffee.", "don't", "doesn't"),
    item('Yesterday we goed home.', 'goed', 'went'),
    item('There are much cats here.', 'much', 'many'),
  ];

  test('valid file passes strict rules', () => {
    expect(validateErrorHunterInfo({ user, errors }, { strict: true })).toEqual([]);
  });

  test('the mistake must appear in the sentence', () => {
    expect(validateErrorHunterInfo({ user, errors: [item('She goes to work.', 'go')] })).toEqual([
      expect.stringContaining('"go" must appear in the sentence'),
    ]);
  });

  test('the mistake must be unique', () => {
    expect(validateErrorHunterInfo({ user, errors: [item('The cat saw the dog.', 'the')] })).toEqual([
      expect.stringContaining('appears 2 times'),
    ]);
  });

  test('correct must differ from wrong and every field is required', () => {
    const result = validateErrorHunterInfo({
      user,
      errors: [{ sentence: 'He go to work.', wrong: 'go', correct: 'Go', explanation: '' }],
    });
    expect(result).toEqual([
      expect.stringContaining('explanation must be a non-empty string'),
      expect.stringContaining('"correct" must be different'),
    ]);
  });
});

describe('content types', () => {
  test('cross duplicates work for game items', () => {
    const errors = findCrossDuplicates(
      [
        { studentCode: 'A', info: { sentences: [{ sentence: 'I like cats a lot.' }] } },
        { studentCode: 'B', info: { sentences: [{ sentence: 'I like  cats a lot.' }] } },
      ],
      CONTENT_TYPES['sentence-builder'],
    );
    expect(errors).toEqual([expect.stringContaining('from B already exists in A')]);
  });

  test.each([
    [{ words: [] }, 'vocabulary'],
    [{ sentences: [] }, 'sentence-builder'],
    [{ errors: [] }, 'error-hunter'],
    [{ topics: [] }, 'quiz'],
  ])('detectContentType(%j) = %s', (info, type) => {
    expect(detectContentType(info)).toBe(type);
  });

  test('countItems uses the right list for each type', () => {
    expect(countItems('error-hunter', { errors: [1, 2] })).toBe(2);
    expect(countItems('quiz', { topics: [{ questions: [1, 2, 3] }] })).toBe(3);
    expect(getContentType('unknown')).toBe(CONTENT_TYPES.quiz);
  });

  test.each([
    ['sentencebuilder', 'sentences'],
    ['errorhunter', 'errors'],
  ])('template for %s has the right structure and is valid except placeholders', (topic, key) => {
    const info = buildInfoTemplate({
      kind: 'quiz',
      topic,
      username: 'Ana',
      studentCode: '2212345-3743',
      profileImage: 'https://github.com/ana.png',
      socialNetwork: 'instagram',
      socialLink: 'ana',
    });
    expect(Object.keys(info)).toEqual(['user', key]);
    const type = detectContentType(info);
    expect(getContentType(type).validate(info)).toEqual([]);
    expect(getContentType(type).validate(info, { strict: true })).toContainEqual(
      expect.stringContaining('replace the template text'),
    );
  });
});
