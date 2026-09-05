import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import {
  getPersonTimeline,
  TimelineEvent,
  TimelinePage,
} from '../../services/twinEventService';

// ============================================================
// TIMELINE PERSONA (M3.5, doc 02 §3 / 07 M3) — "La mia storia"
// ------------------------------------------------------------
// La prima schermata che esiste SOLO grazie al Digital Human
// Twin: la cronologia unificata di tutto ciò che la persona ha
// fatto (check-in, allenamenti, presenze, valutazioni).
// - Allievo: la propria storia ("stai costruendo qualcosa").
// - Coach (route param studentId): stessa vista + layer
//   "da attenzionare" (readiness rossa, workout abbandonati).
// ============================================================

interface EventVisual {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: (p: Record<string, any>) => string;
  subtitle: (p: Record<string, any>) => string;
  /** true → riga evidenziata nel layer coach "da attenzionare" */
  attention?: (p: Record<string, any>) => boolean;
}

const VISUALS: Record<string, EventVisual> = {
  'wellness.checkin_submitted': {
    icon: 'pulse-outline',
    color: colors.accent,
    title: (p) => `Stato del giorno: ${p.score}`,
    subtitle: (p) =>
      `Sonno ${p.sleep} · Energia ${p.energy} · Umore ${p.mood} · Dolori ${p.soreness}`,
    attention: (p) => typeof p.score === 'number' && p.score < 40,
  },
  'gym.checkin': {
    icon: 'location-outline',
    color: colors.success,
    title: () => 'Accesso in palestra',
    subtitle: (p) => (p.method === 'manuale' ? 'Codice alla reception' : 'QR alla reception'),
  },
  'workout.started': {
    icon: 'play-outline',
    color: colors.textSecondary,
    title: () => 'Allenamento iniziato',
    subtitle: () => '',
  },
  'workout.completed': {
    icon: 'barbell-outline',
    color: colors.accent,
    title: (p) =>
      `Allenamento completato${p.duration_minutes ? ` · ${p.duration_minutes} min` : ''}`,
    subtitle: (p) => {
      const n = Array.isArray(p.exercises) ? p.exercises.length : 0;
      const vol = p.total_volume_kg ? ` · ${Math.round(p.total_volume_kg)} kg totali` : '';
      return n > 0 ? `${n} eserciz${n === 1 ? 'io' : 'i'}${vol}` : '';
    },
  },
  'workout.abandoned': {
    icon: 'exit-outline',
    color: colors.warning,
    title: () => 'Allenamento interrotto',
    subtitle: () => '',
    attention: () => true,
  },
  'body.measurement_recorded': {
    icon: 'body-outline',
    color: colors.info,
    title: () => 'Misurazioni registrate',
    subtitle: () => '',
  },
  'body.composition_estimated': {
    icon: 'analytics-outline',
    color: colors.info,
    title: () => 'Composizione corporea (stima AI)',
    subtitle: (p) =>
      p.estimated_body_fat != null ? `Massa grassa stimata ~${p.estimated_body_fat}%` : '',
  },
  'posture.assessed': {
    icon: 'accessibility-outline',
    color: colors.info,
    title: (p) => `Valutazione posturale${p.ai_assisted ? ' (con AI)' : ''}`,
    subtitle: (p) => {
      const f = Array.isArray(p.findings) ? p.findings : [];
      const rilevanti = f.filter((x: any) => x.severity && x.severity !== 'normal').length;
      return f.length > 0 ? `${f.length} distretti valutati · ${rilevanti} da lavorare` : '';
    },
  },
  'person.onboarded': {
    icon: 'flag-outline',
    color: colors.accent,
    title: () => 'Inizio del percorso',
    subtitle: (p) => {
      const o = Array.isArray(p.obiettivi) ? p.obiettivi.length : 0;
      return o > 0 ? `${o} obiettivi dichiarati` : 'scheda di onboarding';
    },
  },
  'breathing.session_completed': {
    icon: 'leaf-outline',
    color: colors.success,
    title: () => 'Respirazione guidata',
    subtitle: (p) => (p.duration_minutes ? `${p.duration_minutes} min` : ''),
  },
  'movement.gait_assessed': {
    icon: 'walk-outline',
    color: colors.info,
    title: (p) => `Analisi del cammino (${p.view === 'frontale' ? 'di fronte' : 'di lato'})`,
    subtitle: (p) => {
      const parts: string[] = [];
      if (p.cadence_spm != null) parts.push(`${p.cadence_spm} passi/min`);
      if (p.step_symmetry_pct != null) parts.push(`simmetria ${p.step_symmetry_pct}%`);
      if (p.pelvic_drop_deg != null) parts.push(`bacino ${p.pelvic_drop_deg}°`);
      return parts.join(' · ');
    },
  },
  'mindmovement.assessed': {
    icon: 'finger-print-outline',
    color: colors.accent,
    title: (p) => `Valutazione Mind Movement™${p.overall != null ? ` · ${p.overall}/100` : ''}`,
    subtitle: (p) => {
      const d = Array.isArray(p.domini) ? p.domini : [];
      const valutati = d.filter((x: any) => x.score !== null && x.score !== undefined);
      const flags = d.reduce((s: number, x: any) => s + (x.flags || 0), 0);
      return `${valutati.length}/4 domini · ${p.test_compilati || 0} test${flags > 0 ? ` · ${flags} da attenzionare` : ''}`;
    },
  },
  'movement.squat_assessed': {
    icon: 'barbell-outline',
    color: colors.info,
    title: (p) => `Analisi dello squat (${p.view === 'frontale' ? 'di fronte' : 'di lato'})`,
    subtitle: (p) => {
      const parts: string[] = [];
      if (p.reps != null) parts.push(`${p.reps} rip`);
      if (p.depth) parts.push(String(p.depth));
      if (p.bottom_knee_angle_deg != null) parts.push(`ginocchio ${p.bottom_knee_angle_deg}°`);
      if (p.knee_valgus_bottom_pct?.left != null) parts.push(`valgo sx ${p.knee_valgus_bottom_pct.left}%`);
      return parts.join(' · ');
    },
  },
};

const dayLabel = (d: Date): string => {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(d, today)) return 'Oggi';
  if (same(d, yesterday)) return 'Ieri';
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
};

type Row =
  | { kind: 'day'; id: string; label: string }
  | { kind: 'event'; id: string; event: TimelineEvent };

const toRows = (events: TimelineEvent[]): Row[] => {
  const rows: Row[] = [];
  let lastDay = '';
  for (const ev of events) {
    const label = dayLabel(ev.ts);
    if (label !== lastDay) {
      rows.push({ kind: 'day', id: `day_${label}_${ev.id}`, label });
      lastDay = label;
    }
    rows.push({ kind: 'event', id: ev.id, event: ev });
  }
  return rows;
};

export default function TimelineScreen() {
  const { user } = useAuth();
  const route = useRoute<any>();
  // Coach che guarda un allievo → param; allievo → se stesso
  const subjectUid: string | undefined = route.params?.studentId || user?.id;
  const subjectName: string | undefined = route.params?.studentName;
  const isCoachView = !!route.params?.studentId;

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [cursor, setCursor] = useState<TimelinePage['cursor']>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    if (!subjectUid) return;
    setLoading(true);
    try {
      const page = await getPersonTimeline(subjectUid, 50);
      setEvents(page.events);
      setCursor(page.cursor);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [subjectUid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const loadMore = async () => {
    if (!cursor || loadingMore || !subjectUid) return;
    setLoadingMore(true);
    try {
      const page = await getPersonTimeline(subjectUid, 50, cursor);
      setEvents((prev) => [...prev, ...page.events]);
      setCursor(page.cursor);
    } finally {
      setLoadingMore(false);
    }
  };

  const rows = toRows(events);

  const renderRow = ({ item }: { item: Row }) => {
    if (item.kind === 'day') {
      return <Text style={styles.dayHeader}>{item.label}</Text>;
    }
    const ev = item.event;
    const v = VISUALS[ev.type];
    if (!v) return null; // tipi futuri: la timeline non si rompe
    const attention = isCoachView && v.attention?.(ev.payload);
    const time = ev.ts.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    return (
      <View style={[styles.card, attention && styles.cardAttention]}>
        <View style={[styles.iconWrap, { backgroundColor: v.color + '22' }]}>
          <Ionicons name={v.icon} size={20} color={v.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{v.title(ev.payload)}</Text>
          {!!v.subtitle(ev.payload) && (
            <Text style={styles.cardSubtitle}>{v.subtitle(ev.payload)}</Text>
          )}
        </View>
        <Text style={styles.cardTime}>{time}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {isCoachView && subjectName ? (
        <Text style={styles.coachBanner}>Storia di {subjectName}</Text>
      ) : null}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="book-outline" size={44} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>La storia inizia oggi</Text>
          <Text style={styles.emptyText}>
            Ogni check-in, allenamento e accesso da adesso scrive una riga
            della {isCoachView ? 'sua' : 'tua'} storia. Torna dopo il prossimo
            allenamento.
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          renderItem={renderRow}
          contentContainerStyle={styles.listContent}
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.md }} />
            ) : cursor ? (
              <TouchableOpacity style={styles.moreBtn} onPress={loadMore}>
                <Text style={styles.moreBtnText}>Carica altri</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.endText}>Inizio della storia registrata</Text>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  coachBanner: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  dayHeader: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'capitalize',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  cardAttention: {
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  cardSubtitle: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 },
  cardTime: { color: colors.textSecondary, fontSize: fontSize.xs },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 21,
  },
  moreBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
  },
  moreBtnText: { color: colors.accent, fontWeight: '700' },
  endText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
});
