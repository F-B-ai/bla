import type { DefaultExercise } from './defaultExercises';

// ============================================================
// CANONE ALLIEVO — le schede esercizio dettate da Francesco
// ------------------------------------------------------------
// Ogni esercizio entra in libreria GIÀ COMPLETO: descrizione del
// metodo + filmato. Quando il coach lo chiama dalla libreria, la
// scheda dell'allievo è già sistemata.
//
// REGOLA: i testi qui sotto sono quelli di docs/schede-esercizi.md,
// parola per parola — interruzioni di riga comprese. Non si riscrive
// il metodo, non si cambiano angoli, lock di forma o i termini
// scelti da Francesco. Un test (src/data/__tests__/canonExercises.test.ts)
// confronta questi testi con il file canone e fallisce al primo ritocco.
//
// Serie, ripetizioni e recupero sono solo i valori di partenza
// della libreria: il coach li imposta per l'allievo. Il METODO,
// quello, è intoccabile.
// ============================================================

/** Base pubblica dei filmati: stessa origine dell'app. */
const FILM = 'https://essere-3fe6f.web.app/video';

const AFFONDO_BULGARO = [
  "Gli affondi fanno parte di una classe di esercizi tra i più efficaci per lo sviluppo della zona gluteo-femorale. Questa versione è caratterizzata da un rialzo dietro (panca o step, uno o due, in base al livello).",
  "Dietro non si appoggia il dorso del piede, ma la pianta, in particolare i metatarsi: lì ci sono i meccanocettori che segnalano al sistema nervoso centrale che c’è un appoggio, qualcosa da spingere in diagonale. Così si reclutano le fibre che ci interessano.",
  "Ginocchio davanti non troppo avanti, altrimenti si recluta troppo il quadricipite. Anca flessa: se non fletti l’anca non preallunghi gluteo e femorali. Non flettere la schiena.",
  "Questa è la forma generale. Poi, in base al livello, si complica.",
].join('\n\n');

const PANCA_INCLINATA = [
  "Ci si siede con i manubri appoggiati sulle ginocchia, tenuti in mano, così da sentirli. Con un piccolo slancio si portano le ginocchia su e ci si trova con le braccia pressappoco perpendicolari al piano, schiena sulla panca inclinata.",
  "Non inarcare eccessivamente la schiena: un’estensione del tratto lombare e di quello toracico, per una linea di forza a vantaggio del fascio clavicolare del gran pettorale.",
  "Non elevare le scapole: addurle, per favorire l’abduzione degli omeri.",
  "Tutti i movimenti sono angolari. Si parte con i manubri sopra le ginocchia, slancio, braccia perpendicolari, gomiti leggermente piegati. Nella fase di ritorno le scapole si abducono ma non si staccano dalla panca; i manubri si distendono, non del tutto, sempre su una traiettoria angolare.",
  "In discesa il gomito deve trovarsi ad almeno 30–40° sotto il livello della spalla, altrimenti conflitto acromion-claveare o fastidio all’articolazione della spalla.",
  "Durante tutto il movimento gli avambracci restano perpendicolari al piano, quindi alla resistenza. Non estremizzare la fase eccentrica. La concentrica è un ritorno angolare alle braccia di partenza.",
  "Per posare i manubri senza farsi male: si sollevano le ginocchia, si appoggiano i manubri sulle ginocchia, poi a terra.",
].join('\n\n');

const LAT_MACHINE_PRONA = [
  "Posizionamento. Le tuberosità ischiatiche sulla superficie della panca, basta toccarsi sotto i glutei per sentirle.",
  "In tal modo partiremo con un bacino in neutro. I piedi vengono appoggiati avanti, circa 90° tra coscia e gamba, gambe aperte a circa 30° rispetto all’asse del corpo.\nArticolazioni centralizzate: teste femorali nell’acetabolo.",
  "Le cosce non vanno sotto i rulli. I rulli servono ai bodybuilder esperti che sollevano carichi immensi, per rimanere inchiodati sulla sede: altrimenti verrebbero sollevati. Sotto i rulli le cosce tendono a contrarsi e non favoriscono il giusto stimolo ai muscoli target.",
  "Impugnatura prona, braccia a 30° (90° fra testa e braccio, la metà è 45°, un po’ meno), vicino alle curve della sbarra.",
  "Avvio. Corpo perpendicolare, scapole elevate. Il primo movimento non è la trazione ma la depressione delle scapole, infilandole nella loro «loggia».",
  "A questo punto inizia la trazione: immagina di avere due fili sotto i gomiti che li tirano verso le creste iliache.",
  "Adesione geometrica al tronco, non completa: stop quando il gomito guarda il pavimento. Gomito a 30° seguendo l’angolo della scapola, non sulla linea toracica.\nBusto indietro di circa 15°, altrimenti la sbarra va in testa ed in tal modo stimoliamo le fibre pennate, le più forti del gran dorsale, oltre al grande rotondo e parzialmente in centro schiena in corrispondenza della cintura toraco-lombare.",
  "Niente ROM concentrico completo, il gran dorsale cifotizza.",
  "Fondamentale: scapole prima della trazione, pena possibile infortunio nel tempo sul cingolo omero-scapolare e muscoli target che non saranno reclutati in modo adeguato.",
].join('\n\n');

/** Lo schema della panca inclinata è lo stesso a 15°, 30° e 45°. */
const inclinata = (gradi: 15 | 30 | 45): DefaultExercise => ({
  name: `Distensioni su panca inclinata ${gradi}°`,
  description: PANCA_INCLINATA,
  sets: 3,
  reps: '10-12',
  restSeconds: 90,
  category: 'forza',
  notes: gradi === 30
    ? 'Gomito almeno 30–40° sotto il livello della spalla. Scapole addotte, mai elevate.'
    : 'Stesso schema dei 30°: cambia solo l\'inclinazione della panca. '
      + 'Il filmato è girato a 30°. Gomito almeno 30–40° sotto il livello della spalla.',
  gender: 'unisex',
  videoUrl: `${FILM}/panca-inclinata-30.mp4`,
  videoLabel: 'Film donna',
  videoUrlAlt: `${FILM}/panca-inclinata-30-uomo.mp4`,
  videoAltLabel: 'Film uomo',
});

export const canonExercises: DefaultExercise[] = [
  {
    name: 'Affondo bulgaro',
    description: AFFONDO_BULGARO,
    sets: 3,
    reps: '10-12 per gamba',
    restSeconds: 90,
    category: 'forza',
    notes: 'Dietro appoggiano i metatarsi, non il dorso del piede. Anca flessa: senza flessione non preallunghi gluteo e femorali.',
    gender: 'unisex',
    videoUrl: `${FILM}/affondo-bulgaro-40.mp4`,
    videoLabel: 'Film donna',
  },
  inclinata(15),
  inclinata(30),
  inclinata(45),
  {
    name: 'Lat machine impugnatura prona',
    description: LAT_MACHINE_PRONA,
    sets: 3,
    reps: '10-12',
    restSeconds: 90,
    category: 'forza',
    notes: 'Prima si deprimono le scapole, poi si tira: invertire l\'ordine espone il cingolo omero-scapolare. '
      + 'Cosce libere, MAI sotto i rulli. Niente ROM concentrico completo: il gran dorsale cifotizza.',
    gender: 'unisex',
    // Film donna: cosce libere, rulli NON usati — come nel testo.
    videoUrl: `${FILM}/lat-machine-prona.mp4`,
    videoLabel: 'Film donna',
    videoUrlAlt: `${FILM}/lat-machine-prona-uomo.mp4`,
    videoAltLabel: 'Film uomo',
  },
];
