// Node-only helpers to read content from /public. Never import from the app.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { QUIZ_TOPICS } from '../config/topics.js';
import { parseInfoText } from './jsonText.js';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PUBLIC_DIR = path.join(REPO_ROOT, 'public');
export const VOCABULARY_DIR = path.join(PUBLIC_DIR, 'vocabulary');

/** Parses JSON and returns { data, text } or { error } with a readable message. */
export const readJson = (filePath) => {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    const reason = error.code === 'ENOENT' ? 'file not found' : error.message;
    return { error: `${path.relative(REPO_ROOT, filePath)}: ${reason}` };
  }
  const result = parseInfoText(raw);
  return result.error ? { error: `${path.relative(REPO_ROOT, filePath)}: ${result.error}` } : result;
};

/** Every file inside `dir` (recursive), as paths relative to `dir`. */
export const listFilesRecursive = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory()
      ? listFilesRecursive(full).map((f) => path.join(entry.name, f))
      : [entry.name];
  });
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

export const listVocabularyCategories = () => listSubfolders(VOCABULARY_DIR).sort();
