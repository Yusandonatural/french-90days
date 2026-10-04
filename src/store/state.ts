// Persistent progress (localStorage). Key names are kept from the original app
// so existing progress loads unchanged — add a migration if you ever rename them.
import { VERBS, WORDS, stageVerbs } from '../data';

export const KEY = 'trois-formes-v2';
export const PLAYER_KEY = KEY + '-pl';

/** [correct, answered] */
export type Tally = [number, number];
export type BlockKey = 'rev' | 'lis' | 'spk' | 'memo';
export interface Profile {
  purp: string[]; name?: string; city?: string; job?: number; kids: number; hobbies: number[];
  shy?: string; tm?: string; ls?: string;
}
export interface CourseDay { t: Record<BlockKey, number>; done: boolean; skipped?: boolean; memo: string; date?: string }
export interface Score { vocab: number; listen: number }
export interface Course {
  start: string; startDay: number; profile: Profile; dx: Score;
  days: Record<number, CourseDay>; final?: { score: Score; date: string };
}
export interface State {
  forms: Record<'pc' | 'vd' | 'al' | 'neg', Tally>;
  streak: number; best: number; total: number;
  v: Record<string, Tally>; stage: number; xp: number;
  days: Record<string, number>; goal: number; lessons: number; perfect: number;
  wd: Record<string, Tally>;
  course?: Course;
  /** ms of the last change (used when syncing devices) */
  updatedAt?: number;
  /** set by 成績をリセット; a newer epoch replaces older data instead of merging with it */
  epoch?: number;
}

export const blank = (): State => ({ forms: { pc: [0, 0], vd: [0, 0], al: [0, 0], neg: [0, 0] }, streak: 0, best: 0, total: 0, v: {}, stage: 0, xp: 0, days: {}, goal: 50, lessons: 0, perfect: 0, wd: {} });

/** Fill in defaults for data saved by older versions. */
export function migrate(saved: Partial<State> | null): State {
  const s: State = Object.assign(blank(), saved || {});
  s.forms.neg = s.forms.neg || [0, 0];
  s.days = s.days || {};
  s.wd = s.wd || {};
  return s;
}

function load(): State {
  try { const r = localStorage.getItem(KEY); if (r) return migrate(JSON.parse(r)); } catch { /* empty or blocked storage */ }
  return blank();
}

export let ST: State = load();
function write() { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch { /* ignore */ } }
const listeners: (() => void)[] = [];
/** Called after every save (cloud sync pushes from here). */
export function onSaved(fn: () => void) { listeners.push(fn); }
export function save() { ST.updatedAt = Date.now(); write(); listeners.forEach(f => f()); }
export function resetState() { ST = blank(); ST.epoch = Date.now(); save(); }
/** Replace the whole state (after merging with another device). Does not notify listeners. */
export function replaceState(s: State) { ST = s; write(); }

/** correct answers needed before a verb / word counts as learned and stops being asked */
export const VERB_MASTER = 1, WORD_MASTER = 1;

/* ---------- verbs ---------- */
export const vc = (k: string) => (ST.v[k] || [0, 0])[0];
/** 0 = not yet, 1 = practising, 2 = mastered */
export const lvl = (k: string) => { const c = vc(k), n = (ST.v[k] || [0, 0])[1]; return c >= VERB_MASTER ? 2 : (n > 0 ? 1 : 0); };
export const vMastered = (k: string) => vc(k) >= VERB_MASTER;
export const mastered = (i: number) => stageVerbs(i).filter(v => vMastered(v.key)).length;
export const masteredVerbs = () => VERBS.filter(v => vMastered(v.key)).length;

/* ---------- words ---------- */
export const wc = (id: string): Tally => (ST.wd[id] || [0, 0]);
export const wLearned = (id: string) => wc(id)[0] >= WORD_MASTER;
export const wSeen = (id: string) => wc(id)[1] > 0;
export const learnedCount = () => WORDS.filter(w => wLearned(w.id)).length;
