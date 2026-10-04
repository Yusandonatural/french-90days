import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import { readFileSync } from 'node:fs';
import { parseTsv, parseWords } from './src/data/parse.ts';

/** Turns src/data/*.tsv and words.txt into JSON modules at build time. */
function dataFiles(): Plugin {
  return {
    name: 'data-files',
    enforce: 'pre',
    load(id) {
      const file = id.split('?')[0];
      if (file.endsWith('.tsv')) return 'export default ' + JSON.stringify(parseTsv(readFileSync(file, 'utf8')));
      if (file.endsWith('/words.txt')) return 'export default ' + JSON.stringify(parseWords(readFileSync(file, 'utf8')));
      return null;
    },
  };
}

export default defineConfig({
  // GitHub Pages serves the committed docs/ folder (see README_DEPLOY.md).
  base: './',
  plugins: [dataFiles()],
  build: { outDir: 'docs', emptyOutDir: true, assetsInlineLimit: 0 },
  test: { environment: 'node' },
});
