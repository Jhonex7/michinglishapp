// Node-only helpers to read content from /public. Never import from the app.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { QUIZ_TOPICS } from '../config/topics.js';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PUBLIC_DIR = path.join(REPO_ROOT, 'public');
export const VOCABULARY_DIR = path.join(PUBLIC_DIR, 'vocabulary');

/** Parses JSON and returns { data } or { error } with a readable message. */
export const readJson = (filePath) => {
  try {
    return { data: JSON.parse(fs.readFileSync(filePath, 'utf8')) };
  } catch (error) {
    const reason = error.code === 'ENOENT' ? 'file not found' : `invalid JSON (${error.message})`;
    return { error: `${path.relative(REPO_ROOT, filePath)}: ${reason}` };
  }
};

export const listSubfolders = (dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((name) => fs.statSync(path.join(dir, name)).isDirectory())
    : [];

/** Every place that holds student folders, with the content type inside. */
export const listContentSections = () => [
  ...QUIZ_TOPICS.map((topic) => ({
    type: topic.type,
    name: topic.folder,
    title: topic.title,
    dir: path.join(PUBLIC_DIR, topic.folder),
  })),
  ...listVocabularyCategories().map((category) => ({
    type: 'vocabulary',
    name: `vocabulary/${category}`,
    title: `Vocabulary puzzle: ${category}`,
    dir: path.join(VOCABULARY_DIR, category),
  })),
];

export const listVocabularyCategories = () => {
  const { data } = readJson(path.join(VOCABULARY_DIR, 'index.json'));
  return Array.isArray(data?.folders) ? data.folders : [];
};
