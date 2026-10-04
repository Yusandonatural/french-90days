// 記録の同期 card on Home: Google sign-in and sync status.
import { $, esc } from '../../util/dom';
import { onSyncStatus, signIn, signOut, syncAvailable, syncNow, type SyncStatus } from '../../sync/cloud';

const time = (t: number) => new Date(t).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

function render(s: SyncStatus) {
  const el = $('#syncCard'); if (!el) return;
  if (!s.ready) { el.innerHTML = ''; return; }
  const msg = s.state === 'error' ? `<p class="small" style="color:var(--ng);margin:8px 0 0">${esc(s.msg || '')}</p>` : '';
  if (!s.user) {
    el.innerHTML = `<h2>記録の同期</h2><div class="panel sync">
      <b>☁️ iPhone と Web で同じ記録を使う</b>
      <p class="small muted" style="margin:6px 0 0">Google アカウントでログインすると、進み具合が自動で保存され、どの端末からでも続きができます。この端末の記録はそのまま引き継がれます。</p>${msg}
      <div class="actions"><button class="btn" id="syncIn">Google でログイン</button></div></div>`;
    $('#syncIn').onclick = () => signIn();
    return;
  }
  const st = s.state === 'syncing' ? '同期中…' : s.state === 'ok' && s.at ? `最終同期 ${time(s.at)}` : '';
  el.innerHTML = `<h2>記録の同期</h2><div class="panel sync">
    <div class="goalrow" style="margin:0"><b>☁️ 同期オン</b><span class="small muted">${st}</span></div>
    <p class="small muted" style="margin:4px 0 0">${esc(s.user.name)}${s.user.email ? `（${esc(s.user.email)}）` : ''}</p>${msg}
    <div class="actions"><button class="btn ghost" id="syncNow">今すぐ同期</button><button class="btn ghost" id="syncOut">ログアウト</button></div></div>`;
  $('#syncNow').onclick = () => syncNow();
  $('#syncOut').onclick = () => { if (confirm('ログアウトしますか？（この端末の記録は残ります）')) signOut(); };
}

export function initSyncCard() { if (syncAvailable) onSyncStatus(render); }
