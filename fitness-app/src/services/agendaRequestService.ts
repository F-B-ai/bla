// ============================================================
// RICHIESTE DA WHATSAPP — servizio
// ------------------------------------------------------------
// Alessia riceve su WhatsApp, incolla qui. Il coach conferma, e
// SOLO allora nasce l'appuntamento in agenda. Nessuna logica in
// questo file: le regole (il tetto dei quattro, i conflitti, le
// risposte) stanno in src/domain/agenda.ts e si testano lì.
//
// La richiesta NON è un appuntamento: è una richiesta. Resta
// scritta anche quando viene rifiutata, così si sa quante persone
// hanno bussato e quante sono rimaste fuori.
// ============================================================

import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs,
  query, where, orderBy, limit, Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { TrainingSession, NutritionistAppointment, Student } from '../types';
import { getAllSessions } from './sessionService';
import { getAllAppointments } from './nutritionistService';
import { createSession } from './sessionService';
import { Impegno, RichiestaCAL, TipoImpegno } from '../domain/agenda';

const RICHIESTE = 'bookingRequests';

export type StatoRichiesta = 'in_attesa' | 'confermata' | 'rifiutata';

export interface RichiestaSalvata {
  id: string;
  persona: string;
  telefono: string;
  whatsapp: string;
  /** YYYY-MM-DD */
  giorno: string;
  /** HH:MM */
  ora: string;
  tipo: TipoImpegno;
  note: string;
  stato: StatoRichiesta;
  /** uid dell'allievo, se la persona è già in anagrafica */
  studentId?: string;
  /** id della sessione creata alla conferma */
  sessionId?: string;
  /** quando la persona non è ancora allieva: occupa il posto lo stesso */
  ospite?: boolean;
  creataDa: string;
  creataIl: Date;
  chiusaIl?: Date;
  motivoRifiuto?: string;
}

const aData = (v: any): Date =>
  v?.toDate?.() || (v instanceof Date ? v : new Date());

const daDoc = (d: any): RichiestaSalvata => {
  const x = d.data();
  return {
    id: d.id,
    persona: x.persona || '',
    telefono: x.telefono || '',
    whatsapp: x.whatsapp || '',
    giorno: x.giorno || '',
    ora: x.ora || '',
    tipo: (x.tipo as TipoImpegno) || 'visita',
    note: x.note || '',
    stato: (x.stato as StatoRichiesta) || 'in_attesa',
    studentId: x.studentId || undefined,
    sessionId: x.sessionId || undefined,
    ospite: x.ospite || false,
    creataDa: x.creataDa || '',
    creataIl: aData(x.creataIl),
    chiusaIl: x.chiusaIl ? aData(x.chiusaIl) : undefined,
    motivoRifiuto: x.motivoRifiuto || undefined,
  };
};

// ------------------------------------------------------------
// Scrivere e leggere le richieste
// ------------------------------------------------------------

export const salvaRichiesta = async (
  r: RichiestaCAL,
  creataDa: string,
  studentId?: string
): Promise<string> => {
  const docRef = await addDoc(collection(db, RICHIESTE), {
    persona: r.persona,
    telefono: r.telefono,
    whatsapp: r.whatsapp,
    giorno: r.giorno,
    ora: r.ora,
    tipo: r.tipo,
    note: r.note,
    stato: 'in_attesa' as StatoRichiesta,
    ...(studentId ? { studentId } : {}),
    creataDa,
    creataIl: Timestamp.now(),
  });
  return docRef.id;
};

export const getRichieste = async (maxResults = 100): Promise<RichiestaSalvata[]> => {
  const snap = await getDocs(query(
    collection(db, RICHIESTE),
    orderBy('creataIl', 'desc'),
    limit(maxResults)
  ));
  return snap.docs.map(daDoc);
};

export const getRichiesteInAttesa = async (): Promise<RichiestaSalvata[]> => {
  const snap = await getDocs(query(
    collection(db, RICHIESTE),
    where('stato', '==', 'in_attesa'),
    limit(200)
  ));
  return snap.docs.map(daDoc)
    .sort((a, b) => (a.giorno + a.ora).localeCompare(b.giorno + b.ora));
};

export const rifiutaRichiesta = async (id: string, motivo: string): Promise<void> => {
  await updateDoc(doc(db, RICHIESTE, id), {
    stato: 'rifiutata' as StatoRichiesta,
    motivoRifiuto: motivo,
    chiusaIl: Timestamp.now(),
  });
};

export const eliminaRichiesta = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, RICHIESTE, id));
};

// ------------------------------------------------------------
// Che cosa occupa già le giornate
// ------------------------------------------------------------

const giornoDi = (v: any): string => {
  const d = aData(v);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const nomeAllievo = (studenti: Student[], id: string): string => {
  const s = studenti.find((x) => x.id === id);
  return s ? `${s.name} ${s.surname}`.trim() : 'allievo';
};

/** Sessione o visita ancora in piedi: le disdette liberano il posto. */
const attiva = (stato: string): boolean =>
  stato === 'scheduled' || stato === 'completed';

/**
 * Tutti gli impegni che contano per il tetto dei quattro:
 * allenamenti, visite nutrizionista e richieste già confermate
 * per chi non è ancora allievo.
 */
export const leggiImpegni = async (studenti: Student[]): Promise<Impegno[]> => {
  const [sessioni, visite, richieste] = await Promise.all([
    getAllSessions(500).catch(() => [] as TrainingSession[]),
    getAllAppointments(500).catch(() => [] as NutritionistAppointment[]),
    getRichieste(200).catch(() => [] as RichiestaSalvata[]),
  ]);

  const impegni: Impegno[] = [];

  for (const s of sessioni) {
    impegni.push({
      giorno: giornoDi(s.date),
      ora: s.startTime || '',
      chi: nomeAllievo(studenti, s.studentId),
      origine: 'sessione',
      attivo: attiva(s.status as string),
    });
  }

  for (const a of visite) {
    impegni.push({
      giorno: giornoDi(a.date),
      ora: a.startTime || '',
      chi: `${nomeAllievo(studenti, a.studentId)} (nutrizione)`,
      origine: 'nutrizione',
      attivo: attiva(a.status as string),
    });
  }

  // Le richieste confermate per un ospite non hanno una sessione a cui
  // agganciarsi (non esiste ancora l'allievo): occupano il posto qui.
  for (const r of richieste) {
    if (r.stato !== 'confermata' || r.sessionId) continue;
    impegni.push({
      giorno: r.giorno,
      ora: r.ora,
      chi: `${r.persona} (ospite)`,
      origine: 'richiesta',
      attivo: true,
    });
  }

  return impegni;
};

// ------------------------------------------------------------
// La conferma: qui la richiesta diventa agenda
// ------------------------------------------------------------

const piuUnOra = (ora: string): string => {
  const [h, m] = (ora || '09:00').split(':').map((x) => parseInt(x, 10));
  const hh = Math.min(23, (isNaN(h) ? 9 : h) + 1);
  return `${String(hh).padStart(2, '0')}:${String(isNaN(m) ? 0 : m).padStart(2, '0')}`;
};

/**
 * Conferma una richiesta.
 *  · con `studentId`: nasce una vera sessione in agenda;
 *  · senza: la richiesta resta come OSPITE e occupa comunque uno
 *    dei quattro posti, finché la persona non entra in anagrafica.
 *
 * Il tetto NON si verifica qui: si verifica nel dominio, prima,
 * e la schermata non lascia premere il tasto se è pieno.
 */
export const confermaRichiesta = async (input: {
  richiesta: RichiestaSalvata;
  coachId: string;
  studentId?: string;
  costo?: number;
}): Promise<{ sessionId?: string; ospite: boolean }> => {
  const { richiesta: r, coachId, studentId, costo } = input;
  const [a, m, d] = r.giorno.split('-').map((x) => parseInt(x, 10));
  const data = new Date(a, (m || 1) - 1, d || 1);

  if (studentId) {
    const sessionId = await createSession({
      studentId,
      collaboratorId: coachId,
      date: data,
      startTime: r.ora,
      endTime: piuUnOra(r.ora),
      status: 'scheduled',
      notes: [r.note, r.telefono ? `Tel. ${r.telefono}` : '', 'Richiesta da WhatsApp']
        .filter(Boolean).join(' · '),
      ...(costo !== undefined ? { sessionCost: costo } : {}),
      isCountedAsCompleted: false,
    });
    await updateDoc(doc(db, RICHIESTE, r.id), {
      stato: 'confermata' as StatoRichiesta,
      studentId,
      sessionId,
      ospite: false,
      chiusaIl: Timestamp.now(),
    });
    return { sessionId, ospite: false };
  }

  await updateDoc(doc(db, RICHIESTE, r.id), {
    stato: 'confermata' as StatoRichiesta,
    ospite: true,
    chiusaIl: Timestamp.now(),
  });
  return { ospite: true };
};
