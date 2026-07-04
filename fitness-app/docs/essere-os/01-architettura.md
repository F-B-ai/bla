# 01 · Architettura di Sistema — ESSĒRE OS

> **Pacchetto documentale ESSĒRE OS** — questo è il documento 01 di 8.
> Riferimenti: [00-strategia](./00-strategia.md) · [02-dati-digital-twin](./02-dati-digital-twin.md) · [03-ai-engine](./03-ai-engine.md) · [04-ux-design](./04-ux-design.md) · [05-api-sdk-integrazioni](./05-api-sdk-integrazioni.md) · [06-sicurezza-compliance](./06-sicurezza-compliance.md) · [07-roadmap-milestones](./07-roadmap-milestones.md)
>
> **Stato:** bozza operativa · luglio 2026 · owner: architettura
> **Orizzonti:** H0 "Fondamenta" (0–3 mesi, 1 persona + AI, budget ~0) · H1 "Prodotto" (3–12 mesi, clienti white-label) · H2 "Piattaforma" (12–36 mesi, team + capitale)

---

## 0. Principi architetturali (validi su tutti gli orizzonti)

1. **Evoluzione, non riscrittura.** L'app funziona e ha ~30 allievi paganti in produzione. Ogni cambiamento passa per lo strangler pattern (§4): il vecchio percorso resta vivo finché il nuovo non è dimostrato. Riscrivere da zero è vietato salvo argomentazione con numeri.
2. **Il seam esiste già: `src/services/*.ts`.** Le ~27 classi di servizio (programService, paymentService, wellnessService, aiService…) sono l'unico punto in cui l'app tocca Firestore/Storage/Anthropic. Le schermate non conoscono Firebase. Questo è un colpo di fortuna architetturale: la migrazione a un API layer cambia *l'interno* dei service, non le 100+ schermate.
3. **Il dato prima del codice.** Il Digital Human Twin (doc 02) è la vera proprietà intellettuale. Il codice si riscrive; 3 anni di eventi mente-corpo di una persona no. Da H1 ogni fatto rilevante diventa un evento append-only.
4. **Nessuna chiave segreta sul client. Mai.** La chiave Anthropic distribuita via `config/aiKey` e la `managedPassword` in chiaro sono debiti da estinguere in H0, non in H1 (dettaglio in doc 06).
5. **Una persona deve poter operare tutto.** Fino a H1 inoltrato, ogni componente deve essere gestibile da un founder non tecnico assistito da AI: managed services, zero server da patchare, log leggibili, rollback a un click.
6. **Domanda 10x obbligatoria.** Prima di adottare una pratica "standard" (microservizi, Kubernetes, GraphQL, monorepo tooling pesante) chiedersi se esiste una via 10x più semplice che dà il 90% del valore. Quasi sempre sì (vedi §3.4 e "Cosa NON faremo").

---

## 1. Architettura AS-IS — fotografia onesta (H0, punto di partenza)

```
                    ┌──────────────────────────────────────────────┐
                    │  BROWSER / PWA  (essere-3fe6f.web.app)       │
                    │  React Native Web · Expo SDK 52              │
                    │  bundle unico ~4MB offuscato + anti-debug    │
                    │                                              │
                    │  src/screens ──► src/services/*.ts           │
                    └───────┬──────────────┬──────────────┬────────┘
                            │              │              │
              SDK Firebase  │              │              │  fetch diretto
              (client-side) │              │              │  + header
                            ▼              ▼              │  anthropic-dangerous-
                    ┌──────────┐   ┌──────────────┐       │  direct-browser-access
                    │ Firebase │   │  Firestore   │       ▼
                    │   Auth   │   │  + Storage   │   ┌─────────────────┐
                    │ (email/  │   │ (piano Spark │   │  API Anthropic  │
                    │  pwd)    │   │  = gratuito, │   │  chiave letta da│
                    └──────────┘   │  quota quasi │   │  Firestore doc  │
                                   │  esaurita)   │   │  config/aiKey ⚠ │
                                   └──────────────┘   └─────────────────┘

   Sicurezza: SOLO regole Firestore per ruolo (owner/manager/collaborator/
   student/academy_student). Nessun backend. Nessuna Cloud Function attiva.
   Deploy: manuale, service account incollato in chat. Test: zero. CI: zero.
```

### 1.1 Punti di rottura (in ordine di gravità)

| # | Punto di rottura | Perché rompe | Quando esplode |
|---|---|---|---|
| 1 | `users/{uid}.managedPassword` in chiaro leggibile da ogni utente autenticato | Chiunque con un account può leggere le password gestite di tutti. Violazione GDPR + takeover account banale | Già adesso. Va sanato questa settimana (doc 06) |
| 2 | Chiave Anthropic sul client via `config/aiKey` | Chiunque estrae la chiave dal traffico di rete (l'offuscazione del bundle è irrilevante: la chiave viaggia in header HTTP visibili in DevTools) e brucia il budget API o la usa per abuso | Al primo utente curioso o al primo crawler. Costo illimitato a carico nostro |
| 3 | Piano Spark: Storage in quota, niente Cloud Functions | Foto posturali/composizione corporea smettono di caricarsi; impossibile mettere QUALSIASI logica server-side | Già in corso (gestione spazio in-app è un cerotto) |
| 4 | Nessuna validazione server-side delle scritture | Le regole Firestore validano *chi* scrive, non *cosa*: un client modificato può scrivere pagamenti, XP, badge, accessi arbitrari | Al primo cliente white-label che non ci conosce personalmente |
| 5 | Query senza indici compositi, filtrate client-side | Il costo di lettura cresce linearmente con i dati: a 300 utenti si scaricano collection intere per filtrare in RAM | ~10x utenti attuali |
| 6 | Deploy manuale, zero test, zero CI | Ogni deploy è una roulette; il bus factor è 1 persona e 1 laptop | Al primo errore in produzione con clienti paganti |
| 7 | Bundle web unico 4MB + tab bar con ~20 tab | Primo caricamento lento su rete palestra; UX anti-Apple che bloccherà la review sugli store | Al momento della submission iOS (doc 04) |

**Cosa invece funziona e va preservato:** il modello a service layer, le regole per ruolo (buona base), il white-label via `src/config/brand.ts` + kill-switch licenza (è già un embrione di control plane multi-cliente), la PWA come canale di distribuzione a costo zero.

---

## 2. Architettura target H1 — "un backend vero, minimo" (mesi 3–12)

Obiettivo: mettere un API layer tra client e dati **solo dove serve** (segreti, denaro, AI, eventi), lasciando le letture semplici su SDK Firebase diretto. Non è un compromesso: è il design corretto per questa scala.

```
┌─────────────────────────────────────────────────────────────────────┐
│  CLIENT — UNA codebase Expo (SDK 52 → 54+)                          │
│  · iOS nativa (EAS)  · Android nativa (EAS)  · Web/PWA (fallback)   │
│  src/screens ──► src/services/*.ts (stesso seam, interni cambiati)  │
└────────┬──────────────────────────┬─────────────────────────────────┘
         │                          │
         │ SDK Firebase             │ HTTPS + Firebase Auth ID token
         │ (letture semplici,       │ (tutto ciò che è sensibile)
         │  chat realtime,          ▼
         │  offline cache)   ┌────────────────────────────────────────┐
         ▼                   │  API LAYER — Cloud Functions v2 (Blaze)│
┌──────────────┐             │  (= Cloud Run gestito, stesso runtime) │
│  Firebase    │             │                                        │
│  Auth        │─verifica──► │  /ai/*        AI PROXY                 │
└──────────────┘   token     │   · chiave Anthropic in Secret Manager │
                             │   · rate limit per utente e per ruolo  │
┌──────────────┐             │   · log costi per chiamata/tenant      │
│  Firestore   │◄──scrittura─│   · prompt caching + scelta modello    │
│  (+ indici   │  validata   │  /v1/payments/* denaro: solo server      │
│  compositi)  │             │  /events      EVENT LOG per il Twin    │
│              │             │   · append-only, validato, immutabile  │
│  events/     │◄────────────│   (schema in doc 02)                   │
│  (append-    │             │  /admin/*     licenze white-label,     │
│   only)      │             │               provisioning istanze     │
└──────────────┘             └───────────────┬────────────────────────┘
┌──────────────┐                             │ server-side
│  Storage     │◄─ upload diretto con        ▼
│  (foto, doc) │   regole + URL firmati ┌─────────────────┐
└──────────────┘                        │  API Anthropic  │
                                        │  claude-sonnet  │
Scheduler (Functions cron): riepilogo   │  claude-opus    │
settimanale AI, promemoria pagamenti,   │  claude-haiku   │
promemoria WhatsApp/SMS                 └─────────────────┘
```

### 2.1 Scelte e perché

| Scelta | Perché | Alternativa scartata |
|---|---|---|
| **Cloud Functions v2 come API layer** | Zero server da gestire, scale-to-zero, deploy con `firebase deploy`, gratuite fino a 2M invocazioni/mese: a questa scala costano ~0€. v2 gira su Cloud Run, quindi la migrazione futura a Cloud Run "puro" (container proprio, più controllo) è un cambio di deploy, non di codice | Server Node su VPS (€5/mese ma va patchato, monitorato, e il bus factor resta 1); Cloud Run day-1 (aggiunge Docker/registry senza benefici a questa scala) |
| **Ibrido: SDK diretto per letture, API per scritture sensibili** | Le regole Firestore in sola lettura per ruolo sono sicure e gratuite; il realtime della chat via SDK è gratis e già funziona. Mettere TUTTO dietro API triplicherebbe il lavoro e ucciderebbe l'offline di Firestore senza guadagno | "Tutto dietro API" (dogma da manuale enterprise: a 30–500 utenti è puro costo); "tutto su SDK" (status quo: insicuro per denaro/AI/segreti) |
| **AI Proxy obbligatorio, prima mossa H0→H1** | Chiave in Secret Manager, mai sul client. Il proxy aggiunge: rate limit per utente (es. studente: 30 msg/giorno all'Assistente; coach: 100), scelta del modello per funzione, prompt caching (il system prompt dell'Assistente = listino + info palestra è stabile → `cache_control` ephemeral, letture a ~10% del costo input), log di costo per chiamata in `aiUsage/` per fatturare i tenant white-label | Restare client-side "tanto il bundle è offuscato" (la chiave viaggia in chiaro negli header HTTP: l'offuscazione non protegge nulla); API Gateway di terzi (Kong ecc.: sovradimensionato) |
| **Event log in Firestore (`events/`), non un database nuovo** | Il Twin (doc 02) ha bisogno di una cronologia append-only di fatti: check-in, workout completati, valutazioni, pagamenti, accessi QR. Percorso di scrittura in **due fasi dichiarate** (versione canonica: 02 §3.2): fase transitoria M3 = `create` client su tipi limitati con validazione dura nelle rules; da tappa 4 = write deny totale + `POST /v1/events` con Idempotency-Key. Vincolo: la gamification server-side non parte finché i tipi che generano XP non sono API-only (i premi sono reali). Export giornaliero su Cloud Storage (JSONL) come backup e futura sorgente analytics | BigQuery day-1 (c'è l'estensione ufficiale Firestore→BigQuery: la attiveremo in H1 avanzato quando servirà analytics, non prima); Postgres/Timescale (un secondo database = un secondo sistema da amministrare) |
| **Blaze subito, con budget alert a 25€/50€** | Sblocca Functions e Storage. Il terrore del "pay-as-you-go" si gestisce con alert e con il rate limit del proxy: il rischio di costo oggi è la chiave AI esposta, non Blaze | Restare su Spark (già in quota, e blocca tutto il piano) |
| **Modello AI per funzione, non un modello unico** | Assistente allievi: `claude-sonnet-4-5` con caching (volume alto, costo basso); analisi posturale/composizione + riepilogo owner: `claude-opus-4-8` (bassa frequenza, alta qualità); classificazioni/triage (es. "allievo da attenzionare"): `claude-haiku-4-5` (1$/5$ per MTok). Il proxy centralizza la scelta: cambiare modello = 1 riga server, zero release client | Modello unico premium ovunque (costo 5x senza valore percepito sulle funzioni di volume) |

### 2.2 Contratto minimo dell'AI Proxy (H0, ~200 righe di codice)

```
POST /v1/ai/messages   { feature: "assistant"|"coach"|... , messages: [...] }
  → verifica ID token → carica limiti per ruolo → controlla contatore
    giornaliero (aiUsage/{uid}/daily/{date}) → chiama Anthropic con chiave
    da Secret Manager, system prompt server-side, cache_control →
    scrive {uid, tenant, feature, model, input_tokens, output_tokens,
    cache_read, costo_stimato} → risponde in streaming (SSE)
POST /v1/ai/vision     { feature: "postural"|"bodycomp", imageRef }
  → come sopra, immagine letta da Storage server-side (mai base64 dal client)
```

**Questo è il contratto unico del gateway, scritto subito in `openapi.yaml`**: HTTP function (non callable — le callable non fanno SSE e non sono rotte REST versionabili), naming `/v1` dal giorno 1 come da tesi di 05 §1.2 ("API interna = API pubblica"), campo `feature` coerente col registro moduli di [03 §0.2](./03-ai-engine.md). 07 M1 implementa questo contratto alla lettera.

Nota: il system prompt si sposta sul server. Effetto collaterale voluto: i prompt (know-how del prodotto) smettono di essere leggibili nel bundle client.

---

## 3. Architettura H2 — "Piattaforma" (mesi 12–36)

### 3.1 Multi-tenant vero vs istanza-per-cliente: il trade-off, sul serio

Oggi il white-label = **un progetto Firebase per palestra** (`brand.ts` + kill-switch `config/license`). È la scelta giusta *adesso*: isolamento dati perfetto (argomento di vendita), blast radius di un errore = 1 cliente, fatturazione infra banale (1 progetto = 1 cliente).

Il costo nascosto è operativo e cresce linearmente: N progetti = N deploy di regole/indici/functions, N console, N configurazioni push, N upgrade Expo. Con lo script di provisioning è sostenibile fino a ~10–15 istanze gestite da 1 persona; oltre, diventa il lavoro a tempo pieno di qualcuno.

| Criterio | Istanza-per-cliente (oggi) | Multi-tenant `tenant_id` (H2) |
|---|---|---|
| Isolamento dati | Fisico, perfetto, vendibile a cliniche/aziende | Logico: 1 bug nelle regole/query = data leak cross-cliente |
| Costo operativo | O(N) deploy e console | O(1) deploy; 1 sola infrastruttura |
| Costo infra | N × quota minima (ma free tier per progetto aiuta i piccoli) | Condiviso, più efficiente oltre ~20 clienti |
| Onboarding cliente | Ore (script provisioning) → giorni se manuale | Minuti: riga in `tenants/` + sottodominio |
| Analytics cross-cliente / benchmark di rete | Impossibile senza pipeline di aggregazione | Nativo (è la base del "network effect" dei dati, doc 00) |
| Personalizzazione profonda per cliente | Facile (istanza dedicata) | Va progettata (feature flag per tenant) |
| Compliance enterprise (cliniche, doc 06) | Facile: "i vostri dati sono in un progetto dedicato" | Serve dimostrare l'isolamento logico (audit, test) |

**Decisione: modello ibrido a due corsie.**
- **Corsia self-serve (H2):** app multi-tenant con `tenant_id` su ogni documento ed evento, per palestre piccole/medie. Prezzo basso, onboarding automatico.
- **Corsia dedicated (continua da oggi):** istanza dedicata per cliniche, aziende, catene — venduta come tier premium "dedicated instance", a prezzo maggiorato che copre l'operatività.

**Trigger di migrazione (numeri, non sensazioni):** si costruisce la corsia multi-tenant quando si verifica UNA di queste condizioni: (a) >10 istanze attive, (b) >4 ore/settimana di pura amministrazione istanze, (c) primo cliente che chiede onboarding self-serve. Prima di allora, scrivere `tenant_id` **già da H1 in ogni evento del log** (costo: un campo; beneficio: la migrazione dati futura è un `merge`, non un progetto).

### 3.2 Diagramma H2

```
                        ┌───────────────────────────────────────────┐
                        │  CLIENT: app iOS/Android/Web (1 codebase) │
                        │  + dashboard coach/manager/azienda/clinica│
                        │  + terze parti via SDK pubblico (doc 05)  │
                        └──────────────────┬────────────────────────┘
                                           ▼
                        ┌───────────────────────────────────────────┐
                        │  API GATEWAY pubblico (Cloud API Gateway) │
                        │  · API key per partner + OAuth utenti     │
                        │  · quote/rate limit per consumer          │
                        │  · versioning /v1 (contratti in doc 05)   │
                        └──────────────────┬────────────────────────┘
                                           ▼
        ┌──────────────────────────────────────────────────────────────┐
        │  CORE API — MONOLITE MODULARE su Cloud Run                   │
        │  (un deployable, moduli a confini netti — NON microservizi)  │
        │  identity&tenant │ training │ wellness/readiness │ payments  │
        │  gamification │ academy │ ai-orchestrator (doc 03)           │
        └───────┬───────────────────────┬──────────────────┬───────────┘
                │ scritture             │ pubblica         │ chiama
                ▼                       ▼                  ▼
        ┌──────────────┐   ┌─────────────────────┐   ┌──────────────┐
        │ Firestore    │   │ EVENT BUS (Pub/Sub) │   │ AI engine    │
        │ multi-tenant │   │ topic: events.*     │   │ (doc 03)     │
        │ + tenant_id  │   └──────┬──────┬───────┘   └──────────────┘
        └──────────────┘          │      │
                     consumer:    ▼      ▼
              ┌────────────────────┐  ┌─────────────────────────────┐
              │ Twin updater       │  │ BigQuery (analytics,        │
              │ (proiezioni stato  │  │ benchmark anonimi di rete,  │
              │  del Digital Twin) │  │ dashboard aziende/cliniche) │
              └────────────────────┘  └─────────────────────────────┘
              + consumer: notifiche, gamification, webhook partner
   Wearable (HealthKit/Health Connect → client → /events) = doc 05
```

### 3.3 Event bus: quando e perché

In H1 l'event log è una collection + trigger Firestore (sufficiente). In H2 si promuove a **Pub/Sub** perché compaiono consumer multipli indipendenti (Twin updater, analytics, webhook partner, gamification) e non si vuole che il fallimento di uno blocchi gli altri. La migrazione è indolore *se* in H1 gli eventi hanno già schema versionato e `tenant_id` (doc 02 definisce lo schema).

### 3.4 Anti-microservizi-prematuri (esplicito, come promesso)

**Non si estrae un servizio finché i numeri non lo impongono.** Il monolite modulare su Cloud Run scala orizzontalmente da solo (più istanze dello stesso container) fino a decine di migliaia di utenti. Un modulo diventa servizio separato SOLO se: (a) ha un profilo di scala radicalmente diverso (candidato reale: l'AI orchestrator, che ha latenze di secondi e costi propri), (b) serve isolamento di fault per contratto (es. payments per un partner bancario), o (c) un team dedicato ci lavora full-time. Con un team < 8 persone, i microservizi sono un modo per trasformare problemi di codice in problemi di rete distribuita — che è un pessimo affare. La pratica di settore "partiamo a microservizi così scaliamo" è mediocre: il modo 10x migliore è confini di modulo rigorosi dentro un deployable solo, con l'event bus come unica via di comunicazione asincrona.

---

## 4. Migrazione senza riscrittura — strangler pattern, tappa per tappa

Regola operativa: **ogni tappa è rilasciabile da sola, in giorni non mesi, e reversibile con un flag.** Il seam è sempre `src/services/*.ts`: la UI non si tocca.

| Tappa | Orizzonte | Cosa si sposta | Come (strangler) | Cosa NON si tocca |
|---|---|---|---|---|
| 0 | H0, subito | `managedPassword` eliminata | Reset credenziali gestite via Admin SDK (script una tantum), campo cancellato, regola che nega la lettura. Dettaglio: doc 06 | Tutto il resto |
| 1 | H0, sett. 1–2 | Progetto su Blaze + Secret Manager + prima Function `/v1/ai/messages` | `aiService.ts` e `assistantService.ts`: la fetch verso Anthropic diventa fetch verso la Function con ID token. Flag `USE_AI_PROXY` per rollback. La chiave client si revoca DOPO 1 settimana di proxy stabile | Schermate AI, prompt lato UX |
| 2 | H0, sett. 2–4 | Vision AI (posturale, composizione) sul proxy | `posturalService`/`bodyCompositionService`: upload foto su Storage (già così), al proxy passa solo il riferimento; il server legge l'immagine e chiama Anthropic | Flusso foto dell'utente |
| 3 | H0–H1 | Rate limit + log costi + prompt caching nel proxy | Middleware nella stessa Function; collection `aiUsage/` | Nulla lato client |
| 4 | H1, mese 3–5 | Event log `events/` | I service che registrano fatti (checkin, workoutLog, session, payment, gamification) scrivono ANCHE su `POST /v1/events` (dual-write). Dopo 1 mese di verifica, `events/` diventa la fonte per i trend e il vecchio percorso di lettura si spegne a moduli | Schemi Firestore esistenti (restano come proiezioni di lettura) |
| 5 | H1, mese 4–6 | Denaro dietro API | `paymentService`/`financialService`: creazione piani, rate, ricevute passano a `/v1/payments/*` con validazione server. Regole Firestore: write deny sui documenti finanziari per i client | Dashboard finanziaria (legge come prima) |
| 6 | H1, mese 5–7 | Gamification server-side | XP/badge calcolati da un consumer dell'event log (niente più XP scrivibili dal client) | UI badge/livelli |
| 7 | H1, mese 6–9 | Indici compositi + query server per liste pesanti | Aggiunta indici in `firestore.indexes.json` (file già presente, va popolato); le 3–4 query oggi filtrate client-side migrano una alla volta | Query leggere |
| 8 | H1→H2 | `tenant_id` ovunque negli eventi; provisioning istanze scriptato | Script `create-tenant.ts` (progetto, regole, indici, brand, licenza) al posto del playbook manuale WHITE-LABEL.md | Istanze esistenti |
| 9 | H2 | Corsia multi-tenant + API Gateway + Pub/Sub | Nuovi clienti self-serve sull'infrastruttura condivisa; i dedicated restano dove sono | Clienti dedicated |

**Criterio di "fatto":** una tappa è chiusa quando il vecchio percorso è spento (non solo quando il nuovo è acceso). Dual-write senza data di spegnimento = debito raddoppiato.

---

## 5. Piano store: da PWA a iOS/Android (H1, mesi 3–6)

La config EAS esiste già; il lavoro non è il build, è la conformità. La PWA resta viva come canale demo/fallback e per i desktop dei coach.

| Tema | Cosa cambia rispetto alla PWA | Azione |
|---|---|---|
| **Push** | Web push inaffidabile su iOS → push nativi via `expo-notifications` (APNs/FCM). I promemoria pagamento e "da attenzionare" diventano finalmente affidabili | Config APNs key + FCM in EAS; token push per device in `users/{uid}/devices` |
| **Pagamenti / IAP** | Gli abbonamenti palestra sono **servizi fisici fruiti fuori dall'app** → per policy Apple (3.1.3(e)) e Google possono usare pagamento esterno, SENZA IAP e senza il 30%. Attenzione invece a eventuali contenuti puramente digitali venduti in-app (es. corsi Academy a consumatori): quelli ricadrebbero nell'IAP | Tenere i flussi di pagamento su rate/ricevute esterni com'è oggi; se l'Academy diventa prodotto digitale a pagamento per il pubblico, decisione dedicata (doc 00 + 06) |
| **Review Apple** | Serve: account demo per il reviewer; cancellazione account in-app (obbligo Apple 5.1.1(v)); privacy manifest + App Privacy labels (salute!); disclaimer esplicito su analisi posturale/composizione AI = "non è un dispositivo medico né una diagnosi" (altrimenti rischio rigetto in categoria medica); UI navigabile → la tab bar da ~20 tab va rifondata PRIMA della submission (doc 04) | Checklist di submission in doc 07; disclaimer testuali in doc 06 |
| **Offuscazione/anti-debug** | Il pacchetto `javascript-obfuscator` + anti-debug è pensato per il web; su store può insospettire la review e su nativo è superfluo (il valore da proteggere — prompt e logica — migra comunque sul server, §2.2) | Rimuovere dalla build nativa; valutare rimozione anche dal web dopo la tappa 1–2 (§4) |
| **Aggiornamenti** | EAS Update (OTA) per il JS: fix senza passare dalla review, entro i limiti policy (no cambi di funzionalità sostanziali via OTA) | Canali `staging`/`production` in EAS Update, collegati alla CI (§7) |
| **Dati salute (H1+)** | HealthKit/Health Connect per arricchire lo Stato ESSĒRE con dati wearable (tesi del cuneo: readiness senza hardware, potenziata dall'hardware altrui) | Richiede build native (non esiste su PWA) → è un motivo strategico, non solo cosmetico, per andare sugli store. Integrazione in doc 05 |

**Perché ora e non prima:** finché l'AI era chiamata dal client con chiave esposta, una review Apple seria era un rischio. L'ordine giusto è: proxy (tappa 1–2) → UX tab bar (doc 04) → submission.

---

## 6. Offline-first e sync (H1) — le palestre hanno connettività scarsa

Scenario reale: seminterrato, Wi-Fi saturo, allievo a metà workout. Il live workout NON può dipendere dalla rete.

| Componente | Strategia | Perché così |
|---|---|---|
| Lettura programmi/storico | Persistenza offline di Firestore (IndexedDB su web, cache SDK su nativo) attivata di default | È gratis: lo fa l'SDK. Basta smettere di trattare ogni schermata come online-only |
| **Live workout** | Stato di sessione in storage locale (MMKV/AsyncStorage) + **outbox pattern**: ogni set completato = evento in coda locale, flush verso `/events` quando c'è rete, con retry esponenziale e idempotenza via `eventId` client-generated (UUID) | Il workout è append-only per natura: niente conflitti da risolvere, solo eventi da consegnare almeno-una-volta; l'idempotenza server (dedup su `eventId`) rende sicuro il retry |
| Check-in QR | Il codice QR/manuale funziona offline lato allievo (il codice è statico per palestra); la registrazione dell'accesso va in outbox e si sincronizza | L'allievo non deve restare alla porta per colpa del Wi-Fi |
| Stato ESSĒRE (check-in quotidiano) | Compilabile offline, evento in outbox; il punteggio prontezza si calcola client-side con la formula corrente, il server ricalcola alla ricezione (fonte di verità) | Il momento del check-in (mattina, magari senza rete) non è negoziabile per la qualità del dato |
| Chat | Solo online con coda SDK Firestore (già gestita dall'SDK) | Realtime degradabile: non vale ingegneria extra |
| **Conflitti** | Regola generale: **modello dati append-only dove possibile** (eventi non confliggono mai); per i documenti mutabili (profilo, programmi) last-write-wins con `updatedAt` + avviso UI se il coach e il manager editano lo stesso programma a distanza di minuti | I CRDT sono il modo "da manuale" e sono sproporzionati: la vera mossa 10x è scegliere strutture dati che non confliggono, non risolvere conflitti meglio |
| Media (foto posturali) | Upload in coda con resume (Storage supporta resumable upload); mai bloccare il flusso di valutazione sull'upload | Foto da 5–10MB su rete scarsa = il caso peggiore |

**Vincolo architetturale:** l'outbox client scrive SOLO eventi (§2, event log). È lo stesso canale del Twin: offline-first e Digital Twin sono la stessa feature vista da due lati.

---

## 7. Ambienti, CI/CD, testing

### 7.1 H0 — pipeline minima (1 giornata di setup, valore immediato)

```
Ambienti:  essere-staging (nuovo progetto Firebase)  ·  essere-3fe6f (prod)
Branch:    main → staging automatico  ·  tag v* → prod con conferma manuale

GitHub Actions (.github/workflows/ci.yml):
  on: push/PR
    1. npm ci
    2. tsc --noEmit                        (typecheck: gratis, trova il 60% degli errori)
    3. eslint                              (con regola colori-da-theme, vedi debito noto)
    4. vitest run                          (test sui PURI: calcolo prontezza, XP/badge,
                                            scadenze rate — logica di dominio senza Firebase)
  on: push main
    5. expo export → firebase hosting:channel:deploy staging
    6. firebase deploy --only functions (progetto staging)
  on: tag v*
    7. stessi step verso prod (environment protetto, approvazione a click)

Segreti: SOLO GitHub Actions Secrets (service account con ruoli minimi).
         Il service account incollato in chat viene REVOCATO il giorno stesso.
```

Perché partire dai test "puri": zero infrastruttura di test, girano in secondi, e coprono esattamente la logica che fa danni se sbaglia (soldi, punteggi, promemoria). È il miglior rapporto valore/sforzo per una persona sola.

### 7.2 H1 — estensioni (quando ci sono clienti paganti)

- **Test regole Firestore** con Emulator Suite in CI (le regole sono il perimetro di sicurezza: vanno testate come codice — "lo studente A non legge i pagamenti dello studente B" diventa un test, non una speranza).
- **Test d'integrazione delle Functions** contro l'emulatore (AI proxy mockato).
- **EAS Build/Submit in CI**: build nativa su tag, submission semi-automatica; EAS Update per gli hotfix JS.
- **Smoke test post-deploy**: script che fa login su staging e tocca 5 endpoint critici.
- **Monitoraggio**: Crashlytics (nativo) + alert su error rate Functions + budget alert GCP; un canale Telegram/WhatsApp per gli alert, letto dal founder.

### 7.3 H2

Pipeline per tenant provisioning (creare/aggiornare N istanze dedicated da CI), canary release su Cloud Run (10% traffico), suite e2e (Maestro per mobile) sulle 5 user journey critiche. Non prima: e2e mantenute da 1 persona sola sono un cimitero di test rossi ignorati.

---

## 8. Costi infrastruttura stimati (€/mese)

Stime prudenziali, prezzi luglio 2026. La voce dominante è SEMPRE l'AI, ed è il motivo per cui rate limit + caching + scelta modello stanno nel proxy fin da H0.

| Voce | H0 (1 palestra, ~30 allievi) | H1 (5 istanze, ~300 utenti tot) | H2 (multi-tenant, ~5.000 utenti + dedicated) |
|---|---|---|---|
| Firebase (Firestore, Auth, Hosting) | 0–5 (quasi tutto in free tier per progetto) | 10–40 (free tier × istanza aiuta) | 150–400 |
| Storage (foto) | 1–5 | 10–30 | 80–200 |
| Cloud Functions / Cloud Run | 0 (free tier 2M inv.) | 0–20 | 100–300 |
| API Anthropic (con caching + rate limit + modello per funzione) | 15–50 | 100–400 (rifatturata ai clienti come quota del canone) | 800–2.500 (voce COGS a listino, doc 00) |
| Pub/Sub + BigQuery | — | 0–10 (export eventi) | 50–150 |
| EAS (build/update) | 0 (free tier) | 0–20 | ~90 (piano production) |
| Apple Developer + Google Play | — | ~10 (99$/anno + 25$ una tantum) | ~10 |
| Monitoraggio/varie (dominio, SMS/WhatsApp via provider) | 5–15 | 20–60 | 100–300 |
| **Totale indicativo** | **~20–75** | **~150–580** | **~1.400–3.950** |

Regole di governo dei costi: budget alert GCP a 2 soglie per progetto; costo AI per utente visibile in `aiUsage` dal giorno 1 (in H1 diventa una riga nella fattura del cliente white-label: il costo si trasferisce, non si assorbe); revisione trimestrale del rapporto costo-AI/canone per tenant.

---

## Decisioni chiave

| # | Decisione | Perché | Alternativa scartata |
|---|---|---|---|
| 1 | Evolvere Firebase, non riscrivere | App in produzione con utenti reali; il valore è nei dati e nel time-to-market, non nella purezza dello stack | Riscrittura su Postgres/NestJS o Supabase: 4–6 mesi di stallo funzionale che un founder solo non può permettersi |
| 2 | AI Proxy su Cloud Functions come PRIMA mossa | Chiude la falla di sicurezza più costosa (chiave esposta = costo illimitato), abilita rate limit, caching, log costi e sposta i prompt sul server | Tenere la chiamata client-side confidando nell'offuscazione (non protegge header HTTP); gateway di terzi (complessità senza controllo) |
| 3 | Architettura ibrida: SDK per letture, API per scritture sensibili | Massimo valore col minimo codice: si protegge dove passa denaro/segreti/AI, si sfrutta gratis realtime e offline dell'SDK | "Tutto dietro API" (dogmatico, triplica il lavoro); "tutto su SDK" (insicuro) |
| 4 | Event log append-only in Firestore da H1, con `tenant_id` dal primo giorno | È la spina dorsale del Digital Twin (doc 02) e rende quasi gratuita la futura migrazione multi-tenant e l'aggancio a Pub/Sub/BigQuery | Database dedicato day-1 (secondo sistema da amministrare); nessun event log (il Twin resterebbe uno slogan) |
| 5 | White-label: istanza-per-cliente OGGI, corsia multi-tenant in H2 con trigger numerici (>10 istanze o >4h/sett di ops) | L'isolamento fisico è un argomento di vendita e il costo operativo è sostenibile fino a ~10–15 istanze; il multi-tenant si costruisce quando i numeri lo giustificano, su eventi già `tenant_id`-ready | Multi-tenant subito (mesi di lavoro prima del bisogno, rischio data-leak cross-cliente); istanze per sempre (ops O(N) mangia il margine) |
| 6 | Monolite modulare su Cloud Run in H2; un modulo diventa servizio solo con numeri (scala, fault-isolation, team dedicato) | Con team <8 persone i microservizi trasformano problemi di codice in problemi di rete distribuita | Microservizi day-1 (pratica di settore mediocre per questa scala) |
| 7 | Store nativi in H1 dopo proxy e rifondazione tab bar; pagamenti palestra fuori IAP (servizi fisici) | Push affidabili + HealthKit/Health Connect sono strategici per il cuneo readiness; l'esenzione IAP sui servizi fisici preserva i margini | Submission immediata (rigetto probabile: 20 tab, chiave esposta, disclaimer salute mancanti); portare i pagamenti in IAP (30% regalato) |
| 8 | Offline via outbox di eventi append-only + last-write-wins sui documenti mutabili | Le strutture dati che non confliggono battono qualsiasi motore di risoluzione conflitti; stesso canale del Twin | CRDT/sync engine dedicati (sproporzionati); online-only (inaccettabile in palestra) |
| 9 | CI minima H0: typecheck + lint + test puri + deploy staging automatico; segreti solo in GitHub Secrets | Chiude "deploy manuale + service account in chat" con 1 giorno di lavoro; i test sui calcoli di dominio sono il miglior valore/sforzo per una persona sola | Suite e2e completa subito (insostenibile da soli); continuare a mano (roulette con clienti paganti) |

---

## Cosa NON faremo (e perché)

- **Riscrittura big-bang dello stack** (Postgres, NestJS, Supabase, "facciamo le cose per bene da zero"): 4–6 mesi senza feature, con un founder solo e clienti attivi. Il giorno-1 di un rewrite è il giorno-1 di due prodotti da mantenere.
- **Microservizi e Kubernetes**: vedi §3.4. Nessun numero attuale o a 24 mesi li giustifica. Cloud Run gestito copre la scala prevista con zero ops.
- **GraphQL / gateway federato**: l'API pubblica (doc 05) nascerà REST versionata; GraphQL aggiunge un layer di complessità (schema, caching, authz per campo) che non risolve nessun problema che abbiamo.
- **Database "vero" al posto di Firestore in H0/H1**: Firestore ha limiti noti (query, join) ma li conosciamo e li aggiriamo con proiezioni ed eventi; un secondo database ora significa migrazione dati + doppia amministrazione senza valore per l'utente. Riesame onesto a H2 con i numeri di BigQuery alla mano.
- **Costruire un modello AI proprietario o fine-tuning in H0/H1**: il vantaggio non è il modello, è il contesto (dati Twin + coach nel loop). Si compra l'intelligenza a consumo e si investe nel dato (doc 03).
- **Offuscazione come strategia di sicurezza**: l'anti-debug sul bundle non ha mai protetto la chiave né i prompt. La sicurezza si sposta dove può esistere: sul server (doc 06).
- **Multi-tenant "già che ci siamo" in H1**: senza trigger numerici è lavoro speculativo che ritarda ciò che vende (store, wearable, dashboard coach).
- **e2e testing estensivo prima di H2**: manutenzione insostenibile per una persona; meglio pochi smoke test e regole Firestore testate.
- **Costruire hardware/wearable proprio**: il cuneo è esattamente il contrario — readiness senza hardware, arricchita dai sensori altrui via HealthKit/Health Connect (doc 00, doc 05).

---

## Dipendenze verso gli altri documenti

| Questo documento fornisce | A |
|---|---|
| Canale `/events` + schema trasporto | 02-dati-digital-twin (schema semantico eventi, proiezioni Twin) |
| AI Proxy: contratto, rate limit, log costi, scelta modello | 03-ai-engine (orchestrazione, prompt, valutazione qualità) |
| Vincolo "rifondare tab bar prima della submission" | 04-ux-design |
| API Gateway H2 + confini moduli | 05-api-sdk-integrazioni (contratti pubblici, SDK, wearable) |
| Tappe 0–1 (managedPassword, chiave server-side), superfici d'attacco | 06-sicurezza-compliance |
| Sequenza tappe strangler + trigger H2 | 07-roadmap-milestones (date, criteri di uscita per orizzonte) |
