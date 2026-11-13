import React from 'react';
import { View, Text, ScrollView, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../../config/theme';
import { ModalHeader } from '../../../components/common/ModalHeader';
import { Badge } from '../../../components/common/Badge';
import { aspetto, eSessione } from '../../../domain/appuntamento';

const TONO = { accento: colors.accent, verde: colors.success, ambra: colors.warning } as const;

type AppointmentKind = 'training' | 'nutrition' | 'consulenza' | 'gruppo';

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
  persone?: number;
  quotaPersona?: number;
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
  /** la riga che riassume: «12 in tutto · 9 svolte · 2 passate e mai segnate» */
  riepilogo?: string;
  /** quante sono passate e sono rimaste «in programma» */
  maiSegnate?: number;
  /** la persona non è in anagrafica: ha solo consulenze */
  ospite?: boolean;
  onClose: () => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  visible,
  studentName,
  isOwner,
  stats,
  upcoming,
  past,
  riepilogo,
  maiSegnate = 0,
  ospite = false,
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

          {/* La riga che riassume, e l'avviso quando serve.

              «Passate e mai segnate» non è un dettaglio contabile: è
              una seduta che forse si è svolta e che nessuno ha
              registrato, oppure che non si è svolta e nessuno l'ha
              detto. In tutti e due i casi è un buco nel registro, e
              dentro un totale sparirebbe. */}
          {!!riepilogo && <Text style={styles.riepilogo}>{riepilogo}</Text>}

          {maiSegnate > 0 && (
            <View style={styles.avviso}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
              <Text style={styles.avvisoTxt}>
                {maiSegnate === 1
                  ? 'Un appuntamento è passato ed è rimasto «in programma»: o si è svolto e non è stato segnato, o è saltato e nessuno l\'ha detto.'
                  : `${maiSegnate} appuntamenti sono passati e sono rimasti «in programma»: o si sono svolti e non sono stati segnati, o sono saltati e nessuno l'ha detto.`}
              </Text>
            </View>
          )}

          {ospite && (
            <Text style={styles.riepilogo}>
              Questa persona non è in anagrafica: qui ci sono le sue consulenze.
            </Text>
          )}

          {/* Upcoming */}
          <Text style={styles.sectionTitle}>Prossimi ({upcoming.length})</Text>
          {upcoming.length === 0 ? (
            <Text style={styles.emptySection}>Nessun appuntamento programmato</Text>
          ) : (
            upcoming.map((item) => (
              <View key={item.id} style={styles.miniCard}>
                <View style={styles.miniCardLeft}>
                  <Ionicons
                    name={aspetto(item.kind).icona as never}
                    size={14}
                    color={TONO[aspetto(item.kind).tonalita]}
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
                    name={aspetto(item.kind).icona as never}
                    size={14}
                    color={TONO[aspetto(item.kind).tonalita]}
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
  riepilogo: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  avviso: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  avvisoTxt: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: 19,
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
