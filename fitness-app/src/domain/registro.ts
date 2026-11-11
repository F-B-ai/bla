// ============================================================
// IL REGISTRO — chi ha fatto che cosa, e quando
// ------------------------------------------------------------
// 30 ottobre 2026. Il titolare: «come posso monitorare l'attività
// dei collaboratori manager nutrizionisti sull'App».
//
// La risposta onesta, quel giorno, era: non puoi. Sono andato a
// contare. Di ventitré tipi di documento, due portavano scritto chi
// li aveva creati. Nessuno portava scritto chi li aveva modificati.
// Trentadue punti del programma cancellano documenti, e nessuno dei
// trentadue lasciava una riga. Non esisteva nemmeno la data
// dell'ultimo accesso: non si poteva sapere se una persona avesse
// aperto l'applicazione ieri o tre settimane fa.
//
// Un'azienda che non sa chi ha toccato le sue cose non ha un problema
// di fiducia. Ha un problema di strumenti.
//
// ------------------------------------------------------------
// DUE REGOLE CHE REGGONO TUTTO
// ------------------------------------------------------------
// 1. IL NOME SI SCRIVE DENTRO LA RIGA, non si va a cercare dopo.
//    Il giorno in cui serve davvero leggere il registro è il giorno
//    in cui quella persona non c'è più — e con lei sparirebbe il
//    nome, lasciando righe firmate da un codice. Una riga che non si
//    può leggere non è una prova: è un reperto.
//
// 2. NESSUNO MODIFICA O CANCELLA UNA RIGA. Nemmeno il titolare.
//    Questa è l'unica cosa in tutta l'applicazione che il titolare
//    non può toccare, ed è una scelta a suo favore: un registro che
//    il proprietario può correggere non dimostra niente davanti a
//    nessuno. Il suo valore viene per intero dal fatto che non lo
//    tocca neanche lui. Perciò qui dentro non c'è nessuna funzione
//    che modifichi o rimuova una voce, e nelle regole di Firestore
//    `update` e `delete` sono falsi per tutti.
// ============================================================

export type AzioneRegistro =
  | 'entrato'
  | 'creato'
  | 'modificato'
  | 'eliminato'
  | 'assegnato'
  | 'esportato'
  // 11 novembre 2026: chi ha provato a fare una cosa che non gli
  // spetta, e il server l'ha respinto. Lo scrive solo il server.
  | 'tentato';

export type OggettoRegistro =
  | 'allievo'
  | 'collaboratore'
  | 'lezione'
  | 'pagamento'
  | 'scheda'
  | 'consulenza'
  | 'contenuto'
  | 'avviso'
  // 11 novembre 2026: email, password, ruolo, creazione e
  // cancellazione di un accesso. Lo scrive solo il server.
  | 'accesso'
  | 'applicazione';

export interface VoceRegistro {
  id?: string;
  /** chi l'ha fatto */
  chi: string;
  /** il suo nome AL MOMENTO del fatto: vedi regola 1 */
  chiNome: string;
  /** il suo ruolo AL MOMENTO del fatto */
  ruolo: string;
  azione: AzioneRegistro;
  oggetto: OggettoRegistro;
  oggettoId: string;
  /** il nome della cosa toccata, al momento: dopo potrebbe non esistere */
  oggettoNome: string;
  quando: Date;
  dettaglio?: string;
}

/** Quanto una riga merita di essere guardata. */
export type Peso = 'alta' | 'media' | 'bassa';

const ETICHETTE_AZIONE: Record<AzioneRegistro, string> = {
  entrato: 'è entrato',
  creato: 'ha creato',
  modificato: 'ha modificato',
  eliminato: 'ha eliminato',
  assegnato: 'ha assegnato',
  esportato: 'ha esportato',
  tentato: 'ha tentato di modificare',
};

const ETICHETTE_OGGETTO: Record<OggettoRegistro, string> = {
  allievo: 'allievo',
  collaboratore: 'collaboratore',
  lezione: 'lezione',
  pagamento: 'pagamento',
  scheda: 'scheda',
  consulenza: 'consulenza',
  contenuto: 'contenuto',
  avviso: 'avviso',
  accesso: "l'accesso di",
  applicazione: "nell'applicazione",
};

export const nomeAzione = (a: AzioneRegistro): string =>
  ETICHETTE_AZIONE[a] || String(a);

export const nomeOggetto = (o: OggettoRegistro): string =>
  ETICHETTE_OGGETTO[o] || String(o);

/**
 * La riga, in italiano.
 *
 * «Giuseppe Esposito ha eliminato l'allievo Maria Rossi» si legge
 * senza spiegazioni. `oggettoId`, `chi` e le altre chiavi restano
 * nel documento per chi dovrà risalire; qui non compaiono, perché
 * un registro che si legge solo con il manuale non lo legge nessuno.
 */
export const descriviVoce = (v: VoceRegistro): string => {
  const chi = (v.chiNome || '').trim() || 'Qualcuno';
  if (v.azione === 'entrato') return `${chi} è entrato`;

  const cosa = (v.oggettoNome || '').trim();
  const tipo = nomeOggetto(v.oggetto);
  const coda = cosa ? `${tipo} ${cosa}` : tipo;
  return `${chi} ${nomeAzione(v.azione)} ${coda}`.replace(/\s+/g, ' ').trim();
};

/**
 * Che cosa merita di essere guardato per primo.
 *
 * Le eliminazioni sempre: sono le uniche azioni che tolgono qualcosa
 * che non torna. I soldi sempre, in qualunque verso. Tutto il resto
 * è il lavoro normale di chi lavora, e un registro che urla a ogni
 * riga non viene più letto dopo la prima settimana.
 */
export const pesoVoce = (v: VoceRegistro): Peso => {
  // Un tentativo respinto e qualunque cambio di accesso (email,
  // password, ruolo) si guardano per primi: sono le chiavi di casa.
  if (v.azione === 'tentato') return 'alta';
  if (v.oggetto === 'accesso') return 'alta';
  if (v.azione === 'eliminato') return 'alta';
  if (v.oggetto === 'pagamento') return 'alta';
  if (v.azione === 'assegnato' || v.azione === 'esportato') return 'media';
  if (v.azione === 'entrato') return 'bassa';
  return 'media';
};

export interface FiltroRegistro {
  chi?: string;
  azione?: AzioneRegistro;
  oggetto?: OggettoRegistro;
  da?: Date;
  a?: Date;
}

/**
 * Filtra senza mai inventare: un filtro vuoto restituisce tutto, e
 * l'ordine è sempre dal più recente.
 */
export const filtraRegistro = (
  voci: VoceRegistro[],
  filtro: FiltroRegistro = {}
): VoceRegistro[] => {
  const dentro = (v: VoceRegistro): boolean => {
    if (filtro.chi && v.chi !== filtro.chi) return false;
    if (filtro.azione && v.azione !== filtro.azione) return false;
    if (filtro.oggetto && v.oggetto !== filtro.oggetto) return false;
    if (filtro.da && v.quando.getTime() < filtro.da.getTime()) return false;
    if (filtro.a && v.quando.getTime() > filtro.a.getTime()) return false;
    return true;
  };
  return voci.filter(dentro)
    .slice()
    .sort((x, y) => y.quando.getTime() - x.quando.getTime());
};

/** Solo quello che merita di essere guardato per primo. */
export const daGuardare = (voci: VoceRegistro[]): VoceRegistro[] =>
  filtraRegistro(voci).filter((v) => pesoVoce(v) === 'alta');

export interface RiepilogoPersona {
  chi: string;
  nome: string;
  totale: number;
  perAzione: Record<AzioneRegistro, number>;
  /** l'ultima volta che si è vista questa persona, o null */
  ultimaVolta: Date | null;
}

/**
 * Che cosa ha fatto una persona, in numeri.
 *
 * `ultimaVolta` è il dato più sottovalutato di tutti: dice se chi
 * prende una percentuale sta ancora lavorando. Prima di oggi non
 * era ricavabile in nessun modo.
 */
export const riepilogoPersona = (
  voci: VoceRegistro[],
  chi: string
): RiepilogoPersona => {
  const sue = voci.filter((v) => v.chi === chi);
  const perAzione = {
    entrato: 0, creato: 0, modificato: 0,
    eliminato: 0, assegnato: 0, esportato: 0, tentato: 0,
  } as Record<AzioneRegistro, number>;

  let ultima: Date | null = null;
  let nome = '';
  sue.forEach((v) => {
    if (perAzione[v.azione] !== undefined) perAzione[v.azione] += 1;
    if (!ultima || v.quando.getTime() > ultima.getTime()) {
      ultima = v.quando;
      // il nome più recente: una persona può cambiare cognome
      nome = (v.chiNome || '').trim() || nome;
    }
  });

  return {
    chi,
    nome,
    totale: sue.length,
    perAzione,
    ultimaVolta: ultima,
  };
};

/**
 * Il riepilogo di tutti, dal più attivo.
 *
 * Serve a rispondere alla domanda vera: chi sta lavorando, e chi
 * figura e basta.
 */
export const riepilogoTutti = (voci: VoceRegistro[]): RiepilogoPersona[] => {
  const chiavi = Array.from(new Set(voci.map((v) => v.chi))).filter(Boolean);
  return chiavi
    .map((c) => riepilogoPersona(voci, c))
    .sort((a, b) => b.totale - a.totale);
};

/**
 * Da quanti giorni non si vede una persona.
 *
 * `null` quando non è mai comparsa: è diverso da zero, e dirlo come
 * «0 giorni» sarebbe una bugia comoda.
 */
export const giorniDaUltimaVolta = (
  r: RiepilogoPersona,
  adesso: Date = new Date()
): number | null => {
  if (!r.ultimaVolta) return null;
  const ms = adesso.getTime() - r.ultimaVolta.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
};
