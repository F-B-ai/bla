# 05 — API, SDK & Integrazioni

> Riferimenti: [00-strategia](./00-strategia.md) · [01-architettura](./01-architettura.md) · [02-dati-digital-twin](./02-dati-digital-twin.md) · [03-ai-engine](./03-ai-engine.md) · [04-ux-design](./04-ux-design.md) · [06-sicurezza-compliance](./06-sicurezza-compliance.md) · [07-roadmap-milestones](./07-roadmap-milestones.md)
>
> **Orizzonti:** H0 "Fondamenta" (0–3 mesi, 1 persona + AI, budget ~0) · H1 "Prodotto" (3–12 mesi, clienti white-label) · H2 "Piattaforma" (12–36 mesi, team + capitale)

---

## 0. La tesi in una riga

**Non costruiamo "un'API pubblica": costruiamo l'API che l'app stessa usa, e a un certo punto la apriamo.** Un solo contratto, due consumatori (prima noi, poi i partner). Tutto il resto di questo documento discende da qui.

---

## 1. Filosofia: dogfooding prima, pubblicazione poi — **H0→H2**

### 1.1 Perché "API interna = API pubblica"

Il modo mediocre di fare API nel settore: l'app parla col database in modo suo, poi un giorno si costruisce "l'API per i partner" come progetto separato — che nessuno internamente usa, che diverge dal prodotto a ogni release, e che muore di manutenzione. È il destino dell'80% delle API B2B.

Il modo 10x: **l'app è il primo client dell'API**. Se un endpoint è rotto, l'app è rotta, e ce ne accorgiamo in minuti, non quando un partner apre un ticket. Quando in H2 pubblichiamo, non "lanciamo un'API": alziamo una flag su endpoint battuti in produzione da mesi.

Vincolo di realtà (da [01-architettura](./01-architettura.md) §2): **non tutto passa dall'API**. Le letture semplici e il realtime (chat, liste) restano su SDK Firestore diretto con regole per ruolo — gratuite, offline-first, già funzionanti. L'API layer copre **scritture sensibili, denaro, AI, eventi del twin**. La conseguenza per questo documento: *la superficie pubblica H2 coincide con la superficie API interna H1*, e le letture che oggi l'app fa via SDK avranno un equivalente GET nell'API pubblica implementato una volta sola, quando serve a un partner pagante — non prima.

### 1.2 Le tappe

| Tappa | Orizzonte | Cosa esiste | Chi la consuma |
|---|---|---|---|
| **AI proxy** (`POST /v1/ai/*`) | H0 | Prima Function in assoluto (01 §2.2): chiude la falla della chiave Anthropic esposta | Solo l'app |
| **API interne su rotte /v1** | H1 | Payments, events, checkins, webhook dietro Functions v2; spec OpenAPI come fonte di verità | App + istanze white-label |
| **API pubblica** | H2 | Stesse rotte esposte via Cloud API Gateway, API key partner, scopes, quote per tenant | Partner (palestre, cliniche, aziende), integratori |

**Regola vincolante da H1:** ogni nuova rotta nasce già nella spec OpenAPI con naming pubblico (`/v1/persons/...`, non `/getStudentData`). Il costo è zero oggi; l'alternativa (rinominare e riversionare tutto in H2) è un progetto di mesi.

### 1.3 La spec OpenAPI è il contratto, non la documentazione

Un file `openapi.yaml` (OpenAPI 3.1) in repo, versionato con il codice. Da esso si **generano**: i tipi TypeScript condivisi client/server (via `openapi-typescript`), la validazione runtime delle request (zod, condiviso con lo schema eventi di [02](./02-dati-digital-twin.md) §3), l'SDK (§5), la doc pubblica H2 (rendering statico, es. Scalar/Redoc su Firebase Hosting — zero costi). Scrivere prima lo yaml e generare il resto è l'unico modo in cui 1 persona mantiene un contratto coerente: la doc scritta a mano diverge sempre.

---

## 2. Design REST dell'API v1

### 2.1 Risorse e principi — **H1**

Risorse (nomi al plurale, kebab-case nei path, snake_case nei payload — coerente con `human_events`):

`persons` · `twins` · `events` · `workouts` (template/programmi) · `plans` (programmi assegnati a una persona) · `sessions` (allenamenti eseguiti/live) · `checkins` (presenze palestra) · `wellness` (Stato ESSĒRE) · `assessments` (posturale, composizione) · `payments` · `tenants` · `webhooks` · `api-keys` · `ai` (proxy, non-REST).

**`persons`, non `users`**: l'utente Firebase è un account di accesso; la *persona* è il soggetto del twin ([02](./02-dati-digital-twin.md) §1). Un partner clinica in H2 ragiona su persone, non su account. La mappatura account→person vive nel modulo identity (01 §4).

| Principio | Scelta | Perché / alternativa scartata |
|---|---|---|
| Stile | REST + JSON. Un solo endpoint non-REST: `POST /v1/ai/messages` (streaming SSE) | GraphQL scartato (01, "Cosa NON faremo"): authz per campo e caching complessi, zero problemi nostri risolti. gRPC scartato: i partner sono palestre e gestionali, non team infra |
| Versioning | Path `/v1`. Modifiche **additive** (campi nuovi, endpoint nuovi) senza bump; breaking → `/v2` con 12 mesi di convivenza | Header versioning (invisibile, i partner lo sbagliano); versione per-risorsa (matrice di compatibilità ingestibile da 1 persona) |
| Paginazione | Cursor-based: `?limit=50&page_token=...` → risposta `{data: [...], next_page_token}` | Offset/`page=3` scartato: Firestore non lo supporta nativamente (costa N letture saltate) e si rompe con inserimenti concorrenti. Il cursore è un `startAfter` Firestore codificato base64: gratis |
| Filtri | Query param espliciti e limitati (`?from=&to=&type=&person_id=`), mai un query language | Ogni filtro esposto è un indice composito Firestore da mantenere ([02](./02-dati-digital-twin.md) §7.1): superficie piccola e deliberata |
| Idempotenza | Header `Idempotency-Key` (UUID client) obbligatorio sui POST che creano denaro o eventi; il server conserva la risposta 24h (collection `idempotencyKeys`, TTL) e la rigioca su retry | Senza: un retry di rete crea due rate o due check-in. Con webhook + retry (§4) l'idempotenza non è un lusso, è igiene |
| Timestamp | ISO 8601 UTC ovunque (`ts`), timezone della palestra solo per rendering | Epoch millis scartato: i partner li sbagliano; coerenza con `human_events` |
| Envelope | Nessun envelope sui singoli oggetti; liste con `{data, next_page_token}` | `{success: true, data: ...}` ovunque è rumore; lo status HTTP esiste già |

### 2.2 Errori standard — **H1**

Formato **RFC 9457 (`application/problem+json`)** — standard, parsabile, e le librerie lo capiscono:

```json
{
  "type": "https://api.essere.app/errors/quota-exceeded",
  "title": "Quota AI mensile del tenant esaurita",
  "status": 429,
  "detail": "Il tenant mml-01 ha consumato 100% della quota AI di luglio.",
  "instance": "/v1/ai/messages",
  "request_id": "req_8f3a...",
  "retry_after_seconds": 86400
}
```

Codici usati e significato fisso: `400` payload invalido (con `errors[]` campo-per-campo da zod) · `401` token assente/scaduto · `403` ruolo o scope insufficiente · `404` risorsa inesistente **o non visibile al chiamante** (mai rivelare esistenza cross-tenant) · `409` conflitto (idempotency key riusata con payload diverso) · `422` valido ma non processabile (es. rata su piano chiuso) · `429` rate/quota · `5xx` nostro problema, sempre con `request_id` loggato.

### 2.3 Tabella endpoint v1 (superficie completa)

Legenda auth — **U**: Firebase ID token (utente, ruolo verificato server-side) · **K**: API key partner con scope (H2) · **S**: solo ruoli staff (owner/manager/coach) · colonna H = orizzonte di implementazione.

| # | Metodo e path | Descrizione | Auth | H |
|---|---|---|---|---|
| 1 | `POST /v1/ai/messages` | Proxy AI (chat coach, assistente) — SSE | U | H0 |
| 2 | `POST /v1/ai/vision` | Analisi foto (posturale, composizione) via riferimento Storage | U | H0 |
| 3 | `GET /v1/persons` | Lista persone del tenant (filtri: stato, coach) | U·S / K:`persons:read` | H1 |
| 4 | `POST /v1/persons` | Crea persona (onboarding allievo) | U·S / K:`persons:write` | H1 |
| 5 | `GET /v1/persons/{id}` | Dettaglio persona | U / K:`persons:read` | H1 |
| 6 | `PATCH /v1/persons/{id}` | Aggiorna anagrafica | U·S / K:`persons:write` | H1 |
| 7 | `DELETE /v1/persons/{id}` | Cancellazione GDPR (soft + purge asincrono, [02](./02-dati-digital-twin.md) §6) | U·S(owner) | H1 |
| 8 | `GET /v1/persons/{id}/twin` | Stato derivato del twin (readiness, ACWR, aderenza, churn_risk) | U / K:`twin:read` | H1 |
| 9 | `GET /v1/persons/{id}/twin/history` | Serie temporale stati derivati (per grafici partner) | K:`twin:read` | H2 |
| 10 | `POST /v1/events` | Ingest evento `human_events` (tassonomia chiusa 02 §3) | U / K:`events:write` | H1 |
| 11 | `POST /v1/events:batch` | Ingest batch ≤500 eventi (sync wearable, import) | U / K:`events:write` | H1 |
| 12 | `GET /v1/persons/{id}/events` | Timeline eventi persona (filtri type, from/to) | U / K:`events:read` | H1 |
| 13 | `GET /v1/events/{id}` | Singolo evento | U / K:`events:read` | H1 |
| 14 | `GET /v1/workouts` | Lista template/programmi | U | H1 |
| 15 | `POST /v1/workouts` | Crea programma | U·S | H1 |
| 16 | `GET /v1/workouts/{id}` | Dettaglio programma | U | H1 |
| 17 | `PATCH /v1/workouts/{id}` | Modifica programma | U·S | H1 |
| 18 | `DELETE /v1/workouts/{id}` | Archivia programma | U·S | H1 |
| 19 | `POST /v1/workouts/{id}/assign` | "Usa per allievo" → crea `plan` | U·S | H1 |
| 20 | `GET /v1/persons/{id}/plans` | Programmi assegnati alla persona | U / K:`plans:read` | H1 |
| 21 | `GET /v1/plans/{id}` · `PATCH` | Dettaglio / progressione carichi | U | H1 |
| 22 | `POST /v1/sessions` | Apri/logga sessione live workout | U | H1 |
| 23 | `PATCH /v1/sessions/{id}` | Aggiorna/chiudi sessione (emette `workout.completed`) | U | H1 |
| 24 | `GET /v1/persons/{id}/sessions` | Storico allenamenti | U / K:`sessions:read` | H1 |
| 25 | `POST /v1/checkins` | Check-in palestra (QR/codice) → `gym.checkin` | U / K:`checkins:write` | H1 |
| 26 | `GET /v1/checkins` | Accessi del giorno/periodo (vista owner, tornelli partner) | U·S / K:`checkins:read` | H1 |
| 27 | `POST /v1/persons/{id}/wellness` | Check-in Stato ESSĒRE → score + `wellness.checkin_submitted` | U | H1 |
| 28 | `GET /v1/persons/{id}/wellness` | Serie check-in + trend (from/to) | U / K:`wellness:read` | H1 |
| 29 | `GET /v1/wellness/attention` | Lista "da attenzionare" (vista coach) | U·S / K:`wellness:read` | H1 |
| 30 | `POST /v1/persons/{id}/assessments` | Crea assessment (posturale/composizione; foto già su Storage) | U·S | H1 |
| 31 | `GET /v1/persons/{id}/assessments` | Storico assessment + delta | U / K:`assessments:read` | H1 |
| 32 | `GET /v1/assessments/{id}` | Dettaglio (findings normalizzati, 02 §2) | U / K:`assessments:read` | H1 |
| 33 | `GET /v1/payments` | Piani/rate del tenant (filtri: overdue, person) | U·S / K:`payments:read` | H1 |
| 34 | `POST /v1/payments` | Crea piano di pagamento (validazione server, 01 tappa 5) | U·S | H1 |
| 35 | `GET /v1/payments/{id}` | Dettaglio piano/rate | U·S / K:`payments:read` | H1 |
| 36 | `POST /v1/payments/{id}/installments/{n}/record` | Registra incasso rata (Idempotency-Key obbligatoria) | U·S | H1 |
| 37 | `POST /v1/payments/{id}/remind` | Genera/invia promemoria (link WhatsApp oggi, API §7.2 domani) | U·S | H1 |
| 38 | `GET /v1/tenant` · `PATCH /v1/tenant` | Config istanza corrente (brand, info palestra, listino) | U·S(owner) | H1 |
| 39 | `GET /v1/tenants` · `POST /v1/tenants` | Provisioning corsia multi-tenant (01 §3) | interno piattaforma | H2 |
| 40 | `GET/POST /v1/webhooks` · `DELETE /v1/webhooks/{id}` | Gestione endpoint webhook del tenant | U·S(owner) / K:`webhooks:manage` | H1* |
| 41 | `POST /v1/webhooks/{id}/test` | Invia evento di prova firmato | U·S(owner) | H1* |
| 42 | `POST /v1/api-keys` · `GET` · `DELETE /v1/api-keys/{id}` | Gestione chiavi partner (mostrata una volta, hash a db) | U·S(owner) | H2 |
| 43 | `GET /v1/exports/persons/{id}` | Export GDPR completo (job asincrono → URL firmato) | U / K:`exports:read` | H1 |
| 44 | `GET /v1/health` | Liveness + versione deploy | pubblico | H0 |

\* H1 se un cliente white-label lo chiede (es. tornello che notifica il gestionale); altrimenti slitta a H2. Il costo marginale è basso perché il dispatcher (§4) serve anche esigenze interne.

**Regola sulla spec (correzione anti-mediocrità):** in `openapi.yaml` entrano SOLO le rotte implementate (in H1: le ~15 di scritture sensibili — ai, payments, events, checkins, wellness — più `/v1/health`). Le altre ~29 righe di questa tabella sono **backlog con naming già deciso**, non un contratto: mantenerle nella spec senza implementazione significherebbe documentazione speculativa che diverge — il difetto esatto che §1.1 attribuisce all'80% delle API B2B. Il documento di naming convention (questa tabella + §1.2) fissa nomi e modelli una volta sola; una rotta si promuove dalla tabella alla spec nel momento in cui il codice che la serve va in produzione, mai prima.

---

## 3. Autenticazione e autorizzazione

### 3.1 App proprie: Firebase ID token — **H0**

Le app (PWA, iOS, Android, dashboard) mandano `Authorization: Bearer <Firebase ID token>`. Il layer API lo verifica con Admin SDK, risolve ruolo e `tenant_id` (custom claims da H1 — oggi il ruolo sta in `users/{uid}`, i claims eliminano una lettura Firestore per request). Nessuna sessione server, nessun refresh da gestire: lo fa l'SDK Firebase. **Alternativa scartata:** un sistema di sessioni proprio — reinventare male ciò che Firebase Auth fa gratis.

### 3.2 Partner server-to-server: API key con scopes — **H2**

Per palestre/cliniche/gestionali che integrano macchina-a-macchina:

- Chiave `esk_live_...` / `esk_test_...` (prefisso riconoscibile per secret-scanning), mostrata **una sola volta** alla creazione, a db solo hash (SHA-256). Header `Authorization: Bearer esk_live_...`.
- Ogni chiave: `tenant_id` (una chiave vede UN tenant, mai cross-tenant), lista scopes, stato, `last_used_at`, revoca immediata.
- **Scopes** (grana risorsa:verbo, tabella §2.3): `persons:read|write`, `twin:read`, `events:read|write`, `wellness:read`, `checkins:read|write`, `sessions:read`, `plans:read`, `assessments:read`, `payments:read`, `exports:read`, `webhooks:manage`. Default alla creazione: **nessuno** — si aggiunge ciò che serve. Nota deliberata: niente `twin:write` — lo stato derivato si scrive solo via eventi; e niente `payments:write` per chiavi partner finché non esiste un caso d'uso reale: il denaro si muove solo da utenti autenticati.

**OAuth2 client-credentials** (token endpoint, JWT a vita breve) si aggiunge **solo** quando un cliente enterprise lo esige per policy interna: è la stessa authz con più cerimonia. **Alternativa scartata:** OAuth2 authorization-code per far accedere utenti finali ad app di terzi ("Login con ESSĒRE") — è un prodotto a sé (consent screen, revoche, refresh token) e non ha domanda; se in H2 arriverà, la base scopes è pronta.

### 3.3 Difesa in profondità

Il controllo autorizzativo vive nel layer API (middleware unico: token→ruolo/scope→tenant→risorsa), **e** le regole Firestore restano attive sotto ([06-sicurezza-compliance](./06-sicurezza-compliance.md)): se un bug nel layer API passa, le regole sono la seconda rete. Le collezioni scritte solo dal server (payments H1) hanno `write: deny` per i client.

---

## 4. Webhook in uscita — **H1\*/H2**

### 4.1 Perché e cosa

Il partner tipo (gestionale palestra, clinica, sistema HR aziendale) non vuole fare polling: vuole essere avvisato. I webhook sono il modo in cui l'ecosistema ESSĒRE si aggancia al mondo, e nascono **gratis** dall'event log: il dispatcher è un consumer di `human_events` (trigger Firestore in H1, Pub/Sub in H2 — 01 §4.1), non un sistema parallelo.

Eventi esposti v1 (sottoinsieme *stabile e ripulito* della tassonomia interna — non si espone mai la tassonomia interna 1:1, così può evolvere senza rompere i partner):

| Evento webhook | Origine interna | Payload (estratto) | Caso d'uso partner |
|---|---|---|---|
| `member.checked_in` | `gym.checkin` | person_id, ts, method | Tornelli, presenze HR aziendale |
| `wellness.recorded` | `wellness.checkin_submitted` | person_id, score, ts (mai i valori grezzi mente-corpo senza scope `wellness:read`) | Dashboard clinica |
| `wellness.attention_flagged` | derivato (twin) | person_id, motivo sintetico | Alert al gestionale/coach esterno |
| `assessment.completed` | `posture.assessed`, `body.composition_estimated` | person_id, tipo, assessment_id (i dettagli si leggono via GET con scope) | Cartella clinica |
| `workout.completed` | `workout.completed` | person_id, session_id, durata | CRM, engagement |
| `payment.recorded` / `payment.overdue` | `payment.*` | plan_id, rata, importo | Contabilità del cliente |

Payload minimale + ID: il webhook **notifica**, l'API **descrive**. Così un webhook intercettato vale poco e i dettagli restano dietro scope (pattern "thin payload" — deliberato, non pigrizia).

### 4.2 Firma e consegna

- **Firma:** header `X-Essere-Signature: t=<unix_ts>,v1=<hex>` con `v1 = HMAC-SHA256(secret_endpoint, t + "." + body_raw)`. Secret per-endpoint, generato alla creazione, ruotabile (periodo di doppia firma `v1`+`v2`). Il partner rifiuta se `|now−t| > 5 min` (anti-replay). È lo schema Stripe: documentato ovunque, i partner lo conoscono già — scartato inventarne uno nostro.
- **Consegna e retry:** POST JSON, timeout 10s, successo = 2xx. Retry con backoff esponenziale + jitter: ~1 min, 5 min, 30 min, 2 h, 12 h (5 tentativi). Implementazione su **Cloud Tasks** (retry, scheduling e dedupe gestiti dalla piattaforma, free tier 1M/mese) — scartata una coda fatta in casa su Firestore: è lavoro gratis fatto male.
- **Igiene:** `event_id` univoco nel payload (il partner deduplica — la consegna è *at-least-once*); ordine **non garantito** (dichiarato in doc: chi vuole l'ordine usa `ts`); endpoint disabilitato automaticamente dopo 7 giorni di soli fallimenti, con email all'owner; log ultime 100 consegne per endpoint visibile in dashboard (`GET /v1/webhooks/{id}` include `recent_deliveries`).

---

## 5. SDK — **H2 (fondazioni H1)**

### 5.1 Strategia: uno solo, generato, TypeScript

- **TypeScript first**: i partner realistici (gestionali web, integratori, la nostra stessa dashboard) vivono in JS/TS. Un solo SDK curato batte cinque SDK morti.
- **Generato dalla spec OpenAPI** (openapi-typescript + un wrapper sottile scritto a mano ~300 righe: auth, retry con backoff su 429/5xx rispettando `retry_after`, paginazione automatica, verifica firma webhook). Lo strato generato si rigenera a ogni release della spec; il wrapper cambia raramente. **Scartato** l'SDK interamente a mano (diverge dalla spec: garantito) e i generatori "full client" pesanti (codice illeggibile che poi si patcha a mano).
- Altri linguaggi (Python per data team di cliniche H2): si pubblica la spec e si indica il generatore; SDK ufficiale solo con domanda pagante.
- Dogfooding anche qui: **la dashboard coach/manager H1–H2 usa l'SDK**, quindi l'SDK è testato in produzione da noi prima che da chiunque.

### 5.2 Esempio d'uso

```typescript
import { Essere } from "@essere/sdk";

const essere = new Essere({ apiKey: process.env.ESSERE_API_KEY }); // scopes: checkins:write, wellness:read

// Tornello: registra ingresso (idempotente: il retry di rete non duplica)
await essere.checkins.create(
  { person_id: "prs_9k2f", method: "external_turnstile" },
  { idempotencyKey: crypto.randomUUID() }
);

// Dashboard clinica: readiness sotto soglia negli ultimi 7 giorni
for await (const w of essere.wellness.list({ person_id: "prs_9k2f", from: "2026-06-27" })) {
  if (w.score < 40) notifyPhysio(w);
}

// Webhook receiver (Express): verifica firma e deduplica
app.post("/hooks/essere", (req, res) => {
  const event = essere.webhooks.verify(req.rawBody, req.headers["x-essere-signature"], WEBHOOK_SECRET);
  if (!seen(event.event_id)) handle(event);   // at-least-once ⇒ dedupe a carico del ricevente
  res.sendStatus(200);
});
```

---

## 6. Wearable: HealthKit e Health Connect — **H1** (cloud di terzi: H2 opzionale)

### 6.1 La scelta strutturale: on-device, non aggregatori cloud

Due strade per i dati wearable:

| Criterio | **On-device: HealthKit (iOS) + Health Connect (Android)** — scelta | Aggregatore cloud (Terra, Spike, ROOK) |
|---|---|---|
| Costo | **0€** per sempre | ~0,4–1 $/utente/mese: a 5.000 utenti H2 sono 24–60 k$/anno che **distruggono il margine white-label** |
| Copertura | Tutto ciò che scrive su Health(Kit\|Connect): Apple Watch, Garmin, Polar, Samsung; Whoop e Oura **con riserva**: esportano un sottoinsieme (Whoop non pubblica recovery/HRV completi; copertura Health Connect parziale) — **da verificare su device reali PRIMA di usarlo in demo** ("il tuo Whoop lo leggiamo" è un claim che crolla alla prima demo con un titolare whoopato se non testato) | Copertura simile + API dirette vendor |
| Dati | Serie complete on-device; niente dati server-to-server senza app installata | Dati anche senza app aperta (server push) |
| Privacy/GDPR | I dati sanitari restano sul device finché l'utente non consente l'invio di eventi derivati: posizione difendibilissima ([06](./06-sicurezza-compliance.md)) | Terzo processor in mezzo a dati sanitari |
| Vincolo | **Richiede app nativa sugli store** (la PWA non accede a HealthKit/Health Connect) | Funziona anche solo server-side |
| Effort | 2 moduli nativi (Expo ha librerie mature per entrambi), 1 mapping | 1 integrazione API + contratto + billing |

Il vincolo "serve l'app nativa" non è un contro: è **la ragione strategica n.1 per pubblicare sugli store** (01 §5, [07-roadmap](./07-roadmap-milestones.md)) — insieme alle push affidabili. Ed è coerente col cuneo: lo Stato ESSĒRE funziona *senza* hardware, i wearable lo *arricchiscono*. Whoop/Oura richiedono il loro hardware; noi ingoiamo il loro output.

### 6.2 Dati letti e mappatura su `human_events`

Tassonomia già prevista in [02](./02-dati-digital-twin.md) §3 (`sleep.recorded`, `hrv.recorded`): qui la mappatura completa. Ogni evento porta `source` (es. `healthkit:apple_watch`, `health_connect:garmin`) e `confidence` — il twin pondera per fonte.

| Dato | HealthKit | Health Connect | Evento `human_events` | Payload (estratto) | Uso nel twin |
|---|---|---|---|---|---|
| Sonno | `sleepAnalysis` (stadi) | `SleepSessionRecord` | `sleep.recorded` (1/notte, aggregato) | inizio/fine, durata, stadi se presenti | Readiness: sostituisce/integra l'auto-report sonno del check-in |
| HR riposo | `restingHeartRate` | `RestingHeartRateRecord` | `hr.resting_recorded` (1/giorno) | bpm, ts | Baseline recupero |
| HRV | `heartRateVariabilitySDNN` | `HeartRateVariabilityRmssdRecord` | `hrv.recorded` (1/giorno: media notturna) | valore, metrica (SDNN/RMSSD **dichiarata**: non confrontabili tra loro) | Readiness (z-score vs baseline individuale 60gg, formula canonica [03 §2.1](./03-ai-engine.md)) |
| Passi | `stepCount` | `StepsRecord` | `steps.recorded` (1/giorno) | totale | Comportamento / NEAT |
| Workout esterni | `HKWorkout` | `ExerciseSessionRecord` | `workout.external_recorded` | tipo, durata, kcal, HR medio | Carico acuto ACWR: la corsa domenicale entra nel carico anche se non programmata da noi |

**Regola anti-diluvio:** si scrivono **aggregati giornalieri/di sessione**, mai campioni grezzi (un HR a 1Hz sono 86.400 doc/giorno/utente: costo Firestore folle e zero valore per il twin). Il grezzo resta sul device, dov'è già.

### 6.3 Consenso granulare e sync

- **Consenso a due livelli**: (1) permessi OS per categoria (li impone comunque Apple/Google), (2) consenso ESSĒRE per categoria registrato nel twin ([02](./02-dati-digital-twin.md) §6): l'utente può dare i passi e negare il sonno. Ogni categoria revocabile: alla revoca si smette di leggere; i dati storici restano (sono suoi, esportabili) salvo cancellazione esplicita. UI in [04-ux-design](./04-ux-design.md).
- **Sync**: iOS — `HKAnchoredObjectQuery` con anchor persistito + background delivery (risveglio all'arrivo di nuovi dati; Apple non garantisce puntualità: dichiarato, non nascosto) + catch-up all'apertura app. Android — Health Connect changes-token + `WorkManager` periodico (15 min minimo) + catch-up all'apertura. In entrambi i casi il device invia `POST /v1/events:batch` con `Idempotency-Key` = hash(anchor/token): il retry non duplica.
- **Conflitti**: se esistono sia auto-report sia wearable per il sonno, vince il wearable *nel calcolo readiness* ma entrambi gli eventi restano nel log (fonti diverse, mai sovrascrittura — principio 02 §0).

### 6.4 API cloud di terzi (Whoop / Oura / Garmin) — **H2 opzionale**

Che cosa aggiungerebbero rispetto a HealthKit/Health Connect: dati **senza che l'utente apra la nostra app** (server push), metriche proprietarie (strain Whoop, readiness Oura), e copertura per chi nega i permessi Health.

| Vendor | Costo API | Effort | Verdetto |
|---|---|---|---|
| Oura API v2 | Gratuita (OAuth2) | Basso: REST pulita | Prima candidata se i numeri la giustificano |
| Whoop API | Gratuita (OAuth2, approvazione developer) | Basso-medio | Seconda |
| Garmin Health API | Gratuita ma con processo di approvazione business | Medio: push proprietario | Solo su richiesta cliente |

**Analisi onesta:** ogni integrazione = OAuth per-utente, token refresh, webhook vendor, rate limit vendor, breaking change vendor — ~2–4 settimane l'una più manutenzione perpetua, per dati **già ottenibili al 90% via Health(Kit|Connect)** quando l'utente ha la nostra app (e i nostri utenti *hanno* la nostra app: è il prodotto). Il 10% mancante (metriche proprietarie, sync senza app aperta) non vale il costo in H1. **Trigger H2**: un cliente B2B (clinica/azienda) che lo chiede con contratto, o >20% di utenti attivi con Whoop/Oura rilevato via survey. Prima: no. **Scartato anche qui l'aggregatore** (Terra/Spike) come scorciatoia: il costo per utente è strutturale e permanente, l'integrazione diretta è un costo una-tantum.

---

## 7. Integrazioni business

### 7.1 Stripe — **H1** (canoni white-label) → **H2** (pagamenti allievi)

Due problemi diversi, due prodotti Stripe diversi, due tempi:

| Fase | Problema | Soluzione | Perché così |
|---|---|---|---|
| H1 | Incassare i canoni dei clienti white-label (5–15 clienti, fattura mensile/annuale) | **Stripe Billing con Payment Links / Customer Portal**: zero codice, il cliente si gestisce carta e ricevute da solo. Webhook `invoice.payment_failed` → alert + kill-switch licenza (`config/license`, già esistente) dopo grace period | A questo volume, integrare l'API Billing è over-engineering; il link si crea dalla dashboard Stripe in 5 minuti. Scartato il bonifico manuale come default: il churn amministrativo (rincorrere bonifici) è tempo del founder |
| H2 | Le palestre clienti incassano dagli allievi *dentro* l'app (oggi: rate tracciate a mano in `payments`) | **Stripe Connect (Standard)**: ogni palestra ha il suo account Stripe collegato, il denaro va **direttamente a lei** (mai sui nostri conti: niente obblighi da istituto di pagamento), ESSĒRE prende una application fee opzionale | Connect Standard scarica su Stripe KYC, payout e compliance della palestra. Scartato Connect Custom (onboarding e supporto a carico nostro) e scartato incassare noi e girare (licenze PSD2) |

Vincolo store già deciso in 01: i pagamenti per servizi fisici (abbonamento palestra, PT) sono **esenti IAP** su iOS/Android — si paga con Stripe nel web checkout senza il 30% ad Apple. Il modello dati non cambia: una rata pagata via Stripe produce lo stesso `payment.recorded` di una registrata a mano — l'API (§2.3 #36) è la stessa, Stripe è solo una *fonte* in più.

### 7.2 WhatsApp — **oggi link manuali, H1 valutazione API con soglia numerica**

Oggi: promemoria rate via link `wa.me` precompilati — **manuale ma gratis e col numero personale del coach** (che gli allievi conoscono: non è un difetto, è calore umano). Il salto a **WhatsApp Business Platform** (via BSP: 360dialog ~€20–50/mese fisso o Twilio pay-per-use; template pre-approvati; conversazioni *utility* in Italia ~€0,03–0,05) si fa **solo oltre soglia**: >100 promemoria/mese per tenant o >2 clienti white-label che lo chiedono. Sotto soglia, il costo fisso e la burocrazia template superano il beneficio; il layer è comunque pronto — l'endpoint `/payments/{id}/remind` (§2.3 #37) oggi genera il link, domani chiama il BSP: **il contratto API non cambia**, cambia l'implementazione. Scartata l'API Cloud Meta diretta senza BSP: gestione numero/verifiche/webhook per risparmiare pochi euro al mese.

### 7.3 Fatturazione elettronica italiana (SDI) — nota, **non** roadmap

Due piani distinti, da non confondere:
1. **Fatture di ESSĒRE ai clienti white-label**: obbligo SDI nostro. Si risolve col gestionale del commercialista o **Fatture in Cloud** (~€10/mese); a 5–15 fatture/mese, integrare le loro API è facoltativo, non necessario.
2. **Fatture/ricevute della palestra ai suoi allievi**: NON diventiamo noi il software di fatturazione (regime forfettario, corrispettivi, ASD/SSD: un dominio fiscale intero). In H2, se i clienti lo chiedono, si fa un **connettore export** verso Fatture in Cloud/Aruba via API — mai un motore SDI proprio. Le "ricevute" attuali in-app restano ricevute di cortesia, dichiarate come tali.

---

## 8. Rate limiting, quote per tenant, SLA

### 8.1 Rate limiting — **H0 (AI) → H2 (pubblico)**

Il primo rate limiter nasce in H0 dentro l'AI proxy (01 §2.2) perché lì il rischio è denaro vivo. Estensione al resto per gradi:

| Chiamante | Limite | Meccanica | H |
|---|---|---|---|
| Utente app — endpoint AI | 20 msg/h utente + budget mensile per tenant | Contatore in Firestore (transazione su doc per utente/ora): a questa scala costa centesimi; Redis/Memorystore (~€30/mese fissi) solo quando i numeri lo chiedono | H0 |
| Utente app — REST | 120 req/min per utente (generoso: l'app legge via SDK) | Middleware condiviso nel layer API | H1 |
| API key partner | Default 60 req/min, burst 120; per-chiave configurabile | Token bucket; header `X-RateLimit-Limit/-Remaining/-Reset` + `Retry-After` su 429 | H2 |
| Webhook in ingresso (Stripe ecc.) | Verifica firma, poi accodamento | Cloud Tasks assorbe i burst | H1 |

### 8.2 Quote per tenant — **H1**

Le quote sono **voci di listino**, non solo protezione ([00-strategia](./00-strategia.md)): budget AI mensile (già da H0, log `aiUsage` per tenant), GB Storage (foto assessment — la lezione della quota Spark), utenti attivi, chiamate API partner/mese (H2), endpoint webhook (H2). Superamento: mai interruzione secca del servizio core — degradazione dichiarata (AI risponde "budget esaurito, riprova domani o chiedi upgrade all'owner") + alert owner + upsell. Il kill-switch totale resta solo per morosità licenza (esistente).

### 8.3 SLA — onestà per orizzonte

| Orizzonte | Impegno | Perché |
|---|---|---|
| H0–H1 | **Best effort dichiarato per iscritto** nel contratto white-label: target 99,5% *indicativo*, canale diretto col founder, RPO = backup giornaliero ([02](./02-dati-digital-twin.md) §7) | Promettere uno SLA con penali quando l'on-call è 1 persona è una menzogna commerciale che si paga alla prima notte storta. I clienti H1 comprano il prodotto e l'accesso al founder, non le penali |
| H2 | SLA formale 99,5% con crediti; status page pubblica (Better Stack o simile, ~0–20€/mese); post-mortem pubblici sugli incidenti maggiori | Con team e on-call reale diventa promessa mantenibile — e la trasparenza da status page è un'arma di vendita contro i gestionali legacy che non la hanno |

Da subito (H0, gratis): uptime check esterno su `GET /v1/health` + budget alert GCP — sapere di essere giù prima che lo dica un cliente.

---

## 9. Decisioni chiave

| # | Decisione | Perché | Alternativa scartata |
|---|---|---|---|
| 1 | **Un solo contratto: API interna = API pubblica** (dogfooding H1, apertura H2 dietro flag/Gateway) | L'API usata dall'app ogni giorno non può marcire; pubblicare = alzare una flag, non lanciare un progetto | "API partner" costruita a parte in H2 (diverge dal prodotto e muore di manutenzione) |
| 2 | **OpenAPI 3.1 come fonte di verità**: tipi, validazione zod, SDK e doc generati dallo yaml | 1 persona non mantiene 4 artefatti allineati a mano; il generatore sì | Doc scritta a mano (diverge sempre); nessuna spec ("il codice è il contratto": impubblicabile) |
| 3 | **REST versionato a path (`/v1`), cursor pagination, RFC 9457, `Idempotency-Key` su POST sensibili** | Standard noiosi e conosciuti = partner integrati in ore; il cursore è nativo Firestore | GraphQL (authz/caching complessi, zero problemi nostri risolti); offset pagination (rotta su Firestore) |
| 4 | **Auth a due binari**: Firebase ID token per le app (H0), API key hashate con scopes per-tenant per i partner (H2); OAuth2 client-credentials solo su richiesta enterprise | Firebase fa gratis i token; le API key con scopes coprono il 95% dei partner reali (gestionali) con 1/10 della complessità | Sessioni proprie; OAuth2 completo day-1; "Login con ESSĒRE" senza domanda |
| 5 | **Webhook = consumer dell'event log** `human_events`, firma HMAC stile Stripe, consegna via Cloud Tasks, thin payload | Il log esiste già (02): il dispatcher è ~1 modulo, non un sistema; lo schema-firma Stripe è già noto ai partner; Cloud Tasks regala retry/backoff | Coda retry fatta in casa su Firestore; payload "grassi" con dati sanitari dentro il webhook |
| 6 | **Wearable via HealthKit/Health Connect on-device, aggregati giornalieri su `events:batch`; niente aggregatori cloud; vendor API dirette solo in H2 con trigger numerici** | Costo 0€ strutturale vs 0,4–1 $/utente/mese che ucciderebbe il margine white-label; privacy difendibile; copre ~90% del valore; motiva la pubblicazione store | Terra/Spike (costo per utente permanente); integrazioni Whoop/Oura/Garmin in H1 (settimane di lavoro per il 10% marginale) |
| 7 | **Stripe in due tempi**: Billing con Payment Links per i canoni white-label (H1, zero codice, webhook→kill-switch licenza); Connect Standard per i pagamenti allievi (H2, denaro mai sui nostri conti) | Ogni fase usa il minimo Stripe che risolve il problema; Connect Standard evita obblighi da istituto di pagamento | API Billing custom in H1; Connect Custom; incassare e girare noi (PSD2) |
| 8 | **WhatsApp API e SDI solo oltre soglie dichiarate** (>100 promemoria/mese o richiesta cliente; SDI = mai motore proprio, al più connettore export) | Il contratto API (`/remind`) non cambia quando si passa da link a BSP: si può aspettare la soglia senza debito; il fiscale italiano è un dominio da specialisti | WhatsApp Business Platform subito (costo fisso + template per 30 allievi); costruire fatturazione SDI in-app |
| 9 | **SLA onesto**: best-effort scritto in H1, SLA 99,5% con crediti e status page solo in H2; quote per-tenant come voci di listino con degradazione dichiarata, mai spegnimento del core | Penali con on-call di 1 persona sono una promessa falsa; le quote trasformano i costi (AI, Storage) in prezzo invece che in perdita | SLA "enterprise" in brochure da subito; quote nascoste che spengono il servizio a sorpresa |

---

## 10. Cosa NON faremo (e perché)

1. **GraphQL o API gateway federato** — già escluso in [01](./01-architettura.md); qui si aggiunge il motivo lato partner: le palestre e i gestionali integrano REST+webhook, nessuno ha mai chiesto GraphQL a un gestionale fitness.
2. **SDK multi-linguaggio day-1** (Python, Swift, Kotlin, PHP…) — cinque SDK mantenuti male < uno mantenuto bene + spec OpenAPI da cui chiunque genera il proprio. Nuovi SDK solo con domanda pagante.
3. **Marketplace di integrazioni / app store di terzi in H1** — è nella visione (00), ma un marketplace senza massa critica di sviluppatori è una pagina vuota che costa reputazione. Prima 10 partner integrati a mano via API key, poi si automatizza ciò che si ripete.
4. **Aggregatori wearable a pagamento (Terra/Spike/ROOK)** — costo per-utente strutturale incompatibile con l'economia white-label (§6.1); si accetta il trade-off di richiedere l'app nativa.
5. **"Login con ESSĒRE" (OAuth2 authorization-code per utenti finali)** — prodotto identity a sé stante senza domanda; gli scopes di §3.2 lo rendono possibile domani senza pagarlo oggi.
6. **Motore di fatturazione elettronica SDI proprio** — dominio fiscale da specialisti; al massimo connettore export verso Fatture in Cloud/Aruba (§7.3).
7. **Esporre la tassonomia interna `human_events` 1:1 nei webhook/API pubblici** — il vocabolario pubblico è un sottoinsieme stabile e mappato (§4.1): l'interno deve poter evolvere ogni settimana, il pubblico deve rompersi mai.
8. **Realtime pubblico (WebSocket/SSE per partner)** — i casi d'uso partner reali (presenze, wellness, pagamenti) tollerano secondi di latenza: li copre il webhook. Un layer realtime pubblico è infrastruttura costosa per un bisogno che nessun cliente ha espresso; l'unico SSE è l'AI proxy interno.
9. **Import FHIR/HL7 come modello interno** — ribadito da [02](./02-dati-digital-twin.md): se una clinica H2 lo esige, sarà un adapter di export dedicato, non il nostro schema.

---

*Prossimo documento: [06-sicurezza-compliance.md](./06-sicurezza-compliance.md) — threat model, sanatoria `managedPassword`, GDPR/dati sanitari, e i controlli che rendono vendibile questa API a cliniche e aziende.*
