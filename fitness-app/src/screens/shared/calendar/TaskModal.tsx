import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../../config/theme';
import { TaskPriority, DailyTask } from '../../../types';
import { InputField } from '../../../components/common/InputField';
import { ModalHeader } from '../../../components/common/ModalHeader';
import { Button } from '../../../components/common/Button';

const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00',
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: colors.info,
  medium: colors.warning,
  high: colors.error,
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Bassa',
  medium: 'Media',
  high: 'Alta',
};

export interface TaskModalProps {
  visible: boolean;
  editingTask: DailyTask | null;
  taskTitle: string;
  setTaskTitle: (v: string) => void;
  taskDescription: string;
  setTaskDescription: (v: string) => void;
  taskPriority: TaskPriority;
  setTaskPriority: (v: TaskPriority) => void;
  taskStartTime: string;
  setTaskStartTime: (v: string) => void;
  taskEndTime: string;
  setTaskEndTime: (v: string) => void;
  savingTask: boolean;
  onSave: () => void;
  onClose: () => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  visible,
  editingTask,
  taskTitle,
  setTaskTitle,
  taskDescription,
  setTaskDescription,
  taskPriority,
  setTaskPriority,
  taskStartTime,
  setTaskStartTime,
  taskEndTime,
  setTaskEndTime,
  savingTask,
  onSave,
  onClose,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ModalHeader
            title={editingTask ? 'Modifica Task' : 'Nuovo Task'}
            onClose={onClose}
          />
          <ScrollView>
            <InputField
              label="Titolo"
              value={taskTitle}
              onChangeText={setTaskTitle}
              placeholder="Es: Chiamare fornitore"
            />
            <InputField
              label="Descrizione (opzionale)"
              value={taskDescription}
              onChangeText={setTaskDescription}
              placeholder="Dettagli..."
              multiline
              numberOfLines={3}
            />
            <Text style={styles.fieldLabel}>Orario (opzionale)</Text>
            <View style={styles.timePickerRow}>
              <View style={styles.timePickerCol}>
                <Text style={styles.timePickerLabel}>Inizio</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeChipScroll}>
                  <View style={styles.timeChipRow}>
                    {TIME_SLOTS.map((t) => (
                      <TouchableOpacity
                        key={`start-${t}`}
                        style={{
                          ...styles.timeChip,
                          ...(taskStartTime === t ? styles.timeChipActive : {}),
                        }}
                        onPress={() => {
                          setTaskStartTime(taskStartTime === t ? '' : t);
                          if (!taskEndTime && taskStartTime !== t) {
                            const idx = TIME_SLOTS.indexOf(t);
                            if (idx < TIME_SLOTS.length - 1) setTaskEndTime(TIME_SLOTS[idx + 1]);
                          }
                        }}
                      >
                        <Text style={{
                          ...styles.timeChipText,
                          ...(taskStartTime === t ? styles.timeChipTextActive : {}),
                        }}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
              {taskStartTime ? (
                <View style={styles.timePickerCol}>
                  <Text style={styles.timePickerLabel}>Fine</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeChipScroll}>
                    <View style={styles.timeChipRow}>
                      {TIME_SLOTS.filter((t) => t > taskStartTime).map((t) => (
                        <TouchableOpacity
                          key={`end-${t}`}
                          style={{
                            ...styles.timeChip,
                            ...(taskEndTime === t ? styles.timeChipActive : {}),
                          }}
                          onPress={() => setTaskEndTime(taskEndTime === t ? '' : t)}
                        >
                          <Text style={{
                            ...styles.timeChipText,
                            ...(taskEndTime === t ? styles.timeChipTextActive : {}),
                          }}>{t}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              ) : null}
            </View>

            <Text style={styles.fieldLabel}>Priorità</Text>
            <View style={styles.priorityRow}>
              {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={{
                    ...styles.priorityChip,
                    ...(taskPriority === p ? {
                      backgroundColor: PRIORITY_COLORS[p] + '20',
                      borderColor: PRIORITY_COLORS[p],
                    } : {}),
                  }}
                  onPress={() => setTaskPriority(p)}
                >
                  <View style={{ ...styles.priorityDot, backgroundColor: PRIORITY_COLORS[p] }} />
                  <Text style={{
                    ...styles.priorityChipText,
                    ...(taskPriority === p ? { color: PRIORITY_COLORS[p] } : {}),
                  }}>
                    {PRIORITY_LABELS[p]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <Button
                title="Annulla"
                onPress={onClose}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title={savingTask ? 'Salvataggio...' : editingTask ? 'Aggiorna' : 'Crea'}
                onPress={onSave}
                style={styles.modalButton}
                loading={savingTask}
              />
            </View>
            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
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
  fieldLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  timePickerRow: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  timePickerCol: {
    gap: spacing.xs,
  },
  timePickerLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  timeChipScroll: {
    maxHeight: 40,
  },
  timeChipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  timeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  timeChipActive: {
    backgroundColor: colors.accent + '20',
    borderColor: colors.accent,
  },
  timeChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  timeChipTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  priorityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityChipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalButton: { flex: 1 },
});
