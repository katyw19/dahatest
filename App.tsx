import 'react-native-gesture-handler';
import { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { ThemeProvider } from './src/theme';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ProfileProvider } from './src/context/ProfileContext';
import RootNavigator from './src/navigation/RootNavigator';
import { GroupProvider } from './src/screens/groups/GroupProvider';
import { registerForPushNotifications } from './src/services/notifications';

/** Registers push token when user is authenticated */
const NotificationRegistrar = () => {
  const { user } = useAuth();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!user?.uid || registeredRef.current) return;
    registeredRef.current = true;
    registerForPushNotifications(user.uid).catch(() => {});
  }, [user?.uid]);

  return null;
};

export default function App() {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Listen for incoming notifications while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // notification received in foreground — handler in notifications.ts shows it
    });

    // Listen for user tapping on a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      // Navigation can be handled here based on data.type, data.threadId, etc.
      console.log('Notification tapped:', data);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ProfileProvider>
          <GroupProvider>
            <ThemeProvider>
              <NotificationRegistrar />
              <StatusBar style="auto" />
              <RootNavigator />
            </ThemeProvider>
          </GroupProvider>
        </ProfileProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
