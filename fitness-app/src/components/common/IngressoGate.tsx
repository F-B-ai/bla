// ============================================================
// LA PRIMA COSA CHE L'APP CHIEDE
// ------------------------------------------------------------
// In un anno il registro degli ingressi ha raccolto 109 righe. Non
// perché la gente non entri: perché il check-in era una voce in un
// menu, e una voce in un menu la trova solo chi la sta cercando.
//
// Questa schermata si mette davanti a tutto quando l'app si apre, e
// fa una domanda sola. Le regole di quando chiederla — e di quando
// stare zitta — stanno in domain/ingresso.ts, perché una domanda che
// torna quando non serve è peggio di una domanda che non arriva: la
// prima insegna a ignorare, la seconda si può ancora rimediare.
//
// Non blocca nessuno: «Non sono in studio» è una risposta vera, e chi
// la dà entra nell'app come prima. Si richiede qualche ora dopo.
// ============================================================

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { testoIngresso, deveChiedereIngresso, ORE_RINVIO } from '../../domain/ingresso';
import { ultimoIngressoDiOggi } from '../../services/checkinService';
import { CheckinScreen } from '../../screens/student/CheckinScreen';

const CHIAVE_RINVIO = 'essere-ingresso-rinviato';

/** Quando questa persona ha detto «non sono in studio». */
export const leggiRinvio = (userId: string): Date | null => {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return null;
  try {
    const v = localStorage.getItem(`${CHIAVE_RINVIO}_${userId}`);
    if (!v) return null;
    const d = new Date(Number(v));
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
};

export const segnaRinvio = (userId: string): void => {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(`${CHIAVE_RINVIO}_${userId}`, String(Date.now()));
  } catch { /* in privata non si scrive: si richiederà, ed è il male minore */ }
};

export interface IngressoGateProps {
  userId: string;
  ruolo?: string | null;
  /** chiuso: registrato, rinviato, o non dovuto */
  onChiuso: () => void;
}

export const IngressoGate: React.FC<IngressoGateProps> = ({ userId, ruolo, onChiuso }) => {
  const [stato, setStato] = useState<'controllo' | 'chiedo' | 'scansione'>('controllo');
  const t = testoIngresso(ruolo);

  useEffect(() => {
    let vivo = true;
    ultimoIngressoDiOggi(userId)
      .then((ultimo) => {
        if (!vivo) return;
        const esito = deveChiedereIngresso({
          ruolo,
          ultimoIngresso: ultimo,
          rinviatoIl: leggiRinvio(userId),
        });
        if (esito.chiedere) setStato('chiedo');
        else onChiuso();
      })
      .catch(() => {
        // Non si è potuto leggere se è già entrato. In dubbio NON si
        // chiede: insistere con chi ha già registrato è il modo più
        // rapido di far odiare questa schermata, e un ingresso
        // mancato si recupera, la fiducia molto meno.
        if (vivo) onChiuso();
      });
    return () => { vivo = false; };
  }, [userId, ruolo, onChiuso]);

  if (stato === 'controllo') return null;

  if (stato === 'scansione') {
    return (
      <View style={styles.pieno}>
        <View style={styles.barraScansione}>
          <TouchableOpacity
            style={styles.indietro}
            onPress={() => setStato('chiedo')}
            accessibilityLabel="Torna indietro"
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
            <Text style={styles.indietroTxt}>Indietro</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.indietro}
            onPress={onChiuso}
            accessibilityLabel="Ho finito"
          >
            <Text style={styles.indietroTxt}>Fatto</Text>
          </TouchableOpacity>
        </View>
        {/* La schermata di check-in che esiste già, con la fotocamera,
            la foto del QR e il codice da digitare. Non se ne scrive
            una seconda: due lettori di QR che divergono sono il
            prossimo guasto. */}
        <View style={{ flex: 1 }}>
          <CheckinScreen />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.pieno}>
      <View style={styles.centro}>
        <View style={styles.cerchio}>
          <Ionicons name="qr-code-outline" size={44} color={colors.accent} />
        </View>
        <Text style={styles.titolo}>{t.titolo}</Text>
        <Text style={styles.sottotitolo}>{t.sottotitolo}</Text>

        <TouchableOpacity
          style={styles.principale}
          onPress={() => setStato('scansione')}
          accessibilityLabel={t.azione}
        >
          <Ionicons name="qr-code" size={20} color={colors.white} />
          <Text style={styles.principaleTxt}>{t.azione}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondario}
          onPress={() => { segnaRinvio(userId); onChiuso(); }}
          accessibilityLabel={t.rinvio}
        >
          <Text style={styles.secondarioTxt}>{t.rinvio}</Text>
        </TouchableOpacity>

        <Text style={styles.piccolo}>
          Se non sei in studio non chiedo più niente per {ORE_RINVIO} ore.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pieno: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.primary,
    zIndex: 900,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  cerchio: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  titolo: {
    fontSize: fontSize.hero,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  sottotitolo: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  // 56 px: è il pulsante che deve prendere un dito al primo colpo,
  // spesso con il telefono in una mano sola sulla porta dello studio.
  principale: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.accent,
  },
  principaleTxt: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.white,
  },
  secondario: {
    alignSelf: 'stretch',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  secondarioTxt: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  piccolo: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  barraScansione: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'web' ? spacing.md : 48,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  indietro: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: spacing.sm,
  },
  indietroTxt: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
});
