import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { crossAlert } from '../../utils/alert';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { BarChart, BarData } from '../../components/charts/BarChart';
import { Collaborator, Manager, TrainingSession, FinancialTransaction, PaymentPlan, Student, AppNotification } from '../../types';
import { getCollaborators, getManagers, getStudents } from '../../services/authService';
import { getAllSessions } from '../../services/sessionService';
import { getFinancialSummary, getTransactions } from '../../services/financialService';
import { getAllPaymentPlans } from '../../services/paymentService';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import { NotificationPrompt } from '../../components/common/NotificationPrompt';
import { InstallPrompt } from '../../components/common/InstallPrompt';
import { printStaffReport, printOwnerReport } from '../../utils/printUtils';
import { generateWeeklySummary, ensureAIApiKey } from '../../services/aiService';
import { generateAndSendRemindersForAllStudents, generatePaymentReminders, sendWhatsAppReminder } from '../../services/paymentReminderService';
import { getAllTodayChecks, WellnessCheck } from '../../services/wellnessService';

const toSafeDate = (d: unknown): Date => {
  if (d instanceof Date) return d;
  if (d && typeof d === 'object' && 'toDate' in d && typeof (d as any).toDate === 'function')
    return (d as any).toDate();
  if (d && typeof d === 'object' && 'seconds' in d)
    return new Date((d as any).seconds * 1000);
  return new Date(d as string);
};

export const DashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { logout, user } = useAuth();
  const [wellnessToday, setWellnessToday] = useState<WellnessCheck[]>([]);

  useEffect(() => {
    getAllTodayChecks().then(setWellnessToday).catch(() => {});
  }, []);
  const [refreshing, setRefreshing] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [allSessions, setAllSessions] = useState<TrainingSession[]>([]);
  const [todaySessions, setTodaySessions] = useState<TrainingSession[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [allPaymentPlans, setAllPaymentPlans] = useState<PaymentPlan[]>([]);
  const [studentsData, setStudentsData] = useState<Student[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [printStartDate, setPrintStartDate] = useState('');
  const [printEndDate, setPrintEndDate] = useState('');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryText, setAiSummaryText] = useState('');
  const [showAiSummaryModal, setShowAiSummaryModal] = useState(false);
  const [paymentReminders, setPaymentReminders] = useState<(AppNotification & { studentPhone: string; studentFullName: string })[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [collabs, mgrs, studs, sessions, txs, summary, payPlans] = await Promise.all([
        getCollaborators(),
        getManagers(),
        getStudents(),
        getAllSessions(),
        getTransactions(),
        getFinancialSummary(),
        getAllPaymentPlans(),
      ]);
      setCollaborators(collabs);
      setManagers(mgrs);
      setTotalStudents(studs.length);
      setStudentsData(studs as unknown as Student[]);
      setAllSessions(sessions);
      setTransactions(txs);
      setTotalRevenue(summary.totalIncome);
      setTotalExpenses(summary.totalExpenses);
      setAllPaymentPlans(payPlans);

      generateAndSendRemindersForAllStudents(
        payPlans,
        studs.map((s: any) => ({ id: s.id, name: s.name }))
      ).catch(() => {});

      const sMap = new Map(studs.map((s: any) => [s.id, s]));
      const plansByStudent: Record<string, PaymentPlan[]> = {};
      payPlans.forEach((p: PaymentPlan) => {
        if (!plansByStudent[p.studentId]) plansByStudent[p.studentId] = [];
        plansByStudent[p.studentId].push(p);
      });
      const allReminders: (AppNotification & { studentPhone: string; studentFullName: string })[] = [];
      for (const [studentId, studentPlans] of Object.entries(plansByStudent)) {
        const student = sMap.get(studentId) as any;
        if (!student) continue;
        const reminders = await generatePaymentReminders(studentId, student.name, studentPlans);
        for (const r of reminders) {
          allReminders.push({ ...r, studentPhone: student.phone || '', studentFullName: `${student.name} ${student.surname || ''}`.trim() });
        }
      }
      setPaymentReminders(allReminders);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const todayOnly = sessions.filter((s) => {
        const d = new Date(s.date as unknown as string);
        return d >= today && d < tomorrow;
      });
      setTodaySessions(todayOnly);
    } catch (err) {
      console.error('Errore caricamento dashboard:', err);
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

  // Grafico ricavi per collaboratore
  const getRevenueByCoach = (): BarData[] => {
    return collaborators.map((collab) => {
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

  // Grafico sessioni per stato
  const getSessionsByStatus = (): BarData[] => {
    const completed = allSessions.filter((s) => s.status === 'completed').length;
    const scheduled = allSessions.filter((s) => s.status === 'scheduled').length;
    const cancelled = allSessions.filter(
      (s) => s.status === 'cancelled_by_student' || s.status === 'cancelled_late'
    ).length;
    const noShow = allSessions.filter((s) => s.status === 'no_show').length;

    return [
      { label: 'Completate', value: completed, color: colors.success },
      { label: 'In programma', value: scheduled, color: colors.info },
      { label: 'Cancellate', value: cancelled, color: colors.warning },
      { label: 'No-show', value: noShow, color: colors.error },
    ];
  };

  // Grafico allievi per coach
  const getStudentsByCoach = (): BarData[] => {
    return collaborators.map((collab) => ({
      label: `${collab.name} ${collab.surname?.charAt(0) || ''}.`,
      value: collab.assignedStudents.length,
      color: colors.accent,
    }));
  };

  const [resetting, setResetting] = useState(false);

  const deleteCollection = async (collectionName: string) => {
    const snapshot = await getDocs(collection(db, collectionName));
    const deletes = snapshot.docs.map((d) => deleteDoc(doc(db, collectionName, d.id)));
    await Promise.all(deletes);
    return snapshot.size;
  };

  const handleResetAllData = () => {
    crossAlert(
      'Reset Tutti i Dati',
      'ATTENZIONE: Questa azione eliminerà TUTTI i dati dell\'app (sessioni, pagamenti, programmi, transazioni, valutazioni, diario, contenuti). Gli account utente NON verranno eliminati.\n\nSei sicuro?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma Reset',
          style: 'destructive',
          onPress: () => {
            crossAlert(
              'Ultima Conferma',
              'I dati eliminati NON potranno essere recuperati. Continuare?',
              [
                { text: 'No', style: 'cancel' },
                {
                  text: 'Sì, Elimina Tutto',
                  style: 'destructive',
                  onPress: async () => {
                    setResetting(true);
                    try {
                      const collections = [
                        'sessions',
                        'paymentPlans',
                        'trainingPrograms',
                        'workoutPlans',
                        'financialTransactions',
                        'posturalAssessments',
                        'diaryEntries',
                        'specialContent',
                        'nutritionalConsultations',
                        'collaboratorEarnings',
                        'chatRooms',
                        'chatMessages',
                      ];
                      let totalDeleted = 0;
                      for (const col of collections) {
                        totalDeleted += await deleteCollection(col);
                      }
                      await loadData();
                      crossAlert('Reset Completato', `${totalDeleted} documenti eliminati.`);
                    } catch {
                      crossAlert('Errore', 'Impossibile completare il reset. Alcuni dati potrebbero essere stati eliminati.');
                    } finally {
                      setResetting(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const periods = [
    { key: 'week' as const, label: 'Settimana' },
    { key: 'month' as const, label: 'Mese' },
    { key: 'year' as const, label: 'Anno' },
  ];

  const parsePrintDate = (str: string): Date | null => {
    if (!str) return null;
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
    if (str.includes('-')) return new Date(str);
    return null;
  };

  const getFilteredSessions = () => {
    const start = parsePrintDate(printStartDate);
    const end = parsePrintDate(printEndDate);
    if (!start || !end) return [];
    end.setHours(23, 59, 59, 999);
    return allSessions.filter((s) => {
      const d = toSafeDate(s.date);
      return d >= start && d <= end;
    });
  };

  const handlePrintStaff = () => {
    const start = parsePrintDate(printStartDate);
    const end = parsePrintDate(printEndDate);
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      crossAlert('Errore', 'Inserisci date valide');
      return;
    }
    const filtered = getFilteredSessions();
    end.setHours(23, 59, 59, 999);
    const filteredTx = transactions.filter((t) => {
      const d = toSafeDate(t.date);
      return d >= start && d <= end;
    });
    const staff = [
      ...managers.map((m) => ({ id: m.id, name: m.name, surname: m.surname, role: 'manager', commissionPercentage: m.commissionPercentage })),
      ...collaborators.map((c) => ({ id: c.id, name: c.name, surname: c.surname, role: 'collaborator', commissionPercentage: c.commissionPercentage, collaboratorType: c.collaboratorType })),
    ];
    printStaffReport({ staff, sessions: filtered, transactions: filteredTx, startDate: start.toLocaleDateString('it-IT'), endDate: end.toLocaleDateString('it-IT'), students: studentsData });
  };

  const handlePrintOwner = () => {
    const start = parsePrintDate(printStartDate);
    const end = parsePrintDate(printEndDate);
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      crossAlert('Errore', 'Inserisci date valide');
      return;
    }
    const filtered = getFilteredSessions();
    end.setHours(23, 59, 59, 999);
    const filteredTx = transactions.filter((t) => {
      const d = toSafeDate(t.date);
      return d >= start && d <= end;
    });
    const staff = [
      ...managers.map((m) => ({ id: m.id, name: m.name, surname: m.surname, role: 'manager', commissionPercentage: m.commissionPercentage })),
      ...collaborators.map((c) => ({ id: c.id, name: c.name, surname: c.surname, role: 'collaborator', commissionPercentage: c.commissionPercentage, collaboratorType: c.collaboratorType })),
    ];
    printOwnerReport({
      ownerName: `${user?.name || ''} ${(user as any)?.surname || ''}`.trim(),
      ownerId: user?.id || '',
      sessions: filtered, transactions: filteredTx, staff, students: studentsData,
      startDate: start.toLocaleDateString('it-IT'), endDate: end.toLocaleDateString('it-IT'),
    });
  };

  const handleAIWeeklySummary = async () => {
    if (!(await ensureAIApiKey())) {
      crossAlert('API Key mancante', 'Inserisci la chiave API Anthropic nelle impostazioni AI.');
      return;
    }

    setAiSummaryLoading(true);
    setShowAiSummaryModal(true);
    setAiSummaryText('');

    try {
      // Build student data from sessions in the last 7 days
      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const studentSummaries = studentsData.map((student) => {
        const studentSessions = allSessions.filter(
          (s) => s.studentId === student.id
        );
        const weekSessions = studentSessions.filter((s) => {
          const d = toSafeDate(s.date);
          return d >= weekAgo && d <= now;
        });
        const completed = weekSessions.filter(
          (s) => s.status === 'completed'
        ).length;
        const planned = weekSessions.length;
        const noShows = weekSessions.filter(
          (s) => s.status === 'no_show'
        ).length;
        const cancelled = weekSessions.filter(
          (s) => s.status === 'cancelled_by_student' || s.status === 'cancelled_late'
        ).length;

        let notes = '';
        if (noShows > 0) notes += `${noShows} no-show. `;
        if (cancelled > 0) notes += `${cancelled} cancellazioni. `;

        return {
          name: `${student.name} ${student.surname}`,
          sessionsCompleted: completed,
          sessionsPlanned: planned,
          notes: notes.trim(),
        };
      });

      const periodStr = `${weekAgo.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} - ${now.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}`;

      const summary = await generateWeeklySummary({
        coachName: `${user?.name || ''} ${(user as any)?.surname || ''}`.trim(),
        students: studentSummaries,
        period: periodStr,
      });

      setAiSummaryText(summary);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore nella generazione del riepilogo';
      crossAlert('Errore', msg);
      setShowAiSummaryModal(false);
    } finally {
      setAiSummaryLoading(false);
    }
  };

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

    for (const plan of allPaymentPlans) {
      for (const inst of plan.installments) {
        if (inst.status === 'paid') totalCollected += inst.amount;
        else {
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
    return { totalCollected, totalOutstanding, overdueCount, activePlans, totalLessons, usedLessons, totalConsultations, usedConsultations, activeCourses };
  }, [allPaymentPlans]);

  const combinedIncome = totalRevenue + planStats.totalCollected;
  const combinedProfit = combinedIncome - totalExpenses;

  const coachRevenueData = getRevenueByCoach();
  const sessionsData = getSessionsByStatus();
  const studentsByCoachData = getStudentsByCoach();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.headerIcon}
            />
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
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Esci</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.roleBadge}>Ruolo: {user?.role?.toUpperCase()}</Text>
      </View>

      <InstallPrompt />
      <NotificationPrompt />

      {/* Stampa Report */}
      {Platform.OS === 'web' && (
        <View style={styles.printSection}>
          <Text style={styles.sectionTitle}>Stampa Report</Text>
          <Card>
            <View style={styles.printHeader}>
              <Ionicons name="print-outline" size={20} color={colors.accent} />
              <Text style={styles.printTitle}>Seleziona periodo</Text>
            </View>
            <View style={styles.printDateRow}>
              <View style={styles.printDateField}>
                <Text style={styles.printDateLabel}>Da</Text>
                <input
                  type="date"
                  value={printStartDate}
                  onChange={(e: any) => setPrintStartDate(e.target.value)}
                  style={{ fontSize: 14, padding: 8, borderRadius: 8, border: '1px solid #333', background: '#1a1a1a', color: '#fff', width: '100%' } as any}
                />
              </View>
              <View style={styles.printDateField}>
                <Text style={styles.printDateLabel}>A</Text>
                <input
                  type="date"
                  value={printEndDate}
                  onChange={(e: any) => setPrintEndDate(e.target.value)}
                  style={{ fontSize: 14, padding: 8, borderRadius: 8, border: '1px solid #333', background: '#1a1a1a', color: '#fff', width: '100%' } as any}
                />
              </View>
            </View>
            <View style={styles.printButtons}>
              <Button
                title="Le mie lezioni + Staff completo"
                onPress={handlePrintOwner}
                icon={<Ionicons name="person" size={16} color="#fff" />}
              />
              <Button
                title="Solo Staff (Manager, Coach, Nutrizionisti)"
                variant="outline"
                onPress={handlePrintStaff}
                icon={<Ionicons name="people-outline" size={16} color={colors.accent} />}
              />
            </View>
          </Card>
        </View>
      )}

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

      {/* AI Weekly Summary */}
      <TouchableOpacity
        style={styles.aiSummaryCard}
        onPress={handleAIWeeklySummary}
        disabled={aiSummaryLoading}
      >
        <View style={styles.aiSummaryCardInner}>
          <View style={styles.aiSummaryIconContainer}>
            <Ionicons name="sparkles" size={24} color={colors.textOnAccent} />
          </View>
          <View style={styles.aiSummaryCardInfo}>
            <Text style={styles.aiSummaryCardTitle}>Riepilogo AI Settimanale</Text>
            <Text style={styles.aiSummaryCardDesc}>
              Analisi intelligente dell'andamento dei tuoi allievi
            </Text>
          </View>
          {aiSummaryLoading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons name="chevron-forward" size={20} color={colors.accent} />
          )}
        </View>
      </TouchableOpacity>

      {/* Scorciatoia gestione spazio */}
      <TouchableOpacity
        style={styles.shortcutCard}
        onPress={() => navigation.navigate('Spazio')}
        activeOpacity={0.7}
      >
        <View style={styles.shortcutIconContainer}>
          <Ionicons name="server" size={22} color={colors.accent} />
        </View>
        <View style={styles.shortcutInfo}>
          <Text style={styles.shortcutTitle}>Gestione Spazio</Text>
          <Text style={styles.shortcutDesc}>
            Libera spazio eliminando foto e file vecchi
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.accent} />
      </TouchableOpacity>

      {/* Scorciatoia QR accesso */}
      <TouchableOpacity
        style={styles.shortcutCard}
        onPress={() => navigation.navigate('QRAccesso')}
        activeOpacity={0.7}
      >
        <View style={styles.shortcutIconContainer}>
          <Ionicons name="qr-code" size={22} color={colors.accent} />
        </View>
        <View style={styles.shortcutInfo}>
          <Text style={styles.shortcutTitle}>QR Accesso</Text>
          <Text style={styles.shortcutDesc}>
            Mostra e stampa il QR per il check-in in palestra
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.accent} />
      </TouchableOpacity>

      {/* Stato ESSĒRE del team — check-in mente-corpo di oggi */}
      {wellnessToday.length > 0 && (
        <View style={styles.wellnessCard}>
          <View style={styles.wellnessHeader}>
            <Ionicons name="pulse" size={20} color={colors.accent} />
            <Text style={styles.wellnessTitle}>Stato Allievi oggi</Text>
            <Text style={styles.wellnessAvg}>
              media {Math.round(wellnessToday.reduce((s, c) => s + c.score, 0) / wellnessToday.length)}
            </Text>
          </View>
          {wellnessToday.slice(0, 8).map((c) => (
            <View key={c.id} style={styles.wellnessRow}>
              <View
                style={[
                  styles.wellnessDot,
                  { backgroundColor: c.score >= 75 ? colors.success : c.score >= 50 ? colors.warning : colors.error },
                ]}
              />
              <Text style={styles.wellnessName} numberOfLines={1}>{c.studentName}</Text>
              <Text style={styles.wellnessScore}>{c.score}</Text>
              {c.score < 50 && (
                <Text style={styles.wellnessFlag}>da attenzionare</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* AI Summary Modal */}
      <Modal visible={showAiSummaryModal} animationType="slide" transparent>
        <View style={styles.aiSummaryModalOverlay}>
          <View style={styles.aiSummaryModalContent}>
            <View style={styles.aiSummaryModalHeader}>
              <View style={styles.aiSummaryModalTitleRow}>
                <Ionicons name="sparkles" size={22} color={colors.accent} />
                <Text style={styles.aiSummaryModalTitle}>Riepilogo AI Settimanale</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAiSummaryModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.aiSummaryScrollView} showsVerticalScrollIndicator={false}>
              {aiSummaryLoading ? (
                <View style={styles.aiSummaryLoadingContainer}>
                  <ActivityIndicator size="large" color={colors.accent} />
                  <Text style={styles.aiSummaryLoadingText}>Generazione in corso...</Text>
                  <Text style={styles.aiSummaryLoadingSubtext}>L'AI sta analizzando i dati della settimana</Text>
                </View>
              ) : (
                <Text style={styles.aiSummaryResultText}>{aiSummaryText}</Text>
              )}
            </ScrollView>

            {!aiSummaryLoading && (
              <TouchableOpacity
                style={styles.aiSummaryCloseBtn}
                onPress={() => setShowAiSummaryModal(false)}
              >
                <Text style={styles.aiSummaryCloseBtnText}>Chiudi</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Statistiche rapide */}
      <View style={styles.statsRow}>
        <StatCard
          title="Ricavi Totali"
          value={`€${combinedIncome.toLocaleString()}`}
          subtitle={`Transazioni €${totalRevenue.toLocaleString()} + Piani €${planStats.totalCollected.toLocaleString()}`}
          color={colors.success}
        />
        <StatCard
          title="Allievi"
          value={totalStudents}
          subtitle="Attivi"
          color={colors.info}
        />
      </View>

      <View style={styles.statsRow}>
        <StatCard
          title="Manager"
          value={managers.length}
          color={colors.managerBadge}
        />
        <StatCard
          title="Collaboratori"
          value={collaborators.length}
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
          title="Totale Sessioni"
          value={allSessions.length}
          color={colors.info}
        />
      </View>

      {/* Panoramica Pagamenti */}
      <Text style={styles.sectionTitle}>Panoramica Pagamenti</Text>
      <View style={styles.statsRow}>
        <StatCard
          title="Incassato"
          value={`€${planStats.totalCollected.toLocaleString()}`}
          subtitle="Da piani pagamento"
          color={colors.success}
        />
        <StatCard
          title="Da incassare"
          value={`€${planStats.totalOutstanding.toLocaleString()}`}
          subtitle="In sospeso"
          color={colors.warning}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          title="Piani Attivi"
          value={planStats.activePlans}
          subtitle={planStats.activeCourses > 0 ? `${planStats.activeCourses} corsi` : undefined}
          color={colors.info}
        />
        <StatCard
          title="Rate Scadute"
          value={planStats.overdueCount}
          subtitle="Da sollecitare"
          color={colors.error}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          title="Lezioni"
          value={`${planStats.usedLessons}/${planStats.totalLessons}`}
          subtitle={`${planStats.totalLessons - planStats.usedLessons} rimanenti`}
          color={colors.info}
        />
        <StatCard
          title="Consulenze"
          value={`${planStats.usedConsultations}/${planStats.totalConsultations}`}
          subtitle={`${planStats.totalConsultations - planStats.usedConsultations} rimanenti`}
          color={colors.warning}
        />
      </View>

      {/* Profitto netto */}
      <View style={styles.profitCard}>
        <Text style={styles.profitLabel}>Profitto Netto</Text>
        <Text style={[
          styles.profitValue,
          { color: combinedProfit >= 0 ? colors.success : colors.error },
        ]}>
          €{combinedProfit.toLocaleString()}
        </Text>
        <View style={styles.profitBar}>
          <View style={[
            styles.profitBarFill,
            {
              width: combinedIncome > 0
                ? `${Math.min((combinedIncome / (combinedIncome + totalExpenses)) * 100, 100)}%`
                : '0%',
              backgroundColor: colors.success,
            },
          ]} />
        </View>
        <View style={styles.profitLegend}>
          <Text style={[styles.profitLegendText, { color: colors.success }]}>
            Ricavi €{combinedIncome.toLocaleString()}
          </Text>
          <Text style={[styles.profitLegendText, { color: colors.error }]}>
            Spese €{totalExpenses.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Grafico Ricavi per Coach */}
      <View style={styles.chartSection}>
        <BarChart
          data={coachRevenueData.length > 0 ? coachRevenueData : [{ label: 'Nessun coach', value: 0 }]}
          title="Ricavi per Coach"
          height={200}
        />
      </View>

      {/* Grafico Sessioni */}
      <View style={styles.chartSection}>
        <BarChart
          data={sessionsData}
          title="Riepilogo Sessioni"
          height={180}
          formatValue={(v) => String(v)}
        />
      </View>

      {/* Grafico Allievi per Coach */}
      <View style={styles.chartSection}>
        <BarChart
          data={studentsByCoachData.length > 0 ? studentsByCoachData : [{ label: 'Nessun coach', value: 0 }]}
          title="Allievi per Coach"
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

      {/* Promemoria Pagamenti WhatsApp */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { margin: 0 }]}>Promemoria WhatsApp {paymentReminders.length > 0 ? `(${paymentReminders.length})` : ''}</Text>
        {paymentReminders.filter((r) => r.studentPhone).length > 0 && (
          <TouchableOpacity
            style={styles.sendAllButton}
            onPress={async () => {
              const withPhone = paymentReminders.filter((r) => r.studentPhone);
              crossAlert(
                'Invia Promemoria',
                `Stai per aprire WhatsApp per ${withPhone.length} promemoria.\nOgni messaggio si aprirà in sequenza.`,
                [
                  { text: 'Annulla', style: 'cancel' },
                  {
                    text: 'Invia Tutti',
                    onPress: async () => {
                      for (const r of withPhone) {
                        await sendWhatsAppReminder(r.studentPhone, r.body);
                        await new Promise((res) => setTimeout(res, 1500));
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="logo-whatsapp" size={16} color="#FFF" />
            <Text style={styles.sendAllButtonText}>Invia Tutti</Text>
          </TouchableOpacity>
        )}
      </View>
      {paymentReminders.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>Nessuna rata in scadenza nei prossimi 7 giorni</Text>
        </Card>
      ) : (
        paymentReminders.map((reminder, idx) => {
          const diffDays = reminder.data?.dueDate
            ? Math.ceil(
                (new Date(reminder.data.dueDate.split('/').reverse().join('-')).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24)
              )
            : 99;
          const urgencyColor = diffDays <= 0 ? colors.error : diffDays <= 1 ? colors.warning : colors.info;
          const urgencyLabel = diffDays <= 0 ? 'Scaduta' : diffDays <= 1 ? 'Domani' : `Tra ${diffDays}g`;
          return (
            <Card key={idx} variant="elevated" style={styles.reminderCard}>
              <View style={styles.reminderHeader}>
                <View style={styles.reminderInfo}>
                  <Text style={styles.reminderStudentName}>{reminder.studentFullName}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor + '20' }]}>
                      <Text style={[styles.urgencyText, { color: urgencyColor }]}>{urgencyLabel}</Text>
                    </View>
                    {reminder.data?.dueDate && (
                      <Text style={styles.reminderDueDate}>{reminder.data.dueDate}</Text>
                    )}
                  </View>
                </View>
                {reminder.data?.amount && (
                  <Text style={styles.reminderAmount}>€{reminder.data.amount}</Text>
                )}
              </View>
              <Text style={styles.reminderBody} numberOfLines={3}>{reminder.body}</Text>
              <View style={styles.reminderActions}>
                {reminder.studentPhone ? (
                  <TouchableOpacity
                    style={styles.whatsappButton}
                    onPress={() => sendWhatsAppReminder(reminder.studentPhone, reminder.body)}
                  >
                    <Ionicons name="logo-whatsapp" size={16} color="#FFF" />
                    <Text style={styles.whatsappButtonText}>Invia WhatsApp</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.noPhoneText}>Telefono non disponibile</Text>
                )}
              </View>
            </Card>
          );
        })
      )}

      {/* Rendimento Manager */}
      <Text style={styles.sectionTitle}>Rendimento Manager</Text>
      {managers.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>Nessun manager registrato</Text>
        </Card>
      ) : (
        managers.map((mgr) => (
          <Card key={mgr.id} variant="elevated">
            <View style={styles.collabRow}>
              <View style={styles.collabInfo}>
                <Text style={styles.collabName}>
                  {mgr.name} {mgr.surname}
                </Text>
                <Text style={styles.collabStudents}>
                  {mgr.assignedCollaborators.length} collaboratori · {mgr.assignedStudents.length} allievi diretti
                </Text>
              </View>
              <View style={styles.collabEarnings}>
                <Text style={[styles.collabAmount, { color: colors.managerBadge }]}>
                  {mgr.commissionPercentage}%
                </Text>
                <Text style={styles.collabLabel}>commissione</Text>
              </View>
            </View>
          </Card>
        ))
      )}

      {/* Rendimento collaboratori */}
      <Text style={styles.sectionTitle}>Rendimento Collaboratori</Text>
      {collaborators.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>Nessun collaboratore registrato</Text>
        </Card>
      ) : (
        collaborators.map((collab) => (
          <Card key={collab.id} variant="elevated">
            <View style={styles.collabRow}>
              <View style={styles.collabInfo}>
                <Text style={styles.collabName}>
                  {collab.name} {collab.surname}
                </Text>
                <Text style={styles.collabStudents}>
                  {collab.assignedStudents.length} allievi
                </Text>
              </View>
              <View style={styles.collabEarnings}>
                <Text style={styles.collabAmount}>
                  {collab.commissionPercentage}%
                </Text>
                <Text style={styles.collabLabel}>commissione</Text>
              </View>
            </View>
          </Card>
        ))
      )}

      {/* Reset dati */}
      <View style={styles.resetSection}>
        <Text style={styles.resetTitle}>Zona Pericolosa</Text>
        <Text style={styles.resetDesc}>
          Elimina tutti i dati dell'app (sessioni, pagamenti, programmi, transazioni). Gli account utente non verranno eliminati.
        </Text>
        <Button
          title={resetting ? 'Reset in corso...' : 'Reset Tutti i Dati'}
          onPress={handleResetAllData}
          variant="danger"
          loading={resetting}
        />
      </View>

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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
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
    color: colors.textLight,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
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
  profitCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  profitLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profitValue: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  profitBar: {
    height: 8,
    backgroundColor: colors.error + '30',
    borderRadius: 4,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  profitBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  profitLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  profitLegendText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
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
    color: colors.success,
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
  reminderCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderStudentName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  reminderTitle: {
    fontSize: fontSize.sm,
    color: colors.warning,
    fontWeight: '600',
    marginTop: 2,
  },
  reminderAmount: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.error,
  },
  reminderBody: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  reminderActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  whatsappButtonText: {
    color: '#FFF',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  noPhoneText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  reminderDueDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sendAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#25D366',
    borderRadius: borderRadius.round,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  sendAllButtonText: {
    color: '#FFF',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  urgencyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
  },
  urgencyText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  resetSection: {
    margin: spacing.md,
    marginTop: spacing.xxl,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  resetTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.error,
    marginBottom: spacing.xs,
  },
  resetDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
  printSection: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
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
  printButtons: {
    gap: spacing.sm,
  },
  aiSummaryCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accent + '40',
    ...shadows.small,
  },
  aiSummaryCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  aiSummaryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiSummaryCardInfo: {
    flex: 1,
  },
  shortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  shortcutIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortcutInfo: {
    flex: 1,
  },
  shortcutTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  shortcutDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  wellnessCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  wellnessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  wellnessTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  wellnessAvg: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  wellnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  wellnessDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  wellnessName: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  wellnessScore: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  wellnessFlag: {
    fontSize: fontSize.xs,
    color: colors.error,
    fontWeight: '700',
  },
  aiSummaryCardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  aiSummaryCardDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  aiSummaryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  aiSummaryModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  aiSummaryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  aiSummaryModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  aiSummaryModalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  aiSummaryScrollView: {
    maxHeight: 500,
  },
  aiSummaryLoadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  aiSummaryLoadingText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.accent,
    marginTop: spacing.sm,
  },
  aiSummaryLoadingSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  aiSummaryResultText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  aiSummaryCloseBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  aiSummaryCloseBtnText: {
    color: colors.textOnAccent,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
