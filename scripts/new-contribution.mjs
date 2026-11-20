#!/usr/bin/env node
// Creates your contribution folder with a starter info.json, so you only
// have to edit it. (index.json files are generated automatically.)
//
//   npm run contribute -- --topic verbs --code 2212345-3743
//   npm run contribute -- --vocabulary animals --code 2212345-3743

import fs from 'node:fs';
import path from 'node:path';
import { QUIZ_TOPICS } from '../src/config/topics.js';
import { isValidStudentCode } from '../src/validation/contentRules.js';
import { PUBLIC_DIR, VOCABULARY_DIR, listVocabularyCategories } from '../src/validation/contentFiles.js';
import { buildInfoTemplate } from '../src/helpers/contributionTemplate.js';

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const fail = (message) => {
  console.error(`❌ ${message}`);
  process.exit(1);
};

const code = arg('--code');
const topicId = arg('--topic');
const category = arg('--vocabulary');

if (!code || !isValidStudentCode(code)) fail('Use --code with your student code, e.g. --code 2212345-3743');
if (!topicId === !category) fail('Use either --topic <id> or --vocabulary <category>');

let sectionDir;
if (topicId) {
  const topic = QUIZ_TOPICS.find((t) => t.id === topicId || t.folder === topicId);
  if (!topic) fail(`Unknown topic "${topicId}". Options: ${QUIZ_TOPICS.map((t) => t.id).join(', ')}`);
  sectionDir = path.join(PUBLIC_DIR, topic.folder);
} else {
  const categories = listVocabularyCategories();
  if (!categories.includes(category)) fail(`Unknown category "${category}". Options: ${categories.join(', ')}`);
  sectionDir = path.join(VOCABULARY_DIR, category);
}

const studentDir = path.join(sectionDir, code);
const infoPath = path.join(studentDir, 'info.json');
if (fs.existsSync(infoPath)) fail(`${path.relative(process.cwd(), infoPath)} already exists`);

const template = buildInfoTemplate({
  kind: category ? 'vocabulary' : 'quiz',
  topic: topicId || category,
  username: 'Your Name',
  studentCode: code,
  profileImage: 'https://github.com/your-github-user.png',
  socialNetwork: 'instagram',
  socialLink: 'your_user',
});

fs.mkdirSync(studentDir, { recursive: true });
fs.writeFileSync(infoPath, `${JSON.stringify(template, null, 2)}\n`);

console.log(`✅ Created ${path.relative(process.cwd(), infoPath)}.
Next steps:
  1. Edit the file: your name, image, favorite social network and questions.
  2. npm test && npm run check:contribution
  3. Commit, push and open your pull request.`);
