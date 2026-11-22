// @vitest-environment node
// Checks the SHAPE of public/: every folder and file must be where the app
// looks for it. A file in the wrong place is never loaded, so the student's
// work silently disappears.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { QUIZ_TOPICS } from '../../config/topics.js';
import { findProfileConflicts, isValidCategoryName } from '../../validation/contentRules.js';
import {
  PUBLIC_DIR,
  VOCABULARY_DIR,
  listContentSections,
  listFilesRecursive,
  listSubfolders,
  readJson,
} from '../../validation/contentFiles.js';

const expectNoErrors = (errors) => expect(errors, `\n  - ${errors.join('\n  - ')}\n`).toEqual([]);
const ROOT_FILE = /\.(png|ico|svg|webp|jpg|jpeg|webmanifest|txt|xml)$/i;

describe('public/ structure', () => {
  test('every folder in public/ is a registered topic or vocabulary', () => {
    const known = new Set([...QUIZ_TOPICS.map((t) => t.folder), 'vocabulary']);
    const unknown = listSubfolders(PUBLIC_DIR).filter((name) => !known.has(name));
    expectNoErrors(unknown.map((name) => `public/${name} is not a topic: add it to src/config/topics.js or move the files`));
  });

  test('files in the root of public/ are only icons and images', () => {
    const files = fs.readdirSync(PUBLIC_DIR).filter((f) => fs.statSync(path.join(PUBLIC_DIR, f)).isFile());
    expectNoErrors(files.filter((f) => !ROOT_FILE.test(f)).map((f) => `public/${f} does not belong here`));
  });

  test('topic and category folders only contain student folders', () => {
    const errors = listContentSections().flatMap(({ dir }) =>
      fs.existsSync(dir)
        ? fs
            .readdirSync(dir)
            .filter((f) => !fs.statSync(path.join(dir, f)).isDirectory())
            .map((f) => `${path.relative(PUBLIC_DIR, path.join(dir, f))}: move it into your student-code folder`)
        : [],
    );
    expectNoErrors(errors);
  });

  test('student folders only contain info.json', () => {
    const errors = listContentSections().flatMap(({ dir }) =>
      listSubfolders(dir).flatMap((code) =>
        listFilesRecursive(path.join(dir, code))
          .filter((f) => f !== 'info.json')
          .map((f) => `${path.relative(PUBLIC_DIR, path.join(dir, code, f))}: only info.json is allowed`),
      ),
    );
    expectNoErrors(errors);
  });

  test('vocabulary categories have valid names and at least one puzzle', () => {
    const categories = listSubfolders(VOCABULARY_DIR);
    expect(categories.length).toBeGreaterThan(0);
    expectNoErrors(
      categories.flatMap((c) => [
        ...(isValidCategoryName(c) ? [] : [`vocabulary/${c}: use lowercase letters, numbers and dashes`]),
        ...(listSubfolders(path.join(VOCABULARY_DIR, c)).length ? [] : [`vocabulary/${c} is empty`]),
      ]),
    );
  });
});

describe('student identity', () => {
  test('a student code has the same name in every file', () => {
    const entries = listContentSections().flatMap(({ dir, name }) =>
      listSubfolders(dir).map((code) => ({
        studentCode: code,
        info: readJson(path.join(dir, code, 'info.json')).data,
        where: name,
      })),
    );
    expectNoErrors(findProfileConflicts(entries));
  });
});
