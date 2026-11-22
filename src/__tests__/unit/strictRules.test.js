// Rules that protect the project from incomplete profiles, misspelled keys and
// forgotten template text in NEW contributions (strict mode).
import { describe, expect, test } from 'vitest';
import {
  findDuplicateKeys,
  findProfileConflicts,
  findUnknownKeys,
  imageUrlProblem,
  isValidCategoryName,
  puzzleKey,
  suggestKey,
  validateErrorHunterInfo,
  validateNoDuplicateKeys,
  validateQuizInfo,
  validateSentenceBuilderInfo,
  validateTopicNames,
  validateUser,
  validateVocabularyInfo,
} from '../../validation/contentRules.js';
import { CONTENT_TYPES, getContentType } from '../../config/contentTypes.js';
import { QUIZ_TOPICS, getTopicById } from '../../config/topics.js';
import { buildInfoTemplate } from '../../helpers/contributionTemplate.js';
import { explainJsonError, parseInfoText, stripBom } from '../../validation/jsonText.js';

const user = {
  username: 'Ana Gómez',
  profileImage: 'https://github.com/ana.png',
  socialNetwork: 'instagram',
  socialLink: '@ana_g',
};

const questions = [1, 2, 3].map((i) => ({
  question: `Question ${i}: she _____ to school.`,
  options: ['go', 'goes', 'going', 'gone'],
  answer: 'goes',
}));
const sentences = [1, 2, 3].map((i) => ({ sentence: `I have ${i} green apples at home.` }));
const errorItems = [1, 2, 3].map((i) => ({
  sentence: `She don't like coffee number ${i}.`,
  wrong: "don't",
  correct: "doesn't",
  explanation: 'With she we use doesn’t.',
}));
const words = [
  { id: 1, en: 'cat', es: 'gato' },
  { id: 2, en: 'dog', es: 'perro' },
  { id: 3, en: 'bird', es: 'pájaro' },
  { id: 4, en: 'fish', es: 'pez' },
];

// One valid strict file per content type, used as a base for the cases below.
const VALID = {
  quiz: { user, topics: [{ topic: 'verbs', questions }] },
  'sentence-builder': { user, sentences },
  'error-hunter': { user, errors: errorItems },
  vocabulary: { user, words },
};

describe('valid files of every type pass strict rules', () => {
  test.each(Object.keys(VALID))('%s', (type) => {
    expect(getContentType(type).validate(VALID[type], { strict: true })).toEqual([]);
  });
});

describe('incomplete profile (strict)', () => {
  test.each(Object.keys(VALID))('%s: a missing user block is reported', (type) => {
    const info = { ...VALID[type] };
    delete info.user;
    expect(getContentType(type).validate(info, { strict: true })).toContain('"user" object is missing');
  });

  test.each([
    ['username', 'user.username must be a non-empty string'],
    ['profileImage', 'user.profileImage must be a string'],
    ['socialNetwork', 'user.socialNetwork is required'],
    ['socialLink', 'user.socialLink must be a non-empty string'],
  ])('missing %s is reported', (field, message) => {
    const partial = { ...user };
    delete partial[field];
    expect(validateUser(partial, { strict: true })).toContainEqual(expect.stringContaining(message));
  });

  test.each(['', '   '])('blank username "%s" is reported', (username) => {
    expect(validateUser({ ...user, username }, { strict: true })).toContainEqual(
      expect.stringContaining('user.username must be a non-empty string'),
    );
  });

  test('user must be an object, not a string or a list', () => {
    expect(validateUser('Ana', { strict: true })).toEqual(['"user" object is missing']);
    expect(validateUser(null, { strict: true })).toEqual(['"user" object is missing']);
  });

  test('a capitalized network explains to use lowercase', () => {
    expect(validateUser({ ...user, socialNetwork: 'Instagram' })).toEqual([
      'user.socialNetwork "Instagram" must be written in lowercase: "instagram"',
    ]);
  });

  test('a full URL in socialLink is not a handle', () => {
    expect(validateUser({ ...user, socialLink: 'my user name!' }, { strict: true })).toContainEqual(
      expect.stringContaining('user.socialLink must be your handle'),
    );
  });

  test('username longer than 60 characters', () => {
    expect(validateUser({ ...user, username: 'a'.repeat(61) }, { strict: true })).toContainEqual(
      expect.stringContaining('too long'),
    );
  });
});

describe('profile image', () => {
  test.each([
    'https://github.com/ana.png',
    'https://avatars.githubusercontent.com/u/108841606?s=400',
    'https://lh3.googleusercontent.com/a/ACg8ocI5HyW57',
    'https://i.postimg.cc/J7QbsKdq/me.jpg',
  ])('accepts image URL %s', (url) => {
    expect(imageUrlProblem(url)).toBeNull();
    expect(validateUser({ ...user, profileImage: url }, { strict: true })).toEqual([]);
  });

  test('a GitHub profile page suggests adding .png', () => {
    expect(imageUrlProblem('https://github.com/ana')).toContain('https://github.com/ana.png');
  });

  test.each([
    'https://www.instagram.com/ana_g',
    'https://tiktok.com/@ana',
    'https://www.facebook.com/ana',
    'https://www.google.com/search?q=cat',
    'https://drive.google.com/file/d/123/view',
  ])('rejects the web page %s', (url) => {
    expect(validateUser({ ...user, profileImage: url }, { strict: true })).toEqual([
      expect.stringContaining('is a web page, not an image'),
    ]);
  });

  test.each(['http://github.com/ana.png', 'github.com/ana.png', 'https://x y.png'])('rejects non-https %s', (url) => {
    expect(validateUser({ ...user, profileImage: url }, { strict: true })).toEqual([
      'user.profileImage must be an https:// URL',
    ]);
  });
});

describe('misspelled or unexpected keys (strict)', () => {
  test('suggestKey finds the closest allowed key', () => {
    expect(suggestKey('socialnetwork', ['socialNetwork', 'socialLink'])).toBe('socialNetwork');
    expect(suggestKey('userName', ['username'])).toBe('username');
    expect(suggestKey('profileimg', ['profileImage'])).toBe('profileImage');
    expect(suggestKey('banana', ['username', 'socialLink'])).toBeNull();
  });

  test('findUnknownKeys explains the typo', () => {
    expect(findUnknownKeys({ userName: 'x' }, ['username'], 'user')).toEqual([
      'user: unexpected key "userName" (did you mean "username"?). Allowed: username',
    ]);
  });

  test('a misspelled key in user is reported with a hint', () => {
    const errors = validateUser({ ...user, socialnetwork: 'x' }, { strict: true });
    expect(errors).toContainEqual(expect.stringContaining('did you mean "socialNetwork"?'));
  });

  test.each([
    ['quiz', 'topic', 'topics'],
    ['sentence-builder', 'sentence', 'sentences'],
    ['error-hunter', 'error', 'errors'],
    ['vocabulary', 'word', 'words'],
  ])('%s: extra top-level key "%s" is reported', (type, key, hint) => {
    const errors = getContentType(type).validate({ ...VALID[type], [key]: [] }, { strict: true });
    expect(errors).toContainEqual(expect.stringContaining(`unexpected key "${key}" (did you mean "${hint}"?)`));
  });

  test('legacy mode ignores extra keys (old files keep passing)', () => {
    expect(validateQuizInfo({ ...VALID.quiz, comment: 'hi' })).toEqual([]);
  });

  test('topic objects only accept topic and questions', () => {
    const info = { user, topics: [{ topic: 'verbs', questions, question: [] }] };
    expect(validateQuizInfo(info, { strict: true })).toContainEqual(
      expect.stringContaining('topics[0]: unexpected key "question" (did you mean "questions"?)'),
    );
  });

  test('vocabulary words only accept id, en and es', () => {
    const info = { user, words: [{ ...words[0], spanish: 'gato' }, ...words.slice(1)] };
    expect(validateVocabularyInfo(info, { strict: true })).toContainEqual(
      expect.stringContaining('words[0]: unexpected key "spanish"'),
    );
  });

  test('a misspelled list name is reported as missing', () => {
    expect(validateSentenceBuilderInfo({ user, sentence: sentences }, { strict: true })).toContain(
      '"sentences" must be a non-empty array',
    );
    expect(validateErrorHunterInfo({ user, erros: errorItems }, { strict: true })).toContain(
      '"errors" must be a non-empty array',
    );
  });
});

describe('wrong JSON shapes never crash the validators', () => {
  const shapes = [null, [], 'text', 42, {}, { user: [] }, { topics: 'x' }, { words: {} }, { sentences: [null, 1] }, { errors: [[]] }];
  test.each(Object.keys(CONTENT_TYPES))('%s', (type) => {
    shapes.forEach((shape) => {
      expect(() => getContentType(type).validate(shape, { strict: true })).not.toThrow();
      expect(getContentType(type).validate(shape, { strict: true }).length).toBeGreaterThan(0);
    });
  });
});

describe('duplicate keys (JSON keeps only the last one)', () => {
  test('finds a repeated key and its line', () => {
    const text = '{\n  "user": {\n    "profileImage": "a",\n    "profileImage": "b"\n  }\n}';
    expect(findDuplicateKeys(text)).toEqual(['"profileImage" (line 4)']);
    expect(validateNoDuplicateKeys(text)).toEqual([expect.stringContaining('merge them into one')]);
  });

  test('a repeated "questions" list would lose questions', () => {
    const text = JSON.stringify({ topics: [{ topic: 'x', questions: [1] }] }).replace(
      '"questions":[1]',
      '"questions":[1],"questions":[2]',
    );
    expect(findDuplicateKeys(text)).toEqual(['"questions" (line 1)']);
  });

  test('same key in different objects is fine, and string values are not keys', () => {
    const text = JSON.stringify({ a: { id: 1, t: 'id' }, b: { id: 2, t: 'say "id": here' }, list: [{ id: 3 }, { id: 4 }] });
    expect(findDuplicateKeys(text)).toEqual([]);
  });

  test('escaped quotes inside keys and values', () => {
    expect(findDuplicateKeys('{"a\\"b": 1, "c": "x\\\\", "a\\"b": 2}')).toEqual(['"a"b" (line 1)']);
  });
});

describe('reading info.json text', () => {
  test('a Windows BOM is removed', () => {
    expect(stripBom('\uFEFF{}')).toBe('{}');
    expect(parseInfoText('\uFEFF{"user":{}}').data).toEqual({ user: {} });
  });

  test.each([
    ['{"a": 1,}', 'remove the comma'],
    ['{“a”: 1}', 'curly quotes'],
    ['{\n// note\n"a": 1}', 'does not allow comments'],
    ["{'a': 1}", 'double quotes'],
    ['', 'the file is empty'],
  ])('explains %j', (text, tip) => {
    expect(parseInfoText(text).error).toContain(tip);
  });

  test('error without a known cause still has the parser message', () => {
    expect(explainJsonError('{', new SyntaxError('Unexpected end'))).toBe('invalid JSON (Unexpected end)');
  });
});

describe('topic name must match the folder (strict, quiz)', () => {
  const second = getTopicById('secondconditional');
  test.each(['second conditional', 'Second Conditional', 'secondconditional', 'second-conditionals'])('accepts "%s"', (name) => {
    expect(validateTopicNames({ topics: [{ topic: name }] }, second)).toEqual([]);
  });

  test('copy-pasted topic from another folder is reported', () => {
    expect(validateTopicNames({ topics: [{ topic: 'verbs' }] }, second)).toEqual([
      'topics[0].topic is "verbs" but the file is in public/secondconditional. Use "second conditional"',
    ]);
  });

  test('the mixed "data" topic and games accept anything', () => {
    expect(validateTopicNames({ topics: [{ topic: 'idioms' }] }, getTopicById('data'))).toEqual([]);
    expect(validateTopicNames({ topics: [{ topic: 'x' }] }, getTopicById('sentencebuilder'))).toEqual([]);
  });

  test.each(QUIZ_TOPICS.filter((t) => t.type === 'quiz').map((t) => [t.id, t]))(
    '%s accepts its own title',
    (_, topic) => {
      expect(validateTopicNames({ topics: [{ topic: topic.title }] }, topic)).toEqual([]);
    },
  );
});

describe('copies and identity', () => {
  test('puzzleKey ignores order and case', () => {
    const shuffled = [words[2], words[0], { ...words[1], en: 'DOG ' }, words[3]];
    expect(puzzleKey({ words })).toBe(puzzleKey({ words: shuffled }));
    expect(puzzleKey({ words: [] })).toBeNull();
  });

  test('same student code with different names is reported', () => {
    expect(
      findProfileConflicts([
        { studentCode: '1111111-1111', info: { user: { username: 'Ana' } }, where: 'verbs' },
        { studentCode: '1111111-1111', info: { user: { username: ' ana ' } }, where: 'adverbs' },
        { studentCode: '1111111-1111', info: { user: { username: 'Pedro' } }, where: 'data' },
        { studentCode: '2222222-2222', info: { user: { username: 'Pedro' } }, where: 'data' },
      ]),
    ).toEqual([expect.stringContaining('student 1111111-1111 uses different names')]);
  });

  test.each([
    ['animals', true],
    ['body-parts', true],
    ['Animals', false],
    ['body parts', false],
    ['body_parts', false],
    ['-x', false],
  ])('category name "%s" valid: %s', (name, ok) => {
    expect(isValidCategoryName(name)).toBe(ok);
  });
});

// Templates and validators live in different files: these tests keep them in
// sync. The untouched template must FAIL (placeholders) and the template with
// only the sample values replaced must PASS.
describe('every starter template stays in sync with the rules', () => {
  const profile = {
    username: 'Ana Gómez',
    studentCode: '2212345-3743',
    profileImage: 'https://github.com/ana.png',
    socialNetwork: 'instagram',
    socialLink: 'ana_g',
  };
  const untouched = {
    ...profile,
    username: 'Your Name',
    profileImage: 'https://github.com/your-github-user.png',
    socialLink: 'your_user',
  };

  const FILLED = {
    quiz: (t) => ({ ...t, topics: [{ ...t.topics[0], questions }] }),
    'sentence-builder': (t) => ({
      ...t,
      sentences: sentences.map((s, i) => ({ ...s, hint: t.sentences[0].hint.replace(/^.*$/, `Hint ${i}`) })),
    }),
    'error-hunter': (t) => ({ ...t, errors: errorItems }),
    vocabulary: (t) => ({ ...t, words }),
  };

  const cases = [
    ...QUIZ_TOPICS.map((t) => [t.id, { kind: 'quiz', topic: t.id }, t.type]),
    ['vocabulary', { kind: 'vocabulary', topic: 'animals' }, 'vocabulary'],
  ];

  test.each(cases)('%s: untouched template is rejected', (_, choice, type) => {
    const errors = getContentType(type).validate(buildInfoTemplate({ ...untouched, ...choice }), { strict: true });
    expect(errors).toContainEqual(expect.stringContaining('replace the template text'));
    // The placeholder of the profile itself is detected too.
    expect(errors.join(' ')).toContain('"Your Name"');
  });

  test.each(cases)('%s: filled template is accepted', (_, choice, type) => {
    const filled = FILLED[type](buildInfoTemplate({ ...profile, ...choice }));
    expect(getContentType(type).validate(filled, { strict: true })).toEqual([]);
    const topic = getTopicById(choice.topic);
    expect(validateTopicNames(filled, topic)).toEqual([]);
  });

  test('the optional hint of the Sentence Builder template is a placeholder', () => {
    const template = buildInfoTemplate({ ...profile, kind: 'quiz', topic: 'sentencebuilder' });
    const info = { ...template, sentences: sentences.map((s) => ({ ...s, hint: template.sentences[0].hint })) };
    expect(validateSentenceBuilderInfo(info, { strict: true })).toEqual([
      expect.stringContaining('replace the template text: "Optional: a short clue'),
    ]);
  });
});
