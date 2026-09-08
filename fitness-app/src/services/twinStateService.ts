// ============================================================
// TWIN STATE — l'allievo legge il PROPRIO gemello
// ------------------------------------------------------------
// Fino a qui il Twin era un registro a senso unico: 11 servizi
// ci scrivevano dentro, e a leggerlo erano solo il Brain e la
// sintesi Mind Movement — entrambi al servizio dello STAFF.
// L'allievo non ha mai avuto modo di vedere sé stesso.
//
// Le regole Firestore lo permettevano già da M3
// (`twins/{personId}` leggibile da personId == myPersonId()):
// mancava il lato client. È questo.
// ============================================================

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getPersonId } from './twinEventService';
import { TwinState } from '../domain/oggi';

/**
 * Stato derivato del gemello per l'utente corrente.
 * Ritorna null se il gemello non è ancora stato calcolato
 * (persona nuova, o motore notturno non ancora passato):
 * è un caso NORMALE, non un errore — "Oggi" sa gestirlo.
 */
export const getMyTwinState = async (uid: string): Promise<TwinState | null> => {
  try {
    const personId = await getPersonId(uid);
    const snap = await getDoc(doc(db, 'twins', personId));
    if (!snap.exists()) return null;
    const d = snap.data() as Record<string, unknown>;
    return {
      readiness: (d.readiness as TwinState['readiness']) || undefined,
      load: (d.load as TwinState['load']) || undefined,
      adherence: (d.adherence as TwinState['adherence']) || undefined,
    };
  } catch {
    // offline o permessi: il gemello tace, la schermata regge lo stesso
    return null;
  }
};
