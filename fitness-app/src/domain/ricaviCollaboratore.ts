// ============================================================
// QUANTO HA PORTATO DAVVERO — e la cifra che l'app inventava
// ------------------------------------------------------------
// 30 ottobre 2026. Il titolare, due parole: «Giuseppe nn segna
// nulla adesso basta».
//
// Sono andato a vedere perché non se n'era accorto prima, e la
// risposta era scritta in cinque punti del programma:
//
//     coachIncome > 0 ? coachIncome : collab.assignedStudents.length * 150
//
// Quando un collaboratore non aveva registrato NIENTE, i grafici non
// mostravano zero. Mostravano «allievi assegnati × 150 €» — un
// numero inventato, con la stessa barra e lo stesso colore di quelli
// veri. Chi non segnava niente appariva esattamente come chi
// lavorava, e più allievi gli assegnavi più sembrava rendere.
//
// Non era un errore di calcolo. Era una cifra plausibile messa al
// posto di un dato mancante — che è il modo più efficace di
// nascondere un dato mancante. Lo stesso numero finiva anche nel
// cruscotto del manager: nemmeno chi doveva controllarlo poteva
// vederlo.
//
// Qui dentro non c'è nessuna stima. C'è quello che è stato
// registrato, e la distinzione fra «zero euro» e «nessun
// movimento»: sono due fatti diversi e vanno detti con due parole
// diverse.
// ============================================================

export interface MovimentoRicavo {
  type: string;
  amount: number;
  collaboratorId?: string;
}

export interface Ricavo {
  /** la somma dei movimenti registrati, e nient'altro */
  importo: number;
  /** quanti movimenti ci sono: zero è un'informazione, non un vuoto */
  movimenti: number;
}

export const ricavoRegistrato = (
  transazioni: MovimentoRicavo[],
  collaboratorId: string
): Ricavo => {
  const sue = (transazioni || []).filter(
    (t) => t && t.type === 'income' && t.collaboratorId === collaboratorId
  );
  return {
    importo: sue.reduce((s, t) => s + (Number(t.amount) || 0), 0),
    movimenti: sue.length,
  };
};

/**
 * Come si scrive un ricavo sotto una barra.
 *
 * «Nessun movimento» e «0 €» non sono la stessa cosa: il primo dice
 * che non è stato registrato niente, il secondo che è stato
 * registrato e vale zero. Confonderli è esattamente l'errore che
 * questo file esiste per non ripetere.
 */
export const etichettaRicavo = (r: Ricavo): string => {
  if (r.movimenti === 0) return 'nessun movimento';
  return `${Math.round(r.importo)} €`;
};

// ------------------------------------------------------------
// 31 ottobre 2026, 01:15 — DA DOVE SI CONTANO GLI ALLIEVI
// ------------------------------------------------------------
// Prima qui si leggeva `assignedStudents`, l'elenco scritto sulla
// scheda del collaboratore. È la copia, non l'originale:
// l'assegnazione vera sta sulla scheda dell'allievo
// (`assignedCollaboratorIds`), ed è quella che tutto il resto
// dell'applicazione guarda. Fino a ieri quella copia la poteva
// riscrivere chiunque fosse autenticato.
//
// Conseguenza: un collaboratore con la copia vuota e allievi veri
// assegnati NON compariva fra chi non registra niente. Un'assenza
// che si legge come un'assoluzione, ed è solo un campo stantio.
//
// Adesso il numero lo passa chi chiama, contandolo dagli allievi
// veri con lo stesso criterio del resto dell'app.
// ------------------------------------------------------------
export interface PersonaConRicavo {
  id: string;
  name?: string;
  surname?: string;
  /** quanti allievi ha davvero: contato dalle schede degli allievi */
  allievi: number;
}

export interface RigaRicavo {
  id: string;
  nome: string;
  ricavo: Ricavo;
  allievi: number;
}

export const ricaviPerPersona = (
  persone: PersonaConRicavo[],
  transazioni: MovimentoRicavo[]
): RigaRicavo[] => (persone || []).map((p) => ({
  id: p.id,
  nome: `${p.name || ''} ${p.surname ? `${p.surname.charAt(0)}.` : ''}`.trim(),
  ricavo: ricavoRegistrato(transazioni, p.id),
  allievi: p.allievi,
}));

/**
 * CHI HA ALLIEVI E NON REGISTRA NIENTE.
 *
 * È la domanda che il titolare ha fatto, ridotta a una funzione.
 * Non dice che quella persona non lavora: dice che nell'applicazione
 * non risulta. Sono due affermazioni diverse, e la seconda è l'unica
 * che questi dati possono sostenere.
 *
 * Chi non ha allievi assegnati resta fuori: un collaboratore senza
 * allievi che non registra niente non sta facendo niente di strano.
 */
export const chiNonRegistra = (
  persone: PersonaConRicavo[],
  transazioni: MovimentoRicavo[]
): RigaRicavo[] => ricaviPerPersona(persone, transazioni)
  .filter((r) => r.allievi > 0 && r.ricavo.movimenti === 0)
  .sort((a, b) => b.allievi - a.allievi);

/**
 * La somma di una squadra: somma di ricavi registrati, senza
 * tappare i buchi. Se tre collaboratori su cinque non hanno
 * registrato niente, il totale deve risultare più basso — è
 * l'informazione, non il difetto.
 */
export const ricavoSquadra = (
  persone: PersonaConRicavo[],
  transazioni: MovimentoRicavo[]
): Ricavo => ricaviPerPersona(persone, transazioni).reduce(
  (acc, r) => ({
    importo: acc.importo + r.ricavo.importo,
    movimenti: acc.movimenti + r.ricavo.movimenti,
  }),
  { importo: 0, movimenti: 0 }
);
