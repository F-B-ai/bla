import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { PaymentPlan, Installment, AppNotification, Student, WorkoutPlan, WorkoutLog } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { getStudentPaymentPlans } from '../../services/paymentService';
import { generatePaymentReminders, sendPaymentReminder } from '../../services/paymentReminderService';
import { getActiveWorkoutPlan } from '../../services/programService';
import { getStudentWorkoutLogs } from '../../services/workoutLogService';

/** Safely convert a Firestore Timestamp (or ISO string) to a JS Date. */
const toDate = (d: any): Date => d?.toDate?.() || new Date(d as any);

/** Format a Date in Italian long format, e.g. "15 marzo 2026". */
const formatDateIT = (d: Date): string =>
  d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

/** Remaining calendar days from today to `end`. Returns 0 if already past. */
const daysUntil = (end: Date): number => {
  const diff = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
};

export const PaymentsScreen: React.FC = () => {
  const { user } = useAuth();
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [reminders, setReminders] = useState<AppNotification[]>([]);
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const [completedWorkouts, setCompletedWorkouts] = useState(0);
  const [daysSinceStart, setDaysSinceStart] = useState(0);

  const student = user as unknown as Student;

  const loadPayments = useCallback(async () => {
    if (!user) return;
    try {
      const [plans, workoutPlan, workoutLogs] = await Promise.all([
        getStudentPaymentPlans(user.id),
        getActiveWorkoutPlan(user.id),
        getStudentWorkoutLogs(user.id),
      ]);
      setPaymentPlans(plans);
      setActivePlan(workoutPlan);
      setCompletedWorkouts(workoutLogs.filter((l) => l.status === 'completed').length);

      // Calcola giorni dall'inizio
      if (student.startDate) {
        const d = toDate(student.startDate);
        const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
        setDaysSinceStart(days >= 0 ? days : 0);
      }

      // Genera e invia reminder automatici
      const generatedReminders = await generatePaymentReminders(
        user.id,
        user.name,
        plans
      );
      setReminders(generatedReminders);

      // Invia i reminder a Firestore (evita duplicati)
      for (const reminder of generatedReminders) {
        const { id, ...reminderData } = reminder;
        await sendPaymentReminder(reminderData);
      }
    } catch {
      // Silently handle
    }
  }, [user]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const getNextDueInstallment = (
    plan: PaymentPlan
  ): Installment | undefined => {
    return plan.installments.find((i) => i.status !== 'paid');
  };

  const getPaidCount = (plan: PaymentPlan): number => {
    return plan.installments.filter((i) => i.status === 'paid').length;
  };

  // Calcoli riepilogo pagamenti
  const totalPaid = paymentPlans.reduce(
    (sum, plan) =>
      sum +
      plan.installments
        .filter((i) => i.status === 'paid')
        .reduce((s, i) => s + i.amount, 0),
    0
  );
  const totalRemaining = paymentPlans.reduce(
    (sum, plan) =>
      sum +
      plan.installments
        .filter((i) => i.status !== 'paid')
        .reduce((s, i) => s + i.amount, 0),
    0
  );
  const nextDueDate = paymentPlans
    .flatMap((p) => p.installments)
    .filter((i) => i.status !== 'paid')
    .map((i) => new Date(i.dueDate as unknown as string))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  // Piani corsi mensili
  const coursePlans = paymentPlans.filter((p) => p.paymentType === 'monthly_course');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>I Miei Pagamenti</Text>
      </View>

      {/* ===================== Il Mio Percorso ===================== */}
      <View style={styles.journeySection}>
        <Text style={styles.sectionTitle}>Il Mio Percorso</Text>
        <View style={styles.statsRow}>
          <StatCard
            title="Giorni dall'inizio"
            value={daysSinceStart}
            subtitle="del tuo percorso"
            color={colors.info}
          />
          <StatCard
            title="Allenamenti completati"
            value={completedWorkouts}
            subtitle="totali"
            color={colors.success}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            title="Scheda attiva"
            value={activePlan ? activePlan.title : 'Nessuna'}
            subtitle={activePlan ? 'Piano corrente' : 'Non assegnata'}
            color={colors.accent}
          />
          <StatCard
            title="Consulenze nutrizionali"
            value={student?.nutritionalConsultations || 0}
            subtitle="effettuate"
            color={colors.warning}
          />
        </View>

        {/* Per-plan progress: lezioni, consulenze, periodo */}
        {paymentPlans.map((plan) => {
          const start = toDate(plan.startDate);
          const end = toDate(plan.endDate);
          const remaining = daysUntil(end);
          const lessonPct =
            plan.includedLessons > 0
              ? Math.min((plan.usedLessons / plan.includedLessons) * 100, 100)
              : 0;
          const consultPct =
            plan.includedConsultations > 0
              ? Math.min((plan.usedConsultations / plan.includedConsultations) * 100, 100)
              : 0;

          return (
            <Card key={`journey-${plan.id}`} style={styles.journeyPlanCard}>
              <Text style={styles.journeyPlanTitle}>
                Piano {plan.paymentType === 'monthly_course' ? (plan.courseType || 'Corso') : `€${plan.totalAmount.toLocaleString()}`}
              </Text>

              {/* Lezioni */}
              <View style={styles.progressSection}>
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabel}>Lezioni</Text>
                  <Text style={styles.progressCount}>
                    {plan.usedLessons}/{plan.includedLessons}
                  </Text>
                </View>
                <View style={styles.thinProgressBar}>
                  <View
                    style={[
                      styles.thinProgressFill,
                      { width: `${lessonPct}%`, backgroundColor: colors.accent },
                    ]}
                  />
                </View>
              </View>

              {/* Consulenze nutrizionali */}
              <View style={styles.progressSection}>
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabel}>Consulenze nutrizionali</Text>
                  <Text style={styles.progressCount}>
                    {plan.usedConsultations}/{plan.includedConsultations}
                  </Text>
                </View>
                <View style={styles.thinProgressBar}>
                  <View
                    style={[
                      styles.thinProgressFill,
                      { width: `${consultPct}%`, backgroundColor: colors.info },
                    ]}
                  />
                </View>
              </View>

              {/* Periodo */}
              <View style={styles.periodRow}>
                <Text style={styles.periodLabel}>Periodo</Text>
                <Text style={styles.periodValue}>
                  {formatDateIT(start)} - {formatDateIT(end)}
                </Text>
              </View>

              {/* Giorni rimanenti */}
              <View style={styles.remainingRow}>
                <Text style={styles.remainingLabel}>Giorni rimanenti</Text>
                <Text
                  style={[
                    styles.remainingValue,
                    remaining <= 7 && { color: colors.error },
                  ]}
                >
                  {remaining}
                </Text>
              </View>
            </Card>
          );
        })}
      </View>

      {/* ==================== I Miei Corsi ==================== */}
      {coursePlans.length > 0 && (
        <View style={styles.courseSection}>
          <Text style={styles.sectionTitle}>I Miei Corsi</Text>
          {coursePlans.map((plan) => {
            const start = toDate(plan.startDate);
            const end = toDate(plan.endDate);
            const currentInstallment = plan.installments.find(
              (i) => i.status !== 'paid'
            );
            const allPaid = plan.installments.every((i) => i.status === 'paid');

            return (
              <Card key={`course-${plan.id}`} style={styles.courseCard}>
                <View style={styles.courseHeader}>
                  <Text style={styles.courseType}>
                    {plan.courseType || 'Corso'}
                  </Text>
                  <Badge
                    status={allPaid ? 'paid' : 'pending'}
                    label={allPaid ? 'Pagato' : 'In corso'}
                  />
                </View>

                <View style={styles.courseDetailRow}>
                  <Text style={styles.courseDetailLabel}>Abbonamento</Text>
                  <Text style={styles.courseDetailValue}>
                    {plan.subscriptionType || 'Mensile'}
                  </Text>
                </View>

                <View style={styles.courseDetailRow}>
                  <Text style={styles.courseDetailLabel}>Inizio</Text>
                  <Text style={styles.courseDetailValue}>
                    {formatDateIT(start)}
                  </Text>
                </View>

                <View style={styles.courseDetailRow}>
                  <Text style={styles.courseDetailLabel}>Fine</Text>
                  <Text style={styles.courseDetailValue}>
                    {formatDateIT(end)}
                  </Text>
                </View>

                {currentInstallment && (
                  <View style={styles.coursePaymentStatus}>
                    <Text style={styles.coursePaymentLabel}>
                      Pagamento periodo corrente
                    </Text>
                    <View style={styles.coursePaymentInfo}>
                      <Text style={styles.coursePaymentAmount}>
                        €{currentInstallment.amount.toLocaleString()}
                      </Text>
                      <Badge status={currentInstallment.status} />
                    </View>
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      )}

      {/* ================ Riepilogo pagamenti ================ */}
      <View style={styles.paymentSummarySection}>
        <Text style={styles.sectionTitle}>Riepilogo Pagamenti</Text>
        <View style={styles.statsRow}>
          <StatCard
            title="Totale pagato"
            value={`€${totalPaid.toLocaleString()}`}
            color={colors.success}
          />
          <StatCard
            title="Rimanente"
            value={`€${totalRemaining.toLocaleString()}`}
            color={totalRemaining > 0 ? colors.warning : colors.success}
          />
        </View>
        {nextDueDate && (
          <Card style={styles.nextDueSummaryCard}>
            <Text style={styles.nextDueSummaryLabel}>Prossima scadenza</Text>
            <Text style={styles.nextDueSummaryDate}>
              {nextDueDate.toLocaleDateString('it-IT', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </Card>
        )}
      </View>

      {/* ============ Reminder motivazionali ============ */}
      {reminders.length > 0 && (
        <View style={styles.remindersContainer}>
          {reminders.map((reminder, idx) => (
            <Card key={idx} variant="elevated" style={styles.reminderCard}>
              <Text style={styles.reminderTitle}>{reminder.title}</Text>
              <Text style={styles.reminderBody}>{reminder.body}</Text>
            </Card>
          ))}
        </View>
      )}

      {/* ================ Piano di pagamento cards ================ */}
      {paymentPlans.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Nessun piano di pagamento attivo
          </Text>
        </Card>
      ) : (
        paymentPlans.map((plan) => {
          const nextDue = getNextDueInstallment(plan);
          const paidCount = getPaidCount(plan);
          const start = toDate(plan.startDate);
          const end = toDate(plan.endDate);

          return (
            <Card key={plan.id} variant="elevated" style={styles.planCard}>
              {/* Riepilogo piano */}
              <View style={styles.planHeader}>
                <Text style={styles.planAmount}>
                  €{plan.totalAmount.toLocaleString()}
                </Text>
                <Badge
                  status={
                    plan.paymentType === 'full' ? 'scheduled' : 'pending'
                  }
                  label={
                    plan.paymentType === 'full'
                      ? 'Pagamento unico'
                      : plan.paymentType === 'monthly_course'
                      ? 'Corso mensile'
                      : `${plan.installments.length} rate`
                  }
                />
              </View>

              {/* Date piano */}
              <View style={styles.planDatesRow}>
                <View style={styles.planDateItem}>
                  <Text style={styles.planDateLabel}>Inizio</Text>
                  <Text style={styles.planDateValue}>{formatDateIT(start)}</Text>
                </View>
                <View style={styles.planDateItem}>
                  <Text style={styles.planDateLabel}>Fine</Text>
                  <Text style={styles.planDateValue}>{formatDateIT(end)}</Text>
                </View>
              </View>

              {/* Lezioni e consulenze nel piano card */}
              <View style={styles.planUsageRow}>
                <View style={styles.planUsageItem}>
                  <Text style={styles.planUsageLabel}>Lezioni</Text>
                  <Text style={styles.planUsageValue}>
                    {plan.usedLessons}/{plan.includedLessons}
                  </Text>
                </View>
                <View style={styles.planUsageItem}>
                  <Text style={styles.planUsageLabel}>Consulenze</Text>
                  <Text style={styles.planUsageValue}>
                    {plan.usedConsultations}/{plan.includedConsultations}
                  </Text>
                </View>
              </View>

              {/* Progresso pagamento */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${
                          (paidCount / plan.installments.length) * 100
                        }%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {paidCount}/{plan.installments.length} rate pagate
                </Text>
              </View>

              {/* Prossima scadenza */}
              {nextDue && (
                <View style={styles.nextDueContainer}>
                  <Text style={styles.nextDueLabel}>Prossima rata:</Text>
                  <View style={styles.nextDueInfo}>
                    <Text style={styles.nextDueAmount}>
                      €{nextDue.amount.toLocaleString()}
                    </Text>
                    <Text style={styles.nextDueDate}>
                      Scadenza:{' '}
                      {new Date(
                        nextDue.dueDate as unknown as string
                      ).toLocaleDateString('it-IT')}
                    </Text>
                  </View>
                </View>
              )}

              {/* Lista rate */}
              <View style={styles.installmentsList}>
                {plan.installments.map((inst, index) => (
                  <View key={inst.id} style={styles.installmentItem}>
                    <View style={styles.installmentLeft}>
                      <Text style={styles.installmentNumber}>
                        Rata {index + 1}
                      </Text>
                      <Text style={styles.installmentDue}>
                        {new Date(
                          inst.dueDate as unknown as string
                        ).toLocaleDateString('it-IT')}
                      </Text>
                    </View>
                    <View style={styles.installmentRight}>
                      <Text style={styles.installmentAmount}>
                        €{inst.amount}
                      </Text>
                      <Badge status={inst.status} />
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          );
        })
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  emptyCard: {
    margin: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.lg,
  },

  /* ---- Il Mio Percorso ---- */
  journeySection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  journeyPlanCard: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  journeyPlanTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  progressSection: {
    marginBottom: spacing.md,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  progressCount: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  thinProgressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  thinProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  periodLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  periodValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  remainingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  remainingLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  remainingValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.success,
  },

  /* ---- I Miei Corsi ---- */
  courseSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  courseCard: {
    marginBottom: spacing.sm,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  courseType: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.accent,
  },
  courseDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  courseDetailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  courseDetailValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  coursePaymentStatus: {
    marginTop: spacing.sm,
    backgroundColor: colors.warning + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  coursePaymentLabel: {
    fontSize: fontSize.sm,
    color: colors.warning,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  coursePaymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coursePaymentAmount: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },

  /* ---- Riepilogo pagamenti ---- */
  paymentSummarySection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  nextDueSummaryCard: {
    marginTop: spacing.xs,
    backgroundColor: colors.warning + '15',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  nextDueSummaryLabel: {
    fontSize: fontSize.sm,
    color: colors.warning,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  nextDueSummaryDate: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'capitalize',
  },

  /* ---- Reminder ---- */
  remindersContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  reminderCard: {
    marginBottom: spacing.sm,
    backgroundColor: colors.warning + '15',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  reminderTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.warning,
    marginBottom: spacing.xs,
  },
  reminderBody: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },

  /* ---- Plan cards ---- */
  planCard: {
    margin: spacing.md,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  planAmount: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  planDatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  planDateItem: {},
  planDateLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  planDateValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  planUsageRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  planUsageItem: {
    alignItems: 'center',
  },
  planUsageLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  planUsageValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 4,
  },
  progressText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  nextDueContainer: {
    backgroundColor: colors.warning + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  nextDueLabel: {
    fontSize: fontSize.sm,
    color: colors.warning,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  nextDueInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextDueAmount: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  nextDueDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  installmentsList: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  installmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  installmentLeft: {},
  installmentNumber: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  installmentDue: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  installmentRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  installmentAmount: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
});
