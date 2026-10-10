import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseICS, eventsForMonth, categorize, cleanTitle } from '../src/ics.js';
import { widget } from '../src/widget.js';

const events = parseICS(readFileSync(new URL('./sample.ics', import.meta.url), 'utf8'));
const oct = eventsForMonth(events, '2026-10');

test('種類の判定とタグの除去', () => {
  assert.equal(categorize('オープンファームデー'), 'farm');
  assert.equal(categorize('[カフェ] 古民家'), 'cafe');
  assert.equal(categorize('【宿泊】 はなれ'), 'stay');
  assert.equal(categorize('[特別] カフェ営業'), 'cafe');
  assert.equal(categorize('お茶会'), 'event');
  assert.equal(cleanTitle('[カフェ] 古民家カフェ営業'), '古民家カフェ営業');
});

test('終日予定', () => {
  const farm = oct.find((e) => e.category === 'farm');
  assert.deepEqual([farm.start, farm.end, farm.allDay], ['2026-10-18', '2026-10-18', true]);
  assert.match(farm.description, /\nお申込み https/);
  assert.equal(farm.location, '奈良県山辺郡山添村');
});

test('毎週の繰り返し・除外日・1回だけの変更', () => {
  const cafe = oct.filter((e) => e.category === 'cafe').map((e) => e.start);
  assert.deepEqual(cafe, [
    '2026-10-03T11:00', '2026-10-04T11:00', '2026-10-10T11:00',
    '2026-10-17T11:00', '2026-10-18T11:00', '2026-10-24T13:00', '2026-10-25T11:00', '2026-10-31T11:00',
  ]);
  assert.equal(oct.find((e) => e.start === '2026-10-24T13:00').title, '古民家カフェ営業（午後のみ）');
  const nov = eventsForMonth(events, '2026-11').filter((e) => e.category === 'cafe');
  assert.equal(nov.at(-1).start, '2026-11-29T11:00');
});

test('UTC の時刻は日本時間にする・非公開は出さない', () => {
  const tea = oct.find((e) => e.title === 'お茶会');
  assert.deepEqual([tea.start, tea.end], ['2026-10-20T10:00', '2026-10-20T12:00']);
  assert.equal(oct.some((e) => e.title === '非公開'), false);
});

test('月をまたぐ予定は両方の月に出る', () => {
  assert.equal(oct.find((e) => e.category === 'stay').end, '2026-11-02');
  assert.ok(eventsForMonth(events, '2026-11').some((e) => e.category === 'stay'));
  assert.equal(eventsForMonth(events, '2026-12').some((e) => e.category === 'stay'), false);
});

test('毎月第1日曜（回数指定）', () => {
  const closed = ['2026-11', '2026-12', '2027-01', '2027-02']
    .flatMap((mo) => eventsForMonth(events, mo).filter((e) => e.category === 'closed').map((e) => e.start));
  assert.deepEqual(closed, ['2026-11-01', '2026-12-06', '2027-01-03']);
});

test('widget は外の変数を使わずに文字列化できる', () => {
  assert.doesNotThrow(() => new Function(`return (${widget.toString()})`)());
});

import { findEvent, ID_RE } from '../src/ics.js';
import { sharePage } from '../src/share.js';

test('シェア用 ID は短く、月をまたいでも同じ予定を引ける', () => {
  const farm = oct.find((e) => e.category === 'farm');
  assert.match(farm.id, ID_RE);
  assert.ok(farm.id.startsWith('20261018-'));
  assert.equal(findEvent(events, farm.id).title, 'オープンファームデー');
  const stay = eventsForMonth(events, '2026-11').find((e) => e.category === 'stay');
  assert.equal(stay.id, oct.find((e) => e.category === 'stay').id);
  assert.equal(findEvent(events, stay.id).title, '宿泊可能');
  assert.equal(findEvent(events, '20261018-00000000'), null);
  assert.equal(findEvent(events, '../etc'), null);
  // 毎週の予定は回ごとに別の ID
  const cafe = oct.filter((e) => e.category === 'cafe').map((e) => e.id);
  assert.equal(new Set(cafe).size, cafe.length);
});

test('シェアページに OGP が入り、文字はエスケープされる', () => {
  const farm = { ...oct.find((e) => e.category === 'farm'), title: '<script>"x"</script>' };
  const html = sharePage(farm, { shareUrl: 'https://w.dev/e/1', imageUrl: 'https://w.dev/og/farm.png', calendarUrl: 'https://yusando.com/pages/events' });
  assert.match(html, /<meta property="og:image" content="https:\/\/w.dev\/og\/farm.png">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(html, /og:description" content="10月18日（日） 終日・オープンファーム　茶畑を歩きます/);
  assert.ok(!html.includes('<script>"x"'));
  assert.match(html, /location.replace\("https:\/\/yusando.com\/pages\/events#e=20261018-[0-9a-f]{8}"\)/);
  assert.ok(!sharePage(farm, { shareUrl: 'a', imageUrl: 'b', calendarUrl: '' }).includes('location.replace'));
});

import { cardText, photoFor } from '../src/card-text.js';

test('シェア画像の文字：日時と場所、写真の選び方', () => {
  const farm = oct.find((e) => e.category === 'farm');
  const t = cardText(farm);
  assert.equal(t.title, 'オープンファームデー');
  assert.equal(t.when, '10月18日（日） 終日');
  assert.equal(t.place, '奈良県山辺郡山添村');
  assert.equal(t.desc, '茶畑を歩きます　お申込み');
  assert.equal(photoFor(farm), 'field');
  const cafe = oct.find((e) => e.start === '2026-10-24T13:00');
  assert.equal(cardText(cafe).when, '10月24日（土） 13:00〜17:00');
  assert.equal(cardText(cafe).place, '');
  assert.equal(photoFor(cafe), 'interior');
  assert.equal(photoFor({ ...farm, description: '#写真:matcha 新茶の会' }), 'matcha');
  assert.equal(photoFor({ ...farm, description: '#写真:nothing' }), 'field');
  assert.equal(cardText({ ...farm, description: '#写真:matcha 新茶の会' }).desc, '新茶の会');
});
