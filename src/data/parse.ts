// Parsers for the data files. Used by the Vite plugin at build time (→ JSON)
// and directly by tests.

export type Row = Record<string, string>;

/** TSV with a header row → array of objects. Missing trailing cells become ''. */
export function parseTsv(text: string): Row[] {
  const [head, ...rows] = text.replace(/\r/g, '').replace(/\n+$/, '').split('\n');
  const keys = head.split('\t');
  return rows.filter(r => r.length).map(r => {
    const c = r.split('\t');
    return Object.fromEntries(keys.map((k, i) => [k, c[i] ?? ''])) as Row;
  });
}

export interface ThemeRow { key: string; emo: string; title: string; fk: string; words: [string, string, string, string, string][] }

/**
 * words.txt: `#key|emoji|title|frameKey` starts a theme,
 * then `fr|ja|gender|ru|ta` lines (only fr and ja are required).
 */
export function parseWords(text: string): ThemeRow[] {
  const out: ThemeRow[] = [];
  let th: ThemeRow | null = null;
  for (const l of text.replace(/\r/g, '').trim().split('\n')) {
    if (l[0] === '#') {
      const [key, emo, title, fk] = l.slice(1).split('|');
      th = { key, emo, title, fk, words: [] };
      out.push(th);
      continue;
    }
    if (!th) throw new Error('words.txt: word before first #theme line');
    const [fr, ja, g, ru, ta] = l.split('|');
    th.words.push([fr, ja, g || '', ru || '', ta || '']);
  }
  return out;
}
