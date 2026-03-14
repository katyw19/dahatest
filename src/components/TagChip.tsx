import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { SPACING } from '../theme/spacing';

type Props = {
  label: string;
};

const TagChip = ({ label }: Props) => {
  const theme = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: theme.colors.secondary }]}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSecondary }}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
});

export default TagChip;
