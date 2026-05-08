import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { BarChart, BarData } from '../../components/charts/BarChart';
import { KPICard, KPIData } from '../../components/charts/KPICard';
import { getCollaborators, getManagers, getStudents } from '../../services/authService';
import { getTransactions, getFinancialSummary } from '../../services/financialService';
import { getAllSessions } from '../../services/sessionService';
import { getAllAppointments } from '../../services/nutritionistService';
import { getAllKPITargets, saveKPITargets } from '../../services/kpiTargetService';
import { crossAlert } from '../../utils/alert';
import { Collaborator, Manager, Student, TrainingSession, FinancialTransaction, NutritionistAppointment } from '../../types';

type Period = 'month' | 'quarter' | 'year';

interface EditableTarget {
  label: string;
  key: string;
  value: number;
  unit?: string;
}

export const AnalyticsScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('month');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [appointments, setAppointments] = useState<NutritionistAppointment[]>([]);
  const [kpiTargets, setKpiTargets] = useState<Record<string, Record<string, number>>>({});
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editUserId, setEditUserId] = useState('');
  const [editUserName, setEditUserName] = useState('');
  const [editTargets, setEditTargets] = useState<EditableTarget[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    const results = await Promise.allSettled([
      getCollaborators(),
      getManagers(),
      getStudents(),
      getAllSessions(),
      getTransactions(),
      getFinancialSummary(),
      getAllAppointments(),
      getAllKPITargets(),
    ]);

    if (results[0].status === 'fulfilled') setCollaborators(results[0].value);
    if (results[1].status === 'fulfilled') setManagers(results[1].value);
    if (results[2].status === 'fulfilled') setStudents(results[2].value);
    if (results[3].status === 'fulfilled') setSessions(results[3].value);
    if (results[4].status === 'fulfilled') setTransactions(results[4].value);
    if (results[5].status === 'fulfilled') {
      setTotalIncome(results[5].value.totalIncome);
      setTotalExpenses(results[5].value.totalExpenses);
    }
    if (results[6].status === 'fulfilled') setAppointments(results[6].value);
    if (results[7].status === 'fulfilled') setKpiTargets(results[7].value);

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      console.warn('Alcune query KPI fallite:', failed.map((f) => (f as PromiseRejectedResult).reason));
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getTarget = (userId: string, label: string, fallback: number): number => {
    return kpiTargets[userId]?.[label] ?? fallback;
  };

  const openEditTargets = (userId: string, userName: string, targets: EditableTarget[]) => {
    setEditUserId(userId);
    setEditUserName(userName);
    setEditTargets(targets);
    const values: Record<string, string> = {};
    for (const t of targets) {
      values[t.key] = String(kpiTargets[userId]?.[t.key] ?? t.value);
    }
    setEditValues(values);
    setEditModalVisible(true);
  };

  const handleSaveTargets = async () => {
    const targets: Record<string, number> = {};
    for (const t of editTargets) {
      const val = parseFloat(editValues[t.key]);
      if (!isNaN(val)) targets[t.key] = val;
    }
    try {
      await saveKPITargets(editUserId, targets);
      setKpiTargets((prev) => ({ ...prev, [editUserId]: targets }));
      setEditModalVisible(false);
      crossAlert('Salvato', 'Obiettivi KPI aggiornati');
    } catch {
      crossAlert('Errore', 'Impossibile salvare gli obiettivi');
    }
  };

  const coaches = collaborators.filter((c) => c.collaboratorType !== 'nutritionist');
  const nutritionists = collaborators.filter((c) => c.collaboratorType === 'nutritionist');

  // --- Calcolo ricavi per coach ---
  const getCoachRevenueData = (): BarData[] => {
    return coaches.map((collab) => {
      const coachIncome = transactions
        .filter((t) => t.type === 'income' && t.collaboratorId === collab.id)
        .reduce((sum, t) => sum + t.amount, 0);
      const estimatedRevenue = coachIncome > 0
        ? coachIncome
        : collab.assignedStudents.length * 150;
      return {
        label: `${collab.name} ${collab.surname?.charAt(0) || ''}.`,
        value: estimatedRevenue,
        color: colors.collaboratorBadge,
      };
    });
  };

  // --- Calcolo ricavi per manager ---
  const getManagerRevenueData = (): BarData[] => {
    return managers.map((mgr) => {
      const managedCollabs = collaborators.filter((c) =>
        mgr.assignedCollaborators.includes(c.id)
      );
      const teamRevenue = managedCollabs.reduce((sum, collab) => {
        const coachIncome = transactions
          .filter((t) => t.type === 'income' && t.collaboratorId === collab.id)
          .reduce((s, t) => s + t.amount, 0);
        return sum + (coachIncome > 0 ? coachIncome : collab.assignedStudents.length * 150);
      }, 0);
      return {
        label: `${mgr.name} ${mgr.surname?.charAt(0) || ''}.`,
        value: teamRevenue,
        color: colors.managerBadge,
      };
    });
  };

  // --- KPI Manager ---
  const getManagerKPIs = (): { id: string; name: string; kpis: KPIData[]; editableTargets: EditableTarget[] }[] => {
    return managers.map((mgr) => {
      const managedCollabs = collaborators.filter((c) =>
        mgr.assignedCollaborators.includes(c.id)
      );
      const managedStudents = students.filter((s) =>
        mgr.assignedStudents.includes(s.id)
      );
      const teamSessions = sessions.filter((s) =>
        managedCollabs.some((c) => c.id === s.collaboratorId)
      );
      const completedSessions = teamSessions.filter((s) => s.status === 'completed');
      const cancelledSessions = teamSessions.filter(
        (s) => s.status === 'cancelled_by_student' || s.status === 'cancelled_late'
      );
      const noShows = teamSessions.filter((s) => s.status === 'no_show');
      const activeStudents = managedStudents.filter((s) => s.isActive);

      const tAllievi = getTarget(mgr.id, 'Allievi attivi', Math.max(activeStudents.length + 5, 20));
      const tCoach = getTarget(mgr.id, 'Coach gestiti', Math.max(managedCollabs.length + 2, 5));
      const tCanc = getTarget(mgr.id, 'Tasso di cancellazione', 10);
      const tRetention = getTarget(mgr.id, 'Retention allievi', 90);

      return {
        id: mgr.id,
        name: `${mgr.name} ${mgr.surname}`,
        editableTargets: [
          { label: 'Allievi attivi', key: 'Allievi attivi', value: tAllievi },
          { label: 'Coach gestiti', key: 'Coach gestiti', value: tCoach },
          { label: 'Tasso cancellazione max (%)', key: 'Tasso di cancellazione', value: tCanc, unit: '%' },
          { label: 'Retention allievi (%)', key: 'Retention allievi', value: tRetention, unit: '%' },
        ],
        kpis: [
          {
            label: 'Allievi attivi',
            value: activeStudents.length,
            target: tAllievi,
            trend: activeStudents.length > 0 ? 'up' as const : 'stable' as const,
          },
          {
            label: 'Coach gestiti',
            value: managedCollabs.length,
            target: tCoach,
            trend: 'stable' as const,
          },
          {
            label: 'Sessioni completate',
            value: completedSessions.length,
            target: Math.max(teamSessions.length, 1),
            trend: completedSessions.length > cancelledSessions.length ? 'up' as const : 'down' as const,
          },
          {
            label: 'Tasso di cancellazione',
            value: teamSessions.length > 0
              ? Math.round((cancelledSessions.length / teamSessions.length) * 100)
              : 0,
            target: tCanc,
            unit: '%',
            color: cancelledSessions.length > teamSessions.length * 0.1 ? colors.error : colors.success,
            trend: cancelledSessions.length > teamSessions.length * 0.1 ? 'down' as const : 'up' as const,
          },
          {
            label: 'No-show',
            value: noShows.length,
            color: noShows.length > 3 ? colors.error : colors.success,
            trend: noShows.length > 3 ? 'down' as const : 'up' as const,
          },
          {
            label: 'Retention allievi',
            value: managedStudents.length > 0
              ? Math.round((activeStudents.length / managedStudents.length) * 100)
              : 100,
            target: tRetention,
            unit: '%',
            trend: 'up' as const,
          },
        ],
      };
    });
  };

  // --- KPI Coach ---
  const getCoachKPIs = (): { id: string; name: string; kpis: KPIData[]; editableTargets: EditableTarget[] }[] => {
    return coaches.map((collab) => {
      const coachSessions = sessions.filter((s) => s.collaboratorId === collab.id);
      const completedSessions = coachSessions.filter((s) => s.status === 'completed');
      const assignedStudents = students.filter((s) => s.assignedCollaboratorId === collab.id);
      const activeStudents = assignedStudents.filter((s) => s.isActive);

      const coachIncome = transactions
        .filter((t) => t.type === 'income' && t.collaboratorId === collab.id)
        .reduce((sum, t) => sum + t.amount, 0);
      const coachEarnings = coachIncome * (collab.commissionPercentage / 100);

      const tAllievi = getTarget(collab.id, 'Allievi assegnati', Math.max(assignedStudents.length + 3, 10));
      const tCompletamento = getTarget(collab.id, 'Tasso completamento', 85);

      return {
        id: collab.id,
        name: `${collab.name} ${collab.surname}`,
        editableTargets: [
          { label: 'Allievi assegnati', key: 'Allievi assegnati', value: tAllievi },
          { label: 'Tasso completamento (%)', key: 'Tasso completamento', value: tCompletamento, unit: '%' },
        ],
        kpis: [
          {
            label: 'Allievi assegnati',
            value: assignedStudents.length,
            target: tAllievi,
            trend: assignedStudents.length > 0 ? 'up' as const : 'stable' as const,
          },
          {
            label: 'Allievi attivi',
            value: activeStudents.length,
            target: assignedStudents.length,
            trend: activeStudents.length === assignedStudents.length ? 'up' as const : 'down' as const,
          },
          {
            label: 'Sessioni completate',
            value: completedSessions.length,
            target: Math.max(coachSessions.length, 1),
            trend: 'up' as const,
          },
          {
            label: 'Tasso completamento',
            value: coachSessions.length > 0
              ? Math.round((completedSessions.length / coachSessions.length) * 100)
              : 0,
            target: tCompletamento,
            unit: '%',
            trend: completedSessions.length / Math.max(coachSessions.length, 1) > 0.85 ? 'up' as const : 'down' as const,
          },
          {
            label: 'Guadagni (commissione)',
            value: coachEarnings,
            unit: '€',
            color: colors.success,
            trend: coachEarnings > 0 ? 'up' as const : 'stable' as const,
          },
          {
            label: 'Commissione',
            value: collab.commissionPercentage,
            unit: '%',
          },
          {
            label: 'Specializzazioni',
            value: collab.specializations?.join(', ') || 'N/A',
          },
        ],
      };
    });
  };

  // --- KPI Nutrizionista (per persona) ---
  const getNutritionistKPIs = (): { id: string; name: string; kpis: KPIData[]; editableTargets: EditableTarget[] }[] => {
    return nutritionists.map((nutri) => {
      const nutriAppointments = appointments.filter((a) => a.nutritionistId === nutri.id);
      const completedAppts = nutriAppointments.filter(
        (a) => a.status === 'completed' || a.isCountedAsCompleted
      );
      const cancelledAppts = nutriAppointments.filter(
        (a) => a.status === 'cancelled' || a.status === 'cancelled_late'
      );
      const assignedStudents = students.filter((s) => s.assignedNutritionistId === nutri.id);
      const activeStudents = assignedStudents.filter((s) => s.isActive);

      const completionRate = nutriAppointments.length > 0
        ? Math.round((completedAppts.length / nutriAppointments.length) * 100)
        : 0;

      const nutriIncome = transactions
        .filter((t) => t.type === 'income' && t.collaboratorId === nutri.id)
        .reduce((sum, t) => sum + t.amount, 0);
      const nutriEarnings = nutriIncome * (nutri.commissionPercentage / 100);

      const tAllievi = getTarget(nutri.id, 'Allievi seguiti', Math.max(assignedStudents.length + 3, 10));
      const tCompletamento = getTarget(nutri.id, 'Tasso completamento', 85);

      return {
        id: nutri.id,
        name: `${nutri.name} ${nutri.surname}`,
        editableTargets: [
          { label: 'Allievi seguiti', key: 'Allievi seguiti', value: tAllievi },
          { label: 'Tasso completamento (%)', key: 'Tasso completamento', value: tCompletamento, unit: '%' },
        ],
        kpis: [
          {
            label: 'Allievi seguiti',
            value: assignedStudents.length,
            target: tAllievi,
            trend: assignedStudents.length > 0 ? 'up' as const : 'stable' as const,
          },
          {
            label: 'Allievi attivi',
            value: activeStudents.length,
            target: assignedStudents.length || 1,
            trend: activeStudents.length === assignedStudents.length ? 'up' as const : 'down' as const,
          },
          {
            label: 'Consulenze completate',
            value: completedAppts.length,
            target: Math.max(nutriAppointments.length, 1),
            trend: completedAppts.length > cancelledAppts.length ? 'up' as const : 'down' as const,
          },
          {
            label: 'Tasso completamento',
            value: completionRate,
            target: tCompletamento,
            unit: '%',
            trend: completionRate >= 85 ? 'up' as const : 'down' as const,
          },
          {
            label: 'Consulenze cancellate',
            value: cancelledAppts.length,
            color: cancelledAppts.length > 3 ? colors.error : colors.success,
            trend: cancelledAppts.length > 3 ? 'down' as const : 'up' as const,
          },
          {
            label: 'Guadagni (commissione)',
            value: nutriEarnings,
            unit: '€',
            color: colors.success,
            trend: nutriEarnings > 0 ? 'up' as const : 'stable' as const,
          },
          {
            label: 'Commissione',
            value: nutri.commissionPercentage,
            unit: '%',
          },
          {
            label: 'Specializzazioni',
            value: nutri.specializations?.join(', ') || 'N/A',
          },
        ],
      };
    });
  };

  const periods = [
    { key: 'month' as const, label: 'Mese' },
    { key: 'quarter' as const, label: 'Trimestre' },
    { key: 'year' as const, label: 'Anno' },
  ];

  const coachData = getCoachRevenueData();
  const managerData = getManagerRevenueData();
  const managerKPIs = getManagerKPIs();
  const coachKPIs = getCoachKPIs();
  const nutritionistKPIs = getNutritionistKPIs();

  const renderKPISection = (
    title: string,
    items: { id: string; name: string; kpis: KPIData[]; editableTargets: EditableTarget[] }[],
    accentColor: string,
    emptyText: string
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.length > 0 ? (
        items.map((item) => (
          <View key={item.id} style={styles.kpiBlock}>
            <View style={styles.kpiHeader}>
              <KPICard
                title={item.name}
                kpis={item.kpis}
                accentColor={accentColor}
              />
              {item.editableTargets.length > 0 && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openEditTargets(item.id, item.name, item.editableTargets)}
                >
                  <Text style={styles.editButtonText}>✎ Obiettivi</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      )}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Analisi & KPI</Text>
        <Text style={styles.subtitle}>Monitoraggio prestazioni</Text>
      </View>

      {/* Filtro periodo */}
      <View style={styles.periodFilter}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[
              styles.periodButton,
              selectedPeriod === p.key && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod(p.key)}
          >
            <Text
              style={[
                styles.periodText,
                selectedPeriod === p.key && styles.periodTextActive,
              ]}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Riepilogo generale */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: colors.success }]}>
          <Text style={styles.summaryLabel}>Ricavi Totali</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            €{totalIncome.toLocaleString()}
          </Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: colors.error }]}>
          <Text style={styles.summaryLabel}>Spese Totali</Text>
          <Text style={[styles.summaryValue, { color: colors.error }]}>
            €{totalExpenses.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* GRAFICO A BARRE - RICAVI PER COACH */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ricavi per Coach</Text>
        {coachData.length > 0 ? (
          <BarChart data={coachData} title="Produzione in €" height={220} />
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nessun coach registrato</Text>
          </View>
        )}
      </View>

      {/* GRAFICO A BARRE - RICAVI PER MANAGER */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ricavi per Manager</Text>
        {managerData.length > 0 ? (
          <BarChart data={managerData} title="Produzione Team in €" height={220} />
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nessun manager registrato</Text>
          </View>
        )}
      </View>

      {/* KPI MANAGER */}
      {renderKPISection('KPI Manager', managerKPIs, colors.managerBadge, 'Nessun manager registrato')}

      {/* KPI COACH */}
      {renderKPISection('KPI Coach', coachKPIs, colors.collaboratorBadge, 'Nessun coach registrato')}

      {/* KPI NUTRIZIONISTA */}
      {renderKPISection('KPI Nutrizionista', nutritionistKPIs, colors.warning, 'Nessun nutrizionista registrato')}

      <View style={styles.bottomSpacer} />

      {/* Modal Modifica Obiettivi */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Obiettivi KPI</Text>
            <Text style={styles.modalSubtitle}>{editUserName}</Text>

            <ScrollView style={styles.modalScroll}>
              {editTargets.map((t) => (
                <View key={t.key} style={styles.targetRow}>
                  <Text style={styles.targetLabel}>{t.label}</Text>
                  <View style={styles.targetInputRow}>
                    <TextInput
                      style={styles.targetInput}
                      value={editValues[t.key] || ''}
                      onChangeText={(val) =>
                        setEditValues((prev) => ({ ...prev, [t.key]: val }))
                      }
                      keyboardType="numeric"
                      placeholderTextColor={colors.textLight}
                      placeholder="0"
                    />
                    {t.unit && <Text style={styles.targetUnit}>{t.unit}</Text>}
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveTargets}>
              <Text style={styles.saveButtonText}>Salva Obiettivi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setEditModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  periodFilter: {
    flexDirection: 'row',
    margin: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    ...shadows.small,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  periodButtonActive: {
    backgroundColor: colors.accent,
  },
  periodText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  periodTextActive: {
    color: colors.textOnAccent,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  kpiBlock: {
    marginBottom: spacing.md,
  },
  kpiHeader: {},
  editButton: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editButtonText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: spacing.xxl * 2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: fontSize.md,
    color: colors.accent,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    fontWeight: '600',
  },
  modalScroll: {
    maxHeight: 300,
  },
  targetRow: {
    marginBottom: spacing.md,
  },
  targetLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  targetInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  targetInput: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: colors.border,
  },
  targetUnit: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveButtonText: {
    color: colors.textOnAccent,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
});
