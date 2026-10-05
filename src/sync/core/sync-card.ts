// 記録の同期 card — portable core. Renders into any element; uses the app's
// .panel / .btn / .actions / .goalrow / .small / .muted styles.
import type { CloudSync, SyncStatus } from './cloud-sync';

export interface SyncCardText {
  heading: string; offTitle: string; offBody: string; signIn: string;
  onTitle: string; syncing: string; last: string; syncNow: string; signOut: string; signOutConfirm: string;
}
export const SYNC_CARD_JA: SyncCardText = {
  heading: '記録の同期',
  offTitle: '☁️ iPhone と Web で同じ記録を使う',
  offBody: 'Google アカウントでログインすると、進み具合が自動で保存され、どの端末からでも続きができます。この端末の記録はそのまま引き継がれます。',
  signIn: 'Google でログイン',
  onTitle: '☁️ 同期オン', syncing: '同期中…', last: '最終同期', syncNow: '今すぐ同期', signOut: 'ログアウト',
  signOutConfirm: 'ログアウトしますか？（この端末の記録は残ります）',
};

const esc = (s: unknown) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const time = (t: number) => new Date(t).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

/** CSS classes used by the card, so it fits another app's styles */
export interface SyncCardClasses { panel: string; btn: string; ghost: string; actions: string; heading: string }
export const SYNC_CARD_CLASSES: SyncCardClasses = { panel: 'panel sync', btn: 'btn', ghost: 'btn ghost', actions: 'actions', heading: 'h2' };

/** Show the sign-in / status card in el (nothing when sync is off). Stops updating when el leaves the page. */
export function mountSyncCard(el: HTMLElement, sync: CloudSync, t: SyncCardText = SYNC_CARD_JA, c: SyncCardClasses = SYNC_CARD_CLASSES) {
  if (!sync.available) return;
  const head = c.heading === 'h2' ? `<h2>${esc(t.heading)}</h2>` : '';
  const title = (x: string) => c.heading === 'h2' ? `<b>${esc(x)}</b>` : `<b>${esc(t.heading)}</b><br><span>${esc(x)}</span>`;
  const stop = sync.onStatus((s: SyncStatus) => {
    if (!el.isConnected && el.dataset.mounted) { stop?.(); return; }
    el.dataset.mounted = '1';
    if (!s.ready) { el.innerHTML = ''; return; }
    const msg = s.state === 'error' ? `<p class="small" style="color:var(--ng);margin:8px 0 0">${esc(s.msg || '')}</p>` : '';
    if (!s.user) {
      el.innerHTML = `${head}<div class="${c.panel}">
        ${title(t.offTitle)}
        <p class="small muted" style="margin:6px 0 0">${esc(t.offBody)}</p>${msg}
        <div class="${c.actions}"><button class="${c.btn}" data-sync="in">${esc(t.signIn)}</button></div></div>`;
    } else {
      const st = s.state === 'syncing' ? t.syncing : s.state === 'ok' && s.at ? `${t.last} ${time(s.at)}` : '';
      el.innerHTML = `${head}<div class="${c.panel}">
        <div class="goalrow" style="margin:0;display:flex;justify-content:space-between;gap:8px">${title(t.onTitle)}<span class="small muted">${esc(st)}</span></div>
        <p class="small muted" style="margin:4px 0 0">${esc(s.user.name)}${s.user.email ? `（${esc(s.user.email)}）` : ''}</p>${msg}
        <div class="${c.actions}"><button class="${c.ghost}" data-sync="now">${esc(t.syncNow)}</button><button class="${c.ghost}" data-sync="out">${esc(t.signOut)}</button></div></div>`;
    }
  });
  el.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-sync]'); if (!b) return;
    const a = b.dataset.sync;
    if (a === 'in') sync.signIn();
    else if (a === 'now') sync.syncNow();
    else if (a === 'out' && confirm(t.signOutConfirm)) sync.signOut();
  });
}
