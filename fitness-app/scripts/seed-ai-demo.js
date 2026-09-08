#!/usr/bin/env node
/**
 * SEED AI DEMO — abilita l'Assistente nella demo white-label.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=<sa-progetto-demo>.json \
 *   DEMO_API_KEY=<apiKey web del progetto demo> \
 *     node scripts/seed-ai-demo.js
 *
 * Fa due cose, sul PROGETTO DEMO indicato dalla chiave:
 *  1. Scrive config/assistantInfo con le info (finte ma realistiche)
 *     dello studio → l'Assistente sa orari, indirizzo, contatti, FAQ.
 *  2. Registra il consenso GDPR "AI esterna" per gli account demo, così
 *     l'Assistente risponde subito senza far passare dalla schermata
 *     consensi durante la vendita.
 *
 * Solo REST (Identity Toolkit + Firestore), nessuna dipendenza extra.
 * Guardia: si rifiuta di girare su un progetto ESSĒRE reale.
 */
const fs = require('fs');
const crypto = require('crypto');

const sa = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
const PROJECT = sa.project_id;
if (PROJECT.includes('essere')) {
  console.error('⛔ SICUREZZA: la chiave punta a ESSĒRE reale. Usa la chiave del progetto DEMO.');
  process.exit(1);
}
const API_KEY = process.env.DEMO_API_KEY;
if (!API_KEY) {
  console.error('Manca DEMO_API_KEY (la apiKey web del progetto demo).');
  process.exit(1);
}

// Routing proxy per fetch (ambienti con proxy in uscita)
try {
  const { ProxyAgent, setGlobalDispatcher } = require('../node_modules/undici');
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (proxy) setGlobalDispatcher(new ProxyAgent(proxy));
} catch (_) { /* undici non presente: fetch diretto */ }

const b64 = (i) => Buffer.from(i).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

async function adminToken() {
  const now = Math.floor(Date.now() / 1000);
  const u = `${b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64(JSON.stringify({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }))}`;
  const sig = crypto.createSign('RSA-SHA256').update(u).sign(sa.private_key)
    .toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${u}.${sig}`,
  });
  const d = await r.json();
  if (!d.access_token) throw new Error('token admin: ' + JSON.stringify(d));
  return d.access_token;
}

async function signInUid(email, password) {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const d = await r.json();
  if (!d.localId) throw new Error(`login ${email}: ` + JSON.stringify(d.error?.message || d));
  return d.localId;
}

async function patchDoc(token, path, fields) {
  const r = await fetch(`${FS_BASE}/${path}`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  const d = await r.json();
  if (d.error) throw new Error(`${path}: ${JSON.stringify(d.error)}`);
}

// Info studio (finte ma realistiche) per l'Assistente della demo
const STUDIO_INFO = `PTraining — Personal Training Studio
Indirizzo: Via dello Sport 12, Milano (MI). Citofono "PTraining", primo piano.
Telefono / WhatsApp reception: 02 1234 5678.
Email: info@ptraining.it — Sito: ptraining-demo.web.app

Orari di apertura:
- Lun–Ven: 7:00–21:30
- Sabato: 9:00–13:00
- Domenica: chiuso

Servizi:
- Personal training 1-to-1 e in piccolo gruppo (max 4 persone)
- Valutazione posturale e composizione corporea
- Percorsi ricomposizione, forza e ricondizionamento
- Sala attrezzata Technogym, area functional, spazio mobilità

Come raggiungerci: MM linea rossa fermata "Sport", 5 min a piedi. Parcheggio convenzionato in Via dello Sport 8.

FAQ:
- Prova gratuita: sì, primo incontro conoscitivo + valutazione gratuito su prenotazione.
- Congelamento abbonamento: possibile fino a 30 giorni l'anno per motivi documentati.
- Certificato medico: obbligatorio (agonistico o non agonistico) prima di iniziare.
- Disdetta seduta: entro 12 ore, altrimenti la seduta viene conteggiata.`;

(async () => {
  console.log(`Abilito l'Assistente demo sul progetto: ${PROJECT}`);
  const token = await adminToken();

  // 1. config/assistantInfo
  await patchDoc(token, 'config/assistantInfo', {
    content: { stringValue: STUDIO_INFO },
    updatedAt: { timestampValue: new Date().toISOString() },
  });
  console.log('✓ config/assistantInfo (conoscenza studio)');

  // 2. consenso "AI esterna" per gli account demo
  const accounts = [
    ['demo@ptraining.it', 'Demo1234!'],
    ['coach@ptraining.it', 'Demo1234!'],
    ['mario.rossi@demo.it', 'Demo1234!'],
    ['giulia.bianchi@demo.it', 'Demo1234!'],
    ['paolo.verdi@demo.it', 'Demo1234!'],
  ];
  const choices = {
    wellness: { booleanValue: true },
    posturalAI: { booleanValue: true },
    bodyComp: { booleanValue: true },
    externalAI: { booleanValue: true },
    secondaryUse: { booleanValue: false },
  };
  for (const [email, pwd] of accounts) {
    const uid = await signInUid(email, pwd);
    // version = CONSENT_TEXT_VERSION (1) e decidedAt presenti → l'app NON
    // ripropone la schermata consensi al login (needsConsentDecision=false).
    await patchDoc(token, `consents/${uid}`, {
      version: { integerValue: '1' },
      choices: { mapValue: { fields: choices } },
      decidedAt: { timestampValue: new Date().toISOString() },
    });
    console.log(`✓ consenso AI → ${email}`);
  }

  console.log('\n✔ ASSISTENTE DEMO ABILITATO. Apri la chat Assistente e chiedi orari/prezzi/servizi.');
})().catch((e) => { console.error('Errore seed AI:', e.message); process.exit(1); });
