import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../../config/theme';
import { Button } from '../../../components/common/Button';
import { InputField } from '../../../components/common/InputField';
import { ModalHeader } from '../../../components/common/ModalHeader';
import { StudentSearchPicker } from '../../../components/common/StudentSearchPicker';
import { PaymentType, Student } from '../../../types';

export interface CreatePlanModalProps {
  visible: boolean;
  onClose: () => void;
  students: Student[];
  selectedStudentId: string;
  onSelectStudent: (id: string) => void;
  totalAmount: string;
  onChangeTotalAmount: (val: string) => void;
  paymentType: PaymentType;
  onChangePaymentType: (t: PaymentType) => void;
  courseType: string;
  onChangeCourseType: (val: string) => void;
  subscriptionType: string;
  onChangeSubscriptionType: (val: string) => void;
  firstDueDate: string;
  onChangeFirstDueDate: (val: string) => void;
  numInstallments: string;
  onChangeNumInstallments: (val: string) => void;
  customInstallments: { amount: string; dueDate: string }[];
  onChangeCustomInstallments: (items: { amount: string; dueDate: string }[]) => void;
  includedLessons: string;
  onChangeIncludedLessons: (val: string) => void;
  includedConsultations: string;
  onChangeIncludedConsultations: (val: string) => void;
  startDate: string;
  onChangeStartDate: (val: string) => void;
  endDate: string;
  onChangeEndDate: (val: string) => void;
  saving: boolean;
  onSave: () => void;
}

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

export const CreatePlanModal: React.FC<CreatePlanModalProps> = ({
  visible,
  onClose,
  students,
  selectedStudentId,
  onSelectStudent,
  totalAmount,
  onChangeTotalAmount,
  paymentType,
  onChangePaymentType,
  courseType,
  onChangeCourseType,
  subscriptionType,
  onChangeSubscriptionType,
  firstDueDate,
  onChangeFirstDueDate,
  numInstallments,
  onChangeNumInstallments,
  customInstallments,
  onChangeCustomInstallments,
  includedLessons,
  onChangeIncludedLessons,
  includedConsultations,
  onChangeIncludedConsultations,
  startDate,
  onChangeStartDate,
  endDate,
  onChangeEndDate,
  saving,
  onSave,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ModalHeader
            title="Nuovo Piano di Pagamento"
            onClose={onClose}
          />

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Student picker */}
            <StudentSearchPicker
              students={students}
              selectedId={selectedStudentId}
              onSelect={onSelectStudent}
              label="Seleziona Allievo"
            />

            {/* Total amount */}
            <InputField
              label="Importo Totale (€)"
              value={totalAmount}
              onChangeText={onChangeTotalAmount}
              keyboardType="decimal-pad"
              placeholder="Es. 500.00"
            />

            {/* Payment type */}
            <Text style={styles.fieldLabel}>Tipo di Pagamento</Text>
            <View style={styles.typeRow}>
              {renderPaymentTypeOption('full', 'Unica soluzione', paymentType, onChangePaymentType)}
              {renderPaymentTypeOption('installment', 'Rate', paymentType, onChangePaymentType)}
            </View>
            <View style={styles.typeRowSingle}>
              {renderPaymentTypeOption('monthly_course', 'Corso Mensile', paymentType, onChangePaymentType)}
            </View>

            {/* Monthly course fields */}
            {paymentType === 'monthly_course' && (
              <>
                <InputField
                  label="Tipo di Corso"
                  value={courseType}
                  onChangeText={onChangeCourseType}
                  placeholder="Es. Pilates, CrossFit, Yoga"
                />
                <InputField
                  label="Tipo di Abbonamento"
                  value={subscriptionType}
                  onChangeText={onChangeSubscriptionType}
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
              onChangeText={onChangeFirstDueDate}
              placeholder="Es. 01/06/2026"
            />

            {/* Installment config */}
            {paymentType === 'installment' && (
              <>
                <InputField
                  label="Numero di Rate"
                  value={numInstallments}
                  onChangeText={onChangeNumInstallments}
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
                                onChangeCustomInstallments(updated);
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
                                onChangeCustomInstallments(updated);
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
              onChangeText={onChangeIncludedLessons}
              keyboardType="number-pad"
              placeholder="Es. 12"
            />

            {/* Included consultations */}
            <InputField
              label="Consulenze nutrizionali incluse"
              value={includedConsultations}
              onChangeText={onChangeIncludedConsultations}
              keyboardType="number-pad"
              placeholder="Es. 3"
            />

            {/* Start date */}
            <InputField
              label="Data inizio percorso (gg/mm/aaaa)"
              value={startDate}
              onChangeText={onChangeStartDate}
              placeholder="Es. 01/06/2026"
            />

            {/* End date */}
            <InputField
              label="Data fine percorso (gg/mm/aaaa)"
              value={endDate}
              onChangeText={onChangeEndDate}
              placeholder="Es. 31/12/2026"
            />

            <View style={styles.modalActions}>
              <Button
                title="Salva Piano"
                onPress={onSave}
                loading={saving}
                icon={<Ionicons name="checkmark-circle" size={18} color={colors.white} />}
              />
              <Button
                title="Annulla"
                variant="outline"
                onPress={onClose}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayDark,
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
  formDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.lg,
  },
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
  modalActions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
});
