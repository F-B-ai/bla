# L'archivio degli esercizi — decisioni di metodo

> «Poco alla volta costruiremo un archivio e delle metodologie uniche.»
> — Francesco Busanca, 10 settembre 2026

Questo file registra **perché** la libreria è fatta così. Il codice dice
*che cosa* c'è; qui c'è il motivo, che è la parte che si perde.

Stato al 10 settembre 2026: **255 esercizi**, divisi per gruppo muscolare,
ognuno con descrizione del metodo. Immagini e filmati li aggiunge il
direttore tecnico.

---

## 1. Le categorie sono i muscoli

La libreria era ordinata per **tipo** — forza, cardio, mobilità, posturale.
Classificazione corretta e inutile nel momento in cui serve: nessuno pensa
«mi serve un esercizio di forza». Si pensa **«mi servono i glutei»**.

Da oggi la categoria è il gruppo muscolare, e vale **sia per l'uomo sia per
la donna**. Un test lo verifica: nessun gruppo può restare vuoto per un
sesso. Prima di oggi i glutei per l'uomo erano *uno*, e la mobilità *zero*.

Un esercizio marcato `unisex` compare per entrambi. Il ponte glutei non
cambia perché lo fa un uomo.

---

## 2. Due gruppi ritirati

### Lombari — non si allenano

> «I lombari non vanno mai allenati, sono già di per sé dei muscoli che
> tendono ad arretrarsi. Solo in casi particolari si allenano.»

In un lavoro che nasce posturale, aggiungere tono a una catena già
accorciata è lavorare contro il proprio obiettivo. Il controllo della zona
si costruisce **dal centro** — addome, respiro, anca — non caricando gli
estensori.

Sei esercizi eliminati. Uno è rimasto e ha cambiato nome: il **bird dog**,
che non è lavoro sui lombari ma **anti-rotazione** — la schiena lì non si
muove, si oppone. Sta sotto *Addome e core*.

### Polpacci — discorso a parte, rinviato

> «Per quanto riguarda i polpacci, li dobbiamo fare un discorso a parte,
> quindi me li puoi eliminare.»

Sette esercizi di ipertrofia del polpaccio eliminati. Ne è rimasto **uno**,
il *calf raise in piedi*, e con un'altra funzione: nelle schede drenanti è
la **pompa venosa**, il «secondo cuore». Per questo vive sotto
*Decongestione e scarico*, che è la funzione che gli diamo.

Il giorno che il discorso a parte si fa, il gruppo torna.

**Perché è scritto anche nel codice**: `GRUPPI_RITIRATI` in
`src/domain/muscoli.ts`. Fra sei mesi qualcuno li rimetterebbe dentro «per
completezza». Tre test lo impediscono.

---

## 3. Il cardio ha dei nomi

Il cardio non è «andare sul tapis roulant»: sono metodi diversi, con
effetti diversi, che si scelgono in base a che cosa serve.

| Metodo | Che cos'è | Quando si usa |
|---|---|---|
| **LISS** / Zona 2 | Bassa intensità, lunga durata, si parla a frasi intere | Base aerobica, ritorno venoso, giorni di scarico |
| **MICT** | Continuo a intensità moderata | Alzare la soglia, costa più recupero |
| **HIIT** (30/30, 40/20) | Intervalli intensi con recupero breve | Potenza aerobica in poco tempo. Max 2 volte a settimana |
| **Tabata** (20/10 × 8) | Quattro minuti, il più duro che esista | Solo su base già costruita |
| **SIT** | Sprint brevi con recupero **completo** | Potenza anaerobica, atleti |
| **Fartlek** | Cambi di ritmo liberi, senza cronometro | Capacità di cambiare passo |
| **EMOM** | Lavoro fisso al minuto, il resto è riposo | Si autoregola sul livello |
| **Circuito metabolico** | Stazioni alternate alto/basso | Capacità di lavoro |
| **Piramidale** | 1-2-3-2-1 minuti | Non annoiarsi in venti minuti |

---

## 4. I protocolli

Non sono esercizi: sono **sequenze che si prendono intere**, in coda alla
seduta o come lavoro a sé.

### Decongestione e scarico (9)

Il principio è uno: sangue e linfa dalle gambe risalgono grazie alla **pompa
muscolare**, alla **gravità** e al **diaframma**. I protocolli usano tutte e
tre — pompa podalica, gambe al muro, antigravitario del mattino, mobilità
di caviglia, respiro, automassaggio ascendente, e il calf raise come pompa.

### Protocolli donna (7)

Pavimento pelvico (attivazione **e rilascio**: un pavimento pelvico che non
si rilassa mai non è forte, è rigido, e dà gli stessi sintomi della
debolezza), ritorno al movimento dopo la gravidanza, le tre fasi del ciclo,
la menopausa.

È **l'inizio** dell'archivio, non la sua fine.

---

## 5. Il perimetro, e dove è scritto

Due costanti in `src/domain/perimetro.ts`, importate da chi le usa, così
non possono divergere:

- **`AVVISO_RESPIRO`** — «Non adatto in gravidanza, ipertensione non
  controllata, malattie cardiovascolari, epilessia, glaucoma, disturbi
  psichiatrici acuti. Mai in acqua o alla guida.» Si scrive **per intero**
  su ogni scheda che contiene una pratica di respiro. Non si abbrevia, non
  si riassume, non si toglie mai. Un test lo verifica su **tutta** la
  libreria — ed è così che è venuto fuori che *Respirazione diaframmatica*,
  in libreria da mesi, non l'aveva mai avuto.
- **`PERIMETRO`** — orientamento educativo-motorio, **mai** atto
  diagnostico o terapeutico.

Il protocollo post-parto non parte senza il nulla osta scritto del medico o
dell'ostetrica, e la scheda lo dice. Anche questo è un test.

---

## 6. Che cosa manca

- I **filmati** e le **immagini**: li aggiunge il direttore tecnico.
- Il **discorso a parte sui polpacci**.
- L'approfondimento dei protocolli donna e di decongestione.
- La libreria per la donna fuori dalla zona gluteo-femorale è ancora sottile
  (tricipiti 2, bicipiti 3, total body 1): quasi tutto passa dagli esercizi
  `unisex`. Non è un difetto, è una scelta di priorità — ma quando si vorrà
  colmare, si comincia da lì.
