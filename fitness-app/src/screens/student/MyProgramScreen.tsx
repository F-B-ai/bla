import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Modal,
} from 'react-native';
import { crossAlert } from '../../utils/alert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { ModalHeader } from '../../components/common/ModalHeader';
import { WorkoutPlan, Exercise, Student } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { getActiveWorkoutPlan, getStudentWorkoutPlans } from '../../services/programService';
import { getCompletedSessionsCount } from '../../services/sessionService';
import { getStudentNutritionalConsultations } from '../../services/contentService';

const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

export const MyProgramScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const student = user as Student | null;
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const [allPlans, setAllPlans] = useState<WorkoutPlan[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [nutritionalConsultations, setNutritionalConsultations] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [viewingPlan, setViewingPlan] = useState<WorkoutPlan | null>(null);
  const [historySelectedDay, setHistorySelectedDay] = useState(0);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [plan, plans, sessionsCount, consultations] = await Promise.all([
        getActiveWorkoutPlan(user.id),
        getStudentWorkoutPlans(user.id),
        getCompletedSessionsCount(user.id),
        getStudentNutritionalConsultations(user.id),
      ]);
      setActivePlan(plan);
      setAllPlans(plans);
      setCompletedSessions(sessionsCount);
      setNutritionalConsultations(student?.nutritionalConsultations ?? consultations.length);
    } catch (err) {
      console.error('Errore caricamento programma:', err);
      crossAlert('Errore', 'Impossibile caricare il programma. Riprova più tardi.');
    }
  }, [user, student]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const renderExercise = (exercise: Exercise, index: number) => (
    <Card key={exercise.id || index} variant="outlined">
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseNumber}>
          <Text style={styles.exerciseNumberText}>{index + 1}</Text>
        </View>
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.exerciseDetails}>
            {exercise.sets} serie x {exercise.reps} reps
            {exercise.restSeconds > 0 && ` | Recupero: ${exercise.restSeconds}s`}
          </Text>
        </View>
      </View>

      {exercise.description && (
        <Text style={styles.exerciseDescription}>{exercise.description}</Text>
      )}

      {exercise.videoUrl && (
        <TouchableOpacity
          style={styles.videoButton}
          onPress={() => {
            Linking.openURL(exercise.videoUrl!).catch(() =>
              crossAlert('Errore', 'Impossibile aprire il video')
            );
          }}
        >
          <Text style={styles.videoButtonText}>Guarda Video</Text>
        </TouchableOpacity>
      )}

      {exercise.notes && (
        <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
      )}
    </Card>
  );

  const formatDate = (date: any) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const pastPlans = allPlans.filter((p) => !p.isActive);

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Il Mio Programma</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Esci</Text>
          </TouchableOpacity>
        </View>
        {activePlan && (
          <Text style={styles.planTitle}>{activePlan.title}</Text>
        )}
      </View>

      {/* Statistiche */}
      <View style={styles.statsRow}>
        <StatCard
          title="Sessioni"
          value={completedSessions}
          subtitle="Completate"
          color={colors.success}
        />
        <StatCard
          title="Programmi"
          value={allPlans.length}
          subtitle="Totali"
          color={colors.info}
        />
      </View>

      {/* Selettore giorno */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.daySelector}
        contentContainerStyle={styles.daySelectorContent}
      >
        {DAYS.map((day, index) => (
          <TouchableOpacity
            key={day}
            style={[
              styles.dayButton,
              selectedDay === index && styles.dayButtonActive,
            ]}
            onPress={() => setSelectedDay(index)}
          >
            <Text
              style={[
                styles.dayText,
                selectedDay === index && styles.dayTextActive,
              ]}
            >
              {day.substring(0, 3)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Esercizi del giorno */}
      <View style={styles.exerciseList}>
        <Text style={styles.sectionTitle}>
          Esercizi - {DAYS[selectedDay]}
        </Text>

        {!activePlan ? (
          <Card>
            <Text style={styles.emptyText}>
              Nessun programma attivo al momento.{'\n'}
              Il tuo allenatore creerà presto il tuo programma!
            </Text>
          </Card>
        ) : activePlan.weeklySchedule[selectedDay]?.exercises.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>Giorno di riposo</Text>
          </Card>
        ) : (
          activePlan.weeklySchedule[selectedDay]?.exercises.map(
            (ex, i) => renderExercise(ex, i)
          )
        )}
      </View>

      {/* Storico programmi */}
      {pastPlans.length > 0 && (
        <View style={styles.historySection}>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => setShowHistory(true)}
          >
            <Text style={styles.historyButtonText}>
              Storico Programmi ({pastPlans.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal Storico */}
      <Modal visible={showHistory} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <ModalHeader title="Storico Programmi" onClose={() => { setShowHistory(false); setViewingPlan(null); }} />

            {!viewingPlan ? (
              <>
                {allPlans.map((plan) => (
                  <TouchableOpacity
                    key={plan.id}
                    onPress={() => { setViewingPlan(plan); setHistorySelectedDay(0); }}
                  >
                    <Card variant={plan.isActive ? 'elevated' : 'outlined'}>
                      <View style={styles.historyRow}>
                        <View style={styles.historyInfo}>
                          <Text style={styles.historyName}>{plan.title}</Text>
                          <Text style={styles.historyDate}>
                            {formatDate(plan.startDate)} - {formatDate(plan.endDate)}
                          </Text>
                        </View>
                        {plan.isActive && (
                          <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>ATTIVO</Text>
                          </View>
                        )}
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <>
                <Card variant="elevated">
                  <Text style={styles.viewingTitle}>{viewingPlan.title}</Text>
                  <Text style={styles.viewingDate}>
                    {formatDate(viewingPlan.startDate)} - {formatDate(viewingPlan.endDate)}
                  </Text>
                  {viewingPlan.isActive && (
                    <View style={[styles.activeBadge, { marginTop: spacing.xs }]}>
                      <Text style={styles.activeBadgeText}>ATTIVO</Text>
                    </View>
                  )}
                </Card>

                <TouchableOpacity
                  style={styles.backToList}
                  onPress={() => setViewingPlan(null)}
                >
                  <Text style={styles.backToListText}>Torna alla lista</Text>
                </TouchableOpacity>

                {/* Selettore giorno nel dettaglio storico */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
                  {DAYS.map((day, index) => (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayButton, historySelectedDay === index && styles.dayButtonActive]}
                      onPress={() => setHistorySelectedDay(index)}
                    >
                      <Text style={[styles.dayText, historySelectedDay === index && styles.dayTextActive]}>
                        {day.substring(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.sectionTitle}>{DAYS[historySelectedDay]}</Text>
                {viewingPlan.weeklySchedule[historySelectedDay]?.exercises.length === 0 ? (
                  <Card><Text style={styles.emptyText}>Riposo</Text></Card>
                ) : (
                  viewingPlan.weeklySchedule[historySelectedDay]?.exercises.map((ex, i) => renderExercise(ex, i))
                )}
              </>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  planTitle: {
    fontSize: fontSize.md,
    color: colors.accent,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  daySelector: {
    marginVertical: spacing.sm,
  },
  daySelectorContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  dayButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    ...shadows.small,
  },
  dayButtonActive: {
    backgroundColor: colors.accent,
  },
  dayText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayTextActive: {
    color: colors.textOnAccent,
  },
  exerciseList: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseNumberText: {
    color: colors.textOnAccent,
    fontWeight: '700',
    fontSize: fontSize.md,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  exerciseDetails: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  exerciseDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginLeft: spacing.xxl,
    lineHeight: 20,
  },
  videoButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    marginLeft: spacing.xxl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.info + '20',
    borderRadius: borderRadius.round,
  },
  videoButtonText: {
    color: colors.info,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  exerciseNotes: {
    fontSize: fontSize.sm,
    color: colors.warning,
    marginTop: spacing.sm,
    marginLeft: spacing.xxl,
    fontStyle: 'italic',
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.lg,
    lineHeight: 22,
  },
  historySection: {
    padding: spacing.md,
  },
  historyButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyButtonText: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  historyDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  activeBadgeText: {
    color: '#FFF',
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  viewingTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  viewingDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 4,
  },
  backToList: {
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  backToListText: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
});
