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
