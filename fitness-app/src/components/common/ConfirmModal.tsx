// ============================================================
// LA CONFERMA, DENTRO L'APP
// ------------------------------------------------------------
// Fino a oggi ogni conferma passava da `window.confirm` del browser.
// Funziona quasi sempre, e quando non funziona non si vede niente:
// si tocca il cestino e non succede nulla. Un dialogo del browser può
// essere soppresso — app installata sulla schermata home, pagina
// tornata in primo piano, impostazione del telefono — e in quel caso
// `confirm()` risponde «no» da solo, senza chiedere a nessuno.
//
// Il risultato è il peggiore possibile: una funzione che esiste, un
// pulsante che si tocca, e nessuna risposta. Chi ci prova conclude
// che l'app è rotta, e ha ragione.
//
// Questa conferma è un pezzo dell'app: se il pulsante riceve il tocco,
// il riquadro compare. Non c'è niente in mezzo che possa dire no al
// posto di chi guarda.
// ============================================================

import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';

export interface ConfirmModalProps {
  visible: boolean;
  titolo: string;
  messaggio: string;
  /** il testo del pulsante che fa la cosa: «Elimina», «Annulla la seduta» */
  azione: string;
  /** rosso quando l'azione non si torna indietro */
  distruttiva?: boolean;
  /** il motivo, quando il tentativo precedente è andato storto */
  errore?: string | null;
  inCorso?: boolean;
  onConferma: () => void;
  onAnnulla: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  titolo,
  messaggio,
  azione,
  distruttiva,
  errore,
  inCorso,
  onConferma,
  onAnnulla,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onAnnulla}>
    <View style={styles.sfondo}>
      <View style={styles.riquadro}>
        <Text style={styles.titolo}>{titolo}</Text>
        <Text style={styles.messaggio}>{messaggio}</Text>

        {!!errore && (
          <View style={styles.erroreBox}>
            <Text style={styles.erroreTxt}>{errore}</Text>
          </View>
        )}

        <View style={styles.pulsanti}>
          <TouchableOpacity
            style={styles.annulla}
            onPress={onAnnulla}
            disabled={inCorso}
            accessibilityLabel="Non fare niente"
          >
            <Text style={styles.annullaTxt}>No</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              ...styles.conferma,
              ...(distruttiva ? { backgroundColor: colors.error } : {}),
              ...(inCorso ? { opacity: 0.6 } : {}),
            }}
            onPress={onConferma}
            disabled={inCorso}
            accessibilityLabel={azione}
          >
            <Text style={styles.confermaTxt}>{inCorso ? 'Un attimo…' : azione}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  sfondo: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  riquadro: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  titolo: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  messaggio: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  erroreBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  erroreTxt: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 18,
  },
  pulsanti: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  // 48 px di altezza: un pulsante di conferma si deve prendere al
  // primo colpo, soprattutto quello che NON fa niente.
  annulla: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  annullaTxt: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  conferma: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.accent,
  },
  confermaTxt: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.white,
  },
});
