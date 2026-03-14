import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AppNavigator from './AppNavigator';
import SignInScreen from '../screens/auth/SignInScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import { useAuth } from '../context/AuthContext';
import GroupShellNavigator from './GroupShellNavigator';
import { useGroupContext } from '../screens/groups/GroupProvider';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';
import { useProfile } from '../context/ProfileContext';

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ProfileSetup: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const AuthStackScreens = () => (
  <AuthStack.Navigator>
    <AuthStack.Screen
      name="SignIn"
      component={SignInScreen}
      options={{ title: 'Sign In' }}
    />
    <AuthStack.Screen
      name="SignUp"
      component={SignUpScreen}
      options={{ title: 'Create Account' }}
    />
    <AuthStack.Screen
      name="ForgotPassword"
      component={ForgotPasswordScreen}
      options={{ title: 'Reset Password' }}
    />
    <AuthStack.Screen
      name="ProfileSetup"
      component={ProfileSetupScreen}
      options={{ title: 'Profile' }}
    />
  </AuthStack.Navigator>
);

const ProfileSetupStack = createNativeStackNavigator();
const ProfileSetupStackScreen = () => (
  <ProfileSetupStack.Navigator>
    <ProfileSetupStack.Screen
      name="ProfileSetup"
      component={ProfileSetupScreen}
      options={{ title: 'Complete Your Profile' }}
    />
  </ProfileSetupStack.Navigator>
);

const RootNavigator = () => {
  const { user, loading } = useAuth();
  const { memberships, loadingMembership } = useGroupContext();
  const { profile, loadingProfile } = useProfile();

  if (loading || loadingMembership || loadingProfile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const needsProfile =
    user &&
    (!profile || !profile.firstName || !profile.lastName || profile.firstName.length === 0 || profile.lastName.length === 0);

  return (
    <NavigationContainer>
      {!user ? (
        <AuthStackScreens />
      ) : needsProfile ? (
        <ProfileSetupStackScreen />
      ) : memberships.length > 0 ? (
        <GroupShellNavigator />
      ) : (
        <AppNavigator />
      )}
    </NavigationContainer>
  );
};

export default RootNavigator;
