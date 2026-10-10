// SNS でシェアされたときのページ（/e/<id>）。
// X・Facebook・LINE などはこのページの OGP を読んでカードを出す。人が開いたらカレンダーへ移る。
import { whenText, categoryLabel } from './ics.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const plain = (s) => s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

export function sharePage(ev, { shareUrl, imageUrl, calendarUrl }) {
  const when = whenText(ev);
  const label = categoryLabel(ev.category);
  const title = `${ev.title}｜悠三堂`;
  const lead = `${when}・${label}`;
  const body = plain(ev.description || '');
  const desc = (body ? `${lead}　${body}` : `${lead}　奈良の自然栽培茶園 悠三堂のイベントです。`).slice(0, 150);
  const go = calendarUrl ? `${calendarUrl.split('#')[0]}#e=${ev.id}` : '';
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(shareUrl)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="悠三堂 Yusando">
<meta property="og:locale" content="ja_JP">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(shareUrl)}">
<meta property="og:image" content="${esc(imageUrl)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(`${ev.title}　${when}`)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(imageUrl)}">
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#FAF7F2;color:#2B2722;
  font-family:"Hiragino Sans","Noto Sans JP",sans-serif;line-height:1.7}
main{max-width:480px;width:100%;background:#fff;border:1px solid #ECE6DC;border-radius:20px;padding:28px}
p{margin:0}.l{font-size:.75rem;letter-spacing:.2em;color:#8B8378}
h1{margin:10px 0 6px;font-family:"Hiragino Mincho ProN","Yu Mincho",serif;font-weight:500;font-size:1.5rem;line-height:1.4}
.w{color:#8B8378;font-size:.9rem}
a{display:inline-flex;align-items:center;min-height:44px;margin-top:20px;padding:0 20px;border-radius:999px;background:#2B2722;color:#fff;text-decoration:none;font-size:.9rem}
</style>
</head>
<body>
<main>
<p class="l">YUSANDO EVENTS・${esc(label)}</p>
<h1>${esc(ev.title)}</h1>
<p class="w">${esc(when)}${ev.location ? `<br>${esc(ev.location)}` : ''}</p>
${go ? `<a href="${esc(go)}">イベントカレンダーで見る</a>` : ''}
</main>
${go ? `<script>location.replace(${JSON.stringify(go).replace(/</g, '\\u003c')})</script>` : ''}
</body>
</html>`;
}
