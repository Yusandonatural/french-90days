# 90日フランス語

1日1時間 × 90日で、フランス語で自分のことと日常の話ができるようになる学習アプリ。
公開先：https://yusandonatural.github.io/french-90days/ （GitHub Pages、`docs/` フォルダ。手順は `README_DEPLOY.md`）

仕様は `DESIGN_HANDOFF.md`、元の単一HTML版は `reference/trois-formes.html`（迷ったらこれが正解）。

## 開発

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 文法エンジン・コース・データのテスト（reference と全件照合）
npm run build      # 型チェック → docs/ に書き出し（これをコミットすると公開される）
```

## 構成

```
index.html            画面の骨組み・Google タグ・SEO（head は reference と同じ）
public/               CNAME, og.jpg, robots.txt, sitemap.xml, 404.html, .nojekyll（そのまま docs/ へ）
src/
  data/               verbs.tsv, examples.tsv, words.txt, meanings.tsv（ビルド時に JSON 化）
                      index.ts＝VERBS / THEMES / WORDS / MEAN の組み立て、parse.ts＝パーサ
  grammar/            conjugate.ts（build, buildNeg, accepted, agree, refl, presWord, check）
                      ja.ts（jaOf, jNeg, jNegPast, adjJa）, frames.ts（単語→動詞文）
  engine/             pick.ts（出題の重み）, session.ts（10問・XP・連続日数・バッジ）,
                      course.ts（Day 割り当て・タイマー・診断採点・自分専用フレーズ）
  store/              state.ts（ST と移行）, rec.ts（IndexedDB の録音）
  ui/                 styles/（tokens.css ほか。読み込み順＝元の CSS の順）, speech.ts, router.ts,
                      components/lesson.ts, screens/（Home, Course, Diagnosis, Drill, Conj, Words,
                      Listen, Speak, Learn, DayBar, Footer）
tests/                reference.ts が reference を jsdom で動かし、内部関数と出力を比べる
```

- データを直すときは `src/data/` のファイルを編集する。列の意味は `DESIGN_HANDOFF.md` §8。
- 保存キー（`trois-formes-v2` ほか）は変えないこと。変えるなら `store/state.ts` の `migrate` に移行を書く。
