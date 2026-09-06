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
