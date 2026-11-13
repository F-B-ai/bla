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

## Executive: le evidenze del giorno

Secondo modulo, costruito sopra il rapporto. **Non ancora pubblicato** alla data di questo documento.

- **Logica:** `src/domain/evidenze.ts`. Legge il rapporto e ne ricava le righe che meritano una decisione, in tre livelli: da fare, da guardare, da sapere. Sono regole scritte, senza AI.
- **Regole:** bonifici dichiarati da confermare; sedute non scalate dal percorso; percentuali mancanti; rate scadute; lezioni senza un percorso registrato; collaboratori con allievi e nessuna seduta registrata nel mese; differenza fra rate e movimenti del mese; dati incompleti.
- **Ogni evidenza** porta i numeri che la motivano, la sezione del rapporto da cui viene e una proposta. Le proposte non sono azioni: non parte niente da solo.
- **Traccia:** le evidenze si salvano dentro il foglio del giorno (`rapportiMattino/{giorno}`), quindi resta scritto che cosa era stato segnalato in ogni data.
- **Schermo:** in cima al Rapporto del mattino, prima dei numeri.

Per i dati di movimento e salute vedi `movement-intelligence.md`.

## Accessi: traccia e controllo (11 novembre 2026)

Dopo il buco sulle funzioni amministrative (un manager poteva cambiare email e password di chiunque, dal 2 settembre all'11 novembre 2026).

- **Cancello tracciato** (`functions/src/traccia.ts` → `soloTitolareTracciato`): tutte e otto le funzioni che toccano gli accessi lasciano passare solo il titolare. Chi viene respinto lascia una riga nel Registro, azione `tentato`, con che cosa stava provando a fare e su chi.
- **Traccia delle modifiche:** cambio email (da quale a quale), cambio password, creazione, cancellazione e cambio di ruolo lasciano una riga nel Registro, oggetto `accesso`, scritta dal server. **Nessuna password viene mai scritta.**
- **Controllo accessi** (funzione `controlloAccessi`, schermata Studio → Controllo accessi): per ogni account, email di accesso, email in scheda, creazione, ultimo ingresso, ultima attività e da quando valgono le sessioni. Segnala: accessi senza scheda, email di accesso diversa da quella della scheda, schede disattivate con accesso abilitato, sessioni chiuse negli ultimi 30 giorni, più di un titolare. Legge e basta.
- Le regole di sicurezza non cambiano: il Registro si aggiunge e non si modifica, e lo legge solo il titolare.

**Limite:** quello che è successo prima dell'11 novembre non è nel Registro. Le date di Firebase (creazione, ultimo ingresso, sessioni chiuse) dicono *quando*, non *chi*. Il *chi* per quel periodo sta solo nei log delle funzioni nella console Firebase.

## Revisione dell'11 novembre 2026, sera

Revisione completa con una seconda verifica indipendente. Trovato e corretto:

- **Chiunque poteva diventare titolare** (regole di `users`, presente da prima di questo lavoro). La creazione di una scheda era aperta a qualunque account, senza limiti sul ruolo: bastava registrarsi e scriversi `role: 'owner'` per leggere movimenti economici, Registro e tutto il resto. Ora le schede le crea il titolare (qualunque ruolo), lo staff (solo allievi) o chi si registra con l'invito (solo la propria, solo come allievo). **Il primo titolare di un'installazione nuova si crea dalla console Firebase.**
- **Registro falsificabile.** Un utente poteva retrodatare righe, firmarle col nome del titolare o fingerle del server. Ora l'ora è quella del server, nome e ruolo devono essere quelli della scheda, «tentato» e «accesso» li scrive solo il server, i testi hanno una lunghezza massima. Se nome o ruolo in memoria non combaciano più con la scheda, l'app riscrive la riga senza nome né ruolo invece di perderla.
- **Funzioni:** una richiesta vuota faceva cadere la funzione prima del cancello, senza traccia; i testi mandati da chi chiama entravano nel Registro senza filtro; i tentativi ripetuti potevano allagare il Registro (ora una riga per ora, per persona e per tipo); i rifiuti sul rapporto e sul ricalcolo del motore non erano scritti; alcune operazioni riuscite non lasciavano riga; il cancello non guardava se la scheda del titolare era attiva.
- **Controllo accessi:** ora confronta anche il ruolo scritto nell'accesso (che decide i permessi sui file) con quello della scheda.
- **Rapporto:** la percentuale scritta sull'allievo vale solo se maggiore di zero e solo per i piani dei suoi coach; il rapporto gira prima del motore, con più tempo; lo schermo avverte se il rapporto non è di oggi.

**Da sapere dopo la pubblicazione:** chi ha l'app aperta da prima scrive il Registro con l'ora del telefono, che ora viene rifiutata: quelle righe si perdono finché non ricarica l'app.

Prove sull'emulatore: regole 49/49 (e le stesse prove sulle regole di prima mostrano i buchi), funzioni 42/42, rapporto 34/34.
