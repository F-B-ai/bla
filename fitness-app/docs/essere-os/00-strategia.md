# ESSĒRE OS — 00 · Strategia & Posizionamento

> **Pacchetto documenti**: 00-strategia (questo) · [01-architettura](./01-architettura.md) · [02-dati-digital-twin](./02-dati-digital-twin.md) · [03-ai-engine](./03-ai-engine.md) · [04-ux-design](./04-ux-design.md) · [05-api-sdk-integrazioni](./05-api-sdk-integrazioni.md) · [06-sicurezza-compliance](./06-sicurezza-compliance.md) · [07-roadmap-milestones](./07-roadmap-milestones.md)
>
> **Stato**: bozza fondativa · luglio 2026 · owner: Francesco Busanca (founder) + architettura
>
> **Orizzonti usati in tutto il pacchetto**: **H0 "Fondamenta"** (0–3 mesi, 1 persona + AI, budget ~0) · **H1 "Prodotto"** (3–12 mesi, i primi clienti white-label pagano lo sviluppo) · **H2 "Piattaforma"** (12–36 mesi, team + capitale).

---

## 0. Da dove partiamo davvero (nessuna finzione)

ESSĒRE oggi è una PWA funzionante (`essere-3fe6f.web.app`) usata da ~30 allievi di una palestra reale, Mind Movement Lab. Ha già in produzione più funzioni di molti competitor seed-stage: programmazione allenamenti, live workout, valutazione posturale AI da foto, stima composizione corporea, Stato ESSĒRE (readiness 0–100 senza hardware), gamification con premi reali, check-in QR, pagamenti a rate con promemoria WhatsApp, agenda multi-staff, chat, Academy, AI Coach, e un impianto white-label pronto (`src/config/brand.ts` + kill-switch licenza).

Ha anche debiti seri: password gestite in chiaro leggibili da ogni utente autenticato, chiave Anthropic distribuita ai client, zero test, zero CI/CD, tab bar da 20 voci. Questo documento non li nasconde: li tratta come **precondizioni di vendita** (vedi §6 rischio R6 e [06-sicurezza-compliance](./06-sicurezza-compliance.md)).

La strategia qui sotto ha un vincolo non negoziabile: **ogni mossa deve avere una versione eseguibile oggi da 1 persona + AI con budget ~0**, e una versione scalabile domani. Dove i due si separano, lo diciamo esplicitamente.

---

## 1. Mission e Vision operative (con metriche, non poesia)

### Mission (orizzonte H0–H1)

> **Dare a ogni coach il superpotere di seguire ogni allievo come se fosse l'unico.**

Non "democratizzare il benessere". Il cliente che paga è la palestra; il valore che compra è capacità di coaching moltiplicata. Si misura così:

| Metrica di missione | Definizione | Baseline (MML, lug 2026) | Target H0 | Target H1 |
|---|---|---|---|---|
| Allievi seguibili per coach | allievi attivi / coach senza calo di qualità percepita | ~30 / 1–2 coach | 40 | 60 |
| Tempo coach per decisione | minuti per aggiornare un programma su base dati (readiness + storico) | non misurato | < 5 min (strumentato) | < 3 min |
| Retention allievi della palestra cliente | % allievi ancora attivi a 6 mesi | da misurare su MML | baseline stabilita | +10 p.p. vs baseline della palestra pre-ESSĒRE |
| Segnali "da attenzionare" agiti | % alert readiness a cui il coach risponde entro 48h | non misurato | > 50% | > 70% |

### Vision (orizzonte H1–H2)

> **ESSĒRE = Human Operating System: ogni persona ha un Digital Human Twin continuamente aggiornato, e ogni decisione su corpo e mente passa da lì.**

La vision si misura come **copertura e freschezza del twin**, non come slogan:

| Metrica di visione | Definizione | Target H1 | Target H2 |
|---|---|---|---|
| Segnali/allievo/settimana | check-in Stato ESSĒRE + workout loggati + presenze + misurazioni | ≥ 5 | ≥ 10 (incl. wearable via HealthKit/Health Connect) |
| Domini dati attivi per twin | su 5: posturale, soggettivo, allenamento, presenza, feedback coach | ≥ 3 | ≥ 4 (+nutrizione, +sonno da wearable) |
| Decisioni prese dentro ESSĒRE | modifiche programma/piano fatte in-app vs fuori (WhatsApp, Excel) | > 60% | > 90% |
| Anzianità media del twin | mesi di storico longitudinale per allievo attivo | 6 mesi | 18+ mesi |

**Regola di coerenza**: qualunque feature che non aumenta almeno una metrica di missione o di visione non entra in roadmap ([07-roadmap-milestones](./07-roadmap-milestones.md)).

---

## 2. Analisi competitiva

### 2.1 Premessa: due campi di battaglia diversi

I giganti consumer (Apple, Whoop, Oura, Strava, MyFitnessPal) **non sono i nostri concorrenti diretti in H0/H1**: sono il rumore di fondo nella testa dell'allievo. I concorrenti veri, quelli che una palestra italiana valuta contro di noi, sono **Trainerize, TrueCoach, Everfit** (coaching B2B) e in parte **Technogym Mywellness / Mindbody / Glofox** (gestionale). Confondere i due campi porta a costruire il prodotto sbagliato.

### 2.2 Tabella competitiva

| Concorrente | Cosa fanno bene (rispetto vero) | Dove sono vulnerabili | Cosa NON possiamo battere (onestà) |
|---|---|---|---|
| **Apple Fitness+ / Health** | Distribuzione (miliardi di device), HealthKit come hub dati, fiducia sul privacy, UX di riferimento | Zero coach umano; zero strumenti per palestre; contenuti generici uno-a-molti; Health è un archivio, non un sistema decisionale | Hardware, brand, capitale, controllo dell'App Store. Non competiamo: **usiamo** HealthKit come sorgente dati (H1) |
| **Whoop** | Scienza del recupero, readiness basata su HRV, abbonamento hardware ricorrente, community atleti | €30+/mese solo per il dato, senza nessuno che lo interpreti; nessun contesto palestra; readiness = numero orfano senza azione | Accuratezza dei sensori, sleep staging, R&D hardware. Il nostro Stato ESSĒRE è meno preciso ma **azionabile da un coach** — e può ingerire i dati Whoop via export/Health |
| **Oura** | Form factor, sonno best-in-class, brand premium | Stesse debolezze di Whoop: dato senza coach, zero B2B palestre, pubblico affluent ristretto | Miniaturizzazione, brand design. Idem: sorgente dati, non nemico |
| **Strava** | Community e social graph con effetti rete reali, segmenti, motivazione sociale | Solo endurance; zero coaching strutturato; zero palestra/forza; il coach non esiste nel prodotto | Gli effetti rete nell'endurance. Non li attacchiamo: la nostra community è quella fisica della palestra (già esiste, non va costruita) |
| **MyFitnessPal** | Database alimenti enorme, abitudine di logging radicata da 15 anni | UX invecchiata, logging manuale doloroso, zero intelligenza, zero coach, monetizzazione ostile (paywall su feature storiche) | La dimensione del food DB. In H1/H2 si integra (foto-logging AI + DB open come Open Food Facts), non si replica |
| **Trainerize / TrueCoach / Everfit** ⚠️ *concorrenti diretti* | Tooling coach maturo, librerie esercizi enormi, integrazioni (Stripe, Zoom, wearable), sales machine, prezzi noti | Anglo-centrici (localizzazione IT debole, pagamenti/fatturazione non italiani); **nessuna readiness**; **nessuna postura AI**; pricing per-coach che punisce la crescita dello staff; il gestionale (accessi, rate, agenda) resta fuori → la palestra deve incollare 3–5 tool; white-label vero solo su tier enterprise costosi | Ampiezza feature oggi, lista integrazioni, budget marketing, anni di SEO. Non li battiamo in orizzontale: li battiamo **in verticale sul mercato italiano** e sull'integrazione coaching+gestionale+AI in un solo prodotto |
| **Technogym (Mywellness)** | Install base hardware nelle palestre italiane, relazioni enterprise, brand nazionale, ecosistema attrezzi connessi | Software percepito come accessorio dell'hardware; costoso e lento per micro-palestre e studi PT; coach-centrico solo a parole; ciclo di vendita enterprise inadatto a realtà da 30–150 allievi | Install base hardware, relazioni con le catene, brand in Italia. Evitiamo lo scontro: il nostro cliente è lo studio/box/PT-studio che Technogym ignora |

### 2.3 La sintesi che conta

Oggi una palestra italiana ambiziosa incolla: Trainerize (coaching) + Mindbody/Glofox o Excel (gestionale) + WhatsApp (comunicazione) + carta (posturale) + niente (readiness). Costo: 150–400 €/mese di tool più il costo nascosto dell'incollaggio. **La pratica di settore è mediocre e il modo 10x migliore esiste già nel nostro codice**: un solo prodotto dove readiness, programma, presenza, pagamento e conversazione vivono sullo stesso allievo. Nessuno dei sette nomi sopra offre questo pacchetto sotto i 500 €/mese, e nessuno in italiano.

---

## 3. Il cuneo: perché la posizione è difendibile

La tesi (da dimostrare coi numeri, non da recitare): **coach-in-the-loop + readiness senza hardware + white-label B2B** è una combinazione che i grandi non possono copiare a costo ragionevole e i pari non hanno ancora capito.

### 3.1 I quattro denti del cuneo

1. **Coach umani veri dentro il prodotto.** Whoop/Oura/Apple hanno il sensore ma nessun umano nel loop: quando la readiness crolla, non succede niente. Da noi succede: la vista "da attenzionare" mette l'allievo davanti al coach, e la modifica del programma è a un tap. Il coach non è un canale di distribuzione: è **parte del prodotto** e — cruciale per §5 — **il labeler umano del dataset**. Apple non può assumerlo; Trainerize ce l'ha ma non gli dà il dato di readiness su cui agire.

2. **Stato ESSĒRE = readiness senza hardware.** Il check-in soggettivo quotidiano (sonno/energia/umore/dolori → 0–100 + consiglio + trend) costa zero euro di hardware all'allievo e funziona dal giorno 1 per il 100% degli iscritti — contro il ~5% di penetrazione realistica di Whoop/Oura in una palestra generalista italiana. La letteratura sul monitoring atleti dà ai questionari soggettivi validità pari o superiore alle misure oggettive per il carico percepito: non è un ripiego, è una scelta scientificamente difendibile. I wearable **arricchiscono** il punteggio via HealthKit/Health Connect (H1, vedi [05-api-sdk-integrazioni](./05-api-sdk-integrazioni.md)) ma non sono mai un requisito. Difendibilità: chiunque può copiare 4 slider; nessuno può copiare 18 mesi di trend soggettivi correlati a workout reali e feedback coach.

3. **White-label B2B: si vende alla palestra, non all'utente.** Un contratto = 30–300 utenti in un colpo, con onboarding fatto dal coach (che ha interesse a farlo, perché l'app lavora per lui). Il churn dell'allievo è assorbito dalla palestra; il nostro churn rilevante è quello della palestra, che ha switching cost crescenti (§5).

4. **Valutazione posturale AI = il momento "wow" di vendita.** Nessun competitor della tabella la offre come onboarding. In demo dal vivo (founder + tablet + 3 minuti) è l'argomento che chiude: la palestra vede un servizio da vendere ai propri clienti, non un costo.

### 3.2 Perché B2B2C batte B2C, per noi, con i numeri

| Dimensione | B2C diretto | B2B2C white-label (scelto) |
|---|---|---|
| CAC | 20–80 € per install a pagamento su Meta/Google; con budget ~0 = irrilevante | ~0 nella rete locale del founder (referral tra titolari); 300–500 € stimati con outbound in H1 → **un contratto porta 30–300 utenti** |
| Distribuzione | Serve ranking negli store contro Apple/Whoop con milioni di budget ads | Il coach installa l'app all'allievo in palestra, di persona. Attivazione ~100%, non ~25% |
| Retention | Le app fitness consumer perdono ~90% degli utenti in 90 giorni (media di settore) | L'allievo resta finché resta in palestra; il coach lo richiama fisicamente. La retention è **strutturale**, non da growth hack |
| Dati | Utenti anonimi, self-reported, senza ground truth | Ogni dato ha contesto (palestra, programma, coach) e **label umane** (feedback coach) → §5 |
| Pricing power | 4,99–9,99 €/mese contestati da alternative gratuite | 149–399 €/mese a chi ci fa girare il business sopra |
| Eseguibile da 1 persona? | No (serve growth team) | **Sì**: il founder è un titolare di palestra che vende a titolari di palestra, nella lingua giusta, con il caso studio di sé stesso |

**Decisione**: nessun canale B2C diretto fino a H2, e anche allora solo se trainato dalle palestre (l'allievo che cambia città si porta via il twin — feature di retention B2B, non canale autonomo).

---

## 4. Modello di business

### 4.1 White-label palestre — il motore (H1)

Modello: **setup una tantum + canone mensile a scaglioni di allievi attivi**. Un'istanza Firebase per palestra cliente (isolamento già pronto: `brand.ts` + kill-switch `config/license` + WHITE-LABEL.md; evoluzione multi-tenant discussa in [01-architettura](./01-architettura.md), non prima di H2).

| Voce | Prezzo (IVA escl.) | Cosa include |
|---|---|---|
| **Setup** | **1.490 € una tantum** | Istanza dedicata, branding, migrazione anagrafiche, 2h formazione staff, listino e info palestra configurati |
| **Canone BASE** | **149 €/mese** — fino a 50 allievi attivi | Tutte le funzioni core, AI fair-use, supporto async |
| **Canone PRO** | **249 €/mese** — fino a 150 allievi | + multi-staff illimitato, riepilogo AI settimanale, priorità supporto |
| **Canone STUDIO** | **399 €/mese** — fino a 400 allievi | + Academy white-label, report aziendali, SLA |
| Overage AI | a consumo oltre fair-use, pass-through +30% | protetto dal proxy con budget per tenant ([03-ai-engine](./03-ai-engine.md)) |

**Perché così e non altrimenti:**
- *Per-coach pricing (modello Trainerize)* — scartato: punisce la palestra che cresce di staff, cioè esattamente il cliente migliore. Il valore scala con gli allievi, non con i coach.
- *Per-allievo puro* — scartato: bolletta imprevedibile = ansia del titolare = churn. Gli scaglioni danno prevedibilità e un upgrade path naturale.
- *Solo canone senza setup* — scartato: il setup fee (a) copre il costo reale di onboarding del founder, (b) qualifica il cliente (chi non paga 1.490 € non è un cliente serio), (c) rende il CAC negativo dal giorno 1.
- *Revenue share sugli abbonamenti palestra* — scartato per H1: non auditabile senza integrazione profonda coi loro incassi; rivalutabile in H2 sul modulo pagamenti.

### 4.2 Unit economics per palestra cliente (stima onesta, scenario PRO, 80 allievi)

| Voce | Anno 1 | Anno 2+ | Note |
|---|---|---|---|
| Ricavi | 1.490 + 12×249 = **4.478 €** | **2.988 €** | |
| Firebase (Blaze, istanza dedicata) | ~240 € (~20 €/mese) | ~300 € | Firestore + Storage + Hosting per ~80 utenti attivi |
| AI (Anthropic via proxy, con caching e model-tiering) | ~480 € (~40 €/mese) | ~600 € | ~0,50 €/allievo/mese; dettaglio costi in [03-ai-engine](./03-ai-engine.md) |
| Onboarding (tempo founder, anno 1) | ~16h | — | Coperto dal setup fee |
| Supporto ricorrente | ~2–3h/mese | ~1–2h/mese | Da abbattere con Assistente ESSĒRE lato titolare |
| **Margine lordo cash** | **~84%** | **~70%** | Prima del costo-tempo founder |
| CAC | 0–500 € | — | Referral rete locale → outbound |
| LTV (churn palestre 20%/anno, prudente) | — | **~13.000 €** | vita media 5 anni × margine |
| **LTV/CAC** | — | **> 20** | anche nello scenario outbound |

**Soglie di sopravvivenza** (per il founder, senza stipendio esterno): 5 palestre PRO ≈ 1.245 €/mese ricorrenti coprono tutta l'infrastruttura e comprano tempo; **12–15 palestre ≈ 3.000–3.700 €/mese** = sostenibilità personale; 30 palestre = primo hire (vedi [07-roadmap-milestones](./07-roadmap-milestones.md)).

### 4.3 Linee di ricavo future (dichiarate ora, costruite dopo)

| Linea | Orizzonte | Modello | Perché non prima |
|---|---|---|---|
| **Academy / certificazioni** | H1 tardo | Corsi per coach dei clienti white-label (l'infrastruttura corsi+quiz+certificati esiste già); 190–490 €/certificazione | Serve prima una base di coach paganti a cui venderla |
| **Marketplace programmi/corsi** | H2 | Take-rate **15%** su programmi e contenuti venduti dai coach ad altri coach/palestre. Scartato il 30% Apple-style: coi creator early il take-rate alto uccide l'offerta prima che nasca la domanda | Richiede massa critica (>50 palestre) e payout infra (Stripe Connect) |
| **API / SDK pubbliche** | H2 | Freemium + tier a volume per cliniche/aziende/ricerca ([05-api-sdk-integrazioni](./05-api-sdk-integrazioni.md)) | Prima si stabilizza il modello dati ([02-dati-digital-twin](./02-dati-digital-twin.md)) |
| **B2B corporate/cliniche** | H2 | Dashboard aziende/cliniche su licenza; richiede compliance rafforzata ([06-sicurezza-compliance](./06-sicurezza-compliance.md)) | Ciclo di vendita e requisiti regolatori incompatibili con 1 persona |
| **Hardware proprietario** | **Mai in piano** | — | Vedi §"Cosa NON faremo" |

---

## 5. Digital Human Twin come moat dati

Il dettaglio tecnico è in [02-dati-digital-twin](./02-dati-digital-twin.md); qui la tesi strategica.

### 5.1 I cinque flussi che nessun competitor combina

| Flusso | Chi altro ce l'ha | Perché il nostro è diverso |
|---|---|---|
| **Posturale** (foto + analisi AI, longitudinale) | Nessuno dei 7 in tabella | Serie temporale posturale correlata al programma svolto: dato che oggi vive su carta o non esiste |
| **Soggettivo** (Stato ESSĒRE quotidiano) | Whoop/Oura (ma derivato da sensore, senza contesto) | Il nostro è dichiarato + contestualizzato (cosa ha fatto ieri in palestra) + seguito da un'azione del coach |
| **Allenamento** (programmato vs eseguito, carichi reali) | Trainerize et al. | Ma loro non lo incrociano con readiness né presenza |
| **Presenza fisica** (check-in QR) | Gestionali (Mindbody) | Ma i gestionali non hanno il programma né la readiness. La presenza è il ground truth del comportamento: non "ha aperto l'app", **è venuto** |
| **Feedback coach** (valutazioni, modifiche, note) | Nessuno in forma strutturata | **Questo è l'asset**: ogni intervento del coach è una label umana esperta su uno stato del twin |

### 5.2 Perché il tempo gioca per noi

- **Il dataset è longitudinale ed etichettato.** Apple ha più dati grezzi di chiunque, ma non ha un esperto umano che scrive "ridotto il carico perché il ginocchio destro segnala dolore da 3 giorni" accanto al dato. Quella frase, moltiplicata per migliaia di allievi e anni, è ciò che permette in H2 un AI Coach che nessun modello foundation può replicare da solo — perché il dato di training non esiste altrove.
- **Lo switching cost cresce da solo.** Una palestra al mese 18 ha nel twin dei suoi allievi un valore che nessun competitor può migrare: cambiare piattaforma significa ricominciare la storia clinica-sportiva da zero. Il churn scende col tempo senza che spendiamo in retention.
- **Il moat parte piccolo e va detto.** Con 30 allievi non c'è nessun moat: c'è un seme. Il moat è credibile a ~5.000 allievi attivi (≈ 40–60 palestre, fine H1/inizio H2). Fingerlo prima sarebbe una bugia da pitch deck; il piano è costruire lo schema dati **oggi** in modo che ogni giorno da qui in avanti accumuli capitale ([02-dati-digital-twin](./02-dati-digital-twin.md) definisce eventi e ontologia proprio per questo).
- **Condizione abilitante**: consensi e base giuridica raccolti correttamente fin da H0 ([06-sicurezza-compliance](./06-sicurezza-compliance.md)) — un dataset raccolto male è un passivo, non un moat.

---

## 6. Rischi principali (top 8) e mitigazioni

| # | Rischio | Probabilità | Impatto | Mitigazione (con orizzonte) |
|---|---|---|---|---|
| R1 | **Dipendenza dal founder** (bus factor = 1, non tecnico) | Alta | Critico | H0: questo pacchetto di 8 documenti come "cervello esterno"; CI/CD e deploy automatico (via [01](./01-architettura.md)) così il sistema gira senza interventi manuali; ogni procedura operativa scritta come runbook. H1: primo collaboratore part-time su supporto. H2: hire tecnico |
| R2 | **Regolatorio dati salute** (GDPR art. 9 — dati particolari; AI Act per sistemi che toccano la salute; posturale = quasi-sanitario) | Media | Critico | H0: consenso esplicito granulare, data minimization, posizionamento wellness (mai claim diagnostici — l'analisi posturale "suggerisce di consultare un professionista", non diagnostica); H1: DPA standard per i clienti white-label, registro trattamenti, hosting EU. Dettaglio in [06](./06-sicurezza-compliance.md) |
| R3 | **Churn palestre** (il titolare disdice, perdiamo 30–300 utenti in un colpo) | Media | Alto | Setup fee come commitment; onboarding assistito nei primi 30 giorni (il churn B2B si decide lì); switching cost del twin (§5.2); contratto annuale con sconto; metrica di allarme: AAT/palestra in calo per 3 settimane → intervento founder |
| R4 | **Concorrenti che copiano** (Everfit aggiunge readiness; Technogym scende di mercato) | Alta (nel tempo) | Medio | Non difendiamo le feature (indifendibili), difendiamo: dataset longitudinale, localizzazione italiana profonda (fatturazione, rate, WhatsApp), relazione diretta founder-titolari, velocità di ciclo (1 persona + AI rilascia più in fretta di un product committee) |
| R5 | **Costi AI fuori controllo** (un tenant o un bug brucia il margine) | Media | Alto | H0: proxy backend obbligatorio (elimina anche la chiave esposta) con budget per tenant, rate limit per utente, model-tiering (Haiku per task semplici, Sonnet per coaching, Opus solo dove serve), prompt caching. Overage a pass-through +30% (§4.1). Dettaglio in [03](./03-ai-engine.md) |
| R6 | **Incidente di sicurezza da debito attuale** (managedPassword in chiaro, chiave API client-side) → danno reputazionale fatale per un prodotto "salute" | Media | Critico | **Gate di vendita: nessun contratto white-label firmato prima della bonifica** (H0, settimane 1–4): rimozione managedPassword, proxy AI, regole Firestore riviste. È il primo item di [07-roadmap](./07-roadmap-milestones.md) |
| R7 | **Concentrazione piattaforma** (Firebase quota/lock-in; Anthropic single-provider) | Bassa | Medio | H0: passaggio a Blaze con budget alert (i costi restano ~0 a questi volumi, le quote spariscono); export dati schedulato; layer di accesso dati astratto in [01](./01-architettura.md) — non per migrare domani, ma per poter migrare se serve. AI: interfaccia provider-agnostica nel proxy |
| R8 | **Vendita B2B lenta / founder non è un venditore di software** | Media | Alto | Il founder vende ciò che è: un titolare che si è costruito l'arma. Playbook H1: demo dal vivo con valutazione posturale (il "wow" di §3.1), caso studio MML con numeri veri (retention, tempo coach), pricing pubblico e semplice, referral incentivato tra titolari (1 mese gratis per palestra portata). Se dopo 6 mesi < 3 clienti: rivedere prezzo/segmento, non il prodotto |

---

## 7. North Star Metric e albero delle metriche

### 7.1 North Star Metric

> **AAT — Allievi Attivamente Tracciati**: allievi che alimentano il proprio twin con **≥ 3 segnali/settimana** (check-in Stato ESSĒRE, workout loggato, presenza QR, misurazione).

Perché questa e non altre:
- **MRR** (scartata come NSM, resta metrica di guardia): misura la vendita, non il valore erogato; un MRR alto con AAT basso = churn in incubazione.
- **DAU/MAU** (scartata): premia l'engagement vuoto; un allievo può aprire l'app senza nutrire il twin.
- AAT unisce le tre tesi in un numero solo: cresce se vendiamo palestre (B2B), se gli allievi usano il prodotto (valore), e se il twin accumula dati (moat). È il metronomo di missione (§1) **e** di visione (§1) insieme.

### 7.2 Albero delle metriche per orizzonte

**H0 — Fondamenta (0–3 mesi) · laboratorio = MML, 30 allievi**

| Metrica | Target | Perché ora |
|---|---|---|
| AAT su MML | ≥ 22/30 (73%) | Se non funziona con la palestra del founder, non funziona da nessuna parte |
| Retention check-in Stato ESSĒRE (W4) | ≥ 60% | Il check-in quotidiano è il cuore del twin: va provata l'abitudine |
| Debito critico sanato | 2/2 (password + proxy AI) | Gate di vendita (R6) |
| Deploy automatizzati | 100% via CI (0 deploy manuali) | Precondizione anti-R1 |
| Costo infrastruttura totale | < 50 €/mese | Vincolo budget ~0 |

**H1 — Prodotto (3–12 mesi) · primi clienti pagano lo sviluppo**

| Metrica | Target 12 mesi | Guardia (allarme se) |
|---|---|---|
| Palestre clienti attive | 8–12 | < 3 al mese 9 → rivedere pricing/segmento (R8) |
| MRR | ≥ 2.500 € | — |
| AAT totali | ≥ 500 | AAT/palestra < 50% degli allievi → problema prodotto, non vendite |
| Churn palestre (annualizzato) | < 20% | 1 churn nei primi 90 giorni di un cliente → post-mortem obbligatorio |
| Margine lordo per palestra | > 70% | Costo AI/palestra > 60 €/mese → rivedere tiering (R5) |
| NPS titolari | > 40 | — |

**H2 — Piattaforma (12–36 mesi) · team + capitale**

| Metrica | Target 36 mesi | Note |
|---|---|---|
| AAT totali | ≥ 10.000 | ≈ 80–120 palestre: soglia moat (§5.2) |
| ARR | ≥ 400.000 € | Mix: canoni + Academy + marketplace |
| GMV marketplace | primo 100.000 €/anno | take-rate 15% |
| Twin ≥ 12 mesi di storico | ≥ 40% degli AAT | La metrica del moat |
| Ricavi non-canone | ≥ 20% dell'ARR | Diversificazione (Academy, API, marketplace) |
| Bus factor | ≥ 3 | R1 chiuso strutturalmente |

---

## Decisioni chiave

| Decisione | Perché | Alternativa scartata |
|---|---|---|
| **B2B2C white-label come unico go-to-market fino a H2** | CAC ~0 nella rete del founder; 1 contratto = 30–300 utenti; retention strutturale via coach; eseguibile da 1 persona | B2C diretto: CAC 20–80 €/utente, retention 10% a 90gg, richiede growth team e budget ads inesistenti |
| **Pricing = setup 1.490 € + canone a scaglioni di allievi (149/249/399 €)** | Prevedibile per il titolare, scala col valore, setup qualifica il cliente e rende il CAC negativo | Per-coach (punisce la crescita staff), per-allievo puro (bolletta ansiogena), revenue share (non auditabile oggi) |
| **NSM = Allievi Attivamente Tracciati (≥3 segnali/settimana)** | Unico numero che unisce vendita B2B, uso del prodotto e accumulo del moat dati | MRR (misura la vendita, non il valore), DAU/MAU (engagement vuoto) |
| **Readiness software-first: Stato ESSĒRE come core, wearable solo come arricchimento, mai requisito** | Copertura 100% allievi a costo hardware 0; scientificamente difendibile; i wearable diventano input via HealthKit/Health Connect | Readiness hardware-dipendente stile Whoop: taglierebbe fuori il 95% degli allievi di una palestra italiana media |
| **Gate di vendita: bonifica sicurezza (managedPassword + proxy AI) prima del primo contratto white-label** | Un incidente su dati salute al primo cliente è fatale e irreversibile per la reputazione; il proxy risolve insieme sicurezza e controllo costi AI | "Vendere subito e sistemare dopo": il rischio R6 è a impatto critico e la bonifica costa ~4 settimane, non mesi |
| **Restare su Firebase (Spark→Blaze) per H0/H1; nessuna riscrittura** | Il prodotto funziona, i volumi sono minuscoli, Blaze costa ~0 a questi numeri e sblocca Cloud Functions (proxy AI); riscrivere = 6+ mesi senza valore per il cliente | Migrazione a stack "serio" (Postgres/self-hosted) il giorno 1: nessun numero la giustifica sotto le 50 palestre |
| **Un'istanza Firebase per palestra in H1; multi-tenant rimandato a H2 con soglia esplicita (>30 istanze)** | Isolamento dati perfetto (argomento di vendita GDPR), zero refactoring oggi, playbook WHITE-LABEL.md già pronto | Multi-tenant subito: mesi di refactoring rules/query per un problema (gestire decine di istanze) che non abbiamo ancora |
| **Marketplace al 15% di take-rate, e solo in H2** | Coi creator early il take-rate alto uccide l'offerta; serve massa critica (>50 palestre) prima che un marketplace abbia liquidità | 30% Apple-style; oppure marketplace in H1 (nessuna liquidità = città fantasma) |

---

## Cosa NON faremo (e perché)

1. **Hardware proprietario (wearable ESSĒRE).** Mai in piano a 36 mesi. Capitale, supply chain e certificazioni sono un altro mestiere; la nostra tesi è esattamente l'opposto: readiness senza hardware + ingestione dei sensori altrui. Se un giorno servirà, sarà partnership, non produzione.
2. **B2C diretto in H0/H1.** Niente campagne consumer, niente ASO war contro Apple/Whoop. L'unico "B2C" ammesso: l'allievo che lascia la palestra e conserva il proprio twin (retention B2B travestita, valutazione in H2).
3. **Claim clinici o diagnostici.** La valutazione posturale "rileva e suggerisce", non diagnostica; lo Stato ESSĒRE è wellness, non dispositivo medico. Attraversare quella linea significa MDR/certificazioni: un altro business. Le cliniche in H2 entreranno con perimetro wellness-corporate, non sanitario ([06](./06-sicurezza-compliance.md)).
4. **Riscrittura da zero dello stack.** Il debito si sana in modo incrementale ([01](./01-architettura.md)): proxy AI, rules, CI/CD, UX della tab bar. Nessun "big bang": ogni settimana l'app in produzione deve restare in produzione.
5. **Inseguire la parità di feature con Trainerize/Everfit.** Non vinceremo elencando più integrazioni: vinciamo sul pacchetto integrato italiano (coaching+gestionale+AI+readiness). Ogni richiesta "ma Trainerize ha X" passa dal filtro NSM (§7): se non muove AAT, non entra.
6. **Community globale stile Strava.** La community di ESSĒRE è quella fisica della palestra (già pagata, già viva, già gamificata coi premi reali). Costruire un social network da zero contro effetti rete consolidati è la definizione di battaglia persa.
7. **Vendita enterprise (catene, corporate) prima di H2.** Cicli di 9–18 mesi, requisiti di compliance e SLA incompatibili con 1 persona. Il segmento è studi/box/PT-studio da 30–400 allievi, dove il titolare decide in due caffè.
8. **Obfuscation come strategia di sicurezza.** L'attuale bundle offuscato con anti-debug è teatro: la sicurezza vera è server-side (proxy, rules, secret management — [06](./06-sicurezza-compliance.md)). L'offuscazione resta solo come deterrente cosmetico, mai come garanzia su cui si fanno promesse contrattuali.

---

*Prossimo documento: [01-architettura.md](./01-architettura.md) — come lo stack attuale evolve, senza riscritture, per sostenere questa strategia.*
