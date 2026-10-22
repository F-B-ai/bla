// ============================================================
// BRAND CONFIGURATION — WHITE LABEL
// ------------------------------------------------------------
// Questo è l'UNICO file da modificare per rivendere l'app a
// un'altra palestra: nome, tagline, colori, codice check-in e
// progetto Firebase del cliente. Tutto il resto dell'app legge
// da qui.
// ============================================================

export const brand = {
  // --- Identità ---
  appName: 'ESSĒRE',
  tagline: 'MIND MOVEMENT LAB',
  academyName: 'FB Mind Movement Academy',

  // --- Colori principali (il tema li importa da qui) ---
  colors: {
    primary: '#0A0A0A',
    primaryLight: '#161616',
    accent: '#D40000',
    accentLight: '#E63333',
    accentDark: '#990000',
  },

  // --- Check-in in palestra ---
  checkinQRCode: 'ESSERE_ACCESS_2024',
  checkinManualCode: 'MMLAB',

  // --- Progetto Firebase del cliente ---
  firebase: {
    apiKey: 'AIzaSyDAuKlToc-_GRILEcMzwoD4ysuBYRtPzxE',
    authDomain: 'essere-3fe6f.firebaseapp.com',
    projectId: 'essere-3fe6f',
    storageBucket: 'essere-3fe6f.firebasestorage.app',
    messagingSenderId: '9504654070',
    appId: '1:9504654070:web:7b8c7d09645b113b0ea2d7',
    measurementId: 'G-QLVE494VJR',
  },

  // --- La chiave per le notifiche che arrivano a telefono chiuso ---
  // È la chiave PUBBLICA dei certificati push web (VAPID), generata
  // dalla console Firebase il 22 ottobre 2026. È pubblica per
  // costruzione: viaggia dentro il programma che gira sul telefono di
  // chiunque apra l'app, esattamente come apiKey qui sopra. La metà
  // segreta resta su Firebase e non esce di lì.
  //
  // Senza questa, il telefono non si iscrive e il server non sa dove
  // bussare: la notifica non arriva e nessuno se ne accorge.
  vapidKey: 'BFRwVMrLKhEpO2Zixak3JarDTOsgbcxqsmWksX9QJ4VC-Bni7sDIUPt3EDKJ0RtcYGFnmpZQF441zDvt0gkE89A',

  // --- URL pubblico dell'istanza (per QR, condivisioni, ecc.) ---
  appUrl: 'https://essere-3fe6f.web.app',

  // --- Licenza white-label ---
  // Identifica l'istanza; la licenza è controllata dal documento
  // Firestore `config/license` (gestito dal fornitore dell'app).
  licenseId: 'essere-mml-001',
};

export type { Brand } from './brandType';
