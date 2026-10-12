import {
  collection, addDoc, getDocs, updateDoc, doc, query, where, orderBy, Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { senzaIndefiniti } from '../domain/salvataggio';
import {
  RichiestaNutrizione, StatoRichiestaNutrizione, FasciaOraria,
} from '../domain/richiestaNutrizione';

const RICHIESTE = 'richiesteNutrizione';

const aData = (v: unknown): Date => {
  const o = v as { toDate?: () => Date } | null;
  if (o && typeof o.toDate === 'function') return o.toDate();
  return v instanceof Date ? v : new Date();
};

const daDoc = (d: { id: string; data: () => Record<string, unknown> }): RichiestaNutrizione => {
  const x = d.data();
  return {
    id: d.id,
    studentId: String(x.studentId || ''),
    allievo: String(x.allievo || ''),
    fasce: (Array.isArray(x.fasce) ? x.fasce : []) as FasciaOraria[],
    nota: String(x.nota || ''),
    stato: (x.stato as StatoRichiestaNutrizione) || 'in_attesa',
    creataIl: aData(x.creataIl),
    chiusaIl: x.chiusaIl ? aData(x.chiusaIl) : null,
    esito: x.esito ? String(x.esito) : undefined,
  };
};

/** L'allievo chiede. Il titolare decide. */
export const creaRichiestaNutrizione = async (input: {
  studentId: string;
  allievo: string;
  fasce: FasciaOraria[];
  nota: string;
}): Promise<string> => {
  const ref = await addDoc(collection(db, RICHIESTE), senzaIndefiniti({
    studentId: input.studentId,
    allievo: input.allievo,
    fasce: input.fasce,
    nota: (input.nota || '').trim(),
    stato: 'in_attesa' as StatoRichiestaNutrizione,
    creataIl: Timestamp.now(),
  }));
  return ref.id;
};

/**
 * Le richieste di questo allievo, dalla più recente.
 *
 * Senza `orderBy` sul server: ordinare qui costa niente — sono
 * pochissime righe — e un indice composito in meno è un guasto in
 * meno il giorno che qualcuno aggiunge un filtro.
 */
export const mieRichiesteNutrizione = async (
  studentId: string
): Promise<RichiestaNutrizione[]> => {
  if (!studentId) return [];
  const snap = await getDocs(
    query(collection(db, RICHIESTE), where('studentId', '==', studentId))
  );
  return snap.docs
    .map(daDoc)
    .sort((a, b) => b.creataIl.getTime() - a.creataIl.getTime());
};

/** Quelle che aspettano una risposta. Solo il titolare le legge. */
export const richiesteNutrizioneInAttesa = async (): Promise<RichiestaNutrizione[]> => {
  const snap = await getDocs(
    query(
      collection(db, RICHIESTE),
      where('stato', '==', 'in_attesa'),
      orderBy('creataIl', 'asc')
    )
  );
  return snap.docs.map(daDoc);
};

/**
 * Chiudere una richiesta.
 *
 * `esito` è il motivo, e serve soprattutto quando la risposta è no:
 * una richiesta che sparisce senza una parola è peggio di un rifiuto
 * detto.
 */
export const chiudiRichiestaNutrizione = async (
  id: string,
  stato: Extract<StatoRichiestaNutrizione, 'fissata' | 'chiusa'>,
  esito?: string
): Promise<void> => {
  await updateDoc(doc(db, RICHIESTE, id), senzaIndefiniti({
    stato,
    esito: (esito || '').trim() || undefined,
    chiusaIl: Timestamp.now(),
  }));
};
