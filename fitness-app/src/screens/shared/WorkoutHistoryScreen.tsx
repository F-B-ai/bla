import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { ModalHeader } from '../../components/common/ModalHeader';
import { useAuth } from '../../hooks/useAuth';
import { WorkoutLog, ExerciseLog, SetLog, Student } from '../../types';
import {
  getStudentWorkoutLogs,
  getAllWorkoutLogs,
  getCollaboratorWorkoutLogs,
} from '../../services/workoutLogService';
import { getStudents } from '../../services/authService';
import { isStudentAssignedTo } from '../../utils/helpers';

const toSafeDate = (d: unknown): Date => {
  if (d instanceof Date) return d;
  if (d && typeof d === 'object' && 'toDate' in d && typeof (d as any).toDate === 'function')
    return (d as any).toDate();
  if (d && typeof d === 'object' && 'seconds' in d)
    return new Date((d as any).seconds * 1000);
  return new Date(d as string);
};

const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

type ProgressionData = {
  exerciseName: string;
  sessions: {
    date: Date;
    bestWeight: number;
    bestReps: number;
    totalVolume: number;
    sets: SetLog[];
  }[];
};

export const WorkoutHistoryScreen: React.FC = () => {
  const { user, isOwner, isManager, isCollaborator, isStudent } = useAuth();
  const insets = useSafeAreaInsets();
  const isStaff = isOwner || isManager || isCollaborator;

  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<WorkoutLog | null>(null);
  const [showProgressionModal, setShowProgressionModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      if (isStudent) {
        const studentLogs = await getStudentWorkoutLogs(user.id);
        setLogs(studentLogs);
      } else if (isOwner) {
        const [allLogs, studs] = await Promise.all([
          getAllWorkoutLogs(),
          getStudents(),
        ]);
        setLogs(allLogs);
        setStudents(studs);
      } else {
        const [collabLogs, studs] = await Promise.all([
          getCollaboratorWorkoutLogs(user.id),
          getStudents(),
        ]);
        setLogs(collabLogs);
        if (isManager) {
          setStudents(studs.filter(s => isStudentAssignedTo(s, user.id) || s.assignedManagerId === user.id));
        } else {
          setStudents(studs.filter(s => isStudentAssignedTo(s, user.id)));
        }
      }
    } catch (err) {
      console.error('Error loading workout history:', err);
    }
  }, [user, isStudent, isOwner, isManager]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getStudentName = (id: string) => {
    if (isStudent) return `${user?.name} ${user?.surname}`;
    const s = students.find(st => st.id === id);
    return s ? `${s.name} ${s.surname}` : 'Allievo';
  };

  const filteredLogs = useMemo(() => {
    let result = logs.filter(l => l.status === 'completed');
    if (isStaff && selectedStudentId) {
      result = result.filter(l => l.studentId === selectedStudentId);
    }
    return result;
  }, [logs, selectedStudentId, isStaff]);

  const studentList = useMemo(() => {
    if (isStudent) return [];
    const ids = new Set(logs.filter(l => l.status === 'completed').map(l => l.studentId));
    return students.filter(s => ids.has(s.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [logs, students, isStudent]);

  const progressionData = useMemo((): ProgressionData[] => {
    const targetLogs = selectedStudentId
      ? filteredLogs.filter(l => l.studentId === selectedStudentId)
      : filteredLogs;

    const exerciseMap: Record<string, ProgressionData['sessions']> = {};

    for (const log of targetLogs) {
      const logDate = toSafeDate(log.startedAt || log.date);
      for (const ex of log.exerciseLogs) {
        if (ex.sets.length === 0) continue;
        const name = ex.exerciseName;
        if (!exerciseMap[name]) exerciseMap[name] = [];

        let bestWeight = 0;
        let bestReps = 0;
        let totalVolume = 0;
        for (const s of ex.sets) {
          if (s.weight > bestWeight) bestWeight = s.weight;
          if (s.reps > bestReps) bestReps = s.reps;
          totalVolume += s.weight * s.reps;
        }

        exerciseMap[name].push({ date: logDate, bestWeight, bestReps, totalVolume, sets: ex.sets });
      }
    }

    return Object.entries(exerciseMap)
      .map(([exerciseName, sessions]) => ({
        exerciseName,
        sessions: sessions.sort((a, b) => a.date.getTime() - b.date.getTime()),
      }))
      .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
  }, [filteredLogs, selectedStudentId]);

  const formatDate = (d: unknown) => {
    const date = toSafeDate(d);
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const formatDuration = (min?: number) => {
    if (!min) return '-';
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)}h ${min % 60}m`;
  };

  const getProgressionTrend = (prog: ProgressionData) => {
    if (prog.sessions.length < 2) return null;
    const last = prog.sessions[prog.sessions.length - 1];
    const prev = prog.sessions[prog.sessions.length - 2];
    const volDiff = last.totalVolume - prev.totalVolume;
    const weightDiff = last.bestWeight - prev.bestWeight;
    if (volDiff > 0 || weightDiff > 0) return 'up';
    if (volDiff < 0 && weightDiff < 0) return 'down';
    return 'same';
  };

  const renderLogDetail = () => {
    if (!selectedLog) return null;
    const logDate = toSafeDate(selectedLog.startedAt || selectedLog.date);

    return (
      <Modal visible={!!selectedLog} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ModalHeader
              title="Dettaglio Allenamento"
              onClose={() => setSelectedLog(null)}
            />
            <ScrollView>
              <View style={styles.detailHeader}>
                {isStaff && (
                  <Text style={styles.detailStudent}>{getStudentName(selectedLog.studentId)}</Text>
                )}
                <Text style={styles.detailDate}>
                  {DAYS[selectedLog.dayOfWeek]} {logDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
                <View style={styles.detailStats}>
                  <View style={styles.detailStatItem}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.detailStatText}>{formatDuration(selectedLog.durationMinutes)}</Text>
                  </View>
                  <View style={styles.detailStatItem}>
                    <Ionicons name="barbell-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.detailStatText}>
                      {selectedLog.exerciseLogs.filter(e => e.sets.length > 0).length} esercizi
                    </Text>
                  </View>
                  <View style={styles.detailStatItem}>
                    <Ionicons name="layers-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.detailStatText}>
                      {selectedLog.exerciseLogs.reduce((sum, e) => sum + e.sets.length, 0)} serie
                    </Text>
                  </View>
                </View>
              </View>

              {selectedLog.exerciseLogs.filter(e => e.sets.length > 0).map((ex, idx) => {
                const totalVol = ex.sets.reduce((s, set) => s + set.weight * set.reps, 0);
                return (
                  <View key={idx} style={styles.exerciseBlock}>
                    <View style={styles.exerciseHeader}>
                      <View style={styles.exerciseNumBadge}>
                        <Text style={styles.exerciseNum}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
                        <Text style={styles.exerciseTarget}>
                          Target: {ex.targetSets} x {ex.targetReps}
                        </Text>
                      </View>
                      <Text style={styles.volumeText}>{totalVol > 0 ? `${totalVol} kg vol` : ''}</Text>
                    </View>

                    <View style={styles.setTable}>
                      <View style={styles.setTableHeader}>
                        <Text style={[styles.setTableCell, styles.setTableHeaderText, { width: 40 }]}>Serie</Text>
                        <Text style={[styles.setTableCell, styles.setTableHeaderText, { flex: 1 }]}>Peso</Text>
                        <Text style={[styles.setTableCell, styles.setTableHeaderText, { flex: 1 }]}>Reps</Text>
                        <Text style={[styles.setTableCell, styles.setTableHeaderText, { width: 50 }]}>RPE</Text>
                      </View>
                      {ex.sets.map((set, si) => (
                        <View key={si} style={styles.setTableRow}>
                          <Text style={[styles.setTableCell, { width: 40, color: colors.textSecondary }]}>{set.setNumber}</Text>
                          <Text style={[styles.setTableCell, { flex: 1, fontWeight: '700', color: colors.text }]}>
                            {set.weight > 0 ? `${set.weight} kg` : 'BW'}
                          </Text>
                          <Text style={[styles.setTableCell, { flex: 1, fontWeight: '600', color: colors.accent }]}>
                            {set.reps}
                          </Text>
                          <Text style={[styles.setTableCell, { width: 50, color: colors.textSecondary }]}>
                            {set.rpe ? set.rpe : '-'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}

              {selectedLog.notes ? (
                <View style={styles.notesBlock}>
                  <Text style={styles.notesLabel}>Note</Text>
                  <Text style={styles.notesText}>{selectedLog.notes}</Text>
                </View>
              ) : null}

              <View style={{ height: 60 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderProgressionModal = () => {
    const prog = progressionData.find(p => p.exerciseName === selectedExercise);
    if (!prog) return null;

    return (
      <Modal visible={showProgressionModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ModalHeader
              title={`Progressione: ${prog.exerciseName}`}
              onClose={() => { setShowProgressionModal(false); setSelectedExercise(null); }}
            />
            <ScrollView>
              {prog.sessions.map((sess, idx) => {
                const prevSess = idx > 0 ? prog.sessions[idx - 1] : null;
                const volDiff = prevSess ? sess.totalVolume - prevSess.totalVolume : 0;
                const weightDiff = prevSess ? sess.bestWeight - prevSess.bestWeight : 0;

                return (
                  <View key={idx} style={styles.progSession}>
                    <View style={styles.progDateRow}>
                      <Text style={styles.progDate}>
                        {sess.date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </Text>
                      {volDiff !== 0 && (
                        <View style={[styles.progTrendBadge, { backgroundColor: volDiff > 0 ? '#34C75920' : '#FF453A20' }]}>
                          <Ionicons
                            name={volDiff > 0 ? 'trending-up' : 'trending-down'}
                            size={14}
                            color={volDiff > 0 ? '#34C759' : '#FF453A'}
                          />
                          <Text style={{ fontSize: fontSize.xs, color: volDiff > 0 ? '#34C759' : '#FF453A', fontWeight: '600' }}>
                            {volDiff > 0 ? '+' : ''}{volDiff} kg vol
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.progStats}>
                      <Text style={styles.progStatText}>
                        Max: <Text style={{ fontWeight: '700', color: colors.text }}>{sess.bestWeight} kg</Text>
                        {weightDiff !== 0 && (
                          <Text style={{ color: weightDiff > 0 ? '#34C759' : '#FF453A' }}>
                            {' '}({weightDiff > 0 ? '+' : ''}{weightDiff})
                          </Text>
                        )}
                      </Text>
                      <Text style={styles.progStatText}>
                        Volume: <Text style={{ fontWeight: '700', color: colors.text }}>{sess.totalVolume} kg</Text>
                      </Text>
                    </View>

                    <View style={styles.setTable}>
                      <View style={styles.setTableHeader}>
                        <Text style={[styles.setTableCell, styles.setTableHeaderText, { width: 40 }]}>Set</Text>
                        <Text style={[styles.setTableCell, styles.setTableHeaderText, { flex: 1 }]}>Peso</Text>
                        <Text style={[styles.setTableCell, styles.setTableHeaderText, { flex: 1 }]}>Reps</Text>
                        <Text style={[styles.setTableCell, styles.setTableHeaderText, { width: 50 }]}>RPE</Text>
                      </View>
                      {sess.sets.map((set, si) => (
                        <View key={si} style={styles.setTableRow}>
                          <Text style={[styles.setTableCell, { width: 40, color: colors.textSecondary }]}>{set.setNumber}</Text>
                          <Text style={[styles.setTableCell, { flex: 1, fontWeight: '600', color: colors.text }]}>
                            {set.weight > 0 ? `${set.weight} kg` : 'BW'}
                          </Text>
                          <Text style={[styles.setTableCell, { flex: 1, color: colors.accent }]}>{set.reps}</Text>
                          <Text style={[styles.setTableCell, { width: 50, color: colors.textSecondary }]}>{set.rpe || '-'}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
              <View style={{ height: 60 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderLogCard = (log: WorkoutLog) => {
    const logDate = toSafeDate(log.startedAt || log.date);
    const totalSets = log.exerciseLogs.reduce((sum, e) => sum + e.sets.length, 0);
    const totalVol = log.exerciseLogs.reduce((sum, e) =>
      sum + e.sets.reduce((s, set) => s + set.weight * set.reps, 0), 0);
    const exerciseCount = log.exerciseLogs.filter(e => e.sets.length > 0).length;

    return (
      <TouchableOpacity
        key={log.id}
        style={styles.logCard}
        onPress={() => setSelectedLog(log)}
      >
        <View style={styles.logCardHeader}>
          <View style={styles.logDateBadge}>
            <Text style={styles.logDateDay}>{logDate.getDate()}</Text>
            <Text style={styles.logDateMonth}>
              {logDate.toLocaleDateString('it-IT', { month: 'short' })}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.logCardTitle}>{DAYS[log.dayOfWeek]}</Text>
            {isStaff && !selectedStudentId && (
              <Text style={styles.logCardStudent}>{getStudentName(log.studentId)}</Text>
            )}
            <View style={styles.logCardStatsRow}>
              <View style={styles.logCardStat}>
                <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.logCardStatText}>{formatDuration(log.durationMinutes)}</Text>
              </View>
              <View style={styles.logCardStat}>
                <Ionicons name="barbell-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.logCardStatText}>{exerciseCount} es.</Text>
              </View>
              <View style={styles.logCardStat}>
                <Ionicons name="layers-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.logCardStatText}>{totalSets} serie</Text>
              </View>
              {totalVol > 0 && (
                <View style={styles.logCardStat}>
                  <Ionicons name="trending-up-outline" size={12} color={colors.accent} />
                  <Text style={[styles.logCardStatText, { color: colors.accent }]}>{totalVol} kg</Text>
                </View>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
      >
        <View style={{ ...styles.header, paddingTop: insets.top + spacing.md }}>
          <Text style={styles.title}>
            {isStudent ? 'Il Mio Storico' : 'Storico Allenamenti'}
          </Text>
          <Text style={styles.subtitle}>
            {filteredLogs.length} allenament{filteredLogs.length === 1 ? 'o' : 'i'} completat{filteredLogs.length === 1 ? 'o' : 'i'}
          </Text>
        </View>

        {/* Student filter for staff */}
        {isStaff && studentList.length > 0 && (
          <View style={styles.filterSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={[styles.filterChip, !selectedStudentId && styles.filterChipActive]}
                  onPress={() => setSelectedStudentId(null)}
                >
                  <Ionicons name="people" size={14} color={!selectedStudentId ? colors.textOnAccent : colors.textSecondary} />
                  <Text style={[styles.filterChipText, !selectedStudentId && styles.filterChipTextActive]}>
                    Tutti
                  </Text>
                </TouchableOpacity>
                {studentList.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.filterChip, selectedStudentId === s.id && styles.filterChipActive]}
                    onPress={() => setSelectedStudentId(selectedStudentId === s.id ? null : s.id)}
                  >
                    <Text style={[styles.filterChipText, selectedStudentId === s.id && styles.filterChipTextActive]}>
                      {s.name} {s.surname}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Progression section */}
        {progressionData.length > 0 && (isStudent || selectedStudentId) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trending-up" size={18} color={colors.accent} />
              <Text style={styles.sectionTitle}>Progressioni</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.progCardRow}>
                {progressionData.slice(0, 20).map((prog) => {
                  const trend = getProgressionTrend(prog);
                  const last = prog.sessions[prog.sessions.length - 1];
                  return (
                    <TouchableOpacity
                      key={prog.exerciseName}
                      style={styles.progCard}
                      onPress={() => {
                        setSelectedExercise(prog.exerciseName);
                        setShowProgressionModal(true);
                      }}
                    >
                      <Text style={styles.progCardName} numberOfLines={2}>{prog.exerciseName}</Text>
                      <Text style={styles.progCardWeight}>{last.bestWeight} kg</Text>
                      <View style={styles.progCardBottom}>
                        <Text style={styles.progCardSessions}>{prog.sessions.length} sedute</Text>
                        {trend && (
                          <Ionicons
                            name={trend === 'up' ? 'arrow-up-circle' : trend === 'down' ? 'arrow-down-circle' : 'remove-circle'}
                            size={18}
                            color={trend === 'up' ? '#34C759' : trend === 'down' ? '#FF453A' : colors.textLight}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Workout list */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={18} color={colors.info} />
            <Text style={styles.sectionTitle}>Storico Sedute</Text>
          </View>
          {filteredLogs.length === 0 ? (
            <Text style={styles.emptyText}>Nessun allenamento completato</Text>
          ) : (
            filteredLogs.map(renderLogCard)
          )}
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {renderLogDetail()}
      {renderProgressionModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingBottom: spacing.xxl },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textOnPrimary },
  subtitle: { fontSize: fontSize.md, color: colors.textLight, marginTop: spacing.xs },

  filterSection: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  filterChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterChipText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  filterChipTextActive: { color: colors.textOnAccent },

  section: { marginTop: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },

  progCardRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  progCard: {
    width: 140,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progCardName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, minHeight: 36 },
  progCardWeight: { fontSize: fontSize.xl, fontWeight: '700', color: colors.accent, marginTop: spacing.xs },
  progCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  progCardSessions: { fontSize: fontSize.xs, color: colors.textSecondary },

  logCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logCardHeader: { flexDirection: 'row', alignItems: 'center' },
  logDateBadge: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logDateDay: { fontSize: fontSize.lg, fontWeight: '700', color: colors.accent },
  logDateMonth: { fontSize: fontSize.xs, color: colors.accent, textTransform: 'capitalize', marginTop: -2 },
  logCardTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  logCardStudent: { fontSize: fontSize.sm, color: colors.textSecondary },
  logCardStatsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  logCardStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  logCardStatText: { fontSize: fontSize.xs, color: colors.textSecondary },

  emptyText: { color: colors.textSecondary, textAlign: 'center', padding: spacing.xl },

  // Detail modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  detailHeader: { marginBottom: spacing.md },
  detailStudent: { fontSize: fontSize.lg, fontWeight: '700', color: colors.accent },
  detailDate: { fontSize: fontSize.md, color: colors.text, marginTop: 2 },
  detailStats: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  detailStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailStatText: { fontSize: fontSize.sm, color: colors.textSecondary },

  exerciseBlock: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  exerciseNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseNum: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textOnAccent },
  exerciseName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginLeft: spacing.sm },
  exerciseTarget: { fontSize: fontSize.xs, color: colors.textSecondary, marginLeft: spacing.sm },
  volumeText: { fontSize: fontSize.xs, color: colors.textLight, fontWeight: '600' },

  setTable: { borderRadius: borderRadius.md, overflow: 'hidden' },
  setTableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  setTableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  setTableCell: { fontSize: fontSize.sm, textAlign: 'center' },
  setTableHeaderText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textLight, textTransform: 'uppercase' },

  notesBlock: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  notesLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  notesText: { fontSize: fontSize.md, color: colors.text, fontStyle: 'italic' },

  // Progression modal
  progSession: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  progDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  progDate: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  progTrendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  progStats: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  progStatText: { fontSize: fontSize.sm, color: colors.textSecondary },
});
