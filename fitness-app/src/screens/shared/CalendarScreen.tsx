import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { crossAlert } from '../../utils/alert';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { ModalHeader } from '../../components/common/ModalHeader';
import { Badge } from '../../components/common/Badge';
import { StudentSearchPicker } from '../../components/common/StudentSearchPicker';
import {
  TrainingSession,
  NutritionistAppointment,
  Student,
  Collaborator,
} from '../../types';
import { useAuth } from '../../hooks/useAuth';
import {
  createSession,
  getAllSessions,
  getCollaboratorSessions,
  updateSessionStatus,
  updateSession,
  cancelSession,
  deleteSession,
} from '../../services/sessionService';
import {
  createAppointment,
  getAllAppointments,
  getNutritionistAppointmentsByStaff,
  updateAppointmentStatus,
  updateAppointment,
  cancelAppointment,
  deleteAppointment,
} from '../../services/nutritionistService';
import { getStudents, getCollaborators } from '../../services/authService';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];
const TIME_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00',
];

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

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();

const getFirstWeekday = (year: number, month: number) => {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
};

const buildCalendarGrid = (year: number, month: number): (number | null)[][] => {
  const total = getDaysInMonth(year, month);
  const first = getFirstWeekday(year, month);
  const grid: (number | null)[][] = [];
  let day = 1;
  for (let row = 0; row < 6; row++) {
    const week: (number | null)[] = [];
    for (let col = 0; col < 7; col++) {
      if (row === 0 && col < first) week.push(null);
      else if (day > total) week.push(null);
      else week.push(day++);
    }
    grid.push(week);
    if (day > total) break;
  }
  return grid;
};

export const CalendarScreen: React.FC = () => {
  const { user, isOwner, isManager, isCollaborator } = useAuth();
  const canSeeAll = isOwner || isManager;

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState(toDateStr(now));

  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [nutritionAppts, setNutritionAppts] = useState<NutritionistAppointment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AppointmentItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [formKind, setFormKind] = useState<AppointmentKind>('training');
  const [formStudentId, setFormStudentId] = useState('');
  const [formCollabId, setFormCollabId] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formCost, setFormCost] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Student detail modal
  const [studentDetailId, setStudentDetailId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [studs, collabs] = await Promise.all([
        getStudents(),
        canSeeAll ? getCollaborators() : Promise.resolve([]),
      ]);

      if (isCollaborator) {
        setStudents(studs.filter((s) => s.assignedCollaboratorId === user.id));
      } else if (isManager) {
        setStudents(studs);
      } else {
        setStudents(studs);
      }
      setCollaborators(collabs);

      const [trainingSessions, nutrAppts] = await Promise.all([
        canSeeAll ? getAllSessions() : getCollaboratorSessions(user.id),
        canSeeAll
          ? getAllAppointments()
          : getNutritionistAppointmentsByStaff(user.id),
      ]);
      setSessions(trainingSessions);
      setNutritionAppts(nutrAppts);
    } catch (err) {
      console.error('Errore caricamento calendario:', err);
      crossAlert('Errore', 'Impossibile caricare i dati.');
    }
  }, [user, canSeeAll, isCollaborator, isManager]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Unified appointments
  const allAppointments = useMemo(() => {
    const items: AppointmentItem[] = [];
    sessions.forEach((s) => {
      const d = new Date(s.date as unknown as string);
      items.push({
        id: s.id, kind: 'training', studentId: s.studentId, staffId: s.collaboratorId,
        date: d, dateStr: toDateStr(d), startTime: s.startTime, endTime: s.endTime,
        status: s.status, notes: s.notes, sessionCost: s.sessionCost,
        isCountedAsCompleted: s.isCountedAsCompleted,
      });
    });
    nutritionAppts.forEach((a) => {
      const d = new Date(a.date as unknown as string);
      items.push({
        id: a.id, kind: 'nutrition', studentId: a.studentId,
        staffId: a.nutritionistId || a.nutritionManagerId || '',
        date: d, dateStr: toDateStr(d), startTime: a.startTime, endTime: a.endTime,
        status: a.status, notes: a.notes, sessionCost: a.sessionCost,
        isCountedAsCompleted: a.isCountedAsCompleted,
      });
    });
    items.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return items;
  }, [sessions, nutritionAppts]);

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, AppointmentItem[]> = {};
    allAppointments.forEach((item) => {
      if (!map[item.dateStr]) map[item.dateStr] = [];
      map[item.dateStr].push(item);
    });
    return map;
  }, [allAppointments]);

  const selectedDayItems = appointmentsByDate[selectedDate] || [];

  // Calendar grid
  const calendarGrid = useMemo(
    () => buildCalendarGrid(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  };

  // Helpers
  const getStudentName = (id: string) => {
    const s = students.find((st) => st.id === id);
    return s ? `${s.name} ${s.surname}` : 'Allievo';
  };
  const getStaffName = (id: string) => {
    if (id === user?.id) return `${user.name} ${user.surname}`;
    const c = collaborators.find((co) => co.id === id);
    return c ? `${c.name} ${c.surname}` : '';
  };

  const calcEarnings = (cost: number, studentId: string, staffId: string) => {
    const student = students.find((s) => s.id === studentId);
    const collab = collaborators.find((c) => c.id === staffId);
    const coachPct = student?.coachCommissionPercentage ?? collab?.commissionPercentage ?? 60;
    const managerPct = student?.managerCommissionPercentage ?? 0;
    const coachEarning = Math.round(cost * coachPct / 100);
    const managerEarning = Math.round(cost * managerPct / 100);
    const ownerEarning = cost - coachEarning - managerEarning;
    return { coachEarning, managerEarning, ownerEarning, coachPct, managerPct };
  };

  // Form
  const resetForm = () => {
    setFormKind('training');
    setFormStudentId('');
    setFormCollabId('');
    setFormDate('');
    setFormStartTime('09:00');
    setFormEndTime('10:00');
    setFormCost('');
    setFormNotes('');
    setEditingItem(null);
  };

  const openCreate = () => {
    resetForm();
    setFormDate(selectedDate);
    setShowModal(true);
  };

  const openEdit = (item: AppointmentItem) => {
    setEditingItem(item);
    setFormKind(item.kind);
    setFormStudentId(item.studentId);
    setFormCollabId(item.staffId);
    setFormDate(item.dateStr);
    setFormStartTime(item.startTime);
    setFormEndTime(item.endTime);
    setFormCost(item.sessionCost ? String(item.sessionCost) : '');
    setFormNotes(item.notes);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formStudentId || !formDate || !user) {
      crossAlert('Errore', 'Seleziona allievo e data');
      return;
    }
    const staffId = canSeeAll ? (formCollabId || user.id) : user.id;
    const cost = formCost ? parseFloat(formCost) : undefined;

    setSaving(true);
    try {
      if (editingItem) {
        if (editingItem.kind === 'training') {
          await updateSession(editingItem.id, {
            studentId: formStudentId,
            collaboratorId: staffId,
            date: new Date(formDate),
            startTime: formStartTime,
            endTime: formEndTime,
            notes: formNotes,
            sessionCost: cost,
          });
        } else {
          await updateAppointment(editingItem.id, {
            studentId: formStudentId,
            nutritionistId: staffId,
            date: new Date(formDate),
            startTime: formStartTime,
            endTime: formEndTime,
            notes: formNotes,
            sessionCost: cost,
          });
        }
        crossAlert('Successo', 'Appuntamento aggiornato!');
      } else {
        if (formKind === 'training') {
          await createSession({
            studentId: formStudentId,
            collaboratorId: staffId,
            date: new Date(formDate),
            startTime: formStartTime,
            endTime: formEndTime,
            status: 'scheduled',
            notes: formNotes,
            sessionCost: cost,
            isCountedAsCompleted: false,
          });
        } else {
          await createAppointment({
            studentId: formStudentId,
            nutritionistId: staffId,
            date: new Date(formDate),
            startTime: formStartTime,
            endTime: formEndTime,
            status: 'scheduled',
            notes: formNotes,
            sessionCost: cost,
            isCountedAsCompleted: false,
            createdAt: new Date(),
          });
        }
        crossAlert('Successo', 'Appuntamento creato!');
      }
      resetForm();
      setShowModal(false);
      loadData();
    } catch {
      crossAlert('Errore', 'Impossibile salvare');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = (item: AppointmentItem) => {
    crossAlert('Conferma', 'Segna come completato?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Completato',
        onPress: async () => {
          try {
            if (item.kind === 'training') await updateSessionStatus(item.id, 'completed');
            else await updateAppointmentStatus(item.id, 'completed');
            loadData();
          } catch { crossAlert('Errore', 'Impossibile aggiornare'); }
        },
      },
    ]);
  };

  const handleCancel = (item: AppointmentItem) => {
    crossAlert('Conferma', 'Annullare questo appuntamento?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Annulla appuntamento',
        style: 'destructive',
        onPress: async () => {
          try {
            if (item.kind === 'training') {
              await cancelSession(item.id, item.date);
            } else {
              await cancelAppointment(item.id, item.date);
            }
            loadData();
          } catch { crossAlert('Errore', 'Impossibile annullare'); }
        },
      },
    ]);
  };

  const handleDelete = (item: AppointmentItem) => {
    crossAlert('Conferma', 'Eliminare definitivamente?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          try {
            if (item.kind === 'training') await deleteSession(item.id);
            else await deleteAppointment(item.id);
            loadData();
          } catch { crossAlert('Errore', 'Impossibile eliminare'); }
        },
      },
    ]);
  };

  // Next 30 days for date picker
  const nextDays = useMemo(() => {
    const days: { label: string; value: string }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push({
        value: toDateStr(d),
        label: d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }),
      });
    }
    return days;
  }, []);

  // Student detail
  const studentDetailItems = useMemo(() => {
    if (!studentDetailId) return { upcoming: [], past: [], stats: { total: 0, completed: 0, cancelled: 0, remaining: 0 } };
    const items = allAppointments.filter((a) => a.studentId === studentDetailId);
    const nowStr = toDateStr(new Date());
    const upcoming = items
      .filter((a) => a.dateStr >= nowStr && a.status === 'scheduled')
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    const past = items
      .filter((a) => a.dateStr < nowStr || a.status !== 'scheduled')
      .sort((a, b) => b.dateStr.localeCompare(a.dateStr));
    const completed = items.filter((a) => a.isCountedAsCompleted || a.status === 'completed').length;
    const cancelled = items.filter((a) => a.status.startsWith('cancelled')).length;
    return {
      upcoming, past,
      stats: { total: items.length, completed, cancelled, remaining: upcoming.length },
    };
  }, [studentDetailId, allAppointments]);

  const todayStr = toDateStr(now);

  // Render calendar cell
  const renderDayCell = (day: number | null, colIdx: number) => {
    if (day === null) return <View key={`empty-${colIdx}`} style={styles.dayCell} />;
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isSelected = dateStr === selectedDate;
    const isToday = dateStr === todayStr;
    const dayItems = appointmentsByDate[dateStr] || [];
    const hasTraining = dayItems.some((a) => a.kind === 'training');
    const hasNutrition = dayItems.some((a) => a.kind === 'nutrition');

    return (
      <TouchableOpacity
        key={day}
        style={[styles.dayCell, isToday && styles.dayCellToday, isSelected && styles.dayCellSelected]}
        onPress={() => setSelectedDate(dateStr)}
      >
        <Text style={[styles.dayText, isToday && styles.dayTextToday, isSelected && styles.dayTextSelected]}>
          {day}
        </Text>
        <View style={styles.dotRow}>
          {hasTraining && <View style={[styles.calDot, { backgroundColor: colors.accent }]} />}
          {hasNutrition && <View style={[styles.calDot, { backgroundColor: colors.success }]} />}
        </View>
      </TouchableOpacity>
    );
  };

  // Render appointment card
  const renderAppointmentCard = (item: AppointmentItem) => {
    const isScheduled = item.status === 'scheduled';
    const isFuture = item.date >= new Date();
    const canAct = isScheduled && isFuture;
    const staffName = getStaffName(item.staffId);

    return (
      <Card key={item.id} variant="elevated">
        <View style={styles.cardHeader}>
          <View style={styles.kindBadge}>
            <Ionicons
              name={item.kind === 'training' ? 'barbell' : 'nutrition'}
              size={14}
              color={item.kind === 'training' ? colors.accent : colors.success}
            />
            <Text style={[styles.kindText, { color: item.kind === 'training' ? colors.accent : colors.success }]}>
              {item.kind === 'training' ? 'Training' : 'Nutrizione'}
            </Text>
          </View>
          <Badge status={item.status} />
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardTime}>{item.startTime} - {item.endTime}</Text>
          <TouchableOpacity onPress={() => setStudentDetailId(item.studentId)}>
            <Text style={styles.cardStudent}>{getStudentName(item.studentId)}</Text>
          </TouchableOpacity>
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

        {/* Actions */}
        {canAct && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}>
              <Ionicons name="create-outline" size={18} color={colors.info} />
              <Text style={[styles.actionText, { color: colors.info }]}>Modifica</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleComplete(item)}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
              <Text style={[styles.actionText, { color: colors.success }]}>Completato</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleCancel(item)}>
              <Ionicons name="close-circle-outline" size={18} color={colors.warning} />
              <Text style={[styles.actionText, { color: colors.warning }]}>Annulla</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  const selectedDateObj = new Date(selectedDate + 'T00:00:00');
  const selectedDateLabel = selectedDateObj.toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={selectedDayItems}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Calendario</Text>
              <Text style={styles.subtitle}>
                {allAppointments.length} appuntamenti totali
              </Text>
            </View>

            {/* Month nav */}
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}>
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>{MONTHS[currentMonth]} {currentYear}</Text>
              <TouchableOpacity onPress={nextMonth} style={styles.monthArrow}>
                <Ionicons name="chevron-forward" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Weekday headers */}
            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((d) => (
                <Text key={d} style={styles.weekdayText}>{d}</Text>
              ))}
            </View>

            {/* Calendar grid */}
            {calendarGrid.map((week, rowIdx) => (
              <View key={rowIdx} style={styles.weekRow}>
                {week.map((day, colIdx) => renderDayCell(day, colIdx))}
              </View>
            ))}

            {/* Legend */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.calDot, { backgroundColor: colors.accent }]} />
                <Text style={styles.legendText}>Training</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.calDot, { backgroundColor: colors.success }]} />
                <Text style={styles.legendText}>Nutrizione</Text>
              </View>
            </View>

            {/* Selected day header */}
            <View style={styles.dayHeader}>
              <Text style={styles.dayHeaderText}>{selectedDateLabel}</Text>
              <Text style={styles.dayHeaderCount}>
                {selectedDayItems.length} appuntament{selectedDayItems.length === 1 ? 'o' : 'i'}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => renderAppointmentCard(item)}
        ListEmptyComponent={
          <Card>
            <Text style={styles.emptyText}>Nessun appuntamento in questa data.</Text>
          </Card>
        }
        ListFooterComponent={
          <View style={styles.footerSpacer}>
            <Button title="+ Nuovo Appuntamento" onPress={openCreate} />
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Create/Edit modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <ModalHeader
              title={editingItem ? 'Modifica Appuntamento' : 'Nuovo Appuntamento'}
              onClose={() => { setShowModal(false); resetForm(); }}
            />

            {/* Type */}
            {!editingItem && (
              <>
                <Text style={styles.fieldLabel}>Tipo</Text>
                <View style={styles.typeRow}>
                  <TouchableOpacity
                    style={[styles.typeChip, formKind === 'training' && styles.typeChipActive]}
                    onPress={() => setFormKind('training')}
                  >
                    <Ionicons name="barbell" size={16} color={formKind === 'training' ? colors.accent : colors.textSecondary} />
                    <Text style={[styles.typeChipText, formKind === 'training' && { color: colors.accent }]}>Training</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeChip, formKind === 'nutrition' && styles.typeChipActiveGreen]}
                    onPress={() => setFormKind('nutrition')}
                  >
                    <Ionicons name="nutrition" size={16} color={formKind === 'nutrition' ? colors.success : colors.textSecondary} />
                    <Text style={[styles.typeChipText, formKind === 'nutrition' && { color: colors.success }]}>Nutrizione</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Student */}
            <StudentSearchPicker
              students={students}
              selectedId={formStudentId}
              onSelect={(id) => setFormStudentId(id)}
              label="Allievo"
            />

            {/* Staff picker (owner/manager only) */}
            {canSeeAll && (
              <>
                <Text style={styles.fieldLabel}>
                  {formKind === 'training' ? 'Collaboratore' : 'Nutrizionista'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {collaborators.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.chip, formCollabId === c.id && styles.chipActive]}
                        onPress={() => setFormCollabId(c.id)}
                      >
                        <Text style={[styles.chipText, formCollabId === c.id && styles.chipTextActive]}>
                          {c.name} {c.surname}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            {/* Date */}
            <Text style={styles.fieldLabel}>Data</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {nextDays.map((d) => (
                  <TouchableOpacity
                    key={d.value}
                    style={[styles.dateChip, formDate === d.value && styles.chipActive]}
                    onPress={() => setFormDate(d.value)}
                  >
                    <Text style={[styles.chipText, formDate === d.value && styles.chipTextActive]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Time */}
            <View style={styles.timeSection}>
              <View style={styles.timeField}>
                <Text style={styles.fieldLabel}>Inizio</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {TIME_SLOTS.map((t) => (
                      <TouchableOpacity
                        key={`s-${t}`}
                        style={[styles.timeChip, formStartTime === t && styles.chipActive]}
                        onPress={() => setFormStartTime(t)}
                      >
                        <Text style={[styles.chipText, formStartTime === t && styles.chipTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
              <View style={styles.timeField}>
                <Text style={styles.fieldLabel}>Fine</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {TIME_SLOTS.map((t) => (
                      <TouchableOpacity
                        key={`e-${t}`}
                        style={[styles.timeChip, formEndTime === t && styles.chipActive]}
                        onPress={() => setFormEndTime(t)}
                      >
                        <Text style={[styles.chipText, formEndTime === t && styles.chipTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            {/* Cost */}
            {(isOwner || isManager) && (
              <InputField
                label="Costo sessione (€)"
                value={formCost}
                onChangeText={setFormCost}
                placeholder="0"
                keyboardType="numeric"
              />
            )}

            <InputField
              label="Note (opzionale)"
              value={formNotes}
              onChangeText={setFormNotes}
              placeholder="Note..."
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Annulla"
                onPress={() => { setShowModal(false); resetForm(); }}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title={saving ? 'Salvataggio...' : editingItem ? 'Aggiorna' : 'Crea'}
                onPress={handleSave}
                style={styles.modalButton}
                loading={saving}
              />
            </View>
            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Student detail modal */}
      <Modal visible={studentDetailId !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <ModalHeader
              title={`Appuntamenti - ${studentDetailId ? getStudentName(studentDetailId) : ''}`}
              onClose={() => setStudentDetailId(null)}
            />

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{studentDetailItems.stats.total}</Text>
                <Text style={styles.statLabel}>Totali</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: colors.success }]}>{studentDetailItems.stats.completed}</Text>
                <Text style={styles.statLabel}>Completati</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: colors.error }]}>{studentDetailItems.stats.cancelled}</Text>
                <Text style={styles.statLabel}>Annullati</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: colors.info }]}>{studentDetailItems.stats.remaining}</Text>
                <Text style={styles.statLabel}>Rimanenti</Text>
              </View>
            </View>

            {/* Upcoming */}
            <Text style={styles.sectionTitle}>Prossimi ({studentDetailItems.upcoming.length})</Text>
            {studentDetailItems.upcoming.length === 0 ? (
              <Text style={styles.emptySection}>Nessun appuntamento programmato</Text>
            ) : (
              studentDetailItems.upcoming.map((item) => (
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
            <Text style={styles.sectionTitle}>Storico ({studentDetailItems.past.length})</Text>
            {studentDetailItems.past.length === 0 ? (
              <Text style={styles.emptySection}>Nessuno storico</Text>
            ) : (
              studentDetailItems.past.map((item) => (
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingBottom: spacing.xxl },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textOnPrimary },
  subtitle: { fontSize: fontSize.md, color: colors.textLight, marginTop: spacing.xs },

  // Month navigation
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  monthArrow: { padding: spacing.sm },
  monthLabel: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },

  // Calendar grid
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    paddingBottom: spacing.xs,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textLight,
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    minHeight: 40,
  },
  dayCellToday: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
  },
  dayCellSelected: {
    backgroundColor: colors.accent + '30',
    borderRadius: borderRadius.md,
  },
  dayText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  dayTextToday: { color: colors.accent, fontWeight: '700' },
  dayTextSelected: { color: colors.accent, fontWeight: '700' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2, height: 6 },
  calDot: { width: 5, height: 5, borderRadius: 3 },

  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { fontSize: fontSize.xs, color: colors.textLight },

  // Day header
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dayHeaderText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  dayHeaderCount: { fontSize: fontSize.sm, color: colors.textSecondary },

  // Card
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  kindBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kindText: { fontSize: fontSize.xs, fontWeight: '700' },
  cardBody: { gap: 2 },
  cardTime: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  cardStudent: {
    fontSize: fontSize.md,
    color: colors.accent,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  cardStaff: { fontSize: fontSize.sm, color: colors.textSecondary },
  cardNotes: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },

  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  earningsCost: { fontSize: fontSize.lg, fontWeight: '700', color: colors.success },
  earningsDetail: { fontSize: fontSize.xs, color: colors.textSecondary },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: spacing.xs },
  actionText: { fontSize: fontSize.xs, fontWeight: '600' },

  emptyText: { color: colors.textSecondary, textAlign: 'center', padding: spacing.lg },

  footerSpacer: { padding: spacing.md, paddingBottom: spacing.xxl },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
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
  typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  typeChip: {
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
  typeChipActive: { borderColor: colors.accent, backgroundColor: colors.accent + '15' },
  typeChipActiveGreen: { borderColor: colors.success, backgroundColor: colors.success + '15' },
  typeChipText: { fontSize: fontSize.md, fontWeight: '600', color: colors.textSecondary },

  chipRow: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: colors.textOnAccent },
  dateChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  timeSection: { gap: spacing.sm },
  timeField: {},
  timeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  modalButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalButton: { flex: 1 },

  // Student detail modal
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
