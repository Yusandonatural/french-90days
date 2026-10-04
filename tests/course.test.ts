// 90-day course, words and diagnosis logic against the reference app and spec §6–7.
import { afterAll, describe, expect, test } from 'vitest';
import { MEAN, THEMES, WORDS } from '../src/data';
import { FRAMES, wordVerb } from '../src/grammar/frames';
import { build } from '../src/grammar/conjugate';
import {
  NDAYS, PLANW, courseStatus, dayVerbs, dayWords, dxScore, focusCats, monthOf, personal, startDayFor,
} from '../src/engine/course';
import { ST } from '../src/store/state';
import type { Profile } from '../src/store/state';
import { loadReference } from './reference';

const { ref, close } = loadReference();
afterAll(close);
const plain = (x: unknown) => JSON.parse(JSON.stringify(x));

describe('data', () => {
  test('counts and theme order', () => {
    expect(WORDS.length).toBe(2816);
    expect(THEMES.length).toBe(34);
    expect(MEAN.length).toBe(130);
    expect(THEMES.map(t => t.key)).toEqual(ref.THEMES.map((t: { key: string }) => t.key));
    expect(WORDS.map(w => [w.fr, w.ja, w.g, w.ru, w.ta, w.th.key])).toEqual(ref.WORDS.map((w: Record<string, string> & { th: { key: string } }) => [w.fr, w.ja, w.g, w.ru, w.ta, w.th.key]));
    expect(plain(MEAN)).toEqual(plain(ref.MEAN));
  });
  test('つなぐ phrases come in the first 10 days', () => {
    expect(MEAN.filter(m => m.cat === 'つなぐ').every(m => m.day <= 10)).toBe(true);
    expect(Math.max(...MEAN.map(m => m.day))).toBe(65);
  });
});

describe('Day allocation', () => {
  test('verbs, words per day match the reference', () => {
    expect(PLANW.length).toBe(1500);
    for (let d = 1; d <= NDAYS; d++) {
      expect(dayVerbs(d).map(v => v.key)).toEqual(ref.dayVerbs(d).map((v: { key: string }) => v.key));
      expect(dayWords(d).map(w => w.id)).toEqual(ref.dayWords(d).map((w: { id: string }) => w.id));
    }
  });
  test('every verb is introduced exactly once, 2–3 per day', () => {
    const all = Array.from({ length: NDAYS }, (_, i) => dayVerbs(i + 1));
    expect(all.flat().length).toBe(200);
    expect(all.every(v => v.length >= 2 && v.length <= 3)).toBe(true);
  });
  test('months', () => {
    expect([1, 30, 31, 60, 61, 90].map(monthOf)).toEqual([0, 0, 1, 1, 2, 2]);
  });
});

describe('word sentences (type C)', () => {
  test('every word × frame matches the reference', () => {
    for (const w of WORDS) {
      const frs = FRAMES[w.th.fk];
      if (!frs) continue;
      const rw = ref.WORDS.find((x: { id: string; th: { key: string } }) => x.id === w.id && x.th.key === w.th.key);
      frs.forEach((fr, i) => {
        const a = wordVerb(w, fr), b = ref.wordVerb(rw, ref.FRAMES[w.th.fk][i]);
        expect({ phrase: a.phrase, obj: a.dv.obj, ru: a.dv.ru, ta: a.dv.ta }).toEqual({ phrase: b.phrase, obj: b.dv.obj, ru: b.dv.ru, ta: b.dv.ta });
      });
    }
  });
  test('preposition contraction', () => {
    const marche = WORDS.find(w => w.fr === 'le marché')!;
    const { dv, phrase } = wordVerb(marche, FRAMES.place[0]);
    expect(phrase).toBe('au marché');
    expect(build('je', dv, 'al')).toBe('Je vais aller au marché.');
  });
});

describe('diagnosis', () => {
  const words = [...Array(30)].map((_, i) => ({ fr: 'w' + i, real: 1 as const })).concat([...Array(6)].map((_, i) => ({ fr: 'f' + i, real: 0 as unknown as 1 })));
  const know = (real: number, fake: number) => Object.fromEntries(words.map((w, i) => [w.fr, w.real ? i < real : i - 30 < fake]));
  test('score = real known − half of fake known', () => {
    expect(dxScore(words, know(30, 0), 7)).toEqual({ vocab: 100, listen: 70 });
    expect(dxScore(words, know(30, 6), 0)).toEqual({ vocab: 50, listen: 0 });
    expect(dxScore(words, know(3, 6), 0).vocab).toBe(0);
  });
  test('start day', () => {
    expect(startDayFor({ vocab: 65, listen: 70 })).toBe(31);
    expect(startDayFor({ vocab: 80, listen: 60 })).toBe(8);
    expect(startDayFor({ vocab: 35, listen: 0 })).toBe(8);
    expect(startDayFor({ vocab: 0, listen: 60 })).toBe(8);
    expect(startDayFor({ vocab: 34, listen: 50 })).toBe(1);
  });
});

describe('personal plan', () => {
  const profiles: Profile[] = [
    { purp: ['travel', 'work'], name: 'Ryotaro', city: 'Nara', job: 0, kids: 3, hobbies: [0, 7], shy: 'shy', tm: 'four', ls: 'ear' },
    { purp: [], kids: 0, hobbies: [] },
    { purp: ['family', 'move', 'hobby'], name: 'Aki', job: 5, kids: 1, hobbies: [9] },
  ];
  test.each(profiles.map((p, i) => [i, p] as const))('profile %i matches the reference', (_i, p) => {
    ref.setCourse({ profile: plain(p) });
    expect(personal(p)).toEqual(plain(ref.personal()));
    expect(focusCats(p)).toEqual(plain(ref.focusCats()));
  });
  test('at most 10 phrases', () => {
    expect(personal(profiles[0]).length).toBe(10);
  });
});

describe('course status', () => {
  test('finish date and days behind', () => {
    ST.course = { start: '2026-01-01', startDay: 1, profile: { purp: [], kids: 0, hobbies: [] }, dx: { vocab: 0, listen: 0 }, days: {} };
    for (let d = 1; d <= 5; d++) ST.course.days[d] = { t: { rev: 0, lis: 0, spk: 0, memo: 0 }, done: true, memo: '' };
    const s = courseStatus(ST.course, new Date(2026, 0, 10));
    expect(s.done).toBe(5);
    expect(s.behind).toBe(5); // expected Day 10, 5 done → shown as "4日遅れ"
    expect([s.fin.getMonth() + 1, s.fin.getDate()]).toEqual([4, 4]); // 85 lessons left
    ST.course = undefined;
  });
});
