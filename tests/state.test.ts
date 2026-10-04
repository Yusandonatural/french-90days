import { describe, expect, test } from 'vitest';
import { blank, migrate } from '../src/store/state';
import { parseTsv, parseWords } from '../src/data/parse';

describe('saved progress', () => {
  test('old saves load unchanged and get new defaults', () => {
    const old = { forms: { pc: [3, 4], vd: [1, 1], al: [0, 2] }, streak: 2, best: 5, total: 7, v: { faire: [2, 3] }, stage: 1 };
    const s = migrate(old as never);
    expect(s.v).toEqual({ faire: [2, 3] });
    expect(s.stage).toBe(1);
    expect(s.forms.neg).toEqual([0, 0]);
    expect(s.days).toEqual({});
    expect(s.wd).toEqual({});
    expect(s.goal).toBe(50);
  });
  test('empty storage gives a blank state', () => {
    expect(migrate(null)).toEqual(blank());
  });
});

describe('data file parsers', () => {
  test('tsv keeps empty trailing cells', () => {
    expect(parseTsv('a\tb\tc\nx\t\t\ny\tz\n')).toEqual([{ a: 'x', b: '', c: '' }, { a: 'y', b: 'z', c: '' }]);
  });
  test('words.txt themes', () => {
    expect(parseWords('#food|🍞|食べ物|food\nle pain|パン\nl\'eau|水|f\n')).toEqual([
      { key: 'food', emo: '🍞', title: '食べ物', fk: 'food', words: [['le pain', 'パン', '', '', ''], ["l'eau", '水', 'f', '', '']] },
    ]);
  });
});
