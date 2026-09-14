import {
  collection, addDoc, getDocs, query, orderBy, limit as qLimit,
  Timestamp, doc, deleteDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import {
  Comunicazione, Allegato, TipoComunicazione, TipoAllegato,
  COMUNICAZIONE_VERSION,
} from '../domain/comunicazione';
import { createNotification } from './notificationService';

// ============================================================
// MANDARE UNA COSA A TUTTI
// ------------------------------------------------------------
// Due scritture, non una:
//
//   1. la comunicazione, UNA volta, in `comunicazioni` — è il
//      documento vero, con il testo e l'allegato;
//   2. una notifica a testa, in `notifications` — è la campanella
//      che la fa comparire, e che ognuno può segnare come letta.
//
// Si poteva fare solo con le notifiche, copiando il testo in ognuna.
// Non si è fatto: con cento allievi sarebbero cento copie dello
// stesso video da correggere se c'è un refuso, e nessun posto dove
// rileggere che cosa si è mandato.
//
// Se la fan-out delle notifiche fallisce a metà, la comunicazione
// resta: chi apre la bacheca la vede comunque. È il motivo per cui
// l'ordine è questo e non l'inverso.
// ============================================================

const COMUNICAZIONI = 'comunicazioni';

const nomePulito = (nome: string): string =>
  (nome || 'allegato')
    .replace(/[^\w.\-]+/g, '_')
    .slice(-60);

/**
 * Carica l'allegato e restituisce l'indirizzo da cui si scarica.
 * Il controllo sul peso si fa PRIMA, in domain/comunicazione: qui si
 * carica e basta.
 */
export const caricaAllegato = async (
  file: Blob,
  tipo: TipoAllegato,
  nome: string
): Promise<Allegato> => {
  const quando = Date.now();
  const percorso = `comunicazioni/${quando}_${nomePulito(nome)}`;
  const riferimento = ref(storage, percorso);
  await uploadBytes(riferimento, file);
  const url = await getDownloadURL(riferimento);
  return { tipo, url, nome, peso: file.size };
};

export interface DaInviare {
  tipo: TipoComunicazione;
  titolo: string;
  testo: string;
  allegato?: Allegato | null;
  autoreId: string;
  autoreNome: string;
  /** gli id di chi la riceve: li sceglie la schermata, non questo file */
  destinatariIds: string[];
  /** una prova su di sé: resta in bacheca ma si riconosce a colpo d'occhio */
  prova?: boolean;
}

export interface EsitoInvio {
  id: string;
  consegnate: number;
  nonConsegnate: number;
}

/**
 * Scrive la comunicazione e avvisa tutti.
 *
 * Il conteggio di chi NON è stato avvisato non si nasconde: se dieci
 * notifiche su cento falliscono, chi ha premuto Invia deve saperlo,
 * non leggere «inviata!» e scoprirlo fra una settimana.
 */
export const inviaComunicazione = async (
  dati: DaInviare
): Promise<EsitoInvio> => {
  const documento: Record<string, unknown> = {
    v: COMUNICAZIONE_VERSION,
    tipo: dati.tipo,
    titolo: dati.titolo.trim(),
    testo: dati.testo.trim(),
    autoreId: dati.autoreId,
    autoreNome: dati.autoreNome,
    destinatari: 'allievi',
    quanti: dati.destinatariIds.length,
    createdAt: Timestamp.now(),
  };
  if (dati.prova) documento.prova = true;
  if (dati.allegato) documento.allegato = dati.allegato;

  const creata = await addDoc(collection(db, COMUNICAZIONI), documento);

  // La campanella, una per persona. Si contano i fallimenti invece di
  // lasciarli cadere: `allSettled`, non `all`.
  const esiti = await Promise.allSettled(
    dati.destinatariIds.map((uid) =>
      createNotification(
        uid,
        'custom_alert',
        dati.titolo.trim(),
        dati.testo.trim() || 'Apri per vedere l\'allegato.',
        {
          comunicazioneId: creata.id,
          tipo: dati.tipo,
          // L'indirizzo dell'allegato viaggia dentro la notifica: chi la
          // apre lo raggiunge con un tocco, senza una lettura in più e
          // senza una schermata nuova da imparare.
          ...(dati.allegato
            ? { allegatoUrl: dati.allegato.url, allegatoTipo: dati.allegato.tipo }
            : {}),
        }
      )
    )
  );

  const consegnate = esiti.filter((e) => e.status === 'fulfilled').length;
  return {
    id: creata.id,
    consegnate,
    nonConsegnate: esiti.length - consegnate,
  };
};

const daTimestamp = (v: unknown): Date => {
  if (v instanceof Date) return v;
  const s = (v as { seconds?: number } | null)?.seconds;
  return typeof s === 'number' ? new Date(s * 1000) : new Date(0);
};

/** Le comunicazioni, dalla più recente. */
export const leggiComunicazioni = async (
  quante = 50
): Promise<Comunicazione[]> => {
  const q = query(
    collection(db, COMUNICAZIONI),
    orderBy('createdAt', 'desc'),
    qLimit(quante)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      tipo: (x.tipo as TipoComunicazione) || 'avviso',
      titolo: (x.titolo as string) || '',
      testo: (x.testo as string) || '',
      allegato: x.allegato as Allegato | undefined,
      autoreId: (x.autoreId as string) || '',
      autoreNome: (x.autoreNome as string) || '',
      destinatari: (x.destinatari as Comunicazione['destinatari']) || 'allievi',
      quanti: (x.quanti as number) || 0,
      prova: x.prova === true,
      createdAt: daTimestamp(x.createdAt),
    };
  });
};

/**
 * Cancella una comunicazione e il suo allegato.
 *
 * Le notifiche già arrivate NON si richiamano indietro: sono sul
 * telefono delle persone, e fingere il contrario sarebbe peggio.
 * Questo toglie la comunicazione dalla bacheca, non dalla memoria di
 * chi l'ha letta.
 */
export const cancellaComunicazione = async (
  id: string,
  urlAllegato?: string
): Promise<void> => {
  if (urlAllegato) {
    try {
      await deleteObject(ref(storage, urlAllegato));
    } catch {
      // l'allegato può essere già sparito: non è un motivo per
      // lasciare la comunicazione in bacheca
    }
  }
  await deleteDoc(doc(db, COMUNICAZIONI, id));
};
