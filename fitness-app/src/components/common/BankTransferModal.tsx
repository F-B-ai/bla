import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { ModalHeader } from './ModalHeader';
import { Button } from './Button';
import { crossAlert } from '../../utils/alert';
import { createNotification } from '../../services/notificationService';
import { doc, updateDoc, getDocs, query, where, collection } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Installment, BankDetails } from '../../types';

interface BankTransferModalProps {
  visible: boolean;
  onClose: () => void;
  installment: Installment | null;
  planId: string;
  studentName: string;
  bankDetails: BankDetails | null;
  allInstallments: Installment[];
  installmentIndex: number;
  onTransferMarked?: () => void;
}

export const BankTransferModal: React.FC<BankTransferModalProps> = ({
  visible,
  onClose,
  installment,
  planId,
  studentName,
  bankDetails,
  allInstallments,
  installmentIndex,
  onTransferMarked,
}) => {
  const [loading, setLoading] = useState(false);

  const handleCopyIban = async () => {
    if (!bankDetails?.iban) return;
    try {
      await Clipboard.setStringAsync(bankDetails.iban);
      crossAlert('Copiato', 'IBAN copiato negli appunti.');
    } catch {
      crossAlert('Errore', 'Impossibile copiare l\'IBAN.');
    }
  };

  const handleMarkTransfer = async () => {
    if (!installment || !planId) return;

    setLoading(true);
    try {
      // Update the installment in Firestore
      const updatedInstallments = allInstallments.map((inst) =>
        inst.id === installment.id
          ? { ...inst, transferPending: true, transferMarkedAt: new Date() }
          : inst
      );

      await updateDoc(doc(db, 'paymentPlans', planId), {
        installments: updatedInstallments,
      });

      // Find owner to send notification
      const usersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'owner')
      );
      const usersSnapshot = await getDocs(usersQuery);
      if (!usersSnapshot.empty) {
        const ownerDoc = usersSnapshot.docs[0];
        await createNotification(
          ownerDoc.id,
          'payment_due',
          'Bonifico segnalato',
          `${studentName} ha segnalato il pagamento di €${installment.amount.toLocaleString()} tramite bonifico.`
        );
      }

      crossAlert('Fatto', 'Pagamento segnalato con successo! Il titolare verificherà il bonifico.');
      onTransferMarked?.();
      onClose();
    } catch (err) {
      console.error('Error marking transfer:', err);
      crossAlert('Errore', 'Impossibile segnalare il pagamento. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const causale = installment
    ? `Rata ${installmentIndex + 1} - ${studentName}`
    : '';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <ModalHeader title="Pagamento con Bonifico" onClose={onClose} />

            {!bankDetails ? (
              <View style={styles.noBankDetails}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.warning} />
                <Text style={styles.noBankDetailsText}>
                  Il titolare non ha ancora configurato i dati bancari
                </Text>
                <Text style={styles.noBankDetailsSubtext}>
                  Contatta il tuo coach per ricevere i dati per il bonifico.
                </Text>
              </View>
            ) : (
              <>
                {/* Bank Details Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Dati Bancari</Text>

                  {/* IBAN */}
                  <View style={styles.detailRow}>
                    <View style={styles.detailLabelRow}>
                      <Ionicons name="card-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.detailLabel}>IBAN</Text>
                    </View>
                    <View style={styles.ibanRow}>
                      <Text style={styles.ibanText} selectable>
                        {bankDetails.iban}
                      </Text>
                      <TouchableOpacity
                        style={styles.copyBtn}
                        onPress={handleCopyIban}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="copy-outline" size={16} color={colors.accent} />
                        <Text style={styles.copyBtnText}>Copia IBAN</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Account Holder */}
                  <View style={styles.detailRow}>
                    <View style={styles.detailLabelRow}>
                      <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.detailLabel}>Intestatario</Text>
                    </View>
                    <Text style={styles.detailValue}>{bankDetails.accountHolder}</Text>
                  </View>

                  {/* Bank Name */}
                  <View style={styles.detailRow}>
                    <View style={styles.detailLabelRow}>
                      <Ionicons name="business-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.detailLabel}>Banca</Text>
                    </View>
                    <Text style={styles.detailValue}>{bankDetails.bankName}</Text>
                  </View>
                </View>

                {/* Payment Info Section */}
                {installment && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Dettagli Pagamento</Text>

                    <View style={styles.detailRow}>
                      <View style={styles.detailLabelRow}>
                        <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.detailLabel}>Importo</Text>
                      </View>
                      <Text style={styles.amountValue}>
                        {'€'}{installment.amount.toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <View style={styles.detailLabelRow}>
                        <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.detailLabel}>Causale suggerita</Text>
                      </View>
                      <Text style={styles.detailValue}>{causale}</Text>
                    </View>
                  </View>
                )}

                {/* Transfer Pending Warning */}
                {installment?.transferPending && (
                  <View style={styles.pendingBanner}>
                    <Ionicons name="time-outline" size={20} color={colors.warning} />
                    <Text style={styles.pendingBannerText}>
                      Hai già segnalato questo pagamento. In attesa di conferma dal titolare.
                    </Text>
                  </View>
                )}

                {/* Action Button */}
                {!installment?.transferPending && (
                  <View style={styles.actionSection}>
                    <Button
                      title={loading ? 'Invio in corso...' : 'Ho effettuato il pagamento'}
                      onPress={handleMarkTransfer}
                      loading={loading}
                      disabled={loading}
                      icon={<Ionicons name="checkmark-circle-outline" size={18} color={colors.textOnAccent} />}
                    />
                    <Text style={styles.disclaimer}>
                      Premendo questo pulsante confermi di aver effettuato il bonifico.
                      Il titolare verificherà il pagamento e lo confermerà.
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
    ...shadows.large,
  },
  section: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  detailRow: {
    marginBottom: spacing.md,
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '600',
  },
  ibanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  ibanText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
    flex: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  copyBtnText: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: '700',
  },
  amountValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.accent,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.warning + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  pendingBannerText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    fontWeight: '600',
    flex: 1,
  },
  actionSection: {
    marginBottom: spacing.lg,
  },
  disclaimer: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 16,
  },
  noBankDetails: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  noBankDetailsText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  noBankDetailsSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
