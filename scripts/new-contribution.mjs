#!/usr/bin/env node
// Creates your contribution folder with a starter info.json, so you only
// have to edit it. (index.json files are generated automatically.)
//
//   npm run contribute -- --topic verbs --code 2212345-3743
//   npm run contribute -- --vocabulary animals --code 2212345-3743

import path from 'node:path';
import { createContribution } from '../src/validation/scaffold.js';

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const result = createContribution({ code: arg('--code'), topicId: arg('--topic'), category: arg('--vocabulary') });
if (result.error) {
  console.error(`❌ ${result.error}`);
  process.exit(1);
}

console.log(`✅ Created ${path.relative(process.cwd(), result.infoPath)}.
Next steps:
  1. Edit the file: your name, image, favorite social network and questions.
  2. npm test && npm run check:contribution
  3. Commit, push and open your pull request.`);
