import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import {
  AcademyCourse,
  AcademyModule,
  AcademyLesson,
  AcademyCourseCategory,
  AcademyLessonType,
} from '../../types';
import {
  getAllCourses,
  addCourse,
  updateCourse,
  deleteCourse,
  getCourseModules,
  addModule,
  updateModule,
  deleteModule,
  getCourseLessons,
  addLesson,
  updateLesson,
  deleteLesson,
  uploadAcademyFile,
} from '../../services/academyService';
import { getStudents } from '../../services/authService';
import { Student } from '../../types';

const showAlert = (title: string, message: string, buttons?: any[]) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      const confirmed = window.confirm(`${title}\n${message}`);
      if (confirmed && buttons[1]?.onPress) buttons[1].onPress();
    } else {
      window.alert(`${title}\n${message}`);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

const CATEGORY_CONFIG: Record<AcademyCourseCategory, { label: string; color: string; icon: string }> = {
  mind: { label: 'Mind', color: '#9C27B0', icon: 'bulb-outline' },
  movement: { label: 'Movement', color: '#D40000', icon: 'fitness-outline' },
  nutrition: { label: 'Nutrizione', color: '#4CAF50', icon: 'nutrition-outline' },
  lifestyle: { label: 'Lifestyle', color: '#FF9800', icon: 'sunny-outline' },
  recovery: { label: 'Recovery', color: '#2196F3', icon: 'medkit-outline' },
};

const LESSON_TYPES: { value: AcademyLessonType; label: string; icon: string }[] = [
  { value: 'video', label: 'Video', icon: 'play-circle-outline' },
  { value: 'audio', label: 'Audio', icon: 'headset-outline' },
  { value: 'pdf', label: 'PDF', icon: 'document-attach-outline' },
  { value: 'article', label: 'Articolo', icon: 'document-text-outline' },
  { value: 'exercise', label: 'Esercizio', icon: 'barbell-outline' },
];

const GOLD = '#C5A55A';

export const AcademyManagementScreen: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<AcademyCourse | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<AcademyCourse | null>(null);
  const [modules, setModules] = useState<AcademyModule[]>([]);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState<AcademyModule | null>(null);
  const [selectedModule, setSelectedModule] = useState<AcademyModule | null>(null);
  const [lessons, setLessons] = useState<AcademyLesson[]>([]);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<AcademyLesson | null>(null);

  // Course form
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseCategory, setCourseCategory] = useState<AcademyCourseCategory>('movement');
  const [courseTags, setCourseTags] = useState('');
  const [coursePublished, setCoursePublished] = useState(true);

  // Module form
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDesc, setModuleDesc] = useState('');

  // Lesson form
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonType, setLessonType] = useState<AcademyLessonType>('video');
  const [lessonUrl, setLessonUrl] = useState('');
  const [lessonDuration, setLessonDuration] = useState('');
  const [lessonFree, setLessonFree] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileUri, setSelectedFileUri] = useState('');

  // Student assignment
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [courseAssignedTo, setCourseAssignedTo] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    setLoadingCourses(true);
    setLoadError(null);
    try {
      const data = await getAllCourses();
      setCourses(data);
    } catch (err) {
      console.error('AcademyManagement loadCourses error:', err);
      setLoadError('Impossibile caricare i corsi. Controlla la connessione.');
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
    getStudents().then(setAllStudents).catch(() => {});
  }, [loadCourses]);

  const loadCourseContent = async (course: AcademyCourse) => {
    setSelectedCourse(course);
    setSelectedModule(null);
    try {
      const [modulesData, lessonsData] = await Promise.all([
        getCourseModules(course.id),
        getCourseLessons(course.id),
      ]);
      setModules(modulesData);
      setLessons(lessonsData);
    } catch (err) {
      console.error('AcademyManagement loadCourseContent error:', err);
      showAlert('Errore', 'Impossibile caricare i contenuti del corso');
    }
  };

  const loadModules = async (courseId: string) => {
    try {
      const data = await getCourseModules(courseId);
      setModules(data);
    } catch (err) {
      console.error('AcademyManagement loadModules error:', err);
    }
  };

  // ─── Course CRUD ───

  const openCourseModal = (course?: AcademyCourse) => {
    if (course) {
      setEditingCourse(course);
      setCourseTitle(course.title);
      setCourseDesc(course.description);
      setCourseCategory(course.category);
      setCourseTags(course.tags.join(', '));
      setCoursePublished(course.isPublished);
      setCourseAssignedTo(course.assignedTo || []);
    } else {
      setEditingCourse(null);
      setCourseTitle('');
      setCourseDesc('');
      setCourseCategory('movement');
      setCourseTags('');
      setCoursePublished(true);
      setCourseAssignedTo([]);
    }
    setStudentSearch('');
    setShowCourseModal(true);
  };

  const getFirebaseErrorMessage = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : String(err);
    const code = (err as any)?.code || '';
    if (code === 'permission-denied' || raw.includes('permission') || raw.includes('Missing or insufficient permissions')) {
      return `Permessi insufficienti. Verifica che il tuo ruolo (${user?.role || 'sconosciuto'}) sia autorizzato e che le regole Firestore siano state distribuite con "firebase deploy --only firestore:rules".\n\nCodice: ${code || 'permission-denied'}`;
    }
    if (code === 'unavailable' || raw.includes('network') || raw.includes('Failed to fetch')) {
      return 'Errore di rete. Controlla la connessione internet e riprova.';
    }
    if (code === 'unauthenticated' || raw.includes('unauthenticated')) {
      return 'Sessione scaduta. Effettua nuovamente il login.';
    }
    return `${raw}${code ? ` (codice: ${code})` : ''}`;
  };

  const saveCourse = async () => {
    if (!courseTitle.trim()) {
      showAlert('Errore', 'Inserisci un titolo per il corso');
      return;
    }
    if (!user) {
      showAlert('Errore', 'Utente non autenticato. Effettua il login.');
      return;
    }
    if (!['owner', 'manager', 'collaborator'].includes(user.role)) {
      showAlert('Errore', `Il tuo ruolo (${user.role}) non ha i permessi per gestire i corsi.`);
      return;
    }
    try {
      const tags = courseTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      if (editingCourse) {
        await updateCourse(editingCourse.id, {
          title: courseTitle.trim(),
          description: courseDesc.trim(),
          category: courseCategory,
          tags,
          isPublished: coursePublished,
          assignedTo: courseAssignedTo,
        });
      } else {
        await addCourse({
          title: courseTitle.trim(),
          description: courseDesc.trim(),
          category: courseCategory,
          createdBy: user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          isPublished: coursePublished,
          assignedTo: courseAssignedTo,
          tags,
          lessonsCount: 0,
          durationMinutes: 0,
          order: courses.length,
        });
      }
      setShowCourseModal(false);
      loadCourses();
    } catch (err) {
      console.error('saveCourse error:', err);
      showAlert('Errore', `Impossibile salvare il corso.\n\n${getFirebaseErrorMessage(err)}`);
    }
  };

  const handleDeleteCourse = (course: AcademyCourse) => {
    showAlert('Elimina corso', `Eliminare "${course.title}" e tutte le sue lezioni?`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCourse(course.id);
            if (selectedCourse?.id === course.id) {
              setSelectedCourse(null);
              setLessons([]);
            }
            loadCourses();
          } catch {
            showAlert('Errore', 'Impossibile eliminare il corso');
          }
        },
      },
    ]);
  };

  // ─── Module CRUD ───

  const openModuleModal = (mod?: AcademyModule) => {
    if (mod) {
      setEditingModule(mod);
      setModuleTitle(mod.title);
      setModuleDesc(mod.description);
    } else {
      setEditingModule(null);
      setModuleTitle('');
      setModuleDesc('');
    }
    setShowModuleModal(true);
  };

  const saveModule = async () => {
    if (!moduleTitle.trim() || !selectedCourse) return;
    try {
      if (editingModule) {
        await updateModule(editingModule.id, {
          title: moduleTitle.trim(),
          description: moduleDesc.trim(),
        });
      } else {
        await addModule({
          courseId: selectedCourse.id,
          title: moduleTitle.trim(),
          description: moduleDesc.trim(),
          order: modules.length,
          createdAt: new Date(),
        });
      }
      setShowModuleModal(false);
      loadModules(selectedCourse.id);
    } catch (err) {
      console.error('saveModule error:', err);
      showAlert('Errore', `Impossibile salvare il modulo.\n\n${getFirebaseErrorMessage(err)}`);
    }
  };

  const handleDeleteModule = (mod: AcademyModule) => {
    showAlert('Elimina modulo', `Eliminare "${mod.title}"? Le lezioni associate non verranno eliminate.`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteModule(mod.id);
            if (selectedModule?.id === mod.id) setSelectedModule(null);
            if (selectedCourse) {
              loadModules(selectedCourse.id);
              const updatedLessons = await getCourseLessons(selectedCourse.id);
              setLessons(updatedLessons);
            }
          } catch {
            showAlert('Errore', 'Impossibile eliminare il modulo');
          }
        },
      },
    ]);
  };

  // ─── File Upload ───

  const getAcceptTypes = (): string => {
    switch (lessonType) {
      case 'video': return 'video/*';
      case 'audio': return 'audio/*';
      case 'pdf': return 'application/pdf';
      default: return '*/*';
    }
  };

  const handlePickFile = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = getAcceptTypes();
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            const url = URL.createObjectURL(file);
            setSelectedFileUri(url);
            setSelectedFileName(file.name);
          }
        };
        input.click();
      } else {
        const DocumentPicker = require('expo-document-picker');
        const mimeTypes: Record<string, string[]> = {
          video: ['video/*'],
          audio: ['audio/*'],
          pdf: ['application/pdf'],
          article: ['*/*'],
          exercise: ['*/*'],
        };
        const result = await DocumentPicker.getDocumentAsync({
          type: mimeTypes[lessonType] || ['*/*'],
        });
        if (!result.canceled && result.assets?.[0]) {
          setSelectedFileUri(result.assets[0].uri);
          setSelectedFileName(result.assets[0].name || 'file');
        }
      }
    } catch {
      showAlert('Errore', 'Impossibile selezionare il file');
    }
  };

  const handleUploadFile = async (): Promise<string | null> => {
    if (!selectedFileUri || !selectedCourse) return null;
    setUploading(true);
    try {
      const folder = lessonType === 'pdf' ? 'pdf'
        : lessonType === 'video' ? 'video'
        : lessonType === 'audio' ? 'audio'
        : 'extra';
      const url = await uploadAcademyFile(
        selectedCourse.id,
        selectedFileUri,
        selectedFileName,
        folder
      );
      return url;
    } catch {
      showAlert('Errore', 'Impossibile caricare il file. Riprova.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  // ─── Lesson CRUD ───

  const openLessonModal = (lesson?: AcademyLesson) => {
    if (lesson) {
      setEditingLesson(lesson);
      setLessonTitle(lesson.title);
      setLessonDesc(lesson.description);
      setLessonType(lesson.type);
      setLessonUrl(lesson.contentUrl);
      setLessonDuration(String(lesson.durationMinutes));
      setLessonFree(lesson.isFree);
    } else {
      setEditingLesson(null);
      setLessonTitle('');
      setLessonDesc('');
      setLessonType('video');
      setLessonUrl('');
      setLessonDuration('');
      setLessonFree(false);
    }
    setSelectedFileUri('');
    setSelectedFileName('');
    setShowLessonModal(true);
  };

  const saveLesson = async () => {
    if (!lessonTitle.trim() || !selectedCourse) return;
    try {
      // Upload file if selected
      let contentUrl = lessonUrl.trim();
      if (selectedFileUri) {
        const uploadedUrl = await handleUploadFile();
        if (!uploadedUrl) return; // upload failed
        contentUrl = uploadedUrl;
      }

      const moduleId = selectedModule?.id || '';
      if (editingLesson) {
        await updateLesson(editingLesson.id, {
          title: lessonTitle.trim(),
          description: lessonDesc.trim(),
          type: lessonType,
          contentUrl,
          durationMinutes: parseInt(lessonDuration) || 0,
          isFree: lessonFree,
          moduleId,
        });
      } else {
        const moduleLessons = lessons.filter((l) => (l.moduleId || '') === moduleId);
        await addLesson({
          courseId: selectedCourse.id,
          moduleId,
          title: lessonTitle.trim(),
          description: lessonDesc.trim(),
          type: lessonType,
          contentUrl,
          durationMinutes: parseInt(lessonDuration) || 0,
          order: moduleLessons.length,
          isFree: lessonFree,
          createdAt: new Date(),
        });
      }
      setShowLessonModal(false);
      loadCourseContent(selectedCourse);
      loadCourses();
    } catch (err) {
      console.error('saveLesson error:', err);
      showAlert('Errore', `Impossibile salvare la lezione.\n\n${getFirebaseErrorMessage(err)}`);
    }
  };

  const handleDeleteLesson = (lesson: AcademyLesson) => {
    showAlert('Elimina lezione', `Eliminare "${lesson.title}"?`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLesson(lesson.id);
            if (selectedCourse) loadCourseContent(selectedCourse);
            loadCourses();
          } catch {
            showAlert('Errore', 'Impossibile eliminare la lezione');
          }
        },
      },
    ]);
  };

  const togglePublish = async (course: AcademyCourse) => {
    try {
      await updateCourse(course.id, { isPublished: !course.isPublished });
      loadCourses();
    } catch {
      // Handle silently
    }
  };

  const renderCourse = ({ item }: { item: AcademyCourse }) => {
    const cat = CATEGORY_CONFIG[item.category];
    const isSelected = selectedCourse?.id === item.id;

    return (
      <TouchableOpacity onPress={() => loadCourseContent(item)}>
        <Card variant={isSelected ? 'elevated' : 'default'}>
          <View style={styles.courseRow}>
            <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
            <View style={styles.courseInfo}>
              <View style={styles.courseTitleRow}>
                <Text style={styles.courseTitle} numberOfLines={1}>{item.title}</Text>
                {!item.isPublished && (
                  <View style={styles.draftBadge}>
                    <Text style={styles.draftBadgeText}>BOZZA</Text>
                  </View>
                )}
              </View>
              <Text style={styles.courseMeta}>
                {cat.label} · {item.lessonsCount} lezioni · {item.durationMinutes} min
                {item.assignedTo && item.assignedTo.length > 0
                  ? ` · ${item.assignedTo.length} studenti`
                  : ' · Tutti'}
              </Text>
            </View>
            <View style={styles.courseActions}>
              <TouchableOpacity onPress={() => togglePublish(item)} style={styles.actionBtn}>
                <Ionicons
                  name={item.isPublished ? 'eye' : 'eye-off'}
                  size={18}
                  color={item.isPublished ? colors.success : colors.textLight}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openCourseModal(item)} style={styles.actionBtn}>
                <Ionicons name="create-outline" size={18} color={GOLD} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteCourse(item)} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderLesson = ({ item, index }: { item: AcademyLesson; index: number }) => (
    <View style={styles.lessonItem}>
      <View style={styles.lessonNumber}>
        <Text style={styles.lessonNumberText}>{index + 1}</Text>
      </View>
      <View style={styles.lessonInfo}>
        <Text style={styles.lessonTitle}>{item.title}</Text>
        <View style={styles.lessonMetaRow}>
          <Ionicons
            name={LESSON_TYPES.find((t) => t.value === item.type)?.icon as any || 'play-circle-outline'}
            size={12}
            color={colors.textLight}
          />
          <Text style={styles.lessonMetaText}>
            {LESSON_TYPES.find((t) => t.value === item.type)?.label} · {item.durationMinutes} min
          </Text>
          {item.isFree && <Text style={styles.freeLabel}>FREE</Text>}
        </View>
      </View>
      <TouchableOpacity onPress={() => openLessonModal(item)} style={styles.actionBtn}>
        <Ionicons name="create-outline" size={16} color={GOLD} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleDeleteLesson(item)} style={styles.actionBtn}>
        <Ionicons name="trash-outline" size={16} color={colors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <View style={styles.headerBrand}>
              <View style={styles.logoContainer}>
                <Text style={styles.logoFB}>FB</Text>
              </View>
              <View>
                <Text style={styles.headerTitle}>Academy</Text>
                <Text style={styles.headerSubtitle}>GESTIONE CORSI</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => openCourseModal()}>
            <Ionicons name="add" size={20} color={colors.textOnAccent} />
            <Text style={styles.addButtonText}>Nuovo Corso</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.statsText}>
          {courses.length} corsi · {courses.filter((c) => c.isPublished).length} pubblicati
        </Text>
      </View>

      <View style={styles.content}>
        {/* Lista corsi */}
        <View style={styles.coursesSection}>
          <Text style={styles.sectionTitle}>Corsi</Text>
          <FlatList
            data={courses}
            renderItem={renderCourse}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              loadingCourses ? (
                <View style={{ alignItems: 'center', padding: spacing.xl }}>
                  <ActivityIndicator size="large" color={GOLD} />
                  <Text style={styles.emptyText}>Caricamento corsi...</Text>
                </View>
              ) : loadError ? (
                <Card>
                  <Text style={[styles.emptyText, { color: colors.error }]}>{loadError}</Text>
                  <TouchableOpacity onPress={loadCourses} style={{ alignItems: 'center', marginTop: spacing.sm }}>
                    <Text style={{ color: GOLD, fontWeight: '600', fontSize: fontSize.sm }}>Riprova</Text>
                  </TouchableOpacity>
                </Card>
              ) : (
                <Card>
                  <Text style={styles.emptyText}>
                    Nessun corso creato. Premi "Nuovo Corso" per iniziare.
                  </Text>
                </Card>
              )
            }
          />
        </View>

        {/* Moduli e Lezioni del corso selezionato */}
        {selectedCourse && (
          <View style={styles.lessonsSection}>
            {/* Moduli */}
            <View style={styles.lessonsSectionHeader}>
              <Text style={styles.sectionTitle}>
                Moduli: {selectedCourse.title}
              </Text>
              <TouchableOpacity style={styles.addLessonBtn} onPress={() => openModuleModal()}>
                <Ionicons name="add" size={18} color={GOLD} />
                <Text style={styles.addLessonText}>Nuovo Modulo</Text>
              </TouchableOpacity>
            </View>

            {modules.length > 0 && (
              <View style={{ marginBottom: spacing.md }}>
                {modules.map((mod) => {
                  const isSelected = selectedModule?.id === mod.id;
                  const moduleLessonCount = lessons.filter((l) => l.moduleId === mod.id).length;
                  return (
                    <TouchableOpacity
                      key={mod.id}
                      onPress={() => setSelectedModule(isSelected ? null : mod)}
                      style={[
                        styles.moduleItem,
                        isSelected && styles.moduleItemSelected,
                      ]}
                    >
                      <Ionicons
                        name={isSelected ? 'folder-open' : 'folder-outline'}
                        size={20}
                        color={isSelected ? GOLD : colors.textSecondary}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.lessonTitle, isSelected && { color: GOLD }]}>
                          {mod.title}
                        </Text>
                        <Text style={styles.lessonMetaText}>
                          {moduleLessonCount} lezioni · {mod.description || 'Nessuna descrizione'}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => openModuleModal(mod)} style={styles.actionBtn}>
                        <Ionicons name="create-outline" size={16} color={GOLD} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteModule(mod)} style={styles.actionBtn}>
                        <Ionicons name="trash-outline" size={16} color={colors.error} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Lezioni */}
            <View style={styles.lessonsSectionHeader}>
              <Text style={styles.sectionTitle}>
                {selectedModule ? `Lezioni: ${selectedModule.title}` : 'Lezioni senza modulo'}
              </Text>
              <TouchableOpacity style={styles.addLessonBtn} onPress={() => openLessonModal()}>
                <Ionicons name="add" size={18} color={GOLD} />
                <Text style={styles.addLessonText}>Aggiungi</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={lessons.filter((l) =>
                selectedModule ? l.moduleId === selectedModule.id : !l.moduleId || l.moduleId === ''
              )}
              renderItem={renderLesson}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Card>
                  <Text style={styles.emptyText}>
                    {selectedModule
                      ? `Nessuna lezione in "${selectedModule.title}". Aggiungine una!`
                      : 'Nessuna lezione. Seleziona un modulo o aggiungine una qui.'}
                  </Text>
                </Card>
              }
            />
          </View>
        )}
      </View>

      {/* Modal Corso */}
      <Modal visible={showCourseModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingCourse ? 'Modifica Corso' : 'Nuovo Corso'}
                </Text>
                <TouchableOpacity onPress={() => setShowCourseModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Titolo</Text>
                <TextInput
                  style={styles.input}
                  value={courseTitle}
                  onChangeText={setCourseTitle}
                  placeholder="Nome del corso"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Descrizione</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={courseDesc}
                  onChangeText={setCourseDesc}
                  placeholder="Descrizione del corso"
                  placeholderTextColor={colors.textLight}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Categoria</Text>
                <View style={styles.categoryRow}>
                  {(Object.keys(CATEGORY_CONFIG) as AcademyCourseCategory[]).map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        courseCategory === cat && {
                          backgroundColor: CATEGORY_CONFIG[cat].color + '30',
                          borderColor: CATEGORY_CONFIG[cat].color,
                        },
                      ]}
                      onPress={() => setCourseCategory(cat)}
                    >
                      <Ionicons
                        name={CATEGORY_CONFIG[cat].icon as any}
                        size={14}
                        color={courseCategory === cat ? CATEGORY_CONFIG[cat].color : colors.textLight}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          courseCategory === cat && { color: CATEGORY_CONFIG[cat].color },
                        ]}
                      >
                        {CATEGORY_CONFIG[cat].label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Tags (separati da virgola)</Text>
                <TextInput
                  style={styles.input}
                  value={courseTags}
                  onChangeText={setCourseTags}
                  placeholder="mindset, forza, benessere"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setCoursePublished(!coursePublished)}
              >
                <Text style={styles.label}>Pubblicato</Text>
                <View style={[styles.toggle, coursePublished && styles.toggleActive]}>
                  <View style={[styles.toggleDot, coursePublished && styles.toggleDotActive]} />
                </View>
              </TouchableOpacity>

              {/* Assegnazione studenti */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Assegna a studenti {courseAssignedTo.length > 0 ? `(${courseAssignedTo.length} selezionati)` : '(tutti)'}
                </Text>
                <Text style={{ fontSize: fontSize.xs, color: colors.textLight, marginBottom: spacing.sm }}>
                  Se non selezioni nessuno, il corso sarà visibile a tutti gli studenti.
                </Text>
                <TextInput
                  style={styles.input}
                  value={studentSearch}
                  onChangeText={setStudentSearch}
                  placeholder="Cerca studente per nome..."
                  placeholderTextColor={colors.textLight}
                />

                {/* Selected students chips */}
                {courseAssignedTo.length > 0 && (
                  <View style={[styles.categoryRow, { marginTop: spacing.sm }]}>
                    {courseAssignedTo.map((sid) => {
                      const s = allStudents.find((st) => st.id === sid);
                      return (
                        <TouchableOpacity
                          key={sid}
                          style={[styles.categoryChip, { backgroundColor: GOLD + '20', borderColor: GOLD }]}
                          onPress={() => setCourseAssignedTo(courseAssignedTo.filter((id) => id !== sid))}
                        >
                          <Text style={[styles.categoryChipText, { color: GOLD }]}>
                            {s ? `${s.name} ${s.surname}` : sid}
                          </Text>
                          <Ionicons name="close-circle" size={14} color={GOLD} />
                        </TouchableOpacity>
                      );
                    })}
                    <TouchableOpacity
                      style={[styles.categoryChip, { backgroundColor: colors.error + '20', borderColor: colors.error }]}
                      onPress={() => setCourseAssignedTo([])}
                    >
                      <Text style={[styles.categoryChipText, { color: colors.error }]}>Rimuovi tutti</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Student list */}
                <View style={{ maxHeight: 200, marginTop: spacing.sm }}>
                  <ScrollView nestedScrollEnabled>
                    {allStudents
                      .filter((s) => {
                        if (!studentSearch.trim()) return !courseAssignedTo.includes(s.id);
                        const search = studentSearch.toLowerCase();
                        return (
                          !courseAssignedTo.includes(s.id) &&
                          (`${s.name} ${s.surname}`.toLowerCase().includes(search) ||
                            (s.email && s.email.toLowerCase().includes(search)))
                        );
                      })
                      .map((s) => (
                        <TouchableOpacity
                          key={s.id}
                          style={styles.studentListItem}
                          onPress={() => setCourseAssignedTo([...courseAssignedTo, s.id])}
                        >
                          <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: '600' }}>
                              {s.name} {s.surname}
                            </Text>
                            {s.email ? (
                              <Text style={{ color: colors.textLight, fontSize: fontSize.xs }}>{s.email}</Text>
                            ) : null}
                          </View>
                          <Ionicons name="add-circle-outline" size={18} color={GOLD} />
                        </TouchableOpacity>
                      ))}
                    {allStudents.filter((s) => !courseAssignedTo.includes(s.id)).length === 0 && (
                      <Text style={{ color: colors.textLight, fontSize: fontSize.sm, textAlign: 'center', padding: spacing.md }}>
                        {allStudents.length === 0 ? 'Nessuno studente trovato' : 'Tutti gli studenti sono stati assegnati'}
                      </Text>
                    )}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowCourseModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Annulla</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveCourse}>
                  <Text style={styles.saveBtnText}>Salva</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Lezione */}
      <Modal visible={showLessonModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingLesson ? 'Modifica Lezione' : 'Nuova Lezione'}
                </Text>
                <TouchableOpacity onPress={() => setShowLessonModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Titolo</Text>
                <TextInput
                  style={styles.input}
                  value={lessonTitle}
                  onChangeText={setLessonTitle}
                  placeholder="Nome della lezione"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Descrizione</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={lessonDesc}
                  onChangeText={setLessonDesc}
                  placeholder="Descrizione"
                  placeholderTextColor={colors.textLight}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Tipo</Text>
                <View style={styles.categoryRow}>
                  {LESSON_TYPES.map((lt) => (
                    <TouchableOpacity
                      key={lt.value}
                      style={[
                        styles.categoryChip,
                        lessonType === lt.value && {
                          backgroundColor: GOLD + '30',
                          borderColor: GOLD,
                        },
                      ]}
                      onPress={() => setLessonType(lt.value)}
                    >
                      <Ionicons
                        name={lt.icon as any}
                        size={14}
                        color={lessonType === lt.value ? GOLD : colors.textLight}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          lessonType === lt.value && { color: GOLD },
                        ]}
                      >
                        {lt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Contenuto</Text>

                {/* Upload file button */}
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={handlePickFile}
                  disabled={uploading}
                >
                  <Ionicons
                    name={selectedFileName ? 'checkmark-circle' : 'cloud-upload-outline'}
                    size={20}
                    color={selectedFileName ? colors.success : GOLD}
                  />
                  <Text style={styles.uploadBtnText}>
                    {uploading
                      ? 'Caricamento...'
                      : selectedFileName
                        ? selectedFileName
                        : `Carica ${lessonType === 'pdf' ? 'PDF' : lessonType === 'video' ? 'Video' : lessonType === 'audio' ? 'Audio' : 'File'}`
                    }
                  </Text>
                  {uploading && <ActivityIndicator size="small" color={GOLD} />}
                </TouchableOpacity>

                <Text style={[styles.label, { marginTop: spacing.sm, marginBottom: spacing.xs }]}>
                  Oppure inserisci URL
                </Text>
                <TextInput
                  style={styles.input}
                  value={lessonUrl}
                  onChangeText={(text) => { setLessonUrl(text); if (text) { setSelectedFileUri(''); setSelectedFileName(''); } }}
                  placeholder="https://youtube.com/... oppure link diretto"
                  placeholderTextColor={colors.textLight}
                  autoCapitalize="none"
                  editable={!selectedFileUri}
                />
                {selectedFileUri ? (
                  <TouchableOpacity
                    onPress={() => { setSelectedFileUri(''); setSelectedFileName(''); }}
                    style={{ marginTop: spacing.xs }}
                  >
                    <Text style={{ color: colors.error, fontSize: fontSize.sm }}>
                      Rimuovi file selezionato
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Durata (minuti)</Text>
                <TextInput
                  style={styles.input}
                  value={lessonDuration}
                  onChangeText={setLessonDuration}
                  placeholder="15"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setLessonFree(!lessonFree)}
              >
                <Text style={styles.label}>Lezione gratuita (anteprima)</Text>
                <View style={[styles.toggle, lessonFree && styles.toggleActive]}>
                  <View style={[styles.toggleDot, lessonFree && styles.toggleDotActive]} />
                </View>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowLessonModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Annulla</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveLesson}>
                  <Text style={styles.saveBtnText}>Salva</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* Modal Modulo */}
      <Modal visible={showModuleModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingModule ? 'Modifica Modulo' : 'Nuovo Modulo'}
                </Text>
                <TouchableOpacity onPress={() => setShowModuleModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Titolo del modulo</Text>
                <TextInput
                  style={styles.input}
                  value={moduleTitle}
                  onChangeText={setModuleTitle}
                  placeholder="Es: Introduzione, Livello Avanzato..."
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Descrizione</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={moduleDesc}
                  onChangeText={setModuleDesc}
                  placeholder="Descrizione del modulo"
                  placeholderTextColor={colors.textLight}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowModuleModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Annulla</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveModule}>
                  <Text style={styles.saveBtnText}>Salva</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
    borderBottomWidth: 1,
    borderBottomColor: GOLD + '30',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: GOLD,
  },
  logoFB: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: GOLD,
  },
  headerSubtitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: GOLD + '80',
    letterSpacing: 3,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  addButtonText: {
    color: colors.textOnAccent,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  statsText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    marginTop: spacing.sm,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  coursesSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  courseInfo: {
    flex: 1,
  },
  courseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  courseTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  draftBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  draftBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.warning,
  },
  courseMeta: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: 2,
  },
  courseActions: {
    flexDirection: 'row',
    gap: 2,
  },
  actionBtn: {
    padding: spacing.xs,
  },
  lessonsSection: {
    flex: 1,
    marginTop: spacing.lg,
  },
  lessonsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addLessonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: GOLD,
  },
  addLessonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: GOLD,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: GOLD + '50',
    borderStyle: 'dashed',
    marginBottom: spacing.xs,
  },
  uploadBtnText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moduleItemSelected: {
    borderColor: GOLD,
    backgroundColor: GOLD + '10',
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  lessonNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonNumberText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  lessonMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  lessonMetaText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  freeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: GOLD,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.lg,
    fontSize: fontSize.md,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoryChipText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: GOLD,
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.textLight,
  },
  toggleDotActive: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-end',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: fontSize.md,
  },
  saveBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  saveBtnText: {
    color: colors.textOnAccent,
    fontWeight: '700',
    fontSize: fontSize.md,
  },
  studentListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
