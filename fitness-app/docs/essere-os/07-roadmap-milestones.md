# ESSĒRE OS — 07 · Roadmap & Milestones

> **Pacchetto documenti**: [00-strategia](./00-strategia.md) · [01-architettura](./01-architettura.md) · [02-dati-digital-twin](./02-dati-digital-twin.md) · [03-ai-engine](./03-ai-engine.md) · [04-ux-design](./04-ux-design.md) · [05-api-sdk-integrazioni](./05-api-sdk-integrazioni.md) · [06-sicurezza-compliance](./06-sicurezza-compliance.md) · **07-roadmap-milestones (questo)**
>
> **Stato**: bozza fondativa · luglio 2026 · owner: Francesco Busanca (founder) + architettura
>
> **Orizzonti**: **H0 "Fondamenta"** (0–3 mesi, 1 persona + AI, budget ~0) · **H1 "Prodotto"** (3–12 mesi, i primi clienti white-label pagano lo sviluppo) · **H2 "Piattaforma"** (12–36 mesi, team + capitale).

---

## 0. Il principio: ogni milestone è SPEDIBILE e VENDIBILE

Regola non negoziabile: **una milestone si chiude solo se, il giorno della chiusura, o Mind Movement Lab usa qualcosa di nuovo in produzione, o un cliente white-label può comprare qualcosa che prima non poteva comprare.** Niente milestone "infrastruttura per il futuro" pure: l'infrastruttura entra in roadmap solo agganciata a un valore immediato (es. il proxy AI non è "architettura pulita", è "posso firmare il primo contratto senza rischiare un incidente su dati salute" — gate di vendita R6, [00-strategia §6](./00-strategia.md)).

Corollari operativi:

1. **L'app in produzione resta in produzione.** Nessuna milestone può spegnere `essere-3fe6f.web.app` o degradare una funzione usata dai 30 allievi di MML. Migrazione strangler, mai big bang ([01-architettura §4](./01-architettura.md)).
2. **Ogni milestone ha criteri di accettazione misurabili**, verificabili da una persona esterna in < 1 ora. "Fatto" senza numero non esiste.
3. **Effort in settimane-persona con AI pair** (Claude Code come pair fisso): stima onesta per un founder non tecnico che scrive codice con AI, non per un senior dev. Include il 30% di tasse impreviste (debug, review store, cose che si rompono).
4. **Se una milestone supera del 50% l'effort stimato, si taglia lo scope, non la deadline.** La versione ridotta spedibile batte sempre la versione completa in ritardo.
5. **Il filtro d'ingresso è la NSM**: ogni item deve muovere gli Allievi Attivamente Tracciati o il numero di palestre clienti ([00-strategia §7](./00-strategia.md)). "Ma Trainerize ha X" non è un argomento.

### Modifica dichiarata alla sequenza proposta

La sequenza di partenza metteva il primo cliente white-label dentro M6 (mese ~9). È un errore da startup finanziata: **il primo cliente pilota non ha bisogno di provisioning automatizzato, store nativi né Stripe** — il playbook WHITE-LABEL.md e `brand.ts` esistono già e funzionano a mano. Quindi:

- **M3.5 "Primo cliente pilota" è una milestone commerciale esplicita**, collocata appena chiuse le precondizioni tecniche di vendita (M0+M1) e di presentabilità (M2). Si vende con la PWA. Un cliente vero al mese 4–5 vale più di qualunque feature: valida il pricing, paga l'infrastruttura, e i suoi feedback ordinano M4–M6 meglio di qualsiasi piano.
- **M6 diventa "White-label GA"**: industrializzare ciò che il pilota ha già validato a mano (provisioning, billing Stripe, 3 clienti totali). Automatizzare prima di aver venduto = automatizzare le ipotesi sbagliate.
- **M4 (store) e M5 (wearable) restano dopo M3.5**, ma il loro ordine relativo con M6 è flessibile: lo decidono i clienti (se i primi 2 piloti chiedono "app sullo store" per credibilità, M4 sale; se chiedono "voglio il terzo cliente", M6 sale). La roadmap fissa le dipendenze, il mercato fissa le priorità dentro H1.

---

## 1. Vista d'insieme

| # | Milestone | Orizzonte | Effort (sett.-persona + AI) | Finestra indicativa | Valore vendibile il giorno della chiusura |
|---|---|---|---|---|---|
| M0 | Consolidamento | H0 | 2–3 | mesi 0–1 | MML su base sicura; "gate di vendita" R6 al 50% |
| M1 | AI Gateway | H0 | 3 | mesi 1–2 | Gate di vendita chiuso: si può firmare un contratto |
| M2 | UX Reset | H0 | 4–5 | mesi 2–3 | App mostrabile in demo commerciale senza scuse |
| M3 | Twin v1 | H0→H1 | 3–4 | mesi 3–4 | Argomento di vendita unico: timeline persona coach+allievo |
| **M3.5** | **Primo cliente pilota** | **H1** | 2 (di cui 1 commerciale) | mesi 4–5 | **Primo MRR. Il resto della roadmap si autofinanzia** |
| M4 | Store nativi | H1 | 4 | mesi 5–7 | Push affidabili, credibilità "vera app", prerequisito wearable |
| M5 | Wearable v1 | H1 | 3–4 | mesi 7–8 | Readiness arricchita: il cuneo anti-Whoop diventa dimostrabile |
| M6 | White-label GA | H1 | 5–6 | mesi 8–10 | 3 palestre paganti, onboarding < 1 giorno, billing automatico |
| **M6.5** | **Motore commerciale** | **H1** | continuativa (≈ ½ giornata/sett.) | mesi 9–15 | Da 3 a 8–12 palestre: cadenza demo, pipeline, referral — in parallelo a M7 |
| M7 | Dashboard B2B | H1→H2 | 6–8 | mesi 10–14 | Upsell PRO/STUDIO; retention titolari; porta per cliniche/aziende |
| M8 | Piattaforma | H2 | continuativo | mesi 14–36 | API pubbliche, SDK, marketplace beta, community |

**Aritmetica onesta di H0** (una roadmap che vieta il lavoro invisibile deve fare i conti giusti): M0–M2 sommano 9–11 settimane-persona **includendo** i deliverable privacy di [06](./06-sicurezza-compliance.md) mese 1–2 (consensi art. 9, registro trattamenti + DPIA + data-manifest, App Check, piano IR) e i lavori H0 di [04](./04-ux-design.md) (estrazione i18n, strumentazione tap-to-value, code-splitting) — che qui sono deliverable numerati dentro M0/M1/M2, non extra. Con fattore 1,4–1,6 tra effort e calendario per un founder che fa anche il coach: **H0 = M0+M1+M2 chiude realisticamente al mese 3,5–4**. M3 (Twin v1) apre H1: il gate di vendita NON dipende da M3 — si può firmare il pilota dopo M2.

---

## 2. Milestone dettagliate

### M0 — Consolidamento · H0 · 2–3 settimane

**Obiettivo**: rimuovere i due rischi che possono uccidere il progetto in un giorno (leak di password, deploy manuale che rompe la produzione) e vedere gli errori quando accadono.

**Deliverable**:
1. **Bonifica `managedPassword`** (CRITICO, giorno 1–3): rimozione del campo in chiaro da `users/{uid}`; migrazione al flusso reset-password di Firebase Auth per gli account gestiti; script one-shot di pulizia dei documenti esistenti; verifica che nessuna schermata lo legga più.
2. **Hardening regole Firestore**: revisione completa delle security rules per ruolo; test regole con Emulator Suite sui 10 casi peggiori ("lo studente A legge i pagamenti dello studente B", "l'academy_student legge la dashboard finanziaria") — i test sono il deliverable, non la revisione a occhio.
3. **Upgrade a Blaze** con budget alert GCP a 2 soglie (10 €/50 €): sblocca Cloud Functions (serve a M1) e risolve la quota Storage.
4. **CI/CD GitHub Actions** come da [01-architettura §7.1](./01-architettura.md): typecheck + eslint + vitest sui test puri; deploy staging automatico su `main`, prod su tag con conferma. Progetto `essere-staging` creato. **Revoca il giorno stesso del service account incollato in chat.**
5. **Test smoke sui "puri"**: calcolo prontezza Stato ESSĒRE, XP/badge, scadenze rate — la logica che fa danni se sbaglia (soldi e punteggi), zero infrastruttura di test.
6. **Sentry** (piano free) su web: error tracking con source map, alert su canale Telegram/WhatsApp del founder.
7. **Fondamenta privacy** (da [06 §3](./06-sicurezza-compliance.md), qui e non "a lato"): schermata consensi art. 9 granulari (incluso il consenso dedicato per finalità secondarie di 06 §3.1 — dal giorno 1, o il moat resta carta); prima stesura registro trattamenti + DPIA + data-manifest versionati in repo.

**Criteri di accettazione**:
- Nessun documento in `users/*` contiene `managedPassword` (query di verifica in CI).
- 10/10 test regole passano in CI; una modifica alle rules senza test che passa NON deploya.
- 100% dei deploy passano dalla pipeline (0 deploy manuali da questa milestone in poi — metrica H0 di [00-strategia §7.2](./00-strategia.md)).
- Un errore JS lanciato di proposito in staging arriva su Sentry in < 5 minuti.
- Costo infrastruttura mensile post-Blaze < 20 €.

**Dipendenze**: nessuna. **Rischio**: basso — lavoro noto, nessuna incognita di prodotto. Unico punto d'attenzione: la migrazione password va provata su staging con 3 account prima di toccare prod.

**Valore di business immediato**: MML smette di essere una bomba a orologeria reputazionale; il founder smette di poter distruggere la produzione con un comando sbagliato. Metà del gate di vendita R6 è chiusa.

---

### M1 — AI Gateway · H0 · 3 settimane

**Obiettivo**: nessuna chiave Anthropic esce mai più dal server. Tutte le chiamate AI passano da un proxy con budget, rate-limit e logging per utente/tenant. Dettaglio tecnico in [03-ai-engine §0](./03-ai-engine.md).

**Deliverable**:
1. Cloud Function HTTP `POST /v1/ai/messages` (+ `POST /v1/ai/vision` per le foto) — **il contratto unico definito in [01-architettura §2.2](./01-architettura.md), eseguito alla lettera**: HTTP function (non callable: le callable non fanno streaming SSE e non sono rotte REST versionabili), richiede ID token Firebase, campo `feature` dal registro moduli di [03 §0.2](./03-ai-engine.md), prompt server-side, risposta in streaming SSE, prima rotta di `openapi.yaml` ([05 §1.2](./05-api-sdk-integrazioni.md)). La chiave vive in Secret Manager.
2. **Budget e rate-limit**: quota giornaliera per utente e per istanza (documento `aiUsage` aggiornato dal gateway); risposta "quota esaurita" gestita in UI con messaggio chiaro, non con errore muto.
3. **Migrazione delle 8 funzioni AI** (posturale, composizione corporea, consiglio Stato ESSĒRE, AI Coach chat, riepilogo settimanale owner, Assistente ESSĒRE, + 2 minori) al gateway, una alla volta, con feature flag per rollback.
4. Rimozione della chiave da `config/aiKey` e dal client; **rotazione della chiave** (quella attuale è da considerare compromessa); rimozione dell'header `anthropic-dangerous-direct-browser-access`.
5. Prompt caching e model-tiering nel gateway, come da [03-ai-engine §0.3–§1.7](./03-ai-engine.md): **Assistente ESSĒRE → `claude-sonnet-4-5` con prompt caching** (è la superficie a più alto volume: tenerla su Opus è la combinazione più cara possibile ed è il primo motivo economico della migrazione); `claude-opus-4-8` SOLO per la vision (posturale/composizione) e il riepilogo settimanale owner; `claude-haiku-4-5` per i triage. Il proxy è anche la leva costi.
6. Valutazione rimozione dell'offuscazione lato web: il valore da proteggere (prompt e logica) ora sta sul server ([01-architettura §5](./01-architettura.md)).
7. **App Check** attivo su Firestore/Storage/Functions e **piano di incident response minimo** scritto ([06 §2.2/§7.1](./06-sicurezza-compliance.md)): chiudono la parte di roadmap security di 06 mese 2 che non era assegnata a nessuna milestone.

**Criteri di accettazione**:
- `grep` in CI: zero occorrenze di chiavi/endpoint Anthropic nel bundle client.
- 8/8 funzioni AI funzionanti via gateway in prod, verificate da un utente reale MML per ciascuna.
- Un utente che supera la quota giornaliera vede il messaggio dedicato; il costo AI del giorno è leggibile in `aiUsage`.
- Chiave vecchia revocata sul dashboard Anthropic.
- Costo AI mensile MML entro 15–50 € ([01-architettura §8](./01-architettura.md)).

**Dipendenze**: M0 (Blaze per le Functions, CI per deployarle). **Rischio**: medio — la migrazione di 8 funzioni una alla volta è lunga ma reversibile; il rischio vero è la latenza percepita (aggiungere streaming sulle chat per compensare).

**Valore di business immediato**: **gate di vendita R6 completamente chiuso** — da qui in poi si può firmare un contratto white-label. In più: controllo costi AI per tenant, precondizione del pricing "AI fair-use + overage" ([00-strategia §4.1](./00-strategia.md)).

---

### M2 — UX Reset · H0 · 4–5 settimane

**Obiettivo**: da ~20 tab scorrevoli a una navigazione a 5 tab con home "Oggi", su design token. L'app deve reggere una demo di vendita e una review Apple. Specifica completa in [04-ux-design §2–4](./04-ux-design.md).

**Deliverable**:
1. **Navigazione allievo a 5 tab** (Oggi · Allenamento · Progressi · Community/Chat · Profilo) e navigazione coach/owner rifondata come da doc 04; tutte le ~20 destinazioni esistenti raggiungibili ma gerarchizzate.
2. **Home "Oggi"**: check-in Stato ESSĒRE, workout del giorno, prossimo appuntamento, streak — la schermata che si apre 5 volte al giorno.
3. **Design token** (`ESSĒRE UI`): colori, spaziature, tipografia in un unico file tema; regola eslint "niente colori hardcoded" attiva in CI (sana il debito "colori fuori palette" in modo strutturale, non a caccia).
4. Migrazione delle 10 schermate più usate ai token; le altre a scalare (tracker di copertura nel repo).
5. Test con 5 allievi MML reali: task "trova X" cronometrati prima/dopo, con strumentazione tap-to-value attiva (eventi `analytics/`, [04](./04-ux-design.md); estrazione stringhe i18n contestuale alle schermate toccate).
6. **Code-splitting del bundle web** (il problema #8 di [04 §1](./04-ux-design.md), gravità ALTA, finora senza proprietario): lazy-load per rotta (expo-router async routes) + rimozione di `javascript-obfuscator` dalla build web (possibile dopo M1: i prompt sono sul server). Non è banale su Expo/Metro web: è lavoro reale, e sta qui.

**Criteri di accettazione**:
- Tab bar allievo = 5 voci, zero scroll orizzontale della navigazione.
- I 5 task-campione (fare check-in, aprire il workout, vedere lo storico, scrivere al coach, vedere le rate) completati da un allievo nuovo in < 30 secondi ciascuno.
- Regola colori attiva in CI; ≥ 10 schermate sui token.
- Bundle iniziale web < 1,5 MB e time-to-interactive < 3 s misurato su 4G reale (baseline attuale: ~4 MB, TTI > 5 s).
- Nessun calo di retention del check-in Stato ESSĒRE nelle 2 settimane post-rilascio (il redesign non deve rompere l'abitudine).

**Dipendenze**: M0 (CI per la regola colori). Indipendente da M1 → **parallelizzabile**: nelle settimane in cui M1 aspetta verifiche in prod, si lavora a M2. **Rischio**: medio — il rischio è l'abitudine dei 30 utenti attuali: mitigato con rollout su 5 utenti pilota prima di tutti.

**Valore di business immediato**: demo vendibile (la prima impressione col titolare di palestra decide il contratto); prerequisito esplicito della submission Apple (M4, [01-architettura §5](./01-architettura.md)).

---

### M3 — Twin v1 · H0→H1 · 3–4 settimane

**Obiettivo**: dare al Digital Human Twin la sua spina dorsale tecnica (`human_events`) e la sua faccia visibile (timeline persona), e portare la readiness a v2. Schema in [02-dati-digital-twin §3–4](./02-dati-digital-twin.md).

**Deliverable**:
1. **Collezione `human_events`** con schema evento canonico: da ora, check-in Stato ESSĒRE, set completati, presenze QR, misurazioni e valutazioni posturali scrivono anche un evento (dual-write; le collezioni esistenti restano fonte per le UI attuali — strangler, non migrazione).
2. **Readiness v2**: formula versionata, calcolata server-side (fonte di verità) con ricalcolo client-side per l'offline; changelog della formula nel repo ([03-ai-engine §2](./03-ai-engine.md)).
3. **Timeline persona**: vista cronologica unificata degli eventi dell'allievo — visibile all'allievo ("la mia storia") e al coach (con layer "da attenzionare"). È la prima UI che esiste SOLO grazie al twin.
4. Backfill best-effort degli ultimi 90 giorni dagli archivi esistenti (workout, check-in) in `human_events`.
5. Indici compositi Firestore dichiarati in `firestore.indexes.json` e deployati da CI (sana il debito "query aggirate client-side" almeno sulle query del twin).

**Criteri di accettazione**:
- ≥ 5 tipi di evento in scrittura dual-write in prod; zero regressioni sulle UI esistenti.
- Timeline di un allievo MML con ≥ 30 giorni di storico caricata in < 2 secondi.
- Readiness v2 riproducibile: stesso input → stesso punteggio, test in CI.
- Almeno 1 coach MML usa la timeline in una conversazione reale con un allievo (verifica qualitativa, intervista).
- Metrica H0 "AAT su MML ≥ 22/30" misurabile automaticamente da `human_events`.

**Dipendenze**: M0 (CI, indici), beneficia di M1 (consiglio readiness via gateway). **Rischio**: medio-alto — il dual-write è la parte delicata: un bug scrive dati sporchi nel twin. Mitigazione: eventi con `schemaVersion`, validazione nel gateway di scrittura, e il twin per 90 giorni è "secondo sistema" non ancora fonte di verità.

**Valore di business immediato**: l'argomento di vendita che nessun competitor gestionale ha ("il titolare vede la storia completa di ogni allievo") e la base tecnica di TUTTO ciò che segue (wearable M5, dashboard M7, API M8 leggono eventi).

---

### M3.5 — Primo cliente pilota · H1 · 2 settimane (1 tecnica + 1 commerciale)

**Obiettivo**: la prima palestra NON-MML paga setup + canone. Milestone commerciale con supporto tecnico minimo: si vende ciò che esiste, con la PWA, provisioning a mano da WHITE-LABEL.md.

**Deliverable**:
1. Pipeline commerciale: lista di 10 palestre nella rete del founder; 5 demo fatte; 1 contratto firmato (contratto + DPA da [06-sicurezza-compliance](./06-sicurezza-compliance.md)).
2. Provisioning manuale documentato e cronometrato: nuova istanza Firebase, `brand.ts`, listino, info palestra, migrazione anagrafiche, formazione staff 2h. Ogni passo annotato → diventa la spec dell'automazione di M6.
3. Prezzo pieno da listino ([00-strategia §4.1](./00-strategia.md)): setup 1.490 € + canone. **Nessuno sconto "pilota" sul canone** — al massimo si regala un mese, mai si tocca il prezzo: il pilota serve a validare il pricing, uno sconto lo invalida.
4. Canale di feedback strutturato col titolare: 1 call quindicinale, richieste tracciate e filtrate dalla NSM.

**Criteri di accettazione**:
- 1 contratto firmato a prezzo di listino; setup fee incassato.
- Provisioning completato in ≤ 2 giorni-persona (baseline per M6: target < 1 giorno automatizzato).
- Al giorno 30: ≥ 50% degli allievi del cliente sono AAT (allarme prodotto se sotto, [00-strategia §7.2](./00-strategia.md)).
- Zero accessi del founder ai dati del cliente fuori dalle procedure concordate nel DPA.

**Dipendenze**: M0+M1 (gate di vendita), M2 (demo presentabile). M3 aiuta ma non blocca. **Rischio**: alto ed è giusto così — è il primo test di mercato vero. Se dopo 5 demo nessuno firma, il problema è pricing/segmento e va affrontato SUBITO, non al mese 12 (guardia R8).

**Valore di business immediato**: primo MRR; il resto di H1 è pagato da un cliente, non dai risparmi del founder. E ogni feature successiva ha un secondo utente reale che la valida.

---

### M4 — Store nativi · H1 · 4 settimane

**Obiettivo**: da PWA a app su App Store e Play Store via EAS (config già pronta), con push nativi affidabili. Piano dettagliato in [01-architettura §5](./01-architettura.md).

**Deliverable**:
1. Build EAS iOS/Android; account Apple Developer (99 $/anno) e Play Console (25 $).
2. **Push nativi** via `expo-notifications` (APNs/FCM): promemoria pagamento, "da attenzionare", messaggi chat. Token per device in `users/{uid}/devices`.
3. Checklist submission: account demo reviewer; **cancellazione account in-app** (obbligo Apple 5.1.1(v)); privacy manifest + App Privacy labels categoria salute; disclaimer "non è un dispositivo medico" su posturale/composizione ([06-sicurezza-compliance](./06-sicurezza-compliance.md)); rimozione offuscazione/anti-debug dalla build nativa.
4. Pagamenti: nessun IAP — gli abbonamenti palestra sono servizi fisici (Apple 3.1.3(e)); l'Academy resta interna allo staff per non entrare nel perimetro IAP (decisione dedicata se cambia).
5. TestFlight con 10 utenti MML per 2 settimane → submission → pubblicazione. EAS Update per hotfix JS su canali staging/production collegati alla CI.
6. La PWA resta viva: canale demo, fallback, desktop dei coach.

**Criteri di accettazione**:
- App approvata e pubblica su entrambi gli store (prima submission respinta = normale: budget 1 iterazione di review incluso nell'effort).
- Push ricevuta su iOS reale con app chiusa (il caso che la PWA non copre).
- ≥ 70% degli allievi attivi MML migrati all'app nativa entro 30 giorni.
- Crash-free rate ≥ 99% (Sentry/Crashlytics).

**Dipendenze**: M1 (mai sottoporre a review un'app con chiave API nel client), M2 (UX presentabile alla review). **Rischio**: medio-alto e fuori controllo diretto: i tempi della review Apple su un'app "salute" non li decidiamo noi. Mitigazione: submission il prima possibile dentro la milestone, non alla fine.

**Valore di business immediato**: credibilità commerciale ("siete sullo store?" è la seconda domanda di ogni titolare), promemoria pagamento che arrivano davvero (= incassi delle palestre clienti), e **prerequisito tecnico assoluto di M5** (HealthKit non esiste su PWA).

---

### M5 — Wearable v1 · H1 · 3–4 settimane

**Obiettivo**: HealthKit (iOS) e Health Connect (Android) come sorgenti di eventi del twin; la readiness si arricchisce con sonno e HR/HRV dai dispositivi che gli allievi GIÀ possiedono. Dettaglio in [05-api-sdk-integrazioni §6](./05-api-sdk-integrazioni.md) e [02-dati-digital-twin §5](./02-dati-digital-twin.md).

**Deliverable**:
1. Permessi e lettura HealthKit/Health Connect: sonno (durata/qualità), resting HR, HRV, passi. Solo lettura, opt-in esplicito per tipo di dato.
2. Normalizzazione in `human_events` (tipi evento `sleep`, `hr`, ecc. con `source: healthkit|health_connect`): il wearable è UNA sorgente tra le altre, mai un requisito.
3. **Readiness v2.1**: formula che integra i dati oggettivi QUANDO ci sono, con confidenza dichiarata ("readiness basata su check-in + sonno Apple Watch"); senza wearable il punteggio resta pienamente funzionante (tesi del cuneo: software-first).
4. UI: badge sorgenti sul punteggio; vista coach che distingue dato soggettivo da oggettivo.
5. Aggiornamento App Privacy labels e informativa ([06-sicurezza-compliance](./06-sicurezza-compliance.md)): i dati salute da sensore alzano l'asticella GDPR.

**Criteri di accettazione**:
- ≥ 10 allievi MML con almeno una sorgente wearable collegata; eventi che fluiscono da ≥ 3 marche di dispositivi diverse (Apple Watch + almeno 2 tra Garmin/Xiaomi/Samsung via Health Connect).
- Readiness identica in assenza di wearable (test di regressione: nessun allievo "punito" perché non ha il device).
- Divergenza soggettivo/oggettivo visibile al coach (il caso interessante: l'allievo dice "sto bene" ma ha dormito 4 ore).

**Dipendenze**: M4 (build native), M3 (`human_events`). **Rischio**: medio — la qualità dei dati Health Connect varia molto per marca; mitigazione: confidenza per sorgente, mai promettere precisione clinica.

**Valore di business immediato**: il cuneo anti-Whoop/Oura diventa dimostrabile in demo — **dopo verifica su device reali**: Whoop/Oura esportano su HealthKit/Health Connect solo un sottoinsieme ([05 §6.1](./05-api-sdk-integrazioni.md)); il claim "il tuo Whoop lo leggiamo" entra nel pitch SOLO se testato, altrimenti si dimostra con Apple Watch/Garmin ("il tuo coach, Whoop non ce l'ha" resta vero comunque); argomento di differenziazione secco contro i gestionali italiani, nessuno dei quali tocca i dati salute.

---

### M6 — White-label GA · H1 · 5–6 settimane

**Obiettivo**: da "un pilota gestito a mano" a "prodotto ripetibile": provisioning automatizzato, billing Stripe, **3 palestre clienti attive in totale**.

**Deliverable**:
1. **Provisioning semi-automatizzato**: script CLI (o pipeline CI dedicata) che crea l'istanza Firebase, applica rules/indici/Functions, genera `brand.ts` da un file di configurazione, attiva la licenza (`config/license`). Target: < 1 giorno-persona per cliente, dai ≤ 2 giorni del pilota.
2. **Billing Stripe**: subscription per il canone (149/249/399 a scaglioni), invoice per il setup fee; dunning automatico; kill-switch licenza collegato allo stato subscription (grace period 14 giorni — mai spegnere una palestra a metà mese per un pagamento in ritardo di 2 giorni).
3. **Costo AI per tenant in fattura**: la quota fair-use e l'eventuale overage pass-through +30% leggibili dal titolare ([03-ai-engine](./03-ai-engine.md)).
4. Onboarding kit: video formazione staff (registrati una volta), checklist go-live, Assistente ESSĒRE configurato sul listino del cliente dal giorno 1.
5. Commerciale: da 1 a 3 clienti paganti (referral del pilota + rete founder).
6. Runbook operativo multi-istanza: aggiornare N istanze da CI, monitoraggio errori aggregato per tenant su Sentry.

**Criteri di accettazione**:
- 3 palestre paganti attive (incluso il pilota), tutte a prezzo di listino.
- Provisioning nuovo cliente ≤ 1 giorno-persona, misurato sul terzo cliente.
- 100% dei canoni incassati via Stripe senza intervento manuale.
- Deploy di un aggiornamento su tutte le istanze da CI in < 1 ora.
- AAT ≥ 50% degli allievi in ciascuna palestra al giorno 30 dal go-live.

**Dipendenze**: M3.5 (il pilota definisce COSA automatizzare), M0 (CI). **Rischio**: medio — la trappola è over-automatizzare: con 3–10 clienti lo script CLI basta e avanza; la corsia multi-tenant parte solo al trigger unico di [01-architettura §3.1](./01-architettura.md) (> 10 istanze attive o > 4 h/settimana di ops).

**Valore di business immediato**: ~550–750 €/mese di MRR (3 clienti mix BASE/PRO) + ~4.500 € di setup fee cumulati: l'infrastruttura si paga da sola e il tempo founder si sposta dalla gestione manuale alla vendita.

---

### M6.5 — Motore commerciale · H1 · continuativa (mesi 9–15, in parallelo a M7)

**Obiettivo**: colmare il buco tra 3 palestre (chiusura M6) e le 8–12 del gate H1→H2. Col tasso di conversione dichiarato in M3.5 (≈ 5 demo → 1 firma) servono **25–45 demo in 5–6 mesi**: non succede da solo, e non può aspettare la fine di M7. Questa milestone non è sviluppo: è una **cadenza operativa protetta** — la vendita smette di essere "quello che si fa quando avanza tempo".

**Deliverable** (rituali, non feature):
1. **Cadenza demo fissa**: ≥ 2 demo dal vivo/settimana in agenda protetta (≈ mezza giornata/settimana di outbound + demo — la disponibilità che [00-strategia](./00-strategia.md), Domande aperte, chiede al founder di confermare).
2. **Pipeline tracciata**: ogni trattativa in un board (fase, valore, prossima azione, data); revisione nel rituale settimanale (§6). Conversione demo→firma strumentata (chiude il claim non misurato di M3.5).
3. **Programma referral operativo**: l'incentivo "1 mese gratis per palestra portata" (00 R8) smette di essere una frase — pagina/condizioni scritte, proposto a ogni cliente attivo al giorno 60, tracciato in pipeline con fonte.
4. **Caso studio del pilota** con numeri veri (retention, AAT, tempo coach) come materiale di demo.

**Criteri di accettazione**: ≥ 8 demo/mese di media su 3 mesi consecutivi · pipeline mai sotto 5 trattative aperte · conversione demo→firma misurata (se < 1/8, il gate H1→H2 si ridiscute su dati, non su speranze).

**Dipendenze**: M6 (onboarding < 1 giorno: senza, ogni firma costa una settimana). **Rischio**: alto ed extra-tecnico — è il rischio R8 di 00. Se al mese 12 le palestre sono ≥ 5 ma < 8, il gate H1→H2 si abbassa consapevolmente a 5–6 palestre con MRR coerente (~1.500 €) e lo si scrive, invece di fingere che il piano originale regga.

---

### M7 — Dashboard B2B · H1→H2 · 6–8 settimane

**Obiettivo**: evolvere le dashboard coach/manager da "liste di dati" a "code di decisioni", e alzare il valore percepito dei tier PRO/STUDIO. Basi per cliniche/aziende SOLO se un cliente firmato le chiede.

**Deliverable**:
1. **Dashboard coach v2**: coda "da attenzionare" azionabile (readiness in calo, assenze anomale, rate scadute → azione a 1 tap: messaggio, modifica programma, nota), non solo elenco. Metrica di missione "alert agiti entro 48h" strumentata ([00-strategia §1](./00-strategia.md)).
2. **Dashboard titolare v2**: KPI business (MRR palestra, churn allievi, presenze, incassi) + riepilogo AI settimanale potenziato con confronto periodo precedente.
3. **Report white-label esportabili** (PDF): il titolare li usa coi SUOI clienti/soci — feature STUDIO.
4. **Basi cliniche/aziende, condizionale**: SOLO alla firma di un cliente di quel segmento — vista aggregata anonimizzata per "gruppi" (reparti/team), perimetro wellness non sanitario ([06-sicurezza-compliance](./06-sicurezza-compliance.md)). Se nessun cliente firma, questo item NON si costruisce e l'effort scende a 5–6 settimane.
5. Upsell path in-app: il titolare BASE vede cosa avrebbe con PRO (dati suoi, oscurati) — upgrade a 1 click via Stripe.

**Criteri di accettazione**:
- ≥ 70% degli alert "da attenzionare" agiti entro 48h nelle palestre clienti (dal ~50% di baseline H0).
- Almeno 1 upgrade di tier generato dall'upsell in-app entro 60 giorni dal rilascio.
- Tempo coach per decisione < 3 min, strumentato (target H1 di missione).
- Item 4 costruito SE E SOLO SE esiste un contratto firmato che lo richiede.

**Dipendenze**: M3 (il twin alimenta le dashboard), M6 (servono ≥ 3 clienti per validare, non 1). **Rischio**: basso-medio tecnicamente; il rischio vero è costruire dashboard che nessuno guarda — mitigato dal feedback loop quindicinale coi titolari (§6).

**Valore di business immediato**: espansione ricavi (upsell), retention titolari (il canone si giustifica coi KPI che il titolare mostra al commercialista), primo aggancio al segmento corporate senza scommetterci mesi.

---

### M8 — Piattaforma · H2 · continuativo (mesi 14–36)

**Obiettivo**: aprire ESSĒRE all'esterno: API pubbliche, SDK, marketplace beta, community. Si entra SOLO attraverso il Gate H1→H2 (§3). Dettaglio in [05-api-sdk-integrazioni](./05-api-sdk-integrazioni.md) e [01-architettura §3](./01-architettura.md).

**Deliverable (in ordine, ciascuno spedibile da solo)**:
1. **API v1 pubblica** (read-only prima: twin, eventi, readiness — con consenso granulare dell'utente): il primo cliente è il nostro stesso SDK (dogfooding, [05 §1](./05-api-sdk-integrazioni.md)).
2. **SDK** (JS prima, poi mobile) + developer portal minimo.
3. **Marketplace beta**: programmi/corsi venduti da coach a coach, take-rate 15%, Stripe Connect per i payout. Prerequisito: > 50 palestre (liquidità, [00-strategia §4.3](./00-strategia.md)).
4. **Community**: spazi per palestra e tra coach (non un social network aperto — vedi §7).
5. Multi-tenant control-plane se le istanze superano ~30 ([01-architettura §3](./01-architettura.md)).

**Criteri di accettazione (per il primo anno di H2)**: 5 integratori esterni attivi sull'API; primo GMV marketplace; le metriche H2 di [00-strategia §7.2](./00-strategia.md) come cruscotto (AAT ≥ 10.000 a 36 mesi, ricavi non-canone ≥ 20%).

**Dipendenze**: Gate H1→H2 superato; M3 (lo schema eventi È il contratto API). **Rischio**: alto per natura — è il salto da prodotto a piattaforma; per questo è a valle di un gate con numeri, non di entusiasmo.

**Valore di business immediato**: diversificazione ricavi (API, marketplace) e moat di ecosistema: ogni integrazione esterna rende ESSĒRE più costoso da abbandonare.

---

## 3. Gate di decisione tra orizzonti

I gate impediscono i due errori opposti: scalare troppo presto (bruciare cassa su ipotesi) e troppo tardi (perdere il mercato per prudenza). **Un gate non superato non è un fallimento: è un'informazione** — si itera sull'orizzonte corrente finché i numeri non ci sono, o si rivede la tesi.

| Gate | Metriche di sblocco (TUTTE necessarie) | Cosa sblocca | Se non superato entro… |
|---|---|---|---|
| **Gate di vendita** (dentro H0) | managedPassword bonificata + proxy AI in prod (M0+M1) | Diritto di firmare il primo contratto white-label | Mese 3: STOP a tutto il resto finché non chiude — è il rischio R6 |
| **Gate H0 → H1** | AAT MML ≥ 22/30 · retention check-in W4 ≥ 60% · 100% deploy via CI · costo infra < 50 €/mese | Inizio vendita attiva (M3.5) | Mese 4: il prodotto non regge nemmeno la palestra del founder → si sistema il prodotto, non si vende |
| **Gate "primo hire"** (dentro H1) | ≥ 5 palestre paganti · MRR ≥ 1.200 € · churn 0 nei primi 90 gg di ciascun cliente · pipeline con ≥ 5 trattative | Primo dev part-time/contractor (il MRR lo paga) | — (si resta founder+AI, va bene così) |
| **Gate H1 → H2** | 8–12 palestre attive · MRR ≥ 2.500 € · AAT ≥ 500 · churn palestre < 20% annualizzato · margine lordo/palestra > 70% · NPS titolari > 40 — raggiungibile SOLO con M6.5 attiva; fallback dichiarato in M6.5 se al mese 12 le palestre sono 5–7 | M8, primo dev full-time, eventuale capitale esterno (da posizione di forza, non di bisogno) | Mese 15: rivedere pricing/segmento (guardia R8, [00-strategia](./00-strategia.md)) prima di aggiungere ANYTHING di piattaforma |
| **Gate multi-tenant** | primo tra: > 10 istanze attive · > 4 h/settimana di ops istanze · primo cliente self-serve (trigger unico del pacchetto, [01-architettura §3.1](./01-architettura.md)) | Costruzione corsia multi-tenant self-serve | — (le istanze dedicate restano l'argomento di vendita GDPR per chi lo chiede) |

Regola anti-vanità: le metriche dei gate si leggono dal cruscotto automatico (da `human_events` e Stripe), mai compilate a mano. Se una metrica non è strumentata, per il gate vale zero.

---

## 4. Team plan: chi serve e quando

Principio: **si assume dopo il ricavo, mai prima**; ogni hire è pagato da MRR già ricorrente, non da proiezioni. E si assume per liberare il tempo founder dal lavoro a MINOR valore unico (il founder è insostituibile su visione, vendita alla rete, metodo di coaching; è sostituibile su codice e supporto).

| Fase | Trigger (dal §3) | Team | Ruolo del founder | Costo indicativo |
|---|---|---|---|---|
| H0 (mesi 0–3) | — | **Founder + AI pair** (Claude Code) | Tutto: codice con AI, prodotto, MML come laboratorio | ~0 (tool AI 100–200 €/mese) |
| H1 early (mesi 3–8) | — | Founder + AI; supporto spot a contratto (es. 2–3 gg di un consulente per la submission Apple o un audit sicurezza pre-vendita) | 60% prodotto, 40% vendita | 500–1.500 € una tantum di consulenze |
| H1 mid | **Gate primo hire** (≥ 5 palestre, MRR ≥ 1.200 €) | **+1 dev part-time/contractor** (10–20 h/sett.): manutenzione, bug, onboarding tecnico clienti | 40% prodotto, 60% vendita e clienti | 1.000–2.000 €/mese |
| H1 late / H2 entry | **Gate H1→H2** | **+1 dev full-time** (il contractor se ha funzionato); il founder esce dal codice quotidiano | Prodotto e vendita; il codice diventa review, non scrittura | 35–50 k€/anno (RAL) |
| H2 (12–24 mesi) | ~20 palestre / MRR ≥ 5.000 € | **+1 designer** (anche part-time/studio): il white-label vende anche per l'estetica per-brand; **+1 sales/customer success** quando la pipeline satura il tempo founder | CEO a tutti gli effetti; bus factor ≥ 2 su ogni area | +30–45 k€/anno per ruolo |
| H2 (24–36 mesi) | Metriche H2 in traiettoria | Team 4–6: 2 dev, 1 design, 1 sales/CS, founder (+ eventuale capitale per accelerare, non per sopravvivere) | — | — |

Perché NON "assumere subito un dev per andare più veloce": (a) non c'è cassa; (b) un dev senza contesto in un codebase di una persona sola rallenta i primi 2 mesi; (c) l'AI pair oggi copre il 70–80% del gap per feature CRUD e refactoring guidati dai documenti di questo pacchetto — il collo di bottiglia di H0/H1 è la vendita e il focus, non le righe di codice.

Rischio R1 (bus factor = 1) nel frattempo: mitigato da questo pacchetto documenti + CI/CD (chiunque può deployare) + runbook M6; chiuso strutturalmente solo in H2 (bus factor ≥ 3, [00-strategia §7.2](./00-strategia.md)).

---

## 5. Budget realistico per fase

Riprende [01-architettura §8](./01-architettura.md) (infra) e aggiunge le voci non-infra. Stime prudenziali, IVA esclusa.

| Voce | H0 (mesi 0–3) | H1 (mesi 3–12) | H2 (anno 2–3, run-rate annuo) |
|---|---|---|---|
| Infra Firebase/GCP (Blaze, per istanza) | 5–25 €/mese | 20–90 €/mese (free tier × istanza aiuta) | 4–10 k€/anno |
| API Anthropic (post-proxy, con caching/tiering) | 15–50 €/mese | 100–400 €/mese, rifatturata nei canoni | 10–30 k€/anno (COGS a listino) |
| Tool AI dev (Claude Code ecc.) | 100–200 €/mese | 100–200 €/mese | 3–6 k€/anno |
| Store (Apple 99 $/anno, Play 25 $ una tantum) | — | ~120 € | ~100 €/anno |
| EAS (build/update) | 0 (free tier) | 0–20 €/mese | ~1 k€/anno |
| Sentry, dominio, SMS/WhatsApp provider | 5–15 €/mese | 20–60 €/mese | 1,5–4 k€/anno |
| Stripe | — | 1,5–2,9% + 0,25 € per transazione (costo variabile sul MRR) | idem |
| **Legale/GDPR** (contratto white-label + DPA + privacy: redazione una tantum con avvocato, poi riuso; registro trattamenti) | 0 (bozze preparate con AI da far validare) | **1.500–3.000 € una tantum** (validazione avvocato prima del cliente 1 — non negoziabile su dati salute) + 500 €/anno aggiornamenti | 3–8 k€/anno (incl. eventuale DPO esterno se i volumi lo richiedono, [06](./06-sicurezza-compliance.md)) |
| Commercialista/società | esistente (attività palestra) | 1–2 k€/anno (fatturazione SaaS) | 3–5 k€/anno |
| **Totale cash out** | **< 300 €/mese** | **~400–900 €/mese + ~3 k€ una tantum** | **25–65 k€/anno (esclusi salari §4)** |

Lettura chiave: **il break-even operativo (esclusa la persona) arriva a ~3 clienti PRO**; la sostenibilità personale del founder a 12–15 palestre ([00-strategia §4.2](./00-strategia.md)). Il budget H1 è interamente coperto dal primo setup fee + 3 mesi di canone del pilota: da M3.5 in poi il progetto non tocca più i risparmi del founder — questa è la definizione operativa di "i clienti pagano lo sviluppo".

---

## 6. Rituali operativi

I rituali sono il sistema immunitario della roadmap: senza, ogni piano di un solista deriva verso "quello che mi va di fare oggi".

| Rituale | Cadenza | Formato (30–60 min max) | Perché |
|---|---|---|---|
| **Weekly review metriche** | Lunedì, 30 min | Cruscotto automatico (AAT, retention check-in, costo AI, MRR, errori Sentry) + 3 domande: cosa è cresciuto? cosa si è rotto? la milestone corrente è in traiettoria? Output: 1 riga nel log decisioni del repo | Un solista non ha nessuno che gli chiede conto: il rituale è il suo board. Le metriche vengono dal cruscotto (§3), mai compilate a mano |
| **Changelog pubblico** | Ad ogni release (≥ 2/mese) | `CHANGELOG.md` nel repo + versione in-app "Novità" in linguaggio utente + messaggio nel canale titolari | Per i clienti white-label il changelog È la prova che il canone compra evoluzione continua: è uno strumento di retention e di vendita, non un file per sviluppatori |
| **Feedback loop coach** | Quindicinale, 30 min | Call (o voce a fine turno per MML) con 1 coach per palestra cliente a rotazione: cosa hai usato? dove hai perso tempo? cosa hai fatto FUORI dall'app? Le richieste entrano in backlog SOLO col filtro NSM | I coach sono gli utenti-leva del modello B2B2C: se loro non usano, gli allievi non usano. "Cosa fai fuori dall'app" trova le feature mancanti vere meglio di qualunque survey |
| **Revisione roadmap** | Mensile, 60 min | Questo documento si aggiorna: milestone corrente ±, prossime 2 confermate o riordinate, gate ricontrollati. Le milestone oltre le prossime 2 restano volutamente a bassa definizione | Piani dettagliati a 12 mesi da 1 persona sono finzione; 2 milestone a fuoco + gate chiari no |
| **Post-mortem obbligatori** | Ad evento | Incidente in prod, churn di un cliente nei primi 90 giorni, milestone oltre +50% effort: 1 pagina, cause, 1 cambiamento concreto | I tre eventi che, non analizzati, si ripetono |
| **Revisione costi AI/tenant** | Trimestrale | Rapporto costo-AI/canone per tenant → eventuale ritiering ([03-ai-engine](./03-ai-engine.md)) | La voce COGS dominante va governata, non subita (rischio R5) |

---

## 7. Cosa NON è in roadmap (e perché)

1. **Hardware proprietario (wearable ESSĒRE)** — mai a 36 mesi. Capitale, supply chain, certificazioni: un altro mestiere. La tesi è l'opposto: readiness senza hardware + ingestione dei sensori altrui (M5). Eventuale futuro: partnership, non produzione ([00-strategia](./00-strategia.md)).
2. **Social network completo / community aperta al pubblico** — la community di M8 è per palestra e tra coach (spazi chiusi, moderati dai coach stessi). Un social aperto richiede moderazione, trust&safety e growth loop consumer: tre cose da team da 20 persone, e la concorrenza è Strava/Instagram — battaglia persa in partenza. Il valore comunitario per una palestra è la SUA community, non "il feed globale ESSĒRE".
3. **Nutrition tracking calorie fai-da-te (clone MyFitnessPal)** — logging alimentare manuale ha compliance ~10% a 30 giorni e richiede un database alimenti gigante da licenziare/mantenere. Se e quando serve, la via è: foto del pasto → stima AI + indicazioni del nutrizionista in piattaforma (il ruolo esiste già), agganciata al twin — decisione a valle di richieste reali dei clienti, in H2 ([03-ai-engine "Cosa NON faremo"](./03-ai-engine.md)).
4. **B2C diretto (ads, ASO war, freemium consumer)** — CAC insostenibile, retention consumer ~10% a 90 giorni, e diluisce l'unico canale che funziona (B2B2C via palestre). L'unico "B2C" ammesso resta l'allievo che conserva il twin cambiando palestra (valutazione H2, [00-strategia](./00-strategia.md)).
5. **Claim clinici / dispositivo medico / vendita a sanità** — perimetro wellness, sempre. MDR e certificazioni sanitarie sono un business diverso; le cliniche in H2 entrano con perimetro wellness-corporate ([06-sicurezza-compliance](./06-sicurezza-compliance.md)).
6. **Riscrittura dello stack / migrazione a backend "serio" il giorno 1** — nessun numero la giustifica sotto le ~50 palestre; Firebase + strangler pattern regge tutto H0/H1 ([01-architettura](./01-architettura.md)). Rivalutazione SOLO ai trigger dichiarati (costi Firestore, control-plane multi-tenant).
7. **Integrazioni "a catalogo" per parità feature con Trainerize/Everfit** — ogni integrazione entra solo se un cliente pagante la chiede e muove la NSM. Un catalogo di 50 integrazioni mantenute da 1 persona è debito travestito da marketing.
8. **Marketplace prima della massa critica** — senza > 50 palestre è una città fantasma che brucia fiducia dei primi creator. Resta in M8, dietro il gate H1→H2.
9. **Multi-tenant "perché si fa così"** — un'istanza per palestra è un argomento di VENDITA (isolamento GDPR) finché le istanze sono < 30. Il refactoring ha una soglia numerica, non estetica.

---

## Decisioni chiave

| Decisione | Perché | Alternativa scartata |
|---|---|---|
| **Ogni milestone spedibile e vendibile; criteri di accettazione misurabili e verificabili in < 1 ora** | Un solista non può permettersi 3 mesi di lavoro invisibile: il valore deve arrivare a MML o a un cliente ad ogni chiusura; i criteri misurabili sono l'unico antidoto al "quasi finito" | Milestone "piattaforma prima, valore poi" (classico da startup finanziata): brucia i 3 mesi di runway morale del founder senza una vendita |
| **M3.5 "Primo cliente pilota" anticipata al mese 4–5, venduta con la PWA e provisioning manuale** | Il playbook white-label esiste già; un contratto vero valida pricing e segmento 6 mesi prima, e da lì lo sviluppo è pagato dai clienti | Primo cliente dentro M6 (mese ~9) dopo aver automatizzato tutto: si automatizzano ipotesi non validate e si scopre il problema di pricing troppo tardi |
| **Sequenza rigida solo su M0→M1→(M2)→vendita; ordine M4/M5/M6 deciso dai clienti dentro H1** | Le precondizioni di sicurezza e presentabilità non sono negoziabili (gate R6); tutto il resto ha dipendenze tecniche ma priorità di mercato | Roadmap completamente rigida (ignora ciò che i primi clienti insegnano) o completamente fluida (il solista deriva senza gate) |
| **Gate numerici tra orizzonti, letti da cruscotto automatico; metrica non strumentata = zero** | I gate proteggono dai due errori simmetrici: scalare su ipotesi e non scalare mai; l'automazione impedisce l'auto-inganno del founder che "sente" che va bene | Passaggi di fase a sensazione, o gate su metriche vanity compilate a mano |
| **Si assume solo dopo il ricavo: primo dev part-time a ≥ 5 palestre / MRR ≥ 1.200 €; full-time al gate H1→H2** | Ogni hire è coperto da MRR ricorrente; il collo di bottiglia H0/H1 è vendita e focus, non righe di codice (l'AI pair copre il grosso del gap tecnico) | Assumere subito per "andare più veloce": non c'è cassa, e un dev senza contesto rallenta i primi 2 mesi |
| **Effort stimato in settimane-persona con AI pair, con +30% di tasse e regola "oltre +50% si taglia lo scope, non la deadline"** | Stime oneste per un founder non tecnico; la regola dello scope impedisce la spirale della milestone infinita | Stime da senior dev (irreali) o deadline mobili (la roadmap diventa un desiderio) |
| **Item condizionali espliciti (dashboard cliniche/aziende in M7 SOLO a contratto firmato)** | Segmenti nuovi si finanziano con contratti, non con scommesse; il costo dell'attesa è zero, il costo del build speculativo è 2+ settimane | Costruire il verticale cliniche "perché è nella vision": la vision entra in roadmap solo quando un cliente la firma |
| **Changelog pubblico e weekly review come strumenti di business, non di processo** | Per il B2B ricorrente il changelog è la prova che il canone compra evoluzione; la weekly review è il "board" del solista | Rituali da manuale agile (standup, sprint planning) pensati per team, teatro per una persona sola |

---

## Cosa NON faremo (e perché)

Vedi §7 per l'elenco completo fuori-roadmap. In sintesi di metodo, in questo documento ci impegniamo a NON:

1. **Aprire una milestone nuova con la precedente sotto i criteri di accettazione** — il work-in-progress parallelo è il modo in cui un solista non finisce niente. Eccezione unica: attese esterne (review Apple) che sbloccano lavoro su un'altra milestone.
2. **Inserire in roadmap item senza criterio di accettazione misurabile** — se non si può verificare in < 1 ora, non è definito abbastanza per essere promesso.
3. **Promettere date ai clienti oltre le prossime 2 milestone** — nel contratto white-label si vende ciò che esiste + il changelog come track record, non il futuro.
4. **Usare capitale esterno per coprire l'operatività in H1** — l'eventuale capitale in H2 serve ad accelerare una macchina che già gira (gate H1→H2 superato), non a tenerla accesa.

---

## Dipendenze verso gli altri documenti

| Documento | Cosa fornisce a questa roadmap |
|---|---|
| [00-strategia](./00-strategia.md) | NSM e albero metriche (i numeri dei gate §3), pricing e unit economics (budget §5, valore delle milestone), rischi R1–R8 |
| [01-architettura](./01-architettura.md) | Contenuto tecnico di M0 (CI/CD §7.1), M1 (proxy), M4 (piano store §5), costi infra (§8), soglie di migrazione |
| [02-dati-digital-twin](./02-dati-digital-twin.md) | Schema `human_events` e domini del twin (M3), sorgenti wearable (M5), indici e retention |
| [03-ai-engine](./03-ai-engine.md) | AI Gateway e moduli (M1), formula readiness versionata (M3, M5), governo costi AI (rituale trimestrale §6) |
| [04-ux-design](./04-ux-design.md) | Specifica completa di M2 (navigazione, "Oggi", design token) e requisiti UX per la review store (M4) |
| [05-api-sdk-integrazioni](./05-api-sdk-integrazioni.md) | HealthKit/Health Connect (M5), API/SDK/webhook (M8), rate limiting per tenant (M6) |
| [06-sicurezza-compliance](./06-sicurezza-compliance.md) | Gate di vendita R6 (M0+M1), DPA e contratto (M3.5), privacy labels e disclaimer store (M4), perimetro wellness (M7, §7) |
