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
  PattoFirmato, PaginaPatto, SnapshotPatto, controllaAllegati, paginePatto,
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
  pagine: Array.isArray(x.pagine) ? x.pagine : undefined,
  snapshot: x.snapshot || {
    versioneTesto: 0, testo: '', percorso: '', rate: 0,
    importoRata: 0, disdettaOre: 0,
  },
});

/** Una pagina da caricare: il contenuto, come si chiama, che cos'è. */
export interface FileDaAllegare {
  blob: Blob;
  nome: string;
  /**
   * Il tipo dichiarato. Su telefono `fetch(file://…).blob()` a volte
   * restituisce un Blob senza `type`: senza questo, un allegato buono
   * verrebbe rifiutato con «non riesco a capire che tipo di file è».
   */
  tipo?: string;
}

/**
 * Allega la copia firmata, tutte le sue pagine.
 *
 * Ordine voluto: prima i file, poi la scheda. Se un caricamento
 * fallisce non resta una scheda che promette pagine che non ci sono —
 * un documento che dice «firmato» senza la prova è peggio di niente.
 *
 * Le pagine si caricano in fila, non in parallelo: l'ordine con cui
 * sono state scelte è l'ordine dei fogli, e va conservato.
 */
export const allegaPattoFirmato = async (input: {
  studentId: string;
  studentName: string;
  firmatoIl: Date;
  allegatoDa: string;
  files: FileDaAllegare[];
  snapshot: SnapshotPatto;
}): Promise<PattoFirmato> => {
  const scelti = (input.files || []).map((f) => ({
    ...f, tipo: f.tipo || f.blob.type,
  }));
  const esito = controllaAllegati(scelti.map((f) => ({
    tipo: f.tipo, byte: f.blob.size, nome: f.nome,
  })));
  if (!esito.ok) throw new Error(esito.problemi.join('\n'));

  const quando = Date.now();
  const pagine: PaginaPatto[] = [];
  for (let i = 0; i < scelti.length; i += 1) {
    const f = scelti[i];
    const nome = `${quando}-${i + 1}-${f.nome.replace(/[^\w.\-]/g, '_')}`;
    const percorso = `patti/${input.studentId}/${nome}`;
    const riferimento = ref(storage, percorso);
    // eslint-disable-next-line no-await-in-loop
    await uploadBytes(riferimento, f.blob, { contentType: f.tipo });
    // eslint-disable-next-line no-await-in-loop
    const url = await getDownloadURL(riferimento);
    pagine.push({ url, tipo: f.tipo, path: percorso });
  }

  const dati = {
    studentId: input.studentId,
    studentName: input.studentName,
    firmatoIl: Timestamp.fromDate(input.firmatoIl),
    allegatoIl: Timestamp.now(),
    allegatoDa: input.allegatoDa,
    // La prima pagina anche da sola: le schede vecchie si leggono così,
    // e continueranno a leggersi anche quelle nuove.
    fileUrl: pagine[0].url,
    fileTipo: pagine[0].tipo,
    filePath: pagine[0].path,
    pagine,
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

/** Toglie la copia digitale, tutte le pagine. La carta resta l'unica prova. */
export const cancellaPattoFirmato = async (patto: PattoFirmato): Promise<void> => {
  // Prima la scheda: se sparissero solo i file resterebbe una riga
  // che promette un documento che non si apre.
  await deleteDoc(doc(db, COLLECTION, patto.id));
  await Promise.all(paginePatto(patto)
    .map((p) => p.path)
    .filter((p): p is string => !!p)
    // Un file può già non esserci: non è un errore da mostrare.
    .map((p) => deleteObject(ref(storage, p)).catch(() => {})));
};
