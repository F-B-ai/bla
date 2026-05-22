import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { ModalHeader } from '../../components/common/ModalHeader';
import { StudentSearchPicker } from '../../components/common/StudentSearchPicker';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/common/StatCard';
import { useAuth } from '../../hooks/useAuth';
import { getStudents } from '../../services/authService';
import {
  getAllPaymentPlans,
  createPaymentPlan,
  updatePaymentPlan,
  deletePaymentPlan,
  markInstallmentPaid,
  getPaymentReminderMessage,
} from '../../services/paymentService';
import { crossAlert } from '../../utils/alert';
import { PaymentPlan, Installment, PaymentType, PaymentStatus, Student } from '../../types';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// ---------------------------------------------------------------------------
// PaymentPlanScreen
// ---------------------------------------------------------------------------
export const PaymentPlanScreen: React.FC = () => {
  const { user, isOwner } = useAuth();
  const isManager = user?.role === 'manager';
  const canEdit = isOwner; // only owner can create/edit/delete

  // Data
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PaymentPlan | null>(null);

  // Create form state
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('full');
  const [numInstallments, setNumInstallments] = useState('2');
  const [firstDueDate, setFirstDueDate] = useState('');
  const [customInstallments, setCustomInstallments] = useState<
    { amount: string; dueDate: string }[]
  >([]);
  const [includedLessons, setIncludedLessons] = useState('');
  const [includedConsultations, setIncludedConsultations] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [courseType, setCourseType] = useState('');
  const [subscriptionType, setSubscriptionType] = useState('');

  // Edit form state
  const [editTotalAmount, setEditTotalAmount] = useState('');
  const [editInstallments, setEditInstallments] = useState<Installment[]>([]);
  const [editCustomAmounts, setEditCustomAmounts] = useState<string[]>([]);
  const [editCustomDates, setEditCustomDates] = useState<string[]>([]);
  const [editIncludedLessons, setEditIncludedLessons] = useState('');
  const [editIncludedConsultations, setEditIncludedConsultations] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editCourseType, setEditCourseType] = useState('');
  const [editSubscriptionType, setEditSubscriptionType] = useState('');
  const [editUsedLessons, setEditUsedLessons] = useState(0);
  const [editUsedConsultations, setEditUsedConsultations] = useState(0);
  const [editPaymentType, setEditPaymentType] = useState<PaymentType>('full');

  // -----------------------------------------------------------------------
  // Load data
  // -----------------------------------------------------------------------
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [plansData, studentsData] = await Promise.all([
        getAllPaymentPlans(),
        getStudents(),
      ]);
      setPlans(plansData);
      setStudents(studentsData);
    } catch (e) {
      crossAlert('Errore', 'Impossibile caricare i dati dei pagamenti.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------
  const studentMap = useMemo(() => {
    const map: Record<string, Student> = {};
    for (const s of students) {
      map[s.id] = s;
    }
    return map;
  }, [students]);

  const getStudentName = useCallback(
    (studentId: string) => {
      const s = studentMap[studentId];
      return s ? `${s.name} ${s.surname}` : studentId;
    },
    [studentMap],
  );

  const getStudentPhone = useCallback(
    (studentId: string) => {
      const s = studentMap[studentId];
      return s?.phone || '';
    },
    [studentMap],
  );

  const parseDateString = (str: string): Date | null => {
    // accept dd/mm/yyyy or yyyy-mm-dd
    if (!str) return null;
    const parts = str.includes('/') ? str.split('/') : null;
    if (parts && parts.length === 3) {
      const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatDate = (date: Date | string | any): string => {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('it-IT');
  };

  const formatDateForInput = (date: Date | string | any): string => {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const daysUntilDate = (date: Date | string | any): number => {
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getPaymentTypeLabel = (type: PaymentType): string => {
    switch (type) {
      case 'full':
        return 'Unica soluzione';
      case 'installment':
        return 'Rate';
      case 'monthly_course':
        return 'Corso Mensile';
      default:
        return type;
    }
  };

  const getPaymentTypeBadgeStatus = (type: PaymentType): 'paid' | 'pending' | 'overdue' => {
    switch (type) {
      case 'full':
        return 'paid';
      case 'installment':
        return 'pending';
      case 'monthly_course':
        return 'overdue';
      default:
        return 'pending';
    }
  };

  // -----------------------------------------------------------------------
  // Stats
  // -----------------------------------------------------------------------
  const stats = useMemo(() => {
    let totalOutstanding = 0;
    let totalPaid = 0;
    let overdueCount = 0;
    let activePlansCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const plan of plans) {
      for (const inst of plan.installments) {
        if (inst.status === 'paid') {
          totalPaid += inst.amount;
        } else if (inst.status === 'overdue') {
          totalOutstanding += inst.amount;
          overdueCount++;
        } else {
          totalOutstanding += inst.amount;
        }
      }

      // Check if plan is active (today is between startDate and endDate)
      const planStart = plan.startDate instanceof Date ? plan.startDate : new Date(plan.startDate);
      const planEnd = plan.endDate instanceof Date ? plan.endDate : new Date(plan.endDate);
      if (!isNaN(planStart.getTime()) && !isNaN(planEnd.getTime())) {
        const startNorm = new Date(planStart);
        startNorm.setHours(0, 0, 0, 0);
        const endNorm = new Date(planEnd);
        endNorm.setHours(0, 0, 0, 0);
        if (today >= startNorm && today <= endNorm) {
          activePlansCount++;
        }
      }
    }

    return { totalOutstanding, totalPaid, overdueCount, activePlansCount };
  }, [plans]);

  // -----------------------------------------------------------------------
  // Group plans by student
  // -----------------------------------------------------------------------
  const plansByStudent = useMemo(() => {
    const grouped: Record<string, PaymentPlan[]> = {};
    for (const plan of plans) {
      if (!grouped[plan.studentId]) {
        grouped[plan.studentId] = [];
      }
      grouped[plan.studentId].push(plan);
    }
    return grouped;
  }, [plans]);

  // -----------------------------------------------------------------------
  // Generate installments for create form
  // -----------------------------------------------------------------------
  const generateInstallments = useCallback(() => {
    const amount = parseFloat(totalAmount);
    const count = parseInt(numInstallments, 10);
    const firstDate = parseDateString(firstDueDate);

    if (!amount || amount <= 0 || !count || count < 1 || !firstDate) return;

    const perInstallment = Math.floor((amount / count) * 100) / 100;
    const remainder = Math.round((amount - perInstallment * count) * 100) / 100;

    const items: { amount: string; dueDate: string }[] = [];
    for (let i = 0; i < count; i++) {
      const dueDate = new Date(firstDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      const instAmount = i === count - 1 ? perInstallment + remainder : perInstallment;
      items.push({
        amount: instAmount.toFixed(2),
        dueDate: formatDateForInput(dueDate),
      });
    }
    setCustomInstallments(items);
  }, [totalAmount, numInstallments, firstDueDate]);

  useEffect(() => {
    if (paymentType === 'installment') {
      generateInstallments();
    }
  }, [paymentType, totalAmount, numInstallments, firstDueDate, generateInstallments]);

  // -----------------------------------------------------------------------
  // Create plan
  // -----------------------------------------------------------------------
  const resetCreateForm = () => {
    setSelectedStudentId('');
    setTotalAmount('');
    setPaymentType('full');
    setNumInstallments('2');
    setFirstDueDate('');
    setCustomInstallments([]);
    setIncludedLessons('');
    setIncludedConsultations('');
    setStartDate('');
    setEndDate('');
    setCourseType('');
    setSubscriptionType('');
  };

  const handleCreate = async () => {
    if (!selectedStudentId) {
      crossAlert('Errore', 'Seleziona un allievo.');
      return;
    }
    const amount = parseFloat(totalAmount);
    if (!amount || amount <= 0) {
      crossAlert('Errore', 'Inserisci un importo valido.');
      return;
    }

    const parsedStartDate = parseDateString(startDate);
    const parsedEndDate = parseDateString(endDate);

    if (!parsedStartDate || !parsedEndDate) {
      crossAlert('Errore', 'Inserisci le date di inizio e fine percorso.');
      return;
    }

    if (paymentType === 'monthly_course' && !courseType) {
      crossAlert('Errore', 'Inserisci il tipo di corso.');
      return;
    }

    let installments: Installment[] = [];

    if (paymentType === 'full' || paymentType === 'monthly_course') {
      const dueDate = parseDateString(firstDueDate) || new Date();
      installments = [
        {
          id: Date.now().toString() + '_0',
          amount,
          dueDate,
          status: 'pending' as PaymentStatus,
        },
      ];
    } else {
      if (customInstallments.length === 0) {
        crossAlert('Errore', 'Configura le rate prima di salvare.');
        return;
      }
      installments = customInstallments.map((ci, index) => {
        const dueDate = parseDateString(ci.dueDate) || new Date();
        return {
          id: Date.now().toString() + '_' + index,
          amount: parseFloat(ci.amount) || 0,
          dueDate,
          status: 'pending' as PaymentStatus,
        };
      });
    }

    try {
      setSaving(true);
      await createPaymentPlan({
        studentId: selectedStudentId,
        collaboratorId: user?.id || '',
        totalAmount: amount,
        paymentType,
        installments,
        createdAt: new Date(),
        includedLessons: parseInt(includedLessons, 10) || 0,
        usedLessons: 0,
        includedConsultations: parseInt(includedConsultations, 10) || 0,
        usedConsultations: 0,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        ...(paymentType === 'monthly_course'
          ? { courseType, subscriptionType }
          : {}),
      });
      resetCreateForm();
      setShowCreateModal(false);
      await loadData();
      crossAlert('Successo', 'Piano di pagamento creato con successo.');
    } catch (e) {
      crossAlert('Errore', 'Impossibile creare il piano di pagamento.');
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------------------------------------------------
  // Edit plan
  // -----------------------------------------------------------------------
  const openEditModal = (plan: PaymentPlan) => {
    setEditingPlan(plan);
    setEditTotalAmount(plan.totalAmount.toString());
    setEditInstallments([...plan.installments]);
    setEditCustomAmounts(plan.installments.map((i) => i.amount.toString()));
    setEditCustomDates(plan.installments.map((i) => formatDateForInput(i.dueDate)));
    setEditIncludedLessons((plan.includedLessons ?? 0).toString());
    setEditIncludedConsultations((plan.includedConsultations ?? 0).toString());
    setEditStartDate(plan.startDate ? formatDateForInput(plan.startDate) : '');
    setEditEndDate(plan.endDate ? formatDateForInput(plan.endDate) : '');
    setEditCourseType(plan.courseType || '');
    setEditSubscriptionType(plan.subscriptionType || '');
    setEditUsedLessons(plan.usedLessons ?? 0);
    setEditUsedConsultations(plan.usedConsultations ?? 0);
    setEditPaymentType(plan.paymentType);
  };

  const handleSaveEdit = async () => {
    if (!editingPlan) return;
    const amount = parseFloat(editTotalAmount);
    if (!amount || amount <= 0) {
      crossAlert('Errore', 'Inserisci un importo valido.');
      return;
    }

    const parsedStartDate = parseDateString(editStartDate);
    const parsedEndDate = parseDateString(editEndDate);

    const updatedInstallments: Installment[] = editInstallments.map((inst, i) => ({
      ...inst,
      amount: parseFloat(editCustomAmounts[i]) || inst.amount,
      dueDate: parseDateString(editCustomDates[i]) || inst.dueDate,
    }));

    try {
      setSaving(true);
      await updatePaymentPlan(editingPlan.id, {
        totalAmount: amount,
        installments: updatedInstallments,
        includedLessons: parseInt(editIncludedLessons, 10) || 0,
        includedConsultations: parseInt(editIncludedConsultations, 10) || 0,
        ...(parsedStartDate ? { startDate: parsedStartDate } : {}),
        ...(parsedEndDate ? { endDate: parsedEndDate } : {}),
        ...(editPaymentType === 'monthly_course'
          ? { courseType: editCourseType, subscriptionType: editSubscriptionType }
          : {}),
      });
      setEditingPlan(null);
      await loadData();
      crossAlert('Successo', 'Piano aggiornato con successo.');
    } catch (e) {
      crossAlert('Errore', 'Impossibile aggiornare il piano.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (planId: string, installmentId: string, installments: Installment[]) => {
    try {
      setSaving(true);
      await markInstallmentPaid(planId, installmentId, installments);
      await loadData();
      // Also refresh edit modal if open
      if (editingPlan && editingPlan.id === planId) {
        const refreshedPlans = await getAllPaymentPlans();
        const refreshedPlan = refreshedPlans.find((p) => p.id === planId);
        if (refreshedPlan) {
          openEditModal(refreshedPlan);
        }
      }
    } catch (e) {
      crossAlert('Errore', 'Impossibile segnare come pagato.');
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------------------------------------------------
  // Delete plan
  // -----------------------------------------------------------------------
  const handleDelete = (planId: string) => {
    crossAlert(
      'Conferma eliminazione',
      'Sei sicuro di voler eliminare questo piano di pagamento? Questa azione non può essere annullata.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await deletePaymentPlan(planId);
              if (editingPlan?.id === planId) {
                setEditingPlan(null);
              }
              await loadData();
            } catch (e) {
              crossAlert('Errore', 'Impossibile eliminare il piano.');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  // -----------------------------------------------------------------------
  // WhatsApp / SMS reminder
  // -----------------------------------------------------------------------
  const sendReminder = (type: 'whatsapp' | 'sms', studentId: string, installment: Installment) => {
    const phone = getStudentPhone(studentId);
    if (!phone) {
      crossAlert('Errore', 'Numero di telefono non disponibile per questo allievo.');
      return;
    }
    const studentName = getStudentName(studentId);
    const dueDate = installment.dueDate instanceof Date ? installment.dueDate : new Date(installment.dueDate as unknown as string);
    const days = daysUntilDate(new Date(dueDate));
    const message = getPaymentReminderMessage(studentName, installment.amount, dueDate, days);

    // Clean phone: remove spaces, leading + stays
    const cleanPhone = phone.replace(/\s+/g, '').replace(/^00/, '+');
    const phoneForWa = cleanPhone.startsWith('+') ? cleanPhone.substring(1) : cleanPhone;

    if (type === 'whatsapp') {
      Linking.openURL(`https://wa.me/${phoneForWa}?text=${encodeURIComponent(message)}`);
    } else {
      Linking.openURL(`sms:${cleanPhone}?body=${encodeURIComponent(message)}`);
    }
  };

  // -----------------------------------------------------------------------
  // Progress bar component
  // -----------------------------------------------------------------------
  const ProgressBar: React.FC<{ used: number; total: number; color: string }> = ({
    used,
    total,
    color,
  }) => {
    const progress = total > 0 ? Math.min(used / total, 1) : 0;
    return (
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progress * 100}%`, backgroundColor: color },
            ]}
          />
        </View>
      </View>
    );
  };

  // -----------------------------------------------------------------------
  // Payment type selector (reusable for create form)
  // -----------------------------------------------------------------------
  const renderPaymentTypeOption = (
    type: PaymentType,
    label: string,
    currentType: PaymentType,
    onSelect: (t: PaymentType) => void,
  ) => (
    <TouchableOpacity
      style={[
        styles.typeOption,
        currentType === type && styles.typeOptionActive,
      ]}
      onPress={() => onSelect(type)}
    >
      <Ionicons
        name={currentType === type ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={currentType === type ? colors.accent : colors.textLight}
      />
      <Text
        style={[
          styles.typeOptionText,
          currentType === type && styles.typeOptionTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  // -----------------------------------------------------------------------
  // RENDER
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Caricamento pagamenti...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Piani di Pagamento</Text>
        {canEdit && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              resetCreateForm();
              setShowCreateModal(true);
            }}
          >
            <Ionicons name="add-circle" size={28} color={colors.accent} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard
            title="Da incassare"
            value={`€${stats.totalOutstanding.toFixed(2)}`}
            color={colors.warning}
            icon={<Ionicons name="time-outline" size={14} color={colors.warning} />}
          />
          <StatCard
            title="Incassato"
            value={`€${stats.totalPaid.toFixed(2)}`}
            color={colors.success}
            icon={<Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            title="Scadute"
            value={stats.overdueCount}
            color={colors.error}
            icon={<Ionicons name="alert-circle-outline" size={14} color={colors.error} />}
          />
          <StatCard
            title="Piani Attivi"
            value={stats.activePlansCount}
            color={colors.info}
            icon={<Ionicons name="fitness-outline" size={14} color={colors.info} />}
          />
        </View>

        {/* Plans grouped by student */}
        {Object.keys(plansByStudent).length === 0 ? (
          <Card>
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>Nessun piano di pagamento</Text>
              <Text style={styles.emptySubtext}>
                {canEdit
                  ? 'Tocca il pulsante + per creare un nuovo piano'
                  : 'Nessun piano disponibile al momento'}
              </Text>
            </View>
          </Card>
        ) : (
          Object.entries(plansByStudent).map(([studentId, studentPlans]) => (
            <View key={studentId} style={styles.studentGroup}>
              <View style={styles.studentHeader}>
                <View style={styles.studentAvatar}>
                  <Text style={styles.studentAvatarText}>
                    {studentMap[studentId]
                      ? `${studentMap[studentId].name[0]}${studentMap[studentId].surname[0]}`
                      : '??'}
                  </Text>
                </View>
                <Text style={styles.studentName}>{getStudentName(studentId)}</Text>
                <Text style={styles.planCount}>
                  {studentPlans.length} pian{studentPlans.length === 1 ? 'o' : 'i'}
                </Text>
              </View>

              {studentPlans.map((plan) => {
                const planStartDate = plan.startDate instanceof Date ? plan.startDate : new Date(plan.startDate);
                const planEndDate = plan.endDate instanceof Date ? plan.endDate : new Date(plan.endDate);
                const hasValidDates = !isNaN(planStartDate.getTime()) && !isNaN(planEndDate.getTime());
                const planIncludedLessons = plan.includedLessons ?? 0;
                const planUsedLessons = plan.usedLessons ?? 0;
                const planIncludedConsultations = plan.includedConsultations ?? 0;
                const planUsedConsultations = plan.usedConsultations ?? 0;

                return (
                  <TouchableOpacity
                    key={plan.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (canEdit) {
                        openEditModal(plan);
                      }
                    }}
                  >
                    <Card style={styles.planCard}>
                      {/* Plan header: amount + badge + delete */}
                      <View style={styles.planHeader}>
                        <View style={styles.planInfo}>
                          <Text style={styles.planAmount}>
                            {'€'}{plan.totalAmount.toFixed(2)}
                          </Text>
                          <Badge
                            status={getPaymentTypeBadgeStatus(plan.paymentType)}
                            label={getPaymentTypeLabel(plan.paymentType)}
                          />
                        </View>
                        {canEdit && (
                          <TouchableOpacity
                            onPress={() => handleDelete(plan.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="trash-outline" size={20} color={colors.error} />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Date percorso */}
                      {hasValidDates && (
                        <View style={styles.planDetailRow}>
                          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                          <Text style={styles.planDetailText}>
                            Date percorso: {formatDate(planStartDate)} - {formatDate(planEndDate)}
                          </Text>
                        </View>
                      )}

                      {/* Monthly course details */}
                      {plan.paymentType === 'monthly_course' && (
                        <View style={styles.planCourseDetails}>
                          {plan.courseType ? (
                            <View style={styles.planDetailRow}>
                              <Ionicons name="barbell-outline" size={14} color={colors.accent} />
                              <Text style={styles.planDetailText}>
                                Corso: {plan.courseType}
                              </Text>
                            </View>
                          ) : null}
                          {plan.subscriptionType ? (
                            <View style={styles.planDetailRow}>
                              <Ionicons name="repeat-outline" size={14} color={colors.accent} />
                              <Text style={styles.planDetailText}>
                                Abbonamento: {plan.subscriptionType}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      )}

                      {/* Lezioni progress */}
                      {planIncludedLessons > 0 && (
                        <View style={styles.planProgressSection}>
                          <View style={styles.planProgressHeader}>
                            <Ionicons name="body-outline" size={14} color={colors.info} />
                            <Text style={styles.planProgressLabel}>Lezioni</Text>
                            <Text style={styles.planProgressValue}>
                              {planUsedLessons} / {planIncludedLessons}
                            </Text>
                          </View>
                          <ProgressBar
                            used={planUsedLessons}
                            total={planIncludedLessons}
                            color={colors.info}
                          />
                        </View>
                      )}

                      {/* Consulenze progress */}
                      {planIncludedConsultations > 0 && (
                        <View style={styles.planProgressSection}>
                          <View style={styles.planProgressHeader}>
                            <Ionicons name="nutrition-outline" size={14} color={colors.warning} />
                            <Text style={styles.planProgressLabel}>Consulenze</Text>
                            <Text style={styles.planProgressValue}>
                              {planUsedConsultations} / {planIncludedConsultations}
                            </Text>
                          </View>
                          <ProgressBar
                            used={planUsedConsultations}
                            total={planIncludedConsultations}
                            color={colors.warning}
                          />
                        </View>
                      )}

                      {/* Installments summary */}
                      {plan.installments.map((inst) => {
                        const dueDate = inst.dueDate instanceof Date ? inst.dueDate : new Date(inst.dueDate as unknown as string);
                        const days = daysUntilDate(new Date(dueDate));
                        const isUpcoming = inst.status !== 'paid' && days >= 0 && days <= 15;

                        return (
                          <View key={inst.id} style={styles.installmentRow}>
                            <View style={styles.installmentInfo}>
                              <Badge status={inst.status} />
                              <Text style={styles.installmentAmount}>
                                {'€'}{inst.amount.toFixed(2)}
                              </Text>
                              <Text style={styles.installmentDate}>
                                {formatDate(dueDate)}
                              </Text>
                            </View>

                            <View style={styles.installmentActions}>
                              {isUpcoming && (
                                <>
                                  <TouchableOpacity
                                    style={[styles.reminderBtn, { backgroundColor: '#25D366' + '20' }]}
                                    onPress={() => sendReminder('whatsapp', plan.studentId, inst)}
                                  >
                                    <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[styles.reminderBtn, { backgroundColor: colors.info + '20' }]}
                                    onPress={() => sendReminder('sms', plan.studentId, inst)}
                                  >
                                    <Ionicons name="chatbubble-outline" size={14} color={colors.info} />
                                  </TouchableOpacity>
                                </>
                              )}
                              {inst.status !== 'paid' && (
                                <TouchableOpacity
                                  style={styles.paidBtn}
                                  onPress={() => handleMarkPaid(plan.id, inst.id, plan.installments)}
                                >
                                  <Ionicons name="checkmark" size={14} color={colors.success} />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ================================================================= */}
      {/* CREATE MODAL                                                      */}
      {/* ================================================================= */}
      {canEdit && (
        <Modal
          visible={showCreateModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ModalHeader
                title="Nuovo Piano di Pagamento"
                onClose={() => setShowCreateModal(false)}
              />

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Student picker */}
                <StudentSearchPicker
                  students={students}
                  selectedId={selectedStudentId}
                  onSelect={setSelectedStudentId}
                  label="Seleziona Allievo"
                />

                {/* Total amount */}
                <InputField
                  label="Importo Totale (€)"
                  value={totalAmount}
                  onChangeText={setTotalAmount}
                  keyboardType="decimal-pad"
                  placeholder="Es. 500.00"
                />

                {/* Payment type */}
                <Text style={styles.fieldLabel}>Tipo di Pagamento</Text>
                <View style={styles.typeRow}>
                  {renderPaymentTypeOption('full', 'Unica soluzione', paymentType, setPaymentType)}
                  {renderPaymentTypeOption('installment', 'Rate', paymentType, setPaymentType)}
                </View>
                <View style={styles.typeRowSingle}>
                  {renderPaymentTypeOption('monthly_course', 'Corso Mensile', paymentType, setPaymentType)}
                </View>

                {/* Monthly course fields */}
                {paymentType === 'monthly_course' && (
                  <>
                    <InputField
                      label="Tipo di Corso"
                      value={courseType}
                      onChangeText={setCourseType}
                      placeholder="Es. Pilates, CrossFit, Yoga"
                    />
                    <InputField
                      label="Tipo di Abbonamento"
                      value={subscriptionType}
                      onChangeText={setSubscriptionType}
                      placeholder="Es. Mensile, Trimestrale, Semestrale"
                    />
                  </>
                )}

                {/* Due date (full/monthly_course) or first due date (installment) */}
                <InputField
                  label={
                    paymentType === 'installment'
                      ? 'Data Prima Rata (gg/mm/aaaa)'
                      : 'Data Scadenza (gg/mm/aaaa)'
                  }
                  value={firstDueDate}
                  onChangeText={setFirstDueDate}
                  placeholder="Es. 01/06/2026"
                />

                {/* Installment config */}
                {paymentType === 'installment' && (
                  <>
                    <InputField
                      label="Numero di Rate"
                      value={numInstallments}
                      onChangeText={setNumInstallments}
                      keyboardType="number-pad"
                      placeholder="Es. 3"
                    />

                    {/* Custom installment overrides */}
                    {customInstallments.length > 0 && (
                      <View style={styles.installmentsPreview}>
                        <Text style={styles.fieldLabel}>Dettaglio Rate</Text>
                        {customInstallments.map((ci, index) => (
                          <View key={index} style={styles.customInstRow}>
                            <Text style={styles.customInstLabel}>Rata {index + 1}</Text>
                            <View style={styles.customInstFields}>
                              <View style={styles.customInstField}>
                                <Text style={styles.customInstFieldLabel}>{'€'}</Text>
                                <InputField
                                  label=""
                                  value={ci.amount}
                                  onChangeText={(val) => {
                                    const updated = [...customInstallments];
                                    updated[index] = { ...updated[index], amount: val };
                                    setCustomInstallments(updated);
                                  }}
                                  keyboardType="decimal-pad"
                                  style={styles.customInstInput}
                                />
                              </View>
                              <View style={styles.customInstField}>
                                <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                                <InputField
                                  label=""
                                  value={ci.dueDate}
                                  onChangeText={(val) => {
                                    const updated = [...customInstallments];
                                    updated[index] = { ...updated[index], dueDate: val };
                                    setCustomInstallments(updated);
                                  }}
                                  style={styles.customInstInput}
                                />
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                )}

                {/* Separator */}
                <View style={styles.formDivider} />
                <Text style={styles.fieldLabel}>Dettagli Percorso</Text>

                {/* Included lessons */}
                <InputField
                  label="Lezioni incluse"
                  value={includedLessons}
                  onChangeText={setIncludedLessons}
                  keyboardType="number-pad"
                  placeholder="Es. 12"
                />

                {/* Included consultations */}
                <InputField
                  label="Consulenze nutrizionali incluse"
                  value={includedConsultations}
                  onChangeText={setIncludedConsultations}
                  keyboardType="number-pad"
                  placeholder="Es. 3"
                />

                {/* Start date */}
                <InputField
                  label="Data inizio percorso (gg/mm/aaaa)"
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="Es. 01/06/2026"
                />

                {/* End date */}
                <InputField
                  label="Data fine percorso (gg/mm/aaaa)"
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="Es. 31/12/2026"
                />

                <View style={styles.modalActions}>
                  <Button
                    title="Salva Piano"
                    onPress={handleCreate}
                    loading={saving}
                    icon={<Ionicons name="checkmark-circle" size={18} color="#fff" />}
                  />
                  <Button
                    title="Annulla"
                    variant="outline"
                    onPress={() => setShowCreateModal(false)}
                  />
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* ================================================================= */}
      {/* EDIT MODAL (view-only for managers)                               */}
      {/* ================================================================= */}
      <Modal
        visible={!!editingPlan}
        animationType="slide"
        transparent
        onRequestClose={() => setEditingPlan(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ModalHeader
              title={
                canEdit
                  ? `Modifica Piano - ${editingPlan ? getStudentName(editingPlan.studentId) : ''}`
                  : `Piano - ${editingPlan ? getStudentName(editingPlan.studentId) : ''}`
              }
              onClose={() => setEditingPlan(null)}
            />

            {editingPlan && (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <InputField
                  label="Importo Totale (€)"
                  value={editTotalAmount}
                  onChangeText={setEditTotalAmount}
                  keyboardType="decimal-pad"
                  editable={canEdit}
                />

                {/* Payment type (read-only display) */}
                <View style={styles.editPaymentTypeRow}>
                  <Text style={styles.fieldLabel}>Tipo di Pagamento</Text>
                  <Badge
                    status={getPaymentTypeBadgeStatus(editPaymentType)}
                    label={getPaymentTypeLabel(editPaymentType)}
                  />
                </View>

                {/* Separator - percorso details */}
                <View style={styles.formDivider} />
                <Text style={styles.fieldLabel}>Dettagli Percorso</Text>

                {/* Date percorso */}
                <View style={styles.editFieldRow}>
                  <View style={{ flex: 1 }}>
                    <InputField
                      label="Data inizio (gg/mm/aaaa)"
                      value={editStartDate}
                      onChangeText={setEditStartDate}
                      editable={canEdit}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <InputField
                      label="Data fine (gg/mm/aaaa)"
                      value={editEndDate}
                      onChangeText={setEditEndDate}
                      editable={canEdit}
                    />
                  </View>
                </View>

                {/* Included lessons */}
                <View style={styles.editFieldRow}>
                  <View style={{ flex: 1 }}>
                    <InputField
                      label="Lezioni incluse"
                      value={editIncludedLessons}
                      onChangeText={setEditIncludedLessons}
                      keyboardType="number-pad"
                      editable={canEdit}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.readOnlyField}>
                      <Text style={styles.readOnlyLabel}>Lezioni utilizzate</Text>
                      <Text style={styles.readOnlyValue}>{editUsedLessons}</Text>
                    </View>
                  </View>
                </View>

                {/* Lezioni progress bar in edit */}
                {parseInt(editIncludedLessons, 10) > 0 && (
                  <ProgressBar
                    used={editUsedLessons}
                    total={parseInt(editIncludedLessons, 10)}
                    color={colors.info}
                  />
                )}

                {/* Included consultations */}
                <View style={styles.editFieldRow}>
                  <View style={{ flex: 1 }}>
                    <InputField
                      label="Consulenze incluse"
                      value={editIncludedConsultations}
                      onChangeText={setEditIncludedConsultations}
                      keyboardType="number-pad"
                      editable={canEdit}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.readOnlyField}>
                      <Text style={styles.readOnlyLabel}>Consulenze utilizzate</Text>
                      <Text style={styles.readOnlyValue}>{editUsedConsultations}</Text>
                    </View>
                  </View>
                </View>

                {/* Consulenze progress bar in edit */}
                {parseInt(editIncludedConsultations, 10) > 0 && (
                  <ProgressBar
                    used={editUsedConsultations}
                    total={parseInt(editIncludedConsultations, 10)}
                    color={colors.warning}
                  />
                )}

                {/* Monthly course fields */}
                {editPaymentType === 'monthly_course' && (
                  <>
                    <View style={styles.formDivider} />
                    <Text style={styles.fieldLabel}>Dettagli Corso Mensile</Text>
                    <InputField
                      label="Tipo di Corso"
                      value={editCourseType}
                      onChangeText={setEditCourseType}
                      placeholder="Es. Pilates, CrossFit, Yoga"
                      editable={canEdit}
                    />
                    <InputField
                      label="Tipo di Abbonamento"
                      value={editSubscriptionType}
                      onChangeText={setEditSubscriptionType}
                      placeholder="Es. Mensile, Trimestrale, Semestrale"
                      editable={canEdit}
                    />
                  </>
                )}

                {/* Installments */}
                <View style={styles.formDivider} />
                <Text style={styles.fieldLabel}>Rate</Text>
                {editInstallments.map((inst, index) => {
                  const isPaid = inst.status === 'paid';
                  return (
                    <Card
                      key={inst.id}
                      style={{
                        ...styles.editInstCard,
                        ...(isPaid ? styles.editInstCardPaid : {}),
                      }}
                    >
                      <View style={styles.editInstHeader}>
                        <Text style={styles.editInstTitle}>
                          Rata {index + 1}
                        </Text>
                        <Badge status={inst.status} />
                      </View>

                      <View style={styles.editInstFields}>
                        <View style={{ flex: 1 }}>
                          <InputField
                            label="Importo (€)"
                            value={editCustomAmounts[index] || ''}
                            onChangeText={(val) => {
                              const updated = [...editCustomAmounts];
                              updated[index] = val;
                              setEditCustomAmounts(updated);
                            }}
                            keyboardType="decimal-pad"
                            editable={!isPaid && canEdit}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <InputField
                            label="Scadenza"
                            value={editCustomDates[index] || ''}
                            onChangeText={(val) => {
                              const updated = [...editCustomDates];
                              updated[index] = val;
                              setEditCustomDates(updated);
                            }}
                            editable={!isPaid && canEdit}
                          />
                        </View>
                      </View>

                      {isPaid && inst.paidDate && (
                        <Text style={styles.paidDateText}>
                          Pagato il {formatDate(inst.paidDate)}
                        </Text>
                      )}

                      {!isPaid && (
                        <View style={styles.editInstActions}>
                          <TouchableOpacity
                            style={styles.markPaidButton}
                            onPress={() => handleMarkPaid(editingPlan.id, inst.id, editingPlan.installments)}
                          >
                            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                            <Text style={styles.markPaidText}>Segna come pagato</Text>
                          </TouchableOpacity>

                          {/* Reminder buttons */}
                          {(() => {
                            const dueDate = inst.dueDate instanceof Date ? inst.dueDate : new Date(inst.dueDate as unknown as string);
                            const days = daysUntilDate(new Date(dueDate));
                            if (days >= 0 && days <= 15) {
                              return (
                                <View style={styles.editReminderRow}>
                                  <TouchableOpacity
                                    style={[styles.reminderBtnLarge, { backgroundColor: '#25D366' + '20' }]}
                                    onPress={() => sendReminder('whatsapp', editingPlan.studentId, inst)}
                                  >
                                    <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                                    <Text style={[styles.reminderBtnText, { color: '#25D366' }]}>WhatsApp</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[styles.reminderBtnLarge, { backgroundColor: colors.info + '20' }]}
                                    onPress={() => sendReminder('sms', editingPlan.studentId, inst)}
                                  >
                                    <Ionicons name="chatbubble-outline" size={16} color={colors.info} />
                                    <Text style={[styles.reminderBtnText, { color: colors.info }]}>SMS</Text>
                                  </TouchableOpacity>
                                </View>
                              );
                            }
                            return null;
                          })()}
                        </View>
                      )}
                    </Card>
                  );
                })}

                <View style={styles.modalActions}>
                  {canEdit && (
                    <>
                      <Button
                        title="Salva Modifiche"
                        onPress={handleSaveEdit}
                        loading={saving}
                        icon={<Ionicons name="save" size={18} color="#fff" />}
                      />
                      <Button
                        title="Elimina Piano"
                        variant="danger"
                        onPress={() => handleDelete(editingPlan.id)}
                        icon={<Ionicons name="trash" size={18} color="#fff" />}
                      />
                    </>
                  )}
                  <Button
                    title="Chiudi"
                    variant="outline"
                    onPress={() => setEditingPlan(null)}
                  />
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'web' ? spacing.lg : 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  addButton: {
    padding: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
  },

  // Student group
  studentGroup: {
    marginBottom: spacing.lg,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  studentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentAvatarText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.accent,
  },
  studentName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  planCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  // Plan card
  planCard: {
    marginBottom: spacing.xs,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  planAmount: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },

  // Plan detail rows
  planDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  planDetailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  planCourseDetails: {
    marginBottom: spacing.xs,
  },

  // Progress bars on plan cards
  planProgressSection: {
    marginBottom: spacing.sm,
  },
  planProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  planProgressLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  planProgressValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  progressBarContainer: {
    marginBottom: spacing.xs,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: colors.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Installment row
  installmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  installmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  installmentAmount: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  installmentDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  installmentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reminderBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paidBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },

  // Form fields
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  typeRowSingle: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
  },
  typeOptionActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '10',
  },
  typeOptionText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  typeOptionTextActive: {
    color: colors.accent,
  },

  // Form divider
  formDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.lg,
  },

  // Custom installments
  installmentsPreview: {
    marginBottom: spacing.md,
  },
  customInstRow: {
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  customInstLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  customInstFields: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  customInstField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  customInstFieldLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  customInstInput: {
    marginBottom: 0,
  },

  // Modal actions
  modalActions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },

  // Edit modal
  editPaymentTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  editFieldRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  readOnlyField: {
    marginBottom: spacing.md,
  },
  readOnlyLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  readOnlyValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },

  editInstCard: {
    marginBottom: spacing.sm,
  },
  editInstCardPaid: {
    opacity: 0.7,
  },
  editInstHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  editInstTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  editInstFields: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  paidDateText: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  editInstActions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  markPaidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  markPaidText: {
    fontSize: fontSize.md,
    color: colors.success,
    fontWeight: '600',
  },
  editReminderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  reminderBtnLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    flex: 1,
    justifyContent: 'center',
  },
  reminderBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
