// Firebase web config (Firebase console → Project settings → Your apps → Web app).
// These values are public by design; access is protected by firestore.rules.
// Set to null to turn cloud sync off (the 同期 card is then hidden).
import type { FirebaseOptions } from 'firebase/app';

export const FIREBASE_CONFIG: FirebaseOptions | null = {
  apiKey: 'AIzaSyALxNcusytqt--Rq8yznBWuIniQY2ZKFCo',
  authDomain: 'french90days.firebaseapp.com',
  projectId: 'french90days',
  storageBucket: 'french90days.firebasestorage.app',
  messagingSenderId: '807742109585',
  appId: '1:807742109585:web:2308bee29607b3cda58c30',
};
