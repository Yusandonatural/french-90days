// XP, streaks, 10-question lessons and answer bookkeeping.
import { V, WORDS, type Word } from '../data';
import { ST, save, learnedCount, masteredVerbs } from '../store/state';

export const todayKey = (d = new Date()) =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

export function addXP(n: number) {
  ST.xp = (ST.xp || 0) + n;
  const k = todayKey();
  ST.days[k] = (ST.days[k] || 0) + n;
  save();
}
/** days in a row with XP, counting back from today (or yesterday if today is still 0) */
export function streak() {
  let c = 0;
  const d = new Date();
  if (!(ST.days[todayKey(d)] > 0)) d.setDate(d.getDate() - 1);
  while (ST.days[todayKey(d)] > 0) { c++; d.setDate(d.getDate() - 1); }
  return c;
}
export const level = () => Math.floor((ST.xp || 0) / 250) + 1;

/* ---------- lesson session ---------- */
export type SesKind = '' | 'drill' | 'word';
export const SES = { n: 0, ok: 0, xp: 0, total: 10, on: false, kind: '' as SesKind };
export function sesReset(kind: SesKind) { Object.assign(SES, { n: 0, ok: 0, xp: 0, total: 10, on: true, kind }); }
export function sesRec(ok: boolean) { if (!SES.on) return; SES.n++; if (ok) { SES.ok++; SES.xp += 10; } }
export const sesDone = () => SES.on && SES.n >= SES.total;

/** Lesson finished: bonus XP and counters. Returns what the summary screen shows. */
export function finishLesson() {
  const perfect = SES.ok === SES.total, bonus = 15 + (perfect ? 5 : 0);
  addXP(bonus);
  ST.lessons = (ST.lessons || 0) + 1;
  if (perfect) ST.perfect = (ST.perfect || 0) + 1;
  save();
  const res = { kind: SES.kind, perfect, xp: SES.xp + bonus, acc: Math.round(SES.ok / SES.total * 100) };
  SES.on = false;
  return res;
}

/* ---------- answers ---------- */
/** f: pc / vd / al, or pcn / aln (counted as negation) */
export function recordVerb(f: string, ok: boolean, key: string | null, noSes?: boolean) {
  const fk = (f === 'pcn' || f === 'aln') ? 'neg' : f as 'pc' | 'vd' | 'al';
  ST.forms[fk][1]++;
  if (ok) { ST.forms[fk][0]++; ST.streak++; ST.best = Math.max(ST.best, ST.streak); } else ST.streak = 0;
  ST.total++;
  if (key && V[key]) { const a = ST.v[key] || [0, 0]; a[1]++; if (ok) a[0]++; ST.v[key] = a; }
  if (ok) addXP(10); else save();
  if (!noSes) sesRec(ok);
}
export function recordWord(w: Word, ok: boolean) {
  const a = ST.wd[w.id] || [0, 0];
  a[1]++; if (ok) a[0]++;
  ST.wd[w.id] = a;
  if (ok) addXP(10); else save();
  sesRec(ok);
}

/* ---------- badges ---------- */
export function badges(): [string, string, string, boolean][] {
  const s = streak(), l = learnedCount(), mv = masteredVerbs(), x = ST.xp || 0;
  return [['🌱','はじめの一歩','レッスンを1回完了',(ST.lessons||0)>=1],['🔥','3日連続','3日続けて学習',s>=3],['🔥','7日連続','7日続けて学習',s>=7],['🔥','30日連続','30日続けて学習',s>=30],
   ['💯','全問正解','レッスンを全問正解',(ST.perfect||0)>=1],['🧠','動詞20','動詞を20個習得',mv>=20],['🧠','動詞100','動詞を100個習得',mv>=100],['👑','動詞200','動詞を全部習得',mv>=200],
   ['📗','単語100','単語を100語習得',l>=100],['📘','単語500','単語を500語習得',l>=500],['📙','単語1000','単語を1000語習得',l>=1000],['🏆','単語ぜんぶ','すべての単語を習得',l>=WORDS.length],
   ['⚡','1000 XP','合計1000 XP',x>=1000],['⚡','5000 XP','合計5000 XP',x>=5000]];
}
