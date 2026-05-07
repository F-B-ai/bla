import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { crossAlert } from '../../utils/alert';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { TrainingSession, NutritionistAppointment } from '../../types';
import { cancelSession, getStudentSessions } from '../../services/sessionService';
import {
  getStudentAppointments,
  cancelAppointment,
} from '../../services/nutritionistService';
import { useAuth } from '../../hooks/useAuth';

const CANCELLATION_HOURS = 10;

type UnifiedItem = {
  id: string;
  kind: 'training' | 'nutrition';
  date: Date;
  startTime: string;
  endTime: string;
  status: string;
  notes: string;
  isCountedAsCompleted: boolean;
};

const toUnified = (
  sessions: TrainingSession[],
  appointments: NutritionistAppointment[]
): UnifiedItem[] => {
  const items: UnifiedItem[] = [];
  sessions.forEach((s) => {
    items.push({
      id: s.id, kind: 'training',
      date: new Date(s.date as unknown as string),
      startTime: s.startTime, endTime: s.endTime,
      status: s.status, notes: s.notes,
      isCountedAsCompleted: s.isCountedAsCompleted,
    });
  });
  appointments.forEach((a) => {
    items.push({
      id: a.id, kind: 'nutrition',
      date: new Date(a.date as unknown as string),
      startTime: a.startTime, endTime: a.endTime,
      status: a.status, notes: a.notes,
      isCountedAsCompleted: a.isCountedAsCompleted,
    });
  });
  items.sort((a, b) => b.date.getTime() - a.date.getTime());
  return items;
};

export const SessionsScreen: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [appointments, setAppointments] = useState<NutritionistAppointment[]>([]);
  const [activeSection, setActiveSection] = useState<'upcoming' | 'completed' | 'all'>('upcoming');

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [sessData, apptData] = await Promise.all([
        getStudentSessions(user.id),
        getStudentAppointments(user.id),
      ]);
      setSessions(sessData);
      setAppointments(apptData);
    } catch (err) {
      console.error('Errore caricamento sessioni:', err);
      crossAlert('Errore', 'Impossibile caricare le sessioni. Riprova più tardi.');
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const allItems = useMemo(() => toUnified(sessions, appointments), [sessions, appointments]);

  const now = new Date();
  const upcomingItems = allItems.filter(
    (s) => s.date > now && s.status === 'scheduled'
  );
  const completedItems = allItems.filter(
    (s) => s.status === 'completed' || s.isCountedAsCompleted
  );
  const filteredItems = activeSection === 'upcoming'
    ? upcomingItems
    : activeSection === 'completed'
    ? completedItems
    : allItems;

  const handleCancel = async (item: UnifiedItem) => {
    const hoursLeft = (item.date.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursLeft < CANCELLATION_HOURS) {
      crossAlert(
        'Attenzione',
        `Non puoi annullare meno di ${CANCELLATION_HOURS} ore prima. La sessione sarà considerata come eseguita e verrà addebitata.`,
        [
          { text: 'Ho capito', style: 'cancel' },
          {
            text: 'Annulla comunque',
            style: 'destructive',
            onPress: async () => {
              if (item.kind === 'training') await cancelSession(item.id, item.date);
              else await cancelAppointment(item.id, item.date);
              await loadData();
              crossAlert('Sessione annullata', 'Annullata con meno di 10 ore di preavviso: sarà conteggiata.');
            },
          },
        ]
      );
      return;
    }

    crossAlert('Conferma annullamento', 'Sei sicuro di voler annullare?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sì, annulla',
        onPress: async () => {
          if (item.kind === 'training') await cancelSession(item.id, item.date);
          else await cancelAppointment(item.id, item.date);
          await loadData();
          crossAlert('Fatto', 'Appuntamento annullato con successo');
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: UnifiedItem }) => {
    const isFuture = item.date > new Date();
    const cancellable = isFuture && item.status === 'scheduled';
    const isLateCancel = cancellable && (item.date.getTime() - Date.now()) / (1000 * 60 * 60) < CANCELLATION_HOURS;

    return (
      <Card variant="elevated">
        <View style={styles.sessionHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.kindRow}>
              <Ionicons
                name={item.kind === 'training' ? 'barbell' : 'nutrition'}
                size={14}
                color={item.kind === 'training' ? colors.accent : colors.success}
              />
              <Text style={[styles.kindLabel, { color: item.kind === 'training' ? colors.accent : colors.success }]}>
                {item.kind === 'training' ? 'Training' : 'Nutrizione'}
              </Text>
            </View>
            <Text style={styles.sessionDate}>
              {item.date.toLocaleDateString('it-IT', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            </Text>
            <Text style={styles.sessionTime}>
              {item.startTime} - {item.endTime}
            </Text>
          </View>
          <Badge status={item.status} />
        </View>

        {item.notes ? <Text style={styles.sessionNotes}>{item.notes}</Text> : null}

        {cancellable && (
          <View style={styles.cancelContainer}>
            <Button
              title={isLateCancel ? 'Annulla (sarà addebitata)' : 'Annulla Sessione'}
              onPress={() => handleCancel(item)}
              variant="danger"
            />
            {isLateCancel && (
              <Text style={styles.lateWarning}>
                Meno di {CANCELLATION_HOURS} ore - sarà conteggiata
              </Text>
            )}
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>I Miei Appuntamenti</Text>
        <Text style={styles.subtitle}>
          {completedItems.length} completat{completedItems.length === 1 ? 'o' : 'i'} · {upcomingItems.length} in programma
        </Text>
        <Text style={styles.cancelHint}>
          Disdetta gratuita entro {CANCELLATION_HOURS} ore prima
        </Text>
      </View>

      <View style={styles.sectionTabs}>
        {(['upcoming', 'completed', 'all'] as const).map((sec) => {
          const labels = { upcoming: `Da fare (${upcomingItems.length})`, completed: `Fatti (${completedItems.length})`, all: `Tutti (${allItems.length})` };
          return (
            <TouchableOpacity
              key={sec}
              style={[styles.sectionTab, activeSection === sec && styles.sectionTabActive]}
              onPress={() => setActiveSection(sec)}
            >
              <Text style={[styles.sectionTabText, activeSection === sec && styles.sectionTabTextActive]}>
                {labels[sec]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Card>
            <Text style={styles.emptyText}>
              {activeSection === 'upcoming' ? 'Nessun appuntamento in programma' :
               activeSection === 'completed' ? 'Nessun appuntamento completato' :
               'Nessun appuntamento'}
            </Text>
          </Card>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textOnPrimary },
  subtitle: { fontSize: fontSize.md, color: colors.textLight, marginTop: spacing.xs },
  cancelHint: { fontSize: fontSize.xs, color: colors.warning, marginTop: spacing.xs },
  sectionTabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  sectionTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTabActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  sectionTabText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  sectionTabTextActive: { color: colors.textOnAccent },
  list: { padding: spacing.md },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  kindRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  kindLabel: { fontSize: fontSize.xs, fontWeight: '700' },
  sessionDate: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  sessionTime: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: 2 },
  sessionNotes: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    paddingLeft: spacing.sm,
  },
  cancelContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  lateWarning: {
    fontSize: fontSize.xs,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.lg,
  },
});
