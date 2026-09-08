// ============================================================
// BRAND — PTraining (DEMO white-label)
// ------------------------------------------------------------
// Esempio di configurazione per un cliente white-label: stesso
// prodotto ESSĒRE, identità blu e nome PTraining. Usato dallo
// script di provisioning (scripts/set-brand.js) per generare la
// build demo. NB: il firebase config va sostituito con quello del
// progetto del cliente al momento dell'attivazione reale.
// ============================================================

import type { Brand } from '../brandType';

export const ptraining: Brand = {
  // --- Identità ---
  appName: 'PTraining',
  tagline: 'PERSONAL TRAINING STUDIO',
  academyName: 'PTraining Academy',

  // --- Colori: identità BLU (staccata dal rosso ESSĒRE) ---
  colors: {
    primary: '#0A0E14',
    primaryLight: '#141A24',
    accent: '#1A6FD4',
    accentLight: '#4A90E4',
    accentDark: '#0F4C99',
  },

  // --- Check-in in palestra ---
  checkinQRCode: 'PTRAINING_ACCESS_2026',
  checkinManualCode: 'PTRAIN',

  // --- Progetto Firebase del cliente ---
  // DEMO: progetto Firebase DEDICATO (ptraining-demo) — dati isolati
  // dai membri reali di ESSĒRE. Config esatta letta dalla management
  // API (projects/ptraining-demo/webApps/-/config).
  firebase: {
    apiKey: 'AIzaSyBmx4tMMtUv89_Spl1YJreyOOKaaDgSQUk',
    authDomain: 'ptraining-demo.firebaseapp.com',
    projectId: 'ptraining-demo',
    storageBucket: 'ptraining-demo.firebasestorage.app',
    messagingSenderId: '173206159256',
    appId: '1:173206159256:web:c462d38fce2480c75235ed',
  },

  appUrl: 'https://ptraining-demo.web.app',
  licenseId: 'ptraining-demo-001',
};
