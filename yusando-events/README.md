# 悠三堂イベントカレンダー

Google カレンダーに入れた予定（オープンファームデー・カフェ営業・宿泊可能 など）を読み取り、
yusando.com に月ごとのカレンダーとして表示する。

```
Google カレンダー「悠三堂イベント（公開用）」
   │ iCal (.ics)
   ▼
Cloudflare Worker  yusando-events   … /events?month=2026-10（JSON）, /widget.js
   │
   ▼
yusando.com（Shopify）のページに貼った <div id="yusando-events">
```

- パソコンでは月のマス目（宿泊など数日続く予定は1本の帯）、スマホでは日ごとの一覧で表示。
- 予定を押すと詳細（日時・場所の地図リンク・説明・「Googleカレンダーに追加」）が開く。上の種類ボタンで絞り込みもできる。
- 詳細の下に「この予定をシェア」：X・Facebook・LINE・リンクのコピー、スマホでは「シェア」ボタンで LINE や Instagram などのアプリへ。
  「画像で投稿」は縦長の告知画像（1080×1350）をその場で作り、スマホでは Instagram などにそのまま渡せる（パソコンでは保存）。
- 予定は 10 分キャッシュ。カレンダーを直すと、遅くとも 10 分ほどでサイトに反映される。
- 個人の予定と混ざらないよう、**公開専用のカレンダー**だけを読む。そのカレンダーでも「非公開」にした予定は出さない。

## 予定の入れ方

タイトルのことばで色分けする。

| 種類 | 色 | タイトルに含めることば（どれか） |
|---|---|---|
| オープンファーム | 緑 | オープンファーム / 茶畑 / open farm |
| カフェ営業 | 茶 | カフェ / cafe |
| 宿泊可 | 青 | 宿泊 / 民泊 / stay |
| お休み | 灰 | 休業 / 定休 / お休み / closed |
| イベント | 紫 | 上のどれにも当たらないもの |

- 種類を決めて書きたいときは先頭に `[カフェ]` `【宿泊】` のようにタグを付ける（サイトではタグを外して表示）。
- 毎週土日のカフェ営業などは Google カレンダーの「繰り返し」で入れてよい（毎日・毎週・毎月・毎年、除外日、1回だけの変更に対応）。
- 宿泊可能な期間は終日予定で日をまたいで入れると、その間の毎日に出る。
- 説明欄の URL はリンクになる（予約ページなど）。

## SNS シェアのしくみ

```
シェアされる URL  https://<Worker>/e/20261018-3e85de38
   ├─ X・Facebook・LINE などが読む → 予定名・日時・説明＋その予定のカード画像（/og/<id>.png）
   └─ 人が開く → yusando.com のカレンダーページ #e=20261018-3e85de38 へ移り、その予定の詳細が開く
```

- ID は「開始日＋予定ごとの番号」なので、予定のタイトルや時間を直してもリンクは変わらない（日付を動かすと変わる）。
- 終わった予定・消した予定のリンクはカレンダーページへ案内する。
- **シェア画像は予定ごとに自動で作る**（`src/card.js`）。タイトル・日時・場所と、種類に合った写真が入る。
  - `/og/<id>.png` … 1200×630（X・Facebook・LINE のカード）
  - `/poster/<id>.png` … 1080×1350（「画像で投稿」で Instagram などへ。説明文も入る）
  - 写真：オープンファーム＝茶畑、カフェ・宿泊＝古民家の茶碗、その他＝茶葉（`public/photos/`）。
    予定の説明に `#写真:matcha` のように書くと差し替えられる（field / interior / leaf / matcha）。写真を増やすときは
    `public/photos/<名前>-og.jpg`（480×630）と `-poster.jpg`（1080×640）を置き、`src/card-text.js` の `PHOTOS` に名前を足す。
  - 書体は Shippori Mincho を Google Fonts から必要な文字だけ取り寄せる。作った画像は 1 日キャッシュ。
  - 画像づくりは CPU を 0.1〜0.3 秒ほど使うので、**Workers の有料プラン（Paid）が必要**（無料プランは 1 回 10ms まで）。
- `public/og/<種類>.png` は予定が見つからない・画像を作れないとき用の固定カード（作り直すときは `node scripts/og-images.mjs`）。ロゴは `public/brand/`（印章ロゴ）、書体は yusando.com の見出しと同じ Shippori Mincho。
- シェア URL を `events.yusando.com` のような自分のドメインにしたいときは、Cloudflare で Worker にそのドメインを割り当て、`PUBLIC_BASE_URL` に入れる。

## 最初の設定（1回だけ）

1. **公開用カレンダーを作る**
   Google カレンダー → 他のカレンダー「＋」→ 新しいカレンダーを作成 → 名前「悠三堂イベント」。
2. **iCal アドレスをコピー**
   そのカレンダーの「設定と共有」→「カレンダーの統合」→ **「iCal 形式の非公開アドレス」** をコピー。
   （「一般公開して誰でも利用できるようにする」をオンにして「iCal 形式の公開 URL」を使ってもよい）
3. **Worker を公開**
   ```bash
   cd yusando-events
   npx wrangler secret put ICS_URL   # 2 でコピーしたアドレスを貼る
   npx wrangler deploy               # https://yusando-events.<アカウント>.workers.dev が表示される
   ```
4. **yusando.com に貼る**
   Shopify 管理画面 → オンラインストア → テーマ → カスタマイズ → 表示したいページ（例：新しいページ「イベント」）に
   「カスタム Liquid」セクションを追加し、`shopify-snippet.liquid` の 2 行を貼る（`WORKER_URL` を 3 の URL に置き換え）。
5. **シェアの戻り先を設定**
   `wrangler.toml` の `CALENDAR_PAGE_URL` に 4 のページの URL（例 `https://yusando.com/pages/events`）を入れて、もう一度 `npx wrangler deploy`。

## 開発

```bash
npm test                                    # iCal の読み取り・繰り返し展開のテスト
npx wrangler dev --var ICS_URL:<iCalのURL>   # http://localhost:8787/events, /widget.js
```

- `src/ics.js` … iCal の読み取り、月ごとの展開、種類の判定（ことばの一覧は `CATEGORIES`）
- `src/worker.js` … API・キャッシュ・ルーティング
- `src/share.js` … シェア用ページ（OGP）
- `src/card.js` / `src/card-text.js` … 予定ごとのシェア画像
- `src/widget.js` … サイトに出す画面（文字列にして配信するので、外の変数を使わないこと）
