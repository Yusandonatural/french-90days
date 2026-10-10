// Googleカレンダーの iCal（.ics）を読み、月ごとの予定に展開する。
// 時刻はすべて日本時間（Asia/Tokyo）の "YYYY-MM-DDTHH:MM" / "YYYY-MM-DD" 文字列で扱う。

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// 種類の判定：タイトル先頭の [カフェ] などのタグ → タイトル中のことば の順に見る。
export const CATEGORIES = [
  { id: 'farm', label: 'オープンファーム', words: ['オープンファーム', 'open farm', '茶畑'] },
  { id: 'cafe', label: 'カフェ営業', words: ['カフェ', 'cafe', 'café'] },
  { id: 'stay', label: '宿泊可', words: ['宿泊', '民泊', 'stay'] },
  { id: 'closed', label: 'お休み', words: ['休業', '定休', 'お休み', 'closed'] },
];
export const OTHER = { id: 'event', label: 'イベント' };

export function categorize(title) {
  const t = title.toLowerCase();
  const tag = t.match(/^\s*[\[［【]([^\]］】]+)[\]］】]/);
  for (const target of tag ? [tag[1], t] : [t]) {
    const c = CATEGORIES.find((c) => c.words.some((w) => target.includes(w.toLowerCase())));
    if (c) return c.id;
  }
  return OTHER.id;
}
// 表示用にタイトル先頭のタグを外す
export function cleanTitle(title) {
  return title.replace(/^\s*[\[［【][^\]］】]+[\]］】]\s*/, '').trim();
}

// ---- iCal の読み取り ----

function unfold(text) {
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}
function unescapeText(v) {
  return v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
}

function parseLine(line) {
  const i = line.indexOf(':');
  if (i < 0) return null;
  const head = line.slice(0, i);
  const value = line.slice(i + 1);
  const [name, ...ps] = head.split(';');
  const params = {};
  for (const p of ps) {
    const [k, v] = p.split('=');
    params[k.toUpperCase()] = (v || '').replace(/^"|"$/g, '');
  }
  return { name: name.toUpperCase(), params, value };
}

// iCal の日時を、日本時間の「壁時計」ミリ秒（UTC として扱う）に直す
function parseDate(value, params) {
  const v = value.trim();
  if (params.VALUE === 'DATE' || /^\d{8}$/.test(v)) {
    return { ms: Date.UTC(+v.slice(0, 4), +v.slice(4, 6) - 1, +v.slice(6, 8)), allDay: true };
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!m) return null;
  let ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  if (m[7]) ms += JST_OFFSET_MS; // UTC → 日本時間
  // TZID 付き・浮動時刻は日本時間の壁時計とみなす（悠三堂の予定はすべて日本時間）
  return { ms, allDay: false };
}

export function parseICS(text) {
  const events = [];
  let cur = null;
  for (const raw of unfold(text).split('\n')) {
    const line = raw.trimEnd();
    if (line === 'BEGIN:VEVENT') { cur = { exdates: [] }; continue; }
    if (line === 'END:VEVENT') { if (cur && cur.start) events.push(cur); cur = null; continue; }
    if (!cur) continue;
    const p = parseLine(line);
    if (!p) continue;
    switch (p.name) {
      case 'UID': cur.uid = p.value; break;
      case 'SUMMARY': cur.title = unescapeText(p.value); break;
      case 'DESCRIPTION': cur.description = unescapeText(p.value); break;
      case 'LOCATION': cur.location = unescapeText(p.value); break;
      case 'STATUS': cur.status = p.value.toUpperCase(); break;
      case 'CLASS': cur.class = p.value.toUpperCase(); break;
      case 'DTSTART': cur.start = parseDate(p.value, p.params); break;
      case 'DTEND': cur.end = parseDate(p.value, p.params); break;
      case 'RRULE': cur.rrule = parseRRule(p.value); break;
      case 'EXDATE':
        for (const v of p.value.split(',')) { const d = parseDate(v, p.params); if (d) cur.exdates.push(d.ms); }
        break;
      case 'RECURRENCE-ID': cur.recurrenceId = parseDate(p.value, p.params); break;
    }
  }
  return events;
}

function parseRRule(value) {
  const r = {};
  for (const part of value.split(';')) {
    const [k, v] = part.split('=');
    r[k.toUpperCase()] = v;
  }
  return {
    freq: r.FREQ,
    interval: +(r.INTERVAL || 1),
    count: r.COUNT ? +r.COUNT : null,
    until: r.UNTIL ? parseDate(r.UNTIL, {}).ms : null,
    byday: r.BYDAY ? r.BYDAY.split(',') : null,
    bymonthday: r.BYMONTHDAY ? r.BYMONTHDAY.split(',').map(Number) : null,
  };
}

const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// 繰り返しの各回の開始時刻（壁時計ミリ秒）を、rangeEnd まで順に返す
function* occurrences(ev, rangeEnd) {
  const r = ev.rrule;
  const start = ev.start.ms;
  if (!r) { yield start; return; }
  const limit = Math.min(rangeEnd, r.until ?? Infinity);
  let emitted = 0;
  const emit = (ms) => {
    if (ms < start || ms > limit) return false;
    emitted++;
    return true;
  };
  const done = () => (r.count != null && emitted >= r.count);
  const timeOfDay = start % DAY_MS;
  const s = new Date(start);

  if (r.freq === 'DAILY') {
    for (let ms = start; ms <= limit && !done(); ms += r.interval * DAY_MS) if (emit(ms)) yield ms;
  } else if (r.freq === 'WEEKLY') {
    const days = (r.byday || [WEEKDAYS[s.getUTCDay()]]).map((d) => WEEKDAYS.indexOf(d.slice(-2))).sort();
    const weekStart = start - s.getUTCDay() * DAY_MS; // その週の日曜
    for (let w = weekStart; w <= limit && !done(); w += r.interval * 7 * DAY_MS) {
      for (const d of days) {
        if (done()) break;
        const ms = w + d * DAY_MS;
        if (emit(ms)) yield ms;
      }
    }
  } else if (r.freq === 'MONTHLY') {
    for (let y = s.getUTCFullYear(), m = s.getUTCMonth(); !done(); m += r.interval) {
      const base = Date.UTC(y, m, 1);
      if (base > limit) break;
      for (const ms of monthDays(base, r, s).map((d) => d + timeOfDay)) {
        if (done()) break;
        if (emit(ms)) yield ms;
      }
    }
  } else if (r.freq === 'YEARLY') {
    for (let y = s.getUTCFullYear(); !done(); y += r.interval) {
      const ms = Date.UTC(y, s.getUTCMonth(), s.getUTCDate()) + timeOfDay;
      if (ms > limit) break;
      if (emit(ms)) yield ms;
    }
  } else {
    yield start;
  }
}

// MONTHLY：その月の該当日（日付の0時）一覧
function monthDays(base, r, s) {
  const d0 = new Date(base);
  const y = d0.getUTCFullYear(), m = d0.getUTCMonth();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const out = [];
  if (r.byday) {
    for (const spec of r.byday) {
      const n = spec.length > 2 ? parseInt(spec, 10) : 0; // 2SA, -1SU など
      const wd = WEEKDAYS.indexOf(spec.slice(-2));
      const all = [];
      for (let day = 1; day <= last; day++) if (new Date(Date.UTC(y, m, day)).getUTCDay() === wd) all.push(day);
      const pick = n === 0 ? all : [n > 0 ? all[n - 1] : all[all.length + n]].filter(Boolean);
      for (const day of pick) out.push(Date.UTC(y, m, day));
    }
  } else {
    for (const day of r.bymonthday || [s.getUTCDate()]) {
      const dd = day < 0 ? last + day + 1 : day;
      if (dd >= 1 && dd <= last) out.push(Date.UTC(y, m, dd));
    }
  }
  return out.sort((a, b) => a - b);
}

// シェア用の短い ID："20261018-1a2b3c4d"（日付＋UID のハッシュ）。日付から月がわかる
export function eventId(uid, startMs) {
  let h = 0x811c9dc5;
  for (const ch of uid || '') { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return `${new Date(startMs).toISOString().slice(0, 10).replace(/-/g, '')}-${h.toString(16).padStart(8, '0')}`;
}
export const ID_RE = /^(\d{4})(\d{2})\d{2}-[0-9a-f]{8}$/;

export function findEvent(events, id) {
  const m = id.match(ID_RE);
  if (!m) return null;
  return eventsForMonth(events, `${m[1]}-${m[2]}`).find((e) => e.id === id) || null;
}

function fmt(ms, allDay) {
  const iso = new Date(ms).toISOString();
  return allDay ? iso.slice(0, 10) : iso.slice(0, 16);
}

// "2026-10" の月に重なる予定を、日本時間で返す
export function eventsForMonth(events, month) {
  const [y, m] = month.split('-').map(Number);
  const from = Date.UTC(y, m - 1, 1);
  const to = Date.UTC(y, m, 1);

  // 繰り返しの一部だけ変更・削除された回（RECURRENCE-ID）
  const overrides = new Map();
  for (const ev of events) {
    if (ev.recurrenceId) overrides.set(`${ev.uid}|${ev.recurrenceId.ms}`, ev);
  }

  const out = [];
  const push = (ev, startMs) => {
    if (ev.status === 'CANCELLED') return;
    if (ev.class === 'PRIVATE' || ev.class === 'CONFIDENTIAL') return;
    const allDay = ev.start.allDay;
    const dur = ev.end ? ev.end.ms - ev.start.ms : (allDay ? DAY_MS : 0);
    const endMs = startMs + dur;
    // 終日予定の終了日は「翌日」なので、重なり判定は endMs > from
    if (!(startMs < to && (endMs > from || (dur === 0 && startMs >= from)))) return;
    const title = ev.title || '';
    out.push({
      id: eventId(ev.uid, startMs),
      title: cleanTitle(title),
      category: categorize(title),
      allDay,
      start: fmt(startMs, allDay),
      // 終日予定は最終日（含む）を返す
      end: fmt(allDay ? endMs - DAY_MS : endMs, allDay),
      description: ev.description || '',
      location: ev.location || '',
    });
  };

  for (const ev of events) {
    if (ev.recurrenceId) continue;
    const dur = ev.end ? ev.end.ms - ev.start.ms : 0;
    for (const ms of occurrences(ev, to)) {
      if (ms + Math.max(dur, 0) < from - DAY_MS) continue;
      if (ev.exdates.includes(ms)) continue;
      const ov = overrides.get(`${ev.uid}|${ms}`);
      if (ov) continue; // 変更後の回は下で別に入れる
      push(ev, ms);
    }
  }
  for (const ov of overrides.values()) push(ov, ov.start.ms);

  out.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : a.title.localeCompare(b.title)));
  return out;
}

const WD_JA = ['日', '月', '火', '水', '木', '金', '土'];
function jpDate(s) {
  const d = new Date(s.slice(0, 10) + 'T00:00:00Z');
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日（${WD_JA[d.getUTCDay()]}）`;
}
// 「10月18日（日）終日」「10月3日（土）11:00〜16:00」「10月29日（木）〜11月2日（月）」
export function whenText(ev) {
  const sd = ev.start.slice(0, 10), ed = ev.end.slice(0, 10);
  if (ev.allDay) return sd === ed ? `${jpDate(sd)} 終日` : `${jpDate(sd)}〜${jpDate(ed)}`;
  if (sd === ed) return `${jpDate(sd)} ${ev.start.slice(11)}〜${ev.end.slice(11)}`;
  return `${jpDate(sd)} ${ev.start.slice(11)}〜${jpDate(ed)} ${ev.end.slice(11)}`;
}
export function categoryLabel(id) {
  return (CATEGORIES.find((c) => c.id === id) || OTHER).label;
}
