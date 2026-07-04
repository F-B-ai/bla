# ESSĒRE OS — Pacchetto di Fondazione

> **Cos'è questo pacchetto**: il progetto completo per trasformare ESSĒRE da app di una palestra (Mind Movement Lab, ~30 allievi) al primo **Human Operating System**: un Digital Human Twin per ogni persona, un coach umano nel loop, venduto alle palestre in white-label.
>
> **Stato**: v1.0 · luglio 2026 · 8 documenti + questa sintesi
> **Owner**: Francesco Busanca (founder) · architettura e stesura: CTO/AI
> **Processo**: 8 documenti scritti in parallelo da agenti specializzati su un contesto condiviso (stato reale dell'app, debito tecnico incluso), poi sottoposti a **revisione critica avversariale** incrociata; le 12 incoerenze critiche e le 6 debolezze segnalate sono state corrette prima di questa pubblicazione.

---

## La tesi in tre frasi

1. **La visione è "Human OS", la battaglia di oggi no.** I concorrenti reali non sono Apple/Whoop/Oura (che diventano *sorgenti dati* via HealthKit/Health Connect) ma Trainerize/TrueCoach/Everfit e i gestionali: si vince in verticale sul mercato italiano con l'unico pacchetto che unisce coaching + gestionale + AI + readiness.
2. **Il cuneo che nessuno ha**: coach umani veri dentro il prodotto (ogni loro intervento è una *label* sul dataset), readiness senza hardware (100% degli allievi coperti dal giorno 1, contro ~5% di penetrazione wearable), valutazione posturale AI come momento "wow" di vendita, e il canale B2B white-label (1 contratto = 30–300 utenti, CAC ~0 nella rete del founder).
3. **Un ecosistema da 20 componenti progettato tutto insieme è il modo più veloce per non spedire niente**: quindi la mappa completa si disegna ora (questi documenti), ma si costruisce per **milestone spedibili e vendibili** (07), ognuna con criteri di accettazione misurabili.

## Come leggere il pacchetto

| Doc | Cosa risponde | Leggilo se… |
|---|---|---|
| [00-strategia](./00-strategia.md) | Dove si gioca, contro chi, con che pricing (setup 1.490 € + canone 149/249/399 €/mese), quale metrica guida (AAT: Allievi Attivamente Tracciati) | …devi decidere priorità o parlare con un cliente/investitore |
| [01-architettura](./01-architettura.md) | Come si evolve il sistema senza riscriverlo (strangler sui service), AI Gateway come prima mossa, store nativi, CI/CD, costi | …prima di qualunque scelta tecnica |
| [02-dati-digital-twin](./02-dati-digital-twin.md) | Il Twin come log eventi append-only (`human_events`, registro unico da 42 tipi) + stati derivati ricostruibili; il twin appartiene alla persona | …prima di scrivere qualunque schema dati |
| [03-ai-engine](./03-ai-engine.md) | UN gateway, 6 moduli AI, e **le formule canoniche** (readiness v2, ACWR-EWMA, churn, progressioni): deterministiche, versionate, testate — l'LLM interpreta, non calcola | …prima di toccare qualunque funzione AI |
| [04-ux-design](./04-ux-design.md) | Da ~20 tab a 5 con home "Oggi", 12 flussi chiave, design token, i problemi UX attuali con gravità | …prima di disegnare o rifare schermate |
| [05-api-sdk-integrazioni](./05-api-sdk-integrazioni.md) | Rotte `/v1` (in spec solo quelle implementate), webhook, HealthKit/Health Connect on-device (mai aggregatori cloud) | …prima di integrare qualsiasi cosa |
| [06-sicurezza-compliance](./06-sicurezza-compliance.md) | Bonifica `managedPassword`, threat model, GDPR art. 9, ruoli titolare/responsabile, confini MDR, incident response | …**subito**: contiene il gate di vendita |
| [07-roadmap-milestones](./07-roadmap-milestones.md) | M0→M8 con effort onesto, gate numerici tra orizzonti, team plan, budget | …per sapere cosa si fa lunedì |

**Orizzonti usati ovunque**: H0 "Fondamenta" (0–3,5 mesi, 1 persona + AI) · H1 "Prodotto" (3–12 mesi, i clienti pagano lo sviluppo) · H2 "Piattaforma" (12–36 mesi, team + capitale).

## Le decisioni portanti (già prese nei documenti)

1. **B2B2C white-label come unico go-to-market fino a H2** — niente B2C diretto; istanza Firebase per palestra oggi, corsia multi-tenant solo al trigger unico (>10 istanze attive o >4 h/settimana di ops).
2. **Gate di vendita non negoziabile**: bonifica `managedPassword` + AI Gateway (chiave Anthropic mai più sul client) PRIMA di firmare il primo contratto. È M0+M1.
3. **Il Twin = event log append-only + stati derivati ricostruibili**, con `person_id` stabile e `tenant_id` dal giorno 1; il twin appartiene alla persona, la palestra ne ha licenza d'uso (retention B2B travestita da diritto: effetto rete tra palestre ESSĒRE).
4. **Decisione legale presa ora, non in H2**: ESSĒRE responsabile art. 28 per l'operatività **+ titolare autonomo per due sole finalità secondarie** (benchmark pseudonimizzati, miglioramento modelli), con consenso dedicato dal giorno 1 e clausola di sopravvivenza nel DPA — senza questo assetto il moat dati sarebbe giuridicamente inesercitabile. Da validare col consulente privacy prima del primo contratto.
5. **Le formule vivono in 03 e solo lì** (readiness v2, ACWR con EWMA, churn, progressione): l'LLM non fa i conti; ogni numero mostrato ha una scomposizione spiegabile al coach.
6. **Readiness software-first**: lo Stato ESSĒRE resta il core senza hardware; i wearable arricchiscono (max α=0.4 nel blend), mai richiesti.
7. **Ogni milestone è spedibile e vendibile**; primo cliente pilota al mese 4–5 con la PWA e provisioning manuale (M3.5), l'automazione si costruisce dopo la validazione (M6); il buco commerciale 3→8-12 palestre ha una milestone dedicata (M6.5: cadenza demo, pipeline, referral).
8. **Cosa NON faremo** (ogni doc ha la sua lista): hardware proprietario, microservizi prematuri, fine-tuning prima di decine di migliaia di label, vector-DB/RAG sul twin (context builder deterministico), enterprise/cliniche prima di H2, marketplace prima della massa critica.

## Esito della revisione critica

Verdetto del revisore (sintesi): *"Pacchetto molto sopra la media del genere: stadiato davvero, onesto sul debito, con alternative scartate motivate e parecchie scelte genuinamente 10x. […] Dopo [le correzioni], è un piano che firmerei."*

Le tre faglie che rendevano il piano non eseguibile — (1) moat dati incompatibile con l'assetto legale art. 28, (2) algoritmo core e contratto del gateway in versioni multiple incompatibili tra documenti, (3) aritmetica H0 che non chiudeva e buco commerciale tra 3 e 8–12 clienti — **sono state corrette in questa versione** (assetto di titolarità secondaria in 06 §3.1; 03 §2 e 01 §2.2 dichiarati fonti uniche; H0 ricalibrato a 3,5–4 mesi con i deliverable privacy dentro M0/M1; milestone M6.5). Le correzioni anti-mediocrità: via l'LTV inventato (resta payback + margine), tabella confidence dichiarata come prior da calibrare, spec API limitata alle rotte implementate, claim di vendita ("attivazione ~100%", "demo che chiude") trasformati in ipotesi strumentate, claim Whoop/Oura da verificare su device reali, riscatti premio sospesi/verificati finché gli XP sono scrivibili dal client.

## Domande aperte che spettano al founder

1. **Disponibilità commerciale**: almeno mezza giornata/settimana per demo e outbound in H1? Senza, i target (8–12 palestre in 12–15 mesi) non reggono e vanno dichiaratamente abbassati.
2. **Entità giuridica**: chi firma contratti white-label e DPA (ditta individuale vs SRL)? Da decidere prima del primo contratto.
3. **Perimetro wellness confermato**: valutazione posturale e Stato ESSĒRE "suggeriscono", mai "diagnosticano" — rinuncia al posizionamento sanitario fino a H2. D'accordo?
4. **Pricing pubblico**: setup 1.490 € + 149/249/399 €/mese pubblicati sul sito e testati sulle prime 3–5 trattative reali?
5. **Budget infrastruttura H0**: tetto di spesa mensile accettabile post-Blaze (proposta: alert a 10 €/50 €)?
6. **Academy sugli store**: se venduta in-app ai consumatori finali ricade nell'IAP di Apple/Google (30%) — decidere prima della submission.

## Il prossimo passo (uno solo): Milestone 0 — Consolidamento

2–3 settimane, dettaglio in [07 §M0](./07-roadmap-milestones.md): bonifica `managedPassword` (giorno 1–3), hardening + test delle regole Firestore, upgrade Blaze con budget alert, CI/CD, primi test sulla logica che tocca soldi e punteggi, Sentry, schermata consensi (incluso quello per finalità secondarie: il moat si raccoglie dal giorno 1). Ogni giorno di rinvio è un giorno in cui l'app resta una bomba reputazionale e il primo contratto non si può firmare.
