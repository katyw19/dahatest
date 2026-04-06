import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING } from '../theme/spacing';

type ScreenProps = PropsWithChildren<{
  /** Set to true on screens that already have a navigation header handling safe area */
  noTopPadding?: boolean;
}>;

const Screen = ({ children, noTopPadding }: ScreenProps) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingTop: noTopPadding ? 0 : Math.max(insets.top + 4, SPACING.md),
        },
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
});

export default Screen;
