import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { colors } from '../../config/theme';
import { leggiRegistro } from '../../services/registroService';
import { getCollaborators, getManagers, getStudents } from '../../services/authService';
import { isStudentAssignedTo } from '../../utils/helpers';
import { getTransactions } from '../../services/financialService';
import { chiNonRegistra, RigaRicavo } from '../../domain/ricaviCollaboratore';
import {
  VoceRegistro, descriviVoce, pesoVoce, filtraRegistro, daGuardare,
  riepilogoTutti, giorniDaUltimaVolta, RiepilogoPersona,
} from '../../domain/registro';

// ============================================================
// IL REGISTRO, DA LEGGERE
// ------------------------------------------------------------
// Due viste, e la prima non è l'elenco.
//
// «Le persone» risponde alla domanda che il titolare ha fatto
// davvero — chi fa che cosa, e da quanto non si fa vedere — perché
// un elenco di quattrocento righe in ordine di tempo non risponde a
// niente: si scorre per due minuti e si chiude.
//
// «Da guardare» tiene solo eliminazioni e soldi. Se è vuoto, è vuoto
// davvero, e lo dice: un pannello che resta bianco senza spiegare si
// legge come un guasto.
// ============================================================

type Vista = 'persone' | 'guardare' | 'tutto';

const quando = (d: Date): string => d.toLocaleDateString('it-IT', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});

const RigaPersona: React.FC<{ r: RiepilogoPersona }> = ({ r }) => {
  const giorni = giorniDaUltimaVolta(r);
  const silenzio = giorni !== null && giorni >= 14;
  return (
    <View style={styles.scheda}>
      <View style={styles.schedaTesta}>
        <Text style={styles.nome}>{r.nome || 'Senza nome'}</Text>
        <Text style={[styles.quando, silenzio && styles.allarme]}>
          {giorni === null
            ? 'mai vista'
            : giorni === 0 ? 'oggi' : `${giorni} giorni fa`}
        </Text>
      </View>
      <Text style={styles.conti}>
        {r.perAzione.entrato} ingressi · {r.perAzione.creato} creati ·{' '}
        {r.perAzione.modificato} modifiche ·{' '}
        <Text style={r.perAzione.eliminato > 0 ? styles.allarme : undefined}>
          {r.perAzione.eliminato} eliminazioni
        </Text>
      </Text>
    </View>
  );
};

const RigaVoce: React.FC<{ v: VoceRegistro }> = ({ v }) => (
  <View style={styles.voce}>
    <View style={[
      styles.tacca,
      pesoVoce(v) === 'alta' && styles.taccaAlta,
      pesoVoce(v) === 'bassa' && styles.taccaBassa,
    ]} />
    <View style={styles.voceCorpo}>
      <Text style={styles.voceTesto}>{descriviVoce(v)}</Text>
      <Text style={styles.voceSotto}>
        {quando(v.quando)}{v.dettaglio ? ` · ${v.dettaglio}` : ''}
      </Text>
    </View>
  </View>
);

export const RegistroScreen: React.FC = () => {
  const [voci, setVoci] = useState<VoceRegistro[]>([]);
  const [fermi, setFermi] = useState<RigaRicavo[]>([]);
  const [caricando, setCaricando] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>('persone');

  const carica = useCallback(async () => {
    try {
      setErrore(null);
      const [righe, collaboratori, manager, movimenti, allievi] = await Promise.all([
        leggiRegistro(300),
        getCollaborators().catch(() => []),
        getManagers().catch(() => []),
        getTransactions().catch(() => []),
        getStudents().catch(() => []),
      ]);
      setVoci(righe);
      // Chi ha allievi assegnati e non ha registrato un solo
      // movimento. Non dice che non lavora: dice che nell'app non
      // risulta — ed e' l'unica cosa che questi dati sostengono.
      // Gli allievi si contano dalle schede degli allievi, non
      // dall'elenco scritto sulla scheda del collaboratore: quella e'
      // una copia, e una copia stantia qui si leggerebbe come
      // un'assoluzione.
      // 2 novembre 2026 — I MANAGER MANCAVANO.
      // Qui si leggevano solo i collaboratori, e `getCollaborators`
      // filtra su `role == 'collaborator'`. Un manager con ventuno
      // allievi e zero movimenti era invisibile PER COSTRUZIONE: non
      // compariva, e non comparire in questo elenco si legge come
      // «su di lui non c'e' niente da dire».
      //
      // Chi segue allievi va guardato, qualunque etichetta abbia.
      setFermi(chiNonRegistra(
        [...collaboratori, ...manager].map((c) => ({
          id: c.id,
          name: c.name,
          surname: c.surname,
          allievi: allievi.filter((a) => isStudentAssignedTo(a, c.id)).length,
        })),
        movimenti
      ));
    } catch (e) {
      // Un elenco vuoto e un elenco non letto non sono la stessa
      // cosa, e confonderli qui sarebbe grave: direbbe «nessuno ha
      // fatto niente» quando la verità è «non sono riuscito a
      // guardare».
      setErrore((e as Error)?.message || 'Registro non leggibile');
    } finally {
      setCaricando(false);
    }
  }, []);

  useEffect(() => { void carica(); }, [carica]);

  const persone = riepilogoTutti(voci);
  const elenco = vista === 'guardare' ? daGuardare(voci) : filtraRegistro(voci);

  return (
    <View style={styles.schermo}>
      <View style={styles.testata}>
        <Text style={styles.titolo}>Registro</Text>
        <Text style={styles.sottotitolo}>
          Chi ha fatto che cosa. Le righe non si modificano e non si
          cancellano: nemmeno da qui.
        </Text>
      </View>

      <View style={styles.schede}>
        {(['persone', 'guardare', 'tutto'] as Vista[]).map((x) => (
          <TouchableOpacity
            key={x}
            style={[styles.linguetta, vista === x && styles.linguettaAttiva]}
            onPress={() => setVista(x)}
          >
            <Text style={[styles.linguettaTesto, vista === x && styles.linguettaTestoAttivo]}>
              {x === 'persone' ? 'Le persone' : x === 'guardare' ? 'Da guardare' : 'Tutto'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.corpo}
        refreshControl={
          <RefreshControl refreshing={caricando} onRefresh={() => { void carica(); }} />
        }
      >
        {caricando && voci.length === 0 && (
          <ActivityIndicator style={styles.attesa} color={colors.primary} />
        )}

        {errore && (
          <View style={styles.errore}>
            <Text style={styles.erroreTitolo}>Non sono riuscito a leggere il registro</Text>
            <Text style={styles.erroreTesto} selectable>{errore}</Text>
            <Text style={styles.erroreTesto}>
              Questo non vuol dire che non sia successo niente: vuol dire
              che non l&apos;ho potuto guardare.
            </Text>
          </View>
        )}

        {!errore && !caricando && voci.length === 0 && (
          <Text style={styles.vuoto}>
            Il registro è vuoto. Comincia a riempirsi dal primo accesso
            dopo questo aggiornamento: non contiene quello che è
            successo prima.
          </Text>
        )}

        {!errore && vista === 'persone' && fermi.length > 0 && (
          <View style={styles.fermi}>
            <Text style={styles.fermiTitolo}>
              Hanno allievi e non registrano niente
            </Text>
            {fermi.map((f) => (
              <Text key={f.id} style={styles.fermiRiga}>
                <Text style={styles.allarme}>{f.nome || 'Senza nome'}</Text>
                {`  ·  ${f.allievi} ${f.allievi === 1 ? 'allievo' : 'allievi'} assegnati, nessun movimento`}
              </Text>
            ))}
            <Text style={styles.fermiNota}>
              Vuol dire che nell&apos;applicazione non risulta: non che non
              abbia lavorato. Sono due cose diverse.
            </Text>
          </View>
        )}

        {!errore && vista === 'persone' && persone.map((r) => (
          <RigaPersona key={r.chi} r={r} />
        ))}

        {!errore && vista !== 'persone' && elenco.map((v) => (
          <RigaVoce key={v.id || `${v.chi}-${v.quando.getTime()}`} v={v} />
        ))}

        {!errore && vista === 'guardare' && elenco.length === 0 && voci.length > 0 && (
          <Text style={styles.vuoto}>
            Niente da guardare: nessuna eliminazione e nessun movimento
            sui pagamenti nelle ultime righe.
          </Text>
        )}

        <View style={styles.fondo} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colors.background },
  testata: { padding: 20, paddingBottom: 12 },
  titolo: { fontSize: 26, fontWeight: '700', color: colors.text },
  sottotitolo: { fontSize: 13, color: colors.textSecondary, marginTop: 6, lineHeight: 18 },

  schede: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 10 },
  linguetta: {
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 18,
    backgroundColor: colors.surface,
  },
  linguettaAttiva: { backgroundColor: colors.primary },
  linguettaTesto: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  linguettaTestoAttivo: { color: colors.background },

  corpo: { flex: 1, paddingHorizontal: 20 },
  attesa: { marginTop: 40 },
  vuoto: {
    fontSize: 14, color: colors.textSecondary, lineHeight: 21,
    marginTop: 24, textAlign: 'center',
  },

  fermi: {
    backgroundColor: colors.surface, borderRadius: 12,
    borderLeftWidth: 3, borderLeftColor: colors.error,
    padding: 14, marginBottom: 14,
  },
  fermiTitolo: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 },
  fermiRiga: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 20, marginBottom: 3 },
  fermiNota: { fontSize: 11.5, color: colors.textSecondary, lineHeight: 17, marginTop: 8 },

  scheda: {
    backgroundColor: colors.surface, borderRadius: 12,
    padding: 14, marginBottom: 10,
  },
  schedaTesta: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'baseline', gap: 10,
  },
  nome: { fontSize: 16, fontWeight: '600', color: colors.text, flexShrink: 1 },
  quando: { fontSize: 12, color: colors.textSecondary },
  conti: { fontSize: 12.5, color: colors.textSecondary, marginTop: 6 },
  allarme: { color: colors.error, fontWeight: '600' },

  voce: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  tacca: {
    width: 3, borderRadius: 2, backgroundColor: colors.primary,
  },
  taccaAlta: { backgroundColor: colors.error },
  taccaBassa: { backgroundColor: colors.border },
  voceCorpo: { flex: 1, minWidth: 0 },
  voceTesto: { fontSize: 14.5, color: colors.text, lineHeight: 20 },
  voceSotto: { fontSize: 11.5, color: colors.textSecondary, marginTop: 2 },

  errore: {
    backgroundColor: colors.surface, borderRadius: 12,
    padding: 16, marginTop: 10,
  },
  erroreTitolo: { fontSize: 15, fontWeight: '600', color: colors.error, marginBottom: 6 },
  erroreTesto: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 6 },

  fondo: { height: 40 },
});
