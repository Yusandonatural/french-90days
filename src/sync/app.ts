// This app's cloud sync: the portable core (./core) wired to 90日フランス語's progress.
// French progress lives in Firestore progress/{uid} (kept from the first version).
import { createCloudSync } from './core/cloud-sync';
import { FIREBASE_CONFIG } from './firebase-config';
import { ST, onSaved, replaceState, type State } from '../store/state';
import { mergeStates, sameProgress } from '../store/merge';

let refresh: () => void = () => {};
/** what to redraw when another device's progress has been merged in */
export function onRemoteProgress(fn: () => void) { refresh = fn; }

export const sync = createCloudSync<State>({
  config: FIREBASE_CONFIG,
  collection: 'progress',
  getLocal: () => ST,
  setLocal: replaceState,
  merge: mergeStates,
  same: sameProgress,
  onLocalSaved: onSaved,
  onRemoteChange: () => refresh(),
  emulator: !!import.meta.env.VITE_FIREBASE_EMULATOR,
});
