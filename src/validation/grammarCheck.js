// Node-only. Grammar and spelling hints for student content, using Harper
// (https://writewithharper.com), a grammar checker that runs offline.
//
// These are WARNINGS, never errors: automatic checkers make mistakes, and many
// quiz options are wrong on purpose. What is checked is the text a player
// reads when they answer correctly:
//   - quiz: the question with the blank filled with the answer
//   - sentence builder: the sentence
//   - error hunter: the corrected sentence and the explanation
//   - vocabulary: the English words
import { getContentType } from '../config/contentTypes.js';
import { applyCorrection } from '../games/sentenceTools.js';

// Questions whose answer is wrong on purpose ("Which sentence is NOT correct?").
const ASKS_FOR_A_MISTAKE = /\b(not correct|incorrect\w*|errors?|mistakes?|wrong\w*|misus\w*|misplac\w*|awkward\w*|not an?)\b/i;
// Options that are whole sentences (checked on their own).
const IS_SENTENCE = /^[A-Z].*\s.*[.?!]$/;

const fillBlank = (question, answer) => question.replace(/_+(\s*_+)*/, answer.trim());

/** Texts a player reads when answering correctly: [{ label, text }]. */
export const textsToCheck = (type, info) => {
  const items = getContentType(type).listItems(info);
  if (type === 'quiz') {
    return items.flatMap((q, i) => {
      if (typeof q?.question !== 'string' || typeof q?.answer !== 'string') return [];
      const label = `question ${i + 1}`;
      const blanks = q.question.match(/_+/g) || [];
      if (blanks.length === 1 && !q.answer.includes('/')) return [{ label, text: fillBlank(q.question, q.answer) }];
      // "Identify the error in: '...'" shows a wrong sentence on purpose.
      const texts = ASKS_FOR_A_MISTAKE.test(q.question) ? [] : [{ label, text: q.question }];
      if (IS_SENTENCE.test(q.answer.trim()) && !ASKS_FOR_A_MISTAKE.test(q.question)) {
        texts.push({ label: `${label} (answer)`, text: q.answer });
      }
      return texts;
    });
  }
  if (type === 'sentence-builder') {
    return items.flatMap((s, i) => (typeof s?.sentence === 'string' ? [{ label: `sentence ${i + 1}`, text: s.sentence }] : []));
  }
  if (type === 'error-hunter') {
    return items.flatMap((e, i) =>
      typeof e?.sentence === 'string' && typeof e?.wrong === 'string' && typeof e?.correct === 'string'
        ? [
            { label: `sentence ${i + 1} (corrected)`, text: applyCorrection(e.sentence, e.wrong, e.correct) },
            ...(typeof e.explanation === 'string' ? [{ label: `sentence ${i + 1} (explanation)`, text: e.explanation }] : []),
          ]
        : [],
    );
  }
  if (type === 'vocabulary') {
    return items.flatMap((w, i) => (typeof w?.en === 'string' ? [{ label: `word ${i + 1}`, text: w.en }] : []));
  }
  return [];
};

// Lint kinds that are mostly noise for short quiz texts.
const IGNORED_KINDS = new Set(['Style', 'Readability', 'Enhancement', 'Regionalism']);
// Rules that fire on things that are fine in a quiz, e.g. a sentence that
// starts with the blank or quotes a single word.
const IGNORED_MESSAGES = [
  /does not start with a capital letter/i,
  /ellipsis character/i,
  /closed compound/i, // "call us" -> "callus", "sun sets" -> "sunsets"
  /possessive pronoun .its/i, // flags "it's Sunday"
];
// "If I had had time" and "that that" are correct.
const IGNORED_PROBLEMS = new Set(['had had', 'that that', ]);

/**
 * True for spelling hints that are not about English: a word in quotes
 * ('biblioteca'), a capitalized name in the middle of a sentence (Deku,
 * Bernabéu) or a word with accents.
 */
const isForeignOrName = (lint, text) => {
  if (lint.lint_kind() !== 'Spelling') return false;
  const word = lint.get_problem_text();
  const { start } = lint.span();
  const quoted = new RegExp(`'[^']*\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[^']*'`).test(text);
  return quoted || /[^\p{ASCII}]/u.test(word) || (start > 0 && /^[A-Z]/.test(word));
};

let linterPromise = null;

/** Loads Harper once. Returns null when harper.js is not installed. */
export const loadLinter = () => {
  linterPromise ||= (async () => {
    try {
      const { LocalLinter, Dialect } = await import('harper.js');
      const { binaryInlined } = await import('harper.js/binaryInlined');
      const linter = new LocalLinter({ binary: binaryInlined, dialect: Dialect.American });
      await linter.setup();
      return linter;
    } catch {
      return null;
    }
  })();
  return linterPromise;
};

const describe = (lint) => {
  const suggestions = lint
    .suggestions()
    .map((s) => s.get_replacement_text())
    .filter(Boolean)
    .slice(0, 3);
  const fix = suggestions.length ? ` (suggestion: ${suggestions.map((s) => `"${s}"`).join(' or ')})` : '';
  return `"${lint.get_problem_text()}": ${lint.message().replace(/`/g, '"')}${fix}`;
};

/**
 * Lints a list of texts. Returns [{ label, text, problems: [string] }] for
 * the texts with problems, or null when Harper is not available.
 */
export const lintTexts = async (texts, { linter } = {}) => {
  const harper = linter || (await loadLinter());
  if (!harper) return null;
  const results = [];
  for (const { label, text } of texts) {
    const lints = (await harper.lint(text, { language: 'plaintext' })).filter(
      (l) =>
        !IGNORED_KINDS.has(l.lint_kind()) &&
        !IGNORED_MESSAGES.some((re) => re.test(l.message())) &&
        !IGNORED_PROBLEMS.has(l.get_problem_text().toLowerCase()) &&
        !isForeignOrName(l, text) &&
        // "functions as a(n)..." is written that way on purpose.
        !(/indefinite article/i.test(l.message()) && /\ban?\(n\)/i.test(text)),
    );
    if (lints.length) results.push({ label, text, problems: lints.map(describe) });
  }
  return results;
};

/** Warning lines for one info.json, skipping texts that were already in `baseInfo`. */
export const grammarWarnings = async (type, info, { baseInfo, linter } = {}) => {
  const old = new Set(baseInfo ? textsToCheck(type, baseInfo).map((t) => t.text) : []);
  const results = await lintTexts(
    textsToCheck(type, info).filter((t) => !old.has(t.text)),
    { linter },
  );
  if (!results) return null;
  return results.flatMap(({ label, text, problems }) =>
    problems.map((p) => `grammar hint, ${label}: "${text}" → ${p}`),
  );
};
