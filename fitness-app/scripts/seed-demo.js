#!/usr/bin/env node
/**
 * SEED DEMO — popola un'istanza white-label con dati realistici per la vendita.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=<sa-key-del-progetto-demo>.json \
 *     node scripts/seed-demo.js
 *
 * Crea, nel progetto indicato dalla chiave service account:
 *  - 1 titolare demo (login: demo@ptraining.it / Demo1234!)
 *  - 1 coach demo
 *  - 3 allievi con profilo, scheda, Stato ESSĒRE, accessi, pagamenti
 *  - una situazione "da vendita": un allievo con prontezza bassa oggi
 *    e uno con una rata scaduta → la dashboard "Oggi in palestra" si
 *    illumina di segnalazioni durante la demo.
 *
 * Usa solo REST (Identity Toolkit + Firestore) — nessuna dipendenza.
 * NB: eseguire su un PROGETTO DEMO dedicato, mai su ESSĒRE reale.
 */
const fs = require('fs');
const crypto = require('crypto');

const sa = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
const PROJECT = sa.project_id;
if (PROJECT.includes('essere')) {
  console.error('⛔ SICUREZZA: la chiave punta al progetto ESSĒRE reale. Usa la chiave del progetto DEMO.');
  process.exit(1);
}
const API_KEY = process.env.DEMO_API_KEY; // apiKey web del progetto demo (dal firebaseConfig)
if (!API_KEY) {
  console.error('Manca DEMO_API_KEY (la apiKey web dal firebaseConfig del progetto demo).');
  process.exit(1);
}

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

// Crea (o riusa) un utente Auth e ritorna il suo uid
async function ensureUser(email, password) {
  let r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  let d = await r.json();
  if (d.localId) return d.localId;
  if (d.error?.message === 'EMAIL_EXISTS') {
    r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    d = await r.json();
    if (d.localId) return d.localId;
  }
  throw new Error(`utente ${email}: ` + JSON.stringify(d));
}

// Converte un oggetto JS in "fields" Firestore
function toFields(obj) {
  const f = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string') f[k] = { stringValue: v };
    else if (typeof v === 'boolean') f[k] = { booleanValue: v };
    else if (typeof v === 'number') f[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    else if (v instanceof Date) f[k] = { timestampValue: v.toISOString() };
    else if (Array.isArray(v)) f[k] = { arrayValue: { values: v.map((x) => toFields({ x }).x) } };
    else if (typeof v === 'object') f[k] = { mapValue: { fields: toFields(v) } };
  }
  return f;
}

async function setDoc(token, coll, id, data) {
  const url = `${FS_BASE}/${coll}${id ? '/' + id : ''}`;
  const method = id ? 'PATCH' : 'POST';
  const r = await fetch(url, {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  const d = await r.json();
  if (d.error) throw new Error(`${coll}/${id}: ${JSON.stringify(d.error)}`);
  return d.name?.split('/').pop() || id;
}

(async () => {
  console.log(`Semino dati demo nel progetto: ${PROJECT}`);
  const token = await adminToken();
  const today = new Date();
  const daysAgo = (n) => new Date(today.getTime() - n * 86400000);

  // --- Titolare + coach ---
  const ownerUid = await ensureUser('demo@ptraining.it', 'Demo1234!');
  await setDoc(token, 'users', ownerUid, {
    email: 'demo@ptraining.it', name: 'Marco', surname: 'Titolare', phone: '3330000001',
    role: 'owner', isActive: true, createdAt: today, assignedStudents: [],
  });
  const coachUid = await ensureUser('coach@ptraining.it', 'Demo1234!');
  await setDoc(token, 'users', coachUid, {
    email: 'coach@ptraining.it', name: 'Luca', surname: 'Coach', phone: '3330000002',
    role: 'collaborator', collaboratorType: 'coach', isActive: true, createdAt: today,
    assignedStudents: [], specializations: ['forza', 'ipertrofia'],
  });
  console.log('✓ titolare + coach');

  // --- Allievi ---
  const students = [
    { email: 'mario.rossi@demo.it', name: 'Mario', surname: 'Rossi', goals: 'Ipertrofia e forza' },
    { email: 'giulia.bianchi@demo.it', name: 'Giulia', surname: 'Bianchi', goals: 'Dimagrimento e tono' },
    { email: 'paolo.verdi@demo.it', name: 'Paolo', surname: 'Verdi', goals: 'Preparazione atletica' },
  ];
  const ids = [];
  for (const s of students) {
    const uid = await ensureUser(s.email, 'Demo1234!');
    ids.push(uid);
    await setDoc(token, 'users', uid, {
      email: s.email, name: s.name, surname: s.surname, phone: '333000010' + ids.length,
      role: 'student', assignedCollaboratorIds: [coachUid], assignedCollaboratorId: coachUid,
      startDate: daysAgo(90), goals: s.goals, medicalNotes: '', isActive: true, createdAt: daysAgo(90),
    });
  }
  console.log('✓ 3 allievi');

  // --- Stato ESSĒRE di oggi: Giulia con prontezza BASSA (segnalazione demo) ---
  const checks = [
    { uid: ids[0], name: 'Mario Rossi', sleep: 4, energy: 4, mood: 4, soreness: 2 },   // ~81 verde
    { uid: ids[1], name: 'Giulia Bianchi', sleep: 2, energy: 2, mood: 2, soreness: 5 }, // ~19 rosso → "da attenzionare"
    { uid: ids[2], name: 'Paolo Verdi', sleep: 3, energy: 4, mood: 3, soreness: 3 },    // ~56 giallo
  ];
  for (const c of checks) {
    const raw = c.sleep + c.energy + c.mood + (6 - c.soreness);
    const score = Math.round(((raw - 4) / 16) * 100);
    await setDoc(token, 'wellnessChecks', null, {
      studentId: c.uid, studentName: c.name, sleep: c.sleep, energy: c.energy,
      mood: c.mood, soreness: c.soreness, score, timestamp: today,
    });
  }
  console.log('✓ Stato ESSĒRE di oggi (Giulia in rosso)');

  // --- Accessi di oggi ---
  await setDoc(token, 'checkins', null, { studentId: ids[0], studentName: 'Mario Rossi', timestamp: new Date(today.getTime() - 2 * 3600000) });
  await setDoc(token, 'checkins', null, { studentId: ids[2], studentName: 'Paolo Verdi', timestamp: new Date(today.getTime() - 1 * 3600000) });
  console.log('✓ accessi di oggi');

  // --- Pagamenti: Mario con una rata SCADUTA (segnalazione demo) ---
  await setDoc(token, 'paymentPlans', null, {
    studentId: ids[0], studentName: 'Mario Rossi', planName: 'Trimestrale PRO',
    totalAmount: 270, installments: [
      { number: 1, amount: 90, dueDate: daysAgo(65), isPaid: true },
      { number: 2, amount: 90, dueDate: daysAgo(5), isPaid: false },  // scaduta da 5gg
      { number: 3, amount: 90, dueDate: daysAgo(-25), isPaid: false },
    ], createdAt: daysAgo(65),
  });
  await setDoc(token, 'paymentPlans', null, {
    studentId: ids[1], studentName: 'Giulia Bianchi', planName: 'Mensile BASE',
    totalAmount: 60, installments: [{ number: 1, amount: 60, dueDate: daysAgo(-10), isPaid: true }],
    createdAt: daysAgo(20),
  });
  console.log('✓ pagamenti (Mario con rata scaduta)');

  // --- Una scheda d'esempio con la nuova tecnica cumulative ---
  await setDoc(token, 'workoutPlans', null, {
    studentId: ids[0], name: 'Scheda Forza — Upper', isActive: true, createdAt: daysAgo(30),
    days: { Giorno1: 'vedi esercizi' }, // struttura semplificata per la demo
  });
  console.log('✓ scheda d\'esempio');

  console.log('\n✔ DEMO PRONTA.');
  console.log('   Titolare:  demo@ptraining.it  /  Demo1234!');
  console.log('   Coach:     coach@ptraining.it /  Demo1234!');
  console.log('   Allievo:   mario.rossi@demo.it / Demo1234!');
})().catch((e) => { console.error('Errore seed:', e.message); process.exit(1); });
