# Registro dei trattamenti (art. 30 GDPR)

> **Stato**: bozza operativa v1 · luglio 2026 · da revisionare con consulente privacy prima del primo contratto white-label (vedi [docs/essere-os/06-sicurezza-compliance.md](../essere-os/06-sicurezza-compliance.md) §3.3)
> **Titolare**: Mind Movement Lab (istanza attuale) — per le istanze white-label future: la palestra cliente è titolare, ESSĒRE responsabile ex art. 28 (+ titolare autonomo per le sole finalità secondarie, doc 06 §3.1)
> **Manutenzione**: questo file si aggiorna a ogni feature nuova che tocca dati personali (voce nella definition-of-done). Versionato in git: la storia delle modifiche è il registro delle revisioni.

## Trattamenti

| # | Trattamento | Finalità | Base giuridica | Categorie di dati | Interessati | Destinatari / sub-responsabili | Conservazione | Misure di sicurezza |
|---|---|---|---|---|---|---|---|---|
| T1 | Gestione account e accessi | Autenticazione, gestione profilo | Contratto (art. 6.1.b) | Email, nome, telefono, ruolo | Allievi, staff | Google Firebase (Auth) | Durata del rapporto + 12 mesi | Firebase Auth; regole per ruolo; niente password conservate (bonifica V1, M0) |
| T2 | Check-in benessere quotidiano (Stato ESSĒRE) | Monitoraggio benessere e consiglio di allenamento | Consenso esplicito art. 9.2.a ("wellness") | Sonno, energia, umore, dolori (dati salute-adiacenti) | Allievi | Google Firebase (Firestore) | Durata del rapporto; poi cancellazione/pseudonimizzazione | Regole Firestore; consenso revocabile in-app |
| T3 | Foto posturali + analisi AI | Valutazione posturale e monitoraggio | Consenso esplicito art. 9.2.a ("posturalAI") | Immagini del corpo, referti posturali | Allievi | Firebase Storage; Anthropic (analisi, no-training) | Durata del rapporto (serie longitudinale); revoca = stop nuove foto | Storage rules; compressione client-side; invio ad AI solo del necessario |
| T4 | Stima composizione corporea | Monitoraggio composizione corporea | Consenso esplicito art. 9.2.a ("bodyComp") | Immagini, stime %BF (range) | Allievi | Firebase; Anthropic | Come T3 | Come T3; output sempre come range, mai diagnosi |
| T5 | Programmazione e log allenamenti | Erogazione del servizio di coaching | Contratto (art. 6.1.b) | Programmi, esercizi, carichi, presenze QR | Allievi | Firebase | Durata del rapporto + 12 mesi | Regole per ruolo (allievo vede solo i propri) |
| T6 | Funzioni AI (Assistente, AI Coach, riepiloghi) | Supporto informativo e suggerimenti | Consenso ("externalAI") per l'invio ad AI esterna | Contesto conversazione, dati di allenamento/benessere minimizzati | Allievi, staff | Anthropic (API, opzione no-training, dati verso USA con garanzie — verificare SCC/DPF nel DPA) | Log conversazioni: solo client; nessun log server (fino a M1) | Choke point consenso in callClaude; minimizzazione nel prompt |
| T7 | Pagamenti e rate (tracciamento interno) | Gestione amministrativa abbonamenti | Contratto (art. 6.1.b); obbligo di legge per i documenti fiscali | Piani, importi, scadenze, pagamenti segnalati | Allievi | Firebase | Documenti fiscali: 10 anni (pseudonimizzati a fine rapporto); resto: durata rapporto | Regole: allievo vede solo i propri piani |
| T8 | Chat coach-allievo | Comunicazione di servizio | Contratto (art. 6.1.b) | Messaggi, presenza online | Allievi, staff | Firebase | 12 mesi (media), poi pulizia | Regole per partecipanti |
| T9 | Notifiche e promemoria (in-app, WhatsApp/SMS) | Promemoria rate, appuntamenti, traguardi | Contratto; legittimo interesse per i promemoria di servizio | Nome, telefono, contenuto promemoria | Allievi | Provider messaggistica (da censire nel DPA quando attivato) | Effimera (48h-6 mesi per tipo) | TTL; contenuto minimizzato |
| T10 | Gamification (XP, badge, premi) | Motivazione e premi reali | Contratto (art. 6.1.b) | Punteggi, traguardi | Allievi | Firebase | Durata del rapporto | Riscatti premio con verifica manuale finché XP non è server-side (doc 06 §4.1) |
| T11 | Benchmark pseudonimizzati e miglioramento algoritmi (FINALITÀ SECONDARIA) | Statistiche aggregate tra palestre; taratura algoritmi (readiness, churn) | Consenso dedicato e revocabile ("secondaryUse") — ESSĒRE titolare autonomo delimitato | Dati pseudonimizzati (person_id, mai nome/email) | Allievi consenzienti | — (interno) | Oltre il rapporto, finché il consenso non è revocato (clausola di sopravvivenza DPA) | Pseudonimizzazione; nessun dato identificabile; opt-out senza effetti sul servizio |

## Trasferimenti extra-UE
- **Anthropic (USA)**: verificare adesione al framework di adeguatezza vigente / SCC; citare nell'informativa e nel DPA. Minimizzazione nel prompt (nome → "l'allievo").
- **Firebase**: verificare la region dell'istanza (obiettivo: europe-west); se us-central, pianificare migrazione (doc 06 §3.3).

## Diritti degli interessati
Meccaniche di esercizio (accesso, portabilità, cancellazione) documentate in doc 06 §3.5. In H0: runbook manuali con Admin SDK, evasione entro 30 giorni.
