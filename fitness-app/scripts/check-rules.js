#!/usr/bin/env node
/* eslint-disable no-console */
// ============================================================
// GUARDIA SULLE REGOLE DI SICUREZZA
// ------------------------------------------------------------
// Il 9 settembre 2026 sono stati trovati due permessi troppo larghi,
// scritti in momenti diversi e per buone ragioni, che però aprivano
// i dati a chiunque avesse un accesso qualsiasi:
//
//   · storage.rules — un jolly su tutto il bucket permetteva a ogni
//     utente autenticato di leggere, sovrascrivere e cancellare le
//     foto posturali di chiunque
//   · firestore.rules — «allow read: if true» sugli inviti allievo,
//     leggibili senza nemmeno autenticarsi
//
// Non erano errori di distrazione: erano scorciatoie che funzionavano.
// Torneranno, la prossima volta che qualcosa «non va e non si capisce
// perché». Questa guardia le riconosce e ferma la pubblicazione.
//
// Non sostituisce una revisione: riconosce solo le forme più larghe.
// Ma quelle le riconosce sempre.
// ============================================================

const fs = require('fs');
const path = require('path');

const RADICE = path.resolve(__dirname, '..');

/** Righe di permesso, senza commenti e senza spazi superflui. */
const permessi = (testo) =>
  testo
    .split('\n')
    .map((r, i) => ({ n: i + 1, testo: r.replace(/\/\/.*$/, '').trim() }))
    .filter((r) => /^allow\s/.test(r.testo));

const problemi = [];

const controlla = (file, regole) => {
  const percorso = path.join(RADICE, file);
  if (!fs.existsSync(percorso)) {
    problemi.push(`${file}: manca. Le regole di sicurezza non sono opzionali.`);
    return;
  }
  const testo = fs.readFileSync(percorso, 'utf8');
  permessi(testo).forEach(({ n, testo: riga }) => {
    regole.forEach(({ prova, perche }) => {
      if (prova.test(riga)) problemi.push(`${file}:${n}  ${riga}\n      → ${perche}`);
    });
  });
};

// «if true» — aperto a chiunque, anche senza accesso.
const APERTO_A_TUTTI = {
  prova: /:\s*if\s+true\s*;?\s*$/,
  perche: 'aperto a CHIUNQUE, anche senza autenticazione. '
    + 'Se serve una lettura pubblica, passa da una Cloud Function.',
};

// «if request.auth != null» da solo — aperto a ogni utente registrato,
// compreso l'allievo che guarda i dati degli altri.
const APERTO_A_OGNI_UTENTE = {
  prova: /:\s*if\s+request\.auth\s*!=\s*null\s*;?\s*$/,
  perche: 'aperto a OGNI utente autenticato, allievi compresi. '
    + 'Serve un ruolo o la proprietà del dato: staff(), propria(uid), isStaff().',
};

controlla('storage.rules', [APERTO_A_TUTTI, APERTO_A_OGNI_UTENTE]);
controlla('firestore.rules', [APERTO_A_TUTTI]);

if (problemi.length > 0) {
  console.error('\n✗ Regole di sicurezza troppo larghe:\n');
  problemi.forEach((p) => console.error('  ' + p + '\n'));
  console.error(
    `  ${problemi.length} da sistemare. Vedi l'intestazione di scripts/check-rules.js.\n`
  );
  process.exit(1);
}

console.log('✓ Regole di sicurezza: nessun permesso aperto a chiunque.');
