import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { ModalHeader } from '../../components/common/ModalHeader';
import { WorkoutLog, ExerciseLog, User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import {
  subscribeToActiveWorkouts,
  getCollaboratorWorkoutLogs,
  getAllWorkoutLogs,
  subscribeToWorkoutLog,
  deleteWorkoutLog,
} from '../../services/workoutLogService';
import { getUserProfile } from '../../services/authService';
import { crossAlert } from '../../utils/alert';

const DAYS = ['Lunedi', 'Martedi', 'Mercoledi', 'Giovedi', 'Venerdi', 'Sabato', 'Domenica'];

export const WorkoutMonitorScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user, isOwner, isManager } = useAuth();
  const canSeeAll = isOwner || isManager;
  const [activeWorkouts, setActiveWorkouts] = useState<WorkoutLog[]>([]);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutLog | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<WorkoutLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [studentHistoryLogs, setStudentHistoryLogs] = useState<WorkoutLog[]>([]);
  const [showStudentHistory, setShowStudentHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  const unsubActiveRef = useRef<(() => void) | null>(null);
  const unsubDetailRef = useRef<(() => void) | null>(null);

  // Sottoscrivi allenamenti in corso
  useEffect(() => {
    if (!user) return;
    const collaboratorId = canSeeAll ? null : user.id;
    unsubActiveRef.current = subscribeToActiveWorkouts(collaboratorId, async (logs) => {
      setActiveWorkouts(logs);
      // Carica nomi studenti
      const names: Record<string, string> = { ...studentNames };
      for (const log of logs) {
        if (!names[log.studentId]) {
          try {
            const profile = await getUserProfile(log.studentId);
            if (profile) names[log.studentId] = `${profile.name} ${profile.surname}`;
          } catch {}
        }
      }
      setStudentNames(names);
    });

    return () => {
      if (unsubActiveRef.current) unsubActiveRef.current();
    };
  }, [user, canSeeAll]);

  // Dettaglio real-time di un workout selezionato
  useEffect(() => {
    if (!selectedWorkout) {
      if (unsubDetailRef.current) unsubDetailRef.current();
      return;
    }
    unsubDetailRef.current = subscribeToWorkoutLog(selectedWorkout.id, (log) => {
      if (log) setSelectedWorkout(log);
    });
    return () => {
      if (unsubDetailRef.current) unsubDetailRef.current();
    };
  }, [selectedWorkout?.id]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const logs = canSeeAll
        ? await getAllWorkoutLogs()
        : await getCollaboratorWorkoutLogs(user.id);
      setHistoryLogs(logs);

      // Carica nomi
      const names: Record<string, string> = { ...studentNames };
      for (const log of logs) {
        if (!names[log.studentId]) {
          try {
            const profile = await getUserProfile(log.studentId);
            if (profile) names[log.studentId] = `${profile.name} ${profile.surname}`;
          } catch {}
        }
      }
      setStudentNames(names);
    } catch (err) {
      console.error('Errore caricamento storico:', err);
    }
    setRefreshing(false);
    // studentNames intentionally not in deps to avoid re-running on every name resolution
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canSeeAll]);

  // Precarica lo storico all'apertura della schermata cosi' i risultati
  // sono visibili senza dover premere "Storico Risultati"
  useEffect(() => {
    if (user) loadHistory();
  }, [user, canSeeAll, loadHistory]);

  const handleShowStudentHistory = async (studentId: string) => {
    setSelectedStudent(studentId);
    const logs = historyLogs.filter((l) => l.studentId === studentId);
    setStudentHistoryLogs(logs);
    setShowStudentHistory(true);
  };

  const handleDeleteLog = (log: WorkoutLog) => {
    crossAlert(
      'Elimina sessione',
      `Eliminare la sessione del ${formatDateShort(log.startedAt)}? L'operazione non e' reversibile.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWorkoutLog(log.id);
              setActiveWorkouts((prev) => prev.filter((l) => l.id !== log.id));
              setHistoryLogs((prev) => prev.filter((l) => l.id !== log.id));
              setStudentHistoryLogs((prev) => prev.filter((l) => l.id !== log.id));
              if (selectedWorkout?.id === log.id) setSelectedWorkout(null);
            } catch (err) {
              console.error('Errore eliminazione sessione:', err);
              crossAlert('Errore', 'Impossibile eliminare la sessione. Riprova.');
            }
          },
        },
      ]
    );
  };

  const handleClearAllActive = () => {
    if (activeWorkouts.length === 0) return;
    crossAlert(
      'Pulisci Monitor',
      `Eliminare tutti i ${activeWorkouts.length} allenamenti in corso? L'operazione non e' reversibile.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina tutti',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(activeWorkouts.map((w) => deleteWorkoutLog(w.id)));
              setActiveWorkouts([]);
            } catch {
              crossAlert('Errore', 'Impossibile eliminare alcune sessioni.');
            }
          },
        },
      ]
    );
  };

  const handleClearAllHistory = () => {
    if (historyLogs.length === 0) return;
    crossAlert(
      'Pulisci Storico',
      `Eliminare tutti i ${historyLogs.length} allenamenti nello storico? L'operazione non e' reversibile.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina tutti',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(historyLogs.map((w) => deleteWorkoutLog(w.id)));
              setHistoryLogs([]);
              setStudentHistoryLogs([]);
            } catch {
              crossAlert('Errore', 'Impossibile eliminare alcune sessioni.');
            }
          },
        },
      ]
    );
  };

  const formatDateFull = (date: any): string => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatDateShort = (date: any): string => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadHistory} tintColor={colors.accent} />}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Monitor Allenamenti</Text>
        <Text style={styles.subtitle}>Visualizzazione in tempo reale</Text>
      </View>

      {/* ALLENAMENTI IN CORSO */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="pulse" size={20} color={colors.accent} />
          <Text style={styles.sectionTitle}>In Corso Ora</Text>
          {activeWorkouts.length > 0 && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
          {activeWorkouts.length > 0 && (
            <TouchableOpacity onPress={handleClearAllActive} style={styles.clearBtn}>
              <Ionicons name="trash-outline" size={16} color={colors.error} />
              <Text style={styles.clearBtnText}>Pulisci</Text>
            </TouchableOpacity>
          )}
        </View>

        {activeWorkouts.length === 0 ? (
          <Card>
            <View style={styles.emptyContainer}>
              <Ionicons name="fitness-outline" size={40} color={colors.textLight} />
              <Text style={styles.emptyText}>Nessun allenamento in corso</Text>
            </View>
          </Card>
        ) : (
          activeWorkouts.map((workout) => {
            const totalSets = workout.exerciseLogs?.reduce((s, e) => s + e.targetSets, 0) || 0;
            const doneSets = workout.exerciseLogs?.reduce((s, e) => s + e.sets.length, 0) || 0;
            const progress = totalSets > 0 ? (doneSets / totalSets) * 100 : 0;

            return (
              <TouchableOpacity
                key={workout.id}
                onPress={() => setSelectedWorkout(workout)}
              >
                <Card variant="elevated">
                  <View style={styles.workoutRow}>
                    <View style={styles.liveIndicator} />
                    <View style={styles.workoutInfo}>
                      <Text style={styles.studentName}>
                        {studentNames[workout.studentId] || 'Studente...'}
                      </Text>
                      <Text style={styles.workoutDay}>{DAYS[workout.dayOfWeek]}</Text>
                      <View style={styles.miniProgress}>
                        <View style={[styles.miniProgressFill, { width: `${progress}%` }]} />
                      </View>
                      <Text style={styles.workoutStats}>
                        {doneSets}/{totalSets} serie | {workout.exerciseLogs?.filter((e) => e.sets.length > 0).length || 0}/{workout.exerciseLogs?.length || 0} esercizi
                      </Text>
                    </View>
                    <View style={{ alignItems: 'center', gap: spacing.sm }}>
                      <Ionicons name="eye-outline" size={24} color={colors.accent} />
                      <TouchableOpacity
                        onPress={(e) => { e.stopPropagation(); handleDeleteLog(workout); }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* STORICO */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => { loadHistory(); setShowHistory(true); }}
        >
          <Ionicons name="time-outline" size={20} color={colors.accent} />
          <Text style={styles.historyButtonText}>Storico Risultati</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Dettaglio Workout Live */}
      <Modal visible={!!selectedWorkout} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <ModalHeader
              title={studentNames[selectedWorkout?.studentId || ''] || 'Allenamento'}
              onClose={() => setSelectedWorkout(null)}
            />

            {selectedWorkout && (
              <>
                <View style={styles.detailHeader}>
                  <View style={styles.liveBadgeLarge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>
                      {selectedWorkout.status === 'in_progress' ? 'LIVE' : selectedWorkout.status === 'completed' ? 'COMPLETATO' : 'ABBANDONATO'}
                    </Text>
                  </View>
                  <Text style={styles.detailDate}>{formatDateFull(selectedWorkout.startedAt)}</Text>
                  {selectedWorkout.durationMinutes && (
                    <Text style={styles.detailDuration}>Durata: {selectedWorkout.durationMinutes} min</Text>
                  )}
                </View>

                {/* Dettaglio esercizi (solo quelli con almeno una serie registrata) */}
                {selectedWorkout.exerciseLogs?.filter((ex) => ex.sets.length > 0).map((ex, i) => {
                  const done = ex.sets.length >= ex.targetSets;
                  return (
                    <Card key={i} variant={done ? 'outlined' : 'elevated'}>
                      <View style={styles.exHeader}>
                        <View style={[styles.exBadge, { backgroundColor: done ? colors.success : colors.accent }]}>
                          <Text style={styles.exBadgeText}>{i + 1}</Text>
                        </View>
                        <View style={styles.exInfo}>
                          <Text style={styles.exName}>{ex.exerciseName}</Text>
                          <Text style={styles.exTarget}>
                            {ex.sets.length}/{ex.targetSets} serie x {ex.targetReps}
                          </Text>
                          {ex.technique === 'rest_pause' && (
                            <Text style={styles.restPauseTag}>
                              SERIE INTERROTTE · {ex.targetMiniSets || 4} mini da {ex.targetMiniReps || '6'} · rec {ex.targetMiniRestSeconds || 20}s
                            </Text>
                          )}
                          {ex.technique === 'stripping' && (
                            <Text style={styles.restPauseTag}>
                              STRIPPING · {ex.targetStripDrops || 3} scarichi da {ex.targetStripRepsPerDrop || '8'} · max -{ex.targetStripMaxDropPct || 50}%
                            </Text>
                          )}
                        </View>
                        {done && <Ionicons name="checkmark-circle" size={24} color={colors.success} />}
                      </View>

                      <View style={styles.setsTable}>
                        <View style={styles.setsTableHeader}>
                          <Text style={[styles.tableCell, styles.tableHeader]}>#</Text>
                          <Text style={[styles.tableCell, styles.tableHeader, { flex: 2 }]}>Peso</Text>
                          <Text style={[styles.tableCell, styles.tableHeader, { flex: 2 }]}>Reps</Text>
                          <Text style={[styles.tableCell, styles.tableHeader]}>RPE</Text>
                        </View>
                        {ex.sets.map((s, si) => (
                          <View key={si}>
                            <View style={styles.setsTableRow}>
                              <Text style={styles.tableCell}>{s.setNumber}</Text>
                              <Text style={[styles.tableCell, { flex: 2 }]}>
                                {s.weight > 0 ? `${s.weight} kg` : '-'}
                              </Text>
                              <Text style={[styles.tableCell, { flex: 2 }]}>{s.reps}</Text>
                              <Text style={styles.tableCell}>{s.rpe || '-'}</Text>
                            </View>
                            {s.miniSetDetails && s.miniSetDetails.length > 0 && (
                              <Text style={styles.miniSetDetail}>
                                {s.miniSetsCompleted} mini serie: {s.miniSetDetails.map((m) => m.reps).join('/')}
                                {' '}· rec: {s.miniSetDetails.slice(0, -1).map((m) => `${m.restSeconds}s`).join('/') || '-'}
                              </Text>
                            )}
                            {s.dropSetDetails && s.dropSetDetails.length > 0 && (
                              <Text style={styles.miniSetDetail}>
                                Stripping · {s.dropSetsCompleted} drop: {s.dropSetDetails.map((d) => `${d.weight}kg x${d.reps}`).join(' → ')}
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
                    </Card>
                  );
                })}

                {selectedWorkout.notes ? (
                  <Card>
                    <Text style={styles.notesLabel}>Note:</Text>
                    <Text style={styles.notesText}>{selectedWorkout.notes}</Text>
                  </Card>
                ) : null}
              </>
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Modal Storico */}
      <Modal visible={showHistory} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <ModalHeader title="Storico Allenamenti" onClose={() => { setShowHistory(false); setShowStudentHistory(false); setHistorySearch(''); }} />

            {historyLogs.length > 0 && !showStudentHistory && (
              <TouchableOpacity onPress={handleClearAllHistory} style={styles.clearAllRow}>
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={styles.clearAllText}>Pulisci tutto lo storico ({historyLogs.length})</Text>
              </TouchableOpacity>
            )}

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color={colors.textLight} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cerca allievo..."
                placeholderTextColor={colors.textLight}
                value={historySearch}
                onChangeText={setHistorySearch}
              />
              {historySearch.length > 0 && (
                <TouchableOpacity onPress={() => setHistorySearch('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textLight} />
                </TouchableOpacity>
              )}
            </View>

            {!showStudentHistory ? (
              <>
                {/* Raggruppamento per studente */}
                {(() => {
                  const grouped: Record<string, WorkoutLog[]> = {};
                  historyLogs.forEach((log) => {
                    if (!grouped[log.studentId]) grouped[log.studentId] = [];
                    grouped[log.studentId].push(log);
                  });

                  const q = historySearch.toLowerCase();
                  return Object.entries(grouped)
                    .filter(([studentId]) => !q || (studentNames[studentId] || '').toLowerCase().includes(q))
                    .map(([studentId, logs]) => (
                    <TouchableOpacity
                      key={studentId}
                      onPress={() => handleShowStudentHistory(studentId)}
                    >
                      <Card variant="outlined">
                        <View style={styles.groupRow}>
                          <Ionicons name="person-circle-outline" size={32} color={colors.accent} />
                          <View style={styles.groupInfo}>
                            <Text style={styles.groupName}>{studentNames[studentId] || 'Studente'}</Text>
                            <Text style={styles.groupStats}>
                              {logs.length} allenamenti |{' '}
                              {logs.filter((l) => l.status === 'completed').length} completati
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                        </View>
                      </Card>
                    </TouchableOpacity>
                  ));
                })()}
                {historyLogs.length === 0 && (
                  <Text style={styles.emptyText}>Nessun allenamento registrato</Text>
                )}
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setShowStudentHistory(false)}
                >
                  <Ionicons name="arrow-back" size={20} color={colors.accent} />
                  <Text style={styles.backBtnText}>Tutti gli studenti</Text>
                </TouchableOpacity>

                <Text style={styles.studentHistoryTitle}>
                  {studentNames[selectedStudent || ''] || 'Studente'}
                </Text>

                {studentHistoryLogs.map((log) => (
                  <Card key={log.id} variant="outlined">
                    <View style={styles.historyCardRow}>
                      <TouchableOpacity
                        style={styles.historyMain}
                        onPress={() => { setSelectedWorkout(log); setShowHistory(false); }}
                      >
                        <View style={styles.historyRow}>
                          <View style={styles.historyInfo}>
                            <Text style={styles.historyDate}>
                              {formatDateShort(log.startedAt)} - {DAYS[log.dayOfWeek]}
                            </Text>
                            <Text style={styles.historyStats}>
                              {log.exerciseLogs?.reduce((s, e) => s + e.sets.length, 0) || 0} serie |{' '}
                              {log.durationMinutes ? `${log.durationMinutes} min` : '--'}
                            </Text>
                          </View>
                          <View style={[
                            styles.statusBadge,
                            { backgroundColor: log.status === 'completed' ? colors.success : colors.warning },
                          ]}>
                            <Text style={styles.statusText}>
                              {log.status === 'completed' ? 'OK' : 'ABB'}
                            </Text>
                          </View>
                        </View>
                        {/* Mini riepilogo esercizi */}
                        {log.exerciseLogs?.filter((el) => el.sets.length > 0).map((el, i) => (
                          <View key={i} style={styles.miniExRow}>
                            <Text style={styles.miniExName} numberOfLines={1}>{el.exerciseName}</Text>
                            <Text style={styles.miniExSets}>
                              {el.sets.map((s) => `${s.weight}x${s.reps}`).join(' | ')}
                            </Text>
                          </View>
                        ))}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteLog(log)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))}
              </>
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </Modal>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textOnPrimary },
  subtitle: { fontSize: fontSize.md, color: colors.accent, marginTop: 2, fontWeight: '600' },
  section: { padding: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, flex: 1 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
  },
  liveBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    alignSelf: 'flex-start',
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  liveText: { color: colors.error, fontSize: fontSize.xs, fontWeight: '800' },
  emptyContainer: { alignItems: 'center', padding: spacing.xl },
  emptyText: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md },
  workoutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  liveIndicator: { width: 4, height: 40, borderRadius: 2, backgroundColor: colors.error },
  workoutInfo: { flex: 1 },
  studentName: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  workoutDay: { fontSize: fontSize.sm, color: colors.textSecondary },
  miniProgress: {
    height: 4,
    backgroundColor: colors.surfaceLight,
    borderRadius: 2,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  miniProgressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 2 },
  workoutStats: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: 0,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyButtonText: { color: colors.accent, fontSize: fontSize.md, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  detailHeader: { marginBottom: spacing.md },
  detailDate: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.xs },
  detailDuration: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  exHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  exBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  exBadgeText: { color: '#FFF', fontWeight: '700', fontSize: fontSize.md },
  exInfo: { flex: 1 },
  exName: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  exTarget: { fontSize: fontSize.sm, color: colors.textSecondary },
  restPauseTag: { fontSize: fontSize.xs, color: colors.accent, fontWeight: '700', marginTop: 2 },
  miniSetDetail: { fontSize: fontSize.xs, color: colors.accent, paddingBottom: spacing.xs, paddingLeft: spacing.sm },
  setsTable: { marginTop: spacing.md },
  setsTableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.divider, paddingBottom: spacing.xs },
  setsTableRow: { flexDirection: 'row', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.divider },
  tableCell: { flex: 1, fontSize: fontSize.sm, color: colors.text, textAlign: 'center' },
  tableHeader: { fontWeight: '700', color: colors.textSecondary },
  notesLabel: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  notesText: { fontSize: fontSize.md, color: colors.text, marginTop: spacing.xs },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  groupInfo: { flex: 1 },
  groupName: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  groupStats: { fontSize: fontSize.sm, color: colors.textSecondary },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  backBtnText: { color: colors.accent, fontSize: fontSize.md, fontWeight: '600' },
  studentHistoryTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  historyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  historyInfo: { flex: 1 },
  historyCardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  historyMain: { flex: 1 },
  deleteBtn: {
    padding: spacing.xs,
    borderRadius: borderRadius.round,
    alignSelf: 'flex-start',
  },
  historyDate: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  historyStats: { fontSize: fontSize.sm, color: colors.textSecondary },
  statusBadge: { borderRadius: borderRadius.md, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  statusText: { color: '#FFF', fontSize: fontSize.xs, fontWeight: '700' },
  miniExRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 2, paddingLeft: spacing.md },
  miniExName: { fontSize: fontSize.xs, fontWeight: '600', color: colors.text, width: 100 },
  miniExSets: { fontSize: fontSize.xs, color: colors.textSecondary, flex: 1 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.error + '15',
  },
  clearBtnText: { fontSize: fontSize.xs, color: colors.error, fontWeight: '600' },
  clearAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.error + '15',
  },
  clearAllText: { fontSize: fontSize.sm, color: colors.error, fontWeight: '600' },
});
