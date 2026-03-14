import { StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GroupStackParamList } from '../../navigation/GroupShellNavigator';

type Props = NativeStackScreenProps<GroupStackParamList, 'AdminTools'>;

const AdminToolsScreen = ({ navigation }: Props) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineSmall" style={styles.title}>
        Admin Tools
      </Text>
      <Button mode="contained" onPress={() => navigation.navigate('AdminReportsInbox')}>
        Reports Inbox
      </Button>
      <Button mode="outlined" onPress={() => navigation.navigate('AdminReviewNotesList')}>
        Review Notes
      </Button>
      <Button mode="outlined" onPress={() => navigation.navigate('AdminActionLog')}>
        Action Log
      </Button>
      <Button mode="outlined" onPress={() => navigation.navigate('AdminAnnouncementCreate')}>
        Post Announcement
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  title: {
    fontWeight: '700',
  },
});

export default AdminToolsScreen;
