import {
  collection, addDoc, getDocs, updateDoc, doc, query, where, Timestamp,
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
    orarioProposto: x.orarioProposto ? String(x.orarioProposto) : undefined,
    propostoDa: x.propostoDa ? String(x.propostoDa) : undefined,
    propostoIl: x.propostoIl ? aData(x.propostoIl) : null,
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

/**
 * Quelle ancora da chiudere: chi non ha ancora un orario e chi ne ha
 * uno proposto e aspetta la conferma.
 *
 * Le legge il titolare, e le legge il nutrizionista — che senza
 * vederle non potrebbe proporre niente. L'ordinamento è qui e non sul
 * server: con due stati da filtrare un `orderBy` chiederebbe un
 * indice composito, e sono una manciata di righe.
 */
export const richiesteNutrizioneDaEvadere = async (): Promise<RichiestaNutrizione[]> => {
  const snap = await getDocs(
    query(collection(db, RICHIESTE), where('stato', 'in', ['in_attesa', 'proposta']))
  );
  return snap.docs
    .map(daDoc)
    .sort((a, b) => a.creataIl.getTime() - b.creataIl.getTime());
};

/** Il vecchio nome, perché la schermata lo chiama ancora così. */
export const richiesteNutrizioneInAttesa = richiesteNutrizioneDaEvadere;

/**
 * Il nutrizionista propone un orario.
 *
 * Non fissa la visita: la mette in attesa di conferma. La differenza
 * conta — l'allievo legge «ti aspetta martedì alle 18:30, manca la
 * conferma», e non si presenta a un appuntamento che nessuno ha
 * ancora messo in agenda.
 */
export const proponiOrarioNutrizione = async (
  id: string,
  orario: string,
  propostoDa: string
): Promise<void> => {
  await updateDoc(doc(db, RICHIESTE, id), senzaIndefiniti({
    stato: 'proposta' as StatoRichiestaNutrizione,
    orarioProposto: orario.trim(),
    propostoDa: (propostoDa || '').trim() || undefined,
    propostoIl: Timestamp.now(),
  }));
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
