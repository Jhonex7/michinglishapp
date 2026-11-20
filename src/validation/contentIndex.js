// Node-only. Builds every index.json the app reads, from the folders that
// exist in /public. Students never edit index.json: creating their folder is
// enough, so two pull requests never touch the same file.
//
// Used by the Vite plugin in vite.config.js:
//   - `npm run dev`:   served on the fly (new folders show up on refresh)
//   - `npm run build`: written into dist/
import path from 'node:path';
import fs from 'node:fs';
import { QUIZ_TOPICS } from '../config/topics.js';
import { PUBLIC_DIR, listSubfolders } from './contentFiles.js';

/** Student folders that contain an info.json, sorted for stable output. */
const studentFolders = (dir) =>
  listSubfolders(dir)
    .filter((name) => fs.existsSync(path.join(dir, name, 'info.json')))
    .sort();

/**
 * Returns { 'verbs/index.json': { folders: [...] }, 'vocabulary/index.json': … }
 * with paths relative to /public.
 */
export const buildContentIndexes = (publicDir = PUBLIC_DIR) => {
  const indexes = {};

  QUIZ_TOPICS.forEach(({ folder }) => {
    indexes[`${folder}/index.json`] = { folders: studentFolders(path.join(publicDir, folder)) };
  });

  const vocabularyDir = path.join(publicDir, 'vocabulary');
  const categories = listSubfolders(vocabularyDir).sort();
  indexes['vocabulary/index.json'] = { folders: categories };
  categories.forEach((category) => {
    indexes[`vocabulary/${category}/index.json`] = {
      folders: studentFolders(path.join(vocabularyDir, category)),
    };
  });

  return indexes;
};

/** Vite plugin that serves (dev) and emits (build) the generated indexes. */
export const contentIndexPlugin = () => {
  let base = '/';
  return {
    name: 'michinglish-content-index',
    configResolved(config) {
      base = config.base;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0];
        if (!url.startsWith(base) || !url.endsWith('/index.json')) return next();
        const index = buildContentIndexes()[decodeURIComponent(url.slice(base.length))];
        if (!index) return next();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(index));
        return undefined;
      });
    },
    generateBundle() {
      Object.entries(buildContentIndexes()).forEach(([fileName, index]) => {
        this.emitFile({ type: 'asset', fileName, source: `${JSON.stringify(index, null, 2)}\n` });
      });
    },
  };
};
