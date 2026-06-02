import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../../config/theme';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { InputField } from '../../../components/common/InputField';
import { ModalHeader } from '../../../components/common/ModalHeader';
import { Badge } from '../../../components/common/Badge';
import { PaymentPlan, Installment, PaymentType, PaymentStatus } from '../../../types';

export interface EditPlanModalProps {
  editingPlan: PaymentPlan | null;
  onClose: () => void;
  canEdit: boolean;
  getStudentName: (studentId: string) => string;
  editTotalAmount: string;
  onChangeEditTotalAmount: (val: string) => void;
  editPaymentType: PaymentType;
  getPaymentTypeBadgeStatus: (type: PaymentType) => 'paid' | 'pending' | 'overdue';
  getPaymentTypeLabel: (type: PaymentType) => string;
  editStartDate: string;
  onChangeEditStartDate: (val: string) => void;
  editEndDate: string;
  onChangeEditEndDate: (val: string) => void;
  editIncludedLessons: string;
  onChangeEditIncludedLessons: (val: string) => void;
  editUsedLessons: number;
  editIncludedConsultations: string;
  onChangeEditIncludedConsultations: (val: string) => void;
  editUsedConsultations: number;
  editCourseType: string;
  onChangeEditCourseType: (val: string) => void;
  editSubscriptionType: string;
  onChangeEditSubscriptionType: (val: string) => void;
  editInstallments: Installment[];
  editCustomAmounts: string[];
  onChangeEditCustomAmounts: (amounts: string[]) => void;
  editCustomDates: string[];
  onChangeEditCustomDates: (dates: string[]) => void;
  formatDate: (date: Date | string | any) => string;
  daysUntilDate: (date: Date | string | any) => number;
  handleMarkPaid: (planId: string, installmentId: string, installments: Installment[], studentId?: string) => void;
  sendReminder: (type: 'whatsapp' | 'sms', studentId: string, installment: Installment) => void;
  handleSaveEdit: () => void;
  handleDelete: (planId: string) => void;
  saving: boolean;
  printPaymentReceipt: (data: any) => void;
}

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

export const EditPlanModal: React.FC<EditPlanModalProps> = ({
  editingPlan,
  onClose,
  canEdit,
  getStudentName,
  editTotalAmount,
  onChangeEditTotalAmount,
  editPaymentType,
  getPaymentTypeBadgeStatus,
  getPaymentTypeLabel,
  editStartDate,
  onChangeEditStartDate,
  editEndDate,
  onChangeEditEndDate,
  editIncludedLessons,
  onChangeEditIncludedLessons,
  editUsedLessons,
  editIncludedConsultations,
  onChangeEditIncludedConsultations,
  editUsedConsultations,
  editCourseType,
  onChangeEditCourseType,
  editSubscriptionType,
  onChangeEditSubscriptionType,
  editInstallments,
  editCustomAmounts,
  onChangeEditCustomAmounts,
  editCustomDates,
  onChangeEditCustomDates,
  formatDate,
  daysUntilDate,
  handleMarkPaid,
  sendReminder,
  handleSaveEdit,
  handleDelete,
  saving,
  printPaymentReceipt,
}) => {
  return (
    <Modal
      visible={!!editingPlan}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ModalHeader
            title={
              canEdit
                ? `Modifica Piano - ${editingPlan ? getStudentName(editingPlan.studentId) : ''}`
                : `Piano - ${editingPlan ? getStudentName(editingPlan.studentId) : ''}`
            }
            onClose={onClose}
          />

          {editingPlan && (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <InputField
                label="Importo Totale (€)"
                value={editTotalAmount}
                onChangeText={onChangeEditTotalAmount}
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
                    onChangeText={onChangeEditStartDate}
                    editable={canEdit}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Data fine (gg/mm/aaaa)"
                    value={editEndDate}
                    onChangeText={onChangeEditEndDate}
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
                    onChangeText={onChangeEditIncludedLessons}
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
                    onChangeText={onChangeEditIncludedConsultations}
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
                    onChangeText={onChangeEditCourseType}
                    placeholder="Es. Pilates, CrossFit, Yoga"
                    editable={canEdit}
                  />
                  <InputField
                    label="Tipo di Abbonamento"
                    value={editSubscriptionType}
                    onChangeText={onChangeEditSubscriptionType}
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
                            onChangeEditCustomAmounts(updated);
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
                            onChangeEditCustomDates(updated);
                          }}
                          editable={!isPaid && canEdit}
                        />
                      </View>
                    </View>

                    {isPaid && inst.paidDate && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.paidDateText}>
                          Pagato il {formatDate(inst.paidDate)}
                        </Text>
                        {Platform.OS === 'web' && (
                          <TouchableOpacity
                            style={[styles.reminderBtnLarge, { backgroundColor: colors.accent + '20' }]}
                            onPress={() => {
                              const instIndex = editingPlan.installments.findIndex((i) => i.id === inst.id);
                              printPaymentReceipt({
                                studentName: editingPlan.studentId ? getStudentName(editingPlan.studentId) : '',
                                amount: inst.amount,
                                dueDate: inst.dueDate,
                                paidDate: inst.paidDate ?? new Date(),
                                installmentNumber: instIndex + 1,
                                totalInstallments: editingPlan.installments.length,
                                planTotal: editingPlan.totalAmount ?? inst.amount,
                                paymentType: editingPlan.paymentType ?? 'full',
                                planStartDate: editingPlan.startDate,
                                planEndDate: editingPlan.endDate,
                              });
                            }}
                          >
                            <Ionicons name="receipt-outline" size={18} color={colors.accent} />
                            <Text style={[styles.reminderBtnText, { color: colors.accent }]}>Ricevuta</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {!isPaid && (
                      <View style={styles.editInstActions}>
                        <TouchableOpacity
                          style={styles.markPaidButton}
                          onPress={() => handleMarkPaid(editingPlan.id, inst.id, editingPlan.installments, editingPlan.studentId)}
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
                  onPress={onClose}
                />
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.lg,
  },
  modalActions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
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
