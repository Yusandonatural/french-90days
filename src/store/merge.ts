// Merging progress from two devices (iPhone and web). Counters only grow, so the
// larger value of each counter wins; settings come from the more recently updated side.
// A newer reset (epoch) replaces the other side completely.
import { migrate, type Course, type CourseDay, type State, type Tally } from './state';

const maxTally = (a?: Tally, b?: Tally): Tally => [Math.max(a?.[0] || 0, b?.[0] || 0), Math.max(a?.[1] || 0, b?.[1] || 0)];
function mergeTallies(a: Record<string, Tally>, b: Record<string, Tally>) {
  const out: Record<string, Tally> = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = maxTally(a[k], b[k]);
  return out;
}
function mergeDay(a: CourseDay | undefined, b: CourseDay | undefined, aNewer: boolean): CourseDay {
  if (!a) return b!;
  if (!b) return a;
  const [n, o] = aNewer ? [a, b] : [b, a];
  const done = a.done || b.done;
  // skipped only if every side that finished it skipped it
  const skipped = done && [a, b].filter(x => x.done).every(x => x.skipped);
  const day: CourseDay = {
    t: { rev: Math.max(a.t.rev, b.t.rev), lis: Math.max(a.t.lis, b.t.lis), spk: Math.max(a.t.spk, b.t.spk), memo: Math.max(a.t.memo, b.t.memo) },
    done, memo: n.memo || o.memo || '',
  };
  if (skipped) day.skipped = true;
  const date = n.date || o.date; if (date) day.date = date;
  return day;
}
function mergeCourse(a: Course | undefined, b: Course | undefined, aNewer: boolean): Course | undefined {
  if (!a) return b;
  if (!b) return a;
  const [n, o] = aNewer ? [a, b] : [b, a];
  const days: Record<number, CourseDay> = {};
  for (const k of new Set([...Object.keys(a.days), ...Object.keys(b.days)].map(Number))) days[k] = mergeDay(a.days[k], b.days[k], aNewer);
  const c: Course = { start: n.start, startDay: n.startDay, profile: n.profile, dx: n.dx, days };
  const final = n.final || o.final; if (final) c.final = final;
  return c;
}

export function mergeStates(x: Partial<State>, y: Partial<State>): State {
  const a = migrate(x), b = migrate(y);
  const ea = a.epoch || 0, eb = b.epoch || 0;
  if (ea !== eb) return ea > eb ? a : b;
  const aNewer = (a.updatedAt || 0) >= (b.updatedAt || 0);
  const n = aNewer ? a : b;
  const days: Record<string, number> = {};
  for (const k of new Set([...Object.keys(a.days), ...Object.keys(b.days)])) days[k] = Math.max(a.days[k] || 0, b.days[k] || 0);
  const s: State = {
    forms: { pc: maxTally(a.forms.pc, b.forms.pc), vd: maxTally(a.forms.vd, b.forms.vd), al: maxTally(a.forms.al, b.forms.al), neg: maxTally(a.forms.neg, b.forms.neg) },
    streak: n.streak, best: Math.max(a.best, b.best), total: Math.max(a.total, b.total),
    v: mergeTallies(a.v, b.v), stage: n.stage, xp: Math.max(a.xp, b.xp), days, goal: n.goal,
    lessons: Math.max(a.lessons, b.lessons), perfect: Math.max(a.perfect, b.perfect),
    wd: mergeTallies(a.wd, b.wd),
    updatedAt: Math.max(a.updatedAt || 0, b.updatedAt || 0),
  };
  const course = mergeCourse(a.course, b.course, aNewer); if (course) s.course = course;
  if (ea) s.epoch = ea;
  return s;
}

/** JSON with sorted keys, so equal data gives equal text whatever the key order */
function canon(x: unknown): string {
  if (Array.isArray(x)) return '[' + x.map(canon).join(',') + ']';
  if (x && typeof x === 'object') return '{' + Object.keys(x).sort().filter(k => (x as Record<string, unknown>)[k] !== undefined).map(k => JSON.stringify(k) + ':' + canon((x as Record<string, unknown>)[k])).join(',') + '}';
  return JSON.stringify(x);
}
/** true when two states hold the same progress (ignores updatedAt) */
export const sameProgress = (a: Partial<State>, b: Partial<State>) =>
  canon({ ...migrate(a), updatedAt: 0 }) === canon({ ...migrate(b), updatedAt: 0 });
