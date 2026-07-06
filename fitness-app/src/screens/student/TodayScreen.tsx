import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { getTodayCheck, WellnessCheck } from '../../services/wellnessService';
import { adviceForScore } from '../../domain/formulas';
import { getActiveWorkoutPlan } from '../../services/programService';
import { getStudentSessions } from '../../services/sessionService';
import { getStudentGamification } from '../../services/gamificationService';
import { getStudentPaymentPlans } from '../../services/paymentService';
import { daysUntilDue } from '../../domain/formulas';
import { WorkoutPlan, TrainingSession } from '../../types';

// ============================================================
// OGGI — home allievo (M2, doc 04 §2.1)
// La risposta alla domanda quotidiana "cosa faccio oggi":
// Stato ESSĒRE, seduta del giorno, prossimo appuntamento,
// avvisi (rata in scadenza), QR palestra sempre a un tap.
// ============================================================

const dayName = (d: Date) =>
  ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'][d.getDay()];

export const TodayScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);
  const [todayCheck, setTodayCheck] = useState<WellnessCheck | null>(null);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [nextSession, setNextSession] = useState<TrainingSession | null>(null);
  const [streak, setStreak] = useState(0);
  const [badgeCount, setBadgeCount] = useState(0);
  const [dueSoon, setDueSoon] = useState<{ amount: number; days: number } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const results = await Promise.allSettled([
      getTodayCheck(user.id),
      getActiveWorkoutPlan(user.id),
      getStudentSessions(user.id),
      getStudentGamification(user.id),
      getStudentPaymentPlans(user.id),
    ]);
    if (results[0].status === 'fulfilled') setTodayCheck(results[0].value);
    if (results[1].status === 'fulfilled') setPlan(results[1].value);
    if (results[2].status === 'fulfilled') {
      const now = new Date();
      const upcoming = (results[2].value || [])
        .filter((s: TrainingSession) => s.status === 'scheduled' && new Date(s.date) >= new Date(now.toDateString()))
        .sort((a: TrainingSession, b: TrainingSession) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setNextSession(upcoming[0] || null);
    }
    if (results[3].status === 'fulfilled' && results[3].value) {
      setStreak(results[3].value.currentStreak || 0);
      setBadgeCount((results[3].value.badges || []).length);
    }
    if (results[4].status === 'fulfilled') {
      let best: { amount: number; days: number } | null = null;
      for (const p of results[4].value || []) {
        for (const inst of (p as any).installments || []) {
          if (inst.isPaid || !inst.dueDate) continue;
          const due = inst.dueDate?.toDate ? inst.dueDate.toDate() : new Date(inst.dueDate);
          const days = daysUntilDue(due);
          if (days <= 7 && (best === null || days < best.days)) {
            best = { amount: inst.amount || 0, days };
          }
        }
      }
      setDueSoon(best);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const today = new Date();
  const advice = todayCheck ? adviceForScore(todayCheck.score) : null;

  return (
    <View style={styles.container}>
      {/* Header: saluto + QR + campanella (doc 04: persistenti, 1 tap) */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerDay}>{dayName(today)} {today.getDate()}</Text>
          <Text style={styles.headerTitle}>Ciao {user?.name || ''} 👋</Text>
        </View>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.navigate('CheckinPalestra')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="qr-code-outline" size={24} color={colors.textOnPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.navigate('Notifiche')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.textOnPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Avviso rata in scadenza (proattivo, doc 04 §2.2) */}
        {dueSoon && (
          <TouchableOpacity
            style={styles.alertCard}
            onPress={() => navigation.navigate('Profilo', { screen: 'Pagamenti' })}
          >
            <Ionicons name="card-outline" size={20} color={colors.warning} />
            <Text style={styles.alertText}>
              {dueSoon.days < 0
                ? `Rata di €${dueSoon.amount} scaduta da ${-dueSoon.days} giorni`
                : dueSoon.days === 0
                  ? `Rata di €${dueSoon.amount} in scadenza oggi`
                  : `Rata di €${dueSoon.amount} tra ${dueSoon.days} giorni`}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Stato ESSĒRE — card in testa (1 tap) */}
        <TouchableOpacity
          style={[styles.card, styles.essereCard]}
          onPress={() => navigation.navigate('StatoEssere')}
          activeOpacity={0.85}
        >
          {todayCheck ? (
            <View style={styles.essereRow}>
              <View style={[styles.scoreRing, { borderColor:
                advice?.color === 'success' ? colors.success :
                advice?.color === 'warning' ? colors.warning : colors.error }]}
              >
                <Text style={styles.scoreText}>{todayCheck.score}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{advice?.title}</Text>
                <Text style={styles.cardSub} numberOfLines={2}>{advice?.detail}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.essereRow}>
              <View style={[styles.scoreRing, { borderColor: colors.accent }]}>
                <Ionicons name="pulse" size={26} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Come stai oggi?</Text>
                <Text style={styles.cardSub}>Fai il check-in Stato ESSĒRE: 30 secondi per il consiglio di allenamento di oggi</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          )}
        </TouchableOpacity>

        {/* Seduta del giorno */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Allenati')}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeaderRow}>
            <Ionicons name="barbell-outline" size={20} color={colors.accent} />
            <Text style={styles.cardLabel}>Il tuo allenamento</Text>
          </View>
          {plan ? (
            <>
              <Text style={styles.cardTitle}>{(plan as any).name || 'Scheda attiva'}</Text>
              <Text style={styles.cardSub}>Apri la scheda o inizia la seduta dal vivo</Text>
            </>
          ) : (
            <Text style={styles.cardSub}>Nessuna scheda attiva: parlane col tuo coach in Chat</Text>
          )}
        </TouchableOpacity>

        {/* Prossimo appuntamento */}
        {nextSession && (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Agenda')}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeaderRow}>
              <Ionicons name="calendar-outline" size={20} color={colors.accent} />
              <Text style={styles.cardLabel}>Prossimo appuntamento</Text>
            </View>
            <Text style={styles.cardTitle}>
              {dayName(new Date(nextSession.date))} {new Date(nextSession.date).getDate()} · {nextSession.startTime}
            </Text>
          </TouchableOpacity>
        )}

        {/* Streak + traguardi */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={[styles.card, styles.statCard]}
            onPress={() => navigation.navigate('Progressi', { screen: 'Traguardi' })}
            activeOpacity={0.85}
          >
            <Text style={styles.statValue}>🔥 {streak}</Text>
            <Text style={styles.statLabel}>giorni di fila</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.card, styles.statCard]}
            onPress={() => navigation.navigate('Progressi', { screen: 'Traguardi' })}
            activeOpacity={0.85}
          >
            <Text style={styles.statValue}>🏆 {badgeCount}/50</Text>
            <Text style={styles.statLabel}>traguardi</Text>
          </TouchableOpacity>
        </View>

        {/* Assistente */}
        <TouchableOpacity
          style={styles.assistantRow}
          onPress={() => navigation.navigate('Chat', { screen: 'Assistente' })}
          activeOpacity={0.85}
        >
          <Ionicons name="sparkles" size={18} color={colors.accent} />
          <Text style={styles.assistantText}>Domande su orari, prezzi o servizi? Chiedi all'Assistente</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerDay: { fontSize: fontSize.sm, color: colors.textLight, textTransform: 'capitalize' },
  headerTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textOnPrimary },
  headerBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  body: { flex: 1 },
  bodyContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  alertCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderLeftWidth: 4, borderLeftColor: colors.warning,
    padding: spacing.md, marginBottom: spacing.md, ...shadows.small,
  },
  alertText: { flex: 1, fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.md, ...shadows.small,
  },
  essereCard: { paddingVertical: spacing.lg },
  essereRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  scoreRing: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreText: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  cardLabel: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg },
  statValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  assistantRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.md, ...shadows.small,
  },
  assistantText: { flex: 1, fontSize: fontSize.sm, color: colors.text },
});
