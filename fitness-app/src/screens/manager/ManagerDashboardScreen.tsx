import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { BarChart, BarData } from '../../components/charts/BarChart';
import { KPICard, KPIData } from '../../components/charts/KPICard';
import { Collaborator, Student, TrainingSession, Manager, FinancialTransaction } from '../../types';
import { getCollaborators, getStudents } from '../../services/authService';
import { getAllSessions } from '../../services/sessionService';
import { getTransactions } from '../../services/financialService';
import { useAuth } from '../../hooks/useAuth';

export const ManagerDashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { logout, user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [teamCollaborators, setTeamCollaborators] = useState<Collaborator[]>([]);
  const [teamStudents, setTeamStudents] = useState<Student[]>([]);
  const [teamSessions, setTeamSessions] = useState<TrainingSession[]>([]);
  const [directStudents, setDirectStudents] = useState<Student[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  const manager = user as Manager | null;

  const loadData = useCallback(async () => {
    if (!manager) return;
    try {
      const [allCollabs, allStudents, allSessions, allTxs] = await Promise.all([
        getCollaborators(),
        getStudents(),
        getAllSessions(),
        getTransactions(),
      ]);

      // Filtra solo i collaboratori assegnati a questo manager
      const myCollabs = allCollabs.filter((c) =>
        manager.assignedCollaborators?.includes(c.id)
      );
      setTeamCollaborators(myCollabs);

      // Allievi diretti del manager
      const myDirectStudents = allStudents.filter((s) =>
        manager.assignedStudents?.includes(s.id)
      );
      setDirectStudents(myDirectStudents);

      // Allievi del team (coach sotto il manager) + allievi diretti
      const teamCollabIds = myCollabs.map((c) => c.id);
      const myTeamStudents = allStudents.filter(
        (s) =>
          teamCollabIds.includes(s.assignedCollaboratorId) ||
          manager.assignedStudents?.includes(s.id)
      );
      setTeamStudents(myTeamStudents);

      // Sessioni del team (coach + manager stesso come coach)
      const allTeamIds = [...teamCollabIds, manager.id];
      const myTeamSessions = allSessions.filter((s) =>
        allTeamIds.includes(s.collaboratorId)
      );
      setTeamSessions(myTeamSessions);

      // Transazioni legate al team
      const myTxs = allTxs.filter(
        (t) => allTeamIds.includes(t.collaboratorId || '')
      );
      setTransactions(myTxs);
    } catch (err) {
      console.error('Errore caricamento dashboard manager:', err);
    }
  }, [manager]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // --- Statistiche ---
  const totalTeamStudents = teamStudents.length;
  const activeTeamStudents = teamStudents.filter((s) => s.isActive).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todaySessions = teamSessions.filter((s) => {
    const d = new Date(s.date as unknown as string);
    return d >= today && d < tomorrow;
  });

  const completedSessions = teamSessions.filter((s) => s.status === 'completed');
  const cancelledSessions = teamSessions.filter(
    (s) => s.status === 'cancelled_by_student' || s.status === 'cancelled_late'
  );
  const noShowSessions = teamSessions.filter((s) => s.status === 'no_show');

  const totalTeamRevenue = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const managerEarnings = totalTeamRevenue * ((manager?.commissionPercentage || 0) / 100);

  // --- Grafico ricavi per coach del team ---
  const getRevenueByCoach = (): BarData[] => {
    return teamCollaborators.map((collab) => {
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

  // --- Grafico allievi per coach ---
  const getStudentsByCoach = (): BarData[] => {
    return teamCollaborators.map((collab) => ({
      label: `${collab.name} ${collab.surname?.charAt(0) || ''}.`,
      value: collab.assignedStudents.length,
      color: colors.accent,
    }));
  };

  // --- Grafico sessioni per stato ---
  const getSessionsByStatus = (): BarData[] => {
    return [
      { label: 'Completate', value: completedSessions.length, color: colors.success },
      { label: 'In programma', value: teamSessions.filter((s) => s.status === 'scheduled').length, color: colors.info },
      { label: 'Cancellate', value: cancelledSessions.length, color: colors.warning },
      { label: 'No-show', value: noShowSessions.length, color: colors.error },
    ];
  };

  // --- KPI per coach ---
  const getCoachKPIs = (): { name: string; kpis: KPIData[] }[] => {
    return teamCollaborators.map((collab) => {
      const coachSessions = teamSessions.filter((s) => s.collaboratorId === collab.id);
      const coachCompleted = coachSessions.filter((s) => s.status === 'completed');
      const coachCancelled = coachSessions.filter(
        (s) => s.status === 'cancelled_by_student' || s.status === 'cancelled_late'
      );
      const coachNoShows = coachSessions.filter((s) => s.status === 'no_show');
      const coachStudents = teamStudents.filter((s) => s.assignedCollaboratorId === collab.id);
      const activeStudents = coachStudents.filter((s) => s.isActive);

      const coachIncome = transactions
        .filter((t) => t.type === 'income' && t.collaboratorId === collab.id)
        .reduce((sum, t) => sum + t.amount, 0);

      const completionRate = coachSessions.length > 0
        ? Math.round((coachCompleted.length / coachSessions.length) * 100)
        : 0;

      const cancellationRate = coachSessions.length > 0
        ? Math.round((coachCancelled.length / coachSessions.length) * 100)
        : 0;

      return {
        name: `${collab.name} ${collab.surname}`,
        kpis: [
          {
            label: 'Allievi attivi',
            value: activeStudents.length,
            target: Math.max(coachStudents.length, 1),
            trend: activeStudents.length === coachStudents.length ? 'up' as const : 'down' as const,
          },
          {
            label: 'Sessioni completate',
            value: coachCompleted.length,
            target: Math.max(coachSessions.length, 1),
            trend: coachCompleted.length > coachCancelled.length ? 'up' as const : 'down' as const,
          },
          {
            label: 'Tasso completamento',
            value: completionRate,
            target: 85,
            unit: '%',
            trend: completionRate >= 85 ? 'up' as const : 'down' as const,
          },
          {
            label: 'Tasso cancellazione',
            value: cancellationRate,
            target: 10,
            unit: '%',
            color: cancellationRate > 10 ? colors.error : colors.success,
            trend: cancellationRate <= 10 ? 'up' as const : 'down' as const,
          },
          {
            label: 'No-show',
            value: coachNoShows.length,
            color: coachNoShows.length > 3 ? colors.error : colors.success,
            trend: coachNoShows.length > 3 ? 'down' as const : 'up' as const,
          },
          {
            label: 'Ricavi generati',
            value: coachIncome > 0 ? coachIncome : collab.assignedStudents.length * 150,
            unit: '€',
            color: colors.success,
            trend: coachIncome > 0 ? 'up' as const : 'stable' as const,
          },
          {
            label: 'Commissione coach',
            value: collab.commissionPercentage,
            unit: '%',
          },
        ],
      };
    });
  };

  const periods = [
    { key: 'week' as const, label: 'Settimana' },
    { key: 'month' as const, label: 'Mese' },
    { key: 'year' as const, label: 'Anno' },
  ];

  const coachRevenueData = getRevenueByCoach();
  const studentsByCoachData = getStudentsByCoach();
  const sessionsData = getSessionsByStatus();
  const coachKPIs = getCoachKPIs();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Buongiorno{user?.name ? `, ${user.name}` : ''}!</Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString('it-IT', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Esci</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.roleBadge}>Manager</Text>
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

      {/* Statistiche rapide */}
      <View style={styles.statsRow}>
        <StatCard
          title="Allievi Team"
          value={activeTeamStudents}
          subtitle={`${totalTeamStudents} totali`}
          color={colors.info}
        />
        <StatCard
          title="Coach"
          value={teamCollaborators.length}
          subtitle="nel tuo team"
          color={colors.collaboratorBadge}
        />
      </View>

      <View style={styles.statsRow}>
        <StatCard
          title="Sessioni Oggi"
          value={todaySessions.length}
          color={colors.accent}
        />
        <StatCard
          title="Allievi Diretti"
          value={directStudents.length}
          subtitle="seguiti da te"
          color={colors.managerBadge}
        />
      </View>

      {/* Guadagni manager */}
      <View style={styles.earningsCard}>
        <Text style={styles.earningsLabel}>Ricavi Team</Text>
        <Text style={[styles.earningsValue, { color: colors.success }]}>
          €{totalTeamRevenue.toLocaleString()}
        </Text>
        <View style={styles.earningsRow}>
          <Text style={styles.earningsDetail}>
            Tua commissione ({manager?.commissionPercentage || 0}%)
          </Text>
          <Text style={[styles.earningsDetailValue, { color: colors.managerBadge }]}>
            €{Math.round(managerEarnings).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Grafico Ricavi per Coach */}
      <View style={styles.chartSection}>
        {coachRevenueData.length > 0 ? (
          <BarChart
            data={coachRevenueData}
            title="Ricavi per Coach"
            height={200}
          />
        ) : (
          <Card>
            <Text style={styles.emptyText}>Nessun coach nel tuo team</Text>
          </Card>
        )}
      </View>

      {/* Grafico Allievi per Coach */}
      <View style={styles.chartSection}>
        {studentsByCoachData.length > 0 ? (
          <BarChart
            data={studentsByCoachData}
            title="Allievi per Coach"
            height={180}
            formatValue={(v) => String(v)}
          />
        ) : (
          <Card>
            <Text style={styles.emptyText}>Nessun coach nel tuo team</Text>
          </Card>
        )}
      </View>

      {/* Grafico Sessioni */}
      <View style={styles.chartSection}>
        <BarChart
          data={sessionsData}
          title="Riepilogo Sessioni Team"
          height={180}
          formatValue={(v) => String(v)}
        />
      </View>

      {/* Sessioni di oggi */}
      <Text style={styles.sectionTitle}>Sessioni di Oggi</Text>
      {todaySessions.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>Nessuna sessione programmata per oggi</Text>
        </Card>
      ) : (
        todaySessions.map((session) => (
          <Card key={session.id} variant="elevated">
            <View style={styles.sessionRow}>
              <View>
                <Text style={styles.sessionTime}>
                  {session.startTime} - {session.endTime}
                </Text>
                <Text style={styles.sessionStudent}>
                  Allievo ID: {session.studentId}
                </Text>
              </View>
              <Badge status={session.status} />
            </View>
          </Card>
        ))
      )}

      {/* Rendimento Collaboratori del Team */}
      <Text style={styles.sectionTitle}>Rendimento Team</Text>
      {coachKPIs.length > 0 ? (
        coachKPIs.map((coach, index) => (
          <View key={index} style={styles.kpiBlock}>
            <KPICard
              title={coach.name}
              kpis={coach.kpis}
              accentColor={colors.collaboratorBadge}
            />
          </View>
        ))
      ) : (
        <Card>
          <Text style={styles.emptyText}>Nessun coach nel tuo team</Text>
        </Card>
      )}

      {/* Riepilogo Rendimento (card sintetiche) */}
      <Text style={styles.sectionTitle}>Rendimento Collaboratori</Text>
      {teamCollaborators.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>Nessun collaboratore nel team</Text>
        </Card>
      ) : (
        teamCollaborators.map((collab) => {
          const coachSessions = teamSessions.filter((s) => s.collaboratorId === collab.id);
          const coachCompleted = coachSessions.filter((s) => s.status === 'completed');
          const completionRate = coachSessions.length > 0
            ? Math.round((coachCompleted.length / coachSessions.length) * 100)
            : 0;
          const coachStudentCount = teamStudents.filter(
            (s) => s.assignedCollaboratorId === collab.id
          ).length;

          return (
            <Card key={collab.id} variant="elevated">
              <View style={styles.collabRow}>
                <View style={styles.collabInfo}>
                  <Text style={styles.collabName}>
                    {collab.name} {collab.surname}
                  </Text>
                  <Text style={styles.collabStudents}>
                    {coachStudentCount} allievi · {coachCompleted.length}/{coachSessions.length} sessioni
                  </Text>
                </View>
                <View style={styles.collabEarnings}>
                  <Text style={[
                    styles.collabAmount,
                    { color: completionRate >= 85 ? colors.success : completionRate >= 60 ? colors.warning : colors.error },
                  ]}>
                    {completionRate}%
                  </Text>
                  <Text style={styles.collabLabel}>completamento</Text>
                </View>
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
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logoutButton: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  roleBadge: {
    color: colors.managerBadge,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  date: {
    fontSize: fontSize.md,
    color: colors.textLight,
    marginTop: spacing.xs,
    textTransform: 'capitalize',
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
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  earningsCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.managerBadge,
    ...shadows.small,
  },
  earningsLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  earningsValue: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  earningsDetail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  earningsDetailValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  chartSection: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  kpiBlock: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionTime: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  sessionStudent: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: 2,
  },
  collabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  collabInfo: {},
  collabName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  collabStudents: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  collabEarnings: {
    alignItems: 'flex-end',
  },
  collabAmount: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  collabLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.md,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
});
