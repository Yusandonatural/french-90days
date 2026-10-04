// Loads the data files (converted to JSON at build time) into the shapes the app uses.
import verbRows from './verbs.tsv';
import exampleRows from './examples.tsv';
import meaningRows from './meanings.tsv';
import themeRows from './words.txt?themes';

export const VOW = /^[aeéèêiîoôuh]/i;

export interface Example { obj: string; ru: string; ta: string; now: string; exi: number }
export interface Verb {
  key: string; inf: string; pp: string; obj: string; ru: string; ta: string;
  /** reflexive */ R: boolean; /** passé composé with être */ etre: boolean;
  /** impersonal */ I: boolean; /** il only */ T: boolean; noVd: boolean; noAl: boolean;
  idx: number; stage: number; ex: Example[];
  now?: string; exi?: number;
}
/** A verb with one of its examples applied (what the grammar functions take). */
export type VerbEx = Verb & Partial<Example>;

export const VERBS: Verb[] = verbRows.map((r, i) => {
  const fl = r.flags, R = fl.includes('R');
  const key = R ? (VOW.test(r.inf) ? "s'" + r.inf : 'se ' + r.inf) : r.inf;
  return {
    key, inf: r.inf, pp: r.pp, obj: r.obj, ru: r.ru, ta: r.ta, R,
    etre: fl.includes('E') || R, I: fl.includes('I'), T: fl.includes('T'),
    noVd: fl.includes('N'), noAl: fl.includes('A'), idx: i, stage: Math.floor(i / 20), ex: [],
  };
});
export const V: Record<string, Verb> = Object.fromEntries(VERBS.map(v => [v.key, v]));

/** Present-state Japanese for each verb's default example (ex[0]). */
const JANOW: Record<string, string> = {'être':'遅れている',avoir:'お腹が空いている',savoir:'答えを知っている',vouloir:'出発したい',aimer:'この映画が好きだ',croire:'この話を信じている',penser:'この計画のことを考えている','connaître':'ポールを知っている',rester:'家にいる',porter:'上着を着ている',vivre:'パリで暮らしている',habiter:'リヨンに住んでいる','se souvenir':'その日のことを覚えている',"s'inquiéter":'心配している','se sentir':'前より気分がいい',adorer:'このコンサートが大好きだ',pleuvoir:'雨が降っている',neiger:'雪が降っている',attendre:'バスを待っている',chercher:'部屋を探している'};

VERBS.forEach(v => { v.ex = [{ obj: v.obj, ru: v.ru, ta: v.ta, now: JANOW[v.key] || '', exi: 0 }]; });
exampleRows.forEach(r => {
  const v = V[r.verb_key];
  if (v) v.ex.push({ obj: r.obj, ru: r.ru, ta: r.ta, now: r.now || '', exi: v.ex.length });
});

export const withEx = (v: Verb, i: number): VerbEx => Object.assign({}, v, v.ex[i]);
export const exOf = (v: Verb): VerbEx => withEx(v, Math.floor(Math.random() * v.ex.length));
export const NEX = VERBS.reduce((a, v) => a + v.ex.length, 0);
/** number of stages (20 verbs each) */
export const NST = 10;
export const stageVerbs = (i: number) => VERBS.filter(v => v.stage === i);

/* ---------- words ---------- */
export interface Theme { key: string; emo: string; title: string; fk: string; words: Word[] }
export interface Word { id: string; fr: string; ja: string; g: string; ru: string; ta: string; th: Theme }

export const THEMES: Theme[] = [];
/** all words in file order */
export const WORDS: Word[] = [];
themeRows.forEach(t => {
  const th: Theme = { key: t.key, emo: t.emo, title: t.title, fk: t.fk, words: [] };
  THEMES.push(th);
  t.words.forEach(([fr, ja, g, ru, ta]) => { const w = { id: fr, fr, ja, g, ru, ta, th }; th.words.push(w); WORDS.push(w); });
});
export const TORDER = ['phrase','expr','food','drink','people','time','num','place','city','vehicle','travel','home','furniture','object','life','kitchen','clothes','body','health','work','school','hobby','nature','animal','plant','tech','idea','society','adjstate','adjdesc','adv','country','verb2'];
THEMES.sort((a, b) => TORDER.indexOf(a.key) - TORDER.indexOf(b.key));

/* ---------- meanings (「言いたいこと」) ---------- */
export interface Meaning { i: number; cat: string; ja: string; fr: string; day: number }
export const MEAN: Meaning[] = meaningRows.map((r, i) => ({ i, cat: r.category, ja: r.ja, fr: r.fr, day: 1 + Math.floor(i * 65 / 130) }));
