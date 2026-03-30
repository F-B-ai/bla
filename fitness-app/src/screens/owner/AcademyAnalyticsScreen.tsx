import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { getAcademyAnalytics } from '../../services/academyService';

const GOLD = '#C5A55A';

interface AnalyticsData {
  totalCourses: number;
  publishedCourses: number;
  totalLessons: number;
  totalStudents: number;
  totalCompletions: number;
  courseStats: Array<{
    courseId: string;
    courseTitle: string;
    lessonsCount: number;
    completionCount: number;
    avgRating: number;
    ratingCount: number;
  }>;
}

export const AcademyAnalyticsScreen: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAcademyAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Analytics load error:', err);
      setError('Impossibile caricare le statistiche');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={styles.loadingText}>Caricamento statistiche...</Text>
      </View>
    );
  }

  if (error || !analytics) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>{error || 'Errore sconosciuto'}</Text>
        <TouchableOpacity onPress={loadAnalytics} style={styles.retryBtn}>
          <Ionicons name="refresh" size={18} color={GOLD} />
          <Text style={styles.retryText}>Riprova</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= Math.round(rating) ? 'star' : 'star-outline'}
            size={14}
            color={GOLD}
          />
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics Academy</Text>
        <Text style={styles.headerSubtitle}>Panoramica dei corsi e degli studenti</Text>
      </View>

      {/* KPI cards */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Ionicons name="school-outline" size={28} color={GOLD} />
          <Text style={styles.kpiValue}>{analytics.totalCourses}</Text>
          <Text style={styles.kpiLabel}>Corsi totali</Text>
        </View>
        <View style={styles.kpiCard}>
          <Ionicons name="eye-outline" size={28} color={colors.success} />
          <Text style={styles.kpiValue}>{analytics.publishedCourses}</Text>
          <Text style={styles.kpiLabel}>Pubblicati</Text>
        </View>
        <View style={styles.kpiCard}>
          <Ionicons name="book-outline" size={28} color={colors.info} />
          <Text style={styles.kpiValue}>{analytics.totalLessons}</Text>
          <Text style={styles.kpiLabel}>Lezioni</Text>
        </View>
      </View>

      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Ionicons name="people-outline" size={28} color="#9C27B0" />
          <Text style={styles.kpiValue}>{analytics.totalStudents}</Text>
          <Text style={styles.kpiLabel}>Studenti</Text>
        </View>
        <View style={styles.kpiCard}>
          <Ionicons name="checkmark-done-outline" size={28} color={colors.success} />
          <Text style={styles.kpiValue}>{analytics.totalCompletions}</Text>
          <Text style={styles.kpiLabel}>Completamenti</Text>
        </View>
        <View style={styles.kpiCard}>
          <Ionicons name="trending-up-outline" size={28} color={GOLD} />
          <Text style={styles.kpiValue}>
            {analytics.totalStudents > 0
              ? (analytics.totalCompletions / analytics.totalStudents).toFixed(1)
              : '0'}
          </Text>
          <Text style={styles.kpiLabel}>Media/studente</Text>
        </View>
      </View>

      {/* Course stats */}
      <Text style={styles.sectionTitle}>Dettaglio Corsi</Text>
      {analytics.courseStats.length === 0 ? (
        <Card>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nessun corso creato</Text>
          </View>
        </Card>
      ) : (
        analytics.courseStats.map((course) => (
          <Card key={course.courseId} variant="elevated">
            <View style={styles.courseStatRow}>
              <View style={styles.courseStatInfo}>
                <Text style={styles.courseStatTitle}>{course.courseTitle}</Text>
                <View style={styles.courseStatMeta}>
                  <Text style={styles.courseStatMetaText}>
                    {course.lessonsCount} lezioni
                  </Text>
                  <Text style={styles.courseStatMetaText}>
                    {course.completionCount} completamenti
                  </Text>
                </View>
              </View>
            </View>

            {/* Progress bar - completions relative to lessons */}
            <View style={styles.courseStatBar}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, course.lessonsCount > 0
                        ? (course.completionCount / course.lessonsCount) * 100
                        : 0)}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Rating */}
            <View style={styles.courseStatFooter}>
              {course.ratingCount > 0 ? (
                <View style={styles.courseRatingRow}>
                  {renderStars(course.avgRating)}
                  <Text style={styles.courseRatingText}>
                    {course.avgRating} ({course.ratingCount} vot{course.ratingCount === 1 ? 'o' : 'i'})
                  </Text>
                </View>
              ) : (
                <Text style={styles.noRatingText}>Nessuna valutazione</Text>
              )}
            </View>
          </Card>
        ))
      )}

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.md,
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
  },
  retryText: {
    color: GOLD,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: GOLD + '30',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: GOLD,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    marginTop: 2,
  },
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.small,
  },
  kpiValue: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  kpiLabel: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  courseStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  courseStatInfo: {
    flex: 1,
  },
  courseStatTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  courseStatMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 2,
  },
  courseStatMetaText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  courseStatBar: {
    marginBottom: spacing.sm,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: GOLD,
    borderRadius: 3,
  },
  courseStatFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  courseRatingText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginLeft: spacing.xs,
  },
  noRatingText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    fontStyle: 'italic',
  },
});
