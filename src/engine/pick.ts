// Which verb to ask next: weak verbs first, 25% review from earlier stages.
import { VERBS, type Verb } from '../data';
import { ST, vc } from '../store/state';
import { dvStart, dvEnd } from './course';

let lastKey: string | null = null;
/** Day N when the drill was opened from the course (0 = stage mode). */
let courseDay = 0;
export const getCourseDay = () => courseDay;
export function setCourseDay(d: number) { courseDay = d; }
export function resetLastKey() { lastKey = null; }

/** weight 1 / (1 + correct)^1.6 */
function weighted(pool: Verb[]) {
  const w = pool.map(v => 1 / Math.pow(1 + vc(v.key), 1.6));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) { lastKey = pool[i].key; return pool[i]; } }
  lastKey = pool[0].key;
  return pool[0];
}

export function pickVerb(test?: (v: Verb) => boolean): Verb {
  const ok = (v: Verb) => !test || test(v);
  if (courseDay) {
    // 50% today's new verbs, otherwise everything from Day 1
    const end = dvEnd(courseDay);
    let pool = VERBS.slice(Math.random() < .5 ? dvStart(courseDay) : 0, end).filter(ok);
    if (!pool.length) pool = VERBS.slice(0, end).filter(ok);
    if (pool.length > 1) pool = pool.filter(v => v.key !== lastKey);
    return weighted(pool);
  }
  const st = ST.stage;
  let pool: Verb[] | undefined;
  if (st > 0 && Math.random() < .25) pool = VERBS.filter(v => v.stage < st && ok(v));
  if (!pool || !pool.length) pool = VERBS.filter(v => v.stage === st && ok(v));
  if (pool.length > 1) pool = pool.filter(v => v.key !== lastKey);
  return weighted(pool);
}
