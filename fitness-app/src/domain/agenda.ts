// ============================================================
// AGENDA — le richieste che arrivano da WhatsApp
// A.S.D. Evolution Sport · Mind Movement Lab
// ------------------------------------------------------------
// Alessia riceve le richieste su WhatsApp. Prima di questo modulo
// diventavano appuntamenti solo se qualcuno si ricordava di
// scriverli, e il tetto dei quattro al giorno era una promessa:
// il quinto appuntamento si poteva scrivere e nessuno protestava.
//
// Qui il tetto diventa una regola del software.
//
// REGOLE FERREE
//  · Massimo QUATTRO impegni al giorno. Mai un quinto: non un
//    avviso, un rifiuto — con la proposta del primo giorno libero.
//  · Gli orari non si inventano: si prende quello chiesto, e se
//    è occupato si dice, con l'elenco di quelli liberi.
//  · Una richiesta non è un appuntamento finché il coach non
//    conferma. L'agenda resta la fonte di verità.
//  · Chi non è ancora allievo può avere il suo posto (ospite):
//    occupa uno dei quattro esattamente come tutti gli altri.
// ============================================================

export const AGENDA_VERSION = 1;

// ------------------------------------------------------------
// LE REGOLE DELLA GIORNATA DEL FONDATORE
// Non sono inventate qui: sono quelle scritte nel sistema
// operativo del fondatore, e valgono perché ogni ora di personal
// oltre le quindici settimanali costa 776 € di Academy mancata.
// ------------------------------------------------------------

/** Massimo appuntamenti in un giorno. Il quinto non si scrive. */
export const TETTO_GIORNALIERO = 4;

/** Massimo appuntamenti in una settimana. Il sedicesimo costa, non rende. */
export const TETTO_SETTIMANALE = 15;

/** Le due finestre in cui la giornata prevede gli appuntamenti. */
export const FINESTRE: Array<[string, string]> = [
  ['10:30', '13:00'],
  ['15:00', '17:30'],
];

/** Gli orari che si propongono a chi chiede: quattro, dentro le finestre. */
export const ORARI_CONSIGLIATI = ['10:30', '11:30', '15:00', '16:00'];

/** Le due ore che producono 816 € l'ora: qui non entra nessuno. */
export const BLOCCO_ACADEMY: [string, string] = ['08:30', '10:30'];

/** 0 = domenica. Spenta: è la tappa più difficile del piano. */
export const GIORNI_CHIUSI = [0];

/** Il sabato è solo mattina. Il pomeriggio è libero, sempre. */
export const SABATO_SOLO_MATTINA = true;

export type TipoImpegno = 'visita' | 'allenamento' | 'consulenza' | 'altro';

export const TIPI: TipoImpegno[] = ['visita', 'allenamento', 'consulenza', 'altro'];

// ------------------------------------------------------------
// Il pacchetto CAL — come arriva da WhatsApp
// ------------------------------------------------------------

export type ComandoCAL = 'chiedi-liberi' | 'prenota' | 'sposta' | 'cancella';

export const COMANDI: ComandoCAL[] = ['chiedi-liberi', 'prenota', 'sposta', 'cancella'];

export interface RichiestaCAL {
  comando: ComandoCAL;
  persona: string;
  telefono: string;
  /** YYYY-MM-DD */
  giorno: string;
  /** HH:MM */
  ora: string;
  tipo: TipoImpegno;
  note: string;
  whatsapp: string;
  /** solo per «sposta»: dove va spostato */
  nuovoGiorno?: string;
  nuovaOra?: string;
}

export interface EsitoParse {
  ok: boolean;
  richiesta: RichiestaCAL | null;
  /** che cosa manca o non si capisce, in italiano */
  problemi: string[];
}

const GIORNO_RE = /^\d{4}-\d{2}-\d{2}$/;
const ORA_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const ripulisci = (s: string): string =>
  (s || '').replace(/^[«"'\s]+|[»"'\s]+$/g, '').trim();

/** Alcune persone scrivono «data», altre «giorno»: si accettano tutte. */
const ALIAS: Record<string, keyof RichiestaCAL> = {
  persona: 'persona', nome: 'persona', allievo: 'persona', cliente: 'persona',
  telefono: 'telefono', tel: 'telefono', cellulare: 'telefono',
  giorno: 'giorno', data: 'giorno',
  ora: 'ora', orario: 'ora',
  tipo: 'tipo',
  note: 'note', nota: 'note',
  whatsapp: 'whatsapp', wa: 'whatsapp',
  'nuovo giorno': 'nuovoGiorno', 'nuova data': 'nuovoGiorno',
  'nuova ora': 'nuovaOra', 'nuovo orario': 'nuovaOra',
};

const giornoValido = (g: string): boolean => {
  if (!GIORNO_RE.test(g)) return false;
  const [a, m, d] = g.split('-').map((x) => parseInt(x, 10));
  const data = new Date(Date.UTC(a, m - 1, d));
  return data.getUTCFullYear() === a
    && data.getUTCMonth() === m - 1
    && data.getUTCDate() === d;
};

/**
 * Legge il pacchetto CAL così come arriva incollato da WhatsApp.
 * Non indovina niente: quello che manca lo dice.
 */
export const leggiCAL = (testo: string): EsitoParse => {
  const problemi: string[] = [];
  const righe = (testo || '').split('\n').map((r) => r.trim()).filter(Boolean);

  if (!righe.length) {
    return { ok: false, richiesta: null, problemi: ['Non c\'è niente da leggere.'] };
  }

  // Prima riga: CAL <comando>
  const testa = righe[0].replace(/[{}]/g, ' ').trim();
  const m = testa.match(/^CAL\s+([a-z-]+)/i);
  if (!m) {
    problemi.push('La prima riga deve iniziare con «CAL» e il comando '
      + `(${COMANDI.join(', ')}).`);
  }
  const comando = (m ? m[1].toLowerCase() : '') as ComandoCAL;
  if (m && !COMANDI.includes(comando)) {
    problemi.push(`Comando «${m[1]}» sconosciuto: sono ${COMANDI.join(', ')}.`);
  }

  const campi: Partial<Record<keyof RichiestaCAL, string>> = {};
  for (const riga of righe.slice(m ? 1 : 0)) {
    const sep = riga.indexOf(':');
    if (sep < 0) continue;
    const chiave = riga.slice(0, sep).trim().toLowerCase();
    const valore = ripulisci(riga.slice(sep + 1));
    const campo = ALIAS[chiave];
    if (campo && valore) campi[campo] = valore;
  }

  const giorno = campi.giorno || '';
  const ora = campi.ora || '';
  if (giorno && !giornoValido(giorno)) {
    problemi.push(`Il giorno «${giorno}» non è una data valida: serve AAAA-MM-GG.`);
  }
  if (ora && !ORA_RE.test(ora)) {
    problemi.push(`L'ora «${ora}» non è valida: serve HH:MM.`);
  }

  const tipoGrezzo = (campi.tipo || 'visita').toLowerCase();
  const tipo = (TIPI as string[]).includes(tipoGrezzo)
    ? (tipoGrezzo as TipoImpegno)
    : 'altro';
  if (campi.tipo && !(TIPI as string[]).includes(tipoGrezzo)) {
    problemi.push(`Tipo «${campi.tipo}» non previsto: segnato come «altro».`);
  }

  // Che cosa serve, comando per comando
  const serve: Array<[keyof RichiestaCAL, string]> = [];
  if (comando === 'prenota') {
    serve.push(['persona', 'la persona'], ['giorno', 'il giorno'], ['ora', 'l\'ora']);
  } else if (comando === 'sposta') {
    serve.push(['persona', 'la persona'], ['giorno', 'il giorno attuale'],
      ['nuovoGiorno', 'il nuovo giorno'], ['nuovaOra', 'la nuova ora']);
  } else if (comando === 'cancella') {
    serve.push(['persona', 'la persona'], ['giorno', 'il giorno']);
  } else if (comando === 'chiedi-liberi') {
    serve.push(['giorno', 'il giorno']);
  }
  for (const [campo, nome] of serve) {
    if (!campi[campo]) problemi.push(`Manca ${nome}.`);
  }
  if (campi.nuovoGiorno && !giornoValido(campi.nuovoGiorno)) {
    problemi.push(`Il nuovo giorno «${campi.nuovoGiorno}» non è una data valida.`);
  }
  if (campi.nuovaOra && !ORA_RE.test(campi.nuovaOra)) {
    problemi.push(`La nuova ora «${campi.nuovaOra}» non è valida.`);
  }

  if (problemi.length) return { ok: false, richiesta: null, problemi };

  return {
    ok: true,
    problemi: [],
    richiesta: {
      comando,
      persona: campi.persona || '',
      telefono: campi.telefono || '',
      giorno,
      ora,
      tipo,
      note: campi.note || '',
      whatsapp: campi.whatsapp || campi.telefono || '',
      ...(campi.nuovoGiorno ? { nuovoGiorno: campi.nuovoGiorno } : {}),
      ...(campi.nuovaOra ? { nuovaOra: campi.nuovaOra } : {}),
    },
  };
};

// ------------------------------------------------------------
// Che cosa c'è già quel giorno
// ------------------------------------------------------------

/** Un impegno già in agenda, ridotto a ciò che conta per il tetto. */
export interface Impegno {
  /** YYYY-MM-DD */
  giorno: string;
  /** HH:MM */
  ora: string;
  /** come si chiama chi occupa il posto */
  chi: string;
  /** allenamento in `sessions`, visita nutrizionista, o richiesta confermata */
  origine: 'sessione' | 'nutrizione' | 'richiesta';
  /** gli impegni annullati NON occupano un posto */
  attivo: boolean;
}

export const impegniDi = (impegni: Impegno[], giorno: string): Impegno[] =>
  (impegni || [])
    .filter((i) => i && i.giorno === giorno && i.attivo)
    .sort((a, b) => a.ora.localeCompare(b.ora));

export const quantiIl = (impegni: Impegno[], giorno: string): number =>
  impegniDi(impegni, giorno).length;

export const postiLiberi = (impegni: Impegno[], giorno: string): number =>
  Math.max(0, TETTO_GIORNALIERO - quantiIl(impegni, giorno));

// ------------------------------------------------------------
// LA DECISIONE: si può confermare questa richiesta?
// ------------------------------------------------------------

export type EsitoRichiesta =
  | 'ok'
  | 'giorno_chiuso'
  | 'giorno_pieno'
  | 'settimana_piena'
  | 'orario_occupato'
  | 'dati_mancanti';

export interface Valutazione {
  esito: EsitoRichiesta;
  confermabile: boolean;
  /** in italiano, da mostrare al coach */
  motivo: string;
  quantiQuelGiorno: number;
  postiLiberi: number;
  quantiQuellaSettimana: number;
  /** chi occupa già quell'ora, se occupata */
  conflittoCon: string | null;
  /** giorni vicini con almeno un posto: si propongono a chi ha chiesto */
  alternative: string[];
  /**
   * Non bloccano, ma vanno detti: quell'ora costa qualcosa alla
   * giornata del fondatore, e chi conferma deve saperlo.
   */
  avvisi: string[];
}

const aDataUTC = (giorno: string): Date => {
  const [a, m, d] = giorno.split('-').map((x) => parseInt(x, 10));
  return new Date(Date.UTC(a, (m || 1) - 1, d || 1));
};

/** 0 = domenica, 1 = lunedì … 6 = sabato. */
export const giornoDellaSettimana = (giorno: string): number =>
  aDataUTC(giorno).getUTCDay();

/** I sette giorni della settimana (lunedì → domenica) che contengono `giorno`. */
export const settimanaDi = (giorno: string): string[] => {
  const d = aDataUTC(giorno);
  const scarto = (d.getUTCDay() + 6) % 7; // lunedì = 0
  const lunedi = new Date(d.getTime() - scarto * 86400000);
  return Array.from({ length: 7 }, (_, i) =>
    new Date(lunedi.getTime() + i * 86400000).toISOString().slice(0, 10));
};

export const quantiNellaSettimana = (impegni: Impegno[], giorno: string): number =>
  settimanaDi(giorno).reduce((s, g) => s + quantiIl(impegni, g), 0);

const dentro = (ora: string, da: string, a: string): boolean =>
  ora >= da && ora < a;

export const dentroLeFinestre = (ora: string): boolean =>
  FINESTRE.some(([da, a]) => dentro(ora, da, a));

export const nelBloccoAcademy = (ora: string): boolean =>
  dentro(ora, BLOCCO_ACADEMY[0], BLOCCO_ACADEMY[1]);

/** Il giorno è chiuso agli appuntamenti? (domenica, sabato pomeriggio) */
export const giornoChiuso = (giorno: string, ora?: string): string | null => {
  const g = giornoDellaSettimana(giorno);
  if (GIORNI_CHIUSI.includes(g)) return 'La domenica è spenta: nessun appuntamento.';
  if (SABATO_SOLO_MATTINA && g === 6 && ora && ora >= '13:00') {
    return 'Il sabato è solo mattina: il pomeriggio è libero, sempre.';
  }
  return null;
};

const giorniSuccessivi = (da: string, quanti: number): string[] => {
  const out: string[] = [];
  const [a, m, d] = da.split('-').map((x) => parseInt(x, 10));
  const base = new Date(Date.UTC(a, m - 1, d));
  for (let i = 1; i <= quanti; i++) {
    const g = new Date(base.getTime() + i * 86400000);
    out.push(g.toISOString().slice(0, 10));
  }
  return out;
};

/**
 * Il quinto appuntamento non si scrive. Non è un avviso da
 * ignorare: è un rifiuto, e arriva con la proposta del primo
 * giorno che ha ancora posto.
 */
export const valutaRichiesta = (input: {
  richiesta: Pick<RichiestaCAL, 'giorno' | 'ora' | 'persona'>;
  impegni: Impegno[];
  /** quanti giorni avanti cercare un'alternativa */
  orizzonteGiorni?: number;
}): Valutazione => {
  const { richiesta, impegni } = input;
  const orizzonte = input.orizzonteGiorni ?? 14;

  if (!richiesta.giorno || !richiesta.ora) {
    return {
      esito: 'dati_mancanti', confermabile: false,
      motivo: 'Servono giorno e ora prima di poter confermare.',
      quantiQuelGiorno: 0, postiLiberi: TETTO_GIORNALIERO,
      quantiQuellaSettimana: 0, conflittoCon: null, alternative: [], avvisi: [],
    };
  }

  const delGiorno = impegniDi(impegni, richiesta.giorno);
  const quanti = delGiorno.length;
  const liberi = Math.max(0, TETTO_GIORNALIERO - quanti);
  const nellaSettimana = quantiNellaSettimana(impegni, richiesta.giorno);

  // Un giorno vale come alternativa solo se è aperto, non è pieno,
  // e la sua settimana ha ancora spazio.
  const alternative = giorniSuccessivi(richiesta.giorno, orizzonte)
    .filter((g) => !giornoChiuso(g)
      && quantiIl(impegni, g) < TETTO_GIORNALIERO
      && quantiNellaSettimana(impegni, g) < TETTO_SETTIMANALE)
    .slice(0, 3);

  // Avvisi: non fermano, ma dicono che cosa costa quell'ora.
  const avvisi: string[] = [];
  if (nelBloccoAcademy(richiesta.ora)) {
    avvisi.push('Sono le due ore dell\'Academy: quell\'ora vale 816 €, '
      + 'e il blocco profondo è ciò che porta al milione.');
  } else if (!dentroLeFinestre(richiesta.ora)) {
    avvisi.push('Fuori dalle finestre della giornata (10:30-13:00 e 15:00-17:30): '
      + 'un appuntamento sparso costa più dell\'ora che occupa.');
  }
  if (giornoDellaSettimana(richiesta.giorno) === 5 && richiesta.ora >= '13:00') {
    avvisi.push('Venerdì pomeriggio è amministrazione e delega per la settimana dopo.');
  }
  if (nellaSettimana === TETTO_SETTIMANALE - 1) {
    avvisi.push(`È il quindicesimo della settimana: dopo questo, il tetto è raggiunto.`);
  }

  const chiuso = giornoChiuso(richiesta.giorno, richiesta.ora);
  if (chiuso) {
    return {
      esito: 'giorno_chiuso', confermabile: false, motivo: chiuso,
      quantiQuelGiorno: quanti, postiLiberi: liberi,
      quantiQuellaSettimana: nellaSettimana,
      conflittoCon: null, alternative, avvisi,
    };
  }

  if (quanti >= TETTO_GIORNALIERO) {
    return {
      esito: 'giorno_pieno', confermabile: false,
      motivo: `Il ${richiesta.giorno} ha già ${quanti} appuntamenti: è pieno. `
        + 'Il quinto non si scrive.',
      quantiQuelGiorno: quanti, postiLiberi: 0,
      quantiQuellaSettimana: nellaSettimana,
      conflittoCon: null, alternative, avvisi,
    };
  }

  if (nellaSettimana >= TETTO_SETTIMANALE) {
    return {
      esito: 'settimana_piena', confermabile: false,
      motivo: `Questa settimana ha già ${nellaSettimana} appuntamenti su ${TETTO_SETTIMANALE}. `
        + 'Il sedicesimo non rende: costa 776 € di Academy mancata.',
      quantiQuelGiorno: quanti, postiLiberi: liberi,
      quantiQuellaSettimana: nellaSettimana,
      conflittoCon: null, alternative, avvisi,
    };
  }

  const occupato = delGiorno.find((i) => i.ora === richiesta.ora);
  if (occupato) {
    return {
      esito: 'orario_occupato', confermabile: false,
      motivo: `Le ${richiesta.ora} del ${richiesta.giorno} sono già di ${occupato.chi}.`,
      quantiQuelGiorno: quanti, postiLiberi: liberi,
      quantiQuellaSettimana: nellaSettimana,
      conflittoCon: occupato.chi, alternative, avvisi,
    };
  }

  return {
    esito: 'ok', confermabile: true,
    motivo: (liberi === 1
      ? 'Si può confermare: è l\'ultimo posto della giornata.'
      : `Si può confermare: restano ${liberi} posti quel giorno.`)
      + ` Settimana: ${nellaSettimana + 1} su ${TETTO_SETTIMANALE}.`,
    quantiQuelGiorno: quanti, postiLiberi: liberi,
    quantiQuellaSettimana: nellaSettimana,
    conflittoCon: null, alternative, avvisi,
  };
};

// ------------------------------------------------------------
// La risposta da rimandare su WhatsApp
// ------------------------------------------------------------

const dataParlata = (giorno: string): string => {
  const [a, m, d] = giorno.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  });
};

const primo = (nome: string): string => (nome || '').trim().split(' ')[0] || '';

/**
 * Il testo che Alessia rimanda su WhatsApp. Mai «non c'è posto»
 * e basta: sempre con l'alternativa più vicina, perché chi scrive
 * ha già fatto il passo difficile.
 */
export const rispostaWhatsApp = (input: {
  richiesta: RichiestaCAL;
  valutazione: Valutazione;
  impegni: Impegno[];
  /** orari che lo studio usa di solito, per proporre i liberi */
  orariPossibili?: string[];
}): string => {
  const { richiesta: r, valutazione: v, impegni } = input;
  const orari = input.orariPossibili || ORARI_CONSIGLIATI;
  const nome = primo(r.persona);
  const ciao = nome ? `Ciao ${nome}, ` : '';

  if (r.comando === 'chiedi-liberi') {
    const chiuso = giornoChiuso(r.giorno);
    if (chiuso) {
      return `${ciao}${dataParlata(r.giorno)} sono chiuso. `
        + (v.alternative.length
          ? `Ti va ${dataParlata(v.alternative[0])}?`
          : 'Dimmi un altro giorno e ti trovo lo spazio.');
    }
    const occupate = new Set(impegniDi(impegni, r.giorno).map((i) => i.ora));
    const liberi = orari.filter((o) => !occupate.has(o));
    const posti = postiLiberi(impegni, r.giorno);
    if (posti === 0) {
      return `${ciao}${dataParlata(r.giorno)} è al completo. `
        + (v.alternative.length
          ? `Ho posto ${dataParlata(v.alternative[0])}: ti va bene?`
          : 'Dimmi un altro giorno e ti trovo lo spazio.');
    }
    const mostrati = liberi.slice(0, Math.min(posti, liberi.length));
    return `${ciao}${dataParlata(r.giorno)} ho libero: ${mostrati.join(', ')}. `
      + 'Dimmi quale ti va meglio e te lo tengo.';
  }

  if (r.comando === 'cancella') {
    return `${ciao}ho tolto l'appuntamento di ${dataParlata(r.giorno)}`
      + (r.ora ? ` alle ${r.ora}` : '') + '. '
      + 'Quando vuoi rientrare scrivimi e ti ridò il tuo posto.';
  }

  if (v.esito === 'giorno_chiuso') {
    return `${ciao}${dataParlata(r.giorno)} sono chiuso. `
      + (v.alternative.length
        ? `Il primo giorno buono è ${dataParlata(v.alternative[0])}: te lo tengo?`
        : 'Dimmi un altro giorno e ti trovo lo spazio.');
  }

  if (v.esito === 'settimana_piena') {
    return `${ciao}questa settimana sono al completo — tengo un numero fisso di `
      + 'appuntamenti per seguire bene tutti. '
      + (v.alternative.length
        ? `Il primo posto libero è ${dataParlata(v.alternative[0])}: lo blocco per te?`
        : 'Dimmi due giorni della prossima settimana e te ne tengo uno.');
  }

  if (v.esito === 'giorno_pieno') {
    return `${ciao}${dataParlata(r.giorno)} è già pieno — teniamo quattro `
      + 'appuntamenti al giorno per non correre. '
      + (v.alternative.length
        ? `Il primo giorno con posto è ${dataParlata(v.alternative[0])}: te lo tengo?`
        : 'Dimmi due giorni che ti vanno bene e ti richiamo con l\'orario.');
  }

  if (v.esito === 'orario_occupato') {
    const occupate = new Set(impegniDi(impegni, r.giorno).map((i) => i.ora));
    const liberi = orari.filter((o) => !occupate.has(o)).slice(0, 3);
    return `${ciao}alle ${r.ora} di ${dataParlata(r.giorno)} ho già una persona. `
      + (liberi.length
        ? `Stesso giorno ho libero ${liberi.join(' o ')}: quale preferisci?`
        : `Ti propongo ${v.alternative.length ? dataParlata(v.alternative[0]) : 'un altro giorno'}.`);
  }

  if (r.comando === 'sposta' && r.nuovoGiorno && r.nuovaOra) {
    return `${ciao}spostato: ci vediamo ${dataParlata(r.nuovoGiorno)} alle ${r.nuovaOra}. `
      + 'Se ti serve cambiare ancora, dimmelo con almeno dieci ore di anticipo.';
  }

  return `${ciao}confermato: ${dataParlata(r.giorno)} alle ${r.ora}. `
    + 'Se non riesci, avvisami con almeno dieci ore di anticipo così libero il posto per qualcun altro.';
};

// ------------------------------------------------------------
// Riepilogo della giornata, per il coach
// ------------------------------------------------------------

export interface RiepilogoGiorno {
  giorno: string;
  quanti: number;
  liberi: number;
  pieno: boolean;
  impegni: Impegno[];
  /** una riga sola, da leggere al volo */
  riga: string;
}

export const riepilogoDi = (impegni: Impegno[], giorno: string): RiepilogoGiorno => {
  const del = impegniDi(impegni, giorno);
  const liberi = Math.max(0, TETTO_GIORNALIERO - del.length);
  return {
    giorno,
    quanti: del.length,
    liberi,
    pieno: liberi === 0,
    impegni: del,
    riga: del.length === 0
      ? 'Giornata libera.'
      : `${del.length} su ${TETTO_GIORNALIERO}: ${del.map((i) => `${i.ora} ${i.chi}`).join(' · ')}`
        + (liberi === 0 ? ' — pieno.' : ''),
  };
};
