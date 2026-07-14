#!/usr/bin/env node
/**
 * GUARDIANO PALETTE (M2, doc 04) — vieta la CRESCITA dei colori
 * hardcoded fuori da src/config/theme.ts e src/config/brand.ts.
 *
 * Uso:
 *   node scripts/check-colors.js            # controllo (CI)
 *   node scripts/check-colors.js --update   # riscrive la baseline (solo in diminuzione!)
 *
 * Regole:
 *  - un file NUOVO con colori hardcoded → errore
 *  - un file esistente che AUMENTA i suoi colori → errore
 *  - diminuzioni → ok (e suggerisce di aggiornare la baseline)
 *
 * Eccezioni (WHITELIST): file che generano HTML standalone per
 * stampa/report, dove i colori inline sono il mezzo, non un debito.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const BASELINE_PATH = path.join(__dirname, 'color-baseline.json');
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;

const WHITELIST = new Set([
  'src/config/theme.ts',   // la palette: qui i colori DEVONO stare
  'src/config/brand.ts',   // config white-label per cliente
  'src/utils/printUtils.ts',     // template HTML stampa
  'src/services/reportService.ts', // template HTML report
  'src/components/common/EnsōLogo.tsx', // asset di brand (SVG): i colori sono il disegno
]);

// Cartelle whitelisted: i brand dei clienti white-label sono config,
// i loro colori sono l'identità del cliente, non debito.
const WHITELIST_DIRS = ['src/config/brands/'];

const walk = (dir) => {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(entry.name)) out.push(p);
  }
  return out;
};

const counts = {};
for (const file of walk(SRC)) {
  const rel = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');
  if (WHITELIST.has(rel)) continue;
  if (WHITELIST_DIRS.some((d) => rel.startsWith(d))) continue;
  const matches = fs.readFileSync(file, 'utf8').match(COLOR_RE);
  if (matches && matches.length > 0) counts[rel] = matches.length;
}

if (process.argv.includes('--update')) {
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(counts, null, 2) + '\n');
  console.log(`Baseline aggiornata: ${Object.keys(counts).length} file, ${Object.values(counts).reduce((a, b) => a + b, 0)} colori.`);
  process.exit(0);
}

const baseline = fs.existsSync(BASELINE_PATH)
  ? JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'))
  : {};

let failed = false;
for (const [file, n] of Object.entries(counts)) {
  const allowed = baseline[file];
  if (allowed === undefined) {
    console.error(`✗ ${file}: ${n} colori hardcoded (file nuovo — usa i token da config/theme)`);
    failed = true;
  } else if (n > allowed) {
    console.error(`✗ ${file}: ${n} colori (baseline: ${allowed}) — usa i token da config/theme`);
    failed = true;
  }
}

const improved = Object.entries(baseline).filter(([f, n]) => (counts[f] || 0) < n);
if (improved.length > 0 && !failed) {
  console.log(`ℹ ${improved.length} file migliorati rispetto alla baseline — esegui con --update per congelare i progressi.`);
}

if (failed) {
  console.error('\nRegola M2: i colori vivono in src/config/theme.ts (palette) — importa `colors` da lì.');
  process.exit(1);
}
console.log(`✓ Palette sotto controllo (${Object.values(counts).reduce((a, b) => a + b, 0)} colori legacy in baseline, in diminuzione).`);
