#!/usr/bin/env node
/**
 * BACKFILL TWIN (M3, doc 02 §3.4) — riversa gli ultimi 90 giorni delle
 * collezioni legacy in `human_events`, così la Timeline persona nasce
 * già piena e la metrica AAT è calcolabile da subito.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=<sa-key>.json node scripts/backfill-twin.js           # dry-run
 *   GOOGLE_APPLICATION_CREDENTIALS=<sa-key>.json node scripts/backfill-twin.js --apply   # scrive
 *
 * Proprietà:
 *  - IDEMPOTENTE: id evento = bf1_<tipo>_<docId legacy> → rilanciare
 *    non duplica mai (si può interrompere e riprendere).
 *  - source: "system", source_detail: "backfill_v1",
 *    confidence = valore d'origine − 0.05 (02 §3.1: dati storici senza
 *    validazione all'origine).
 *  - person_id: letto da users/{uid}; se manca viene generato e
 *    scritto (set-once) — Admin SDK bypassa le regole.
 *  - Legge SOLO le collezioni mappate; il doc legacy resta intatto.
 *
 * Solo REST (nessuna dipendenza), come gli altri script del repo.
 */
const fs = require('fs');
const crypto = require('crypto');

const sa = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
const PROJECT = sa.project_id;
const APPLY = process.argv.includes('--apply');
const DAYS = 90;
const CUTOFF = new Date(Date.now() - DAYS * 86400000);

try {
  const { ProxyAgent, setGlobalDispatcher } = require('../node_modules/undici');
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (proxy) setGlobalDispatcher(new ProxyAgent(proxy));
} catch (_) { /* fetch diretto */ }

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
  if (!d.access_token) throw new Error('token: ' + JSON.stringify(d));
  return d.access_token;
}

// --- Firestore REST helpers ---
const fromFs = (v) => {
  if (v === undefined || v === null) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.timestampValue !== undefined) return new Date(v.timestampValue);
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(fromFs);
  if (v.mapValue !== undefined) {
    const o = {};
    for (const [k, x] of Object.entries(v.mapValue.fields || {})) o[k] = fromFs(x);
    return o;
  }
  return null;
};
const toFs = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFs) } };
  if (typeof v === 'object') {
    const f = {};
    for (const [k, x] of Object.entries(v)) if (x !== undefined) f[k] = toFs(x);
    return { mapValue: { fields: f } };
  }
  return { nullValue: null };
};

async function listAll(token, coll) {
  const out = [];
  let pageToken = '';
  do {
    const r = await fetch(`${FS_BASE}/${coll}?pageSize=300${pageToken ? '&pageToken=' + pageToken : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    if (d.error) throw new Error(`${coll}: ${d.error.message}`);
    for (const doc of d.documents || []) {
      const data = {};
      for (const [k, v] of Object.entries(doc.fields || {})) data[k] = fromFs(v);
      out.push({ id: doc.name.split('/').pop(), data });
    }
    pageToken = d.nextPageToken || '';
  } while (pageToken);
  return out;
}

async function writeDoc(token, coll, id, fields) {
  const r = await fetch(`${FS_BASE}/${coll}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  const d = await r.json();
  if (d.error) throw new Error(`${coll}/${id}: ${d.error.message}`);
}

// --- ULID (per i person_id mancanti) ---
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ulid = () => {
  let t = Date.now();
  const time = [];
  for (let i = 9; i >= 0; i--) { time[i] = B32[t % 32]; t = Math.floor(t / 32); }
  let rand = '';
  const bytes = crypto.randomBytes(16);
  for (let i = 0; i < 16; i++) rand += B32[bytes[i] % 32];
  return time.join('') + rand;
};

(async () => {
  console.log(`Backfill twin su ${PROJECT} — ultimi ${DAYS}gg — ${APPLY ? 'APPLICO' : 'DRY-RUN (usa --apply per scrivere)'}`);
  const token = await adminToken();

  // 1. person_id per ogni utente (set-once dove manca)
  const users = await listAll(token, 'users');
  const personByUid = new Map();
  let created = 0;
  for (const u of users) {
    let pid = u.data.person_id;
    if (!pid) {
      pid = `p_${ulid()}`;
      if (APPLY) {
        await fetch(`${FS_BASE}/users/${u.id}?updateMask.fieldPaths=person_id`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { person_id: { stringValue: pid } } }),
        });
      }
      created++;
    }
    personByUid.set(u.id, pid);
  }
  console.log(`✓ utenti: ${users.length} (person_id generati: ${created})`);

  const tenantId = 'essere-mml'; // slug istanza (brand.licenseId senza numero)
  let written = 0, skippedOld = 0, skippedNoUser = 0;

  const emit = async (legacyColl, legacyId, type, subjectUid, ts, payload, confidence) => {
    if (!ts || ts < CUTOFF) { skippedOld++; return; }
    const pid = personByUid.get(subjectUid);
    if (!pid) { skippedNoUser++; return; }
    const eventId = `bf1_${type.replace(/\./g, '-')}_${legacyId}`;
    if (APPLY) {
      const fields = {};
      const docData = {
        id: eventId, schema_version: 1, person_id: pid, tenant_id: tenantId,
        type, ts, recorded_at: new Date(), source: 'system',
        source_detail: 'backfill_v1', actor_id: 'backfill', payload,
        confidence, source_ref: { collection: legacyColl, doc_id: legacyId },
        supersedes: null,
      };
      for (const [k, v] of Object.entries(docData)) fields[k] = toFs(v);
      await writeDoc(token, 'human_events', eventId, fields);
    }
    written++;
  };

  // 2. wellnessChecks → wellness.checkin_submitted (self-report 0.9 − 0.05)
  for (const c of await listAll(token, 'wellnessChecks')) {
    await emit('wellnessChecks', c.id, 'wellness.checkin_submitted', c.data.studentId, c.data.timestamp, {
      sleep: c.data.sleep, energy: c.data.energy, mood: c.data.mood,
      soreness: c.data.soreness, score: c.data.score, formula_version: 1,
    }, 0.85);
  }
  console.log(`… wellnessChecks riversati (parziale: ${written})`);

  // 3. checkins → gym.checkin
  for (const c of await listAll(token, 'checkins')) {
    await emit('checkins', c.id, 'gym.checkin', c.data.studentId, c.data.timestamp, { method: 'qr' }, 0.85);
  }
  console.log(`… checkins riversati (parziale: ${written})`);

  // 4. workoutLogs → workout.completed / workout.abandoned
  for (const w of await listAll(token, 'workoutLogs')) {
    const status = w.data.status;
    if (status !== 'completed' && status !== 'abandoned') continue;
    const ts = w.data.completedAt || w.data.date;
    const logs = Array.isArray(w.data.exerciseLogs) ? w.data.exerciseLogs : [];
    const exercises = logs
      .filter((ex) => Array.isArray(ex.sets) && ex.sets.some((s) => s.completed))
      .map((ex) => {
        const done = ex.sets.filter((s) => s.completed);
        const top = done.reduce((b, s) => (!b || s.weight > b.weight ? s : b), null);
        return {
          name: ex.exerciseName, sets: done.length,
          top_set: top ? { kg: top.weight, reps: top.reps } : null,
          volume_kg: Math.round(done.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0)),
          technique: ex.technique || 'standard',
        };
      });
    const payload = status === 'completed'
      ? {
          plan_id: w.data.workoutPlanId || null,
          duration_minutes: w.data.durationMinutes || null,
          exercises,
          total_volume_kg: exercises.reduce((s, e) => s + e.volume_kg, 0),
        }
      : {};
    await emit('workoutLogs', w.id, `workout.${status}`, w.data.studentId, ts, payload, 0.85);
  }
  console.log(`… workoutLogs riversati (parziale: ${written})`);

  // 5. posturalAssessments → posture.assessed (coach 1.0 / ai 0.65, −0.05)
  for (const a of await listAll(token, 'posturalAssessments')) {
    const hasAi = !!a.data.aiAnalysis;
    await emit('posturalAssessments', a.id, 'posture.assessed', a.data.studentId, a.data.date, {
      findings: (a.data.findings || []).map((f) => ({ area: f.area, severity: f.severity })),
      ai_assisted: hasAi,
    }, hasAi ? 0.6 : 0.95);
  }

  // 6. bodyCompositionEstimates → body.composition_estimated (0.55 − 0.05)
  for (const e of await listAll(token, 'bodyCompositionEstimates')) {
    await emit('bodyCompositionEstimates', e.id, 'body.composition_estimated', e.data.studentId, e.data.date, {
      estimated_body_fat: e.data.estimatedBodyFat ?? null,
      estimated_muscle_mass: e.data.estimatedMuscleMass ?? null,
    }, 0.5);
  }

  console.log(`\n${APPLY ? '✔ BACKFILL COMPLETATO' : '✔ DRY-RUN COMPLETATO'}`);
  console.log(`   eventi ${APPLY ? 'scritti' : 'che verrebbero scritti'}: ${written}`);
  console.log(`   scartati (oltre ${DAYS}gg): ${skippedOld} · senza utente: ${skippedNoUser}`);
  if (!APPLY) console.log('   Rilancia con --apply per scrivere davvero.');
})().catch((e) => { console.error('Errore backfill:', e.message); process.exit(1); });
