import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { crossAlert } from '../../utils/alert';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { ModalHeader } from '../../components/common/ModalHeader';
import { WorkoutPlan, Exercise, WorkoutLog, ExerciseLog, SetLog, MiniSetLog, DropSetLog, Student } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { getActiveWorkoutPlan } from '../../services/programService';
import {
  startWorkoutLog,
  updateExerciseLogs,
  completeWorkoutLog,
  abandonWorkoutLog,
  getActiveWorkoutLog,
  getStudentWorkoutLogs,
  subscribeToWorkoutLog,
} from '../../services/workoutLogService';
import { getStudentCoachIds } from '../../utils/helpers';

const DAYS = ['Lunedi', 'Martedi', 'Mercoledi', 'Giovedi', 'Venerdi', 'Sabato', 'Domenica'];

export const LiveWorkoutScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const student = user as Student | null;

  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutLog | null>(null);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restTimer, setRestTimer] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutLog[]>([]);
  const [sessionNotes, setSessionNotes] = useState('');

  // Inputs per la serie corrente
  const [inputWeight, setInputWeight] = useState('');
  const [inputReps, setInputReps] = useState('');
  const [inputRpe, setInputRpe] = useState('');

  // Serie Interrotte: mini serie in corso per la serie corrente
  const [currentMiniSets, setCurrentMiniSets] = useState<MiniSetLog[]>([]);
  const [miniRepsInput, setMiniRepsInput] = useState('');
  const [isMiniResting, setIsMiniResting] = useState(false);
  const [miniRestTimer, setMiniRestTimer] = useState(0);
  const [miniRestElapsed, setMiniRestElapsed] = useState(0);
  const miniRestTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stripping: drop set in corso per la serie corrente
  const [currentDropSets, setCurrentDropSets] = useState<DropSetLog[]>([]);
  const [dropWeightInput, setDropWeightInput] = useState('');
  const [dropRepsInput, setDropRepsInput] = useState('');

  // Edit set
  const [editingSet, setEditingSet] = useState<{ exIndex: number; setIndex: number } | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editReps, setEditReps] = useState('');
  const [editRpe, setEditRpe] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const todayDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayDayIndex);

  // Carica dati iniziali
  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [plan, existing] = await Promise.all([
        getActiveWorkoutPlan(user.id),
        getActiveWorkoutLog(user.id),
      ]);
      setActivePlan(plan);
      if (existing) {
        setActiveWorkout(existing);
        setExerciseLogs(existing.exerciseLogs || []);
        // Sottoscrivi aggiornamenti real-time
        if (unsubRef.current) unsubRef.current();
        unsubRef.current = subscribeToWorkoutLog(existing.id, (log) => {
          if (log) setActiveWorkout(log);
        });
      }
    } catch (err) {
      console.error('Errore caricamento:', err);
    }
  }, [user]);

  useEffect(() => {
    loadData();
    return () => {
      if (unsubRef.current) unsubRef.current();
      if (timerRef.current) clearInterval(timerRef.current);
      if (restTimerRef.current) clearInterval(restTimerRef.current);
      if (miniRestTimerRef.current) clearInterval(miniRestTimerRef.current);
    };
  }, [loadData]);

  // Timer principale
  useEffect(() => {
    if (activeWorkout && activeWorkout.status === 'in_progress') {
      timerRef.current = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeWorkout]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Inizia allenamento
  const handleStartWorkout = async () => {
    if (!user || !activePlan) return;
    const dayExercises = activePlan.weeklySchedule[selectedDayIndex]?.exercises || [];
    if (dayExercises.length === 0) {
      crossAlert('Info', `${DAYS[selectedDayIndex]} e' giorno di riposo. Nessun esercizio programmato.`);
      return;
    }

    const logs: ExerciseLog[] = dayExercises.map((ex) => ({
      exerciseId: ex.id,
      exerciseName: ex.name,
      targetSets: ex.sets,
      targetReps: ex.reps,
      sets: [],
      technique: ex.technique || 'standard',
      ...(ex.technique === 'rest_pause' ? {
        targetMiniSets: ex.miniSets || 4,
        targetMiniReps: ex.miniReps || '6',
        targetMiniRestSeconds: ex.miniRestSeconds || 20,
      } : {}),
      ...(ex.technique === 'rest_pause_failure' ? {
        targetRpPauses: ex.rpPauses || 2,
        targetRpRestSeconds: ex.rpRestSeconds || 15,
      } : {}),
      ...(ex.technique === 'stripping' ? {
        targetStripDrops: ex.stripDrops || 3,
        targetStripRepsPerDrop: ex.stripRepsPerDrop || '8',
        targetStripMaxDropPct: ex.stripMaxDropPct || 50,
      } : {}),
      ...(ex.technique === 'pyramid' ? { targetPyramidType: ex.pyramidType || 'ascending' } : {}),
      ...(ex.technique === 'tempo' ? { targetTempoNotation: ex.tempoNotation || '4-1-2-0' } : {}),
      ...(ex.technique === 'myo_reps' ? {
        targetMyoActivationReps: ex.myoActivationReps || '12',
        targetMyoMiniReps: ex.myoMiniReps || '3',
        targetMyoMiniSets: ex.myoMiniSets || 4,
        targetMyoRestSeconds: ex.myoRestSeconds || 5,
      } : {}),
      ...(ex.technique === 'isometric' ? { targetIsometricHoldSeconds: ex.isometricHoldSeconds || 30 } : {}),
      ...(ex.technique === 'cluster' ? {
        targetClusterReps: ex.clusterReps || 2,
        targetClusterSets: ex.clusterSets || 5,
        targetClusterRestSeconds: ex.clusterRestSeconds || 15,
      } : {}),
      ...(ex.technique === 'cumulative' ? {
        targetCumulativeReps: ex.cumulativeTargetReps || 10,
        targetCumulativeRestSeconds: ex.cumulativeRestSeconds || 15,
      } : {}),
      ...(ex.technique === 'negative' ? { targetNegativeSeconds: ex.negativeSeconds || 5 } : {}),
      ...(ex.technique === 'emom' ? {
        targetEmomMinutes: ex.emomMinutes || 10,
        targetEmomRepsPerMinute: ex.emomRepsPerMinute || '5',
      } : {}),
      ...(ex.supersetGroupId ? { supersetGroupId: ex.supersetGroupId } : {}),
    }));

    try {
      const logId = await startWorkoutLog({
        studentId: user.id,
        collaboratorId:
          getStudentCoachIds(student as any)[0] ||
          (student as any)?.assignedManagerId ||
          '',
        workoutPlanId: activePlan.id,
        dayOfWeek: selectedDayIndex,
        date: new Date(),
        startedAt: new Date(),
        status: 'in_progress',
        exerciseLogs: logs,
        notes: '',
      });

      setExerciseLogs(logs);
      setCurrentExerciseIndex(0);
      setTimer(0);

      const newLog: WorkoutLog = {
        id: logId,
        studentId: user.id,
        collaboratorId:
          getStudentCoachIds(student as any)[0] ||
          (student as any)?.assignedManagerId ||
          '',
        workoutPlanId: activePlan.id,
        dayOfWeek: selectedDayIndex,
        date: new Date(),
        startedAt: new Date(),
        status: 'in_progress',
        exerciseLogs: logs,
        notes: '',
      };
      setActiveWorkout(newLog);

      // Sottoscrivi per aggiornamenti real-time
      if (unsubRef.current) unsubRef.current();
      unsubRef.current = subscribeToWorkoutLog(logId, (log) => {
        if (log) setActiveWorkout(log);
      });
    } catch (err) {
      console.error('Errore avvio allenamento:', err);
      crossAlert('Errore', 'Impossibile avviare l\'allenamento.');
    }
  };

  // Registra una serie
  const handleLogSet = async () => {
    if (!activeWorkout) return;
    const reps = parseInt(inputReps, 10);
    const weight = parseFloat(inputWeight) || 0;
    const rpe = parseInt(inputRpe, 10) || undefined;

    if (!reps || reps <= 0) {
      crossAlert('Attenzione', 'Inserisci il numero di ripetizioni.');
      return;
    }

    const newLogs = [...exerciseLogs];
    const currentLog = newLogs[currentExerciseIndex];
    const newSet: SetLog = {
      setNumber: currentLog.sets.length + 1,
      reps,
      weight,
      completed: true,
      ...(rpe ? { rpe } : {}),
      completedAt: new Date(),
    };
    currentLog.sets.push(newSet);

    setExerciseLogs(newLogs);
    setInputReps('');
    setInputWeight(inputWeight); // mantieni il peso
    setInputRpe('');

    // Salva su Firebase
    try {
      await updateExerciseLogs(activeWorkout.id, newLogs);
    } catch (err) {
      console.error('Errore salvataggio serie:', err);
    }

    // Timer recupero
    const workoutDay = activeWorkout?.dayOfWeek ?? selectedDayIndex;
    const dayExs = activePlan?.weeklySchedule[workoutDay]?.exercises || [];
    const restSeconds = dayExs[currentExerciseIndex]?.restSeconds || 60;
    startRestTimer(restSeconds);

    // Se ho completato tutte le serie di questo esercizio, passa al prossimo
    if (currentLog.sets.length >= currentLog.targetSets) {
      if (currentExerciseIndex < exerciseLogs.length - 1) {
        setTimeout(() => {
          setCurrentExerciseIndex(currentExerciseIndex + 1);
          setInputWeight('');
        }, 500);
      }
    }
  };

  // --- Serie Interrotte (rest-pause) ---
  const startMiniRestTimer = (seconds: number) => {
    setIsMiniResting(true);
    setMiniRestTimer(seconds);
    setMiniRestElapsed(0);
    if (miniRestTimerRef.current) clearInterval(miniRestTimerRef.current);
    miniRestTimerRef.current = setInterval(() => {
      setMiniRestElapsed((e) => e + 1);
      setMiniRestTimer((t) => {
        if (t <= 1) {
          clearInterval(miniRestTimerRef.current!);
          setIsMiniResting(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const skipMiniRest = () => {
    if (miniRestTimerRef.current) clearInterval(miniRestTimerRef.current);
    setIsMiniResting(false);
    setMiniRestTimer(0);
  };

  // Registra una mini serie della serie corrente e avvia il timer
  const handleLogMiniSet = () => {
    const reps = parseInt(miniRepsInput, 10);
    if (!reps || reps <= 0) {
      crossAlert('Attenzione', 'Inserisci le ripetizioni della mini serie.');
      return;
    }
    // Record actual rest elapsed from previous mini-set timer (0 for the first)
    const restTaken = miniRestElapsed;
    // Update the previous mini-set's restSeconds with the actual time taken
    setCurrentMiniSets((prev) => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1] = { ...updated[updated.length - 1], restSeconds: restTaken };
      }
      return [...updated, { reps, restSeconds: 0 }];
    });
    setMiniRepsInput('');
    setMiniRestElapsed(0);

    // Start countdown for next mini-set rest (use technique-specific rest time)
    const tech = currentExercise?.technique;
    const targetRest = tech === 'myo_reps'
      ? (currentExercise?.targetMyoRestSeconds || 5)
      : tech === 'cluster'
      ? (currentExercise?.targetClusterRestSeconds || 15)
      : tech === 'cumulative'
      ? (currentExercise?.targetCumulativeRestSeconds || 15)
      : tech === 'rest_pause_failure'
      ? (currentExercise?.targetRpRestSeconds || 15)
      : (currentExercise?.targetMiniRestSeconds || 20);
    startMiniRestTimer(targetRest);
  };

  const handleRemoveMiniSet = (index: number) => {
    setCurrentMiniSets((prev) => prev.filter((_, i) => i !== index));
  };

  // Completa la serie interrotta: salva tutte le mini serie come una serie
  const handleCompleteRestPauseSet = async () => {
    if (!activeWorkout) return;
    if (currentMiniSets.length === 0) {
      crossAlert('Attenzione', 'Registra almeno una mini serie.');
      return;
    }
    // Stop mini rest timer if running
    if (miniRestTimerRef.current) clearInterval(miniRestTimerRef.current);
    setIsMiniResting(false);
    setMiniRestTimer(0);
    setMiniRestElapsed(0);

    const weight = parseFloat(inputWeight) || 0;
    const totalReps = currentMiniSets.reduce((sum, m) => sum + m.reps, 0);

    const newLogs = [...exerciseLogs];
    const currentLog = newLogs[currentExerciseIndex];
    const newSet: SetLog = {
      setNumber: currentLog.sets.length + 1,
      reps: totalReps,
      weight,
      completed: true,
      completedAt: new Date(),
      miniSetsCompleted: currentMiniSets.length,
      miniSetDetails: currentMiniSets,
    };
    currentLog.sets.push(newSet);

    setExerciseLogs(newLogs);
    setCurrentMiniSets([]);
    setMiniRepsInput('');

    try {
      await updateExerciseLogs(activeWorkout.id, newLogs);
    } catch (err) {
      console.error('Errore salvataggio serie:', err);
    }

    // Recupero tra le serie composte (fino a 2 minuti)
    const workoutDay = activeWorkout?.dayOfWeek ?? selectedDayIndex;
    const dayExs = activePlan?.weeklySchedule[workoutDay]?.exercises || [];
    const restSeconds = dayExs[currentExerciseIndex]?.restSeconds || 120;
    startRestTimer(restSeconds);

    if (currentLog.sets.length >= currentLog.targetSets) {
      if (currentExerciseIndex < exerciseLogs.length - 1) {
        setTimeout(() => {
          setCurrentExerciseIndex(currentExerciseIndex + 1);
          setInputWeight('');
          setCurrentMiniSets([]);
        }, 500);
      }
    }
  };

  // --- Stripping (drop sets) ---
  const handleLogDrop = () => {
    const weight = parseFloat(dropWeightInput) || 0;
    const reps = parseInt(dropRepsInput, 10);
    if (!reps || reps <= 0) {
      crossAlert('Attenzione', 'Inserisci le ripetizioni del drop.');
      return;
    }
    setCurrentDropSets((prev) => [...prev, { weight, reps }]);
    setDropWeightInput('');
    setDropRepsInput('');
  };

  const handleRemoveDrop = (index: number) => {
    setCurrentDropSets((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCompleteStrippingSet = async () => {
    if (!activeWorkout) return;
    if (currentDropSets.length === 0) {
      crossAlert('Attenzione', 'Registra almeno un drop.');
      return;
    }
    const totalReps = currentDropSets.reduce((sum, d) => sum + d.reps, 0);
    const topWeight = currentDropSets.length > 0 ? currentDropSets[0].weight : 0;

    const newLogs = [...exerciseLogs];
    const currentLog = newLogs[currentExerciseIndex];
    const newSet: SetLog = {
      setNumber: currentLog.sets.length + 1,
      reps: totalReps,
      weight: topWeight,
      completed: true,
      completedAt: new Date(),
      dropSetsCompleted: currentDropSets.length,
      dropSetDetails: currentDropSets,
    };
    currentLog.sets.push(newSet);

    setExerciseLogs(newLogs);
    setCurrentDropSets([]);
    setDropWeightInput('');
    setDropRepsInput('');

    try {
      await updateExerciseLogs(activeWorkout.id, newLogs);
    } catch (err) {
      console.error('Errore salvataggio serie:', err);
    }

    const workoutDay = activeWorkout?.dayOfWeek ?? selectedDayIndex;
    const dayExs = activePlan?.weeklySchedule[workoutDay]?.exercises || [];
    const restSeconds = dayExs[currentExerciseIndex]?.restSeconds || 120;
    startRestTimer(restSeconds);

    if (currentLog.sets.length >= currentLog.targetSets) {
      if (currentExerciseIndex < exerciseLogs.length - 1) {
        setTimeout(() => {
          setCurrentExerciseIndex(currentExerciseIndex + 1);
          setCurrentDropSets([]);
        }, 500);
      }
    }
  };

  const handleEditSet = (exIndex: number, setIndex: number) => {
    const set = exerciseLogs[exIndex].sets[setIndex];
    setEditWeight(String(set.weight || ''));
    setEditReps(String(set.reps));
    setEditRpe(set.rpe ? String(set.rpe) : '');
    setEditingSet({ exIndex, setIndex });
  };

  const handleSaveEdit = async () => {
    if (!editingSet || !activeWorkout) return;
    const reps = parseInt(editReps, 10);
    if (!reps || reps <= 0) {
      crossAlert('Attenzione', 'Inserisci un numero di ripetizioni valido.');
      return;
    }

    const newLogs = [...exerciseLogs];
    const set = newLogs[editingSet.exIndex].sets[editingSet.setIndex];
    set.reps = reps;
    set.weight = parseFloat(editWeight) || 0;
    set.rpe = parseInt(editRpe, 10) || undefined;

    setExerciseLogs(newLogs);
    setEditingSet(null);

    try {
      await updateExerciseLogs(activeWorkout.id, newLogs);
    } catch {
      crossAlert('Errore', 'Impossibile salvare la modifica.');
    }
  };

  const handleDeleteSet = async () => {
    if (!editingSet || !activeWorkout) return;
    crossAlert('Elimina Serie', 'Vuoi eliminare questa serie?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          const newLogs = [...exerciseLogs];
          newLogs[editingSet.exIndex].sets.splice(editingSet.setIndex, 1);
          newLogs[editingSet.exIndex].sets.forEach((s, i) => { s.setNumber = i + 1; });
          setExerciseLogs(newLogs);
          setEditingSet(null);
          try {
            await updateExerciseLogs(activeWorkout.id, newLogs);
          } catch {
            crossAlert('Errore', 'Impossibile eliminare la serie.');
          }
        },
      },
    ]);
  };

  const startRestTimer = (seconds: number) => {
    setIsResting(true);
    setRestTimer(seconds);
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    restTimerRef.current = setInterval(() => {
      setRestTimer((t) => {
        if (t <= 1) {
          clearInterval(restTimerRef.current!);
          setIsResting(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const skipRest = () => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setIsResting(false);
    setRestTimer(0);
  };

  // Completa allenamento
  const handleCompleteWorkout = async () => {
    if (!activeWorkout) return;
    try {
      await completeWorkoutLog(activeWorkout.id, sessionNotes);
      if (unsubRef.current) unsubRef.current();
      setActiveWorkout(null);
      setExerciseLogs([]);
      setTimer(0);
      setSessionNotes('');
      crossAlert('Completato!', 'Allenamento salvato con successo.');
    } catch (err) {
      console.error('Errore completamento:', err);
      crossAlert('Errore', 'Impossibile completare l\'allenamento.');
    }
  };

  // Abbandona allenamento
  const handleAbandonWorkout = () => {
    crossAlert('Abbandona', 'Vuoi davvero abbandonare l\'allenamento? I dati registrati verranno comunque salvati.', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Abbandona',
        style: 'destructive',
        onPress: async () => {
          if (!activeWorkout) return;
          try {
            await abandonWorkoutLog(activeWorkout.id);
            if (unsubRef.current) unsubRef.current();
            setActiveWorkout(null);
            setExerciseLogs([]);
            setTimer(0);
          } catch (err) {
            console.error('Errore abbandono:', err);
          }
        },
      },
    ]);
  };

  // Carica storico
  const handleShowHistory = async () => {
    if (!user) return;
    try {
      const logs = await getStudentWorkoutLogs(user.id);
      setWorkoutHistory(logs.filter((l) => l.status !== 'in_progress'));
      setShowHistory(true);
    } catch (err) {
      console.error('Errore storico:', err);
    }
  };

  // Calcola progresso totale
  const totalSetsTarget = exerciseLogs.reduce((sum, e) => sum + e.targetSets, 0);
  const totalSetsCompleted = exerciseLogs.reduce((sum, e) => sum + e.sets.length, 0);
  const allDone = totalSetsTarget > 0 && totalSetsCompleted >= totalSetsTarget;

  const currentExercise = exerciseLogs[currentExerciseIndex];

  // Se non c'e' un allenamento attivo, mostra schermata di avvio
  if (!activeWorkout || activeWorkout.status !== 'in_progress') {
    return (
      <ScrollView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <Text style={styles.greeting}>Ciao{user?.name ? `, ${user.name}` : ''}!</Text>
          <Text style={styles.title}>Allenamento</Text>
        </View>

        <View style={styles.content}>
          {!activePlan ? (
            <Card>
              <View style={styles.emptyContainer}>
                <Ionicons name="fitness-outline" size={48} color={colors.textLight} />
                <Text style={styles.emptyText}>
                  Nessun programma attivo.{'\n'}
                  Il tuo coach ti assegnera' presto un programma!
                </Text>
              </View>
            </Card>
          ) : (
            <>
              {/* Selettore giorno */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
                {DAYS.map((day, index) => {
                  const hasExercises = (activePlan.weeklySchedule[index]?.exercises || []).length > 0;
                  const isToday = index === todayDayIndex;
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayChip,
                        selectedDayIndex === index && styles.dayChipActive,
                      ]}
                      onPress={() => setSelectedDayIndex(index)}
                    >
                      <Text style={[styles.dayChipText, selectedDayIndex === index && styles.dayChipTextActive]}>
                        {day.substring(0, 3)}
                      </Text>
                      {isToday && <View style={styles.todayDot} />}
                      {hasExercises && <View style={styles.exerciseDot} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {selectedDayIndex !== todayDayIndex && (
                <Text style={styles.differentDayHint}>
                  Stai visualizzando {DAYS[selectedDayIndex]} (oggi e' {DAYS[todayDayIndex]})
                </Text>
              )}

              {(activePlan.weeklySchedule[selectedDayIndex]?.exercises || []).length === 0 ? (
                <Card>
                  <View style={styles.emptyContainer}>
                    <Ionicons name="bed-outline" size={48} color={colors.textLight} />
                    <Text style={styles.emptyText}>{DAYS[selectedDayIndex]}: giorno di riposo</Text>
                  </View>
                </Card>
              ) : (
                <Card variant="elevated">
                  <View style={styles.startCard}>
                    <Ionicons name="barbell-outline" size={56} color={colors.accent} />
                    <Text style={styles.startTitle}>Pronto per allenarti?</Text>
                    <Text style={styles.startSubtitle}>
                      {activePlan.weeklySchedule[selectedDayIndex].exercises.length} esercizi programmati - {DAYS[selectedDayIndex]}
                    </Text>

                    {/* Preview esercizi */}
                    <View style={styles.previewList}>
                      {activePlan.weeklySchedule[selectedDayIndex].exercises.map((ex, i) => (
                        <View key={ex.id || i} style={styles.previewItem}>
                          <View style={styles.previewDot} />
                          <Text style={styles.previewText}>
                            {ex.name} - {ex.sets}x{ex.reps}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <TouchableOpacity style={styles.startButton} onPress={handleStartWorkout}>
                      <Ionicons name="play" size={24} color={colors.white} />
                      <Text style={styles.startButtonText}>INIZIA ALLENAMENTO</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              )}
            </>
          )}

          <TouchableOpacity style={styles.historyButton} onPress={handleShowHistory}>
            <Ionicons name="time-outline" size={20} color={colors.accent} />
            <Text style={styles.historyButtonText}>Storico Allenamenti</Text>
          </TouchableOpacity>
        </View>

        {/* Modal Storico */}
        <Modal visible={showHistory} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <ScrollView style={styles.modalContent}>
              <ModalHeader title="Storico Allenamenti" onClose={() => setShowHistory(false)} />
              {workoutHistory.length === 0 ? (
                <Text style={styles.emptyText}>Nessun allenamento registrato</Text>
              ) : (
                workoutHistory.map((log) => (
                  <Card key={log.id} variant="outlined">
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
                          {log.status === 'completed' ? 'Completato' : 'Abbandonato'}
                        </Text>
                      </View>
                    </View>
                    {/* Dettaglio esercizi */}
                    {log.exerciseLogs?.map((el, i) => (
                      <View key={i} style={styles.historyExercise}>
                        <Text style={styles.historyExName}>{el.exerciseName}</Text>
                        <View style={styles.historySets}>
                          {el.sets.map((s, si) => (
                            <Text key={si} style={styles.historySetText}>
                              S{s.setNumber}: {s.weight}kg x {s.reps}
                            </Text>
                          ))}
                        </View>
                      </View>
                    ))}
                    {log.notes ? (
                      <Text style={styles.historyNotes}>Note: {log.notes}</Text>
                    ) : null}
                  </Card>
                ))
              )}
              <View style={{ height: 100 }} />
            </ScrollView>
          </View>
        </Modal>

        <View style={{ height: 100 }} />
      </ScrollView>
    );
  }

  // --- ALLENAMENTO IN CORSO ---
  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Allenamento in Corso</Text>
            <Text style={styles.timerText}>{formatTime(timer)}</Text>
          </View>
          <TouchableOpacity style={styles.abandonBtn} onPress={handleAbandonWorkout}>
            <Ionicons name="close-circle-outline" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${totalSetsTarget > 0 ? (totalSetsCompleted / totalSetsTarget) * 100 : 0}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {totalSetsCompleted}/{totalSetsTarget} serie completate
        </Text>
      </View>

      {/* Navigazione esercizi */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.exerciseNav}
        contentContainerStyle={styles.exerciseNavContent}
      >
        {exerciseLogs.map((ex, i) => {
          const done = ex.sets.length >= ex.targetSets;
          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.exerciseNavItem,
                i === currentExerciseIndex && styles.exerciseNavActive,
                done && styles.exerciseNavDone,
              ]}
              onPress={() => {
                setCurrentExerciseIndex(i);
                setCurrentMiniSets([]);
                setCurrentDropSets([]);
                if (miniRestTimerRef.current) clearInterval(miniRestTimerRef.current);
                setIsMiniResting(false);
                setMiniRestTimer(0);
                setMiniRestElapsed(0);
              }}
            >
              <Text style={[
                styles.exerciseNavText,
                i === currentExerciseIndex && styles.exerciseNavTextActive,
              ]}>
                {done ? '\u2713' : i + 1}
              </Text>
              <Text style={[
                styles.exerciseNavName,
                i === currentExerciseIndex && styles.exerciseNavTextActive,
              ]} numberOfLines={1}>
                {ex.exerciseName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Esercizio corrente */}
      {currentExercise && (
        <View style={styles.content}>
          <Card variant="elevated">
            <Text style={styles.exerciseName}>{currentExercise.exerciseName}</Text>
            <Text style={styles.exerciseTarget}>
              Obiettivo: {currentExercise.targetSets} x {currentExercise.targetReps}
            </Text>
            {currentExercise.technique === 'rest_pause' && (
              <Text style={styles.restPauseTag}>
                SERIE INTERROTTE · {currentExercise.targetMiniSets || 4} mini serie da {currentExercise.targetMiniReps || '6'} · rec {currentExercise.targetMiniRestSeconds || 20}s
              </Text>
            )}
            {currentExercise.technique === 'rest_pause_failure' && (
              <Text style={styles.restPauseTag}>
                REST-PAUSE · serie a cedimento + {currentExercise.targetRpPauses || 2} paus{(currentExercise.targetRpPauses || 2) === 1 ? 'a' : 'e'} da {currentExercise.targetRpRestSeconds || 15}s
              </Text>
            )}
            {currentExercise.technique === 'stripping' && (
              <Text style={styles.restPauseTag}>
                STRIPPING · {currentExercise.targetStripDrops || 3} scarichi da {currentExercise.targetStripRepsPerDrop || '8'} reps · max -{currentExercise.targetStripMaxDropPct || 50}%
              </Text>
            )}
            {currentExercise.technique === 'pyramid' && (
              <Text style={styles.restPauseTag}>
                PIRAMIDALI · {currentExercise.targetPyramidType === 'ascending' ? 'Ascendente ↑ (peso sale, reps scendono)' : currentExercise.targetPyramidType === 'descending' ? 'Discendente ↓ (peso scende, reps salgono)' : 'Triangolare ↑↓'}
              </Text>
            )}
            {currentExercise.technique === 'tempo' && (
              <Text style={styles.restPauseTag}>
                TEMPO · {currentExercise.targetTempoNotation || '4-1-2-0'} (ecc-pausa-conc-pausa)
              </Text>
            )}
            {currentExercise.technique === 'myo_reps' && (
              <Text style={styles.restPauseTag}>
                MYO-REPS · attivazione {currentExercise.targetMyoActivationReps || '12'} + {currentExercise.targetMyoMiniSets || 4}x{currentExercise.targetMyoMiniReps || '3'} · rec {currentExercise.targetMyoRestSeconds || 5}s
              </Text>
            )}
            {currentExercise.technique === 'isometric' && (
              <Text style={styles.restPauseTag}>
                ISOMETRIA · tenuta {currentExercise.targetIsometricHoldSeconds || 30}s
              </Text>
            )}
            {currentExercise.technique === 'twentyone' && (
              <Text style={styles.restPauseTag}>
                21s · 7 parziali basse + 7 parziali alte + 7 complete
              </Text>
            )}
            {currentExercise.technique === 'cluster' && (
              <Text style={styles.restPauseTag}>
                CLUSTER · {currentExercise.targetClusterSets || 5} cluster da {currentExercise.targetClusterReps || 2} reps · pausa {currentExercise.targetClusterRestSeconds || 15}s
              </Text>
            )}
            {currentExercise.technique === 'cumulative' && (
              <Text style={styles.restPauseTag}>
                CUMULATIVA · scala 1→{currentExercise.targetCumulativeReps || 10} rip · attesa {currentExercise.targetCumulativeRestSeconds || 15}s
              </Text>
            )}
            {currentExercise.technique === 'negative' && (
              <Text style={styles.restPauseTag}>
                NEGATIVA · {currentExercise.targetNegativeSeconds || 5}s eccentrica controllata
              </Text>
            )}
            {currentExercise.technique === 'emom' && (
              <Text style={styles.restPauseTag}>
                EMOM · {currentExercise.targetEmomRepsPerMinute || '5'} reps ogni minuto x {currentExercise.targetEmomMinutes || 10} min
              </Text>
            )}

            {/* Serie completate */}
            {currentExercise.sets.length > 0 && (
              <View style={styles.completedSets}>
                <Text style={styles.completedTitle}>Serie completate:</Text>
                {currentExercise.sets.map((s, i) => {
                  const isEditing = editingSet?.exIndex === currentExerciseIndex && editingSet?.setIndex === i;

                  if (isEditing) {
                    return (
                      <View key={i} style={[styles.setRow, { flexDirection: 'column', backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.sm }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                          <View style={styles.setNumber}>
                            <Text style={styles.setNumberText}>{s.setNumber}</Text>
                          </View>
                          <Text style={{ color: colors.accent, fontWeight: '700', fontSize: fontSize.sm }}>Modifica serie</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                          <View style={{ flex: 2 }}>
                            <Text style={{ color: colors.textLight, fontSize: fontSize.xs }}>Peso (kg)</Text>
                            <TextInput
                              style={[styles.input, { marginTop: 2 }]}
                              keyboardType="decimal-pad"
                              value={editWeight}
                              onChangeText={setEditWeight}
                              placeholder="0"
                              placeholderTextColor={colors.textLight}
                              autoFocus
                            />
                          </View>
                          <View style={{ flex: 2 }}>
                            <Text style={{ color: colors.textLight, fontSize: fontSize.xs }}>Reps</Text>
                            <TextInput
                              style={[styles.input, { marginTop: 2 }]}
                              keyboardType="number-pad"
                              value={editReps}
                              onChangeText={setEditReps}
                              placeholder="0"
                              placeholderTextColor={colors.textLight}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.textLight, fontSize: fontSize.xs }}>RPE</Text>
                            <TextInput
                              style={[styles.input, { marginTop: 2 }]}
                              keyboardType="number-pad"
                              value={editRpe}
                              onChangeText={setEditRpe}
                              placeholder="-"
                              placeholderTextColor={colors.textLight}
                            />
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                          <TouchableOpacity
                            style={{ flex: 1, backgroundColor: colors.error + '20', borderRadius: borderRadius.md, paddingVertical: 8, alignItems: 'center' }}
                            onPress={handleDeleteSet}
                          >
                            <Ionicons name="trash-outline" size={18} color={colors.error} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ flex: 2, backgroundColor: colors.surface, borderRadius: borderRadius.md, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
                            onPress={() => setEditingSet(null)}
                          >
                            <Text style={{ color: colors.textLight }}>Annulla</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ flex: 2, backgroundColor: colors.accent, borderRadius: borderRadius.md, paddingVertical: 8, alignItems: 'center' }}
                            onPress={handleSaveEdit}
                          >
                            <Text style={{ color: colors.white, fontWeight: '700' }}>Salva</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }

                  return (
                    <TouchableOpacity key={i} style={styles.setRow} onPress={() => handleEditSet(currentExerciseIndex, i)} activeOpacity={0.6}>
                      <View style={styles.setNumber}>
                        <Text style={styles.setNumberText}>{s.setNumber}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.setText}>
                          {s.weight > 0 ? `${s.weight} kg` : 'Corpo libero'} x {s.reps} reps
                        </Text>
                        {s.miniSetDetails && s.miniSetDetails.length > 0 && (
                          <Text style={styles.miniSetSummary}>
                            {s.miniSetsCompleted} mini serie: {s.miniSetDetails.map((m) => m.reps).join('/')}
                            {' '}(rec {s.miniSetDetails.slice(0, -1).map((m) => `${m.restSeconds}s`).join('/') || '-'})
                          </Text>
                        )}
                        {s.dropSetDetails && s.dropSetDetails.length > 0 && (
                          <Text style={styles.miniSetSummary}>
                            {s.dropSetsCompleted} drop: {s.dropSetDetails.map((d) => `${d.weight}kg x${d.reps}`).join(' → ')}
                          </Text>
                        )}
                      </View>
                      {s.rpe && <Text style={styles.rpeText}>RPE {s.rpe}</Text>}
                      <Ionicons name="pencil" size={14} color={colors.textLight} style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Timer recupero */}
            {isResting && (
              <View style={styles.restContainer}>
                <Text style={styles.restTitle}>Recupero</Text>
                <Text style={styles.restTimer}>{restTimer}s</Text>
                <TouchableOpacity style={styles.skipRestBtn} onPress={skipRest}>
                  <Text style={styles.skipRestText}>Salta recupero</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Input serie (se non ho completato tutte le serie di questo esercizio) */}
            {currentExercise.sets.length < currentExercise.targetSets && (
              currentExercise.technique === 'stripping' ? (
                <View style={styles.inputSection}>
                  <Text style={styles.inputTitle}>
                    Serie Stripping {currentExercise.sets.length + 1} di {currentExercise.targetSets}
                  </Text>
                  <Text style={styles.restPauseHint}>
                    Obiettivo: {currentExercise.targetStripDrops || 3} scarichi da {currentExercise.targetStripRepsPerDrop || '8'} reps
                    {' '}· max -{currentExercise.targetStripMaxDropPct || 50}%
                  </Text>

                  {currentDropSets.length > 0 && (
                    <View style={styles.miniSetList}>
                      {currentDropSets.map((d, i) => (
                        <View key={i} style={styles.miniSetRow}>
                          <Text style={styles.miniSetRowText}>
                            Drop {i + 1}: {d.weight} kg x {d.reps} reps
                          </Text>
                          <TouchableOpacity onPress={() => handleRemoveDrop(i)}>
                            <Ionicons name="close-circle" size={18} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  <Text style={styles.inputLabel}>
                    Drop {currentDropSets.length + 1} di {currentExercise.targetStripDrops || 3}
                  </Text>
                  <View style={styles.inputRow}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Peso (kg)</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="decimal-pad"
                        value={dropWeightInput}
                        onChangeText={setDropWeightInput}
                        placeholder="0"
                        placeholderTextColor={colors.textLight}
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Reps fatte</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="number-pad"
                        value={dropRepsInput}
                        onChangeText={setDropRepsInput}
                        placeholder={currentExercise.targetStripRepsPerDrop || '8'}
                        placeholderTextColor={colors.textLight}
                      />
                    </View>
                  </View>

                  <TouchableOpacity style={styles.miniSetButton} onPress={handleLogDrop}>
                    <Ionicons name="add-circle" size={20} color={colors.accent} />
                    <Text style={styles.miniSetButtonText}>REGISTRA DROP</Text>
                  </TouchableOpacity>

                  {currentDropSets.length > 0 && (
                    <TouchableOpacity style={styles.logSetButton} onPress={handleCompleteStrippingSet}>
                      <Ionicons name="checkmark-circle" size={24} color={colors.white} />
                      <Text style={styles.logSetButtonText}>
                        COMPLETA SERIE ({currentDropSets.length} drop)
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (currentExercise.technique === 'rest_pause' || currentExercise.technique === 'rest_pause_failure' || currentExercise.technique === 'myo_reps' || currentExercise.technique === 'cluster' || currentExercise.technique === 'cumulative') ? (
                <View style={styles.inputSection}>
                  <Text style={styles.inputTitle}>
                    {currentExercise.technique === 'rest_pause' ? 'Serie Interrotta' : currentExercise.technique === 'rest_pause_failure' ? 'Rest-Pause' : currentExercise.technique === 'myo_reps' ? 'Myo-reps' : currentExercise.technique === 'cumulative' ? 'Serie Cumulativa' : 'Cluster'}{' '}
                    {currentExercise.sets.length + 1} di {currentExercise.targetSets}
                  </Text>
                  <Text style={styles.restPauseHint}>
                    {currentExercise.technique === 'rest_pause' && (
                      `Obiettivo: ${currentExercise.targetMiniSets || 4} mini serie da ${currentExercise.targetMiniReps || '6'} reps · rec ${currentExercise.targetMiniRestSeconds || 20}s`
                    )}
                    {currentExercise.technique === 'rest_pause_failure' && (
                      `Serie principale A CEDIMENTO (peso da ${currentExercise.targetReps} reps), poi ${currentExercise.targetRpPauses || 2} paus${(currentExercise.targetRpPauses || 2) === 1 ? 'a' : 'e'} da ${currentExercise.targetRpRestSeconds || 15}s: dopo ogni pausa, di nuovo a cedimento. Registra le reps che escono.`
                    )}
                    {currentExercise.technique === 'myo_reps' && (
                      `${currentMiniSets.length === 0 ? `Serie attivante: ${currentExercise.targetMyoActivationReps || '12'} reps` : `Mini serie: ${currentExercise.targetMyoMiniReps || '3'} reps · rec ${currentExercise.targetMyoRestSeconds || 5}s`} · tot ${(currentExercise.targetMyoMiniSets || 4) + 1} mini serie`
                    )}
                    {currentExercise.technique === 'cluster' && (
                      `Obiettivo: ${currentExercise.targetClusterSets || 5} cluster da ${currentExercise.targetClusterReps || 2} reps · pausa ${currentExercise.targetClusterRestSeconds || 15}s`
                    )}
                    {currentExercise.technique === 'cumulative' && (
                      `Scala 1→${currentExercise.targetCumulativeReps || 10}: 1 rip, attesa ${currentExercise.targetCumulativeRestSeconds || 15}s, 2 rip, attesa, ... fino a ${currentExercise.targetCumulativeReps || 10}. Registra ogni gradino.`
                    )}
                  </Text>

                  <View style={styles.inputRow}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Peso (kg)</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="decimal-pad"
                        value={inputWeight}
                        onChangeText={setInputWeight}
                        placeholder="0"
                        placeholderTextColor={colors.textLight}
                      />
                    </View>
                  </View>

                  {currentMiniSets.length > 0 && (
                    <View style={styles.miniSetList}>
                      {currentMiniSets.map((m, i) => (
                        <View key={i} style={styles.miniSetRow}>
                          <Text style={styles.miniSetRowText}>
                            {currentExercise.technique === 'myo_reps' && i === 0 ? 'Attivazione' : currentExercise.technique === 'rest_pause_failure' && i === 0 ? 'Principale' : currentExercise.technique === 'rest_pause_failure' ? `Dopo pausa ${i}` : currentExercise.technique === 'cluster' ? `Cluster ${i + 1}` : currentExercise.technique === 'cumulative' ? `Gradino ${i + 1}` : `Mini ${i + 1}`}: {m.reps} reps{m.restSeconds > 0 ? ` · rec ${m.restSeconds}s` : ''}
                          </Text>
                          <TouchableOpacity onPress={() => handleRemoveMiniSet(i)}>
                            <Ionicons name="close-circle" size={18} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {isMiniResting && (
                    <View style={styles.miniRestContainer}>
                      <View style={styles.miniRestTimerCircle}>
                        <Text style={styles.miniRestTimerText}>{miniRestTimer}</Text>
                        <Text style={styles.miniRestTimerLabel}>sec</Text>
                      </View>
                      <Text style={styles.miniRestTitle}>
                        {currentExercise.technique === 'cluster' ? 'Pausa tra cluster' : currentExercise.technique === 'myo_reps' ? 'Pausa myo-reps' : currentExercise.technique === 'cumulative' ? 'Attesa tra gradini' : currentExercise.technique === 'rest_pause_failure' ? 'Pausa — poi di nuovo a cedimento' : 'Recupero tra mini serie'}
                      </Text>
                      <TouchableOpacity style={styles.skipMiniRestBtn} onPress={skipMiniRest}>
                        <Ionicons name="play-forward" size={18} color={colors.accent} />
                        <Text style={styles.skipMiniRestText}>Salta</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {!isMiniResting && (
                    <>
                      <Text style={styles.inputLabel}>
                        {currentExercise.technique === 'myo_reps' && currentMiniSets.length === 0
                          ? 'Serie attivante'
                          : currentExercise.technique === 'rest_pause_failure' && currentMiniSets.length === 0
                          ? 'Serie principale — a cedimento'
                          : currentExercise.technique === 'rest_pause_failure'
                          ? `Dopo pausa ${currentMiniSets.length} di ${currentExercise.targetRpPauses || 2} — a cedimento`
                          : currentExercise.technique === 'cluster'
                          ? `Cluster ${currentMiniSets.length + 1} di ${currentExercise.targetClusterSets || 5}`
                          : currentExercise.technique === 'cumulative'
                          ? `Gradino ${currentMiniSets.length + 1}: ${currentMiniSets.length + 1} rip (obiettivo ${currentExercise.targetCumulativeReps || 10})`
                          : currentExercise.technique === 'myo_reps'
                          ? `Mini serie ${currentMiniSets.length} di ${currentExercise.targetMyoMiniSets || 4}`
                          : `Mini serie ${currentMiniSets.length + 1} di ${currentExercise.targetMiniSets || 4}`}
                      </Text>
                      <View style={styles.inputRow}>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Reps fatte</Text>
                          <TextInput
                            style={styles.input}
                            keyboardType="number-pad"
                            value={miniRepsInput}
                            onChangeText={setMiniRepsInput}
                            placeholder={
                              currentExercise.technique === 'myo_reps'
                                ? (currentMiniSets.length === 0 ? (currentExercise.targetMyoActivationReps || '12') : (currentExercise.targetMyoMiniReps || '3'))
                                : currentExercise.technique === 'cluster'
                                ? String(currentExercise.targetClusterReps || 2)
                                : currentExercise.technique === 'cumulative'
                                ? String(currentMiniSets.length + 1)
                                : (currentExercise.targetMiniReps || '6')
                            }
                            placeholderTextColor={colors.textLight}
                          />
                        </View>
                      </View>

                      <TouchableOpacity style={styles.miniSetButton} onPress={handleLogMiniSet}>
                        <Ionicons name="add-circle" size={20} color={colors.accent} />
                        <Text style={styles.miniSetButtonText}>
                          {currentExercise.technique === 'myo_reps' && currentMiniSets.length === 0 ? 'REGISTRA ATTIVAZIONE' : currentExercise.technique === 'cluster' ? 'REGISTRA CLUSTER' : currentExercise.technique === 'cumulative' ? 'REGISTRA GRADINO' : 'REGISTRA MINI SERIE'}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {currentMiniSets.length > 0 && (
                    <TouchableOpacity style={styles.logSetButton} onPress={handleCompleteRestPauseSet}>
                      <Ionicons name="checkmark-circle" size={24} color={colors.white} />
                      <Text style={styles.logSetButtonText}>
                        COMPLETA SERIE ({currentMiniSets.length} {currentExercise.technique === 'cluster' ? 'cluster' : currentExercise.technique === 'cumulative' ? 'gradini' : 'mini'})
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
              <View style={styles.inputSection}>
                <Text style={styles.inputTitle}>
                  Serie {currentExercise.sets.length + 1} di {currentExercise.targetSets}
                </Text>

                {currentExercise.technique === 'pyramid' && (
                  <Text style={styles.restPauseHint}>
                    {currentExercise.targetPyramidType === 'ascending'
                      ? `Serie ${currentExercise.sets.length + 1}: aumenta il peso, riduci le reps`
                      : currentExercise.targetPyramidType === 'descending'
                      ? `Serie ${currentExercise.sets.length + 1}: riduci il peso, aumenta le reps`
                      : currentExercise.sets.length + 1 <= Math.ceil(currentExercise.targetSets / 2)
                      ? `Serie ${currentExercise.sets.length + 1}: fase ascendente (peso ↑ reps ↓)`
                      : `Serie ${currentExercise.sets.length + 1}: fase discendente (peso ↓ reps ↑)`}
                  </Text>
                )}
                {currentExercise.technique === 'tempo' && (
                  <Text style={styles.restPauseHint}>
                    Tempo: {currentExercise.targetTempoNotation || '4-1-2-0'} (eccentrica-pausa bassa-concentrica-pausa alta)
                  </Text>
                )}
                {currentExercise.technique === 'isometric' && (
                  <Text style={styles.restPauseHint}>
                    Mantieni la posizione per {currentExercise.targetIsometricHoldSeconds || 30} secondi
                  </Text>
                )}
                {currentExercise.technique === 'twentyone' && (
                  <Text style={styles.restPauseHint}>
                    7 reps parziali basse + 7 parziali alte + 7 complete = 21 totali
                  </Text>
                )}
                {currentExercise.technique === 'negative' && (
                  <Text style={styles.restPauseHint}>
                    Fase eccentrica (discesa) di {currentExercise.targetNegativeSeconds || 5} secondi per ogni rep
                  </Text>
                )}
                {currentExercise.technique === 'emom' && (
                  <Text style={styles.restPauseHint}>
                    EMOM: {currentExercise.targetEmomRepsPerMinute || '5'} reps ogni minuto per {currentExercise.targetEmomMinutes || 10} minuti
                  </Text>
                )}

                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Peso (kg)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="decimal-pad"
                      value={inputWeight}
                      onChangeText={setInputWeight}
                      placeholder="0"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Reps</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="number-pad"
                      value={inputReps}
                      onChangeText={setInputReps}
                      placeholder={currentExercise.technique === 'twentyone' ? '21' : '0'}
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                  <View style={styles.inputGroupSmall}>
                    <Text style={styles.inputLabel}>RPE</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="number-pad"
                      value={inputRpe}
                      onChangeText={setInputRpe}
                      placeholder="-"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                </View>

                <TouchableOpacity style={styles.logSetButton} onPress={handleLogSet}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.white} />
                  <Text style={styles.logSetButtonText}>REGISTRA SERIE</Text>
                </TouchableOpacity>
              </View>
              )
            )}

            {/* Tutte le serie completate per questo esercizio */}
            {currentExercise.sets.length >= currentExercise.targetSets && (
              <View style={styles.exerciseDone}>
                <Ionicons name="checkmark-done-circle" size={40} color={colors.success} />
                <Text style={styles.exerciseDoneText}>Esercizio completato!</Text>
                {/* Permetti di aggiungere serie extra */}
                <TouchableOpacity
                  style={styles.extraSetBtn}
                  onPress={() => {
                    // Resetta input per serie extra
                    setInputReps('');
                  }}
                >
                  <Text style={styles.extraSetText}>+ Serie extra</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>

          {/* Completa allenamento */}
          {allDone && (
            <View style={styles.completeSection}>
              <TextInput
                style={styles.notesInput}
                placeholder="Note sulla sessione (opzionale)..."
                placeholderTextColor={colors.textLight}
                multiline
                value={sessionNotes}
                onChangeText={setSessionNotes}
              />
              <TouchableOpacity style={styles.completeButton} onPress={handleCompleteWorkout}>
                <Ionicons name="trophy" size={24} color={colors.white} />
                <Text style={styles.completeButtonText}>COMPLETA ALLENAMENTO</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <View style={{ height: 120 }} />
    </ScrollView>
  );
};

const formatDateShort = (date: any): string => {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: { fontSize: fontSize.md, color: colors.accent, fontWeight: '600', marginBottom: 2 },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textOnPrimary },
  subtitle: { fontSize: fontSize.md, color: colors.accent, marginTop: 2, fontWeight: '600' },
  timerText: { fontSize: fontSize.hero, fontWeight: '700', color: colors.accent, marginTop: spacing.xs },
  abandonBtn: { padding: spacing.sm },
  progressBar: {
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  progressText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  content: { padding: spacing.md },
  daySelector: { marginBottom: spacing.md },
  dayChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    alignItems: 'center',
    ...shadows.small,
  },
  dayChipActive: { backgroundColor: colors.accent },
  dayChipText: { fontSize: fontSize.md, fontWeight: '600', color: colors.textSecondary },
  dayChipTextActive: { color: colors.textOnAccent },
  todayDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.accent, marginTop: 3,
  },
  exerciseDot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: colors.success, marginTop: 2,
  },
  differentDayHint: {
    fontSize: fontSize.sm,
    color: colors.warning,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  exerciseNav: { marginTop: spacing.sm },
  exerciseNavContent: { paddingHorizontal: spacing.md, gap: spacing.sm },
  exerciseNavItem: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    minWidth: 70,
    ...shadows.small,
  },
  exerciseNavActive: { backgroundColor: colors.accent },
  exerciseNavDone: { backgroundColor: colors.success + '30' },
  exerciseNavText: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  exerciseNavTextActive: { color: colors.white },
  exerciseNavName: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2, maxWidth: 60 },
  exerciseName: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  exerciseTarget: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: 4 },
  restPauseTag: {
    fontSize: fontSize.xs,
    color: colors.accent,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  restPauseHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  miniSetSummary: {
    fontSize: fontSize.xs,
    color: colors.accent,
    marginTop: 2,
  },
  miniSetList: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: 4,
  },
  miniSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniSetRowText: { fontSize: fontSize.sm, color: colors.text },
  miniSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  miniSetButtonText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: fontSize.sm,
    letterSpacing: 1,
  },
  miniRestContainer: {
    alignItems: 'center',
    backgroundColor: colors.accent + '10',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  miniRestTimerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  miniRestTimerText: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.white,
  },
  miniRestTimerLabel: {
    fontSize: fontSize.xs,
    color: colors.white,
    marginTop: -4,
    fontWeight: '600',
  },
  miniRestTitle: {
    fontSize: fontSize.md,
    color: colors.accent,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  skipMiniRestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  skipMiniRestText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  completedSets: { marginTop: spacing.md },
  completedTitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.sm,
  },
  setNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setNumberText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  setText: { fontSize: fontSize.md, color: colors.text, flex: 1 },
  rpeText: { fontSize: fontSize.sm, color: colors.warning, fontWeight: '600' },
  restContainer: {
    marginTop: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  restTitle: { fontSize: fontSize.md, color: colors.textSecondary },
  restTimer: { fontSize: 48, fontWeight: '700', color: colors.accent, marginVertical: spacing.sm },
  skipRestBtn: { marginTop: spacing.sm },
  skipRestText: { color: colors.accent, fontSize: fontSize.md, fontWeight: '600' },
  inputSection: { marginTop: spacing.lg },
  inputTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  inputRow: { flexDirection: 'row', gap: spacing.sm },
  inputGroup: { flex: 2 },
  inputGroupSmall: { flex: 1 },
  inputLabel: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: 4 },
  input: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  logSetButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  logSetButtonText: { color: colors.white, fontSize: fontSize.lg, fontWeight: '800' },
  exerciseDone: { marginTop: spacing.lg, alignItems: 'center' },
  exerciseDoneText: { fontSize: fontSize.lg, color: colors.success, fontWeight: '700', marginTop: spacing.sm },
  extraSetBtn: { marginTop: spacing.sm },
  extraSetText: { color: colors.accent, fontSize: fontSize.md, fontWeight: '600' },
  completeSection: { marginTop: spacing.lg },
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  completeButton: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  completeButtonText: { color: colors.white, fontSize: fontSize.lg, fontWeight: '800' },
  startCard: { alignItems: 'center', padding: spacing.lg },
  startTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  startSubtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.xs },
  previewList: { marginTop: spacing.lg, width: '100%' },
  previewItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  previewDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  previewText: { fontSize: fontSize.md, color: colors.text },
  startButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  startButtonText: { color: colors.white, fontSize: fontSize.lg, fontWeight: '800' },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyButtonText: { color: colors.accent, fontSize: fontSize.md, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', padding: spacing.xl },
  emptyText: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md, lineHeight: 22 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  historyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  historyInfo: { flex: 1 },
  historyDate: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  historyStats: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { borderRadius: borderRadius.md, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  statusText: { color: colors.white, fontSize: fontSize.xs, fontWeight: '700' },
  historyExercise: { marginTop: spacing.sm, paddingLeft: spacing.md },
  historyExName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  historySets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 2 },
  historySetText: { fontSize: fontSize.xs, color: colors.textSecondary },
  historyNotes: { fontSize: fontSize.sm, color: colors.warning, fontStyle: 'italic', marginTop: spacing.sm },
});
