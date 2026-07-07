import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { crossAlert } from '../../utils/alert';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebase';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { ModalHeader } from '../../components/common/ModalHeader';
import { Exercise, ExerciseCategory, WeeklyDay, Student, WorkoutPlan } from '../../types';
import { StudentSearchPicker } from '../../components/common/StudentSearchPicker';
import { useAuth } from '../../hooks/useAuth';
import { createWorkoutPlan, updateWorkoutPlan, getActiveWorkoutPlan, getStudentWorkoutPlans, addExerciseToLibrary } from '../../services/programService';
import { getFullExerciseLibrary, LibraryExercise } from '../../services/programService';
import { getStudents } from '../../services/authService';
import { isStudentAssignedTo } from '../../utils/helpers';
import { createNotification } from '../../services/notificationService';
import {
  suggestWorkoutProgression,
  suggestExercises,
  generateWorkoutPlan,
  AIProgressionSuggestion,
  AIGeneratedWorkoutPlan,
  ensureAIApiKey,
} from '../../services/aiService';
import { allTemplates, WorkoutTemplate } from '../../data/workoutTemplates';
import { getCustomTemplates, CustomWorkoutTemplate, createCustomTemplate } from '../../services/programService';
import { Ionicons } from '@expo/vector-icons';
import { printWorkoutPlan } from '../../utils/printUtils';

const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

const CATEGORIES: { value: ExerciseCategory; label: string }[] = [
  { value: 'forza', label: 'Forza' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'mobilita', label: 'Mobilità' },
  { value: 'stretching', label: 'Stretching' },
  { value: 'funzionale', label: 'Funzionale' },
  { value: 'posturale', label: 'Posturale' },
  { value: 'altro', label: 'Altro' },
];

export const WorkoutPlanScreen: React.FC = () => {
  const { user, isOwner, isManager, isCollaborator } = useAuth();
  const route = useRoute<any>();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [planTitle, setPlanTitle] = useState('');
  const [selectedDay, setSelectedDay] = useState(0);
  const [exercises, setExercises] = useState<Record<number, Exercise[]>>({});
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editing state
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);

  // Form esercizio
  const [exName, setExName] = useState('');
  const [exDescription, setExDescription] = useState('');
  const [exSets, setExSets] = useState('');
  const [exReps, setExReps] = useState('');
  const [exRest, setExRest] = useState('');
  const [exCategory, setExCategory] = useState<ExerciseCategory>('forza');
  const [exVideoUrl, setExVideoUrl] = useState('');
  const [exNotes, setExNotes] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Tecnica
  const [exTechnique, setExTechnique] = useState<Exercise['technique']>('standard');
  const [exMiniSets, setExMiniSets] = useState('4');
  const [exMiniReps, setExMiniReps] = useState('6');
  const [exMiniRest, setExMiniRest] = useState('20');
  const [exStripDrops, setExStripDrops] = useState('3');
  const [exStripRepsPerDrop, setExStripRepsPerDrop] = useState('8');
  const [exStripMaxDropPct, setExStripMaxDropPct] = useState('50');
  // Piramidali
  const [exPyramidType, setExPyramidType] = useState<'ascending' | 'descending' | 'triangular'>('ascending');
  // Tempo controllato
  const [exTempo, setExTempo] = useState('4-1-2-0');
  // Myo-reps
  const [exMyoActivationReps, setExMyoActivationReps] = useState('12');
  const [exMyoMiniReps, setExMyoMiniReps] = useState('3');
  const [exMyoMiniSets, setExMyoMiniSets] = useState('4');
  const [exMyoRest, setExMyoRest] = useState('5');
  // Isometria
  const [exIsometricHold, setExIsometricHold] = useState('30');
  // Cluster
  const [exClusterReps, setExClusterReps] = useState('2');
  const [exClusterSets, setExClusterSets] = useState('5');
  const [exClusterRest, setExClusterRest] = useState('15');
  const [exCumulativeTarget, setExCumulativeTarget] = useState('10');
  const [exCumulativeRest, setExCumulativeRest] = useState('15');
  // Negativa enfatizzata
  const [exNegativeSeconds, setExNegativeSeconds] = useState('5');
  // EMOM
  const [exEmomMinutes, setExEmomMinutes] = useState('10');
  const [exEmomReps, setExEmomReps] = useState('5');

  // Template State
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateFilter, setTemplateFilter] = useState<'all' | 'male' | 'female'>('all');
  const [customTemplates, setCustomTemplates] = useState<CustomWorkoutTemplate[]>([]);
  const [templateTab, setTemplateTab] = useState<'custom' | 'builtin'>('custom');

  // History State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [studentPlans, setStudentPlans] = useState<WorkoutPlan[]>([]);
  const [viewingPlan, setViewingPlan] = useState<WorkoutPlan | null>(null);
  const [historySelectedDay, setHistorySelectedDay] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // AI State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AIProgressionSuggestion | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiExercisesLoading, setAiExercisesLoading] = useState(false);

  // AI Generate Plan State
  const [showAiGenerateModal, setShowAiGenerateModal] = useState(false);
  const [aiGenGoals, setAiGenGoals] = useState('');
  const [aiGenLevel, setAiGenLevel] = useState<'principiante' | 'intermedio' | 'avanzato'>('intermedio');
  const [aiGenDays, setAiGenDays] = useState(3);
  const [aiGenEquipment, setAiGenEquipment] = useState('Palestra completa');
  const [aiGenLoading, setAiGenLoading] = useState(false);

  // Exercise Library State
  const [exerciseLibrary, setExerciseLibrary] = useState<LibraryExercise[]>([]);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryGenderFilter, setLibraryGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [saveToLibrary, setSaveToLibrary] = useState(false);

  const loadStudents = useCallback(async () => {
    if (!user) return;
    try {
      const allStudents = await getStudents();
      if (isOwner) {
        setStudents(allStudents);
      } else if (isManager) {
        // Manager vede allievi assegnati direttamente o tramite assignedManagerId
        setStudents(allStudents.filter((s) => isStudentAssignedTo(s, user.id) || s.assignedManagerId === user.id));
      } else if (isCollaborator) {
        setStudents(allStudents.filter((s) => isStudentAssignedTo(s, user.id)));
      }
    } catch {
      // Silently handle
    }
  }, [user, isOwner, isManager, isCollaborator]);

  const loadCustomTemplates = useCallback(async () => {
    try {
      const templates = await getCustomTemplates();
      setCustomTemplates(templates);
    } catch {
      // silently handle
    }
  }, []);

  const loadExerciseLibrary = useCallback(async () => {
    try {
      const library = await getFullExerciseLibrary();
      setExerciseLibrary(library);
    } catch {
      // silently handle
    }
  }, []);

  useEffect(() => {
    loadStudents();
    loadCustomTemplates();
    loadExerciseLibrary();
  }, [loadStudents, loadCustomTemplates, loadExerciseLibrary]);

  useEffect(() => {
    const tpl = route.params?.template;
    if (!tpl?.weeklySchedule) return;
    const newExercises: Record<number, Exercise[]> = {};
    for (const day of tpl.weeklySchedule) {
      if (day.exercises?.length > 0) {
        newExercises[day.dayOfWeek] = day.exercises.map((ex: any, i: number) => ({
          ...ex,
          id: ex.id || `${Date.now()}_${day.dayOfWeek}_${i}`,
        }));
      }
    }
    setExercises(newExercises);
    setPlanTitle(tpl.name || '');
    setSelectedDay(0);
    crossAlert('Template Caricato', `"${tpl.name}" pronto. Seleziona un allievo e modifica gli esercizi.`);
  }, [route.params?.template]);

  const formatDate = (date: any) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleViewStudentHistory = async () => {
    if (!selectedStudentId) {
      crossAlert('Errore', 'Seleziona prima un allievo');
      return;
    }
    setLoadingHistory(true);
    setShowHistoryModal(true);
    try {
      const plans = await getStudentWorkoutPlans(selectedStudentId);
      setStudentPlans(plans);
    } catch {
      crossAlert('Errore', 'Impossibile caricare le programmazioni');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Applica un template alla scheda corrente
  const applyTemplate = (template: WorkoutTemplate) => {
    const newExercises: Record<number, Exercise[]> = {};
    for (const day of template.weeklySchedule) {
      newExercises[day.dayOfWeek] = day.exercises.map((ex, i) => ({
        ...ex,
        id: `${Date.now()}_${day.dayOfWeek}_${i}`,
      }));
    }
    setExercises(newExercises);
    setPlanTitle(template.name);
    setShowTemplateModal(false);
    crossAlert('Template Applicato', `"${template.name}" caricato. Puoi modificare gli esercizi prima di salvare.`);
  };

  const applyCustomTemplate = (template: CustomWorkoutTemplate) => {
    const newExercises: Record<number, Exercise[]> = {};
    for (const day of template.weeklySchedule) {
      newExercises[day.dayOfWeek] = day.exercises.map((ex, i) => ({
        ...ex,
        id: `${Date.now()}_${day.dayOfWeek}_${i}`,
      }));
    }
    setExercises(newExercises);
    setPlanTitle(template.name);
    setShowTemplateModal(false);
    crossAlert('Template Applicato', `"${template.name}" caricato. Puoi modificare gli esercizi prima di salvare.`);
  };

  const filteredTemplates = allTemplates.filter((t) =>
    templateFilter === 'all' ? true : t.gender === templateFilter
  );

  const filteredCustomTemplates = customTemplates.filter((t) =>
    templateFilter === 'all' ? true : t.gender === templateFilter
  );

  // Upload video esercizio su Firebase Storage
  const pickAndUploadVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 0.7,
        videoMaxDuration: 120,
      });

      if (result.canceled || !result.assets[0]) return;

      setUploadingVideo(true);
      const videoUri = result.assets[0].uri;
      const timestamp = Date.now();
      const videoRef = ref(storage, `exercise-videos/${timestamp}.mp4`);

      const response = await fetch(videoUri);
      const blob = await response.blob();
      await uploadBytes(videoRef, blob);
      const downloadUrl = await getDownloadURL(videoRef);

      setExVideoUrl(downloadUrl);
      crossAlert('Successo', 'Video caricato!');
    } catch {
      crossAlert('Errore', 'Impossibile caricare il video');
    } finally {
      setUploadingVideo(false);
    }
  };

  // AI: genera progressione dalla scheda attuale
  const handleAIProgression = async () => {
    if (!selectedStudentId) {
      crossAlert('Errore', 'Seleziona prima un allievo');
      return;
    }
    if (!(await ensureAIApiKey())) {
      crossAlert('API Key mancante', 'Inserisci la chiave API Anthropic nelle impostazioni.');
      return;
    }

    setAiLoading(true);
    try {
      const activePlan = await getActiveWorkoutPlan(selectedStudentId);
      if (!activePlan) {
        crossAlert('Nessuna scheda', 'L\'allievo non ha una scheda attiva da cui generare la progressione.');
        return;
      }

      const student = students.find((s) => s.id === selectedStudentId);
      if (!student) return;

      const suggestion = await suggestWorkoutProgression(
        {
          title: activePlan.title,
          weeklySchedule: activePlan.weeklySchedule,
        },
        {
          name: `${student.name} ${student.surname}`,
          goals: student.goals,
          medicalNotes: student.medicalNotes,
        },
        4 // settimana corrente (semplificato)
      );

      setAiSuggestion(suggestion);
      setShowAiModal(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore AI';
      crossAlert('Errore', msg);
    } finally {
      setAiLoading(false);
    }
  };

  // AI: applica la progressione suggerita
  const applyAISuggestion = () => {
    if (!aiSuggestion) return;

    const dayMap: Record<string, number> = {
      'Lunedì': 0, 'Martedì': 1, 'Mercoledì': 2, 'Giovedì': 3,
      'Venerdì': 4, Sabato: 5, Domenica: 6,
    };

    const newExercises: Record<number, Exercise[]> = {};
    for (const day of aiSuggestion.weeklySchedule) {
      const dayIndex = dayMap[day.day] ?? 0;
      newExercises[dayIndex] = day.exercises.map((ex, i) => ({
        id: `${Date.now()}_${dayIndex}_${i}`,
        name: ex.name,
        description: '',
        sets: ex.sets,
        reps: ex.reps,
        restSeconds: ex.restSeconds,
        notes: ex.notes,
        category: (ex.category as ExerciseCategory) || 'forza',
      }));
    }

    setExercises(newExercises);
    setPlanTitle(aiSuggestion.title);
    setShowAiModal(false);
    crossAlert('Applicata!', 'La progressione AI è stata applicata. Puoi modificarla prima di salvare.');
  };

  // AI: suggerisci esercizi per categoria
  const handleAIExerciseSuggestion = async () => {
    if (!(await ensureAIApiKey())) {
      crossAlert('API Key mancante', 'Inserisci la chiave API Anthropic nelle impostazioni.');
      return;
    }

    const student = students.find((s) => s.id === selectedStudentId);
    const goal = student?.goals || 'fitness generale';

    setAiExercisesLoading(true);
    try {
      const suggestions = await suggestExercises(exCategory, goal);
      if (suggestions.length === 0) {
        crossAlert('Nessun suggerimento', 'L\'AI non ha generato suggerimenti');
        return;
      }

      // Mostra i suggerimenti e lascia scegliere
      const firstSuggestion = suggestions[0];
      crossAlert(
        'Suggerimento AI',
        `${firstSuggestion.name}\n${firstSuggestion.sets}x${firstSuggestion.reps} (rec ${firstSuggestion.restSeconds}s)\n\n${firstSuggestion.description}`,
        [
          { text: 'Ignora', style: 'cancel' },
          {
            text: 'Usa',
            onPress: () => {
              setExName(firstSuggestion.name);
              setExSets(String(firstSuggestion.sets));
              setExReps(firstSuggestion.reps);
              setExRest(String(firstSuggestion.restSeconds));
              setExDescription(firstSuggestion.description);
            },
          },
        ]
      );
    } catch {
      crossAlert('Errore', 'Impossibile ottenere suggerimenti AI');
    } finally {
      setAiExercisesLoading(false);
    }
  };

  // AI: genera scheda completa
  const handleAIGeneratePlan = async () => {
    if (!selectedStudentId) {
      crossAlert('Errore', 'Seleziona prima un allievo');
      return;
    }
    if (!aiGenGoals.trim()) {
      crossAlert('Errore', 'Inserisci gli obiettivi dell\'allievo');
      return;
    }
    if (!(await ensureAIApiKey())) {
      crossAlert('API Key mancante', 'Inserisci la chiave API Anthropic nelle impostazioni.');
      return;
    }

    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) return;

    setAiGenLoading(true);
    try {
      const result = await generateWorkoutPlan({
        studentName: `${student.name} ${student.surname}`,
        goals: aiGenGoals,
        level: aiGenLevel,
        daysPerWeek: aiGenDays,
        equipment: aiGenEquipment,
        medicalNotes: student.medicalNotes,
      });

      if (!result.weeklySchedule || result.weeklySchedule.length === 0) {
        crossAlert('Errore', 'L\'AI non ha generato una scheda valida. Riprova.');
        return;
      }

      // Populate the form with AI-generated exercises
      const newExercises: Record<number, Exercise[]> = {};
      for (const day of result.weeklySchedule) {
        newExercises[day.dayOfWeek] = day.exercises.map((ex, i) => ({
          id: `${Date.now()}_${day.dayOfWeek}_${i}`,
          name: ex.name,
          description: ex.description || '',
          sets: ex.sets,
          reps: ex.reps,
          restSeconds: ex.restSeconds,
          notes: ex.notes || '',
          category: (ex.category as ExerciseCategory) || 'forza',
        }));
      }

      setExercises(newExercises);
      if (result.title) {
        setPlanTitle(result.title);
      }
      setShowAiGenerateModal(false);
      crossAlert('Scheda Generata!', 'La scheda AI è stata creata. Puoi modificarla prima di salvare.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore nella generazione AI';
      crossAlert('Errore', msg);
    } finally {
      setAiGenLoading(false);
    }
  };

  const selectFromLibrary = (libEx: LibraryExercise) => {
    setExName(libEx.name);
    setExDescription(libEx.description);
    setExSets(String(libEx.sets));
    setExReps(libEx.reps);
    setExRest(String(libEx.restSeconds));
    setExCategory(libEx.category);
    setExVideoUrl(libEx.videoUrl || '');
    setExNotes(libEx.notes);
    setShowLibraryPicker(false);
    setLibrarySearch('');
  };

  const filteredLibrary = exerciseLibrary.filter((ex) => {
    if (libraryGenderFilter !== 'all' && ex.gender !== libraryGenderFilter && ex.gender !== 'unisex') {
      return false;
    }
    if (librarySearch) {
      const search = librarySearch.toLowerCase();
      return ex.name.toLowerCase().includes(search) || ex.category.toLowerCase().includes(search);
    }
    return true;
  });

  const addExercise = async () => {
    if (!exName || !exSets || !exReps) {
      crossAlert('Errore', 'Compila nome, serie e ripetizioni');
      return;
    }

    const exerciseData: Exercise = {
      id: editingExerciseIndex !== null
        ? (exercises[selectedDay]?.[editingExerciseIndex]?.id || Date.now().toString())
        : Date.now().toString(),
      name: exName,
      description: exDescription,
      sets: parseInt(exSets, 10),
      reps: exReps,
      restSeconds: parseInt(exRest, 10) || 60,
      notes: exNotes,
      category: exCategory,
      ...(exVideoUrl ? { videoUrl: exVideoUrl } : {}),
      technique: exTechnique || 'standard',
      ...(exTechnique === 'rest_pause' ? {
        miniSets: parseInt(exMiniSets, 10) || 4,
        miniReps: exMiniReps || '6',
        miniRestSeconds: parseInt(exMiniRest, 10) || 20,
      } : {}),
      ...(exTechnique === 'stripping' ? {
        stripDrops: parseInt(exStripDrops, 10) || 3,
        stripRepsPerDrop: exStripRepsPerDrop || '8',
        stripMaxDropPct: parseInt(exStripMaxDropPct, 10) || 50,
      } : {}),
      ...(exTechnique === 'pyramid' ? {
        pyramidType: exPyramidType,
      } : {}),
      ...(exTechnique === 'tempo' ? {
        tempoNotation: exTempo || '4-1-2-0',
      } : {}),
      ...(exTechnique === 'myo_reps' ? {
        myoActivationReps: exMyoActivationReps || '12',
        myoMiniReps: exMyoMiniReps || '3',
        myoMiniSets: parseInt(exMyoMiniSets, 10) || 4,
        myoRestSeconds: parseInt(exMyoRest, 10) || 5,
      } : {}),
      ...(exTechnique === 'isometric' ? {
        isometricHoldSeconds: parseInt(exIsometricHold, 10) || 30,
      } : {}),
      ...(exTechnique === 'cluster' ? {
        clusterReps: parseInt(exClusterReps, 10) || 2,
        clusterSets: parseInt(exClusterSets, 10) || 5,
        clusterRestSeconds: parseInt(exClusterRest, 10) || 15,
      } : {}),
      ...(exTechnique === 'negative' ? {
        negativeSeconds: parseInt(exNegativeSeconds, 10) || 5,
      } : {}),
      ...(exTechnique === 'cumulative' ? {
        cumulativeTargetReps: parseInt(exCumulativeTarget, 10) || 10,
        cumulativeRestSeconds: parseInt(exCumulativeRest, 10) || 15,
      } : {}),
      ...(exTechnique === 'emom' ? {
        emomMinutes: parseInt(exEmomMinutes, 10) || 10,
        emomRepsPerMinute: exEmomReps || '5',
      } : {}),
    };

    if (editingExerciseIndex !== null) {
      setExercises((prev) => ({
        ...prev,
        [selectedDay]: (prev[selectedDay] || []).map((ex, i) =>
          i === editingExerciseIndex ? exerciseData : ex
        ),
      }));
    } else {
      setExercises((prev) => ({
        ...prev,
        [selectedDay]: [...(prev[selectedDay] || []), exerciseData],
      }));
    }

    if (saveToLibrary && exVideoUrl) {
      try {
        await addExerciseToLibrary({
          name: exName,
          description: exDescription,
          sets: parseInt(exSets, 10),
          reps: exReps,
          restSeconds: parseInt(exRest, 10) || 60,
          ...(exVideoUrl ? { videoUrl: exVideoUrl } : {}),
          notes: exNotes,
          category: exCategory,
        });
        loadExerciseLibrary();
      } catch {
        // silently handle
      }
    }

    setExName('');
    setExDescription('');
    setExSets('');
    setExReps('');
    setExRest('');
    setExVideoUrl('');
    setExNotes('');
    setExTechnique('standard');
    setExMiniSets('4');
    setExMiniReps('6');
    setExMiniRest('20');
    setExStripDrops('3');
    setExStripRepsPerDrop('8');
    setExStripMaxDropPct('50');
    setExPyramidType('ascending');
    setExTempo('4-1-2-0');
    setExMyoActivationReps('12');
    setExMyoMiniReps('3');
    setExMyoMiniSets('4');
    setExMyoRest('5');
    setExIsometricHold('30');
    setExClusterReps('2');
    setExClusterSets('5');
    setExClusterRest('15');
    setExCumulativeTarget('10');
    setExCumulativeRest('15');
    setExNegativeSeconds('5');
    setExEmomMinutes('10');
    setExEmomReps('5');
    setSaveToLibrary(false);
    setEditingExerciseIndex(null);
    setShowExerciseModal(false);
  };

  const editExercise = (dayIndex: number, exerciseIndex: number) => {
    const ex = exercises[dayIndex]?.[exerciseIndex];
    if (!ex) return;
    setExName(ex.name);
    setExDescription(ex.description || '');
    setExSets(String(ex.sets));
    setExReps(ex.reps);
    setExRest(String(ex.restSeconds));
    setExCategory(ex.category || 'forza');
    setExVideoUrl(ex.videoUrl || '');
    setExNotes(ex.notes || '');
    setExTechnique(ex.technique || 'standard');
    setExMiniSets(String(ex.miniSets || 4));
    setExMiniReps(ex.miniReps || '6');
    setExMiniRest(String(ex.miniRestSeconds || 20));
    setExStripDrops(String(ex.stripDrops || 3));
    setExStripRepsPerDrop(ex.stripRepsPerDrop || '8');
    setExStripMaxDropPct(String(ex.stripMaxDropPct || 50));
    setExPyramidType(ex.pyramidType || 'ascending');
    setExTempo(ex.tempoNotation || '4-1-2-0');
    setExMyoActivationReps(ex.myoActivationReps || '12');
    setExMyoMiniReps(ex.myoMiniReps || '3');
    setExMyoMiniSets(String(ex.myoMiniSets || 4));
    setExMyoRest(String(ex.myoRestSeconds || 5));
    setExIsometricHold(String(ex.isometricHoldSeconds || 30));
    setExClusterReps(String(ex.clusterReps || 2));
    setExClusterSets(String(ex.clusterSets || 5));
    setExClusterRest(String(ex.clusterRestSeconds || 15));
    setExCumulativeTarget(String(ex.cumulativeTargetReps || 10));
    setExCumulativeRest(String(ex.cumulativeRestSeconds || 15));
    setExNegativeSeconds(String(ex.negativeSeconds || 5));
    setExEmomMinutes(String(ex.emomMinutes || 10));
    setExEmomReps(ex.emomRepsPerMinute || '5');
    setEditingExerciseIndex(exerciseIndex);
    setShowExerciseModal(true);
  };

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    setExercises((prev) => ({
      ...prev,
      [dayIndex]: prev[dayIndex]?.filter((_, i) => i !== exerciseIndex) || [],
    }));
  };

  const moveExercise = (dayIndex: number, fromIndex: number, toIndex: number) => {
    setExercises((prev) => {
      const list = [...(prev[dayIndex] || [])];
      if (toIndex < 0 || toIndex >= list.length) return prev;
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return { ...prev, [dayIndex]: list };
    });
  };

  const loadPlanForEditing = (plan: WorkoutPlan) => {
    setEditingPlan(plan);
    setSelectedStudentId(plan.studentId);
    setPlanTitle(plan.title);
    const loaded: Record<number, Exercise[]> = {};
    for (const day of plan.weeklySchedule) {
      if (day.exercises.length > 0) {
        loaded[day.dayOfWeek] = day.exercises.map((ex, i) => ({
          ...ex,
          id: ex.id || `${Date.now()}_${day.dayOfWeek}_${i}`,
        }));
      }
    }
    setExercises(loaded);
    setSelectedDay(0);
    setShowHistoryModal(false);
    setViewingPlan(null);
  };

  const saveAsTemplate = (plan: { title: string; studentId?: string; weeklySchedule: { dayOfWeek: number; exercises: (Exercise | Omit<Exercise, 'id'>)[]; notes?: string }[] }) => {
    crossAlert('Salva come Template', `Vuoi salvare "${plan.title}" come template riutilizzabile?`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Salva',
        onPress: async () => {
          try {
            const weeklySchedule = plan.weeklySchedule.map((day) => ({
              dayOfWeek: day.dayOfWeek,
              dayName: DAYS[day.dayOfWeek] || '',
              exercises: day.exercises.map((ex) => {
                const { id: _id, ...rest } = ex as Exercise;
                return rest;
              }),
              notes: day.notes || '',
            }));
            const desc = plan.studentId
              ? `Template creato dalla programmazione di ${getStudentName(plan.studentId)}`
              : 'Template personalizzato';
            await createCustomTemplate({
              name: plan.title,
              description: desc,
              gender: 'male',
              category: 'personalizzato',
              weeklySchedule,
              createdBy: user?.id || '',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            crossAlert('Successo', 'Template salvato! Lo trovi nella sezione Template e in "Carica da Template".');
          } catch {
            crossAlert('Errore', 'Impossibile salvare il template.');
          }
        },
      },
    ]);
  };

  const getStudentName = (studentId: string) => {
    const s = students.find((st) => st.id === studentId);
    return s ? `${s.name} ${s.surname}` : 'Allievo';
  };

  const resetForm = () => {
    setEditingPlan(null);
    setPlanTitle('');
    setExercises({});
    setSelectedStudentId('');
    setSelectedDay(0);
  };

  const savePlan = async () => {
    if (!planTitle || !user) {
      crossAlert('Errore', 'Inserisci un titolo per la programmazione');
      return;
    }
    if (!selectedStudentId) {
      crossAlert('Errore', 'Seleziona un allievo');
      return;
    }

    const totalExercises = Object.values(exercises).reduce((sum, exs) => sum + exs.length, 0);
    if (totalExercises === 0) {
      crossAlert('Errore', 'Aggiungi almeno un esercizio');
      return;
    }

    setSaving(true);
    try {
      const cleanExercise = (ex: Exercise) => {
        const clean: Record<string, any> = {};
        for (const [key, value] of Object.entries(ex)) {
          if (value !== undefined) clean[key] = value;
        }
        return clean as Exercise;
      };
      const weeklySchedule: WeeklyDay[] = Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: i,
        exercises: (exercises[i] || []).map(cleanExercise),
        notes: '',
      }));

      if (editingPlan) {
        await updateWorkoutPlan(editingPlan.id, {
          title: planTitle,
          weeklySchedule,
        });
        crossAlert('Successo', 'Programmazione aggiornata!');
      } else {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 28);

        await createWorkoutPlan({
          studentId: selectedStudentId,
          collaboratorId: user.id,
          title: planTitle,
          startDate,
          endDate,
          weeklySchedule,
          createdAt: new Date(),
          isActive: true,
        });
        createNotification(
          selectedStudentId,
          'new_program',
          'Nuova scheda disponibile',
          `La tua nuova programmazione "${planTitle}" è pronta! Apri l\'app per visualizzarla.`
        ).catch(() => {});
        crossAlert('Successo', 'Programmazione salvata e inviata all\'allievo!');
      }

      resetForm();
    } catch {
      crossAlert('Errore', 'Impossibile salvare la programmazione');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{editingPlan ? 'Modifica Programmazione' : 'Crea Programmazione'}</Text>
        <Text style={styles.subtitle}>
          {editingPlan ? `Stai modificando: ${editingPlan.title}` : 'Crea il piano settimanale con video e descrizioni'}
        </Text>
        {editingPlan && (
          <TouchableOpacity style={styles.newPlanBtn} onPress={resetForm}>
            <Text style={styles.newPlanBtnText}>+ Nuova Programmazione</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        {/* Selezione allievo */}
        <StudentSearchPicker
          students={students}
          selectedId={selectedStudentId}
          onSelect={(id) => setSelectedStudentId(id)}
        />

        {/* Vedi storico programmazioni allievo */}
        {selectedStudentId && (
          <Button
            title="Vedi Programmazioni Precedenti"
            onPress={handleViewStudentHistory}
            variant="outline"
            style={{ marginBottom: spacing.md }}
          />
        )}

        <InputField
          label="Titolo Programmazione"
          value={planTitle}
          onChangeText={setPlanTitle}
          placeholder="Es: Scheda Ipertrofia - Fase 1"
        />

        {/* Template Button */}
        <Button
          title="Carica da Template"
          onPress={() => setShowTemplateModal(true)}
          variant="outline"
          style={{ marginBottom: spacing.sm }}
        />

        {/* AI Progression Button */}
        {selectedStudentId && (
          <Button
            title={aiLoading ? 'Generazione AI...' : 'Genera Progressione con AI'}
            onPress={handleAIProgression}
            variant="outline"
            loading={aiLoading}
            style={{ marginBottom: spacing.sm }}
          />
        )}

        {/* AI Generate Plan Button */}
        {selectedStudentId && (
          <TouchableOpacity
            style={styles.aiGenerateBtn}
            onPress={() => {
              const student = students.find((s) => s.id === selectedStudentId);
              if (student?.goals) setAiGenGoals(student.goals);
              setShowAiGenerateModal(true);
            }}
          >
            <Ionicons name="sparkles" size={20} color={colors.textOnAccent} />
            <Text style={styles.aiGenerateBtnText}>AI Genera Scheda</Text>
          </TouchableOpacity>
        )}

        {/* Selettore giorno */}
        <Text style={styles.sectionTitle}>Giorno della settimana</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dayScroll}
        >
          {DAYS.map((day, index) => {
            const exerciseCount = exercises[index]?.length || 0;
            return (
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
                {exerciseCount > 0 && (
                  <View style={styles.dayBadge}>
                    <Text style={styles.dayBadgeText}>{exerciseCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Esercizi del giorno selezionato */}
        <View style={styles.exerciseSection}>
          <View style={styles.exerciseHeader}>
            <Text style={styles.sectionTitle}>
              {DAYS[selectedDay]} - Esercizi
            </Text>
            <Button
              title="+ Esercizio"
              onPress={() => { setEditingExerciseIndex(null); setShowExerciseModal(true); }}
              variant="primary"
            />
          </View>

          {(!exercises[selectedDay] || exercises[selectedDay].length === 0) ? (
            <Card>
              <Text style={styles.emptyText}>
                Nessun esercizio per questo giorno.{'\n'}
                Aggiungi il primo esercizio!
              </Text>
            </Card>
          ) : (
            exercises[selectedDay].map((ex, index) => (
              <TouchableOpacity key={ex.id} onPress={() => editExercise(selectedDay, index)} activeOpacity={0.7}>
                <Card variant="outlined">
                  <View style={styles.exerciseRow}>
                    <View style={styles.exerciseOrderCol}>
                      <TouchableOpacity
                        onPress={() => moveExercise(selectedDay, index, index - 1)}
                        disabled={index === 0}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        style={[styles.moveBtn, index === 0 && styles.moveBtnDisabled]}
                      >
                        <Ionicons name="chevron-up" size={18} color={index === 0 ? colors.border : colors.accent} />
                      </TouchableOpacity>
                      <View style={styles.exerciseNumber}>
                        <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => moveExercise(selectedDay, index, index + 1)}
                        disabled={index === exercises[selectedDay].length - 1}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        style={[styles.moveBtn, index === exercises[selectedDay].length - 1 && styles.moveBtnDisabled]}
                      >
                        <Ionicons name="chevron-down" size={18} color={index === exercises[selectedDay].length - 1 ? colors.border : colors.accent} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.exerciseInfo}>
                      <Text style={styles.exerciseName}>{ex.name}</Text>
                      <Text style={styles.exerciseDetails}>
                        {ex.sets}x{ex.reps} | Rec: {ex.restSeconds}s
                      </Text>
                      {ex.technique && ex.technique !== 'standard' && (
                        <Text style={styles.restPauseBadge}>
                          {ex.technique === 'rest_pause' && `Serie Interrotte: ${ex.miniSets || 4} mini serie da ${ex.miniReps || '6'} (rec ${ex.miniRestSeconds || 20}s)`}
                          {ex.technique === 'stripping' && `Stripping: ${ex.stripDrops || 3} scarichi da ${ex.stripRepsPerDrop || '8'} reps (max -${ex.stripMaxDropPct || 50}%)`}
                          {ex.technique === 'pyramid' && `Piramidali: ${ex.pyramidType === 'ascending' ? 'ascendente ↑' : ex.pyramidType === 'descending' ? 'discendente ↓' : 'triangolare ↑↓'}`}
                          {ex.technique === 'tempo' && `Tempo: ${ex.tempoNotation || '4-1-2-0'}`}
                          {ex.technique === 'myo_reps' && `Myo-reps: attivazione ${ex.myoActivationReps || '12'} + ${ex.myoMiniSets || 4}x${ex.myoMiniReps || '3'} (rec ${ex.myoRestSeconds || 5}s)`}
                          {ex.technique === 'isometric' && `Isometria: tenuta ${ex.isometricHoldSeconds || 30}s`}
                          {ex.technique === 'twentyone' && '21s: 7 parziali basse + 7 alte + 7 complete'}
                          {ex.technique === 'cluster' && `Cluster: ${ex.clusterSets || 5}x${ex.clusterReps || 2} (pausa ${ex.clusterRestSeconds || 15}s)`}
                          {ex.technique === 'cumulative' && `Cumulative: scala 1→${ex.cumulativeTargetReps || 10} rip (attesa ${ex.cumulativeRestSeconds || 15}s)`}
                          {ex.technique === 'negative' && `Negativa: ${ex.negativeSeconds || 5}s eccentrica`}
                          {ex.technique === 'emom' && `EMOM: ${ex.emomRepsPerMinute || '5'} reps ogni minuto x ${ex.emomMinutes || 10} min`}
                        </Text>
                      )}
                      {ex.description ? (
                        <Text style={styles.exerciseDesc}>{ex.description}</Text>
                      ) : null}
                      {ex.videoUrl ? (
                        <Text style={styles.videoLink}>Video allegato</Text>
                      ) : null}
                      {ex.notes ? (
                        <Text style={styles.exerciseNotes}>
                          Note: {ex.notes}
                        </Text>
                      ) : null}
                      <Text style={styles.editHint}>Tocca per modificare</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeExercise(selectedDay, index)}
                    >
                      <Text style={styles.removeBtn}>X</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>

        <Button
          title={saving ? 'Salvataggio...' : editingPlan ? 'Aggiorna Programmazione' : 'Salva e Invia Programmazione'}
          onPress={savePlan}
          style={styles.saveButton}
          loading={saving}
        />

        {planTitle.trim() && Object.values(exercises).some((exs) => exs.length > 0) && (
          <TouchableOpacity
            style={styles.saveAsTemplateBtnMain}
            onPress={() => {
              const weeklySchedule = DAYS.map((_, i) => ({
                dayOfWeek: i,
                dayName: DAYS[i],
                exercises: (exercises[i] || []).map(({ id, ...rest }) => rest),
                notes: '',
              }));
              saveAsTemplate({
                title: planTitle,
                studentId: selectedStudentId || undefined,
                weeklySchedule,
              });
            }}
          >
            <Ionicons name="copy-outline" size={18} color={colors.accent} />
            <Text style={styles.saveAsTemplateMainText}>Salva come Template</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modale Aggiungi Esercizio */}
      <Modal visible={showExerciseModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <ModalHeader title={editingExerciseIndex !== null ? 'Modifica Esercizio' : 'Nuovo Esercizio'} onClose={() => { setEditingExerciseIndex(null); setShowExerciseModal(false); }} />

            {/* Library Picker Button */}
            <TouchableOpacity
              style={styles.libraryPickerToggle}
              onPress={() => { setShowLibraryPicker(true); setLibrarySearch(''); }}
            >
              <Ionicons name="library-outline" size={20} color={colors.accent} />
              <Text style={styles.libraryPickerToggleText}>Scegli dalla Libreria Esercizi</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.accent} />
            </TouchableOpacity>

            <InputField
              label="Nome esercizio"
              value={exName}
              onChangeText={setExName}
              placeholder="Es: Panca piana con bilanciere"
            />

            <InputField
              label="Descrizione / Istruzioni"
              value={exDescription}
              onChangeText={setExDescription}
              placeholder="Come eseguire l'esercizio..."
              multiline
              numberOfLines={3}
            />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <InputField
                  label="Serie"
                  value={exSets}
                  onChangeText={setExSets}
                  keyboardType="number-pad"
                  placeholder="4"
                />
              </View>
              <View style={styles.halfField}>
                <InputField
                  label="Ripetizioni"
                  value={exReps}
                  onChangeText={setExReps}
                  placeholder="8-12"
                />
              </View>
            </View>

            <InputField
              label="Recupero (secondi)"
              value={exRest}
              onChangeText={setExRest}
              keyboardType="number-pad"
              placeholder="90"
            />

            {/* Tecnica */}
            <Text style={styles.fieldLabel}>Tecnica</Text>
            <View style={styles.categoryRow}>
              {([
                { key: 'standard', label: 'Normale' },
                { key: 'rest_pause', label: 'Serie Interrotte' },
                { key: 'stripping', label: 'Stripping' },
                { key: 'pyramid', label: 'Piramidali' },
                { key: 'tempo', label: 'Tempo' },
                { key: 'myo_reps', label: 'Myo-reps' },
                { key: 'isometric', label: 'Isometria' },
                { key: 'twentyone', label: '21s' },
                { key: 'cluster', label: 'Cluster' },
                { key: 'cumulative', label: 'Cumulative' },
                { key: 'negative', label: 'Negativa' },
                { key: 'emom', label: 'EMOM' },
              ] as const).map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.categoryChip, exTechnique === t.key && styles.categoryChipActive]}
                  onPress={() => setExTechnique(t.key)}
                >
                  <Text style={[styles.categoryChipText, exTechnique === t.key && styles.categoryChipTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {exTechnique === 'rest_pause' && (
              <View style={styles.restPauseBox}>
                <Text style={styles.restPauseInfo}>
                  Ogni serie è composta da mini serie con recupero breve tra loro.
                  Es: carico da 9-10 reps al limite, 4 mini serie da 6 reps con 15-25s di recupero.
                </Text>
                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <InputField
                      label="Mini serie"
                      value={exMiniSets}
                      onChangeText={setExMiniSets}
                      keyboardType="number-pad"
                      placeholder="4"
                    />
                  </View>
                  <View style={styles.halfField}>
                    <InputField
                      label="Reps per mini serie"
                      value={exMiniReps}
                      onChangeText={setExMiniReps}
                      placeholder="6"
                    />
                  </View>
                </View>
                <InputField
                  label="Recupero tra mini serie (secondi)"
                  value={exMiniRest}
                  onChangeText={setExMiniRest}
                  keyboardType="number-pad"
                  placeholder="20"
                />
              </View>
            )}

            {exTechnique === 'stripping' && (
              <View style={styles.restPauseBox}>
                <Text style={styles.restPauseInfo}>
                  Esegui le ripetizioni, poi senza pausa scala il peso e ripeti.
                </Text>
                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <InputField label="N. scarichi" value={exStripDrops} onChangeText={setExStripDrops} keyboardType="number-pad" placeholder="3" />
                  </View>
                  <View style={styles.halfField}>
                    <InputField label="Reps per livello" value={exStripRepsPerDrop} onChangeText={setExStripRepsPerDrop} placeholder="8" />
                  </View>
                </View>
                <InputField label="Scarico massimo (%)" value={exStripMaxDropPct} onChangeText={setExStripMaxDropPct} keyboardType="number-pad" placeholder="50" />
              </View>
            )}

            {exTechnique === 'pyramid' && (
              <View style={styles.restPauseBox}>
                <Text style={styles.restPauseInfo}>
                  Aumenta o diminuisci il carico ad ogni serie. Ascendente: peso sale, reps scendono. Discendente: peso scende, reps salgono. Triangolare: sale e poi scende.
                </Text>
                <View style={styles.categoryRow}>
                  {([
                    { key: 'ascending', label: 'Ascendente ↑' },
                    { key: 'descending', label: 'Discendente ↓' },
                    { key: 'triangular', label: 'Triangolare ↑↓' },
                  ] as const).map((p) => (
                    <TouchableOpacity
                      key={p.key}
                      style={[styles.categoryChip, exPyramidType === p.key && styles.categoryChipActive]}
                      onPress={() => setExPyramidType(p.key)}
                    >
                      <Text style={[styles.categoryChipText, exPyramidType === p.key && styles.categoryChipTextActive]}>{p.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {exTechnique === 'tempo' && (
              <View style={styles.restPauseBox}>
                <Text style={styles.restPauseInfo}>
                  Formato: Eccentrica-Pausa bassa-Concentrica-Pausa alta (es. 4-1-2-0 = 4s giù, 1s pausa, 2s su, 0s pausa).
                </Text>
                <InputField label="Tempo (es. 4-1-2-0)" value={exTempo} onChangeText={setExTempo} placeholder="4-1-2-0" />
              </View>
            )}

            {exTechnique === 'myo_reps' && (
              <View style={styles.restPauseBox}>
                <Text style={styles.restPauseInfo}>
                  Serie attivante ad alto numero di reps, poi mini serie brevi con recupero minimo (3-5 respiri).
                </Text>
                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <InputField label="Reps attivazione" value={exMyoActivationReps} onChangeText={setExMyoActivationReps} placeholder="12" />
                  </View>
                  <View style={styles.halfField}>
                    <InputField label="Reps mini serie" value={exMyoMiniReps} onChangeText={setExMyoMiniReps} placeholder="3" />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <InputField label="N. mini serie" value={exMyoMiniSets} onChangeText={setExMyoMiniSets} keyboardType="number-pad" placeholder="4" />
                  </View>
                  <View style={styles.halfField}>
                    <InputField label="Pausa (secondi)" value={exMyoRest} onChangeText={setExMyoRest} keyboardType="number-pad" placeholder="5" />
                  </View>
                </View>
              </View>
            )}

            {exTechnique === 'isometric' && (
              <View style={styles.restPauseBox}>
                <Text style={styles.restPauseInfo}>
                  Tenuta statica nella posizione target. L'allievo vedrà un timer per la tenuta.
                </Text>
                <InputField label="Durata tenuta (secondi)" value={exIsometricHold} onChangeText={setExIsometricHold} keyboardType="number-pad" placeholder="30" />
              </View>
            )}

            {exTechnique === 'twentyone' && (
              <View style={styles.restPauseBox}>
                <Text style={styles.restPauseInfo}>
                  7 ripetizioni parziali basse + 7 parziali alte + 7 complete = 21 totali. Non serve configurazione, lo schema è fisso.
                </Text>
              </View>
            )}

            {exTechnique === 'cluster' && (
              <View style={styles.restPauseBox}>
                <Text style={styles.restPauseInfo}>
                  Serie spezzata in mini-gruppi (cluster) con micro-pause. Es: 5 cluster da 2 reps con 15s di pausa.
                </Text>
                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <InputField label="Reps per cluster" value={exClusterReps} onChangeText={setExClusterReps} keyboardType="number-pad" placeholder="2" />
                  </View>
                  <View style={styles.halfField}>
                    <InputField label="N. cluster" value={exClusterSets} onChangeText={setExClusterSets} keyboardType="number-pad" placeholder="5" />
                  </View>
                </View>
                <InputField label="Pausa tra cluster (sec)" value={exClusterRest} onChangeText={setExClusterRest} keyboardType="number-pad" placeholder="15" />
              </View>
            )}

            {exTechnique === 'cumulative' && (
              <View style={styles.restPauseBox}>
                <Text style={styles.restPauseInfo}>
                  Serie cumulativa "a scala": carico fisso, 1 rip → attesa → 2 rip → attesa → ... fino all'obiettivo. Es: fino a 10 con 15s di attesa. Il n. di serie è impostato in "Serie" sopra.
                </Text>
                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <InputField label="Obiettivo ripetizioni" value={exCumulativeTarget} onChangeText={setExCumulativeTarget} keyboardType="number-pad" placeholder="10" />
                  </View>
                  <View style={styles.halfField}>
                    <InputField label="Attesa tra gradini (sec)" value={exCumulativeRest} onChangeText={setExCumulativeRest} keyboardType="number-pad" placeholder="15" />
                  </View>
                </View>
              </View>
            )}

            {exTechnique === 'negative' && (
              <View style={styles.restPauseBox}>
                <Text style={styles.restPauseInfo}>
                  Fase eccentrica (discesa) lenta e controllata con carico più pesante del normale. L'allievo vedrà il timer per la negativa.
                </Text>
                <InputField label="Durata eccentrica (secondi)" value={exNegativeSeconds} onChangeText={setExNegativeSeconds} keyboardType="number-pad" placeholder="5" />
              </View>
            )}

            {exTechnique === 'emom' && (
              <View style={styles.restPauseBox}>
                <Text style={styles.restPauseInfo}>
                  Every Minute On the Minute: esegui le reps ogni minuto per la durata totale. Il resto del minuto è recupero.
                </Text>
                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <InputField label="Durata (minuti)" value={exEmomMinutes} onChangeText={setExEmomMinutes} keyboardType="number-pad" placeholder="10" />
                  </View>
                  <View style={styles.halfField}>
                    <InputField label="Reps per minuto" value={exEmomReps} onChangeText={setExEmomReps} placeholder="5" />
                  </View>
                </View>
              </View>
            )}

            <Text style={styles.fieldLabel}>Categoria</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryChip,
                    exCategory === cat.value && styles.categoryChipActive,
                  ]}
                  onPress={() => setExCategory(cat.value)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      exCategory === cat.value && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Video Upload */}
            <Text style={styles.fieldLabel}>Video Esercizio (opzionale)</Text>
            {exVideoUrl ? (
              <View style={styles.videoUploaded}>
                <Text style={styles.videoUploadedText}>Video caricato</Text>
                <TouchableOpacity onPress={() => setExVideoUrl('')}>
                  <Text style={styles.removeBtn}>X</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Button
                title={uploadingVideo ? 'Caricamento...' : 'Carica Video'}
                onPress={pickAndUploadVideo}
                variant="outline"
                loading={uploadingVideo}
              />
            )}

            {/* Save to library toggle */}
            {exVideoUrl ? (
              <TouchableOpacity
                style={styles.saveToLibraryRow}
                onPress={() => setSaveToLibrary(!saveToLibrary)}
              >
                <Ionicons
                  name={saveToLibrary ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={saveToLibrary ? colors.accent : colors.textSecondary}
                />
                <Text style={styles.saveToLibraryText}>
                  Salva nella libreria esercizi (per riuso futuro)
                </Text>
              </TouchableOpacity>
            ) : null}

            {/* AI Exercise Suggestion */}
            <Button
              title={aiExercisesLoading ? 'AI...' : 'Suggerisci con AI'}
              onPress={handleAIExerciseSuggestion}
              variant="outline"
              loading={aiExercisesLoading}
              style={{ marginTop: spacing.sm }}
            />

            <InputField
              label="Note (opzionale)"
              value={exNotes}
              onChangeText={setExNotes}
              placeholder="Note aggiuntive..."
              multiline
            />

            <View style={styles.modalButtons}>
              <Button
                title="Annulla"
                onPress={() => setShowExerciseModal(false)}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title={editingExerciseIndex !== null ? 'Salva Modifiche' : 'Aggiungi'}
                onPress={addExercise}
                style={styles.modalButton}
              />
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </Modal>

      {/* Modale AI Progressione */}
      <Modal visible={showAiModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <ModalHeader title="Progressione AI" onClose={() => setShowAiModal(false)} />

            {aiSuggestion && (
              <>
                <Card variant="elevated">
                  <Text style={styles.aiTitle}>{aiSuggestion.title}</Text>
                  <Text style={styles.aiReasoning}>{aiSuggestion.reasoning}</Text>
                </Card>

                {aiSuggestion.weeklySchedule.map((day, di) => (
                  <Card key={di} variant="outlined">
                    <Text style={styles.aiDayTitle}>{day.day}</Text>
                    {day.exercises.map((ex, ei) => (
                      <Text key={ei} style={styles.aiExercise}>
                        {ei + 1}. {ex.name} - {ex.sets}x{ex.reps} (rec {ex.restSeconds}s)
                        {ex.notes ? ` | ${ex.notes}` : ''}
                      </Text>
                    ))}
                  </Card>
                ))}

                {aiSuggestion.generalNotes && (
                  <Card>
                    <Text style={styles.aiNotes}>{aiSuggestion.generalNotes}</Text>
                  </Card>
                )}

                <View style={styles.modalButtons}>
                  <Button
                    title="Annulla"
                    onPress={() => setShowAiModal(false)}
                    variant="outline"
                    style={styles.modalButton}
                  />
                  <Button
                    title="Applica"
                    onPress={applyAISuggestion}
                    style={styles.modalButton}
                  />
                </View>
              </>
            )}

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </Modal>

      {/* Modale Template */}
      <Modal visible={showTemplateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <ModalHeader title="Scegli Template" onClose={() => setShowTemplateModal(false)} />

            {/* Tab personalizzati / predefiniti */}
            <View style={styles.templateFilterRow}>
              <TouchableOpacity
                style={[styles.templateFilterBtn, templateTab === 'custom' && styles.templateFilterBtnActive]}
                onPress={() => setTemplateTab('custom')}
              >
                <Text style={[styles.templateFilterText, templateTab === 'custom' && styles.templateFilterTextActive]}>
                  Personalizzati
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.templateFilterBtn, templateTab === 'builtin' && styles.templateFilterBtnActive]}
                onPress={() => setTemplateTab('builtin')}
              >
                <Text style={[styles.templateFilterText, templateTab === 'builtin' && styles.templateFilterTextActive]}>
                  Predefiniti
                </Text>
              </TouchableOpacity>
            </View>

            {/* Filtro genere */}
            <View style={styles.templateFilterRow}>
              {(['all', 'male', 'female'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.templateFilterBtn, templateFilter === f && styles.templateFilterBtnActive]}
                  onPress={() => setTemplateFilter(f)}
                >
                  <Text style={[styles.templateFilterText, templateFilter === f && styles.templateFilterTextActive]}>
                    {f === 'all' ? 'Tutti' : f === 'male' ? 'Uomo' : 'Donna'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {templateTab === 'custom' ? (
              filteredCustomTemplates.length === 0 ? (
                <Card>
                  <Text style={styles.emptyText}>
                    Nessun template personalizzato.{'\n'}Creane uno dalla sezione Template!
                  </Text>
                </Card>
              ) : (
                filteredCustomTemplates.map((tpl) => (
                  <TouchableOpacity key={tpl.id} onPress={() => applyCustomTemplate(tpl)}>
                    <Card variant="outlined">
                      <View style={styles.templateRow}>
                        <View style={[styles.templateGenderBadge, { backgroundColor: tpl.gender === 'male' ? '#4A90D9' : '#D94A8C' }]}>
                          <Text style={styles.templateGenderText}>{tpl.gender === 'male' ? 'M' : 'F'}</Text>
                        </View>
                        <View style={styles.templateInfo}>
                          <Text style={styles.templateName}>{tpl.name}</Text>
                          <Text style={styles.templateCategory}>{tpl.category}</Text>
                          <Text style={styles.templateDesc} numberOfLines={2}>{tpl.description}</Text>
                          <Text style={styles.templateDays}>{tpl.weeklySchedule.length} giorni/settimana</Text>
                        </View>
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))
              )
            ) : (
              filteredTemplates.map((tpl) => (
                <TouchableOpacity key={tpl.id} onPress={() => applyTemplate(tpl)}>
                  <Card variant="outlined">
                    <View style={styles.templateRow}>
                      <View style={[styles.templateGenderBadge, { backgroundColor: tpl.gender === 'male' ? '#4A90D9' : '#D94A8C' }]}>
                        <Text style={styles.templateGenderText}>{tpl.gender === 'male' ? 'M' : 'F'}</Text>
                      </View>
                      <View style={styles.templateInfo}>
                        <Text style={styles.templateName}>{tpl.name}</Text>
                        <Text style={styles.templateCategory}>{tpl.category}</Text>
                        <Text style={styles.templateDesc} numberOfLines={2}>{tpl.description}</Text>
                        <Text style={styles.templateDays}>{tpl.weeklySchedule.length} giorni/settimana</Text>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))
            )}

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </Modal>

      {/* Modale Storico Programmazioni */}
      <Modal visible={showHistoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <ModalHeader
              title={`Programmazioni Precedenti`}
              onClose={() => { setShowHistoryModal(false); setViewingPlan(null); }}
            />

            {loadingHistory ? (
              <Card>
                <Text style={styles.historyEmptyText}>Caricamento...</Text>
              </Card>
            ) : !viewingPlan ? (
              <>
                {studentPlans.length === 0 ? (
                  <Card>
                    <Text style={styles.historyEmptyText}>
                      Nessuna programmazione trovata per questo allievo.
                    </Text>
                  </Card>
                ) : (
                  studentPlans.map((plan) => (
                    <Card key={plan.id} variant={plan.isActive ? 'elevated' : 'outlined'}>
                      <TouchableOpacity onPress={() => { setViewingPlan(plan); setHistorySelectedDay(0); }}>
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
                      </TouchableOpacity>
                      <View style={styles.historyActions}>
                        <TouchableOpacity
                          style={styles.historyEditBtn}
                          onPress={() => saveAsTemplate(plan)}
                        >
                          <Ionicons name="copy-outline" size={14} color={colors.accent} />
                          <Text style={{ ...styles.historyEditText, color: colors.accent, marginLeft: 4 }}>Template</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.historyEditBtn}
                          onPress={() => loadPlanForEditing(plan)}
                        >
                          <Text style={styles.historyEditText}>Modifica</Text>
                        </TouchableOpacity>
                      </View>
                    </Card>
                  ))
                )}
              </>
            ) : (
              <>
                <Card variant="elevated">
                  <Text style={styles.historyPlanTitle}>{viewingPlan.title}</Text>
                  <Text style={styles.historyDate}>
                    {formatDate(viewingPlan.startDate)} - {formatDate(viewingPlan.endDate)}
                  </Text>
                  {viewingPlan.isActive && (
                    <View style={[styles.activeBadge, { marginTop: spacing.xs }]}>
                      <Text style={styles.activeBadgeText}>ATTIVO</Text>
                    </View>
                  )}
                </Card>

                <View style={styles.historyDetailActions}>
                  <TouchableOpacity
                    style={styles.historyBackBtn}
                    onPress={() => setViewingPlan(null)}
                  >
                    <Text style={styles.historyBackText}>Torna alla lista</Text>
                  </TouchableOpacity>
                  {Platform.OS === 'web' && isOwner && (
                    <TouchableOpacity
                      style={[styles.saveAsTemplateBtn, { backgroundColor: colors.info }]}
                      onPress={() => printWorkoutPlan({ studentName: getStudentName(viewingPlan.studentId), plan: viewingPlan })}
                    >
                      <Ionicons name="print-outline" size={16} color={colors.white} />
                      <Text style={styles.saveAsTemplateText}>Stampa</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.saveAsTemplateBtn}
                    onPress={() => saveAsTemplate(viewingPlan)}
                  >
                    <Ionicons name="copy-outline" size={16} color={colors.textOnAccent} />
                    <Text style={styles.saveAsTemplateText}>Salva come Template</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
                  {DAYS.map((day, index) => (
                    <TouchableOpacity
                      key={`hist-${day}`}
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
                  <Card><Text style={styles.historyEmptyText}>Riposo</Text></Card>
                ) : (
                  viewingPlan.weeklySchedule[historySelectedDay]?.exercises.map((ex, i) => (
                    <Card key={ex.id || i} variant="outlined">
                      <View style={styles.exerciseRow}>
                        <View style={styles.exerciseNumber}>
                          <Text style={styles.exerciseNumberText}>{i + 1}</Text>
                        </View>
                        <View style={styles.exerciseInfo}>
                          <Text style={styles.exerciseName}>{ex.name}</Text>
                          <Text style={styles.exerciseDetails}>
                            {ex.sets}x{ex.reps} | Rec: {ex.restSeconds}s
                          </Text>
                          {ex.description ? (
                            <Text style={styles.exerciseDesc}>{ex.description}</Text>
                          ) : null}
                          {ex.notes ? (
                            <Text style={styles.exerciseNotes}>Note: {ex.notes}</Text>
                          ) : null}
                        </View>
                      </View>
                    </Card>
                  ))
                )}
              </>
            )}

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </Modal>

      {/* Modale AI Genera Scheda */}
      <Modal visible={showAiGenerateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <ModalHeader title="AI Genera Scheda" onClose={() => setShowAiGenerateModal(false)} />

            <Card variant="elevated">
              <View style={styles.aiGenHeaderRow}>
                <Ionicons name="sparkles" size={22} color={colors.accent} />
                <Text style={styles.aiGenHeaderText}>
                  L'AI creerà una scheda personalizzata basata sui parametri indicati.
                </Text>
              </View>
            </Card>

            <InputField
              label="Obiettivi"
              value={aiGenGoals}
              onChangeText={setAiGenGoals}
              placeholder="Es: Ipertrofia, dimagrimento, forza..."
              multiline
              numberOfLines={2}
            />

            <Text style={styles.fieldLabel}>Livello</Text>
            <View style={styles.categoryRow}>
              {(['principiante', 'intermedio', 'avanzato'] as const).map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  style={[
                    styles.categoryChip,
                    aiGenLevel === lvl && styles.categoryChipActive,
                  ]}
                  onPress={() => setAiGenLevel(lvl)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      aiGenLevel === lvl && styles.categoryChipTextActive,
                    ]}
                  >
                    {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Giorni a settimana</Text>
            <View style={styles.categoryRow}>
              {[2, 3, 4, 5, 6].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.categoryChip,
                    aiGenDays === d && styles.categoryChipActive,
                  ]}
                  onPress={() => setAiGenDays(d)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      aiGenDays === d && styles.categoryChipTextActive,
                    ]}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <InputField
              label="Attrezzatura disponibile"
              value={aiGenEquipment}
              onChangeText={setAiGenEquipment}
              placeholder="Es: Palestra completa, manubri, corpo libero..."
            />

            {aiGenLoading ? (
              <View style={styles.aiGenLoadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={styles.aiGenLoadingText}>Generazione in corso...</Text>
                <Text style={styles.aiGenLoadingSubtext}>L'AI sta creando la scheda personalizzata</Text>
              </View>
            ) : (
              <View style={styles.modalButtons}>
                <Button
                  title="Annulla"
                  onPress={() => setShowAiGenerateModal(false)}
                  variant="outline"
                  style={styles.modalButton}
                />
                <Button
                  title="Genera"
                  onPress={handleAIGeneratePlan}
                  style={styles.modalButton}
                />
              </View>
            )}

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </Modal>

      {/* Modale Libreria Esercizi */}
      <Modal visible={showLibraryPicker} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.libraryModalContainer}>
          <View style={styles.libraryModalHeader}>
            <TouchableOpacity onPress={() => setShowLibraryPicker(false)} style={styles.libraryModalBack}>
              <Ionicons name="arrow-back" size={22} color={colors.accent} />
              <Text style={styles.libraryModalBackText}>Indietro</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.libraryModalTitle}>Libreria Esercizi</Text>

          <View style={styles.libraryModalSearch}>
            <InputField
              label=""
              value={librarySearch}
              onChangeText={setLibrarySearch}
              placeholder="Cerca esercizio..."
            />
          </View>

          <View style={styles.libraryFilterRow}>
            {(['all', 'male', 'female'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.libraryFilterChip, libraryGenderFilter === f && styles.libraryFilterChipActive]}
                onPress={() => setLibraryGenderFilter(f)}
              >
                <Text style={[styles.libraryFilterText, libraryGenderFilter === f && styles.libraryFilterTextActive]}>
                  {f === 'all' ? `Tutti (${exerciseLibrary.length})` : f === 'male' ? 'Uomo' : 'Donna'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FlatList
            data={filteredLibrary}
            keyExtractor={(item) => item.id}
            style={styles.libraryFlatList}
            renderItem={({ item: libEx }) => (
              <TouchableOpacity
                style={styles.libraryItem}
                onPress={() => selectFromLibrary(libEx)}
              >
                <View style={styles.libraryItemLeft}>
                  <Text style={styles.libraryItemName}>{libEx.name}</Text>
                  <Text style={styles.libraryItemDesc} numberOfLines={2}>{libEx.description}</Text>
                  <View style={styles.libraryItemMeta}>
                    <Text style={styles.libraryItemBadge}>{libEx.sets}x{libEx.reps}</Text>
                    <Text style={styles.libraryItemBadge}>Rec: {libEx.restSeconds}s</Text>
                    <Text style={styles.libraryItemBadge}>{libEx.category}</Text>
                    {libEx.videoUrl && (
                      <View style={styles.libraryVideoBadge}>
                        <Ionicons name="videocam" size={12} color={colors.white} />
                        <Text style={styles.libraryVideoBadgeText}>Video</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="add-circle" size={26} color={colors.accent} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.libraryEmptyContainer}>
                <Ionicons name="barbell-outline" size={48} color={colors.textLight} />
                <Text style={styles.libraryEmptyText}>Nessun esercizio trovato</Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={styles.libraryItemSeparator} />}
          />
        </SafeAreaView>
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
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  content: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  dayScroll: {
    marginBottom: spacing.md,
  },
  dayButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    ...shadows.small,
    alignItems: 'center',
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
  dayBadge: {
    backgroundColor: colors.success,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  dayBadgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  exerciseSection: {
    marginTop: spacing.md,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  exerciseOrderCol: {
    alignItems: 'center',
    gap: 2,
  },
  moveBtn: {
    padding: 2,
  },
  moveBtnDisabled: {
    opacity: 0.3,
  },
  exerciseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseNumberText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: fontSize.sm,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  exerciseDetails: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  exerciseDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 4,
  },
  restPauseBadge: {
    fontSize: fontSize.xs,
    color: colors.accent,
    fontWeight: '700',
    marginTop: 4,
  },
  restPauseBox: {
    backgroundColor: colors.accent + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent + '30',
    marginBottom: spacing.sm,
  },
  restPauseInfo: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 17,
  },
  videoLink: {
    fontSize: fontSize.sm,
    color: colors.info,
    marginTop: 4,
    fontWeight: '600',
  },
  exerciseNotes: {
    fontSize: fontSize.sm,
    color: colors.warning,
    marginTop: 4,
    fontStyle: 'italic',
  },
  removeBtn: {
    color: colors.error,
    fontSize: fontSize.lg,
    fontWeight: '700',
    padding: spacing.xs,
  },
  editHint: {
    fontSize: 11,
    color: colors.accent,
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.lg,
    lineHeight: 22,
  },
  saveButton: {
    marginTop: spacing.xl,
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
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
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
  videoUploaded: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.success + '20',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  videoUploadedText: {
    color: colors.success,
    fontWeight: '600',
    fontSize: fontSize.md,
  },
  aiTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  aiReasoning: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  aiDayTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  aiExercise: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 2,
  },
  aiNotes: {
    fontSize: fontSize.md,
    color: colors.info,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  templateFilterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  templateFilterBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  templateFilterBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  templateFilterText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  templateFilterTextActive: {
    color: colors.textOnAccent,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  templateGenderBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateGenderText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: fontSize.md,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  templateCategory: {
    fontSize: fontSize.xs,
    color: colors.accent,
    fontWeight: '600',
    marginTop: 2,
  },
  templateDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  templateDays: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: 4,
  },
  bottomSpacer: {
    height: spacing.xxl * 2,
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
  historyPlanTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  historyEmptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.lg,
    lineHeight: 22,
  },
  historyBackBtn: {
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  historyBackText: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  activeBadge: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  activeBadgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  newPlanBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  newPlanBtnText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  historyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: spacing.sm,
  },
  historyEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  historyEditText: {
    color: colors.info,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  historyDetailActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  saveAsTemplateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  saveAsTemplateBtnMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  saveAsTemplateText: {
    color: colors.textOnAccent,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  saveAsTemplateMainText: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  libraryPickerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accent + '10',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accent + '30',
    marginBottom: spacing.md,
  },
  libraryPickerToggleText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.accent,
  },
  libraryModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  libraryModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  libraryModalBack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    gap: spacing.xs,
  },
  libraryModalBackText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.accent,
  },
  libraryModalTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  libraryModalSearch: {
    paddingHorizontal: spacing.md,
  },
  libraryFilterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  libraryFilterChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  libraryFilterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  libraryFilterText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  libraryFilterTextActive: {
    color: colors.textOnAccent,
  },
  libraryFlatList: {
    flex: 1,
  },
  libraryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  libraryItemLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  libraryItemName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  libraryItemDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  libraryItemMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  libraryItemBadge: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  libraryVideoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  libraryVideoBadgeText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: '700',
  },
  libraryItemSeparator: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.md,
  },
  libraryEmptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  libraryEmptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: fontSize.md,
  },
  saveToLibraryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  saveToLibraryText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  aiGenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  aiGenerateBtnText: {
    color: colors.textOnAccent,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  aiGenHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  aiGenHeaderText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  aiGenLoadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  aiGenLoadingText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.accent,
    marginTop: spacing.sm,
  },
  aiGenLoadingSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
