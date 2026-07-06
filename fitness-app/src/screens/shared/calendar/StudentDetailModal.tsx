import React from 'react';
import { View, Text, ScrollView, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../../config/theme';
import { ModalHeader } from '../../../components/common/ModalHeader';
import { Badge } from '../../../components/common/Badge';

type AppointmentKind = 'training' | 'nutrition';

type AppointmentItem = {
  id: string;
  kind: AppointmentKind;
  studentId: string;
  staffId: string;
  date: Date;
  dateStr: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string;
  sessionCost?: number;
  isCountedAsCompleted: boolean;
};

export interface StudentDetailModalProps {
  visible: boolean;
  studentName: string;
  isOwner: boolean;
  stats: {
    total: number;
    completed: number;
    cancelled: number;
    remaining: number;
  };
  upcoming: AppointmentItem[];
  past: AppointmentItem[];
  onClose: () => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  visible,
  studentName,
  isOwner,
  stats,
  upcoming,
  past,
  onClose,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <ScrollView style={styles.modalContent}>
          <ModalHeader
            title={`Appuntamenti - ${studentName}`}
            onClose={onClose}
          />

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Totali</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={{ ...styles.statValue, color: colors.success }}>{stats.completed}</Text>
              <Text style={styles.statLabel}>Completati</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={{ ...styles.statValue, color: colors.error }}>{stats.cancelled}</Text>
              <Text style={styles.statLabel}>Annullati</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={{ ...styles.statValue, color: colors.info }}>{stats.remaining}</Text>
              <Text style={styles.statLabel}>Rimanenti</Text>
            </View>
          </View>

          {/* Upcoming */}
          <Text style={styles.sectionTitle}>Prossimi ({upcoming.length})</Text>
          {upcoming.length === 0 ? (
            <Text style={styles.emptySection}>Nessun appuntamento programmato</Text>
          ) : (
            upcoming.map((item) => (
              <View key={item.id} style={styles.miniCard}>
                <View style={styles.miniCardLeft}>
                  <Ionicons
                    name={item.kind === 'training' ? 'barbell' : 'nutrition'}
                    size={14}
                    color={item.kind === 'training' ? colors.accent : colors.success}
                  />
                  <Text style={styles.miniCardDate}>
                    {item.date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                  </Text>
                  <Text style={styles.miniCardTime}>{item.startTime}</Text>
                </View>
                <Badge status={item.status} />
              </View>
            ))
          )}

          {/* History */}
          <Text style={styles.sectionTitle}>Storico ({past.length})</Text>
          {past.length === 0 ? (
            <Text style={styles.emptySection}>Nessuno storico</Text>
          ) : (
            past.map((item) => (
              <View key={item.id} style={styles.miniCard}>
                <View style={styles.miniCardLeft}>
                  <Ionicons
                    name={item.kind === 'training' ? 'barbell' : 'nutrition'}
                    size={14}
                    color={item.kind === 'training' ? colors.accent : colors.success}
                  />
                  <Text style={styles.miniCardDate}>
                    {item.date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                  </Text>
                  <Text style={styles.miniCardTime}>{item.startTime}</Text>
                  {isOwner && item.sessionCost != null && item.sessionCost > 0 && (
                    <Text style={styles.miniCardCost}>{'€'}{item.sessionCost}</Text>
                  )}
                </View>
                <Badge status={item.status} />
              </View>
            ))
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySection: { fontSize: fontSize.sm, color: colors.textLight, marginBottom: spacing.sm },
  miniCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  miniCardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  miniCardDate: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  miniCardTime: { fontSize: fontSize.sm, color: colors.textSecondary },
  miniCardCost: { fontSize: fontSize.sm, color: colors.success, fontWeight: '600' },
});
