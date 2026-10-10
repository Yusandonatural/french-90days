// 悠三堂イベントカレンダー
//   GET /events?month=2026-10  → その月の予定（JSON）
//   GET /widget.js             → yusando.com に貼る表示用スクリプト
//   GET /e/<id>                → SNS シェア用ページ（OGP 付き。開くとカレンダーへ移る）
//   GET /og/<種類>.png          → シェア時のカード画像（public/ の静的ファイル）
// 読み取るのは「公開用カレンダー」の iCal アドレス（環境変数 ICS_URL）だけ。
import { parseICS, eventsForMonth, findEvent, CATEGORIES, OTHER, ID_RE } from './ics.js';
import { sharePage } from './share.js';
import { widget } from './widget.js';

const CACHE_SECONDS = 600;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors() });
    if (url.pathname === '/widget.js') {
      const api = `${url.origin}/events`;
      const cfg = { api, share: `${base(url, env)}/e/`, brand: `${url.origin}/brand/logo-stamp.png`, categories: [...CATEGORIES, OTHER].map(({ id, label }) => ({ id, label })) };
      // ビルド時に関数名を残すための __name(...) が入っても動くようにしておく
      const body = `(function(){var __name=function(f){return f};(${widget.toString()})(${JSON.stringify(cfg)});})();`;
      return new Response(body, {
        headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': `public, max-age=${CACHE_SECONDS}`, ...cors() },
      });
    }
    if (url.pathname === '/events') return events(url, env, ctx);
    const share = url.pathname.match(/^\/e\/([^/]+)$/);
    if (share) return shared(share[1], url, env, ctx);
    return new Response('Not found', { status: 404 });
  },
};

async function events(url, env, ctx) {
  const month = url.searchParams.get('month') || thisMonthJST();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return json({ error: 'month は YYYY-MM で指定してください' }, 400);
  if (!env.ICS_URL) return json({ month, events: [], error: 'ICS_URL が設定されていません' }, 200);

  const cache = caches.default;
  const key = new Request(`${url.origin}/events?month=${month}`);
  const hit = await cache.match(key);
  if (hit) return hit;

  let list;
  try { list = eventsForMonth(await loadEvents(env), month); } catch (e) {
    return json({ month, events: [], error: e.message }, 502);
  }

  const out = json({ month, events: list }, 200, { 'Cache-Control': `public, max-age=${CACHE_SECONDS}` });
  ctx.waitUntil(cache.put(key, out.clone()));
  return out;
}

async function loadEvents(env) {
  const res = await fetch(env.ICS_URL, { cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true } });
  if (!res.ok) throw new Error(`カレンダーを読めませんでした (${res.status})`);
  return parseICS(await res.text());
}

async function shared(id, url, env, ctx) {
  if (!ID_RE.test(id) || !env.ICS_URL) return notFound(env);
  const cache = caches.default;
  const key = new Request(`${url.origin}/e/${id}`);
  const hit = await cache.match(key);
  if (hit) return hit;
  let ev;
  try { ev = findEvent(await loadEvents(env), id); } catch { ev = null; }
  if (!ev) return notFound(env);
  const html = sharePage(ev, {
    shareUrl: `${base(url, env)}/e/${id}`,
    imageUrl: `${base(url, env)}/og/${ev.category}.png`,
    calendarUrl: env.CALENDAR_PAGE_URL || '',
    logoUrl: `${base(url, env)}/brand/logo-stamp.png`,
  });
  const out = new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': `public, max-age=${CACHE_SECONDS}` },
  });
  ctx.waitUntil(cache.put(key, out.clone()));
  return out;
}

// 終わった・消えた予定のリンクはカレンダーへ
function notFound(env) {
  if (env.CALENDAR_PAGE_URL) return Response.redirect(env.CALENDAR_PAGE_URL, 302);
  return new Response('この予定は見つかりませんでした', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

// シェア URL の頭。独自ドメイン（例 https://events.yusando.com）を使うときは PUBLIC_BASE_URL に入れる
function base(url, env) {
  return (env.PUBLIC_BASE_URL || url.origin).replace(/\/$/, '');
}

function thisMonthJST() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);
}
function cors() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
}
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(), ...headers },
  });
}
