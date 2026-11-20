// @vitest-environment node
// Validates ALL student content under /public with the legacy rules.
// Sections are discovered automatically from src/config/topics.js and
// public/vocabulary/index.json, and each one is checked with the rules of its
// content type (src/config/contentTypes.js): no need to edit this file when
// adding topics or games.
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { findCrossDuplicates, validateIndex } from '../../validation/contentRules.js';
import { getContentType } from '../../config/contentTypes.js';
import { listContentSections, listSubfolders, readJson } from '../../validation/contentFiles.js';

// Show every problem at once with a readable message instead of a bare boolean.
const expectNoErrors = (errors) => expect(errors, `\n  - ${errors.join('\n  - ')}\n`).toEqual([]);

describe.each(listContentSections().map((s) => [s.title, s.name, s]))('%s (public/%s)', (_t, _n, { type, dir }) => {
  const contentType = getContentType(type);
  const index = readJson(path.join(dir, 'index.json'));
  const studentFolders = listSubfolders(dir);
  const entries = studentFolders.map((studentCode) => ({
    studentCode,
    ...readJson(path.join(dir, studentCode, 'info.json')),
  }));

  test('index.json is valid and matches the student folders', () => {
    expectNoErrors(index.error ? [index.error] : validateIndex(index.data, studentFolders));
  });

  test.each(entries.map((e) => [e.studentCode, e]))('%s/info.json follows the rules', (_, entry) => {
    if (entry.error) expectNoErrors([entry.error]);
    expectNoErrors(contentType.validate(entry.data));
  });

  if (type !== 'vocabulary') {
    test('nothing is copied from another student', () => {
      const valid = entries.filter((e) => e.data).map((e) => ({ studentCode: e.studentCode, info: e.data }));
      expectNoErrors(findCrossDuplicates(valid, contentType));
    });
  }
});
