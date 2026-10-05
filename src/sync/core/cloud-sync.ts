// Cloud sync with Firebase — portable core (no imports from the app).
// Google sign-in + one Firestore document per user: {collection}/{uid} = { st: JSON, updatedAt, ua }.
// Local progress is always kept; on sign-in, on returning to the app and shortly
// after changes, local and cloud are merged (by the app's merge function) and both updated.
// See SYNC_HANDOFF.md for using it in another app.
import type { FirebaseOptions } from 'firebase/app';

export interface SyncStatus {
  user: { name: string; email: string } | null;
  state: 'idle' | 'syncing' | 'ok' | 'error';
  at?: number; msg?: string; ready: boolean;
}

export interface CloudSyncOptions<S> {
  /** Firebase web config; null turns sync off */
  config: FirebaseOptions | null;
  /** Firestore collection for this app: 'progress' (French), 'progress-zh' (Chinese) … */
  collection: string;
  /** current local progress */
  getLocal(): S;
  /** replace local progress with the merged result (save it locally, don't notify) */
  setLocal(s: S): void;
  /** merge local and cloud progress */
  merge(local: S, remote: S): S;
  /** true when both hold the same progress (no write needed) */
  same(a: S, b: S): boolean;
  /** subscribe to local saves (pushes are throttled) */
  onLocalSaved(cb: () => void): void;
  /** local progress was replaced by a merge: refresh the screen */
  onRemoteChange(): void;
  /** dev: use the local Firebase emulators (auth :9099, firestore :8085) */
  emulator?: boolean;
  /** delay before pushing after a save (default 20 s) */
  pushDelayMs?: number;
  /** how to load Firebase. Default: import('firebase/…') (bundled apps). Apps without a build
   *  step pass a loader that imports from the CDN — see SYNC_HANDOFF.md. */
  loadFirebase?: () => Promise<FirebaseModules>;
}

export type FirebaseModules = [typeof import('firebase/app'), typeof import('firebase/auth'), typeof import('firebase/firestore/lite')];
const defaultLoad = (): Promise<FirebaseModules> => Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore/lite')]);

export interface CloudSync {
  available: boolean;
  init(): Promise<void>;
  syncNow(): Promise<void>;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  /** call fn now and on every change; returns a function that stops it */
  onStatus(fn: (s: SyncStatus) => void): () => void;
}

type Fb = {
  auth: import('firebase/auth').Auth;
  authMod: typeof import('firebase/auth');
  db: import('firebase/firestore/lite').Firestore;
  fs: typeof import('firebase/firestore/lite');
};

export function createCloudSync<S>(o: CloudSyncOptions<S>): CloudSync {
  const config = o.emulator ? { apiKey: 'demo-key', projectId: 'demo-french', authDomain: 'localhost' } : o.config;
  const status: SyncStatus = { user: null, state: 'idle', ready: false };
  const watchers: ((s: SyncStatus) => void)[] = [];
  // copy: a watcher may unsubscribe itself while we loop
  const emit = (p: Partial<SyncStatus>) => { Object.assign(status, p); watchers.slice().forEach(f => f(status)); };
  let fb: Fb | null = null, uid: string | null = null;
  let pushTimer: ReturnType<typeof setTimeout> | undefined;
  let chain: Promise<void> = Promise.resolve();

  async function doSync() {
    if (!fb || !uid) return;
    clearTimeout(pushTimer); pushTimer = undefined;
    const { fs, db } = fb;
    emit({ state: 'syncing' });
    try {
      const ref = fs.doc(db, o.collection, uid);
      const snap = await fs.getDoc(ref);
      const local = o.getLocal();
      const remote: S | null = snap.exists() ? JSON.parse(snap.data().st) : null;
      const merged = remote ? o.merge(local, remote) : local;
      if (!o.same(merged, local)) { o.setLocal(merged); o.onRemoteChange(); }
      if (!remote || !o.same(merged, remote)) {
        await fs.setDoc(ref, { st: JSON.stringify(merged), updatedAt: fs.serverTimestamp(), ua: navigator.userAgent.slice(0, 120) });
      }
      emit({ state: 'ok', at: Date.now(), msg: undefined });
    } catch (e) {
      const code = (e as { code?: string }).code || '';
      emit({ state: 'error', msg: code.includes('permission') ? '同期できませんでした（保存先の権限設定を確認してください）' : '同期できませんでした。電波のよいところで「今すぐ同期」を押してください' });
    }
  }
  /** Pull, merge, and push if the cloud is behind. Runs one at a time. */
  const syncNow = () => (chain = chain.then(doSync, doSync));

  return {
    available: !!config,
    onStatus(fn) { watchers.push(fn); fn(status); return () => { const i = watchers.indexOf(fn); if (i >= 0) watchers.splice(i, 1); }; },
    syncNow,
    async init() {
      if (!config) return;
      try {
        const [{ initializeApp, getApps }, authMod, fs] = await (o.loadFirebase || defaultLoad)();
        const app = getApps()[0] || initializeApp(config);
        fb = { auth: authMod.getAuth(app), authMod, db: fs.getFirestore(app), fs };
        if (o.emulator) {
          authMod.connectAuthEmulator(fb.auth, 'http://127.0.0.1:9099', { disableWarnings: true });
          fs.connectFirestoreEmulator(fb.db, '127.0.0.1', 8085);
          const { auth } = fb;
          // tests sign in without the Google popup
          (window as unknown as Record<string, unknown>).__testSignIn = (email: string) =>
            authMod.signInWithCredential(auth, authMod.GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, name: email.split('@')[0], email_verified: true })));
        }
        authMod.getRedirectResult(fb.auth).catch(() => {});
        authMod.onAuthStateChanged(fb.auth, u => {
          uid = u ? u.uid : null;
          emit({ ready: true, user: u ? { name: u.displayName || '', email: u.email || '' } : null, state: 'idle', msg: undefined });
          if (u) syncNow();
        });
      } catch {
        emit({ ready: true, state: 'error', msg: '同期の準備に失敗しました（通信を確認してください）' });
        return;
      }
      o.onLocalSaved(() => {
        if (!uid || pushTimer) return;
        pushTimer = setTimeout(() => { pushTimer = undefined; syncNow(); }, o.pushDelayMs ?? 20000);
      });
      document.addEventListener('visibilitychange', () => { if (uid) syncNow(); });
    },
    async signIn() {
      if (!fb) return;
      const { authMod, auth } = fb;
      const provider = new authMod.GoogleAuthProvider();
      try {
        await authMod.signInWithPopup(auth, provider);
      } catch (e) {
        const code = (e as { code?: string }).code || '';
        if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') return authMod.signInWithRedirect(auth, provider);
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
        emit({ state: 'error', msg: code === 'auth/unauthorized-domain' ? 'このURLはログインが許可されていません（Firebase の承認済みドメインに追加してください）' : 'ログインできませんでした' });
      }
    },
    async signOut() {
      if (!fb) return;
      if (uid) await syncNow();
      await fb.authMod.signOut(fb.auth);
    },
  };
}
