// 悠三堂イベントカレンダー
//   GET /events?month=2026-10  → その月の予定（JSON）
//   GET /widget.js             → yusando.com に貼る表示用スクリプト
// 読み取るのは「公開用カレンダー」の iCal アドレス（環境変数 ICS_URL）だけ。
import { parseICS, eventsForMonth, CATEGORIES, OTHER } from './ics.js';
import { widget } from './widget.js';

const CACHE_SECONDS = 600;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors() });
    if (url.pathname === '/widget.js') {
      const api = `${url.origin}/events`;
      const cfg = { api, categories: [...CATEGORIES, OTHER].map(({ id, label }) => ({ id, label })) };
      // ビルド時に関数名を残すための __name(...) が入っても動くようにしておく
      const body = `(function(){var __name=function(f){return f};(${widget.toString()})(${JSON.stringify(cfg)});})();`;
      return new Response(body, {
        headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': `public, max-age=${CACHE_SECONDS}`, ...cors() },
      });
    }
    if (url.pathname === '/events') return events(url, env, ctx);
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

  const res = await fetch(env.ICS_URL, { cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true } });
  if (!res.ok) return json({ month, events: [], error: `カレンダーを読めませんでした (${res.status})` }, 502);
  const list = eventsForMonth(parseICS(await res.text()), month);

  const out = json({ month, events: list }, 200, { 'Cache-Control': `public, max-age=${CACHE_SECONDS}` });
  ctx.waitUntil(cache.put(key, out.clone()));
  return out;
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
