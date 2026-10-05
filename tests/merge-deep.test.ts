// The portable generic merge (src/sync/core/merge-deep.ts), as another app (e.g. Chinese) would use it.
import { describe, expect, test } from 'vitest';
import { mergeDeep, sameDeep } from '../src/sync/core/merge-deep';

// a made-up Chinese app's progress
interface P { updatedAt: number; epoch?: number; xp: number; goal: number; level: string; words: Record<string, number[]>; days: Record<string, number>; course: Record<number, { done: boolean; memo: string }> }
const phone: P = { updatedAt: 10, xp: 120, goal: 50, level: 'HSK1', words: { '你好': [2, 2], '谢谢': [1, 3] }, days: { '2026-10-04': 40 }, course: { 3: { done: true, memo: 'phone' } } };
const web: P = { updatedAt: 20, xp: 90, goal: 100, level: 'HSK2', words: { '你好': [1, 4], '再见': [1, 1] }, days: { '2026-10-04': 60, '2026-10-05': 10 }, course: { 3: { done: false, memo: '' }, 4: { done: true, memo: 'web' } } };

describe('mergeDeep', () => {
  test('counters grow, tallies per position, done flags stay done', () => {
    const m = mergeDeep(phone, web, { newer: ['goal'] });
    expect(m.xp).toBe(120);
    expect(m.words).toEqual({ '你好': [2, 4], '谢谢': [1, 3], '再见': [1, 1] });
    expect(m.days).toEqual({ '2026-10-04': 60, '2026-10-05': 10 });
    expect(m.course).toEqual({ 3: { done: true, memo: 'phone' }, 4: { done: true, memo: 'web' } });
    expect(m.updatedAt).toBe(20);
  });
  test('settings listed in newer, and text, come from the newer side', () => {
    const m = mergeDeep(phone, web, { newer: ['goal'] });
    expect(m.goal).toBe(100);
    expect(m.level).toBe('HSK2');
  });
  test('a newer reset wins', () => {
    const reset: P = { updatedAt: 5, epoch: 7, xp: 0, goal: 50, level: '', words: {}, days: {}, course: {} };
    expect(mergeDeep(phone, reset)).toBe(reset);
  });
  test('symmetric and idempotent', () => {
    const ab = mergeDeep(phone, web), ba = mergeDeep(web, phone);
    expect(sameDeep(ab, ba)).toBe(true);
    expect(sameDeep(mergeDeep(ab, web), ab)).toBe(true);
  });
});
