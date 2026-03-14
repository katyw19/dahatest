import { StyleSheet, View } from 'react-native';
import { Card } from 'react-native-paper';
import type { ComponentProps } from 'react';
import { RADIUS, SPACING } from '../theme/spacing';

type Props = Omit<ComponentProps<typeof Card>, 'mode' | 'elevation'>;

const AppCard = ({ style, children, ...props }: Props) => {
  return (
    <Card mode="elevated" style={[styles.card, style]} {...props}>
      <View style={styles.content}>{children}</View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.md,
    marginVertical: 0,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  content: {
    padding: SPACING.md,
  },
});

export default AppCard;
