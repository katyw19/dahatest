import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
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
  return width >= 600 ? 3 : 2;
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
  const unlockedCount = unlockedSet.size;
  const totalBadges = BADGE_DEFINITIONS.length;

  const renderItem = ({ item }: { item: (typeof BADGE_DEFINITIONS)[number] }) => {
    const unlocked = unlockedSet.has(item.id);
    return (
      <Pressable
        style={[styles.cardWrap, { width: `${100 / columns}%` as any }]}
        onPress={() => {
          setSelectedId(item.id);
          setUnlockId(null);
          setModalVisible(true);
        }}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: unlocked ? `${item.color}12` : theme.colors.surface,
              borderColor: unlocked ? item.color : theme.colors.outline,
            },
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: unlocked ? `${item.color}25` : `${theme.colors.outline}30` },
            ]}
          >
            <MaterialCommunityIcons
              name={item.icon as any}
              size={26}
              color={unlocked ? item.color : '#b0b0b0'}
            />
          </View>
          {!unlocked ? (
            <View style={styles.lockBadge}>
              <MaterialCommunityIcons name="lock" size={10} color="#fff" />
            </View>
          ) : null}
          <Text style={[styles.badgeTitle, { color: unlocked ? '#1C1C1E' : '#8E8E93' }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.badgeSub, { color: unlocked ? '#34C759' : '#8E8E93' }]}>
            {unlocked ? 'Unlocked' : `${Math.min(totalLends, item.threshold)} / ${item.threshold}`}
          </Text>
        </View>
      </Pressable>
    );
  };

  const activeBadge = BADGE_DEFINITIONS.find((b) => b.id === (unlockId || selectedId));
  const activeUnlocked = activeBadge ? unlockedSet.has(activeBadge.id) : false;
  const isCelebrating = !!unlockId;

  return (
    <Screen>
      {/* Progress header */}
      <View style={[styles.progressCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.progressTextRow}>
          <Text style={[styles.progressTitle, { color: '#1C1C1E' }]}>Your Progress</Text>
          <Text style={[styles.progressCount, { color: theme.colors.primary }]}>
            {unlockedCount}/{totalBadges}
          </Text>
        </View>
        <View style={[styles.progressBarBg, { backgroundColor: `${theme.colors.outline}30` }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: theme.colors.primary,
                width: `${totalBadges > 0 ? (unlockedCount / totalBadges) * 100 : 0}%` as any,
              },
            ]}
          />
        </View>
        <Text style={styles.progressHint}>
          {unlockedCount < totalBadges
            ? `${BADGE_DEFINITIONS.find((b) => !unlockedSet.has(b.id))?.threshold ?? '?'} lends to unlock the next badge`
            : 'All badges unlocked! Amazing!'}
        </Text>
      </View>

      <FlatList
        data={BADGE_DEFINITIONS}
        numColumns={columns}
        key={columns}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      />

      {/* Badge Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setModalVisible(false);
          setUnlockId(null);
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setModalVisible(false);
            setUnlockId(null);
          }}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {Platform.OS !== 'web' && isCelebrating ? (
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

            {activeBadge ? (
              <>
                {isCelebrating ? (
                  <Text style={styles.celebrateHeader}>Badge Unlocked!</Text>
                ) : null}

                <View
                  style={[
                    styles.modalIconCircle,
                    { backgroundColor: activeUnlocked ? `${activeBadge.color}20` : '#f3f4f6' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={activeBadge.icon as any}
                    size={44}
                    color={activeUnlocked ? activeBadge.color : '#b0b0b0'}
                  />
                </View>

                <Text style={styles.modalTitle}>{activeBadge.title}</Text>

                <View
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor: activeUnlocked ? '#34C75920' : '#8E8E9320',
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={activeUnlocked ? 'check-circle' : 'lock'}
                    size={14}
                    color={activeUnlocked ? '#34C759' : '#8E8E93'}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: activeUnlocked ? '#34C759' : '#8E8E93' },
                    ]}
                  >
                    {activeUnlocked ? 'Unlocked' : 'Locked'}
                  </Text>
                </View>

                <Text style={styles.modalDesc}>{activeBadge.description}</Text>

                {/* Progress bar inside modal */}
                <View style={styles.modalProgressSection}>
                  <View style={styles.modalProgressRow}>
                    <Text style={styles.modalProgressLabel}>Progress</Text>
                    <Text style={styles.modalProgressValue}>
                      {Math.min(totalLends, activeBadge.threshold)} / {activeBadge.threshold}
                    </Text>
                  </View>
                  <View style={[styles.modalProgressBg, { backgroundColor: '#f3f4f6' }]}>
                    <View
                      style={[
                        styles.modalProgressFill,
                        {
                          backgroundColor: activeUnlocked ? activeBadge.color : '#C7C7CC',
                          width: `${Math.min((totalLends / activeBadge.threshold) * 100, 100)}%` as any,
                        },
                      ]}
                    />
                  </View>
                </View>

                <Pressable
                  onPress={() => {
                    setModalVisible(false);
                    setUnlockId(null);
                  }}
                  style={({ pressed }) => [
                    styles.modalBtn,
                    {
                      backgroundColor: activeUnlocked ? activeBadge.color : '#8E8E93',
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={styles.modalBtnText}>
                    {isCelebrating ? 'Awesome!' : 'Got it'}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  /* Progress header */
  progressCard: {
    marginHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: 8,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressCount: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressHint: {
    fontSize: 12,
    color: '#8E8E93',
  },

  /* Grid */
  grid: { paddingHorizontal: SPACING.xs, paddingBottom: 80 },
  cardWrap: { padding: SPACING.xs },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    alignItems: 'center',
    gap: 6,
    minHeight: 130,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    position: 'absolute',
    top: SPACING.md + 40,
    alignSelf: 'center',
    backgroundColor: '#b0b0b0',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  badgeSub: {
    fontSize: 11,
    fontWeight: '500',
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: 12,
  },
  celebrateHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFD60A',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  modalIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: '#3C3C43',
    textAlign: 'center',
  },
  modalProgressSection: {
    width: '100%',
    gap: 6,
    marginTop: 4,
  },
  modalProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalProgressLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  modalProgressValue: {
    fontSize: 12,
    color: '#1C1C1E',
    fontWeight: '600',
  },
  modalProgressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  modalProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  modalBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default BadgesScreen;
