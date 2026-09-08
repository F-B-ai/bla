// ============================================================
// Tipo canonico del brand white-label (fonte unica di verità).
// I file dei singoli clienti (config/brands/*.ts) si annotano con
// questo tipo; theme.ts e firebase.ts leggono l'istanza da brand.ts.
// ============================================================

export interface Brand {
  appName: string;
  tagline: string;
  academyName: string;
  colors: {
    primary: string;
    primaryLight: string;
    accent: string;
    accentLight: string;
    accentDark: string;
  };
  checkinQRCode: string;
  checkinManualCode: string;
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
  };
  appUrl: string;
  licenseId: string;
}
