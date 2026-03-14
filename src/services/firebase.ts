import { Platform } from "react-native";
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { initializeAuth, getAuth, Auth } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getFirebaseConfig } from "../utils/env";

/**
 * IMPORTANT RULE (DO NOT BREAK):
 * - This file is the ONLY place Firebase Auth is initialized.
 * - No other file may import getAuth or initializeAuth.
 */

let firebaseApp: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;
let storageInstance: FirebaseStorage | undefined;

const initFirebaseApp = () => {
  if (firebaseApp) return firebaseApp;

  const config = getFirebaseConfig();
  if (!config) {
    console.warn("Firebase config missing. Auth is disabled until env vars are set.");
    return undefined;
  }

  firebaseApp = getApps().length ? getApps()[0] : initializeApp(config);
  return firebaseApp;
};

export const getFirebaseApp = () => initFirebaseApp();

/**
 * Firebase Auth
 * - Web: standard getAuth (browser persistence handled automatically)
 * - iOS / Android: MUST initialize with AsyncStorage persistence FIRST
 */
export const getFirebaseAuth = (): Auth | undefined => {
  if (authInstance) return authInstance;

  const app = initFirebaseApp();
  if (!app) return undefined;

  if (Platform.OS === "web") {
    authInstance = getAuth(app);
    return authInstance;
  }

  // Native (iOS / Android)
  try {
    // Dynamic require avoids TS + bundler issues
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rnAuth = require("firebase/auth/react-native");
    const persistence = rnAuth.getReactNativePersistence(ReactNativeAsyncStorage);

    authInstance = initializeAuth(app, { persistence });
    return authInstance;
  } catch (err) {
    // This only happens if auth was *already* initialized (e.g. hot reload)
    authInstance = getAuth(app);
    return authInstance;
  }
};

export const getFirebaseDb = (): Firestore | undefined => {
  if (dbInstance) return dbInstance;

  const app = initFirebaseApp();
  if (!app) return undefined;

  dbInstance = getFirestore(app);
  return dbInstance;
};

export const getFirebaseStorage = (): FirebaseStorage | undefined => {
  if (storageInstance) return storageInstance;

  const app = initFirebaseApp();
  if (!app) return undefined;

  storageInstance = getStorage(app);
  return storageInstance;
};

// NOTE: Keep all future collections group-scoped under groups/{groupId}/...
