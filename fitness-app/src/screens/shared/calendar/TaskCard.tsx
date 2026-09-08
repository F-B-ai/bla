import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../../config/theme';
import { DailyTask, TaskPriority } from '../../../types';

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

export interface TaskCardProps {
  task: DailyTask;
  onToggle: (task: DailyTask) => void;
  onEdit: (task: DailyTask) => void;
  onDelete: (task: DailyTask) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onToggle, onEdit, onDelete }) => {
  const priorityColor = PRIORITY_COLORS[task.priority];
  return (
    <View style={{
      ...styles.taskCard,
      ...(task.isCompleted ? styles.taskCardCompleted : {}),
      borderLeftColor: priorityColor,
    }}>
      <TouchableOpacity
        style={styles.taskCheckbox}
        onPress={() => onToggle(task)}
      >
        <Ionicons
          name={task.isCompleted ? 'checkbox' : 'square-outline'}
          size={22}
          color={task.isCompleted ? colors.success : colors.textSecondary}
        />
      </TouchableOpacity>
      <View style={styles.taskContent}>
        <Text style={{
          ...styles.taskTitle,
          ...(task.isCompleted ? styles.taskTitleDone : {}),
        }}>{task.title}</Text>
        {task.description ? (
          <Text style={styles.taskDesc} numberOfLines={2}>{task.description}</Text>
        ) : null}
        <View style={styles.taskMeta}>
          {task.startTime ? (
            <View style={styles.taskTimeBadge}>
              <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.taskTimeText}>
                {task.startTime}{task.endTime ? ` - ${task.endTime}` : ''}
              </Text>
            </View>
          ) : null}
          <View style={{ ...styles.priorityBadge, backgroundColor: priorityColor + '20' }}>
            <Text style={{ ...styles.priorityText, color: priorityColor }}>
              {PRIORITY_LABELS[task.priority]}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.taskActions}>
        <TouchableOpacity onPress={() => onEdit(task)} style={styles.taskActionBtn}>
          <Ionicons name="create-outline" size={16} color={colors.info} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(task)} style={styles.taskActionBtn}>
          <Ionicons name="trash-outline" size={16} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  taskCardCompleted: {
    opacity: 0.6,
  },
  taskCheckbox: {
    marginRight: spacing.sm,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  taskDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  priorityText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  taskActions: {
    flexDirection: 'column',
    gap: spacing.xs,
  },
  taskActionBtn: {
    padding: 4,
  },
  taskTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
  },
  taskTimeText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
