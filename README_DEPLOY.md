# 90日フランス語 — 公開手順（GitHub Pages ＋ french.yusando.com）

## このフォルダの中身
| ファイル | 役割 |
|---|---|
| `docs/` | 公開されるビルド結果。`npm run build` で作り直す（手で編集しない） |
| `index.html` | アプリの骨組み（GA4・SEO・OGP・構造化データ入り） |
| `public/og.jpg` | SNSで共有したときに出る画像（1200×630） |
| `public/404.html`・`robots.txt`・`sitemap.xml` | 検索エンジン向けの土台 |
| `public/CNAME` | 独自ドメイン `french.yusando.com`（変えるならこの1行と `google-ids.json`・`public/sitemap.xml`・`index.html` 内のURLを置換） |
| `google-ids.json` | GA4（G-9JG1FFTL1B・全サービス共通）と広告IDの設定 |

## 1. GitHub に置く
ローカル作業フォルダ（Google Drive「マイドライブ/github」）にこのフォルダを `french-90days` として置き、次を実行します。

```bash
cd "<Google Drive>/マイドライブ/github/french-90days"
git init && git add . && git commit -m "90日フランス語 初版"
gh repo create Yusandonatural/french-90days --public --source=. --push
```

GitHub のリポジトリで **Settings → Pages**：
- Source：`Deploy from a branch` ／ Branch：`main` ／ Folder：`/docs`
- Custom domain：`french.yusando.com`（CNAME ファイルがあるので自動で入ります）
- DNS が通ったら **Enforce HTTPS** にチェック

## 2. DNS（Route 53）に CNAME を足す
```bash
HZ=$(aws route53 list-hosted-zones-by-name --dns-name yusando.com --query 'HostedZones[0].Id' --output text)
aws route53 change-resource-record-sets --hosted-zone-id "$HZ" --change-batch '{
 "Changes":[{"Action":"UPSERT","ResourceRecordSet":{
   "Name":"french.yusando.com","Type":"CNAME","TTL":300,
   "ResourceRecords":[{"Value":"yusandonatural.github.io"}]}}]}'
```
数分〜数十分で `https://french.yusando.com` が開けるようになります。

## 3. 公開後の手続き
1. **Search Console**：`https://french.yusando.com/` を URL プレフィックスで追加 → 所有権確認（HTMLタグなら `google-ids.json` の `search_console_verification` に入れて head を作り直す／TXT レコードなら Route 53 に追加）→ `sitemap.xml` を送信。
2. **GA4**（G-9JG1FFTL1B）：リアルタイムで `french.yusando.com` のアクセスが出るか確認 → DebugView で次のイベントを確認し、キーイベントにする。
   - `tutorial_complete`：Day 0 診断を終えた
   - `app_action_complete`（`action=day_complete`）：Day を完了した ← いちばん大事な成果
   - `app_action_complete`（`action=lesson_complete`）：10問レッスンを完了した
   - すべてに `site=french90` が付きます。サイト別の集計はホスト名で切ります。
3. **Google広告**（使う場合）：コンバージョンを作り、ラベルを `google-ids.json` の `ads_conversion_labels` に入れて再デプロイ。
4. **OGP**：X や Facebook に URL を貼って、カード画像が出るか確認。

計測は本番ドメイン（french.yusando.com）のときだけ送信されます。`*.github.io` やローカルでは送りません。

## 4. 進み具合の引っ越し
保存先はブラウザの中なので、claude.ai 版の進み具合は新しいドメインに自動では移りません。
1. claude.ai 版の画面いちばん下「進み具合をコピー」
2. french.yusando.com の画面いちばん下「進み具合を貼り付けて復元」
（Day 0 の録音はブラウザごとの保存なので移りません）

## 5. 公開前チェック
- [ ] `npm test` が通り、`npm run build` で作り直した `docs/` をコミットした
- [x] gtag は1本だけ（本番ドメイン以外では送信しない）
- [x] title / description / canonical / OGP / JSON-LD（WebSite＋Organization＋WebApplication）
- [x] robots.txt・sitemap.xml・404.html・CNAME・.nojekyll
- [x] 成果イベント3つ（tutorial_complete / day_complete / lesson_complete）
- [ ] Search Console 登録と sitemap 送信
- [ ] GA4 リアルタイムで page_view と成果イベントの到達確認
