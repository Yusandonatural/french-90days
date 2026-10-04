// 10-question lesson chrome: progress bar and the completion screen.
import { $ } from '../../util/dom';
import { SES, finishLesson, streak } from '../../engine/session';
import { track } from '../analytics';

export function renderSesBar() {
  const el = $(SES.kind === 'word' ? '#wSes' : '#sesBar');
  if (!el) return;
  el.innerHTML = `<div class="sesbar"><div class="sesfill" style="width:${Math.min(100, SES.n / SES.total * 100)}%"></div></div><span class="sesn">${SES.n}/${SES.total}</span>`;
}

/** Ends the lesson (XP bonus, counters) and returns the summary markup. Has an #again button. */
export function summaryHTML() {
  const r = finishLesson();
  track('app_action_complete', { action: 'lesson_complete', kind: r.kind });
  return `<div class="summary"><div class="sumtitle">レッスン完了</div>
   <div class="sumgrid"><div><b>+${r.xp}</b><span>XP</span></div><div><b>${r.acc}%</b><span>正答率</span></div><div><b>${streak()}</b><span>連続日数</span></div></div>
   ${r.perfect ? '<p class="small" style="text-align:center">全問正解ボーナス +5 XP</p>' : ''}
   <div class="actions" style="justify-content:center"><button class="btn" id="again">もう1レッスン</button><button class="btn ghost" data-go="home">ホームへ</button></div></div>`;
}
