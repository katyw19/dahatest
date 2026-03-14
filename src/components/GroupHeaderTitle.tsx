import { Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useGroupContext } from '../screens/groups/GroupProvider';

const GroupHeaderTitle = () => {
  const navigation = useNavigation();
  const { currentGroup, loadingMembership } = useGroupContext();
  const name = loadingMembership ? 'Group' : currentGroup?.name ?? 'Group';

  return (
    <Pressable
      onPress={() => navigation.navigate('SwitchGroup' as never)}
      style={{ flexDirection: 'row', alignItems: 'center' }}
    >
      <Text variant="titleMedium">{name}</Text>
      <Text> ▾</Text>
    </Pressable>
  );
};

export default GroupHeaderTitle;
