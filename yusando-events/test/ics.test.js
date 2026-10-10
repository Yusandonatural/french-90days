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
