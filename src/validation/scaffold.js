// Node-only. Creates a student's contribution folder with a starter
// info.json. Used by scripts/new-contribution.mjs (npm run contribute).
import fs from 'node:fs';
import path from 'node:path';
import { QUIZ_TOPICS } from '../config/topics.js';
import { buildInfoTemplate } from '../helpers/contributionTemplate.js';
import { isValidStudentCode } from './contentRules.js';
import { PUBLIC_DIR, listSubfolders } from './contentFiles.js';

/**
 * Returns { infoPath, template } on success or { error } with a message for
 * the student. Nothing is written when there is an error.
 */
export const createContribution = ({ code, topicId, category, publicDir = PUBLIC_DIR }) => {
  if (!code || !isValidStudentCode(code)) {
    return { error: 'Use --code with your student code, e.g. --code 2212345-3743' };
  }
  if (!topicId === !category) return { error: 'Use either --topic <id> or --vocabulary <category>' };

  let sectionDir;
  if (topicId) {
    const topic = QUIZ_TOPICS.find((t) => t.id === topicId || t.folder === topicId);
    if (!topic) return { error: `Unknown topic "${topicId}". Options: ${QUIZ_TOPICS.map((t) => t.id).join(', ')}` };
    sectionDir = path.join(publicDir, topic.folder);
  } else {
    const categories = listSubfolders(path.join(publicDir, 'vocabulary')).sort();
    if (!categories.includes(category)) {
      return { error: `Unknown category "${category}". Options: ${categories.join(', ')}` };
    }
    sectionDir = path.join(publicDir, 'vocabulary', category);
  }

  const infoPath = path.join(sectionDir, code, 'info.json');
  if (fs.existsSync(infoPath)) return { error: `${infoPath} already exists` };

  const template = buildInfoTemplate({
    kind: category ? 'vocabulary' : 'quiz',
    topic: topicId || category,
    username: 'Your Name',
    studentCode: code,
    profileImage: 'https://github.com/your-github-user.png',
    socialNetwork: 'instagram',
    socialLink: 'your_user',
  });

  fs.mkdirSync(path.dirname(infoPath), { recursive: true });
  fs.writeFileSync(infoPath, `${JSON.stringify(template, null, 2)}\n`);
  return { infoPath, template };
};
