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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, Audio, AVPlaybackStatus } from 'expo-av';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { AcademyLesson } from '../../types';

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
}

export const LessonPlayerModal: React.FC<Props> = ({
  lesson,
  visible,
  onClose,
  onComplete,
  isCompleted,
}) => {
  const videoRef = useRef<Video>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

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
  }, [lesson?.id]);

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
                 lesson.type === 'article' ? 'Articolo' : 'Esercizio'}
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
});
