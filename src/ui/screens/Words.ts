// 単語: 34 theme units and 10-question word lessons (A: fr→ja, B: ja→fr, C: fill the blank in a sentence).
import { $, $$, esc, rnd, shuffle, focusInView } from '../../util/dom';
import { THEMES, WORDS, type Theme, type Word } from '../../data';
import { FORMS, allowed, build, buildNeg, type FormKey } from '../../grammar/conjugate';
import { jaNegOf, jaOf } from '../../grammar/ja';
import { advForm, pickAdv } from '../../grammar/adverbs';
import { FRAMES, applyPrep, wordVerb, type Frame } from '../../grammar/frames';
import { learnedCount, wLearned, wSeen, wc } from '../../store/state';
import { SES, recordWord, sesDone, sesReset } from '../../engine/session';
import { PLANW, dayWords, dwStart } from '../../engine/course';
import { speak } from '../speech';
import { renderSesBar, summaryHTML } from '../components/lesson';
import { onShow } from '../router';

let WQ: Word[] = [], WT: Theme | null = null, WDAY = 0;

/** 男性 / 女性 / 複数 tag from the article */
function genderTag(w: Word) {
  if (/^les /.test(w.fr)) return '複数';
  if (/^l'/.test(w.fr) && w.g) return w.g === 'f' ? '女性' : '男性';
  if (/^la /.test(w.fr)) return '女性';
  if (/^le /.test(w.fr)) return '男性';
  return '';
}
/** index of the first theme with an unlearned word */
export const nextThemeIndex = () => THEMES.findIndex(t => t.words.some(w => !wLearned(w.id)));

export function renderUnits() {
  const tot = WORDS.length, l = learnedCount();
  const next = nextThemeIndex();
  $('#wHead').innerHTML = `<div class="bigprog"><div><b>${l}</b> / ${tot} 語</div><div class="bar thick"><i style="width:${l / tot * 100}%;background:var(--ok)"></i></div></div>`;
  $('#wList').innerHTML = THEMES.map((t, i) => {
    const n = t.words.length, m = t.words.filter(w => wLearned(w.id)).length, done = m === n;
    return `<button class="unit${i === next ? ' next' : ''}${done ? ' done' : ''}" data-u="${i}"><span class="uemo">${t.emo}</span><span class="ubody"><span class="utitle">${esc(t.title)}${i === next ? ' <span class="badge k-vd">次はここ</span>' : ''}</span><span class="umeta">${m} / ${n} 語${t.fk !== 'none' ? '・例文つき' : ''}</span><span class="bar"><i style="width:${m / n * 100}%;background:${done ? 'var(--ok)' : 'var(--vd)'}"></i></span></span><span class="ugo">${done ? '✓' : '▶'}</span></button>`;
  }).join('');
  $('#wUnits').hidden = false; $('#wLesson').hidden = true;
}

function openLesson(title: string) {
  sesReset('word');
  $('#wUnits').hidden = true; $('#wLesson').hidden = false;
  $('#wTitle').textContent = title;
  window.scrollTo(0, 0);
  nextWordQ();
}

/** 10 words not answered correctly yet (from other themes when this one runs out) */
export function startWordLesson(ti: number) {
  WDAY = 0; const t = THEMES[ti]; WT = t;
  const nw = t.words.filter(w => !wLearned(w.id)).slice(0, 10);
  let pool = WORDS.filter(w => !wLearned(w.id) && !nw.includes(w));
  if (!pool.length) pool = t.words.filter(w => !nw.includes(w));
  WQ = [...nw, ...shuffle(pool).slice(0, 10 - nw.length)];
  while (WQ.length < 10) WQ.push(rnd(t.words));
  WQ = shuffle(WQ);
  openLesson(t.emo + ' ' + t.title);
}

/** Day N's words not answered correctly yet, then earlier days' words still not learned */
export function startDayWords(d: number) {
  WDAY = d;
  const today = dayWords(d), nw = today.filter(w => !wLearned(w.id)).slice(0, 10);
  // earlier words: ones already tried (and missed) first
  let pool = PLANW.slice(0, dwStart(d)).filter(w => !wLearned(w.id) && !nw.includes(w));
  pool = pool.sort((a, b) => wc(b.id)[1] - wc(a.id)[1]).slice(0, 30);
  if (!pool.length) pool = today.filter(w => !nw.includes(w));
  WQ = shuffle([...nw, ...shuffle(pool).slice(0, 10 - nw.length)]);
  while (WQ.length < 10) WQ.push(rnd(today));
  WT = today[0].th;
  openLesson(`Day ${d} の単語（${today.filter(w => wLearned(w.id)).length}/${today.length} 習得）`);
}

/** n other words whose map(x) differs from the answer's (same theme first) */
function distract(w: Word, n: number, map: (x: Word) => string) {
  const pool = shuffle(w.th.words.filter(x => x !== w && map(x) !== map(w)));
  const out: Word[] = [];
  for (const x of pool) { if (out.length >= n) break; if (!out.some(o => map(o) === map(x))) out.push(x); }
  if (out.length < n) shuffle(WORDS.filter(x => x !== w && !out.includes(x))).slice(0, n - out.length).forEach(x => out.push(x));
  return out;
}

function nextWordQ() {
  const box = $('#wQ');
  if (sesDone()) {
    box.innerHTML = summaryHTML();
    $('#again').onclick = () => WDAY ? startDayWords(WDAY) : startWordLesson(THEMES.indexOf(WT!));
    renderSesBar();
    return;
  }
  renderSesBar();
  const w = WQ[SES.n], fr = FRAMES[w.th.fk];
  // new words always A; seen words A / B / C (C only for themes with a sentence frame)
  let type = 'A';
  if (wSeen(w.id)) { const ts = ['A', 'B']; if (fr) ts.push('C', 'C'); type = rnd(ts); }
  if (type === 'C') { if (!wordC(w, fr)) type = 'B'; else return; }
  const tag = genderTag(w);
  if (type === 'A') {
    const opts = shuffle([w, ...distract(w, 3, x => x.ja)]);
    box.innerHTML = `<p class="label">${wSeen(w.id) ? '意味を選んでください' : '新しい単語'}</p>
      <div class="wcard"><span class="fr wfr">${esc(w.fr)}</span>${tag ? `<span class="gtag">${tag}</span>` : ''}<button class="say" data-say="${esc(w.fr)}" aria-label="発音">▶</button></div>
      <div class="opts">${opts.map(o => `<button class="opt" data-id="${esc(o.id)}">${esc(o.ja)}</button>`).join('')}</div><div id="wfb"></div>`;
    speak(w.fr);
  } else {
    const opts = shuffle([w, ...distract(w, 3, x => x.fr)]);
    box.innerHTML = `<p class="label">フランス語を選んでください</p>
      <div class="wcard"><span class="wja">${esc(w.ja)}</span></div>
      <div class="opts">${opts.map(o => `<button class="opt fr" data-id="${esc(o.id)}">${esc(o.fr)}</button>`).join('')}</div><div id="wfb"></div>`;
  }
  $$('#wQ .opt').forEach(b => b.onclick = () => wAnswer(w, b, b.dataset.id === w.id, w.fr, `${w.fr} ＝ ${w.ja}`));
}

/** Fill-in-the-blank in a pc / al sentence (or its negative). false if the phrase can't be blanked. */
function wordC(w: Word, frs: Frame[]) {
  const s = rnd(['je', 'on', 'tu'] as const), frm = rnd(frs);
  const { dv, phrase } = wordVerb(w, frm);
  const al = allowed(dv).filter(f => f !== 'vd') as ('pc' | 'al')[];
  const cands: string[] = [];
  al.forEach(f => { cands.push(f); cands.push(f + 'n'); });
  let f = rnd(cands), sent: string | undefined, ja: string | null = null;
  if (f.endsWith('n')) {
    const b = f.slice(0, -1) as 'pc' | 'al', adv = pickAdv(advForm(b), { neg: true, subj: s });
    ja = jaNegOf(s, dv, b, adv); if (!ja) f = b; else sent = buildNeg(s, dv, b, { adv });
  }
  if (!sent) { const adv = pickAdv(advForm(f), { subj: s }); sent = build(s, dv, f as FormKey, { adv }); ja = jaOf(s, dv, f as FormKey, undefined, adv); }
  const i = sent.indexOf(phrase); if (i < 0) return false;
  const others = distract(w, 3, x => applyPrep(frm[1], x.fr)).map(x => applyPrep(frm[1], x.fr));
  const opts = shuffle([phrase, ...others]);
  const shown = esc(sent.slice(0, i)) + '<span class="blank">______</span>' + esc(sent.slice(i + phrase.length));
  const fk = f as keyof typeof FORMS;
  $('#wQ').innerHTML = `<p class="label">空所に入る言葉は？　<span class="badge ${FORMS[fk].cls}">${FORMS[fk].ja}</span></p>
    <p class="prompt-ja">${esc(ja)}</p><p class="q fr">${shown}</p>
    <div class="opts">${opts.map(o => `<button class="opt fr" data-p="${esc(o)}">${esc(o)}</button>`).join('')}</div><div id="wfb"></div>`;
  const full = sent;
  $$('#wQ .opt').forEach(b => b.onclick = () => wAnswer(w, b, b.dataset.p === phrase, full, `${full}　（${w.fr} ＝ ${w.ja}）`, phrase));
  return true;
}

/** Wrong answers come back at the end of the lesson (up to 14 questions). */
function wAnswer(w: Word, b: HTMLElement, ok: boolean, sayText: string, label: string, phrase?: string) {
  $$<HTMLButtonElement>('#wQ .opt').forEach(x => { x.disabled = true; if (x.dataset.id === w.id || (phrase && x.dataset.p === phrase)) x.classList.add('right'); });
  if (!ok) b.classList.add('wrong');
  recordWord(w, ok);
  renderSesBar();
  if (!ok) { WQ.push(w); SES.total = Math.min(SES.total + 1, 14); renderSesBar(); }
  $('#wfb').innerHTML = `<div class="fb ${ok ? 'good' : 'bad'}"><span class="verdict">${ok ? '正解' : 'もう一度あとで出ます'}</span>
    <p class="fr" style="font-size:18px;margin:6px 0">${esc(label)} <button class="say" data-say="${esc(sayText)}" aria-label="発音">▶</button></p></div>
    <div class="actions"><button class="btn" id="wnx">次へ</button></div>`;
  speak(sayText); $('#wnx').onclick = nextWordQ; focusInView($('#wnx'));
}

export function initWords() {
  $('#wList').onclick = e => { const b = (e.target as Element).closest<HTMLElement>('[data-u]'); if (b) startWordLesson(+b.dataset.u!); };
  $('#wQuit').onclick = () => { SES.on = false; renderUnits(); };
  onShow('words', () => { if (!(SES.on && SES.kind === 'word')) renderUnits(); });
}
