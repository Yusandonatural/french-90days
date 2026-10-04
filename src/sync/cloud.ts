// Cloud sync with Firebase: Google sign-in + one Firestore document per user
// (progress/{uid}). Local progress is always kept; on sign-in, on returning to
// the app and shortly after changes, local and cloud are merged and both updated.
import { FIREBASE_CONFIG } from './firebase-config';
import { ST, onSaved, replaceState, type State } from '../store/state';
import { mergeStates, sameProgress } from '../store/merge';

/** Dev only: `VITE_FIREBASE_EMULATOR=1` builds against the local Firebase emulators. */
const EMULATOR = !!import.meta.env.VITE_FIREBASE_EMULATOR;
const CONFIG = EMULATOR ? { apiKey: 'demo-key', projectId: 'demo-french', authDomain: 'localhost' } : FIREBASE_CONFIG;
export const syncAvailable = !!CONFIG;

export interface SyncStatus {
  user: { name: string; email: string } | null;
  state: 'idle' | 'syncing' | 'ok' | 'error';
  at?: number; msg?: string; ready: boolean;
}
const status: SyncStatus = { user: null, state: 'idle', ready: false };
const watchers: ((s: SyncStatus) => void)[] = [];
export function onSyncStatus(fn: (s: SyncStatus) => void) { watchers.push(fn); fn(status); }
const emit = (p: Partial<SyncStatus>) => { Object.assign(status, p); watchers.forEach(f => f(status)); };

type Fb = {
  auth: import('firebase/auth').Auth;
  authMod: typeof import('firebase/auth');
  db: import('firebase/firestore/lite').Firestore;
  fs: typeof import('firebase/firestore/lite');
};
let fb: Fb | null = null;
let uid: string | null = null;
let onRemote: () => void = () => {};

/** Pushes are throttled: the Day timer saves every 5 s. */
const PUSH_DELAY = 20000;
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let chain: Promise<void> = Promise.resolve();

export async function initSync(onRemoteChange: () => void) {
  if (!CONFIG) return;
  onRemote = onRemoteChange;
  try {
    const [{ initializeApp }, authMod, fs] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore/lite')]);
    const app = initializeApp(CONFIG);
    fb = { auth: authMod.getAuth(app), authMod, db: fs.getFirestore(app), fs };
    if (EMULATOR) {
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
  } catch (e) {
    emit({ ready: true, state: 'error', msg: '同期の準備に失敗しました（通信を確認してください）' });
    return;
  }
  onSaved(() => {
    if (!uid || pushTimer) return;
    pushTimer = setTimeout(() => { pushTimer = undefined; syncNow(); }, PUSH_DELAY);
  });
  document.addEventListener('visibilitychange', () => { if (uid) syncNow(); });
}

/** Pull, merge, and push if the cloud is behind. Runs one at a time. */
export function syncNow(): Promise<void> {
  chain = chain.then(doSync, doSync);
  return chain;
}
async function doSync() {
  if (!fb || !uid) return;
  clearTimeout(pushTimer); pushTimer = undefined;
  const { fs, db } = fb;
  emit({ state: 'syncing' });
  try {
    const ref = fs.doc(db, 'progress', uid);
    const snap = await fs.getDoc(ref);
    const remote: State | null = snap.exists() ? JSON.parse(snap.data().st) : null;
    const merged = remote ? mergeStates(ST, remote) : ST;
    if (!sameProgress(merged, ST)) { replaceState(merged); onRemote(); }
    if (!remote || !sameProgress(merged, remote)) {
      await fs.setDoc(ref, { st: JSON.stringify(merged), updatedAt: fs.serverTimestamp(), ua: navigator.userAgent.slice(0, 120) });
    }
    emit({ state: 'ok', at: Date.now(), msg: undefined });
  } catch (e) {
    const code = (e as { code?: string }).code || '';
    emit({ state: 'error', msg: code.includes('permission') ? '同期できませんでした（保存先の権限設定を確認してください）' : '同期できませんでした。電波のよいところで「今すぐ同期」を押してください' });
  }
}

export async function signIn() {
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
}
export async function signOut() {
  if (!fb) return;
  if (uid) await syncNow();
  await fb.authMod.signOut(fb.auth);
}
