import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { formatCurrency } from '../../utils/helpers';
import {
  RapportoMattino, Somma, RigaRata, StatoLezioni, giornoRoma,
} from '../../domain/rapportoMattino';
import { leggiRapportoMattino, spiegaErroreRapporto } from '../../services/rapportoMattinoService';
import { RapportoCompleto, LivelloEvidenza } from '../../domain/evidenze';

// ============================================================
// IL RAPPORTO DEL MATTINO, DA LEGGERE
// ------------------------------------------------------------
// Quattro sezioni, ognuna con scritto sotto DA DOVE vengono i numeri
// e a QUALE PERIODO si riferiscono. In cima, quando è stato
// calcolato: un rapporto senza data è un rapporto di cui non ci si
// può fidare.
//
// Lo schermo non calcola niente. Mostra quello che il motore notturno
// ha scritto, o lo fa ricalcolare adesso.
// ============================================================

const quando = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const giorno = (g: string): string => {
  const [a, m, d] = g.split('-');
  return `${d}/${m}/${a}`;
};

/** «Nessuna registrazione» e «0 €» non sono la stessa cosa. */
const soldi = (s: Somma): string =>
  s.numero === 0 ? 'nessuna registrazione' : `${formatCurrency(s.importo)} · ${s.numero}`;

const COLORE_STATO: Record<StatoLezioni, string> = {
  'nessun percorso': colors.error,
  'rata scaduta': colors.error,
  'sedute da scalare': colors.warning,
  'bonifico da confermare': colors.info,
  'non ancora dovuto': colors.textSecondary,
};

const COLORE_LIVELLO: Record<LivelloEvidenza, string> = {
  'da fare': colors.error,
  'da guardare': colors.warning,
  'da sapere': colors.info,
};

const Fonte: React.FC<{ periodo: string; fonte: string }> = ({ periodo, fonte }) => (
  <View style={styles.fonte}>
    <Text style={styles.fonteTesto}>Periodo: {periodo}</Text>
    <Text style={styles.fonteTesto}>Fonte: {fonte}</Text>
  </View>
);

const Riga: React.FC<{ etichetta: string; valore: string; forte?: boolean }> = ({ etichetta, valore, forte }) => (
  <View style={styles.riga}>
    <Text style={styles.rigaEtichetta}>{etichetta}</Text>
    <Text style={[styles.rigaValore, forte && styles.rigaForte]}>{valore}</Text>
  </View>
);

const RataRiga: React.FC<{ r: RigaRata; colore: string }> = ({ r, colore }) => (
  <View style={styles.voce}>
    <View style={styles.riga}>
      <Text style={styles.voceNome}>{r.allievo}</Text>
      <Text style={[styles.rigaValore, { color: colore }]}>{formatCurrency(r.importo)}</Text>
    </View>
    <Text style={styles.voceSotto}>
      {r.giorni > 0
        ? `scaduta il ${giorno(r.scadenza)} · ${r.giorni} ${r.giorni === 1 ? 'giorno' : 'giorni'} fa`
        : r.giorni === 0 ? `scade oggi (${giorno(r.scadenza)})`
          : `scade il ${giorno(r.scadenza)} · fra ${-r.giorni} ${r.giorni === -1 ? 'giorno' : 'giorni'}`}
      {'  ·  '}{r.collaboratore}
    </Text>
  </View>
);

export const RapportoMattinoScreen: React.FC = () => {
  const [rapporto, setRapporto] = useState<RapportoCompleto | null>(null);
  const [caricando, setCaricando] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

  const carica = useCallback(async (aggiorna = false) => {
    setCaricando(true);
    try {
      setErrore(null);
      setRapporto(await leggiRapportoMattino(aggiorna));
    } catch (e) {
      // Un rapporto non letto e un rapporto vuoto non sono la stessa
      // cosa: qui si dice che non è arrivato, non che è tutto a zero.
      setErrore(spiegaErroreRapporto(e));
    } finally {
      setCaricando(false);
    }
  }, []);

  useEffect(() => { void carica(false); }, [carica]);

  const r = rapporto;

  return (
    <ScrollView
      style={styles.schermo}
      refreshControl={<RefreshControl refreshing={caricando} onRefresh={() => { void carica(false); }} />}
    >
      <View style={styles.testata}>
        <Text style={styles.titolo}>Rapporto del mattino</Text>
        <Text style={styles.sottotitolo}>
          Lo scrive il motore notturno alle 04:00. Lo leggi solo tu.
        </Text>
        {r ? (
          <Text style={styles.aggiornato}>Aggiornato il {quando(r.generatoIl)}</Text>
        ) : null}
        <TouchableOpacity
          style={styles.bottone}
          onPress={() => { void carica(true); }}
          disabled={caricando}
        >
          <Text style={styles.bottoneTesto}>
            {caricando ? 'Sto leggendo…' : 'Ricalcola adesso'}
          </Text>
        </TouchableOpacity>
      </View>

      {caricando && !r ? <ActivityIndicator style={styles.attesa} color={colors.primary} /> : null}

      {errore ? (
        <View style={styles.errore}>
          <Text style={styles.erroreTitolo}>Il rapporto non è arrivato</Text>
          <Text style={styles.erroreTesto} selectable>{errore}</Text>
          <Text style={styles.erroreTesto}>
            Non vuol dire che i numeri siano a zero: vuol dire che non li ho potuti leggere.
          </Text>
        </View>
      ) : null}

      {r ? (
        <>
          {r.giorno !== giornoRoma(new Date()) ? (
            <View style={styles.avvisi}>
              <Text style={styles.avvisiTitolo}>Non è il rapporto di oggi</Text>
              <Text style={styles.avvisiTesto}>
                Questo è il rapporto del {giorno(r.giorno)}: quello di stanotte non è stato scritto.
                Tocca «Ricalcola adesso» per averlo aggiornato.
              </Text>
            </View>
          ) : null}
          {r.avvisi.length > 0 ? (
            <View style={styles.avvisi}>
              <Text style={styles.avvisiTitolo}>Dati da sistemare</Text>
              {r.avvisi.map((a, i) => <Text key={i} style={styles.avvisiTesto}>· {a}</Text>)}
            </View>
          ) : null}

          {/* in evidenza: che cosa merita una decisione oggi */}
          <View style={styles.blocco}>
            <Text style={styles.sezione}>In evidenza oggi</Text>
            {r.evidenze.length === 0 ? (
              <Text style={styles.vuoto}>
                Niente che richieda una decisione: i numeri sono qui sotto.
              </Text>
            ) : r.evidenze.map((e) => (
              <View key={e.chiave} style={styles.voce}>
                <Text style={[styles.stato, { color: COLORE_LIVELLO[e.livello] }]}>{e.livello}</Text>
                <Text style={styles.voceNome}>{e.titolo}</Text>
                <Text style={styles.voceSotto}>{e.perche}</Text>
                <Text style={styles.proposta}>Proposta: {e.proposta}</Text>
              </View>
            ))}
            <Text style={styles.nota}>
              Sono regole scritte, non intelligenza artificiale: ogni riga cita i numeri
              del rapporto. Le proposte non partono da sole: decidi tu.
            </Text>
          </View>

          {/* 1 — incassi */}
          <View style={styles.blocco}>
            <Text style={styles.sezione}>1 · Incassi registrati</Text>
            <Text style={styles.gruppo}>Rate segnate pagate</Text>
            <Riga etichetta={`Ieri (${r.incassi.periodi.ieri})`} valore={soldi(r.incassi.rate.ieri)} />
            <Riga etichetta="Mese in corso" valore={soldi(r.incassi.rate.mese)} forte />
            <Riga etichetta="Mese scorso" valore={soldi(r.incassi.rate.mesePrecedente)} />
            <Text style={styles.fonteTesto}>Fonte: {r.incassi.rate.fonte}</Text>

            <Text style={styles.gruppo}>Movimenti in entrata</Text>
            <Riga etichetta={`Ieri (${r.incassi.periodi.ieri})`} valore={soldi(r.incassi.movimenti.ieri)} />
            <Riga etichetta="Mese in corso" valore={soldi(r.incassi.movimenti.mese)} forte />
            <Riga etichetta="Mese scorso" valore={soldi(r.incassi.movimenti.mesePrecedente)} />
            <Text style={styles.fonteTesto}>Fonte: {r.incassi.movimenti.fonte}</Text>

            <Text style={styles.gruppo}>Movimenti in uscita</Text>
            <Riga etichetta="Mese in corso" valore={soldi(r.incassi.uscite.mese)} />
            <Riga etichetta="Mese scorso" valore={soldi(r.incassi.uscite.mesePrecedente)} />
            <Text style={styles.fonteTesto}>Fonte: {r.incassi.uscite.fonte}</Text>

            <View style={styles.fonte}>
              <Text style={styles.fonteTesto}>Mese in corso: {r.incassi.periodi.mese}</Text>
              <Text style={styles.fonteTesto}>Mese scorso: {r.incassi.periodi.mesePrecedente}</Text>
            </View>
            <Text style={styles.nota}>{r.incassi.nota}</Text>
          </View>

          {/* 2 — rate */}
          <View style={styles.blocco}>
            <Text style={styles.sezione}>2 · Rate scadute e in scadenza</Text>

            <Text style={styles.gruppo}>
              Scadute ({r.rate.scadute.length}) · {formatCurrency(r.rate.totaleScaduto)}
            </Text>
            {r.rate.scadute.length === 0
              ? <Text style={styles.vuoto}>Nessuna rata scaduta.</Text>
              : r.rate.scadute.map((x, i) => <RataRiga key={`s${i}`} r={x} colore={colors.error} />)}

            <Text style={styles.gruppo}>Bonifici dichiarati, da confermare ({r.rate.daConfermare.length})</Text>
            {r.rate.daConfermare.length === 0
              ? <Text style={styles.vuoto}>Nessuno.</Text>
              : r.rate.daConfermare.map((x, i) => <RataRiga key={`c${i}`} r={x} colore={colors.info} />)}

            <Text style={styles.gruppo}>
              In scadenza nei prossimi 7 giorni ({r.rate.inScadenza.length}) · {formatCurrency(r.rate.totaleInScadenza)}
            </Text>
            {r.rate.inScadenza.length === 0
              ? <Text style={styles.vuoto}>Nessuna.</Text>
              : r.rate.inScadenza.map((x, i) => <RataRiga key={`i${i}`} r={x} colore={colors.text} />)}

            <Fonte periodo={r.rate.periodo} fonte={r.rate.fonte} />
          </View>

          {/* 3 — lezioni senza pagamento registrato */}
          <View style={styles.blocco}>
            <Text style={styles.sezione}>3 · Lezioni svolte senza un pagamento registrato</Text>
            <Text style={styles.nota}>{r.lezioni.nota}</Text>
            {r.lezioni.righe.length === 0
              ? <Text style={styles.vuoto}>Nessun allievo in questa situazione.</Text>
              : r.lezioni.righe.map((x) => (
                <View key={x.allievoId} style={styles.voce}>
                  <View style={styles.riga}>
                    <Text style={styles.voceNome}>{x.allievo}</Text>
                    <Text style={[styles.stato, { color: COLORE_STATO[x.stato] }]}>{x.stato}</Text>
                  </View>
                  <Text style={styles.voceSotto}>
                    {x.sedute} {x.sedute === 1 ? 'seduta' : 'sedute'} · ultima il {giorno(x.ultima)} · {x.collaboratore}
                  </Text>
                  <Text style={styles.voceSotto}>{x.dettaglio}</Text>
                </View>
              ))}
            <Fonte periodo={r.lezioni.periodo} fonte={r.lezioni.fonte} />
          </View>

          {/* 4 — collaboratori */}
          <View style={styles.blocco}>
            <Text style={styles.sezione}>4 · Riepilogo per collaboratore</Text>
            {r.collaboratori.righe.length === 0
              ? <Text style={styles.vuoto}>Nessun collaboratore attivo.</Text>
              : r.collaboratori.righe.map((x) => (
                <View key={x.id || 'nessuno'} style={styles.voce}>
                  <View style={styles.riga}>
                    <Text style={styles.voceNome}>{x.nome}</Text>
                    <Text style={styles.voceSotto}>{x.ruolo}</Text>
                  </View>
                  <Riga etichetta="Allievi assegnati" valore={String(x.allievi)} />
                  <Riga etichetta="Sedute svolte nel mese" valore={String(x.sedute)} />
                  <Riga etichetta="Rate segnate pagate" valore={soldi(x.rate)} />
                  <Riga etichetta="Movimenti in entrata" valore={soldi(x.movimenti)} />
                  {x.quotaCollaboratore !== null && x.quotaStudio !== null ? (
                    <>
                      <Riga etichetta="Quota collaboratore" valore={formatCurrency(x.quotaCollaboratore)} />
                      <Riga etichetta="Quota studio" valore={formatCurrency(x.quotaStudio)} forte />
                    </>
                  ) : null}
                  <Text style={styles.voceSotto}>{x.notaQuota}</Text>
                </View>
              ))}
            <Fonte periodo={r.collaboratori.periodo} fonte={r.collaboratori.fonte} />
            <Text style={styles.nota}>{r.collaboratori.nota}</Text>
          </View>

          <Text style={styles.letti}>
            Nel conto sono entrati {r.letti.piani} piani ({r.letti.rate} rate), {r.letti.movimenti} movimenti,
            {' '}{r.letti.sedute} sedute e {r.letti.persone} persone in anagrafica.
          </Text>
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
  gruppo: {
    fontSize: fontSize.md, fontWeight: '700', color: colors.text,
    marginTop: spacing.lg, marginBottom: 4,
  },
  riga: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'baseline', gap: spacing.md, paddingVertical: 3,
  },
  rigaEtichetta: { fontSize: fontSize.md, color: colors.textSecondary, flex: 1 },
  rigaValore: { fontSize: fontSize.md, color: colors.text, fontVariant: ['tabular-nums'] },
  rigaForte: { fontWeight: '700' },

  voce: {
    marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  voceNome: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, flexShrink: 1 },
  voceSotto: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 17, marginTop: 2 },
  stato: { fontSize: fontSize.sm, fontWeight: '700' },
  vuoto: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: 4 },
  proposta: { fontSize: fontSize.sm, color: colors.text, lineHeight: 17, marginTop: 4 },

  fonte: { marginTop: spacing.lg, gap: 2 },
  fonteTesto: { fontSize: fontSize.xs, color: colors.textLight, lineHeight: 15, marginTop: 2 },
  nota: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 17, marginTop: spacing.md },

  avvisi: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderLeftWidth: 3, borderLeftColor: colors.warning,
    padding: spacing.lg, marginHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  avvisiTitolo: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: 6 },
  avvisiTesto: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18 },

  errore: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  erroreTitolo: { fontSize: fontSize.xl, fontWeight: '600', color: colors.error, marginBottom: 6 },
  erroreTesto: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 19, marginBottom: 6 },

  letti: {
    fontSize: fontSize.xs, color: colors.textLight, lineHeight: 16,
    marginHorizontal: spacing.lg, marginTop: spacing.sm,
  },
  fondo: { height: 40 },
});
