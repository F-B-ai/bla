import * as admin from "firebase-admin";
import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";

// ============================================================
// AI GATEWAY — POST /v1/ai/messages  (M1, contratto 01 §2.2)
// ------------------------------------------------------------
// Unico punto di uscita verso Anthropic: la chiave vive in
// Secret Manager e non tocca mai i client. Il gateway:
//  1. verifica l'ID token Firebase (Authorization: Bearer ...)
//  2. verifica il consenso GDPR "externalAI" dell'utente
//  3. applica il rate limit giornaliero per ruolo
//  4. sceglie il MODELLO server-side in base alla feature
//     (il client non decide: leva costi centralizzata, 03 §0.3)
//  5. applica il prompt caching sul system prompt (feature
//     ad alto volume) e registra token/costi in aiUsage/
// ============================================================

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const db = () => admin.firestore();

// Istanze DEMO white-label servite dallo STESSO gateway ESSĒRE, così la
// demo mostra il prodotto completo (Assistente incluso) senza deployare
// Functions su ogni progetto cliente. I loro ID token hanno `aud`
// diverso: li verifichiamo con app admin secondarie dedicate (per
// verifyIdToken basta il projectId — la firma è validata sui certificati
// pubblici Google). NB: percorso pensato per i progetti demo con dati
// FINTI; i clienti reali paganti avranno il proprio gateway isolato.
const DEMO_PROJECT_IDS = ["ptraining-demo"];
let _demoApps: admin.app.App[] | null = null;
const demoApps = (): admin.app.App[] => {
  if (!_demoApps) {
    _demoApps = DEMO_PROJECT_IDS.map((pid) =>
      admin.apps.find((a) => a?.name === pid) ||
      admin.initializeApp({projectId: pid}, pid));
  }
  return _demoApps;
};

// Modello per feature (03 §1.7 / 07 M1): Sonnet per il volume,
// Fable 5 per le ANALISI (vision + sintesi dei dati corpo/movimento:
// sono il momento "wow" del prodotto e valgono il modello top),
// Opus per il riepilogo owner, Haiku per i triage.
// Fable 5 richiede accortezze API diverse (niente prefill assistant,
// thinking sempre attivo quindi NON va passato alcun parametro
// thinking, stop_reason "refusal" possibile): gestite più sotto.
const FABLE = "claude-fable-5";
const MODEL_BY_FEATURE: Record<string, string> = {
  assistant: "claude-sonnet-4-5",
  coach: "claude-sonnet-4-5",
  progression: "claude-sonnet-4-5",
  workoutplan: "claude-sonnet-4-5",
  postural: FABLE,
  bodycomp: FABLE,
  gait: FABLE,
  squat: FABLE,
  mindmovement: FABLE,
  portrait: FABLE,
  weekly_summary: "claude-opus-4-8",
  triage: "claude-haiku-4-5",
  generic: "claude-sonnet-4-5",
};

// Prezzi $/MTok (input, output) — luglio 2026. Cache: read ~0.1x, write 1.25x.
const PRICING: Record<string, {in: number; out: number}> = {
  "claude-sonnet-4-5": {in: 3, out: 15},
  "claude-opus-4-8": {in: 5, out: 25},
  "claude-haiku-4-5": {in: 1, out: 5},
  "claude-fable-5": {in: 10, out: 50},
};

// Limiti giornalieri per ruolo (01 §2.1)
const DAILY_LIMIT: Record<string, number> = {
  student: 30,
  academy_student: 20,
  collaborator: 100,
  manager: 100,
  owner: 200,
};

const estimateCostUsd = (
  model: string,
  usage: {input_tokens?: number; output_tokens?: number;
    cache_read_input_tokens?: number; cache_creation_input_tokens?: number}
): number => {
  const p = PRICING[model] || PRICING["claude-sonnet-4-5"];
  const inTok = usage.input_tokens || 0;
  const outTok = usage.output_tokens || 0;
  const cacheRead = usage.cache_read_input_tokens || 0;
  const cacheWrite = usage.cache_creation_input_tokens || 0;
  return (
    (inTok * p.in + outTok * p.out +
     cacheRead * p.in * 0.1 + cacheWrite * p.in * 1.25) / 1_000_000
  );
};

export const aiMessages = onRequest(
  {
    region: "europe-west1",
    secrets: [ANTHROPIC_API_KEY],
    timeoutSeconds: 120,
    memory: "256MiB",
    cors: true, // PWA same-origin via rewrite; native app cross-origin
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({error: "Metodo non consentito"});
      return;
    }

    // --- 1. Autenticazione ---
    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ") ?
      authHeader.slice(7) : "";
    if (!idToken) {
      res.status(401).json({error: "Autenticazione richiesta"});
      return;
    }
    let uid = "";
    let isDemo = false;
    try {
      uid = (await admin.auth().verifyIdToken(idToken)).uid;
    } catch {
      // Non è un token ESSĒRE: provalo contro le istanze demo white-label.
      let verified = false;
      for (const app of demoApps()) {
        try {
          uid = (await admin.auth(app).verifyIdToken(idToken)).uid;
          isDemo = true;
          verified = true;
          break;
        } catch {
          // prova il prossimo progetto demo
        }
      }
      if (!verified) {
        res.status(401).json({error: "Token non valido o scaduto"});
        return;
      }
    }

    // --- 2. Consenso GDPR "AI esterna" ---
    // Solo per gli utenti reali ESSĒRE: il consenso è nella loro istanza.
    // Le istanze demo lo gestiscono in casa propria (schermata consensi
    // dell'app che gira sul progetto demo) — qui non lo rileggiamo.
    if (!isDemo) {
      try {
        const consent = await db().collection("consents").doc(uid).get();
        if (consent.data()?.choices?.externalAI !== true) {
          res.status(403).json({
            error: "CONSENT_REQUIRED",
            message: "Serve il consenso 'AI esterna' (Profilo → Consensi privacy).",
          });
          return;
        }
      } catch {
        res.status(500).json({error: "Verifica consenso non riuscita"});
        return;
      }
    }

    // --- 3. Rate limit giornaliero per ruolo ---
    const userSnap = await db().collection("users").doc(uid).get();
    const role = (userSnap.data()?.role as string) || "student";
    const limit = DAILY_LIMIT[role] ?? 30;
    const day = new Date().toISOString().slice(0, 10);
    const usageRef = db().collection("aiUsage").doc(`${uid}_${day}`);
    try {
      await db().runTransaction(async (tx) => {
        const snap = await tx.get(usageRef);
        const count = (snap.data()?.count as number) || 0;
        if (count >= limit) {
          throw new Error("QUOTA");
        }
        tx.set(usageRef, {
          uid, role, day,
          count: count + 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, {merge: true});
      });
    } catch (e) {
      if ((e as Error).message === "QUOTA") {
        res.status(429).json({
          error: "QUOTA_ESAURITA",
          message: `Hai raggiunto il limite giornaliero di ${limit} richieste AI. Riprova domani.`,
        });
        return;
      }
      res.status(500).json({error: "Rate limit non verificabile"});
      return;
    }

    // --- 4. Richiesta ---
    const {feature, messages, system, maxTokens, prefill} = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({error: "messages mancante"});
      return;
    }
    const model = MODEL_BY_FEATURE[feature as string] ||
      MODEL_BY_FEATURE.generic;
    // Su Fable 5 il ragionamento interno (sempre attivo) consuma
    // max_tokens PRIMA della risposta: un tetto basso (es. 700 del
    // client) produrrebbe risposte vuote. Alziamo il pavimento.
    let cappedMax = Math.min(Number(maxTokens) || 2000, 8192);
    if (model === FABLE) {
      cappedMax = Math.min(Math.max(cappedMax, 8192), 16384);
    }

    // Fable 5 rifiuta il prefill assistant (400): sui modelli Fable il
    // prefill NON viene inoltrato. Il client ricompone `prefill + text`,
    // quindi se la risposta inizia già col prefill lo togliamo dal testo
    // di ritorno per non duplicarlo (vedi sotto, punto 6).
    const usePrefill = Boolean(prefill) && model !== FABLE;
    const allMessages = [...messages];
    if (usePrefill) {
      allMessages.push({role: "assistant", content: prefill});
    }

    // Prompt caching sul system prompt per le feature ad alto volume
    // (il system dell'Assistente = listino + info palestra è stabile)
    const cacheable = feature === "assistant" || feature === "coach";
    const systemPayload = system ?
      (cacheable ?
        [{type: "text", text: system, cache_control: {type: "ephemeral"}}] :
        system) :
      undefined;

    // --- 5. Chiamata Anthropic ---
    // Su Fable 5 attiviamo il fallback server-side: se il modello top è
    // sovraccarico o rifiuta (stop_reason "refusal"), Anthropic ritenta
    // da solo su Opus 4.8 e ci dice nel campo `model` chi ha risposto.
    // Così l'analisi non fallisce mai per colpa del motore premium.
    const isFable = model === FABLE;
    let anthropicRes: Response;
    try {
      anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY.value(),
          "anthropic-version": "2023-06-01",
          ...(isFable ?
            {"anthropic-beta": "server-side-fallback-2026-06-01"} : {}),
        },
        body: JSON.stringify({
          model,
          max_tokens: cappedMax,
          ...(systemPayload ? {system: systemPayload} : {}),
          ...(isFable ? {fallbacks: [{model: "claude-opus-4-8"}]} : {}),
          messages: allMessages,
        }),
      });
    } catch {
      res.status(502).json({error: "Servizio AI non raggiungibile"});
      return;
    }

    const data = await anthropicRes.json() as {
      content?: Array<{type: string; text?: string}>;
      model?: string;
      usage?: {input_tokens?: number; output_tokens?: number;
        cache_read_input_tokens?: number;
        cache_creation_input_tokens?: number};
      error?: {message?: string};
      stop_reason?: string;
    };

    if (!anthropicRes.ok) {
      // Mai inoltrare dettagli interni/chiavi: messaggio pulito + status
      const status = anthropicRes.status === 429 ? 429 : 502;
      res.status(status).json({
        error: "AI_ERROR",
        message: anthropicRes.status === 429 ?
          "Servizio AI momentaneamente sovraccarico. Riprova tra poco." :
          `Errore del servizio AI (${anthropicRes.status}).`,
        detail: (data.error?.message || "").slice(0, 200),
      });
      return;
    }

    // --- 6. Log costi (fire-and-forget) ---
    // `data.model` è il modello che ha DAVVERO risposto (può essere il
    // fallback Opus): costi e log seguono quello, non quello richiesto.
    const servedModel = data.model || model;
    const usage = data.usage || {};
    const costUsd = estimateCostUsd(servedModel, usage);
    usageRef.set({
      inputTokens: admin.firestore.FieldValue
        .increment(usage.input_tokens || 0),
      outputTokens: admin.firestore.FieldValue
        .increment(usage.output_tokens || 0),
      cacheReadTokens: admin.firestore.FieldValue
        .increment(usage.cache_read_input_tokens || 0),
      costUsd: admin.firestore.FieldValue.increment(costUsd),
      lastFeature: feature || "generic",
      lastModel: servedModel,
    }, {merge: true}).catch(() => undefined);

    let text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text || "")
      .join("");
    // Prefill richiesto ma non inoltrato (Fable): il client lo riantepone
    // comunque, quindi se la risposta inizia già col prefill lo leviamo.
    if (prefill && !usePrefill && text.startsWith(prefill)) {
      text = text.slice((prefill as string).length);
    }

    res.json({
      text, // grezzo: è il client a ricomporre l'eventuale prefill
      model: servedModel,
      stopReason: data.stop_reason,
      usage: {
        inputTokens: usage.input_tokens || 0,
        outputTokens: usage.output_tokens || 0,
        cacheReadTokens: usage.cache_read_input_tokens || 0,
      },
    });
  }
);
