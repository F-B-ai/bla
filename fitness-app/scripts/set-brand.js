#!/usr/bin/env node
/**
 * PROVISIONING WHITE-LABEL — imposta il brand attivo prima di una build.
 *
 *   node scripts/set-brand.js ptraining   # applica il brand del cliente
 *   node scripts/set-brand.js --restore    # ripristina ESSĒRE (default)
 *
 * Meccanica: src/config/brand.ts riesporta il brand scelto. Il file
 * originale ESSĒRE è custodito in scripts/brand.essere.backup.ts alla
 * prima esecuzione, così --restore è sempre sicuro.
 *
 * Flusso completo per un nuovo cliente (vedi WHITE-LABEL.md):
 *   1. crea src/config/brands/<cliente>.ts (nome, colori, firebase del cliente)
 *   2. node scripts/set-brand.js <cliente>
 *   3. npm run build:web  →  deploy sul sito/dominio del cliente
 *   4. node scripts/set-brand.js --restore   (per non sporcare il repo)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BRAND_TS = path.join(ROOT, 'src', 'config', 'brand.ts');
const BACKUP = path.join(__dirname, 'brand.essere.backup.ts');

const arg = process.argv[2];
if (!arg) {
  console.error('Uso: node scripts/set-brand.js <nomeBrand> | --restore');
  process.exit(1);
}

// Custodisci l'originale ESSĒRE alla prima esecuzione
if (!fs.existsSync(BACKUP)) {
  fs.copyFileSync(BRAND_TS, BACKUP);
  console.log('✓ Brand ESSĒRE originale salvato in scripts/brand.essere.backup.ts');
}

if (arg === '--restore') {
  fs.copyFileSync(BACKUP, BRAND_TS);
  console.log('✓ Ripristinato brand ESSĒRE.');
  process.exit(0);
}

const brandFile = path.join(ROOT, 'src', 'config', 'brands', `${arg}.ts`);
if (!fs.existsSync(brandFile)) {
  console.error(`Brand non trovato: src/config/brands/${arg}.ts`);
  process.exit(1);
}

// Riscrive brand.ts come semplice ri-export del brand cliente, mantenendo
// il tipo Brand esportato (theme.ts e firebase.ts continuano a leggere da qui).
const content = `// AUTO-GENERATO da scripts/set-brand.js — brand attivo: ${arg}
// Per tornare a ESSĒRE: node scripts/set-brand.js --restore
import { ${arg} } from './brands/${arg}';

export const brand = ${arg};
export type Brand = typeof brand;
`;
fs.writeFileSync(BRAND_TS, content);
console.log(`✓ Brand attivo: ${arg}. Ora: npm run build:web → deploy → --restore.`);
