// A verb or word answered correctly once is learned and not asked again.
import { describe, expect, test } from 'vitest';
import { VERBS, stageVerbs } from '../src/data';
import { ST, lvl, mastered, wLearned } from '../src/store/state';
import { pickVerb, setCourseDay } from '../src/engine/pick';
import { recordVerb, recordWord } from '../src/engine/session';
import { WORDS } from '../src/data';

describe('learned after one correct answer', () => {
  test('verb', () => {
    ST.v = {};
    recordVerb('pc', true, 'faire', true);
    expect(lvl('faire')).toBe(2);
    expect(mastered(0)).toBe(1);
  });
  test('word', () => {
    ST.wd = {};
    recordWord(WORDS[0], true);
    expect(wLearned(WORDS[0].id)).toBe(true);
  });
  test('learned verbs are not picked while others remain', () => {
    ST.v = {}; ST.stage = 0; setCourseDay(0);
    const left = stageVerbs(0)[7];
    stageVerbs(0).forEach(v => { if (v !== left) ST.v[v.key] = [1, 1]; });
    for (let i = 0; i < 200; i++) expect(pickVerb().key).toBe(left.key);
  });
  test('when every verb is learned, practice still works', () => {
    ST.v = Object.fromEntries(VERBS.map(v => [v.key, [1, 1]]));
    expect(stageVerbs(0).map(v => v.key)).toContain(pickVerb().key);
  });
  test('course day: today’s and earlier unlearned verbs only', () => {
    ST.v = {}; setCourseDay(5);
    VERBS.slice(0, 11).forEach(v => { if (v.idx !== 3) ST.v[v.key] = [1, 1]; });
    for (let i = 0; i < 100; i++) expect(pickVerb().idx).toBe(3);
    setCourseDay(0);
  });
});

describe('bringing the next items forward', () => {
  test('a learned stage moves on to the next stage', async () => {
    const { advanceStage } = await import('../src/engine/pick');
    ST.v = Object.fromEntries(stageVerbs(0).map(v => [v.key, [1, 1]])); ST.stage = 0;
    expect(advanceStage()).toBe(1);
    expect(ST.stage).toBe(1);
    expect(advanceStage()).toBeNull(); // stage 1 not learned yet
  });
  test('course: everything up to Day N learned → next verbs', () => {
    ST.v = Object.fromEntries(VERBS.slice(0, 11).map(v => [v.key, [1, 1]])); setCourseDay(5);
    for (let i = 0; i < 50; i++) expect([11, 12, 13]).toContain(pickVerb().idx);
    setCourseDay(0);
  });
});
