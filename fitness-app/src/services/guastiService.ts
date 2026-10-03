import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Guasto, componiGuasto, DatiGuasto } from '../domain/guasti';
import { senzaIndefiniti } from '../domain/salvataggio';

const GUASTI_COLLECTION = 'guasti';

/**
 * L'impronta del pacchetto in esecuzione.
 *
 * È il dato che mancava di più: sapere «non parte» senza sapere
 * QUALE versione non parte vuol dire ricominciare da capo ogni
 * volta. Il nome del file del bundle contiene l'impronta, e sul web
 * si legge dai tag <script> senza aggiungere niente alla build.
 */
export const versioneInEsecuzione = (): string => {
  try {
    const d = (globalThis as any).document;
    if (!d) return 'app';
    const tag: any[] = Array.from(d.getElementsByTagName('script') || []);
    for (const s of tag) {
      const m = String(s.src || '').match(/App-([a-f0-9]{8,})\.js/);
      if (m) return m[1].slice(0, 12);
    }
    return 'web';
  } catch {
    return 'sconosciuta';
  }
};

// Dove si era arrivati. Una schermata che si rompe di solito non sa
// come si chiama: glielo dice la navigazione, che la aggiorna a ogni
// cambio. Senza, il registro direbbe solo «si è rotto qualcosa».
let ultimaSchermata = '';

export const segnaSchermata = (nome?: string | null): void => {
  if (nome) ultimaSchermata = String(nome).slice(0, 60);
};

export const schermataCorrente = (): string => ultimaSchermata;

/**
 * Registra un guasto. NON lancia mai, e non aspetta nessuno.
 *
 * Un registro dei guasti che si guasta, o che blocca la schermata
 * mentre prova a scrivere, sarebbe una beffa. Se la scrittura non
 * riesce — offline, permesso negato, regola cambiata — il guasto
 * resta comunque sullo schermo di chi lo sta vivendo, che è la cosa
 * che conta davvero.
 */
export const registraGuasto = async (d: DatiGuasto): Promise<void> => {
  try {
    const g: Guasto = componiGuasto({
      ...d,
      schermata: d.schermata || ultimaSchermata,
      versione: d.versione || versioneInEsecuzione(),
    });
    await addDoc(collection(db, GUASTI_COLLECTION), senzaIndefiniti({
      ...g,
      quando: Timestamp.fromDate(g.quando),
      // L'id serve a distinguere «è successo a tutti» da «è successo
      // a uno»: sono due guasti diversi. Il nome non serve mai.
      utente: auth.currentUser ? auth.currentUser.uid : '',
    }));
  } catch {
    // Volutamente in silenzio: vedi sopra.
  }
};

/** Gli ultimi guasti, per la revisione del lunedì. Solo il titolare. */
export const leggiGuasti = async (quanti = 100): Promise<Guasto[]> => {
  const q = query(
    collection(db, GUASTI_COLLECTION),
    orderBy('quando', 'desc'),
    limit(quanti)
  );
  const s = await getDocs(q);
  return s.docs.map((d) => {
    const v = d.data() as any;
    return {
      messaggio: v.messaggio || '',
      schermata: v.schermata || 'sconosciuta',
      traccia: v.traccia || '',
      versione: v.versione || 'sconosciuta',
      ruolo: v.ruolo || 'sconosciuto',
      quando: v.quando?.toDate ? v.quando.toDate() : new Date(),
    };
  });
};
