// ============================================================
// IL RAPPORTO DEL MATTINO — i numeri dello studio, ogni giorno
// ------------------------------------------------------------
// 11 novembre 2026. Il titolare: «Voglio un rapporto automatico,
// riservato esclusivamente all'amministratore, generato attraverso il
// motore esistente delle 04:00».
//
// Quattro sezioni:
//   1. Incassi registrati.
//   2. Rate scadute e in scadenza.
//   3. Allievi che hanno svolto lezioni senza un pagamento registrato.
//   4. Riepilogo economico per collaboratore.
//
// TRE REGOLE, che valgono più del codice che segue.
//
// 1. OGNI NUMERO DICE DA DOVE VIENE. Periodo, fonte, data di
//    aggiornamento. Un totale senza fonte è un'opinione.
//
// 2. DUE FONTI NON SI SOMMANO. In ESSĒRE un incasso può essere
//    scritto in due posti che non si parlano: una RATA segnata come
//    pagata (piani di pagamento) e un MOVIMENTO in entrata (sezione
//    economica). Segnare pagata una rata non crea un movimento, e
//    viceversa. Sommarli conterebbe due volte lo stesso bonifico;
//    sceglierne uno nasconderebbe l'altro. Qui si mostrano tutti e
//    due, affiancati, e la differenza è un'informazione: dice quanto
//    c'è ancora da riconciliare.
//
// 3. «SENZA PAGAMENTO REGISTRATO» NON VUOL DIRE «DEBITO». Vuol dire
//    che nell'applicazione non risulta. Può essere una prova gratuita,
//    un pagamento preso e non scritto, un bonifico che aspetta
//    conferma, una rata non ancora dovuta. Ogni riga porta il suo
//    stato amministrativo, e nessuna dice «deve».
//
// Qui non c'è intelligenza artificiale: sono somme e confronti di
// date. Lo stesso dato dà sempre lo stesso rapporto.
// ============================================================

import { calculateCollaboratorEarnings } from './formulas';

export const RAPPORTO_VERSIONE = 1;

// ---------------- i dati in ingresso ----------------
// Forme minime e tolleranti: nel database ci sono documenti scritti
// in mesi diversi da versioni diverse. Un campo che manca non deve
// far cadere il rapporto: deve finire fra gli avvisi.

export interface RataIn {
  id?: string;
  amount?: number;
  dueDate?: Date | null;
  paidDate?: Date | null;
  status?: string;
  transferPending?: boolean;
}

export interface PianoIn {
  id: string;
  studentId?: string;
  collaboratorId?: string;
  installments?: RataIn[];
}

export interface MovimentoIn {
  type?: string;
  amount?: number;
  date?: Date | null;
  collaboratorId?: string;
  studentId?: string;
}

export interface SedutaIn {
  id: string;
  studentId?: string;
  collaboratorId?: string;
  date?: Date | null;
  status?: string;
  isCountedAsCompleted?: boolean;
  scaloDaFare?: boolean;
}

export interface PersonaIn {
  id: string;
  role?: string;
  name?: string;
  surname?: string;
  isActive?: boolean;
  /** collaboratore/manager: la sua percentuale di base */
  commissionPercentage?: number;
  /** allievo: chi lo segue */
  assignedCollaboratorIds?: string[];
  assignedCollaboratorId?: string;
  /** allievo: percentuale del coach decisa per lui, se diversa */
  coachCommissionPercentage?: number;
}

export interface DatiRapporto {
  adesso: Date;
  piani: PianoIn[];
  movimenti: MovimentoIn[];
  sedute: SedutaIn[];
  persone: PersonaIn[];
}

// ---------------- il rapporto ----------------

export interface Somma {
  importo: number;
  /** quante registrazioni: zero è un'informazione, non un vuoto */
  numero: number;
}

export interface RigaRata {
  pianoId: string;
  allievoId: string;
  allievo: string;
  collaboratore: string;
  importo: number;
  /** giorno di scadenza, AAAA-MM-GG */
  scadenza: string;
  /** > 0 = giorni di ritardo, < 0 = giorni che mancano */
  giorni: number;
}

export type StatoLezioni =
  | 'nessun percorso'
  | 'rata scaduta'
  | 'bonifico da confermare'
  | 'sedute da scalare'
  | 'non ancora dovuto';

export interface RigaLezioni {
  allievoId: string;
  allievo: string;
  collaboratore: string;
  sedute: number;
  /** giorno dell'ultima seduta, AAAA-MM-GG */
  ultima: string;
  stato: StatoLezioni;
  /** che cosa risulta, in una frase — mai «deve» */
  dettaglio: string;
}

export interface RigaCollaboratore {
  id: string;
  nome: string;
  ruolo: string;
  allievi: number;
  sedute: number;
  /** rate segnate pagate nel mese sui piani intestati a lui */
  rate: Somma;
  /** entrate registrate nei movimenti a suo nome, nel mese */
  movimenti: Somma;
  /** quota calcolata sulle rate del mese; null se manca una percentuale */
  quotaCollaboratore: number | null;
  quotaStudio: number | null;
  /** come si è arrivati alla quota, o perché non c'è */
  notaQuota: string;
}

export interface RapportoMattino {
  versione: number;
  /** quando è stato calcolato (ISO) */
  generatoIl: string;
  /** il giorno a cui si riferisce «oggi», ora italiana (AAAA-MM-GG) */
  giorno: string;
  incassi: {
    periodi: { ieri: string; mese: string; mesePrecedente: string };
    rate: { ieri: Somma; mese: Somma; mesePrecedente: Somma; fonte: string };
    movimenti: { ieri: Somma; mese: Somma; mesePrecedente: Somma; fonte: string };
    uscite: { mese: Somma; mesePrecedente: Somma; fonte: string };
    nota: string;
  };
  rate: {
    periodo: string;
    fonte: string;
    scadute: RigaRata[];
    totaleScaduto: number;
    daConfermare: RigaRata[];
    inScadenza: RigaRata[];
    totaleInScadenza: number;
  };
  lezioni: {
    periodo: string;
    fonte: string;
    righe: RigaLezioni[];
    nota: string;
  };
  collaboratori: {
    periodo: string;
    fonte: string;
    righe: RigaCollaboratore[];
    nota: string;
  };
  /** quanti documenti sono entrati nel conto: la base di ogni numero */
  letti: { piani: number; rate: number; movimenti: number; sedute: number; persone: number };
  /** dati mancanti o illeggibili: non si nascondono */
  avvisi: string[];
}

// ---------------- date: sempre in ora italiana ----------------

const FORMATO_ROMA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
});

/**
 * Il giorno di calendario in Italia, come AAAA-MM-GG. Le funzioni
 * girano in UTC: un incasso segnato alle 00:30 italiane, in UTC, è
 * ancora «ieri». Confrontando i giorni come stringhe italiane il
 * problema non esiste.
 */
export const giornoRoma = (d: Date): string => FORMATO_ROMA.format(d);

const valida = (d: Date | null | undefined): d is Date =>
  d instanceof Date && !isNaN(d.getTime());

/** AAAA-MM-GG spostato di n giorni. */
export const spostaGiorno = (giorno: string, n: number): string => {
  const [a, m, g] = giorno.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, g + n)).toISOString().slice(0, 10);
};

const giorniFra = (da: string, a: string): number => {
  const t = (s: string): number => {
    const [y, m, g] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, g);
  };
  return Math.round((t(a) - t(da)) / 86400000);
};

const inItaliano = (giorno: string): string => {
  const [a, m, g] = giorno.split('-');
  return `${g}/${m}/${a}`;
};

const cent = (x: number): number => Math.round(x * 100) / 100;
const somma0 = (): Somma => ({ importo: 0, numero: 0 });
const aggiungi = (s: Somma, importo: number): void => {
  s.importo = cent(s.importo + importo);
  s.numero += 1;
};

/**
 * Una rata è pagata quando il suo stato è 'paid'. È l'unico campo che
 * l'applicazione scrive (paymentService → markInstallmentPaid).
 */
export const rataPagata = (r: RataIn | null | undefined): boolean =>
  !!r && r.status === 'paid';

/** Una seduta conta come svolta se è completata o conteggiata. */
export const sedutaSvolta = (s: SedutaIn): boolean =>
  s.isCountedAsCompleted === true || s.status === 'completed';

const nomeDi = (p: PersonaIn | undefined, ripiego: string): string => {
  if (!p) return ripiego;
  return `${p.name || ''} ${p.surname || ''}`.trim() || ripiego;
};

const coachDi = (p: PersonaIn): string[] =>
  p.assignedCollaboratorIds && p.assignedCollaboratorIds.length > 0
    ? p.assignedCollaboratorIds
    : p.assignedCollaboratorId ? [p.assignedCollaboratorId] : [];

const percentualeValida = (x: unknown): x is number =>
  typeof x === 'number' && isFinite(x) && x >= 0 && x <= 100;

export const NOTA_INCASSI =
  'Rate e movimenti sono due registri diversi e non si sommano: lo stesso incasso può stare in tutti e due, o in uno solo. La differenza fra i due è quanto resta da riconciliare.';

export const NOTA_LEZIONI =
  '«Senza pagamento registrato» vuol dire che nell\'applicazione non risulta: non che la persona debba qualcosa. Può essere una prova, un pagamento preso e non scritto, un accordo diverso. Ogni riga va verificata prima di parlarne con l\'allievo.';

export const NOTA_COLLABORATORI =
  'La quota è calcolata solo sulle rate segnate pagate nel mese, con la percentuale dell\'allievo se c\'è, altrimenti con quella del collaboratore. Non tiene conto delle quote del manager né di accordi fuori dall\'applicazione: è una base di calcolo, non un conteggio da pagare.';

/** Quanti giorni indietro si guardano le sedute. */
export const GIORNI_LEZIONI = 30;
/** Quanti giorni avanti si guardano le scadenze. */
export const GIORNI_SCADENZE = 7;

/**
 * Costruisce il rapporto dai dati grezzi. Funzione pura: non legge
 * niente, non scrive niente, non conosce il database.
 */
export const costruisciRapporto = (dati: DatiRapporto): RapportoMattino => {
  const avvisi: string[] = [];
  const oggi = giornoRoma(dati.adesso);
  const ieri = spostaGiorno(oggi, -1);
  const inizioMese = `${oggi.slice(0, 7)}-01`;
  const fineMeseScorso = spostaGiorno(inizioMese, -1);
  const inizioMeseScorso = `${fineMeseScorso.slice(0, 7)}-01`;
  const daLezioni = spostaGiorno(oggi, -GIORNI_LEZIONI);
  const finoScadenze = spostaGiorno(oggi, GIORNI_SCADENZE);

  const nelMese = (g: string): boolean => g >= inizioMese && g <= oggi;
  const nelMeseScorso = (g: string): boolean => g >= inizioMeseScorso && g <= fineMeseScorso;

  const persone = new Map<string, PersonaIn>();
  for (const p of dati.persone || []) if (p && p.id) persone.set(p.id, p);
  const chi = (id: string | undefined, ripiego: string): string =>
    id ? nomeDi(persone.get(id), ripiego) : ripiego;

  // ---------- 1. incassi ----------
  const rate = { ieri: somma0(), mese: somma0(), mesePrecedente: somma0() };
  const mov = { ieri: somma0(), mese: somma0(), mesePrecedente: somma0() };
  const uscite = { mese: somma0(), mesePrecedente: somma0() };

  let quanteRate = 0;
  let pagateSenzaData = 0;
  let rateSenzaScadenza = 0;

  // ---------- 2. rate ----------
  const scadute: RigaRata[] = [];
  const daConfermare: RigaRata[] = [];
  const inScadenza: RigaRata[] = [];

  // serve alla sezione 3 e alla 4
  const pianiPerAllievo = new Map<string, PianoIn[]>();
  const rateDelMese: Array<{ piano: PianoIn; importo: number }> = [];

  for (const piano of dati.piani || []) {
    if (!piano) continue;
    if (piano.studentId) {
      const l = pianiPerAllievo.get(piano.studentId) || [];
      l.push(piano);
      pianiPerAllievo.set(piano.studentId, l);
    }
    for (const r of piano.installments || []) {
      if (!r) continue;
      quanteRate += 1;
      const importo = Number(r.amount) || 0;

      if (rataPagata(r)) {
        if (!valida(r.paidDate)) { pagateSenzaData += 1; continue; }
        const g = giornoRoma(r.paidDate);
        if (g === ieri) aggiungi(rate.ieri, importo);
        if (nelMese(g)) { aggiungi(rate.mese, importo); rateDelMese.push({ piano, importo }); }
        if (nelMeseScorso(g)) aggiungi(rate.mesePrecedente, importo);
        continue;
      }

      if (!valida(r.dueDate)) { rateSenzaScadenza += 1; continue; }
      const scadenza = giornoRoma(r.dueDate);
      const riga: RigaRata = {
        pianoId: piano.id,
        allievoId: piano.studentId || '',
        allievo: chi(piano.studentId, 'Allievo non in anagrafica'),
        collaboratore: chi(piano.collaboratorId, 'Non attribuito'),
        importo: cent(importo),
        scadenza,
        giorni: giorniFra(scadenza, oggi),
      };
      // Un bonifico che l'allievo dichiara di aver fatto non è una
      // rata scaduta: è una rata che aspetta la TUA conferma.
      if (r.transferPending) daConfermare.push(riga);
      else if (scadenza < oggi) scadute.push(riga);
      else if (scadenza <= finoScadenze) inScadenza.push(riga);
    }
  }
  if (pagateSenzaData > 0) {
    avvisi.push(`${pagateSenzaData} ${pagateSenzaData === 1 ? 'rata è segnata pagata ma non ha' : 'rate sono segnate pagate ma non hanno'} la data di pagamento: non ${pagateSenzaData === 1 ? 'entra' : 'entrano'} negli incassi di nessun periodo.`);
  }
  if (rateSenzaScadenza > 0) {
    avvisi.push(`${rateSenzaScadenza} ${rateSenzaScadenza === 1 ? 'rata non pagata non ha' : 'rate non pagate non hanno'} la data di scadenza: non si può dire se ${rateSenzaScadenza === 1 ? 'è scaduta' : 'sono scadute'}.`);
  }

  const incassoPerAllievo = new Set<string>();
  const movDelMese: MovimentoIn[] = [];
  let movSenzaData = 0;
  for (const m of dati.movimenti || []) {
    if (!m) continue;
    const importo = Number(m.amount) || 0;
    if (m.type === 'income' && m.studentId) incassoPerAllievo.add(m.studentId);
    if (!valida(m.date)) { movSenzaData += 1; continue; }
    const g = giornoRoma(m.date);
    if (m.type === 'income') {
      if (g === ieri) aggiungi(mov.ieri, importo);
      if (nelMese(g)) { aggiungi(mov.mese, importo); movDelMese.push(m); }
      if (nelMeseScorso(g)) aggiungi(mov.mesePrecedente, importo);
    } else if (m.type === 'expense') {
      if (nelMese(g)) aggiungi(uscite.mese, importo);
      if (nelMeseScorso(g)) aggiungi(uscite.mesePrecedente, importo);
    }
  }
  if (movSenzaData > 0) {
    avvisi.push(`${movSenzaData} ${movSenzaData === 1 ? 'movimento non ha' : 'movimenti non hanno'} la data: non ${movSenzaData === 1 ? 'entra' : 'entrano'} in nessun periodo.`);
  }

  scadute.sort((a, b) => b.giorni - a.giorni);
  daConfermare.sort((a, b) => b.giorni - a.giorni);
  inScadenza.sort((a, b) => a.scadenza.localeCompare(b.scadenza));

  // ---------- 3. lezioni svolte senza un pagamento registrato ----------
  const perAllievo = new Map<string, { sedute: number; ultima: string; daScalare: number; coach: Map<string, number> }>();
  const sedutePerCoach = new Map<string, number>();
  let seduteSenzaData = 0;
  for (const s of dati.sedute || []) {
    if (!s || !sedutaSvolta(s)) continue;
    if (!valida(s.date)) { seduteSenzaData += 1; continue; }
    const g = giornoRoma(s.date);
    if (nelMese(g) && s.collaboratorId) {
      sedutePerCoach.set(s.collaboratorId, (sedutePerCoach.get(s.collaboratorId) || 0) + 1);
    }
    if (g < daLezioni || g > oggi || !s.studentId) continue;
    const a = perAllievo.get(s.studentId)
      || { sedute: 0, ultima: g, daScalare: 0, coach: new Map<string, number>() };
    a.sedute += 1;
    if (g > a.ultima) a.ultima = g;
    if (s.scaloDaFare) a.daScalare += 1;
    if (s.collaboratorId) a.coach.set(s.collaboratorId, (a.coach.get(s.collaboratorId) || 0) + 1);
    perAllievo.set(s.studentId, a);
  }
  if (seduteSenzaData > 0) {
    avvisi.push(`${seduteSenzaData} ${seduteSenzaData === 1 ? 'seduta svolta non ha' : 'sedute svolte non hanno'} la data: non ${seduteSenzaData === 1 ? 'è stata contata' : 'sono state contate'}.`);
  }

  const righeLezioni: RigaLezioni[] = [];
  for (const [allievoId, a] of perAllievo) {
    const piani = pianiPerAllievo.get(allievoId) || [];
    const rateSue = piani
      .reduce<RataIn[]>((tutte, p) => tutte.concat(p.installments || []), [])
      .filter(Boolean);
    const haPagato = rateSue.some(rataPagata) || incassoPerAllievo.has(allievoId);

    let stato: StatoLezioni | null = null;
    let dettaglio = '';
    if (piani.length === 0 && !incassoPerAllievo.has(allievoId)) {
      stato = 'nessun percorso';
      dettaglio = 'Non risulta nessun percorso e nessun movimento a suo nome. Da verificare: prova, omaggio o pagamento non ancora scritto.';
    } else if (haPagato) {
      if (a.daScalare > 0) {
        stato = 'sedute da scalare';
        dettaglio = `${a.daScalare} ${a.daScalare === 1 ? 'seduta non è stata scalata' : 'sedute non sono state scalate'} dal percorso (esaurito o mancante). Ha pagamenti registrati.`;
      }
    } else if (rateSue.some((r) => r.transferPending)) {
      stato = 'bonifico da confermare';
      dettaglio = 'Ha dichiarato un bonifico che aspetta la tua conferma.';
    } else if (rateSue.some((r) => valida(r.dueDate) && giornoRoma(r.dueDate) < oggi)) {
      stato = 'rata scaduta';
      dettaglio = 'Ha un percorso, nessuna rata segnata pagata e almeno una già scaduta.';
    } else {
      stato = 'non ancora dovuto';
      dettaglio = 'Ha un percorso e nessuna rata segnata pagata, ma nessuna è ancora scaduta.';
    }
    if (!stato) continue;

    const coach = Array.from(a.coach.entries()).sort((x, y) => y[1] - x[1])[0];
    if (!persone.has(allievoId)) {
      avvisi.push(`Ci sono sedute svolte per un allievo che non è in anagrafica (${allievoId}).`);
    }
    righeLezioni.push({
      allievoId,
      allievo: chi(allievoId, 'Allievo non in anagrafica'),
      collaboratore: coach ? chi(coach[0], 'Non attribuito') : 'Non attribuito',
      sedute: a.sedute,
      ultima: a.ultima,
      stato,
      dettaglio,
    });
  }
  const ORDINE: Record<StatoLezioni, number> = {
    'nessun percorso': 0, 'rata scaduta': 1, 'sedute da scalare': 2,
    'bonifico da confermare': 3, 'non ancora dovuto': 4,
  };
  righeLezioni.sort((x, y) => ORDINE[x.stato] - ORDINE[y.stato] || y.sedute - x.sedute);

  // ---------- 4. riepilogo per collaboratore ----------
  const squadra = (dati.persone || []).filter(
    (p) => p && (p.role === 'collaborator' || p.role === 'manager') && p.isActive !== false
  );
  const allievi = (dati.persone || []).filter(
    (p) => p && p.role === 'student' && p.isActive !== false
  );

  const rigaDi = (id: string, nome: string, ruolo: string, base: PersonaIn | undefined): RigaCollaboratore => {
    const sue = rateDelMese.filter((x) => (x.piano.collaboratorId || '') === id);
    const r = somma0();
    let quota = 0;
    let senzaPercentuale = 0;
    const usate = new Set<number>();
    for (const x of sue) {
      aggiungi(r, x.importo);
      const allievo = x.piano.studentId ? persone.get(x.piano.studentId) : undefined;
      const pct = percentualeValida(allievo?.coachCommissionPercentage)
        ? allievo!.coachCommissionPercentage
        : base?.commissionPercentage;
      if (!percentualeValida(pct)) { senzaPercentuale += 1; continue; }
      usate.add(pct);
      quota += calculateCollaboratorEarnings(x.importo, pct).collaboratorShare;
    }
    const m = somma0();
    for (const x of movDelMese) if ((x.collaboratorId || '') === id) aggiungi(m, Number(x.amount) || 0);

    let quotaCollaboratore: number | null = null;
    let quotaStudio: number | null = null;
    let notaQuota: string;
    if (id === '') {
      notaQuota = 'Incassi senza un collaboratore indicato.';
    } else if (r.numero === 0) {
      notaQuota = 'Nessuna rata segnata pagata nel mese: nessuna quota da calcolare.';
    } else if (senzaPercentuale > 0) {
      notaQuota = `Percentuale non impostata per ${senzaPercentuale} ${senzaPercentuale === 1 ? 'rata' : 'rate'}: la quota non si può calcolare.`;
    } else {
      quotaCollaboratore = cent(quota);
      quotaStudio = cent(r.importo - quota);
      notaQuota = `Percentuale applicata: ${Array.from(usate).sort((a, b) => a - b).map((p) => `${p}%`).join(', ')}.`;
    }
    return {
      id,
      nome,
      ruolo,
      allievi: id ? allievi.filter((a) => coachDi(a).includes(id)).length : 0,
      sedute: sedutePerCoach.get(id) || 0,
      rate: r,
      movimenti: m,
      quotaCollaboratore,
      quotaStudio,
      notaQuota,
    };
  };

  const righeCollab = squadra
    .map((p) => rigaDi(p.id, nomeDi(p, 'Senza nome'), p.role === 'manager' ? 'manager' : 'collaboratore', p))
    .sort((a, b) => b.rate.importo - a.rate.importo || b.sedute - a.sedute || b.allievi - a.allievi);

  // Quello che non è di nessuno della squadra non sparisce: va in fondo.
  const idSquadra = new Set(squadra.map((p) => p.id));
  const fuori = new Set<string>();
  for (const x of rateDelMese) if (!idSquadra.has(x.piano.collaboratorId || '')) fuori.add(x.piano.collaboratorId || '');
  for (const x of movDelMese) if (!idSquadra.has(x.collaboratorId || '')) fuori.add(x.collaboratorId || '');
  for (const id of fuori) {
    const p = id ? persone.get(id) : undefined;
    const ruolo = !id ? 'non attribuito' : p?.role === 'owner' ? 'titolare' : 'fuori squadra';
    const nome = !id ? 'Non attribuito' : nomeDi(p, 'Persona non in anagrafica');
    righeCollab.push(rigaDi(id, nome, ruolo, p));
  }

  const mese = `dal ${inItaliano(inizioMese)} al ${inItaliano(oggi)}`;
  return {
    versione: RAPPORTO_VERSIONE,
    generatoIl: dati.adesso.toISOString(),
    giorno: oggi,
    incassi: {
      periodi: {
        ieri: inItaliano(ieri),
        mese,
        mesePrecedente: `dal ${inItaliano(inizioMeseScorso)} al ${inItaliano(fineMeseScorso)}`,
      },
      rate: { ...rate, fonte: 'Piani di pagamento: rate segnate come pagate, per data di pagamento.' },
      movimenti: { ...mov, fonte: 'Sezione economica: movimenti in entrata, per data del movimento.' },
      uscite: { ...uscite, fonte: 'Sezione economica: movimenti in uscita, per data del movimento.' },
      nota: NOTA_INCASSI,
    },
    rate: {
      periodo: `scadute fino al ${inItaliano(ieri)}; in scadenza dal ${inItaliano(oggi)} al ${inItaliano(finoScadenze)}`,
      fonte: 'Piani di pagamento: rate non segnate come pagate, per data di scadenza.',
      scadute,
      totaleScaduto: cent(scadute.reduce((s, r) => s + r.importo, 0)),
      daConfermare,
      inScadenza,
      totaleInScadenza: cent(inScadenza.reduce((s, r) => s + r.importo, 0)),
    },
    lezioni: {
      periodo: `sedute svolte dal ${inItaliano(daLezioni)} al ${inItaliano(oggi)}`,
      fonte: 'Sedute segnate come svolte o conteggiate, incrociate con piani di pagamento e movimenti in entrata dell\'allievo.',
      righe: righeLezioni,
      nota: NOTA_LEZIONI,
    },
    collaboratori: {
      periodo: mese,
      fonte: 'Anagrafica (allievi assegnati e percentuali), sedute svolte, rate segnate pagate e movimenti in entrata del mese.',
      righe: righeCollab,
      nota: NOTA_COLLABORATORI,
    },
    letti: {
      piani: (dati.piani || []).length,
      rate: quanteRate,
      movimenti: (dati.movimenti || []).length,
      sedute: (dati.sedute || []).length,
      persone: (dati.persone || []).length,
    },
    avvisi: Array.from(new Set(avvisi)),
  };
};
