import { StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

type Props = {
  title: string;
  variant?: 'headlineSmall' | 'titleMedium' | 'titleSmall';
};

const SectionHeader = ({ title, variant = 'titleMedium' }: Props) => {
  return (
    <Text variant={variant} style={styles.text}>
      {title}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontWeight: '700',
    flexShrink: 1,
  },
});

export default SectionHeader;
