// yusando.com に貼る月カレンダー。worker が `(widget)(設定)` の形で配信する。
// この関数は文字列にしてブラウザで動かすので、外の変数は使わないこと。
export function widget(cfg) {
  // 抹茶・ほうじ茶・藍・灰・葡萄。文字色（濃）と面の色（淡）の組
  const COLORS = {
    farm: ['#4F6B3C', '#E7EDDF'],
    cafe: ['#8A5A2E', '#F3E8DA'],
    stay: ['#3E5A70', '#E1E9EF'],
    closed: ['#76716A', '#ECEAE6'],
    event: ['#7A4766', '#F1E4EC'],
  };
  const MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MON_EN = MONTH_EN.map((x) => x.slice(0, 3));
  const DAY = 86400000;
  // 日本語・英語の文言。サイトの言語（<html lang>）に合わせ、カレンダー右上のボタンでも切り替えられる
  const T = {
    ja: {
      wd: ['日', '月', '火', '水', '木', '金', '土'], today: '今月', prev: '前の月', next: '次の月', close: '閉じる',
      empty: 'この月の予定は、まだありません', error: '予定を読み込めませんでした。時間をおいてもう一度お試しください。',
      share: 'この予定をシェア', shareBtn: 'シェア', copy: 'リンクをコピー', copied: 'リンクをコピーしました',
      copyPrompt: 'このリンクをコピーしてください', gcal: 'Googleカレンダーに追加', allDay: '終日', tag: '#悠三堂',
      more: (n) => `ほか ${n} 件`, shareOn: (n) => `${n}でシェア`, langBtn: 'English', langLabel: 'Switch to English',
      viewCal: 'カレンダー', viewList: '予定一覧', dayEmpty: 'この日の予定はありません',
      cat: { farm: 'オープンファーム', cafe: 'カフェ営業', stay: '宿泊可', closed: 'お休み', event: 'イベント' },
    },
    en: {
      wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], today: 'Today', prev: 'Previous month', next: 'Next month', close: 'Close',
      empty: 'No events this month yet', error: 'Could not load events. Please try again later.',
      share: 'Share this event', shareBtn: 'Share', copy: 'Copy link', copied: 'Link copied',
      copyPrompt: 'Copy this link', gcal: 'Add to Google Calendar', allDay: 'All day', tag: '#Yusando', mt: 'Translated automatically from Japanese.',
      more: (n) => `+${n} more`, shareOn: (n) => `Share on ${n}`, langBtn: '日本語', langLabel: '日本語に切り替え',
      viewCal: 'Calendar', viewList: 'Events', dayEmpty: 'No events on this day',
      cat: { farm: 'Open Farm', cafe: 'Café', stay: 'Stay', closed: 'Closed', event: 'Event' },
    },
  };
  let lang = 'ja';
  const t = () => T[lang];
  const label = (id) => t().cat[id] || t().cat.event;
  // 予定のタイトル・場所は「日本語 / English」、説明は「---」だけの行で日本語と英語を分けて書ける
  // 英語を書いていない予定は、worker が付けた機械翻訳（titleEn など）を英語表示に使う
  const pickLine = (s, en) => {
    const p = (s || '').split(/\s+\/\s+|\s*｜\s*/);
    if (lang !== 'en') return p[0] || '';
    return p[1] || en || p[0] || '';
  };
  const pickText = (s, en) => {
    const p = (s || '').split(/\n\s*[-—–]{3,}\s*\n/);
    if (lang !== 'en') return (p[0] || '').trim();
    return (p[1] || en || p[0] || '').trim();
  };
  const titleOf = (ev) => pickLine(ev.title, ev.titleEn);
  const placeOf = (ev) => pickLine(ev.location, ev.locationEn);
  const descOf = (ev) => pickText(ev.description, ev.descriptionEn);
  const ink = (id) => (COLORS[id] || COLORS.event)[0];
  const wash = (id) => (COLORS[id] || COLORS.event)[1];

  const css = `
:host{display:block}
.yse{--ink:#2B2722;--sub:#5F584C;--faint:#9A9183;--line:#E4DED3;--btn:#B9AF9F;--paper:#FFFFFF;--soft:#F7F4EE;--accent:#4F6B3C;
  --serif:"Shippori Mincho","Yu Mincho","YuMincho","Hiragino Mincho ProN","Noto Serif JP",serif;
  color:var(--ink);max-width:1040px;margin:0 auto;line-height:1.6;font-size:16px;text-align:left;font-feature-settings:"palt";-webkit-font-smoothing:antialiased}
.yse *{box-sizing:border-box}
:where(.yse) button{font-family:inherit;line-height:inherit;color:inherit;text-transform:none;letter-spacing:inherit;box-shadow:none}
.yse :focus-visible{outline:2px solid var(--accent);outline-offset:2px}

.yse-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin:0 0 20px}
.yse-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 6px}
.yse-eyebrow{margin:0;font-size:.72rem;letter-spacing:.32em;color:var(--sub)}
.yse-lang{min-height:34px;padding:0 16px;border-radius:999px;border:1px solid var(--accent);background:var(--accent);cursor:pointer;
  font-size:.78rem;letter-spacing:.08em;color:#fff;white-space:nowrap}
.yse-lang:hover{background:#3E5630;border-color:#3E5630}
.yse-title{margin:0;display:flex;align-items:baseline;gap:14px;font-family:var(--serif);font-weight:500;line-height:1}
.yse-m{font-size:clamp(2.4rem,6vw,3.4rem);letter-spacing:.02em}
.yse-m small{font-size:.42em;margin-left:.12em}
.yse-en{font-size:.85rem;letter-spacing:.24em;color:var(--sub);font-family:var(--serif)}
.yse-nav{display:flex;align-items:center;gap:4px}
.yse-icon{width:44px;height:44px;border-radius:50%;border:1px solid var(--btn);background:var(--paper);color:var(--ink);cursor:pointer;
  display:grid;place-items:center;transition:background .2s,border-color .2s}
.yse-icon:hover{background:var(--soft);border-color:var(--ink)}
.yse-icon svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.5}
.yse-today{height:44px;padding:0 18px;border-radius:999px;border:1px solid var(--btn);background:var(--paper);cursor:pointer;font-size:.85rem;
  letter-spacing:.1em;color:var(--ink);white-space:nowrap}
.yse-today:hover{background:var(--soft);border-color:var(--ink)}

.yse-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px;padding:0;list-style:none}
.yse-chip{display:inline-flex;align-items:center;gap:8px;min-height:38px;padding:0 15px 0 13px;border-radius:999px;
  border:1px solid var(--c);background:var(--w);color:var(--c);cursor:pointer;font-size:.82rem;font-weight:600;letter-spacing:.06em;transition:all .2s}
.yse-chip i{width:9px;height:9px;border-radius:50%;flex:none;background:var(--c)}
.yse-chip:hover{filter:brightness(.97)}
.yse-chip[aria-pressed="false"]{color:var(--faint);background:var(--paper);border-color:var(--line);font-weight:400;text-decoration:line-through}
.yse-chip[aria-pressed="false"] i{background:var(--faint)}

.yse-board{background:var(--paper);border:1px solid var(--line);border-radius:20px;overflow:hidden;
  box-shadow:0 1px 2px rgba(43,39,34,.03),0 12px 32px -18px rgba(43,39,34,.18)}
.yse-wds,.yse-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}
.yse-wds{border-bottom:1px solid var(--line)}
.yse-wd{padding:12px 0 10px;text-align:center;font-size:.72rem;letter-spacing:.2em;color:var(--sub)}
.yse-wd.sun{color:#A8584A}.yse-wd.sat{color:#4F6F86}
.yse-week{border-bottom:1px solid var(--line)}.yse-week:last-child{border-bottom:0}
.yse-cell{min-height:118px;padding:8px 0 10px;border-right:1px solid var(--line);min-width:0}
.yse-cell:last-child{border-right:0}
.yse-cell.out{background:var(--soft)}.yse-cell.out .yse-n{color:var(--faint)}
.yse-n{display:inline-grid;place-items:center;width:28px;height:28px;margin:0 0 4px 8px;border-radius:50%;
  font-family:var(--serif);font-size:.95rem;line-height:1}
.yse-cell.sun .yse-n{color:#A8584A}.yse-cell.sat .yse-n{color:#4F6F86}
.yse-cell.today .yse-n{background:var(--ink);color:#fff}
.yse-ev{display:block;width:calc(100% - 12px);margin:0 6px 4px;padding:4px 8px;border:0;
  border-radius:6px;cursor:pointer;text-align:left;font-size:.74rem;line-height:1.4;white-space:nowrap;overflow:hidden;
  transition:filter .15s,transform .15s}
.yse-ev:hover{filter:brightness(.97);transform:translateY(-1px)}
.yse-ev b{display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis}
.yse-ev em{display:block;font-style:normal;font-size:.66rem;opacity:.75;font-variant-numeric:tabular-nums;letter-spacing:.03em}
.yse-ev.cl{margin-left:0;border-top-left-radius:0;border-bottom-left-radius:0;width:calc(100% - 6px)}
.yse-ev.cr{margin-right:0;border-top-right-radius:0;border-bottom-right-radius:0;width:calc(100% - 6px)}
.yse-ev.cr{margin-right:-1px;width:calc(100% - 5px)}
.yse-ev.cl.cr{width:calc(100% + 1px)}
.yse-ev.cl b{visibility:hidden}.yse-ev.cl.wk b{visibility:visible}
.yse-ev.ghost{visibility:hidden;pointer-events:none}
.yse-more{display:block;margin:0 10px;font-size:.7rem;color:var(--sub)}

.yse-list{margin:0;padding:0;list-style:none}
.yse-board.list{padding:0 20px}
.yse-panel{display:none}
.yse-sec{margin:0 0 10px;font-family:var(--serif);font-weight:500;font-size:1.05rem;letter-spacing:.12em;color:var(--ink)}
.yse-sec.cal{margin-top:36px}
.yse-day{display:grid;grid-template-columns:56px 1fr;gap:14px;padding:16px 4px;border-bottom:1px solid var(--line)}
.yse-day:last-child{border-bottom:0}
.yse-date{text-align:center;padding-top:2px}
.yse-date b{display:block;font-family:var(--serif);font-weight:500;font-size:1.7rem;line-height:1}
.yse-date span{display:block;margin-top:6px;font-size:.7rem;letter-spacing:.15em;color:var(--sub)}
.yse-date.sun span{color:#A8584A}.yse-date.sat span{color:#4F6F86}
.yse-date.today b{color:var(--accent)}
.yse-items{display:flex;flex-direction:column;gap:8px;min-width:0}
.yse-item{display:block;width:100%;text-align:left;border:0;border-radius:12px;padding:11px 14px;cursor:pointer}
.yse-item b{display:block;font-weight:600;font-size:.92rem;color:var(--ink)}
.yse-item span{font-size:.75rem;letter-spacing:.04em}

.yse-panel h3{margin:0 0 10px;font-family:var(--serif);font-weight:500;font-size:1.05rem}
.yse-panel .yse-items{gap:8px}
.yse-panel .yse-empty{padding:12px 0;text-align:left}
.yse-empty{padding:48px 16px;text-align:center;color:var(--sub);font-size:.85rem;letter-spacing:.08em}
.yse-msg{margin:12px 0 0;font-size:.8rem;color:var(--sub);text-align:center}
.yse.loading .yse-board{opacity:.55;transition:opacity .2s}

.yse-scrim{max-width:none;margin:0;position:fixed;inset:0;z-index:2147483000;background:rgba(30,27,23,.38);display:grid;place-items:center;padding:16px;
  opacity:0;transition:opacity .2s;backdrop-filter:blur(2px)}
.yse-scrim.on{opacity:1}
.yse-dlg{position:relative;width:min(520px,100%);max-height:calc(100vh - 32px);overflow:auto;background:var(--paper);
  border-radius:20px;padding:28px 28px 24px;box-shadow:0 24px 60px -20px rgba(0,0,0,.35);transform:translateY(8px);
  transition:transform .25s;color:var(--ink);line-height:1.7}
.yse-scrim.on .yse-dlg{transform:none}
.yse-dlg:focus{outline:none}
.yse-close{position:absolute;top:12px;right:12px;border:0;background:none}
.yse-tag{display:inline-flex;align-items:center;gap:6px;font-size:.72rem;letter-spacing:.12em;padding:4px 12px;border-radius:999px}
.yse-dlg h3{margin:14px 0 6px;font-family:var(--serif);font-weight:500;font-size:1.45rem;line-height:1.4}
.yse-when{margin:0;font-size:.85rem;color:var(--sub);letter-spacing:.04em}
.yse-row{display:flex;gap:10px;margin:14px 0 0;font-size:.88rem}
.yse-row svg{flex:none;width:18px;height:18px;margin-top:3px;stroke:var(--sub);fill:none;stroke-width:1.5}
.yse-desc{margin:18px 0 0;padding-top:16px;border-top:1px solid var(--line);white-space:pre-wrap;overflow-wrap:anywhere;font-size:.9rem}
.yse-desc a,.yse-row a{color:var(--accent)}
.yse-mt{margin:10px 0 0;font-size:.72rem;color:var(--sub);font-style:italic}
.yse-add{display:inline-flex;align-items:center;gap:8px;margin-top:22px;min-height:44px;padding:0 18px;border-radius:999px;
  border:1px solid var(--btn);color:var(--ink);text-decoration:none;font-size:.82rem;letter-spacing:.06em;white-space:nowrap}
.yse-add svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.5;flex:none}
.yse-add:hover{background:var(--soft)}

.yse-share{margin-top:22px;padding-top:18px;border-top:1px solid var(--line)}
.yse-share-h{margin:0 0 10px;font-size:.72rem;letter-spacing:.24em;color:var(--sub)}
.yse-share-row{display:flex;flex-wrap:wrap;gap:8px}
.yse-sbtn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:40px;padding:0 16px;border-radius:999px;
  border:1px solid var(--btn);background:var(--paper);color:var(--ink);cursor:pointer;text-decoration:none;font-size:.8rem;letter-spacing:.04em;white-space:nowrap}
.yse-sbtn:hover{background:var(--soft)}
.yse-sbtn svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.5}
.yse-sbtn.main{background:var(--ink);border-color:var(--ink);color:#fff}
.yse-sbtn.main:hover{background:#000}
.yse-toast{margin:10px 0 0;font-size:.75rem;color:var(--accent);min-height:1.2em}
@media (max-width:680px){
  .yse-head{align-items:center;margin-bottom:16px}
  .yse-en{display:none}
  .yse-eyebrow{letter-spacing:.18em;white-space:nowrap}
  .yse-board{border-radius:16px;padding:0 12px}
  .yse-board.grid{padding:0}
  .yse-sec.cal{margin-top:28px}
  .yse-wd{letter-spacing:0;font-size:.7rem;padding:10px 0 8px}
  .yse-cell{min-height:64px;padding:4px 0 6px;cursor:pointer}
  .yse-n{display:grid;width:26px;height:26px;margin:0 auto 4px;font-size:.85rem}
  .yse-cell.sel{background:var(--soft);box-shadow:inset 0 0 0 2px var(--ink)}
  .yse-ev{height:6px;padding:0;margin:0 4px 3px;width:calc(100% - 8px);border-radius:3px;pointer-events:none;background:currentColor!important}
  .yse-ev.cl,.yse-ev.cr{width:calc(100% - 4px)}.yse-ev.cl.cr{width:calc(100% + 1px)}
  .yse-ev b,.yse-ev em{display:none}
  .yse-more{margin:0 4px;font-size:.6rem;text-align:center}
  .yse-panel{display:block;padding:16px 14px 18px;border-top:1px solid var(--line)}
  .yse-scrim{place-items:end center;padding:0}
  .yse-dlg{border-radius:20px 20px 0 0;padding:24px 20px calc(20px + env(safe-area-inset-bottom));transform:translateY(24px)}
}
@media (prefers-reduced-motion:reduce){.yse *{transition:none!important}}
`;

  const ICON = {
    prev: '<path d="M15 5l-7 7 7 7"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    share: '<path d="M12 15V4M8 8l4-4 4 4"/><path d="M6 12v6.5A1.5 1.5 0 007.5 20h9a1.5 1.5 0 001.5-1.5V12"/>',
    link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
    plus: '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 9.5h16M8 3v4M16 3v4M12 12.5v5M9.5 15h5"/>',
  };
  function svg(name) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ICON[name];
    return s;
  }
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  // 説明文の URL だけリンクにする（それ以外は文字のまま）
  function linkify(p, text) {
    const parts = text.replace(/#写真[:：]\S+/g, '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').split(/(https?:\/\/[^\s<>"]+)/g);
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
  const dateOf = (s) => new Date(s.slice(0, 10) + 'T00:00:00Z');
  const todayJST = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const timeOf = (ev) => (ev.allDay ? '' : `${ev.start.slice(11)} – ${ev.end.slice(11)}`);
  const lastDay = (ev) => (ev.end.slice(0, 10) < ev.start.slice(0, 10) ? ev.start.slice(0, 10) : ev.end.slice(0, 10));
  const multi = (ev) => lastDay(ev) > ev.start.slice(0, 10);
  const shortDate = (s) => {
    const d = dateOf(s), w = t().wd[d.getUTCDay()];
    return lang === 'en' ? `${w}, ${MON_EN[d.getUTCMonth()]} ${d.getUTCDate()}` : `${d.getUTCMonth() + 1}/${d.getUTCDate()}（${w}）`;
  };
  const longDate = (s) => {
    const d = dateOf(s), w = t().wd[d.getUTCDay()];
    return lang === 'en' ? `${w}, ${MON_EN[d.getUTCMonth()]} ${d.getUTCDate()}` : `${d.getUTCMonth() + 1}月${d.getUTCDate()}日（${w}）`;
  };

  function whenText(ev) {
    const a = longDate(ev.start), b = longDate(ev.end), to = lang === 'en' ? ' – ' : ' 〜 ';
    if (ev.allDay) return multi(ev) ? `${a}${to}${b}` : `${a}${lang === 'en' ? ', ' : ' '}${t().allDay}`;
    return ev.start.slice(0, 10) === ev.end.slice(0, 10) ? `${a} ${timeOf(ev)}` : `${a} ${ev.start.slice(11)}${to}${b} ${ev.end.slice(11)}`;
  }
  // Google カレンダーに追加するリンク
  function gcalLink(ev) {
    const compact = (s) => s.replace(/[-:]/g, '');
    let dates;
    if (ev.allDay) {
      const end = new Date(dateOf(ev.end).getTime() + DAY);
      dates = `${compact(ev.start)}/${compact(ymd(end))}`;
    } else dates = `${compact(ev.start)}00/${compact(ev.end)}00`;
    const q = new URLSearchParams({ action: 'TEMPLATE', text: titleOf(ev), dates, ctz: 'Asia/Tokyo' });
    if (ev.location) q.set('location', placeOf(ev));
    if (ev.description) q.set('details', descOf(ev).replace(/<[^>]+>/g, ''));
    return `https://calendar.google.com/calendar/render?${q}`;
  }

  // 予定を日ごとに振り分ける。複数日の予定を先に、同じ並びで置く（帯がそろうように）
  function byDay(events) {
    const sorted = [...events].sort((a, b) => (multi(b) - multi(a)) || (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
    const map = {};
    for (const ev of sorted) {
      const last = lastDay(ev);
      for (let d = dateOf(ev.start), i = 0; i < 62 && ymd(d) <= last; i++, d = new Date(d.getTime() + DAY)) {
        (map[ymd(d)] = map[ymd(d)] || []).push(ev);
      }
    }
    return map;
  }

  // ---- SNS シェア ----
  const shareUrl = (ev) => `${cfg.share}${ev.id}`;
  const shareText = (ev) => `${titleOf(ev)}\n${whenText(ev)}\n${t().tag}`;
  const intents = (ev) => {
    const u = encodeURIComponent(shareUrl(ev)), t = encodeURIComponent(shareText(ev));
    return [
      ['X', `https://twitter.com/intent/tweet?text=${t}&url=${u}`],
      ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${u}`],
      ['LINE', `https://social-plugins.line.me/lineit/share?url=${u}&text=${t}`],
    ];
  };

  function shareBox(ev) {
    const box = el('div', 'yse-share');
    box.append(el('p', 'yse-share-h', t().share));
    const row = el('div', 'yse-share-row');
    const toast = el('p', 'yse-toast');
    const say = (t) => { toast.textContent = t; setTimeout(() => { if (toast.textContent === t) toast.textContent = ''; }, 2500); };
    if (navigator.share) {
      const b = el('button', 'yse-sbtn main'); b.type = 'button';
      b.append(svg('share'), document.createTextNode(t().shareBtn));
      b.onclick = () => navigator.share({ title: titleOf(ev), text: shareText(ev), url: shareUrl(ev) }).catch(() => {});
      row.append(b);
    }
    for (const [name, href] of intents(ev)) {
      const a = el('a', 'yse-sbtn', name); a.href = href; a.target = '_blank'; a.rel = 'noopener';
      a.setAttribute('aria-label', t().shareOn(name));
      row.append(a);
    }
    const copy = el('button', 'yse-sbtn'); copy.type = 'button';
    copy.append(svg('link'), document.createTextNode(t().copy));
    copy.onclick = async () => {
      try { await navigator.clipboard.writeText(shareUrl(ev)); say(t().copied); }
      catch (e) { window.prompt(t().copyPrompt, shareUrl(ev)); }
    };
    row.append(copy);
    box.append(row, toast);
    return box;
  }

  function openDialog(ev, layer) {
    const scrim = el('div', 'yse-scrim yse');
    const dlg = el('div', 'yse-dlg');
    dlg.setAttribute('role', 'dialog');
    dlg.setAttribute('aria-modal', 'true');
    const close = el('button', 'yse-icon yse-close'); close.type = 'button'; close.setAttribute('aria-label', t().close);
    close.append(svg('close'));
    const tag = el('span', 'yse-tag', label(ev.category));
    tag.style.color = ink(ev.category); tag.style.background = wash(ev.category);
    const h = el('h3', null, titleOf(ev)); h.id = 'yse-dlg-title'; dlg.setAttribute('aria-labelledby', h.id);
    const when = el('div', 'yse-row'); when.append(svg('clock'), el('span', null, whenText(ev)));
    dlg.append(close, tag, h, when);
    if (ev.location) {
      const row = el('div', 'yse-row');
      const a = el('a', null, placeOf(ev));
      a.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeOf(ev))}`;
      a.target = '_blank'; a.rel = 'noopener';
      row.append(svg('pin'), a);
      dlg.append(row);
    }
    if (descOf(ev)) { const p = el('div', 'yse-desc'); linkify(p, descOf(ev)); dlg.append(p); }
    if (lang === 'en' && ev.machineTranslated) dlg.append(el('p', 'yse-mt', t().mt));
    const add = el('a', 'yse-add'); add.href = gcalLink(ev); add.target = '_blank'; add.rel = 'noopener';
    add.append(svg('plus'), document.createTextNode(t().gcal));
    dlg.append(add, shareBox(ev));
    scrim.append(dlg);

    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    const prevHash = location.hash;
    try { history.replaceState(null, '', `#e=${ev.id}`); } catch (e) { /* noop */ }
    const done = () => {
      try { history.replaceState(null, '', location.pathname + location.search + (prevHash.startsWith('#e=') ? '' : prevHash)); } catch (e) { /* noop */ }
      scrim.classList.remove('on');
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      setTimeout(() => scrim.remove(), 200);
      if (prevFocus && prevFocus.focus) prevFocus.focus();
    };
    const onKey = (e) => { if (e.key === 'Escape') done(); };
    close.onclick = done;
    scrim.onclick = (e) => { if (e.target === scrim) done(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    layer.append(scrim);
    requestAnimationFrame(() => scrim.classList.add('on'));
    dlg.tabIndex = -1;
    dlg.focus({ preventScroll: true });
  }

  // root はテーマの CSS が届かない Shadow DOM の中の箱。layer は詳細画面を重ねる場所
  function mount(root, layer, opts) {
    root.classList.add('yse');
    const top = el('div', 'yse-top');
    const eyebrow = el('p', 'yse-eyebrow');
    const langBtn = el('button', 'yse-lang'); langBtn.type = 'button';
    top.append(eyebrow, langBtn);
    const head = el('div', 'yse-head');
    const title = el('h2', 'yse-title');
    const nav = el('div', 'yse-nav');
    const prev = el('button', 'yse-icon'); prev.append(svg('prev'));
    const today = el('button', 'yse-today');
    const next = el('button', 'yse-icon'); next.append(svg('next'));
    [prev, today, next].forEach((b) => { b.type = 'button'; nav.append(b); });
    head.append(title, nav);

    // 種類の絞り込み
    const hidden = new Set();
    const chips = el('ul', 'yse-chips');
    const chipText = {};
    for (const c of cfg.categories) {
      const li = el('li');
      const b = el('button', 'yse-chip'); b.type = 'button'; b.setAttribute('aria-pressed', 'true');
      const dot = el('i');
      b.style.setProperty('--c', ink(c.id)); b.style.setProperty('--w', wash(c.id));
      chipText[c.id] = document.createTextNode('');
      b.append(dot, chipText[c.id]);
      b.onclick = () => {
        hidden.has(c.id) ? hidden.delete(c.id) : hidden.add(c.id);
        b.setAttribute('aria-pressed', String(!hidden.has(c.id)));
        render();
      };
      li.append(b); chips.append(li);
    }

    let selected = null; // スマホのマス目で選んだ日

    // 上に日ごとのリスト、その下に月のカレンダー
    const listHead = el('h3', 'yse-sec'), calHead = el('h3', 'yse-sec cal');
    const listBoard = el('div', 'yse-board list');
    const board = el('div', 'yse-board grid');
    const msg = el('p', 'yse-msg'); msg.hidden = true;
    root.replaceChildren(top, head, chips, listHead, listBoard, msg, calHead, board);

    // 言語が変わったときに書き換える部分
    function paint() {
      langBtn.textContent = t().langBtn;
      langBtn.setAttribute('aria-label', t().langLabel);
      prev.setAttribute('aria-label', t().prev);
      next.setAttribute('aria-label', t().next);
      today.textContent = t().today;
      listHead.textContent = t().viewList;
      calHead.textContent = t().viewCal;
      for (const id in chipText) chipText[id].textContent = label(id);
      msg.textContent = t().error;
      root.lang = lang;
      render();
    }
    langBtn.onclick = () => {
      lang = lang === 'ja' ? 'en' : 'ja';
      try { localStorage.setItem('yse-lang', lang); } catch (e) { /* noop */ }
      paint();
    };

    // シェアされたリンク（#e=20261018-xxxxxxxx）から来たら、その月を開いて予定を表示する
    const deep = (location.hash.match(/^#e=((\d{4})(\d{2})\d{2}-[0-9a-f]{8})$/) || []);
    let pendingOpen = deep[1] || null;
    const start = (deep[1] ? `${deep[2]}-${deep[3]}` : (opts.month || todayJST().slice(0, 7))).split('-').map(Number);
    let y = start[0], m = start[1];
    let events = [];

    function evButton(ev, key, weekStart, weekEnd) {
      const b = el('button', 'yse-ev'); b.type = 'button';
      b.style.color = ink(ev.category); b.style.background = wash(ev.category);
      if (multi(ev)) {
        if (key > ev.start.slice(0, 10)) b.classList.add('cl');
        if (key < lastDay(ev)) b.classList.add('cr');
        if (key === weekStart || (key.slice(8) === '01')) b.classList.add('wk');
        if (key === weekEnd) b.classList.remove('cr');
      }
      b.append(el('b', null, titleOf(ev)));
      if (!ev.allDay) b.append(el('em', null, timeOf(ev)));
      b.title = `${titleOf(ev)}　${whenText(ev)}`;
      b.onclick = (e) => { e.stopPropagation(); openDialog(ev, layer); };
      return b;
    }

    function itemButton(ev) {
      const it = el('button', 'yse-item'); it.type = 'button';
      it.style.color = ink(ev.category); it.style.background = wash(ev.category);
      const sep = lang === 'en' ? ' · ' : '・', to = lang === 'en' ? ' – ' : ' 〜 ';
      const when = ev.allDay ? (multi(ev) ? `${shortDate(ev.start)}${to}${shortDate(ev.end)}` : t().allDay) : timeOf(ev);
      it.append(el('b', null, titleOf(ev)), el('span', null, `${label(ev.category)}${sep}${when}`));
      it.onclick = () => openDialog(ev, layer);
      return it;
    }

    function render() {
      eyebrow.textContent = `YUSANDO EVENTS · ${y}`;
      title.replaceChildren();
      if (lang === 'en') {
        title.append(el('span', 'yse-m', MONTH_EN[m - 1]));
      } else {
        const mm = el('span', 'yse-m', String(m)); mm.append(el('small', null, '月'));
        title.append(mm, el('span', 'yse-en', MONTH_EN[m - 1]));
      }

      const shown = events.filter((e) => !hidden.has(e.category));
      const days = byDay(shown);
      const first = new Date(Date.UTC(y, m - 1, 1));
      const gridStart = new Date(first.getTime() - first.getUTCDay() * DAY);
      const now = todayJST();
      const prefix = `${y}-${pad(m)}`;
      if (!selected || !selected.startsWith(prefix)) {
        const firstEv = Object.keys(days).filter((k) => k.startsWith(prefix)).sort()[0];
        selected = now.startsWith(prefix) ? now : firstEv || `${prefix}-01`;
      }

      board.replaceChildren();
      const wds = el('div', 'yse-wds');
      t().wd.forEach((w, i) => wds.append(el('div', `yse-wd${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}`, w)));
      board.append(wds);

      for (let w = 0; w < 6; w++) {
        const ws = new Date(gridStart.getTime() + w * 7 * DAY);
        if (w > 0 && ws.getUTCMonth() !== m - 1) break;
        const row = el('div', 'yse-week');
        const wsKey = ymd(ws), weKey = ymd(new Date(ws.getTime() + 6 * DAY));
        // この週の複数日予定に段を割り当て、帯の高さをそろえる
        const lanes = [];
        for (let i = 0; i < 7; i++) {
          for (const ev of days[ymd(new Date(ws.getTime() + i * DAY))] || []) {
            if (multi(ev) && !lanes.includes(ev)) lanes.push(ev);
          }
        }
        for (let i = 0; i < 7; i++) {
          const d = new Date(ws.getTime() + i * DAY);
          const key = ymd(d);
          const cell = el('div', 'yse-cell');
          if (d.getUTCMonth() !== m - 1) cell.classList.add('out');
          if (key === now) cell.classList.add('today');
          if (key === selected) cell.classList.add('sel');
          if (d.getUTCMonth() === m - 1) cell.onclick = () => { selected = key; render(); };
          if (i === 0) cell.classList.add('sun');
          if (i === 6) cell.classList.add('sat');
          cell.append(el('span', 'yse-n', String(d.getUTCDate())));
          const list = days[key] || [];
          for (const ev of lanes) {
            if (list.includes(ev)) cell.append(evButton(ev, key, wsKey, weKey));
            else if (lanes.indexOf(ev) < lanes.findLastIndex((e) => list.includes(e))) {
              const g = el('span', 'yse-ev ghost', '·'); cell.append(g);
            }
          }
          const singles = list.filter((ev) => !multi(ev));
          singles.slice(0, 3).forEach((ev) => cell.append(evButton(ev, key, wsKey, weKey)));
          if (singles.length > 3) cell.append(el('span', 'yse-more', t().more(singles.length - 3)));
          row.append(cell);
        }
        board.append(row);
      }

      // スマホのマス目：選んだ日の予定
      const panel = el('div', 'yse-panel');
      panel.append(el('h3', null, longDate(selected)));
      const dayItems = el('div', 'yse-items');
      const sel = days[selected] || [];
      if (!sel.length) dayItems.append(el('p', 'yse-empty', t().dayEmpty));
      sel.forEach((ev) => dayItems.append(itemButton(ev)));
      panel.append(dayItems);
      board.append(panel);

      const list = el('ul', 'yse-list');
      const firstKey = (ev) => (ev.start.slice(0, 7) < prefix ? `${prefix}-01` : ev.start.slice(0, 10));
      const daily = {};
      for (const [k, evs] of Object.entries(days)) {
        if (!k.startsWith(prefix)) continue;
        const own = evs.filter((ev) => !multi(ev) || firstKey(ev) === k);
        if (own.length) daily[k] = own;
      }
      const keys = Object.keys(daily).sort();
      if (!keys.length) list.append(el('li', 'yse-empty', t().empty));
      for (const k of keys) {
        const d = dateOf(k);
        const li = el('li', 'yse-day');
        const date = el('div', 'yse-date');
        if (d.getUTCDay() === 0) date.classList.add('sun');
        if (d.getUTCDay() === 6) date.classList.add('sat');
        if (k === now) date.classList.add('today');
        date.append(el('b', null, String(d.getUTCDate())), el('span', null, t().wd[d.getUTCDay()]));
        const items = el('div', 'yse-items');
        for (const ev of daily[k]) items.append(itemButton(ev));
        li.append(date, items);
        list.append(li);
      }
      listBoard.replaceChildren(list);
    }

    async function load() {
      const month = `${y}-${pad(m)}`;
      msg.hidden = true;
      root.classList.add('loading');
      events = [];
      render();
      try {
        const res = await fetch(`${cfg.api}?month=${month}`);
        const data = await res.json();
        if (month !== `${y}-${pad(m)}`) return; // 連打で古い月が後から届いたとき
        events = data.events || [];
        if (data.error) throw new Error(data.error);
      } catch (e) {
        msg.textContent = t().error;
        msg.hidden = false;
      }
      root.classList.remove('loading');
      render();
      if (pendingOpen) {
        const ev = events.find((e) => e.id === pendingOpen);
        pendingOpen = null;
        if (ev) { root.scrollIntoView({ block: 'start' }); openDialog(ev, layer); }
      }
    }
    const move = (k) => { m += k; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } load(); };
    prev.onclick = () => move(-1);
    next.onclick = () => move(1);
    today.onclick = () => { [y, m] = todayJST().slice(0, 7).split('-').map(Number); load(); };
    paint();
    load();
  }

  function init() {
    let saved = null;
    try { saved = localStorage.getItem('yse-lang'); } catch (e) { /* noop */ }
    document.querySelectorAll('#yusando-events, [data-yusando-events]').forEach((host) => {
      if (host.dataset.yseMounted) return;
      host.dataset.yseMounted = '1';
      const pageLang = (host.dataset.lang || saved || document.documentElement.lang || 'ja').toLowerCase();
      lang = pageLang.startsWith('en') ? 'en' : 'ja';
      // テーマのボタンや見出しの CSS が入り込まないよう、Shadow DOM の中に描く
      const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
      const box = el('div');
      shadow.replaceChildren(el('style', null, css), box);
      mount(box, shadow, { month: host.dataset.month });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
