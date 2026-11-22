// @vitest-environment node
// npm run contribute: must refuse bad input and never overwrite a file.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createContribution } from '../../validation/scaffold.js';
import { QUIZ_TOPICS } from '../../config/topics.js';
import { detectContentType, getContentType } from '../../config/contentTypes.js';

const CODE = '2212345-3743';

describe('createContribution', () => {
  let dir;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'michi-new-'));
    fs.mkdirSync(path.join(dir, 'vocabulary', 'animals'), { recursive: true });
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  test.each([
    [{ topicId: 'verbs' }, 'Use --code'],
    [{ code: '2212345', topicId: 'verbs' }, 'Use --code'],
    [{ code: CODE }, 'either --topic'],
    [{ code: CODE, topicId: 'verbs', category: 'animals' }, 'either --topic'],
    [{ code: CODE, topicId: 'passive' }, 'Unknown topic "passive"'],
    [{ code: CODE, category: 'planets' }, 'Unknown category "planets". Options: animals'],
  ])('refuses %j', (args, message) => {
    const result = createContribution({ ...args, publicDir: dir });
    expect(result.error).toContain(message);
    expect(fs.readdirSync(dir)).toEqual(['vocabulary']);
  });

  test.each(QUIZ_TOPICS.map((t) => [t.id, t]))('creates a %s template of the right type', (id, topic) => {
    const { infoPath, error } = createContribution({ code: CODE, topicId: id, publicDir: dir });
    expect(error).toBeUndefined();
    expect(infoPath).toBe(path.join(dir, topic.folder, CODE, 'info.json'));
    const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
    expect(detectContentType(info)).toBe(topic.type);
    // Structure is valid; strict mode only complains about the template text.
    expect(getContentType(topic.type).validate(info)).toEqual([]);
    expect(getContentType(topic.type).validate(info, { strict: true })).toContainEqual(
      expect.stringContaining('replace the template text'),
    );
  });

  test('also accepts the folder name as --topic', () => {
    expect(createContribution({ code: CODE, topicId: 'linkwords', publicDir: dir }).error).toBeUndefined();
  });

  test('creates a vocabulary template', () => {
    const { infoPath } = createContribution({ code: CODE, category: 'animals', publicDir: dir });
    expect(detectContentType(JSON.parse(fs.readFileSync(infoPath, 'utf8')))).toBe('vocabulary');
  });

  test('never overwrites an existing contribution', () => {
    createContribution({ code: CODE, topicId: 'verbs', publicDir: dir });
    const file = path.join(dir, 'verbs', CODE, 'info.json');
    fs.writeFileSync(file, '{"mine": true}');
    expect(createContribution({ code: CODE, topicId: 'verbs', publicDir: dir }).error).toContain('already exists');
    expect(fs.readFileSync(file, 'utf8')).toBe('{"mine": true}');
  });
});
