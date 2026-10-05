# 90日フランス語 — 公開手順（GitHub Pages）

いまの公開先：**https://yusandonatural.github.io/french-90days/**
（独自ドメイン `french.yusando.com` に移すときは §6）

## このフォルダの中身
| ファイル | 役割 |
|---|---|
| `docs/` | 公開されるビルド結果。`npm run build` で作り直す（手で編集しない） |
| `index.html` | アプリの骨組み（GA4・SEO・OGP・構造化データ入り） |
| `public/og.jpg` | SNSで共有したときに出る画像（1200×630） |
| `public/404.html`・`robots.txt`・`sitemap.xml` | 検索エンジン向けの土台 |
| `google-ids.json` | GA4（G-9JG1FFTL1B・全サービス共通）と広告IDの設定。`site_url` が公開URL |

## 1. 更新して公開する
```bash
npm install        # 初回だけ
npm test
npm run build      # docs/ を作り直す
git add -A && git commit -m "…" && git push
```
main に入ると数分で公開ページに反映されます。

## 2. GitHub Pages の設定（初回だけ）
リポジトリの **Settings → Pages**：
- Source：`Deploy from a branch` ／ Branch：`main` ／ Folder：`/docs`
- Custom domain は空のまま

## 3. 公開後の手続き
1. **Search Console**：`https://yusandonatural.github.io/french-90days/` を URL プレフィックスで追加 → 所有権確認（HTMLタグを `index.html` の head に入れて再ビルド）→ `sitemap.xml` を送信。
2. **GA4**（G-9JG1FFTL1B）：リアルタイムで `yusandonatural.github.io` のアクセスが出るか確認 → DebugView で次のイベントを確認し、キーイベントにする。
   - `tutorial_complete`：Day 0 診断を終えた
   - `app_action_complete`（`action=day_complete`）：Day を完了した ← いちばん大事な成果
   - `app_action_complete`（`action=lesson_complete`）：10問レッスンを完了した
   - すべてに `site=french90` が付きます。サイト別の集計はホスト名（＋ページパス `/french-90days/`）で切ります。
3. **Google広告**（使う場合）：コンバージョンを作り、ラベルを `index.html` の `GOOGLE_IDS.ads_conversion_labels`（と `google-ids.json`）に入れて再ビルド。
4. **OGP**：X や Facebook に URL を貼って、カード画像が出るか確認。

計測は `site_url` のホスト（yusandonatural.github.io）で開いたときだけ送信されます。ローカルでは送りません。
※ github.io のサブパスでは robots.txt は検索エンジンに読まれません。sitemap は Search Console から直接送信してください。

## 4. 進み具合の引っ越し
保存先はブラウザの中なので、claude.ai 版の進み具合は自動では移りません。
1. claude.ai 版の画面いちばん下「進み具合をコピー」
2. 公開ページの画面いちばん下「進み具合を貼り付けて復元」
（Day 0 の録音はブラウザごとの保存なので移りません。公開URLを変えたときも同じ手順で移します）

## 5. 公開前チェック
- [ ] `npm test` が通り、`npm run build` で作り直した `docs/` をコミットした
- [x] gtag は1本だけ（公開URL以外では送信しない）
- [x] title / description / canonical / OGP / JSON-LD（WebSite＋Organization＋WebApplication）
- [x] sitemap.xml・404.html・.nojekyll
- [x] 成果イベント3つ（tutorial_complete / day_complete / lesson_complete）
- [ ] Search Console 登録と sitemap 送信
- [ ] GA4 リアルタイムで page_view と成果イベントの到達確認

## 6. 独自ドメイン（french.yusando.com）に移すとき
1. `index.html`・`google-ids.json`・`public/sitemap.xml`・`public/robots.txt` の `https://yusandonatural.github.io/french-90days` を `https://french.yusando.com` に置換。`public/404.html` のトップへのリンクを `/` に戻す。
2. `public/CNAME` を `french.yusando.com` の1行で作り、再ビルドして push。
3. Route 53 に CNAME を足す：
   ```bash
   HZ=$(aws route53 list-hosted-zones-by-name --dns-name yusando.com --query 'HostedZones[0].Id' --output text)
   aws route53 change-resource-record-sets --hosted-zone-id "$HZ" --change-batch '{
    "Changes":[{"Action":"UPSERT","ResourceRecordSet":{
      "Name":"french.yusando.com","Type":"CNAME","TTL":300,
      "ResourceRecords":[{"Value":"yusandonatural.github.io"}]}}]}'
   ```
4. DNS が通ったら Settings → Pages で **Enforce HTTPS** にチェック。Search Console に新しいURLを追加。
5. 保存先がドメインごとに分かれるので、利用者には §4 の手順で進み具合を移してもらう。

## 7. iPhone と Web の同期（Firebase）
Google でログインすると、進み具合が Firestore の `progress/{ユーザーID}` に保存され、端末どうしで合わさります。
合わせ方は `src/store/merge.ts`（数は大きい方、設定は新しい方、リセットは新しい方が優先）。録音とプレーヤー設定は同期しません。
同期の部品は `src/sync/core/` にまとめてあり、ほかの言語アプリでも使えます（手順は `SYNC_HANDOFF.md`）。

**初回の設定（Firebase コンソール https://console.firebase.google.com ）**
1. プロジェクトを追加（名前は例：french-90days。Google アナリティクスは不要）。料金は無料の Spark プランのままで足ります。
2. **Authentication** → 始める → ログイン方法で **Google** を有効にする（サポートメールを選ぶ）。
3. **Authentication → 設定 → 承認済みドメイン** に `yusandonatural.github.io` を追加（独自ドメインに移したら `french.yusando.com` も）。
4. **Firestore Database** → データベースを作成 → 本番環境モード → ロケーション `asia-northeast1`（東京）。
5. Firestore の **ルール** タブに、このリポジトリの `firestore.rules` の中身を貼って公開（`progress` と、ほかのアプリ用の `progress-zh` などに対応）。
6. **プロジェクトの設定 → マイアプリ → ウェブアプリ（</>）を追加** → 表示される `firebaseConfig` の値を `src/sync/firebase-config.ts` の `FIREBASE_CONFIG` に入れる。
7. `npm run build` してコミット・push。ホーム画面のいちばん下に「記録の同期」が出ます。

`FIREBASE_CONFIG` が `null` のあいだは同期の表示は出ず、これまでどおり端末の中だけに保存されます。

**開発用**：`npx firebase-tools emulators:start --only auth,firestore --project demo-french` を起動し、`VITE_FIREBASE_EMULATOR=1 npm run dev` で手元のエミュレーターにつながります。
