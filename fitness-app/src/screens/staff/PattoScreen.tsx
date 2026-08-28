import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { crossAlert } from '../../utils/alert';
import { getStudents } from '../../services/authService';
import { Student } from '../../types';
import { StudentSearchPicker } from '../../components/common/StudentSearchPicker';
import { brand } from '../../config/brand';
import {
  articoli, IMPEGNO_STUDIO, IMPEGNO_ALLIEVO, REGOLE, DatiPatto, PATTO_VERSION,
} from '../../domain/patto';

// ============================================================
// IL PATTO — si compila, si stampa, si firma dal vivo.
// Nessuna firma memorizzata: una firma-immagine applicata in
// automatico non è una firma valida e in una contestazione vale
// meno di niente. Si stampa in due copie e si firma davanti.
// ============================================================

const oggi = () => new Date().toLocaleDateString('it-IT', {
  day: 'numeric', month: 'long', year: 'numeric',
});

export function PattoScreen() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [percorso, setPercorso] = useState('');
  const [rate, setRate] = useState('');
  const [importoRata, setImportoRata] = useState('');
  const [primaScadenza, setPrimaScadenza] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStudents().then(setStudents)
      .catch(() => crossAlert('Errore', 'Non riesco a caricare gli allievi'))
      .finally(() => setLoading(false));
  }, []);

  const dati: DatiPatto = useMemo(() => {
    const n = parseInt(rate, 10);
    const r = parseFloat(importoRata.replace(',', '.'));
    return {
      allievo: student ? `${student.name} ${student.surname}` : '________________________',
      percorso: percorso || '________________________',
      coach: user?.name || 'Direttore Tecnico',
      studio: `${brand.appName} — ${brand.tagline}`,
      numeroRate: isNaN(n) ? undefined : n,
      importoRata: isNaN(r) ? undefined : r,
      importoTotale: !isNaN(n) && !isNaN(r) ? n * r : undefined,
      primaScadenza: primaScadenza || undefined,
    };
  }, [student, percorso, rate, importoRata, primaScadenza, user]);

  const art = useMemo(() => articoli(dati), [dati]);

  const stampa = () => {
    if (Platform.OS !== 'web') {
      crossAlert('Solo da browser', 'La stampa funziona dalla web app. Apri ESSĒRE da Safari o Chrome.');
      return;
    }
    const w = (globalThis as any).window;
    const html = `<!doctype html><html lang="it"><head><meta charset="utf-8">
<title>Patto — ${dati.allievo}</title>
<style>
  @page { size: A4; margin: 20mm 18mm; }
  body { font-family: Georgia, "Times New Roman", serif; color:${colors.cartaInchiostro}; line-height:1.55; font-size:11.5pt; }
  h1 { font-size:15pt; margin:0 0 2mm; letter-spacing:.02em; }
  .studio { font-size:9pt; letter-spacing:.16em; text-transform:uppercase; color:${colors.cartaGrigioChiaro}; }
  .hr { border-top:1px solid ${colors.cartaLinea}; margin:5mm 0; }
  .parti { font-size:10.5pt; margin-bottom:4mm; }
  .parti b { display:inline-block; min-width:26mm; }
  h2 { font-size:11.5pt; margin:5mm 0 1mm; }
  p { margin:0 0 2mm; text-align:justify; }
  .imp { background:${colors.cartaFondo}; padding:3mm 4mm; margin:4mm 0; font-size:10.5pt; }
  .firme { margin-top:12mm; display:flex; gap:14mm; }
  .firme div { flex:1; }
  .linea { border-bottom:1px solid ${colors.cartaTesto}; height:12mm; }
  .cap { font-size:9pt; color:${colors.cartaGrigio}; margin-top:1.5mm; }
  .nota { margin-top:8mm; font-size:8.5pt; color:${colors.cartaGrigioChiaro}; border-top:1px solid ${colors.cartaLineaTenue}; padding-top:3mm; }
</style></head><body>
<div class="studio">${dati.studio}</div>
<h1>Patto di percorso</h1>
<div class="hr"></div>
<div class="parti">
  <div><b>Allievo</b> ${dati.allievo}</div>
  <div><b>Percorso</b> ${dati.percorso}</div>
  <div><b>Coach</b> ${dati.coach}</div>
  <div><b>Data</b> ${oggi()}</div>
</div>
${art.map((a) => `<h2>${a.n}. ${a.titolo}</h2><p>${a.testo}</p>`).join('')}
<div class="imp"><b>Lo studio si impegna.</b> ${IMPEGNO_STUDIO}</div>
<div class="imp"><b>L'allievo si impegna.</b> ${IMPEGNO_ALLIEVO}</div>
<div class="firme">
  <div><div class="linea"></div><div class="cap">L'allievo — firma e data</div></div>
  <div><div class="linea"></div><div class="cap">Per lo studio — firma e data</div></div>
</div>
<div class="nota">Documento generato da ESSĒRE · patto v${PATTO_VERSION} · ${oggi()}.
Da stampare in due copie: una all'allievo, una allo studio.</div>
</body></html>`;
    const f = w.open('', '_blank');
    if (!f) { crossAlert('Bloccato', 'Il browser ha bloccato la finestra. Consenti i popup e riprova.'); return; }
    f.document.write(html);
    f.document.close();
    setTimeout(() => { try { f.print(); } catch { /* l'utente stampa a mano */ } }, 400);
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  }

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}>
      <StudentSearchPicker
        students={students}
        selectedId={student?.id}
        onSelect={(id) => setStudent(students.find((x) => x.id === id) || null)}
        label="Allievo" placeholder="Cerca allievo…"
      />

      <View style={s.card}>
        <Text style={s.cardTitle}>Il percorso concordato</Text>
        <Text style={s.lab}>Come si chiama il percorso</Text>
        <TextInput style={s.input} placeholder="es. Ricomposizione e postura"
          placeholderTextColor={colors.textLight} value={percorso} onChangeText={setPercorso} />
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.lab}>Numero di rate</Text>
            <TextInput style={s.input} keyboardType="numeric" placeholder="6"
              placeholderTextColor={colors.textLight} value={rate} onChangeText={setRate} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.lab}>Importo rata (€)</Text>
            <TextInput style={s.input} keyboardType="numeric" placeholder="150"
              placeholderTextColor={colors.textLight} value={importoRata} onChangeText={setImportoRata} />
          </View>
        </View>
        <Text style={s.lab}>Prima scadenza</Text>
        <TextInput style={s.input} placeholder="15 ottobre 2026"
          placeholderTextColor={colors.textLight} value={primaScadenza} onChangeText={setPrimaScadenza} />
        {dati.importoTotale !== undefined && (
          <Text style={s.totale}>Totale: {dati.importoTotale} €</Text>
        )}
      </View>

      {/* anteprima del testo */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Anteprima</Text>
        {art.map((a) => (
          <View key={a.n} style={{ marginTop: spacing.sm }}>
            <Text style={s.artTitolo}>{a.n}. {a.titolo}</Text>
            <Text style={s.artTesto}>{a.testo}</Text>
          </View>
        ))}
        <View style={s.impegno}><Text style={s.impegnoTxt}>
          <Text style={{ fontWeight: '700' }}>Lo studio si impegna. </Text>{IMPEGNO_STUDIO}
        </Text></View>
        <View style={s.impegno}><Text style={s.impegnoTxt}>
          <Text style={{ fontWeight: '700' }}>L'allievo si impegna. </Text>{IMPEGNO_ALLIEVO}
        </Text></View>
      </View>

      <TouchableOpacity style={s.btn} onPress={stampa} activeOpacity={0.85}>
        <Ionicons name="print-outline" size={19} color={colors.textOnAccent} />
        <Text style={s.btnTxt}>Stampa in due copie</Text>
      </TouchableOpacity>

      <View style={[s.card, { borderColor: colors.info }]}>
        <Text style={[s.cardTitle, { color: colors.info }]}>Sulla firma</Text>
        <Text style={s.muted}>
          Si firma dal vivo, in due copie: una all'allievo, una allo studio. Poi fotografa
          la copia firmata e allegala al profilo.{'\n\n'}
          Nessuna firma viene memorizzata nell'app: una firma-immagine applicata in automatico
          non è una firma valida, e in una contestazione conta meno di niente.
        </Text>
      </View>

      <Text style={s.disclaimer}>
        Disdetta entro {REGOLE.disdettaOre} ore · promemoria a {REGOLE.promemoriaGiorni.join(', ')} giorni ·
        pausa del percorso dopo {REGOLE.sospensioneGiorni} giorni dalla scadenza.
        Fai vedere questo testo al commercialista prima del primo utilizzo.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, marginTop: spacing.md,
  },
  cardTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700', marginBottom: spacing.xs },
  muted: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20 },
  lab: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.sm, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm,
    color: colors.text, paddingHorizontal: 11, paddingVertical: 9,
    backgroundColor: colors.surfaceLight, fontSize: fontSize.sm,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  totale: { color: colors.accent, fontWeight: '700', fontSize: fontSize.sm, marginTop: spacing.sm },
  artTitolo: { color: colors.text, fontSize: fontSize.sm, fontWeight: '700' },
  artTesto: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, marginTop: 3 },
  impegno: {
    backgroundColor: colors.surfaceLight, borderRadius: borderRadius.sm,
    padding: spacing.sm, marginTop: spacing.sm,
  },
  impegnoTxt: { color: colors.text, fontSize: fontSize.sm, lineHeight: 20 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.accent, borderRadius: borderRadius.md,
    paddingVertical: 14, marginTop: spacing.md,
  },
  btnTxt: { color: colors.textOnAccent, fontWeight: '700', fontSize: fontSize.md },
  disclaimer: {
    color: colors.textLight, fontSize: fontSize.xs, textAlign: 'center',
    lineHeight: 16, marginTop: spacing.md,
  },
});

export default PattoScreen;
