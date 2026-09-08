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
import { getCollaborators, getManagers, getStudents } from '../../services/authService';
import { getTransactions, getFinancialSummary } from '../../services/financialService';
import { getAllKPIIndicators, saveKPIIndicators, KPIIndicator } from '../../services/kpiTargetService';
import { crossAlert } from '../../utils/alert';
import { useAuth } from '../../hooks/useAuth';
import { Collaborator, Manager, FinancialTransaction } from '../../types';

type Period = 'month' | 'quarter' | 'year';

interface SchedaUser {
  id: string;
  name: string;
  surname: string;
  role: string;
  roleLabel: string;
  accentColor: string;
  indicators: KPIIndicator[];
}

const generateId = () => Math.random().toString(36).substring(2, 10);

const getRoleLabel = (user: Collaborator | Manager): string => {
  if ((user as Manager).role === 'manager') return 'Manager';
  const collab = user as Collaborator;
  if (collab.collaboratorType === 'nutritionist') return 'Nutrizionista';
  return 'Coach';
};

const getRoleAccent = (user: Collaborator | Manager): string => {
  if ((user as Manager).role === 'manager') return colors.managerBadge;
  const collab = user as Collaborator;
  if (collab.collaboratorType === 'nutritionist') return colors.warning;
  return colors.collaboratorBadge;
};

export const AnalyticsScreen: React.FC = () => {
  const { isOwner } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('month');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [students, setStudents] = useState<{ length: number }>({ length: 0 });
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [kpiIndicators, setKpiIndicators] = useState<Record<string, KPIIndicator[]>>({});

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editUser, setEditUser] = useState<SchedaUser | null>(null);
  const [editIndicators, setEditIndicators] = useState<KPIIndicator[]>([]);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const results = await Promise.allSettled([
      getCollaborators(),
      getManagers(),
      getStudents(),
      getTransactions(),
      getFinancialSummary(),
      getAllKPIIndicators(),
    ]);

    if (results[0].status === 'fulfilled') setCollaborators(results[0].value);
    if (results[1].status === 'fulfilled') setManagers(results[1].value);
    if (results[2].status === 'fulfilled') setStudents({ length: results[2].value.length });
    if (results[3].status === 'fulfilled') setTransactions(results[3].value);
    if (results[4].status === 'fulfilled') {
      setTotalIncome(results[4].value.totalIncome);
      setTotalExpenses(results[4].value.totalExpenses);
    }
    if (results[5].status === 'fulfilled') setKpiIndicators(results[5].value);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const coaches = collaborators.filter((c) => c.collaboratorType !== 'nutritionist');
  const nutritionists = collaborators.filter((c) => c.collaboratorType === 'nutritionist');

  const getCoachRevenueData = (): BarData[] =>
    coaches.map((collab) => {
      const coachIncome = transactions
        .filter((t) => t.type === 'income' && t.collaboratorId === collab.id)
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        label: `${collab.name} ${collab.surname?.charAt(0) || ''}.`,
        value: coachIncome > 0 ? coachIncome : collab.assignedStudents.length * 150,
        color: colors.collaboratorBadge,
      };
    });

  const getManagerRevenueData = (): BarData[] =>
    managers.map((mgr) => {
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

  const buildSchedaUsers = (): SchedaUser[] => {
    const all: SchedaUser[] = [];

    for (const mgr of managers) {
      all.push({
        id: mgr.id,
        name: mgr.name,
        surname: mgr.surname,
        role: 'manager',
        roleLabel: getRoleLabel(mgr),
        accentColor: getRoleAccent(mgr),
        indicators: kpiIndicators[mgr.id] || [],
      });
    }

    for (const collab of collaborators) {
      all.push({
        id: collab.id,
        name: collab.name,
        surname: collab.surname,
        role: collab.collaboratorType || 'coach',
        roleLabel: getRoleLabel(collab),
        accentColor: getRoleAccent(collab),
        indicators: kpiIndicators[collab.id] || [],
      });
    }

    return all;
  };

  const openEditScheda = (user: SchedaUser) => {
    setEditUser(user);
    setEditIndicators(
      user.indicators.length > 0
        ? user.indicators.map((ind) => ({ ...ind }))
        : [{ id: generateId(), label: '', sogliaMinima: '', target: '' }]
    );
    setEditModalVisible(true);
  };

  const addIndicator = () => {
    setEditIndicators((prev) => [
      ...prev,
      { id: generateId(), label: '', sogliaMinima: '', target: '' },
    ]);
  };

  const removeIndicator = (id: string) => {
    setEditIndicators((prev) => prev.filter((ind) => ind.id !== id));
  };

  const updateIndicator = (id: string, field: keyof KPIIndicator, value: string) => {
    setEditIndicators((prev) =>
      prev.map((ind) => (ind.id === id ? { ...ind, [field]: value } : ind))
    );
  };

  const handleSaveScheda = async () => {
    if (!editUser) return;
    const cleaned = editIndicators.filter((ind) => ind.label.trim() !== '');
    setSaving(true);
    try {
      await saveKPIIndicators(editUser.id, cleaned);
      setKpiIndicators((prev) => ({ ...prev, [editUser.id]: cleaned }));
      setEditModalVisible(false);
      crossAlert('Salvato', 'Scheda KPI aggiornata');
    } catch {
      crossAlert('Errore', 'Impossibile salvare la scheda');
    } finally {
      setSaving(false);
    }
  };

  const schedaUsers = buildSchedaUsers();
  const coachData = getCoachRevenueData();
  const managerData = getManagerRevenueData();

  const periods = [
    { key: 'month' as const, label: 'Mese' },
    { key: 'quarter' as const, label: 'Trimestre' },
    { key: 'year' as const, label: 'Anno' },
  ];

  const renderIndicatorTable = (indicators: KPIIndicator[], accentColor: string) => {
    if (indicators.length === 0) {
      return (
        <View style={styles.emptyIndicators}>
          <Text style={styles.emptyIndicatorsText}>
            Nessun indicatore configurato
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.table}>
        {/* Header */}
        <View style={styles.tableHeader}>
          <View style={styles.tableColIndicator}>
            <Text style={styles.tableHeaderText}>INDICATORE</Text>
          </View>
          <View style={[styles.tableColValue, styles.sogliaCol]}>
            <Text style={[styles.tableHeaderText, { color: colors.error }]}>
              SOGLIA MINIMA
            </Text>
          </View>
          <View style={[styles.tableColValue, styles.targetCol]}>
            <Text style={[styles.tableHeaderText, { color: colors.success }]}>
              TARGET
            </Text>
          </View>
        </View>

        {/* Rows */}
        {indicators.map((ind, index) => (
          <View
            key={ind.id}
            style={[
              styles.tableRow,
              index % 2 === 0 && styles.tableRowAlt,
              index === indicators.length - 1 && styles.tableRowLast,
            ]}
          >
            <View style={styles.tableColIndicator}>
              <Text style={styles.indicatorLabel}>{ind.label}</Text>
            </View>
            <View style={[styles.tableColValue, styles.sogliaCol]}>
              <View style={styles.sogliaValueBox}>
                <Text style={styles.sogliaValue}>{ind.sogliaMinima}</Text>
              </View>
            </View>
            <View style={[styles.tableColValue, styles.targetCol]}>
              <View style={styles.targetValueBox}>
                <Text style={styles.targetValue}>{ind.target}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderZoneLegend = () => (
    <View style={styles.legendContainer}>
      <View style={styles.legendRow}>
        <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
        <Text style={styles.legendText}>TARGET = Premio</Text>
      </View>
      <View style={styles.legendRow}>
        <View style={[styles.legendDot, { backgroundColor: colors.textSecondary }]} />
        <Text style={styles.legendText}>Zona Standard</Text>
      </View>
      <View style={styles.legendRow}>
        <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
        <Text style={styles.legendText}>SOGLIA MINIMA = Penalità 10%</Text>
      </View>
    </View>
  );

  const renderSchedaCard = (user: SchedaUser) => (
    <View key={user.id} style={styles.schedaCard}>
      {/* Card Header */}
      <View style={[styles.schedaHeader, { borderLeftColor: user.accentColor }]}>
        <View style={styles.schedaHeaderLeft}>
          <Text style={styles.schedaName}>
            {user.name} {user.surname}
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: user.accentColor }]}>
            <Text style={styles.roleBadgeText}>{user.roleLabel}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.editSchedaButton}
          onPress={() => openEditScheda(user)}
        >
          <Text style={styles.editSchedaButtonText}>Modifica</Text>
        </TouchableOpacity>
      </View>

      {/* Indicator Table */}
      {renderIndicatorTable(user.indicators, user.accentColor)}
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
        <Text style={styles.subtitle}>Schede Ruolo e Obiettivi</Text>
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

      {/* Riepilogo generale — solo owner */}
      {isOwner && (
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
      )}

      {/* Revenue Charts — solo owner */}
      {isOwner && coachData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ricavi per Coach</Text>
          <BarChart data={coachData} title="Produzione in €" height={220} />
        </View>
      )}
      {isOwner && managerData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ricavi per Manager</Text>
          <BarChart data={managerData} title="Produzione Team in €" height={220} />
        </View>
      )}

      {/* Zone Legend */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schede KPI — Ruolo e Obiettivi</Text>
        {renderZoneLegend()}
      </View>

      {/* KPI Schede per persona */}
      {schedaUsers.length > 0 ? (
        <View style={styles.section}>
          {schedaUsers.map(renderSchedaCard)}
        </View>
      ) : (
        <View style={styles.section}>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Nessun collaboratore o manager registrato
            </Text>
          </View>
        </View>
      )}

      <View style={styles.bottomSpacer} />

      {/* Modal Edit Scheda */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Scheda KPI</Text>
            {editUser && (
              <View style={styles.modalUserInfo}>
                <Text style={styles.modalUserName}>
                  {editUser.name} {editUser.surname}
                </Text>
                <View style={[styles.roleBadgeSmall, { backgroundColor: editUser.accentColor }]}>
                  <Text style={styles.roleBadgeSmallText}>{editUser.roleLabel}</Text>
                </View>
              </View>
            )}

            <ScrollView style={styles.modalScroll} nestedScrollEnabled>
              {/* Column Headers */}
              <View style={styles.editHeaderRow}>
                <Text style={[styles.editHeaderLabel, { flex: 2 }]}>Indicatore</Text>
                <Text style={[styles.editHeaderLabel, { flex: 1, color: colors.error }]}>
                  Soglia Min.
                </Text>
                <Text style={[styles.editHeaderLabel, { flex: 1, color: colors.success }]}>
                  Target
                </Text>
                <View style={{ width: 32 }} />
              </View>

              {editIndicators.map((ind, index) => (
                <View key={ind.id} style={styles.editRow}>
                  <TextInput
                    style={[styles.editInput, { flex: 2 }]}
                    value={ind.label}
                    onChangeText={(v) => updateIndicator(ind.id, 'label', v)}
                    placeholder="Nome indicatore"
                    placeholderTextColor={colors.textLight}
                  />
                  <TextInput
                    style={[styles.editInput, styles.editInputSoglia, { flex: 1 }]}
                    value={ind.sogliaMinima}
                    onChangeText={(v) => updateIndicator(ind.id, 'sogliaMinima', v)}
                    placeholder="es. 130"
                    placeholderTextColor={colors.textLight}
                  />
                  <TextInput
                    style={[styles.editInput, styles.editInputTarget, { flex: 1 }]}
                    value={ind.target}
                    onChangeText={(v) => updateIndicator(ind.id, 'target', v)}
                    placeholder="es. 160"
                    placeholderTextColor={colors.textLight}
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeIndicator(ind.id)}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.addButton} onPress={addIndicator}>
                <Text style={styles.addButtonText}>+ Aggiungi indicatore</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.5 }]}
              onPress={handleSaveScheda}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Salvataggio...' : 'Salva Scheda'}
              </Text>
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

  // Legend
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.round,
  },
  legendText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Scheda Card
  schedaCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  schedaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  schedaHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  schedaName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  roleBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editSchedaButton: {
    paddingVertical: spacing.xs + 1,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  editSchedaButtonText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  // Table
  table: {
    paddingHorizontal: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tableColIndicator: {
    flex: 3,
    justifyContent: 'center',
  },
  tableColValue: {
    flex: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sogliaCol: {},
  targetCol: {},
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    alignItems: 'center',
    minHeight: 44,
  },
  tableRowAlt: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  indicatorLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  sogliaValueBox: {
    backgroundColor: 'rgba(255,69,58,0.12)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    minWidth: 48,
    alignItems: 'center',
  },
  sogliaValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.error,
  },
  targetValueBox: {
    backgroundColor: 'rgba(52,199,89,0.12)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    minWidth: 48,
    alignItems: 'center',
  },
  targetValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.success,
  },
  emptyIndicators: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyIndicatorsText: {
    color: colors.textLight,
    fontSize: fontSize.md,
    fontStyle: 'italic',
  },

  // Empty state
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  modalUserInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  modalUserName: {
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: '600',
  },
  roleBadgeSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
  },
  roleBadgeSmallText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.white,
    textTransform: 'uppercase',
  },
  modalScroll: {
    maxHeight: 380,
  },

  // Edit rows
  editHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  editHeaderLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  editInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    color: colors.text,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editInputSoglia: {
    borderColor: 'rgba(255,69,58,0.3)',
  },
  editInputTarget: {
    borderColor: 'rgba(52,199,89,0.3)',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(255,69,58,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: colors.error,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  addButton: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  addButtonText: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '600',
  },

  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.md,
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
