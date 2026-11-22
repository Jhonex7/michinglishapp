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
import { findSpans, tokenize } from '../games/sentenceTools.js';

export const STUDENT_CODE_PATTERN = /^\d{7}-\d{4}$/;
export const OPTIONS_PER_QUESTION = 4;
export const WORDS_PER_PUZZLE = 4;
export const STRICT_MIN_QUESTIONS = 3;
export const MAX_TEXT_LENGTH = 300;
export const SENTENCE_MIN_WORDS = 4;
export const SENTENCE_MAX_WORDS = 15;
export const ERROR_SENTENCE_MIN_WORDS = 3;
export const ERROR_SENTENCE_MAX_WORDS = 25;

// Text from the starter templates that must be replaced before a PR.
const PLACEHOLDERS = [
  /^your name$/i,
  /your[-_]?(github[-_])?user/i,
  /^write your question here/i,
  /^option [a-d]$/i,
  /^english word \d$/i,
  /^palabra \d$/i,
  /^write your (sentence|wrong sentence) here/i,
  /^explain the mistake/i,
  /^optional: a short clue/i,
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
    ...(Array.isArray(info?.sentences) ? info.sentences.flatMap((x) => [x?.sentence, x?.hint]) : []),
    ...(Array.isArray(info?.errors) ? info.errors.flatMap((x) => [x?.sentence, x?.explanation]) : []),
  ];
  const found = [...new Set(values.filter(isPlaceholder))];
  return found.length ? [`replace the template text: ${found.map((v) => `"${v}"`).join(', ')}`] : [];
};

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const normalize = (text) => text.trim().toLowerCase().replace(/\s+/g, ' ');
const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

// ---------------------------------------------------------------------------
// Unknown / misspelled keys (strict only)
// ---------------------------------------------------------------------------

export const USER_KEYS = ['username', 'profileImage', 'socialNetwork', 'socialLink'];
export const TOP_LEVEL_KEYS = {
  quiz: ['user', 'topics'],
  'sentence-builder': ['user', 'sentences'],
  'error-hunter': ['user', 'errors'],
  vocabulary: ['user', 'words'],
};

/** Edit distance, used to suggest the right key for a typo. */
const distance = (a, b) => {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
};

/** Closest allowed key for a misspelled one ("socialnetwork" -> "socialNetwork"). */
export const suggestKey = (key, allowed) => {
  const lower = key.toLowerCase();
  const best = allowed
    .map((candidate) => ({ candidate, d: distance(lower, candidate.toLowerCase()) }))
    .sort((a, b) => a.d - b.d)[0];
  return best && best.d <= Math.max(2, Math.floor(best.candidate.length / 3)) ? best.candidate : null;
};

/** Lists keys of `obj` that are not in `allowed`, with a "did you mean" hint. */
export const findUnknownKeys = (obj, allowed, label) => {
  if (!isPlainObject(obj)) return [];
  return Object.keys(obj)
    .filter((key) => !allowed.includes(key))
    .map((key) => {
      const hint = suggestKey(key, allowed);
      return `${label}: unexpected key "${key}"${hint ? ` (did you mean "${hint}"?)` : ''}. Allowed: ${allowed.join(', ')}`;
    });
};

// ---------------------------------------------------------------------------
// Duplicate keys: JSON.parse keeps only the LAST one, silently losing data.
// ---------------------------------------------------------------------------

/** Returns the keys repeated inside the same JSON object, e.g. ['"questions" (line 12)']. */
export const findDuplicateKeys = (text) => {
  if (typeof text !== 'string') return [];
  const found = [];
  const stack = [];
  let line = 1;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '\n') line += 1;
    else if (ch === '{') stack.push({ object: true, keys: new Set(), expectKey: true });
    else if (ch === '[') stack.push({ object: false });
    else if (ch === '}' || ch === ']') stack.pop();
    else if (ch === ',' && stack.at(-1)?.object) stack.at(-1).expectKey = true;
    else if (ch === ':' && stack.at(-1)?.object) stack.at(-1).expectKey = false;
    else if (ch === '"') {
      let j = i + 1;
      let value = '';
      while (j < text.length && text[j] !== '"') {
        if (text[j] === '\\') {
          value += text[j + 1];
          j += 2;
        } else {
          value += text[j];
          j += 1;
        }
      }
      const top = stack.at(-1);
      if (top?.object && top.expectKey) {
        if (top.keys.has(value)) found.push(`"${value}" (line ${line})`);
        top.keys.add(value);
      }
      i = j;
    }
  }
  return found;
};

export const validateNoDuplicateKeys = (text) => {
  const found = findDuplicateKeys(text);
  return found.length
    ? [`repeated keys in the same object: ${found.join(', ')}. Only the last one is kept, merge them into one`]
    : [];
};

// ---------------------------------------------------------------------------
// Profile image
// ---------------------------------------------------------------------------

// Pages that are NOT images even though they are https URLs.
const PROFILE_PAGE_HOSTS = /^https:\/\/(www\.)?(instagram\.com|tiktok\.com|facebook\.com|x\.com|twitter\.com|linkedin\.com|youtube\.com|threads\.net|twitch\.tv|google\.com|drive\.google\.com)(\/|$)/i;
const GITHUB_PAGE = /^https:\/\/(www\.)?github\.com\/[A-Za-z0-9-]+\/?$/i;

/** Error message when the URL is a profile page instead of an image, else null. */
export const imageUrlProblem = (url) => {
  if (typeof url !== 'string') return null;
  const value = url.trim();
  if (GITHUB_PAGE.test(value)) {
    return `user.profileImage "${value}" is a GitHub page, not an image. Add ".png": ${value.replace(/\/$/, '')}.png`;
  }
  if (PROFILE_PAGE_HOSTS.test(value)) {
    return `user.profileImage "${value}" is a web page, not an image. Use a direct image link, e.g. https://github.com/<your-user>.png`;
  }
  return null;
};

// Two questions are "the same" when the text AND the options match. Generic
// prompts like "Choose the correct sentence" are fine with different options.
export const quizQuestionKey = (q) => {
  if (!isNonEmptyString(q?.question) || !Array.isArray(q.options)) return null;
  return JSON.stringify([normalize(q.question), q.options.filter(isNonEmptyString).map(normalize).sort()]);
};

export const isValidStudentCode = (code) => STUDENT_CODE_PATTERN.test(code);

export const validateUser = (user, { strict = false } = {}) => {
  const errors = [];
  if (!user || typeof user !== 'object') return ['"user" object is missing'];

  if (!isNonEmptyString(user.username)) errors.push('user.username must be a non-empty string');
  if (typeof user.profileImage !== 'string') errors.push('user.profileImage must be a string (an image URL)');
  if (!isNonEmptyString(user.socialLink)) errors.push('user.socialLink must be a non-empty string');

  const lowerNetwork = typeof user.socialNetwork === 'string' ? user.socialNetwork.trim().toLowerCase() : null;
  if (user.socialNetwork !== undefined && !SOCIAL_NETWORK_IDS.includes(user.socialNetwork) && SOCIAL_NETWORK_IDS.includes(lowerNetwork)) {
    errors.push(`user.socialNetwork "${user.socialNetwork}" must be written in lowercase: "${lowerNetwork}"`);
  } else if (user.socialNetwork !== undefined && !SOCIAL_NETWORK_IDS.includes(user.socialNetwork)) {
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
    } else if (imageUrlProblem(user.profileImage)) {
      errors.push(imageUrlProblem(user.profileImage));
    }
    if (isNonEmptyString(user.socialLink) && !isValidHandle(normalizeHandle(user.socialLink))) {
      errors.push('user.socialLink must be your handle, e.g. "@my_user" (letters, numbers, . _ -)');
    }
    if (isNonEmptyString(user.username) && user.username.length > 60) {
      errors.push('user.username is too long (max 60 characters)');
    }
    errors.push(...findUnknownKeys(user, USER_KEYS, 'user'));
  }
  return errors;
};

// Words that can legitimately repeat: "If I had had time", "I know that that is true".
const REPEATABLE_WORDS = ['had', 'that'];
const edgeWord = (text, side) => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const word = side === 'last' ? words.at(-1) : words[0];
  return word ? word.toLowerCase().replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, '') : '';
};

/**
 * Fills the blank with the answer and looks for a word repeated around it,
 * e.g. "It _____ have rained." + "must have" -> "must have have rained".
 * Only for questions with a single blank (_____).
 */
export const findRepeatedWordAtBlank = (text, answer, label = 'question') => {
  if (!isNonEmptyString(text) || !isNonEmptyString(answer)) return [];
  const parts = text.split(/_+/);
  if (parts.length !== 2) return [];
  const [before, after] = parts;
  const repeated = [
    [edgeWord(before, 'last'), edgeWord(answer, 'first')],
    [edgeWord(answer, 'last'), edgeWord(after, 'first')],
  ].find(([x, y]) => x && x === y && !REPEATABLE_WORDS.includes(x));
  if (!repeated) return [];
  const filled = `${before}${answer.trim()}${after}`.replace(/\s+/g, ' ').trim();
  return [
    `${label}: with the answer the sentence reads "${filled}" ("${repeated[0]} ${repeated[0]}"). Remove "${repeated[0]}" from the answer or from the sentence`,
  ];
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
  else errors.push(...findRepeatedWordAtBlank(text, answer, label));

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
  if (strict) errors.push(...findUnknownKeys(info, TOP_LEVEL_KEYS.quiz, 'info.json'));

  if (!Array.isArray(info.topics) || info.topics.length === 0) {
    return [...errors, '"topics" must be a non-empty array'];
  }

  info.topics.forEach((topic, t) => {
    if (!isNonEmptyString(topic?.topic)) errors.push(`topics[${t}].topic must be a non-empty string`);
    if (strict) errors.push(...findUnknownKeys(topic, ['topic', 'questions'], `topics[${t}]`));
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
    const key = quizQuestionKey(q);
    if (seen.has(key)) errors.push(`duplicate question inside the file: "${q.question}"`);
    seen.add(key);
  });

  return errors;
};

export const validateVocabularyInfo = (info, { strict = false } = {}) => {
  if (!info || typeof info !== 'object') return ['info.json must contain a JSON object'];
  const errors = [...validateUser(info.user, { strict })];
  if (strict) errors.push(...findUnknownKeys(info, TOP_LEVEL_KEYS.vocabulary, 'info.json'));

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
    if (strict) errors.push(...findUnknownKeys(word, ['id', 'en', 'es'], `words[${i}]`));
    if (strict && isNonEmptyString(word.en)) {
      if (english.has(normalize(word.en))) errors.push(`words[${i}].en "${word.en}" is repeated`);
      english.add(normalize(word.en));
    }
  });
  if (strict) errors.push(...findPlaceholders(info));
  return errors;
};

/**
 * Checks the student folders of a section: names must be student codes and
 * each folder needs an info.json. (index.json files are generated, see
 * src/validation/contentIndex.js.)
 * folders: [{ name, hasInfo }]
 */
export const validateStudentFolders = (folders = []) =>
  folders.flatMap(({ name, hasInfo }) => [
    ...(isValidStudentCode(name) ? [] : [`folder "${name}" must be a student code like 1234567-1234`]),
    ...(hasInfo ? [] : [`folder "${name}" has no info.json`]),
  ]);

/**
 * Finds items repeated across different students of the same topic.
 * entries: [{ studentCode, info }]
 * By default it compares quiz questions; games pass their own listItems /
 * itemKey / itemLabel (see src/config/contentTypes.js).
 */
export const findCrossDuplicates = (
  entries,
  { listItems = listQuestions, itemKey = quizQuestionKey, itemLabel = (q) => q.question } = {},
) => {
  const owners = new Map();
  const errors = [];
  entries.forEach(({ studentCode, info }) => {
    listItems(info).forEach((item) => {
      const key = itemKey(item);
      if (!key) return;
      const owner = owners.get(key);
      if (owner && owner !== studentCode) {
        errors.push(`"${itemLabel(item)}" from ${studentCode} already exists in ${owner}`);
      } else {
        owners.set(key, studentCode);
      }
    });
  });
  return errors;
};

// ---------------------------------------------------------------------------
// Sentence Builder: { user, sentences: [{ sentence, hint? }] }
// ---------------------------------------------------------------------------

export const listSentences = (info) => (Array.isArray(info?.sentences) ? info.sentences : []);
export const sentenceKey = (item) => (isNonEmptyString(item?.sentence) ? normalize(item.sentence) : null);

const checkSentenceShape = (sentence, label, errors) => {
  if (!/^[A-Z0-9"'¿¡]/.test(sentence.trim())) errors.push(`${label}: start the sentence with a capital letter`);
  if (!/[.?!]["']?$/.test(sentence.trim())) errors.push(`${label}: end the sentence with . ? or !`);
};

export const validateSentenceBuilderInfo = (info, { strict = false } = {}) => {
  if (!info || typeof info !== 'object') return ['info.json must contain a JSON object'];
  const errors = [...validateUser(info.user, { strict })];
  if (strict) errors.push(...findUnknownKeys(info, TOP_LEVEL_KEYS['sentence-builder'], 'info.json'));
  if (!Array.isArray(info.sentences) || info.sentences.length === 0) {
    return [...errors, '"sentences" must be a non-empty array'];
  }

  const seen = new Set();
  info.sentences.forEach((item, i) => {
    const label = `sentences[${i}]`;
    if (!item || typeof item !== 'object') {
      errors.push(`${label} must be an object`);
      return;
    }
    if (!isNonEmptyString(item.sentence)) {
      errors.push(`${label}.sentence must be a non-empty string`);
      return;
    }
    const words = tokenize(item.sentence).length;
    if (words < SENTENCE_MIN_WORDS || words > SENTENCE_MAX_WORDS) {
      errors.push(`${label}: use between ${SENTENCE_MIN_WORDS} and ${SENTENCE_MAX_WORDS} words (found ${words})`);
    }
    if (item.hint !== undefined && !isNonEmptyString(item.hint)) errors.push(`${label}.hint must be a non-empty string`);
    if (strict) {
      checkSentenceShape(item.sentence, label, errors);
      if (item.sentence.length > MAX_TEXT_LENGTH) errors.push(`${label}: text longer than ${MAX_TEXT_LENGTH} characters`);
      const extra = Object.keys(item).filter((k) => !['sentence', 'hint'].includes(k));
      if (extra.length) errors.push(`${label}: unexpected keys ${extra.join(', ')}`);
    }
    const key = sentenceKey(item);
    if (seen.has(key)) errors.push(`duplicate sentence inside the file: "${item.sentence}"`);
    seen.add(key);
  });

  if (strict) {
    errors.push(...findPlaceholders(info));
    if (info.sentences.length < STRICT_MIN_QUESTIONS) {
      errors.push(`add at least ${STRICT_MIN_QUESTIONS} sentences (found ${info.sentences.length})`);
    }
  }
  return errors;
};

// ---------------------------------------------------------------------------
// Error Hunter: { user, errors: [{ sentence, wrong, correct, explanation }] }
// ---------------------------------------------------------------------------

export const listErrorItems = (info) => (Array.isArray(info?.errors) ? info.errors : []);
export const errorItemKey = (item) =>
  isNonEmptyString(item?.sentence) ? normalize(item.sentence) : null;

export const validateErrorHunterInfo = (info, { strict = false } = {}) => {
  if (!info || typeof info !== 'object') return ['info.json must contain a JSON object'];
  const errors = [...validateUser(info.user, { strict })];
  if (strict) errors.push(...findUnknownKeys(info, TOP_LEVEL_KEYS['error-hunter'], 'info.json'));
  if (!Array.isArray(info.errors) || info.errors.length === 0) {
    return [...errors, '"errors" must be a non-empty array'];
  }

  const seen = new Set();
  info.errors.forEach((item, i) => {
    const label = `errors[${i}]`;
    if (!item || typeof item !== 'object') {
      errors.push(`${label} must be an object`);
      return;
    }
    ['sentence', 'wrong', 'correct', 'explanation'].forEach((field) => {
      if (!isNonEmptyString(item[field])) errors.push(`${label}.${field} must be a non-empty string`);
    });
    if (!isNonEmptyString(item.sentence) || !isNonEmptyString(item.wrong)) return;

    const words = tokenize(item.sentence).length;
    if (words < ERROR_SENTENCE_MIN_WORDS || words > ERROR_SENTENCE_MAX_WORDS) {
      errors.push(`${label}: use between ${ERROR_SENTENCE_MIN_WORDS} and ${ERROR_SENTENCE_MAX_WORDS} words (found ${words})`);
    }
    const matches = findSpans(item.sentence, item.wrong).length;
    if (matches === 0) errors.push(`${label}: "${item.wrong}" must appear in the sentence as whole word(s)`);
    if (matches > 1) errors.push(`${label}: "${item.wrong}" appears ${matches} times; the mistake must be unique`);
    if (isNonEmptyString(item.correct) && normalize(item.correct) === normalize(item.wrong)) {
      errors.push(`${label}: "correct" must be different from "wrong"`);
    }
    if (strict) {
      checkSentenceShape(item.sentence, label, errors);
      [item.sentence, item.explanation].filter(isNonEmptyString).forEach((value) => {
        if (value.length > MAX_TEXT_LENGTH) errors.push(`${label}: text longer than ${MAX_TEXT_LENGTH} characters`);
      });
      const extra = Object.keys(item).filter((k) => !['sentence', 'wrong', 'correct', 'explanation'].includes(k));
      if (extra.length) errors.push(`${label}: unexpected keys ${extra.join(', ')}`);
    }
    const key = errorItemKey(item);
    if (seen.has(key)) errors.push(`duplicate sentence inside the file: "${item.sentence}"`);
    seen.add(key);
  });

  if (strict) {
    errors.push(...findPlaceholders(info));
    if (info.errors.length < STRICT_MIN_QUESTIONS) {
      errors.push(`add at least ${STRICT_MIN_QUESTIONS} sentences (found ${info.errors.length})`);
    }
  }
  return errors;
};

// ---------------------------------------------------------------------------
// Rules that need to know WHERE the file lives (folder / other students)
// ---------------------------------------------------------------------------

const compact = (text) => (typeof text === 'string' ? text.toLowerCase().replace(/[^a-z0-9]/g, '') : '');

/**
 * Strict: each quiz `topics[].topic` must name the folder the file is in
 * ("second conditional" in public/secondconditional). The mixed "data" topic
 * accepts any name.
 */
export const validateTopicNames = (info, topic) => {
  if (!topic || topic.type !== 'quiz' || topic.id === 'data' || !Array.isArray(info?.topics)) return [];
  const accepted = [topic.id, topic.folder, topic.title, topic.path].map(compact);
  return info.topics.flatMap((t, i) =>
    isNonEmptyString(t?.topic) && !accepted.includes(compact(t.topic))
      ? [`topics[${i}].topic is "${t.topic}" but the file is in public/${topic.folder}. Use "${topic.title.toLowerCase()}"`]
      : [],
  );
};

/** A vocabulary puzzle is "the same" when it has the same 4 English words. */
export const puzzleKey = (info) => {
  const words = (Array.isArray(info?.words) ? info.words : []).filter((w) => isNonEmptyString(w?.en));
  return words.length ? JSON.stringify(words.map((w) => normalize(w.en)).sort()) : null;
};

export const CATEGORY_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const isValidCategoryName = (name) => CATEGORY_NAME_PATTERN.test(name);

/**
 * The same student code must show the same name everywhere.
 * entries: [{ studentCode, info, where }] -> error strings
 */
export const findProfileConflicts = (entries) => {
  const byCode = new Map();
  entries.forEach(({ studentCode, info, where }) => {
    const name = info?.user?.username;
    if (!isNonEmptyString(name)) return;
    if (!byCode.has(studentCode)) byCode.set(studentCode, []);
    byCode.get(studentCode).push({ name: name.trim(), key: normalize(name), where });
  });
  const errors = [];
  byCode.forEach((list, code) => {
    const names = [...new Set(list.map((x) => x.key))];
    if (names.length > 1) {
      const detail = list.map((x) => `"${x.name}" in ${x.where}`).join(', ');
      errors.push(`student ${code} uses different names: ${detail}. Use the same username in every file`);
    }
  });
  return errors;
};
