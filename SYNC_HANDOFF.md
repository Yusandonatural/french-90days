# ログインと記録の同期 — ほかのアプリへの引き継ぎ（中国語版など）

90日フランス語で使っている「Google でログイン → 進み具合を iPhone と Web で同期」の仕組みを、
別のアプリ（例：中国語を学ぶアプリ）でそのまま使うための資料です。

**Claude Code への最初の指示の例**（中国語アプリのリポジトリで）：
「`SYNC_HANDOFF.md` を読んで、Yusandonatural/french-90days の `src/sync/core/` をこのアプリに入れ、
コレクション `progress-zh` で Google ログインと記録の同期を付けて。Firebase の設定値は同じものを使うこと。」

---

## 1. しくみ

- Firebase プロジェクト **french90days** を、すべての言語アプリで共有します。
  - 同じ Google アカウントでログインでき、Firebase の設定（ログイン方法・承認済みドメイン）も1回で済みます。
- 記録はアプリごとに別の場所（Firestore のコレクション）に保存します。

  | アプリ | コレクション | 1人分の記録 |
  |---|---|---|
  | 90日フランス語 | `progress` | `progress/{ユーザーID}` |
  | 中国語 | `progress-zh` | `progress-zh/{ユーザーID}` |
  | 今後のアプリ | `progress-xx`（英小文字） | `progress-xx/{ユーザーID}` |

- 記録は端末の中（localStorage）が正本で、クラウドは「合わせる場所」です。
  - ログインしたとき・アプリに戻ってきたとき・保存から20秒後に、端末とクラウドを**合わせて**両方を更新します。
  - ログアウトしても端末の記録は消えません。
- 合わせ方（`mergeDeep`）：数は大きい方、[正解, 回答] のような組は位置ごとに大きい方、完了フラグはどちらかが完了なら完了、文字や設定は新しく保存した側。リセット（`epoch`）は新しい方が優先。

## 2. 持っていくファイル

`src/sync/core/` の3つは、フランス語アプリの中身に依存していません。フォルダごとコピーします。

| ファイル | 中身 |
|---|---|
| `src/sync/core/cloud-sync.ts` | `createCloudSync()`：Google ログイン、Firestore との読み書き、合わせる処理、自動同期 |
| `src/sync/core/merge-deep.ts` | `mergeDeep()`：データの形を知らなくても使える合わせ方。`sameDeep()`：同じ内容かの判定 |
| `src/sync/core/sync-card.ts` | `mountSyncCard()`：「記録の同期」カード（ログイン／同期中／ログアウト） |
| `src/sync/firebase-config.ts` | Firebase の設定値（**同じ値をそのまま使う**） |

加えて `npm i firebase` が必要です（Vite などのバンドラー前提。`import('firebase/...')` で必要なときだけ読み込みます）。

## 3. アプリ側で用意すること

1. **進み具合を1つの JSON オブジェクトで持つ**（例：`ST`）。localStorage に保存している形のままで構いません。
2. **保存のたびに `updatedAt = Date.now()` を入れる**。どちらが新しいかの判定に使います。
3. **「成績をリセット」では `epoch = Date.now()` を入れる**。リセットが古い記録に打ち消されないようにするためです。
4. **保存したことを知らせる仕組み**（`onSaved(fn)`）と、**丸ごと置き換える関数**（`replaceState(s)`：localStorage に書くだけで、onSaved は呼ばない）。

フランス語版の実装例：`src/store/state.ts` の `save` / `onSaved` / `replaceState` / `resetState`。

## 4. つなぐコード（中国語アプリの例）

```ts
// src/sync/app.ts
import { createCloudSync } from './core/cloud-sync';
import { mergeDeep, sameDeep } from './core/merge-deep';
import { FIREBASE_CONFIG } from './firebase-config';
import { ST, onSaved, replaceState, type State } from '../store/state';

let refresh = () => {};
export const onRemoteProgress = (fn: () => void) => { refresh = fn; };

export const sync = createCloudSync<State>({
  config: FIREBASE_CONFIG,
  collection: 'progress-zh',                       // ← アプリごとに変える
  getLocal: () => ST,
  setLocal: replaceState,
  merge: (a, b) => mergeDeep(a, b, { newer: ['goal', 'stage'] }), // 設定値のキーは newer に
  same: sameDeep,
  onLocalSaved: onSaved,
  onRemoteChange: () => refresh(),
  emulator: !!import.meta.env.VITE_FIREBASE_EMULATOR,
});
```

```ts
// main.ts
import { mountSyncCard } from './sync/core/sync-card';
import { onRemoteProgress, sync } from './sync/app';

onRemoteProgress(() => renderHome());              // 別の端末の記録が入ったら画面を描き直す
mountSyncCard(document.getElementById('syncCard')!, sync);
sync.init();
```

- カードは `.panel` `.btn` `.btn.ghost` `.actions` `.goalrow` `.small` `.muted` と `--ng` 色を使います。フランス語版の `src/ui/styles/` から持っていくか、同じ名前で用意してください。文言は `mountSyncCard(el, sync, { ...SYNC_CARD_JA, offTitle: '…' })` で変えられます。
- `newer` には「多い方」ではなく「最後に選んだもの」を残したいキー（1日の目標、今のステージ、表示設定など）を入れます。
- データの形が特殊で `mergeDeep` が合わない場合は、フランス語版の `src/store/merge.ts` のように専用の merge を書いて `merge:` に渡します。

## 5. Firebase 側でやること

- **Firestore のルール**：このリポジトリの `firestore.rules` を、Firebase コンソール → Firestore Database → ルール に貼って「公開」（`progress-xx` すべてに対応した版。1回だけ。フランス語版もそのまま動きます）。
- **承認済みドメイン**：中国語アプリも `yusandonatural.github.io` で公開するなら追加不要。別のドメインなら Authentication → 設定 → 承認済みドメイン に追加。
- ログイン方法（Google）や設定値は共通なので、ほかに作業はありません。

## 6. 確かめ方

- 手元：`npx firebase-tools emulators:start --only auth,firestore --project demo-french` を起動し、`VITE_FIREBASE_EMULATOR=1 npm run dev`。エミュレーターではコンソールで `__testSignIn('me@example.com')` を呼ぶとログインできます。
- 本番：iPhone と パソコンで同じ Google アカウントでログインし、片方で1問解いて、もう片方で「今すぐ同期」。
- Firebase コンソール → Firestore Database → データ に `progress-zh` が現れ、自分のユーザーIDの記録が入っていれば成功です。
