import { describe, expect, test } from 'vitest';
import {
  findCrossDuplicates,
  isValidStudentCode,
  validateStudentFolders,
  validateQuestion,
  validateQuizInfo,
  validateUser,
  validateVocabularyInfo,
} from '../../validation/contentRules.js';

const user = {
  username: 'Ana Gómez',
  profileImage: 'https://github.com/ana.png',
  socialNetwork: 'instagram',
  socialLink: '@ana_g',
};

const legacyUser = { ...user };
delete legacyUser.socialNetwork;

const question = (text = 'She _____ to school every day.') => ({
  question: text,
  options: ['go', 'goes', 'going', 'gone'],
  answer: 'goes',
});

const quizInfo = (questions = [question('Q1 _____'), question('Q2 _____'), question('Q3 _____')]) => ({
  user,
  topics: [{ topic: 'verbs', questions }],
});

describe('student code', () => {
  test.each(['2212345-3743', '0828614-2724'])('accepts %s', (code) => {
    expect(isValidStudentCode(code)).toBe(true);
  });
  test.each(['221234-3743', 'abc', '2212345_3743', '2212345-3743 '])('rejects "%s"', (code) => {
    expect(isValidStudentCode(code)).toBe(false);
  });
});

describe('validateUser', () => {
  test('a complete user passes strict rules', () => {
    expect(validateUser(user, { strict: true })).toEqual([]);
  });

  test('legacy users without socialNetwork still pass', () => {
    expect(validateUser(legacyUser)).toEqual([]);
  });

  test('strict mode requires socialNetwork', () => {
    expect(validateUser(legacyUser, { strict: true })).toEqual([
      expect.stringContaining('socialNetwork is required'),
    ]);
  });

  test('rejects unknown networks', () => {
    expect(validateUser({ ...user, socialNetwork: 'myspace' })).toEqual([
      expect.stringContaining('"myspace" is not allowed'),
    ]);
  });

  test('strict mode requires https images and clean handles', () => {
    const errors = validateUser(
      { ...user, profileImage: 'http://x.com/a.png', socialLink: '<script>' },
      { strict: true },
    );
    expect(errors).toHaveLength(2);
  });
});

describe('validateQuestion', () => {
  test('valid question', () => {
    expect(validateQuestion(question())).toEqual([]);
  });

  test('needs exactly 4 options', () => {
    expect(validateQuestion({ ...question(), options: ['go', 'goes', 'gone'] })).toEqual([
      expect.stringContaining('exactly 4 options'),
    ]);
  });

  test('answer must be one of the options', () => {
    expect(validateQuestion({ ...question(), answer: 'went' })).toEqual([
      expect.stringContaining('must be exactly one of the options'),
    ]);
  });

  test('options must not repeat (ignoring case and spaces)', () => {
    expect(validateQuestion({ ...question(), options: ['go', 'goes', 'Goes ', 'gone'] })).toEqual([
      expect.stringContaining('must not repeat'),
    ]);
  });

  test('strict mode rejects unexpected keys', () => {
    expect(validateQuestion({ ...question(), hint: 'x' }, 'q', { strict: true })).toEqual([
      expect.stringContaining('unexpected keys hint'),
    ]);
  });
});

describe('validateQuizInfo', () => {
  test('valid quiz passes strict rules', () => {
    expect(validateQuizInfo(quizInfo(), { strict: true })).toEqual([]);
  });

  test('strict mode needs at least 3 questions', () => {
    expect(validateQuizInfo(quizInfo([question()]), { strict: true })).toEqual([
      expect.stringContaining('at least 3 questions'),
    ]);
  });

  test('detects duplicated questions in the same file', () => {
    expect(validateQuizInfo(quizInfo([question('Same'), question('same ')]))).toEqual([
      expect.stringContaining('duplicate question'),
    ]);
  });

  test('allows the same generic prompt with different options', () => {
    const other = { question: 'Same', options: ['a', 'b', 'c', 'd'], answer: 'a' };
    expect(validateQuizInfo(quizInfo([question('Same'), other]))).toEqual([]);
  });

  test('requires topics', () => {
    expect(validateQuizInfo({ user, topics: [] })).toContain('"topics" must be a non-empty array');
  });
});

describe('validateVocabularyInfo', () => {
  const words = [
    { id: 1, en: 'cat', es: 'gato' },
    { id: 2, en: 'dog', es: 'perro' },
    { id: 3, en: 'bird', es: 'pájaro' },
    { id: 4, en: 'fish', es: 'pez' },
  ];

  test('valid puzzle', () => {
    expect(validateVocabularyInfo({ user, words }, { strict: true })).toEqual([]);
  });

  test('needs exactly 4 pairs with unique ids', () => {
    const errors = validateVocabularyInfo({ user, words: [...words.slice(0, 2), { id: 1, en: 'x', es: 'y' }] });
    expect(errors).toEqual([
      expect.stringContaining('exactly 4 pairs'),
      expect.stringContaining('id 1 is repeated'),
    ]);
  });
});

describe('validateStudentFolders', () => {
  test('flags folders that are not student codes or have no info.json', () => {
    expect(
      validateStudentFolders([
        { name: '1111111-1111', hasInfo: true },
        { name: 'my-group', hasInfo: true },
        { name: '2222222-2222', hasInfo: false },
      ]),
    ).toEqual([
      expect.stringContaining('"my-group" must be a student code'),
      expect.stringContaining('"2222222-2222" has no info.json'),
    ]);
  });
});

describe('findCrossDuplicates', () => {
  test('flags a question copied by another student', () => {
    const errors = findCrossDuplicates([
      { studentCode: 'A', info: quizInfo() },
      { studentCode: 'B', info: quizInfo([question('Q1 _____')]) },
    ]);
    expect(errors).toEqual([expect.stringContaining('from B already exists in A')]);
  });
});
