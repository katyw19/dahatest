import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Screen from '../../components/Screen';
import { SPACING } from '../../theme/spacing';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';

type Props = NativeStackScreenProps<GroupStackParamList, 'Settings'>;

type MenuItem = {
  icon: string;
  label: string;
  onPress: () => void;
};

const SettingsScreen = ({ navigation }: Props) => {
  const { signOut } = useAuth();

  const accountItems: MenuItem[] = [
    { icon: 'palette-outline', label: 'Theme', onPress: () => navigation.navigate('ThemePicker') },
    { icon: 'account-edit-outline', label: 'Edit Profile', onPress: () => navigation.navigate('EditProfile') },
    { icon: 'lock-outline', label: 'Change Password', onPress: () => navigation.navigate('ChangePassword' as any) },
    { icon: 'bell-outline', label: 'Notifications', onPress: () => navigation.navigate('NotificationSettings' as any) },
  ];

  const supportItems: MenuItem[] = [
    { icon: 'shield-check-outline', label: 'Privacy', onPress: () => navigation.navigate('PrivacySettings' as any) },
    { icon: 'information-outline', label: 'About', onPress: () => navigation.navigate('About' as any) },
  ];

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut().catch(() => {}) },
    ]);
  };

  const renderRow = (item: MenuItem, isLast: boolean) => (
    <Pressable
      key={item.label}
      onPress={item.onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowBorder,
        pressed && { opacity: 0.5 },
      ]}
    >
      <MaterialCommunityIcons name={item.icon as any} size={18} color="#8E8E93" />
      <Text style={styles.label}>{item.label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={16} color="#C7C7CC" />
    </Pressable>
  );

  return (
    <Screen noTopPadding>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <Text style={styles.sectionHeader}>ACCOUNT</Text>
        <View style={styles.list}>
          {accountItems.map((item, i) => renderRow(item, i === accountItems.length - 1))}
        </View>

        <Text style={styles.sectionHeader}>SUPPORT</Text>
        <View style={styles.list}>
          {supportItems.map((item, i) => renderRow(item, i === supportItems.length - 1))}
        </View>

        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [styles.signOutRow, pressed && { opacity: 0.5 }]}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.md,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: '#8E8E93',
    marginTop: SPACING.lg,
    marginBottom: 8,
    marginHorizontal: 4,
  },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#EBEBEB',
    marginHorizontal: -SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    gap: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  label: {
    flex: 1,
    fontSize: 15,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  signOutRow: {
    marginTop: SPACING.xl,
    alignItems: 'center',
    paddingVertical: 14,
  },
  signOutText: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});

export default SettingsScreen;
