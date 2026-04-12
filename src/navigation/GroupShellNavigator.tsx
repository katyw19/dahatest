import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GroupFeedScreen from '../screens/groups/GroupFeedScreen';
import AdminTabScreen from '../screens/groups/AdminTabScreen';
import ProfileTabScreen from '../screens/groups/ProfileTabScreen';
import SwitchGroupScreen from '../screens/groups/SwitchGroupScreen';
import { useGroupContext } from '../screens/groups/GroupProvider';
import PostDetailScreen from '../screens/groups/PostDetailScreen';
import CreatePostScreen from '../screens/groups/CreatePostScreen';
import MyRequestsScreen from '../screens/groups/MyRequestsScreen';
import GroupHeaderTitle from '../components/GroupHeaderTitle';
import OfferCreateScreen from '../screens/groups/OfferCreateScreen';
import OffersListScreen from '../screens/groups/OffersListScreen';
import CreateDonationScreen from '../screens/groups/CreateDonationScreen';
import BidCreateScreen from '../screens/groups/BidCreateScreen';
import BidsListScreen from '../screens/groups/BidsListScreen';
import ChatThreadScreen from '../screens/groups/ChatThreadScreen';
import ChatsListScreen from '../screens/groups/ChatsListScreen';
import ReviewScreen from '../screens/groups/ReviewScreen';
import GroupInviteScreen from '../screens/groups/GroupInviteScreen';
import CreateGroupDetailsScreen from '../screens/groups/CreateGroupDetailsScreen';
import ReportCreateScreen from '../screens/groups/ReportCreateScreen';
import AdminToolsScreen from '../screens/groups/AdminToolsScreen';
import AdminReportsInboxScreen from '../screens/groups/AdminReportsInboxScreen';
import AdminReportDetailScreen from '../screens/groups/AdminReportDetailScreen';
import AdminReviewNotesListScreen from '../screens/groups/AdminReviewNotesListScreen';
import AdminReviewNoteDetailScreen from '../screens/groups/AdminReviewNoteDetailScreen';
import AdminActionLogScreen from '../screens/groups/AdminActionLogScreen';
import AdminAnnouncementCreateScreen from '../screens/groups/AdminAnnouncementCreateScreen';
import BadgesScreen from '../screens/BadgesScreen';
import EditProfileScreen from '../screens/groups/EditProfileScreen';
import UserProfileScreen from '../screens/groups/UserProfileScreen';
import SettingsScreen from '../screens/groups/SettingsScreen';
import ThemePickerScreen from '../screens/groups/ThemePickerScreen';
import ChangePasswordScreen from '../screens/groups/ChangePasswordScreen';
import NotificationSettingsScreen from '../screens/groups/NotificationSettingsScreen';
import PrivacySettingsScreen from '../screens/groups/PrivacySettingsScreen';
import AboutScreen from '../screens/groups/AboutScreen';
import JoinGroupScreen from '../screens/JoinGroupScreen';
import GroupPreviewRequestAccessScreen from '../screens/groups/GroupPreviewRequestAccessScreen';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IconButton, useTheme } from 'react-native-paper';

export type GroupTabParamList = {
  FeedTab: undefined;
  RequestsTab: undefined;
  BadgesTab: undefined;
  ChatsTab: undefined;
  ProfileTab: undefined;
  Admin?: undefined;
};

export type GroupStackParamList = {
  GroupFeed: undefined;
  MyRequests: undefined;
  SwitchGroup: undefined;
  JoinGroup: undefined;
  GroupPreviewRequestAccess: { groupId: string };
  CreateGroupDetails: undefined;
  PostDetail: { postId: string; offeredSuccess?: boolean };
  CreatePost: undefined;
  CreateDonation: undefined;
  OfferCreate: { postId: string };
  OffersList: { postId: string; postAuthorUid: string };
  BidCreate: { postId: string };
  BidsList: { postId: string; postAuthorUid: string };
  ChatThread: { threadId: string };
  ChatsList: undefined;
  Review: { threadId: string };
  GroupInvite: undefined;
  Profile: undefined;
  AdminTab: undefined;
  AdminTools: undefined;
  AdminReportsInbox: undefined;
  AdminReportDetail: { reportId: string };
  AdminReviewNotesList: undefined;
  AdminReviewNoteDetail: { note: any };
  AdminActionLog: undefined;
  AdminAnnouncementCreate: undefined;
  EditProfile: undefined;
  Settings: undefined;
  ThemePicker: undefined;
  ChangePassword: undefined;
  NotificationSettings: undefined;
  PrivacySettings: undefined;
  About: undefined;
  UserProfile: { uid: string };
  ReportCreate: {
    type: 'post' | 'thread';
    postId?: string;
    threadId?: string;
    targetUid?: string;
    targetName?: string;
    snippet?: string;
  };
};

const Tab = createBottomTabNavigator<GroupTabParamList>();
const FeedStack = createNativeStackNavigator<GroupStackParamList>();
const RequestsStack = createNativeStackNavigator<GroupStackParamList>();
const ChatsStack = createNativeStackNavigator<GroupStackParamList>();
const ProfileStack = createNativeStackNavigator<GroupStackParamList>();

const FeedStackScreens = () => (
  <FeedStack.Navigator>
    <FeedStack.Screen
      name="GroupFeed"
      component={GroupFeedScreen}
      options={{ headerTitle: () => <GroupHeaderTitle /> }}
    />
    <FeedStack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: 'Request' }} />
    <FeedStack.Screen name="CreatePost" component={CreatePostScreen} options={{ title: 'New Request' }} />
    <FeedStack.Screen name="CreateDonation" component={CreateDonationScreen} options={{ title: 'New Donation' }} />
    <FeedStack.Screen name="OfferCreate" component={OfferCreateScreen} options={{ title: 'Send Offer' }} />
    <FeedStack.Screen name="OffersList" component={OffersListScreen} options={{ title: 'Offers' }} />
    <FeedStack.Screen name="BidCreate" component={BidCreateScreen} options={{ title: 'Request Item' }} />
    <FeedStack.Screen name="BidsList" component={BidsListScreen} options={{ title: 'Requests' }} />
    <FeedStack.Screen name="ChatThread" component={ChatThreadScreen} options={{ title: 'Chat' }} />
    <FeedStack.Screen name="ChatsList" component={ChatsListScreen} options={{ title: 'Chats' }} />
    <FeedStack.Screen name="SwitchGroup" component={SwitchGroupScreen} options={{ title: 'Switch Group' }} />
    <FeedStack.Screen name="JoinGroup" component={JoinGroupScreen} options={{ title: 'Join Group' }} />
    <FeedStack.Screen name="GroupPreviewRequestAccess" component={GroupPreviewRequestAccessScreen} options={{ title: 'Join Group' }} />
    <FeedStack.Screen name="GroupInvite" component={GroupInviteScreen} options={{ title: 'Invite' }} />
    <FeedStack.Screen name="Review" component={ReviewScreen} options={{ title: 'Review' }} />
    <FeedStack.Screen name="CreateGroupDetails" component={CreateGroupDetailsScreen} options={{ title: 'Create Group' }} />
    <FeedStack.Screen name="ReportCreate" component={ReportCreateScreen} options={{ title: 'Report' }} />
    <FeedStack.Screen name="AdminTools" component={AdminToolsScreen} options={{ title: 'Admin Tools' }} />
    <FeedStack.Screen
      name="AdminReportsInbox"
      component={AdminReportsInboxScreen}
      options={{ title: 'Reports Inbox' }}
    />
    <FeedStack.Screen
      name="AdminReportDetail"
      component={AdminReportDetailScreen}
      options={{ title: 'Report Detail' }}
    />
    <FeedStack.Screen
      name="AdminReviewNotesList"
      component={AdminReviewNotesListScreen}
      options={{ title: 'Review Notes' }}
    />
    <FeedStack.Screen
      name="AdminReviewNoteDetail"
      component={AdminReviewNoteDetailScreen}
      options={{ title: 'Note Detail' }}
    />
    <FeedStack.Screen
      name="AdminActionLog"
      component={AdminActionLogScreen}
      options={{ title: 'Action Log' }}
    />
    <FeedStack.Screen
      name="AdminAnnouncementCreate"
      component={AdminAnnouncementCreateScreen}
      options={{ title: 'Post Announcement' }}
    />
    <FeedStack.Screen
      name="UserProfile"
      component={UserProfileScreen}
      options={{ title: 'Profile' }}
    />
  </FeedStack.Navigator>
);

const RequestsStackScreens = () => (
  <RequestsStack.Navigator>
    <RequestsStack.Screen
      name="MyRequests"
      component={MyRequestsScreen}
      options={{ headerTitle: () => <GroupHeaderTitle /> }}
    />
    <RequestsStack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: 'Request' }} />
    <RequestsStack.Screen name="CreatePost" component={CreatePostScreen} options={{ title: 'New Request' }} />
    <RequestsStack.Screen name="CreateDonation" component={CreateDonationScreen} options={{ title: 'New Donation' }} />
    <RequestsStack.Screen name="OfferCreate" component={OfferCreateScreen} options={{ title: 'Send Offer' }} />
    <RequestsStack.Screen name="OffersList" component={OffersListScreen} options={{ title: 'Offers' }} />
    <RequestsStack.Screen name="BidCreate" component={BidCreateScreen} options={{ title: 'Request Item' }} />
    <RequestsStack.Screen name="BidsList" component={BidsListScreen} options={{ title: 'Requests' }} />
    <RequestsStack.Screen name="ChatThread" component={ChatThreadScreen} options={{ title: 'Chat' }} />
    <RequestsStack.Screen name="ChatsList" component={ChatsListScreen} options={{ title: 'Chats' }} />
    <RequestsStack.Screen name="SwitchGroup" component={SwitchGroupScreen} options={{ title: 'Switch Group' }} />
    <RequestsStack.Screen name="JoinGroup" component={JoinGroupScreen} options={{ title: 'Join Group' }} />
    <RequestsStack.Screen name="GroupPreviewRequestAccess" component={GroupPreviewRequestAccessScreen} options={{ title: 'Join Group' }} />
    <RequestsStack.Screen name="GroupInvite" component={GroupInviteScreen} options={{ title: 'Invite' }} />
    <RequestsStack.Screen name="Review" component={ReviewScreen} options={{ title: 'Review' }} />
    <RequestsStack.Screen name="CreateGroupDetails" component={CreateGroupDetailsScreen} options={{ title: 'Create Group' }} />
    <RequestsStack.Screen name="ReportCreate" component={ReportCreateScreen} options={{ title: 'Report' }} />
    <RequestsStack.Screen name="AdminTools" component={AdminToolsScreen} options={{ title: 'Admin Tools' }} />
    <RequestsStack.Screen
      name="AdminReportsInbox"
      component={AdminReportsInboxScreen}
      options={{ title: 'Reports Inbox' }}
    />
    <RequestsStack.Screen
      name="AdminReportDetail"
      component={AdminReportDetailScreen}
      options={{ title: 'Report Detail' }}
    />
    <RequestsStack.Screen
      name="AdminReviewNotesList"
      component={AdminReviewNotesListScreen}
      options={{ title: 'Review Notes' }}
    />
    <RequestsStack.Screen
      name="AdminReviewNoteDetail"
      component={AdminReviewNoteDetailScreen}
      options={{ title: 'Note Detail' }}
    />
    <RequestsStack.Screen
      name="AdminActionLog"
      component={AdminActionLogScreen}
      options={{ title: 'Action Log' }}
    />
    <RequestsStack.Screen
      name="AdminAnnouncementCreate"
      component={AdminAnnouncementCreateScreen}
      options={{ title: 'Post Announcement' }}
    />
    <RequestsStack.Screen
      name="UserProfile"
      component={UserProfileScreen}
      options={{ title: 'Profile' }}
    />
  </RequestsStack.Navigator>
);

const ChatsStackScreens = () => (
  <ChatsStack.Navigator>
    <ChatsStack.Screen
      name="ChatsList"
      component={ChatsListScreen}
      options={{ title: 'Chats', headerTitle: () => <GroupHeaderTitle /> }}
    />
    <ChatsStack.Screen name="ChatThread" component={ChatThreadScreen} options={{ title: 'Chat' }} />
    <ChatsStack.Screen name="Review" component={ReviewScreen} options={{ title: 'Review' }} />
    <ChatsStack.Screen name="SwitchGroup" component={SwitchGroupScreen} options={{ title: 'Switch Group' }} />
    <ChatsStack.Screen name="JoinGroup" component={JoinGroupScreen} options={{ title: 'Join Group' }} />
    <ChatsStack.Screen name="GroupPreviewRequestAccess" component={GroupPreviewRequestAccessScreen} options={{ title: 'Join Group' }} />
    <ChatsStack.Screen name="ReportCreate" component={ReportCreateScreen} options={{ title: 'Report' }} />
    <ChatsStack.Screen name="AdminTools" component={AdminToolsScreen} options={{ title: 'Admin Tools' }} />
    <ChatsStack.Screen
      name="AdminReportsInbox"
      component={AdminReportsInboxScreen}
      options={{ title: 'Reports Inbox' }}
    />
    <ChatsStack.Screen
      name="AdminReportDetail"
      component={AdminReportDetailScreen}
      options={{ title: 'Report Detail' }}
    />
    <ChatsStack.Screen
      name="AdminReviewNotesList"
      component={AdminReviewNotesListScreen}
      options={{ title: 'Review Notes' }}
    />
    <ChatsStack.Screen
      name="AdminReviewNoteDetail"
      component={AdminReviewNoteDetailScreen}
      options={{ title: 'Note Detail' }}
    />
    <ChatsStack.Screen
      name="AdminActionLog"
      component={AdminActionLogScreen}
      options={{ title: 'Action Log' }}
    />
    <ChatsStack.Screen
      name="AdminAnnouncementCreate"
      component={AdminAnnouncementCreateScreen}
      options={{ title: 'Post Announcement' }}
    />
    <ChatsStack.Screen
      name="UserProfile"
      component={UserProfileScreen}
      options={{ title: 'Profile' }}
    />
  </ChatsStack.Navigator>
);

const ProfileStackScreens = () => {
  const { currentMembership } = useGroupContext();
  const theme = useTheme();

  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen
        name="Profile"
        component={ProfileTabScreen}
        options={({ navigation }) => ({
          headerTitle: () => <GroupHeaderTitle />,
          headerRight: () => (
            <IconButton
              icon="cog"
              size={22}
              onPress={() => navigation.navigate('Settings')}
              style={{ margin: 0 }}
              iconColor={theme.colors.onSurface}
            />
          ),
        })}
      />

      <ProfileStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
      <ProfileStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <ProfileStack.Screen
        name="ThemePicker"
        component={ThemePickerScreen}
        options={{ title: 'Theme' }}
      />
      <ProfileStack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: 'Change Password' }}
      />
      <ProfileStack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: 'Notifications' }}
      />
      <ProfileStack.Screen
        name="PrivacySettings"
        component={PrivacySettingsScreen}
        options={{ title: 'Privacy' }}
      />
      <ProfileStack.Screen
        name="About"
        component={AboutScreen}
        options={{ title: 'About' }}
      />

      {currentMembership?.role === 'admin' ? (
        <ProfileStack.Screen name="AdminTab" component={AdminTabScreen} options={{ title: 'Admin' }} />
      ) : null}

      <ProfileStack.Screen name="SwitchGroup" component={SwitchGroupScreen} options={{ title: 'Switch Group' }} />
      <ProfileStack.Screen name="JoinGroup" component={JoinGroupScreen} options={{ title: 'Join Group' }} />
      <ProfileStack.Screen name="GroupPreviewRequestAccess" component={GroupPreviewRequestAccessScreen} options={{ title: 'Join Group' }} />
      <ProfileStack.Screen name="GroupInvite" component={GroupInviteScreen} options={{ title: 'Invite' }} />
      <ProfileStack.Screen
        name="CreateGroupDetails"
        component={CreateGroupDetailsScreen}
        options={{ title: 'Create Group' }}
      />
      <ProfileStack.Screen name="ReportCreate" component={ReportCreateScreen} options={{ title: 'Report' }} />
      <ProfileStack.Screen name="AdminTools" component={AdminToolsScreen} options={{ title: 'Admin Tools' }} />

      <ProfileStack.Screen
        name="AdminReportsInbox"
        component={AdminReportsInboxScreen}
        options={{ title: 'Reports Inbox' }}
      />
      <ProfileStack.Screen
        name="AdminReportDetail"
        component={AdminReportDetailScreen}
        options={{ title: 'Report Detail' }}
      />

      <ProfileStack.Screen
        name="AdminReviewNotesList"
        component={AdminReviewNotesListScreen}
        options={{ title: 'Review Notes' }}
      />
      <ProfileStack.Screen
        name="AdminReviewNoteDetail"
        component={AdminReviewNoteDetailScreen}
        options={{ title: 'Note Detail' }}
      />

      <ProfileStack.Screen
        name="AdminActionLog"
        component={AdminActionLogScreen}
        options={{ title: 'Action Log' }}
      />
      <ProfileStack.Screen
        name="AdminAnnouncementCreate"
        component={AdminAnnouncementCreateScreen}
        options={{ title: 'Post Announcement' }}
      />
      <ProfileStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ title: 'Profile' }}
      />
    </ProfileStack.Navigator>
  );
};


const GroupShellNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { borderTopWidth: 0, elevation: 6 },
      }}
    >
    <Tab.Screen
      name="FeedTab"
      component={FeedStackScreens}
      options={{
        title: 'Feed',
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="home-heart" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="RequestsTab"
      component={RequestsStackScreens}
      options={{
        title: 'My Requests',
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="clipboard-text" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="BadgesTab"
      component={BadgesScreen}
      options={{
        title: 'Badges',
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="trophy" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="ChatsTab"
      component={ChatsStackScreens}
      options={{
        title: 'Chats',
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="message-text" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="ProfileTab"
      component={ProfileStackScreens}
      options={{
        title: 'Profile',
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="account-circle" size={size} color={color} />
        ),
      }}
    />
    </Tab.Navigator>
  );
};

export default GroupShellNavigator;
