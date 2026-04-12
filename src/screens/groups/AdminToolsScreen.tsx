import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';
import Screen from '../../components/Screen';
import { SPACING, RADIUS } from '../../theme/spacing';

type Props = NativeStackScreenProps<GroupStackParamList, 'AdminTools'>;

type MenuItem = {
  icon: string;
  label: string;
  description: string;
  onPress: () => void;
};

const AdminToolsScreen = ({ navigation }: Props) => {
  const theme = useTheme();

  const items: MenuItem[] = [
    {
      icon: 'account-clock-outline',
      label: 'Join Requests',
      description: 'Review pending requests to join',
      onPress: () => navigation.navigate('AdminTab'),
    },
    {
      icon: 'inbox-outline',
      label: 'Reports Inbox',
      description: 'View and manage user reports',
      onPress: () => navigation.navigate('AdminReportsInbox'),
    },
    {
      icon: 'note-text-outline',
      label: 'Review Notes',
      description: 'Browse lending review notes',
      onPress: () => navigation.navigate('AdminReviewNotesList'),
    },
    {
      icon: 'clipboard-text-clock-outline',
      label: 'Action Log',
      description: 'History of admin actions',
      onPress: () => navigation.navigate('AdminActionLog'),
    },
    {
      icon: 'bullhorn-outline',
      label: 'Post Announcement',
      description: 'Send a pinned announcement',
      onPress: () => navigation.navigate('AdminAnnouncementCreate'),
    },
  ];

  return (
    <Screen noTopPadding>
      <View style={styles.list}>
        {items.map((item) => (
          <Pressable
            key={item.label}
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.menuItem,
              {
                backgroundColor: pressed ? `${theme.colors.primary}08` : theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
          >
            <View style={[styles.menuIcon, { backgroundColor: `${theme.colors.primary}14` }]}>
              <MaterialCommunityIcons
                name={item.icon as any}
                size={22}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.menuText}>
              <Text style={[styles.menuLabel, { color: theme.colors.onSurface }]}>{item.label}</Text>
              <Text style={styles.menuDesc}>{item.description}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: SPACING.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuText: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuDesc: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 1,
  },
});

export default AdminToolsScreen;
