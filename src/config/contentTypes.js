// Every kind of activity a student can contribute, and everything the app,
// the tests and the PR pipeline need to know about it.
//
// To add a new kind of game:
//   1. Add an entry here (validate, listItems, itemKey, itemLabel, template).
//   2. Create its React component and register it in src/pages/ActivityPage.jsx.
//   3. Add a topic with that `type` in src/config/topics.js.
//
// Keep this file free of React imports: Node scripts use it too.

import {
  errorItemKey,
  listErrorItems,
  listQuestions,
  listSentences,
  quizQuestionKey,
  sentenceKey,
  validateErrorHunterInfo,
  validateQuizInfo,
  validateSentenceBuilderInfo,
  validateVocabularyInfo,
} from '../validation/contentRules.js';

export const CONTENT_TYPES = {
  quiz: {
    label: 'Quiz questions',
    itemName: 'questions',
    validate: validateQuizInfo,
    listItems: listQuestions,
    itemKey: quizQuestionKey,
    itemLabel: (q) => q.question,
    template: (topicTitle) => ({
      topics: [
        {
          topic: topicTitle.toLowerCase(),
          questions: [
            {
              question: 'Write your question here. Use _____ for the blank.',
              options: ['option A', 'option B', 'option C', 'option D'],
              answer: 'option A',
            },
          ],
        },
      ],
    }),
  },
  'sentence-builder': {
    label: 'Sentence Builder',
    itemName: 'sentences',
    validate: validateSentenceBuilderInfo,
    listItems: listSentences,
    itemKey: sentenceKey,
    itemLabel: (item) => item.sentence,
    template: () => ({
      sentences: [
        { sentence: 'Write your sentence here.', hint: 'Optional: a short clue (tense, topic…)' },
      ],
    }),
  },
  'error-hunter': {
    label: 'Error Hunter',
    itemName: 'sentences',
    validate: validateErrorHunterInfo,
    listItems: listErrorItems,
    itemKey: errorItemKey,
    itemLabel: (item) => item.sentence,
    template: () => ({
      errors: [
        {
          sentence: 'Write your wrong sentence here.',
          wrong: 'wrong',
          correct: 'right',
          explanation: 'Explain the mistake in one short sentence.',
        },
      ],
    }),
  },
  vocabulary: {
    label: 'Vocabulary puzzle',
    itemName: 'pairs',
    validate: validateVocabularyInfo,
    listItems: (info) => (Array.isArray(info?.words) ? info.words : []),
    itemKey: () => null,
    itemLabel: (w) => w.en,
    template: () => ({
      words: [
        { id: 1, en: 'english word 1', es: 'palabra 1' },
        { id: 2, en: 'english word 2', es: 'palabra 2' },
        { id: 3, en: 'english word 3', es: 'palabra 3' },
        { id: 4, en: 'english word 4', es: 'palabra 4' },
      ],
    }),
  },
};

export const getContentType = (type) => CONTENT_TYPES[type] || CONTENT_TYPES.quiz;

/** Guesses the content type of a pasted info.json from its keys. */
export const detectContentType = (info) => {
  if (Array.isArray(info?.words)) return 'vocabulary';
  if (Array.isArray(info?.sentences)) return 'sentence-builder';
  if (Array.isArray(info?.errors)) return 'error-hunter';
  return 'quiz';
};

export const countItems = (type, info) => getContentType(type).listItems(info).length;
