import {
  collection, addDoc, getDocs, query, orderBy, limit as fbLimit, Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { senzaIndefiniti } from '../domain/salvataggio';
import {
  VoceRegistro, AzioneRegistro, OggettoRegistro,
} from '../domain/registro';

const REGISTRO = 'registro';

const aData = (v: unknown): Date => {
  const o = v as { toDate?: () => Date } | null;
  if (o && typeof o.toDate === 'function') return o.toDate();
  return v instanceof Date ? v : new Date();
};

const daDoc = (d: { id: string; data: () => Record<string, unknown> }): VoceRegistro => {
  const x = d.data();
  return {
    id: d.id,
    chi: String(x.chi || ''),
    chiNome: String(x.chiNome || ''),
    ruolo: String(x.ruolo || ''),
    azione: (x.azione as AzioneRegistro) || 'modificato',
    oggetto: (x.oggetto as OggettoRegistro) || 'applicazione',
    oggettoId: String(x.oggettoId || ''),
    oggettoNome: String(x.oggettoNome || ''),
    quando: aData(x.quando),
    dettaglio: x.dettaglio ? String(x.dettaglio) : undefined,
  };
};

/**
 * Chi sta scrivendo, come lo si chiama e che ruolo ha.
 *
 * Lo tiene in memoria chi fa entrare la persona: `annota` viene
 * chiamata da venti punti diversi del programma, e nessuno di quei
 * venti punti deve dover sapere come si recupera un profilo. Se
 * nessuno l'ha impostato, il registro scrive comunque la riga con
 * l'identificativo dell'utente: meglio una riga senza nome che
 * nessuna riga.
 */
let autore: { id: string; nome: string; ruolo: string } | null = null;

export const impostaAutoreRegistro = (
  id: string, nome: string, ruolo: string
): void => {
  autore = { id, nome: (nome || '').trim(), ruolo: ruolo || '' };
};

export const dimenticaAutoreRegistro = (): void => { autore = null; };

export interface Annotazione {
  azione: AzioneRegistro;
  oggetto: OggettoRegistro;
  oggettoId?: string;
  oggettoNome?: string;
  dettaglio?: string;
}

/**
 * Lascia una riga nel registro.
 *
 * TRE COSE DI CUI NON SI PUÒ FARE A MENO:
 *
 * 1. NON ASPETTA. Chi la chiama non mette `await`: il registro
 *    segue il lavoro, non lo precede. Una lezione salvata e non
 *    annotata è un buco in un elenco; una lezione che non si salva
 *    perché il registro era lento è un danno vero.
 *
 * 2. NON SOLLEVA MAI. Qualunque cosa vada storta finisce in console
 *    e si ferma qui. Vale la stessa ragione del punto 1.
 *
 * 3. SCRIVE IL NOME DENTRO LA RIGA. Il giorno in cui il registro
 *    serve è il giorno in cui quella persona non c'è più: andare a
 *    cercare il nome allora restituirebbe un codice.
 */
export const annota = (a: Annotazione): void => {
  const chi = autore?.id || auth.currentUser?.uid || '';
  if (!chi) return;

  void addDoc(collection(db, REGISTRO), senzaIndefiniti({
    chi,
    chiNome: autore?.nome || '',
    ruolo: autore?.ruolo || '',
    azione: a.azione,
    oggetto: a.oggetto,
    oggettoId: a.oggettoId || '',
    oggettoNome: (a.oggettoNome || '').trim(),
    quando: Timestamp.now(),
    dettaglio: (a.dettaglio || '').trim() || undefined,
  })).catch((err) => {
    console.error('Registro: riga non scritta', a.azione, a.oggetto, err);
  });
};

/**
 * Il registro, dal più recente.
 *
 * Il tetto c'è perché un registro cresce per sempre e una schermata
 * che prova a leggerlo tutto smette di aprirsi dopo qualche mese —
 * cioè esattamente quando comincia ad avere valore.
 */
export const leggiRegistro = async (quante = 300): Promise<VoceRegistro[]> => {
  const snap = await getDocs(query(
    collection(db, REGISTRO),
    orderBy('quando', 'desc'),
    fbLimit(Math.max(1, Math.min(quante, 1000)))
  ));
  return snap.docs.map(daDoc);
};
