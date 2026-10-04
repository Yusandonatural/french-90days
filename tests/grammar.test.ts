// Snapshot of the grammar engine against the original app: every verb × example × subject × form.
import { afterAll, describe, expect, test } from 'vitest';
import { VERBS, withEx } from '../src/data';
import {
  accepted, acceptedNeg, allowed, build, buildNeg, notesOf, presFr, presWord, subjFor, type Subj,
} from '../src/grammar/conjugate';
import { jNeg, jNegPast, jaNegOf, jaOf, presJa } from '../src/grammar/ja';
import { loadReference } from './reference';

const { ref, close } = loadReference();
afterAll(close);

const ALL_SUBJ: Subj[] = ['je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles'];
const JA_SUBJ: Subj[] = ['je', 'on', 'tu', 'il', 'elle'];
const FORMS = ['pc', 'vd', 'al'] as const;

/** all outputs for one verb example, from either implementation */
function outputs(g: Record<string, (...a: unknown[]) => unknown>, v: unknown) {
  const o: Record<string, unknown> = {};
  for (const s of ALL_SUBJ) {
    for (const f of FORMS) {
      o[`${s} ${f}`] = g.build(s, v, f);
      o[`${s} ${f} chunk`] = g.build(s, v, f, { obj: false, sentence: false });
      o[`${s} ${f} noSubj`] = g.build(s, v, f, { obj: false, sentence: false, noSubj: 1 });
      o[`${s} ${f} acc`] = g.accepted(s, v, f);
    }
    for (const f of ['pc', 'al', 'pr'] as const) {
      o[`${s} ${f}n`] = g.buildNeg(s, v, f);
      o[`${s} ${f}n acc`] = g.acceptedNeg(s, v, f);
    }
  }
  for (const s of JA_SUBJ) {
    for (const f of FORMS) {
      o[`${s} ${f} ja`] = g.jaOf(s, v, f);
      o[`${s} ${f} ja mk`] = g.jaOf(s, v, f, '昨日');
      o[`${s} ${f} jaNeg`] = g.jaNegOf(s, v, f);
    }
  }
  o.presFr = g.presFr(v);
  o.presJa = g.presJa(v);
  return o;
}

const mine = { build, accepted, buildNeg, acceptedNeg, jaOf, jaNegOf, presFr, presJa } as unknown as Record<string, (...a: unknown[]) => unknown>;

describe('matches the reference app', () => {
  test('verb data', () => {
    expect(VERBS.length).toBe(200);
    expect(VERBS.reduce((a, v) => a + v.ex.length, 0)).toBe(1000);
    expect(JSON.parse(JSON.stringify(VERBS))).toEqual(JSON.parse(JSON.stringify(ref.VERBS)));
  });

  test.each(VERBS.map(v => [v.idx + 1, v.key] as const))('No.%i %s — all examples, subjects and forms', (n) => {
    const v = VERBS[n - 1], rv = ref.VERBS[n - 1];
    expect(presWord(v)).toBe(ref.presWord(rv));
    expect(allowed(v)).toEqual([...ref.allowed(rv)]);
    expect(subjFor(v)).toEqual([...ref.subjFor(rv)]);
    expect(notesOf(v)).toEqual([...ref.notesOf(rv)]);
    v.ex.forEach((_, i) => {
      const a = outputs(mine, withEx(v, i));
      const b = JSON.parse(JSON.stringify(outputs(ref, ref.withEx(rv, i))));
      expect(a).toEqual(b);
    });
  });

  test('Japanese negation of every ru / ta / now in the data', () => {
    const pairs = VERBS.flatMap(v => v.ex.flatMap(e => [[e.ru, e.ta], [e.now, e.ta]]));
    for (const [r, t] of pairs) {
      expect([r, t, jNeg(r, t)]).toEqual([r, t, ref.jNeg(r, t)]);
      expect([r, t, jNegPast(t, r)]).toEqual([r, t, ref.jNegPast(t, r)]);
    }
  });
});
