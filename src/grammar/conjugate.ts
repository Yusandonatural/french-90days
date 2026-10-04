// French grammar engine: the three forms (passé composé / venir de / aller),
// present tense for je, and negation.
import { VOW, type Verb, type VerbEx } from '../data';
import { cap } from '../util/dom';
import { placeAdv, placeNegAdv, type Adverb } from './adverbs';

export type Subj = 'je' | 'tu' | 'il' | 'elle' | 'on' | 'nous' | 'vous' | 'ils' | 'elles';
/** pc = passé composé, vd = venir de, al = aller + inf */
export type FormKey = 'pc' | 'vd' | 'al';
export type NegFormKey = 'pcn' | 'aln';

export const FORMS: Record<FormKey | NegFormKey, { ja: string; hint: string; cls: string }> = {
  pc: { ja: '複合過去', hint: '〜した', cls: 'k-pc' },
  vd: { ja: '直近過去', hint: '〜したばかり', cls: 'k-vd' },
  al: { ja: '近接未来', hint: 'これから〜する', cls: 'k-al' },
  pcn: { ja: '複合過去の否定', hint: '〜しなかった', cls: 'k-pc' },
  aln: { ja: '近接未来の否定', hint: 'これから〜しない', cls: 'k-al' },
};
export const FKEYS: FormKey[] = ['pc', 'vd', 'al'];
export const SUBJ: { k: Subj; ja: string }[] = [{ k: 'je', ja: '私は' }, { k: 'on', ja: '私たちは' }, { k: 'tu', ja: '君は' }];
export const SJ: Record<string, string> = Object.assign({ il: '彼は', elle: '彼女は' }, Object.fromEntries(SUBJ.map(s => [s.k, s.ja])));
export const ALLS: Subj[] = SUBJ.map(s => s.k);

type Table = Record<Subj, string>;
export const CONJ: Record<'avoir' | 'etre' | 'aller' | 'venir', Table> = {
  avoir: { je: 'ai', tu: 'as', il: 'a', elle: 'a', on: 'a', nous: 'avons', vous: 'avez', ils: 'ont', elles: 'ont' },
  etre: { je: 'suis', tu: 'es', il: 'est', elle: 'est', on: 'est', nous: 'sommes', vous: 'êtes', ils: 'sont', elles: 'sont' },
  aller: { je: 'vais', tu: 'vas', il: 'va', elle: 'va', on: 'va', nous: 'allons', vous: 'allez', ils: 'vont', elles: 'vont' },
  venir: { je: 'viens', tu: 'viens', il: 'vient', elle: 'vient', on: 'vient', nous: 'venons', vous: 'venez', ils: 'viennent', elles: 'viennent' },
};
export const REFL: Table = { je: 'me', tu: 'te', il: 'se', elle: 'se', on: 'se', nous: 'nous', vous: 'vous', ils: 'se', elles: 'se' };
/** default past-participle agreement */
export const AGR: Table = { je: '', tu: '', il: '', elle: 'e', on: '', nous: 's', vous: 's', ils: 's', elles: 'es' };
/** every agreement accepted when checking answers */
export const AGR_ALL: Record<Subj, string[]> = { je: ['', 'e'], tu: ['', 'e'], il: [''], elle: ['e'], on: ['', 's', 'e', 'es'], nous: ['s', 'es'], vous: ['', 'e', 's', 'es'], ils: ['s'], elles: ['es'] };

export const allowed = (v: Verb): FormKey[] => FKEYS.filter(f => !(f === 'vd' && v.noVd) && !(f === 'al' && v.noAl));
export const subjFor = (v: Verb): Subj[] => (v.I || v.T) ? ['il'] : ALLS;

export function subjWord(s: Subj, w: string) { return (s === 'je' && VOW.test(w)) ? "j'" + w : s + ' ' + w; }
export function refl(s: Subj, next: string) {
  const p = REFL[s];
  return (['me', 'te', 'se'].includes(p) && VOW.test(next)) ? p[0] + "'" + next : p + ' ' + next;
}
export function agree(pp: string, a: string) { if (pp.endsWith('s') && a.startsWith('s')) a = a.slice(1); return pp + a; }

export interface BuildOpts { obj?: false; sentence?: false; noSubj?: boolean | number; agr?: string | null; adv?: Adverb }

export function build(s: Subj, v: VerbEx, f: FormKey, o: BuildOpts = {}) {
  const obj = (o.obj === false || !v.obj) ? '' : ' ' + v.obj;
  let t: string;
  if (f === 'pc') {
    const w = CONJ[v.etre ? 'etre' : 'avoir'][s];
    const part = agree(v.pp, v.etre ? (o.agr != null ? o.agr : AGR[s]) : '');
    const core = v.R ? (o.noSubj ? '' : s + ' ') + refl(s, w) : (o.noSubj ? w : subjWord(s, w));
    t = placeAdv(core, part + obj, o.adv);
  } else {
    const aux = f === 'vd' ? 'venir' : 'aller', w = CONJ[aux][s];
    const h = o.noSubj ? w : subjWord(s, w);
    const inf = v.R ? refl(s, v.inf) : v.inf;
    // venir de + reflexive keeps "de" (de m'asseoir)
    const de = f === 'vd' ? (v.R ? 'de ' : (VOW.test(v.inf) ? "d'" : 'de ')) : '';
    t = placeAdv(h, de + inf + obj, o.adv);
  }
  return o.sentence === false ? t : cap(t) + '.';
}

/** A start adverb may also go at the end, and an end adverb at the start. */
export function advAlts(adv?: Adverb): (Adverb | undefined)[] {
  if (!adv || (adv.pos !== 'start' && adv.pos !== 'end')) return [adv];
  return [adv, { ...adv, pos: adv.pos === 'start' ? 'end' : 'start' }];
}

/** All correct answers (every agreement variant for être verbs, both places for start / end adverbs). */
export function accepted(s: Subj, v: VerbEx, f: FormKey, o: BuildOpts = {}) {
  const agrs = (f === 'pc' && v.etre) ? AGR_ALL[s] : [o.agr];
  return advAlts(o.adv).flatMap(adv => agrs.map(a => build(s, v, f, Object.assign({}, o, { agr: a, adv }))));
}

export function notesOf(v: Verb) {
  const n: string[] = [];
  if (v.R) n.push('再帰動詞：se が主語に合わせて me / te / se / nous / vous に変わります。複合過去は être。');
  else if (v.etre) n.push('複合過去は être を使い、過去分詞が主語の性・数に一致します。');
  if (v.I) n.push('非人称動詞：主語はいつも il です。');
  if (v.T) n.push('人の一生にかかわる動詞なので、主語は il で練習します。');
  if (v.noVd) n.push('venir de の形は会話ではあまり使いません（練習では出題しません）。');
  if (v.noAl) n.push('aller ＋ 不定詞の形はあまり使いません（練習では出題しません）。');
  return n;
}

/* ---------- present tense (je) ---------- */
export const PRES_IRR: Record<string, string> = {'être':'suis',avoir:'ai',faire:'fais',dire:'dis',pouvoir:'peux',aller:'vais',voir:'vois',savoir:'sais',vouloir:'veux',venir:'viens',devoir:'dois',prendre:'prends',mettre:'mets',croire:'crois',attendre:'attends',comprendre:'comprends',partir:'pars',sortir:'sors',entendre:'entends','connaître':'connais',boire:'bois','écrire':'écris',lire:'lis','répondre':'réponds',tenir:'tiens',rendre:'rends',sentir:'sens',revenir:'reviens',devenir:'deviens',perdre:'perds',vivre:'vis',dormir:'dors',acheter:'achète',payer:'paie',essayer:'essaie',suivre:'suis',ouvrir:'ouvre',apprendre:'apprends',recevoir:'reçois',envoyer:'envoie',courir:'cours',descendre:'descends',promettre:'promets',nettoyer:'nettoie',conduire:'conduis',lever:'lève',promener:'promène',asseoir:'assieds',souvenir:'souviens','inquiéter':'inquiète',vendre:'vends',construire:'construis','éteindre':'éteins',traduire:'traduis','répéter':'répète',emmener:'emmène',amener:'amène','récupérer':'récupère','découvrir':'découvre',offrir:'offre',rire:'ris',sourire:'souris',rappeler:'rappelle',appeler:'appelle',peindre:'peins',cueillir:'cueille',servir:'sers'};
export const PRES_IL: Record<string, string> = { falloir: 'faut', pleuvoir: 'pleut', neiger: 'neige', 'naître': 'naît', mourir: 'meurt' };
/** subject used for "my own" sentences: je, or il for impersonal / il-only verbs */
export const subj0 = (v: Verb): Subj => (v.I || v.T) ? 'il' : 'je';
export function presWord(v: Verb) {
  if (PRES_IL[v.inf]) return PRES_IL[v.inf];
  const k = v.inf;
  if (PRES_IRR[k]) return PRES_IRR[k];
  if (k.endsWith('er')) return k.slice(0, -2) + 'e';
  if (k.endsWith('ir')) return k.slice(0, -2) + 'is';
  return k;
}
export function presFr(v: VerbEx, adv?: Adverb) {
  const s = subj0(v), w = presWord(v);
  const core = v.R ? s + ' ' + refl(s, w) : subjWord(s, w);
  return cap(placeAdv(core, v.obj || '', adv)) + '.';
}

/* ---------- negation ---------- */
/** verbs whose "de / un …" object is a preposition, not an article → keep it in the negative */
export const NEG_KEEP = new Set(['jouer','se souvenir','revenir','sortir','descendre','tomber','parler',"s'occuper",'rêver','discuter','guérir','venir','rentrer','partir','arriver','être','devenir','rester',"s'inquiéter",'se tromper',"s'arrêter",'penser','pleurer','crier','rire','sourire']);
export function negObj(v: Verb, obj: string) {
  if (!obj || NEG_KEEP.has(v.key)) return obj;
  if (/^(un peu|une heure|une semaine)/.test(obj)) return obj;
  if (/^de l'/.test(obj)) return "d'" + obj.slice(5);
  const m = obj.match(/^(un|une|des|du|de la) (.+)$/);
  if (m) return (VOW.test(m[2]) ? "d'" : 'de ') + m[2];
  return obj;
}
const neW = (w: string) => VOW.test(w) ? "n'" + w : 'ne ' + w;
/** f: 'pc' | 'al' | 'pr' (present). venir de has no negative. */
export function buildNeg(s: Subj, v: VerbEx, f: 'pc' | 'al' | 'pr', o: BuildOpts = {}) {
  const raw = o.obj === false ? '' : (v.obj || ''); const obj = raw ? ' ' + negObj(v, raw) : '';
  let t: string;
  if (f === 'pc') {
    const w = CONJ[v.etre ? 'etre' : 'avoir'][s];
    const part = agree(v.pp, v.etre ? (o.agr != null ? o.agr : AGR[s]) : '');
    t = s + ' ' + (v.R ? 'ne ' + refl(s, w) : neW(w)) + ' pas ' + part + obj;
  } else if (f === 'al') {
    const w = CONJ.aller[s];
    t = s + ' ' + neW(w) + ' pas ' + (v.R ? refl(s, v.inf) : v.inf) + obj;
  } else {
    const w = presWord(v);
    t = s + ' ' + (v.R ? 'ne ' + refl(s, w) : neW(w)) + ' pas' + obj;
  }
  // a "mid" adverb becomes its negative partner (déjà → pas encore)
  t = placeNegAdv(t, o.adv && o.adv.pos === 'mid' ? o.adv.neg : o.adv);
  return o.sentence === false ? t : cap(t) + '.';
}
/** spoken style without "ne" (J'ai pas fini.) */
export function colloq(t: string) {
  return t.replace(/\bne /, '').replace(/\bn'/, '').replace(/^(je|Je) ([aeéèêiîoôuh])/, (_m, a: string, b: string) => (a[0] === 'J' ? "J'" : "j'") + b);
}
export function acceptedNeg(s: Subj, v: VerbEx, f: 'pc' | 'al' | 'pr', adv?: Adverb) {
  const vs = (f === 'pc' && v.etre) ? AGR_ALL[s] : [null];
  const l = advAlts(adv).flatMap(ad => vs.map(a => buildNeg(s, v, f, { agr: a, adv: ad })));
  return [...l, ...l.map(colloq)];
}

/* ---------- answer checking ---------- */
export const norm = (s: string) => s.toLowerCase().replace(/[’`´]/g, "'").replace(/\s*,\s*/g, ' ').replace(/\s*'\s*/g, "'").replace(/[.!?。]+\s*$/, '').replace(/\s+/g, ' ').trim();
export const deacc = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
export type CheckResult = 'empty' | 'ok' | 'accent' | 'ng';
export function check(input: string, acc: string[]): CheckResult {
  const a = norm(input);
  if (!a) return 'empty';
  const l = acc.map(norm);
  if (l.includes(a)) return 'ok';
  if (l.map(deacc).includes(deacc(a))) return 'accent';
  return 'ng';
}
