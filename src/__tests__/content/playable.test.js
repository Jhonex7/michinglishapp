// @vitest-environment node
// Every item in public/ must be playable in its game, not only well formed:
// the right answer is reachable, the correction changes the sentence, the
// memory cards can be told apart.
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { getContentType } from '../../config/contentTypes.js';
import { applyCorrection, errorTokenIndexes, isSameSentence, tokenize } from '../../games/sentenceTools.js';
import { listContentSections, listSubfolders, readJson } from '../../validation/contentFiles.js';

const expectNoErrors = (errors) => expect(errors, `\n  - ${errors.join('\n  - ')}\n`).toEqual([]);

const PLAY_RULES = {
  quiz: (q) => [
    ...(q.options.filter((o) => o === q.answer).length === 1 ? [] : [`"${q.question}": exactly one option must be the answer`]),
  ],
  'sentence-builder': (item) => {
    const words = tokenize(item.sentence);
    return [
      ...(isSameSentence(words, item.sentence) ? [] : [`"${item.sentence}": picking the words in order must win`]),
      ...(new Set(words).size > 1 ? [] : [`"${item.sentence}": needs different words to shuffle`]),
    ];
  },
  'error-hunter': (item) => {
    const fixed = applyCorrection(item.sentence, item.wrong, item.correct);
    return [
      ...(errorTokenIndexes(item.sentence, item.wrong).size === tokenize(item.wrong).length
        ? []
        : [`"${item.sentence}": the mistake "${item.wrong}" cannot be tapped`]),
      ...(fixed !== item.sentence ? [] : [`"${item.sentence}": the correction does not change the sentence`]),
    ];
  },
  vocabulary: (word, all) => {
    const same = all.filter((w) => w.es.trim().toLowerCase() === word.es.trim().toLowerCase());
    return same.length === 1 ? [] : [`"${word.es}" appears twice: the memory cards cannot be told apart`];
  },
};

describe.each(listContentSections().map((s) => [s.name, s]))('public/%s is playable', (_n, { type, dir }) => {
  const contentType = getContentType(type);
  test('every item can be played and won', () => {
    const errors = listSubfolders(dir).flatMap((code) => {
      const { data } = readJson(path.join(dir, code, 'info.json'));
      if (!data) return [];
      const items = contentType.listItems(data);
      return items.flatMap((item) => PLAY_RULES[type](item, items).map((e) => `${code}: ${e}`));
    });
    expectNoErrors(errors);
  });
});
