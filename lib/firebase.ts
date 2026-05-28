/// <reference types="vite/client" />
import { getApps, initializeApp, getApp } from "firebase/app";
import { initializeFirestore, getFirestore, persistentLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Guard against re-initialization during HMR (module is re-evaluated on each hot update)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

function getDb() {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache(),
      experimentalForceLongPolling: true,
    });
  } catch {
    // Already initialized (HMR re-evaluation) — return existing instance
    return getFirestore(app);
  }
}

export const db = getDb();
export const storage = getStorage(app);
