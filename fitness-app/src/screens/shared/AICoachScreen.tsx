import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import { Student, WorkoutLog, DiaryEntry, BodyMeasurement, TrainingSession } from '../../types';
import { getStudents } from '../../services/authService';
import { getStudentWorkoutLogs } from '../../services/workoutLogService';
import { getStudentDiary } from '../../services/contentService';
import { getStudentMeasurements } from '../../services/nutritionistService';
import { getStudentSessions } from '../../services/sessionService';
import { getStudentGamification } from '../../services/gamificationService';
import { generateAICoachInsights, AICoachInsights } from '../../services/aiService';
import { isStudentAssignedTo } from '../../utils/helpers';
import { crossAlert } from '../../utils/alert';

// --- Utility: converte Firestore Timestamp / Date / string in Date ---
const toSafeDate = (d: unknown): Date => {
  if (d instanceof Date) return d;
  if (d && typeof d === 'object' && 'toDate' in d && typeof (d as any).toDate === 'function')
    return (d as any).toDate();
  if (d && typeof d === 'object' && 'seconds' in d)
    return new Date((d as any).seconds * 1000);
  return new Date(d as string);
};

const CATEGORY_ICONS: Record<string, string> = {
  allenamento: '\u{1F3CB}\u{FE0F}',
  recupero: '\u{1F634}',
  umore: '\u{1F9E0}',
  progressi: '\u{1F4C8}',
  nutrizione: '\u{1F957}',
  costanza: '\u{1F525}',
};

const CATEGORY_LABELS: Record<string, string> = {
  allenamento: 'Allenamento',
  recupero: 'Recupero',
  umore: 'Umore',
  progressi: 'Progressi',
  nutrizione: 'Nutrizione',
  costanza: 'Costanza',
};

const STATUS_COLORS: Record<string, string> = {
  eccellente: colors.success,
  buono: colors.success,
  attenzione: colors.warning,
  critico: colors.error,
};

const STATUS_LABELS: Record<string, string> = {
  eccellente: 'Eccellente',
  buono: 'Buono',
  attenzione: 'Attenzione',
  critico: 'Critico',
};

const PRIORITY_COLORS: Record<string, string> = {
  alta: colors.error,
  media: colors.warning,
  bassa: colors.info,
};

const PRIORITY_LABELS: Record<string, string> = {
  alta: 'Alta',
  media: 'Media',
  bassa: 'Bassa',
};

export const AICoachScreen: React.FC = () => {
  const { user, isOwner, isManager, isCollaborator, isStudent } = useAuth();
  const insets = useSafeAreaInsets();
  const isStaff = isOwner || isManager || isCollaborator;

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<AICoachInsights | null>(null);
  const [showStudentPicker, setShowStudentPicker] = useState(false);

  // --- Carica lista studenti per staff ---
  const loadStudents = useCallback(async () => {
    if (!user || isStudent) return;
    try {
      setLoading(true);
      const allStudents = await getStudents();
      if (isOwner) {
        setStudents(allStudents);
      } else if (isManager) {
        setStudents(
          allStudents.filter(
            (s) => isStudentAssignedTo(s, user.id) || s.assignedManagerId === user.id
          )
        );
      } else {
        setStudents(allStudents.filter((s) => isStudentAssignedTo(s, user.id)));
      }
    } catch {
      crossAlert('Errore', 'Impossibile caricare la lista degli allievi.');
    } finally {
      setLoading(false);
    }
  }, [user, isStudent, isOwner, isManager]);

  useEffect(() => {
    if (isStaff) {
      loadStudents();
    }
  }, [isStaff, loadStudents]);

  // --- Seleziona studente automaticamente per il ruolo studente ---
  useEffect(() => {
    if (isStudent && user) {
      setSelectedStudentId(user.id);
    }
  }, [isStudent, user]);

  const selectedStudent = useMemo(() => {
    if (isStudent && user) {
      return {
        id: user.id,
        name: user.name,
        surname: user.surname,
        goals: (user as any).goals || '',
        medicalNotes: (user as any).medicalNotes,
      } as Student;
    }
    return students.find((s) => s.id === selectedStudentId) || null;
  }, [isStudent, user, students, selectedStudentId]);

  // --- Genera analisi AI ---
  const handleGenerateInsights = useCallback(async () => {
    const targetId = selectedStudentId;
    const student = selectedStudent;

    if (!targetId || !student) {
      crossAlert('Attenzione', 'Seleziona un allievo prima di generare l\'analisi.');
      return;
    }

    setGenerating(true);
    setInsights(null);

    try {
      // Carica tutti i dati in parallelo
      const [workoutLogs, diaryEntries, measurements, sessions, gamification] = await Promise.all([
        getStudentWorkoutLogs(targetId).catch(() => [] as WorkoutLog[]),
        getStudentDiary(targetId).catch(() => [] as DiaryEntry[]),
        getStudentMeasurements(targetId).catch(() => [] as BodyMeasurement[]),
        getStudentSessions(targetId).catch(() => [] as TrainingSession[]),
        getStudentGamification(targetId).catch(() => null),
      ]);

      // Trasforma workout logs
      const formattedWorkouts = workoutLogs
        .filter((l) => l.status === 'completed')
        .slice(0, 30)
        .map((log) => {
          const startDate = toSafeDate(log.startedAt || log.date);
          const endDate = log.completedAt ? toSafeDate(log.completedAt) : null;
          const duration =
            log.durationMinutes ||
            (endDate ? Math.round((endDate.getTime() - startDate.getTime()) / 60000) : 0);

          let totalVolume = 0;
          let totalRpe = 0;
          let rpeCount = 0;
          for (const ex of log.exerciseLogs) {
            for (const set of ex.sets) {
              if (set.completed) {
                totalVolume += set.weight * set.reps;
              }
              if (set.rpe != null) {
                totalRpe += set.rpe;
                rpeCount++;
              }
            }
          }

          return {
            date: startDate.toLocaleDateString('it-IT'),
            duration,
            exerciseCount: log.exerciseLogs.length,
            totalVolume: Math.round(totalVolume),
            avgRpe: rpeCount > 0 ? Math.round((totalRpe / rpeCount) * 10) / 10 : 0,
            completed: true,
          };
        });

      // Trasforma diary entries
      const formattedDiary = diaryEntries.slice(0, 20).map((entry) => ({
        date: toSafeDate(entry.date).toLocaleDateString('it-IT'),
        mood: entry.mood || 'non specificato',
        painLevel: entry.painLevel ?? 0,
        content: entry.content || '',
      }));

      // Trasforma measurements
      const formattedMeasurements = measurements.slice(0, 15).map((m) => ({
        date: toSafeDate(m.date).toLocaleDateString('it-IT'),
        weight: m.weight,
        bodyFat: m.bodyFat,
        muscleMass: m.muscleMass,
      }));

      // Calcola statistiche sessioni
      const sessionsAttendance = {
        completed: sessions.filter(
          (s) => s.status === 'completed' || s.isCountedAsCompleted
        ).length,
        total: sessions.length,
        cancelledLate: sessions.filter((s) => s.status === 'cancelled_late').length,
        noShow: sessions.filter((s) => s.status === 'no_show').length,
      };

      // Streak e totali da gamification (fallback da workout logs)
      const currentStreak = gamification?.currentStreak ?? 0;
      const totalWorkouts =
        gamification?.totalWorkouts ??
        workoutLogs.filter((l) => l.status === 'completed').length;

      const result = await generateAICoachInsights({
        studentName: `${student.name} ${student.surname}`,
        goals: student.goals || 'Non specificati',
        medicalNotes: student.medicalNotes,
        workoutLogs: formattedWorkouts,
        diaryEntries: formattedDiary,
        measurements: formattedMeasurements,
        sessionsAttendance,
        currentStreak,
        totalWorkouts,
      });

      setInsights(result);
    } catch (err: any) {
      const message =
        err?.message || 'Si è verificato un errore durante la generazione dell\'analisi.';
      crossAlert('Errore', message);
    } finally {
      setGenerating(false);
    }
  }, [selectedStudentId, selectedStudent]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (isStaff) {
      await loadStudents();
    }
    setRefreshing(false);
  };

  // --- Score color ---
  const getScoreColor = (score: number): string => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.warning;
    if (score >= 40) return colors.warning;
    return colors.error;
  };

  // --- Render ---
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI Coach</Text>
          <Text style={styles.headerSubtitle}>
            Analisi intelligente delle prestazioni
          </Text>
        </View>

        {/* Student Selector (staff only) */}
        {isStaff && (
          <View style={styles.selectorContainer}>
            <Text style={styles.sectionLabel}>Seleziona Allievo</Text>
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => setShowStudentPicker(!showStudentPicker)}
            >
              <Ionicons name="person" size={18} color={colors.accent} />
              <Text style={styles.selectorText} numberOfLines={1}>
                {selectedStudent
                  ? `${selectedStudent.name} ${selectedStudent.surname}`
                  : 'Scegli un allievo...'}
              </Text>
              <Ionicons
                name={showStudentPicker ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {showStudentPicker && (
              <View style={styles.pickerList}>
                {loading ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.accent}
                    style={{ padding: spacing.md }}
                  />
                ) : students.length === 0 ? (
                  <Text style={styles.emptyText}>Nessun allievo trovato</Text>
                ) : (
                  <ScrollView nestedScrollEnabled>
                    {students
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((s) => (
                        <TouchableOpacity
                          key={s.id}
                          style={[
                            styles.pickerItem,
                            selectedStudentId === s.id && styles.pickerItemSelected,
                          ]}
                          onPress={() => {
                            setSelectedStudentId(s.id);
                            setShowStudentPicker(false);
                            setInsights(null);
                          }}
                        >
                          <View style={styles.pickerAvatar}>
                            <Text style={styles.pickerAvatarText}>
                              {s.name[0]}
                              {s.surname[0]}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.pickerName}>
                              {s.name} {s.surname}
                            </Text>
                            {s.goals ? (
                              <Text style={styles.pickerGoals} numberOfLines={1}>
                                {s.goals}
                              </Text>
                            ) : null}
                          </View>
                          {selectedStudentId === s.id && (
                            <Ionicons
                              name="checkmark-circle"
                              size={20}
                              color={colors.accent}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                )}
              </View>
            )}
          </View>
        )}

        {/* Student info for student role */}
        {isStudent && user && (
          <View style={styles.studentInfoBar}>
            <Ionicons name="person-circle" size={22} color={colors.accent} />
            <Text style={styles.studentInfoText}>
              {user.name} {user.surname}
            </Text>
          </View>
        )}

        {/* Generate Button */}
        <View style={styles.generateSection}>
          <Button
            title={generating ? 'Analisi in corso...' : 'Genera Analisi'}
            onPress={handleGenerateInsights}
            variant="primary"
            loading={generating}
            disabled={generating || !selectedStudentId}
            icon={
              !generating ? (
                <Ionicons name="sparkles" size={18} color={colors.textOnAccent} />
              ) : undefined
            }
          />
          {!selectedStudentId && isStaff && (
            <Text style={styles.hintText}>
              Seleziona un allievo per generare l'analisi
            </Text>
          )}
        </View>

        {/* Results */}
        {insights && (
          <View style={styles.resultsContainer}>
            {/* Score Circle + Status */}
            <View style={styles.scoreSection}>
              <View
                style={[
                  styles.scoreCircle,
                  { borderColor: getScoreColor(insights.overallScore) },
                ]}
              >
                <Text
                  style={[
                    styles.scoreValue,
                    { color: getScoreColor(insights.overallScore) },
                  ]}
                >
                  {insights.overallScore}
                </Text>
                <Text style={styles.scoreLabel}>/ 100</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      (STATUS_COLORS[insights.status] || colors.textSecondary) + '20',
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        STATUS_COLORS[insights.status] || colors.textSecondary,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        STATUS_COLORS[insights.status] || colors.textSecondary,
                    },
                  ]}
                >
                  {STATUS_LABELS[insights.status] || insights.status}
                </Text>
              </View>
            </View>

            {/* Warnings */}
            {insights.warnings.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons
                    name="warning"
                    size={18}
                    color={colors.error}
                  />
                  <Text style={[styles.sectionTitle, { color: colors.error }]}>
                    Avvisi
                  </Text>
                </View>
                {insights.warnings.map((warning, idx) => (
                  <Card key={`warning-${idx}`} style={styles.warningCard}>
                    <View style={styles.warningContent}>
                      <Ionicons
                        name="alert-circle"
                        size={20}
                        color={colors.error}
                        style={{ marginRight: spacing.sm }}
                      />
                      <Text style={styles.warningText}>{warning}</Text>
                    </View>
                  </Card>
                ))}
              </View>
            )}

            {/* Insights */}
            {insights.insights.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons
                    name="analytics"
                    size={18}
                    color={colors.accent}
                  />
                  <Text style={styles.sectionTitle}>Analisi Dettagliata</Text>
                </View>
                {insights.insights.map((insight, idx) => (
                  <Card key={`insight-${idx}`} style={styles.insightCard}>
                    <View style={styles.insightHeader}>
                      <Text style={styles.insightIcon}>
                        {CATEGORY_ICONS[insight.category] || '\u{1F4CA}'}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.insightCategory}>
                          {CATEGORY_LABELS[insight.category] || insight.category}
                        </Text>
                        <Text style={styles.insightTitle}>{insight.title}</Text>
                      </View>
                      <View
                        style={[
                          styles.priorityBadge,
                          {
                            backgroundColor:
                              (PRIORITY_COLORS[insight.priority] || colors.info) + '20',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.priorityText,
                            {
                              color:
                                PRIORITY_COLORS[insight.priority] || colors.info,
                            },
                          ]}
                        >
                          {PRIORITY_LABELS[insight.priority] || insight.priority}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.insightDescription}>
                      {insight.description}
                    </Text>
                  </Card>
                ))}
              </View>
            )}

            {/* Weekly Tip */}
            {insights.weeklyTip ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons
                    name="bulb"
                    size={18}
                    color={colors.warning}
                  />
                  <Text style={styles.sectionTitle}>
                    Consiglio della Settimana
                  </Text>
                </View>
                <Card style={styles.tipCard}>
                  <View style={styles.tipContent}>
                    <Ionicons
                      name="bulb-outline"
                      size={24}
                      color={colors.warning}
                      style={{ marginRight: spacing.md }}
                    />
                    <Text style={styles.tipText}>{insights.weeklyTip}</Text>
                  </View>
                </Card>
              </View>
            ) : null}

            {/* Encouragement */}
            {insights.encouragement ? (
              <Card style={styles.encouragementCard}>
                <View style={styles.encouragementContent}>
                  <Ionicons
                    name="heart"
                    size={22}
                    color={colors.accent}
                    style={{ marginRight: spacing.md }}
                  />
                  <Text style={styles.encouragementText}>
                    {insights.encouragement}
                  </Text>
                </View>
              </Card>
            ) : null}
          </View>
        )}

        {/* Empty state when no insights yet and not generating */}
        {!insights && !generating && selectedStudentId && (
          <View style={styles.emptyState}>
            <Ionicons
              name="sparkles-outline"
              size={48}
              color={colors.textLight}
            />
            <Text style={styles.emptyStateTitle}>
              Pronto per l'analisi
            </Text>
            <Text style={styles.emptyStateText}>
              Premi "Genera Analisi" per ottenere insight personalizzati
              sull'andamento dell'allievo.
            </Text>
          </View>
        )}

        <View style={{ height: insets.bottom + spacing.xxl }} />
      </ScrollView>
    </View>
  );
};

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // --- Header ---
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  headerSubtitle: {
    fontSize: fontSize.md,
    color: colors.textLight,
    marginTop: spacing.xs,
  },

  // --- Student Selector ---
  selectorContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  selectorText: {
    flex: 1,
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: '600',
  },
  pickerList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.sm,
  },
  pickerItemSelected: {
    backgroundColor: colors.accent + '10',
  },
  pickerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerAvatarText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.accent,
  },
  pickerName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  pickerGoals: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: 1,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.lg,
  },

  // --- Student info bar (student role) ---
  studentInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  studentInfoText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },

  // --- Generate section ---
  generateSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  hintText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  // --- Results ---
  resultsContainer: {
    paddingTop: spacing.lg,
  },

  // --- Score ---
  scoreSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...shadows.medium,
  },
  scoreValue: {
    fontSize: fontSize.hero + 4,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: -2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.round,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // --- Sections ---
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },

  // --- Warning cards ---
  warningCard: {
    backgroundColor: colors.error + '12',
    borderColor: colors.error + '30',
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.error,
    fontWeight: '500',
    lineHeight: fontSize.md * 1.5,
  },

  // --- Insight cards ---
  insightCard: {
    marginBottom: spacing.sm,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  insightIcon: {
    fontSize: 24,
  },
  insightCategory: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: 1,
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  priorityText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  insightDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: fontSize.md * 1.6,
  },

  // --- Tip card ---
  tipCard: {
    backgroundColor: colors.warning + '10',
    borderColor: colors.warning + '30',
    borderWidth: 1,
  },
  tipContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
    lineHeight: fontSize.md * 1.6,
  },

  // --- Encouragement ---
  encouragementCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.accent + '10',
    borderColor: colors.accent + '25',
    borderWidth: 1,
  },
  encouragementContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  encouragementText: {
    flex: 1,
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: '600',
    fontStyle: 'italic',
    lineHeight: fontSize.lg * 1.6,
  },

  // --- Empty state ---
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
  },
  emptyStateTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: fontSize.md * 1.5,
  },
});
