// Merging iPhone and web progress.
import { describe, expect, test } from 'vitest';
import { mergeStates, sameProgress } from '../src/store/merge';
import { blank, type Course, type CourseDay, type State } from '../src/store/state';

const day = (t: Partial<CourseDay["t"]>, extra: object = {}): CourseDay =>
  ({ t: { rev: 0, lis: 0, spk: 0, memo: 0, ...t }, done: false, memo: '', ...extra });
const course = (days: Record<number, CourseDay>, extra: object = {}): Course =>
  ({ start: '2026-10-01', startDay: 1, profile: { purp: [], kids: 0, hobbies: [] }, dx: { vocab: 10, listen: 20 }, days, ...extra });
const st = (p: Partial<State>): State => ({ ...blank(), ...p } as State);

describe('mergeStates', () => {
  test('counters keep the larger value, key by key', () => {
    const phone = st({ v: { faire: [3, 4], dire: [1, 1] }, wd: { bonjour: [2, 2] }, xp: 300, days: { '2026-10-03': 40, '2026-10-04': 10 }, lessons: 3, updatedAt: 1 });
    const web = st({ v: { faire: [1, 5], aller: [2, 2] }, wd: { salut: [1, 1] }, xp: 250, days: { '2026-10-04': 60 }, lessons: 5, updatedAt: 2 });
    const m = mergeStates(phone, web);
    expect(m.v).toEqual({ faire: [3, 5], dire: [1, 1], aller: [2, 2] });
    expect(m.wd).toEqual({ bonjour: [2, 2], salut: [1, 1] });
    expect(m.xp).toBe(300);
    expect(m.days).toEqual({ '2026-10-03': 40, '2026-10-04': 60 });
    expect(m.lessons).toBe(5);
    expect(m.updatedAt).toBe(2);
  });
  test('settings come from the newer side', () => {
    const m = mergeStates(st({ stage: 1, goal: 20, updatedAt: 5 }), st({ stage: 3, goal: 100, updatedAt: 9 }));
    expect([m.stage, m.goal]).toEqual([3, 100]);
  });
  test('course days: block seconds max, done on either device, newer memo', () => {
    const phone = st({ updatedAt: 10, course: course({ 1: day({ rev: 900 }, { done: true, date: '2026-10-01' }), 2: day({ lis: 120 }, { memo: 'phone memo' }) }) });
    const web = st({ updatedAt: 5, course: course({ 1: day({ rev: 300, spk: 600 }), 3: day({ memo: 60 }) }) });
    const m = mergeStates(phone, web);
    expect(m.course!.days[1]).toEqual({ t: { rev: 900, lis: 0, spk: 600, memo: 0 }, done: true, memo: '', date: '2026-10-01' });
    expect(m.course!.days[2].memo).toBe('phone memo');
    expect(m.course!.days[3].t.memo).toBe(60);
  });
  test('a day done for real on one device is not "skipped"', () => {
    const m = mergeStates(
      st({ course: course({ 5: day({}, { done: true, skipped: true }) }) }),
      st({ course: course({ 5: day({ rev: 900 }, { done: true }) }) }));
    expect(m.course!.days[5].skipped).toBeUndefined();
  });
  test('course only on one device is kept', () => {
    expect(mergeStates(st({}), st({ course: course({}) })).course).toBeTruthy();
  });
  test('a newer reset wins over old progress', () => {
    const old = st({ xp: 900, v: { faire: [3, 3] }, updatedAt: 100 });
    const reset = st({ epoch: 50, updatedAt: 60 });
    expect(mergeStates(old, reset).xp).toBe(0);
    expect(mergeStates(reset, old).v).toEqual({});
  });
  test('merging is symmetric for counters and idempotent', () => {
    const a = st({ v: { faire: [1, 2] }, xp: 10, updatedAt: 1 }), b = st({ v: { faire: [2, 1] }, xp: 20, updatedAt: 2 });
    expect(sameProgress(mergeStates(a, b), mergeStates(b, a))).toBe(true);
    const m = mergeStates(a, b);
    expect(sameProgress(mergeStates(m, b), m)).toBe(true);
  });
  test('old saves without updatedAt / epoch merge fine', () => {
    const m = mergeStates({ v: { faire: [1, 1] } } as Partial<State>, st({ xp: 5 }));
    expect(m.v.faire).toEqual([1, 1]);
    expect(m.xp).toBe(5);
  });
});
