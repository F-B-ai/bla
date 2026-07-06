import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { crossAlert } from '../../utils/alert';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  TrainingSession,
  NutritionistAppointment,
  Student,
  Collaborator,
  Manager,
  DailyTask,
  TaskPriority,
} from '../../types';
import { useAuth } from '../../hooks/useAuth';
import {
  createSession,
  getAllSessions,
  getCollaboratorSessions,
  getStudentSessions,
  updateSessionStatus,
  updateSession,
  cancelSession,
  deleteSession,
} from '../../services/sessionService';
import {
  createAppointment,
  getAllAppointments,
  getNutritionistAppointmentsByStaff,
  getStudentAppointments,
  updateAppointmentStatus,
  updateAppointment,
  cancelAppointment,
  deleteAppointment,
} from '../../services/nutritionistService';
import { getStudents, getCollaborators, getManagers, getOwner } from '../../services/authService';
import { isStudentAssignedTo } from '../../utils/helpers';
import {
  createTask,
  getTasksByOwner,
  toggleTaskComplete,
  updateTask,
  deleteTask,
} from '../../services/taskService';
import {
  getActiveStudentPlan,
  decrementPlanLesson,
  decrementPlanConsultation,
} from '../../services/paymentService';
import { createNotification } from '../../services/notificationService';
import { addTransaction } from '../../services/financialService';
import { TaskCard } from './calendar/TaskCard';
import { AppointmentCard } from './calendar/AppointmentCard';
import { TaskModal } from './calendar/TaskModal';
import { AppointmentModal } from './calendar/AppointmentModal';
import { StudentDetailModal } from './calendar/StudentDetailModal';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];
const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00',
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

const toSafeDate = (d: unknown): Date => {
  if (d instanceof Date) return d;
  if (d && typeof d === 'object' && 'toDate' in d && typeof (d as any).toDate === 'function')
    return (d as any).toDate();
  if (d && typeof d === 'object' && 'seconds' in d)
    return new Date((d as any).seconds * 1000);
  return new Date(d as string);
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

export const CalendarScreen: React.FC = () => {
  const { user, isOwner, isManager, isCollaborator, isStudent } = useAuth();
  const insets = useSafeAreaInsets();
  const canSeeAll = isOwner;
  const isStaff = isOwner || isManager || isCollaborator;

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState(toDateStr(now));

  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [nutritionAppts, setNutritionAppts] = useState<NutritionistAppointment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Staff filter (owner only)
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // Create/Edit appointment modal
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
  const [formCustomDate, setFormCustomDate] = useState('');

  // Task modal (owner only)
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [savingTask, setSavingTask] = useState(false);

  // Student detail modal
  const [studentDetailId, setStudentDetailId] = useState<string | null>(null);

  // Ricerca appuntamenti per nome allievo
  const [searchName, setSearchName] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchDetail, setSearchDetail] = useState<{
    studentName: string;
    upcoming: AppointmentItem[];
    past: AppointmentItem[];
    stats: { total: number; completed: number; cancelled: number; remaining: number };
  } | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<'agenda' | 'calendar' | 'timeline'>('agenda');

  // Task time fields
  const [taskStartTime, setTaskStartTime] = useState('');
  const [taskEndTime, setTaskEndTime] = useState('');

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      if (isStudent) {
        const [trainingSessions, nutrAppts] = await Promise.all([
          getStudentSessions(user.id).catch(() => []),
          getStudentAppointments(user.id).catch(() => []),
        ]);
        setSessions(trainingSessions);
        setNutritionAppts(nutrAppts);
        setStudents([]);
        setCollaborators([]);
        return;
      }

      const [studs, collabs, mgrs] = await Promise.all([
        getStudents(),
        canSeeAll ? getCollaborators() : Promise.resolve([]),
        canSeeAll ? getManagers() : Promise.resolve([]),
      ]);

      if (isCollaborator) {
        setStudents(studs.filter((s) => isStudentAssignedTo(s, user.id)));
      } else if (isManager) {
        setStudents(studs.filter((s) => isStudentAssignedTo(s, user.id) || s.assignedManagerId === user.id));
      } else {
        setStudents(studs);
      }
      setCollaborators(collabs);
      setManagers(mgrs);

      const [trainingSessions, nutrAppts] = await Promise.all([
        canSeeAll ? getAllSessions() : getCollaboratorSessions(user.id),
        (canSeeAll
          ? getAllAppointments()
          : getNutritionistAppointmentsByStaff(user.id)
        ).catch(() => []),
      ]);
      setSessions(trainingSessions);
      setNutritionAppts(nutrAppts);

      if (isOwner) {
        const ownerTasks = await getTasksByOwner(user.id).catch(() => []);
        setTasks(ownerTasks);
      }
    } catch (err) {
      console.error('Errore caricamento calendario:', err);
      crossAlert('Errore', 'Impossibile caricare i dati.');
    }
  }, [user, canSeeAll, isCollaborator, isManager, isStudent, isOwner]);

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
      const d = toSafeDate(s.date);
      items.push({
        id: s.id, kind: 'training', studentId: s.studentId, staffId: s.collaboratorId,
        date: d, dateStr: toDateStr(d), startTime: s.startTime, endTime: s.endTime,
        status: s.status, notes: s.notes, sessionCost: s.sessionCost,
        isCountedAsCompleted: s.isCountedAsCompleted,
      });
    });
    nutritionAppts.forEach((a) => {
      const d = toSafeDate(a.date);
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

  const filteredAppointments = useMemo(() => {
    if (!canSeeAll || !selectedStaffId) return allAppointments;
    return allAppointments.filter((a) => a.staffId === selectedStaffId);
  }, [allAppointments, selectedStaffId, canSeeAll]);

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, AppointmentItem[]> = {};
    filteredAppointments.forEach((item) => {
      if (!map[item.dateStr]) map[item.dateStr] = [];
      map[item.dateStr].push(item);
    });
    return map;
  }, [filteredAppointments]);

  const selectedDayItems = appointmentsByDate[selectedDate] || [];

  // Tasks grouped by date
  const tasksByDate = useMemo(() => {
    const map: Record<string, DailyTask[]> = {};
    tasks.forEach((t) => {
      const d = toSafeDate(t.date);
      const ds = toDateStr(d);
      if (!map[ds]) map[ds] = [];
      map[ds].push(t);
    });
    return map;
  }, [tasks]);

  const selectedDayTasks = tasksByDate[selectedDate] || [];

  const staffList = useMemo(() => {
    if (!canSeeAll) return [];
    const list: { id: string; name: string; role: string }[] = [];
    if (user) list.push({ id: user.id, name: `${user.name} ${user.surname}`, role: 'Owner' });
    managers.forEach((m) => {
      list.push({ id: m.id, name: `${m.name} ${m.surname}`, role: 'Manager' });
    });
    collaborators.forEach((c) => {
      const type = c.collaboratorType === 'nutritionist' ? 'Nutrizionista' : 'Coach';
      list.push({ id: c.id, name: `${c.name} ${c.surname}`, role: type });
    });
    return list;
  }, [canSeeAll, user, collaborators, managers]);

  const getStudentName = (id: string) => {
    const s = students.find((st) => st.id === id);
    return s ? `${s.name} ${s.surname}` : 'Allievo';
  };

  // Allievi che corrispondono al testo di ricerca
  const matchingStudents = useMemo(() => {
    const q = searchName.trim().toLowerCase();
    if (!q) return [];
    return students
      .filter((s) => `${s.name} ${s.surname}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchName, students]);

  // Carica lo storico COMPLETO degli appuntamenti di un allievo e apre il dettaglio
  const openStudentHistory = useCallback(async (studentId: string, studentName: string) => {
    setSearchLoading(true);
    setSearchName('');
    try {
      const [sess, appts] = await Promise.all([
        getStudentSessions(studentId).catch(() => []),
        getStudentAppointments(studentId).catch(() => []),
      ]);
      const items: AppointmentItem[] = [];
      sess.forEach((s) => {
        const d = toSafeDate(s.date);
        items.push({
          id: s.id, kind: 'training', studentId: s.studentId, staffId: s.collaboratorId,
          date: d, dateStr: toDateStr(d), startTime: s.startTime, endTime: s.endTime,
          status: s.status, notes: s.notes, sessionCost: s.sessionCost,
          isCountedAsCompleted: s.isCountedAsCompleted,
        });
      });
      appts.forEach((a) => {
        const d = toSafeDate(a.date);
        items.push({
          id: a.id, kind: 'nutrition', studentId: a.studentId,
          staffId: a.nutritionistId || a.nutritionManagerId || '',
          date: d, dateStr: toDateStr(d), startTime: a.startTime, endTime: a.endTime,
          status: a.status, notes: a.notes, sessionCost: a.sessionCost,
          isCountedAsCompleted: a.isCountedAsCompleted,
        });
      });
      const nowStr = toDateStr(new Date());
      const upcoming = items
        .filter((a) => a.dateStr >= nowStr && a.status === 'scheduled')
        .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
      const past = items
        .filter((a) => a.dateStr < nowStr || a.status !== 'scheduled')
        .sort((a, b) => b.dateStr.localeCompare(a.dateStr));
      const completed = items.filter((a) => a.isCountedAsCompleted || a.status === 'completed').length;
      const cancelled = items.filter((a) => a.status.startsWith('cancelled')).length;
      setSearchDetail({
        studentName,
        upcoming, past,
        stats: { total: items.length, completed, cancelled, remaining: upcoming.length },
      });
    } catch {
      crossAlert('Errore', 'Impossibile caricare gli appuntamenti dell\'allievo.');
    } finally {
      setSearchLoading(false);
    }
  }, []);
  const getStudentPhone = (id: string) => {
    const s = students.find((st) => st.id === id);
    return s?.phone || '';
  };
  const getStaffName = (id: string) => {
    if (id === user?.id) return `${user.name} ${user.surname}`;
    const c = collaborators.find((co) => co.id === id);
    if (c) return `${c.name} ${c.surname}`;
    const m = managers.find((mg) => mg.id === id);
    return m ? `${m.name} ${m.surname}` : '';
  };

  const calcEarnings = (cost: number, studentId: string, staffId: string) => {
    if (staffId === user?.id) {
      return { coachEarning: 0, managerEarning: 0, ownerEarning: cost, coachPct: 0, managerPct: 0 };
    }
    const student = students.find((s) => s.id === studentId);
    const collab = collaborators.find((c) => c.id === staffId);
    const coachPct = student?.coachCommissionPercentage ?? collab?.commissionPercentage ?? 60;
    const managerPct = student?.managerCommissionPercentage ?? 0;
    const coachEarning = Math.round(cost * coachPct / 100);
    const managerEarning = Math.round(cost * managerPct / 100);
    const ownerEarning = cost - coachEarning - managerEarning;
    return { coachEarning, managerEarning, ownerEarning, coachPct, managerPct };
  };

  const staffStats = useMemo(() => {
    if (!isOwner) return [];
    const map: Record<string, { name: string; training: number; nutrition: number }> = {};
    allAppointments.forEach((a) => {
      if (!a.isCountedAsCompleted && a.status !== 'completed') return;
      const id = a.staffId || 'unknown';
      if (!map[id]) map[id] = { name: getStaffName(id) || 'Sconosciuto', training: 0, nutrition: 0 };
      if (a.kind === 'training') map[id].training++;
      else map[id].nutrition++;
    });
    if (user) {
      const myId = user.id;
      if (!map[myId]) map[myId] = { name: `${user.name} ${user.surname}`, training: 0, nutrition: 0 };
    }
    return Object.entries(map)
      .map(([id, data]) => ({ id, ...data, total: data.training + data.nutrition }))
      .sort((a, b) => b.total - a.total);
  }, [isOwner, allAppointments, collaborators, user]);

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

  // Appointment form
  const resetForm = () => {
    setFormKind('training');
    setFormStudentId('');
    setFormCollabId('');
    setFormDate('');
    setFormCustomDate('');
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
        const isPastDate = new Date(formDate) < new Date(toDateStr(new Date()));
        const appointmentStatus = isPastDate ? 'completed' : 'scheduled';
        if (formKind === 'training') {
          await createSession({
            studentId: formStudentId,
            collaboratorId: staffId,
            date: new Date(formDate),
            startTime: formStartTime,
            endTime: formEndTime,
            status: appointmentStatus,
            notes: formNotes,
            sessionCost: cost,
            isCountedAsCompleted: isPastDate,
          });
        } else {
          await createAppointment({
            studentId: formStudentId,
            nutritionistId: staffId,
            date: new Date(formDate),
            startTime: formStartTime,
            endTime: formEndTime,
            status: appointmentStatus,
            notes: formNotes,
            sessionCost: cost,
            isCountedAsCompleted: isPastDate,
            createdAt: new Date(),
          });
        }
        if (isPastDate) {
          await decrementStudentPlan(formStudentId, formKind);
          if (cost && cost > 0) {
            await addTransaction({
              type: 'income',
              category: 'student_payment',
              amount: cost,
              description: `${formKind === 'training' ? 'Sessione' : 'Consulenza'} - ${getStudentName(formStudentId)} (${new Date(formDate).toLocaleDateString('it-IT')})`,
              date: new Date(formDate),
              collaboratorId: staffId,
              studentId: formStudentId,
            });
          }
        }
        crossAlert('Successo', isPastDate ? 'Appuntamento passato registrato!' : 'Appuntamento creato!');
        if (!isPastDate) {
          const studentName = getStudentName(formStudentId);
          const dateLabel = new Date(formDate).toLocaleDateString('it-IT');
          createNotification(
            formStudentId,
            'session_reminder',
            'Nuovo appuntamento',
            `Hai un nuovo appuntamento il ${dateLabel} alle ${formStartTime}.`
          ).catch(() => {});
          if (!isOwner) {
            getOwner().then((owner) => {
              if (owner) createNotification(
                owner.id,
                'session_reminder',
                'Nuovo appuntamento creato',
                `${getStaffName(staffId)} ha fissato un appuntamento con ${studentName} il ${dateLabel} alle ${formStartTime}.`
              ).catch(() => {});
            }).catch(() => {});
          }
        }
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

  const decrementStudentPlan = async (studentId: string, kind: AppointmentKind) => {
    try {
      const plan = await getActiveStudentPlan(studentId);
      if (!plan) return;
      const usedL = plan.usedLessons || 0;
      const inclL = plan.includedLessons || 0;
      const usedC = plan.usedConsultations || 0;
      const inclC = plan.includedConsultations || 0;
      if (kind === 'training') {
        if (inclL > 0 && usedL < inclL) {
          await decrementPlanLesson(plan.id, usedL);
        }
      } else {
        if (inclC > 0 && usedC < inclC) {
          await decrementPlanConsultation(plan.id, usedC);
        }
      }
    } catch (err) {
      console.error('Errore aggiornamento piano:', err);
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
            await decrementStudentPlan(item.studentId, item.kind);
            const studentName = getStudentName(item.studentId);
            const dateLabel = item.date.toLocaleDateString('it-IT');
            createNotification(
              item.studentId,
              'session_reminder',
              'Sessione completata',
              `La tua sessione del ${dateLabel} è stata completata. Ottimo lavoro!`
            ).catch(() => {});
            if (!isOwner) {
              getOwner().then((owner) => {
                if (owner) createNotification(
                  owner.id,
                  'session_reminder',
                  'Sessione completata',
                  `Sessione con ${studentName} del ${dateLabel} completata da ${getStaffName(item.staffId)}.`
                ).catch(() => {});
              }).catch(() => {});
            }
            loadData();
          } catch { crossAlert('Errore', 'Impossibile aggiornare'); }
        },
      },
    ]);
  };

  const handleCancel = (item: AppointmentItem) => {
    if (isStudent) {
      const hoursLeft = (item.date.getTime() - Date.now()) / (1000 * 60 * 60);
      const isLate = hoursLeft < 10;

      if (isLate) {
        crossAlert(
          'Attenzione',
          'Meno di 10 ore prima: la sessione sarà considerata come eseguita e verrà addebitata.',
          [
            { text: 'Ho capito', style: 'cancel' },
            {
              text: 'Annulla comunque',
              style: 'destructive',
              onPress: async () => {
                try {
                  if (item.kind === 'training') await cancelSession(item.id, item.date);
                  else await cancelAppointment(item.id, item.date);
                  await decrementStudentPlan(item.studentId, item.kind);
                  const dateLabel = item.date.toLocaleDateString('it-IT');
                  getOwner().then((owner) => {
                    if (owner) createNotification(
                      owner.id,
                      'session_cancelled',
                      'Appuntamento annullato (tardivo)',
                      `${getStudentName(item.studentId)} ha annullato l'appuntamento del ${dateLabel} a meno di 10 ore. Sessione addebitata.`
                    ).catch(() => {});
                  }).catch(() => {});
                  loadData();
                } catch { crossAlert('Errore', 'Impossibile annullare'); }
              },
            },
          ]
        );
        return;
      }
    }

    crossAlert('Conferma', 'Annullare questo appuntamento?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Annulla appuntamento',
        style: 'destructive',
        onPress: async () => {
          try {
            if (isStaff) {
              if (item.kind === 'training') await updateSessionStatus(item.id, 'cancelled_by_student');
              else await updateAppointmentStatus(item.id, 'cancelled');
            } else {
              if (item.kind === 'training') await cancelSession(item.id, item.date);
              else await cancelAppointment(item.id, item.date);
            }
            const dateLabel = item.date.toLocaleDateString('it-IT');
            if (isStaff) {
              createNotification(
                item.studentId,
                'session_cancelled',
                'Appuntamento annullato',
                `Il tuo appuntamento del ${dateLabel} è stato annullato.`
              ).catch(() => {});
            }
            if (!isOwner) {
              getOwner().then((owner) => {
                if (owner) createNotification(
                  owner.id,
                  'session_cancelled',
                  'Appuntamento annullato',
                  `Appuntamento con ${getStudentName(item.studentId)} del ${dateLabel} annullato.`
                ).catch(() => {});
              }).catch(() => {});
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

  // Task handlers
  const resetTaskForm = () => {
    setTaskTitle('');
    setTaskDescription('');
    setTaskPriority('medium');
    setTaskStartTime('');
    setTaskEndTime('');
    setEditingTask(null);
  };

  const openCreateTask = () => {
    resetTaskForm();
    setShowTaskModal(true);
  };

  const openEditTask = (task: DailyTask) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDescription(task.description);
    setTaskPriority(task.priority);
    setTaskStartTime(task.startTime || '');
    setTaskEndTime(task.endTime || '');
    setShowTaskModal(true);
  };

  const handleSaveTask = async () => {
    if (!taskTitle.trim() || !user) {
      crossAlert('Errore', 'Inserisci un titolo per il task');
      return;
    }
    setSavingTask(true);
    try {
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          priority: taskPriority,
          startTime: taskStartTime || undefined,
          endTime: taskEndTime || undefined,
        });
      } else {
        await createTask({
          ownerId: user.id,
          date: new Date(),
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          priority: taskPriority,
          isCompleted: false,
          createdAt: new Date(),
          startTime: taskStartTime || undefined,
          endTime: taskEndTime || undefined,
        });
      }
      crossAlert('Successo', editingTask ? 'Task aggiornato!' : 'Task creato!');
      resetTaskForm();
      setShowTaskModal(false);
      loadData();
    } catch (err: any) {
      const msg = err?.message || err?.code || String(err);
      console.error('Task save error:', err);
      crossAlert('Errore', `Impossibile salvare il task: ${msg}`);
    } finally {
      setSavingTask(false);
    }
  };

  const handleToggleTask = async (task: DailyTask) => {
    try {
      await toggleTaskComplete(task.id, !task.isCompleted);
      loadData();
    } catch {
      crossAlert('Errore', 'Impossibile aggiornare il task');
    }
  };

  const handleDeleteTask = (task: DailyTask) => {
    crossAlert('Conferma', 'Eliminare questo task?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTask(task.id);
            loadData();
          } catch { crossAlert('Errore', 'Impossibile eliminare'); }
        },
      },
    ]);
  };

  // Next 30 days for date picker

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

  // Today's agenda for quick view
  const todayAppointments = appointmentsByDate[todayStr] || [];
  const todayTasks = tasksByDate[todayStr] || [];

  // Render calendar cell
  const renderDayCell = (day: number | null, colIdx: number) => {
    if (day === null) return <View key={`empty-${colIdx}`} style={styles.dayCell} />;
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isSelected = dateStr === selectedDate;
    const isToday = dateStr === todayStr;
    const dayItems = appointmentsByDate[dateStr] || [];
    const dayTaskItems = tasksByDate[dateStr] || [];
    const hasTraining = dayItems.some((a) => a.kind === 'training');
    const hasNutrition = dayItems.some((a) => a.kind === 'nutrition');
    const hasTasks = isOwner && dayTaskItems.length > 0;

    return (
      <TouchableOpacity
        key={day}
        style={{
          ...styles.dayCell,
          ...(isToday ? styles.dayCellToday : {}),
          ...(isSelected ? styles.dayCellSelected : {}),
        }}
        onPress={() => setSelectedDate(dateStr)}
      >
        <Text style={{
          ...styles.dayText,
          ...(isToday ? styles.dayTextToday : {}),
          ...(isSelected ? styles.dayTextSelected : {}),
        }}>
          {day}
        </Text>
        <View style={styles.dotRow}>
          {hasTraining && <View style={{ ...styles.calDot, backgroundColor: colors.accent }} />}
          {hasNutrition && <View style={{ ...styles.calDot, backgroundColor: colors.success }} />}
          {hasTasks && <View style={{ ...styles.calDot, backgroundColor: colors.info }} />}
        </View>
      </TouchableOpacity>
    );
  };

  // Render task card
  const renderTaskCard = (task: DailyTask) => (
    <TaskCard
      key={task.id}
      task={task}
      onToggle={handleToggleTask}
      onEdit={openEditTask}
      onDelete={handleDeleteTask}
    />
  );

  // Render appointment card
  const renderAppointmentCard = (item: AppointmentItem) => (
    <AppointmentCard
      key={item.id}
      item={item}
      isStaff={isStaff}
      isOwner={isOwner}
      isStudent={isStudent}
      getStudentName={getStudentName}
      getStaffName={getStaffName}
      getStudentPhone={getStudentPhone}
      calcEarnings={calcEarnings}
      onEdit={openEdit}
      onComplete={handleComplete}
      onCancel={handleCancel}
      onDelete={handleDelete}
      onStudentDetail={setStudentDetailId}
      styles={styles}
    />
  );

  // Render compact appointment row for agenda
  const renderAgendaRow = (item: AppointmentItem) => {
    const staffName = getStaffName(item.staffId);
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.agendaRow}
        onPress={() => {
          setSelectedDate(item.dateStr);
          setViewMode('calendar');
        }}
      >
        <View style={{
          ...styles.agendaTimeCol,
          borderLeftColor: item.kind === 'training' ? colors.accent : colors.success,
        }}>
          <Text style={styles.agendaTime}>{item.startTime}</Text>
          <Text style={styles.agendaTimeSep}>-</Text>
          <Text style={styles.agendaTime}>{item.endTime}</Text>
        </View>
        <View style={styles.agendaInfo}>
          <Text style={styles.agendaStudentName}>{getStudentName(item.studentId)}</Text>
          <View style={styles.agendaMetaRow}>
            <Ionicons
              name={item.kind === 'training' ? 'barbell' : 'nutrition'}
              size={12}
              color={item.kind === 'training' ? colors.accent : colors.success}
            />
            <Text style={styles.agendaKind}>
              {item.kind === 'training' ? 'Training' : 'Nutrizione'}
            </Text>
            {staffName ? <Text style={styles.agendaStaff}> · {staffName}</Text> : null}
          </View>
        </View>
        <Badge status={item.status} />
      </TouchableOpacity>
    );
  };

  const selectedDateObj = new Date(selectedDate + 'T00:00:00');
  const selectedDateLabel = selectedDateObj.toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const todayLabel = now.toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  // ========== AGENDA VIEW ==========
  if (viewMode === 'agenda') {
    const scheduledToday = todayAppointments.filter((a) => a.status === 'scheduled');
    const pendingTasks = todayTasks.filter((t) => !t.isCompleted);
    const completedTasks = todayTasks.filter((t) => t.isCompleted);

    return (
      <View style={styles.container}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
        >
          {/* Header */}
          <View style={{ ...styles.header, paddingTop: insets.top + spacing.md }}>
            <View style={styles.headerTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>
                  {isStudent ? 'I Miei Appuntamenti' : 'Agenda'}
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {todayLabel}
                </Text>
              </View>
            </View>
          </View>

          {/* View mode tabs */}
          <View style={styles.viewTabsBar}>
            <TouchableOpacity
              style={{ ...styles.viewTab, ...(viewMode === 'agenda' ? styles.viewTabActive : {}) }}
              onPress={() => setViewMode('agenda')}
            >
              <Ionicons name="list" size={16} color={viewMode === 'agenda' ? colors.textOnAccent : colors.textSecondary} />
              <Text style={{ ...styles.viewTabText, ...(viewMode === 'agenda' ? styles.viewTabTextActive : {}) }}>Agenda</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ ...styles.viewTab, ...(viewMode === 'timeline' ? styles.viewTabActive : {}) }}
              onPress={() => setViewMode('timeline')}
            >
              <Ionicons name="today" size={16} color={viewMode === 'timeline' ? colors.textOnAccent : colors.textSecondary} />
              <Text style={{ ...styles.viewTabText, ...(viewMode === 'timeline' ? styles.viewTabTextActive : {}) }}>La Mia Giornata</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ ...styles.viewTab, ...(viewMode === 'calendar' ? styles.viewTabActive : {}) }}
              onPress={() => setViewMode('calendar')}
            >
              <Ionicons name="calendar" size={16} color={viewMode === 'calendar' ? colors.textOnAccent : colors.textSecondary} />
              <Text style={{ ...styles.viewTabText, ...(viewMode === 'calendar' ? styles.viewTabTextActive : {}) }}>Calendario</Text>
            </TouchableOpacity>
          </View>

          {/* Ricerca appuntamenti per allievo */}
          {!isStudent && (
            <View style={styles.searchSection}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color={colors.textLight} />
                <TextInput
                  style={styles.searchInput}
                  value={searchName}
                  onChangeText={setSearchName}
                  placeholder="Cerca appuntamenti di un allievo..."
                  placeholderTextColor={colors.textLight}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                {searchName.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchName('')}>
                    <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
              {matchingStudents.length > 0 && (
                <View style={styles.searchResults}>
                  {matchingStudents.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={styles.searchResultRow}
                      onPress={() => openStudentHistory(s.id, `${s.name} ${s.surname}`)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.searchAvatar}>
                        <Text style={styles.searchAvatarText}>{s.name[0]}{s.surname[0]}</Text>
                      </View>
                      <Text style={styles.searchResultName}>{s.name} {s.surname}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {searchName.trim().length > 0 && matchingStudents.length === 0 && (
                <Text style={styles.searchNoResult}>Nessun allievo trovato</Text>
              )}
            </View>
          )}

          {/* Staff filter (owner only) */}
          {canSeeAll && staffList.length > 0 && (
            <View style={styles.staffFilterSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.staffFilterRow}>
                  <TouchableOpacity
                    style={{
                      ...styles.staffFilterChip,
                      ...(!selectedStaffId ? styles.staffFilterChipActive : {}),
                    }}
                    onPress={() => setSelectedStaffId(null)}
                  >
                    <Ionicons name="people" size={14} color={!selectedStaffId ? colors.textOnAccent : colors.textSecondary} />
                    <Text style={{
                      ...styles.staffFilterChipText,
                      ...(!selectedStaffId ? styles.staffFilterChipTextActive : {}),
                    }}>Tutti</Text>
                  </TouchableOpacity>
                  {staffList.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={{
                        ...styles.staffFilterChip,
                        ...(selectedStaffId === s.id ? styles.staffFilterChipActive : {}),
                      }}
                      onPress={() => setSelectedStaffId(selectedStaffId === s.id ? null : s.id)}
                    >
                      <Text style={{
                        ...styles.staffFilterChipText,
                        ...(selectedStaffId === s.id ? styles.staffFilterChipTextActive : {}),
                      }}>
                        {s.name}
                      </Text>
                      <Text style={{
                        ...styles.staffFilterChipRole,
                        ...(selectedStaffId === s.id ? { color: colors.textOnAccent } : {}),
                      }}>
                        {s.role}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Quick stats */}
          <View style={styles.agendaStats}>
            <View style={styles.agendaStatBox}>
              <Text style={styles.agendaStatValue}>{scheduledToday.length}</Text>
              <Text style={styles.agendaStatLabel}>Appuntamenti</Text>
            </View>
            {isOwner && (
              <>
                <View style={styles.agendaStatBox}>
                  <Text style={{ ...styles.agendaStatValue, color: colors.info }}>{pendingTasks.length}</Text>
                  <Text style={styles.agendaStatLabel}>Task da fare</Text>
                </View>
                <View style={styles.agendaStatBox}>
                  <Text style={{ ...styles.agendaStatValue, color: colors.success }}>{completedTasks.length}</Text>
                  <Text style={styles.agendaStatLabel}>Task fatti</Text>
                </View>
              </>
            )}
          </View>

          {/* Today's appointments */}
          <View style={styles.agendaSection}>
            <View style={styles.agendaSectionHeader}>
              <Ionicons name="time-outline" size={18} color={colors.accent} />
              <Text style={styles.agendaSectionTitle}>Appuntamenti di Oggi</Text>
              <Text style={styles.agendaSectionCount}>{scheduledToday.length}</Text>
            </View>
            {scheduledToday.length === 0 ? (
              <Text style={styles.agendaEmpty}>Nessun appuntamento programmato per oggi</Text>
            ) : (
              scheduledToday.map(renderAgendaRow)
            )}
          </View>

          {/* Owner tasks section */}
          {isOwner && (
            <View style={styles.agendaSection}>
              <View style={styles.agendaSectionHeader}>
                <Ionicons name="checkbox-outline" size={18} color={colors.info} />
                <Text style={styles.agendaSectionTitle}>Task di Oggi</Text>
                <Text style={styles.agendaSectionCount}>
                  {pendingTasks.length}{completedTasks.length > 0 ? ` + ${completedTasks.length} ✓` : ''}
                </Text>
              </View>
              {pendingTasks.length === 0 && completedTasks.length === 0 ? (
                <Text style={styles.agendaEmpty}>Nessun task per oggi</Text>
              ) : (
                <>
                  {pendingTasks.map(renderTaskCard)}
                  {completedTasks.length > 0 && (
                    <>
                      <Text style={styles.completedHeader}>Completati</Text>
                      {completedTasks.map(renderTaskCard)}
                    </>
                  )}
                </>
              )}
              <TouchableOpacity style={styles.addTaskBtn} onPress={openCreateTask}>
                <Ionicons name="add-circle" size={20} color={colors.info} />
                <Text style={styles.addTaskText}>Aggiungi Task</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.footerSpacer}>
            {isStaff && <Button title="+ Nuovo Appuntamento" onPress={openCreate} />}
          </View>
        </ScrollView>

        {renderTaskModal()}
        {renderAppointmentModal()}
        {renderStudentDetailModal()}
        {renderSearchHistoryModal()}
        {searchLoading && (
          <View style={styles.searchLoadingOverlay}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        )}
      </View>
    );
  }

  // ========== TIMELINE VIEW ==========
  if (viewMode === 'timeline') {
    const TIMELINE_HOURS = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];
    const HOUR_HEIGHT = 80;
    const scheduledToday = todayAppointments.filter((a) => a.status === 'scheduled');
    const pendingTasks = todayTasks.filter((t) => !t.isCompleted);
    const completedTasks = todayTasks.filter((t) => t.isCompleted);
    const noTimeTasks = todayTasks.filter((t) => !t.startTime);

    const getTimeOffset = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      const startHour = 6;
      return (h - startHour) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
    };
    const getBlockHeight = (start: string, end: string) => {
      const s = getTimeOffset(start);
      const e = getTimeOffset(end);
      return Math.max(e - s, 30);
    };

    const nowHour = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const nowOffset = now.getHours() >= 6 && now.getHours() <= 22 ? getTimeOffset(nowHour) : -1;

    return (
      <View style={styles.container}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
        >
          {/* Header */}
          <View style={{ ...styles.header, paddingTop: insets.top + spacing.md }}>
            <View style={styles.headerTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>La Mia Giornata</Text>
                <Text style={styles.subtitle}>{todayLabel}</Text>
              </View>
            </View>
          </View>

          {/* View mode tabs */}
          <View style={styles.viewTabsBar}>
            <TouchableOpacity
              style={{ ...styles.viewTab, ...(viewMode === 'agenda' ? styles.viewTabActive : {}) }}
              onPress={() => setViewMode('agenda')}
            >
              <Ionicons name="list" size={16} color={viewMode === 'agenda' ? colors.textOnAccent : colors.textSecondary} />
              <Text style={{ ...styles.viewTabText, ...(viewMode === 'agenda' ? styles.viewTabTextActive : {}) }}>Agenda</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ ...styles.viewTab, ...(viewMode === 'timeline' ? styles.viewTabActive : {}) }}
              onPress={() => setViewMode('timeline')}
            >
              <Ionicons name="today" size={16} color={viewMode === 'timeline' ? colors.textOnAccent : colors.textSecondary} />
              <Text style={{ ...styles.viewTabText, ...(viewMode === 'timeline' ? styles.viewTabTextActive : {}) }}>La Mia Giornata</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ ...styles.viewTab, ...(viewMode === 'calendar' ? styles.viewTabActive : {}) }}
              onPress={() => setViewMode('calendar')}
            >
              <Ionicons name="calendar" size={16} color={viewMode === 'calendar' ? colors.textOnAccent : colors.textSecondary} />
              <Text style={{ ...styles.viewTabText, ...(viewMode === 'calendar' ? styles.viewTabTextActive : {}) }}>Calendario</Text>
            </TouchableOpacity>
          </View>

          {/* Summary */}
          <View style={styles.agendaStats}>
            <View style={styles.agendaStatBox}>
              <Text style={styles.agendaStatValue}>{scheduledToday.length}</Text>
              <Text style={styles.agendaStatLabel}>Appuntamenti</Text>
            </View>
            {isOwner && (
              <>
                <View style={styles.agendaStatBox}>
                  <Text style={{ ...styles.agendaStatValue, color: colors.info }}>{pendingTasks.length}</Text>
                  <Text style={styles.agendaStatLabel}>Task da fare</Text>
                </View>
                <View style={styles.agendaStatBox}>
                  <Text style={{ ...styles.agendaStatValue, color: colors.success }}>{completedTasks.length}</Text>
                  <Text style={styles.agendaStatLabel}>Task fatti</Text>
                </View>
              </>
            )}
          </View>

          {/* Timeline */}
          <View style={styles.timelineContainer}>
            <View style={{ height: TIMELINE_HOURS.length * HOUR_HEIGHT, position: 'relative' }}>
              {/* Hour lines */}
              {TIMELINE_HOURS.map((hour, idx) => (
                <View key={hour} style={{ position: 'absolute', top: idx * HOUR_HEIGHT, left: 0, right: 0, flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Text style={styles.tlHourLabel}>{hour}</Text>
                  <View style={styles.tlHourLine} />
                </View>
              ))}

              {/* Current time indicator */}
              {nowOffset >= 0 && (
                <View style={{ position: 'absolute', top: nowOffset, left: 50, right: 0, zIndex: 10, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.tlNowDot} />
                  <View style={styles.tlNowLine} />
                </View>
              )}

              {/* Appointment blocks */}
              {scheduledToday.map((appt) => {
                const top = getTimeOffset(appt.startTime);
                const height = getBlockHeight(appt.startTime, appt.endTime);
                const isTraining = appt.kind === 'training';
                return (
                  <View
                    key={`appt-${appt.id}`}
                    style={{
                      position: 'absolute',
                      top,
                      left: 60,
                      right: 12,
                      height,
                      backgroundColor: isTraining ? colors.accent + '20' : '#34C75920',
                      borderLeftWidth: 3,
                      borderLeftColor: isTraining ? colors.accent : colors.success,
                      borderRadius: borderRadius.md,
                      padding: spacing.sm,
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={styles.tlBlockTime}>{appt.startTime} - {appt.endTime}</Text>
                    <Text style={styles.tlBlockTitle} numberOfLines={1}>
                      {isTraining ? '🏋️' : '🥗'} {getStudentName(appt.studentId)}
                    </Text>
                    {getStaffName(appt.staffId) ? (
                      <Text style={styles.tlBlockSub} numberOfLines={1}>{getStaffName(appt.staffId)}</Text>
                    ) : null}
                  </View>
                );
              })}

              {/* Task blocks (with time) */}
              {isOwner && todayTasks.filter((t) => t.startTime).map((task) => {
                const top = getTimeOffset(task.startTime!);
                const height = task.endTime ? getBlockHeight(task.startTime!, task.endTime) : 30;
                const priorityColor = PRIORITY_COLORS[task.priority];
                return (
                  <TouchableOpacity
                    key={`task-${task.id}`}
                    onPress={() => openEditTask(task)}
                    style={{
                      position: 'absolute',
                      top,
                      left: 60,
                      right: 12,
                      height,
                      backgroundColor: priorityColor + '15',
                      borderLeftWidth: 3,
                      borderLeftColor: priorityColor,
                      borderRadius: borderRadius.md,
                      borderStyle: task.isCompleted ? 'dashed' as any : 'solid' as any,
                      padding: spacing.sm,
                      justifyContent: 'center',
                      opacity: task.isCompleted ? 0.5 : 1,
                    }}
                  >
                    <Text style={styles.tlBlockTime}>
                      {task.startTime}{task.endTime ? ` - ${task.endTime}` : ''}
                    </Text>
                    <Text style={{
                      ...styles.tlBlockTitle,
                      textDecorationLine: task.isCompleted ? 'line-through' : 'none',
                    }} numberOfLines={1}>
                      📋 {task.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Tasks without time */}
          {isOwner && noTimeTasks.length > 0 && (
            <View style={styles.agendaSection}>
              <View style={styles.agendaSectionHeader}>
                <Ionicons name="list-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.agendaSectionTitle}>Task senza orario</Text>
                <Text style={styles.agendaSectionCount}>{noTimeTasks.length}</Text>
              </View>
              {noTimeTasks.map(renderTaskCard)}
            </View>
          )}

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.lg }}>
            {isStaff && <Button title="+ Appuntamento" onPress={openCreate} style={{ flex: 1 }} />}
            {isOwner && <Button title="+ Task" onPress={openCreateTask} variant="outline" style={{ flex: 1 }} />}
          </View>
        </ScrollView>

        {renderTaskModal()}
        {renderAppointmentModal()}
        {renderStudentDetailModal()}
      </View>
    );
  }

  // ========== CALENDAR VIEW ==========
  return (
    <View style={styles.container}>
      <FlatList
        data={selectedDayItems}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={{ ...styles.header, paddingTop: insets.top + spacing.md }}>
              <View style={styles.headerTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{isStudent ? 'I Miei Appuntamenti' : 'Calendario'}</Text>
                  <Text style={styles.subtitle}>
                    {filteredAppointments.length} appuntament{filteredAppointments.length === 1 ? 'o' : 'i'} totali
                    {' · '}{filteredAppointments.filter(a => a.status === 'scheduled').length} in programma
                  </Text>
                </View>
              </View>
              {isStudent && (
                <Text style={styles.cancelHint}>
                  Disdetta gratuita entro 10 ore prima
                </Text>
              )}
            </View>

            {/* View mode tabs */}
            <View style={styles.viewTabsBar}>
              <TouchableOpacity
                style={{ ...styles.viewTab, ...(viewMode === 'agenda' ? styles.viewTabActive : {}) }}
                onPress={() => setViewMode('agenda')}
              >
                <Ionicons name="list" size={16} color={viewMode === 'agenda' ? colors.textOnAccent : colors.textSecondary} />
                <Text style={{ ...styles.viewTabText, ...(viewMode === 'agenda' ? styles.viewTabTextActive : {}) }}>Agenda</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ ...styles.viewTab, ...(viewMode === 'timeline' ? styles.viewTabActive : {}) }}
                onPress={() => setViewMode('timeline')}
              >
                <Ionicons name="today" size={16} color={viewMode === 'timeline' ? colors.textOnAccent : colors.textSecondary} />
                <Text style={{ ...styles.viewTabText, ...(viewMode === 'timeline' ? styles.viewTabTextActive : {}) }}>La Mia Giornata</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ ...styles.viewTab, ...(viewMode === 'calendar' ? styles.viewTabActive : {}) }}
                onPress={() => setViewMode('calendar')}
              >
                <Ionicons name="calendar" size={16} color={viewMode === 'calendar' ? colors.textOnAccent : colors.textSecondary} />
                <Text style={{ ...styles.viewTabText, ...(viewMode === 'calendar' ? styles.viewTabTextActive : {}) }}>Calendario</Text>
              </TouchableOpacity>
            </View>

            {/* Staff filter (owner only) */}
            {canSeeAll && staffList.length > 0 && (
              <View style={styles.staffFilterSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.staffFilterRow}>
                    <TouchableOpacity
                      style={{
                        ...styles.staffFilterChip,
                        ...(!selectedStaffId ? styles.staffFilterChipActive : {}),
                      }}
                      onPress={() => setSelectedStaffId(null)}
                    >
                      <Ionicons name="people" size={14} color={!selectedStaffId ? colors.textOnAccent : colors.textSecondary} />
                      <Text style={{
                        ...styles.staffFilterChipText,
                        ...(!selectedStaffId ? styles.staffFilterChipTextActive : {}),
                      }}>Tutti</Text>
                    </TouchableOpacity>
                    {staffList.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        style={{
                          ...styles.staffFilterChip,
                          ...(selectedStaffId === s.id ? styles.staffFilterChipActive : {}),
                        }}
                        onPress={() => setSelectedStaffId(selectedStaffId === s.id ? null : s.id)}
                      >
                        <Text style={{
                          ...styles.staffFilterChipText,
                          ...(selectedStaffId === s.id ? styles.staffFilterChipTextActive : {}),
                        }}>
                          {s.name}
                        </Text>
                        <Text style={{
                          ...styles.staffFilterChipRole,
                          ...(selectedStaffId === s.id ? { color: colors.textOnAccent } : {}),
                        }}>
                          {s.role}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

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
                <View style={{ ...styles.calDot, backgroundColor: colors.accent }} />
                <Text style={styles.legendText}>Training</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={{ ...styles.calDot, backgroundColor: colors.success }} />
                <Text style={styles.legendText}>Nutrizione</Text>
              </View>
              {isOwner && (
                <View style={styles.legendItem}>
                  <View style={{ ...styles.calDot, backgroundColor: colors.info }} />
                  <Text style={styles.legendText}>Task</Text>
                </View>
              )}
            </View>

            {/* Staff stats (owner only) */}
            {isOwner && staffStats.length > 0 && (
              <View style={styles.staffStatsSection}>
                <Text style={styles.staffStatsTitle}>Lezioni Completate per Staff</Text>
                {staffStats.map((s) => (
                  <View key={s.id} style={styles.staffStatRow}>
                    <Text style={styles.staffStatName} numberOfLines={1}>{s.name}</Text>
                    <View style={styles.staffStatCounts}>
                      <View style={styles.staffStatBadge}>
                        <Ionicons name="barbell" size={12} color={colors.accent} />
                        <Text style={styles.staffStatNum}>{s.training}</Text>
                      </View>
                      <View style={styles.staffStatBadge}>
                        <Ionicons name="nutrition" size={12} color={colors.success} />
                        <Text style={styles.staffStatNum}>{s.nutrition}</Text>
                      </View>
                      <Text style={styles.staffStatTotal}>{s.total}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Selected day header */}
            <View style={styles.dayHeader}>
              <Text style={styles.dayHeaderText}>{selectedDateLabel}</Text>
              <Text style={styles.dayHeaderCount}>
                {selectedDayItems.length} appuntament{selectedDayItems.length === 1 ? 'o' : 'i'}
                {isOwner && selectedDayTasks.length > 0 ? ` · ${selectedDayTasks.length} task` : ''}
              </Text>
            </View>

            {/* Tasks for selected day (owner only) */}
            {isOwner && (
              <View style={styles.dayTasksSection}>
                {selectedDayTasks.length > 0 && (
                  <>
                    <View style={styles.dayTasksHeader}>
                      <Ionicons name="checkbox-outline" size={16} color={colors.info} />
                      <Text style={styles.dayTasksTitle}>Task</Text>
                    </View>
                    {selectedDayTasks.map(renderTaskCard)}
                  </>
                )}
                <TouchableOpacity style={styles.addTaskBtn} onPress={openCreateTask}>
                  <Ionicons name="add-circle" size={18} color={colors.info} />
                  <Text style={styles.addTaskText}>Aggiungi Task</Text>
                </TouchableOpacity>
              </View>
            )}
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
            {isStaff && <Button title="+ Nuovo Appuntamento" onPress={openCreate} />}
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Task modal */}
      {renderTaskModal()}
      {/* Appointment modal */}
      {renderAppointmentModal()}
      {/* Student detail modal */}
      {renderStudentDetailModal()}
    </View>
  );

  // ========== MODALS (extracted components) ==========

  function renderTaskModal() {
    return (
      <TaskModal
        visible={showTaskModal}
        editingTask={editingTask}
        taskTitle={taskTitle}
        setTaskTitle={setTaskTitle}
        taskDescription={taskDescription}
        setTaskDescription={setTaskDescription}
        taskPriority={taskPriority}
        setTaskPriority={setTaskPriority}
        taskStartTime={taskStartTime}
        setTaskStartTime={setTaskStartTime}
        taskEndTime={taskEndTime}
        setTaskEndTime={setTaskEndTime}
        savingTask={savingTask}
        onSave={handleSaveTask}
        onClose={() => { setShowTaskModal(false); resetTaskForm(); }}
      />
    );
  }

  function renderAppointmentModal() {
    return (
      <AppointmentModal
        visible={showModal}
        editingItem={editingItem}
        formKind={formKind}
        setFormKind={setFormKind}
        formStudentId={formStudentId}
        setFormStudentId={setFormStudentId}
        formCollabId={formCollabId}
        setFormCollabId={setFormCollabId}
        formDate={formDate}
        setFormDate={setFormDate}
        formCustomDate={formCustomDate}
        setFormCustomDate={setFormCustomDate}
        formStartTime={formStartTime}
        setFormStartTime={setFormStartTime}
        formEndTime={formEndTime}
        setFormEndTime={setFormEndTime}
        formCost={formCost}
        setFormCost={setFormCost}
        formNotes={formNotes}
        setFormNotes={setFormNotes}
        students={students}
        collaborators={collaborators}
        canSeeAll={canSeeAll}
        isOwner={isOwner}
        isManager={isManager}
        saving={saving}
        onSave={handleSave}
        onClose={() => { setShowModal(false); resetForm(); }}
      />
    );
  }

  function renderStudentDetailModal() {
    return (
      <StudentDetailModal
        visible={studentDetailId !== null}
        studentName={studentDetailId ? getStudentName(studentDetailId) : ''}
        isOwner={isOwner}
        stats={studentDetailItems.stats}
        upcoming={studentDetailItems.upcoming}
        past={studentDetailItems.past}
        onClose={() => setStudentDetailId(null)}
      />
    );
  }

  function renderSearchHistoryModal() {
    return (
      <StudentDetailModal
        visible={searchDetail !== null}
        studentName={searchDetail?.studentName || ''}
        isOwner={isOwner}
        stats={searchDetail?.stats || { total: 0, completed: 0, cancelled: 0, remaining: 0 }}
        upcoming={searchDetail?.upcoming || []}
        past={searchDetail?.past || []}
        onClose={() => setSearchDetail(null)}
      />
    );
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingBottom: spacing.xxl },
  searchSection: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  searchResults: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  searchAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchAvatarText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.accent,
  },
  searchResultName: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  searchNoResult: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  searchLoadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textOnPrimary },
  subtitle: { fontSize: fontSize.md, color: colors.textLight, marginTop: spacing.xs },
  cancelHint: { fontSize: fontSize.xs, color: colors.warning, marginTop: spacing.xs },
  viewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
  },
  viewToggleText: {
    fontSize: fontSize.sm,
    color: colors.textOnPrimary,
    fontWeight: '600',
  },

  staffFilterSection: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  staffFilterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  staffFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  staffFilterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  staffFilterChipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  staffFilterChipTextActive: {
    color: colors.textOnAccent,
  },
  staffFilterChipRole: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginLeft: 2,
  },

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

  // Tasks section (calendar view)
  dayTasksSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  dayTasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  dayTasksTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },

  // Task card
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
  addTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  addTaskText: {
    fontSize: fontSize.sm,
    color: colors.info,
    fontWeight: '600',
  },
  completedHeader: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },

  // Agenda view
  agendaStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  agendaStatBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  agendaStatValue: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.accent,
  },
  agendaStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  agendaSection: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  agendaSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  agendaSectionTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  agendaSectionCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  agendaEmpty: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  agendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  agendaTimeCol: {
    borderLeftWidth: 3,
    paddingLeft: spacing.sm,
    marginRight: spacing.md,
    alignItems: 'center',
  },
  agendaTime: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  agendaTimeSep: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  agendaInfo: {
    flex: 1,
  },
  agendaStudentName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  agendaMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  agendaKind: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  agendaStaff: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },

  // Appointment card
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
  customDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  customDateInput: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  todayBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  todayBtnText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  selectedDateLabel: {
    fontSize: fontSize.md,
    color: colors.accent,
    fontWeight: '600',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    textTransform: 'capitalize',
  },
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

  // Priority chips
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

  staffStatsSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  staffStatsTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  staffStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  staffStatName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  staffStatCounts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  staffStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  staffStatNum: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  staffStatTotal: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.accent,
    minWidth: 30,
    textAlign: 'right',
  },

  // View tabs bar
  viewTabsBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.xs,
  },
  viewTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: 'transparent',
  },
  viewTabActive: {
    backgroundColor: colors.accent,
  },
  viewTabText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  viewTabTextActive: {
    color: colors.textOnAccent,
  },

  // Timeline
  timelineContainer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  tlHourLabel: {
    width: 50,
    fontSize: fontSize.xs,
    color: colors.textLight,
    textAlign: 'right',
    paddingRight: spacing.sm,
    marginTop: -8,
  },
  tlHourLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  tlNowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    marginLeft: -5,
  },
  tlNowLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.accent,
  },
  tlBlockTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tlBlockTitle: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  tlBlockSub: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },

  // Task time badge
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

  // Time picker in modal
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
});
