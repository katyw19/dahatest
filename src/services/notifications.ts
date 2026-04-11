import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const DEFAULT_PREFS = {
  newOffers: true,
  messages: true,
  reviewReminders: true,
  announcements: true,
  statusUpdates: true,
};

export type NotificationPrefs = typeof DEFAULT_PREFS;

/** Request permission and register for push notifications. Returns the Expo push token or null. */
export const registerForPushNotifications = async (uid: string): Promise<string | null> => {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  // Save to Firestore
  const db = getFirebaseDb();
  if (db && uid) {
    await setDoc(
      doc(db, 'users', uid),
      { expoPushToken: token, updatedAt: serverTimestamp() },
      { merge: true }
    );
  }

  return token;
};

/** Load notification preferences from Firestore */
export const loadNotificationPrefs = async (uid: string): Promise<NotificationPrefs> => {
  const db = getFirebaseDb();
  if (!db) return DEFAULT_PREFS;

  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return DEFAULT_PREFS;

  const data = snap.data();
  return {
    ...DEFAULT_PREFS,
    ...(data.notificationPrefs ?? {}),
  };
};

/** Save notification preferences to Firestore */
export const saveNotificationPrefs = async (uid: string, prefs: NotificationPrefs): Promise<void> => {
  const db = getFirebaseDb();
  if (!db) return;

  await setDoc(
    doc(db, 'users', uid),
    { notificationPrefs: prefs, updatedAt: serverTimestamp() },
    { merge: true }
  );
};
