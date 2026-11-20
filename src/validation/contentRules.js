// Content rules shared by the Vitest suite and scripts/check-contribution.mjs.
// Every function returns a list of human-readable error strings (empty = OK),
// so the same messages show up in `npm test` and in the PR pipeline.
//
// Two levels:
//   - legacy (strict: false): applied to ALL existing content, so old
//     contributions keep passing.
//   - strict (strict: true): applied to files added or changed in a PR. New
//     contributions must include the favorite social network, a valid image
//     URL, etc.

import { SOCIAL_NETWORK_IDS, isValidHandle, normalizeHandle } from '../config/socialNetworks.js';

export const STUDENT_CODE_PATTERN = /^\d{7}-\d{4}$/;
export const OPTIONS_PER_QUESTION = 4;
export const WORDS_PER_PUZZLE = 4;
export const STRICT_MIN_QUESTIONS = 3;
export const MAX_TEXT_LENGTH = 300;

// Text from the starter templates that must be replaced before a PR.
const PLACEHOLDERS = [
  /^your name$/i,
  /your[-_]?(github[-_])?user/i,
  /^write your question here/i,
  /^option [a-d]$/i,
  /^english word \d$/i,
  /^palabra \d$/i,
];
const isPlaceholder = (value) => typeof value === 'string' && PLACEHOLDERS.some((re) => re.test(value.trim()));

/** Strict-only: lists template values the student forgot to replace. */
export const findPlaceholders = (info) => {
  const values = [
    info?.user?.username,
    info?.user?.socialLink,
    info?.user?.profileImage,
    ...listQuestions(info).flatMap((q) => [q?.question, ...(Array.isArray(q?.options) ? q.options : [])]),
    ...(Array.isArray(info?.words) ? info.words.flatMap((w) => [w?.en, w?.es]) : []),
  ];
  const found = [...new Set(values.filter(isPlaceholder))];
  return found.length ? [`replace the template text: ${found.map((v) => `"${v}"`).join(', ')}`] : [];
};

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const normalize = (text) => text.trim().toLowerCase().replace(/\s+/g, ' ');

// Two questions are "the same" when the text AND the options match. Generic
// prompts like "Choose the correct sentence" are fine with different options.
const questionKey = (q) =>
  JSON.stringify([normalize(q.question), q.options.filter(isNonEmptyString).map(normalize).sort()]);

export const isValidStudentCode = (code) => STUDENT_CODE_PATTERN.test(code);

export const validateUser = (user, { strict = false } = {}) => {
  const errors = [];
  if (!user || typeof user !== 'object') return ['"user" object is missing'];

  if (!isNonEmptyString(user.username)) errors.push('user.username must be a non-empty string');
  if (typeof user.profileImage !== 'string') errors.push('user.profileImage must be a string (an image URL)');
  if (!isNonEmptyString(user.socialLink)) errors.push('user.socialLink must be a non-empty string');

  if (user.socialNetwork !== undefined && !SOCIAL_NETWORK_IDS.includes(user.socialNetwork)) {
    errors.push(
      `user.socialNetwork "${user.socialNetwork}" is not allowed. Use one of: ${SOCIAL_NETWORK_IDS.join(', ')}`,
    );
  }

  if (strict) {
    if (user.socialNetwork === undefined) {
      errors.push(`user.socialNetwork is required. Use one of: ${SOCIAL_NETWORK_IDS.join(', ')}`);
    }
    if (typeof user.profileImage === 'string' && !/^https:\/\/\S+$/i.test(user.profileImage)) {
      errors.push('user.profileImage must be an https:// URL');
    }
    if (isNonEmptyString(user.socialLink) && !isValidHandle(normalizeHandle(user.socialLink))) {
      errors.push('user.socialLink must be your handle, e.g. "@my_user" (letters, numbers, . _ -)');
    }
    if (isNonEmptyString(user.username) && user.username.length > 60) {
      errors.push('user.username is too long (max 60 characters)');
    }
  }
  return errors;
};

export const validateQuestion = (question, label = 'question', { strict = false } = {}) => {
  const errors = [];
  if (!question || typeof question !== 'object') return [`${label}: must be an object`];

  const { question: text, options, answer } = question;
  if (!isNonEmptyString(text)) errors.push(`${label}: "question" must be a non-empty string`);
  if (!Array.isArray(options)) return [...errors, `${label}: "options" must be an array`];

  if (options.length !== OPTIONS_PER_QUESTION) {
    errors.push(`${label}: must have exactly ${OPTIONS_PER_QUESTION} options (found ${options.length})`);
  }
  if (!options.every(isNonEmptyString)) errors.push(`${label}: every option must be a non-empty string`);

  const normalized = options.filter(isNonEmptyString).map(normalize);
  if (new Set(normalized).size !== normalized.length) errors.push(`${label}: options must not repeat`);

  if (!isNonEmptyString(answer)) errors.push(`${label}: "answer" must be a non-empty string`);
  else if (!options.includes(answer)) errors.push(`${label}: "answer" must be exactly one of the options`);

  if (strict) {
    [text, ...options].filter(isNonEmptyString).forEach((value) => {
      if (value.length > MAX_TEXT_LENGTH) errors.push(`${label}: text longer than ${MAX_TEXT_LENGTH} characters`);
    });
    const extraKeys = Object.keys(question).filter((k) => !['question', 'options', 'answer'].includes(k));
    if (extraKeys.length) errors.push(`${label}: unexpected keys ${extraKeys.join(', ')}`);
  }
  return errors;
};

export const listQuestions = (info) =>
  (Array.isArray(info?.topics) ? info.topics : []).flatMap((topic) =>
    Array.isArray(topic?.questions) ? topic.questions : [],
  );

export const validateQuizInfo = (info, { strict = false } = {}) => {
  if (!info || typeof info !== 'object') return ['info.json must contain a JSON object'];
  const errors = [...validateUser(info.user, { strict })];

  if (!Array.isArray(info.topics) || info.topics.length === 0) {
    return [...errors, '"topics" must be a non-empty array'];
  }

  info.topics.forEach((topic, t) => {
    if (!isNonEmptyString(topic?.topic)) errors.push(`topics[${t}].topic must be a non-empty string`);
    if (!Array.isArray(topic?.questions) || topic.questions.length === 0) {
      errors.push(`topics[${t}].questions must be a non-empty array`);
      return;
    }
    topic.questions.forEach((q, i) => {
      errors.push(...validateQuestion(q, `topics[${t}].questions[${i}]`, { strict }));
    });
  });

  const questions = listQuestions(info);
  if (strict) errors.push(...findPlaceholders(info));
  if (strict && questions.length < STRICT_MIN_QUESTIONS) {
    errors.push(`add at least ${STRICT_MIN_QUESTIONS} questions (found ${questions.length})`);
  }

  const seen = new Set();
  questions.forEach((q) => {
    if (!isNonEmptyString(q?.question) || !Array.isArray(q.options)) return;
    const key = questionKey(q);
    if (seen.has(key)) errors.push(`duplicate question inside the file: "${q.question}"`);
    seen.add(key);
  });

  return errors;
};

export const validateVocabularyInfo = (info, { strict = false } = {}) => {
  if (!info || typeof info !== 'object') return ['info.json must contain a JSON object'];
  const errors = [...validateUser(info.user, { strict })];

  if (!Array.isArray(info.words)) return [...errors, '"words" must be an array'];
  if (info.words.length !== WORDS_PER_PUZZLE) {
    errors.push(`"words" must have exactly ${WORDS_PER_PUZZLE} pairs (found ${info.words.length})`);
  }

  const ids = new Set();
  const english = new Set();
  info.words.forEach((word, i) => {
    if (!word || typeof word !== 'object') {
      errors.push(`words[${i}] must be an object`);
      return;
    }
    if (word.id === undefined || word.id === null) errors.push(`words[${i}].id is required`);
    else if (ids.has(word.id)) errors.push(`words[${i}].id ${word.id} is repeated`);
    ids.add(word.id);

    if (!isNonEmptyString(word.en)) errors.push(`words[${i}].en must be a non-empty string`);
    if (!isNonEmptyString(word.es)) errors.push(`words[${i}].es must be a non-empty string`);
    if (strict && isNonEmptyString(word.en)) {
      if (english.has(normalize(word.en))) errors.push(`words[${i}].en "${word.en}" is repeated`);
      english.add(normalize(word.en));
    }
  });
  if (strict) errors.push(...findPlaceholders(info));
  return errors;
};

/**
 * Checks that index.json and the student folders on disk agree.
 * indexFolders: names listed in index.json; diskFolders: directories found.
 */
export const validateIndex = (indexJson, diskFolders = []) => {
  const errors = [];
  const folders = indexJson?.folders;
  if (!Array.isArray(folders)) return ['index.json must have a "folders" array'];

  const counts = folders.reduce((acc, f) => acc.set(f, (acc.get(f) || 0) + 1), new Map());
  counts.forEach((n, f) => n > 1 && errors.push(`"${f}" is listed ${n} times in index.json`));

  folders.forEach((f) => {
    if (!diskFolders.includes(f)) errors.push(`"${f}" is listed in index.json but the folder does not exist`);
  });
  diskFolders.forEach((f) => {
    if (!folders.includes(f)) errors.push(`folder "${f}" exists but is missing from index.json`);
    if (!isValidStudentCode(f)) errors.push(`folder "${f}" must be a student code like 1234567-1234`);
  });
  return errors;
};

/**
 * Finds questions repeated across different students of the same topic.
 * entries: [{ studentCode, info }]
 */
export const findCrossDuplicates = (entries) => {
  const owners = new Map();
  const errors = [];
  entries.forEach(({ studentCode, info }) => {
    listQuestions(info).forEach((q) => {
      if (!isNonEmptyString(q?.question) || !Array.isArray(q.options)) return;
      const key = questionKey(q);
      const owner = owners.get(key);
      if (owner && owner !== studentCode) {
        errors.push(`"${q.question}" from ${studentCode} already exists in ${owner}`);
      } else {
        owners.set(key, studentCode);
      }
    });
  });
  return errors;
};
