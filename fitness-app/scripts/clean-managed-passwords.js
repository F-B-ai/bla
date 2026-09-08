#!/usr/bin/env node
/**
 * BONIFICA managedPassword (M0.1 — vulnerabilità V1, doc 06 §1.1)
 * ----------------------------------------------------------------
 * Passo 1 (censimento):  node scripts/clean-managed-passwords.js
 * Passo 2 (rimozione):   node scripts/clean-managed-passwords.js --apply
 * Passo 3 (verifica):    node scripts/clean-managed-passwords.js
 *                        (deve stampare "0 documenti con managedPassword")
 *
 * Credenziali: file firebase-sa-key.json nella cartella fitness-app
 * (o variabile GOOGLE_APPLICATION_CREDENTIALS). Come da procedura di
 * sicurezza, ELIMINARE il file della chiave subito dopo l'uso.
 *
 * Dopo il passo 2, per ogni account gestito inviare il link di
 * reimpostazione password (in app: Profilo → "Invia link reimpostazione",
 * oppure passo 4 qui sotto con --send-reset-links).
 */
const path = require('path');
const fs = require('fs');

const keyPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, '..', 'firebase-sa-key.json');

if (!fs.existsSync(keyPath)) {
  console.error('Chiave service account non trovata:', keyPath);
  console.error('Copia firebase-sa-key.json in fitness-app/ (e cancellala dopo l\'uso).');
  process.exit(1);
}

const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require(keyPath)) });
const db = admin.firestore();

const APPLY = process.argv.includes('--apply');

(async () => {
  const snapshot = await db.collection('users').get();
  const withPassword = snapshot.docs.filter(
    (d) => d.data().managedPassword !== undefined
  );

  console.log(`Utenti totali: ${snapshot.size}`);
  console.log(`${withPassword.length} documenti con managedPassword`);
  for (const d of withPassword) {
    const u = d.data();
    console.log(` - ${d.id}  ${u.email || '(senza email)'}  ruolo=${u.role || '?'}`);
  }

  if (!APPLY) {
    if (withPassword.length > 0) {
      console.log('\nEsegui con --apply per rimuovere il campo da tutti i documenti.');
    } else {
      console.log('\nBonifica completa: nessun campo managedPassword residuo. ✔');
    }
    return;
  }

  if (withPassword.length === 0) {
    console.log('\nNiente da rimuovere. ✔');
    return;
  }

  const batch = db.batch();
  for (const d of withPassword) {
    batch.update(d.ref, {
      managedPassword: admin.firestore.FieldValue.delete(),
    });
  }
  await batch.commit();
  console.log(`\nRimosso managedPassword da ${withPassword.length} documenti. ✔`);
  console.log('Riesegui senza --apply per verificare, poi ELIMINA la chiave SA.');
  console.log('Ricorda: ogni password che era leggibile va considerata compromessa →');
  console.log('invia i link di reimpostazione agli account gestiti (Profilo in app).');
})().catch((err) => {
  console.error('Errore:', err.message);
  process.exit(1);
});
