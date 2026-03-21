import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

type Props = {
  status: 'open' | 'borrowed' | 'claimed';
};

const StatusPill = ({ status }: Props) => {
  const theme = useTheme();
  const isOpen = status === 'open';
  const label = status === 'claimed' ? 'Claimed' : status === 'borrowed' ? 'Borrowed' : 'Open';

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: isOpen ? `${theme.colors.primary}14` : '#F0F0F0',
          borderColor: isOpen ? theme.colors.primary : '#D1D1D6',
        },
      ]}
    >
      <Text
        variant="labelSmall"
        style={{
          color: isOpen ? theme.colors.primary : '#8E8E93',
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});

export default StatusPill;
