import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Dialog, Portal, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BADGE_DEFINITIONS } from '../constants/badges';
import { useAuth } from '../context/AuthContext';
import { listenUserBadgeState } from '../services/badges';
import Screen from '../components/Screen';
import { SPACING, RADIUS } from '../theme/spacing';

const getColumns = () => {
  const width = Dimensions.get('window').width;
  if (width >= 900) return 3;
  if (width >= 600) return 3;
  return 2;
};

const BadgesScreen = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [totalLends, setTotalLends] = useState(0);
  const [badgesEarned, setBadgesEarned] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [unlockId, setUnlockId] = useState<string | null>(null);
  const previousUnlocked = useRef<Set<string>>(new Set());
  const didHydrateRef = useRef(false);
  const celebratedSetRef = useRef<Set<string>>(new Set());
  const celebratedLoadedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    const unsub = listenUserBadgeState(user.uid, (state) => {
      setTotalLends(state.totalLends ?? 0);
      setBadgesEarned(state.badgesEarned ?? {});
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    const loadCelebrated = async () => {
      if (!user?.uid) return;
      const key = `daha_badge_celebrated_${user.uid}`;
      const raw = await AsyncStorage.getItem(key);
      const list = raw ? (JSON.parse(raw) as string[]) : [];
      celebratedSetRef.current = new Set(list);
      celebratedLoadedRef.current = true;
    };
    loadCelebrated();
  }, [user?.uid]);

  const earnedSet = useMemo(() => {
    return new Set(Object.keys(badgesEarned).filter((id) => badgesEarned[id]));
  }, [badgesEarned]);

  const unlockedSet = useMemo(() => {
    const set = new Set<string>();
    BADGE_DEFINITIONS.forEach((b) => {
      if (badgesEarned?.[b.id] === true || totalLends >= b.threshold) {
        set.add(b.id);
      }
    });
    return set;
  }, [badgesEarned, totalLends]);

  useEffect(() => {
    if (!didHydrateRef.current) {
      previousUnlocked.current = new Set(unlockedSet);
      didHydrateRef.current = true;
      return;
    }
    if (!celebratedLoadedRef.current) return;
    const newlyUnlocked = [...unlockedSet].filter((id) => !previousUnlocked.current.has(id));
    const toCelebrate = newlyUnlocked.filter((id) => !celebratedSetRef.current.has(id));
    if (toCelebrate.length > 0) {
      const badgeId = toCelebrate[0];
      setUnlockId(badgeId);
      setSelectedId(null);
      setModalVisible(true);
      celebratedSetRef.current.add(badgeId);
      const key = `daha_badge_celebrated_${user?.uid ?? 'user'}`;
      AsyncStorage.setItem(key, JSON.stringify(Array.from(celebratedSetRef.current))).catch(() => {});
    }
    previousUnlocked.current = new Set(unlockedSet);
  }, [unlockedSet, user?.uid]);

  const columns = getColumns();

  const renderItem = ({ item }: { item: (typeof BADGE_DEFINITIONS)[number] }) => {
    const unlocked = badgesEarned?.[item.id] === true || totalLends >= item.threshold;
    return (
      <Pressable
        style={[styles.cardWrap, { width: `${100 / columns}%` }]}
        onPress={() => {
          setSelectedId(item.id);
          setUnlockId(null);
          setModalVisible(true);
        }}
      >
        <Card
          mode="outlined"
          style={[
            styles.card,
            {
              backgroundColor: unlocked ? `${item.color}22` : theme.colors.surface,
              borderColor: unlocked ? item.color : theme.colors.outline,
            },
          ]}
        >
          <Card.Content style={styles.cardContent}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: unlocked ? `${item.color}33` : theme.colors.outline },
              ]}
            >
              <MaterialCommunityIcons
                name={item.icon as any}
                size={28}
                color={unlocked ? item.color : '#9ca3af'}
              />
              {!unlocked ? (
                <View style={styles.lockOverlay}>
                  <MaterialCommunityIcons name="lock" size={14} color="#6b7280" />
                </View>
              ) : null}
            </View>
            <Text variant="titleSmall" style={styles.badgeTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: unlocked ? theme.colors.onSurface : '#6b7280' }}
            >
              {unlocked ? 'Unlocked' : `${Math.min(totalLends, item.threshold)} / ${item.threshold} lends`}
            </Text>
          </Card.Content>
        </Card>
      </Pressable>
    );
  };

  const selected = BADGE_DEFINITIONS.find((b) => b.id === selectedId);
  const selectedUnlocked = selected
    ? badgesEarned?.[selected.id] === true || totalLends >= selected.threshold
    : false;
  const unlockedBadge = BADGE_DEFINITIONS.find((b) => b.id === unlockId);

  return (
    <Screen>
      <Text variant="titleMedium" style={styles.sectionSubtitle}>Lending Ladder</Text>
      <FlatList
        data={BADGE_DEFINITIONS}
        numColumns={columns}
        key={columns}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
      />

      <Portal>
        <Dialog
          visible={modalVisible}
          dismissable={false}
          style={styles.dialog}
          onDismiss={() => {
            setModalVisible(false);
            setUnlockId(null);
          }}
        >
          {Platform.OS !== 'web' && unlockId ? (
            <ConfettiCannon
              {...({
                count: 120,
                origin: { x: Dimensions.get('window').width / 2, y: 0 },
                fallSpeed: 3000,
                explosionSpeed: 350,
                fadeOut: true,
                duration: 5500,
                autoStart: true,
              } as any)}
            />
          ) : null}
          {unlockId ? (
            <Dialog.Title numberOfLines={2} style={styles.dialogTitle}>
              Badge Unlocked 🎉
            </Dialog.Title>
          ) : null}
          {unlockId && unlockedBadge ? (
            <View style={styles.unlockBanner}>
              <View style={[styles.unlockIcon, { backgroundColor: `${unlockedBadge.color}33` }]}>
                <MaterialCommunityIcons
                  name={unlockedBadge.icon as any}
                  size={32}
                  color={unlockedBadge.color}
                />
              </View>
              <Text variant="titleMedium" style={styles.unlockTitle}>
                {unlockedBadge.title}
              </Text>
              <Text variant="bodySmall" style={styles.unlockSub}>
                Thanks for helping your community.
              </Text>
            </View>
          ) : null}
          {selected ? (
            <View>
              <Dialog.Title numberOfLines={2} style={styles.dialogTitle}>
                {selected.title}
              </Dialog.Title>
              <Dialog.Content>
                <ScrollView contentContainerStyle={styles.modalContent}>
                  <Text variant="bodyMedium">{selected.description}</Text>
                  <Text variant="bodySmall" style={styles.modalText}>
                    Unlock requirement: {selected.threshold} lends
                  </Text>
                  <Text variant="bodySmall" style={styles.modalText}>
                    Progress: {totalLends} / {selected.threshold}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={[styles.modalText, { color: selectedUnlocked ? '#16a34a' : '#6b7280' }]}
                  >
                    {selectedUnlocked ? 'Unlocked' : 'Locked'}
                  </Text>
                </ScrollView>
              </Dialog.Content>
            </View>
          ) : null}
          <Dialog.Actions>
            <Button
              onPress={() => {
                setModalVisible(false);
                setUnlockId(null);
              }}
            >
              Nice!
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  sectionSubtitle: { fontWeight: '600', marginBottom: SPACING.sm, color: '#6b7280' },
  grid: { paddingBottom: SPACING.xl },
  cardWrap: { padding: SPACING.xs },
  card: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  cardContent: { gap: SPACING.xs, alignItems: 'center', paddingVertical: SPACING.md },
  badgeTitle: { fontWeight: '600', textAlign: 'center' },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    padding: 2,
  },
  unlockBanner: {
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  unlockIcon: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockTitle: {
    fontWeight: '700',
  },
  unlockSub: {
    color: '#6b7280',
  },
  modalText: { marginTop: SPACING.xs },
  dialog: {
    width: '92%',
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: RADIUS.md,
  },
  modalContent: {
    paddingBottom: SPACING.sm,
  },
  dialogTitle: {
    textAlign: 'center',
    flexShrink: 1,
  },
});

export default BadgesScreen;
