// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { QUIZ_TOPICS, TOPIC_GROUPS } from '../../config/topics.js';
import { PUBLIC_DIR } from '../../validation/contentFiles.js';
import { CONTENT_TYPES } from '../../config/contentTypes.js';

describe('topic registry (src/config/topics.js)', () => {
  test.each(['id', 'folder', 'path'])('every topic has a unique %s', (key) => {
    const values = QUIZ_TOPICS.map((t) => t[key]);
    expect(new Set(values).size).toBe(values.length);
  });

  test.each(QUIZ_TOPICS.map((t) => [t.id, t]))('%s has all fields and a valid group', (_, topic) => {
    ['title', 'emoji', 'description', 'level'].forEach((key) => expect(topic[key]).toBeTruthy());
    expect(TOPIC_GROUPS.map((g) => g.id)).toContain(topic.group);
    expect(topic.path).toMatch(/^[a-z0-9_-]+$/);
    expect(Object.keys(CONTENT_TYPES)).toContain(topic.type);
    expect(topic.type).not.toBe('vocabulary');
  });

  test.each(QUIZ_TOPICS.map((t) => [t.folder]))('public/%s/index.json exists', (folder) => {
    expect(fs.existsSync(path.join(PUBLIC_DIR, folder, 'index.json'))).toBe(true);
  });
});
