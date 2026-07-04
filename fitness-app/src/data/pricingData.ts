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
    amount: 35,
    registrationFee: 0,
    durationMonths: 1,
    icon: '🏋️',
    category: 'personal',
    priceLabel: '€35',
    priceNote: 'a seduta',
    courseType: 'Personal Training 1-to-1',
    features: [
      "Scheda d'allenamento personalizzata",
      'Sessione individuale con il coach',
      'Programmazione su misura',
    ],
  },
  {
    id: 'postural_standalone',
    title: 'Analisi Posturale Singola',
    amount: 49,
    registrationFee: 0,
    durationMonths: 1,
    icon: '🧍',
    category: 'postural',
    priceLabel: '€49',
    priceNote: 'invece di €100',
    courseType: 'Analisi Posturale',
    features: ['Esame posturale completo', 'Senza programmazione'],
  },
];

// Note commerciali extra usate da Listino e Assistente
export const PRICING_NOTES = [
  'Quota di iscrizione palestra: €35 una tantum (solo piani Mensile/Trimestrale/Semestrale).',
  "Bonus pagamento annuale in un'unica soluzione: 1 mese in regalo + T-shirt Mind Movement Lab.",
  'Pagamento semestrale dei piani annuali tramite contratto: possibile ma senza bonus.',
  "Analisi posturale: €49 da sola (invece di €100); GRATUITA come bonus con qualsiasi abbonamento.",
];
