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
  store/              state.ts（ST と移行）, merge.ts（端末どうしの記録の合わせ方）, rec.ts（IndexedDB の録音）
  sync/               cloud.ts（Firebase：Google ログインと同期）, firebase-config.ts（設定値）
  ui/                 styles/（tokens.css ほか。読み込み順＝元の CSS の順）, speech.ts, router.ts,
                      components/lesson.ts, screens/（Home, Course, Diagnosis, Drill, Conj, Words,
                      Listen, Speak, Learn, DayBar, Footer）
tests/                reference.ts が reference を jsdom で動かし、内部関数と出力を比べる
```

- データを直すときは `src/data/` のファイルを編集する。列の意味は `DESIGN_HANDOFF.md` §8。
- 保存キー（`trois-formes-v2` ほか）は変えないこと。変えるなら `store/state.ts` の `migrate` に移行を書く。

## デザイン

2026-10 に「やわらかい学習アプリ」の見た目に作り直した（`DESIGN_HANDOFF.md` §3〜5 から変えた点）。

- 色：背景を生成り色 `#F6F4EF`、カードは白＋淡い影。3つの形の色（藍・青緑・黄土）と正誤の色はそのまま。
- 書体：日本語 UI は Zen Maru Gothic、フランス語は Literata のまま。
- 角丸：カード18px・ボタン14px。主ボタンは下に影があり、押すと沈む。
- スマホ：主要なボタンは高さ44px以上、タブバーはアイコンつき、フッターはホームだけ。
- ホーム：Day カード（進捗リング＋「続きから」ボタン）→ 4ブロックのタイル → メモ → 90日カレンダー。
- 動詞：問題を先に出し、200マスの習得状況は折りたたみ。

トークンは `src/ui/styles/tokens.css` にまとまっている。

## 学習ルール（変更点）

- 動詞・単語とも **1回正解で習得**。習得したものは出題しない（範囲内がすべて習得済みのときだけ、練習用にもう一度出す）。間違えた単語はレッスンの最後にもう一度出る。しきい値は `src/store/state.ts` の `VERB_MASTER` / `WORD_MASTER`。
- 例文には毎回、よく使う副詞を1つ入れる（`src/data/adverbs.tsv`・`src/grammar/adverbs.ts`）。活用表だけは副詞なし。
