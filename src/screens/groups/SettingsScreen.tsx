import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Screen from '../../components/Screen';
import { SPACING, RADIUS } from '../../theme/spacing';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';

type Props = NativeStackScreenProps<GroupStackParamList, 'Settings'>;

type MenuItem = {
  icon: string;
  label: string;
  description: string;
  onPress: () => void;
  danger?: boolean;
};

const SettingsScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { signOut } = useAuth();

  const accountItems: MenuItem[] = [
    {
      icon: 'palette-outline',
      label: 'Theme',
      description: 'Change app colors and appearance',
      onPress: () => navigation.navigate('ThemePicker'),
    },
    {
      icon: 'lock-outline',
      label: 'Change Password',
      description: 'Update your account password',
      onPress: () => navigation.navigate('ChangePassword' as any),
    },
    {
      icon: 'account-edit-outline',
      label: 'Edit Profile',
      description: 'Update your name, photo, and bio',
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      icon: 'bell-outline',
      label: 'Notifications',
      description: 'Manage push notification preferences',
      onPress: () => navigation.navigate('NotificationSettings' as any),
    },
  ];

  const supportItems: MenuItem[] = [
    {
      icon: 'shield-check-outline',
      label: 'Privacy',
      description: 'Privacy policy and data settings',
      onPress: () => navigation.navigate('PrivacySettings' as any),
    },
    {
      icon: 'information-outline',
      label: 'About',
      description: 'App version and credits',
      onPress: () => navigation.navigate('About' as any),
    },
  ];

  const dangerItems: MenuItem[] = [
    {
      icon: 'logout',
      label: 'Sign Out',
      description: 'Sign out of your account',
      onPress: () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: () => signOut().catch(() => {}) },
        ]);
      },
    },
  ];

  const renderSection = (title: string, items: MenuItem[]) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: '#8E8E93' }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        {items.map((item, i) => (
          <Pressable
            key={item.label}
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.menuItem,
              pressed && { backgroundColor: `${theme.colors.primary}08` },
              i < items.length - 1 && [styles.menuItemBorder, { borderBottomColor: theme.colors.outline }],
            ]}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.danger ? '#FF3B3014' : `${theme.colors.primary}14` }]}>
              <MaterialCommunityIcons
                name={item.icon as any}
                size={20}
                color={item.danger ? '#FF3B30' : theme.colors.primary}
              />
            </View>
            <View style={styles.menuText}>
              <Text style={[styles.menuLabel, { color: item.danger ? '#FF3B30' : '#1C1C1E' }]}>{item.label}</Text>
              <Text style={styles.menuDesc}>{item.description}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color="#C7C7CC" />
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <Screen noTopPadding>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {renderSection('Account', accountItems)}
        {renderSection('Support', supportItems)}
        {renderSection('', dangerItems)}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.sm,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  sectionCard: {
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuText: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuDesc: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 1,
  },
});

export default SettingsScreen;
