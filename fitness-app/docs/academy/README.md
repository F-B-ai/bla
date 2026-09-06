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

2. **L'autore sulla copertina.** Il Modulo 1 riporta «A cura di Francesco
   Filippi»; gli altri documenti riportano Francesco Busanca. Su un documento di
   certificazione l'autore va verificato.

3. **Le figure anatomiche.** La guida indica di salvare le tavole da
   BasicMedicalKey, che ospita immagini tratte dal libro di Thomas Myers.
   Riprodurle in dispense vendute o in un atlante è uso di materiale protetto:
   serve una licenza, oppure illustrazioni proprie. Il modello concettuale di
   Myers si insegna e si cita liberamente; le sue tavole no.

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
| Firma | Francesco **Cacace** | Francesco **Busanca** |

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

### Le firme

Gli stessi contenuti risultano firmati **Busanca**, **Filippi** e **Cacace** —
con credenziali identiche (ingegnere biomedico, campione europeo natural
bodybuilding). Su documenti di certificazione l'autore va uniformato prima di
qualsiasi erogazione o deposito di marchio.

### Un ritrovamento

`moduli/modulo-01-appendici-casi-clinici-e-protocolli.pdf` contiene **5 casi
clinici con protocolli a 12 settimane e 10 protocolli per patologie comuni**.
Sono i «protocolli riabilitativi standardizzati» che l'inventario del 01/02
dava per esistenti e che risultavano mancanti: il documento dice che
«diventano casi clinici d'esame». Non mancano più.
