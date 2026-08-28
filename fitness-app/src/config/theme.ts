// ============================================================
// THEME CONFIGURATION (white-label)
// I colori del brand arrivano da src/config/brand.ts
// ============================================================
import { brand } from './brand';

export const colors = {
  // --- Brand (da brand.ts) ---
  primary: brand.colors.primary,
  primaryLight: brand.colors.primaryLight,
  accent: brand.colors.accent,
  accentLight: brand.colors.accentLight,
  accentDark: brand.colors.accentDark,

  // --- Status ---
  success: '#34C759',
  warning: '#FF9F0A',
  error: '#FF453A',
  info: '#64D2FF',

  // --- Superfici (Dark Mode) ---
  background: '#0A0A0A',
  surface: '#161616',
  surfaceLight: '#1F1F1F',
  border: '#2C2C2E',
  divider: '#1C1C1E',

  // --- Testo ---
  text: '#F2F2F7',
  textSecondary: '#8E8E93',
  textLight: '#636366',
  textOnPrimary: '#F2F2F7',
  textOnAccent: '#FFFFFF',

  // --- Carta: i documenti che si stampano ---
  // Un patto stampato è nero su bianco, sempre: non segue il tema
  // dell'app. Vivono qui perché il cancello della palette li veda.
  cartaInchiostro: '#111111',
  cartaTesto: '#333333',
  cartaGrigio: '#555555',
  cartaGrigioChiaro: '#666666',
  cartaLinea: '#999999',
  cartaLineaTenue: '#CCCCCC',
  cartaFondo: '#F4F4F2',

  // --- Il Twin: contratto visivo del gemello ---
  // La seta cremisi e la scintilla d'oro. Non sono decorazione:
  // sono il segno di ESSĒRE. Vivono qui perché siano UNA sola
  // verità, e perché il cancello della palette li protegga.
  twinSeta1: '#FF1A1A',
  twinSeta2: '#D40000',
  twinSeta3: '#8B0000',
  twinOroNucleo: '#FFFCF5',
  twinOroMezzo: '#FFDC96',
  twinOroBordo: '#C9943A',
  twinAvorio: '#F2F2F7',

  // --- Neutri e overlay (M2: centralizzati per il white-label) ---
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
  overlayDark: 'rgba(0,0,0,0.7)',
  glass: 'rgba(255,255,255,0.12)',

  // --- Badge ruoli ---
  ownerBadge: '#D40000',
  managerBadge: '#AF52DE',
  collaboratorBadge: '#32D4DE',
  studentBadge: '#FF9F0A',
};

export const spacing = {
  xs: 3,
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 999,
};

export const fontSize = {
  xs: 10,
  sm: 11,
  md: 13,
  lg: 14,
  xl: 16,
  xxl: 19,
  title: 21,
  hero: 26,
};

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
};
