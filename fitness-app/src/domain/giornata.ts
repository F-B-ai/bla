// ============================================================
// LA GIORNATA — una lista sola, in ordine di orario
// ------------------------------------------------------------
// Il titolare, il 9 settembre 2026:
//
//   «Altrimenti, al colpo d'occhio, non riesco mai ad avere la
//    visione della giornata.»
//
// E aveva ragione: la giornata era spezzata in blocchi. Gli
// appuntamenti in una sezione, gli ospiti appiccicati in coda a
// quella sezione invece che al loro orario, i task in una sezione
// tutta loro più in basso. Per sapere che cosa succede alle 15:00
// bisognava guardare in tre posti e ricomporre a mente.
//
// Qui la giornata diventa quello che è davvero: **una sequenza**.
// Un allenamento delle 10, una consulenza delle 11, un task delle
// 11:30, un ospite delle 15 — in fila, come li vivi.
//
// Le tre viste (Agenda, La Mia Giornata, Calendario) chiamano tutte
// questa funzione. Se domani cambia l'ordine, cambia in un posto
// solo e cambia in tutte e tre — che è esattamente ciò che non è
// successo con i tipi di appuntamento, e che è costato una giornata.
// ============================================================

import { TipoAppuntamento, aspetto } from './appuntamento';

export const GIORNATA_VERSION = 1;

export type GenereVoce = 'appuntamento' | 'ospite' | 'task';

export interface VoceGiornata {
  id: string;
  genere: GenereVoce;
  /** 'HH:MM', oppure '' per i task senza orario */
  ora: string;
  /** 'HH:MM' di fine, se l'impegno ha una durata dichiarata */
  oraFine: string;
  titolo: string;
  sottotitolo: string;
  /** solo per gli appuntamenti e gli ospiti */
  tipo?: TipoAppuntamento;
  /** solo per i task */
  completato?: boolean;
  /** il dato di partenza, per aprirlo al tocco */
  fonte: unknown;
}

// ------------------------------------------------------------
// L'ordine
// ------------------------------------------------------------
//
// Chi ha un orario viene prima, in ordine di orologio. Chi non ce
// l'ha — un task «da fare oggi, quando capita» — va in fondo: non
// compete con le cose che hanno un'ora, e messo in cima le
// nasconderebbe.
//
// A parità di orario, prima l'impegno con una persona davanti:
// appuntamento, poi ospite, poi task. Alle 11:00 con una seduta e
// un promemoria, la seduta è quella che non si sposta.

const PESO: Record<GenereVoce, number> = {
  appuntamento: 0,
  ospite: 1,
  task: 2,
};

const oraValida = (o?: string | null): string => {
  const s = (o || '').trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? s : '';
};

/**
 * Ordina le voci come si vive una giornata.
 * Stabile: a parità di tutto, resta l'ordine di partenza.
 */
export const ordinaGiornata = (voci: VoceGiornata[]): VoceGiornata[] =>
  (voci || [])
    .map((v, i) => ({ v, i }))
    .sort((a, b) => {
      const oa = a.v.ora;
      const ob = b.v.ora;
      // senza orario in fondo, sempre
      if (!oa && ob) return 1;
      if (oa && !ob) return -1;
      if (oa && ob && oa !== ob) return oa.localeCompare(ob);
      const p = PESO[a.v.genere] - PESO[b.v.genere];
      if (p !== 0) return p;
      return a.i - b.i;
    })
    .map(({ v }) => v);

// ------------------------------------------------------------
// Da che cosa nasce una voce
// ------------------------------------------------------------

export interface AppuntamentoGiornata {
  id: string;
  kind: TipoAppuntamento;
  startTime?: string;
  endTime?: string;
  status?: string;
  nomeAllievo: string;
  note?: string;
}

export interface OspiteGiornata {
  id: string;
  persona: string;
  ora?: string;
  tipo?: string;
  telefono?: string;
  note?: string;
}

export interface TaskGiornata {
  id: string;
  title: string;
  description?: string;
  startTime?: string;
  isCompleted?: boolean;
  priority?: string;
}

const orario = (inizio: string, fine?: string): string =>
  fine ? `${inizio}–${fine}` : inizio;

/**
 * Mette insieme la giornata: appuntamenti, ospiti e task in una
 * sequenza sola. Ogni elenco può essere vuoto o assente.
 */
export const componiGiornata = (input: {
  appuntamenti?: AppuntamentoGiornata[];
  ospiti?: OspiteGiornata[];
  task?: TaskGiornata[];
}): VoceGiornata[] => {
  const voci: VoceGiornata[] = [];

  (input.appuntamenti || []).forEach((a) => {
    const ora = oraValida(a.startTime);
    voci.push({
      id: a.id,
      genere: 'appuntamento',
      ora,
      oraFine: oraValida(a.endTime),
      titolo: a.nomeAllievo,
      sottotitolo: [
        aspetto(a.kind).etichetta,
        ora ? orario(ora, oraValida(a.endTime) || undefined) : '',
        (a.note || '').trim(),
      ].filter(Boolean).join(' · '),
      tipo: a.kind,
      fonte: a,
    });
  });

  (input.ospiti || []).forEach((o) => {
    const ora = oraValida(o.ora);
    voci.push({
      id: o.id,
      genere: 'ospite',
      ora,
      oraFine: '',
      titolo: o.persona,
      sottotitolo: [
        'Ospite',
        (o.tipo || '').trim(),
        ora,
        (o.telefono || '').trim(),
      ].filter(Boolean).join(' · '),
      // Un ospite è quasi sempre una consulenza: è da lì che nasce.
      tipo: (o.tipo === 'allenamento' ? 'training' : 'consulenza'),
      fonte: o,
    });
  });

  (input.task || []).forEach((t) => {
    const ora = oraValida(t.startTime);
    voci.push({
      id: t.id,
      genere: 'task',
      ora,
      oraFine: '',
      titolo: t.title,
      sottotitolo: [
        ora || 'quando capita',
        (t.description || '').trim(),
      ].filter(Boolean).join(' · '),
      completato: !!t.isCompleted,
      fonte: t,
    });
  });

  return ordinaGiornata(voci);
};

// ------------------------------------------------------------
// Che cosa dice la giornata, in una riga
// ------------------------------------------------------------

export interface RiepilogoGiornata {
  totale: number;
  appuntamenti: number;
  ospiti: number;
  taskAperti: number;
  taskFatti: number;
  /** la prima cosa che ha un orario, se c'è */
  prossima?: VoceGiornata;
  /** frase pronta per l'intestazione */
  frase: string;
}

const plurale = (n: number, uno: string, molti: string): string =>
  `${n} ${n === 1 ? uno : molti}`;

export const riepilogoGiornata = (voci: VoceGiornata[]): RiepilogoGiornata => {
  const v = voci || [];
  const appuntamenti = v.filter((x) => x.genere === 'appuntamento').length;
  const ospiti = v.filter((x) => x.genere === 'ospite').length;
  const task = v.filter((x) => x.genere === 'task');
  const taskAperti = task.filter((x) => !x.completato).length;
  const taskFatti = task.length - taskAperti;
  const prossima = v.find((x) => !!x.ora);

  const pezzi: string[] = [];
  const conPersone = appuntamenti + ospiti;
  if (conPersone > 0) pezzi.push(plurale(conPersone, 'appuntamento', 'appuntamenti'));
  if (taskAperti > 0) pezzi.push(plurale(taskAperti, 'task', 'task'));

  return {
    totale: v.length,
    appuntamenti,
    ospiti,
    taskAperti,
    taskFatti,
    prossima,
    frase: pezzi.length === 0 ? 'Giornata libera' : pezzi.join(' · '),
  };
};
