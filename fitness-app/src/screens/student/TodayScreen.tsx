import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { crossAlert } from '../../utils/alert';
import { getTodayCheck, saveDailyCheck } from '../../services/wellnessService';
import { WELLNESS_QUESTIONS } from '../../data/wellnessQuestions';
import { getActiveWorkoutPlan } from '../../services/programService';
import { getMyTwinState } from '../../services/twinStateService';
import { getTodayBreathing } from '../../services/breathingService';
import { computeOggi, Oggi, Tono } from '../../domain/oggi';
import { TwinView } from '../../components/twin/TwinView';

// ============================================================
// OGGI — il gemello, non il login.
// ------------------------------------------------------------
// Disciplina: silenzio, UNA cosa per schermata. Tre strati:
// lo stato (una riga), il perché (l'evidenza), l'azione (una).
// Il Metodo è presente ogni giorno, anche quando il gemello
// non sa ancora nulla di te.
// ============================================================

const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

const tonoColor = (t: Tono): string => {
  switch (t) {
    case 'pronto': return colors.success;
    case 'misura': return colors.warning;
    case 'recupero': return colors.info;
    default: return colors.accent;
  }
};

export function TodayScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [oggi, setOggi] = useState<Oggi | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // L'ascolto si fa QUI: le domande non stanno più a un tap di distanza
  const [risposte, setRisposte] = useState<Record<string, number>>({});
  const [salvando, setSalvando] = useState(false);
  const [fattoOggi, setFattoOggi] = useState(false);

  const carica = useCallback(async () => {
    if (!user) return;
    const [twin, check, piano, respiro] = await Promise.all([
      getMyTwinState(user.id).catch(() => null),
      getTodayCheck(user.id).catch(() => null),
      getActiveWorkoutPlan(user.id).catch(() => null),
      getTodayBreathing(user.id).catch(() => null),
    ]);
    setOggi(computeOggi({
      date: new Date(),
      twin,
      checkinOggi: Boolean(check),
      haSchedaAttiva: Boolean(piano),
      allenatoOggi: false,
      respiratoOggi: Boolean(respiro),
      nome: user.name,
    }));
    setFattoOggi(Boolean(check));
  }, [user]);

  const tutteRisposte = WELLNESS_QUESTIONS.every((q) => risposte[q.key]);

  const salvaAscolto = async () => {
    if (!user || !tutteRisposte) return;
    setSalvando(true);
    try {
      const nome = `${user.name || ''}`.trim() || user.email || 'Allievo';
      await saveDailyCheck(user.id, nome, {
        sleep: risposte.sleep, energy: risposte.energy,
        mood: risposte.mood, soreness: risposte.soreness,
      });
      setFattoOggi(true);
      await carica();
    } catch {
      crossAlert('Errore', 'Non sono riuscito a salvare. Riprova.');
    } finally {
      setSalvando(false);
    }
  };

  useFocusEffect(useCallback(() => {
    let vivo = true;
    setLoading(true);
    carica().finally(() => { if (vivo) setLoading(false); });
    return () => { vivo = false; };
  }, [carica]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carica();
    setRefreshing(false);
  }, [carica]);

  // L'azione del dominio → destinazione reale nell'app
  const vaiAllAzione = () => {
    if (!oggi) return;
    switch (oggi.azione.route) {
      case 'Checkin':                       // l'ascolto vive dentro Stato ESSĒRE
        navigation.navigate('StatoEssere'); break;
      case 'Respiro':
        navigation.navigate('Respiro'); break;
      case 'Scheda':
        navigation.navigate('Allenati', { screen: 'Scheda' }); break;
      case 'Storia':
      default:
        navigation.navigate('Progressi', { screen: 'Storia' }); break;
    }
  };

  if (loading || !oggi) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const d = new Date();
  const accent = tonoColor(oggi.tono);

  return (
    <ScrollView
      style={s.wrap}
      contentContainerStyle={[s.content, { paddingTop: insets.top + spacing.xl }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      {/* il giorno, sottovoce */}
      <Text style={s.giorno}>
        {GIORNI[d.getDay()]} {d.getDate()}
      </Text>

      {/* ——— IL GEMELLO: respira col tuo stato ——— */}
      <View style={s.twinBox}>
        <TwinView size={268} tono={oggi.tono} />
      </View>

      {/* ——— LO STATO ——— */}
      <View style={s.statoBlocco}>
        <View style={[s.polso, { backgroundColor: accent }]} />
        <Text style={s.stato}>{oggi.stato}</Text>
      </View>

      {/* ——— IL PERCHÉ ——— */}
      {oggi.perche.length > 0 && (
        <View style={s.perche}>
          {oggi.perche.map((p, i) => (
            <Text key={i} style={s.perchéRiga}>{p}</Text>
          ))}
        </View>
      )}

      {/* ——— L'AZIONE: una sola ——— */}
      <TouchableOpacity
        style={[s.azione, { borderColor: accent + '55' }]}
        onPress={vaiAllAzione}
        activeOpacity={0.85}
      >
        <View style={{ flex: 1 }}>
          <Text style={[s.azioneTitolo, { color: accent }]}>{oggi.azione.titolo}</Text>
          <Text style={s.azioneSub}>{oggi.azione.sottotitolo}</Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color={accent} />
      </TouchableOpacity>

      {/* ——— LE DOMANDE: l'ascolto si fa qui, non altrove ——— */}
      {!fattoOggi && (
        <View style={s.ascolto}>
          <Text style={s.ascoltoTitolo}>Come stai, oggi?</Text>
          {WELLNESS_QUESTIONS.map((q) => (
            <View key={q.key} style={s.domanda}>
              <Text style={s.domandaLabel}>{q.label}</Text>
              <View style={s.scala}>
                {[1, 2, 3, 4, 5].map((v) => {
                  const on = risposte[q.key] === v;
                  return (
                    <TouchableOpacity
                      key={v}
                      style={[s.pallino, on && s.pallinoOn]}
                      onPress={() => setRisposte((p) => ({ ...p, [q.key]: v }))}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.pallinoTxt, on && s.pallinoTxtOn]}>{v}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={s.estremi}>
                <Text style={s.estremo}>{q.low}</Text>
                <Text style={s.estremo}>{q.high}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={[s.salva, !tutteRisposte && { opacity: 0.35 }]}
            onPress={salvaAscolto}
            disabled={!tutteRisposte || salvando}
            activeOpacity={0.85}
          >
            {salvando
              ? <ActivityIndicator color={colors.textOnAccent} />
              : <Text style={s.salvaTxt}>Registra come stai</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* ——— LE PORTE: poche, quelle di ogni giorno ——— */}
      <View style={s.porte}>
        {[
          // Il check-in apre la giornata in palestra: senza, l'allenamento
          // non parte. Sta per primo perché è il primo gesto.
          { icona: 'qr-code-outline' as const, testo: 'Check-in', vai: () => navigation.navigate('CheckinPalestra') },
          { icona: 'fitness-outline' as const, testo: 'Scheda', vai: () => navigation.navigate('Allenati', { screen: 'Scheda' }) },
          { icona: 'calendar-outline' as const, testo: 'Agenda', vai: () => navigation.navigate('Agenda') },
          { icona: 'analytics-outline' as const, testo: 'Storico', vai: () => navigation.navigate('Allenati', { screen: 'Storico' }) },
        ].map((p) => (
          <TouchableOpacity key={p.testo} style={s.porta2} onPress={p.vai} activeOpacity={0.8}>
            <Ionicons name={p.icona} size={20} color={colors.accent} />
            <Text style={s.porta2Txt}>{p.testo}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ——— IL METODO: presente ogni giorno, sottovoce ——— */}
      <View style={s.metodo}>
        <Text style={s.metodoEtichetta}>OGGI · {oggi.dimensione.nome.toUpperCase()}</Text>
        <Text style={s.metodoDomanda}>{oggi.dimensione.domanda}</Text>
      </View>

      {/* la porta verso la storia, discreta */}
      <TouchableOpacity
        style={s.porta}
        onPress={() => navigation.navigate('Progressi', { screen: 'Storia' })}
      >
        <Text style={s.portaTxt}>La tua storia</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },

  giorno: {
    color: colors.textSecondary, fontSize: fontSize.xs,
    letterSpacing: 2, textTransform: 'uppercase',
  },

  twinBox: { alignItems: 'center', marginTop: spacing.md },
  statoBlocco: { marginTop: spacing.lg, flexDirection: 'row', alignItems: 'flex-start' },
  polso: { width: 3, height: 44, borderRadius: 2, marginRight: spacing.md, marginTop: 6 },
  stato: {
    flex: 1, color: colors.text, fontSize: 34, lineHeight: 41,
    fontWeight: '300', letterSpacing: -0.5,
  },

  perche: { marginTop: spacing.lg, gap: 6, paddingLeft: spacing.md + 3 },
  perchéRiga: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 21 },

  azione: {
    marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2, paddingHorizontal: spacing.md,
    backgroundColor: colors.surface, gap: spacing.sm,
  },
  azioneTitolo: { fontSize: fontSize.md, fontWeight: '700' },
  azioneSub: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 3, lineHeight: 19 },

  metodo: { marginTop: spacing.xl * 1.4 },
  metodoEtichetta: {
    color: colors.accent, fontSize: 10, letterSpacing: 2.5, fontWeight: '700',
  },
  metodoDomanda: {
    color: colors.text, fontSize: fontSize.md, marginTop: 6,
    fontWeight: '300', lineHeight: 24,
  },

  ascolto: {
    marginTop: spacing.xl, backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md,
  },
  ascoltoTitolo: {
    color: colors.text, fontSize: fontSize.md, fontWeight: '600',
    marginBottom: spacing.sm,
  },
  domanda: { marginBottom: spacing.md },
  domandaLabel: { color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: 6 },
  scala: { flexDirection: 'row', gap: 8 },
  pallino: {
    flex: 1, height: 40, borderRadius: borderRadius.sm, borderWidth: 1,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
  },
  pallinoOn: { borderColor: colors.accent, backgroundColor: colors.accent },
  pallinoTxt: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '600' },
  pallinoTxtOn: { color: colors.textOnAccent, fontWeight: '700' },
  estremi: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  estremo: { color: colors.textLight, fontSize: fontSize.xs },
  salva: {
    backgroundColor: colors.accent, borderRadius: borderRadius.md,
    paddingVertical: 13, alignItems: 'center', marginTop: spacing.xs,
  },
  salvaTxt: { color: colors.textOnAccent, fontWeight: '700', fontSize: fontSize.sm },

  porte: {
    marginTop: spacing.lg, flexDirection: 'row', gap: spacing.sm,
  },
  porta2: {
    flex: 1, alignItems: 'center', gap: 6, paddingVertical: spacing.md,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  porta2Txt: { color: colors.textSecondary, fontSize: fontSize.xs, textAlign: 'center' },

  porta: {
    marginTop: spacing.xl * 1.4, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 4, paddingVertical: spacing.sm,
  },
  portaTxt: { color: colors.textSecondary, fontSize: fontSize.sm },
});

export default TodayScreen;
