// The floating "Day N  🗣️ 話す  07:12 / 20:00  ❚❚" pill while a course block is running.
import { $ } from '../../util/dom';
import { BLOCKS, C, courseDayObj, fmt, startBlock, tick, timer } from '../../engine/course';
import type { BlockKey } from '../../store/state';
import { toast } from '../toast';
import { isShown } from '../router';
import { renderHome } from './Home';

export function renderDayBar() {
  const el = $('#dayBar'); if (!el) return;
  const act = timer.act;
  if (!act || !C()) { el.hidden = true; return; }
  const o = courseDayObj(act.d), b = BLOCKS.find(x => x.k === act.k)!;
  el.hidden = false;
  el.innerHTML = `<button class="db-main" data-go="home"><b>Day ${act.d}</b>　${b.emo} ${b.t}　${fmt(o.t[b.k])} / ${b.min}:00</button><button class="db-x" id="dbStop" aria-label="タイマーを止める">❚❚</button>`;
  $('#dbStop').onclick = e => { e.stopPropagation(); stopBlock(); };
}
export function runBlock(k: BlockKey) { startBlock(k); renderDayBar(); }
export function stopBlock() { timer.act = null; renderDayBar(); if (isShown('home')) renderHome(); }

/** Counts seconds only while the page is visible. */
export function initDayBar() {
  setInterval(() => {
    if (!timer.act || document.hidden || !C()) return;
    const reached = tick();
    if (reached) toast(`${reached.emo} ${reached.t} ${reached.min}分 達成`);
    renderDayBar();
  }, 1000);
}
