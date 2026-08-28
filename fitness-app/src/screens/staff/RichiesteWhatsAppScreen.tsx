import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { crossAlert } from '../../utils/alert';
import { useAuth } from '../../hooks/useAuth';
import { getStudents } from '../../services/authService';
import { Student } from '../../types';
import { StudentSearchPicker } from '../../components/common/StudentSearchPicker';
import {
  leggiCAL, valutaRichiesta, rispostaWhatsApp, riepilogoDi,
  RichiestaCAL, Impegno, Valutazione, TETTO_GIORNALIERO,
} from '../../domain/agenda';
import {
  salvaRichiesta, getRichiesteInAttesa, confermaRichiesta, rifiutaRichiesta,
  leggiImpegni, RichiestaSalvata,
} from '../../services/agendaRequestService';

// ============================================================
// RICHIESTE DA WHATSAPP
// ------------------------------------------------------------
// Alessia riceve le richieste su WhatsApp e le incolla qui. Il
// coach conferma, e solo allora nascono in agenda.
//
// La regola che questa schermata rende impossibile da violare:
// MAI un quinto appuntamento in un giorno. Il tasto non si può
// premere, e al suo posto compare il primo giorno con posto,
// col messaggio già scritto da rimandare alla persona.
// ============================================================

const ESEMPIO = `CAL prenota
persona: Maria Rossi
telefono: 333 1234567
giorno: 2026-09-02
ora: 17:00
tipo: visita
note: prima volta, arriva da Instagram`;

const dataBreve = (giorno: string) => {
  const [a, m, d] = giorno.split('-').map((x) => parseInt(x, 10));
  if (!a || !m || !d) return giorno;
  return new Date(Date.UTC(a, m - 1, d)).toLocaleDateString('it-IT', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  });
};

const copia = (testo: string) => {
  try {
    const nav = (globalThis as any).navigator;
    if (Platform.OS === 'web' && nav?.clipboard) {
      nav.clipboard.writeText(testo);
      crossAlert('Copiato', 'Il messaggio è negli appunti: incollalo su WhatsApp.');
      return;
    }
  } catch { /* niente appunti: resta leggibile a schermo */ }
  crossAlert('Messaggio', testo);
};

export function RichiesteWhatsAppScreen() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [impegni, setImpegni] = useState<Impegno[]>([]);
  const [attesa, setAttesa] = useState<RichiestaSalvata[]>([]);
  const [testo, setTesto] = useState('');
  const [loading, setLoading] = useState(true);
  const [lavoro, setLavoro] = useState(false);
  const [scelte, setScelte] = useState<Record<string, string | undefined>>({});

  const carica = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getStudents();
      setStudents(s);
      const [i, a] = await Promise.all([leggiImpegni(s), getRichiesteInAttesa()]);
      setImpegni(i);
      setAttesa(a);
    } catch {
      crossAlert('Errore', 'Non riesco a leggere agenda e richieste');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carica(); }, [carica]);

  // --- lettura del pacchetto incollato ---
  const letto = useMemo(() => (testo.trim() ? leggiCAL(testo) : null), [testo]);
  const valutazioneNuova: Valutazione | null = useMemo(() => {
    if (!letto?.ok || !letto.richiesta) return null;
    if (letto.richiesta.comando === 'chiedi-liberi') return null;
    return valutaRichiesta({ richiesta: letto.richiesta, impegni });
  }, [letto, impegni]);

  const rispostaDa = (r: RichiestaCAL, v: Valutazione | null): string =>
    rispostaWhatsApp({
      richiesta: r,
      valutazione: v || valutaRichiesta({ richiesta: r, impegni }),
      impegni,
    });

  const registra = async () => {
    if (!letto?.ok || !letto.richiesta || !user) return;
    setLavoro(true);
    try {
      await salvaRichiesta(letto.richiesta, user.id);
      setTesto('');
      await carica();
    } catch {
      crossAlert('Errore', 'Non riesco a salvare la richiesta');
    } finally {
      setLavoro(false);
    }
  };

  const conferma = async (r: RichiestaSalvata) => {
    if (!user) return;
    const v = valutaRichiesta({ richiesta: r, impegni });
    if (!v.confermabile) {
      crossAlert('Non si può confermare', v.motivo);
      return;
    }
    setLavoro(true);
    try {
      const esito = await confermaRichiesta({
        richiesta: r,
        coachId: user.id,
        studentId: scelte[r.id],
      });
      await carica();
      crossAlert(
        'Confermato',
        esito.ospite
          ? 'Il posto è tenuto come ospite: occupa uno dei quattro. Quando la persona diventa allieva, l\'appuntamento entra in agenda.'
          : 'L\'appuntamento è in agenda.'
      );
    } catch {
      crossAlert('Errore', 'Non riesco a confermare');
    } finally {
      setLavoro(false);
    }
  };

  const rifiuta = async (r: RichiestaSalvata, motivo: string) => {
    setLavoro(true);
    try {
      await rifiutaRichiesta(r.id, motivo);
      await carica();
    } catch {
      crossAlert('Errore', 'Non riesco a chiudere la richiesta');
    } finally {
      setLavoro(false);
    }
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  }

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}>
      <Text style={s.intro}>
        Alessia incolla qui la richiesta arrivata su WhatsApp. Diventa appuntamento
        solo quando la confermi tu. <Text style={s.forte}>Massimo {TETTO_GIORNALIERO} al
        giorno: il quinto non si scrive.</Text>
      </Text>

      {/* --- incolla --- */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Incolla la richiesta</Text>
        <TextInput
          style={s.area}
          multiline
          numberOfLines={7}
          placeholder={ESEMPIO}
          placeholderTextColor={colors.textLight}
          value={testo}
          onChangeText={setTesto}
        />

        {letto && !letto.ok && (
          <View style={s.problemi}>
            {letto.problemi.map((p, i) => (
              <Text key={i} style={s.problema}>· {p}</Text>
            ))}
          </View>
        )}

        {letto?.ok && letto.richiesta && (
          <>
            <View style={s.riassunto}>
              <Text style={s.riassuntoRiga}>
                <Text style={s.forte}>{letto.richiesta.comando}</Text>
                {letto.richiesta.persona ? ` · ${letto.richiesta.persona}` : ''}
                {letto.richiesta.giorno ? ` · ${dataBreve(letto.richiesta.giorno)}` : ''}
                {letto.richiesta.ora ? ` alle ${letto.richiesta.ora}` : ''}
                {` · ${letto.richiesta.tipo}`}
              </Text>
              {!!letto.richiesta.telefono && (
                <Text style={s.riassuntoNota}>{letto.richiesta.telefono}</Text>
              )}
            </View>

            {!!letto.richiesta.giorno && (
              <Text style={s.giornata}>
                {riepilogoDi(impegni, letto.richiesta.giorno).riga}
              </Text>
            )}

            {valutazioneNuova && (
              <View style={[
                s.esito,
                { borderColor: valutazioneNuova.confermabile ? colors.success : colors.warning },
              ]}>
                <Ionicons
                  name={valutazioneNuova.confermabile ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={valutazioneNuova.confermabile ? colors.success : colors.warning}
                />
                <Text style={s.esitoTxt}>{valutazioneNuova.motivo}</Text>
              </View>
            )}

            <TouchableOpacity
              style={s.btnPrimario}
              onPress={() => copia(rispostaDa(letto.richiesta!, valutazioneNuova))}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={17} color={colors.textOnAccent} />
              <Text style={s.btnPrimarioTxt}>Copia la risposta per WhatsApp</Text>
            </TouchableOpacity>

            <Text style={s.anteprima}>{rispostaDa(letto.richiesta, valutazioneNuova)}</Text>

            {letto.richiesta.comando !== 'chiedi-liberi' && (
              <TouchableOpacity
                style={s.btnSecondario}
                onPress={registra}
                disabled={lavoro}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle-outline" size={17} color={colors.accent} />
                <Text style={s.btnSecondarioTxt}>
                  {lavoro ? 'Salvo…' : 'Metti fra le richieste da confermare'}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* --- da confermare --- */}
      <Text style={s.sezione}>
        Da confermare {attesa.length > 0 ? `(${attesa.length})` : ''}
      </Text>

      {attesa.length === 0 && (
        <View style={s.card}>
          <Text style={s.muted}>Nessuna richiesta in attesa.</Text>
        </View>
      )}

      {attesa.map((r) => {
        const v = valutaRichiesta({ richiesta: r, impegni });
        const giornata = riepilogoDi(impegni, r.giorno);
        return (
          <View key={r.id} style={[
            s.card,
            { borderColor: v.confermabile ? colors.border : colors.warning },
          ]}>
            <Text style={s.persona}>{r.persona || 'Senza nome'}</Text>
            <Text style={s.quando}>
              {dataBreve(r.giorno)} alle {r.ora} · {r.tipo}
              {r.telefono ? ` · ${r.telefono}` : ''}
            </Text>
            {!!r.note && <Text style={s.note}>{r.note}</Text>}

            <Text style={s.giornata}>{giornata.riga}</Text>

            <View style={[
              s.esito,
              { borderColor: v.confermabile ? colors.success : colors.warning },
            ]}>
              <Ionicons
                name={v.confermabile ? 'checkmark-circle' : 'alert-circle'}
                size={16}
                color={v.confermabile ? colors.success : colors.warning}
              />
              <Text style={s.esitoTxt}>{v.motivo}</Text>
            </View>

            {v.confermabile && (
              <View style={{ marginTop: spacing.sm }}>
                <StudentSearchPicker
                  students={students}
                  selectedId={scelte[r.id]}
                  onSelect={(id) => setScelte((p) => ({ ...p, [r.id]: id }))}
                  label="Chi è, in anagrafica"
                  placeholder="Cerca allievo… (lascia vuoto se è nuovo)"
                />
                <Text style={s.aiuto}>
                  Se non è ancora allievo, conferma senza sceglierlo: il posto resta
                  tenuto come ospite e occupa comunque uno dei {TETTO_GIORNALIERO}.
                </Text>
              </View>
            )}

            <View style={s.azioni}>
              {v.confermabile ? (
                <TouchableOpacity
                  style={s.btnPrimario}
                  onPress={() => conferma(r)}
                  disabled={lavoro}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark" size={17} color={colors.textOnAccent} />
                  <Text style={s.btnPrimarioTxt}>Conferma in agenda</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={s.btnPrimario}
                  onPress={() => copia(rispostaDa({
                    comando: 'prenota', persona: r.persona, telefono: r.telefono,
                    giorno: r.giorno, ora: r.ora, tipo: r.tipo, note: r.note,
                    whatsapp: r.whatsapp,
                  }, v))}
                  activeOpacity={0.85}
                >
                  <Ionicons name="logo-whatsapp" size={17} color={colors.textOnAccent} />
                  <Text style={s.btnPrimarioTxt}>Copia la proposta alternativa</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={s.btnTerziario}
                onPress={() => rifiuta(r, v.confermabile ? 'chiusa dal coach' : v.motivo)}
                disabled={lavoro}
                activeOpacity={0.85}
              >
                <Text style={s.btnTerziarioTxt}>Chiudi</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <Text style={s.chiusura}>
        Le richieste restano scritte anche quando si chiudono: così si sa quante
        persone hanno bussato, e quante sono rimaste fuori.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  intro: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20 },
  forte: { color: colors.text, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, marginTop: spacing.md,
  },
  cardTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700', marginBottom: spacing.sm },
  muted: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20 },
  area: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight, color: colors.text,
    padding: spacing.sm, minHeight: 132, fontSize: fontSize.sm,
    textAlignVertical: 'top', lineHeight: 19,
  },
  problemi: {
    backgroundColor: colors.surfaceLight, borderRadius: borderRadius.sm,
    padding: spacing.sm, marginTop: spacing.sm,
  },
  problema: { color: colors.warning, fontSize: fontSize.xs, lineHeight: 18 },
  riassunto: { marginTop: spacing.sm },
  riassuntoRiga: { color: colors.text, fontSize: fontSize.sm, lineHeight: 20 },
  riassuntoNota: { color: colors.textLight, fontSize: fontSize.xs, marginTop: 2 },
  giornata: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.sm, lineHeight: 17 },
  esito: {
    flexDirection: 'row', gap: 7, alignItems: 'flex-start',
    borderWidth: 1, borderRadius: borderRadius.sm,
    padding: spacing.sm, marginTop: spacing.sm,
  },
  esitoTxt: { color: colors.text, fontSize: fontSize.xs, lineHeight: 18, flex: 1 },
  anteprima: {
    color: colors.textSecondary, fontSize: fontSize.xs, lineHeight: 18,
    backgroundColor: colors.surfaceLight, borderRadius: borderRadius.sm,
    padding: spacing.sm, marginTop: spacing.sm, fontStyle: 'italic',
  },
  btnPrimario: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.accent, borderRadius: borderRadius.md,
    paddingVertical: 12, marginTop: spacing.md, flex: 1,
  },
  btnPrimarioTxt: { color: colors.textOnAccent, fontWeight: '700', fontSize: fontSize.sm },
  btnSecondario: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.accent, borderRadius: borderRadius.md,
    paddingVertical: 11, marginTop: spacing.sm,
  },
  btnSecondarioTxt: { color: colors.accent, fontWeight: '700', fontSize: fontSize.sm },
  btnTerziario: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingVertical: 12, paddingHorizontal: spacing.md, marginTop: spacing.md,
  },
  btnTerziarioTxt: { color: colors.textSecondary, fontWeight: '600', fontSize: fontSize.sm },
  azioni: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  sezione: {
    color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.xl,
  },
  persona: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700' },
  quando: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 },
  note: { color: colors.textLight, fontSize: fontSize.xs, marginTop: 4, lineHeight: 17 },
  aiuto: { color: colors.textLight, fontSize: fontSize.xs, lineHeight: 16, marginTop: 4 },
  chiusura: {
    color: colors.textLight, fontSize: fontSize.xs, textAlign: 'center',
    lineHeight: 17, marginTop: spacing.xl,
  },
});

export default RichiesteWhatsAppScreen;
