// シェア画像に載せる文字と写真を決める（画像を作る部分は card.js）
import { whenText, categoryLabel, cleanTitle } from './ics.js';

// 色は widget.js の COLORS と合わせる
const INK = { farm: '#4F6B3C', cafe: '#8A5A2E', stay: '#3E5A70', closed: '#76716A', event: '#7A4766' };
const EN = { farm: 'OPEN FARM', cafe: 'CAFÉ', stay: 'STAY', closed: 'CLOSED', event: 'EVENT' };
// 種類ごとの背景写真（public/photos/<名前>-og.jpg / -poster.jpg）
const PHOTO = { farm: 'field', cafe: 'interior', stay: 'interior', closed: 'leaf', event: 'leaf' };
// 予定の説明に「#写真:matcha」のように書くと、その写真に差し替えられる
export const PHOTOS = ['field', 'interior', 'leaf', 'matcha'];

const plain = (s) => (s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/https?:\/\/\S+/g, '').replace(/#写真[:：]\S+/g, '').trim();

export function photoFor(ev) {
  const m = (ev.description || '').match(/#写真[:：](\w+)/);
  return m && PHOTOS.includes(m[1]) ? m[1] : PHOTO[ev.category] || 'leaf';
}

// 画面に出す文字（タイトル・日時・場所・説明）
export function cardText(ev) {
  const desc = plain(ev.description).split('\n').map((l) => l.trim()).filter(Boolean).join('　');
  return {
    title: cleanTitle(ev.title),
    when: whenText(ev).replace(' 〜 ', '〜'),
    place: ev.location || '',
    label: categoryLabel(ev.category),
    en: EN[ev.category] || 'EVENT',
    ink: INK[ev.category] || INK.event,
    desc: desc.length > 90 ? `${desc.slice(0, 89)}…` : desc,
  };
}
