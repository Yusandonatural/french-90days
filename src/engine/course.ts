// 90-day course: what each Day contains, block timer, diagnosis scoring, personal phrases.
import { MEAN, THEMES, VERBS, WORDS, type Word } from '../data';
import { shuffle } from '../util/dom';
import { ST, save, type BlockKey, type Course, type CourseDay, type Profile, type Score } from '../store/state';
import { todayKey } from './session';

export const NDAYS = 90, PLAN_WORDS = 1500;
/** first 1,500 words in theme order (verb2 excluded), spread over 90 days */
export const PLANW: Word[] = (() => {
  const out: Word[] = [];
  for (const t of THEMES) { if (t.key === 'verb2') continue; for (const w of t.words) { if (out.length < PLAN_WORDS) out.push(w); } }
  return out;
})();
export const dvStart = (d: number) => Math.floor((d - 1) * 200 / NDAYS), dvEnd = (d: number) => Math.floor(d * 200 / NDAYS);
export const dwStart = (d: number) => Math.floor((d - 1) * PLAN_WORDS / NDAYS), dwEnd = (d: number) => Math.floor(d * PLAN_WORDS / NDAYS);
export const dayVerbs = (d: number) => VERBS.slice(dvStart(d), dvEnd(d));
export const dayWords = (d: number) => PLANW.slice(dwStart(d), dwEnd(d));

export interface Block { k: BlockKey; t: string; min: number; emo: string; d: string }
export const BLOCKS: Block[] = [
  { k: 'rev', t: '復習', min: 15, emo: '🔁', d: '今日の単語と動詞（間隔をあけて復習）' },
  { k: 'lis', t: '聞く・まねる', min: 20, emo: '🎧', d: '今日の動詞の例文をシャドーイング' },
  { k: 'spk', t: '話す', min: 20, emo: '🗣️', d: '言いたいことを声に出す・録音する' },
  { k: 'memo', t: 'メモ', min: 5, emo: '📝', d: '今日言えなかったことを書く' },
];
export const MONTHS = [
  { t: '1ヶ月目', g: '音と文字に慣れる。最重要500語と、あいさつ・自己紹介を口から出せる', p: '発音・シャドーイング・フレーズの暗唱' },
  { t: '2ヶ月目', g: '1,000語へ。〜した・〜する・〜したばかり・〜しない を入れ替えて使える', p: '型の入れ替え・独り言・短い作文を声に出す' },
  { t: '3ヶ月目', g: '聞き返しや言い換えを使って、やり取りを続けられる', p: '会話のロールプレイ・録音して振り返る・週1〜2回は人と話す' },
];
export const monthOf = (d: number) => d <= 30 ? 0 : d <= 60 ? 1 : 2;

export const C = (): Course | undefined => ST.course;
export function courseDayObj(d: number): CourseDay {
  const c = C()!;
  c.days[d] = c.days[d] || { t: { rev: 0, lis: 0, spk: 0, memo: 0 }, done: false, memo: '' };
  return c.days[d];
}
/** first not-yet-done day from the start day */
export function curDay() {
  const c = C();
  if (!c) return 0;
  for (let d = c.startDay; d <= NDAYS; d++) { if (!(c.days[d] && c.days[d].done)) return d; }
  return NDAYS;
}
export const doneDays = () => {
  const c = C();
  if (!c) return 0;
  let n = 0;
  for (let d = 1; d <= NDAYS; d++) if (c.days[d] && c.days[d].done) n++;
  return n;
};
export const blockDone = (o: CourseDay, b: Block) => o.t[b.k] >= b.min * 60;
export const fmt = (s: number) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

/** Finish date and how many days behind schedule (shown when > 1). */
export function courseStatus(c: Course, now = new Date()) {
  const done = doneDays();
  const elapsed = Math.floor((new Date(todayKey(now)).getTime() - new Date(c.start).getTime()) / 86400000) + 1;
  const expected = Math.min(NDAYS, c.startDay - 1 + elapsed);
  const behind = Math.max(0, expected - done - 0);
  const fin = new Date(now); fin.setDate(fin.getDate() + (NDAYS - done) - 1);
  return { done, behind, fin };
}

/* ---------- block timer ---------- */
/** the running block, if any */
export const timer: { act: { d: number; k: BlockKey } | null } = { act: null };
export function startBlock(k: BlockKey) { const d = curDay(); timer.act = { d, k }; courseDayObj(d); save(); }
/** One second of a visible page. Returns the block when it just reached its target. */
export function tick(): Block | null {
  const act = timer.act;
  if (!act || !C()) return null;
  const o = courseDayObj(act.d), b = BLOCKS.find(x => x.k === act.k)!;
  const before = blockDone(o, b);
  o.t[act.k]++;
  if (o.t[act.k] % 5 === 0) save();
  if (!before && blockDone(o, b)) { save(); return b; }
  return null;
}
export function completeDay(o: CourseDay) { o.done = true; o.date = todayKey(); timer.act = null; }

/* ---------- personal phrases ---------- */
export const JOBS: [string, string][] = [['お茶の仕事','Je travaille dans le thé.'],['自営業・経営',"J'ai ma propre entreprise."],['会社員','Je travaille dans une entreprise.'],['農業',"Je travaille dans l'agriculture."],['先生','Je suis professeur.'],['学生','Je fais des études.'],['家事・子育て',"Je m'occupe de la maison et des enfants."],['退職している','Je suis à la retraite.']];
export const HOBBIES: [string, string][] = [['お茶','le thé'],['料理','la cuisine'],['読書','la lecture'],['スポーツ','le sport'],['音楽','la musique'],['旅行','les voyages'],['写真','la photographie'],['園芸・畑','le jardinage'],['映画','le cinéma'],['アート',"l'art"]];
export const PURP: [string, string, string][] = [['travel','旅行','Je voudrais voyager en France.'],['work','仕事',"J'ai besoin du français pour mon travail."],['family','家族・友人','Je veux parler avec mes amis français.'],['move','移住','Je voudrais vivre en France un jour.'],['hobby','趣味・教養',"J'aime apprendre les langues."]];
const NUMFR = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six'];

/** up to 10 [ja, fr] self-introduction lines from the diagnosis answers */
export function personal(p: Partial<Profile> = (C() && C()!.profile) || {}): [string, string][] {
  const out: [string, string][] = [];
  if (p.name) out.push([`はじめまして、${p.name}です`, `Enchanté, je m'appelle ${p.name}.`]);
  out.push(['日本から来ました', 'Je viens du Japon.']);
  if (p.city) out.push([`${p.city}に住んでいます`, `J'habite à ${p.city}.`]);
  if (p.job != null && JOBS[p.job]) out.push([JOBS[p.job][0] + 'をしています', JOBS[p.job][1]]);
  if (p.kids! > 0) out.push([`子どもが${p.kids}人います`, p.kids === 1 ? "J'ai un enfant." : `J'ai ${NUMFR[p.kids!] || p.kids} enfants.`]);
  (p.hobbies || []).slice(0, 2).forEach(h => HOBBIES[h] && out.push([`${HOBBIES[h][0]}が好きです`, `J'aime ${HOBBIES[h][1]}.`]));
  (p.purp || []).slice(0, 1).forEach(k => { const x = PURP.find(q => q[0] === k); if (x) out.push([`（目的）${x[1]}`, x[2]]); });
  out.push(['フランス語を勉強しています', "J'apprends le français."]);
  out.push(['まだ少ししか話せません', 'Je parle encore un peu français.']);
  out.push(['よろしくお願いします', 'Ravi de vous rencontrer.']);
  return out.slice(0, 10);
}

/** meaning categories to weight, from the learner's purposes (つなぐ always) */
export function focusCats(p: Partial<Profile> = (C() && C()!.profile) || {}) {
  const m: Record<string, string[]> = { travel: ['旅先', '困ったとき'], work: ['自分', '頼む・質問'], family: ['気持ち', '予定と過去'], move: ['困ったとき', '頼む・質問'], hobby: ['気持ち', '自分'] };
  const s = new Set(['つなぐ']);
  (p.purp || []).forEach(k => (m[k] || []).forEach(x => s.add(x)));
  return [...s];
}

/* ---------- Day 0 / Day 90 diagnosis ---------- */
export const FAKES = ['la brimelle', 'le chordant', 'voutrer', 'la fanoise', 'le pétuchon', 'grillir'];
export interface DxWord { fr: string; real: 0 | 1 }
/** 10 real words from each frequency band + 6 made-up words */
export function dxWords(): DxWord[] {
  const pick = (a: number, b: number, n: number) => shuffle(WORDS.slice(a, b).filter(w => !/[|]/.test(w.fr))).slice(0, n);
  return shuffle([
    ...pick(0, 300, 10).map(w => ({ fr: w.fr, real: 1 as const })),
    ...pick(300, 1000, 10).map(w => ({ fr: w.fr, real: 1 as const })),
    ...pick(1000, 2200, 10).map(w => ({ fr: w.fr, real: 1 as const })),
    ...FAKES.map(f => ({ fr: f, real: 0 as const })),
  ]);
}
export const dxListenQuestions = () => shuffle(MEAN.slice(0, 90)).slice(0, 10);
export function dxScore(words: DxWord[], known: Record<string, boolean>, listenOk: number): Score {
  const real = words.filter(w => w.real), fake = words.filter(w => !w.real);
  const kr = real.filter(w => known[w.fr]).length / real.length, kf = fake.filter(w => known[w.fr]).length / fake.length;
  return { vocab: Math.max(0, Math.round((kr - kf * 0.5) * 100)), listen: listenOk * 10 };
}
export function startDayFor(sc: Score) {
  if (sc.vocab >= 65 && sc.listen >= 70) return 31;
  if (sc.vocab >= 35 || sc.listen >= 60) return 8;
  return 1;
}
/** New course from a Day 0 diagnosis. keepDays: progress kept when the diagnosis is redone. */
export function createCourse(sc: Score, profile: Profile, keepDays?: Record<number, CourseDay>) {
  const startDay = startDayFor(sc), old = ST.course;
  ST.course = { start: old && keepDays ? old.start : todayKey(), startDay, profile, dx: sc, days: keepDays || {} };
  for (let d = 1; d < startDay; d++) {
    if (!(ST.course.days[d] && ST.course.days[d].done)) ST.course.days[d] = { t: { rev: 0, lis: 0, spk: 0, memo: 0 }, done: true, skipped: true, memo: '' };
  }
  save();
  return startDay;
}

/* ---------- role plays (month 3) ---------- */
/** lines = indexes into MEAN */
export const ROLES = [
  { t: 'はじめての人に自己紹介', d: '名前・出身・仕事・家族・趣味を1分で。相手に質問も返します。', lines: [77, 78, 79, 20, 21, 25] },
  { t: 'カフェで注文する', d: '席に着いて、注文して、お会計まで。', lines: [107, 94, 109, 84, 106, 91] },
  { t: '週末の話をする', d: '先週末にしたこと、今週末の予定を話します。', lines: [59, 60, 56, 57, 36, 46] },
  { t: '道をたずねる', d: '駅への行き方と時間をたずね、聞き返しも使います。', lines: [70, 86, 87, 0, 1, 7] },
  { t: '困ったことを伝える', d: '体調や忘れ物など、助けを求める場面。', lines: [113, 123, 112, 111, 114, 125] },
  { t: '好きなものを語る', d: '好きな料理・場所・音楽について、理由も添えて。', lines: [34, 50, 36, 37, 42, 45] },
];
