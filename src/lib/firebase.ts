'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth, type Auth, setPersistence,
  browserLocalPersistence, inMemoryPersistence,
  GoogleAuthProvider
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

export function getFirebaseApp(): FirebaseApp {
  if (!getApps().length) app = initializeApp(firebaseConfig);
  else app = getApp();
  return app;
}

// ✅ Sync, browser-only, single Auth instance.
//    (No initializeAuth — avoids weird edge cases)
export async function getFirebaseAuth(): Promise<Auth> {
  if (auth) return auth;
  if (typeof window === 'undefined') {
    throw new Error('Auth can only be used in the browser');
  }
  auth = getAuth(getFirebaseApp());
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {
    await setPersistence(auth, inMemoryPersistence);
  }
  return auth;
}

export function getFirestoreDB(): Firestore {
  if (!db) db = getFirestore(getFirebaseApp());
  return db;
}

export const googleProvider = new GoogleAuthProvider();
