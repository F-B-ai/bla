import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../config/theme';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';

type AppointmentKind = 'training' | 'nutrition';

export type AppointmentItem = {
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

export interface AppointmentCardProps {
  item: AppointmentItem;
  isStaff: boolean;
  isOwner: boolean;
  isStudent: boolean;
  getStudentName: (id: string) => string;
  getStaffName: (id: string) => string;
  calcEarnings: (cost: number, studentId: string, staffId: string) => {
    coachEarning: number;
    managerEarning: number;
    ownerEarning: number;
    coachPct: number;
    managerPct: number;
  };
  onEdit: (item: AppointmentItem) => void;
  onComplete: (item: AppointmentItem) => void;
  onCancel: (item: AppointmentItem) => void;
  onDelete: (item: AppointmentItem) => void;
  onStudentDetail: (studentId: string) => void;
  styles: Record<string, any>;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  item,
  isStaff,
  isOwner,
  isStudent,
  getStudentName,
  getStaffName,
  calcEarnings,
  onEdit,
  onComplete,
  onCancel,
  onDelete,
  onStudentDetail,
  styles,
}) => {
  const isScheduled = item.status === 'scheduled';
  const isFuture = item.date >= new Date();
  const canStudentCancel = isScheduled && isFuture;
  const canStaffAct = isScheduled;
  const staffName = getStaffName(item.staffId);

  return (
    <Card variant="elevated">
      <View style={styles.cardHeader}>
        <View style={styles.kindBadge}>
          <Ionicons
            name={item.kind === 'training' ? 'barbell' : 'nutrition'}
            size={14}
            color={item.kind === 'training' ? colors.accent : colors.success}
          />
          <Text style={{ ...styles.kindText, color: item.kind === 'training' ? colors.accent : colors.success }}>
            {item.kind === 'training' ? 'Training' : 'Nutrizione'}
          </Text>
        </View>
        <Badge status={item.status} />
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTime}>{item.startTime} - {item.endTime}</Text>
        {isStaff ? (
          <TouchableOpacity onPress={() => onStudentDetail(item.studentId)}>
            <Text style={styles.cardStudent}>{getStudentName(item.studentId)}</Text>
          </TouchableOpacity>
        ) : null}
        {staffName ? <Text style={styles.cardStaff}>{staffName}</Text> : null}
        {item.notes ? <Text style={styles.cardNotes}>{item.notes}</Text> : null}
      </View>

      {/* Owner earnings */}
      {isOwner && item.sessionCost != null && item.sessionCost > 0 && (
        <View style={styles.earningsRow}>
          <Text style={styles.earningsCost}>{'€'}{item.sessionCost}</Text>
          {(() => {
            const e = calcEarnings(item.sessionCost!, item.studentId, item.staffId);
            return (
              <Text style={styles.earningsDetail}>
                Staff: {'€'}{e.coachEarning}{e.managerEarning > 0 ? ` | Mgr: €${e.managerEarning}` : ''} | Tuo: {'€'}{e.ownerEarning}
              </Text>
            );
          })()}
        </View>
      )}

      {/* Staff actions */}
      {isStaff && (
        <View style={styles.actionRow}>
          {canStaffAct && (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(item)}>
                <Ionicons name="create-outline" size={18} color={colors.info} />
                <Text style={{ ...styles.actionText, color: colors.info }}>Modifica</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => onComplete(item)}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                <Text style={{ ...styles.actionText, color: colors.success }}>Completato</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => onCancel(item)}>
                <Ionicons name="close-circle-outline" size={18} color={colors.warning} />
                <Text style={{ ...styles.actionText, color: colors.warning }}>Annulla</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(item)}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      )}
      {canStudentCancel && isStudent && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onCancel(item)}>
            <Ionicons name="close-circle-outline" size={18} color={colors.error} />
            <Text style={{ ...styles.actionText, color: colors.error }}>Annulla Sessione</Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );
};
