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
  TETTO_GIORNALIERO, TETTO_SETTIMANALE, proponiOrari,
} from '../../domain/agenda';
import {
  salvaRichiesta, getRichiesteInAttesa, confermaRichiesta, rifiutaRichiesta,
  leggiImpegni, getOspitiConfermati, eliminaRichiesta, RichiestaSalvata,
  getRichiesteRifiutate, recuperaRichiesta,
} from '../../services/agendaRequestService';
import { generaChiaveCAL, istruzioniPonte, CAL_ENDPOINT } from '../../services/calKeyService';
import { leggiMessaggioWhatsApp } from '../../services/segreteriaService';
import {
  datiPerAssistente, contestoPer, scriviBozza,
} from '../../services/assistenteService';
import { Bozza, EsitoBozza, spiegaBozza, FIRMA } from '../../domain/assistente';
import { LetturaSegreteria, spiegaLettura } from '../../domain/segreteria';

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

  // --- l'assistente che scrive la risposta ---
  const [bozza, setBozza] = useState<Bozza | null>(null);
  const [esitoBozza, setEsitoBozza] = useState<EsitoBozza | null>(null);
  const [scrivendo, setScrivendo] = useState(false);
  const [erroreBozza, setErroreBozza] = useState('');
  const [allievoBozza, setAllievoBozza] = useState<string | undefined>();
  const [impegni, setImpegni] = useState<Impegno[]>([]);
  const [attesa, setAttesa] = useState<RichiestaSalvata[]>([]);
  const [ospiti, setOspiti] = useState<RichiestaSalvata[]>([]);
  const [rifiutate, setRifiutate] = useState<RichiestaSalvata[]>([]);
  const [rifiutateRotte, setRifiutateRotte] = useState(false);
  const [testo, setTesto] = useState('');
  const [loading, setLoading] = useState(true);
  const [lavoro, setLavoro] = useState(false);
  const [scelte, setScelte] = useState<Record<string, string | undefined>>({});
  const [chiave, setChiave] = useState<string | null>(null);
  const [apriPonte, setApriPonte] = useState(false);
  // La segreteria: il messaggio WhatsApp com'è, e la sua traduzione.
  const [messaggio, setMessaggio] = useState('');
  const [lettura, setLettura] = useState<LetturaSegreteria | null>(null);
  const [traducendo, setTraducendo] = useState(false);

  /**
   * Gli orari da rimandare a chi non ha detto quando.
   * Si calcola dai veri impegni: quello che si propone esiste.
   */
  const orariDaProporre = useMemo(() => {
    if (!lettura || lettura.esito !== 'senza_data') return '';
    const oggi = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    const g = `${oggi.getFullYear()}-${p(oggi.getMonth() + 1)}-${p(oggi.getDate())}`;
    return proponiOrari(impegni, g, lettura.persona);
  }, [lettura, impegni]);

  const carica = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getStudents();
      setStudents(s);
      const [i, a, o, rif] = await Promise.all([
        leggiImpegni(s), getRichiesteInAttesa(), getOspitiConfermati(),
        // Se questa non riesce NON si finge che non ce ne siano:
        // è esattamente così che erano sparite.
        getRichiesteRifiutate().catch(() => null),
      ]);
      setImpegni(i);
      setAttesa(a);
      setOspiti(o.ospiti);
      setRifiutate(rif || []);
      setRifiutateRotte(rif === null);
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

  /**
   * Il messaggio WhatsApp diventa una lettura, non una richiesta:
   * la richiesta la scrive il titolare quando ha controllato.
   */
  const traduci = async () => {
    const m = messaggio.trim();
    if (!m) return;
    setTraducendo(true);
    setLettura(null);
    try {
      setLettura(await leggiMessaggioWhatsApp(m));
    } finally {
      setTraducendo(false);
    }
  };

  /**
   * La bozza di risposta.
   *
   * Non parte da sola e non partirà mai da sola dalla categoria
   * «soldi»: la scrive lei, la manda lui. Scrivere un messaggio
   * costa tre minuti, approvarne uno già scritto cinque secondi.
   */
  const preparaRisposta = async () => {
    const m = messaggio.trim();
    if (!m) return;
    setScrivendo(true);
    setBozza(null);
    setEsitoBozza(null);
    setErroreBozza('');
    try {
      const allievo = students.find((x) => x.id === allievoBozza) || null;
      const dati = await datiPerAssistente(allievo);
      // Le letture fallite si dicono: «non risulta nessuna rata
      // aperta» a chi ne ha una scaduta è il danno peggiore.
      if (dati.nonLette.length) {
        setErroreBozza(
          `Non sono riuscito a leggere: ${dati.nonLette.join(', ')}. `
          + 'La bozza esce lo stesso, ma su quei dati non fidarti.'
        );
      }
      const contesto = contestoPer({ messaggio: m, allievo, dati });
      const r = await scriviBozza(contesto);
      setBozza(r.bozza);
      setEsitoBozza(r.esito);
    } catch (e: any) {
      setErroreBozza(e?.message || String(e));
    } finally {
      setScrivendo(false);
    }
  };

  const copiaBozza = () => {
    if (!bozza?.testo) return;
    if (Platform.OS === 'web') {
      const nav = (globalThis as any).navigator;
      nav?.clipboard?.writeText?.(bozza.testo)
        .then(() => crossAlert('Copiata', 'Incollala su WhatsApp e rileggila prima di mandarla.'))
        .catch(() => crossAlert('Non copiata', 'Selezionala a mano e copiala.'));
      return;
    }
    crossAlert('Copiala a mano', 'Tieni premuto sul testo e copia.');
  };

  /**
   * Porta la lettura nella casella qui sotto, come pacchetto CAL.
   * NON la registra: passa dalla stessa strada di sempre, dove viene
   * valutata sulle regole della giornata e si vede prima di salvare.
   */
  const portaInCasella = () => {
    const l = lettura;
    if (!l || l.esito !== 'richiesta') return;
    setTesto([
      'CAL prenota',
      `persona: ${l.persona}`,
      l.telefono ? `telefono: ${l.telefono}` : '',
      `giorno: ${l.giorno}`,
      `ora: ${l.ora}`,
      `tipo: ${l.tipo}`,
      l.note ? `note: ${l.note}` : '',
    ].filter(Boolean).join('\n'));
    setLettura(null);
    setMessaggio('');
  };

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
      // Dire DOVE è finito: «è in agenda» non basta se poi non lo trovi.
      const quando = `${dataBreve(r.giorno)} alle ${r.ora}`;
      crossAlert(
        'Confermato',
        esito.ospite
          ? `${r.persona} — ${quando}. Il posto è tenuto come OSPITE: occupa uno dei quattro `
            + 'e lo trovi in Agenda fra i prossimi appuntamenti. Quando la persona entra in '
            + 'anagrafica, collegala qui sotto e diventa una seduta vera.'
          : `${r.persona} — ${quando}. È in agenda: lo trovi in Agenda, sezione «Prossimi appuntamenti».`
      );
    } catch {
      crossAlert('Errore', 'Non riesco a confermare');
    } finally {
      setLavoro(false);
    }
  };

  /**
   * L'ospite diventa un appuntamento vero. Il posto lo teneva già:
   * qui non si aggiunge niente alla giornata, si dà un nome e una
   * scheda a un impegno che esisteva.
   */
  const collega = async (r: RichiestaSalvata) => {
    const studentId = scelte[r.id];
    if (!user) return;
    if (!studentId) {
      crossAlert('Manca l\'allievo', 'Scegli la persona in anagrafica, poi collega.');
      return;
    }
    setLavoro(true);
    try {
      await confermaRichiesta({ richiesta: r, coachId: user.id, studentId });
      await carica();
      crossAlert('In agenda', 'Adesso è un appuntamento vero, con la sua scheda.');
    } catch {
      crossAlert('Errore', 'Non riesco a collegarlo');
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

  // Le consulenze che non si sono mai concretizzate restano in coda
  // per sempre: hanno un posto in agenda che nessuno occuperà. Questo
  // le toglie di mezzo davvero — non le archivia, le cancella.
  const elimina = (r: RichiestaSalvata) => {
    crossAlert(
      'Eliminare la richiesta?',
      `${r.persona} — ${dataBreve(r.giorno)} alle ${r.ora}.\n\n`
      + 'Sparisce dalla lista e libera il posto in agenda. Non si torna indietro.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            setLavoro(true);
            try {
              await eliminaRichiesta(r.id);
              await carica();
            } catch {
              crossAlert('Errore', 'Non riesco a eliminare la richiesta');
            } finally {
              setLavoro(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Una rifiutata torna «in attesa», non confermata: recuperare non
   * vuol dire scavalcare la regola in automatico — vuol dire riavere
   * la scelta, che è di chi comanda.
   */
  const recupera = async (r: RichiestaSalvata) => {
    setLavoro(true);
    try {
      await recuperaRichiesta(r.id);
      await carica();
      crossAlert(
        'Recuperata',
        `${r.persona} è tornata fra le richieste da decidere, per il `
        + `${dataBreve(r.giorno)} alle ${r.ora}. Adesso confermala come le altre.`
      );
    } catch {
      crossAlert('Errore', 'Non riesco a recuperare la richiesta');
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

      {/* ------------------------------------------------------------
          LA SEGRETERIA — il messaggio così com'è
          16 settembre 2026. Il bot che traduceva i messaggi in
          pacchetti CAL si è fermato: aveva una riserva settimanale.
          Ricevere gli appuntamenti non può dipendere da un
          abbonamento di terzi. La traduzione la fa ESSĒRE, con il
          gateway AI che ha già dentro. Vedi domain/segreteria.ts.
          ------------------------------------------------------------ */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Incolla il messaggio di WhatsApp</Text>
        <Text style={s.muted}>
          Il messaggio com'è, senza sistemarlo. Lo traduco io in una richiesta:
          tu controlli e confermi. <Text style={s.forte}>La data non me la
          invento mai</Text> — se non c'è, te lo dico e ti do gli orari liberi
          da rimandare alla persona.
        </Text>
        <TextInput
          style={s.area}
          multiline
          numberOfLines={4}
          placeholder={'«Ciao Francesco, giovedì pomeriggio verso le 3 ci sono»'}
          placeholderTextColor={colors.textLight}
          value={messaggio}
          onChangeText={setMessaggio}
        />
        <TouchableOpacity
          style={s.btnPrimario}
          onPress={traduci}
          disabled={lavoro || traducendo || !messaggio.trim()}
          activeOpacity={0.85}
        >
          {traducendo
            ? <ActivityIndicator size="small" color={colors.textOnAccent} />
            : <Ionicons name="sparkles" size={17} color={colors.textOnAccent} />}
          <Text style={s.btnPrimarioTxt}>
            {traducendo ? 'Sto leggendo…' : 'Leggi e prepara la richiesta'}
          </Text>
        </TouchableOpacity>

        {/* ------------------------------------------------------
            L'ASSISTENTE CHE SCRIVE LA RISPOSTA
            Non manda niente: prepara. La mandi tu, sempre — e
            sulla categoria «soldi» sarà sempre così, anche fra
            un anno. Vedi domain/assistente.ts.
            ------------------------------------------------------ */}
        <View style={s.divisorio} />

        <Text style={s.cardTitle}>…oppure fatti scrivere la risposta</Text>
        <Text style={s.muted}>
          Dimmi chi ti ha scritto e guardo agenda, rate e percorso di quella
          persona. Poi ti preparo la risposta, <Text style={s.forte}>senza
          inventare nessun numero</Text>: ogni cifra viene dai dati veri, e se
          non torna te lo dico invece di mandarla.
        </Text>

        <StudentSearchPicker
          students={students}
          selectedId={allievoBozza}
          onSelect={setAllievoBozza}
          label="Chi ha scritto" placeholder="Cerca allievo…"
        />

        <TouchableOpacity
          style={s.btnSecondario}
          onPress={preparaRisposta}
          disabled={lavoro || scrivendo || !messaggio.trim()}
          activeOpacity={0.85}
        >
          {scrivendo
            ? <ActivityIndicator size="small" color={colors.accent} />
            : <Ionicons name="create-outline" size={17} color={colors.accent} />}
          <Text style={s.btnSecondarioTxt}>
            {scrivendo ? 'Sto scrivendo…' : 'Scrivi la risposta'}
          </Text>
        </TouchableOpacity>

        {!!erroreBozza && <Text style={s.erroreBozza}>{erroreBozza}</Text>}

        {!!bozza && (
          <View style={s.bozzaBox}>
            <Text style={s.bozzaEtichetta}>{spiegaBozza(bozza)}</Text>

            {esitoBozza?.gravi.map((g) => (
              <Text key={g} style={s.erroreBozza}>⛔ {g}</Text>
            ))}
            {esitoBozza?.avvisi.map((a) => (
              <Text key={a} style={s.avvisoBozza}>· {a}</Text>
            ))}

            {!!bozza.testo && (
              <Text style={s.bozzaTesto} selectable>{bozza.testo}</Text>
            )}

            {esitoBozza?.ok && !!bozza.testo && (
              <TouchableOpacity style={s.btnSecondario} onPress={copiaBozza} activeOpacity={0.85}>
                <Ionicons name="copy-outline" size={17} color={colors.accent} />
                <Text style={s.btnSecondarioTxt}>Copia e mandala tu</Text>
              </TouchableOpacity>
            )}

            <Text style={s.muted}>
              Rileggila prima di mandarla. Si firma «{FIRMA}»: un ufficio, non
              una persona che non esiste.
            </Text>
          </View>
        )}

        {lettura && (
          <View style={s.letturaBox}>
            <Text style={s.letturaTitolo}>{spiegaLettura(lettura)}</Text>
            {lettura.problemi.map((x, i) => (
              <Text key={i} style={s.motivo}>{x}</Text>
            ))}

            {lettura.esito === 'richiesta' && (
              <TouchableOpacity
                style={s.btnSecondario}
                onPress={portaInCasella}
                activeOpacity={0.85}
              >
                <Ionicons name="arrow-down" size={16} color={colors.accent} />
                <Text style={s.btnSecondarioTxt}>
                  Portala qui sotto, così la controllo prima di registrarla
                </Text>
              </TouchableOpacity>
            )}

            {/* La scelta del titolare, 16 settembre: quando la data
                non c'è, l'App propone gli orari liberi. */}
            {lettura.esito === 'senza_data' && !!orariDaProporre && (
              <>
                <Text style={s.muted}>{orariDaProporre}</Text>
                <TouchableOpacity
                  style={s.btnSecondario}
                  onPress={() => copia(orariDaProporre)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="copy-outline" size={16} color={colors.accent} />
                  <Text style={s.btnSecondarioTxt}>Copia da rimandare su WhatsApp</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>

      {/* --- incolla --- */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Oppure scrivi la richiesta a mano</Text>
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

      {/* --- ospiti confermati: hanno il posto, non hanno la scheda --- */}
      {ospiti.length > 0 && (
        <>
          <Text style={s.sezione}>Ospiti da collegare ({ospiti.length})</Text>
          <Text style={s.aiuto}>
            Hanno già il loro posto in agenda. Appena la persona è in anagrafica,
            collegala qui: l'appuntamento diventa una sessione vera, con scheda e
            storico. Il posto non si conta due volte.
          </Text>
          {ospiti.map((r) => (
            <View key={r.id} style={s.card}>
              <Text style={s.persona}>{r.persona}</Text>
              <Text style={s.quando}>
                {dataBreve(r.giorno)} alle {r.ora} · {r.tipo}
                {r.telefono ? ` · ${r.telefono}` : ''}
              </Text>
              {!!r.note && <Text style={s.note}>{r.note}</Text>}

              <StudentSearchPicker
                students={students}
                selectedId={scelte[r.id]}
                onSelect={(id) => setScelte((p) => ({ ...p, [r.id]: id }))}
                label="Chi è, in anagrafica"
                placeholder="Cerca l'allievo appena registrato…"
              />

              <TouchableOpacity
                style={s.btnPrimario}
                onPress={() => collega(r)}
                disabled={lavoro}
                activeOpacity={0.85}
              >
                <Ionicons name="link" size={17} color={colors.textOnAccent} />
                <Text style={s.btnPrimarioTxt}>Collega e metti in agenda</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.btnElimina}
                onPress={() => elimina(r)}
                disabled={lavoro}
                activeOpacity={0.85}
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={s.btnEliminaTxt}>Non se n'è fatto nulla: elimina</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {/* ------------------------------------------------------------
          LE RIFIUTATE — quello che il tetto ha scartato
          15 settembre 2026: il titolare ha passato una mattina a
          riscrivere a memoria appuntamenti che erano stati rifiutati
          perché il giorno era pieno. Una regola può dire di no; non
          può far sparire quello su cui ha detto no.
          ------------------------------------------------------------ */}
      {rifiutateRotte && (
        <View style={s.card}>
          <Text style={s.motivo}>
            Non sono riuscito a leggere le richieste rifiutate. NON vuol dire
            che non ce ne siano: vuol dire che la lettura non è riuscita.
          </Text>
        </View>
      )}

      {rifiutate.length > 0 && (
        <>
          <Text style={s.sezione}>Rifiutate ({rifiutate.length})</Text>
          <Text style={s.aiuto}>
            Richieste che il tetto della giornata ha scartato. Non sono perse:
            se una era un appuntamento vero, recuperala — torna fra quelle da
            decidere e la confermi come tutte le altre.
          </Text>
          {rifiutate.map((r) => (
            <View key={r.id} style={s.card}>
              <Text style={s.persona}>{r.persona}</Text>
              <Text style={s.quando}>
                {dataBreve(r.giorno)} alle {r.ora} · {r.tipo}
                {r.telefono ? ` · ${r.telefono}` : ''}
              </Text>
              {!!r.note && <Text style={s.note}>{r.note}</Text>}
              {!!r.motivoRifiuto && (
                <Text style={s.motivo}>Scartata perché: {r.motivoRifiuto}</Text>
              )}

              <TouchableOpacity
                style={s.btnPrimario}
                onPress={() => recupera(r)}
                disabled={lavoro}
                activeOpacity={0.85}
              >
                <Ionicons name="arrow-undo" size={17} color={colors.textOnAccent} />
                <Text style={s.btnPrimarioTxt}>Recupera: rimettila fra quelle da decidere</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.btnElimina}
                onPress={() => elimina(r)}
                disabled={lavoro}
                activeOpacity={0.85}
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={s.btnEliminaTxt}>Era giusto scartarla: elimina</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

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
  divisorio: {
    height: 1, backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  bozzaBox: {
    borderWidth: 1, borderColor: colors.info, borderRadius: borderRadius.md,
    padding: spacing.md, marginTop: spacing.md, backgroundColor: colors.surfaceLight,
  },
  bozzaEtichetta: {
    color: colors.info, fontSize: fontSize.xs, fontWeight: '700',
    marginBottom: spacing.sm,
  },
  bozzaTesto: {
    color: colors.text, fontSize: fontSize.sm, lineHeight: 21,
    marginVertical: spacing.sm,
  },
  erroreBozza: {
    color: colors.error, fontSize: fontSize.sm, lineHeight: 20,
    marginBottom: 4,
  },
  avvisoBozza: {
    color: colors.textSecondary, fontSize: fontSize.xs, lineHeight: 18,
    marginBottom: 3,
  },
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
  btnElimina: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  btnEliminaTxt: {
    color: colors.error,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
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
  letturaBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  letturaTitolo: {
    color: colors.text,
    fontWeight: '700',
    fontSize: fontSize.md,
    lineHeight: 21,
    marginBottom: spacing.xs,
  },
  motivo: {
    color: colors.warning,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    lineHeight: 19,
  },
  note: { color: colors.textLight, fontSize: fontSize.xs, marginTop: 4, lineHeight: 17 },
  aiuto: { color: colors.textLight, fontSize: fontSize.xs, lineHeight: 16, marginTop: 4 },
  chiusura: {
    color: colors.textLight, fontSize: fontSize.xs, textAlign: 'center',
    lineHeight: 17, marginTop: spacing.xl,
  },
});

export default RichiesteWhatsAppScreen;
