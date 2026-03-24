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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import {
  AcademyCourse,
  AcademyLesson,
  AcademyCourseCategory,
  AcademyLessonType,
} from '../../types';
import {
  getAllCourses,
  addCourse,
  updateCourse,
  deleteCourse,
  getCourseLessons,
  addLesson,
  updateLesson,
  deleteLesson,
} from '../../services/academyService';

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
  const [lessons, setLessons] = useState<AcademyLesson[]>([]);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<AcademyLesson | null>(null);

  // Course form
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseCategory, setCourseCategory] = useState<AcademyCourseCategory>('movement');
  const [courseTags, setCourseTags] = useState('');
  const [coursePublished, setCoursePublished] = useState(true);

  // Lesson form
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonType, setLessonType] = useState<AcademyLessonType>('video');
  const [lessonUrl, setLessonUrl] = useState('');
  const [lessonDuration, setLessonDuration] = useState('');
  const [lessonFree, setLessonFree] = useState(false);

  const loadCourses = useCallback(async () => {
    try {
      const data = await getAllCourses();
      setCourses(data);
    } catch {
      // Handle silently
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const loadLessons = async (course: AcademyCourse) => {
    setSelectedCourse(course);
    try {
      const data = await getCourseLessons(course.id);
      setLessons(data);
    } catch {
      // Handle silently
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
    } else {
      setEditingCourse(null);
      setCourseTitle('');
      setCourseDesc('');
      setCourseCategory('movement');
      setCourseTags('');
      setCoursePublished(true);
    }
    setShowCourseModal(true);
  };

  const saveCourse = async () => {
    if (!courseTitle.trim() || !user) return;
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
          assignedTo: [],
          tags,
          lessonsCount: 0,
          durationMinutes: 0,
          order: courses.length,
        });
      }
      setShowCourseModal(false);
      loadCourses();
    } catch {
      showAlert('Errore', 'Impossibile salvare il corso');
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
    setShowLessonModal(true);
  };

  const saveLesson = async () => {
    if (!lessonTitle.trim() || !selectedCourse) return;
    try {
      if (editingLesson) {
        await updateLesson(editingLesson.id, {
          title: lessonTitle.trim(),
          description: lessonDesc.trim(),
          type: lessonType,
          contentUrl: lessonUrl.trim(),
          durationMinutes: parseInt(lessonDuration) || 0,
          isFree: lessonFree,
        });
      } else {
        await addLesson({
          courseId: selectedCourse.id,
          title: lessonTitle.trim(),
          description: lessonDesc.trim(),
          type: lessonType,
          contentUrl: lessonUrl.trim(),
          durationMinutes: parseInt(lessonDuration) || 0,
          order: lessons.length,
          isFree: lessonFree,
          createdAt: new Date(),
        });
      }
      setShowLessonModal(false);
      loadLessons(selectedCourse);
      loadCourses();
    } catch {
      showAlert('Errore', 'Impossibile salvare la lezione');
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
            if (selectedCourse) loadLessons(selectedCourse);
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
      <TouchableOpacity onPress={() => loadLessons(item)}>
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
              <Card>
                <Text style={styles.emptyText}>
                  Nessun corso creato. Premi "Nuovo Corso" per iniziare.
                </Text>
              </Card>
            }
          />
        </View>

        {/* Lezioni del corso selezionato */}
        {selectedCourse && (
          <View style={styles.lessonsSection}>
            <View style={styles.lessonsSectionHeader}>
              <Text style={styles.sectionTitle}>
                Lezioni: {selectedCourse.title}
              </Text>
              <TouchableOpacity style={styles.addLessonBtn} onPress={() => openLessonModal()}>
                <Ionicons name="add" size={18} color={GOLD} />
                <Text style={styles.addLessonText}>Aggiungi</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={lessons}
              renderItem={renderLesson}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Card>
                  <Text style={styles.emptyText}>Nessuna lezione. Aggiungine una!</Text>
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
                <Text style={styles.label}>URL contenuto</Text>
                <TextInput
                  style={styles.input}
                  value={lessonUrl}
                  onChangeText={setLessonUrl}
                  placeholder="https://..."
                  placeholderTextColor={colors.textLight}
                  autoCapitalize="none"
                />
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
});
