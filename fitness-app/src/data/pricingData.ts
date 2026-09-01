// ============================================================
// LISTINO PREZZI — dati condivisi
// Usato da PricingScreen (vista owner) e dall'Assistente ESSĒRE
// (conoscenza prezzi). Un solo punto di verità.
// ============================================================

export interface PricingTier {
  id: string;
  title: string;
  amount: number;
  registrationFee: number;
  durationMonths: number;
  icon: string;
  category: 'gym' | 'premium' | 'personal' | 'postural';
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
    id: 'premium_full',
    title: 'ESSĒRE PREMIUM Full Access',
    amount: 480,
    registrationFee: 0,
    durationMonths: 12,
    icon: '⭐',
    category: 'premium',
    priceLabel: '€480/anno',
    priceNote: '€40/mese',
    highlight: 'Più Popolare',
    highlightColor: GOLD,
    courseType: 'ESSĒRE PREMIUM Full Access',
    features: [
      'Accesso full alla palestra',
      'Esame posturale incluso',
      'Prima programmazione inclusa',
      'App ESSĒRE PREMIUM',
    ],
  },
  {
    id: 'premium_biweekly',
    title: 'ESSĒRE PREMIUM Mar/Gio',
    amount: 360,
    registrationFee: 0,
    durationMonths: 12,
    icon: '📌',
    category: 'premium',
    priceLabel: '€360/anno',
    priceNote: '€30/mese',
    courseType: 'ESSĒRE PREMIUM Martedì e Giovedì',
    features: [
      'Accesso Martedì e Giovedì',
      'Esame posturale incluso',
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

// Note commerciali extra usate da Listino e Assistente
export const PRICING_NOTES = [
  'Personal training: €40 a seduta con il direttore tecnico, €35 con l\'istruttore. '
  + 'Il metodo è lo stesso e il programma resta unico, seguito dal direttore tecnico: '
  + 'cambia chi conduce la seduta.',
  'La valutazione completa Mind Movement™ (€150) comprende i test, la loro lettura '
  + 'integrata e il protocollo di lavoro scritto: è il documento che si firma insieme '
  + "prima di iniziare un percorso. Le valutazioni sono di screening e non sostituiscono "
  + 'il parere di un professionista sanitario.',
  'Quota di iscrizione palestra: €35 una tantum (solo piani Mensile/Trimestrale/Semestrale).',
  "Bonus pagamento annuale in un'unica soluzione: 1 mese in regalo + T-shirt Mind Movement Lab.",
  'Pagamento semestrale dei piani annuali tramite contratto: possibile ma senza bonus.',
  "Analisi posturale: €49 da sola (invece di €100); GRATUITA come bonus con qualsiasi abbonamento.",
];
