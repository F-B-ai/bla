import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../../config/theme';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { ModalHeader } from '../../../components/common/ModalHeader';
import { Badge } from '../../../components/common/Badge';
import { PaymentPlan, PaymentType, TrainingSession, FinancialTransaction } from '../../../types';

const toSafeDate = (d: unknown): Date => {
  if (d instanceof Date) return d;
  if (d && typeof d === 'object' && 'toDate' in d && typeof (d as any).toDate === 'function')
    return (d as any).toDate();
  if (d && typeof d === 'object' && 'seconds' in d)
    return new Date((d as any).seconds * 1000);
  return new Date(d as string);
};

export interface PlanDetailModalProps {
  detailPlan: PaymentPlan | null;
  onClose: () => void;
  canEdit: boolean;
  getStudentName: (studentId: string) => string;
  getPaymentTypeBadgeStatus: (type: PaymentType) => 'paid' | 'pending' | 'overdue';
  getPaymentTypeLabel: (type: PaymentType) => string;
  formatDate: (date: Date | string | any) => string;
  detailLoading: boolean;
  detailSessions: TrainingSession[];
  detailTransactions: FinancialTransaction[];
  onEditPlan: (plan: PaymentPlan) => void;
  printPlanDetail: (data: any) => void;
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

export const PlanDetailModal: React.FC<PlanDetailModalProps> = ({
  detailPlan,
  onClose,
  canEdit,
  getStudentName,
  getPaymentTypeBadgeStatus,
  getPaymentTypeLabel,
  formatDate,
  detailLoading,
  detailSessions,
  detailTransactions,
  onEditPlan,
  printPlanDetail,
  printPaymentReceipt,
}) => {
  return (
    <Modal
      visible={!!detailPlan}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ModalHeader
            title={detailPlan ? getStudentName(detailPlan.studentId) : ''}
            onClose={onClose}
          />

          {detailPlan && (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Plan overview */}
              <Card style={styles.detailOverviewCard}>
                <View style={styles.planHeader}>
                  <View style={styles.planInfo}>
                    <Text style={styles.planAmount}>€{detailPlan.totalAmount.toFixed(2)}</Text>
                    <Badge
                      status={getPaymentTypeBadgeStatus(detailPlan.paymentType)}
                      label={getPaymentTypeLabel(detailPlan.paymentType)}
                    />
                  </View>
                </View>
                <View style={styles.planDetailRow}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.planDetailText}>
                    {formatDate(detailPlan.startDate)} - {formatDate(detailPlan.endDate)}
                  </Text>
                </View>
                {(detailPlan.includedLessons ?? 0) > 0 && (
                  <View style={styles.planProgressSection}>
                    <View style={styles.planProgressHeader}>
                      <Ionicons name="body-outline" size={14} color={colors.info} />
                      <Text style={styles.planProgressLabel}>Lezioni</Text>
                      <Text style={styles.planProgressValue}>
                        {detailPlan.usedLessons ?? 0} / {detailPlan.includedLessons}
                      </Text>
                    </View>
                    <ProgressBar used={detailPlan.usedLessons ?? 0} total={detailPlan.includedLessons} color={colors.info} />
                  </View>
                )}
                {(detailPlan.includedConsultations ?? 0) > 0 && (
                  <View style={styles.planProgressSection}>
                    <View style={styles.planProgressHeader}>
                      <Ionicons name="nutrition-outline" size={14} color={colors.warning} />
                      <Text style={styles.planProgressLabel}>Consulenze</Text>
                      <Text style={styles.planProgressValue}>
                        {detailPlan.usedConsultations ?? 0} / {detailPlan.includedConsultations}
                      </Text>
                    </View>
                    <ProgressBar used={detailPlan.usedConsultations ?? 0} total={detailPlan.includedConsultations} color={colors.warning} />
                  </View>
                )}
              </Card>

              {detailLoading ? (
                <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: spacing.lg }} />
              ) : (
                <>
                  {/* Completed sessions */}
                  <View style={styles.formDivider} />
                  <Text style={styles.fieldLabel}>
                    Lezioni completate ({detailSessions.length})
                  </Text>
                  {detailSessions.length === 0 ? (
                    <Card variant="outlined">
                      <Text style={styles.detailEmptyText}>Nessuna lezione completata</Text>
                    </Card>
                  ) : (
                    detailSessions.map((session) => {
                      const sDate = toSafeDate(session.date);
                      return (
                        <Card key={session.id} variant="outlined" style={styles.detailItemCard}>
                          <View style={styles.detailItemRow}>
                            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                            <View style={styles.detailItemInfo}>
                              <Text style={styles.detailItemTitle}>
                                {formatDate(sDate)}
                              </Text>
                              <Text style={styles.detailItemSubtitle}>
                                {session.startTime} - {session.endTime}
                                {session.sessionCost ? ` · €${session.sessionCost.toFixed(2)}` : ''}
                              </Text>
                            </View>
                            {session.status === 'cancelled_late' && (
                              <Badge status="overdue" label="Cancellazione tardiva" />
                            )}
                          </View>
                          {session.notes ? (
                            <Text style={styles.detailItemNotes}>{session.notes}</Text>
                          ) : null}
                        </Card>
                      );
                    })
                  )}

                  {/* Financial transactions */}
                  <View style={styles.formDivider} />
                  <Text style={styles.fieldLabel}>
                    Movimenti economici ({detailTransactions.length})
                  </Text>
                  {detailTransactions.length === 0 ? (
                    <Card variant="outlined">
                      <Text style={styles.detailEmptyText}>Nessun movimento registrato</Text>
                    </Card>
                  ) : (
                    detailTransactions.map((t) => {
                      const tDate = toSafeDate(t.date);
                      const isIncome = t.type === 'income';
                      return (
                        <Card key={t.id} variant="outlined" style={styles.detailItemCard}>
                          <View style={styles.detailItemRow}>
                            <Ionicons
                              name={isIncome ? 'arrow-down-circle' : 'arrow-up-circle'}
                              size={18}
                              color={isIncome ? colors.success : colors.error}
                            />
                            <View style={styles.detailItemInfo}>
                              <Text style={styles.detailItemTitle}>
                                {isIncome ? '+' : '-'}€{t.amount.toFixed(2)}
                              </Text>
                              <Text style={styles.detailItemSubtitle}>
                                {formatDate(tDate)} · {t.description || t.category}
                              </Text>
                            </View>
                          </View>
                        </Card>
                      );
                    })
                  )}

                  {/* Installments status */}
                  <View style={styles.formDivider} />
                  <Text style={styles.fieldLabel}>
                    Rate ({detailPlan.installments.length})
                  </Text>
                  {detailPlan.installments.map((inst) => {
                    const dueDate = toSafeDate(inst.dueDate);
                    return (
                      <Card key={inst.id} variant="outlined" style={styles.detailItemCard}>
                        <View style={styles.detailItemRow}>
                          <Ionicons
                            name={inst.status === 'paid' ? 'checkmark-circle' : inst.status === 'overdue' ? 'alert-circle' : 'time-outline'}
                            size={18}
                            color={inst.status === 'paid' ? colors.success : inst.status === 'overdue' ? colors.error : colors.warning}
                          />
                          <View style={styles.detailItemInfo}>
                            <Text style={styles.detailItemTitle}>€{inst.amount.toFixed(2)}</Text>
                            <Text style={styles.detailItemSubtitle}>
                              Scadenza: {formatDate(dueDate)}
                              {inst.status === 'paid' && inst.paidDate ? ` · Pagato il ${formatDate(inst.paidDate)}` : ''}
                            </Text>
                          </View>
                          <Badge status={inst.status} />
                          {inst.status === 'paid' && Platform.OS === 'web' && (
                            <TouchableOpacity
                              style={[styles.reminderBtn, { backgroundColor: colors.accent + '20', marginLeft: 8 }]}
                              onPress={() => {
                                const instIndex = detailPlan.installments.findIndex((i) => i.id === inst.id);
                                printPaymentReceipt({
                                  studentName: detailPlan.studentId ? getStudentName(detailPlan.studentId) : '',
                                  amount: inst.amount,
                                  dueDate: inst.dueDate,
                                  paidDate: inst.paidDate ?? new Date(),
                                  installmentNumber: instIndex + 1,
                                  totalInstallments: detailPlan.installments.length,
                                  planTotal: detailPlan.totalAmount ?? inst.amount,
                                  paymentType: detailPlan.paymentType ?? 'full',
                                  planStartDate: detailPlan.startDate,
                                  planEndDate: detailPlan.endDate,
                                });
                              }}
                            >
                              <Ionicons name="receipt-outline" size={14} color={colors.accent} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </Card>
                    );
                  })}
                </>
              )}

              <View style={styles.modalActions}>
                {Platform.OS === 'web' && (
                  <Button
                    title="Stampa"
                    variant="outline"
                    onPress={() => {
                      printPlanDetail({
                        studentName: getStudentName(detailPlan.studentId),
                        plan: detailPlan,
                        sessions: detailSessions,
                        transactions: detailTransactions,
                      });
                    }}
                    icon={<Ionicons name="print-outline" size={18} color={colors.accent} />}
                  />
                )}
                {canEdit && (
                  <Button
                    title="Modifica Piano"
                    onPress={() => {
                      const plan = detailPlan;
                      onClose();
                      onEditPlan(plan);
                    }}
                    icon={<Ionicons name="create-outline" size={18} color="#fff" />}
                  />
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
  detailOverviewCard: {
    marginBottom: spacing.xs,
  },
  detailEmptyText: {
    color: colors.textLight,
    textAlign: 'center',
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
  },
  detailItemCard: {
    marginBottom: spacing.xs,
  },
  detailItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailItemInfo: {
    flex: 1,
  },
  detailItemTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  detailItemSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  detailItemNotes: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    fontStyle: 'italic',
    marginTop: spacing.xs,
    marginLeft: spacing.xl + spacing.sm,
  },
  reminderBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
