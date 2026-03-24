import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { LessonPlayerModal } from '../../components/common/LessonPlayerModal';
import { useAuth } from '../../hooks/useAuth';
import {
  AcademyCourse,
  AcademyLesson,
  AcademyProgress,
  AcademyCourseCategory,
} from '../../types';
import {
  getCoursesForStudent,
  getCourseLessons,
  getStudentProgress,
  markLessonComplete,
} from '../../services/academyService';

const CATEGORY_CONFIG: Record<AcademyCourseCategory, { label: string; color: string; icon: string }> = {
  mind: { label: 'Mind', color: '#9C27B0', icon: 'bulb-outline' },
  movement: { label: 'Movement', color: '#D40000', icon: 'fitness-outline' },
  nutrition: { label: 'Nutrizione', color: '#4CAF50', icon: 'nutrition-outline' },
  lifestyle: { label: 'Lifestyle', color: '#FF9800', icon: 'sunny-outline' },
  recovery: { label: 'Recovery', color: '#2196F3', icon: 'medkit-outline' },
};

const LESSON_TYPE_ICONS: Record<string, string> = {
  video: 'play-circle-outline',
  audio: 'headset-outline',
  article: 'document-text-outline',
  exercise: 'barbell-outline',
};

// ─── Gold accent for Academy branding ───
const GOLD = '#C5A55A';
const GOLD_DARK = '#8B7335';

export const AcademyScreen: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<AcademyCourseCategory | 'all'>('all');
  const [selectedCourse, setSelectedCourse] = useState<AcademyCourse | null>(null);
  const [lessons, setLessons] = useState<AcademyLesson[]>([]);
  const [progress, setProgress] = useState<AcademyProgress[]>([]);
  const [allProgress, setAllProgress] = useState<AcademyProgress[]>([]);

  const loadCourses = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getCoursesForStudent(user.id);
      setCourses(data);
      const prog = await getStudentProgress(user.id);
      setAllProgress(prog);
    } catch {
      // Silently handle
    }
  }, [user]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const openCourse = async (course: AcademyCourse) => {
    setSelectedCourse(course);
    try {
      const [lessonData, progressData] = await Promise.all([
        getCourseLessons(course.id),
        user ? getStudentProgress(user.id, course.id) : Promise.resolve([]),
      ]);
      setLessons(lessonData);
      setProgress(progressData);
    } catch {
      // Silently handle
    }
  };

  const handleCompleteLesson = async (lesson: AcademyLesson) => {
    if (!user || !selectedCourse) return;
    try {
      await markLessonComplete(user.id, selectedCourse.id, lesson.id);
      const updatedProgress = await getStudentProgress(user.id, selectedCourse.id);
      setProgress(updatedProgress);
      const updatedAll = await getStudentProgress(user.id);
      setAllProgress(updatedAll);
    } catch {
      // Silently handle
    }
  };

  const [playingLesson, setPlayingLesson] = useState<AcademyLesson | null>(null);

  const handleOpenLesson = (lesson: AcademyLesson) => {
    setPlayingLesson(lesson);
  };

  const handlePlayerComplete = async (lesson: AcademyLesson) => {
    await handleCompleteLesson(lesson);
  };

  const isLessonCompleted = (lessonId: string) =>
    progress.some((p) => p.lessonId === lessonId);

  const getCourseProgress = (courseId: string, lessonsCount: number) => {
    if (lessonsCount === 0) return 0;
    const completed = allProgress.filter((p) => p.courseId === courseId).length;
    return Math.round((completed / lessonsCount) * 100);
  };

  const filtered =
    selectedCategory === 'all'
      ? courses
      : courses.filter((c) => c.category === selectedCategory);

  const renderCourse = ({ item }: { item: AcademyCourse }) => {
    const cat = CATEGORY_CONFIG[item.category];
    const prog = getCourseProgress(item.id, item.lessonsCount);

    return (
      <TouchableOpacity onPress={() => openCourse(item)}>
        <Card variant="elevated">
          <View style={styles.courseHeader}>
            <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
              <Ionicons name={cat.icon as any} size={24} color={cat.color} />
            </View>
            <View style={styles.courseInfo}>
              <Text style={styles.courseTitle}>{item.title}</Text>
              <View style={styles.courseMeta}>
                <View style={[styles.categoryBadge, { backgroundColor: cat.color + '20' }]}>
                  <Text style={[styles.categoryBadgeText, { color: cat.color }]}>{cat.label}</Text>
                </View>
                <Text style={styles.courseMetaText}>
                  {item.lessonsCount} lezioni · {item.durationMinutes} min
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </View>
          <Text style={styles.courseDescription} numberOfLines={2}>
            {item.description}
          </Text>
          {/* Progress bar */}
          {prog > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${prog}%` }]} />
              </View>
              <Text style={styles.progressText}>{prog}%</Text>
            </View>
          )}
          {item.tags.length > 0 && (
            <View style={styles.tagRow}>
              {item.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  const renderLesson = ({ item, index }: { item: AcademyLesson; index: number }) => {
    const completed = isLessonCompleted(item.id);
    return (
      <TouchableOpacity
        onPress={() => handleOpenLesson(item)}
        style={styles.lessonItem}
      >
        <View style={[styles.lessonNumber, completed && styles.lessonNumberCompleted]}>
          {completed ? (
            <Ionicons name="checkmark" size={16} color={colors.textOnAccent} />
          ) : (
            <Text style={styles.lessonNumberText}>{index + 1}</Text>
          )}
        </View>
        <View style={styles.lessonInfo}>
          <Text style={[styles.lessonTitle, completed && styles.lessonTitleCompleted]}>
            {item.title}
          </Text>
          <View style={styles.lessonMeta}>
            <Ionicons
              name={LESSON_TYPE_ICONS[item.type] as any}
              size={14}
              color={colors.textLight}
            />
            <Text style={styles.lessonDuration}>{item.durationMinutes} min</Text>
            {item.isFree && (
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>FREE</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.lessonActions}>
          {!completed && (
            <TouchableOpacity
              onPress={() => handleCompleteLesson(item)}
              style={styles.completeBtn}
            >
              <Ionicons name="checkmark-circle-outline" size={24} color={GOLD} />
            </TouchableOpacity>
          )}
          <Ionicons name="play-circle" size={28} color={colors.accent} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header con branding Academy */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoFB}>FB</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Mind Movement</Text>
            <Text style={styles.headerSubtitle}>ACADEMY</Text>
          </View>
        </View>
        <Text style={styles.headerDesc}>
          Corsi esclusivi per la tua crescita
        </Text>
      </View>

      {/* Filtri categoria */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, selectedCategory === 'all' && styles.filterChipActive]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={[styles.filterText, selectedCategory === 'all' && styles.filterTextActive]}>
            Tutti
          </Text>
        </TouchableOpacity>
        {(Object.keys(CATEGORY_CONFIG) as AcademyCourseCategory[]).map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Ionicons
              name={CATEGORY_CONFIG[cat].icon as any}
              size={14}
              color={selectedCategory === cat ? colors.textOnAccent : colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.filterText, selectedCategory === cat && styles.filterTextActive]}>
              {CATEGORY_CONFIG[cat].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista corsi */}
      <FlatList
        data={filtered}
        renderItem={renderCourse}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Card>
            <View style={styles.emptyContainer}>
              <Ionicons name="school-outline" size={48} color={GOLD} />
              <Text style={styles.emptyText}>
                Nessun corso disponibile al momento
              </Text>
              <Text style={styles.emptySubtext}>
                I nuovi corsi saranno disponibili a breve
              </Text>
            </View>
          </Card>
        }
      />

      {/* Modal dettaglio corso */}
      <Modal visible={!!selectedCourse} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedCourse && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderInfo}>
                    <View
                      style={[
                        styles.modalCategoryBadge,
                        { backgroundColor: CATEGORY_CONFIG[selectedCourse.category].color + '20' },
                      ]}
                    >
                      <Ionicons
                        name={CATEGORY_CONFIG[selectedCourse.category].icon as any}
                        size={16}
                        color={CATEGORY_CONFIG[selectedCourse.category].color}
                      />
                      <Text
                        style={[
                          styles.modalCategoryText,
                          { color: CATEGORY_CONFIG[selectedCourse.category].color },
                        ]}
                      >
                        {CATEGORY_CONFIG[selectedCourse.category].label}
                      </Text>
                    </View>
                    <Text style={styles.modalTitle}>{selectedCourse.title}</Text>
                    <Text style={styles.modalDescription}>{selectedCourse.description}</Text>
                    <Text style={styles.modalMeta}>
                      {selectedCourse.lessonsCount} lezioni · {selectedCourse.durationMinutes} min totali
                    </Text>
                    {/* Progress */}
                    {lessons.length > 0 && (
                      <View style={styles.modalProgress}>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${Math.round(
                                  (progress.length / lessons.length) * 100
                                )}%`,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressText}>
                          {progress.length}/{lessons.length} completate
                        </Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedCourse(null)}
                    style={styles.closeBtn}
                  >
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={lessons}
                  renderItem={renderLesson}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.lessonList}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>Nessuna lezione ancora disponibile</Text>
                  }
                />
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Player lezione */}
      <LessonPlayerModal
        lesson={playingLesson}
        visible={!!playingLesson}
        onClose={() => setPlayingLesson(null)}
        onComplete={handlePlayerComplete}
        isCompleted={playingLesson ? isLessonCompleted(playingLesson.id) : false}
      />
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
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: GOLD,
  },
  logoFB: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: GOLD_DARK,
    letterSpacing: 4,
  },
  headerDesc: {
    fontSize: fontSize.md,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surface,
    ...shadows.small,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
  },
  filterText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.textOnAccent,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseInfo: {
    flex: 1,
  },
  courseTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  courseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
  },
  categoryBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  courseMetaText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  courseDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: GOLD,
    borderRadius: 3,
  },
  progressText: {
    fontSize: fontSize.xs,
    color: GOLD,
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.background,
    borderRadius: borderRadius.round,
  },
  tagText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: fontSize.md,
  },
  emptySubtext: {
    color: colors.textLight,
    textAlign: 'center',
    fontSize: fontSize.sm,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalHeaderInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  modalCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
  },
  modalCategoryText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  modalTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  modalDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  modalMeta: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  modalProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  lessonList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  lessonNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonNumberCompleted: {
    backgroundColor: GOLD,
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
  lessonTitleCompleted: {
    color: colors.textLight,
  },
  lessonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  lessonDuration: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  freeBadge: {
    backgroundColor: GOLD + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  freeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: GOLD,
  },
  lessonActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  completeBtn: {
    padding: 4,
  },
});
