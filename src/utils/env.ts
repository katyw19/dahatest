import Constants from "expo-constants";

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

export function getFirebaseConfig(): FirebaseConfig | null {
  const extra = (Constants.expoConfig?.extra) as
    | Record<string, string | undefined>
    | undefined;

  const apiKey = extra?.FIREBASE_API_KEY;
  const authDomain = extra?.FIREBASE_AUTH_DOMAIN;
  const projectId = extra?.FIREBASE_PROJECT_ID;
  const storageBucket = extra?.FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = extra?.FIREBASE_MESSAGING_SENDER_ID;
  const appId = extra?.FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    return null;
  }

  return { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };
}

export function getEnvironment(): string {
  const extra = (Constants.expoConfig?.extra) as
    | Record<string, string | undefined>
    | undefined;
  return extra?.APP_ENV ?? 'dev';
}
