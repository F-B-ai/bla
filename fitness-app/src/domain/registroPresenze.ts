// ============================================================
// IL CONFRONTO FRA DUE REGISTRI
// ------------------------------------------------------------
// 11 ottobre 2026. Lo studio tiene due registri che nascono da due
// mani diverse:
//
//   · LE SEDUTE, scritte da chi le conduce.
//   · GLI INGRESSI, registrati dall'allievo che entra col QR.
//
// Messi uno accanto all'altro, questi due registri si controllano a
// vicenda — ed è l'unico controllo possibile, perché nessuno dei due
// dipende interamente da una persona sola.
//
// Questo file non accusa nessuno e non conclude niente. Mette in fila
// tre fatti che si leggono dai dati e basta:
//
//   1. QUANDO una seduta è stata scritta, rispetto al giorno in cui si
//      è svolta. È un dato del server (`createdAt`), non lo scrive
//      nessuno a mano e nessuno lo può correggere dall'app.
//
//   2. QUALI INGRESSI non hanno una seduta corrispondente. Un allievo
//      che entra in un giorno in cui per lui non risulta niente.
//
//   3. QUANTO di tutto questo ricade su ciascun conduttore.
//
// IL LIMITE, scritto qui perché nel documento va stampato: un ingresso
// dice che la persona era in studio, NON che abbia fatto un personal e
// NON con chi. Apre una domanda, non la chiude. Chi legge il documento
// deve saperlo prima di trarne conseguenze.
// ============================================================

export const REGISTRO_VERSION = 1;

const GIORNO_MS = 24 * 60 * 60 * 1000;

/** Oltre questi giorni la scrittura non è più «mi sono segnato dopo». */
export const GIORNI_RITARDO_RILEVANTE = 7;

/**
 * Le date arrivano in tre forme — Date, Timestamp di Firestore, testo —
 * e una sola delle tre si può usare per fare un conto. Chi sbaglia qui
 * produce un documento pieno di numeri sbagliati che sembrano giusti.
 */
export const aData = (v: unknown): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'object') {
    const o = v as { toDate?: () => Date; seconds?: number };
    if (typeof o.toDate === 'function') {
      try { const d = o.toDate(); return isNaN(d.getTime()) ? null : d; } catch { return null; }
    }
    if (typeof o.seconds === 'number') return new Date(o.seconds * 1000);
  }
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

/** Il giorno, senza l'ora: AAAA-MM-GG. */
export const giornoDi = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export interface SedutaRegistro {
  id: string;
  studentId: string;
  collaboratorId: string;
  /** il giorno in cui la seduta si è svolta */
  date: unknown;
  startTime?: string;
  status?: string;
  /** quando la riga è stata scritta nell'app — dato del server */
  createdAt?: unknown;
}

export interface IngressoRegistro {
  id: string;
  studentId: string;
  studentName?: string;
  timestamp: unknown;
}

// ------------------------------------------------------------
// 1 · QUANDO È STATA SCRITTA
// ------------------------------------------------------------

export interface RigaSeduta {
  id: string;
  studentId: string;
  collaboratorId: string;
  giorno: string;
  ora: string;
  /** il giorno in cui la riga è stata scritta, o '' se non si sa */
  giornoScrittura: string;
  /** giorni fra la seduta e la sua scrittura; null se non si sa */
  ritardo: number | null;
  status: string;
}

/**
 * Quanti giorni dopo la seduta è stata scritta la riga.
 *
 * Zero o meno è la normalità: si segna prima o lo stesso giorno. Un
 * numero positivo non è di per sé una colpa — ci si dimentica, si
 * recupera la sera. È la DISTRIBUZIONE di questi numeri a dire
 * qualcosa: molte sedute scritte tutte insieme, settimane dopo, non è
 * una dimenticanza, è un recupero.
 */
export const ritardoDiScrittura = (s: SedutaRegistro): number | null => {
  const quando = aData(s.date);
  const scritta = aData(s.createdAt);
  if (!quando || !scritta) return null;
  const a = new Date(quando.getFullYear(), quando.getMonth(), quando.getDate()).getTime();
  const b = new Date(scritta.getFullYear(), scritta.getMonth(), scritta.getDate()).getTime();
  return Math.round((b - a) / GIORNO_MS);
};

export const rigaSeduta = (s: SedutaRegistro): RigaSeduta | null => {
  const quando = aData(s.date);
  if (!quando) return null;
  const scritta = aData(s.createdAt);
  return {
    id: s.id,
    studentId: s.studentId || '',
    collaboratorId: s.collaboratorId || '',
    giorno: giornoDi(quando),
    ora: (s.startTime || '').trim(),
    giornoScrittura: scritta ? giornoDi(scritta) : '',
    ritardo: ritardoDiScrittura(s),
    status: s.status || '',
  };
};

// ------------------------------------------------------------
// 2 · GLI INGRESSI SENZA SEDUTA
// ------------------------------------------------------------

export interface IngressoSpaiato {
  id: string;
  studentId: string;
  allievo: string;
  giorno: string;
  ora: string;
}

/**
 * Gli ingressi per i quali, quel giorno, per quell'allievo non risulta
 * NESSUNA seduta — di nessun tipo e di nessun conduttore.
 *
 * Il conteggio è volutamente prudente: basta una seduta qualsiasi,
 * anche annullata, perché l'ingresso non compaia qui. Un elenco che
 * sbaglia per eccesso non serve a niente, perché la prima riga
 * sbagliata che qualcuno trova toglie credito a tutte le altre.
 */
export const ingressiSenzaSeduta = (
  ingressi: IngressoRegistro[],
  sedute: SedutaRegistro[],
  nomeAllievo: (id: string) => string
): IngressoSpaiato[] => {
  const coperti = new Set<string>();
  (sedute || []).forEach((s) => {
    const d = aData(s.date);
    if (d && s.studentId) coperti.add(`${s.studentId}|${giornoDi(d)}`);
  });

  const fuori: IngressoSpaiato[] = [];
  (ingressi || []).forEach((i) => {
    const d = aData(i.timestamp);
    if (!d || !i.studentId) return;
    const g = giornoDi(d);
    if (coperti.has(`${i.studentId}|${g}`)) return;
    fuori.push({
      id: i.id,
      studentId: i.studentId,
      allievo: (i.studentName || '').trim() || nomeAllievo(i.studentId) || 'Allievo',
      giorno: g,
      ora: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    });
  });

  return fuori.sort((a, b) => (a.giorno === b.giorno
    ? a.ora.localeCompare(b.ora)
    : a.giorno.localeCompare(b.giorno)));
};

// ------------------------------------------------------------
// 3 · QUANTO RICADE SU CIASCUN CONDUTTORE
// ------------------------------------------------------------

export interface RiepilogoConduttore {
  collaboratorId: string;
  nome: string;
  sedute: number;
  /** quante hanno una data di scrittura leggibile */
  conScrittura: number;
  /** scritte dopo il giorno della seduta */
  scritteDopo: number;
  /** scritte oltre una settimana dopo */
  scritteMoltoDopo: number;
  /** il ritardo più grande trovato */
  ritardoMassimo: number;
  /** il ritardo medio delle sole sedute scritte dopo */
  ritardoMedio: number;
}

export const riepilogoPerConduttore = (
  sedute: SedutaRegistro[],
  nomeConduttore: (id: string) => string
): RiepilogoConduttore[] => {
  const per = new Map<string, RigaSeduta[]>();
  (sedute || []).forEach((s) => {
    const r = rigaSeduta(s);
    if (!r) return;
    const k = r.collaboratorId || 'sconosciuto';
    if (!per.has(k)) per.set(k, []);
    (per.get(k) as RigaSeduta[]).push(r);
  });

  const out: RiepilogoConduttore[] = [];
  per.forEach((righe, k) => {
    const conScrittura = righe.filter((r) => r.ritardo !== null);
    const dopo = conScrittura.filter((r) => (r.ritardo as number) > 0);
    const ritardi = dopo.map((r) => r.ritardo as number);
    out.push({
      collaboratorId: k,
      nome: nomeConduttore(k) || 'Non indicato',
      sedute: righe.length,
      conScrittura: conScrittura.length,
      scritteDopo: dopo.length,
      scritteMoltoDopo: ritardi.filter((n) => n >= GIORNI_RITARDO_RILEVANTE).length,
      ritardoMassimo: ritardi.length ? Math.max(...ritardi) : 0,
      ritardoMedio: ritardi.length
        ? Math.round((ritardi.reduce((a, b) => a + b, 0) / ritardi.length) * 10) / 10
        : 0,
    });
  });

  return out.sort((a, b) => b.sedute - a.sedute);
};

// ------------------------------------------------------------
// IL DOCUMENTO
// ------------------------------------------------------------

export interface DatiRegistro {
  sedute: SedutaRegistro[];
  ingressi: IngressoRegistro[];
  nomeAllievo: (id: string) => string;
  nomeConduttore: (id: string) => string;
}

export interface Registro {
  dal: string;
  al: string;
  totaleSedute: number;
  totaleIngressi: number;
  seduteSenzaScrittura: number;
  righeInRitardo: RigaSeduta[];
  spaiati: IngressoSpaiato[];
  conduttori: RiepilogoConduttore[];
}

const estremi = (giorni: string[]): { dal: string; al: string } => {
  const puliti = giorni.filter(Boolean).sort();
  return { dal: puliti[0] || '', al: puliti[puliti.length - 1] || '' };
};

export const componiRegistro = (d: DatiRegistro): Registro => {
  const righe = (d.sedute || [])
    .map(rigaSeduta)
    .filter((r): r is RigaSeduta => r !== null);

  const spaiati = ingressiSenzaSeduta(d.ingressi, d.sedute, d.nomeAllievo);

  const giorni = [
    ...righe.map((r) => r.giorno),
    ...spaiati.map((s) => s.giorno),
  ];

  return {
    ...estremi(giorni),
    totaleSedute: righe.length,
    totaleIngressi: (d.ingressi || []).length,
    seduteSenzaScrittura: righe.filter((r) => r.ritardo === null).length,
    righeInRitardo: righe
      .filter((r) => r.ritardo !== null && (r.ritardo as number) > 0)
      .sort((a, b) => (b.ritardo as number) - (a.ritardo as number)),
    spaiati,
    conduttori: riepilogoPerConduttore(d.sedute, d.nomeConduttore),
  };
};

/**
 * Le avvertenze che vanno stampate SUL documento, non dette a voce.
 *
 * Un documento che esce dallo studio e finisce sul tavolo di un
 * professionista deve dire da solo che cosa prova e che cosa no.
 * Senza queste righe, chi lo legge gli attribuisce la forza che non
 * ha — e quando se ne accorge toglie credito anche alla parte vera.
 */
export const AVVERTENZE: string[] = [
  'Il giorno di scrittura di ogni seduta è un dato registrato dal server nel '
  + 'momento in cui la riga è stata creata. Non è digitato da nessuno e non è '
  + 'modificabile dall\'applicazione.',
  'Un ingresso registra che quell\'allievo era in studio quel giorno. NON dice '
  + 'che abbia svolto una seduta di personal training, né con chi: apre una '
  + 'domanda, non la chiude.',
  'Un ingresso compare fra quelli «senza seduta» solo se quel giorno, per quel '
  + 'nome, non risulta NESSUNA seduta — nemmeno annullata. Il conteggio è '
  + 'prudente per scelta.',
  'Gli ingressi sono registrati dall\'allievo all\'arrivo e non sono stati '
  + 'introdotti da subito: i periodi in cui il sistema non era ancora in uso '
  + 'non sono confrontabili e non vanno letti come assenze.',
  'Le sedute precedenti all\'introduzione dell\'applicazione non compaiono in '
  + 'questo documento, perché non esiste alcun registro di quel periodo.',
];
