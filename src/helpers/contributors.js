import { resolveSocialProfile } from '../config/socialNetworks.js';
import { getContentType } from '../config/contentTypes.js';

const isSafeImageUrl = (value) =>
  typeof value === 'string' && /^https:\/\/[^\s"'<>]+$/i.test(value.trim());

/**
 * Turns the `user` block of an info.json plus the folder name (the student
 * code) into the object every UI component uses to credit a student.
 */
export const toContributor = (user = {}, studentCode = '') => {
  const social = resolveSocialProfile(user.socialNetwork, user.socialLink);
  return {
    name: (user.username || '').trim() || 'Anonymous student',
    code: studentCode,
    profileImage: isSafeImageUrl(user.profileImage) ? user.profileImage.trim() : null,
    social,
  };
};

/**
 * Flattens the student entries of a topic into a list of playable items
 * (questions, sentences…), each one carrying the contributor who wrote it.
 * type: 'quiz' | 'sentence-builder' | 'error-hunter' (see contentTypes.js)
 */
export const extractItemsWithContributor = (entries = [], type = 'quiz') => {
  const { listItems } = getContentType(type);
  return entries.flatMap((entry) => {
    const contributor = toContributor(entry.user, entry.studentCode);
    return listItems(entry).map((item) => ({ ...item, contributor }));
  });
};

/** Quiz questions with their author (kept for readability in quiz code). */
export const extractQuestionsWithContributor = (entries = []) => extractItemsWithContributor(entries, 'quiz');

/**
 * Aggregates every student across quiz topics and vocabulary puzzles.
 * quizData:       { [topicId]: entries[] }
 * vocabularyData: { [category]: entries[] }
 */
export const buildContributorDirectory = (quizData = {}, vocabularyData = {}, topics = []) => {
  const byCode = new Map();

  const add = (entry, label, questionCount) => {
    const key = entry.studentCode || entry.user?.username || 'unknown';
    if (!byCode.has(key)) {
      byCode.set(key, { ...toContributor(entry.user, entry.studentCode), topics: [], questions: 0 });
    }
    const record = byCode.get(key);
    if (!record.topics.includes(label)) record.topics.push(label);
    record.questions += questionCount;
  };

  Object.entries(quizData).forEach(([topicId, entries]) => {
    const topic = topics.find((t) => t.id === topicId);
    const { listItems } = getContentType(topic?.type);
    (entries || []).forEach((entry) => add(entry, topic?.title || topicId, listItems(entry).length));
  });

  Object.entries(vocabularyData).forEach(([category, entries]) => {
    (entries || []).forEach((entry) => add(entry, `Puzzle: ${category}`, entry.words?.length || 0));
  });

  return [...byCode.values()].sort(
    (a, b) => b.questions - a.questions || a.name.localeCompare(b.name),
  );
};
