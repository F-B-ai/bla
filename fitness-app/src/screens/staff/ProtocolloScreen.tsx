import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, Switch,
  ActivityIndicator, StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { crossAlert } from '../../utils/alert';
import { useAuth } from '../../hooks/useAuth';
import { getStudents } from '../../services/authService';
import { Student } from '../../types';
import { StudentSearchPicker } from '../../components/common/StudentSearchPicker';
import { brand } from '../../config/brand';
import { getQuadro } from '../../services/humanInterfaceService';
import { Quadro } from '../../domain/humanInterface';
import {
  leggiPriorita, valutaPerimetro, componiPiano, prossimeRipetizioni,
  documentoCliente, CONDUTTORI, Conduttore, VoceSedute,
  PROCEDURA, DOMANDE_GUIDA, RITMO_TEST, PREZZO_VALUTAZIONE, PROTOCOLLO_VERSION,
  SezioneDocumento,
} from '../../domain/protocollo';

// ============================================================
// PROTOCOLLO DI LAVORO
// ------------------------------------------------------------
// Due fogli, una sola verità.
//  · Quello del CLIENTE: che cosa è stato misurato, che cosa
//    dicono le misure messe insieme, che cosa faremo, in quanto
//    tempo, a quanto — e le firme.
//  · Quello MIO: la procedura operativa, passo per passo, con
//    gli strumenti, le alternative e quando un passo è chiuso.
//
// Le misure arrivano dal Quadro (Human Interface): niente viene
// ricopiato a mano, quindi niente può divergere.
// ============================================================

type Vista = 'quadro' | 'piano' | 'procedura';

const dataIt = (d: Date) =>
  d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

const euro = (n: number) =>
  new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(n);

export function ProtocolloScreen() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState<string | undefined>();
  const [quadro, setQuadro] = useState<Quadro | null>(null);
  const [caricaAllievi, setCaricaAllievi] = useState(true);
  const [loading, setLoading] = useState(false);
  const [vista, setVista] = useState<Vista>('quadro');

  // --- composizione del percorso ---
  const [sedute, setSedute] = useState<Record<Conduttore, string>>({
    francesco: '10', giuseppe: '0',
  });
  const [aSettimana, setASettimana] = useState('2');
  const [rate, setRate] = useState('');
  const [valutazionePagata, setValutazionePagata] = useState(false);
  const [obiettivo, setObiettivo] = useState('');
  const [controindicazioni, setControindicazioni] = useState(false);
  const [segnalazione, setSegnalazione] = useState('');

  useEffect(() => {
    getStudents().then(setStudents)
      .catch(() => crossAlert('Errore', 'Non riesco a caricare gli allievi'))
      .finally(() => setCaricaAllievi(false));
  }, []);

  const scegli = useCallback(async (id: string) => {
    setStudentId(id);
    setLoading(true);
    try {
      setQuadro(await getQuadro(id));
    } catch {
      crossAlert('Errore', 'Non riesco a leggere le valutazioni di questo allievo');
      setQuadro(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const voci: VoceSedute[] = useMemo(() => CONDUTTORI.map((c) => ({
    conduttore: c.id,
    quante: parseInt(sedute[c.id], 10) || 0,
  })), [sedute]);

  const piano = useMemo(() => componiPiano({
    voci,
    seduteASettimana: parseInt(aSettimana, 10) || 2,
    valutazioneGiaPagata: valutazionePagata,
    numeroRate: parseInt(rate, 10) || undefined,
  }), [voci, aSettimana, valutazionePagata, rate]);

  const priorita = useMemo(() => (quadro ? leggiPriorita(quadro) : []), [quadro]);
  const perimetro = useMemo(() => (quadro ? valutaPerimetro({
    quadro,
    haControindicazioni: controindicazioni,
    segnalazioniCoach: segnalazione.trim() ? [segnalazione.trim()] : [],
  }) : null), [quadro, controindicazioni, segnalazione]);
  const scadenze = useMemo(() => (quadro ? prossimeRipetizioni(quadro) : []), [quadro]);

  const allievo = students.find((s) => s.id === studentId);
  const nomeAllievo = allievo ? `${allievo.name} ${allievo.surname}` : '';

  // ------------------------------------------------------------
  // Stampa
  // ------------------------------------------------------------

  const apriStampa = (titolo: string, corpo: string) => {
    if (Platform.OS !== 'web') {
      crossAlert('Solo da browser', 'La stampa funziona dalla web app. Apri ESSĒRE da Safari o Chrome.');
      return;
    }
    const w = (globalThis as any).window;
    const html = `<!doctype html><html lang="it"><head><meta charset="utf-8">
<title>${titolo}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: Georgia, "Times New Roman", serif; color:${colors.cartaInchiostro}; line-height:1.5; font-size:11pt; }
  .studio { font-size:9pt; letter-spacing:.16em; text-transform:uppercase; color:${colors.cartaGrigioChiaro}; }
  h1 { font-size:15pt; margin:1mm 0 2mm; }
  .meta { font-size:10pt; color:${colors.cartaGrigio}; margin-bottom:4mm; }
  .hr { border-top:1px solid ${colors.cartaLinea}; margin:4mm 0; }
  h2 { font-size:11.5pt; margin:5mm 0 1.5mm; }
  p { margin:0 0 2mm; text-align:justify; }
  ul { margin:0 0 2mm 5mm; padding:0; }
  li { margin-bottom:1.2mm; }
  table { width:100%; border-collapse:collapse; font-size:10pt; margin:2mm 0 3mm; }
  th, td { text-align:left; padding:1.6mm 2mm; border-bottom:1px solid ${colors.cartaLineaTenue}; }
  th { font-size:8.5pt; text-transform:uppercase; letter-spacing:.08em; color:${colors.cartaGrigio}; }
  .imp { background:${colors.cartaFondo}; padding:3mm 4mm; margin:3mm 0; font-size:10.5pt; }
  .firme { margin-top:10mm; display:flex; gap:10mm; }
  .firme div { flex:1; }
  .linea { border-bottom:1px solid ${colors.cartaTesto}; height:11mm; }
  .cap { font-size:8.5pt; color:${colors.cartaGrigio}; margin-top:1.5mm; }
  .nota { margin-top:7mm; font-size:8.5pt; color:${colors.cartaGrigioChiaro}; border-top:1px solid ${colors.cartaLineaTenue}; padding-top:3mm; }
</style></head><body>${corpo}</body></html>`;
    const f = w.open('', '_blank');
    if (!f) { crossAlert('Bloccato', 'Il browser ha bloccato la finestra. Consenti i popup e riprova.'); return; }
    f.document.write(html);
    f.document.close();
    setTimeout(() => { try { f.print(); } catch { /* si stampa a mano */ } }, 400);
  };

  const stampaCliente = () => {
    if (!quadro || !perimetro) return;
    const sezioni: SezioneDocumento[] = documentoCliente({
      allievo: nomeAllievo || '________________________',
      data: new Date(),
      quadro, priorita, perimetro, piano,
      obiettivo: obiettivo.trim() || undefined,
      coach: user?.name || 'Direttore tecnico',
      studio: `${brand.appName} — ${brand.tagline}`,
    });

    const corpo = `
<div class="studio">A.S.D. Evolution Sport · Mind Movement Lab</div>
<h1>Protocollo di lavoro</h1>
<div class="meta">
  ${nomeAllievo || '________________________'} · ${dataIt(new Date())}
  · a cura di ${user?.name || 'Direttore tecnico'}
</div>
<div class="hr"></div>
${sezioni.map((s) => `
  <h2>${s.n}. ${s.titolo}</h2>
  ${s.testo ? `<p>${s.testo}</p>` : ''}
  ${s.misure && s.misure.length ? `<table>
    <tr><th>Misura</th><th>Valore</th><th>Rilevata il</th></tr>
    ${s.misure.map((m) => `<tr><td>${m.etichetta}</td><td>${m.valore}</td><td>${m.quando}</td></tr>`).join('')}
  </table>` : ''}
  ${s.elenco && s.elenco.length ? `<ul>${s.elenco.map((e) => `<li>${e}</li>`).join('')}</ul>` : ''}
`).join('')}
<div class="imp">
  Il presente protocollo è stato letto e condiviso. L'allievo dichiara di aver compreso
  che le valutazioni hanno finalità di screening e non costituiscono atto diagnostico.
</div>
<div class="firme">
  <div><div class="linea"></div><div class="cap">L'allievo — firma e data</div></div>
  <div><div class="linea"></div><div class="cap">Il direttore tecnico — firma e data</div></div>
</div>
${perimetro.serveParere ? `<div class="firme">
  <div><div class="linea"></div><div class="cap">
    Professionista sanitario (ortopedico, fisiatra, fisioterapista) — timbro, firma e data
  </div></div>
</div>` : ''}
<div class="nota">
  Documento generato da ${brand.appName} · protocollo v${PROTOCOLLO_VERSION} · ${dataIt(new Date())}.
  Da stampare in due copie: una all'allievo, una allo studio.
</div>`;
    apriStampa(`Protocollo — ${nomeAllievo}`, corpo);
  };

  const stampaProcedura = () => {
    const corpo = `
<div class="studio">Uso interno · direttore tecnico</div>
<h1>Procedura di lavoro</h1>
<div class="meta">Come si opera, passo per passo · v${PROTOCOLLO_VERSION}</div>
<div class="hr"></div>
${PROCEDURA.map((p) => `
  <h2>${p.n}. ${p.fase}</h2>
  <p><b>Cosa fare.</b> ${p.cosaFare}</p>
  <p><b>Strumento.</b> ${p.strumento}</p>
  <p><b>Se manca o non basta.</b> ${p.alternativa}</p>
  <p><b>Si passa oltre quando.</b> ${p.siPassaOltreQuando}</p>
`).join('')}
<h2>Le domande davanti al quadro</h2>
<ul>${DOMANDE_GUIDA.map((d) => `<li>${d}</li>`).join('')}</ul>
<h2>Quando si rifanno i test</h2>
<table>
  <tr><th>Test</th><th>Ogni</th><th>Perché</th></tr>
  ${RITMO_TEST.map((r) => `<tr><td>${r.etichetta}</td><td>${r.ogniSettimane} sett.</td><td>${r.perche}</td></tr>`).join('')}
</table>
<div class="nota">Foglio interno: non si consegna all'allievo.</div>`;
    apriStampa('Procedura di lavoro', corpo);
  };

  // ------------------------------------------------------------

  if (caricaAllievi) {
    return <View style={s.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  }

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}>
      <Text style={s.intro}>
        Tutti i test letti <Text style={s.forte}>insieme</Text>, e la risposta su come operare:
        da dove si parte, con chi, in quanto tempo, a quanto. Il foglio si consegna e si firma
        in due. {PREZZO_VALUTAZIONE} € comprendono i test, la lettura integrata e questo protocollo.
      </Text>

      <StudentSearchPicker
        students={students}
        selectedId={studentId}
        onSelect={scegli}
        label="Allievo" placeholder="Cerca allievo…"
      />

      {studentId && (
        <View style={s.tabs}>
          {([['quadro', 'Il quadro'], ['piano', 'Il percorso'], ['procedura', 'La mia procedura']] as Array<[Vista, string]>)
            .map(([id, nome]) => (
              <TouchableOpacity
                key={id}
                style={[s.tab, vista === id && s.tabAttiva]}
                onPress={() => setVista(id)}
                activeOpacity={0.85}
              >
                <Text style={[s.tabTxt, vista === id && s.tabTxtAttivo]}>{nome}</Text>
              </TouchableOpacity>
            ))}
        </View>
      )}

      {loading && <View style={{ padding: spacing.xl }}><ActivityIndicator color={colors.accent} /></View>}

      {/* ---------- IL QUADRO ---------- */}
      {!loading && quadro && vista === 'quadro' && (
        <>
          <View style={s.card}>
            <Text style={s.cardTitle}>Che cosa è stato misurato</Text>
            {quadro.valutazioni.length === 0 && (
              <Text style={s.muted}>
                Nessuna valutazione registrata. Il protocollo si scrive dopo i test:
                senza misure non c'è niente da leggere insieme.
              </Text>
            )}
            {quadro.valutazioni.map((v) => (
              <View key={v.tipo} style={s.riga}>
                <Text style={s.rigaNome}>{v.etichetta}</Text>
                <Text style={s.rigaNota}>
                  {v.quante > 1 ? `${v.quante} volte · ` : ''}
                  {v.ultima ? dataIt(v.ultima) : '—'}
                </Text>
              </View>
            ))}
            {quadro.tracce.length > 0 && (
              <Text style={s.aiuto}>
                {quadro.tracce.length} misure su {quadro.areeCoperte} aree di {quadro.areeTotali}.
              </Text>
            )}
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Che cosa dicono, messe insieme</Text>
            {priorita.length === 0 && (
              <Text style={s.muted}>
                Dalle misure raccolte non emergono priorità che cambino l'ordine del lavoro.
                Non è un vuoto: è un risultato.
              </Text>
            )}
            {priorita.map((p, i) => (
              <View key={i} style={s.priorita}>
                <View style={s.prioritaTesta}>
                  <Text style={s.prioritaN}>{i + 1}</Text>
                  <Text style={s.prioritaTitolo}>{p.titolo}</Text>
                  <View style={[s.tag, { borderColor: p.forza === 'alta' ? colors.warning : colors.info }]}>
                    <Text style={[s.tagTxt, { color: p.forza === 'alta' ? colors.warning : colors.info }]}>
                      {p.forza === 'alta' ? 'prima' : 'poi'}
                    </Text>
                  </View>
                </View>
                <Text style={s.corpo}>{p.perche}</Text>
                <Text style={s.corpoTenue}>{p.comeSiLavora}</Text>
              </View>
            ))}
          </View>

          <View style={[s.card, perimetro?.serveParere ? { borderColor: colors.warning } : null]}>
            <Text style={s.cardTitle}>Il confine sanitario</Text>
            <View style={s.switchRiga}>
              <Text style={s.corpo}>
                Ha dichiarato dolore, infortuni o terapie in corso
              </Text>
              <Switch
                value={controindicazioni}
                onValueChange={setControindicazioni}
                trackColor={{ false: colors.border, true: colors.warning }}
              />
            </View>
            <Text style={s.lab}>Qualcosa che hai visto tu e va segnalato</Text>
            <TextInput
              style={s.input}
              placeholder="es. riferisce fitta al ginocchio destro in discesa"
              placeholderTextColor={colors.textLight}
              value={segnalazione}
              onChangeText={setSegnalazione}
            />
            {perimetro && (
              <Text style={[s.corpo, { marginTop: spacing.sm }]}>{perimetro.frase}</Text>
            )}
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Quando si rimisura</Text>
            {scadenze.map((x) => (
              <View key={x.tipo} style={s.riga}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rigaNome}>{x.etichetta}</Text>
                  <Text style={s.rigaNota}>
                    {x.mancante
                      ? 'mai fatto'
                      : `ultima ${x.giorniDaAllora} giorni fa`}
                  </Text>
                </View>
                {x.scaduto && (
                  <View style={[s.tag, { borderColor: colors.warning }]}>
                    <Text style={[s.tagTxt, { color: colors.warning }]}>da rifare</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </>
      )}

      {/* ---------- IL PERCORSO ---------- */}
      {!loading && quadro && vista === 'piano' && (
        <>
          <View style={s.card}>
            <Text style={s.cardTitle}>Obiettivo concordato</Text>
            <TextInput
              style={s.input}
              placeholder="es. tornare a correre senza fastidio"
              placeholderTextColor={colors.textLight}
              value={obiettivo}
              onChangeText={setObiettivo}
            />
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Quante sedute, e con chi</Text>
            <Text style={s.muted}>
              Il percorso può essere condotto da più persone: il metodo è lo stesso e il
              programma resta unico, seguito da te.
            </Text>
            {CONDUTTORI.map((c) => (
              <View key={c.id} style={s.rigaConduttore}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rigaNome}>{c.nome}</Text>
                  <Text style={s.rigaNota}>{c.ruolo} · {euro(c.prezzo)} € a seduta</Text>
                </View>
                <TextInput
                  style={s.inputPiccolo}
                  keyboardType="numeric"
                  value={sedute[c.id]}
                  onChangeText={(v) => setSedute((p) => ({ ...p, [c.id]: v.replace(/[^0-9]/g, '') }))}
                />
              </View>
            ))}

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.lab}>Sedute a settimana</Text>
                <TextInput
                  style={s.input} keyboardType="numeric"
                  value={aSettimana} onChangeText={(v) => setASettimana(v.replace(/[^0-9]/g, ''))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.lab}>Rate (vuoto = unica)</Text>
                <TextInput
                  style={s.input} keyboardType="numeric"
                  value={rate} onChangeText={(v) => setRate(v.replace(/[^0-9]/g, ''))}
                />
              </View>
            </View>

            <View style={s.switchRiga}>
              <Text style={s.corpo}>La valutazione è già stata pagata</Text>
              <Switch
                value={valutazionePagata}
                onValueChange={setValutazionePagata}
                trackColor={{ false: colors.border, true: colors.accent }}
              />
            </View>
          </View>

          <View style={[s.card, { borderColor: colors.accent }]}>
            <Text style={s.cardTitle}>Il conto</Text>
            {piano.righe.map((r, i) => (
              <View key={i} style={s.riga}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rigaNome}>{r.descrizione}</Text>
                  <Text style={s.rigaNota}>{r.quante} × {euro(r.prezzoUnitario)} €</Text>
                </View>
                <Text style={s.valore}>{euro(r.totale)} €</Text>
              </View>
            ))}
            <View style={s.riga}>
              <Text style={[s.rigaNome, { flex: 1 }]}>
                Valutazione completa e protocollo
              </Text>
              <Text style={s.valore}>
                {piano.valutazioneEuro > 0 ? `${euro(piano.valutazioneEuro)} €` : 'già pagata'}
              </Text>
            </View>
            <View style={s.totaleRiga}>
              <Text style={s.totaleLab}>Totale</Text>
              <Text style={s.totale}>{euro(piano.totaleEuro)} €</Text>
            </View>
            {piano.numeroRate && piano.importoRata && (
              <Text style={s.aiuto}>
                {piano.numeroRate} rate da {euro(piano.importoRata)} € ciascuna.
              </Text>
            )}
            {piano.totaleSedute > 0 && (
              <Text style={s.aiuto}>
                {piano.totaleSedute} sedute, {piano.seduteASettimana} a settimana:
                circa {piano.settimane} settimane.
              </Text>
            )}
          </View>

          <TouchableOpacity style={s.btnPrimario} onPress={stampaCliente} activeOpacity={0.85}>
            <Ionicons name="print-outline" size={19} color={colors.textOnAccent} />
            <Text style={s.btnPrimarioTxt}>Stampa il protocollo per l'allievo</Text>
          </TouchableOpacity>

          <Text style={s.disclaimer}>
            Due copie: una all'allievo, una allo studio. Si firma dal vivo.
            {perimetro?.serveParere
              ? ' Il documento porta anche la riga per la firma del professionista sanitario.'
              : ''}
          </Text>
        </>
      )}

      {/* ---------- LA MIA PROCEDURA ---------- */}
      {!loading && vista === 'procedura' && (
        <>
          <Text style={s.intro}>
            Questo foglio non si consegna: è il tuo. Come si opera, con quali strumenti,
            che cosa fare quando lo strumento manca, e quando un passo si può considerare chiuso.
          </Text>
          {PROCEDURA.map((p) => (
            <View key={p.n} style={s.card}>
              <Text style={s.cardTitle}>{p.n}. {p.fase}</Text>
              <Text style={s.corpo}>{p.cosaFare}</Text>
              <Text style={s.sezione}>Strumento</Text>
              <Text style={s.corpoTenue}>{p.strumento}</Text>
              <Text style={s.sezione}>Se manca o non basta</Text>
              <Text style={s.corpoTenue}>{p.alternativa}</Text>
              <Text style={s.sezione}>Si passa oltre quando</Text>
              <Text style={s.corpoTenue}>{p.siPassaOltreQuando}</Text>
            </View>
          ))}

          <View style={[s.card, { borderColor: colors.info }]}>
            <Text style={[s.cardTitle, { color: colors.info }]}>Le domande davanti al quadro</Text>
            {DOMANDE_GUIDA.map((d, i) => (
              <Text key={i} style={s.domanda}>· {d}</Text>
            ))}
          </View>

          <TouchableOpacity style={s.btnSecondario} onPress={stampaProcedura} activeOpacity={0.85}>
            <Ionicons name="print-outline" size={18} color={colors.accent} />
            <Text style={s.btnSecondarioTxt}>Stampa la procedura</Text>
          </TouchableOpacity>
        </>
      )}

      {!studentId && (
        <Text style={s.disclaimer}>
          Scegli un allievo: il protocollo si costruisce sulle sue misure, non su un modello.
        </Text>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  intro: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.sm },
  forte: { color: colors.text, fontWeight: '700' },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  tab: {
    flex: 1, paddingVertical: 9, borderRadius: borderRadius.round,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    alignItems: 'center',
  },
  tabAttiva: { borderColor: colors.accent, backgroundColor: colors.surfaceLight },
  tabTxt: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: '700' },
  tabTxtAttivo: { color: colors.accent },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, marginTop: spacing.md,
  },
  cardTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700', marginBottom: spacing.xs },
  muted: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20 },
  corpo: { color: colors.text, fontSize: fontSize.sm, lineHeight: 20, flex: 1 },
  corpoTenue: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 19 },
  sezione: {
    color: colors.textLight, fontSize: fontSize.xs, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.4, marginTop: spacing.sm, marginBottom: 2,
  },
  riga: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider,
  },
  rigaConduttore: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider,
  },
  rigaNome: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  rigaNota: { color: colors.textLight, fontSize: fontSize.xs, marginTop: 2 },
  valore: { color: colors.text, fontSize: fontSize.sm, fontWeight: '700' },
  totaleRiga: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: colors.accent, paddingTop: spacing.sm, marginTop: spacing.sm,
  },
  totaleLab: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  totale: { color: colors.accent, fontSize: fontSize.xl, fontWeight: '700' },
  priorita: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.sm, marginTop: spacing.sm },
  prioritaTesta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  prioritaN: {
    color: colors.accent, fontSize: fontSize.md, fontWeight: '700',
    minWidth: 16,
  },
  prioritaTitolo: { color: colors.text, fontSize: fontSize.md, fontWeight: '700', flex: 1 },
  tag: { borderWidth: 1, borderRadius: borderRadius.round, paddingHorizontal: 8, paddingVertical: 1 },
  tagTxt: { fontSize: fontSize.xs, fontWeight: '700' },
  switchRiga: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    marginTop: spacing.sm,
  },
  lab: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.sm, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm,
    color: colors.text, paddingHorizontal: 11, paddingVertical: 9,
    backgroundColor: colors.surfaceLight, fontSize: fontSize.sm,
  },
  inputPiccolo: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm,
    color: colors.text, paddingHorizontal: 11, paddingVertical: 8,
    backgroundColor: colors.surfaceLight, fontSize: fontSize.md,
    width: 64, textAlign: 'center', fontWeight: '700',
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  aiuto: { color: colors.textLight, fontSize: fontSize.xs, lineHeight: 17, marginTop: spacing.sm },
  domanda: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 21, marginTop: 3 },
  btnPrimario: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.accent, borderRadius: borderRadius.md,
    paddingVertical: 14, marginTop: spacing.md,
  },
  btnPrimarioTxt: { color: colors.textOnAccent, fontWeight: '700', fontSize: fontSize.md },
  btnSecondario: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.accent, borderRadius: borderRadius.md,
    paddingVertical: 13, marginTop: spacing.md,
  },
  btnSecondarioTxt: { color: colors.accent, fontWeight: '700', fontSize: fontSize.sm },
  disclaimer: {
    color: colors.textLight, fontSize: fontSize.xs, textAlign: 'center',
    lineHeight: 16, marginTop: spacing.md,
  },
});

export default ProtocolloScreen;
