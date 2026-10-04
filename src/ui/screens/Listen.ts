// 聞く: the je player (present → passé composé → venir de → aller) and the form quiz.
import { $, $$, esc, rnd, focusInView } from '../../util/dom';
import { NST, VERBS, exOf, stageVerbs, withEx, type VerbEx } from '../../data';
import { FKEYS, FORMS, allowed, build, buildNeg, presFr, subj0, subjFor } from '../../grammar/conjugate';
import { jaNegOf, jaOf, presJa, presNegJa } from '../../grammar/ja';
import { ADVERBS, advForm, pickAdv, seeded } from '../../grammar/adverbs';
import { PLAYER_KEY, ST } from '../../store/state';
import { pickVerb } from '../../engine/pick';
import { curDay, dayVerbs, dvStart } from '../../engine/course';
import { cancelSpeech, hasTTS, holdWake, releaseWake, setSpeakInterrupt, speak, speakP } from '../speech';
import { go, onShow } from '../router';
import { rec } from './Drill';

const PFORMS = [{ f: 'pr', ja: '現在形', cls: 'k-pr' }, { f: 'pc', ja: '複合過去', cls: 'k-pc' }, { f: 'vd', ja: '直近過去', cls: 'k-vd' }, { f: 'al', ja: '近接未来', cls: 'k-al' }] as const;
interface Line { f: string; ja: string; cls: string; fr: string; jp: string; ok: boolean }

type Range = number | 'day' | 'all';
interface PlayerSettings { range: Range; i: number; jaMode: 'off' | 'after' | 'before'; pause: number; rate: number; rep: number; exMode: 'all' | 'first'; neg: 'aff' | 'neg' | 'both' }
const P: PlayerSettings & { line: number; playing: boolean; token: number } =
  { range: ST.stage, i: 0, line: 0, playing: false, token: 0, jaMode: 'after', pause: 2000, rate: .9, rep: 1, exMode: 'all', neg: 'aff' };
try { const r = localStorage.getItem(PLAYER_KEY); if (r) Object.assign(P, JSON.parse(r), { playing: false, token: 0 }); } catch { /* ignore */ }
const savePl = () => {
  try { localStorage.setItem(PLAYER_KEY, JSON.stringify({ range: P.range, i: P.i, jaMode: P.jaMode, pause: P.pause, rate: P.rate, rep: P.rep, exMode: P.exMode, neg: P.neg })); } catch { /* ignore */ }
};

/** The lines spoken for one example, per the 肯定・否定 setting. ok = false: rarely used, skipped. */
function lines(v: VerbEx): Line[] {
  const s = subj0(v), al = allowed(v);
  // every line has an adverb; the same one each time this example is shown
  const adv = (f: string, k: number) => pickAdv(advForm(f), { subj: s, neg: f.endsWith('n'), rand: seeded(v.idx * 1000 + (v.exi || 0) * 10 + k) });
  const aff: Line[] = PFORMS.map((p, k) => {
    const a = adv(p.f, k);
    return p.f === 'pr' ? { ...p, fr: presFr(v, a), jp: presJa(v, a), ok: true } : { ...p, fr: build(s, v, p.f, { adv: a }), jp: jaOf(s, v, p.f, undefined, a), ok: al.includes(p.f) };
  });
  if (P.neg === 'aff') return aff;
  const [a1, a2, a3] = [adv('prn', 4), adv('pcn', 5), adv('aln', 6)];
  const neg: Line[] = [
    { f: 'prn', ja: '現在形の否定', cls: 'k-pr', fr: buildNeg(s, v, 'pr', { adv: a1 }), jp: presNegJa(v, a1) || '（否定）' + presJa(v), ok: true },
    { f: 'pcn', ja: '複合過去の否定', cls: 'k-pc', fr: buildNeg(s, v, 'pc', { adv: a2 }), jp: jaNegOf(s, v, 'pc', a2) || '（否定）' + jaOf(s, v, 'pc'), ok: al.includes('pc') },
    { f: 'aln', ja: '近接未来の否定', cls: 'k-al', fr: buildNeg(s, v, 'al', { adv: a3 }), jp: jaNegOf(s, v, 'al', a3) || '（否定）' + jaOf(s, v, 'al'), ok: al.includes('al') },
  ];
  return P.neg === 'neg' ? neg : [...aff, ...neg];
}
/** 今日 = yesterday's and today's new verbs */
const plList = (): VerbEx[] => {
  const cd = (P.range === 'day' && ST.course) ? curDay() : 0;
  const vs = cd ? [...VERBS.slice(dvStart(Math.max(1, cd - 1)), dvStart(cd)), ...dayVerbs(cd)]
    : P.range === 'all' ? VERBS : stageVerbs(P.range === 'day' ? ST.stage : P.range);
  return P.exMode === 'first' ? vs.map(v => withEx(v, 0)) : vs.flatMap(v => v.ex.map((_, i) => withEx(v, i)));
};
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

async function runPlayer(tok: number) {
  holdWake();
  while (P.playing && tok === P.token) {
    const list = plList(); if (P.i >= list.length) P.i = 0;
    const v = list[P.i], ls = lines(v).filter(l => l.ok);
    if (P.line >= ls.length) { P.line = 0; P.i = (P.i + 1) % list.length; savePl(); renderPlayer(); await wait(700); continue; }
    renderPlayer();
    const it = ls[P.line];
    if (P.jaMode === 'before') { await speakP(it.jp, 'ja-JP', 1.05); if (tok !== P.token) return; await wait(P.pause || 600); if (tok !== P.token) return; }
    for (let r = 0; r < P.rep; r++) { await speakP(it.fr, 'fr-FR', P.rate); if (tok !== P.token) return; if (P.pause) await wait(P.pause); if (tok !== P.token) return; }
    if (P.jaMode === 'after') { await speakP(it.jp, 'ja-JP', 1.05); if (tok !== P.token) return; await wait(350); }
    P.line++;
  }
}
function plStart() { P.playing = true; P.token++; cancelSpeech(); runPlayer(P.token); renderPlayer(); }
function plStop() { P.playing = false; P.token++; cancelSpeech(); releaseWake(); renderPlayer(); }
function plJump(i: number, line?: number) { P.i = i; P.line = line || 0; savePl(); if (P.playing) plStart(); else renderPlayer(); }

export function renderPlayer() {
  const el = $('#player'); if (!el) return;
  $('#plRange').innerHTML = (ST.course ? `<button class="chip" aria-pressed="${P.range === 'day'}" data-r="day">今日（Day ${curDay()}）</button>` : '')
    + Array.from({ length: NST }, (_, i) => `<button class="chip" aria-pressed="${P.range === i}" data-r="${i}">${i + 1}</button>`).join('')
    + `<button class="chip" aria-pressed="${P.range === 'all'}" data-r="all">全200</button>`;
  const list = plList(); if (P.i >= list.length) P.i = 0;
  const v = list[P.i], ls = lines(v), okLs = ls.filter(l => l.ok), cur = P.playing ? okLs[P.line] : null;
  const seg = (name: string, opts: { key: string; items: [string | number, string][] }, val: unknown) =>
    `<div><p class="label">${name}</p><div class="seg" data-set="${opts.key}">${opts.items.map(([k, l]) => `<button data-val="${k}" aria-pressed="${String(val) === String(k)}">${l}</button>`).join('')}</div></div>`;
  el.innerHTML = `<div class="pl-top"><span>${P.range === 'day' ? '今日の動詞' : P.range === 'all' ? '全200語' : 'ステージ' + (P.range + 1)}　${P.i + 1} / ${list.length}</span><span>No.${v.idx + 1}　例文${v.exi! + 1}/${v.ex.length}</span></div>
   <div class="pl-verb">${esc(v.key)}</div><p class="pl-gloss">${esc(v.obj || '')}　${esc(v.ru)}</p>
   <div class="pl-lines">${ls.map(l => `<button class="pl-line ${l.cls}${l.ok ? '' : ' rare'}${cur && cur.f === l.f ? ' on' : ''}" data-f="${l.f}" ${l.ok ? '' : 'disabled'}><span class="badge">${l.ja}</span>${l.ok ? '' : ' <span class="small muted">あまり使わない</span>'}<span class="fr">${esc(l.fr)}</span><span class="ja">${esc(l.jp)}</span></button>`).join('')}</div>
   <div class="pl-ctrl"><button class="round" id="plPrev" aria-label="前の動詞">⏮</button><button class="main" id="plPlay" aria-label="${P.playing ? '一時停止' : '再生'}">${P.playing ? '❚❚' : '▶'}</button><button class="round" id="plNext" aria-label="次の動詞">⏭</button></div>
   <div class="pl-set">
     ${seg('肯定・否定', { key: 'neg', items: [['aff', '肯定'], ['neg', '否定'], ['both', '両方']] }, P.neg)}
     ${seg('例文', { key: 'exMode', items: [['all', '5つ全部'], ['first', '1つ目だけ']] }, P.exMode)}
     ${seg('日本語訳', { key: 'jaMode', items: [['off', 'なし'], ['after', '仏→日'], ['before', '日→仏']] }, P.jaMode)}
     ${seg('まねする間', { key: 'pause', items: [[0, 'なし'], [2000, '2秒'], [4000, '4秒']] }, P.pause)}
     ${seg('くり返し', { key: 'rep', items: [[1, '1回'], [2, '2回'], [3, '3回']] }, P.rep)}
     ${seg('速さ', { key: 'rate', items: [[0.7, 'ゆっくり'], [0.9, 'ふつう'], [1.05, '速め']] }, P.rate)}
   </div>`;
  $('#plPlay').onclick = () => P.playing ? plStop() : plStart();
  $('#plPrev').onclick = () => plJump((P.i - 1 + list.length) % list.length);
  $('#plNext').onclick = () => plJump((P.i + 1) % list.length);
  $$('#player .pl-line:not([disabled])').forEach(b => b.onclick = () => {
    const idx = okLs.findIndex(l => l.f === b.dataset.f);
    P.line = idx;
    if (P.playing) plStart(); else { cancelSpeech(); speakP(okLs[idx].fr, 'fr-FR', P.rate); }
  });
  $$('#player [data-set]').forEach(g => g.onclick = e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-val]'); if (!b) return;
    const k = g.dataset.set as keyof PlayerSettings;
    (P as unknown as Record<string, unknown>)[k] = (k === 'jaMode' || k === 'exMode' || k === 'neg') ? b.dataset.val : Number(b.dataset.val);
    if (k === 'exMode') { P.i = 0; P.line = 0; }
    savePl();
    if (P.playing && k === 'exMode') plStart(); else renderPlayer();
  });
}

/* ---------- 聞き分けクイズ ---------- */
let lmode: 'player' | 'quiz' = 'player';

function newListen() {
  const v = exOf(pickVerb()), s = rnd(subjFor(v)), f = rnd(allowed(v));
  // a start adverb that fits all three forms, so it doesn't give the answer away
  const adv = rnd(ADVERBS.filter(a => a.pos === 'start' && ['p', 'v', 'a'].every(x => a.forms.includes(x as 'p'))));
  const fr = build(s, v, f, { adv });
  $('#listen').innerHTML = `${hasTTS() ? '' : '<p class="small" style="color:var(--ng)">この端末では読み上げが使えません。別のブラウザでお試しください。</p>'}
   <p class="vtag">ステージ${ST.stage + 1} の動詞から出題</p>
   <button class="big-play" id="play">▶ 再生する</button>
   <div class="actions" style="justify-content:center"><button class="btn ghost" id="slow">ゆっくり</button></div>
   <p class="label" style="margin-top:14px">どの形でしたか？</p>
   <div class="opts">${FKEYS.map(k => `<button class="opt ${FORMS[k].cls}" data-f="${k}"><span class="badge">${FORMS[k].ja}</span>　${FORMS[k].hint}</button>`).join('')}</div>
   <div id="lfb"></div>`;
  $('#play').onclick = () => speak(fr); $('#slow').onclick = () => speak(fr, .7);
  $$<HTMLButtonElement>('#listen .opt').forEach(b => b.onclick = () => {
    const ok = b.dataset.f === f;
    $$<HTMLButtonElement>('#listen .opt').forEach(x => { x.disabled = true; if (x.dataset.f === f) x.classList.add('right'); });
    if (!ok) b.classList.add('wrong');
    rec(f, ok, v.key, true); // not counted in lesson progress
    const cue = { pc: (v.etre ? 'être' : 'avoir') + ' の活用＋過去分詞', vd: 'viens / vient / venons… ＋ de', al: 'vais / va / allons… ＋ 不定詞' }[f];
    $('#lfb').innerHTML = `<div class="fb ${ok ? 'good' : 'bad'}"><span class="verdict">${ok ? '正解' : 'もう一歩'}</span>
      <p class="fr" style="font-size:19px;margin:6px 0">${esc(fr)} <button class="say" data-say="${esc(fr)}" aria-label="発音">▶</button></p>
      <p class="small" style="margin:0">${esc(jaOf(s, v, f, undefined, adv))}　聞き分けの手がかり：${esc(cue)}</p></div>
      <div class="actions"><button class="btn" id="lnx">次へ</button></div>`;
    $('#lnx').onclick = () => { newListen(); $('#play').click(); }; focusInView($('#lnx'));
  });
}

function setMode(m: 'player' | 'quiz') {
  lmode = m;
  $$('#lisSeg button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.l === m)));
  $('#lisPlayer').hidden = m !== 'player'; $('#lisQuiz').hidden = m !== 'quiz';
}

/** Open the player on today's verbs (from the course 聞く・まねる block). */
export function openDayPlayer() {
  P.range = 'day'; P.i = 0; P.line = 0; lmode = 'player';
  go('listen');
  setMode('player');
  renderPlayer();
}

export function initListen() {
  // A one-off utterance stops the player.
  setSpeakInterrupt(() => { if (P.playing) { P.playing = false; P.token++; releaseWake(); renderPlayer(); } });
  $('#plRange').onclick = e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-r]'); if (!b) return;
    const r = b.dataset.r!;
    P.range = (r === 'all' || r === 'day') ? r : +r; P.i = 0; P.line = 0; savePl();
    if (P.playing) plStart(); else renderPlayer();
  };
  $('#lisSeg').onclick = e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-l]'); if (!b) return;
    setMode(b.dataset.l as 'player' | 'quiz');
    if (lmode === 'quiz') { if (P.playing) plStop(); newListen(); } else renderPlayer();
  };
  onShow('listen', () => { if (lmode === 'quiz') newListen(); else renderPlayer(); });
}
