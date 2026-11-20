// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { buildContentIndexes } from '../../validation/contentIndex.js';
import { QUIZ_TOPICS } from '../../config/topics.js';

describe('buildContentIndexes', () => {
  let dir;
  const addStudent = (...parts) => {
    fs.mkdirSync(path.join(dir, ...parts), { recursive: true });
    fs.writeFileSync(path.join(dir, ...parts, 'info.json'), '{}');
  };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'michi-'));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  test('lists student folders with an info.json, sorted, for every topic', () => {
    addStudent('verbs', '2222222-2222');
    addStudent('verbs', '1111111-1111');
    fs.mkdirSync(path.join(dir, 'verbs', 'empty-folder'));

    const indexes = buildContentIndexes(dir);
    expect(indexes['verbs/index.json']).toEqual({ folders: ['1111111-1111', '2222222-2222'] });
    // Topics without folders still get an (empty) index.
    QUIZ_TOPICS.forEach((t) => expect(indexes[`${t.folder}/index.json`]).toBeDefined());
    expect(indexes['adverbs/index.json']).toEqual({ folders: [] });
  });

  test('builds the vocabulary category list and one index per category', () => {
    addStudent('vocabulary', 'fruits', '1111111-1111');
    addStudent('vocabulary', 'animals', '2222222-2222');

    const indexes = buildContentIndexes(dir);
    expect(indexes['vocabulary/index.json']).toEqual({ folders: ['animals', 'fruits'] });
    expect(indexes['vocabulary/animals/index.json']).toEqual({ folders: ['2222222-2222'] });
  });

  test('matches the real public/ folder (every student is loaded)', () => {
    const indexes = buildContentIndexes();
    expect(indexes['secondconditional/index.json'].folders).toContain('1802038-5555');
    expect(indexes['vocabulary/index.json'].folders.length).toBeGreaterThan(5);
  });
});
