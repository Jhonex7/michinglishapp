import { describe, expect, test } from 'vitest';
import { normalizeHandle, resolveSocialProfile } from '../../config/socialNetworks.js';
import {
  buildContributorDirectory,
  extractQuestionsWithContributor,
  toContributor,
} from '../../helpers/contributors.js';
import { buildFilePath, buildInfoTemplate } from '../../helpers/contributionTemplate.js';
import { validateQuizInfo, validateVocabularyInfo } from '../../validation/contentRules.js';
import { shuffleArray } from '../../helpers/shuffleArray.js';

describe('normalizeHandle', () => {
  test.each([
    ['@ana_g', 'ana_g'],
    ['ana_g', 'ana_g'],
    ['@github.com/KevToro', 'KevToro'],
    ['https://github.com/KevToro', 'KevToro'],
    ['https://www.instagram.com/ana.g/?hl=es', 'ana.g'],
    ['@max.comfort', 'max.comfort'],
    [undefined, ''],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeHandle(input)).toBe(expected);
  });
});

describe('resolveSocialProfile', () => {
  test('uses the declared network to build the link', () => {
    expect(resolveSocialProfile('tiktok', '@ana_g')).toEqual({
      network: 'tiktok',
      label: 'TikTok',
      handle: 'ana_g',
      url: 'https://www.tiktok.com/@ana_g',
    });
  });

  test('infers the network from legacy URLs', () => {
    expect(resolveSocialProfile(undefined, 'https://github.com/KevToro').url).toBe('https://github.com/KevToro');
  });

  test('does not infer x.com from handles that merely contain it', () => {
    expect(resolveSocialProfile(undefined, '@max.comfort').network).toBe('other');
  });

  test('never builds links from unsafe handles', () => {
    expect(resolveSocialProfile('instagram', 'javascript:alert(1)').url).toBeNull();
  });

  test('networks without public profile URLs have no link', () => {
    expect(resolveSocialProfile('discord', '@ana').url).toBeNull();
  });
});

describe('toContributor', () => {
  test('includes name, student code and social profile', () => {
    const c = toContributor(
      { username: ' Ana ', profileImage: 'https://img/a.png', socialNetwork: 'x', socialLink: '@ana' },
      '2212345-3743',
    );
    expect(c).toMatchObject({ name: 'Ana', code: '2212345-3743', profileImage: 'https://img/a.png' });
    expect(c.social.url).toBe('https://x.com/ana');
  });

  test('drops non-https images and fills a default name', () => {
    const c = toContributor({ profileImage: 'javascript:alert(1)' });
    expect(c.profileImage).toBeNull();
    expect(c.name).toBe('Anonymous student');
  });
});

const entries = [
  {
    studentCode: '1111111-1111',
    user: { username: 'Ana', socialLink: '@ana' },
    topics: [{ topic: 't', questions: [{ question: 'a' }, { question: 'b' }] }],
  },
  {
    studentCode: '2222222-2222',
    user: { username: 'Beto', socialLink: '@beto' },
    topics: [{ topic: 't', questions: [{ question: 'c' }] }],
  },
];

test('extractQuestionsWithContributor attaches the author to each question', () => {
  const questions = extractQuestionsWithContributor(entries);
  expect(questions).toHaveLength(3);
  expect(questions[2]).toMatchObject({ question: 'c', contributor: { name: 'Beto', code: '2222222-2222' } });
});

test('buildContributorDirectory merges a student across topics and puzzles', () => {
  const directory = buildContributorDirectory(
    { verbs: entries, adverbs: [entries[1]] },
    { animals: [{ studentCode: '2222222-2222', user: entries[1].user, words: [1, 2, 3, 4] }] },
    [{ id: 'verbs', title: 'Verbs' }, { id: 'adverbs', title: 'Adverbs' }],
  );
  expect(directory.map((c) => [c.name, c.questions])).toEqual([
    ['Beto', 6],
    ['Ana', 2],
  ]);
  expect(directory[0].topics).toEqual(['Verbs', 'Adverbs', 'Puzzle: animals']);
});

describe('contribution templates', () => {
  const profile = {
    kind: 'quiz',
    topic: 'secondconditional',
    username: 'Ana',
    studentCode: '2212345-3743',
    profileImage: 'https://github.com/ana.png',
    socialNetwork: 'instagram',
    socialLink: 'ana_g',
  };

  test('quiz template has the user block ready and a valid structure', () => {
    const info = buildInfoTemplate(profile);
    expect(info.user).toEqual({
      username: 'Ana',
      profileImage: 'https://github.com/ana.png',
      socialNetwork: 'instagram',
      socialLink: '@ana_g',
    });
    expect(validateQuizInfo(info)).toEqual([]);
    expect(buildFilePath(profile)).toBe('public/secondconditional/2212345-3743/info.json');
  });

  test('vocabulary template has a valid structure but strict mode asks to replace the sample words', () => {
    const vocab = { ...profile, kind: 'vocabulary', topic: 'animals' };
    expect(validateVocabularyInfo(buildInfoTemplate(vocab))).toEqual([]);
    expect(validateVocabularyInfo(buildInfoTemplate(vocab), { strict: true })).toEqual([
      expect.stringContaining('replace the template text: "english word 1", "palabra 1"'),
    ]);
    expect(buildFilePath(vocab)).toBe('public/vocabulary/animals/2212345-3743/info.json');
  });
});

test('shuffleArray keeps the same items and does not mutate the input', () => {
  const input = [1, 2, 3, 4, 5];
  const output = shuffleArray(input);
  expect(input).toEqual([1, 2, 3, 4, 5]);
  expect([...output].sort()).toEqual(input);
});
