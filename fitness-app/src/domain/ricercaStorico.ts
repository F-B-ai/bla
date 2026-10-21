// ============================================================
// CERCARE UNA PERSONA, E VEDERE TUTTO QUELLO CHE HA FATTO
// ------------------------------------------------------------
// Il titolare, il 21 ottobre 2026:
//
//   «Inseriscimi una funzione di ricerca per allievo ed anche per
//    consulenze in base a un determinato nome, dove mi mostra tutte
//    le consulenze e tutte le lezioni effettuate e non effettuate di
//    quel determinato allievo o del nome inserito in quella
//    consulenza.»
//
// Due metà, e la seconda è quella che mancava davvero.
//
// La ricerca c'era già, ma cercava SOLO fra gli allievi in
// anagrafica. Una consulenza fissata a chi allievo non è ancora —
// cioè quasi tutte le prime volte, cioè le persone che si stanno
// decidendo — è intestata a un nome scritto a mano, e quel nome non
// esisteva per la ricerca. Chi chiamava due settimane dopo per
// chiedere «quando ero venuto?» non si poteva ritrovare.
//
// ------------------------------------------------------------
// E POI: «NON EFFETTUATE» NON È UNA COSA SOLA
// ------------------------------------------------------------
// Un appuntamento che non si è svolto può essere tre cose diverse,
// e confonderle è il motivo per cui certi conti non tornavano:
//
//   · è in programma — è nel futuro, va bene così;
//   · è stato disdetto — qualcuno l'ha detto, e c'è scritto;
//   · è passato ed è rimasto «in programma» — nessuno l'ha toccato.
//
// L'ultima non è un appuntamento futuro e non è una disdetta: è una
// seduta che forse si è svolta e che nessuno ha segnato, oppure che
// non si è svolta e nessuno l'ha detto. In tutti e due i casi è un
// buco nel registro, e va mostrata per quello che è invece di
// sparire dentro un totale.
// ============================================================

export const RICERCA_STORICO_VERSION = 1;

/** Quanti nomi si propongono mentre si scrive. Oltre non si legge. */
export const MAX_SUGGERIMENTI = 8;

// ------------------------------------------------------------
// Confrontare due nomi scritti da persone diverse
// ------------------------------------------------------------

/**
 * Un nome, ridotto a come si confronta.
 *
 * Accenti tolti e tutto minuscolo: chi cerca scrive «perrone», chi ha
 * registrato aveva scritto «Perrone». Senza questo, due grafie dello
 * stesso nome sono due persone diverse — ed è il modo più silenzioso
 * di non trovare qualcuno che c'è.
 */
export const normalizza = (testo: string): string =>
  (testo || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

/**
 * Il nome corrisponde a quello che si sta cercando?
 *
 * Si cerca per PAROLE, e in qualunque ordine: «rossetti tony» trova
 * «Tony Rossetti». Cercare la stringa intera vorrebbe dire ricordarsi
 * se quella volta si era scritto prima il nome o prima il cognome —
 * e chi cerca non se lo ricorda mai.
 */
export const corrisponde = (nome: string, cerca: string): boolean => {
  const q = normalizza(cerca);
  if (!q) return false;
  const n = normalizza(nome);
  if (!n) return false;
  return q.split(' ').every((parola) => n.includes(parola));
};

// ------------------------------------------------------------
// Lo stato di una voce
// ------------------------------------------------------------

export type StatoVoce = 'svolta' | 'in_programma' | 'disdetta' | 'mai_segnata';

export interface VoceStorico {
  /** 'YYYY-MM-DD' */
  dateStr: string;
  status: string;
  isCountedAsCompleted?: boolean;
}

/**
 * Che fine ha fatto questo appuntamento.
 *
 * L'ordine dei controlli non è casuale: una disdetta resta una
 * disdetta anche se è passata, e una seduta segnata come svolta resta
 * svolta anche se la data è nel futuro — succede quando si registra
 * in anticipo, e non è un errore da correggere qui.
 */
export const statoVoce = (v: VoceStorico, oggiStr: string): StatoVoce => {
  const stato = (v?.status || '').toString();
  if (stato.startsWith('cancelled')) return 'disdetta';
  if (v?.isCountedAsCompleted || stato === 'completed') return 'svolta';
  if ((v?.dateStr || '') < oggiStr) return 'mai_segnata';
  return 'in_programma';
};

export const ETICHETTA_STATO: Record<StatoVoce, string> = {
  svolta: 'Svolta',
  in_programma: 'In programma',
  disdetta: 'Disdetta',
  mai_segnata: 'Passata, mai segnata',
};

export interface RiepilogoStorico {
  totale: number;
  svolte: number;
  inProgramma: number;
  disdette: number;
  maiSegnate: number;
}

export const riepilogoStorico = (
  voci: VoceStorico[],
  oggiStr: string
): RiepilogoStorico => {
  const r: RiepilogoStorico = {
    totale: 0, svolte: 0, inProgramma: 0, disdette: 0, maiSegnate: 0,
  };
  (voci || []).forEach((v) => {
    r.totale += 1;
    const s = statoVoce(v, oggiStr);
    if (s === 'svolta') r.svolte += 1;
    else if (s === 'in_programma') r.inProgramma += 1;
    else if (s === 'disdetta') r.disdette += 1;
    else r.maiSegnate += 1;
  });
  return r;
};

/**
 * La riga che si legge sopra l'elenco.
 *
 * Le «mai segnate» si nominano solo quando ce ne sono: scrivere
 * «0 mai segnate» a chi ha il registro in ordine è un allarme che
 * suona a vuoto, e un allarme che suona a vuoto smette di essere
 * ascoltato anche quando ha ragione.
 */
export const descriviRiepilogo = (r: RiepilogoStorico): string => {
  if (!r || r.totale === 0) return 'Nessun appuntamento trovato.';
  const parti = [`${r.totale} in tutto`, `${r.svolte} svolte`];
  if (r.inProgramma > 0) parti.push(`${r.inProgramma} in programma`);
  if (r.disdette > 0) parti.push(`${r.disdette} disdette`);
  if (r.maiSegnate > 0) {
    parti.push(`${r.maiSegnate} passate e mai segnate`);
  }
  return `${parti.join(' · ')}.`;
};

// ------------------------------------------------------------
// Chi si trova, cercando
// ------------------------------------------------------------

export interface Trovato {
  /** id dell'allievo, oppure il nome stesso se è un ospite */
  chiave: string;
  nome: string;
  /** l'ospite non è in anagrafica: si riconosce, e si dice */
  ospite: boolean;
}

/**
 * I nomi che corrispondono, allievi e ospiti insieme.
 *
 * Gli ospiti si raggruppano per nome: la stessa persona può avere tre
 * consulenze e comparirebbe tre volte in un elenco di otto righe,
 * nascondendo gli altri. E se un nome è già in anagrafica, l'allievo
 * vince: è la scheda vera, con tutta la sua storia dietro.
 */
export const trovaPersone = (
  allievi: { id: string; nome: string }[],
  ospiti: { persona: string }[],
  cerca: string,
  massimo: number = MAX_SUGGERIMENTI
): Trovato[] => {
  const q = normalizza(cerca);
  if (!q) return [];

  const fuori: Trovato[] = [];
  const presi = new Set<string>();

  (allievi || []).forEach((a) => {
    if (!corrisponde(a.nome, q)) return;
    presi.add(normalizza(a.nome));
    fuori.push({ chiave: a.id, nome: a.nome, ospite: false });
  });

  (ospiti || []).forEach((o) => {
    const nome = (o?.persona || '').trim();
    const n = normalizza(nome);
    if (!n || presi.has(n) || !corrisponde(nome, q)) return;
    presi.add(n);
    fuori.push({ chiave: nome, nome, ospite: true });
  });

  return fuori.slice(0, massimo);
};
