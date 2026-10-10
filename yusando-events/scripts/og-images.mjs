// シェア時のカード画像（public/og/<種類>.png, 1200×630）を作り直す。
//   npm i -D playwright @fontsource/shippori-mincho
//   node scripts/og-images.mjs
// 色と文言は src/widget.js の COLORS、src/ics.js の CATEGORIES と合わせる。
// ロゴは public/brand/（悠三堂の印章ロゴ）。書体は yusando.com の見出しと同じ Shippori Mincho。
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const fontDir = process.env.FONT_DIR || require.resolve('@fontsource/shippori-mincho/package.json').replace(/package\.json$/, 'files/');
const font = (w, sub) => readFileSync(`${fontDir}shippori-mincho-${sub}-${w}-normal.woff2`).toString('base64');
const png = (name) => readFileSync(new URL(`../public/brand/${name}`, import.meta.url)).toString('base64');
const STAMP = png('logo-stamp.png');

const CARDS = [
  { id: 'farm', ja: 'オープンファーム', en: 'Open Farm', ink: '#4F6B3C', wash: '#E7EDDF' },
  { id: 'cafe', ja: 'カフェ営業', en: 'Café', ink: '#8A5A2E', wash: '#F3E8DA' },
  { id: 'stay', ja: '宿泊のご案内', en: 'Stay', ink: '#3E5A70', wash: '#E1E9EF' },
  { id: 'closed', ja: 'お休みのお知らせ', en: 'Closed', ink: '#76716A', wash: '#ECEAE6' },
  { id: 'event', ja: 'イベント', en: 'Event', ink: '#7A4766', wash: '#F1E4EC' },
];

const html = (c) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:M;font-weight:500;src:url(data:font/woff2;base64,${font(500, 'japanese')})}
@font-face{font-family:M;font-weight:500;src:url(data:font/woff2;base64,${font(500, 'latin')});unicode-range:U+0000-00FF,U+2013-2014}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#F7F5EF;font-family:M,serif;color:#333326;position:relative;overflow:hidden}
/* 印章ロゴ：アルファを型にして色を塗る */
.stamp{-webkit-mask:url(data:image/png;base64,${STAMP}) center/contain no-repeat;mask:url(data:image/png;base64,${STAMP}) center/contain no-repeat}
.wash{position:absolute;inset:0 0 0 auto;width:470px;background:${c.wash}}
.seal{position:absolute;width:560px;height:564px;right:-90px;top:50%;margin-top:-282px;background:${c.ink};opacity:.11}
.frame{position:absolute;inset:28px;border:1px solid rgba(51,51,38,.14)}
.brand{position:absolute;left:84px;top:78px;display:flex;align-items:center;gap:18px}
.brand .stamp{width:58px;height:58px;background:#8EA14E}
.brand b{font-weight:500;font-size:28px;letter-spacing:.32em}
.brand small{display:block;font-size:14px;letter-spacing:.42em;color:#7A7768;margin-top:4px}
.main{position:absolute;left:84px;top:236px;right:500px}
.en{font-size:22px;letter-spacing:.34em;color:${c.ink};text-transform:uppercase}
h1{margin-top:20px;font-weight:500;font-size:${c.ja.length > 6 ? 64 : 76}px;line-height:1.2;letter-spacing:.08em;white-space:nowrap}
.rule{width:64px;height:2px;background:${c.ink};margin-top:34px}
.foot{position:absolute;left:84px;right:84px;bottom:74px;display:flex;justify-content:space-between;align-items:baseline;font-size:17px;letter-spacing:.3em;color:#7A7768}
.foot span:last-child{letter-spacing:.18em}
</style></head><body>
<div class="wash"></div><div class="seal stamp"></div><div class="frame"></div>
<div class="brand"><div class="stamp"></div><div><b>悠三堂</b><small>YUSANDO</small></div></div>
<div class="main"><p class="en">${c.en}</p><h1>${c.ja}</h1><div class="rule"></div></div>
<p class="foot"><span>EVENT CALENDAR</span><span>yusando.com</span></p>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const c of CARDS) {
  await page.setContent(html(c));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: new URL(`../public/og/${c.id}.png`, import.meta.url).pathname });
  console.log(`public/og/${c.id}.png`);
}
await browser.close();
