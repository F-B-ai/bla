# ESSĒRE Intelligence — mappa e primo modulo

Stato all'11 novembre 2026. Primo modulo: **Finance Intelligence → Rapporto del mattino**.

## Com'è fatta l'infrastruttura (trovata, non costruita)

| Pezzo | Dove | Che cosa fa |
|---|---|---|
| Motore notturno | `functions/src/brain.ts` → `nightlyBrain` | Ogni notte alle 04:00 (Europe/Rome) ricalcola da zero lo stato di ogni allievo (`twins`), il rischio di abbandono e la coda «da attenzionare»; per i segnalati chiede all'AI una proposta, con un tetto di 12 per notte. Scrive `config/brainStatus`. |
| Gateway AI | `functions/src/ai.ts` → `aiMessages` | Unica porta verso l'AI. Chiave nel Secret Manager; verifica l'identità, il consenso e il ruolo; sceglie il modello per funzione; limite giornaliero per ruolo; registra l'uso e il costo stimato in `aiUsage`. |
| Registro | `src/services/registroService.ts`, collezione `registro` | Chi ha fatto che cosa. Si scrive e non si modifica né si cancella. Lo legge solo il titolare. |
| Dominio condiviso | `src/domain/*` → copiato in `functions/src/domain` da `copy-domain.js` | Le formule vivono in un posto solo e girano identiche in app e sul server. |
| Guasti | `src/services/guastiService.ts`, collezione `guasti` | Gli errori dell'app, con la versione in esecuzione. |
| Rilascio | `.github/workflows/firebase-deploy.yml` | `[deploy]` pubblica app e regole; `[deploy-functions]` pubblica anche le funzioni. Senza etichette non parte niente. |

## Da dove vengono i soldi, nei dati

| Collezione | Che cosa contiene | Chi la legge dall'app |
|---|---|---|
| `paymentPlans` | Percorsi e rate. Una rata pagata ha `status: 'paid'` e `paidDate`. `transferPending` = bonifico dichiarato dall'allievo, da confermare. | staff; l'allievo il suo |
| `financialTransactions` | Movimenti in entrata e in uscita, scritti a mano. | solo titolare |
| `sessions` | Sedute. Svolta = `status: 'completed'` oppure `isCountedAsCompleted`. `scaloDaFare` = non scalata dal percorso. | staff; l'allievo le sue |
| `users` | Anagrafica, ruolo, allievi assegnati, percentuali. | autenticati, con limiti |

**Rate e movimenti non sono collegati.** Segnare pagata una rata non crea un movimento. Il rapporto li mostra affiancati e non li somma mai.

## Il rapporto del mattino

- **Logica:** `src/domain/rapportoMattino.ts` — funzione pura, senza AI. Stessi dati, stesso rapporto.
- **Lettura e scrittura:** `functions/src/rapporto.ts` — legge le quattro collezioni qui sopra in sola lettura e scrive un documento in `rapportiMattino/{AAAA-MM-GG}`.
- **Quando:** dentro `nightlyBrain`, dopo il motore. I due lavori sono isolati: se uno cade l'altro si fa lo stesso. Non esiste una seconda pianificazione.
- **Consegna:** funzione `rapportoMattino` (chiamabile). Senza argomenti dà l'ultimo rapporto; con `{aggiorna: true}` lo ricalcola.
- **Schermo:** Studio → Rapporto del mattino (`src/screens/owner/RapportoMattinoScreen.tsx`).

Sezioni: 1) incassi registrati; 2) rate scadute, bonifici da confermare, rate in scadenza; 3) lezioni svolte senza un pagamento registrato, con lo stato amministrativo di ogni riga; 4) riepilogo per collaboratore. Ogni sezione porta periodo e fonte; in testa c'è la data di calcolo; in fondo quanti documenti sono entrati nel conto e gli avvisi sui dati incompleti.

### Limiti dichiarati

- La sezione 3 non verifica se un percorso copre proprio quelle sedute: guarda se esiste un pagamento registrato e se ci sono sedute segnate «da scalare».
- La quota per collaboratore è calcolata solo sulle rate segnate pagate nel mese. Non considera la quota del manager né accordi fuori dall'app.
- Costi, marginalità per sezione e risultato economico completo non ci sono ancora: oggi le uscite sono solo quelle scritte nei movimenti.

## Chi può fare che cosa

| | Titolare | Manager | Collaboratore | Allievo | Motore notturno |
|---|---|---|---|---|---|
| Leggere il rapporto del mattino | sì, tramite la funzione | no | no | no | lo scrive |
| Leggere `rapportiMattino` dall'app | no | no | no | no | — |
| Movimenti (`financialTransactions`) | sì | no | no | no | sola lettura |
| Piani di pagamento | sì | lettura | lettura | i suoi | sola lettura |
| Ricalcolare il motore a mano | sì | no | no | no | — |
| Cambiare email/password, creare accessi | sì | no | no | no | — |
| Mandare messaggi, incassare, pubblicare | a mano | no | no | no | mai |

`rapportiMattino` non compare in `firestore.rules`: senza una regola Firestore nega tutto, quindi dall'app non la legge nessuno. L'unica porta è la funzione, che controlla il ruolo sul server. **Le regole di sicurezza non sono state toccate.**

## Come si prova

- `npx jest src/domain/__tests__/rapportoMattino.test.ts` — logica, confini e cablaggio.
- Prova con l'emulatore Firestore: la funzione compilata su dati seminati, le chiamate di ogni ruolo, e la lettura diretta con le regole vere.

## Come si pubblica, e come si torna indietro

- Pubblicare: un commit con `[deploy] [deploy-functions]` nella prima riga. Solo su approvazione del titolare.
- Tornare indietro: `git revert` del commit del rapporto e nuovo rilascio delle funzioni. I documenti in `rapportiMattino` restano dove sono e non li legge nessuno; i dati dello studio non vengono mai modificati dal rapporto, quindi non c'è niente da ripristinare.
