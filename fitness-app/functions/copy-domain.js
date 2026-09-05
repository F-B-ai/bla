#!/usr/bin/env node
/**
 * PREBUILD — copia il dominio puro condiviso dentro functions/src.
 *
 * Le formule canoniche vivono in UNA sola fonte (src/domain, doc 03):
 * il deploy delle functions carica solo questa cartella, quindi i file
 * vengono copiati qui a ogni build. La copia è generata: non si edita
 * mai a mano (è in .gitignore) — si edita src/domain e basta.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src', 'domain');
const DST = path.join(__dirname, 'src', 'domain');
const FILES = ['formulas.ts', 'brain.ts', 'twinEvents.ts'];

fs.mkdirSync(DST, { recursive: true });
for (const f of FILES) {
  const from = path.join(SRC, f);
  if (!fs.existsSync(from)) {
    console.error(`copy-domain: manca ${from}`);
    process.exit(1);
  }
  const header = '// GENERATO da copy-domain.js — NON editare: la fonte è src/domain/\n';
  fs.writeFileSync(path.join(DST, f), header + fs.readFileSync(from, 'utf8'));
}
console.log(`✓ dominio condiviso copiato (${FILES.join(', ')})`);
