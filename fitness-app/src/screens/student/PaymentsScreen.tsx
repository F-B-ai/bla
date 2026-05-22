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
        const d = (student.startDate as any)?.toDate?.() || new Date(student.startDate as any);
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>I Miei Pagamenti</Text>
      </View>

      {/* Il Mio Percorso */}
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
      </View>

      {/* Riepilogo pagamenti */}
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

      {/* Reminder motivazionali */}
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
                      : `${plan.installments.length} rate`
                  }
                />
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
  bottomSpacer: {
    height: spacing.xxl,
  },
});
