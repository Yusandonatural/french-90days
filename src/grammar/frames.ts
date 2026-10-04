// Word → verb sentence frames for the fill-in-the-blank word questions (type C).
import { V, VOW, type VerbEx, type Word } from '../data';
import { adjJa } from './ja';

/** [verb, preposition, suffix, ru template, ta template]; {w} = first Japanese gloss */
export type Frame = [string, string, string, string, string];
const F = (v: string, p: string, suf: string, ru: string, ta: string): Frame => [v, p, suf, ru, ta];

export const FRAMES: Record<string, Frame[]> = {
  food: [F('acheter','','','{w}を買う','{w}を買った'),F('manger','','','{w}を食べる','{w}を食べた'),F('goûter','','','{w}を味見する','{w}を味見した')],
  drink: [F('boire','','','{w}を飲む','{w}を飲んだ'),F('commander','','','{w}を注文する','{w}を注文した'),F('acheter','','','{w}を買う','{w}を買った')],
  people: [F('appeler','','','{w}に電話する','{w}に電話した'),F('attendre','','','{w}を待つ','{w}を待った'),F('aider','','','{w}を手伝う','{w}を手伝った'),F('voir','','','{w}に会う','{w}に会った')],
  place: [F('aller','à','','{w}に行く','{w}に行った'),F('chercher','','','{w}を探す','{w}を探した')],
  vehicle: [F('prendre','','','{w}に乗る','{w}に乗った'),F('attendre','','','{w}を待つ','{w}を待った'),F('rater','','','{w}に乗り遅れる','{w}に乗り遅れた')],
  travel: [F('chercher','','','{w}を探す','{w}を探した'),F('oublier','','','{w}を忘れる','{w}を忘れた'),F('vérifier','','','{w}を確認する','{w}を確認した')],
  home: [F('nettoyer','','','{w}を掃除する','{w}を掃除した'),F('montrer','','','{w}を見せる','{w}を見せた')],
  furniture: [F('acheter','','','{w}を買う','{w}を買った'),F('réparer','','','{w}を修理する','{w}を修理した'),F('nettoyer','','','{w}を掃除する','{w}を掃除した')],
  object: [F('chercher','','','{w}を探す','{w}を探した'),F('perdre','','','{w}をなくす','{w}をなくした'),F('trouver','','','{w}を見つける','{w}を見つけた'),F('oublier','','','{w}を忘れる','{w}を忘れた'),F('utiliser','','','{w}を使う','{w}を使った')],
  clothes: [F('porter','','','{w}を身につける','{w}を身につけた'),F('acheter','','','{w}を買う','{w}を買った'),F('essayer','','','{w}を試着する','{w}を試着した')],
  body: [F('avoir','mal à','','{w}が痛くなる','{w}が痛かった'),F('montrer','',' au médecin','{w}を医者に見せる','{w}を医者に見せた')],
  health: [F('parler','de',' au médecin','医者に{w}のことを話す','医者に{w}のことを話した')],
  nature: [F('voir','','','{w}を見る','{w}を見た'),F('aimer','','','{w}を気に入る','{w}を気に入った')],
  animal: [F('voir','','','{w}を見る','{w}を見た'),F('aimer','','','{w}を気に入る','{w}を気に入った'),F('dessiner','','','{w}の絵を描く','{w}の絵を描いた')],
  plant: [F('planter','','','{w}を植える','{w}を植えた'),F('arroser','','','{w}に水をやる','{w}に水をやった'),F('voir','','','{w}を見る','{w}を見た')],
  work: [F('oublier','','','{w}を忘れる','{w}を忘れた'),F('préparer','','','{w}の準備をする','{w}の準備をした'),F('vérifier','','','{w}を確認する','{w}を確認した')],
  school: [F('oublier','','','{w}を忘れる','{w}を忘れた'),F('préparer','','','{w}の準備をする','{w}の準備をした')],
  hobby: [F('aimer','','','{w}を気に入る','{w}を気に入った'),F('essayer','','','{w}をやってみる','{w}をやってみた'),F('découvrir','','','{w}に出会う','{w}に出会った')],
  tech: [F('utiliser','','','{w}を使う','{w}を使った'),F('chercher','','','{w}を探す','{w}を探した')],
  idea: [F('parler','de','','{w}について話す','{w}について話した'),F('penser','à','','{w}のことを考える','{w}のことを考えた')],
  adj: [F('être','','','','')],
};

/** first Japanese gloss (before ・ or （) */
export const jw = (w: Pick<Word, 'ja'>) => w.ja.split(/[・（(]/)[0];

/** preposition + noun with contractions (à le → au, de les → des …) */
export function applyPrep(p: string, fr: string): string {
  if (!p) return fr;
  if (p === 'mal à') return 'mal ' + applyPrep('à', fr);
  if (p === 'à') { if (/^le /.test(fr)) return 'au ' + fr.slice(3); if (/^les /.test(fr)) return 'aux ' + fr.slice(4); return 'à ' + fr; }
  if (p === 'de') { if (/^le /.test(fr)) return 'du ' + fr.slice(3); if (/^les /.test(fr)) return 'des ' + fr.slice(4); return (VOW.test(fr) && !/^l'/.test(fr) ? "d'" : 'de ') + fr; }
  return p + ' ' + fr;
}

/** The verb (with the word as its object) to feed into build / buildNeg / jaOf. */
export function wordVerb(w: Word, fr: Frame): { dv: VerbEx; phrase: string } {
  const base = V[fr[0]];
  let ru: string, ta: string;
  if (fr[0] === 'être') { const a = adjJa(w); ru = a.ru; ta = a.ta; }
  else { ru = fr[3].replace('{w}', jw(w)); ta = fr[4].replace('{w}', jw(w)); }
  const phrase = applyPrep(fr[1], w.fr);
  return { dv: Object.assign({}, base, { obj: phrase + (fr[2] || ''), ru, ta, now: '', exi: 0 }), phrase };
}
