// Japanese generation: affirmative / negative translations of the three forms.
import type { VerbEx, Word } from '../data';
import { SJ, subj0, type FormKey, type Subj } from './conjugate';

/** mk = optional time word (昨日 …) */
export function jaOf(s: Subj, v: VerbEx, f: FormKey, mk?: string) {
  const S = v.I ? '' : SJ[s];
  if (f === 'pc') return (mk ? mk + '、' : '') + S + v.ta + '。';
  if (f === 'vd') return S + (mk || '') + v.ta + 'ばかりだ。';
  return mk ? mk + '、' + S + v.ru + '。' : S + 'これから' + v.ru + '。';
}

/** true when ru and ta are the same predicate (食べる/食べた), not 病気になる/病気だった */
export function samePred(r: string, t: string) {
  if (!t || !r) return false;
  let i = 0;
  while (i < r.length && i < t.length && r[i] === t[i]) i++;
  return i >= r.length - 1;
}
export const GODAN_RU = /(なる|入る|帰る|知る|走る|切る|減る|乗る|座る|戻る|取る|作る|送る|売る|降る|登る|眠る|握る|困る|がる|まる|わる|守る|渡る|頑張る|怒る|太る|散る|回る|残る|通る|触る|配る|塗る|掘る|謝る|断る|祈る|わかる|かかる|やる|しゃべる|蹴る|返る|当たる|移る|映る|光る|見つかる|助かる|める)$/;

/** dictionary form → negative (食べる → 食べない). null when it can't be converted. */
export function jNeg(r: string, t?: string): string | null {
  if (!r || /ない$/.test(r)) return null;
  if (/てくる$/.test(r)) return r.slice(0, -2) + 'こない';
  if (/来る$/.test(r)) return r.slice(0, -1) + 'ない';
  if (/する$/.test(r)) return r.slice(0, -2) + 'しない';
  if (/ある$/.test(r)) return r.slice(0, -2) + 'ない';
  if (/いい$/.test(r)) return r.slice(0, -2) + 'よくない';
  if (/だ$/.test(r)) return r.slice(0, -1) + 'ではない';
  if (/たい$/.test(r)) return r.slice(0, -1) + 'くない';
  if (/る$/.test(r)) {
    if (/[てで]いる$/.test(r)) return r.slice(0, -1) + 'ない';
    let godan: boolean;
    if (samePred(r, t || '')) godan = /った$/.test(t!) && !/ていた$/.test(t!);
    else godan = GODAN_RU.test(r) && !/める$/.test(r);
    return r.slice(0, -1) + (godan ? 'らない' : 'ない');
  }
  const map: Record<string, string> = { 'う': 'わ', 'く': 'か', 'ぐ': 'が', 'す': 'さ', 'つ': 'た', 'ぬ': 'な', 'ぶ': 'ば', 'む': 'ま' };
  const last = r.slice(-1);
  if (map[last]) return r.slice(0, -1) + map[last] + 'ない';
  if (/い$/.test(r)) return r.slice(0, -1) + 'くない';
  return null;
}

/** past form → negative past (食べた → 食べなかった) */
export function jNegPast(t: string, r: string): string | null {
  if (!t || /なかった$/.test(t)) return null;
  if (/[てで]いた$/.test(t)) return t.slice(0, -1) + 'なかった';
  if (r && samePred(r, t) && !/い$/.test(r)) { const n = jNeg(r, t); return n ? n.slice(0, -2) + 'なかった' : null; }
  if (/かった$/.test(t)) return t.slice(0, -3) + 'くなかった';
  if (/だった$/.test(t)) return t.slice(0, -3) + 'ではなかった';
  const n = jNeg(r, t);
  return n ? n.slice(0, -2) + 'なかった' : null;
}

export function jaNegOf(s: Subj, v: VerbEx, f: FormKey): string | null {
  const S = v.I ? '' : SJ[s];
  if (f === 'pc') { const n = jNegPast(v.ta, v.ru); return n ? S + n + '。' : null; }
  const n = jNeg(v.ru, v.ta);
  return n ? S + 'これから' + n + '。' : null;
}

export function presJa(v: VerbEx) {
  const S = v.I ? '' : (subj0(v) === 'il' ? '彼は' : '私は');
  return S + (v.now || v.ru) + '。';
}

/** adjective word → { ru: 〜くなる / 〜になる, ta: 〜かった / 〜だった } */
export function adjJa(w: Pick<Word, 'ja' | 'ru' | 'ta'>) {
  if (w.ru) return { ru: w.ru, ta: w.ta };
  const j = w.ja;
  if (/いい$/.test(j)) return { ru: j.slice(0, -2) + 'よくなる', ta: j.slice(0, -2) + 'よかった' };
  if (/い$/.test(j)) return { ru: j.slice(0, -1) + 'くなる', ta: j.slice(0, -1) + 'かった' };
  const st = /[なの]$/.test(j) ? j.slice(0, -1) : j;
  return { ru: st + 'になる', ta: st + 'だった' };
}
