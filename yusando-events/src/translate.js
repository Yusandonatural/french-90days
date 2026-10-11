// 日本語だけで書かれた予定に、英語訳（titleEn / locationEn / descriptionEn）を付ける。
// 「日本語 / English」や「---」で英語を自分で書いた部分はそのまま使い、機械翻訳しない。

const JA = /[぀-ヿ㐀-鿿]/;
// タイトル・場所は「 / 」か「｜」、説明は「---」だけの行で日本語と英語を分ける（widget.js と同じ決まり）
const hasEnLine = (s) => /\s+\/\s+|｜/.test(s || '');
const hasEnText = (s) => /\n\s*[-—–]{3,}\s*\n/.test(s || '');
const plain = (s) => (s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();

export function needsTranslation(text, kind) {
  if (!text || !JA.test(text)) return false;
  return kind === 'description' ? !hasEnText(text) : !hasEnLine(text);
}

// translate(text) は英訳を返す関数（失敗したら null）。同じ文は一度だけ訳す
export async function addEnglish(list, translate) {
  const jobs = new Map();
  const want = (text) => {
    if (!jobs.has(text)) jobs.set(text, translate(text).catch(() => null));
    return jobs.get(text);
  };
  await Promise.all(list.map(async (ev) => {
    const [t, l, d] = await Promise.all([
      needsTranslation(ev.title, 'title') ? want(ev.title) : null,
      needsTranslation(ev.location, 'location') ? want(ev.location) : null,
      needsTranslation(ev.description, 'description') ? want(plain(ev.description).slice(0, 1200)) : null,
    ]);
    if (t) ev.titleEn = t;
    if (l) ev.locationEn = l;
    if (d) ev.descriptionEn = d;
    if (t || l || d) ev.machineTranslated = true;
  }));
  return list;
}
