// Day 0 / Day 90 diagnosis wizard (6 steps), shown in place of the Home content.
import { $, $$, esc, shuffle } from '../../util/dom';
import { MEAN, type Meaning } from '../../data';
import { save, type CourseDay, type Profile } from '../../store/state';
import { todayKey } from '../../engine/session';
import {
  C, HOBBIES, JOBS, PURP, createCourse, dxListenQuestions, dxScore, dxWords, personal, type DxWord,
} from '../../engine/course';
import { recGet, recPut } from '../../store/rec';
import { REC_OK, playBlob, recToggle } from '../recorder';
import { speak } from '../speech';
import { toast } from '../toast';
import { track } from '../analytics';
import { go } from '../router';
import { renderHome } from './Home';

interface Dx {
  final: boolean; step: number; profile: Profile; known: Record<string, boolean>;
  words: DxWord[]; lq: Meaning[]; li: number; lok: number; rec: Blob | null;
  keepDays?: Record<number, CourseDay>;
}
let DX: Dx | null = null;
export const isDiagnosing = () => !!DX;

/** final = Day 90 (starts at the word check). keepDays: redo the Day 0 diagnosis without losing progress. */
export function dxStart(final: boolean, keepDays?: Record<number, CourseDay>) {
  DX = {
    final: !!final, step: 0,
    profile: Object.assign({ purp: [], hobbies: [], kids: 0 }, (C() && C()!.profile) || {}),
    known: {}, words: dxWords(), lq: dxListenQuestions(), li: 0, lok: 0, rec: null, keepDays,
  };
  if (final) DX.step = 3;
  go('home');
  renderDX();
}

function renderDX(): void {
  const dx = DX!;
  const el = $('#dx'), p = dx.profile;
  el.hidden = false; $('#homeMain').hidden = true;
  const steps = ['目的', '自分のこと', '話し方', '単語チェック', '聞き取り', '自己紹介の録音'];
  const head = `<div class="lesson-top"><b>${dx.final ? 'Day 90 ふり返り診断' : 'Day 0 診断'}　${dx.step + 1}/${steps.length}　${steps[dx.step]}</b><button class="linkbtn" id="dxQuit">やめる</button></div><div class="sesbar" style="margin-bottom:12px"><div class="sesfill" style="width:${(dx.step) / steps.length * 100}%"></div></div>`;
  let body = '';
  if (dx.step === 0) {
    body = `<p>フランス語を、いつ・どんな場面で話したいですか？（複数可）</p><div class="chips">${PURP.map(x => `<button class="chip" data-purp="${x[0]}" aria-pressed="${p.purp.includes(x[0])}">${x[1]}</button>`).join('')}</div>
     <p class="small muted">選んだ目的に合わせて、話す練習のカテゴリに重みをつけます。</p>`;
  } else if (dx.step === 1) {
    body = `<p class="small muted">自己紹介フレーズ（自分専用スロット）に使います。ローマ字やフランス語で入力してください。</p>
     <label class="lbl">名前<input class="answer sm" id="pName" value="${esc(p.name || '')}" placeholder="Ryotaro"></label>
     <label class="lbl">住んでいる町<input class="answer sm" id="pCity" value="${esc(p.city || '')}" placeholder="Nara"></label>
     <p class="label">仕事</p><div class="chips">${JOBS.map((j, i) => `<button class="chip" data-job="${i}" aria-pressed="${p.job === i}">${j[0]}</button>`).join('')}</div>
     <p class="label">子どもの人数</p><div class="chips">${[0, 1, 2, 3, 4, 5].map(n => `<button class="chip" data-kids="${n}" aria-pressed="${p.kids === n}">${n}人</button>`).join('')}</div>
     <p class="label">好きなこと（2つまで）</p><div class="chips">${HOBBIES.map((h, i) => `<button class="chip" data-hob="${i}" aria-pressed="${p.hobbies.includes(i)}">${h[0]}</button>`).join('')}</div>`;
  } else if (dx.step === 2) {
    body = `<p class="label">人前でフランス語を話すのは？</p><div class="chips">${[['ok', '平気'], ['bit', '少し恥ずかしい'], ['shy', 'かなり恥ずかしい']].map(x => `<button class="chip" data-shy="${x[0]}" aria-pressed="${p.shy === x[0]}">${x[1]}</button>`).join('')}</div>
     <p class="label">1日60分の取り方</p><div class="chips">${[['one', 'まとめて60分'], ['four', '15分×4回に分ける']].map(x => `<button class="chip" data-tm="${x[0]}" aria-pressed="${p.tm === x[0]}">${x[1]}</button>`).join('')}</div>
     <p class="label">学びやすいのは？</p><div class="chips">${[['ear', '聞く派'], ['eye', '読む派']].map(x => `<button class="chip" data-ls="${x[0]}" aria-pressed="${p.ls === x[0]}">${x[1]}</button>`).join('')}</div>`;
  } else if (dx.step === 3) {
    const w = dx.words.filter(x => dx.known[x.fr] == null)[0];
    const n = Object.keys(dx.known).length;
    if (!w) { dx.step = 4; return renderDX(); }
    body = `<p>この単語を知っていますか？（${n + 1}/${dx.words.length}）<br><span class="small muted">実在しない単語も混ざっています。当てずっぽうは避けてください。</span></p>
     <div class="wcard"><span class="fr wfr">${esc(w.fr)}</span><button class="say" data-say="${esc(w.fr)}" aria-label="発音">▶</button></div>
     <div class="actions"><button class="btn" data-kn="1">知っている</button><button class="btn ghost" data-kn="0">知らない</button></div>`;
    el.innerHTML = head + `<div class="panel">${body}</div>`;
    $$('#dx [data-kn]').forEach(b => b.onclick = () => { dx.known[w.fr] = b.dataset.kn === '1'; renderDX(); });
    $('#dxQuit').onclick = dxQuit;
    return;
  } else if (dx.step === 4) {
    if (dx.li >= dx.lq.length) { dx.step = 5; return renderDX(); }
    const q = dx.lq[dx.li]; const opts = shuffle([q, ...shuffle(MEAN.filter(m => m !== q)).slice(0, 2)]);
    body = `<p>流れたフランス語の意味は？（${dx.li + 1}/10）</p><button class="big-play" id="dxPlay">▶ 再生する</button>
      <div class="opts">${opts.map(o => `<button class="opt" data-i="${o.i}">${esc(o.ja)}</button>`).join('')}</div>`;
    el.innerHTML = head + `<div class="panel">${body}</div>`;
    $('#dxPlay').onclick = () => speak(q.fr); speak(q.fr);
    $$('#dx .opt').forEach(b => b.onclick = () => { if (+b.dataset.i! === q.i) dx.lok++; dx.li++; renderDX(); });
    $('#dxQuit').onclick = dxQuit;
    return;
  } else {
    const ph = personal(p);
    body = `<p>30秒で自己紹介をしてみてください。${dx.final ? 'Day 0 の録音と並べて聞けます。' : 'Day 90 にもう一度録音して、成長を聞き比べます。'}</p>
     <div class="panel" style="background:var(--bg)">${ph.slice(0, 6).map(x => `<p class="fr" style="margin:2px 0">${esc(x[1])}</p>`).join('')}<p class="small muted" style="margin:6px 0 0">言えるところだけで大丈夫です。日本語のメモを見ながらでも構いません。</p></div>
     ${REC_OK ? `<div class="actions"><button class="btn" id="dxRec">● 録音（最大30秒）</button><button class="btn ghost" id="dxPlayRec" ${dx.rec ? '' : 'disabled'}>▶ 聞く</button></div>` : '<p class="small muted">この端末ではブラウザから録音できません。スマホのボイスメモで録っておくと、Day 90 に聞き比べられます。</p>'}
     <div class="actions"><button class="btn" id="dxFinish">${dx.final ? '結果を見る' : '診断結果を見る'}</button></div>`;
    el.innerHTML = head + `<div class="panel">${body}</div>`;
    if (REC_OK) {
      $('#dxRec').onclick = e => recToggle(e.target as HTMLElement, b => { dx.rec = b; $<HTMLButtonElement>('#dxPlayRec').disabled = false; }, 30);
      $('#dxPlayRec').onclick = () => playBlob(dx.rec);
    }
    $('#dxFinish').onclick = dxFinish; $('#dxQuit').onclick = dxQuit;
    return;
  }
  el.innerHTML = head + `<div class="panel">${body}<div class="actions"><button class="btn" id="dxNext">次へ</button>${dx.step > 0 ? '<button class="btn ghost" id="dxBack">戻る</button>' : ''}</div></div>`;
  /** toggle in a multi-select; max drops the oldest */
  const tog = <T,>(arr: T[], v: T, max?: number) => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else { arr.push(v); if (max && arr.length > max) arr.shift(); } };
  const keepText = () => { if ($('#pName')) { p.name = $<HTMLInputElement>('#pName').value.trim(); p.city = $<HTMLInputElement>('#pCity').value.trim(); } };
  $$('#dx [data-purp]').forEach(b => b.onclick = () => { tog(p.purp, b.dataset.purp!); renderDX(); });
  $$('#dx [data-job]').forEach(b => b.onclick = () => { keepText(); p.job = +b.dataset.job!; renderDX(); });
  $$('#dx [data-kids]').forEach(b => b.onclick = () => { keepText(); p.kids = +b.dataset.kids!; renderDX(); });
  $$('#dx [data-hob]').forEach(b => b.onclick = () => { keepText(); tog(p.hobbies, +b.dataset.hob!, 2); renderDX(); });
  $$('#dx [data-shy]').forEach(b => b.onclick = () => { p.shy = b.dataset.shy; renderDX(); });
  $$('#dx [data-tm]').forEach(b => b.onclick = () => { p.tm = b.dataset.tm; renderDX(); });
  $$('#dx [data-ls]').forEach(b => b.onclick = () => { p.ls = b.dataset.ls; renderDX(); });
  $('#dxNext').onclick = () => { keepText(); dx.step++; renderDX(); };
  const back = $('#dxBack'); if (back) back.onclick = () => { keepText(); dx.step--; renderDX(); };
  $('#dxQuit').onclick = dxQuit;
}

function closeDX() { DX = null; $('#dx').hidden = true; $('#homeMain').hidden = false; renderHome(); }
function dxQuit() { closeDX(); }

function dxFinish() {
  const dx = DX!;
  const sc = dxScore(dx.words, dx.known, dx.lok);
  if (dx.final) {
    const c = C()!; c.final = { score: sc, date: todayKey() }; save();
    if (dx.rec) recPut('day90', dx.rec);
    closeDX(); showFinal();
    return;
  }
  const startDay = createCourse(sc, dx.profile, dx.keepDays);
  if (dx.rec) recPut('day0', dx.rec);
  track('tutorial_complete', { start_day: startDay });
  closeDX();
  setTimeout(() => { const e = $<HTMLDetailsElement>('#planCard'); if (e) e.open = true; }, 0);
}

/** Day 0 → Day 90 comparison under the course panel. */
export function showFinal() {
  const c = C(); if (!c || !c.final) return;
  const a = c.dx, b = c.final.score;
  $('#finalBox').innerHTML = `<div class="panel"><h3>Day 0 → Day 90</h3>
   <div class="prow"><span>単語チェック</span><b>${a.vocab} → ${b.vocab}</b></div><div class="prow"><span>聞き取り</span><b>${a.listen} → ${b.listen}</b></div>
   <div class="actions"><button class="btn ghost" id="pl0">▶ Day 0 の自己紹介</button><button class="btn ghost" id="pl90">▶ Day 90 の自己紹介</button></div></div>`;
  $('#pl0').onclick = async () => { const r = await recGet('day0'); if (r) playBlob(r); else toast('Day 0 の録音はありません'); };
  $('#pl90').onclick = async () => { const r = await recGet('day90'); if (r) playBlob(r); else toast('Day 90 の録音はありません'); };
}
