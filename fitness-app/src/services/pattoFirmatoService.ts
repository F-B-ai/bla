// ============================================================
// IL PATTO FIRMATO — persistenza
// ------------------------------------------------------------
// La foto della pagina firmata va nello Storage (`patti/<allievo>/`),
// con le stesse protezioni delle foto posturali. Il TESTO di quel
// momento va in Firestore, accanto.
//
// La foto prova CHE ha firmato. Il testo dice CHE COSA — e senza,
// fra un anno nessuno può più ricostruirlo, perché il patto si
// genera al volo dalle regole correnti.
//
// Nessuna regola qui: stanno in src/domain/pattoFirmato.ts.
// ============================================================

import {
  collection, addDoc, getDocs, query, where, limit, doc, deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import {
  PattoFirmato, SnapshotPatto, controllaAllegato,
} from '../domain/pattoFirmato';

const COLLECTION = 'pattiFirmati';

const leggi = (id: string, x: Record<string, any>): PattoFirmato => ({
  id,
  studentId: x.studentId || '',
  studentName: x.studentName || '',
  firmatoIl: x.firmatoIl?.toDate?.() || new Date(x.firmatoIl || Date.now()),
  allegatoIl: x.allegatoIl?.toDate?.() || new Date(),
  allegatoDa: x.allegatoDa || '',
  fileUrl: x.fileUrl || '',
  fileTipo: x.fileTipo || '',
  filePath: x.filePath || '',
  snapshot: x.snapshot || {
    versioneTesto: 0, testo: '', percorso: '', rate: 0,
    importoRata: 0, disdettaOre: 0,
  },
});

/**
 * Allega la copia firmata.
 *
 * Ordine voluto: prima il file, poi la scheda. Se il caricamento
 * fallisce non resta una scheda che promette una foto che non c'è —
 * un documento che dice «firmato» senza la prova è peggio di niente.
 */
export const allegaPattoFirmato = async (input: {
  studentId: string;
  studentName: string;
  firmatoIl: Date;
  allegatoDa: string;
  file: Blob;
  nomeFile: string;
  /**
   * Il tipo dichiarato. Su telefono `fetch(file://…).blob()` a volte
   * restituisce un Blob senza `type`: senza questo, un allegato buono
   * verrebbe rifiutato con «non riesco a capire che tipo di file è».
   */
  tipo?: string;
  snapshot: SnapshotPatto;
}): Promise<PattoFirmato> => {
  const tipo = input.tipo || input.file.type;
  const esito = controllaAllegato({
    tipo,
    byte: input.file.size,
    nome: input.nomeFile,
  });
  if (!esito.ok) throw new Error(esito.problemi.join('\n'));

  const nome = `${Date.now()}-${input.nomeFile.replace(/[^\w.\-]/g, '_')}`;
  const percorso = `patti/${input.studentId}/${nome}`;
  const riferimento = ref(storage, percorso);

  await uploadBytes(riferimento, input.file, { contentType: tipo });
  const fileUrl = await getDownloadURL(riferimento);

  const dati = {
    studentId: input.studentId,
    studentName: input.studentName,
    firmatoIl: Timestamp.fromDate(input.firmatoIl),
    allegatoIl: Timestamp.now(),
    allegatoDa: input.allegatoDa,
    fileUrl,
    fileTipo: tipo,
    filePath: percorso,
    snapshot: input.snapshot,
  };
  const creato = await addDoc(collection(db, COLLECTION), dati);
  return leggi(creato.id, dati);
};

/**
 * L'ultimo patto firmato di un allievo.
 *
 * Un solo `where`, niente `orderBy` accanto: la scelta del più
 * recente si fa qui. Un indice composito che manca fa fallire la
 * query, e una query fallita si vedrebbe identica a «non c'è nessun
 * patto» — il difetto del 15 settembre, in un altro file.
 */
export const leggiPattoFirmato = async (
  studentId: string
): Promise<PattoFirmato | null> => {
  if (!studentId) return null;
  const snap = await getDocs(query(
    collection(db, COLLECTION),
    where('studentId', '==', studentId),
    limit(50)
  ));
  if (snap.empty) return null;
  return snap.docs
    .map((d) => leggi(d.id, d.data()))
    .sort((a, b) => b.allegatoIl.getTime() - a.allegatoIl.getTime())[0];
};

/** Toglie la copia digitale. La carta resta l'unica prova. */
export const cancellaPattoFirmato = async (
  patto: PattoFirmato,
  filePath?: string
): Promise<void> => {
  // Prima la scheda: se sparisse solo il file resterebbe una riga
  // che promette un documento che non si apre.
  await deleteDoc(doc(db, COLLECTION, patto.id));
  const percorso = filePath || patto.filePath;
  if (percorso) {
    // Il file può già non esserci: non è un errore da mostrare.
    await deleteObject(ref(storage, percorso)).catch(() => {});
  }
};
