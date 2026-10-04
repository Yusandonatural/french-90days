// Firebase web config (Firebase console → Project settings → Your apps → Web app).
// These values are public by design; access is protected by firestore.rules.
// Leave null to turn cloud sync off (the 同期 card is then hidden).
import type { FirebaseOptions } from 'firebase/app';

export const FIREBASE_CONFIG: FirebaseOptions | null = null;
