import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Animated, Easing, StyleSheet, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { crossAlert } from '../../utils/alert';
import {
  PRATICHE, Pratica, statoAl, StatoRespiro, respiriTotali,
} from '../../domain/breathing';
import { saveBreathingSession } from '../../services/breathingService';

// ============================================================
// RESPIRO — l'atto.
// Una cosa sola sullo schermo: il respiro. Niente numeri, niente
// grafici, niente punteggi. Il cerchio si apre quando inspiri e
// si chiude quando espiri: il corpo segue una forma, non un testo.
// ============================================================

type Fase = 'scelta' | 'pratica' | 'fine';

const scalaPerFase = (key: string): number => {
  switch (key) {
    case 'inspira': return 1;
    case 'trattieni': return 1;
    case 'espira': return 0.52;
    default: return 0.52; // pausa
  }
};

export function BreathScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [fase, setFase] = useState<Fase>('scelta');
  const [pratica, setPratica] = useState<Pratica>(PRATICHE[0]);
  const [durata, setDurata] = useState<number>(PRATICHE[0].durataDefault);
  const [stato, setStato] = useState<StatoRespiro | null>(null);
  const [minutiFatti, setMinutiFatti] = useState(0);

  const inizio = useRef<number>(0);
  const scala = useRef(new Animated.Value(0.52)).current;
  const faseCorrente = useRef<string>('');

  // --- il tempo scorre qui, il dominio dice solo dove sei ---
  useEffect(() => {
    if (fase !== 'pratica') return;
    inizio.current = Date.now();
    faseCorrente.current = '';
    const id = setInterval(() => {
      const trascorsi = (Date.now() - inizio.current) / 1000;
      const s = statoAl(pratica, trascorsi, durata);
      setStato(s);
      if (s.finita) {
        clearInterval(id);
        setMinutiFatti(durata);
        setFase('fine');
      }
    }, 100);
    return () => clearInterval(id);
  }, [fase, pratica, durata]);

  // --- il cerchio segue la fase, non il cronometro ---
  useEffect(() => {
    if (!stato || fase !== 'pratica') return;
    if (faseCorrente.current === stato.fase.key) return;
    faseCorrente.current = stato.fase.key;
    Animated.timing(scala, {
      toValue: scalaPerFase(stato.fase.key),
      duration: stato.fase.secondi * 1000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [stato, fase, scala]);

  const interrompi = useCallback(() => {
    const trascorsi = (Date.now() - inizio.current) / 1000;
    setMinutiFatti(trascorsi / 60);
    setFase('fine');
  }, []);

  const salva = useCallback(async () => {
    if (!user) return;
    try {
      await saveBreathingSession({
        studentId: user.id,
        praticaId: pratica.id,
        durataMinuti: durata,
        minutiEffettivi: minutiFatti,
        completata: minutiFatti >= durata,
      });
      navigation.goBack();
    } catch {
      crossAlert('Errore', 'Non sono riuscito a salvare la sessione');
    }
  }, [user, pratica, durata, minutiFatti, navigation]);

  // ==================== SCELTA ====================
  if (fase === 'scelta') {
    return (
      <ScrollView
        style={s.wrap}
        contentContainerStyle={[s.content, { paddingTop: insets.top + spacing.lg }]}
      >
        <Text style={s.occhiello}>RESPIRO</Text>
        <Text style={s.titolo}>Da dove parte{'\n'}il tuo respiro?</Text>

        <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          {PRATICHE.map((p) => {
            const on = p.id === pratica.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[s.pratica, on && s.praticaOn]}
                onPress={() => {
                  setPratica(p);
                  if (!p.durate.includes(durata)) setDurata(p.durataDefault);
                }}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.praticaNome, on && { color: colors.accent }]}>{p.nome}</Text>
                  <Text style={s.praticaIntento}>{p.intento}</Text>
                </View>
                <Text style={s.praticaRitmo}>
                  {p.ciclo.map((f) => f.secondi).join('·')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={s.etichettaDurata}>PER QUANTO</Text>
        <View style={s.durate}>
          {pratica.durate.map((m) => (
            <TouchableOpacity
              key={m}
              style={[s.durataChip, m === durata && s.durataChipOn]}
              onPress={() => setDurata(m)}
            >
              <Text style={[s.durataTxt, m === durata && s.durataTxtOn]}>{m} min</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.inizia} onPress={() => setFase('pratica')} activeOpacity={0.85}>
          <Text style={s.iniziaTxt}>Comincia</Text>
        </TouchableOpacity>

        <Text style={s.nota}>
          Pratica di respiro consapevole. Non è una terapia e non sostituisce
          alcuna indicazione sanitaria. Se hai problemi respiratori o cardiaci,
          o sei in gravidanza, parlane prima col tuo medico.
        </Text>
      </ScrollView>
    );
  }

  // ==================== PRATICA ====================
  if (fase === 'pratica') {
    return (
      <View style={[s.wrap, s.centro]}>
        <TouchableOpacity
          style={[s.chiudi, { top: insets.top + spacing.sm }]}
          onPress={interrompi}
        >
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={s.cerchioBox}>
          <Animated.View style={[s.alone, { transform: [{ scale: scala }] }]} />
          <Animated.View style={[s.cerchio, { transform: [{ scale: scala }] }]} />
          <View style={s.cerchioTesto}>
            <Text style={s.faseTxt}>{stato?.etichetta || ''}</Text>
            <Text style={s.contoTxt}>{stato?.secondiRimanenti ?? ''}</Text>
          </View>
        </View>

        <View style={s.barraBox}>
          <View style={[s.barra, { width: `${(stato?.avanzamentoSessione ?? 0) * 100}%` }]} />
        </View>
      </View>
    );
  }

  // ==================== FINE ====================
  const completata = minutiFatti >= durata;
  const respiri = respiriTotali(pratica, minutiFatti);
  return (
    <View style={[s.wrap, s.centro, { paddingHorizontal: spacing.lg }]}>
      <Text style={s.fineTitolo}>
        {completata ? 'Hai respirato.' : 'Ti sei fermato prima.'}
      </Text>
      <Text style={s.fineSub}>
        {pratica.nome} · {respiri > 0 ? `${respiri} respiri` : 'pochi respiri'}
      </Text>

      <TouchableOpacity style={[s.inizia, { marginTop: spacing.xl }]} onPress={salva} activeOpacity={0.85}>
        <Text style={s.iniziaTxt}>Tieni questo respiro</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.scarta} onPress={() => navigation.goBack()}>
        <Text style={s.scartaTxt}>Non registrare</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 2 },
  centro: { alignItems: 'center', justifyContent: 'center' },

  occhiello: { color: colors.accent, fontSize: 10, letterSpacing: 2.5, fontWeight: '700' },
  titolo: {
    color: colors.text, fontSize: 32, lineHeight: 39, fontWeight: '300',
    marginTop: spacing.sm, letterSpacing: -0.5,
  },

  pratica: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg,
    padding: spacing.md, backgroundColor: colors.surface,
  },
  praticaOn: { borderColor: colors.accent, backgroundColor: colors.accent + '10' },
  praticaNome: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  praticaIntento: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 3, lineHeight: 19 },
  praticaRitmo: { color: colors.textSecondary, fontSize: fontSize.xs, letterSpacing: 1 },

  etichettaDurata: {
    color: colors.textSecondary, fontSize: 10, letterSpacing: 2.5,
    fontWeight: '700', marginTop: spacing.xl,
  },
  durate: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  durataChip: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 999,
    paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.surface,
  },
  durataChipOn: { borderColor: colors.accent, backgroundColor: colors.accent },
  durataTxt: { color: colors.textSecondary, fontSize: fontSize.sm },
  durataTxtOn: { color: colors.textOnAccent, fontWeight: '700' },

  inizia: {
    marginTop: spacing.xl, backgroundColor: colors.accent,
    borderRadius: borderRadius.lg, paddingVertical: 15, alignItems: 'center',
    alignSelf: 'stretch',
  },
  iniziaTxt: { color: colors.textOnAccent, fontSize: fontSize.md, fontWeight: '700' },

  nota: {
    color: colors.textSecondary, fontSize: fontSize.xs, lineHeight: 17,
    marginTop: spacing.xl, textAlign: 'center',
  },

  chiudi: { position: 'absolute', right: spacing.md, zIndex: 10, padding: spacing.sm },
  cerchioBox: { width: 300, height: 300, alignItems: 'center', justifyContent: 'center' },
  alone: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: colors.accent, opacity: 0.07,
  },
  cerchio: {
    position: 'absolute', width: 210, height: 210, borderRadius: 105,
    borderWidth: 1.5, borderColor: colors.accent, opacity: 0.85,
  },
  cerchioTesto: { alignItems: 'center' },
  faseTxt: { color: colors.text, fontSize: 26, fontWeight: '300', letterSpacing: 0.5 },
  contoTxt: { color: colors.textSecondary, fontSize: fontSize.md, marginTop: 6 },

  barraBox: {
    position: 'absolute', bottom: 60, left: spacing.xl, right: spacing.xl,
    height: 2, backgroundColor: colors.surfaceLight, borderRadius: 1,
  },
  barra: { height: 2, backgroundColor: colors.accent, borderRadius: 1 },

  fineTitolo: {
    color: colors.text, fontSize: 30, fontWeight: '300', textAlign: 'center',
    letterSpacing: -0.4,
  },
  fineSub: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.sm },
  scarta: { marginTop: spacing.md, padding: spacing.sm },
  scartaTxt: { color: colors.textSecondary, fontSize: fontSize.sm },
});

export default BreathScreen;
