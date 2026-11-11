# Movement Intelligence — architettura e dati

Stato all'11 novembre 2026. Questo documento è un progetto: descrive che cosa c'è, come vanno separati i dati e che cosa serve per arrivarci. **Non cambia niente da solo:** ogni punto della sezione «Che cosa va cambiato» tocca le regole di sicurezza e richiede l'autorizzazione del titolare.

## Che cosa esiste già

| Capacità | Dove | Come lavora |
|---|---|---|
| Valutazione posturale da foto | `domain/posture.ts`, `posture3d.ts`, `inquadratura.ts`, `lineeMiofasciali.ts` | Punti del corpo letti sul dispositivo (6 letture per foto), misure con margine, modello 3D, confronto prima/dopo, linee. Le foto non lasciano il telefono per essere misurate. |
| Analisi del cammino e dello squat | `domain/gait.ts`, `squat.ts` | Da video, sul dispositivo. **Hanno ancora il difetto di proporzione** corretto per le foto il 10/11: gli angoli vanno raddrizzati. |
| Valutazione in due sessioni e catene | `domain/stellato.ts`, `data/stellatoProtocol.ts` | Test in sala con punteggio per catena e regole di prescrizione. |
| Stato dell'allievo | `functions/src/brain.ts` → `twins` | Prontezza, carico, aderenza, rischio di abbandono: ricalcolati ogni notte. |
| Spiegazione in parole | gateway AI (`functions/src/ai.ts`) | L'AI spiega numeri già calcolati; non misura. |

Regola che vale per tutto: **le formule calcolano, l'AI spiega.** Nessuna misura è stimata a occhio da un modello.

## Tre tipi di dato, tenuti distinti

| Tipo | Esempi | Dove sta oggi |
|---|---|---|
| **Anagrafico** | nome, contatti, collaboratore assegnato | `users` |
| **Relativo alla salute** | note mediche, foto del corpo, documenti BIA, consensi | `users.medicalNotes`, Storage `postural/` `bia/` `bodycomp/`, `biaDocuments`, `consents` |
| **Risultato di un'analisi** | misure posturali, modello 3D, punteggi delle catene, stato dell'allievo | `posturalAssessments`, `mindMovementAssessments`, `twins`, `human_events` |

Le foto del corpo e le note mediche sono dati particolari (art. 9 del GDPR): servono un consenso esplicito, un accesso limitato a chi segue la persona e un tempo di conservazione dichiarato. I risultati delle analisi sono numeri: da soli dicono molto meno, ma legati al nome tornano a essere dati sulla salute.

## Chi legge che cosa — oggi

Verificato su `firestore.rules` e `storage.rules`:

- `posturalAssessments`, `biaDocuments`, `mindMovementAssessments`, `twins`, `human_events`, `consents`: li legge **qualunque membro dello staff**, per **qualunque allievo**.
- `posturalAssessments` e `biaDocuments`: **qualunque membro dello staff può cancellarli.**
- Foto in Storage (`postural/`, `bia/`, `bodycomp/`): le legge tutto lo staff; le cancella solo il titolare.
- L'allievo legge solo le proprie.

Quindi un collaboratore vede oggi le foto, le note e le valutazioni di allievi che non segue. È il punto rimasto aperto dal 9 novembre.

## Chi dovrebbe leggere che cosa — proposta

| | Titolare | Collaboratore / manager | Allievo | Motore notturno | AI |
|---|---|---|---|---|---|
| Anagrafica | tutta | i propri allievi | la propria | sola lettura | mai il nome, salvo dove serve |
| Foto del corpo, BIA, note mediche | tutte | solo dei propri allievi | le proprie | mai | solo se l'allievo ha dato il consenso all'AI, e solo per quella richiesta |
| Valutazioni e modelli 3D | tutte | solo dei propri allievi | le proprie | sola lettura | i numeri, non le foto, dove possibile |
| Cancellare una valutazione | sì | no | no | no | no |
| Stato dell'allievo (`twins`) | tutti | i propri allievi | il proprio | lo scrive | — |

## Che cosa va cambiato per arrivarci

1. **Regole per collaboratore:** lettura di valutazioni, BIA, stato e foto solo per gli allievi assegnati. Richiede che ogni documento porti (o permetta di risalire a) chi segue l'allievo, e la modifica di alcune schermate che oggi leggono «tutti».
2. **Cancellazione riservata al titolare** per `posturalAssessments` e `biaDocuments`.
3. **Tempo di conservazione** delle foto: da decidere dal titolare (per esempio: finché la persona è allieva, più un periodo definito), con cancellazione eseguita dal titolare o da una funzione che lui approva.
4. **Cammino e squat:** correggere la proporzione dei video, come fatto per le foto.

Ogni punto si prova sull'emulatore con le regole vere prima del rilascio, come per il rapporto del mattino.

## Che cosa manca per chiamarla «intelligence»

- **Validazione:** le misure posturali hanno una ripetibilità misurata, non un'accuratezza misurata. Serve il confronto con misure prese a mano su allievi veri.
- **Conferma dei punti:** dare al professionista la possibilità di correggere a mano un punto letto male.
- **Progressioni:** collegare misure e punteggi delle catene alle progressioni di esercizi in modo dichiarato e verificabile, non lasciato a un testo dell'AI.
- **Report di qualità del movimento:** un unico foglio per allievo che metta insieme postura, cammino, squat e catene, con le fonti di ogni numero.
