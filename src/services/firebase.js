// Central Firebase bootstrap — the ONLY place `initializeApp` is called.
// Everything else imports the already-initialized primitives from here.
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  onValue,
  set,
  update,
  get,
  child,
  remove,
  push,
  query,
  orderByChild,
  limitToLast,
} from 'firebase/database';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app      = initializeApp(firebaseConfig);
export const auth     = getAuth(app);
export const database = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

// Force session-scoped persistence so closing the browser tab signs the user out
// (mirrors the original PHP/browserSessionPersistence behaviour).
setPersistence(auth, browserSessionPersistence).catch(() => {
  /* Some browsers (private mode) refuse — safe to ignore. */
});

// Re-export every primitive the rest of the app needs. This means
// feature code never imports from "firebase/*" directly and can be
// easily mocked in tests.
export {
  // auth
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
  // rtdb
  ref,
  onValue,
  set,
  update,
  get,
  child,
  remove,
  push,
  query,
  orderByChild,
  limitToLast,
};