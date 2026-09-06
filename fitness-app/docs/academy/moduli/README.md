# I moduli, in originale

Questa cartella tiene i **file sorgente** dei moduli come li ha prodotti il
direttore tecnico. Non si riscrivono e non si "migliorano": si conservano.
Qualsiasi rielaborazione (dispense, materiali d'aula, item d'esame) vive
altrove e cita da qui.

| File | Che cos'è | Ampiezza |
|---|---|---|
| `modulo-01-anatomia-funzionale.docx` | **Modulo 1 — Anatomia Funzionale.** Otto catene miofasciali secondo Myers, con tabelle muscolo per muscolo (origine, inserzione, azione, innervazione, palpazione), patologie posturali e sedici protocolli Mind Movement | ~42.000 caratteri |
| `modulo-integrativo-qi-gong.docx` | **Qi Gong — modulo integrativo avanzato.** Sei parti, quindici capitoli: fondamenti, tecniche, Ba Duan Jin completo, pratiche avanzate, integrazione e percorso di certificazione | ~37.000 caratteri |
| `anatomy-trains-figure.jsx` | Componente interattivo con cinque linee miofasciali, percorso, relè, posizioni di allungamento e contrazione, e l'integrazione Mind Movement (sequenze e frequenze) | — |
| `guida-figure-anatomy-trains.md` | Piano di reperimento delle figure anatomiche per il modulo | — |

La Specifica clinica «Valutazione in due sessioni e Sistema Stellato» sta un
livello sopra, in `../valutazione-due-sessioni-e-sistema-stellato.pdf`.

## Tre cose da sistemare prima di erogare

Sono emerse leggendo i file, e sono annotate qui perché non si perdano.

1. **Due modelli di catene convivono.** Il Modulo 1 insegna le **otto** catene
   miofasciali di Myers; il Sistema Stellato — quello implementato in
   `src/data/stellatoProtocol.ts` e usato nell'app — ne usa **cinque** (I-E, A,
   F, C, E). Sono due modelli diversi, entrambi legittimi. Ma un corsista che
   studia otto catene e poi ne trova cinque nell'applicazione si ferma. Va
   deciso e dichiarato come si tengono insieme.

2. **Il nome sulla copertina.** Il Modulo 1 riporta «A cura di Francesco
   Filippi»; il Qi Gong «Francesco Busanca». Su un documento di certificazione
   l'autore va verificato.

3. **Le figure anatomiche.** La guida indica di salvare le figure dal sito
   BasicMedicalKey, che ospita immagini tratte dal libro di Thomas Myers.
   Riprodurle in dispense vendute o in un atlante è uso di materiale protetto:
   prima dell'erogazione serve una licenza, oppure illustrazioni proprie. Il
   modello concettuale di Myers si può insegnare e citare liberamente; le sue
   tavole no.

---

## Aggiornamento — rientrati altri contenuti

| File | Che cos'è |
|---|---|
| `mindmovement-rivoluzione.docx` | **RIVOLUZIONE** — il manifesto, il format, la filosofia, il percorso |
| `risveglio-i-il-corpo-che-parla.docx` | **RISVEGLIO I — Il corpo che parla.** Documento operativo completo di un evento con il Dott. Antonio Cannavacciuolo (nutrizionista PNEI), 19 aprile 2026. Nella roadmap del Documento strategico 01/02 questo formato è indicato come **modello per l'open day** che apre le vendite del Livello 1 |

Il modulo **Nutrizione Fasciale e PNEI**, che il Documento strategico 01/02
indica come **modello-tipo a 9 blocchi per tutti gli altri 21 moduli**, non è
ancora in questa cartella. È il file più utile da recuperare dopo l'elenco dei
titoli.

---

## Secondo rientro — contenuti clinici e materiali d'evento

| File | Che cos'è |
|---|---|
| `manuale-specialistico-scoliosi.docx` | **Manuale specialistico sul trattamento delle scoliosi.** Classificazione completa, assessment, protocolli correttivi integrati — Anatomy Trains, PNEI, posturologia, respiro. ~19.000 caratteri |
| `handout-talk-2-guerriero-consapevole.docx` | Handout della talk «Guerriero Consapevole» — Combat Nutrition & Performance |
| `risveglio-live-quaderno-partecipante.pdf` | Quaderno del partecipante di Risveglio Live, l'esperienza di 3 giorni |

Il manuale sulle scoliosi è **contenuto clinico** e va trattato con lo stesso
perimetro del resto del sistema: il metodo è screening e orientamento
educativo-motorio, non atto diagnostico né terapeutico. Prima di erogarlo o
venderlo va riletto con quel confine davanti, perché è il documento
dell'archivio che ci si avvicina di più.

---

## Terzo rientro — i manuali docente numerati

| File | Che cos'è | Ampiezza |
|---|---|---|
| `modulo-02-pnei-parte-b.docx` | **Modulo 02 — PNEI, parte B.** Dalla lezione 2.5: GH, IGF-1 e asse somatotropo | ~27.000 car |
| `modulo-03-mente-da-campione-parte-a.docx` | **Modulo 03 — Mente da Campione**, manuale docente. Psicologia dello sport applicata al coaching | ~26.000 car |
| `modulo-03-mente-da-campione-parte-b.docx` | **Modulo 03, parte B.** Dalla lezione 3.6: arousal, ansia e performance sotto pressione | ~16.000 car |
| `modulo-04-nlp-e-charisma-training.docx` | **Modulo 04 — NLP & Charisma Training**, completo. Comunicazione trasformativa per il coach | ~24.000 car |
| `protocollo-insufficienza-venosa.docx` | Programma di allenamento per insufficienza venosa, su carta intestata dell'associazione | — |

### Che cosa dice questo rientro sull'architettura

I moduli prodotti sono **numerati 01, 02, 03, 04** e i titoli corrispondono
esattamente ai primi quattro del **Blueprint** — Anatomia Funzionale, PNEI,
Psicologia dello Sport, NLP & Carisma — che il Blueprint stesso marca
«✅ Completato».

Non corrispondono invece a nessun codice della griglia a 5 aree del Documento
strategico 01/02 (A-xx … E-xx).

**Il contenuto reale è stato prodotto sull'impianto del Blueprint.** Questo non
decide da solo quale architettura tenere — il Blueprint è un piano di contenuti,
lo Strategico un impianto di certificazione — ma cambia il costo della scelta:
adottare lo Strategico significa **rimappare quattro manuali già scritti** sulle
cinque aree e sui tre livelli, non riscriverli.

### Sono manuali docente, non dispense

Le intestazioni dicono «MANUALE DOCENTE». Nello standard a 9 blocchi del
Documento strategico 01/02 il manuale docente è **una parte** del modulo: manca
ancora, per ciascuno, la mappa in SVG, la scheda di pratica guidata con dosaggi,
la tabella degli 8 errori tipici, i 2 casi e la scheda d'esame.

### Il protocollo per insufficienza venosa

È **contenuto clinico su carta intestata dell'associazione**, con nome e codice
fiscale. Vale lo stesso perimetro del manuale scoliosi: screening e orientamento
educativo-motorio, mai atto diagnostico o terapeutico. Un programma
d'allenamento per una condizione vascolare va concordato con il medico della
persona — e il documento dovrebbe dirlo per iscritto, in testa.

---

## Quarto rientro — allegati del Modulo 04 e guida assessment scoliosi

### Allegati del Modulo 04 (PNL & Carisma) — `modulo-04-allegati/`

| File | Che cos'è |
|---|---|
| `04-metafore-isomorfiche.docx` | Metafore isomorfiche · ~14.500 car |
| `05-protocollo-30-giorni.docx` | Protocollo 30 giorni · ~5.500 car |
| `06-schede-vak-calibrazione.docx` | Schede VAK e calibrazione · ~6.700 car |

La numerazione 04-05-06 è **interna al Modulo 04**, non della griglia dei
moduli. Sono i materiali operativi che nello standard a 9 blocchi
corrispondono alla *pratica guidata*: il Modulo 04 è quindi il più completo
dell'archivio.

### Guida assessment scoliosi — due versioni

| File | Differenza dichiarata in copertina | Ampiezza |
|---|---|---|
| `scoliosi-guida-assessment-v1-riferimenti-video.docx` | «riferimenti video professionali per ogni esercizio e test» | ~30.500 car |
| `scoliosi-guida-assessment-v2-query-youtube.docx` | «query di ricerca YouTube **verificate** per ogni esercizio e test» | ~20.700 car |

**Sono due documenti diversi, non due copie.** La v2 è più corta di un terzo e
sostituisce i riferimenti a video con query di ricerca. Nessuna delle due
contiene URL nel testo.

Il passaggio da «riferimenti video» a «query di ricerca verificate» è il
cambiamento tipico che si fa quando i riferimenti della prima versione non
reggono al controllo. **Prima di distribuire la v1 a un corsista pagante,
va verificato che i video citati esistano e dicano quello che il testo
sostiene** — altrimenti si distribuisce la v2 e si archivia la v1 come storia.

> Vale anche qui il perimetro del manuale scoliosi: assessment è screening e
> orientamento educativo-motorio, mai atto diagnostico.

---

## Quinto rientro — il libro, e due materiali d'evento

| File | Che cos'è |
|---|---|
| `../libro-mind-movement.pdf` | **Il libro.** «Mind Movement — Il Metodo che unisce Scienza, Corpo e Coscienza». 98 pagine, prima edizione 2026, © Francesco Busanca. Il Documento strategico 01/02 lo destina a **testo di riferimento del Livello 1** |
| `handout-talk-1-nutrizione-vibrazionale.docx` | Handout della talk 1 — Nutrizione Vibrazionale (la 2, Guerriero Consapevole, era già in archivio) |
| `il-rito-del-potere-script-audio.pdf` | «Il Rito del Potere» — script audio |

Con il libro sono **due** i sette asset mancanti che si chiudono (l'altro erano
i protocolli riabilitativi, dentro le appendici del Modulo 1).

---

## Sesto rientro — i moduli 06-12. Il Blueprint è completo.

| File | Copre | Ampiezza |
|---|---|---|
| `manuale-docente-parte-1-modulo-06.docx` | Modulo 06 — Neuroscienza della Trasformazione | ~43.800 car |
| `manuale-docente-parte-2-moduli-07-08.docx` | Moduli 07 (Scienza del Respiro Avanzata) e 08 | ~44.100 car |
| `manuale-docente-parte-3-moduli-09-12.docx` | Moduli 09, 10, 11, 12 | ~38.200 car |
| `academy-7-moduli-completi.docx` | **Raccolta unica dei moduli 06-12** | ~54.000 car |

### Il Blueprint non ha più moduli «da produrre»

Il Blueprint elencava 12 moduli: 5 completati e **7 marcati «🔥 Nuovo»**, cioè
da scrivere. Quei sette sono i moduli 06-12, e sono **tutti qui**.

| Blueprint | Stato reale |
|---|---|
| 01 Anatomia Funzionale | ✅ in archivio |
| 02 PNEI | ✅ in archivio (parte B; della parte A manca il file) |
| 03 Psicologia dello Sport | ✅ in archivio (A + B) |
| 04 NLP & Carisma | ✅ in archivio, **con 3 allegati di pratica** |
| 05 Metodologia Mind Movement | ✗ **unico modulo assente** |
| 06-12 | ✅ in archivio (tre parti + raccolta unica) |

**Undici moduli su dodici sono scritti.** Manca il 05 — Metodologia Mind
Movement — che, per posizione nel Blueprint, è il modulo che collega i
Fondamenti all'Integrazione: il cuore del metodo.

Nota su `academy-7-moduli-completi.docx`: contiene gli stessi moduli 06-12 delle
tre parti, in un file solo. Non è un doppione bit-a-bit — va deciso quale delle
due forme è quella buona prima di produrre le dispense, per non correggere due
volte lo stesso testo.

---

## Settimo rientro — l'edizione master del Modulo 1

| File | Che cos'è | Ampiezza |
|---|---|---|
| `modulo-01-approfondimenti.pdf` | **Modulo 1 — Edizione Master.** «Anatomia Fasciale Integrata & Anatomy Trains — approfondimenti scientifici avanzati» | 34 pagine · ~40.400 car |

Con questo il Modulo 1 esiste in **quattro forme**: il docx «Anatomia
Funzionale», la variante PDF «Anatomia Fasciale Integrata» (42 h, €350), le
appendici con casi clinici e protocolli, e ora l'edizione master di
approfondimenti. Vale l'avvertenza già scritta per i moduli 06-12: **prima di
produrre le dispense va deciso quale forma è quella buona**, altrimenti si
corregge quattro volte lo stesso contenuto.

---

## Ottavo rientro — Talks Master Manual e l'«enciclopedia»

| File | Che cos'è |
|---|---|
| `talks-master-manual.docx` | **Mind Movement Talks — Manuale completo.** Indice a volumi: mindset e filosofia, script parola-per-parola delle talk (60 minuti), psicologia del trasformatore, stati mentali del partecipante · ~9.200 car |
| `enciclopedia-parte-1-lower-body.pdf` | **Opera enciclopedica — Parte 1, anatomia lower body.** Vedi avvertenza qui sotto |

### ⚠ L'enciclopedia è un'intelaiatura, non un contenuto

Il file dichiara in copertina *«55 Muscoli · 250+ Pagine · 15 Sezioni per
Muscolo»*. Il PDF ha **8 pagine**, e la verifica dà questo:

- **55 voci su 55** riportano il segnaposto letterale `MUSCOLO n/55 - [NOME]`
- **nessun muscolo è nominato**
- ogni voce chiude con: *«[Contenuto integrale 4-5 pagine per muscolo presente
  versione stampata]»*

È quindi **l'indice dell'opera, con lo schema a 15 sezioni ripetuto 55 volte** —
uno scheletro utile, ma non l'opera. Se esiste davvero una versione stampata con
i contenuti, è quella che va recuperata e archiviata; se non esiste, il file
descrive un lavoro da fare, non un lavoro fatto.

Va detto perché fa differenza in due punti: nell'inventario degli asset (un
indice non è un contenuto) e in qualsiasi materiale di vendita che citasse
«250+ pagine di opera enciclopedica».

---

## Nono rientro — due sintesi del Modulo 1, e l'opera stampata

| File | Pagine | Contenuto reale |
|---|---|---|
| `modulo-01-anatomia-lower-body.pdf` | 14 | Trattazione condensata, **16 muscoli nominati**. Dichiara «35+ muscoli, 15 sezioni ciascuno» |
| `modulo-01-manuale-definitivo.pdf` | 12 | **23 muscoli nominati**. Dichiara «300+ pagine, 94 muscoli, 6 catene fasciali» |

Diversamente dall'`enciclopedia-parte-1-lower-body.pdf` — che è puro scheletro,
55 segnaposto `[NOME]` e nessun muscolo — **questi due hanno contenuto vero**,
ma condensato: sono sintesi, non l'opera che annunciano.

### C'è un'opera stampata, ed è quella che manca

Il manuale definitivo rimanda **quattro volte** a una «versione stampata» per il
contenuto integrale, e l'enciclopedia fa lo stesso per tutti e 55 i muscoli.

**Esiste dunque un'opera stampata di cui l'archivio ha solo gli indici e le
sintesi.** Se quel file digitale esiste, è l'asset singolo più grosso che manca
— più dei sette dell'inventario. Se esiste solo su carta, va scansionato prima
di qualsiasi altra cosa.

### Dati commerciali nuovi, e divergenti

Il manuale definitivo riporta: **€350 corso + €50 tesseramento = €400 primo
anno**, 3 weekend, 6 giorni, 42 ore, **«Certificazione Bronze»**.

«Bronze» è un nome di livello che non compare altrove: il Documento strategico
01/02 chiama il primo livello **Operatore Mind Movement** e lo prezza
**€890–1.200** per 60 ore. Sono due offerte diverse per lo stesso posto nella
scala — un'altra faccia della scelta d'architettura ancora aperta.

---

## Decimo rientro — arriva il modello-tipo, e ~300.000 caratteri

Cinque file, **tutti nuovi**, per circa 300.000 caratteri.

| File | Che cos'è | Ampiezza |
|---|---|---|
| `modulo-nutrizione-e-pnei-fascia.docx` | **Nutrizione e PNEI — come nutrire al meglio la fascia** | ~33.700 car |
| `modulo-biomeccanica-parte-1-fondamenti-esercizi-1-22.docx` | Biomeccanica degli esercizi in sala, parte 1: leve, vettori, profili di forza, curve di resistenza | ~62.800 car |
| `modulo-biomeccanica-parte-2-esercizi-23-44.docx` | Parte 2: schede esercizi 23-44 + appendice figure | ~45.500 car |
| `moduli-avanzati-di-specializzazione.docx` | Postura, pattern di movimento, myofascial release, neuro-somatic repatterning, breathwork dinamico | ~62.600 car |
| `manuale-definitivo-mma.docx` | Il manuale definitivo: tutte le specializzazioni in un volume | ~97.800 car |

### ✅ Il modello-tipo è arrivato

`modulo-nutrizione-e-pnei-fascia.docx` è **il modulo di Nutrizione Fasciale e
PNEI** che il Documento strategico 01/02 indica come **modello-tipo per gli
altri 21**. Era il numero 2 della lista dei mancanti, e il più importante dopo
l'Operativo 03.

La sua struttura reale è in **sei parti più i riferimenti**:

1. Fondamenti — la fascia come sistema PNEI
2. L'asse neuroendocrinoimmunitario della fascia
3. I pilastri nutrizionali per la fascia
4. Frontiere della ricerca
5. Il protocollo Mind Movement per la fascia
6. Tabelle riassuntive e protocolli pratici · Riferimenti scientifici

**Non coincide con i 9 blocchi** descritti nel Documento strategico 01/02 §4
(esito, mappa, fondamento teorico, fondamento metodologico, pratica guidata,
errori comuni, casi, verifica, bibliografia). Il documento diceva «ogni altro
modulo deve avere **esattamente questa struttura**» indicando questo come
modello: o i 9 blocchi sono una proposta successiva mai applicata, oppure il
modello-tipo va riformattato prima di essere usato come tale.

**È una decisione da prendere una volta sola**, perché vincola la produzione di
tutti gli altri moduli.

### Biomeccanica: 44 esercizi schedati

Le due parti coprono **44 esercizi** con leve, vettori, profili di forza e curve
di resistenza. È il contenuto che alimenta direttamente la libreria esercizi
dell'app, dove oggi 3 esercizi su 115 hanno il film e nessuno ha l'analisi
biomeccanica.

---

## Undicesimo rientro — programmazione, e le versioni doppie

Cinque file, tutti nuovi, ~196.000 caratteri.

| File | Che cos'è | Ampiezza |
|---|---|---|
| `modulo-programmazione-parte-1-fondamenti-profili-tecniche.docx` | **Programmazione delle schede.** Fondamenti, profili allievo, periodizzazione, tecniche avanzate | ~41.200 car |
| `modulo-programmazione-parte-2-template-tabelle-checklist.docx` | Template operativi: tabelle RPE/RIR/%1RM, mesociclo, schede pre-compilate per profilo, macrociclo 24 settimane, checklist del coach, **20 regole d'oro** | ~23.200 car |
| `modulo-pnl-carisma-versione-avanzata.docx` | PNL & Carisma, versione avanzata | ~68.500 car |
| `modulo-pnl-carisma-versione-base.docx` | PNL & Carisma, versione più breve | ~31.000 car |
| `modulo-mente-da-campione-versione-avanzata.docx` | Mente da Campione — la psicologia della performance d'élite | ~32.300 car |

### Il modulo che parla direttamente al software

La **Programmazione** è il modulo più vicino a ESSĒRE di tutto l'archivio: le
tabelle di conversione RPE / RIR / %1RM sono **le stesse grandezze** che il
motore usa in `src/domain/progressione.ts` — RIR calcolato come 10 − RPE,
massimale stimato con Epley, prossimità al cedimento come asse di progressione.

Vanno confrontate: se le tabelle del modulo e le formule del codice divergono,
un corsista vedrà due numeri diversi per la stessa cosa. **È una verifica da
fare, non un'ipotesi** — e finora nessuno l'ha fatta.

Le **20 regole d'oro della programmazione** e la **checklist operativa del
coach** sono inoltre materiale direttamente utilizzabile come blocco «errori
comuni» e «verifica» dello standard a 9 blocchi.

### Terzo caso di versioni multiple

PNL & Carisma esiste ora in **tre** forme: il manuale docente `modulo-04-…`, la
versione avanzata (68.500 car) e la versione base (31.000 car), più i tre
allegati di pratica. Mente da Campione in **tre**: parti A e B più questa
versione avanzata.

Vale quanto già annotato per il Modulo 1 (quattro forme) e per i moduli 06-12
(due forme): **prima delle dispense va deciso quale versione è quella buona.**
Il conto sale, e ogni versione in più moltiplica il lavoro di correzione.
