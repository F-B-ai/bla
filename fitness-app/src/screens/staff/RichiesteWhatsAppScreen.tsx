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
  leggiTuttiCAL, valutaSequenza, valutaRichiesta, rispostaWhatsApp, riepilogoDi,
  RichiestaCAL, Impegno, Valutazione,
  TETTO_GIORNALIERO, TETTO_SETTIMANALE,
} from '../../domain/agenda';
import {
  salvaRichiesta, getRichiesteInAttesa, confermaRichiesta, rifiutaRichiesta,
  leggiImpegni, RichiestaSalvata,
} from '../../services/agendaRequestService';
import { generaChiaveCAL, istruzioniPonte, CAL_ENDPOINT } from '../../services/calKeyService';

// ============================================================
// RICHIESTE DA WHATSAPP
// ------------------------------------------------------------
// Le richieste arrivano su WhatsApp e si incollano qui. Solo il
// TITOLARE vede questa schermata e conferma: per decisione di
// Francesco le chiamate arrivano a lui e a nessun collaboratore.
// Qui dentro ci sono nome e telefono di persone che non sono
// ancora allieve.
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
ora: 15:00
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

/** Gli avvisi non fermano niente: dicono che cosa costa quell'ora. */
const Avvisi: React.FC<{ v: Valutazione }> = ({ v }) => {
  if (!v.avvisi.length) return null;
  return (
    <View style={s.avvisi}>
      {v.avvisi.map((a, i) => (
        <View key={i} style={s.avvisoRiga}>
          <Ionicons name="alert-circle-outline" size={13} color={colors.warning} />
          <Text style={s.avvisoTxt}>{a}</Text>
        </View>
      ))}
    </View>
  );
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
  const [chiave, setChiave] = useState<string | null>(null);
  const [apriPonte, setApriPonte] = useState(false);

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

  // --- lettura di ciò che è stato incollato ---
  // Possono essere più pacchetti CAL insieme: è così che arriva la
  // coda della giornata. Ognuno viene valutato sapendo che cosa ha
  // già preso quello prima, altrimenti quattro richieste per lo
  // stesso giorno direbbero tutte «restano 4 posti».
  const letti = useMemo(() => (testo.trim() ? leggiTuttiCAL(testo) : []), [testo]);
  const valide = useMemo(
    () => letti.filter((l) => l.ok && l.richiesta).map((l) => l.richiesta!),
    [letti]
  );
  const valutazioni = useMemo(
    () => valutaSequenza(
      valide.filter((r) => r.comando !== 'chiedi-liberi'),
      impegni
    ),
    [valide, impegni]
  );
  const valutazioneDi = (r: RichiestaCAL): Valutazione | null => {
    if (r.comando === 'chiedi-liberi') return null;
    const i = valide.filter((x) => x.comando !== 'chiedi-liberi').indexOf(r);
    return i >= 0 ? valutazioni[i] : null;
  };
  const letto = letti.length === 1 ? letti[0] : null;
  const valutazioneNuova = letto?.ok && letto.richiesta
    ? valutazioneDi(letto.richiesta)
    : null;

  const rispostaDa = (r: RichiestaCAL, v: Valutazione | null): string =>
    rispostaWhatsApp({
      richiesta: r,
      valutazione: v || valutaRichiesta({ richiesta: r, impegni }),
      impegni,
    });

  const registra = async () => {
    const daSalvare = valide.filter((r) => r.comando !== 'chiedi-liberi');
    if (!daSalvare.length || !user) return;
    setLavoro(true);
    try {
      for (const r of daSalvare) await salvaRichiesta(r, user.id);
      setTesto('');
      await carica();
    } catch {
      crossAlert('Errore', 'Non riesco a salvare le richieste');
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

  const nuovaChiave = async () => {
    setLavoro(true);
    try {
      const k = await generaChiaveCAL();
      setChiave(k);
      setApriPonte(true);
    } catch (e) {
      crossAlert('Errore', e instanceof Error ? e.message : 'Non riesco a generare la chiave');
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
        Incolla qui la richiesta arrivata su WhatsApp. Diventa appuntamento
        solo quando la confermi tu — e questa schermata la vedi solo tu. <Text style={s.forte}>Massimo {TETTO_GIORNALIERO} al
        giorno e {TETTO_SETTIMANALE} a settimana: il quinto e il sedicesimo non si
        scrivono.</Text> Domenica chiusa, sabato solo mattina.
      </Text>

      {/* --- incolla --- */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Incolla la richiesta</Text>
        <TextInput
          style={s.area}
          multiline
          numberOfLines={7}
          placeholder={'Tocca qui e incolla il messaggio CAL…'}
          placeholderTextColor={colors.textLight}
          value={testo}
          onChangeText={setTesto}
        />

        {/* L'esempio sta FUORI dal campo: dentro sembrava già scritto,
            e chi guardava aspettava una risposta che non poteva arrivare. */}
        {!testo.trim() && (
          <View style={s.esempio}>
            <View style={s.esempioTesta}>
              <Ionicons name="document-text-outline" size={14} color={colors.textLight} />
              <Text style={s.esempioLab}>Esempio — non è ancora scritto niente</Text>
            </View>
            <Text style={s.esempioTxt}>{ESEMPIO}</Text>
            <TouchableOpacity
              style={s.btnSecondario}
              onPress={() => setTesto(ESEMPIO)}
              activeOpacity={0.85}
            >
              <Ionicons name="download-outline" size={16} color={colors.accent} />
              <Text style={s.btnSecondarioTxt}>Prova con questo esempio</Text>
            </TouchableOpacity>
          </View>
        )}

        {letti.some((l) => !l.ok) && (
          <View style={s.problemi}>
            {letti.map((l, n) => (l.ok ? null : l.problemi.map((p, i) => (
              <Text key={`${n}-${i}`} style={s.problema}>
                {letti.length > 1 ? `Blocco ${n + 1}: ` : '· '}{p}
              </Text>
            ))))}
          </View>
        )}

        {/* più blocchi insieme: uno sguardo per ciascuno, in fila */}
        {letti.length > 1 && (
          <View style={{ marginTop: spacing.sm }}>
            {letti.map((l, n) => {
              if (!l.ok || !l.richiesta) return null;
              const r = l.richiesta;
              const v = valutazioneDi(r);
              return (
                <View key={n} style={s.bloccoRiga}>
                  <Text style={s.riassuntoRiga}>
                    <Text style={s.forte}>{r.persona || r.comando}</Text>
                    {r.giorno ? ` · ${dataBreve(r.giorno)}` : ''}
                    {r.ora ? ` ${r.ora}` : ''}
                  </Text>
                  {v && (
                    <View style={[
                      s.esito,
                      { borderColor: v.confermabile ? colors.success : colors.warning },
                    ]}>
                      <Ionicons
                        name={v.confermabile ? 'checkmark-circle' : 'alert-circle'}
                        size={15}
                        color={v.confermabile ? colors.success : colors.warning}
                      />
                      <Text style={s.esitoTxt}>{v.motivo}</Text>
                    </View>
                  )}
                  {v && <Avvisi v={v} />}
                  {v && (
                    <TouchableOpacity
                      style={s.btnSecondario}
                      onPress={() => copia(rispostaDa(r, v))}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="logo-whatsapp" size={15} color={colors.accent} />
                      <Text style={s.btnSecondarioTxt}>Copia la risposta per {r.persona.split(' ')[0]}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            <TouchableOpacity
              style={s.btnPrimario}
              onPress={registra}
              disabled={lavoro}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={17} color={colors.textOnAccent} />
              <Text style={s.btnPrimarioTxt}>
                {lavoro ? 'Salvo…' : `Metti tutte e ${valide.length} fra le richieste da confermare`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {letti.length === 1 && letto?.ok && letto.richiesta && (
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

            {valutazioneNuova && <Avvisi v={valutazioneNuova} />}

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
            <View style={s.personaRiga}>
              <Text style={s.persona}>{r.persona || 'Senza nome'}</Text>
              {r.creataDa === 'bot' && (
                <View style={s.tagBot}>
                  <Ionicons name="link" size={11} color={colors.info} />
                  <Text style={s.tagBotTxt}>dal bot</Text>
                </View>
              )}
            </View>
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

            <Avvisi v={v} />

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

      {/* --- il ponte: chi scrive le richieste al posto tuo --- */}
      <TouchableOpacity
        style={s.catalogoBtn}
        onPress={() => setApriPonte((v) => !v)}
        activeOpacity={0.85}
      >
        <Ionicons name="link-outline" size={18} color={colors.accent} />
        <Text style={s.catalogoTxt}>Il ponte: farsele scrivere qui dentro</Text>
        <Ionicons
          name={apriPonte ? 'chevron-up' : 'chevron-down'}
          size={18} color={colors.textSecondary}
        />
      </TouchableOpacity>

      {apriPonte && (
        <View style={s.card}>
          <Text style={s.muted}>
            Con una chiave, chi riceve le richieste su WhatsApp — il bot o una persona —
            le scrive direttamente in questa coda, e tu te le trovi già qui.{'\n\n'}
            Chi ha la chiave <Text style={s.forte}>può solo scrivere richieste in attesa</Text>:
            non legge l'agenda, non conferma niente, non cancella niente. Gli appuntamenti
            nascono solo quando li confermi tu.
          </Text>

          {chiave && (
            <View style={s.chiaveBox}>
              <Text style={s.chiaveLab}>La chiave — si vede una volta sola</Text>
              <Text style={s.chiaveTxt} selectable>{chiave}</Text>
              <TouchableOpacity
                style={s.btnSecondario}
                onPress={() => copia(istruzioniPonte(chiave))}
                activeOpacity={0.85}
              >
                <Ionicons name="copy-outline" size={16} color={colors.accent} />
                <Text style={s.btnSecondarioTxt}>Copia chiave e istruzioni</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={s.btnPrimario}
            onPress={nuovaChiave}
            disabled={lavoro}
            activeOpacity={0.85}
          >
            <Ionicons name="key-outline" size={17} color={colors.textOnAccent} />
            <Text style={s.btnPrimarioTxt}>
              {lavoro ? 'Genero…' : chiave ? 'Genera una chiave nuova' : 'Genera la chiave'}
            </Text>
          </TouchableOpacity>

          <Text style={s.aiuto}>
            Chi non sa fare chiamate tecniche usa la pagina {CAL_ENDPOINT.replace('/v1/cal', '/cal.html')}:
            si incolla la chiave una volta e poi solo i pacchetti CAL.{'\n'}
            Generare una chiave nuova spegne all'istante la precedente.
          </Text>
        </View>
      )}

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
  esempio: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  esempioTesta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  esempioLab: {
    color: colors.textLight, fontSize: fontSize.xs, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  esempioTxt: { color: colors.textLight, fontSize: fontSize.xs, lineHeight: 18 },
  problemi: {
    backgroundColor: colors.surfaceLight, borderRadius: borderRadius.sm,
    padding: spacing.sm, marginTop: spacing.sm,
  },
  problema: { color: colors.warning, fontSize: fontSize.xs, lineHeight: 18 },
  avvisi: { marginTop: spacing.sm, gap: 5 },
  avvisoRiga: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  avvisoTxt: { color: colors.warning, fontSize: fontSize.xs, lineHeight: 17, flex: 1 },
  catalogoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginTop: spacing.xl,
  },
  catalogoTxt: { color: colors.text, fontSize: fontSize.md, fontWeight: '700', flex: 1 },
  chiaveBox: {
    backgroundColor: colors.surfaceLight, borderRadius: borderRadius.sm,
    borderWidth: 1, borderColor: colors.accent,
    padding: spacing.sm, marginTop: spacing.md,
  },
  chiaveLab: {
    color: colors.accent, fontSize: fontSize.xs, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5,
  },
  chiaveTxt: { color: colors.text, fontSize: fontSize.sm, lineHeight: 20 },
  personaRiga: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  tagBot: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1, borderColor: colors.info, borderRadius: borderRadius.round,
    paddingHorizontal: 7, paddingVertical: 1,
  },
  tagBotTxt: { color: colors.info, fontSize: fontSize.xs, fontWeight: '700' },
  bloccoRiga: {
    borderTopWidth: 1, borderTopColor: colors.divider,
    paddingTop: spacing.sm, marginTop: spacing.sm,
  },
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
