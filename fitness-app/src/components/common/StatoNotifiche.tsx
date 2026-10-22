import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { Card } from './Card';
import {
  statoAvvisi, spiegaAvvisi, StatoAvvisi, CondizioniAvvisi,
} from '../../domain/avvisoTelefono';
import {
  condizioniAvvisi, registerPushToken, requestNotificationPermissions,
  showLocalNotification,
} from '../../services/pushNotificationService';

// ============================================================
// IL PANNELLO CHE DICE SE IL TELEFONO È RAGGIUNGIBILE
// ------------------------------------------------------------
// 22 ottobre 2026. La notifica sul telefono è stata pubblicata e non
// è arrivata, e dal telefono non si leggeva niente: né se il permesso
// c'era, né se l'iscrizione era riuscita, né perché no.
//
// Un guasto invisibile si ripara una volta sola: facendolo vedere.
//
// Qui non si nasconde niente. Se non funziona lo dice, dice perché, e
// dice il prossimo gesto — e il pulsante fa QUEL gesto, non un
// generico «riprova».
// ============================================================

interface Props {
  userId: string;
}

export const StatoNotifiche: React.FC<Props> = ({ userId }) => {
  const [condizioni, setCondizioni] = useState<CondizioniAvvisi | null>(null);
  const [lavorando, setLavorando] = useState(false);

  const rileggi = useCallback(async () => {
    try {
      setCondizioni(await condizioniAvvisi());
    } catch {
      setCondizioni(null);
    }
  }, []);

  useEffect(() => { rileggi(); }, [rileggi]);

  const stato: StatoAvvisi | null = condizioni ? statoAvvisi(condizioni) : null;
  const spiegazione = stato ? spiegaAvvisi(stato) : null;

  const agisci = async () => {
    if (!stato) return;
    setLavorando(true);
    try {
      if (stato === 'attivi') {
        // La prova si manda a sé stessi dal telefono: dice che il
        // sistema la sa mostrare. Non dimostra che il server
        // raggiunge il telefono, e non si finge il contrario.
        await showLocalNotification(
          'Prova riuscita',
          'Le notifiche su questo telefono funzionano.'
        );
      } else {
        if (stato === 'permesso_mancante') await requestNotificationPermissions();
        await registerPushToken(userId);
      }
      await rileggi();
    } finally {
      setLavorando(false);
    }
  };

  if (!spiegazione || !stato) {
    return (
      <Card variant="elevated">
        <View style={stili.testa}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
          <Text style={stili.titolo}>Controllo le notifiche…</Text>
        </View>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <View style={stili.testa}>
        <Ionicons
          name={spiegazione.buono ? 'notifications' : 'notifications-off-outline'}
          size={20}
          color={spiegazione.buono ? colors.success : colors.warning}
        />
        <Text style={stili.titolo}>{spiegazione.titolo}</Text>
      </View>

      <Text style={stili.testo}>{spiegazione.testo}</Text>

      {!!spiegazione.azione && (
        <TouchableOpacity
          style={stili.pulsante}
          onPress={agisci}
          disabled={lavorando}
          accessibilityLabel={spiegazione.azione}
        >
          {lavorando ? (
            <ActivityIndicator size="small" color={colors.textOnAccent} />
          ) : (
            <Text style={stili.pulsanteTxt}>{spiegazione.azione}</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Quello che la macchina vede davvero. Tre parole in piccolo,
          e la prossima volta che qualcosa non arriva si legge da qui
          invece di tirare a indovinare. */}
      <Text style={stili.dettaglio}>
        permesso {condizioni?.permesso || '—'}
        {' · '}app {condizioni?.installata ? 'installata' : 'dal browser'}
        {' · '}indirizzo {condizioni?.indirizzo ? 'registrato' : 'assente'}
      </Text>

      {/* Il motivo vero, con le parole del sistema. Brutto da
          leggere, e senza di questo restano quattro ipotesi e nessun
          modo di sceglierne una. */}
      {!!condizioni?.motivo && (
        <Text style={stili.motivo} selectable>{condizioni.motivo}</Text>
      )}
    </Card>
  );
};

const stili = StyleSheet.create({
  testa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  titolo: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  testo: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  pulsante: {
    marginTop: spacing.md,
    minHeight: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  pulsanteTxt: {
    color: colors.textOnAccent,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  motivo: {
    marginTop: spacing.xs,
    color: colors.warning,
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  dettaglio: {
    marginTop: spacing.md,
    color: colors.textLight,
    fontSize: fontSize.xs,
  },
});
