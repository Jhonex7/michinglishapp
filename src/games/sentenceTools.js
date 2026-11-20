// Pure helpers shared by the Sentence Builder / Error Hunter games, the
// validation rules and the PR pipeline. No React imports here.

/** Splits a sentence into the tokens shown on screen ("coffee." keeps its dot). */
export const tokenize = (sentence) =>
  typeof sentence === 'string' ? sentence.trim().split(/\s+/).filter(Boolean) : [];

/** Lower-case word without surrounding punctuation ("Coffee." -> "coffee"). */
export const cleanWord = (token) =>
  token.toLowerCase().replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, '');

/**
 * Finds where `wrong` (one or more words) appears in `sentence`, comparing
 * words without punctuation or case. Returns the start index of each match.
 */
export const findSpans = (sentence, wrong) => {
  const tokens = tokenize(sentence).map(cleanWord);
  const target = tokenize(wrong).map(cleanWord);
  if (!target.length || target.some((w) => !w)) return [];
  const starts = [];
  for (let i = 0; i + target.length <= tokens.length; i += 1) {
    if (target.every((word, j) => tokens[i + j] === word)) starts.push(i);
  }
  return starts;
};

/** Token indexes that belong to the mistake, e.g. new Set([1]) for "don't". */
export const errorTokenIndexes = (sentence, wrong) => {
  const [start] = findSpans(sentence, wrong);
  if (start === undefined) return new Set();
  return new Set(tokenize(wrong).map((_, j) => start + j));
};

/**
 * Builds the corrected sentence, keeping the punctuation around the mistake:
 * ("He goed home.", "goed", "went") -> "He went home."
 */
export const applyCorrection = (sentence, wrong, correct) => {
  const tokens = tokenize(sentence);
  const [start] = findSpans(sentence, wrong);
  if (start === undefined) return sentence;
  const end = start + tokenize(wrong).length - 1;
  const prefix = tokens[start].match(/^[^\p{L}\p{N}']*/u)[0];
  const suffix = tokens[end].match(/[^\p{L}\p{N}']*$/u)[0];
  return [...tokens.slice(0, start), `${prefix}${correct.trim()}${suffix}`, ...tokens.slice(end + 1)].join(' ');
};

/** True when the tokens picked by the player rebuild the original sentence. */
export const isSameSentence = (pickedTokens, sentence) => pickedTokens.join(' ') === tokenize(sentence).join(' ');
