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
  // DEMO: punta all'istanza attuale solo per il "vestito". Alla
  // firma del cliente reale va creato un progetto Firebase dedicato
  // e incollato qui (isolamento totale dei dati — vedi WHITE-LABEL.md).
  firebase: {
    apiKey: 'AIzaSyDAuKlToc-_GRILEcMzwoD4ysuBYRtPzxE',
    authDomain: 'essere-3fe6f.firebaseapp.com',
    projectId: 'essere-3fe6f',
    storageBucket: 'essere-3fe6f.firebasestorage.app',
    messagingSenderId: '9504654070',
    appId: '1:9504654070:web:7b8c7d09645b113b0ea2d7',
    measurementId: 'G-QLVE494VJR',
  },

  appUrl: 'https://ptraining-demo.web.app',
  licenseId: 'ptraining-demo-001',
};
