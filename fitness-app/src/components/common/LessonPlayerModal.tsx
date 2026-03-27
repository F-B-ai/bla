import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  ScrollView,
  Linking,
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, Audio, AVPlaybackStatus } from 'expo-av';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { AcademyLesson, AcademyQuiz, AcademyNote } from '../../types';
import {
  getQuizForLesson,
  submitQuizAttempt,
  getBestQuizAttempt,
  getNote,
  saveNote,
} from '../../services/academyService';

const GOLD = '#C5A55A';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_HEIGHT = (SCREEN_WIDTH * 9) / 16;

// Extract YouTube video ID from various URL formats
function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}

interface Props {
  lesson: AcademyLesson | null;
  visible: boolean;
  onClose: () => void;
  onComplete: (lesson: AcademyLesson) => void;
  isCompleted: boolean;
  userId?: string;
  courseId?: string;
}

export const LessonPlayerModal: React.FC<Props> = ({
  lesson,
  visible,
  onClose,
  onComplete,
  isCompleted,
  userId,
  courseId,
}) => {
  const videoRef = useRef<Video>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Quiz state
  const [quiz, setQuiz] = useState<AcademyQuiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizPassed, setQuizPassed] = useState(false);
  const [bestScore, setBestScore] = useState<number | null>(null);

  // Notes state
  const [noteContent, setNoteContent] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const isYouTube = lesson?.contentUrl ? isYouTubeUrl(lesson.contentUrl) : false;
  const youtubeId = lesson?.contentUrl ? getYouTubeId(lesson.contentUrl) : null;

  // Cleanup audio on close
  useEffect(() => {
    if (!visible && soundRef.current) {
      soundRef.current.unloadAsync();
      soundRef.current = null;
      setIsPlaying(false);
      setPositionMs(0);
      setDurationMs(0);
    }
  }, [visible]);

  useEffect(() => {
    setError(null);
    setIsLoading(true);
    setIsPlaying(false);
    setPositionMs(0);
    setDurationMs(0);
    setQuiz(null);
    setQuizAnswers([]);
    setQuizSubmitted(false);
    setQuizScore(0);
    setBestScore(null);
    setNoteContent('');
    setShowNotes(false);
  }, [lesson?.id]);

  // Load quiz and notes when lesson changes
  useEffect(() => {
    if (!lesson?.id || !visible) return;
    if (lesson.type === 'quiz') {
      getQuizForLesson(lesson.id).then((q) => {
        setQuiz(q);
        if (q) setQuizAnswers(new Array(q.questions.length).fill(-1));
        setIsLoading(false);
      }).catch(() => setIsLoading(false));
    }
    if (userId && lesson.id) {
      getNote(userId, lesson.id).then((n) => {
        if (n) setNoteContent(n.content);
      }).catch(() => {});
      if (lesson.type === 'quiz') {
        getBestQuizAttempt(userId, lesson.id).then((a) => {
          if (a) setBestScore(a.score);
        }).catch(() => {});
      }
    }
  }, [lesson?.id, visible, userId]);

  const handleQuizSubmit = async () => {
    if (!quiz || !userId || !lesson || !courseId) return;
    let correct = 0;
    quiz.questions.forEach((q, i) => {
      if (quizAnswers[i] === q.correctOptionIndex) correct++;
    });
    const score = Math.round((correct / quiz.questions.length) * 100);
    const passed = score >= quiz.passingScore;
    setQuizScore(score);
    setQuizPassed(passed);
    setQuizSubmitted(true);
    try {
      await submitQuizAttempt({
        studentId: userId,
        quizId: quiz.id,
        lessonId: lesson.id,
        courseId,
        answers: quizAnswers,
        score,
        passed,
        completedAt: new Date(),
      });
      if (passed) {
        onComplete(lesson);
      }
    } catch (err) {
      console.error('Quiz submit error:', err);
    }
  };

  const handleSaveNote = async () => {
    if (!userId || !lesson || !courseId) return;
    setSavingNote(true);
    try {
      await saveNote({
        studentId: userId,
        lessonId: lesson.id,
        courseId,
        content: noteContent,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (err) {
      console.error('Save note error:', err);
    } finally {
      setSavingNote(false);
    }
  };

  const onVideoStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsLoading(false);
      setIsPlaying(status.isPlaying);
      setPositionMs(status.positionMillis);
      setDurationMs(status.durationMillis || 0);
    } else if (status.error) {
      setError('Impossibile riprodurre il video');
      setIsLoading(false);
    }
  }, []);

  const loadAndPlayAudio = useCallback(async () => {
    if (!lesson?.contentUrl) return;
    try {
      setIsLoading(true);
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: lesson.contentUrl },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setIsLoading(false);
            setIsPlaying(status.isPlaying);
            setPositionMs(status.positionMillis);
            setDurationMs(status.durationMillis || 0);
          }
        }
      );
      soundRef.current = sound;
    } catch {
      setError('Impossibile riprodurre l\'audio');
      setIsLoading(false);
    }
  }, [lesson?.contentUrl]);

  const toggleAudioPlayback = async () => {
    if (!soundRef.current) {
      await loadAndPlayAudio();
      return;
    }
    if (isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const progressPercent = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;

  if (!lesson) return null;

  const renderPlayer = () => {
    if (!lesson.contentUrl) {
      return (
        <View style={styles.noContent}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textLight} />
          <Text style={styles.noContentText}>Nessun contenuto disponibile</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.noContent}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.openExternalBtn}
            onPress={() => Linking.openURL(lesson.contentUrl)}
          >
            <Ionicons name="open-outline" size={18} color={GOLD} />
            <Text style={styles.openExternalText}>Apri nel browser</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // YouTube video
    if (isYouTube && youtubeId) {
      if (Platform.OS === 'web') {
        return (
          <View style={styles.videoContainer}>
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&rel=0&modestbranding=1`}
              style={{
                width: '100%',
                height: VIDEO_HEIGHT,
                border: 'none',
                borderRadius: 12,
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </View>
        );
      }
      // Native: open YouTube in app/browser
      return (
        <View style={styles.nativeYoutube}>
          <View style={styles.youtubeThumbnail}>
            <Ionicons name="logo-youtube" size={64} color="#FF0000" />
          </View>
          <TouchableOpacity
            style={styles.playYoutubeBtn}
            onPress={() => Linking.openURL(lesson.contentUrl)}
          >
            <Ionicons name="play" size={24} color={colors.textOnAccent} />
            <Text style={styles.playYoutubeBtnText}>Riproduci su YouTube</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Direct video
    if (lesson.type === 'video') {
      return (
        <View style={styles.videoContainer}>
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={GOLD} />
            </View>
          )}
          <Video
            ref={videoRef}
            source={{ uri: lesson.contentUrl }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls
            onPlaybackStatusUpdate={onVideoStatusUpdate}
            onError={() => {
              setError('Impossibile riprodurre il video');
              setIsLoading(false);
            }}
          />
        </View>
      );
    }

    // Audio
    if (lesson.type === 'audio') {
      return (
        <View style={styles.audioContainer}>
          <View style={styles.audioArt}>
            <Ionicons name="musical-notes" size={64} color={GOLD} />
          </View>

          {/* Progress bar */}
          <View style={styles.audioProgress}>
            <View style={styles.audioProgressBar}>
              <View style={[styles.audioProgressFill, { width: `${progressPercent}%` }]} />
            </View>
            <View style={styles.audioTimeRow}>
              <Text style={styles.audioTime}>{formatTime(positionMs)}</Text>
              <Text style={styles.audioTime}>{formatTime(durationMs)}</Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.audioControls}>
            <TouchableOpacity onPress={toggleAudioPlayback} style={styles.audioPlayBtn}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // PDF — embed on web or open externally
    if (lesson.type === 'pdf') {
      if (Platform.OS === 'web') {
        return (
          <View style={styles.videoContainer}>
            <iframe
              src={lesson.contentUrl}
              style={{
                width: '100%',
                height: VIDEO_HEIGHT + 100,
                border: 'none',
                borderRadius: 8,
              }}
              title={lesson.title}
            />
          </View>
        );
      }
      return (
        <View style={styles.articleContainer}>
          <ScrollView style={styles.articleScroll}>
            <View style={styles.articleIcon}>
              <Ionicons name="document-attach-outline" size={48} color={GOLD} />
            </View>
            {lesson.description ? (
              <Text style={styles.articleText}>{lesson.description}</Text>
            ) : null}
            <TouchableOpacity
              style={styles.openExternalBtn}
              onPress={() => Linking.openURL(lesson.contentUrl)}
            >
              <Ionicons name="open-outline" size={18} color={GOLD} />
              <Text style={styles.openExternalText}>Apri PDF</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }

    // Quiz
    if (lesson.type === 'quiz' && quiz) {
      return (
        <ScrollView style={styles.quizContainer}>
          {bestScore !== null && !quizSubmitted && (
            <View style={styles.bestScoreBadge}>
              <Ionicons name="trophy-outline" size={16} color={GOLD} />
              <Text style={styles.bestScoreText}>Miglior punteggio: {bestScore}%</Text>
            </View>
          )}
          {quiz.questions.map((q, qIdx) => (
            <View key={q.id || qIdx} style={styles.quizQuestion}>
              <Text style={styles.quizQuestionText}>
                {qIdx + 1}. {q.question}
              </Text>
              {q.options.map((opt, oIdx) => {
                const selected = quizAnswers[qIdx] === oIdx;
                const isCorrect = quizSubmitted && oIdx === q.correctOptionIndex;
                const isWrong = quizSubmitted && selected && oIdx !== q.correctOptionIndex;
                return (
                  <TouchableOpacity
                    key={oIdx}
                    style={[
                      styles.quizOption,
                      selected && !quizSubmitted && styles.quizOptionSelected,
                      isCorrect && styles.quizOptionCorrect,
                      isWrong && styles.quizOptionWrong,
                    ]}
                    onPress={() => {
                      if (quizSubmitted) return;
                      const newAnswers = [...quizAnswers];
                      newAnswers[qIdx] = oIdx;
                      setQuizAnswers(newAnswers);
                    }}
                    disabled={quizSubmitted}
                  >
                    <View style={[
                      styles.quizOptionRadio,
                      selected && !quizSubmitted && styles.quizOptionRadioSelected,
                      isCorrect && { backgroundColor: colors.success, borderColor: colors.success },
                      isWrong && { backgroundColor: colors.error, borderColor: colors.error },
                    ]}>
                      {(selected || isCorrect) && (
                        <Ionicons
                          name={isCorrect ? 'checkmark' : isWrong ? 'close' : 'ellipse'}
                          size={12}
                          color="#FFF"
                        />
                      )}
                    </View>
                    <Text style={[
                      styles.quizOptionText,
                      isCorrect && { color: colors.success, fontWeight: '700' },
                      isWrong && { color: colors.error },
                    ]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {quizSubmitted && q.explanation && (
                <View style={styles.quizExplanation}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.info} />
                  <Text style={styles.quizExplanationText}>{q.explanation}</Text>
                </View>
              )}
            </View>
          ))}

          {quizSubmitted ? (
            <View style={styles.quizResult}>
              <Ionicons
                name={quizPassed ? 'checkmark-circle' : 'close-circle'}
                size={48}
                color={quizPassed ? colors.success : colors.error}
              />
              <Text style={[styles.quizResultText, { color: quizPassed ? colors.success : colors.error }]}>
                {quizScore}% — {quizPassed ? 'Superato!' : `Non superato (min. ${quiz.passingScore}%)`}
              </Text>
              {!quizPassed && (
                <TouchableOpacity
                  style={styles.quizRetryBtn}
                  onPress={() => {
                    setQuizSubmitted(false);
                    setQuizAnswers(new Array(quiz.questions.length).fill(-1));
                    setQuizScore(0);
                  }}
                >
                  <Ionicons name="refresh" size={18} color={GOLD} />
                  <Text style={styles.quizRetryText}>Riprova</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.quizSubmitBtn,
                quizAnswers.includes(-1) && styles.quizSubmitBtnDisabled,
              ]}
              onPress={handleQuizSubmit}
              disabled={quizAnswers.includes(-1)}
            >
              <Text style={styles.quizSubmitText}>Invia risposte</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      );
    }

    if (lesson.type === 'quiz' && !quiz) {
      return (
        <View style={styles.noContent}>
          <Ionicons name="help-circle-outline" size={48} color={colors.textLight} />
          <Text style={styles.noContentText}>Quiz non ancora configurato</Text>
        </View>
      );
    }

    // Article / Exercise — show description + open link
    return (
      <View style={styles.articleContainer}>
        <ScrollView style={styles.articleScroll}>
          <View style={styles.articleIcon}>
            <Ionicons
              name={lesson.type === 'exercise' ? 'barbell-outline' : 'document-text-outline'}
              size={48}
              color={GOLD}
            />
          </View>
          {lesson.description ? (
            <Text style={styles.articleText}>{lesson.description}</Text>
          ) : null}
          <TouchableOpacity
            style={styles.openExternalBtn}
            onPress={() => Linking.openURL(lesson.contentUrl)}
          >
            <Ionicons name="open-outline" size={18} color={GOLD} />
            <Text style={styles.openExternalText}>
              {lesson.type === 'exercise' ? 'Apri esercizio' : 'Leggi articolo'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <Text style={styles.lessonType}>
                {lesson.type === 'video' ? 'Video' :
                 lesson.type === 'audio' ? 'Audio' :
                 lesson.type === 'pdf' ? 'PDF' :
                 lesson.type === 'article' ? 'Articolo' :
                 lesson.type === 'quiz' ? 'Quiz' : 'Esercizio'}
                {lesson.durationMinutes > 0 ? ` · ${lesson.durationMinutes} min` : ''}
              </Text>
              <Text style={styles.title} numberOfLines={2}>{lesson.title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Player */}
          {renderPlayer()}

          {/* Description (for video/audio) */}
          {(lesson.type === 'video' || lesson.type === 'audio' || lesson.type === 'pdf') && lesson.description ? (
            <ScrollView style={styles.descriptionScroll}>
              <Text style={styles.description}>{lesson.description}</Text>
            </ScrollView>
          ) : null}

          {/* Notes section */}
          {userId && lesson.type !== 'quiz' && (
            <View style={styles.notesSection}>
              <TouchableOpacity
                style={styles.notesToggle}
                onPress={() => setShowNotes(!showNotes)}
              >
                <Ionicons name="pencil-outline" size={18} color={GOLD} />
                <Text style={styles.notesToggleText}>
                  {showNotes ? 'Nascondi appunti' : 'Appunti'}
                </Text>
                <Ionicons name={showNotes ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textLight} />
              </TouchableOpacity>
              {showNotes && (
                <View style={styles.notesContent}>
                  <TextInput
                    style={styles.notesInput}
                    value={noteContent}
                    onChangeText={setNoteContent}
                    placeholder="Scrivi i tuoi appunti qui..."
                    placeholderTextColor={colors.textLight}
                    multiline
                    numberOfLines={4}
                  />
                  <TouchableOpacity
                    style={styles.notesSaveBtn}
                    onPress={handleSaveNote}
                    disabled={savingNote}
                  >
                    {savingNote ? (
                      <ActivityIndicator size="small" color={GOLD} />
                    ) : (
                      <>
                        <Ionicons name="save-outline" size={16} color={GOLD} />
                        <Text style={styles.notesSaveText}>Salva</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Complete button */}
          <View style={styles.footer}>
            {isCompleted ? (
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark-circle" size={20} color={GOLD} />
                <Text style={styles.completedText}>Completata</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => onComplete(lesson)}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                <Text style={styles.completeButtonText}>Segna come completata</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '95%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  lessonType: {
    fontSize: fontSize.sm,
    color: GOLD,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  // Video
  videoContainer: {
    width: '100%',
    height: VIDEO_HEIGHT,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  // YouTube native
  nativeYoutube: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  youtubeThumbnail: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playYoutubeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FF0000',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  playYoutubeBtnText: {
    color: '#FFF',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  // Audio
  audioContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  audioArt: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: GOLD + '40',
  },
  audioProgress: {
    width: '100%',
  },
  audioProgressBar: {
    height: 4,
    backgroundColor: colors.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  audioProgressFill: {
    height: '100%',
    backgroundColor: GOLD,
    borderRadius: 2,
  },
  audioTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  audioTime: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  audioPlayBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: GOLD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Article / Exercise
  articleContainer: {
    flex: 1,
    minHeight: 200,
  },
  articleScroll: {
    padding: spacing.lg,
  },
  articleIcon: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  articleText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  openExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: GOLD,
    marginTop: spacing.md,
  },
  openExternalText: {
    color: GOLD,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  // No content / error
  noContent: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  noContentText: {
    color: colors.textLight,
    fontSize: fontSize.md,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.md,
  },
  // Description
  descriptionScroll: {
    maxHeight: 120,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  // Footer
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  completedText: {
    color: GOLD,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: GOLD,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  completeButtonText: {
    color: '#FFF',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  // Quiz styles
  quizContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  bestScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: GOLD + '15',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  bestScoreText: {
    color: GOLD,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  quizQuestion: {
    marginBottom: spacing.lg,
  },
  quizQuestionText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  quizOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quizOptionSelected: {
    borderColor: GOLD,
    backgroundColor: GOLD + '10',
  },
  quizOptionCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.success + '15',
  },
  quizOptionWrong: {
    borderColor: colors.error,
    backgroundColor: colors.error + '15',
  },
  quizOptionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quizOptionRadioSelected: {
    borderColor: GOLD,
    backgroundColor: GOLD,
  },
  quizOptionText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  quizExplanation: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.info + '10',
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  quizExplanationText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.info,
    lineHeight: 20,
  },
  quizResult: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  quizResultText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  quizRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: GOLD,
  },
  quizRetryText: {
    color: GOLD,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  quizSubmitBtn: {
    backgroundColor: GOLD,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  quizSubmitBtnDisabled: {
    opacity: 0.5,
  },
  quizSubmitText: {
    color: '#FFF',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  // Notes styles
  notesSection: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingHorizontal: spacing.lg,
  },
  notesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  notesToggleText: {
    flex: 1,
    color: GOLD,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  notesContent: {
    paddingBottom: spacing.sm,
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  notesSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: GOLD,
    marginTop: spacing.xs,
  },
  notesSaveText: {
    color: GOLD,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
