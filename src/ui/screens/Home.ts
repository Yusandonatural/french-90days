// ホーム: course dashboard (Course.ts) + XP / streak / goal / badges.
import { $, esc } from '../../util/dom';
import { THEMES, WORDS } from '../../data';
import { ST, learnedCount, mastered, masteredVerbs, save } from '../../store/state';
import { badges, level, streak, todayKey } from '../../engine/session';
import { go, onShow } from '../router';
import { renderCourse } from './Course';
import { isDiagnosing } from './Diagnosis';
import { nextThemeIndex, startWordLesson } from './Words';

export function renderHome() {
  if (!isDiagnosing()) renderCourse();
  const t = ST.days[todayKey()] || 0, g = ST.goal || 50, s = streak();
  $('#hStats').innerHTML = `<div class="stat"><b>🔥 ${s}</b><span>連続日数</span></div><div class="stat"><b>⚡ ${ST.xp || 0}</b><span>合計XP</span></div><div class="stat"><b>Lv.${level()}</b><span>レベル</span></div>`;
  $('#hGoal').innerHTML = `<div class="goalrow"><span>今日の目標</span><b>${t} / ${g} XP</b></div><div class="bar thick"><i style="width:${Math.min(100, t / g * 100)}%;background:${t >= g ? 'var(--ok)' : 'var(--al)'}"></i></div>${t >= g ? '<p class="small" style="margin:8px 0 0;color:var(--ok);font-weight:700">今日の目標を達成しました</p>' : ''}`;
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return { k: todayKey(d), lab: '日月火水木金土'[d.getDay()] }; });
  const mx = Math.max(g, ...days.map(d => ST.days[d.k] || 0));
  $('#hWeek').innerHTML = days.map(d => { const v = ST.days[d.k] || 0; return `<div class="wk${d.k === todayKey() ? ' today' : ''}"><div class="wkbar"><i style="height:${v / mx * 100}%;${v >= g ? 'background:var(--ok)' : ''}"></i></div><span>${d.lab}</span></div>`; }).join('');
  const mv = masteredVerbs(), l = learnedCount();
  const nextT = THEMES[nextThemeIndex()] || THEMES[0];
  $('#hNext').innerHTML = `<button class="cont" data-act="verb"><span class="cemo">🧠</span><span><b>動詞レッスン</b><span class="small muted">ステージ${ST.stage + 1}・習得 ${mastered(ST.stage)}/20</span></span><span class="ugo">▶</span></button>
   <button class="cont" data-act="word"><span class="cemo">${nextT.emo}</span><span><b>単語レッスン</b><span class="small muted">${esc(nextT.title)}</span></span><span class="ugo">▶</span></button>
   <button class="cont" data-act="listen"><span class="cemo">🎧</span><span><b>je で連続再生</b><span class="small muted">流して聞く・まねする</span></span><span class="ugo">▶</span></button>
   <button class="cont" data-act="learn"><span class="cemo">📖</span><span><b>文法の説明</b><span class="small muted">3つの形・否定・être動詞</span></span><span class="ugo">▶</span></button>`;
  $('#hProg').innerHTML = `<div class="prow"><span>動詞（3回正解で習得）</span><b>${mv} / 200</b></div><div class="bar thick"><i style="width:${mv / 2}%;background:var(--pc)"></i></div>
   <div class="prow"><span>単語（2回正解で習得）</span><b>${l} / ${WORDS.length}</b></div><div class="bar thick"><i style="width:${l / WORDS.length * 100}%;background:var(--vd)"></i></div>
   <div class="prow"><span>例文</span><b>1000文</b></div><p class="small muted" style="margin:0">レッスン完了 ${ST.lessons || 0} 回</p>`;
  $('#hBadges').innerHTML = badges().map(([e, n, d, ok]) => `<div class="bdg${ok ? ' got' : ''}" title="${esc(d)}"><span class="be">${e}</span><b>${esc(n)}</b><span>${esc(d)}</span></div>`).join('');
  $('#hGoalSeg').innerHTML = [20, 50, 100, 200].map(v => `<button data-g="${v}" aria-pressed="${g === v}">${v} XP</button>`).join('');
}

export function initHome() {
  $('#hNext').onclick = e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'verb') go('drill');
    else if (a === 'word') { go('words'); const i = nextThemeIndex(); startWordLesson(i < 0 ? 0 : i); }
    else if (a === 'listen') go('listen');
    else go('learn');
  };
  $('#hGoalSeg').onclick = e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-g]'); if (!b) return;
    ST.goal = +b.dataset.g!; save(); renderHome();
  };
  onShow('home', renderHome);
}
