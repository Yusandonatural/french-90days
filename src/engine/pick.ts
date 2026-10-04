// Which verb to ask next: verbs not answered correctly yet; 25% from earlier stages.
// A verb answered correctly is not asked again. When everything in range is learned,
// the next verbs are brought forward (next stage / later Days).
import { NST, VERBS, stageVerbs, type Verb } from '../data';
import { ST, vc, vMastered } from '../store/state';
import { dvStart, dvEnd } from './course';

let lastKey: string | null = null;
/** Day N when the drill was opened from the course (0 = stage mode). */
let courseDay = 0;
export const getCourseDay = () => courseDay;
export function setCourseDay(d: number) { courseDay = d; }
export function resetLastKey() { lastKey = null; }

/** keep only verbs not learned yet, when there are any */
const fresh = (pool: Verb[]) => { const f = pool.filter(v => !vMastered(v.key)); return f.length ? f : pool; };
const unlearned = (pool: Verb[]) => pool.filter(v => !vMastered(v.key));

/** The current stage is all learned: move to the next stage that still has unlearned verbs. Returns it, or null. */
export function advanceStage(): number | null {
  if (stageVerbs(ST.stage).some(v => !vMastered(v.key))) return null;
  for (let s = ST.stage + 1; s < NST; s++) if (stageVerbs(s).some(v => !vMastered(v.key))) { ST.stage = s; return s; }
  return null;
}
/** Course drill: a verb from beyond Day N (brought forward). */
export const isAhead = (v: Verb) => !!courseDay && v.idx >= dvEnd(courseDay);

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
    let pool = unlearned(VERBS.slice(Math.random() < .5 ? dvStart(courseDay) : 0, end).filter(ok));
    if (!pool.length) pool = unlearned(VERBS.slice(0, end).filter(ok));
    // everything up to today is learned: bring the next verbs forward
    if (!pool.length) pool = unlearned(VERBS.slice(end).filter(ok)).slice(0, 3);
    if (!pool.length) pool = VERBS.slice(0, end).filter(ok);
    if (pool.length > 1) pool = pool.filter(v => v.key !== lastKey);
    return weighted(pool);
  }
  const st = ST.stage;
  let pool: Verb[] | undefined;
  if (st > 0 && Math.random() < .25) pool = VERBS.filter(v => v.stage < st && ok(v) && !vMastered(v.key));
  if (!pool || !pool.length) pool = fresh(VERBS.filter(v => v.stage === st && ok(v)));
  if (pool.length > 1) pool = pool.filter(v => v.key !== lastKey);
  return weighted(pool);
}
