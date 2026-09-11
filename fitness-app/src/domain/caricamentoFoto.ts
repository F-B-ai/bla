// ============================================================
// QUANDO UNA FOTO NON SALE — dirlo, e dire perché
// ------------------------------------------------------------
// Dal 9 all'11 settembre 2026 il caricamento delle foto posturali è
// stato rotto, e nessuno se n'è accorto per due giorni.
//
// Non perché non ci fosse un messaggio: ce n'era uno. Diceva:
//
//   «Valutazione salvata! Le foto non sono state caricate perché lo
//    spazio di archiviazione è esaurito.»
//
// Lo spazio era pieno allo 0,4 %. Il vero motivo era un permesso
// negato. Il codice buttava via l'errore con un `catch {}` vuoto e
// raccontava l'unica causa che qualcuno aveva immaginato il giorno in
// cui l'aveva scritto.
//
// Un messaggio d'errore che indovina è peggio di nessun messaggio:
// nessun messaggio ti fa indagare, un messaggio sbagliato ti fa
// cercare nel posto sbagliato. Per due giorni.
//
// E c'era di peggio: il titolo diceva «Successo» anche quando le foto
// non salivano, e subito dopo il modulo si svuotava. Le foto erano
// perse, e la scheda restava a metà senza che si potesse riprovare.
//
// Qui si classifica l'errore vero e si scrive che cosa è successo,
// con i nomi delle viste che una persona riconosce.
// ============================================================

export const CARICAMENTO_VERSION = 1;

export type Vista = 'front' | 'side_left' | 'side_right' | 'back';

export type MotivoFallimento =
  /** i permessi hanno detto no: è un problema di ruolo, non di spazio */
  | 'permesso'
  /** lo spazio di archiviazione è davvero esaurito */
  | 'spazio'
  /** la connessione è caduta a metà */
  | 'rete'
  /** non lo sappiamo, e lo diciamo invece di inventarlo */
  | 'sconosciuto';

const NOMI_VISTA: Record<Vista, string> = {
  front: 'Frontale',
  side_left: 'Laterale sinistra',
  side_right: 'Laterale destra',
  back: 'Posteriore',
};

export const nomeVista = (v: Vista | string): string =>
  NOMI_VISTA[v as Vista] || v;

export interface EsitoFoto {
  vista: Vista;
  ok: boolean;
  motivo?: MotivoFallimento;
  /** il testo tecnico dell'errore, per il registro — non per la persona */
  dettaglio?: string;
}

// ------------------------------------------------------------
// Classificare, invece di indovinare
// ------------------------------------------------------------

export const classificaErrore = (err: unknown): MotivoFallimento => {
  const codice = String((err as { code?: string } | null)?.code || '');
  const testo = err instanceof Error ? err.message : String(err ?? '');
  const tutto = `${codice} ${testo}`.toLowerCase();

  if (codice === 'storage/unauthorized'
    || /unauthorized|permission|forbidden|not have permission/.test(tutto)) {
    return 'permesso';
  }
  // Attenzione a «exceeded» da solo: sta anche dentro
  // «retry-limit-exceeded», che è la rete, non lo spazio. Un test lo
  // ha beccato — ed è lo stesso tipo di scorciatoia che aveva
  // prodotto il messaggio sbagliato che abbiamo appena tolto.
  if (codice === 'storage/quota-exceeded'
    || /quota|storage is full|spazio.*esaurit|esaurit.*spazio/.test(tutto)) {
    return 'spazio';
  }
  if (codice === 'storage/retry-limit-exceeded'
    || /network|offline|timeout|connection|failed to fetch/.test(tutto)) {
    return 'rete';
  }
  return 'sconosciuto';
};

// ------------------------------------------------------------
// Che cosa legge la persona
// ------------------------------------------------------------

const SPIEGAZIONE: Record<MotivoFallimento, string> = {
  permesso: 'Il tuo accesso non ha il permesso di caricare i file. '
    + 'Vai in Gestione Utenti, premi «Allinea i ruoli», poi esci e rientra.',
  spazio: 'Lo spazio di archiviazione è esaurito. '
    + 'Libera spazio da Studio → Gestione Spazio e riprova.',
  rete: 'La connessione è caduta durante il caricamento. '
    + 'Controlla la rete e riprova.',
  sconosciuto: 'Il caricamento è stato rifiutato e non so dirti perché. '
    + 'Riprova; se succede ancora, segnalamelo con questo messaggio.',
};

export interface MessaggioCaricamento {
  titolo: string;
  testo: string;
  /** le foto vanno tenute in schermata per poter riprovare? */
  tieniLeFoto: boolean;
}

/**
 * Il messaggio dopo il salvataggio di una valutazione.
 *
 * La regola: **non si dice «Successo» se qualcosa non è riuscito.**
 * E se qualcosa non è riuscito, le foto restano in schermata: chi ha
 * appena fotografato una persona non deve rifotografarla perché il
 * modulo si è svuotato da solo.
 */
export const messaggioCaricamento = (
  esiti: EsitoFoto[]
): MessaggioCaricamento => {
  const falliti = (esiti || []).filter((e) => !e.ok);

  if (falliti.length === 0) {
    return {
      titolo: 'Valutazione salvata',
      testo: 'Osservazioni e foto sono al loro posto.',
      tieniLeFoto: false,
    };
  }

  const nomi = falliti.map((e) => nomeVista(e.vista)).join(', ');
  const quante = falliti.length === 1
    ? `La foto ${nomi.toLowerCase()} non è stata caricata.`
    : `Queste foto non sono state caricate: ${nomi}.`;

  // Se i motivi sono diversi si nomina il più grave, che è sempre
  // quello che richiede un'azione: il permesso.
  const ordine: MotivoFallimento[] = ['permesso', 'spazio', 'rete', 'sconosciuto'];
  const motivo = ordine.find((m) => falliti.some((f) => f.motivo === m)) || 'sconosciuto';

  return {
    titolo: 'Valutazione salvata, ma senza le foto',
    testo: `${quante}\n\n${SPIEGAZIONE[motivo]}\n\n`
      + 'Le osservazioni sono salvate. Le foto sono ancora qui: '
      + 'risolvi e premi di nuovo Salva, non serve rifarle.',
    tieniLeFoto: true,
  };
};

/** Una riga secca per il registro tecnico, non per la persona. */
export const perIlRegistro = (esiti: EsitoFoto[]): string =>
  (esiti || [])
    .filter((e) => !e.ok)
    .map((e) => `${e.vista}: ${e.motivo} — ${e.dettaglio || 'senza dettaglio'}`)
    .join(' | ');
