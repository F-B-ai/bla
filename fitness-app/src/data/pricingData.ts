// ============================================================
// LISTINO PREZZI — dati condivisi
// Usato da PricingScreen (vista owner) e dall'Assistente ESSĒRE
// (conoscenza prezzi). Un solo punto di verità.
// ============================================================

import {
  QUOTE_GRUPPO, euroIt, incassoGruppoDi,
  PREZZO_AFFIANCAMENTO, AFFIANCAMENTO_MIN_MESE, AFFIANCAMENTO_MAX_MESE,
} from '../domain/listino';

export interface PricingTier {
  id: string;
  title: string;
  amount: number;
  registrationFee: number;
  durationMonths: number;
  icon: string;
  category: 'gym' | 'premium' | 'personal' | 'postural' | 'gruppo' | 'affiancamento';
  features: string[];
  highlight?: string;
  highlightColor?: string;
  priceLabel: string;
  priceNote?: string;
  courseType?: string;
}

const GOLD = '#C5A55A';

export const TIERS: PricingTier[] = [
  {
    id: 'gym_monthly',
    title: 'Mensile Palestra',
    amount: 60,
    registrationFee: 35,
    durationMonths: 1,
    icon: '📅',
    category: 'gym',
    priceLabel: '€60/mese',
    priceNote: '+ €35 iscrizione',
    features: ['Accesso alla palestra', 'Flessibilità mensile', 'Nessun vincolo'],
  },
  {
    id: 'gym_quarterly',
    title: 'Trimestrale Palestra',
    amount: 165,
    registrationFee: 35,
    durationMonths: 3,
    icon: '📆',
    category: 'gym',
    priceLabel: '€165',
    priceNote: '+ €35 iscrizione · €55/mese',
    features: ['Accesso alla palestra', 'Risparmio di €15 rispetto al mensile', 'Durata 3 mesi'],
  },
  {
    id: 'gym_semester',
    title: 'Semestrale Palestra',
    amount: 300,
    registrationFee: 35,
    durationMonths: 6,
    icon: '🗓️',
    category: 'gym',
    priceLabel: '€300',
    priceNote: '+ €35 iscrizione · €50/mese',
    features: ['Accesso alla palestra', 'Risparmio di €60 rispetto al mensile', 'Durata 6 mesi'],
  },
  {
    // Listino aggiornato: i 480 €/anno erano l'offerta di lancio, chiusa
    // a giugno. Restavano a listino e creavano un'inversione — il piano
    // che include di più costava meno del semestrale: chi faceva due
    // conti non aveva ragione di comprare nient'altro.
    id: 'premium_full',
    title: 'ESSĒRE PREMIUM Full Access',
    amount: 600,
    registrationFee: 0,
    durationMonths: 12,
    icon: '⭐',
    category: 'premium',
    priceLabel: '€600/anno',
    priceNote: '€50/mese · valutazione completa inclusa',
    highlight: 'Più Popolare',
    highlightColor: GOLD,
    courseType: 'ESSĒRE PREMIUM Full Access',
    features: [
      'Accesso full alla palestra',
      'Valutazione completa Mind Movement™ inclusa (valore 150 €)',
      'Prima programmazione inclusa',
      'App ESSĒRE PREMIUM',
    ],
  },
  {
    id: 'premium_biweekly',
    title: 'ESSĒRE PREMIUM Mar/Gio',
    amount: 480,
    registrationFee: 0,
    durationMonths: 12,
    icon: '📌',
    category: 'premium',
    priceLabel: '€480/anno',
    priceNote: '€40/mese · due giorni a settimana',
    courseType: 'ESSĒRE PREMIUM Martedì e Giovedì',
    features: [
      'Accesso Martedì e Giovedì',
      'Valutazione completa Mind Movement™ inclusa (valore 150 €)',
      'App ESSĒRE PREMIUM',
    ],
  },
  {
    id: 'personal_training',
    title: 'Personal Training 1-to-1',
    amount: 40,
    registrationFee: 0,
    durationMonths: 1,
    icon: '🏋️',
    category: 'personal',
    priceLabel: '€40',
    priceNote: 'a seduta, con il direttore tecnico',
    courseType: 'Personal Training 1-to-1',
    features: [
      "Scheda d'allenamento personalizzata",
      'Sessione individuale con il coach',
      'Programmazione su misura',
      'Conducibile anche dagli istruttori dello studio, col programma unico',
    ],
  },
  // ----------------------------------------------------------
  // IL PERSONAL DI GRUPPO — deciso l'8 ottobre 2026
  // ----------------------------------------------------------
  // I prezzi non sono scritti qui: vengono da domain/listino.ts, che
  // è lo stesso posto da cui li prende l'agenda. Il 12 settembre un
  // prezzo scritto due volte ha fatto dire all'assistente una cifra
  // e creare al pulsante un'altra: non si ripete.
  //
  // La quota a testa scende e l'ora rende di più: in due 40 €, in tre
  // 45, in quattro 46 — più di una seduta individuale col direttore
  // tecnico. È questo che rende il gruppo una cosa sensata e non uno
  // sconto travestito.
  ...[2, 3, 4].map((n) => ({
    id: `gruppo_${n}`,
    title: n === 2 ? 'Personal in coppia' : `Personal di gruppo — ${n} persone`,
    amount: QUOTE_GRUPPO[n],
    registrationFee: 0,
    durationMonths: 1,
    icon: n === 2 ? '👥' : '👨‍👩‍👧',
    category: 'gruppo' as const,
    priceLabel: `€${euroIt(QUOTE_GRUPPO[n])}`,
    priceNote: `a persona, a seduta · ${euroIt(incassoGruppoDi(n) as number)} € la seduta`,
    courseType: n === 2 ? 'Personal in coppia' : `Personal di gruppo ${n}`,
    features: [
      `Si allenano ${n === 2 ? 'in due' : `in ${n}`}, nello stesso orario`,
      'Programma individuale per ciascuno, non una lezione collettiva',
      `Ogni partecipante paga la sua quota: ${euroIt(QUOTE_GRUPPO[n])} € a seduta`,
      'In agenda si crea un appuntamento per ciascuno, così ognuno ha la sua storia',
    ],
  })),

  // ----------------------------------------------------------
  // L'AFFIANCAMENTO — deciso l'8 ottobre 2026
  // ----------------------------------------------------------
  // Da quattro a sei lezioni al mese. Il minimo conta più del prezzo:
  // sotto le quattro è una lezione ogni tanto, e una lezione ogni
  // tanto non cambia niente in chi la riceve.
  ...Array.from(
    { length: AFFIANCAMENTO_MAX_MESE - AFFIANCAMENTO_MIN_MESE + 1 },
    (_, i) => AFFIANCAMENTO_MIN_MESE + i
  ).map((n) => ({
    id: `affiancamento_${n}`,
    title: `Affiancamento — ${n} lezioni al mese`,
    amount: n * PREZZO_AFFIANCAMENTO,
    registrationFee: 0,
    durationMonths: 1,
    icon: '🤝',
    category: 'affiancamento' as const,
    priceLabel: `€${euroIt(n * PREZZO_AFFIANCAMENTO)}/mese`,
    priceNote: `${n} lezioni · ${PREZZO_AFFIANCAMENTO} € a lezione`,
    courseType: `Affiancamento ${n} lezioni al mese`,
    features: [
      `${n} lezioni al mese, ${PREZZO_AFFIANCAMENTO} € a lezione`,
      'Condotto da un istruttore, da un manager o dal direttore tecnico',
      'Si allena da solo e viene seguito: non è una seduta di personal',
      `Il minimo è ${AFFIANCAMENTO_MIN_MESE} lezioni al mese — sotto, non cambia niente`,
    ],
  })),

  {
    // Sostituisce l'«Analisi Posturale Singola» a €49: un esame isolato
    // senza lettura né protocollo svaluta il lavoro che lo circonda.
    // Qui si vende ciò che si consegna davvero — i test, la loro lettura
    // insieme, e un protocollo scritto e firmato.
    id: 'valutazione_mind_movement',
    title: 'Valutazione completa Mind Movement™',
    amount: 150,
    registrationFee: 0,
    durationMonths: 1,
    icon: '🧭',
    category: 'postural',
    priceLabel: '€150',
    priceNote: 'due sessioni, protocollo incluso',
    courseType: 'Valutazione Mind Movement',
    features: [
      'Valutazione posturale, del movimento, del cammino e dello squat',
      'Composizione corporea',
      'Lettura integrata: i test letti insieme, non uno per uno',
      'Protocollo di lavoro scritto, consegnato e firmato',
      'Scadenze di rivalutazione per misurare che cosa è cambiato',
    ],
  },
];

/**
 * La quota di iscrizione, letta dai piani che ce l'hanno.
 * Era scritta a mano anche nella schermata del Listino: due posti,
 * e il secondo prima o poi resta indietro. Vedi il test.
 */
export const QUOTA_ISCRIZIONE: number =
  TIERS.find((t) => t.registrationFee > 0)?.registrationFee ?? 0;

// Note commerciali extra usate da Listino e Assistente
export const PRICING_NOTES = [
  'I piani annuali PREMIUM comprendono la valutazione completa Mind Movement™ '
  + '(valore 150 €) e la prima programmazione: è questo il vantaggio dell\'anno, '
  + 'non un prezzo al mese più basso.',
  'Chi ha sottoscritto un piano prima di questo listino lo mantiene alle condizioni '
  + 'pattuite fino alla scadenza: il prezzo si scrive prima, e prima vale.',
  'Personal training: €40 a seduta con il direttore tecnico, €35 con l\'istruttore. '
  + 'Il metodo è lo stesso e il programma resta unico, seguito dal direttore tecnico: '
  + 'cambia chi conduce la seduta.',
  'La valutazione completa Mind Movement™ (€150) comprende i test, la loro lettura '
  + 'integrata e il protocollo di lavoro scritto: è il documento che si firma insieme '
  + "prima di iniziare un percorso. Le valutazioni sono di screening e non sostituiscono "
  + 'il parere di un professionista sanitario.',
  // La vecchia riga «analisi posturale €49 da sola, gratuita con
  // qualsiasi abbonamento» è stata tolta il 12 settembre 2026: quel
  // prodotto non esiste più, ed era ancora in bocca all'assistente AI,
  // che lo stava dicendo agli allievi.
  'La valutazione Mind Movement™ è compresa nei piani annuali PREMIUM. '
  + 'Con gli altri piani si acquista a parte, a €150.',
  `Personal di gruppo: in coppia €${euroIt(QUOTE_GRUPPO[2])} a persona a seduta, `
  + `in tre €${euroIt(QUOTE_GRUPPO[3])}, in quattro €${euroIt(QUOTE_GRUPPO[4])}. `
  + 'Ognuno ha il suo programma e paga la sua quota: non è una lezione collettiva, '
  + 'è personal condotto in contemporanea. Per gruppi di cinque la quota la stabilisce '
  + 'il direttore tecnico caso per caso.',
  `Affiancamento: da ${AFFIANCAMENTO_MIN_MESE} a ${AFFIANCAMENTO_MAX_MESE} lezioni al `
  + `mese, €${PREZZO_AFFIANCAMENTO} a lezione (${AFFIANCAMENTO_MIN_MESE} lezioni = `
  + `€${euroIt(AFFIANCAMENTO_MIN_MESE * PREZZO_AFFIANCAMENTO)} al mese). Lo conduce un `
  + 'istruttore, un manager o il direttore tecnico, e il prezzo non cambia con chi lo '
  + `conduce. Sotto le ${AFFIANCAMENTO_MIN_MESE} lezioni al mese non si attiva.`,
  'Quota di iscrizione palestra: €35 una tantum (solo piani Mensile/Trimestrale/Semestrale).',
  "Bonus pagamento annuale in un'unica soluzione: 1 mese in regalo + T-shirt Mind Movement Lab.",
  'Pagamento semestrale dei piani annuali tramite contratto: possibile ma senza bonus.',
];
