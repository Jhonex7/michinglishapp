import { resolveSocialProfile } from '../config/socialNetworks';

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
 * Flattens [{ studentCode, user, topics: [{ questions }] }] into a list of
 * questions, each one carrying the contributor who wrote it.
 */
export const extractQuestionsWithContributor = (entries = []) =>
  entries.flatMap(({ user, topics = [], studentCode }) => {
    const contributor = toContributor(user, studentCode);
    return topics.flatMap(({ questions = [] }) =>
      questions.map((question) => ({ ...question, contributor })),
    );
  });

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
    const label = topics.find((t) => t.id === topicId)?.title || topicId;
    (entries || []).forEach((entry) => {
      const count = (entry.topics || []).reduce((n, t) => n + (t.questions?.length || 0), 0);
      add(entry, label, count);
    });
  });

  Object.entries(vocabularyData).forEach(([category, entries]) => {
    (entries || []).forEach((entry) => add(entry, `Puzzle: ${category}`, entry.words?.length || 0));
  });

  return [...byCode.values()].sort(
    (a, b) => b.questions - a.questions || a.name.localeCompare(b.name),
  );
};
