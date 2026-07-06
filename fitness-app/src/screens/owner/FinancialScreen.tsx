import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { crossAlert } from '../../utils/alert';
import { printFinancialReport } from '../../utils/printUtils';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import {
  FinancialTransaction,
  TransactionType,
  TransactionCategory,
  PaymentPlan,
} from '../../types';
import { addTransaction, getTransactions, getFinancialSummary, deleteTransaction } from '../../services/financialService';
import { getAllPaymentPlans } from '../../services/paymentService';

const CATEGORIES: { value: TransactionCategory; label: string }[] = [
  { value: 'student_payment', label: 'Pagamento allievi' },
  { value: 'collaborator_payment', label: 'Pagamento collaboratori' },
  { value: 'rent', label: 'Affitto' },
  { value: 'equipment', label: 'Attrezzatura' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'insurance', label: 'Assicurazione' },
  { value: 'utilities', label: 'Utenze' },
  { value: 'other', label: 'Altro' },
];

const toSafeDate = (d: unknown): Date => {
  if (d instanceof Date) return d;
  if (d && typeof d === 'object' && 'toDate' in d && typeof (d as any).toDate === 'function')
    return (d as any).toDate();
  if (d && typeof d === 'object' && 'seconds' in d)
    return new Date((d as any).seconds * 1000);
  return new Date(d as string);
};

export const FinancialScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newType, setNewType] = useState<TransactionType>('income');
  const [newAmount, setNewAmount] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<TransactionCategory>('other');
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [txs, summary, plans] = await Promise.all([
        getTransactions(),
        getFinancialSummary(),
        getAllPaymentPlans(),
      ]);
      setTransactions(txs);
      setTotalIncome(summary.totalIncome);
      setTotalExpenses(summary.totalExpenses);
      setPaymentPlans(plans);
    } catch {
      // Silently handle
    }
  }, []);

  const planStats = useMemo(() => {
    let totalCollected = 0;
    let totalOutstanding = 0;
    let overdueCount = 0;
    let activePlans = 0;
    let totalLessons = 0;
    let usedLessons = 0;
    let totalConsultations = 0;
    let usedConsultations = 0;
    let activeCourses = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const plan of paymentPlans) {
      for (const inst of plan.installments) {
        if (inst.status === 'paid') {
          totalCollected += inst.amount;
        } else {
          totalOutstanding += inst.amount;
          if (inst.status === 'overdue') overdueCount++;
        }
      }

      const start = toSafeDate(plan.startDate);
      const end = toSafeDate(plan.endDate);
      const s = new Date(start); s.setHours(0, 0, 0, 0);
      const e = new Date(end); e.setHours(0, 0, 0, 0);
      if (s <= today && e >= today) {
        activePlans++;
        if (plan.paymentType === 'monthly_course') activeCourses++;
      }

      totalLessons += plan.includedLessons || 0;
      usedLessons += plan.usedLessons || 0;
      totalConsultations += plan.includedConsultations || 0;
      usedConsultations += plan.usedConsultations || 0;
    }

    return {
      totalCollected,
      totalOutstanding,
      overdueCount,
      activePlans,
      totalLessons,
      usedLessons,
      remainingLessons: totalLessons - usedLessons,
      totalConsultations,
      usedConsultations,
      remainingConsultations: totalConsultations - usedConsultations,
      activeCourses,
    };
  }, [paymentPlans]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddTransaction = async () => {
    if (!newAmount || !newDescription) {
      crossAlert('Errore', 'Compila tutti i campi');
      return;
    }

    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) {
      crossAlert('Errore', 'Importo non valido');
      return;
    }

    try {
      await addTransaction({
        type: newType,
        category: newCategory,
        amount,
        description: newDescription,
        date: new Date(),
      });

      setShowAddModal(false);
      setNewAmount('');
      setNewDescription('');
      await loadData();
      crossAlert('Successo', 'Transazione aggiunta');
    } catch {
      crossAlert('Errore', 'Impossibile salvare la transazione');
    }
  };

  const handleDeleteTransaction = (txId: string, description: string) => {
    crossAlert(
      'Elimina Transazione',
      `Eliminare "${description}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction(txId);
              await loadData();
            } catch {
              crossAlert('Errore', 'Impossibile eliminare la transazione');
            }
          },
        },
      ]
    );
  };

  const [printStartDate, setPrintStartDate] = useState('');
  const [printEndDate, setPrintEndDate] = useState('');

  const handlePrintFinancial = () => {
    const parseDate = (str: string): Date | null => {
      if (!str) return null;
      if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }
      if (str.includes('-')) return new Date(str);
      return null;
    };
    const start = parseDate(printStartDate);
    const end = parseDate(printEndDate);
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      crossAlert('Errore', 'Inserisci date valide (gg/mm/aaaa)');
      return;
    }
    end.setHours(23, 59, 59, 999);
    const filtered = transactions.filter((t) => {
      const d = toSafeDate(t.date);
      return d >= start && d <= end;
    });
    let inc = 0, exp = 0;
    for (const t of filtered) {
      if (t.type === 'income') inc += t.amount;
      else exp += t.amount;
    }
    printFinancialReport({
      transactions: filtered,
      startDate: start.toLocaleDateString('it-IT'),
      endDate: end.toLocaleDateString('it-IT'),
      totalIncome: inc,
      totalExpenses: exp,
    });
  };

  const combinedIncome = totalIncome + planStats.totalCollected;
  const combinedProfit = combinedIncome - totalExpenses;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestione Economica</Text>
      </View>

      {/* Stampa report economico */}
      {Platform.OS === 'web' && (
        <Card style={styles.printSection}>
          <View style={styles.printHeader}>
            <Ionicons name="print-outline" size={20} color={colors.accent} />
            <Text style={styles.printTitle}>Stampa Report Economico</Text>
          </View>
          <View style={styles.printDateRow}>
            <View style={styles.printDateField}>
              <Text style={styles.printDateLabel}>Da</Text>
              <input
                type="date"
                value={printStartDate}
                onChange={(e: any) => setPrintStartDate(e.target.value)}
                style={{ fontSize: 14, padding: 8, borderRadius: 8, border: '1px solid #333', background: '#1a1a1a', color: colors.white, width: '100%' } as any}
              />
            </View>
            <View style={styles.printDateField}>
              <Text style={styles.printDateLabel}>A</Text>
              <input
                type="date"
                value={printEndDate}
                onChange={(e: any) => setPrintEndDate(e.target.value)}
                style={{ fontSize: 14, padding: 8, borderRadius: 8, border: '1px solid #333', background: '#1a1a1a', color: colors.white, width: '100%' } as any}
              />
            </View>
          </View>
          <Button
            title="Stampa Report"
            onPress={handlePrintFinancial}
            icon={<Ionicons name="print" size={18} color={colors.white} />}
          />
        </Card>
      )}

      {/* Riepilogo generale */}
      <View style={styles.statsRow}>
        <StatCard
          title="Ricavi Totali"
          value={`€${combinedIncome.toLocaleString()}`}
          subtitle={totalIncome > 0 && planStats.totalCollected > 0
            ? `Transazioni €${totalIncome.toLocaleString()} + Piani €${planStats.totalCollected.toLocaleString()}`
            : undefined}
          color={colors.success}
        />
        <StatCard
          title="Spese"
          value={`€${totalExpenses.toLocaleString()}`}
          color={colors.error}
        />
      </View>

      <View style={styles.netProfitContainer}>
        <StatCard
          title="Profitto Netto"
          value={`€${combinedProfit.toLocaleString()}`}
          color={combinedProfit >= 0 ? colors.success : colors.error}
        />
      </View>

      {/* Panoramica Piani di Pagamento */}
      <Text style={styles.sectionTitle}>Panoramica Piani</Text>
      <View style={styles.statsRow}>
        <StatCard
          title="Incassato dai Piani"
          value={`€${planStats.totalCollected.toLocaleString()}`}
          color={colors.success}
          icon={<Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />}
        />
        <StatCard
          title="Da incassare"
          value={`€${planStats.totalOutstanding.toLocaleString()}`}
          color={colors.warning}
          icon={<Ionicons name="time-outline" size={14} color={colors.warning} />}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          title="Piani Attivi"
          value={planStats.activePlans}
          color={colors.info}
        />
        <StatCard
          title="Rate Scadute"
          value={planStats.overdueCount}
          color={colors.error}
        />
      </View>

      {/* Lezioni e Consulenze */}
      <Text style={styles.sectionTitle}>Lezioni e Consulenze</Text>
      <View style={styles.statsRow}>
        <StatCard
          title="Lezioni erogate"
          value={`${planStats.usedLessons}/${planStats.totalLessons}`}
          subtitle={`${planStats.remainingLessons} rimanenti`}
          color={colors.info}
        />
        <StatCard
          title="Consulenze erogate"
          value={`${planStats.usedConsultations}/${planStats.totalConsultations}`}
          subtitle={`${planStats.remainingConsultations} rimanenti`}
          color={colors.warning}
        />
      </View>

      {/* Progress bar lezioni */}
      {planStats.totalLessons > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Lezioni</Text>
            <Text style={styles.progressValue}>
              {planStats.usedLessons}/{planStats.totalLessons}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={{
                ...styles.progressFill,
                width: `${Math.min((planStats.usedLessons / planStats.totalLessons) * 100, 100)}%`,
                backgroundColor: colors.info,
              }}
            />
          </View>
        </View>
      )}

      {/* Progress bar consulenze */}
      {planStats.totalConsultations > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Consulenze Nutrizionali</Text>
            <Text style={styles.progressValue}>
              {planStats.usedConsultations}/{planStats.totalConsultations}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={{
                ...styles.progressFill,
                width: `${Math.min((planStats.usedConsultations / planStats.totalConsultations) * 100, 100)}%`,
                backgroundColor: colors.warning,
              }}
            />
          </View>
        </View>
      )}

      {/* Corsi Attivi */}
      {planStats.activeCourses > 0 && (
        <>
          <Text style={styles.sectionTitle}>Corsi Attivi</Text>
          {paymentPlans
            .filter((p) => {
              if (p.paymentType !== 'monthly_course') return false;
              const today = new Date();
              const start = toSafeDate(p.startDate);
              const end = toSafeDate(p.endDate);
              return start <= today && end >= today;
            })
            .map((plan) => (
              <Card key={plan.id} style={styles.courseCard}>
                <View style={styles.courseRow}>
                  <Ionicons name="school-outline" size={20} color={colors.accent} />
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseType}>{plan.courseType || 'Corso'}</Text>
                    <Text style={styles.courseSubscription}>
                      {plan.subscriptionType || 'Mensile'} · €{plan.totalAmount.toLocaleString()}
                    </Text>
                    <Text style={styles.courseDates}>
                      {toSafeDate(plan.startDate).toLocaleDateString('it-IT')} -{' '}
                      {toSafeDate(plan.endDate).toLocaleDateString('it-IT')}
                    </Text>
                  </View>
                  <View style={styles.courseLessons}>
                    <Text style={styles.courseLessonsValue}>
                      {(plan.includedLessons || 0) - (plan.usedLessons || 0)}
                    </Text>
                    <Text style={styles.courseLessonsLabel}>lezioni rim.</Text>
                  </View>
                </View>
              </Card>
            ))}
        </>
      )}

      {/* Aggiungi transazione */}
      <Button
        title="+ Nuova Transazione"
        onPress={() => setShowAddModal(true)}
        style={styles.addButton}
      />

      {/* Lista transazioni */}
      <Text style={styles.sectionTitle}>Ultime Transazioni</Text>
      {transactions.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>Nessuna transazione registrata</Text>
        </Card>
      ) : (
        transactions.map((t) => (
          <Card key={t.id}>
            <View style={styles.transactionRow}>
              <View style={styles.transactionInfo}>
                <View style={styles.transactionHeader}>
                  <View
                    style={[
                      styles.typeIndicator,
                      {
                        backgroundColor:
                          t.type === 'income' ? colors.success : colors.error,
                      },
                    ]}
                  />
                  <Text style={styles.transactionDesc}>{t.description}</Text>
                </View>
                <Text style={styles.transactionCategory}>
                  {CATEGORIES.find((c) => c.value === t.category)?.label}
                </Text>
                <Text style={styles.transactionDate}>
                  {new Date(t.date as unknown as string).toLocaleDateString('it-IT')}
                </Text>
              </View>
              <View style={styles.transactionRight}>
                <Text
                  style={[
                    styles.transactionAmount,
                    { color: t.type === 'income' ? colors.success : colors.error },
                  ]}
                >
                  {t.type === 'income' ? '+' : '-'}€{t.amount.toLocaleString()}
                </Text>
                <TouchableOpacity
                  onPress={() => handleDeleteTransaction(t.id, t.description)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.deleteText}>Elimina</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        ))
      )}

      {/* Modale aggiungi transazione */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nuova Transazione</Text>

            {/* Tipo */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newType === 'income' && styles.typeButtonIncome,
                ]}
                onPress={() => setNewType('income')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    newType === 'income' && styles.typeButtonTextActive,
                  ]}
                >
                  Ricavo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newType === 'expense' && styles.typeButtonExpense,
                ]}
                onPress={() => setNewType('expense')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    newType === 'expense' && styles.typeButtonTextActive,
                  ]}
                >
                  Spesa
                </Text>
              </TouchableOpacity>
            </View>

            <InputField
              label="Importo (€)"
              value={newAmount}
              onChangeText={setNewAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />

            <InputField
              label="Descrizione"
              value={newDescription}
              onChangeText={setNewDescription}
              placeholder="Descrizione della transazione"
            />

            {/* Categoria */}
            <Text style={styles.categoryLabel}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryChip,
                      newCategory === cat.value && styles.categoryChipActive,
                    ]}
                    onPress={() => setNewCategory(cat.value)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        newCategory === cat.value && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button
                title="Annulla"
                onPress={() => setShowAddModal(false)}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title="Salva"
                onPress={handleAddTransaction}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

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
  statsRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  netProfitContainer: {
    paddingHorizontal: spacing.md,
  },
  addButton: {
    margin: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  transactionDesc: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  transactionCategory: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
    marginLeft: spacing.md + spacing.sm,
  },
  transactionDate: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: 2,
    marginLeft: spacing.md + spacing.sm,
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  transactionAmount: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  deleteText: {
    fontSize: fontSize.xs,
    color: colors.error,
    fontWeight: '600',
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typeButton: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  typeButtonIncome: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  typeButtonExpense: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  typeButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typeButtonTextActive: {
    color: colors.textOnPrimary,
  },
  categoryLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  categoryChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: colors.textOnAccent,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
  progressSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  progressValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%' as const,
    borderRadius: 3,
  },
  courseCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  courseInfo: {
    flex: 1,
  },
  courseType: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.accent,
  },
  courseSubscription: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginTop: 2,
  },
  courseDates: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  courseLessons: {
    alignItems: 'center',
  },
  courseLessonsValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.info,
  },
  courseLessonsLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
  printSection: {
    margin: spacing.md,
  },
  printHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  printTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  printDateRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  printDateField: {
    flex: 1,
  },
  printDateLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  printInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    color: colors.text,
    fontSize: fontSize.md,
  },
});
