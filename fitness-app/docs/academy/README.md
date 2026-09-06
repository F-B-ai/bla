# Academy — l'archivio dei documenti

Questa cartella esiste per una ragione precisa: i documenti dell'Accademia erano
stati scritti, stampati, e poi perduti. Erano nati in conversazioni diverse, non
stavano in nessun repository, e quando è servito ritrovarli non c'era un posto
dove cercarli.

**La regola è una sola: un documento dell'Accademia esiste se sta in questa
cartella.** Se è solo stampato, o solo in una chat, non esiste — esiste una
copia, e le copie si perdono.

I file qui dentro sono versionati con il codice: hanno una storia, si possono
confrontare, e non si perdono.

---

## Che cosa c'è, e dove

### `strategici/` — i documenti di indirizzo

| Documento | File | Che cosa contiene |
|---|---|---|
| **Strategico 01/02** — Mind Movement Academy | `01-academy-punto-situazione-e-piano-sviluppo.pdf` | Inventario reale degli asset, **12 lacune**, architettura definitiva dei 3 livelli con monte ore e prezzi, distribuzione dei 22 moduli sulle 5 aree, **standard di produzione a 9 blocchi**, sistema di valutazione e rubrica, tutela del metodo, roadmap a 90 giorni |
| **Strategico 02/02** — ESSĒRE | `02-processo-vendita-e-inquadramento-societario.pdf` | Perché oggi non vende, a chi si vende, listino, **processo di vendita in 7 stadi**, strumenti, demo in 6 blocchi, obiezioni e risposte, prerequisiti, inquadramento societario, roadmap a 90 giorni |
| Contenuti e piano di espansione | `contenuti-piano-espansione.docx` | Storie, Reel, podcast, marketing, app |
| Scheda di transizione dal sit-up | `scheda-transizione-situp-academy.pdf` | Materiale formativo per coach: protocollo di sostituzione, progressione, valutazione |

### `moduli/` — i contenuti didattici

Vedi [`moduli/README.md`](./moduli/README.md).

### Alla radice

| File | Che cos'è |
|---|---|
| `valutazione-due-sessioni-e-sistema-stellato.pdf` | Specifica clinica e tecnica. Già implementata in `src/data/stellatoProtocol.ts` |
| `docimologia.html` | Sessione 01 del percorso formatori. **Ricostruita a norma di copertina**, non originale |
| `modulo-a01-*.html` | Modulo proposto e materiali d'aula. **Non è il Modulo 1 reale**: vedi sotto |
| `i-22-moduli-ricostruzione.html` | Ricostruzione fatta prima che i documenti rientrassero. **Superata**, tenuta come storia |
| `pagina-fondativa-human-interface.html` | Definizione fondativa di ESSĒRE |
| `nota-due-diligence-stato-reale.html` | Stato verificabile del sistema, per chi valuta |

---

## L'architettura vera, dal Documento strategico 01/02

### I tre livelli

| Livello | Titolo rilasciato | Monte ore | Formato | Prezzo indicativo |
|---|---|---|---|---|
| **L1** | Operatore Mind Movement | 60 h (40 online + 20 presenza) | Blended, 3 mesi | € 890 – 1.200 |
| **L2** | Educatore Somatico Mind Movement | 100 h (50 + 50) | Blended, 5 mesi | € 1.800 – 2.400 |
| **L3** | Trainer / Docente Mind Movement | 120 h + tirocinio + tesi | In presenza + supervisione, 8 mesi | € 3.500 – 4.900 |

### Le cinque aree

| Codice | Area | Nucleo |
|---|---|---|
| **A** | Anatomia fasciale e biomeccanica | Catene miofasciali, sling, trasmissione delle forze, valutazione posturale |
| **B** | PNEI, respiro e nutrizione | Asse HPA, respirazione, nutrizione fasciale, infiammazione, recupero |
| **C** | Pratica del movimento e programmazione | Protocollo CCGT, progressioni, adattamento del carico, casi speciali |
| **D** | Coscienza, meditazione e pratiche interne | Qi Gong, interocezione, propriocezione, stati attentivi |
| **E** | Comunicazione somatica e conduzione | PNL applicata, linguaggio del corpo, conduzione d'aula, colloquio |

**Vincolo dichiarato:** nessun modulo può appartenere a due livelli. Se un
contenuto serve a entrambi si sdoppia in versione base e avanzata con obiettivi
diversi. È la regola che impedisce all'Accademia di diventare un unico corso
lungo 22 moduli.

### La ripartizione, e la sua correzione

Il Documento strategico 01/02 propone **8 / 9 / 5** e chiude con
«Decisione richiesta n.1 — confermi o modifichi la ripartizione?».

Il **Documento operativo 03**, capitolo 2, registra la risposta: la ripartizione
reale è **8 / 8 / 6**. Quel documento è quindi posteriore e prevale.

---

## Che cosa manca ancora

Una cosa sola, ed è la stessa da giorni: **l'elenco dei 22 titoli reali**.

Il Documento strategico 01/02 lo dice esplicitamente: *«La griglia va compilata
con i titoli reali dei tuoi moduli: è il primo esercizio da fare insieme.»* Quei
titoli sono stati poi scritti nel **capitolo 1 del Documento operativo 03**, che
è l'unico documento della serie ancora non rientrato in forma digitale.

---

## Lo standard di produzione di un modulo — 9 blocchi

Dal Documento strategico 01/02 §4. Il modulo di Nutrizione Fasciale e PNEI è il
modello-tipo; ogni altro modulo deve avere **esattamente questa struttura, in
questo ordine**.

1. **Esito di apprendimento** — 3–5 frasi «alla fine l'allievo sa fare X», verificabili · 1 pagina
2. **Mappa** — schema visivo delle relazioni, in palette Mind Movement · 1 SVG
3. **Fondamento teorico** — teoria, letteratura di riferimento, limiti · 6–12 pagine · 60'
4. **Fondamento metodologico** — perché il metodo lo integra così e non altrimenti · 2–4 pagine · 20'
5. **Pratica guidata** — esercizi con dosaggio, progressione, criteri · scheda + video · 90'
6. **Errori comuni e correzioni** — minimo 8 errori tipici con correzione somatica · tabella · 30'
7. **Casi e ragionamento** — 2 casi reali, uno complesso · 4 pagine · 45'
8. **Verifica** — 10 domande chiuse + 1 prova pratica + 1 caso · scheda esame · 30'
9. **Bibliografia e fonti** — fonti primarie, non citazioni di seconda mano · 1 pagina

> Il modulo A-01 prodotto in questo repository **non** segue questi nove blocchi:
> è stato scritto prima che il documento rientrasse. Va riformattato o rifatto.

---

## Tre cose da sistemare prima di erogare

1. **Due modelli di catene convivono.** Il Modulo 1 insegna le **otto** catene
   miofasciali di Myers; il Sistema Stellato implementato nell'app ne usa
   **cinque** (I-E, A, F, C, E). Entrambi legittimi, ma un corsista che studia
   otto catene e ne trova cinque nell'applicazione si ferma. Va deciso come si
   tengono insieme, e dichiarato.

2. **~~L'autore sulla copertina~~ — CHIUSA.** Alcune copertine riportavano
   «Francesco Filippi» o «Francesco Cacace». **L'autore ha confermato di aver
   scritto tutto lui: Francesco Busanca.** Erano artefatti di generazione, non
   coautori. Resta solo da correggere il nome nei file che lo riportano sbagliato
   prima di stamparli o depositarli.

3. **~~Le figure anatomiche~~ — RISOLTA nel materiale più recente.** La vecchia
   `guida-figure-anatomy-trains.md` indicava di salvare le tavole da
   BasicMedicalKey, che ospita immagini tratte dal libro di Myers: riprodurle in
   dispense vendute sarebbe uso di materiale protetto.
   **Il manuale docente del Modulo 01 (parte B) fa la cosa giusta**: cita le
   figure per numero — «Myers Fig. 5.1» — e rimanda al sito ufficiale
   `anatomytrains.com/at-posters`, dove i poster si acquistano. Citare una figura
   e indicare dove comprarla è legittimo; riprodurla no.
   **Resta solo da allineare la vecchia guida a questo criterio**, o da
   archiviarla come superata.

E una quarta, che viene dalla roadmap del Documento strategico 01/02 ed è
segnata lì come bloccante per tutto il resto: **il deposito della domanda di
registrazione del marchio (classi 41 e 44)**.

---

## Che cosa manca — confronto con l'inventario del Documento strategico 01/02

Il §1.1 del 01/02 elenca gli asset che **esistono già**. Questo è il confronto
con ciò che è effettivamente in archivio, al 6 settembre 2026.

| Asset dichiarato esistente | In archivio | Perché serve |
|---|---|---|
| Curriculum 22 moduli / 5 aree / 3 livelli | **Struttura sì, titoli no** | I titoli stanno nel cap. 1 dell'Operativo 03 |
| **Modulo Nutrizione Fasciale e PNEI** (completo) | ✗ | È il **modello-tipo a 9 blocchi** per gli altri 21. Senza, ogni modulo nuovo si scrive a occhio |
| **Protocolli riabilitativi standardizzati** (casi reali) | ✗ | Il 01/02 dice che «diventano casi clinici d'esame». Senza casi veri, l'esame è finto |
| **Diagrammi SVG catene miofasciali (originali)** | ✗ | Sono **originali**: risolvono da soli il problema di licenza sulle tavole di Myers |
| Manuale di produzione CCGT (PDF brandizzato) | ✗ | Da elevare a standard editoriale ufficiale |
| Standard documentale di casa (palette, Georgia, clausole) | ✗ | Da estendere a slide, attestati, contratti |
| Script Reel biomeccanica (affondo, sling posteriore) | ✗ | Da riciclare come micro-lezioni video del L1 |
| Libro Mind Movement (KDP) | ✗ | Testo di riferimento del Livello 1. È pubblicato, quindi meno urgente |

**Uno su otto.** Più il Documento operativo 03, che non compare nell'inventario
perché è posteriore.

Ordine di utilità per chi li cerca:

1. **Documento operativo 03** — i 22 titoli reali
2. **Modulo Nutrizione Fasciale e PNEI** — il modello-tipo
3. **Protocolli riabilitativi standardizzati** — i casi d'esame
4. **Diagrammi SVG originali** — chiudono la questione delle figure

---

## Come si aggiunge un documento

1. Metti il file qui (`.pdf` o `.docx` per gli originali, `.html` per quelli composti).
2. Aggiorna la tabella che gli compete.
3. Committa. Non serve altro.

---

## ⚠ Due architetture in conflitto — decisione richiesta

Con il rientro del **Blueprint formativo** è emerso il problema più grosso
dell'archivio, e non è un problema di file mancanti: è che **coesistono due
Accademie diverse**, ciascuna coerente al proprio interno, mai riconciliate.

| | **Blueprint formativo** | **Strategico 01/02 + Operativo 03** |
|---|---|---|
| Moduli | **12** | **22** |
| Struttura | 3 blocchi | 3 livelli × 5 aree |
| Nomi dei blocchi | Fondamenti · Integrazione · Trascendenza | L1 Operatore · L2 Educatore Somatico · L3 Trainer/Docente |
| Chiave | Il Sapere · Il Saper Fare · L'Essere | monte ore, prerequisiti, titolo rilasciato |
| Stato dichiarato | 5 completati, 7 nuovi | 8/8/6, titoli nel cap. 1 dell'Operativo 03 |
| Firma sul file | «Francesco Cacace» *(refuso)* | Francesco Busanca |

Non sono due versioni dello stesso documento: sono due impianti diversi. Il
Blueprint è un piano di contenuti; lo Strategico è un impianto di
certificazione (ammissione, monte ore, valutazione, titolo). **Finché non si
sceglie quale dei due è l'Accademia, ogni modulo prodotto rischia di essere
prodotto per l'altra.**

### Tre versioni del Modulo 1

| File | Titolo | Catene | Note |
|---|---|---|---|
| `moduli/modulo-01-anatomia-funzionale.docx` | Anatomia Funzionale | **8** | firmato Francesco Filippi |
| `strategici/blueprint-formativo-12-moduli.docx` | Anatomia Funzionale Integrata | **7** | dentro il Blueprint |
| `moduli/modulo-01-variante-anatomia-fasciale-integrata.pdf` | Anatomia Fasciale Integrata & Anatomy Trains | — | 3 weekend, 42 h, **€350** offerta lancio |

E nell'app il Sistema Stellato ne usa **cinque**. Quattro conteggi diversi
delle catene miofasciali nello stesso metodo.

### Le firme — questione chiusa

Alcune copertine riportano «Filippi» o «Cacace» al posto di «Busanca».
**L'autore ha confermato: ha scritto tutto lui, Francesco Busanca.** Sono
refusi introdotti in generazione. Vanno corretti nei file prima della stampa e
prima del deposito del marchio, ma non c'è nessuna questione di paternità.

**Sulle credenziali, correzione.** Avevo segnalato come discrepanza il fatto che
comparissero sia «campione europeo» sia «campione del mondo». Non è una
discrepanza: il libro racconta la progressione per intero — campione italiano,
poi migliore della federazione, poi campione europeo, poi **campione del mondo
INBA/PNBA**, poi **Vice Mr. Olympia Natural a Las Vegas**. Entrambe le
formulazioni sono vere; «campione europeo» è solo un titolo precedente. Per il
materiale pubblico conviene una formulazione sola e la più alta, ma non c'era
nulla da correggere.

### Un ritrovamento

`moduli/modulo-01-appendici-casi-clinici-e-protocolli.pdf` contiene **5 casi
clinici con protocolli a 12 settimane e 10 protocolli per patologie comuni**.
Sono i «protocolli riabilitativi standardizzati» che l'inventario del 01/02
dava per esistenti e che risultavano mancanti: il documento dice che
«diventano casi clinici d'esame». Non mancano più.

---

## Il terzo documento strategico

`strategici/blueprint-strategico.docx` — **«Mind Movement · Movimento Mondiale
— Blueprint Strategico Integrato: Libro × Movimento × Business»**, ~18.000
caratteri.

Non è il Blueprint formativo (quello dei 12 moduli): è un documento di
strategia d'impresa che mette il **libro al centro** come fulcro, e dichiara un
obiettivo a cinque anni di **500+ certificati in 20+ paesi**.

Porta quindi a **tre** i documenti di indirizzo, e con un'ambizione diversa
ciascuno:

| Documento | Orizzonte | Che cosa promette |
|---|---|---|
| Strategico 01/02 | 90 giorni | Prima edizione L1 venduta a 18-20 posti |
| Strategico 02/02 | 90 giorni | Primo cliente B2B chiuso |
| **Blueprint Strategico** | 5 anni | 500+ certificati in 20+ paesi |

I primi due sono piani esecutivi con deliverable settimanali; il terzo è una
visione. Non sono in conflitto — ma il terzo si realizza **solo** se i primi
due partono, e nessuno dei due è ancora partito: il deposito del marchio, che
il 01/02 marca come bloccante per tutto il resto, non risulta fatto.

---

## ✅ Il catalogo dei moduli — `riepilogo-moduli-e-struttura-libro.docx`

Non è il Documento operativo 03, ma è **l'inventario autorevole di ciò che è
stato prodotto**, con conteggi per modulo. Chiude la domanda «che cosa esiste».

**Numeri dichiarati:** 24 documenti · ~6.700 paragrafi · **44 esercizi con
analisi biomeccanica** · 10 profili allievo · 30+ schede operative · 10 tecniche
avanzate · 4 modelli di periodizzazione.

### Che cosa sono davvero i moduli 06-12

Il catalogo li nomina, e **non coincidono con i nomi del Blueprint**:

| # | Catalogo | Blueprint |
|---|---|---|
| 06 | Breathwork | Neuroscienza della Trasformazione |
| 07 | Mindfulness | Scienza del Respiro Avanzata |
| 08 | Qi Gong | Nutrizione Funzionale PNEI |
| 09 | Posturologia | Energia, Coscienza e Campo Quantistico |
| 10 | Assessment | Business & Leadership |
| 11 | Business | Somatic Intelligence |
| 12 | Etica | Practicum & Certificazione |

Due liste diverse per gli stessi sette numeri. Il catalogo è **posteriore** e
descrive i file realmente consegnati: prevale, ma va allineato il Blueprint.

### I 5 pilastri del metodo

Dal Modulo 05 secondo il catalogo: **Anatomy Trains + PNEI + Breathwork +
Mindfulness + RT**. È la definizione più compatta del metodo che esista
nell'archivio.

### Le linee fasciali: il conto definitivo

Il catalogo dice **7 linee** e le nomina: SBL, SFL, LL, SpL, AL, DFL, DBAL.
Questo chiude la questione dei conteggi discordanti (5 / 7 / 8): **sette**, e la
tabella riassuntiva dice «7 + Deep Front Line».
Resta da riconciliare con le **cinque catene** del Sistema Stellato nell'app,
che sono un modello diverso e non un conteggio diverso dello stesso modello.
