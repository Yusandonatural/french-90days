// 予定ごとのシェア画像を作る（satori + resvg。workers-og 経由）。
//   og     … 1200×630  X・Facebook・LINE のカード
//   poster … 1080×1350 Instagram などに載せる縦長の画像
// 写真は public/photos/、ロゴは public/brand/。書体は yusando.com の見出しと同じ Shippori Mincho を
// Google Fonts から「この画像で使う文字だけ」取り寄せる。
import { ImageResponse } from 'workers-og';
import { cardText, photoFor } from './card-text.js';

const TEXT = '#333326', SUB = '#6F6C5C', PAPER = '#F7F5EF';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// 日時・場所の行。見出しの幅と大きさは両方の行でそろえる
const row = (k, v, size, ink, labelW, labelSize) => `
  <div style="display:flex;align-items:baseline;margin-top:${Math.round(size * 0.5)}px">
    <div style="display:flex;width:${labelW}px;font-size:${labelSize}px;letter-spacing:0.3em;color:${ink}">${k}</div>
    <div style="display:flex;flex:1;font-size:${size}px;color:${TEXT};letter-spacing:0.04em;line-height:1.35">${esc(v)}</div>
  </div>`;

// sizes の中で 1 行に収まる最大の大きさ。どれも収まらなければ wrap の大きさで折り返す
const fit = (text, width, sizes, wrap) => sizes.find((sz) => [...text].length * sz * 1.08 <= width) || wrap;

function ogHtml(t, img) {
  const titleSize = fit(t.title, 580, [66, 58, 52, 46, 42, 38], 46);
  return `<div style="display:flex;width:1200px;height:630px;background:${PAPER};font-family:'Shippori Mincho';color:${TEXT}">
  <div style="display:flex;flex-direction:column;width:720px;height:630px;padding:64px 64px 56px 76px">
    <div style="display:flex;align-items:center">
      <img src="${img.stamp}" width="52" height="52" style="width:52px;height:52px" />
      <div style="display:flex;flex-direction:column;margin-left:16px">
        <div style="display:flex;font-size:26px;letter-spacing:0.3em">悠三堂</div>
        <div style="display:flex;font-size:13px;letter-spacing:0.4em;color:${SUB};margin-top:2px">YUSANDO</div>
      </div>
    </div>
    <div style="display:flex;margin-top:46px;font-size:18px;letter-spacing:0.34em;color:${t.ink}">${esc(t.en)}</div>
    <div style="display:flex;margin-top:14px;font-size:${titleSize}px;line-height:1.25;letter-spacing:0.05em;word-break:break-all">${esc(t.title)}</div>
    <div style="display:flex;width:56px;height:2px;background:${t.ink};margin-top:26px;margin-bottom:6px"></div>
    ${row('日時', t.when, 30, t.ink, 82, 17)}
    ${t.place ? row('場所', t.place, 26, t.ink, 82, 17) : ''}
    <div style="display:flex;flex:1"></div>
    <div style="display:flex;width:580px;justify-content:space-between;font-size:15px;letter-spacing:0.28em;color:${SUB}">
      <div style="display:flex;flex:1">EVENT CALENDAR</div><div style="display:flex;letter-spacing:0.16em">yusando.com</div>
    </div>
  </div>
  <div style="display:flex;position:relative;width:480px;height:630px">
    <img src="${img.photo}" width="480" height="630" style="width:480px;height:630px" />
    <div style="display:flex;position:absolute;left:28px;top:28px;padding:8px 18px;background:rgba(247,245,239,0.92);font-size:16px;letter-spacing:0.2em;color:${t.ink}">${esc(t.label)}</div>
  </div>
</div>`;
}

function posterHtml(t, img) {
  const titleSize = fit(t.title, 936, [84, 74, 66, 58, 52], 62);
  return `<div style="display:flex;flex-direction:column;width:1080px;height:1350px;background:${PAPER};font-family:'Shippori Mincho';color:${TEXT}">
  <div style="display:flex;position:relative;width:1080px;height:640px">
    <img src="${img.photo}" width="1080" height="640" style="width:1080px;height:640px" />
    <div style="display:flex;position:absolute;left:0;top:0;width:1080px;height:220px;background-image:linear-gradient(rgba(20,20,12,0.45),rgba(20,20,12,0))"></div>
    <div style="display:flex;position:absolute;left:72px;top:64px;align-items:center">
      <img src="${img.stampWhite}" width="64" height="64" style="width:64px;height:64px" />
      <div style="display:flex;flex-direction:column;margin-left:18px;color:#fff">
        <div style="display:flex;font-size:32px;letter-spacing:0.3em">悠三堂</div>
        <div style="display:flex;font-size:15px;letter-spacing:0.42em;margin-top:2px">YUSANDO</div>
      </div>
    </div>
    <div style="display:flex;position:absolute;left:72px;bottom:0;padding:16px 30px;background:${PAPER};font-size:22px;letter-spacing:0.3em;color:${t.ink}">${esc(t.en)}　·　${esc(t.label)}</div>
  </div>
  <div style="display:flex;flex-direction:column;flex:1;padding:44px 72px 64px 72px">
    <div style="display:flex;font-size:${titleSize}px;line-height:1.25;letter-spacing:0.05em;word-break:break-all">${esc(t.title)}</div>
    <div style="display:flex;width:64px;height:2px;background:${t.ink};margin-top:30px;margin-bottom:8px"></div>
    ${row('日時', t.when, 38, t.ink, 104, 22)}
    ${t.place ? row('場所', t.place, 32, t.ink, 104, 22) : ''}
    ${t.desc ? `<div style="display:flex;margin-top:30px;font-size:27px;line-height:1.7;color:${SUB};letter-spacing:0.04em;word-break:break-all">${esc(t.desc)}</div>` : ''}
    <div style="display:flex;flex:1"></div>
    <div style="display:flex;width:936px;justify-content:space-between;border-top:1px solid rgba(51,51,38,0.16);padding-top:28px;font-size:20px;letter-spacing:0.3em;color:${SUB}">
      <div style="display:flex;flex:1">EVENT CALENDAR</div><div style="display:flex;letter-spacing:0.16em">yusando.com</div>
    </div>
  </div>
</div>`;
}

// Google Fonts から、渡した文字だけを含む TTF を取り寄せる（satori は woff2 を読めない）
async function loadFont(family, weight, text) {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`)).text();
  const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
  if (!url) throw new Error('font css has no truetype url');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`font ${res.status}`);
  return res.arrayBuffer();
}

async function dataUrl(fetchAsset, path, type) {
  const res = await fetchAsset(path);
  if (!res.ok) throw new Error(`asset ${path}: ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${type};base64,${btoa(bin)}`;
}

// kind: 'og' | 'poster'。fetchAsset(path) は public/ の中身を返す関数
export async function renderCard(ev, kind, fetchAsset) {
  const t = cardText(ev);
  const poster = kind === 'poster';
  const name = photoFor(ev);
  const [photo, stamp] = await Promise.all([
    dataUrl(fetchAsset, `/photos/${name}-${poster ? 'poster' : 'og'}.jpg`, 'image/jpeg'),
    dataUrl(fetchAsset, poster ? '/brand/logo-stamp-white.png' : '/brand/logo-stamp-green.png', 'image/png'),
  ]);
  const html = poster ? posterHtml(t, { photo, stampWhite: stamp }) : ogHtml(t, { photo, stamp });
  const chars = [...new Set(`悠三堂YUSANDOEVENTCALENDARyusando.com日時場所·　…0123456789${Object.values(t).join('')}`)].join('');
  const font = await loadFont('Shippori Mincho', 500, chars);
  return new ImageResponse(html, {
    width: poster ? 1080 : 1200,
    height: poster ? 1350 : 630,
    fonts: [{ name: 'Shippori Mincho', data: font, weight: 500, style: 'normal' }],
  });
}
