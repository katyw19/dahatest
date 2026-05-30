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
        { borderColor: isOpen ? theme.colors.primary : '#D1D1D6' },
      ]}
    >
      <Text
        style={{
          color: isOpen ? theme.colors.primary : '#8E8E93',
          fontWeight: '500',
          fontSize: 11,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
});

export default StatusPill;
