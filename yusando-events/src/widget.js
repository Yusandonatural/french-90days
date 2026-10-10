// yusando.com に貼る月カレンダー。worker が `(widget)(設定)` の形で配信する。
// この関数は文字列にしてブラウザで動かすので、外の変数は使わないこと。
export function widget(cfg) {
  const COLORS = {
    farm: '#4E7A3A', cafe: '#B5793B', stay: '#3F6E8C', closed: '#9A948A', event: '#8A4F7D',
  };
  const WD = ['日', '月', '火', '水', '木', '金', '土'];
  const label = (id) => (cfg.categories.find((c) => c.id === id) || {}).label || '';

  const css = `
.yse{--yse-line:#E4DED3;--yse-bg:#fff;--yse-sub:#7A7368;--yse-ink:#2F2A24;--yse-today:#F6F1E6;
  font-family:inherit;color:var(--yse-ink);max-width:960px;margin:0 auto;line-height:1.5}
.yse *{box-sizing:border-box}
.yse-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 12px}
.yse-title{font-size:1.4em;font-weight:600;margin:0;letter-spacing:.05em}
.yse-nav{display:flex;gap:6px}
.yse-btn{min-width:44px;min-height:44px;padding:0 12px;border:1px solid var(--yse-line);background:var(--yse-bg);
  color:inherit;border-radius:10px;font:inherit;cursor:pointer;white-space:nowrap}
.yse-btn:hover{background:var(--yse-today)}
.yse-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin:0 0 12px;padding:0;list-style:none;font-size:.85em;color:var(--yse-sub)}
.yse-legend li{display:flex;align-items:center;gap:6px}
.yse-dot{width:10px;height:10px;border-radius:50%;display:inline-block;flex:none}
.yse-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-top:1px solid var(--yse-line);border-left:1px solid var(--yse-line)}
.yse-wd,.yse-cell{border-right:1px solid var(--yse-line);border-bottom:1px solid var(--yse-line)}
.yse-wd{padding:6px 4px;text-align:center;font-size:.8em;color:var(--yse-sub);background:var(--yse-today)}
.yse-wd.sun,.yse-cell.sun .yse-num{color:#B04A3A}.yse-wd.sat,.yse-cell.sat .yse-num{color:#3F6E8C}
.yse-cell{min-height:96px;padding:4px;background:var(--yse-bg);overflow:hidden}
.yse-cell.out{background:#FAF8F4}.yse-cell.out .yse-num{opacity:.35}
.yse-cell.today{background:var(--yse-today)}
.yse-num{font-size:.8em;display:block;margin-bottom:2px}
.yse-ev{display:block;width:100%;text-align:left;border:0;border-radius:6px;padding:2px 6px;margin:0 0 3px;
  font:inherit;font-size:.75em;color:#fff;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.yse-list{display:none;margin:0;padding:0;list-style:none}
.yse-day{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--yse-line)}
.yse-date{flex:none;width:3.6em;text-align:center}
.yse-date b{display:block;font-size:1.3em;line-height:1.1}.yse-date span{font-size:.75em;color:var(--yse-sub)}
.yse-items{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.yse-item{display:flex;gap:8px;align-items:flex-start;text-align:left;border:0;background:none;padding:0;font:inherit;color:inherit;cursor:pointer}
.yse-item .yse-dot{margin-top:.45em}
.yse-time{font-size:.8em;color:var(--yse-sub)}
.yse-empty{padding:24px 0;text-align:center;color:var(--yse-sub)}
.yse-detail{margin-top:14px;padding:14px 16px;border:1px solid var(--yse-line);border-radius:12px;background:var(--yse-bg)}
.yse-detail h3{margin:0 0 4px;font-size:1.1em}
.yse-detail p{margin:6px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}
.yse-detail a{color:inherit}
.yse-tag{display:inline-block;font-size:.75em;color:#fff;border-radius:999px;padding:1px 10px;margin-bottom:6px}
.yse-msg{font-size:.85em;color:var(--yse-sub);margin-top:8px}
@media (max-width:640px){.yse-grid,.yse-wide{display:none}.yse-list{display:block}.yse-title{font-size:1.2em}}
`;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  // 説明文の URL だけリンクにする（それ以外は文字のまま）
  function linkify(p, text) {
    const parts = text.replace(/<[^>]+>/g, '').split(/(https?:\/\/[^\s<>"]+)/g);
    for (const part of parts) {
      if (/^https?:\/\//.test(part)) {
        const a = el('a', null, part);
        a.href = part; a.target = '_blank'; a.rel = 'noopener';
        p.append(a);
      } else if (part) p.append(document.createTextNode(part));
    }
  }
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const todayJST = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const timeOf = (ev) => (ev.allDay ? '' : `${ev.start.slice(11)}〜${ev.end.slice(11)}`);

  // 予定を日ごとに振り分ける（複数日の予定は各日に出す）
  function byDay(events) {
    const map = {};
    for (const ev of events) {
      let d = new Date(ev.start.slice(0, 10) + 'T00:00:00Z');
      const last = ev.end.slice(0, 10) < ev.start.slice(0, 10) ? ev.start.slice(0, 10) : ev.end.slice(0, 10);
      for (let i = 0; i < 62 && ymd(d) <= last; i++, d = new Date(d.getTime() + 86400000)) {
        (map[ymd(d)] = map[ymd(d)] || []).push(ev);
      }
    }
    return map;
  }

  function mount(root) {
    root.classList.add('yse');
    const head = el('div', 'yse-head');
    const title = el('h2', 'yse-title');
    const nav = el('div', 'yse-nav');
    const prev = el('button', 'yse-btn', '‹');
    const today = el('button', 'yse-btn', '今月');
    const next = el('button', 'yse-btn', '›');
    prev.append(el('span', 'yse-wide', ' 前の月')); prev.setAttribute('aria-label', '前の月');
    next.prepend(el('span', 'yse-wide', '次の月 ')); next.setAttribute('aria-label', '次の月');
    [prev, today, next].forEach((b) => { b.type = 'button'; nav.append(b); });
    head.append(title, nav);

    const legend = el('ul', 'yse-legend');
    for (const c of cfg.categories) {
      const li = el('li');
      const dot = el('span', 'yse-dot'); dot.style.background = COLORS[c.id];
      li.append(dot, document.createTextNode(c.label));
      legend.append(li);
    }
    const grid = el('div', 'yse-grid');
    const list = el('ul', 'yse-list');
    const detail = el('div', 'yse-detail'); detail.hidden = true;
    const msg = el('p', 'yse-msg'); msg.hidden = true;
    root.replaceChildren(head, legend, grid, list, detail, msg);

    const start = (root.dataset.month || todayJST().slice(0, 7)).split('-').map(Number);
    let y = start[0], m = start[1];

    function show(ev) {
      detail.replaceChildren();
      const tag = el('span', 'yse-tag', label(ev.category)); tag.style.background = COLORS[ev.category];
      const sd = ev.start.slice(0, 10).replace(/-/g, '/');
      const ed = ev.end.slice(0, 10).replace(/-/g, '/');
      const when = (sd === ed ? sd : `${sd}〜${ed}`) + (ev.allDay ? '' : ` ${timeOf(ev)}`);
      detail.append(tag, el('h3', null, ev.title), el('div', 'yse-time', when));
      if (ev.location) detail.append(el('p', null, `📍 ${ev.location}`));
      if (ev.description) { const p = el('p'); linkify(p, ev.description); detail.append(p); }
      detail.hidden = false;
      detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function render(events) {
      title.textContent = `${y}年${m}月の予定`;
      const days = byDay(events);
      const first = new Date(Date.UTC(y, m - 1, 1));
      const gridStart = new Date(first.getTime() - first.getUTCDay() * 86400000);
      const t = todayJST();

      grid.replaceChildren(...WD.map((w, i) => el('div', `yse-wd${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}`, w)));
      for (let i = 0; i < 42; i++) {
        const d = new Date(gridStart.getTime() + i * 86400000);
        if (i >= 35 && d.getUTCMonth() !== m - 1) break;
        const key = ymd(d);
        const cell = el('div', 'yse-cell');
        if (d.getUTCMonth() !== m - 1) cell.classList.add('out');
        if (key === t) cell.classList.add('today');
        if (d.getUTCDay() === 0) cell.classList.add('sun');
        if (d.getUTCDay() === 6) cell.classList.add('sat');
        cell.append(el('span', 'yse-num', String(d.getUTCDate())));
        for (const ev of days[key] || []) {
          const b = el('button', 'yse-ev', ev.title);
          b.type = 'button'; b.style.background = COLORS[ev.category];
          b.title = [ev.title, timeOf(ev)].filter(Boolean).join(' ');
          b.onclick = () => show(ev);
          cell.append(b);
        }
        grid.append(cell);
      }

      list.replaceChildren();
      const keys = Object.keys(days).filter((k) => k.startsWith(`${y}-${pad(m)}`)).sort();
      if (!keys.length) list.append(el('li', 'yse-empty', 'この月の予定はまだありません'));
      for (const k of keys) {
        const d = new Date(k + 'T00:00:00Z');
        const li = el('li', 'yse-day');
        const date = el('div', 'yse-date');
        date.append(el('b', null, String(d.getUTCDate())), el('span', null, `${m}月・${WD[d.getUTCDay()]}`));
        const items = el('div', 'yse-items');
        for (const ev of days[k]) {
          const it = el('button', 'yse-item'); it.type = 'button';
          const dot = el('span', 'yse-dot'); dot.style.background = COLORS[ev.category];
          const txt = el('span');
          txt.append(el('span', null, ev.title));
          if (!ev.allDay) txt.append(document.createTextNode(' '), el('span', 'yse-time', timeOf(ev)));
          it.append(dot, txt);
          it.onclick = () => show(ev);
          items.append(it);
        }
        li.append(date, items);
        list.append(li);
      }
    }

    async function load() {
      const month = `${y}-${pad(m)}`;
      detail.hidden = true; msg.hidden = true;
      title.textContent = `${y}年${m}月の予定`;
      try {
        const res = await fetch(`${cfg.api}?month=${month}`);
        const data = await res.json();
        if (month !== `${y}-${pad(m)}`) return; // 連打で古い月が後から届いたとき
        render(data.events || []);
        if (data.error) { msg.textContent = '予定を読み込めませんでした。時間をおいてもう一度お試しください。'; msg.hidden = false; }
      } catch (e) {
        render([]);
        msg.textContent = '予定を読み込めませんでした。時間をおいてもう一度お試しください。';
        msg.hidden = false;
      }
    }
    const move = (k) => { m += k; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } load(); };
    prev.onclick = () => move(-1);
    next.onclick = () => move(1);
    today.onclick = () => { [y, m] = todayJST().slice(0, 7).split('-').map(Number); load(); };
    load();
  }

  function init() {
    if (!document.getElementById('yse-style')) {
      const s = el('style', null, css); s.id = 'yse-style'; document.head.append(s);
    }
    document.querySelectorAll('#yusando-events, [data-yusando-events]').forEach((root) => {
      if (!root.dataset.yseMounted) { root.dataset.yseMounted = '1'; mount(root); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
