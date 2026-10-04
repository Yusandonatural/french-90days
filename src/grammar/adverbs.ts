// Frequent adverbs, and where they go in each form.
//   mid   : between the auxiliary and the verb  — J'ai déjà fini. / Je vais vraiment partir. / Je viens juste d'arriver.
//           after the verb in the present         — Je suis souvent en retard.
//   start : first, with a comma                   — Heureusement, j'ai fini.
//   end   : after the object                      — Je vais partir tout de suite.
//   neg   : replaces "pas" in a negative sentence — Je n'ai pas encore fini. / Je ne vais jamais partir.
//           "pas … non plus" keeps pas and adds the second part at the end.
import rows from '../data/adverbs.tsv';
import { rnd } from '../util/dom';

/** p = passé composé, v = venir de, a = aller + inf, r = present */
export type AdvForm = 'p' | 'v' | 'a' | 'r';
export type AdvPos = 'mid' | 'start' | 'end' | 'neg';
export interface Adverb {
  fr: string; pos: AdvPos; forms: AdvForm[];
  /** Japanese per form */
  ja: Record<AdvForm, string>;
  /** the matching negative (déjà → pas encore), used when a sentence is made negative */
  neg?: Adverb;
  /** only with subject on (ensemble) */
  on: boolean;
  /** Japanese "は" becomes "も" (aussi, non plus) */
  mo: boolean;
  /** Japanese past negative as 〜ていない (pas encore → まだ終わっていない) */
  teinai: boolean;
}

function parseJa(s: string): Record<AdvForm, string> {
  if (!s.includes('=')) return { p: s, v: s, a: s, r: s };
  const m = Object.fromEntries(s.split(';').map(x => x.split('=')));
  return { p: m.p || '', v: m.v || '', a: m.a || '', r: m.r || '' };
}
export const ADVERBS: Adverb[] = rows.map(r => ({
  fr: r.fr, pos: r.pos as AdvPos, forms: r.forms.split('') as AdvForm[], ja: parseJa(r.ja),
  on: r.flags.includes('on'), mo: r.flags.includes('mo'), teinai: r.flags.includes('teinai'),
}));
const NEG = ADVERBS.filter(a => a.pos === 'neg');
rows.forEach((r, i) => { if (r.neg) ADVERBS[i].neg = NEG.find(n => n.fr === r.neg); });

/** form key of the grammar engine → adverb form letter */
export const advForm = (f: string): AdvForm => (({ pc: 'p', pcn: 'p', vd: 'v', al: 'a', aln: 'a', pr: 'r', prn: 'r' }) as Record<string, AdvForm>)[f];

export interface PickOpts { neg?: boolean; subj?: string; pos?: AdvPos[]; rand?: () => number }
/** Adverbs usable in this form (negative sentences: neg adverbs plus start / end ones). */
export function advCandidates(form: AdvForm, o: PickOpts = {}) {
  return ADVERBS.filter(a => a.forms.includes(form)
    && (o.neg ? a.pos !== 'mid' : a.pos !== 'neg')
    && (!a.on || o.subj === 'on')
    && (!o.pos || o.pos.includes(a.pos)));
}
export function pickAdv(form: AdvForm, o: PickOpts = {}): Adverb | undefined {
  const c = advCandidates(form, o);
  if (!c.length) return undefined;
  return o.rand ? c[Math.floor(o.rand() * c.length)] : rnd(c);
}
/** small deterministic generator, so the player shows the same adverb for a line every time */
export function seeded(seed: number) {
  let a = seed | 0;
  return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

/** Put an adverb into an affirmative sentence. head = up to and including the auxiliary (or the present verb), tail = the rest. */
export function placeAdv(head: string, tail: string, adv?: Adverb) {
  if (!adv) return head + (tail ? ' ' + tail : '');
  if (adv.pos === 'mid') return head + ' ' + adv.fr + (tail ? ' ' + tail : '');
  if (adv.pos === 'end') return head + (tail ? ' ' + tail : '') + ' ' + adv.fr;
  return adv.fr + ', ' + head + (tail ? ' ' + tail : '');
}
/** Negative sentence: neg adverbs replace "pas"; start / end ones go around it. */
export function placeNegAdv(t: string, adv?: Adverb) {
  if (!adv) return t;
  if (adv.pos === 'neg') {
    const [p, end] = adv.fr.split(' … ');
    return t.replace(/ pas( |$)/, ' ' + p + '$1') + (end ? ' ' + end : '');
  }
  if (adv.pos === 'end') return t + ' ' + adv.fr;
  return adv.fr + ', ' + t;
}

/** Japanese: subject + adverb + predicate, or "幸い、" + sentence for start adverbs. */
export function jaWithAdv(subj: string, rest: string, adv: Adverb | undefined, form: AdvForm) {
  if (!adv) return subj + rest;
  const j = adv.ja[form];
  if (adv.mo) return (subj ? subj.replace(/は$/, 'も') : 'それに、') + rest;
  if (adv.pos === 'start') return j + '、' + subj + rest;
  // 私はこれから決して食べない (after これから reads more naturally)
  if (rest.startsWith('これから')) return subj + 'これから' + j + rest.slice(4);
  return subj + j + rest;
}
