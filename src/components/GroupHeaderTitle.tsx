import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useGroupContext } from '../screens/groups/GroupProvider';

const GroupHeaderTitle = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { currentGroup, loadingMembership } = useGroupContext();
  const name = loadingMembership ? 'Group' : currentGroup?.name ?? 'Group';

  return (
    <Pressable
      onPress={() => navigation.navigate('SwitchGroup' as never)}
      style={({ pressed }) => [styles.container, pressed && { opacity: 0.6 }]}
    >
      <Text style={[styles.name, { color: '#1C1C1E' }]}>{name}</Text>
      <MaterialCommunityIcons name="chevron-down" size={18} color="#8E8E93" />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
  },
});

export default GroupHeaderTitle;
