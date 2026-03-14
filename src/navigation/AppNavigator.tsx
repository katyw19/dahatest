import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { enableScreens } from 'react-native-screens';
import BootScreen from '../screens/BootScreen';
import DiagnosticsScreen from '../screens/DiagnosticsScreen';
import WelcomeNoGroupScreen from '../screens/WelcomeNoGroupScreen';
import JoinGroupScreen from '../screens/JoinGroupScreen';
import DebugScreen from '../screens/DebugScreen';
import CreateGroupDetailsScreen from '../screens/groups/CreateGroupDetailsScreen';
import InvitePeopleScreen from '../screens/groups/InvitePeopleScreen';
import GroupPreviewRequestAccessScreen from '../screens/groups/GroupPreviewRequestAccessScreen';
import RequestSentScreen from '../screens/groups/RequestSentScreen';
import SwitchGroupScreen from '../screens/groups/SwitchGroupScreen';

enableScreens();

export type AppStackParamList = {
  Boot: undefined;
  Diagnostics: undefined;
  WelcomeNoGroup: undefined;
  JoinGroup: undefined;
  CreateGroupDetails: undefined;
  InvitePeople: { groupId: string };
  GroupPreviewRequestAccess: { groupId: string };
  RequestSent: undefined;
  SwitchGroup: undefined;
  Debug: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

const AppNavigator = () => (
  <Stack.Navigator initialRouteName="WelcomeNoGroup">
    <Stack.Screen
      name="Boot"
      component={BootScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Diagnostics"
      component={DiagnosticsScreen}
      options={{ title: 'Diagnostics' }}
    />
    <Stack.Screen
      name="WelcomeNoGroup"
      component={WelcomeNoGroupScreen}
      options={{ title: 'Welcome' }}
    />
    <Stack.Screen
      name="JoinGroup"
      component={JoinGroupScreen}
      options={{ title: 'Join a Group' }}
    />
    <Stack.Screen
      name="CreateGroupDetails"
      component={CreateGroupDetailsScreen}
      options={{ title: 'Create Group Details' }}
    />
    <Stack.Screen
      name="InvitePeople"
      component={InvitePeopleScreen}
      options={{ title: 'Invite People' }}
    />
    <Stack.Screen
      name="SwitchGroup"
      component={SwitchGroupScreen}
      options={{ title: 'Switch Group' }}
    />
    <Stack.Screen
      name="GroupPreviewRequestAccess"
      component={GroupPreviewRequestAccessScreen}
      options={{ title: 'Group Preview' }}
    />
    <Stack.Screen
      name="RequestSent"
      component={RequestSentScreen}
      options={{ title: 'Request Sent' }}
    />
    <Stack.Screen
      name="Debug"
      component={DebugScreen}
      options={{ title: 'Debug' }}
    />
  </Stack.Navigator>
);

export default AppNavigator;
