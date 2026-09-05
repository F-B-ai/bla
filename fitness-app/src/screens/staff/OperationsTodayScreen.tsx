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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { getAllTodayChecks, WellnessCheck } from '../../services/wellnessService';
import { getTodayCheckins, CheckinRecord } from '../../services/checkinService';
import { getAllSessions, getCollaboratorSessions } from '../../services/sessionService';
import { getStudents } from '../../services/authService';
import { getAllPaymentPlans } from '../../services/paymentService';
import { getTransactions } from '../../services/financialService';
import { isStudentAssignedTo } from '../../utils/helpers';
import { daysUntilDue, isInstallmentOverdue } from '../../domain/formulas';
import { TrainingSession, Student } from '../../types';
import {
  BrainRow,
  BrainStatus,
  getBrainQueue,
  getBrainStatus,
  markAttentionHandled,
} from '../../services/brainService';

// ============================================================
// OGGI IN PALESTRA — dashboard operativa staff (M2, doc 04 §3.1)
// Non un elenco di dati ma una coda di decisioni: chi va
// attenzionato ORA, chi c'è in palestra, cosa succede oggi.
// ============================================================

interface AttentionItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  detail: string;
  target: { tab: string; screen?: string };
}

const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export const OperationsTodayScreen: React.FC = () => {
  const { user, isOwner, isManager } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const canSeeMoney = isOwner || isManager;

  const [refreshing, setRefreshing] = useState(false);
  const [attention, setAttention] = useState<AttentionItem[]>([]);
  const [checkins, setCheckins] = useState<CheckinRecord[]>([]);
  const [todaySessions, setTodaySessions] = useState<TrainingSession[]>([]);
  const [todayIncome, setTodayIncome] = useState<number | null>(null);
  const [checkinsToday, setCheckinsToday] = useState(0);
  // Brain (Tappa 2): coda del mattino
  const [brainRows, setBrainRows] = useState<BrainRow[]>([]);
  const [brainStatus, setBrainStatus] = useState<BrainStatus | null>(null);
  const [brainExpanded, setBrainExpanded] = useState<string | null>(null);
  const [copiedPid, setCopiedPid] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const today = new Date();

    // Brain: coda del mattino (non blocca il resto della dashboard)
    getBrainQueue().then(setBrainRows).catch(() => setBrainRows([]));
    getBrainStatus().then(setBrainStatus).catch(() => {});

    const [checksR, checkinsR, sessionsR, studentsR, plansR, txR] = await Promise.allSettled([
      getAllTodayChecks(),
      getTodayCheckins(),
      canSeeMoney ? getAllSessions() : getCollaboratorSessions(user.id),
      getStudents(),
      canSeeMoney ? getAllPaymentPlans() : Promise.resolve([]),
      canSeeMoney ? getTransactions({ startDate: new Date(today.toDateString()) }) : Promise.resolve([]),
    ]);

    const students: Student[] = studentsR.status === 'fulfilled' ? studentsR.value : [];
    const myStudentIds = new Set(
      canSeeMoney
        ? students.map((s) => s.id)
        : students.filter((s) => isStudentAssignedTo(s, user.id)).map((s) => s.id)
    );
    const nameOf = (id: string) => {
      const s = students.find((x) => x.id === id);
      return s ? `${s.name} ${s.surname || ''}`.trim() : 'Allievo';
    };

    // --- Coda "da attenzionare" ---
    const items: AttentionItem[] = [];

    // 1. Prontezza bassa oggi (readiness < 40): il coach deve saperlo PRIMA della seduta
    if (checksR.status === 'fulfilled') {
      for (const c of checksR.value as WellnessCheck[]) {
        if (c.score < 40 && myStudentIds.has(c.studentId)) {
          items.push({
            key: `wellness_${c.studentId}`,
            icon: 'pulse',
            color: colors.error,
            title: `${c.studentName || nameOf(c.studentId)} · prontezza ${c.score}`,
            detail: 'Giornata no: valuta carico ridotto o recupero. Scrivigli in Chat.',
            target: { tab: 'Chat' },
          });
        }
      }
    }

    // 2. Rate scadute (solo owner/manager)
    if (canSeeMoney && plansR.status === 'fulfilled') {
      for (const p of plansR.value as any[]) {
        for (const inst of p.installments || []) {
          if (!inst.dueDate) continue;
          const due = inst.dueDate?.toDate ? inst.dueDate.toDate() : new Date(inst.dueDate);
          if (isInstallmentOverdue(due, !!inst.isPaid)) {
            const days = -daysUntilDue(due);
            items.push({
              key: `pay_${p.id}_${inst.number || due.getTime()}`,
              icon: 'card',
              color: colors.warning,
              title: `${p.studentName || nameOf(p.studentId)} · rata €${inst.amount || 0}`,
              detail: `Scaduta da ${days} ${days === 1 ? 'giorno' : 'giorni'}`,
              target: isOwner ? { tab: 'Studio', screen: 'Pagamenti' } : { tab: 'Allievi' },
            });
          }
        }
      }
    }

    // Ordina: prontezza prima, poi rate più vecchie
    setAttention(items.slice(0, 12));

    // --- Accessi oggi ---
    if (checkinsR.status === 'fulfilled') {
      setCheckins(checkinsR.value.slice(0, 5));
      setCheckinsToday(checkinsR.value.length);
    }

    // --- Appuntamenti di oggi ---
    if (sessionsR.status === 'fulfilled') {
      const list = (sessionsR.value as TrainingSession[])
        .filter((s) => s.status === 'scheduled' && isSameDay(new Date(s.date), today))
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      setTodaySessions(list);
    }

    // --- Incassi di oggi (owner/manager) ---
    if (canSeeMoney && txR.status === 'fulfilled') {
      const income = (txR.value as any[])
        .filter((t) => t.type === 'income' && isSameDay(t.date?.toDate ? t.date.toDate() : new Date(t.date), today))
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      setTodayIncome(income);
    }
  }, [user, canSeeMoney]);

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
  const dayLabel = today.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + spacing.sm, spacing.xxl) }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerDay}>{dayLabel}</Text>
          <Text style={styles.headerTitle}>Oggi in palestra</Text>
        </View>
        {(isOwner || isManager) && (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('QRAccesso')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="qr-code-outline" size={24} color={colors.textOnPrimary} />
          </TouchableOpacity>
        )}
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
        {/* Numeri del giorno */}
        <View style={styles.statsRow}>
          <View style={[styles.card, styles.statCard]}>
            <Text style={styles.statValue}>{checkinsToday}</Text>
            <Text style={styles.statLabel}>accessi oggi</Text>
          </View>
          <TouchableOpacity
            style={[styles.card, styles.statCard]}
            onPress={() => navigation.navigate('Agenda')}
            activeOpacity={0.85}
          >
            <Text style={styles.statValue}>{todaySessions.length}</Text>
            <Text style={styles.statLabel}>appuntamenti</Text>
          </TouchableOpacity>
          {canSeeMoney && todayIncome !== null && (
            <TouchableOpacity
              style={[styles.card, styles.statCard]}
              onPress={() => navigation.navigate('Studio', { screen: isOwner ? 'Finanza' : 'Guadagni' })}
              activeOpacity={0.85}
            >
              <Text style={styles.statValue}>€{todayIncome}</Text>
              <Text style={styles.statLabel}>incassi oggi</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 🧠 Brain — la coda del mattino (pattern, non solo l'oggi) */}
        {brainRows.length > 0 && (
          <>
            <View style={styles.brainHeader}>
              <Text style={styles.sectionTitle}>🧠 Coda del mattino</Text>
              {brainStatus?.lastRun && (
                <Text style={styles.brainMeta}>
                  calcolata {brainStatus.lastRun.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} · {brainRows.length} da gestire
                </Text>
              )}
            </View>
            {brainRows.slice(0, 8).map((row) => {
              const sevColor =
                row.severity === 'rosso' ? colors.error :
                row.severity === 'giallo' ? colors.warning : colors.success;
              const open = brainExpanded === row.personId;
              return (
                <View key={row.personId} style={[styles.card, styles.brainCard, { borderLeftColor: sevColor }]}>
                  <TouchableOpacity
                    onPress={() => setBrainExpanded(open ? null : row.personId)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.brainRowTop}>
                      <Text style={styles.brainName}>{row.name}</Text>
                      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
                    </View>
                    <Text style={styles.brainReasons}>
                      {row.attention.map((a) => a.reason).join(' · ')}
                    </Text>
                  </TouchableOpacity>
                  {open && (
                    <View style={styles.brainDetail}>
                      {row.proposal ? (
                        <>
                          <Text style={styles.brainWhy}>
                            💡 {row.proposal.why}
                          </Text>
                          {row.proposal.draft && (
                            <View style={styles.brainDraft}>
                              <Text style={styles.brainDraftText}>{row.proposal.draft}</Text>
                            </View>
                          )}
                          <View style={styles.brainActions}>
                            {row.proposal.draft && (
                              <TouchableOpacity
                                style={styles.brainBtn}
                                onPress={() => {
                                  try {
                                    (globalThis as any).navigator?.clipboard?.writeText(row.proposal!.draft!);
                                    setCopiedPid(row.personId);
                                    setTimeout(() => setCopiedPid(null), 2000);
                                  } catch { /* clipboard non disponibile */ }
                                }}
                              >
                                <Ionicons name="copy-outline" size={15} color={colors.accent} />
                                <Text style={styles.brainBtnText}>
                                  {copiedPid === row.personId ? 'Copiato ✓' : 'Copia bozza'}
                                </Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              style={styles.brainBtn}
                              onPress={async () => {
                                setBrainRows((prev) => prev.filter((r) => r.personId !== row.personId));
                                await markAttentionHandled(row, row.proposal?.draft ? 'inviato' : 'chiamato');
                              }}
                            >
                              <Ionicons name="checkmark-circle-outline" size={15} color={colors.success} />
                              <Text style={[styles.brainBtnText, { color: colors.success }]}>Gestito</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.brainBtn}
                              onPress={async () => {
                                setBrainRows((prev) => prev.filter((r) => r.personId !== row.personId));
                                await markAttentionHandled(row, 'ignorato');
                              }}
                            >
                              <Ionicons name="close-circle-outline" size={15} color={colors.textSecondary} />
                              <Text style={[styles.brainBtnText, { color: colors.textSecondary }]}>Ignora</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      ) : (
                        <View style={styles.brainActions}>
                          <TouchableOpacity
                            style={styles.brainBtn}
                            onPress={async () => {
                              setBrainRows((prev) => prev.filter((r) => r.personId !== row.personId));
                              await markAttentionHandled(row, 'chiamato');
                            }}
                          >
                            <Ionicons name="checkmark-circle-outline" size={15} color={colors.success} />
                            <Text style={[styles.brainBtnText, { color: colors.success }]}>Gestito</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.brainBtn}
                            onPress={async () => {
                              setBrainRows((prev) => prev.filter((r) => r.personId !== row.personId));
                              await markAttentionHandled(row, 'ignorato');
                            }}
                          >
                            <Ionicons name="close-circle-outline" size={15} color={colors.textSecondary} />
                            <Text style={[styles.brainBtnText, { color: colors.textSecondary }]}>Ignora</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* Da attenzionare — la coda di decisioni */}
        <Text style={styles.sectionTitle}>Da attenzionare</Text>
        {attention.length === 0 ? (
          <View style={[styles.card, styles.emptyCard]}>
            <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
            <Text style={styles.emptyText}>Tutto sotto controllo: nessuna segnalazione oggi</Text>
          </View>
        ) : (
          attention.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.card, styles.attentionCard, { borderLeftColor: item.color }]}
              onPress={() =>
                item.target.screen
                  ? navigation.navigate(item.target.tab, { screen: item.target.screen })
                  : navigation.navigate(item.target.tab)
              }
              activeOpacity={0.85}
            >
              <Ionicons name={item.icon} size={20} color={item.color} />
              <View style={{ flex: 1 }}>
                <Text style={styles.attentionTitle}>{item.title}</Text>
                <Text style={styles.attentionDetail}>{item.detail}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ))
        )}

        {/* Appuntamenti di oggi */}
        {todaySessions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Appuntamenti di oggi</Text>
            <View style={styles.card}>
              {todaySessions.slice(0, 6).map((s) => (
                <View key={s.id} style={styles.sessionRow}>
                  <Text style={styles.sessionTime}>{s.startTime}</Text>
                  <Text style={styles.sessionName} numberOfLines={1}>
                    {(s as any).studentName || 'Allievo'}
                  </Text>
                </View>
              ))}
              {todaySessions.length > 6 && (
                <TouchableOpacity onPress={() => navigation.navigate('Agenda')}>
                  <Text style={styles.moreLink}>Vedi tutti ({todaySessions.length}) →</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* Ultimi accessi */}
        {checkins.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Ultimi accessi</Text>
            <View style={styles.card}>
              {checkins.map((c) => (
                <View key={c.id} style={styles.sessionRow}>
                  <Text style={styles.sessionTime}>
                    {new Date(c.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.sessionName} numberOfLines={1}>{c.studentName}</Text>
                </View>
              ))}
            </View>
          </>
        )}
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
    backgroundColor: colors.glass,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { flex: 1 },
  bodyContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  brainHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  brainMeta: { color: colors.textSecondary, fontSize: fontSize.xs },
  brainCard: { borderLeftWidth: 3, paddingVertical: spacing.sm },
  brainRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brainName: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  brainReasons: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 },
  brainDetail: { marginTop: spacing.sm, gap: spacing.sm },
  brainWhy: { color: colors.text, fontSize: fontSize.sm, lineHeight: 19 },
  brainDraft: {
    backgroundColor: colors.background, borderRadius: borderRadius.md,
    padding: spacing.sm, borderLeftWidth: 2, borderLeftColor: colors.accent,
  },
  brainDraftText: { color: colors.text, fontSize: fontSize.sm, fontStyle: 'italic', lineHeight: 19 },
  brainActions: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  brainBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md, backgroundColor: colors.background,
  },
  brainBtnText: { color: colors.accent, fontSize: fontSize.sm, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.md, ...shadows.small,
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  statValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: {
    fontSize: fontSize.md, fontWeight: '700', color: colors.text,
    marginBottom: spacing.sm, marginTop: spacing.xs,
  },
  emptyCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  emptyText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary },
  attentionCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderLeftWidth: 4,
  },
  attentionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  attentionDetail: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 1 },
  sessionRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  sessionTime: { width: 52, fontSize: fontSize.sm, fontWeight: '700', color: colors.accent },
  sessionName: { flex: 1, fontSize: fontSize.sm, color: colors.text },
  moreLink: { fontSize: fontSize.sm, color: colors.accent, fontWeight: '600', marginTop: spacing.xs },
});
