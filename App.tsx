import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/theme';
import { AuthProvider } from './src/context/AuthContext';
import { ProfileProvider } from './src/context/ProfileContext';
import RootNavigator from './src/navigation/RootNavigator';
import { GroupProvider } from './src/screens/groups/GroupProvider';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ProfileProvider>
          <GroupProvider>
            <ThemeProvider>
              <StatusBar style="auto" />
              <RootNavigator />
            </ThemeProvider>
          </GroupProvider>
        </ProfileProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
