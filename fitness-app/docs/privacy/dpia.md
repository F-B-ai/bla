# DPIA — Valutazione d'impatto sulla protezione dei dati (art. 35 GDPR)

> **Stato**: prima stesura v1 · luglio 2026 · DA REVISIONARE con consulente privacy (~1-2k€) prima del primo contratto white-label — è il costo di ammissione al mercato B2B (doc 06 §3.3).

## 1. Perché la DPIA è necessaria
Il trattamento soddisfa più criteri del WP248: (a) categorie particolari art. 9 (dati salute-adiacenti: benessere, foto corporee, composizione); (b) valutazione sistematica di aspetti personali (punteggio readiness 0-100, analisi AI di foto); (c) potenziale larga scala con il white-label (ogni istanza moltiplica gli interessati); (d) interessati potenzialmente vulnerabili (minori se iscritti — da verificare policy età).

## 2. Descrizione sistematica del trattamento
PWA (in futuro app native) su Firebase: i dati risiedono in Firestore/Storage del progetto della palestra (un progetto per palestra = isolamento fisico). Analisi AI tramite API Anthropic (opzione no-training). Flussi e architettura: [docs/essere-os/01-architettura.md](../essere-os/01-architettura.md); inventario dati: [02-dati-digital-twin.md](../essere-os/02-dati-digital-twin.md); registro: [registro-trattamenti.md](./registro-trattamenti.md).

## 3. Necessità e proporzionalità
- **Minimizzazione**: i prompt AI portano solo il necessario; le foto sono compresse; il punteggio readiness deriva da 4 slider dichiarati dall'utente.
- **Consensi granulari** per ogni categoria art. 9, non pre-spuntati, revocabili in-app con effetto immediato (M0: ConsentScreen + choke point su ogni chiamata AI).
- **Nessun dato conservato senza scopo**: password mai conservate (bonifica V1); TTL su dati effimeri.
- **Finalità secondarie** (benchmark/miglioramento algoritmi): consenso separato, facoltativo, su dati pseudonimizzati; il servizio è identico se rifiutato.

## 4. Rischi per gli interessati e misure

| Rischio | Gravità | Probabilità | Misure (stato) |
|---|---|---|---|
| Accesso non autorizzato a dati salute da parte di altri utenti | Alta | Media→Bassa | M0: bonifica managedPassword (FATTA nel codice; pulizia dati da eseguire); regole users ristrette (doc di altri allievi non leggibili); test regole in CI (in corso) |
| Account takeover via password leggibili | Critica | Alta→Bassa | Campo eliminato; reset via link Firebase; password esposte da ruotare (script + reset forzato) |
| Esfiltrazione chiave AI dal client → costi/abuso | Alta | Alta | MITIGAZIONE PIENA IN M1 (AI Gateway server-side); nel frattempo: chiave rotabile, consenso richiesto, rate limiting assente (rischio accettato e tracciato) |
| Foto corporee esposte per errore di regole Storage | Alta | Media | Regole Storage da stringere in M0-M1 (oggi: lettura autenticata); censimento nel data-manifest |
| Re-identificazione nel dataset pseudonimizzato (finalità secondarie) | Media | Bassa | Solo aggregati; person_id senza tabella di mappatura esposta; niente quasi-identificatori nei benchmark |
| Output AI percepito come parere medico | Media | Media | Wording non clinico obbligatorio; disclaimer; guardrail nei prompt (doc 03 §5.4); perimetro wellness (doc 06 §6) |
| Perdita dati (nessun backup) | Alta | Media | Blaze + export giornaliero su Cloud Storage (M0-M1, doc 06 §7.3) |

## 5. Parere degli interessati
Con ~30 allievi: raccolta informale di feedback sulla schermata consensi al rilascio (comprensibilità del linguaggio). Documentare le reazioni.

## 6. Conclusione (provvisoria)
Con le misure M0 attive (consensi, bonifica password, regole ristrette) il rischio residuo è ridotto ma NON accettabile per la vendita B2B finché: (1) la chiave AI resta client-side (→ M1 gateway), (2) le regole non hanno test automatici in CI, (3) il backup non è attivo (→ Blaze). Il "gate di vendita" di [07-roadmap](../essere-os/07-roadmap-milestones.md) riflette esattamente queste condizioni.
