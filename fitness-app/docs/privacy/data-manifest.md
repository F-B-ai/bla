# Data manifest — dove vivono i dati personali

> **Scopo**: quando arriva una richiesta di cancellazione (art. 17) con il timer dei 30 giorni che corre, questo file dice DOVE cercare. Regola di piattaforma (doc 02 §2.10): **ogni nuova denormalizzazione di dati personali va registrata qui nel momento in cui si scrive il codice.**
> **Stato**: v1 · luglio 2026 · riflette il codice attuale.

## Collezioni Firestore con dati personali (per uid/studentId)

| Collezione | Campo chiave | Dati personali presenti | Note cancellazione |
|---|---|---|---|
| `users/{uid}` | uid | email, nome, telefono, ruolo, note mediche, obiettivi, avatar | Documento principale |
| `consents/{uid}` | uid | scelte consensi + storico | Conservare la PROVA del consenso anche dopo (pseudonimizzata) |
| `wellnessChecks` | studentId | check-in benessere + nome denormalizzato (studentName) | ⚠ nome denormalizzato |
| `checkins` | studentId | presenze + studentName | ⚠ nome denormalizzato |
| `workoutPlans`, `trainingPrograms`, `workoutLogs`, `sessions` | studentId | programmi, log, carichi | |
| `bodyMeasurements`, `biaDocuments`, `bodyCompositionEstimates` | studentId | misure corporee, referti | Dati salute |
| `posturalAssessments` | studentId | valutazioni + riferimenti foto | Foto in Storage (vedi sotto) |
| `nutritionistAppointments`, `nutritionalConsultations`, `nutritionTeamNotes` | studentId | appuntamenti, note nutrizionali | Note staff: valutare esclusione da export (dati di terzi) |
| `paymentPlans`, `collaboratorEarnings`, `financialTransactions` | studentId | piani, importi | Fiscale: 10 anni, pseudonimizzare non cancellare |
| `chatRooms`, `chatMessages`, `chatTyping`, `userPresence` | participants / userId | messaggi, presenza | |
| `diaryEntries` | studentId | testi personali | Sensibili |
| `gamification` | uid/studentId | XP, badge | |
| `notifications` | userId | contenuti notifiche (possono citare nomi) | |
| `academyProgress`, `academyQuizAttempts`, `academyNotes`, `academyRatings`, `academyCertificates` | studentId/uid | progressi, certificati con nome | |
| `credentialRequests` | userId | richieste cambio credenziali (email; MAI più password dal M0) | |
| `studentInvites` | email | email, nome invitato | Leggibile pubblicamente (per il flusso codice): minimizzare |

## Storage (file)

| Percorso | Contenuto | Note |
|---|---|---|
| `postural/…` | foto posturali | Dati salute — cancellare su richiesta |
| `progress/…`, `avatars/…` | foto progressi, avatar | |
| `bia/…`, `documents/…` | referti PDF | |
| `chat/…` | media chat | Lifecycle 12 mesi |

## Denormalizzazioni note di nomi/dati personali
- `wellnessChecks.studentName`, `checkins.studentName`
- `notifications` (titoli/messaggi con nome)
- appuntamenti/agenda con nome allievo
- classifiche/viste coach con nome
- `studentInvites` (nome+email in collezione a lettura pubblica)

## Runbook cancellazione (H0, manuale)
1. Script Admin SDK: per uid/email, scandire le collezioni sopra (pattern già usato per l'eliminazione di utenti in produzione).
2. Storage: eliminare i prefissi dell'utente.
3. Fiscale: pseudonimizzare (`person_id` → tombstone), non cancellare.
4. Auth: eliminare l'utenza.
5. Conservare: prova dei consensi (pseudonimizzata) + log dell'operazione in `auditLogs`.
