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
  const { user } = useAuth();

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

  // Edit form state
  const [editTotalAmount, setEditTotalAmount] = useState('');
  const [editInstallments, setEditInstallments] = useState<Installment[]>([]);
  const [editCustomAmounts, setEditCustomAmounts] = useState<string[]>([]);
  const [editCustomDates, setEditCustomDates] = useState<string[]>([]);

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

  // -----------------------------------------------------------------------
  // Stats
  // -----------------------------------------------------------------------
  const stats = useMemo(() => {
    let totalOutstanding = 0;
    let totalPaid = 0;
    let overdueCount = 0;

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
    }

    return { totalOutstanding, totalPaid, overdueCount };
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

    let installments: Installment[] = [];

    if (paymentType === 'full') {
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
  };

  const handleSaveEdit = async () => {
    if (!editingPlan) return;
    const amount = parseFloat(editTotalAmount);
    if (!amount || amount <= 0) {
      crossAlert('Errore', 'Inserisci un importo valido.');
      return;
    }

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
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetCreateForm();
            setShowCreateModal(true);
          }}
        >
          <Ionicons name="add-circle" size={28} color={colors.accent} />
        </TouchableOpacity>
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
          <StatCard
            title="Scadute"
            value={stats.overdueCount}
            color={colors.error}
            icon={<Ionicons name="alert-circle-outline" size={14} color={colors.error} />}
          />
        </View>

        {/* Plans grouped by student */}
        {Object.keys(plansByStudent).length === 0 ? (
          <Card>
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>Nessun piano di pagamento</Text>
              <Text style={styles.emptySubtext}>
                Tocca il pulsante + per creare un nuovo piano
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

              {studentPlans.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  activeOpacity={0.7}
                  onPress={() => openEditModal(plan)}
                >
                  <Card style={styles.planCard}>
                    <View style={styles.planHeader}>
                      <View style={styles.planInfo}>
                        <Text style={styles.planAmount}>
                          {'€'}{plan.totalAmount.toFixed(2)}
                        </Text>
                        <Badge
                          status={plan.paymentType === 'full' ? 'paid' : 'pending'}
                          label={plan.paymentType === 'full' ? 'Unica soluzione' : `${plan.installments.length} rate`}
                        />
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDelete(plan.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>

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
              ))}
            </View>
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ================================================================= */}
      {/* CREATE MODAL                                                      */}
      {/* ================================================================= */}
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
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    paymentType === 'full' && styles.typeOptionActive,
                  ]}
                  onPress={() => setPaymentType('full')}
                >
                  <Ionicons
                    name={paymentType === 'full' ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={paymentType === 'full' ? colors.accent : colors.textLight}
                  />
                  <Text
                    style={[
                      styles.typeOptionText,
                      paymentType === 'full' && styles.typeOptionTextActive,
                    ]}
                  >
                    Unica soluzione
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    paymentType === 'installment' && styles.typeOptionActive,
                  ]}
                  onPress={() => setPaymentType('installment')}
                >
                  <Ionicons
                    name={paymentType === 'installment' ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={paymentType === 'installment' ? colors.accent : colors.textLight}
                  />
                  <Text
                    style={[
                      styles.typeOptionText,
                      paymentType === 'installment' && styles.typeOptionTextActive,
                    ]}
                  >
                    Rate
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Due date (full) or first due date (installment) */}
              <InputField
                label={paymentType === 'full' ? 'Data Scadenza (gg/mm/aaaa)' : 'Data Prima Rata (gg/mm/aaaa)'}
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

      {/* ================================================================= */}
      {/* EDIT MODAL                                                        */}
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
              title={`Modifica Piano - ${editingPlan ? getStudentName(editingPlan.studentId) : ''}`}
              onClose={() => setEditingPlan(null)}
            />

            {editingPlan && (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <InputField
                  label="Importo Totale (€)"
                  value={editTotalAmount}
                  onChangeText={setEditTotalAmount}
                  keyboardType="decimal-pad"
                />

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
                            editable={!isPaid}
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
                            editable={!isPaid}
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
    marginBottom: spacing.lg,
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
