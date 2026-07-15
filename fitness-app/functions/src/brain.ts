import * as admin from "firebase-admin";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {onRequest} from "firebase-functions/v2/https";
import {
  computeReadinessV2,
  READINESS_FORMULA_VERSION,
} from "./domain/formulas";
import {
  computeAcwr,
  acwrPenalty,
  computeChurn,
  buildAttention,
  linearSlope,
  BRAIN_FORMULAS_VERSION,
  AcwrResult,
} from "./domain/brain";

// ============================================================
// ESSĒRE BRAIN — Tappa 1: il motore notturno (doc 02 §4.3)
// ------------------------------------------------------------
// Ogni notte alle 04:00 (Europe/Rome) ricalcola DA ZERO gli stati
// derivati di ogni allievo leggendo human_events (35 giorni) e i
// piani di pagamento, e riscrive twins/{person_id}:
//   readiness (trend + ricalcolo canonico v2), carico (ACWR EWMA),
//   aderenza, churn euristico spiegato, coda "da attenzionare".
// Idempotente e senza stato incrementale: si può rilanciare quando
// si vuole. La proposta AI per ogni riga arriva in Tappa 2.
// ============================================================

const db = () => admin.firestore();

const DAYS_WINDOW = 35;
const MS_DAY = 86400000;

interface EventLite {
  type: string;
  ts: Date;
  payload: Record<string, unknown>;
}

interface BrainRunSummary {
  students: number;
  twinsWritten: number;
  attentionRows: number;
  aat7d: number; // Allievi Attivamente Tracciati (≥1 evento in 7gg) — metrica H0
  errors: string[];
}

const runBrain = async (): Promise<BrainRunSummary> => {
  const now = new Date();
  const cutoff = new Date(now.getTime() - DAYS_WINDOW * MS_DAY);
  const summary: BrainRunSummary = {
    students: 0, twinsWritten: 0, attentionRows: 0, aat7d: 0, errors: [],
  };

  // 1. Allievi attivi + mappa uid → person_id
  const usersSnap = await db().collection("users")
    .where("role", "==", "student").get();
  const students = usersSnap.docs
    .map((d) => ({uid: d.id, ...d.data()} as Record<string, unknown> & {uid: string}))
    .filter((u) => u.isActive !== false && u.person_id);
  summary.students = students.length;

  // 2. Eventi della finestra, raggruppati per persona (una query sola)
  const evSnap = await db().collection("human_events")
    .where("ts", ">=", admin.firestore.Timestamp.fromDate(cutoff))
    .get();
  const eventsByPerson = new Map<string, EventLite[]>();
  for (const doc of evSnap.docs) {
    const d = doc.data();
    const pid = d.person_id as string;
    if (!pid) continue;
    const arr = eventsByPerson.get(pid) || [];
    arr.push({type: d.type, ts: d.ts.toDate(), payload: d.payload || {}});
    eventsByPerson.set(pid, arr);
  }

  // 3. Rate scadute per studente (uid)
  const plansSnap = await db().collection("paymentPlans").get();
  const overdueByUid = new Set<string>();
  for (const doc of plansSnap.docs) {
    const d = doc.data();
    const installments = (d.installments || []) as Array<Record<string, unknown>>;
    const hasOverdue = installments.some((i) => {
      if (i.isPaid) return false;
      const due = (i.dueDate as admin.firestore.Timestamp)?.toDate?.();
      return due ? due.getTime() < now.getTime() - MS_DAY : false;
    });
    if (hasOverdue && d.studentId) overdueByUid.add(d.studentId as string);
  }

  const daysAgo = (ts: Date): number =>
    Math.floor((now.getTime() - ts.getTime()) / MS_DAY);

  // 4. Un twin per allievo
  const batchWriter = db().bulkWriter();
  for (const student of students) {
    try {
      const pid = student.person_id as string;
      const events = (eventsByPerson.get(pid) || [])
        .sort((a, b) => a.ts.getTime() - b.ts.getTime());

      const wellness = events.filter((e) => e.type === "wellness.checkin_submitted");
      const workouts = events.filter((e) => e.type === "workout.completed");
      const checkins = events.filter((e) => e.type === "gym.checkin");

      // --- Readiness: ricalcolo canonico v2 (fonte di verità server) ---
      const readinessPoints = wellness.map((e) => {
        const p = e.payload as Record<string, number>;
        const v2 = computeReadinessV2(p.sleep, p.energy, p.mood, p.soreness);
        return {daysAgoN: daysAgo(e.ts), score: v2.score};
      });
      const last14 = readinessPoints.filter((p) => p.daysAgoN <= 14);
      const slope14 = linearSlope(last14.map((p) => ({x: -p.daysAgoN, y: p.score})));
      const latest = readinessPoints[readinessPoints.length - 1];
      const lastCheckinGap = wellness.length > 0 ?
        daysAgo(wellness[wellness.length - 1].ts) : DAYS_WINDOW;

      // --- Carico: serie giornaliera del volume → ACWR ---
      const dailyLoads: number[] = Array(DAYS_WINDOW).fill(0);
      for (const w of workouts) {
        const idx = DAYS_WINDOW - 1 - daysAgo(w.ts);
        if (idx >= 0 && idx < DAYS_WINDOW) {
          dailyLoads[idx] += Number((w.payload as Record<string, unknown>).total_volume_kg) || 0;
        }
      }
      // storia insufficiente nella finestra? il dominio decide (cold start)
      const acwr: AcwrResult = computeAcwr(dailyLoads);

      // --- Aderenza / presenza ---
      const workouts28 = workouts.filter((e) => daysAgo(e.ts) <= 28).length;
      const presences14 = checkins.filter((e) => daysAgo(e.ts) <= 14).length;
      const presencesPrev = checkins.filter((e) => {
        const d = daysAgo(e.ts);
        return d > 14 && d <= 35;
      }).length;
      // baseline personale: media 2-settimane del periodo precedente (21gg → ×14/21)
      const baseline14 = (presencesPrev * 14) / 21;
      const lastWorkoutGap = workouts.length > 0 ?
        daysAgo(workouts[workouts.length - 1].ts) : Infinity;

      // settimane consecutive con ≥2 workout (fino a 5, finestra 35gg)
      let consistencyWeeks = 0;
      for (let w = 0; w < 5; w++) {
        const inWeek = workouts.filter((e) => {
          const d = daysAgo(e.ts);
          return d >= w * 7 && d < (w + 1) * 7;
        }).length;
        if (inWeek >= 2) consistencyWeeks++;
        else break;
      }

      // --- Churn + coda attenzione (dominio puro) ---
      const churn = computeChurn({
        presences14d: presences14,
        baseline14d: baseline14,
        checkinGapDays: lastCheckinGap,
        hasOverdue: overdueByUid.has(student.uid),
        daysSinceWorkout: lastWorkoutGap,
      });
      const attention = buildAttention({
        churn,
        readinessSlope14d: slope14,
        checkins14d: last14.length,
        acwr,
        hasOverdue: overdueByUid.has(student.uid),
        consistencyWeeks,
      });

      const name = `${student.name || ""} ${student.surname || ""}`.trim();
      batchWriter.set(db().collection("twins").doc(pid), {
        person_id: pid,
        uid: student.uid,
        name,
        computed_at: admin.firestore.FieldValue.serverTimestamp(),
        formulas: {
          brain: BRAIN_FORMULAS_VERSION,
          readiness: READINESS_FORMULA_VERSION,
          churn: churn.version,
        },
        readiness: {
          latest_v2: latest?.score ?? null,
          latest_penalized: latest ?
            Math.max(0, latest.score - acwrPenalty(acwr.acwr)) : null,
          slope_14d: Math.round(slope14 * 100) / 100,
          checkins_14d: last14.length,
          checkin_gap_days: lastCheckinGap,
        },
        load: {
          status: acwr.status,
          acwr: acwr.acwr ?? null,
          weekly_volume_kg: Math.round(dailyLoads.slice(-7).reduce((a, b) => a + b, 0)),
        },
        adherence: {
          workouts_28d: workouts28,
          presences_14d: presences14,
          baseline_14d: Math.round(baseline14 * 10) / 10,
          consistency_weeks: consistencyWeeks,
          last_workout_gap_days: lastWorkoutGap === Infinity ? null : lastWorkoutGap,
        },
        churn: {
          score: churn.score,
          level: churn.level,
          factors: churn.factors,
        },
        attention,
        events_7d: events.filter((e) => daysAgo(e.ts) <= 7).length,
      }, {merge: false});

      summary.twinsWritten++;
      summary.attentionRows += attention.length;
      if (events.some((e) => daysAgo(e.ts) <= 7)) summary.aat7d++;
    } catch (e) {
      summary.errors.push(`${student.uid}: ${(e as Error).message}`);
    }
  }
  await batchWriter.close();

  // 5. Riepilogo istanza (per dashboard e per la metrica H0)
  await db().collection("config").doc("brainStatus").set({
    last_run: admin.firestore.FieldValue.serverTimestamp(),
    students: summary.students,
    twins_written: summary.twinsWritten,
    attention_rows: summary.attentionRows,
    aat_7d: summary.aat7d,
    errors: summary.errors.slice(0, 10),
  });

  return summary;
};

// Esecuzione notturna: 04:00 Europe/Rome (02 §4.3 — batch, non stream)
export const nightlyBrain = onSchedule(
  {
    schedule: "0 4 * * *",
    timeZone: "Europe/Rome",
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 300,
  },
  async () => {
    const s = await runBrain();
    console.log("Brain notturno:", JSON.stringify(s));
  }
);

// Trigger manuale (solo owner/manager): per test e per il pulsante
// "ricalcola ora" — stessa identica esecuzione della notte.
export const brainRun = onRequest(
  {region: "europe-west1", timeoutSeconds: 300, memory: "256MiB", cors: true},
  async (req, res) => {
    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!idToken) {
      res.status(401).json({error: "Autenticazione richiesta"});
      return;
    }
    try {
      const uid = (await admin.auth().verifyIdToken(idToken)).uid;
      const user = await db().collection("users").doc(uid).get();
      const role = user.data()?.role;
      if (role !== "owner" && role !== "manager") {
        res.status(403).json({error: "Solo titolare o manager"});
        return;
      }
    } catch {
      res.status(401).json({error: "Token non valido"});
      return;
    }
    const s = await runBrain();
    res.json(s);
  }
);
