import type { DefaultExercise } from './defaultExercises';

// ============================================================
// CANONE ALLIEVO — le schede esercizio dettate da Francesco
// ------------------------------------------------------------
// Ogni esercizio entra in libreria GIÀ COMPLETO: descrizione del
// metodo + filmato. Quando il coach lo chiama dalla libreria, la
// scheda dell'allievo è già sistemata.
//
// REGOLA: il testo qui sotto è quello di docs/schede-esercizi.md,
// parola per parola. Non si riscrive il metodo, non si cambiano
// angoli, lock di forma o i termini scelti da Francesco. Un test
// (src/data/__tests__/canonExercises.test.ts) confronta questi
// testi con il file canone e fallisce al primo ritocco.
//
// Serie, ripetizioni e recupero sono solo i valori di partenza
// della libreria: il coach li imposta per l'allievo. Il METODO,
// quello, è intoccabile.
// ============================================================

/** Base pubblica dei filmati: stessa origine dell'app. */
const FILM = 'https://essere-3fe6f.web.app/video';

const AFFONDO_BULGARO = [
  'Gli affondi fanno parte di una classe di esercizi tra i più efficaci per lo sviluppo della zona gluteo-femorale. Questa versione è caratterizzata da un rialzo dietro (panca o step, uno o due, in base al livello).',
  'Dietro non si appoggia il dorso del piede, ma la pianta, in particolare i metatarsi: lì ci sono i meccanocettori che segnalano al sistema nervoso centrale che c’è un appoggio, qualcosa da spingere in diagonale. Così si reclutano le fibre che ci interessano.',
  'Ginocchio davanti non troppo avanti, altrimenti si recluta troppo il quadricipite. Anca flessa: se non fletti l’anca non preallunghi gluteo e femorali. Non flettere la schiena.',
  'Questa è la forma generale. Poi, in base al livello, si complica.',
].join('\n\n');

const PANCA_INCLINATA = [
  'Ci si siede con i manubri appoggiati sulle ginocchia, tenuti in mano, così da sentirli. Con un piccolo slancio si portano le ginocchia su e ci si trova con le braccia pressappoco perpendicolari al piano, schiena sulla panca inclinata.',
  'Non inarcare eccessivamente la schiena: un’estensione del tratto lombare e di quello toracico, per una linea di forza a vantaggio del fascio clavicolare del gran pettorale.',
  'Non elevare le scapole: addurle, per favorire l’abduzione degli omeri.',
  'Tutti i movimenti sono angolari. Si parte con i manubri sopra le ginocchia, slancio, braccia perpendicolari, gomiti leggermente piegati. Nella fase di ritorno le scapole si abducono ma non si staccano dalla panca; i manubri si distendono, non del tutto, sempre su una traiettoria angolare.',
  'In discesa il gomito deve trovarsi ad almeno 30–40° sotto il livello della spalla, altrimenti conflitto acromion-claveare o fastidio all’articolazione della spalla.',
  'Durante tutto il movimento gli avambracci restano perpendicolari al piano, quindi alla resistenza. Non estremizzare la fase eccentrica. La concentrica è un ritorno angolare alle braccia di partenza.',
  'Per posare i manubri senza farsi male: si sollevano le ginocchia, si appoggiano i manubri sulle ginocchia, poi a terra.',
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
];
