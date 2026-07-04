# ESSĒRE OS — 02 · Modello Dati & Digital Human Twin

> **Pacchetto documenti**: [00-strategia](./00-strategia.md) · [01-architettura](./01-architettura.md) · 02-dati-digital-twin (questo) · [03-ai-engine](./03-ai-engine.md) · [04-ux-design](./04-ux-design.md) · [05-api-sdk-integrazioni](./05-api-sdk-integrazioni.md) · [06-sicurezza-compliance](./06-sicurezza-compliance.md) · [07-roadmap-milestones](./07-roadmap-milestones.md)
>
> **Stato**: bozza fondativa · luglio 2026 · owner: Francesco Busanca (founder) + architettura
>
> **Orizzonti**: **H0 "Fondamenta"** (0–3 mesi, 1 persona + AI, budget ~0) · **H1 "Prodotto"** (3–12 mesi, primi clienti white-label) · **H2 "Piattaforma"** (12–36 mesi, team + capitale).

---

## 0. Il principio: il twin non è una feature, è lo schema

"Digital Human Twin" rischia di essere la buzzword peggiore del pacchetto. Definizione operativa, senza poesia:

> **Il Digital Human Twin di una persona è: (a) un log di eventi append-only (`human_events`) che registra tutto ciò che le accade e che fa, con fonte e confidenza; (b) un insieme di stati derivati (`twins/{person_id}`) ricalcolati da quel log.** Punto. Se un dato non è ricostruibile dal log, non fa parte del twin.

Perché questa definizione e non "un profilo utente ricco":
- **Il profilo sovrascrive, il log accumula.** Oggi `bodyMeasurements` conserva la storia ma `users/{uid}` sovrascrive; ogni collezione ha la sua convenzione. Un twin fatto di "ultimo valore noto" perde esattamente ciò che vale (§5.2 di [00-strategia](./00-strategia.md)): la serie temporale etichettata dal coach.
- **Il log rende il moat misurabile.** "Anzianità media del twin ≥ 18 mesi" (metrica di visione) si misura contando eventi, non aggiornando campi.
- **Il log disaccoppia raccolta e intelligenza.** L'AI engine ([03](./03-ai-engine.md)) e le API ([05](./05-api-sdk-integrazioni.md)) leggono eventi e stati derivati, mai le 40 collezioni legacy. Quando in H2 cambieremo motore di calcolo, il log resta.

```
sorgenti                     log canonico              stati derivati            consumatori
─────────                    ────────────              ──────────────            ───────────
app allievo   ──┐                                   ┌─ readiness v2          ┌─ vista coach
coach         ──┼──► human_events (append-only) ──► ├─ carico A/C (ACWR)  ──►├─ AI engine (03)
wearable (H1) ──┤        │ backfill+dual-write      ├─ trend forza           ├─ API/SDK (05)
AI (stime)    ──┘        ▼                          └─ rischio churn         └─ export GDPR
                  collezioni legacy (restano
                  la UI-source finché servono)
```

**Vincolo di esecuzione**: tutto ciò che è marcato H0 dev'essere realizzabile dal founder + AI in poche settimane sullo stack attuale (Firebase, passaggio a Blaze già deciso in [00-strategia](./00-strategia.md) R7). Nessun nuovo database prima della soglia numerica di §7.4.

---

## 1. Schema del twin: i sei domini

Il documento derivato `twins/{person_id}` (uno per persona, ricalcolato in batch — §4) è la proiezione leggibile del log. La vista coach "da attenzionare" oggi legge 4–5 collezioni per allievo; domani legge **1 documento per allievo**: da ~150 letture per schermata a ~30. Questo è il "modo 10x migliore" applicato a noi stessi.

| Dominio | Campi principali | Da quali eventi deriva | Orizzonte |
|---|---|---|---|
| **Identità** | `person_id`, dati anagrafici minimi, consensi attivi (versione+data), `created_at` | `person.created`, `consent.*` | H0 |
| **Morfologia** | ultimo assessment posturale (sintesi findings + delta vs precedente), composizione (peso, %BF, circonferenze: ultimo valore + trend 90gg), fonte e confidenza di ciascuno | `posture.assessed`, `body.measurement_recorded`, `body.composition_estimated`, `bia.document_added` | H0 |
| **Capacità** | per pattern di movimento (squat, hinge, push-h, push-v, pull-h, pull-v, core/carry): e1RM stimato, trend 8 settimane, volume settimanale; flag mobilità dal posturale | `workout.completed` (payload esercizi), `posture.assessed` | H0 (e1RM) / H1 (mobilità) |
| **Stato** | readiness oggi + trend 7gg, carico acuto (7gg) / cronico (28gg) + rapporto ACWR, giorni da ultimo allenamento, sonno medio 7gg (H1, wearable) | `wellness.checkin_submitted`, `workout.completed`, `gym.checkin`, `sleep.recorded`, `hrv.recorded` | H0 / H1 |
| **Comportamento** | aderenza 28gg (workout completati/programmati), presenze 4 settimane, streak check-in, giorni dall'ultima apertura, `churn_risk` 0–100 | `gym.checkin`, `workout.*`, `wellness.checkin_submitted`, `payment.*` | H0 |
| **Contesto** | `tenant_id`, coach assegnato, piano attivo (programma + pagamento + scadenza), flag coach aperti | `tenant.joined`, `workout.plan_assigned`, `membership.*`, `coach.flag_*` | H0 |

Regola: **il twin non contiene mai dati che esistono solo lì**. È una cache ricostruibile; si può cancellare e rigenerare dal log in qualunque momento (proprietà che semplifica bugfix, migrazioni e GDPR).

---

## 2. Inventario delle collezioni Firestore attuali

Censimento completo (fonte: `firestore.rules`, `src/types/index.ts`, `src/services/*`). Colonna "Evoluzione": **K** = resta com'è (UI-source), **K+E** = resta e in più emette eventi verso `human_events` (dual-write, §3.4), **R** = da rifondare, **X** = da eliminare.

### 2.1 Identità e accesso

| Collezione | Scopo | Campi chiave | Problemi oggi | Evoluzione |
|---|---|---|---|---|
| `users/{uid}` | Anagrafica + ruolo (owner/manager/collaborator/student/academy_student) | email, role, profilo | **CRITICO: `managedPassword` in chiaro leggibile da ogni autenticato** ([06](./06-sicurezza-compliance.md), settimana 1); mescola identità, preferenze e stato; niente `person_id` stabile | **R**: bonifica campo password; aggiunta `person_id` (§6.1); split preferenze in subcollection |
| `studentInvites` | Codici invito allievi | inviteCode, isUsed | Codici non scadono | **K** + TTL |
| `credentialRequests` | Richieste credenziali | uid richiedente, stato | Legata al flusso managedPassword da dismettere | **X** in H0 (sostituita da reset password Firebase standard) |
| `userPresence`, `chatTyping` | Presenza online / typing | uid, timestamp | Scritture ad alta frequenza su Firestore (costo/rumore) | **K** in H0; H1 valutare Realtime Database (nato per questo) |

### 2.2 Allenamento

| Collezione | Scopo | Campi chiave | Problemi oggi | Evoluzione |
|---|---|---|---|---|
| `workoutPlans` | Schede assegnate | studentId, esercizi, isActive | Versioni: la modifica sovrascrive, la storia delle progressioni si perde | **K+E** (`workout.plan_assigned`, `coach.program_adjusted`) |
| `trainingPrograms` | Programmazione macro | studentId, createdAt | Sovrapposizione concettuale con workoutPlans da chiarire in [04](./04-ux-design.md) | **K+E** |
| `workoutLogs` | Live workout eseguiti | studentId, workoutPlanId, startedAt/completedAt, status, exerciseLogs[], durationMinutes | Il dato migliore che abbiamo; nessun campo sRPE (percezione sforzo) → lo aggiungiamo per l'ACWR (§4.3) | **K+E** (`workout.started/completed/abandoned`) |
| `sessions` | Appuntamenti/lezioni agenda | studentId, collaboratorId, date | — | **K+E** (`nutrition.appointment_attended` e presenze lezione) |
| `customWorkoutTemplates` | Template "usa per allievo" | esercizi, owner | — | **K** (non è dato-persona: niente eventi) |
| `exerciseLibrary` | Libreria esercizi | nome, gruppo muscolare | **Manca il campo `pattern`** (squat/hinge/push/pull/core): senza, il dominio Capacità non si calcola | **R** leggera in H0: aggiunta `pattern` + `is_load_bearing` (mappatura una tantum assistita da AI, verifica coach) |

### 2.3 Corpo e mente

| Collezione | Scopo | Campi chiave | Problemi oggi | Evoluzione |
|---|---|---|---|---|
| `wellnessChecks` | Stato ESSĒRE quotidiano | sleep/energy/mood/soreness (1–5), score 0–100, timestamp | `studentName` denormalizzato (il rename non propaga); score calcolato client-side senza versione formula | **K+E** (`wellness.checkin_submitted`); aggiunta `formula_version` |
| `posturalAssessments` | Valutazione posturale AI | 4 foto URL, findings[], aiAnalysis, recommendations | Foto in Storage senza lifecycle → quota Spark esaurita; nessun punteggio strutturato confrontabile nel tempo | **K+E** (`posture.assessed`); H1: findings normalizzati in scala per distretto (delta calcolabili) |
| `bodyMeasurements` | Misure manuali | weight, bodyFat, waist, hips, chest, arms, thighs | — (buona) | **K+E** |
| `bodyCompositionEstimates` | Stima composizione AI da foto | stima %BF, foto ref | Stima AI e misura manuale indistinguibili a valle | **K+E** con `confidence` bassa (§3.1) |
| `biaDocuments` | Referti BIA caricati | file ref, data | PDF non parsati: dato morto | **K+E**; H1: estrazione campi via AI ([03](./03-ai-engine.md)) |
| `diaryEntries` | Diario personale | testo, data | Contenuto libero sensibile | **K+E** solo metadato (`diary.entry_added`, MAI il testo nel payload — privacy) |

### 2.4 Presenza, gamification, tasks

| Collezione | Scopo | Campi chiave | Problemi oggi | Evoluzione |
|---|---|---|---|---|
| `checkins` | Presenza palestra (QR/codice) | studentId, timestamp | `studentName` denormalizzato; nessun tenant_id | **K+E** (`gym.checkin`) — è il ground truth comportamentale |
| `gamification` | XP, livelli, 50 badge, premi | studentId, xp, badges[], level | Stato mutabile senza storia: "quando ha preso il badge?" non risponde | **K+E** (`badge.earned`, `level.reached`, `reward.redeemed`) |
| `dailyTasks` | Task giornalieri | assegnatario, stato | — | **K** |
| `kpiTargets` | Target KPI owner | metrica, valore | — | **K** (dato business, non twin) |

### 2.5 Business (pagamenti, finanza)

| Collezione | Scopo | Campi chiave | Problemi oggi | Evoluzione |
|---|---|---|---|---|
| `paymentPlans` | Piani con rate, lezioni incluse | studentId, totalAmount, installments[], includedLessons/used | Stato rate mutato in-place: la storia dei solleciti non è ricostruibile | **K+E** (`membership.started/expired`, `payment.recorded/overdue`) |
| `financialTransactions` | Movimenti | importo, data, tipo | — | **K+E** (solo eventi-persona: `payment.recorded`) |
| `collaboratorEarnings` | Compensi staff | collaboratorId, importi | — | **K** (non è dato-allievo) |

### 2.6 Comunicazione

| Collezione | Scopo | Campi chiave | Problemi oggi | Evoluzione |
|---|---|---|---|---|
| `chatRooms`, `chatMessages` | Chat 1:1 e team | partecipanti, testo, media | Media senza retention (quota Storage); contenuti sensibili | **K**; **il contenuto chat NON entra nel twin** (decisione, §Decisioni); TTL media 12 mesi |
| `notifications` | Notifiche + push | destinatario, tipo | Crescita illimitata | **K** + TTL 6 mesi (rumore, non twin) |

### 2.7 Nutrizione

| Collezione | Scopo | Campi chiave | Problemi oggi | Evoluzione |
|---|---|---|---|---|
| `nutritionalConsultations` | Consulenze nutrizionali | studentId, note, data | Note libere non strutturate | **K+E** (`nutrition.consultation_recorded`) |
| `nutritionistAppointments` | Appuntamenti nutrizionista | studentId, data, stato | Duplica in parte `sessions` | **R** in H1: confluire in `sessions` con `type` |
| `nutritionTeamNotes` | Note interne team | testo | — | **K** (non twin: nota professionale interna) |

### 2.8 Academy (9 collezioni — il brief ne citava 7, il codice reale ne ha 9)

| Collezione | Scopo | Evoluzione |
|---|---|---|
| `academyCourses`, `academyModules`, `academyLessons`, `academyQuizzes` | Catalogo contenuti | **K** (contenuto, non dato-persona) |
| `academyProgress`, `academyQuizAttempts`, `academyCertificates` | Progresso persona | **K+E** (`academy.lesson_completed`, `academy.quiz_attempted`, `academy.certificate_earned`) |
| `academyNotes`, `academyRatings` | Note e valutazioni corsi | **K** |

### 2.9 Config e speciali

| Collezione/doc | Scopo | Problemi oggi | Evoluzione |
|---|---|---|---|
| `config/aiKey` | **Chiave Anthropic distribuita ai client** | Debolezza nota by design | **X** in H0: sostituita dal proxy ([01](./01-architettura.md), [03](./03-ai-engine.md)) |
| `config/assistantInfo` | Info palestra + listino per Assistente | — | **K** |
| `config/license` | Kill-switch white-label | — | **K** |
| `specialContent` | Contenuti speciali | — | **K** |

### 2.10 Problemi trasversali (validi per quasi tutte)

1. **Denormalizzazione dei nomi** (`studentName` copiato ovunque): il rename non propaga. Fix H0: si smette di scriverlo nei nuovi documenti; la UI risolve da `users` (o dal twin).
2. **Nessun `tenant_id`**: oggi implicito (un progetto = una palestra). Gli eventi lo scrivono comunque (§6.2).
3. **Mutabilità senza storia**: `gamification`, `paymentPlans`, `workoutPlans` sovrascrivono. `human_events` è la risposta, non un refactoring di ogni collezione.
4. **Date miste** (Timestamp/stringhe/Date client): nel log canonico solo `Timestamp` UTC + `tz` dichiarata nel payload dove rilevante.
5. **Indici mancanti** aggirati con filtri client-side: censiti e creati in §7.1 (oggi in `firestore.indexes.json` ce ne sono 9, ne servono ~15).

---

## 3. `human_events`: lo schema evento canonico — **H0**

### 3.1 Schema (event sourcing *light*: log sì, CQRS-cerimonia no)

```jsonc
// human_events/{event_id}
{
  "id": "01J1ZK7Q...",            // ULID (ordinabile per tempo); deterministico per eventi wearable (§5.3)
  "schema_version": 1,
  "person_id": "p_01HZX...",      // identità stabile (§6.1) — MAI lo uid Firebase
  "tenant_id": "mml",              // slug istanza, da brand.ts
  "type": "workout.completed",    // tassonomia chiusa (§3.3): valori fuori lista = scrittura rifiutata
  "ts": Timestamp,                 // quando è ACCADUTO
  "recorded_at": Timestamp,        // quando è stato SCRITTO (wearable: può differire di ore)
  "source": "app",                // app | coach | wearable | ai | system
  "actor_id": "uid_...",          // chi ha generato (allievo, coach, batch)
  "payload": { /* per-tipo, validato con zod condiviso client/functions (rif. 05) */ },
  "confidence": 1.0,               // fedeltà della MISURA, non verità assoluta (tabella sotto)
  "source_ref": { "collection": "workoutLogs", "doc_id": "..." },  // link al doc legacy di dettaglio
  "supersedes": null,              // id evento corretto da questo (correzioni compensative)
  "expires_at": null               // solo tipi con TTL (§7.2)
}
```

Semantica di `confidence` (guida, non dogma — l'AI engine la usa per pesare gli input):

| Sorgente | confidence | Perché |
|---|---|---|
| Inserimento coach (misure, valutazioni) | 1.0 | Professionista, strumento noto |
| Self-report allievo (check-in, workout log) | 0.9 | Onesto ma soggettivo; il bias sistematico si corregge sul trend, non sul singolo dato |
| Wearable via HealthKit/Health Connect | 0.85–0.95 | Dipende dalla metrica (passi ≈ 0.95, sleep staging ≈ 0.85) |
| Stima AI da foto (posturale) | 0.65 | Utile per screening e delta, non per numeri assoluti |
| Stima AI composizione corporea | 0.55 | La più incerta: sempre mostrata come range, mai come verità |
| Backfill da collezioni legacy | eredita la riga sopra −0.05 | Dati storici senza validazione all'origine |

### 3.2 Regole di integrità

- **Append-only**: le security rules permettono solo `create` (con validazione di `type`, `person_id` coerente col ruolo, `ts` non futuro oltre 5 min); `update` e `delete` negati a tutti i client. Le correzioni si fanno con un nuovo evento `event.corrected` + campo `supersedes` (dettaglio rules in [06](./06-sicurezza-compliance.md)).
- **Idempotenza**: gli eventi derivati da fatti "per giorno" (wearable, check-in) usano ID deterministico `hash(type|person_id|giorno|sorgente)` → il retry non duplica. Gli altri usano ULID.
- **Il payload è un riassunto, non un dump**: l'evento porta ciò che serve al calcolo degli stati derivati; il dettaglio resta nel doc legacy puntato da `source_ref`. Esempio: `workout.completed` porta per-esercizio `{pattern, top_set: {kg, reps}, volume_kg, sets}` — non i 40 set grezzi.

### 3.3 Tassonomia v1 (34 tipi, chiusa: si estende con PR sul pacchetto documenti, non ad hoc)

| Dominio | Tipi | Payload minimo | Orizzonte |
|---|---|---|---|
| **Ciclo di vita** (5) | `person.created` · `consent.granted` · `consent.revoked` · `tenant.joined` · `tenant.left` | versione consenso, scopo | H0 |
| **Corpo** (4) | `body.measurement_recorded` · `body.composition_estimated` · `posture.assessed` · `bia.document_added` | misure; %BF range; findings sintetici + score distretti | H0 |
| **Mente/soggettivo** (3) | `wellness.checkin_submitted` · `breathing.session_completed` · `diary.entry_added` | sleep/energy/mood/soreness + score + formula_version; tecnica+durata; **solo metadato, mai testo** | H0 |
| **Allenamento** (5) | `workout.plan_assigned` · `workout.started` · `workout.completed` · `workout.abandoned` · `workout.external_recorded` | plan_id; per-esercizio {pattern, top_set, volume_kg}, durata, sRPE (nuovo campo) | H0 (external: H1) |
| **Presenza** (1) | `gym.checkin` | metodo (qr/manuale) | H0 |
| **Coach-loop** (4) | `coach.note_added` · `coach.flag_raised` · `coach.flag_resolved` · `coach.program_adjusted` | motivo strutturato + testo libero; **è la label umana del dataset** (00-strategia §5) | H0 |
| **Nutrizione** (2) | `nutrition.consultation_recorded` · `nutrition.appointment_attended` | metadato + eventuali target macro | H1 |
| **Gamification** (3) | `badge.earned` · `level.reached` · `reward.redeemed` | badge_id; level; reward_id | H0 |
| **Business** (4) | `membership.started` · `membership.expired` · `payment.recorded` · `payment.overdue` | plan_id, importo, rata n/N | H0 |
| **Academy** (3) | `academy.lesson_completed` · `academy.quiz_attempted` · `academy.certificate_earned` | course_id, score | H1 |
| **Wearable** (4) | `sleep.recorded` · `hr.resting_recorded` · `hrv.recorded` · `steps.recorded` | §5.2 | H1 |
| **Meta** (1) | `event.corrected` | supersedes + motivo | H0 |

**Perché non un evento per set** (la domanda 10x al contrario): i puristi dell'event sourcing loggherebbero `set.completed` → 30–50 eventi/workout → ~40× i costi di scrittura e lettura per zero valore analitico aggiuntivo rispetto al payload aggregato (il set-by-set resta in `workoutLogs` via `source_ref`). La granularità dell'evento è "decisione del coach": il coach ragiona per sedute e pattern, non per singolo set.

### 3.4 Strategia di adozione (strangler fig, zero big-bang) — **H0, settimane 2–6**

1. **Backfill una tantum**: script Node (Admin SDK, generato con AI, eseguito dal founder come runbook) legge le collezioni legacy in ordine cronologico e produce eventi con `source: "system"` e `source_ref`. Con ~30 allievi e ~1 anno di storia: stima 15–40k eventi totali. Un pomeriggio di esecuzione, costo < 1 €.
2. **Dual-write client**: ogni service esistente (`wellnessService`, `checkinService`, ecc.) aggiunge una chiamata a un modulo unico `twinEvents.emit(type, payload)` (~20 righe per service, un file nuovo). Il doc legacy resta la fonte della UI: **nessuna schermata cambia**.
3. **Riconciliazione notturna**: Cloud Function schedulata confronta i conteggi legacy vs eventi delle ultime 24h e segnala derive in chat owner. È il test di integrità in assenza di test automatici (il debito CI/CD si sana in [01](./01-architettura.md)).
4. **Inversione (H1)**: le viste nuove (dashboard coach rifondata, [04](./04-ux-design.md)) leggono twin + eventi; le collezioni legacy diventano progressivamente scritture-solo-di-dettaglio. Nessuna data di "spegnimento" promessa: si spegne ciò che nessuna query legge più.

Alternativa scartata: migrare le collezioni a un "nuovo schema pulito" in un colpo. Con 1 persona, zero test e un'app in produzione usata ogni giorno, è il modo più rapido per rompere tutto. Il log affianca, non sostituisce.

---

## 4. Stati derivati: cosa si calcola, come, quando

### 4.1 Tabella di calcolo

| Stato | Formula (v1) | Frequenza | Orizzonte |
|---|---|---|---|
| **Readiness (Stato ESSĒRE v2)** | v1 attuale: media pesata sleep/energy/mood/soreness → 0–100. v2: stesso core + modulazione wearable se presente (§4.2) | **Realtime** al submit del check-in (client, come oggi) + ricalcolo canonico in batch notturno | H0 (v1 nel log) / H1 (v2) |
| **Carico acuto/cronico (ACWR)** | acuto = Σ carico 7gg; cronico = media mobile 28gg; carico seduta = volume_kg totale, oppure `durata × sRPE` quando sRPE presente (più robusto tra tipi di seduta) | Batch notturno | H0 (volume) / H1 (sRPE) |
| **Trend forza per pattern** | e1RM Epley `kg × (1 + reps/30)` sul top set per pattern; trend = regressione lineare 8 settimane; segnale se pendenza < 0 per 2 pattern per 4 settimane | Batch settimanale (domenica notte) | H0 |
| **Aderenza** | workout completati / programmati (28gg) + presenze QR / attese | Batch notturno | H0 |
| **Rischio churn (0–100)** | H0: euristica a punti — presenze 2 settimane < 50% della baseline personale (+30), streak check-in interrotto > 7gg (+20), rata `payment.overdue` (+25), nessun `workout.completed` 10gg (+25). H1: regressione logistica addestrata sugli churn reali multi-tenant | Batch notturno | H0 euristica / H1 modello |
| **Rischio infortunio (proxy, MAI diagnosi)** | Combinazione flag: ACWR > 1.5 **e** soreness ≥ 4 per 3gg **e/o** readiness < 40 per 3gg → "carico da rivedere". Wording non clinico obbligatorio ([06](./06-sicurezza-compliance.md)) | Batch notturno | H1 |

### 4.2 Readiness v2: fusione soggettivo + wearable (H1)

Principio: **il soggettivo comanda, l'oggettivo modula**. `readiness = base_soggettiva ± Δ_wearable`, con Δ limitato a ±15 punti: HRV del giorno sotto la baseline personale a 28gg di > 1 deviazione standard → −10; sonno < 6h → −5; RHR > baseline +8 bpm → −5 (cap complessivo −15/+15). Perché non un modello "scientifico" complesso: con i nostri volumi non è validabile, e un numero inspiegabile distrugge la fiducia del coach. Ogni punteggio v2 mostra la scomposizione ("72 = 78 soggettivo − 6 sonno") — cosa che Whoop non fa e che il coach ci chiede.

### 4.3 Architettura di calcolo: batch prima, realtime solo dove l'utente lo vede

| Modalità | Cosa | Perché |
|---|---|---|
| **Realtime client** (come oggi) | Punteggio readiness al submit; XP/badge | Feedback immediato = retention del check-in (target W4 ≥ 60%, 00-strategia) |
| **Batch notturno** (Cloud Function schedulata 04:00 Europe/Rome, Blaze) | Tutti gli stati derivati → riscrittura `twins/{person_id}` con `computed_at` e `formula_version` | Con ≤ 400 allievi/istanza: 1 esecuzione = secondi, costo ~0. La "freschezza a 24h" è sufficiente per decisioni di coaching, che sono giornaliere |
| **Trigger su soglia** (Function su create di eventi selezionati) | `payment.overdue`, readiness < 40, `coach.flag_raised` → notifica "da attenzionare" | Le uniche cose davvero urgenti; tutto il resto in batch |

Alternativa scartata: stream processing continuo (pattern "moderno"). A 30–5.000 allievi è complessità pura: il batch notturno rifà **tutto** il calcolo da zero (idempotente, senza stato incrementale da debuggare) finché il costo non lo vieta — e §7.3 mostra che non lo vieta prima di H2 inoltrato.

---

## 5. Wearable come sorgenti di eventi — **H1**

Posizione strategica ([00-strategia](./00-strategia.md) §3.1): i wearable **arricchiscono**, mai richiesti. Tecnicamente: **il telefono dell'allievo è il gateway** — HealthKit (iOS) e Health Connect (Android) si leggono on-device; nessuna integrazione server-to-server con Apple/Google/Whoop/Garmin in H1 (le API cloud dei singoli vendor sono rimandate a [05](./05-api-sdk-integrazioni.md), H2). Prerequisito: build native pubblicate sugli store (la PWA non accede a HealthKit) — dipendenza tracciata in [07-roadmap](./07-roadmap-milestones.md).

**Regola anti-mediocrità del settore**: non sincronizziamo stream grezzi (HR minuto-per-minuto stile Whoop). Ingeriamo **aggregati per giorno o per sessione**. Il grezzo resta sul device, dov'è già; a noi servono i segnali decisionali. Risultato: 4 eventi/giorno/persona invece di ~1.500 campioni, costi 100× inferiori e niente responsabilità di custodire dati che non usiamo (data minimization = anche argomento GDPR, [06](./06-sicurezza-compliance.md)).

### 5.1 Mappatura campi

| Evento | HealthKit (iOS) | Health Connect (Android) | Payload normalizzato | Note |
|---|---|---|---|---|
| `sleep.recorded` (1/giorno) | `HKCategoryTypeIdentifierSleepAnalysis` (aggregazione fasi) | `SleepSessionRecord` | `{start, end, total_min, in_bed_min, stages?: {deep, rem, light, awake}, device}` | `stages` opzionale: non tutti i device li danno; confidence 0.85 |
| `hr.resting_recorded` (1/giorno) | `HKQuantityTypeIdentifierRestingHeartRate` | `RestingHeartRateRecord` | `{bpm, day}` | confidence 0.9 |
| `hrv.recorded` (1/giorno) | `heartRateVariabilitySDNN` → `{metric: "sdnn", ms}` | `HeartRateVariabilityRmssdRecord` → `{metric: "rmssd", ms}` | `{metric, ms, day}` | **SDNN e RMSSD NON sono confrontabili tra loro**: si salva la metrica dichiarata e la baseline è sempre per-persona-per-metrica. Convertirle "a occhio" sarebbe falsificare il dato |
| `steps.recorded` (1/giorno) | `HKQuantityTypeIdentifierStepCount` (somma giorno) | `StepsRecord` (aggregato) | `{count, day}` | confidence 0.95; TTL 24 mesi (§7.2) |
| `workout.external_recorded` (per sessione) | `HKWorkout` | `ExerciseSessionRecord` | `{activity_type, start, end, kcal?, avg_hr?, source_app}` | Entra nel carico ACWR con `durata × sRPE stimato per attività` |

### 5.2 Sync e dedupe

- Sync all'apertura app + background fetch dove il SO lo consente; si legge la finestra `ultimo recorded_at − 48h` (i wearable scrivono in ritardo).
- ID evento deterministico `hash(type|person_id|day|metric)` → risincronizzare non duplica mai; il valore aggiornato dello stesso giorno genera `event.corrected`.
- Doppio device (es. Apple Watch + fascia): HealthKit deduplica a monte; noi registriamo `device` nel payload e in caso di conflitto vince la fonte con priorità dichiarata dall'utente nelle impostazioni.

---

## 6. Identità, multi-tenancy, portabilità del twin

### 6.1 `person_id` stabile ≠ uid Firebase — **H0**

Lo `uid` di Firebase Auth è **locale all'istanza** (un progetto Firebase per palestra): se domani l'allievo cambia palestra-cliente, o se in H2 consolidassimo istanze, lo uid non sopravvive. Decisione: alla creazione utente si genera un **`person_id` ULID indipendente**, salvato in `users/{uid}.person_id` e usato come chiave in `human_events` e `twins`. Costo oggi: un campo e una riga di codice. Costo di NON farlo: in H2 una migrazione di identità su milioni di eventi. È il classico centesimo speso oggi che vale mille euro domani.

### 6.2 `tenant_id` anche in istanze single-tenant — **H0**

Ogni evento porta `tenant_id` (slug da `brand.ts`) anche se oggi ogni istanza ne ha uno solo. Perché: (a) l'export BigQuery H2 (§7.4) aggrega più istanze e senza tenant_id gli eventi sarebbero indistinguibili; (b) la portabilità (§6.3) richiede di sapere *dove* è successo cosa; (c) costa un campo. Il multi-tenant vero (più palestre in un progetto) resta rimandato a H2 con soglia > 30 istanze ([00-strategia](./00-strategia.md), Decisioni).

### 6.3 Il twin appartiene alla persona (scelta strategica) — dichiarata H0, esercitabile H1/H2

Decisione di prodotto, non solo tecnica: **il Digital Human Twin è dell'allievo, non della palestra**. La palestra ha una *licenza d'uso* dei dati del twin per la durata del rapporto (formalizzata nei consensi e nel DPA, [06](./06-sicurezza-compliance.md)).

- **Perché**: (a) è la posizione difendibile con GDPR e con l'opinione pubblica — il contrario ("la palestra possiede i tuoi dati sanitari-adiacenti") è indifendibile; (b) è la feature di retention B2B travestita da diritto: l'allievo che si trasferisce porta il twin nella nuova palestra **se anche quella usa ESSĒRE** → effetto rete tra palestre clienti che nessun Trainerize ha; (c) rende onesta la narrativa "Human OS": un OS della persona che la persona non possiede è marketing bugiardo.
- **Meccanica**: H0 — la proprietà è dichiarata nei consensi e lo schema la rende possibile (person_id + export ricostruibile). H1 — export self-service (§6.4). H2 — "twin transfer": bundle firmato (eventi + snapshot twin + manifest media) generato dall'istanza di origine, importato in quella di destinazione previa verifica email della persona; gli eventi importati mantengono il `tenant_id` originale.
- **Cosa NON viene trasferito**: eventi business del vecchio tenant (pagamenti: sono della palestra), note interne staff (`nutritionTeamNotes`), chat. Si trasferisce il corpo-mente-capacità, non la contabilità altrui.

### 6.4 GDPR: export e cancellazione

| Diritto | H0 (manuale, runbook) | H1 (self-service) |
|---|---|---|
| Accesso/portabilità (art. 15/20) | Script Admin SDK: JSON eventi + snapshot twin + zip media, consegna entro 30gg | Pulsante "Scarica il mio twin" → Cloud Function → link firmato temporaneo |
| Cancellazione (art. 17) | Script: delete `human_events` per person_id (batch), media Storage, twin, doc legacy | Flusso in-app con conferma + periodo di grazia 30gg |
| Eccezione contabile | `financialTransactions` e ricevute si conservano 10 anni (obbligo fiscale, base giuridica diversa): si **pseudonimizzano** (person_id → tombstone), non si cancellano | idem |

L'append-only non confligge con l'art. 17: "append-only" vincola i *client*; la cancellazione GDPR è un'operazione privilegiata Admin SDK, documentata come runbook. Dettaglio giuridico (basi, consensi granulari, DPA white-label) in [06](./06-sicurezza-compliance.md).

---

## 7. Indici, retention, costi — e quando servirà un database analitico

### 7.1 Indici compositi (da creare in H0, basta con gli aggiramenti client-side)

| Collezione | Indice | Serve a |
|---|---|---|
| `human_events` | `(person_id ASC, ts DESC)` | Timeline persona (vista coach, export) |
| `human_events` | `(person_id ASC, type ASC, ts DESC)` | Calcolo stati derivati per dominio |
| `human_events` | `(tenant_id ASC, type ASC, ts DESC)` | KPI istanza, riepilogo AI settimanale |
| `wellnessChecks` | `(studentId ASC, timestamp DESC)` | Trend 7gg senza filtro client-side |
| `checkins` | `(studentId ASC, timestamp DESC)` | Presenze 4 settimane |
| `workoutLogs` | `(studentId ASC, date DESC)` + `(status ASC, date DESC)` | Aderenza, vista owner |
| `paymentPlans` | `(studentId ASC, endDate ASC)` | Scadenze e solleciti |

(I 9 indici già presenti in `firestore.indexes.json` restano; i nuovi si aggiungono lì e si deployano da CI, [01](./01-architettura.md).)

### 7.2 Retention (il log è il moat: default = si tiene, con eccezioni esplicite)

| Dato | Retention | Meccanismo |
|---|---|---|
| `human_events` (quasi tutti) | **Illimitata** — è il capitale dell'azienda (00-strategia §5.2) | — |
| `steps.recorded` | 24 mesi (il valore decisionale è nel trend recente; il twin conserva gli aggregati mensili) | Firestore TTL policy su `expires_at` |
| `notifications`, `chatTyping`, `userPresence` | 6 mesi / 48h / 48h | TTL |
| Foto posturali e progress | Illimitata (serie longitudinale = valore) ma **compresse client-side a ≤ 300KB** prima dell'upload | Fix immediato quota Storage, H0 settimana 1 |
| Media chat | 12 mesi | Lifecycle rule Storage |
| Ricevute/documenti fiscali | 10 anni | Obbligo di legge |

### 7.3 Costi Firestore per scenario (tariffe ordine di grandezza, region EU: letture ~0,06 $/100k, scritture ~0,18 $/100k, storage ~0,18 $/GB/mese; free tier Blaze: 50k letture + 20k scritture/giorno)

| Scenario | Eventi scritti | Letture (batch + UI) | Storage eventi | Costo Firestore stimato |
|---|---|---|---|---|
| **H0** — MML, 30 allievi (~22 AAT × ~6 eventi/gg) | ~4k/mese (+dual-write legacy) | batch: 22 twin × ~300 eventi 28gg ≈ 200k/mese; UI simile | ~40k eventi/anno ≈ 0,05 GB | **~0 €** (dentro il free tier) |
| **H1** — 10 istanze, 500 AAT | ~120k/mese totali | ~2M/mese totali | ~1,5M eventi/anno ≈ 2 GB | **< 2 €/mese per istanza** (nel margine di [00-strategia](./00-strategia.md) §4.2) |
| **H2** — 10.000 AAT (~8 eventi/gg con wearable) | ~2,4M/mese ≈ 4–5 $ | batch naïf: 10k × 250 eventi/gg ≈ **75M/mese ≈ 45 $** e cresce linearmente | ~30M eventi/anno ≈ 40 GB ≈ 7 $/mese | **50–100 $/mese** → scatta §7.4 |

Nota: a H2 il costo dominante non sono le scritture ma le **letture del batch**. Prima leva (gratis): il batch diventa incrementale (legge solo gli eventi del giorno + lo stato precedente del twin) → letture ÷ 20. Seconda leva: §7.4.

### 7.4 Quando serve un database analitico — criterio numerico, non mode

Firestore è perfetto come **store operativo** (documenti, realtime, offline) e pessimo per **analytics** (niente aggregazioni, si paga per documento letto). La risposta di settore "migriamo tutto su Postgres/ClickHouse" è mediocre per una persona sola: il modo 10x per noi è l'estensione ufficiale **"Stream Firestore to BigQuery"** — zero codice, zero server, ogni evento replicato in una tabella BigQuery interrogabile in SQL (costo: ~5 $/TB scansionato, storage ~0,02 $/GB — ai nostri volumi, euro/mese).

**Criteri di attivazione** (il primo che scatta):

| Trigger | Soglia | Azione |
|---|---|---|
| Istanze attive | > 10 | Attivare l'estensione BigQuery su ogni istanza, dataset centrale pseudonimizzato per benchmark cross-palestra (con base giuridica, [06](./06-sicurezza-compliance.md)) |
| Costo letture analitiche Firestore | > 30 €/mese complessivi | Spostare i calcoli batch pesanti (trend lunghi, coorti, training set churn) su BigQuery; il batch notturno scrive comunque i twin su Firestore |
| Singola feature analitica | richiede scan > 1M documenti | Nasce direttamente su BigQuery |
| **Time-series DB dedicato** (ClickHouse/Timescale) | **solo se** BigQuery supera 500 €/mese **o** serve latenza interattiva < 1s su > 100M righe | Probabilmente **mai** entro H2: a 10k AAT il log fa ~30M eventi/anno = giocattolo per BigQuery |

Alternativa scartata: partire oggi con Postgres + TimescaleDB "perché prima o poi servirà". Costo: un server da amministrare, backup, migrazioni, un secondo modello di sicurezza — per un volume dati che sta in RAM di un laptop. Con bus factor 1, ogni componente operato a mano è un rischio R1 ([00-strategia](./00-strategia.md) §6).

---

## Decisioni chiave

| Decisione | Perché | Alternativa scartata |
|---|---|---|
| **Twin = event log append-only (`human_events`) + stati derivati ricostruibili (`twins/{person_id}`)** | La serie temporale etichettata dal coach è il moat (00-strategia §5); lo stato sovrascritto la distrugge; il twin-cache si rigenera dal log (bugfix e GDPR semplici) | "Profilo ricco" con ultimo valore noto (perde la storia); event sourcing completo con CQRS/proiezioni multiple (cerimonia insostenibile per 1 persona) |
| **Strangler fig: backfill + dual-write; le collezioni legacy restano la fonte della UI** | App in produzione, zero test, 1 persona: il big-bang è il modo più rapido di rompere tutto; il log affianca e le viste migrano quando conviene | Migrazione one-shot a "schema pulito"; oppure non fare nulla e tenere 40 collezioni mutabili |
| **Granularità evento = decisione di coaching (seduta, check-in, misura), non set singolo** | 30–50 eventi/workout = costi ×40 e zero valore analitico in più; il dettaglio resta nel doc legacy via `source_ref` | Event sourcing purista a granularità massima |
| **`person_id` ULID stabile separato dallo uid Firebase, + `tenant_id` su ogni evento fin da oggi** | Lo uid è locale all'istanza; portabilità e consolidamento H2 diventano possibili al costo di un campo oggi | Usare lo uid (migrazione di identità su milioni di eventi in H2); rimandare "a quando servirà" |
| **Il twin appartiene alla persona; la palestra ne ha una licenza d'uso** | Unica posizione GDPR-difendibile; il twin trasferibile tra palestre ESSĒRE è un effetto rete che nessun competitor ha; rende vera la narrativa Human OS | Dati di proprietà della palestra (indifendibile e strategicamente sterile) |
| **Wearable: aggregati giorno/sessione via HealthKit/Health Connect on-device; mai stream grezzi, mai API cloud vendor in H1** | 4 eventi/gg vs ~1.500 campioni: costi 100× inferiori, data minimization reale, niente integrazioni server da mantenere in solitaria | Ingestione raw stile Whoop; integrazioni server-to-server per singolo vendor (Garmin, Polar…) in H1 |
| **Stati derivati: batch notturno full-recompute + realtime solo dove l'utente lo vede (readiness al submit, alert soglia)** | A ≤ 400 allievi/istanza il batch costa ~0 ed è idempotente (niente stato incrementale da debuggare); la decisione di coaching è giornaliera, non al secondo | Stream processing continuo (complessità senza beneficio ai nostri volumi) |
| **Analytics: estensione Firestore→BigQuery a soglie numeriche (>10 istanze, o >30 €/mese di letture analitiche); TSDB dedicato solo oltre 500 €/mese di BigQuery** | Zero-ops, SQL vero, euro/mese; mantiene Firestore come store operativo dov'è forte | Postgres/ClickHouse dal giorno 1 (server da amministrare con bus factor 1, per dati che stanno in RAM di un laptop) |

---

## Cosa NON faremo (e perché)

1. **Niente riscrittura delle collezioni esistenti in H0.** Il log si affianca (dual-write); si rifonda solo ciò che è pericoloso (`users.managedPassword`, `config/aiKey`) o bloccante (`exerciseLibrary.pattern`). Ogni settimana l'app in produzione resta in produzione.
2. **Il contenuto delle chat e del diario NON entra nel twin.** Solo metadati (`diary.entry_added`, senza testo). Conversazioni private nel dataset = rischio GDPR sproporzionato e rumore per l'AI. Se in H2 servirà segnale dal testo, sarà estrazione on-the-fly con consenso dedicato ([03](./03-ai-engine.md)), non archiviazione nel log.
3. **Niente ontologie sanitarie (FHIR/HL7/LOINC) in H0/H1.** Siamo wellness, non sanità ([00-strategia](./00-strategia.md), "Cosa NON faremo" #3). Adottare FHIR oggi = mesi di mapping per zero clienti che lo chiedono. Se le cliniche H2 lo richiederanno, sarà un *adapter di export* in [05](./05-api-sdk-integrazioni.md), non il modello interno.
4. **Niente stream raw dai wearable** (HR minuto-per-minuto, accelerometria). Custodire dati che non usiamo è costo + responsabilità; il grezzo resta sul device dell'utente, dov'è già.
5. **Niente "data lake" o TSDB prima delle soglie di §7.4.** I numeri decidono, non l'architettura-invidia.
6. **Niente conversione tra metriche HRV non confrontabili** (SDNN ↔ RMSSD). Baseline sempre per-persona-per-metrica: un numero "normalizzato" inventato sarebbe precisione finta — l'opposto di "precisione scientifica" promessa dal mandato.
7. **Niente eventi retroattivi falsificabili.** `ts` nel passato è ammesso (backfill, wearable in ritardo) ma `recorded_at` è sempre il momento reale di scrittura e le rules impediscono update/delete: il log deve poter essere mostrato a un cliente white-label (o a un auditor) come degno di fiducia.
8. **Niente schema "aperto" del payload.** Tassonomia chiusa e payload validati (zod condiviso): la flessibilità totale oggi = palude di dati inconsistenti in H2. Aggiungere un tipo costa una PR sul pacchetto documenti — ed è un costo voluto.

---

*Prossimo documento: [03-ai-engine.md](./03-ai-engine.md) — come l'AI engine consuma `human_events` e gli stati derivati del twin, dietro il proxy definito in [01-architettura](./01-architettura.md).*
