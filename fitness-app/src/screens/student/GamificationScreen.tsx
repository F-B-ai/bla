import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { useAuth } from '../../hooks/useAuth';
import { crossAlert } from '../../utils/alert';
import { Badge, BadgeId, StudentGamification } from '../../types';
import {
  getStudentGamification,
  getAllBadgeDefinitions,
  xpForLevel,
} from '../../services/gamificationService';

const PRIZE_MILESTONES = [
  {
    threshold: 10,
    icon: '🎁',
    title: 'Sessione Stretching & Mobility',
    description: 'Una sessione gratuita di stretching e mobility offerta da Mind Movement Lab',
    color: '#4CAF50',
  },
  {
    threshold: 20,
    icon: '👕',
    title: 'T-Shirt Esclusiva',
    description: 'T-shirt esclusiva Mind Movement Lab in edizione limitata',
    color: '#2196F3',
  },
  {
    threshold: 30,
    icon: '🏋️',
    title: 'Personal Training 1-on-1',
    description: 'Una sessione di personal training individuale gratuita con un coach',
    color: '#9C27B0',
  },
  {
    threshold: 40,
    icon: '💆',
    title: 'Pacchetto Benessere',
    description: 'Massaggio sportivo + consulenza nutrizionale personalizzata',
    color: '#FF9800',
  },
  {
    threshold: 50,
    icon: '👑',
    title: 'Esperienza VIP',
    description: 'Workshop esclusivo Mind Movement Lab + kit premium personalizzato',
    color: '#F44336',
  },
];

export const GamificationScreen: React.FC = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [gamification, setGamification] = useState<StudentGamification | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getStudentGamification(user.id);
      setGamification(data);
    } catch {
      crossAlert('Errore', 'Impossibile caricare i dati di gamification');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!gamification) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>Nessun dato disponibile</Text>
      </View>
    );
  }

  const allBadges = getAllBadgeDefinitions();
  const unlockedIds = new Set(gamification.badges.map((b) => b.id));
  const unlockedCount = gamification.badges.length;

  const currentLevelXp = xpForLevel(gamification.level - 1);
  const nextLevelXp = xpForLevel(gamification.level);
  const xpInLevel = gamification.xp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const progressPercent = xpNeeded > 0 ? Math.min(xpInLevel / xpNeeded, 1) : 0;

  const badgeIds = Object.keys(allBadges) as BadgeId[];
  const sortedBadges = [
    ...badgeIds.filter((id) => unlockedIds.has(id)),
    ...badgeIds.filter((id) => !unlockedIds.has(id)),
  ];

  const nextPrize = PRIZE_MILESTONES.find((p) => unlockedCount < p.threshold);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.headerTitle}>I Miei Traguardi</Text>
        <Text style={styles.headerSubtitle}>
          {unlockedCount}/50 traguardi conquistati
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Level Card */}
        <Card variant="elevated" style={styles.levelCard}>
          <View style={styles.levelRow}>
            <View style={styles.progressRingContainer}>
              <View style={styles.progressRingBg}>
                <View
                  style={[
                    styles.progressRingFill,
                    {
                      borderColor: colors.accent,
                      borderWidth: 4,
                      borderTopColor: progressPercent >= 0.25 ? colors.accent : colors.border,
                      borderRightColor: progressPercent >= 0.5 ? colors.accent : colors.border,
                      borderBottomColor: progressPercent >= 0.75 ? colors.accent : colors.border,
                      borderLeftColor: progressPercent >= 1 ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text style={styles.levelNumber}>{gamification.level}</Text>
                </View>
              </View>
            </View>

            <View style={styles.levelInfo}>
              <Text style={styles.levelLabel}>Livello {gamification.level}</Text>
              <Text style={styles.xpText}>
                {gamification.xp} XP totali
              </Text>
              <View style={styles.xpBarContainer}>
                <View style={styles.xpBarBg}>
                  <View
                    style={[
                      styles.xpBarFill,
                      { width: `${Math.round(progressPercent * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.xpProgress}>
                  {xpInLevel}/{xpNeeded} XP
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Streak Section */}
        <Card variant="elevated" style={styles.streakCard}>
          <View style={styles.streakRow}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <View style={styles.streakInfo}>
              <Text style={styles.streakNumber}>{gamification.currentStreak}</Text>
              <Text style={styles.streakLabel}>giorni consecutivi</Text>
            </View>
          </View>
          <View style={styles.streakBestRow}>
            <Text style={styles.streakBestLabel}>Record personale:</Text>
            <Text style={styles.streakBestValue}>
              {gamification.longestStreak} giorni
            </Text>
          </View>
        </Card>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard
            title="Allenamenti"
            value={gamification.totalWorkouts}
            subtitle="completati"
            color={colors.accent}
          />
          <View style={styles.statSpacer} />
          <StatCard
            title="Note Diario"
            value={gamification.totalDiaryEntries}
            subtitle="scritte"
            color={colors.info}
          />
        </View>

        {/* Next Prize Card */}
        {nextPrize && (
          <>
            <Text style={styles.sectionTitle}>Prossimo Premio</Text>
            <Card variant="elevated" style={styles.prizeCard}>
              <View style={styles.prizeRow}>
                <View style={[styles.prizeIconContainer, { backgroundColor: nextPrize.color + '20' }]}>
                  <Text style={styles.prizeIcon}>{nextPrize.icon}</Text>
                </View>
                <View style={styles.prizeInfo}>
                  <Text style={styles.prizeTitle}>{nextPrize.title}</Text>
                  <Text style={styles.prizeDesc}>{nextPrize.description}</Text>
                  <View style={styles.prizeProgressRow}>
                    <View style={styles.prizeBarBg}>
                      <View
                        style={[
                          styles.prizeBarFill,
                          {
                            width: `${Math.round((unlockedCount / nextPrize.threshold) * 100)}%`,
                            backgroundColor: nextPrize.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.prizeProgressText, { color: nextPrize.color }]}>
                      {unlockedCount}/{nextPrize.threshold}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          </>
        )}

        {/* Prize Milestones */}
        <Text style={styles.sectionTitle}>Premi Mind Movement Lab</Text>
        <Text style={styles.sectionSubtitle}>
          Sblocca un premio ogni 10 traguardi
        </Text>

        {PRIZE_MILESTONES.map((prize) => {
          const isUnlocked = unlockedCount >= prize.threshold;
          return (
            <View
              key={prize.threshold}
              style={[
                styles.milestoneCard,
                isUnlocked ? { borderColor: prize.color, borderWidth: 1.5 } : {},
              ]}
            >
              <View style={styles.milestoneRow}>
                <View
                  style={[
                    styles.milestoneIconBox,
                    {
                      backgroundColor: isUnlocked ? prize.color + '20' : colors.surfaceLight,
                    },
                  ]}
                >
                  <Text style={styles.milestoneIcon}>
                    {isUnlocked ? prize.icon : '🔒'}
                  </Text>
                </View>
                <View style={styles.milestoneInfo}>
                  <View style={styles.milestoneHeaderRow}>
                    <Text
                      style={[
                        styles.milestoneName,
                        !isUnlocked && { color: colors.textLight },
                      ]}
                    >
                      {prize.title}
                    </Text>
                    <View
                      style={[
                        styles.milestoneBadge,
                        { backgroundColor: isUnlocked ? prize.color : colors.border },
                      ]}
                    >
                      <Text style={styles.milestoneBadgeText}>
                        {prize.threshold}/50
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.milestoneDesc,
                      !isUnlocked && { color: colors.textLight },
                    ]}
                  >
                    {prize.description}
                  </Text>
                  {isUnlocked && (
                    <Text style={[styles.milestoneStatus, { color: prize.color }]}>
                      ✓ Premio sbloccato! Chiedi al tuo coach
                    </Text>
                  )}
                </View>
              </View>
            </View>
          );
        })}

        {/* Badges Section */}
        <Text style={styles.sectionTitle}>Traguardi</Text>
        <Text style={styles.sectionSubtitle}>
          {unlockedCount}/{badgeIds.length} sbloccati
        </Text>

        <View style={styles.badgesGrid}>
          {sortedBadges.map((badgeId) => {
            const def = allBadges[badgeId];
            const isUnlocked = unlockedIds.has(badgeId);
            const unlockedBadge = gamification.badges.find((b) => b.id === badgeId);

            return (
              <View
                key={badgeId}
                style={[
                  styles.badgeItem,
                  !isUnlocked && styles.badgeLocked,
                ]}
              >
                <View
                  style={[
                    styles.badgeIconContainer,
                    isUnlocked
                      ? styles.badgeIconUnlocked
                      : styles.badgeIconLockedBg,
                  ]}
                >
                  <Text style={styles.badgeIcon}>
                    {isUnlocked ? def.icon : '🔒'}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.badgeName,
                    !isUnlocked && styles.badgeNameLocked,
                  ]}
                  numberOfLines={1}
                >
                  {def.name}
                </Text>
                <Text
                  style={[
                    styles.badgeDescription,
                    !isUnlocked && styles.badgeDescriptionLocked,
                  ]}
                  numberOfLines={2}
                >
                  {def.description}
                </Text>
                {isUnlocked && unlockedBadge?.unlockedAt && (
                  <Text style={styles.badgeDate}>
                    {new Date(unlockedBadge.unlockedAt).toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
};

const BADGE_ITEM_GAP = spacing.sm;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
  },

  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  headerSubtitle: {
    fontSize: fontSize.md,
    color: colors.textLight,
    marginTop: spacing.xs,
  },

  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },

  levelCard: {
    marginBottom: spacing.xs,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  progressRingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingFill: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumber: {
    fontSize: fontSize.hero,
    fontWeight: '800',
    color: colors.accent,
  },
  levelInfo: {
    flex: 1,
  },
  levelLabel: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  xpText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  xpBarContainer: {
    marginTop: spacing.sm,
  },
  xpBarBg: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  xpProgress: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: 4,
    textAlign: 'right',
  },

  streakCard: {
    marginBottom: spacing.xs,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  streakEmoji: {
    fontSize: 40,
  },
  streakInfo: {
    flex: 1,
  },
  streakNumber: {
    fontSize: fontSize.hero,
    fontWeight: '800',
    color: colors.text,
  },
  streakLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: -2,
  },
  streakBestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  streakBestLabel: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  streakBestValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  statsRow: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
  },
  statSpacer: {
    width: spacing.sm,
  },

  sectionTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },

  // Prize cards
  prizeCard: {
    marginBottom: spacing.xs,
  },
  prizeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  prizeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prizeIcon: {
    fontSize: 28,
  },
  prizeInfo: {
    flex: 1,
  },
  prizeTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  prizeDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  prizeProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  prizeBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  prizeBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  prizeProgressText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },

  // Milestone cards
  milestoneCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    ...shadows.small,
  },
  milestoneRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  milestoneIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneIcon: {
    fontSize: 24,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  milestoneName: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  milestoneBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
  },
  milestoneBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  milestoneDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  milestoneStatus: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    marginTop: 6,
  },

  // Badges grid (3 columns)
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BADGE_ITEM_GAP,
  },
  badgeItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
    ...shadows.small,
    flexBasis: '31.5%',
    flexGrow: 0,
  },
  badgeLocked: {
    opacity: 0.5,
  },
  badgeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  badgeIconUnlocked: {
    backgroundColor: colors.accent + '20',
  },
  badgeIconLockedBg: {
    backgroundColor: colors.surfaceLight,
  },
  badgeIcon: {
    fontSize: 24,
  },
  badgeName: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  badgeNameLocked: {
    color: colors.textLight,
  },
  badgeDescription: {
    fontSize: fontSize.xs - 1,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  badgeDescriptionLocked: {
    color: colors.textLight,
  },
  badgeDate: {
    fontSize: fontSize.xs - 1,
    color: colors.accent,
    marginTop: 4,
    fontWeight: '600',
  },
});
