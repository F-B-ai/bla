import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { LessonPlayerModal } from '../../components/common/LessonPlayerModal';
import { useAuth } from '../../hooks/useAuth';
import {
  AcademyCourse,
  AcademyModule,
  AcademyLesson,
  AcademyProgress,
  AcademyCourseCategory,
} from '../../types';
import {
  getCoursesForStudent,
  getCourseModules,
  getCourseLessons,
  getStudentProgress,
  markLessonComplete,
  searchCourses,
  getCourseAverageRating,
  saveCourseRating,
  getStudentCourseRating,
  generateCertificate,
  getStudentCertificates,
} from '../../services/academyService';
import { AcademyCertificate, AcademyRating } from '../../types';

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
  pdf: 'document-attach-outline',
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
  const [modules, setModules] = useState<AcademyModule[]>([]);
  const [lessons, setLessons] = useState<AcademyLesson[]>([]);
  const [progress, setProgress] = useState<AcademyProgress[]>([]);
  const [allProgress, setAllProgress] = useState<AcademyProgress[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Ratings
  const [courseAvgRating, setCourseAvgRating] = useState<{ average: number; count: number }>({ average: 0, count: 0 });
  const [myRating, setMyRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Certificates
  const [certificates, setCertificates] = useState<AcademyCertificate[]>([]);
  const [showCertModal, setShowCertModal] = useState(false);
  const [selectedCert, setSelectedCert] = useState<AcademyCertificate | null>(null);

  const loadCourses = useCallback(async () => {
    if (!user) return;
    setLoadingCourses(true);
    setLoadError(null);
    try {
      const data = await getCoursesForStudent(user.id);
      setCourses(data);
      const [prog, certs] = await Promise.all([
        getStudentProgress(user.id),
        getStudentCertificates(user.id),
      ]);
      setAllProgress(prog);
      setCertificates(certs);
    } catch (err) {
      console.error('Academy loadCourses error:', err);
      setLoadError('Impossibile caricare i corsi. Controlla la connessione e riprova.');
    } finally {
      setLoadingCourses(false);
    }
  }, [user]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const [loadingLessons, setLoadingLessons] = useState(false);

  const openCourse = async (course: AcademyCourse) => {
    setSelectedCourse(course);
    setLoadingLessons(true);
    try {
      const [modulesData, lessonData, progressData, avgRating] = await Promise.all([
        getCourseModules(course.id),
        getCourseLessons(course.id),
        user ? getStudentProgress(user.id, course.id) : Promise.resolve([]),
        getCourseAverageRating(course.id),
      ]);
      setModules(modulesData);
      setLessons(lessonData);
      setProgress(progressData);
      setCourseAvgRating(avgRating);
      // Load user's rating
      if (user) {
        getStudentCourseRating(user.id, course.id).then((r) => {
          if (r) {
            setMyRating(r.rating);
            setRatingComment(r.comment || '');
          } else {
            setMyRating(0);
            setRatingComment('');
          }
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Academy openCourse error:', err);
      setModules([]);
      setLessons([]);
      setProgress([]);
    } finally {
      setLoadingLessons(false);
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
    } catch (err) {
      console.error('Academy markComplete error:', err);
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

  const handleSubmitRating = async () => {
    if (!user || !selectedCourse || myRating === 0) return;
    try {
      await saveCourseRating({
        studentId: user.id,
        courseId: selectedCourse.id,
        rating: myRating,
        comment: ratingComment,
        createdAt: new Date(),
      });
      const avg = await getCourseAverageRating(selectedCourse.id);
      setCourseAvgRating(avg);
      setShowRatingModal(false);
    } catch (err) {
      console.error('Rating submit error:', err);
    }
  };

  const handleGenerateCertificate = async () => {
    if (!user || !selectedCourse) return;
    try {
      const cert = await generateCertificate(
        user.id,
        `${user.name} ${user.surname}`,
        selectedCourse.id,
        selectedCourse.title
      );
      setSelectedCert(cert);
      setShowCertModal(true);
      const certs = await getStudentCertificates(user.id);
      setCertificates(certs);
    } catch (err) {
      console.error('Certificate error:', err);
    }
  };

  const isCourseCompleted = (courseId: string, lessonsCount: number) => {
    if (lessonsCount === 0) return false;
    const completed = allProgress.filter((p) => p.courseId === courseId).length;
    return completed >= lessonsCount;
  };

  const hasCertificate = (courseId: string) =>
    certificates.some((c) => c.courseId === courseId);

  const searchTerm = searchQuery.toLowerCase().trim();
  const filtered = courses.filter((c) => {
    const matchCategory = selectedCategory === 'all' || c.category === selectedCategory;
    const matchSearch = !searchTerm ||
      c.title.toLowerCase().includes(searchTerm) ||
      c.description.toLowerCase().includes(searchTerm) ||
      c.tags.some((t) => t.toLowerCase().includes(searchTerm));
    return matchCategory && matchSearch;
  });

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
          {/* Completed + certificate badge */}
          {isCourseCompleted(item.id, item.lessonsCount) && (
            <View style={styles.completedCourseBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.completedCourseText}>Completato</Text>
              {hasCertificate(item.id) && (
                <>
                  <Ionicons name="ribbon" size={16} color={GOLD} />
                  <Text style={styles.certBadgeText}>Certificato</Text>
                </>
              )}
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

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={colors.textLight} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Cerca corsi..."
          placeholderTextColor={colors.textLight}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textLight} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Certificati */}
      {certificates.length > 0 && (
        <TouchableOpacity
          style={styles.certsBanner}
          onPress={() => {
            setSelectedCert(certificates[0]);
            setShowCertModal(true);
          }}
        >
          <Ionicons name="ribbon-outline" size={20} color={GOLD} />
          <Text style={styles.certsBannerText}>
            {certificates.length} certificat{certificates.length === 1 ? 'o' : 'i'} ottenut{certificates.length === 1 ? 'o' : 'i'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={GOLD} />
        </TouchableOpacity>
      )}

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
          loadingCourses ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={GOLD} />
              <Text style={styles.emptyText}>Caricamento corsi...</Text>
            </View>
          ) : loadError ? (
            <Card>
              <View style={styles.emptyContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
                <Text style={styles.emptyText}>{loadError}</Text>
                <TouchableOpacity onPress={loadCourses} style={styles.retryBtn}>
                  <Ionicons name="refresh" size={18} color={GOLD} />
                  <Text style={styles.retryText}>Riprova</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ) : (
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
          )
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
                    {/* Rating */}
                    {courseAvgRating.count > 0 && (
                      <View style={styles.ratingRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name={star <= Math.round(courseAvgRating.average) ? 'star' : 'star-outline'}
                            size={16}
                            color={GOLD}
                          />
                        ))}
                        <Text style={styles.ratingText}>
                          {courseAvgRating.average.toFixed(1)} ({courseAvgRating.count})
                        </Text>
                      </View>
                    )}
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
                    {/* Actions: Rate + Certificate */}
                    <View style={styles.courseActionsRow}>
                      <TouchableOpacity
                        style={styles.rateBtn}
                        onPress={() => setShowRatingModal(true)}
                      >
                        <Ionicons name={myRating > 0 ? 'star' : 'star-outline'} size={16} color={GOLD} />
                        <Text style={styles.rateBtnText}>
                          {myRating > 0 ? `Voto: ${myRating}/5` : 'Valuta'}
                        </Text>
                      </TouchableOpacity>
                      {lessons.length > 0 && progress.length >= lessons.length && (
                        <TouchableOpacity
                          style={styles.certBtn}
                          onPress={handleGenerateCertificate}
                        >
                          <Ionicons name="ribbon-outline" size={16} color={GOLD} />
                          <Text style={styles.certBtnText}>
                            {hasCertificate(selectedCourse.id) ? 'Vedi certificato' : 'Ottieni certificato'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedCourse(null)}
                    style={styles.closeBtn}
                  >
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.lessonList}>
                  {loadingLessons ? (
                    <View style={styles.emptyContainer}>
                      <ActivityIndicator size="small" color={GOLD} />
                      <Text style={styles.emptyText}>Caricamento lezioni...</Text>
                    </View>
                  ) : lessons.length === 0 ? (
                    <Text style={styles.emptyText}>Nessuna lezione ancora disponibile</Text>
                  ) : (
                    <>
                      {/* Lezioni raggruppate per modulo */}
                      {modules.map((mod) => {
                        const moduleLessons = lessons.filter((l) => l.moduleId === mod.id);
                        if (moduleLessons.length === 0) return null;
                        return (
                          <View key={mod.id} style={styles.moduleSection}>
                            <View style={styles.moduleSectionHeader}>
                              <Ionicons name="folder-outline" size={18} color={GOLD} />
                              <Text style={styles.moduleSectionTitle}>{mod.title}</Text>
                              <Text style={styles.moduleSectionCount}>
                                {moduleLessons.length} lezioni
                              </Text>
                            </View>
                            {mod.description ? (
                              <Text style={styles.moduleSectionDesc}>{mod.description}</Text>
                            ) : null}
                            {moduleLessons.map((item, index) => (
                              <View key={item.id}>
                                {renderLesson({ item, index })}
                              </View>
                            ))}
                          </View>
                        );
                      })}
                      {/* Lezioni senza modulo */}
                      {(() => {
                        const unmoduleLessons = lessons.filter(
                          (l) => !l.moduleId || l.moduleId === ''
                        );
                        if (unmoduleLessons.length === 0) return null;
                        return (
                          <View>
                            {modules.length > 0 && (
                              <View style={styles.moduleSectionHeader}>
                                <Ionicons name="list-outline" size={18} color={colors.textLight} />
                                <Text style={styles.moduleSectionTitle}>Altre lezioni</Text>
                              </View>
                            )}
                            {unmoduleLessons.map((item, index) => (
                              <View key={item.id}>
                                {renderLesson({ item, index })}
                              </View>
                            ))}
                          </View>
                        );
                      })()}
                    </>
                  )}
                </ScrollView>
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
        userId={user?.id}
        courseId={selectedCourse?.id}
      />

      {/* Rating Modal */}
      <Modal visible={showRatingModal} animationType="fade" transparent>
        <View style={styles.ratingOverlay}>
          <View style={styles.ratingModal}>
            <Text style={styles.ratingModalTitle}>Valuta questo corso</Text>
            <View style={styles.ratingStarsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setMyRating(star)}>
                  <Ionicons
                    name={star <= myRating ? 'star' : 'star-outline'}
                    size={36}
                    color={GOLD}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.ratingInput}
              value={ratingComment}
              onChangeText={setRatingComment}
              placeholder="Commento (opzionale)"
              placeholderTextColor={colors.textLight}
              multiline
              numberOfLines={3}
            />
            <View style={styles.ratingActions}>
              <TouchableOpacity
                style={styles.ratingCancelBtn}
                onPress={() => setShowRatingModal(false)}
              >
                <Text style={styles.ratingCancelText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ratingSendBtn, myRating === 0 && { opacity: 0.5 }]}
                onPress={handleSubmitRating}
                disabled={myRating === 0}
              >
                <Text style={styles.ratingSendText}>Invia</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Certificate Modal */}
      <Modal visible={showCertModal} animationType="fade" transparent>
        <View style={styles.ratingOverlay}>
          <View style={styles.certModal}>
            {selectedCert && (
              <>
                <Ionicons name="ribbon" size={64} color={GOLD} />
                <Text style={styles.certTitle}>Certificato di Completamento</Text>
                <Text style={styles.certStudentName}>{selectedCert.studentName}</Text>
                <Text style={styles.certCourseTitle}>ha completato il corso</Text>
                <Text style={styles.certCourseName}>{selectedCert.courseTitle}</Text>
                <View style={styles.certCodeContainer}>
                  <Text style={styles.certCodeLabel}>Codice:</Text>
                  <Text style={styles.certCode}>{selectedCert.certificateCode}</Text>
                </View>
              </>
            )}
            {!selectedCert && certificates.length > 0 && (
              <>
                <Text style={styles.certTitle}>I tuoi certificati</Text>
                <ScrollView style={{ maxHeight: 300, width: '100%' }}>
                  {certificates.map((cert) => (
                    <TouchableOpacity
                      key={cert.id}
                      style={styles.certListItem}
                      onPress={() => setSelectedCert(cert)}
                    >
                      <Ionicons name="ribbon" size={24} color={GOLD} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.certListTitle}>{cert.courseTitle}</Text>
                        <Text style={styles.certListCode}>{cert.certificateCode}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            <TouchableOpacity
              style={styles.certCloseBtn}
              onPress={() => { setShowCertModal(false); setSelectedCert(null); }}
            >
              <Text style={styles.certCloseText}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: GOLD,
    marginTop: spacing.sm,
  },
  retryText: {
    color: GOLD,
    fontSize: fontSize.sm,
    fontWeight: '600',
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
  moduleSection: {
    marginBottom: spacing.md,
  },
  moduleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  moduleSectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: GOLD,
    flex: 1,
  },
  moduleSectionCount: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  moduleSectionDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    paddingLeft: spacing.lg + spacing.sm,
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
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: fontSize.md,
  },
  // Certificates banner
  certsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: GOLD + '10',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: GOLD + '30',
  },
  certsBannerText: {
    flex: 1,
    color: GOLD,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  // Completed course badge
  completedCourseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  completedCourseText: {
    color: colors.success,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  certBadgeText: {
    color: GOLD,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  // Rating in course detail
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: spacing.xs,
  },
  ratingText: {
    color: colors.textLight,
    fontSize: fontSize.xs,
    marginLeft: spacing.xs,
  },
  courseActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: GOLD + '50',
  },
  rateBtnText: {
    color: GOLD,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  certBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    backgroundColor: GOLD + '15',
    borderWidth: 1,
    borderColor: GOLD + '50',
  },
  certBtnText: {
    color: GOLD,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  // Rating modal
  ratingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  ratingModal: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    gap: spacing.md,
  },
  ratingModalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  ratingStarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  ratingInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  ratingActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  ratingCancelBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  ratingCancelText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  ratingSendBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: GOLD,
    alignItems: 'center',
  },
  ratingSendText: {
    color: '#FFF',
    fontWeight: '700',
  },
  // Certificate modal
  certModal: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: spacing.md,
  },
  certTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: GOLD,
  },
  certStudentName: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  certCourseTitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  certCourseName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  certCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  certCodeLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  certCode: {
    color: GOLD,
    fontSize: fontSize.md,
    fontWeight: '700',
    letterSpacing: 2,
  },
  certListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  certListTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  certListCode: {
    color: colors.textLight,
    fontSize: fontSize.xs,
  },
  certCloseBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: GOLD,
    marginTop: spacing.sm,
  },
  certCloseText: {
    color: GOLD,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
