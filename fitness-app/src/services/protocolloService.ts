// ============================================================
// I PROTOCOLLI DI LAVORO — l'archivio
// ------------------------------------------------------------
// Fino a qui il protocollo si stampava e finiva lì: a gennaio non
// esisteva più quello di settembre. Una decisione tecnica presa su
// una persona, sparita con la carta.
//
// Ogni protocollo è una FOTOGRAFIA: le priorità come erano quel
// giorno, il piano come era quel giorno, le scelte del direttore
// tecnico come le ha scritte quel giorno. Le misure cambiano, le
// soglie possono cambiare: se non si congela, fra sei mesi la
// schermata mostrerebbe un protocollo diverso da quello consegnato.
//
// Non si correggono: se ne scrive uno nuovo. La differenza fra
// quello di settembre e quello di gennaio è il percorso della
// persona, ed è la cosa più preziosa dell'archivio.
//
// Nessuna regola qui: stanno in src/domain/protocolloScelte.ts.
// ============================================================

import {
  collection, addDoc, getDocs, query, where, limit, doc, deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Scelte, PrioritaScelta, SCELTE_VUOTE } from '../domain/protocolloScelte';
import { PianoLavoro } from '../domain/protocollo';

const COLLECTION = 'protocolli';

/** Quanti se ne leggono di una persona. Più di così non è storia, è archeologia. */
const TETTO = 50;

export interface ProtocolloSalvato {
  id: string;
  studentId: string;
  studentName: string;
  /** il giorno in cui è stato scritto */
  data: Date;
  autoreId: string;
  autoreNome: string;
  obiettivo: string;
  /** le priorità come erano quel giorno, referto e aggiunte insieme */
  priorita: PrioritaScelta[];
  /** che cosa ha deciso lui sopra il referto */
  scelte: Scelte;
  /** il piano come era quel giorno */
  piano: PianoLavoro | null;
  versione: number;
}

const leggi = (id: string, x: Record<string, any>): ProtocolloSalvato => ({
  id,
  studentId: x.studentId || '',
  studentName: x.studentName || '',
  data: x.data?.toDate?.() || new Date(x.data || Date.now()),
  autoreId: x.autoreId || '',
  autoreNome: x.autoreNome || '',
  obiettivo: x.obiettivo || '',
  priorita: Array.isArray(x.priorita) ? x.priorita : [],
  scelte: x.scelte || SCELTE_VUOTE,
  piano: x.piano || null,
  versione: x.versione || 1,
});

export const salvaProtocollo = async (input: {
  studentId: string;
  studentName: string;
  autoreId: string;
  autoreNome: string;
  obiettivo?: string;
  priorita: PrioritaScelta[];
  scelte: Scelte;
  piano: PianoLavoro;
  versione: number;
}): Promise<ProtocolloSalvato> => {
  if (!input.studentId) throw new Error('Scegli prima l\'allievo.');
  const dati = {
    studentId: input.studentId,
    studentName: input.studentName,
    data: Timestamp.now(),
    autoreId: input.autoreId,
    autoreNome: input.autoreNome,
    obiettivo: input.obiettivo || '',
    priorita: input.priorita,
    scelte: input.scelte,
    piano: input.piano,
    versione: input.versione,
  };
  const creato = await addDoc(collection(db, COLLECTION), dati);
  return leggi(creato.id, dati);
};

/**
 * I protocolli di una persona, dal più recente.
 *
 * Un solo `where`, niente `orderBy` accanto: l'ordine si fa qui. Un
 * indice composito che manca fa fallire la query, e una query
 * fallita si vedrebbe identica a «non c'è nessun protocollo» — il
 * difetto del 15 settembre, che ha fatto sparire gli appuntamenti
 * degli ospiti per due giorni.
 */
export const leggiProtocolli = async (
  studentId: string
): Promise<ProtocolloSalvato[]> => {
  if (!studentId) return [];
  const snap = await getDocs(query(
    collection(db, COLLECTION),
    where('studentId', '==', studentId),
    limit(TETTO)
  ));
  return snap.docs
    .map((d) => leggi(d.id, d.data()))
    .sort((a, b) => b.data.getTime() - a.data.getTime());
};

/** Toglie un protocollo dall'archivio. Solo il titolare, per regola. */
export const cancellaProtocollo = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, id));
};
