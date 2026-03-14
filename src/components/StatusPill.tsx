import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { SPACING } from '../theme/spacing';

type Props = {
  status: 'open' | 'borrowed';
};

const StatusPill = ({ status }: Props) => {
  const theme = useTheme();
  const isOpen = status === 'open';
  const bg = isOpen ? theme.colors.primary : theme.colors.outline;
  const fg = isOpen ? theme.colors.onPrimary : theme.colors.onSurface;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text variant="labelSmall" style={{ color: fg }}>
        {isOpen ? 'Open' : 'Borrowed'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
});

export default StatusPill;
