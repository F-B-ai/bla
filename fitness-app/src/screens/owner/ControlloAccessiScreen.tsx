import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { ControlloAccessi, Gravita, RigaAccesso, sceltaEliminaInBlocco } from '../../domain/controlloAccessi';
import { VoceRegistro, descriviVoce, filtraRegistro } from '../../domain/registro';
import {
  leggiControlloAccessi, spiegaErroreControllo, eliminaAccessoSenzaScheda,
} from '../../services/controlloAccessiService';
import { crossAlert } from '../../utils/alert';
import { leggiRegistro } from '../../services/registroService';

// ============================================================
// CONTROLLO ACCESSI, DA LEGGERE
// ------------------------------------------------------------
// Tre cose, in quest'ordine:
//  1. quello che non torna (in rosso e arancio, in cima);
//  2. gli ultimi cambi di accesso e i tentativi respinti, dal
//     Registro: chi, su chi, quando;
//  3. tutti gli accessi, uno per riga, con le loro date.
//
// Lo schermo non calcola niente: mostra la fotografia fatta dal
// server nel momento in cui la si chiede.
// ============================================================

const COLORE: Record<Gravita, string> = {
  alta: colors.error,
  media: colors.warning,
  bassa: colors.textSecondary,
};

const quando = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

// Il pulsante c'è solo per un accesso senza scheda: una persona vera
// si toglie da Team, dove si cancellano scheda e accesso insieme.
const EliminaAccesso: React.FC<{ r: RigaAccesso; inCorso: boolean; onElimina: (r: RigaAccesso) => void }> = ({ r, inCorso, onElimina }) =>
  r.senzaScheda === true ? (
    <TouchableOpacity
      style={styles.elimina}
      onPress={() => onElimina(r)}
      disabled={inCorso}
      accessibilityRole="button"
      accessibilityLabel={`Elimina accesso ${r.emailAccesso}`}
    >
      <Text style={styles.eliminaTesto}>{inCorso ? 'Sto eliminando…' : 'Elimina accesso'}</Text>
    </TouchableOpacity>
  ) : null;

const Riga: React.FC<{ r: RigaAccesso; inCorso: boolean; onElimina: (r: RigaAccesso) => void }> = ({ r, inCorso, onElimina }) => (
  <View style={styles.voce}>
    <View style={styles.riga}>
      <Text style={styles.nome}>{r.nome}</Text>
      <Text style={styles.ruolo}>{r.ruolo}</Text>
    </View>
    <Text style={styles.dato} selectable>Entra con: {r.emailAccesso || '—'}</Text>
    {r.emailScheda && r.emailScheda.toLowerCase() !== r.emailAccesso.toLowerCase() ? (
      <Text style={styles.dato}>In scheda: {r.emailScheda}</Text>
    ) : null}
    <Text style={styles.dato}>Creato: {quando(r.creato)}</Text>
    <Text style={styles.dato}>Ultimo ingresso: {quando(r.ultimoIngresso)}</Text>
    <Text style={styles.dato}>Ultima attività: {quando(r.ultimaAttivita)}</Text>
    <Text style={styles.dato}>Sessioni valide dal: {quando(r.sessioniValideDal)}</Text>
    {r.disabilitato ? <Text style={[styles.dato, { color: colors.warning }]}>Accesso disabilitato</Text> : null}
    {r.segnalazioni.map((s, i) => (
      <Text key={i} style={[styles.segnalazione, { color: COLORE[s.gravita] }]}>· {s.testo}</Text>
    ))}
    <EliminaAccesso r={r} inCorso={inCorso} onElimina={onElimina} />
  </View>
);

export const ControlloAccessiScreen: React.FC = () => {
  const [dati, setDati] = useState<ControlloAccessi | null>(null);
  const [cambi, setCambi] = useState<VoceRegistro[]>([]);
  const [caricando, setCaricando] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [tutti, setTutti] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [blocco, setBlocco] = useState<string | null>(null);

  const carica = useCallback(async () => {
    setCaricando(true);
    setErrore(null);
    const [c, reg] = await Promise.allSettled([leggiControlloAccessi(), leggiRegistro(1000)]);
    if (c.status === 'fulfilled') setDati(c.value);
    else setErrore(spiegaErroreControllo(c.reason));
    if (reg.status === 'fulfilled') {
      setCambi(filtraRegistro(reg.value).filter((v) => v.oggetto === 'accesso' || v.azione === 'tentato').slice(0, 50));
    }
    setCaricando(false);
  }, []);

  useEffect(() => { void carica(); }, [carica]);

  const elimina = useCallback((r: RigaAccesso) => {
    if (blocco !== null) return; // è in corso l'eliminazione in blocco
    const email = r.emailAccesso || 'senza email';
    crossAlert(
      'Elimina accesso',
      `Elimino l'accesso ${email}? Non ha nessuna scheda in anagrafica. Chi lo usava non potrà più entrare. L'operazione non si annulla e resta scritta nel Registro.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            setEliminando(r.uid);
            try {
              await eliminaAccessoSenzaScheda(r.uid);
              crossAlert('Fatto', `Accesso ${email} eliminato.`);
              await carica();
            } catch (err: unknown) {
              const e = err as { message?: string } | undefined;
              crossAlert('Non eliminato', e?.message || `Non sono riuscito a eliminare l'accesso ${email}.`);
            } finally {
              setEliminando(null);
            }
          },
        },
      ],
    );
  }, [carica, blocco]);

  const scelta = sceltaEliminaInBlocco(dati?.righe);

  const eliminaTutti = useCallback(() => {
    const { daEliminare, protetti } = sceltaEliminaInBlocco(dati?.righe);
    if (daEliminare.length === 0) return;
    const elenco = daEliminare.map((r) => `· ${r.emailAccesso || 'senza email'}`).join('\n');
    const esclusi = protetti.length > 0
      ? `\n\nNe lascio fuori ${protetti.length}: hanno ancora un ruolo da staff nell'accesso, guardali uno per uno.`
      : '';
    crossAlert(
      'Elimina tutti i senza scheda',
      `Elimino ${daEliminare.length} accessi che non hanno nessuna scheda in anagrafica:\n${elenco}${esclusi}\n\nLe persone con scheda (allievi, coach, manager, titolare) non vengono toccate. L'operazione non si annulla e ogni eliminazione resta scritta nel Registro.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: `Elimina ${daEliminare.length}`,
          style: 'destructive',
          onPress: async () => {
            const nonRiusciti: string[] = [];
            let fatti = 0;
            // Uno alla volta: ogni eliminazione ricontrolla la scheda e
            // scrive la sua riga nel Registro.
            for (let i = 0; i < daEliminare.length; i++) {
              const r = daEliminare[i];
              setBlocco(`Elimino ${i + 1} di ${daEliminare.length}…`);
              try {
                await eliminaAccessoSenzaScheda(r.uid);
                fatti++;
              } catch (err: unknown) {
                const e = err as { message?: string } | undefined;
                nonRiusciti.push(`· ${r.emailAccesso || r.uid}: ${e?.message || 'non riuscito'}`);
              }
            }
            setBlocco(null);
            crossAlert(
              nonRiusciti.length ? 'Fatto in parte' : 'Fatto',
              `Eliminati ${fatti} accessi su ${daEliminare.length}.` +
                (nonRiusciti.length ? `\n\nNon eliminati:\n${nonRiusciti.join('\n')}` : ''),
            );
            await carica();
          },
        },
      ],
    );
  }, [dati, carica]);

  const righe = dati ? dati.righe.filter((r) => tutti || r.staff || r.segnalazioni.some((s) => s.gravita === 'alta')) : [];
  const generali = dati?.generali || [];
  const conProblemi = dati ? dati.righe.filter((r) => r.segnalazioni.some((s) => s.gravita !== 'bassa')) : [];

  return (
    <ScrollView
      style={styles.schermo}
      refreshControl={<RefreshControl refreshing={caricando} onRefresh={() => { void carica(); }} />}
    >
      <View style={styles.testata}>
        <Text style={styles.titolo}>Controllo accessi</Text>
        <Text style={styles.sottotitolo}>
          Chi può entrare nell'app, da quando, e che cosa non torna. Lo vedi solo tu.
        </Text>
        {dati ? <Text style={styles.aggiornato}>Fotografia del {quando(dati.generatoIl)}</Text> : null}
        <TouchableOpacity style={styles.bottone} onPress={() => { void carica(); }} disabled={caricando}>
          <Text style={styles.bottoneTesto}>{caricando ? 'Sto leggendo…' : 'Aggiorna'}</Text>
        </TouchableOpacity>
      </View>

      {caricando && !dati ? <ActivityIndicator style={styles.attesa} color={colors.primary} /> : null}

      {errore ? (
        <View style={styles.blocco}>
          <Text style={styles.erroreTitolo}>Il controllo non è arrivato</Text>
          <Text style={styles.dato} selectable>{errore}</Text>
        </View>
      ) : null}

      {dati ? (
        <>
          <View style={styles.blocco}>
            <Text style={styles.sezione}>Da guardare</Text>
            {generali.length === 0 && conProblemi.length === 0 ? (
              <Text style={styles.dato}>Niente che non torni fra accessi e anagrafica.</Text>
            ) : null}
            {scelta.daEliminare.length > 0 ? (
              <TouchableOpacity
                style={[styles.elimina, styles.eliminaTutti]}
                onPress={eliminaTutti}
                disabled={blocco !== null || eliminando !== null}
                accessibilityRole="button"
              >
                <Text style={styles.eliminaTuttiTesto}>
                  {blocco || `Elimina tutti i senza scheda (${scelta.daEliminare.length})`}
                </Text>
              </TouchableOpacity>
            ) : null}
            {generali.map((s, i) => (
              <Text key={`g${i}`} style={[styles.segnalazione, { color: COLORE[s.gravita] }]}>· {s.testo}</Text>
            ))}
            {conProblemi.map((r) => (
              <View key={r.uid} style={styles.voce}>
                <Text style={styles.nome}>{r.nome} · {r.ruolo}</Text>
                {r.senzaScheda && r.emailAccesso ? (
                  <Text style={styles.dato} selectable>Entra con: {r.emailAccesso}</Text>
                ) : null}
                {r.segnalazioni.filter((s) => s.gravita !== 'bassa').map((s, i) => (
                  <Text key={i} style={[styles.segnalazione, { color: COLORE[s.gravita] }]}>· {s.testo}</Text>
                ))}
                <EliminaAccesso r={r} inCorso={eliminando === r.uid} onElimina={elimina} />
              </View>
            ))}
            {dati.staffSenzaAccesso.length > 0 ? (
              <Text style={styles.dato}>
                Senza accesso: {dati.staffSenzaAccesso.map((p) => `${p.nome} (${p.ruolo})`).join(', ')}.
              </Text>
            ) : null}
          </View>

          <View style={styles.blocco}>
            <Text style={styles.sezione}>Ultimi cambi di accesso</Text>
            <Text style={styles.nota}>
              Dal Registro: chi ha cambiato email, password, ruolo o accessi, e chi ci ha
              provato senza averne il diritto. Le righe ci sono dall'11 novembre 2026:
              prima, questi cambi non venivano scritti da nessuna parte.
            </Text>
            {cambi.length === 0 ? (
              <Text style={styles.dato}>Nessun cambio registrato.</Text>
            ) : cambi.map((v) => (
              <View key={v.id || `${v.chi}-${v.quando.getTime()}`} style={styles.voce}>
                <Text style={[styles.nome, v.azione === 'tentato' && { color: colors.error }]}>{descriviVoce(v)}</Text>
                <Text style={styles.dato}>
                  {quando(v.quando.toISOString())}{v.ruolo ? ` · ${v.ruolo}` : ''}{v.dettaglio ? ` · ${v.dettaglio}` : ''}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.blocco}>
            <View style={styles.riga}>
              <Text style={styles.sezione}>Accessi ({dati.conteggi.accessi})</Text>
              <TouchableOpacity onPress={() => setTutti((x) => !x)}>
                <Text style={styles.interruttore}>{tutti ? 'Solo staff' : 'Mostra tutti'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.nota}>
              {tutti ? 'Tutti gli accessi.' : 'Staff, più gli accessi con un problema grave.'}
              {' '}«Sessioni valide dal» cambia quando la password viene cambiata o le sessioni
              vengono chiuse.
            </Text>
            {righe.map((r) => <Riga key={r.uid} r={r} inCorso={eliminando === r.uid} onElimina={elimina} />)}
          </View>
        </>
      ) : null}

      <View style={styles.fondo} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colors.background },
  testata: { padding: spacing.lg, paddingBottom: spacing.md },
  titolo: { fontSize: fontSize.hero, fontWeight: '700', color: colors.text },
  sottotitolo: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: 6, lineHeight: 18 },
  aggiornato: { fontSize: fontSize.md, color: colors.text, marginTop: spacing.md, fontWeight: '600' },
  bottone: {
    marginTop: spacing.md, alignSelf: 'flex-start',
    paddingVertical: 8, paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.round, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  bottoneTesto: { fontSize: fontSize.md, color: colors.text, fontWeight: '600' },
  attesa: { marginTop: 40 },
  blocco: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  sezione: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  riga: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.md },
  voce: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  nome: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, flexShrink: 1 },
  ruolo: { fontSize: fontSize.sm, color: colors.textSecondary },
  dato: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18, marginTop: 2 },
  segnalazione: { fontSize: fontSize.sm, lineHeight: 18, marginTop: 4, fontWeight: '600' },
  nota: { fontSize: fontSize.xs, color: colors.textLight, lineHeight: 15, marginTop: 4 },
  interruttore: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  elimina: {
    marginTop: spacing.sm, alignSelf: 'flex-start',
    paddingVertical: 6, paddingHorizontal: spacing.md,
    borderRadius: borderRadius.round, borderWidth: 1, borderColor: colors.error,
  },
  eliminaTesto: { fontSize: fontSize.sm, color: colors.error, fontWeight: '600' },
  eliminaTutti: { marginTop: spacing.md, backgroundColor: colors.error, paddingVertical: 8, paddingHorizontal: spacing.lg },
  eliminaTuttiTesto: { fontSize: fontSize.md, color: colors.white, fontWeight: '700' },
  erroreTitolo: { fontSize: fontSize.xl, fontWeight: '600', color: colors.error, marginBottom: 6 },
  fondo: { height: 40 },
});
