// シェア時のカード画像（public/og/<種類>.png, 1200×630）を作り直す。
//   npm i -D playwright @fontsource/shippori-mincho
//   node scripts/og-images.mjs
// 色と文言は src/widget.js の COLORS、src/ics.js の CATEGORIES と合わせる。
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const fontDir = process.env.FONT_DIR || require.resolve('@fontsource/shippori-mincho/package.json').replace(/package\.json$/, 'files/');
const font = (w, sub) => readFileSync(`${fontDir}shippori-mincho-${sub}-${w}-normal.woff2`).toString('base64');

const CARDS = [
  { id: 'farm', ja: 'オープンファーム', en: 'OPEN FARM', ink: '#4F6B3C', wash: '#E7EDDF' },
  { id: 'cafe', ja: 'カフェ営業', en: 'CAFÉ', ink: '#8A5A2E', wash: '#F3E8DA' },
  { id: 'stay', ja: '宿泊のご案内', en: 'STAY', ink: '#3E5A70', wash: '#E1E9EF' },
  { id: 'closed', ja: 'お休みのお知らせ', en: 'CLOSED', ink: '#76716A', wash: '#ECEAE6' },
  { id: 'event', ja: 'イベント', en: 'EVENT', ink: '#7A4766', wash: '#F1E4EC' },
];

const html = (c) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:M;font-weight:500;src:url(data:font/woff2;base64,${font(500, 'japanese')})}
@font-face{font-family:M;font-weight:500;src:url(data:font/woff2;base64,${font(500, 'latin')});unicode-range:U+0000-00FF}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#FAF7F2;font-family:M,serif;color:#2B2722;position:relative;overflow:hidden}
.band{position:absolute;inset:0 auto 0 0;width:420px;background:${c.wash};display:grid;place-items:center}
.en{font-size:30px;letter-spacing:.42em;color:${c.ink};writing-mode:vertical-rl;margin-left:.42em}
.main{position:absolute;left:500px;right:80px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center}
.eyebrow{font-size:22px;letter-spacing:.38em;color:#8B8378}
.rule{width:56px;height:2px;background:${c.ink};margin:34px 0}
h1{font-weight:500;font-size:${c.ja.length > 6 ? 68 : 80}px;line-height:1.25;letter-spacing:.06em}
.foot{position:absolute;left:500px;bottom:64px;font-size:26px;letter-spacing:.3em}
.foot small{font-size:18px;color:#8B8378;letter-spacing:.24em;margin-left:16px}
</style></head><body>
<div class="band"><span class="en">${c.en}</span></div>
<div class="main"><p class="eyebrow">YUSANDO EVENTS</p><div class="rule"></div><h1>${c.ja}</h1></div>
<p class="foot">悠三堂<small>yusando.com</small></p>
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
