// The 90-day course panel on Home: Day ring, today's 4 blocks, calendar, plan.
import { $, $$, esc } from '../../util/dom';
import { MEAN } from '../../data';
import { save, type BlockKey } from '../../store/state';
import { addXP } from '../../engine/session';
import { setCourseDay } from '../../engine/pick';
import {
  BLOCKS, C, MONTHS, NDAYS, blockDone, completeDay, courseDayObj, courseStatus, curDay, dayVerbs, dayWords,
  fmt, focusCats, monthOf, personal, timer,
} from '../../engine/course';
import { track } from '../analytics';
import { toast } from '../toast';
import { go } from '../router';
import { renderDayBar, runBlock } from './DayBar';
import { dxStart, showFinal } from './Diagnosis';
import { renderHome } from './Home';
import { startDayDrill } from './Drill';
import { openDayPlayer } from './Listen';
import { startDayWords } from './Words';

function blockBtns(k: BlockKey) {
  if (k === 'rev') return `<button class="btn sm" data-blk="rev" data-a="words">単語</button><button class="btn sm ghost" data-blk="rev" data-a="verbs">動詞</button>`;
  if (k === 'lis') return `<button class="btn sm" data-blk="lis">開始</button>`;
  if (k === 'spk') return `<button class="btn sm" data-blk="spk">開始</button>`;
  return `<button class="btn sm ghost" data-blk="memo">書く</button>`;
}

/** Start a block's timer and open where it is practised. */
function blockAct(k: BlockKey, a?: string) {
  runBlock(k);
  const d = curDay();
  if (k === 'rev' && a === 'words') { go('words'); startDayWords(d); }
  else if (k === 'rev') { setCourseDay(d); go('drill'); startDayDrill(d); }
  else if (k === 'lis') openDayPlayer();
  else if (k === 'spk') go('speak');
  else { const m = $('#memoBox'); if (m) m.focus(); }
}

export function renderCourse() {
  const el = $('#course'); const c = C();
  if (!c) {
    el.innerHTML = `<div class="hero"><div class="hero-n">90</div><div><b>1日1時間 × 90日で、フランス語で話せるようになる</b><p class="small" style="margin:6px 0 0">90レッスンで終わるコースです。3ヶ月後のゴールは、ネイティブと10〜15分、自分のことと日常の話ができること（A2前後）。まず20〜30分の診断で、あなた専用の90日プランを作ります。</p></div></div>
   <button class="btn contbtn" id="dxGo">▶ Day 0 診断を始める（20〜30分）</button>`;
    $('#dxGo').onclick = () => dxStart(false);
    return;
  }
  const d = curDay(), o = courseDayObj(d), m = MONTHS[monthOf(d)];
  const { done, behind, fin } = courseStatus(c);
  const allDone = done >= NDAYS;
  const cells = [...Array(NDAYS)].map((_, i) => {
    const k = i + 1, x = c.days[k];
    const cls = x && x.done ? (x.skipped ? 'skip' : 'ok') : (k === d ? 'today' : '');
    return `<span class="dc ${cls}" title="Day ${k}">${k % 10 === 0 ? k : ''}</span>`;
  }).join('');
  const blocks = BLOCKS.map(b => {
    const s = o.t[b.k], ok = blockDone(o, b), on = timer.act && timer.act.k === b.k;
    return `<div class="blk${ok ? ' ok' : ''}${on ? ' on' : ''}"><div class="blk-top"><span class="be2">${ok ? '✓' : b.emo}</span><b>${b.t}<span class="small">${b.min}分</span></b></div>
      <span class="bb-desc">${b.d}</span><span class="bar"><i style="width:${Math.min(100, s / (b.min * 60) * 100)}%;background:${ok ? 'var(--ok)' : 'var(--al)'}"></i></span><span class="small muted">${fmt(s)} / ${b.min}:00</span><span class="bbtns">${blockBtns(b.k)}</span></div>`;
  }).join('');
  const prev = c.days[d - 1] && c.days[d - 1].memo;
  const total = BLOCKS.reduce((a, b) => a + Math.min(o.t[b.k], b.min * 60), 0);
  const allBlocks = BLOCKS.every(b => blockDone(o, b));
  // the one big button: next unfinished block, or finishing the Day
  const next = BLOCKS.find(b => !blockDone(o, b));
  const NEXT_LABEL: Record<BlockKey, string> = { rev: '復習（単語）', lis: '聞く・まねる', spk: '話す', memo: 'メモを書く' };
  const cont = next
    ? `<button class="btn contbtn" data-blk="${next.k}"${next.k === 'rev' ? ' data-a="words"' : ''}>▶ ${total ? '続きから' : '始める'}：${next.emo} ${NEXT_LABEL[next.k]}</button>`
    : `<button class="btn contbtn" id="dayDone">✓ Day ${d} を完了する（+50 XP）</button>`;
  el.innerHTML = `<div class="daycard">
   <div class="dayhead"><div class="dh-n" style="--p:${done / NDAYS * 100}" role="img" aria-label="Day ${allDone ? 90 : d} / 90、完了 ${done}"><span>Day</span><b>${allDone ? 90 : d}</b><span>/ 90</span></div>
     <div class="dh-r"><div class="small"><b>${m.t}</b>：${esc(m.g)}</div>
     <div class="small muted">完了 ${done} / 90 ・ 残り ${NDAYS - done} ・ 毎日続ければ ${fin.getMonth() + 1}/${fin.getDate()} に修了${behind > 1 ? ` ・ <span style="color:var(--ng)">予定より${behind - 1}日遅れ</span>` : ''}</div></div></div>
   ${allDone ? `<div class="clear"><span><b>90レッスン修了！</b> Day 90 のふり返り診断で、Day 0 と比べましょう。</span><button class="btn" id="dx90">ふり返り診断</button></div></div><div id="finalBox"></div>` : `
   <div class="todaybar"><div class="goalrow"><span>今日のレッスン（目安60分）</span><b>${Math.round(total / 60)} / 60 分</b></div><div class="bar thick"><i style="width:${total / 36}%;background:${allBlocks ? 'var(--ok)' : 'var(--al)'}"></i></div></div>
   ${cont}
   <p class="small muted newstuff">新しい動詞：${dayVerbs(d).map(v => esc(v.key)).join('、')}　／　単語：${dayWords(d).length}語　／　フレーズ：${MEAN.filter(x => x.day === d).length}個</p>
   ${(c.profile && c.profile.tm === 'four') ? '<p class="small muted" style="margin:4px 0 0">15分×4回に分けてOK。ブロックごとに時間がたまります。</p>' : ''}
   </div>
   <div class="blkgrid">${blocks}</div>
   <div class="panel"><b>📝 今日のメモ</b>
     ${prev ? `<p class="small" style="margin:6px 0 0"><b>前日に言えなかったこと</b>：${esc(prev)}</p>` : ''}
     <textarea id="memoBox" class="memo" placeholder="今日フランス語で言えなかったこと・聞き取れなかったこと">${esc(o.memo || '')}</textarea>
     ${allBlocks ? '' : `<div class="actions"><button class="btn ghost" id="dayDone" data-early="1">Day ${d} を完了する</button></div>`}</div>`}
   <div class="panel" style="margin-top:12px"><div class="goalrow" style="margin-top:0"><b>90日カレンダー</b><span class="small muted">完了 ${done} / 90</span></div><div class="cal">${cells}</div></div>
   <details class="panel" id="planCard" style="margin-top:12px"><summary><b>あなたの90日プラン</b></summary>
     <p class="small">開始地点：Day ${c.startDay}${c.startDay > 1 ? `（診断の結果、Day 1〜${c.startDay - 1}は復習扱い）` : ''}<br>
     90日後にできること：<b>フランス語で、自分のことと日常の話を10〜15分続けられる（A2前後）</b><br>
     重点カテゴリ：${focusCats().join('・')}<br>
     ${c.profile.shy === 'shy' ? '話す練習：1〜2ヶ月目は独り言と録音を中心に、3ヶ月目から人との会話へ<br>' : ''}
     診断：単語 ${c.dx.vocab} ／ 聞き取り ${c.dx.listen}</p>
     <p class="label">自分専用フレーズ</p>${personal().map(x => `<div class="ex"><button class="say" data-say="${esc(x[1])}" aria-label="発音">▶</button><span class="fr">${esc(x[1])}</span><span class="small muted">${esc(x[0])}</span></div>`).join('')}
     <div class="actions"><button class="btn ghost" id="redoDx">診断をやり直す</button></div></details>`;
  $$('#course [data-blk]').forEach(b => b.onclick = () => blockAct(b.dataset.blk as BlockKey, b.dataset.a));
  const memo = $<HTMLTextAreaElement>('#memoBox');
  if (memo) {
    memo.onfocus = () => { if (!timer.act || timer.act.k !== 'memo') runBlock('memo'); };
    memo.oninput = () => { o.memo = memo.value; save(); };
  }
  const dayDone = $('#dayDone');
  if (dayDone) dayDone.onclick = () => {
    if (dayDone.dataset.early && !confirm('まだ目安の時間に届いていないブロックがあります。完了にしますか？')) return;
    completeDay(o); addXP(50); save();
    track('app_action_complete', { action: 'day_complete', day: d });
    renderDayBar(); toast(`Day ${d} 完了！ +50 XP`); renderHome(); window.scrollTo(0, 0);
  };
  const dx90 = $('#dx90'); if (dx90) dx90.onclick = () => dxStart(true);
  const redo = $('#redoDx');
  if (redo) redo.onclick = () => { if (confirm('診断をやり直しますか？（進み具合は残ります）')) dxStart(false, c.days); };
  if (allDone) showFinal();
}
