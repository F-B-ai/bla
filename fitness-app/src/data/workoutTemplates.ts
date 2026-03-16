import { Exercise, ExerciseCategory } from '../types';

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female';
  category: string;
  weeklySchedule: {
    dayOfWeek: number;
    dayName: string;
    exercises: Omit<Exercise, 'id'>[];
    notes: string;
  }[];
}

const ex = (
  name: string,
  sets: number,
  reps: string,
  rest: number,
  category: ExerciseCategory,
  description = '',
  notes = ''
): Omit<Exercise, 'id'> => ({
  name,
  sets,
  reps,
  restSeconds: rest,
  category,
  description,
  notes,
});

// ============================================================
// TEMPLATE UOMO (10)
// ============================================================

export const maleTemplates: WorkoutTemplate[] = [
  // 1. IPERTROFIA CLASSICA - PUSH/PULL/LEGS
  {
    id: 'male-ipertrofia-ppl',
    name: 'Ipertrofia - Push/Pull/Legs',
    description: 'Programma classico per massa muscolare con split Push/Pull/Legs. 6 giorni a settimana.',
    gender: 'male',
    category: 'Ipertrofia',
    weeklySchedule: [
      {
        dayOfWeek: 0, dayName: 'Lunedì - Push',
        notes: 'Focus petto, spalle, tricipiti',
        exercises: [
          ex('Panca piana con bilanciere', 4, '8-10', 120, 'forza', 'Presa leggermente più larga delle spalle'),
          ex('Panca inclinata con manubri', 4, '10-12', 90, 'forza', 'Inclinazione 30-45 gradi'),
          ex('Croci ai cavi', 3, '12-15', 60, 'forza', 'Mantenere leggera flessione dei gomiti'),
          ex('Military press con bilanciere', 4, '8-10', 120, 'forza', 'In piedi o seduto'),
          ex('Alzate laterali', 4, '12-15', 60, 'forza', 'Controllare la fase eccentrica'),
          ex('Pushdown al cavo', 3, '12-15', 60, 'forza', 'Gomiti fissi ai fianchi'),
          ex('French press con manubrio', 3, '10-12', 60, 'forza'),
        ],
      },
      {
        dayOfWeek: 1, dayName: 'Martedì - Pull',
        notes: 'Focus schiena, bicipiti, trapezio',
        exercises: [
          ex('Trazioni alla sbarra', 4, '6-10', 120, 'forza', 'Presa prona, larghezza spalle'),
          ex('Rematore con bilanciere', 4, '8-10', 90, 'forza', 'Busto a 45 gradi'),
          ex('Lat machine presa stretta', 3, '10-12', 90, 'forza'),
          ex('Pulley basso', 3, '10-12', 90, 'forza', 'Tirare verso l\'ombelico'),
          ex('Face pull al cavo', 3, '15-20', 60, 'forza', 'Fondamentale per la salute delle spalle'),
          ex('Curl con bilanciere', 3, '10-12', 60, 'forza'),
          ex('Curl a martello', 3, '10-12', 60, 'forza'),
        ],
      },
      {
        dayOfWeek: 2, dayName: 'Mercoledì - Legs',
        notes: 'Focus quadricipiti, femorali, glutei, polpacci',
        exercises: [
          ex('Squat con bilanciere', 4, '6-8', 180, 'forza', 'Profondità almeno parallelo'),
          ex('Pressa a 45°', 4, '10-12', 120, 'forza'),
          ex('Affondi con manubri', 3, '10/gamba', 90, 'forza', 'Passo lungo per glutei'),
          ex('Leg curl sdraiato', 4, '10-12', 90, 'forza'),
          ex('Stacco rumeno', 3, '10-12', 90, 'forza', 'Focus sui femorali'),
          ex('Calf raises in piedi', 4, '15-20', 60, 'forza'),
          ex('Crunch al cavo', 3, '15-20', 60, 'funzionale'),
        ],
      },
      {
        dayOfWeek: 3, dayName: 'Giovedì - Push',
        notes: 'Variante Push con focus su spalle',
        exercises: [
          ex('Panca piana con manubri', 4, '10-12', 90, 'forza'),
          ex('Dips alle parallele', 3, '8-12', 90, 'forza', 'Inclinazione avanti per petto'),
          ex('Arnold press', 4, '10-12', 90, 'forza'),
          ex('Alzate laterali al cavo', 4, '12-15', 60, 'forza'),
          ex('Alzate posteriori', 3, '15-20', 60, 'forza'),
          ex('Skull crusher', 3, '10-12', 60, 'forza'),
          ex('Kickback con manubrio', 3, '12-15', 60, 'forza'),
        ],
      },
      {
        dayOfWeek: 4, dayName: 'Venerdì - Pull',
        notes: 'Variante Pull con focus volume',
        exercises: [
          ex('Stacco da terra', 4, '5-6', 180, 'forza', 'Mantenere la schiena neutra'),
          ex('Rematore con manubrio', 4, '10-12', 90, 'forza'),
          ex('Pullover al cavo', 3, '12-15', 60, 'forza'),
          ex('Scrollate con manubri', 3, '12-15', 60, 'forza'),
          ex('Face pull', 3, '15-20', 60, 'forza'),
          ex('Curl concentrato', 3, '10-12', 60, 'forza'),
          ex('Curl al cavo', 3, '12-15', 60, 'forza'),
        ],
      },
      {
        dayOfWeek: 5, dayName: 'Sabato - Legs',
        notes: 'Variante Legs con focus femorali/glutei',
        exercises: [
          ex('Stacco rumeno con bilanciere', 4, '8-10', 120, 'forza'),
          ex('Squat bulgaro', 3, '10/gamba', 90, 'forza'),
          ex('Leg press piedi alti', 4, '12-15', 90, 'forza'),
          ex('Leg extension', 3, '12-15', 60, 'forza'),
          ex('Leg curl seduto', 3, '12-15', 60, 'forza'),
          ex('Hip thrust', 4, '10-12', 90, 'forza'),
          ex('Calf raises seduto', 4, '15-20', 60, 'forza'),
        ],
      },
    ],
  },

  // 2. FORZA - 5x5
  {
    id: 'male-forza-5x5',
    name: 'Forza - Programma 5x5',
    description: 'Programma base per lo sviluppo della forza massimale sui fondamentali. 3 giorni a settimana.',
    gender: 'male',
    category: 'Forza',
    weeklySchedule: [
      {
        dayOfWeek: 0, dayName: 'Lunedì - Workout A',
        notes: 'Squat, Panca, Rematore',
        exercises: [
          ex('Squat con bilanciere', 5, '5', 180, 'forza', 'Aumentare 2.5kg ogni sessione'),
          ex('Panca piana con bilanciere', 5, '5', 180, 'forza', 'Aumentare 2.5kg ogni sessione'),
          ex('Rematore con bilanciere', 5, '5', 180, 'forza', 'Aumentare 2.5kg ogni sessione'),
          ex('Plank', 3, '60s', 60, 'funzionale'),
        ],
      },
      {
        dayOfWeek: 2, dayName: 'Mercoledì - Workout B',
        notes: 'Squat, Military, Stacco',
        exercises: [
          ex('Squat con bilanciere', 5, '5', 180, 'forza'),
          ex('Military press', 5, '5', 180, 'forza', 'Aumentare 1.25kg ogni sessione'),
          ex('Stacco da terra', 1, '5', 300, 'forza', 'Aumentare 5kg ogni sessione'),
          ex('Trazioni alla sbarra', 3, 'max', 120, 'forza'),
        ],
      },
      {
        dayOfWeek: 4, dayName: 'Venerdì - Workout A',
        notes: 'Squat, Panca, Rematore',
        exercises: [
          ex('Squat con bilanciere', 5, '5', 180, 'forza'),
          ex('Panca piana con bilanciere', 5, '5', 180, 'forza'),
          ex('Rematore con bilanciere', 5, '5', 180, 'forza'),
          ex('Crunch inverso', 3, '15', 60, 'funzionale'),
        ],
      },
    ],
  },

  // 3. DIMAGRIMENTO UOMO
  {
    id: 'male-dimagrimento',
    name: 'Dimagrimento - Circuit Training',
    description: 'Allenamento a circuito per massimizzare il consumo calorico. 4 giorni a settimana.',
    gender: 'male',
    category: 'Dimagrimento',
    weeklySchedule: [
      {
        dayOfWeek: 0, dayName: 'Lunedì - Upper Body Circuit',
        notes: '3-4 giri del circuito, 2 min recupero tra i giri',
        exercises: [
          ex('Push-up', 3, '15-20', 30, 'funzionale'),
          ex('Rematore con manubri', 3, '12', 30, 'forza'),
          ex('Military press manubri', 3, '12', 30, 'forza'),
          ex('Curl con manubri', 3, '12', 30, 'forza'),
          ex('Dips su panca', 3, '15', 30, 'funzionale'),
          ex('Plank', 3, '45s', 30, 'funzionale'),
          ex('Jumping jack', 3, '30s', 30, 'cardio'),
        ],
      },
      {
        dayOfWeek: 1, dayName: 'Martedì - HIIT Cardio',
        notes: '20 secondi lavoro / 10 secondi pausa x 8 round per esercizio',
        exercises: [
          ex('Burpees', 4, '20s', 10, 'cardio', 'Tabata: 20s on / 10s off'),
          ex('Mountain climber', 4, '20s', 10, 'cardio'),
          ex('Squat jump', 4, '20s', 10, 'cardio'),
          ex('High knees', 4, '20s', 10, 'cardio'),
          ex('Plank con tocco spalla', 4, '20s', 10, 'funzionale'),
          ex('Corsa sul posto', 3, '60s', 30, 'cardio', 'Cooldown'),
        ],
      },
      {
        dayOfWeek: 3, dayName: 'Giovedì - Lower Body Circuit',
        notes: '3-4 giri del circuito',
        exercises: [
          ex('Squat con manubri', 3, '15', 30, 'forza'),
          ex('Affondi alternati', 3, '12/gamba', 30, 'forza'),
          ex('Stacco rumeno manubri', 3, '12', 30, 'forza'),
          ex('Step-up su panca', 3, '10/gamba', 30, 'funzionale'),
          ex('Wall sit', 3, '30s', 30, 'funzionale'),
          ex('Calf raises', 3, '20', 30, 'forza'),
          ex('Bicycle crunch', 3, '20', 30, 'funzionale'),
        ],
      },
      {
        dayOfWeek: 5, dayName: 'Sabato - Full Body HIIT',
        notes: 'Circuito completo, minimo riposo',
        exercises: [
          ex('Thruster con manubri', 4, '12', 30, 'funzionale'),
          ex('Rematore con manubrio', 4, '10/braccio', 30, 'forza'),
          ex('Box jump', 4, '10', 30, 'cardio'),
          ex('Push-up con rotazione', 4, '10', 30, 'funzionale'),
          ex('Kettlebell swing', 4, '15', 30, 'funzionale'),
          ex('Sprint sul posto', 4, '30s', 30, 'cardio'),
        ],
      },
    ],
  },

  // 4. UPPER/LOWER SPLIT
  {
    id: 'male-upper-lower',
    name: 'Upper/Lower Split - Volume',
    description: 'Split alto/basso corpo per ipertrofia bilanciata. 4 giorni a settimana.',
    gender: 'male',
    category: 'Ipertrofia',
    weeklySchedule: [
      {
        dayOfWeek: 0, dayName: 'Lunedì - Upper A (Forza)',
        notes: 'Focus carichi pesanti',
        exercises: [
          ex('Panca piana bilanciere', 4, '5-6', 180, 'forza'),
          ex('Rematore con bilanciere', 4, '5-6', 180, 'forza'),
          ex('Military press', 3, '6-8', 120, 'forza'),
          ex('Trazioni zavorrate', 3, '6-8', 120, 'forza'),
          ex('Curl con bilanciere', 2, '8-10', 60, 'forza'),
          ex('Pushdown al cavo', 2, '8-10', 60, 'forza'),
        ],
      },
      {
        dayOfWeek: 1, dayName: 'Martedì - Lower A (Forza)',
        notes: 'Focus carichi pesanti gambe',
        exercises: [
          ex('Squat con bilanciere', 4, '5-6', 180, 'forza'),
          ex('Stacco rumeno', 3, '6-8', 120, 'forza'),
          ex('Pressa', 3, '8-10', 120, 'forza'),
          ex('Leg curl', 3, '8-10', 90, 'forza'),
          ex('Calf raises', 4, '10-12', 60, 'forza'),
          ex('Ab wheel rollout', 3, '10-12', 60, 'funzionale'),
        ],
      },
      {
        dayOfWeek: 3, dayName: 'Giovedì - Upper B (Volume)',
        notes: 'Focus volume e pompaggio',
        exercises: [
          ex('Panca inclinata manubri', 4, '10-12', 90, 'forza'),
          ex('Lat machine', 4, '10-12', 90, 'forza'),
          ex('Alzate laterali', 4, '15-20', 60, 'forza'),
          ex('Pulley basso', 3, '12-15', 60, 'forza'),
          ex('Croci ai cavi', 3, '12-15', 60, 'forza'),
          ex('Curl a martello', 3, '12-15', 60, 'forza'),
          ex('French press', 3, '12-15', 60, 'forza'),
        ],
      },
      {
        dayOfWeek: 4, dayName: 'Venerdì - Lower B (Volume)',
        notes: 'Focus volume gambe',
        exercises: [
          ex('Squat bulgaro', 3, '10/gamba', 90, 'forza'),
          ex('Hip thrust', 4, '10-12', 90, 'forza'),
          ex('Leg extension', 3, '12-15', 60, 'forza'),
          ex('Leg curl seduto', 3, '12-15', 60, 'forza'),
          ex('Goblet squat', 3, '15', 60, 'forza'),
          ex('Calf raises seduto', 4, '15-20', 60, 'forza'),
        ],
      },
    ],
  },

  // 5. FUNZIONALE / CROSSFIT STYLE
  {
    id: 'male-funzionale',
    name: 'Funzionale - CrossFit Style',
    description: 'Allenamento funzionale ad alta intensità. 5 giorni a settimana.',
    gender: 'male',
    category: 'Funzionale',
    weeklySchedule: [
      {
        dayOfWeek: 0, dayName: 'Lunedì - Strength + WOD',
        notes: 'Forza + metcon',
        exercises: [
          ex('Clean & Jerk', 5, '3', 120, 'funzionale', 'Lavorare sulla tecnica'),
          ex('Front squat', 4, '5', 120, 'forza'),
          ex('WOD: 21-15-9 Thruster + Pull-up', 1, 'a tempo', 0, 'funzionale', 'For time'),
          ex('Plank laterale', 3, '30s/lato', 30, 'funzionale'),
        ],
      },
      {
        dayOfWeek: 1, dayName: 'Martedì - Gymnastics + Cardio',
        notes: 'Skill + endurance',
        exercises: [
          ex('Handstand hold al muro', 5, '30s', 60, 'funzionale'),
          ex('Muscle-up progression', 5, '3-5', 90, 'funzionale'),
          ex('AMRAP 15min: 5 Pull-up, 10 Push-up, 15 Squat', 1, 'AMRAP', 0, 'cardio'),
          ex('Double under', 3, '50', 60, 'cardio'),
        ],
      },
      {
        dayOfWeek: 2, dayName: 'Mercoledì - Olympic Lifting',
        notes: 'Focus sollevamento olimpico',
        exercises: [
          ex('Snatch', 5, '2', 120, 'funzionale'),
          ex('Overhead squat', 4, '5', 120, 'funzionale'),
          ex('Stacco da terra', 5, '3', 180, 'forza'),
          ex('GHD sit-up', 3, '15', 60, 'funzionale'),
        ],
      },
      {
        dayOfWeek: 3, dayName: 'Giovedì - Endurance WOD',
        notes: 'Lunga durata',
        exercises: [
          ex('Rowing 1000m', 3, '1', 120, 'cardio'),
          ex('Wall ball', 5, '15', 60, 'funzionale'),
          ex('Box jump', 4, '12', 60, 'cardio'),
          ex('Farmer carry', 4, '40m', 90, 'funzionale'),
          ex('Burpee over bar', 3, '12', 60, 'cardio'),
        ],
      },
      {
        dayOfWeek: 4, dayName: 'Venerdì - Hero WOD',
        notes: 'Workout intenso',
        exercises: [
          ex('Run 400m', 5, '1', 0, 'cardio'),
          ex('Kettlebell swing', 5, '15', 0, 'funzionale'),
          ex('Pull-up', 5, '10', 0, 'funzionale'),
          ex('Push-up', 5, '15', 0, 'funzionale'),
          ex('Squat jump', 5, '20', 60, 'cardio'),
        ],
      },
    ],
  },

  // 6. POSTURALE UOMO
  {
    id: 'male-posturale',
    name: 'Posturale e Correttivo',
    description: 'Programma per migliorare la postura e prevenire dolori. 3 giorni a settimana.',
    gender: 'male',
    category: 'Posturale',
    weeklySchedule: [
      {
        dayOfWeek: 0, dayName: 'Lunedì - Mobilità e Core',
        notes: 'Lavoro di mobilità e stabilizzazione',
        exercises: [
          ex('Cat-cow stretch', 3, '10', 30, 'mobilita', 'Lento e controllato'),
          ex('Bird-dog', 3, '10/lato', 30, 'posturale'),
          ex('Dead bug', 3, '10/lato', 30, 'posturale', 'Mantenere la zona lombare a terra'),
          ex('Plank frontale', 3, '30-45s', 45, 'funzionale'),
          ex('Shoulder dislocate con elastico', 3, '15', 30, 'mobilita'),
          ex('Wall angel', 3, '12', 30, 'posturale', 'Schiena e braccia contro il muro'),
          ex('Hip flexor stretch', 3, '30s/lato', 30, 'stretching'),
        ],
      },
      {
        dayOfWeek: 2, dayName: 'Mercoledì - Rinforzo Posteriore',
        notes: 'Focus catena posteriore',
        exercises: [
          ex('Face pull con elastico', 3, '15', 45, 'posturale'),
          ex('Band pull-apart', 3, '15', 30, 'posturale'),
          ex('Ponte glutei', 3, '15', 45, 'posturale'),
          ex('Superman hold', 3, '10', 45, 'posturale'),
          ex('Rematore con elastico', 3, '12', 45, 'posturale'),
          ex('Plank laterale', 3, '20s/lato', 30, 'funzionale'),
          ex('Stretching piriforme', 3, '30s/lato', 30, 'stretching'),
        ],
      },
      {
        dayOfWeek: 4, dayName: 'Venerdì - Stretching e Rilascio',
        notes: 'Focus flessibilità e rilascio miofasciale',
        exercises: [
          ex('Foam rolling schiena', 1, '3min', 0, 'mobilita'),
          ex('Foam rolling quadricipiti', 1, '2min/lato', 0, 'mobilita'),
          ex('Stretching pettorali al muro', 3, '30s/lato', 30, 'stretching'),
          ex('Stretching dorsale', 3, '30s', 30, 'stretching'),
          ex('Pigeon stretch', 3, '30s/lato', 30, 'stretching'),
          ex('Stretching hamstring', 3, '30s/gamba', 30, 'stretching'),
          ex('Child pose', 3, '30s', 30, 'stretching'),
        ],
      },
    ],
  },

  // 7. BODYWEIGHT / CALISTHENICS
  {
    id: 'male-calisthenics',
    name: 'Calisthenics - Corpo Libero',
    description: 'Programma a corpo libero progressivo. 4 giorni a settimana.',
    gender: 'male',
    category: 'Calisthenics',
    weeklySchedule: [
      {
        dayOfWeek: 0, dayName: 'Lunedì - Push',
        notes: 'Spinta orizzontale e verticale',
        exercises: [
          ex('Push-up diamante', 4, '8-12', 90, 'funzionale'),
          ex('Pike push-up', 4, '8-10', 90, 'funzionale', 'Progressione verso HSPU'),
          ex('Dips alle parallele', 4, '8-12', 90, 'funzionale'),
          ex('Pseudo planche push-up', 3, '6-8', 90, 'funzionale'),
          ex('L-sit hold', 3, '15-20s', 60, 'funzionale'),
        ],
      },
      {
        dayOfWeek: 1, dayName: 'Martedì - Pull',
        notes: 'Trazioni e tirate',
        exercises: [
          ex('Trazioni presa prona', 4, '6-10', 120, 'funzionale'),
          ex('Trazioni presa supina', 4, '6-10', 120, 'funzionale'),
          ex('Australian rows', 4, '10-15', 60, 'funzionale'),
          ex('Skin the cat', 3, '5', 90, 'funzionale'),
          ex('Hanging leg raise', 3, '10-12', 60, 'funzionale'),
        ],
      },
      {
        dayOfWeek: 3, dayName: 'Giovedì - Legs',
        notes: 'Gambe a corpo libero',
        exercises: [
          ex('Pistol squat (assistito)', 4, '5/gamba', 90, 'funzionale'),
          ex('Squat bulgaro', 3, '10/gamba', 60, 'funzionale'),
          ex('Nordic curl (eccentrico)', 4, '5', 120, 'funzionale'),
          ex('Jump squat', 3, '12', 60, 'cardio'),
          ex('Calf raises monopodalico', 3, '15/gamba', 60, 'funzionale'),
          ex('Ponte glutei monopodalico', 3, '12/gamba', 60, 'funzionale'),
        ],
      },
      {
        dayOfWeek: 5, dayName: 'Sabato - Skill + Core',
        notes: 'Lavoro skills e addominali',
        exercises: [
          ex('Handstand practice', 5, '30s', 60, 'funzionale'),
          ex('Muscle-up progression', 5, '3', 120, 'funzionale'),
          ex('Front lever progression', 4, '10s', 90, 'funzionale'),
          ex('Dragon flag', 3, '5-8', 90, 'funzionale'),
          ex('Hollow body hold', 3, '30s', 45, 'funzionale'),
          ex('Planche lean', 4, '15s', 60, 'funzionale'),
        ],
      },
    ],
  },

  // 8. POWERBUILDING
  {
    id: 'male-powerbuilding',
    name: 'Powerbuilding - Forza + Ipertrofia',
    description: 'Combinazione di forza sui fondamentali e lavoro ipertrofico accessorio. 4 giorni.',
    gender: 'male',
    category: 'Powerbuilding',
    weeklySchedule: [
      {
        dayOfWeek: 0, dayName: 'Lunedì - Squat Day',
        notes: 'Squat pesante + accessori gambe',
        exercises: [
          ex('Squat con bilanciere', 5, '3-5', 240, 'forza', 'RPE 8-9'),
          ex('Squat con fermo', 3, '5', 120, 'forza', '2 secondi di fermo in basso'),
          ex('Leg press', 3, '10-12', 90, 'forza'),
          ex('Leg curl', 4, '10-12', 60, 'forza'),
          ex('Calf raises', 4, '15', 60, 'forza'),
        ],
      },
      {
        dayOfWeek: 1, dayName: 'Martedì - Bench Day',
        notes: 'Panca pesante + accessori upper',
        exercises: [
          ex('Panca piana bilanciere', 5, '3-5', 240, 'forza', 'RPE 8-9'),
          ex('Panca inclinata manubri', 3, '8-10', 90, 'forza'),
          ex('Rematore con bilanciere', 4, '8-10', 90, 'forza'),
          ex('Alzate laterali', 4, '15', 60, 'forza'),
          ex('Curl + Pushdown superset', 3, '12', 60, 'forza'),
        ],
      },
      {
        dayOfWeek: 3, dayName: 'Giovedì - Deadlift Day',
        notes: 'Stacco pesante + accessori',
        exercises: [
          ex('Stacco da terra', 5, '3-5', 240, 'forza', 'RPE 8-9'),
          ex('Stacco deficit', 3, '5', 120, 'forza'),
          ex('Hip thrust', 3, '10-12', 90, 'forza'),
          ex('Good morning', 3, '10', 90, 'forza'),
          ex('Ab wheel', 3, '10-12', 60, 'funzionale'),
        ],
      },
      {
        dayOfWeek: 4, dayName: 'Venerdì - OHP Day',
        notes: 'Military press + accessori',
        exercises: [
          ex('Military press', 5, '3-5', 180, 'forza', 'RPE 8-9'),
          ex('Push press', 3, '5-6', 120, 'forza'),
          ex('Trazioni zavorrate', 4, '6-8', 120, 'forza'),
          ex('Croci ai cavi', 3, '12-15', 60, 'forza'),
          ex('Face pull', 3, '15-20', 60, 'forza'),
          ex('Curl a martello', 3, '10-12', 60, 'forza'),
        ],
      },
    ],
  },

  // 9. PRINCIPIANTE UOMO
  {
    id: 'male-principiante',
    name: 'Principiante - Full Body',
    description: 'Programma per chi inizia ad allenarsi. Full body 3 giorni a settimana.',
    gender: 'male',
    category: 'Principiante',
    weeklySchedule: [
      {
        dayOfWeek: 0, dayName: 'Lunedì - Full Body A',
        notes: 'Imparare i movimenti base',
        exercises: [
          ex('Goblet squat', 3, '12', 90, 'forza', 'Mantenere il busto eretto'),
          ex('Panca piana con manubri', 3, '12', 90, 'forza', 'Scapole retratte'),
          ex('Lat machine', 3, '12', 90, 'forza', 'Tirare verso il petto'),
          ex('Shoulder press manubri seduto', 3, '12', 60, 'forza'),
          ex('Plank', 3, '20-30s', 45, 'funzionale'),
          ex('Stretching generale', 1, '5min', 0, 'stretching'),
        ],
      },
      {
        dayOfWeek: 2, dayName: 'Mercoledì - Full Body B',
        notes: 'Variazione movimenti',
        exercises: [
          ex('Leg press', 3, '12', 90, 'forza'),
          ex('Push-up (anche assistiti)', 3, '8-12', 60, 'funzionale'),
          ex('Rematore con manubrio', 3, '12/braccio', 60, 'forza'),
          ex('Alzate laterali', 3, '12', 60, 'forza'),
          ex('Crunch', 3, '15', 45, 'funzionale'),
          ex('Camminata veloce', 1, '10min', 0, 'cardio'),
        ],
      },
      {
        dayOfWeek: 4, dayName: 'Venerdì - Full Body C',
        notes: 'Consolidamento',
        exercises: [
          ex('Affondi con manubri', 3, '10/gamba', 60, 'forza'),
          ex('Panca inclinata manubri', 3, '12', 90, 'forza'),
          ex('Pulley basso', 3, '12', 60, 'forza'),
          ex('Curl con manubri', 2, '12', 60, 'forza'),
          ex('Pushdown al cavo', 2, '12', 60, 'forza'),
          ex('Plank laterale', 3, '15s/lato', 30, 'funzionale'),
        ],
      },
    ],
  },

  // 10. SPORT PERFORMANCE
  {
    id: 'male-sport-performance',
    name: 'Sport Performance - Atletico',
    description: 'Programma per migliorare performance atletica: esplosività, agilità, resistenza. 4 giorni.',
    gender: 'male',
    category: 'Sport Performance',
    weeklySchedule: [
      {
        dayOfWeek: 0, dayName: 'Lunedì - Forza Esplosiva',
        notes: 'Power e velocità',
        exercises: [
          ex('Power clean', 5, '3', 120, 'funzionale'),
          ex('Box jump', 4, '5', 90, 'cardio', 'Massima altezza'),
          ex('Squat con bilanciere', 4, '5', 180, 'forza'),
          ex('Panca piana', 4, '5', 120, 'forza'),
          ex('Medicine ball slam', 3, '8', 60, 'funzionale'),
        ],
      },
      {
        dayOfWeek: 1, dayName: 'Martedì - Agilità e Cardio',
        notes: 'Lavoro di agilità e resistenza',
        exercises: [
          ex('Sprint 30m', 6, '1', 90, 'cardio'),
          ex('Agility ladder drill', 4, '30s', 45, 'cardio'),
          ex('Shuttle run', 4, '1', 60, 'cardio'),
          ex('Lateral bound', 3, '8/lato', 60, 'funzionale'),
          ex('Core rotation con med ball', 3, '10/lato', 45, 'funzionale'),
        ],
      },
      {
        dayOfWeek: 3, dayName: 'Giovedì - Forza Funzionale',
        notes: 'Movimenti multi-articolari',
        exercises: [
          ex('Stacco da terra', 4, '5', 180, 'forza'),
          ex('Military press', 4, '6', 120, 'forza'),
          ex('Trazioni con peso', 4, '5', 120, 'forza'),
          ex('Farmer carry', 3, '40m', 90, 'funzionale'),
          ex('Turkish get-up', 3, '3/lato', 90, 'funzionale'),
        ],
      },
      {
        dayOfWeek: 5, dayName: 'Sabato - Condizionamento',
        notes: 'Resistenza muscolare e cardio',
        exercises: [
          ex('Circuito: 10 burpee + 10 KB swing + 10 box jump', 5, '1', 120, 'cardio'),
          ex('Sled push', 4, '20m', 90, 'funzionale'),
          ex('Battle rope', 4, '30s', 60, 'cardio'),
          ex('Bear crawl', 3, '20m', 60, 'funzionale'),
          ex('Corsa intervallata 200m', 4, '1', 90, 'cardio'),
        ],
      },
    ],
  },
];

// ============================================================
// TEMPLATE DONNA (10)
// ============================================================

export const femaleTemplates: WorkoutTemplate[] = [
  // 1. TONIFICAZIONE DONNA - FULL BODY
  {
    id: 'female-tonificazione',
    name: 'Tonificazione - Full Body',
    description: 'Programma per tonificare tutto il corpo. 3 giorni a settimana.',
    gender: 'female',
    category: 'Tonificazione',
    weeklySchedule: [
      {
        dayOfWeek: 0, dayName: 'Lunedì - Full Body A',
        notes: 'Focus gambe e glutei + parte alta',
        exercises: [
          ex('Squat con manubri', 4, '12-15', 60, 'forza'),
          ex('Hip thrust', 4, '12-15', 60, 'forza', 'Stringere i glutei in alto'),
          ex('Push-up (anche sulle ginocchia)', 3, '10-12', 60, 'funzionale'),
          ex('Rematore con manubrio', 3, '12/braccio', 60, 'forza'),
          ex('Alzate laterali', 3, '12', 45, 'forza'),
          ex('Plank', 3, '30s', 30, 'funzionale'),
          ex('Stretching', 1, '5min', 0, 'stretching'),
        ],
      },
      {
        dayOfWeek: 2, dayName: 'Mercoledì - Full Body B',
        notes: 'Variante con focus glutei',
        exercises: [
          ex('Affondi camminati', 3, '12/gamba', 60, 'forza'),
          ex('Ponte glutei monopodalico', 3, '12/gamba', 60, 'forza'),
          ex('Panca piana manubri', 3, '12', 60, 'forza'),
          ex('Lat machine', 3, '12', 60, 'forza'),
          ex('Crunch inverso', 3, '15', 45, 'funzionale'),
          ex('Russian twist', 3, '12/lato', 45, 'funzionale'),
        ],
      },
      {
        dayOfWeek: 4, dayName: 'Venerdì - Full Body C',
        notes: 'Circuito tonificante',
        exercises: [
          ex('Sumo squat con manubrio', 3, '15', 60, 'forza'),
          ex('Step-up su panca', 3, '12/gamba', 60, 'funzionale'),
          ex('Arnold press', 3, '12', 60, 'forza'),
          ex('Pulley basso', 3, '12', 60, 'forza'),
          ex('Kickback glutei al cavo', 3, '15/gamba', 45, 'forza'),
          ex('Plank laterale', 3, '20s/lato', 30, 'funzionale'),
        ],
      },
    ],
  },

  // 2. GLUTEI E GAMBE FOCUS
  {
    id: 'female-glutei-gambe',
    name: 'Glutei & Gambe - Specializzazione',
    description: 'Programma specifico per glutei e gambe con sessioni upper body. 4 giorni.',
    gender: 'female',
    category: 'Glutei & Gambe',
    weeklySchedule: [
      {
        dayOfWeek: 0, dayName: 'Lunedì - Glutei Focus',
        notes: 'Attivazione e volume glutei',
        exercises: [
          ex('Hip thrust con bilanciere', 4, '10-12', 90, 'forza', 'Fermo 2s in alto'),
          ex('Squat sumo', 4, '12', 90, 'forza'),
          ex('Kickback al cavo', 3, '15/gamba', 45, 'forza'),
          ex('Abductor machine', 3, '15', 45, 'forza'),
          ex('Ponte glutei con elastico', 3, '20', 45, 'forza'),
          ex('Clam shell con elastico', 3, '15/lato', 30, 'forza'),
        ],
      },
      {
        dayOfWeek: 1, dayName: 'Martedì - Upper Body',
        notes: 'Tonificazione parte superiore',
        exercises: [
          ex('Push-up', 3, '10-15', 60, 'funzionale'),
          ex('Rematore con manubri', 3, '12', 60, 'forza'),
          ex('Military press manubri', 3, '12', 60, 'forza'),
          ex('Croci ai cavi', 3, '12', 45, 'forza'),
          ex('Face pull', 3, '15', 45, 'forza'),
          ex('Curl con manubri', 2, '12', 45, 'forza'),
          ex('Pushdown al cavo', 2, '12', 45, 'forza'),
        ],
      },
      {
        dayOfWeek: 3, dayName: 'Giovedì - Gambe Complete',
        notes: 'Quadricipiti + femorali + glutei',
        exercises: [
          ex('Squat con bilanciere', 4, '8-10', 120, 'forza'),
          ex('Stacco rumeno', 4, '10-12', 90, 'forza'),
          ex('Pressa piedi stretti (quad)', 3, '12', 90, 'forza'),
          ex('Leg curl', 3, '12', 60, 'forza'),
          ex('Affondi laterali', 3, '10/gamba', 60, 'forza'),
          ex('Calf raises', 3, '15', 45, 'forza'),
        ],
      },
      {
        dayOfWeek: 5, dayName: 'Sabato - Glutei Volume',
        notes: 'Secondo giorno glutei nella settimana',
        exercises: [
          ex('Hip thrust monopodalico', 3, '10/gamba', 60, 'forza'),
          ex('Squat bulgaro', 3, '10/gamba', 90, 'forza'),
          ex('Stiff leg deadlift manubri', 3, '12', 90, 'forza'),
          ex('Cable pull-through', 3, '15', 60, 'forza'),
          ex('Fire hydrant con elastico', 3, '15/lato', 30, 'forza'),
          ex('Frog pump', 3, '20', 30, 'forza'),
        ],
      },
    ],
  },

  // 3. DIMAGRIMENTO DONNA
  {
    id: 'female-dimagrimento',
    name: 'Dimagrimento - Cardio + Tono',
    description: 'Mix di allenamento con pesi e cardio per bruciare grassi e tonificare. 4 giorni.',
    gender: 'female',
    category: 'Dimagrimento',
    weeklySchedule: [
      {
        dayOfWeek: 0, dayName: 'Lunedì - Upper + Cardio',
        notes: 'Circuito upper body con cardio',
        exercises: [
          ex('Push-up', 3, '12', 30, 'funzionale'),
          ex('Rematore con manubri', 3, '12', 30, 'forza'),
          ex('Shoulder press', 3, '12', 30, 'forza'),
          ex('Plank', 3, '30s', 30, 'funzionale'),
          ex('Jumping jack', 3, '45s', 15, 'cardio'),
          ex('Mountain climber', 3, '30s', 15, 'cardio'),
          ex('Camminata veloce/corsa', 1, '15min', 0, 'cardio'),
        ],
      },
      {
        dayOfWeek: 1, dayName: 'Martedì - Lower + HIIT',
        notes: 'Gambe e glutei + intervalli',
        exercises: [
          ex('Squat con manubri', 3, '15', 30, 'forza'),
          ex('Affondi alternati', 3, '12/gamba', 30, 'forza'),
          ex('Hip thrust', 3, '15', 30, 'forza'),
          ex('Squat jump', 3, '10', 30, 'cardio'),
          ex('Burpees', 3, '8', 30, 'cardio'),
          ex('High knees', 3, '30s', 15, 'cardio'),
          ex('Stretching', 1, '5min', 0, 'stretching'),
        ],
      },
      {
        dayOfWeek: 3, dayName: 'Giovedì - Full Body Circuit',
        notes: '3 giri del circuito completo',
        exercises: [
          ex('Thruster con manubri', 3, '12', 30, 'funzionale'),
          ex('Rematore presa larga', 3, '12', 30, 'forza'),
          ex('Step-up alternati', 3, '10/gamba', 30, 'funzionale'),
          ex('Plank to push-up', 3, '10', 30, 'funzionale'),
          ex('Swing con kettlebell', 3, '15', 30, 'funzionale'),
          ex('Bicycle crunch', 3, '15/lato', 30, 'funzionale'),
        ],
      },
      {
        dayOfWeek: 5, dayName: 'Sabato - Active Recovery + Cardio',
        notes: 'Cardio leggero e mobilità',
        exercises: [
          ex('Camminata veloce o bici', 1, '30min', 0, 'cardio'),
          ex('Yoga flow', 1, '15min', 0, 'mobilita'),
          ex('Foam rolling completo', 1, '10min', 0, 'mobilita'),
          ex('Stretching statico', 1, '10min', 0, 'stretching'),
        ],
      },
    ],
  },

  // 4. IPERTROFIA DONNA
  {
    id: 'female-ipertrofia',
    name: 'Ipertrofia - Crescita Muscolare',
    description: 'Programma per costruire massa muscolare con focus su proporzioni femminili. 4 giorni.',
    gender: 'female',
    category: 'Ipertrofia',
    weeklySchedule: [
      {
        dayOfWeek: 0, dayName: 'Lunedì - Lower Body A',
        notes: 'Quadricipiti e glutei',
        exercises: [
          ex('Squat con bilanciere', 4, '8-10', 120, 'forza'),
          ex('Pressa a 45°', 4, '10-12', 90, 'forza'),
          ex('Hip thrust', 4, '10-12', 90, 'forza'),
          ex('Leg extension', 3, '12-15', 60, 'forza'),
          ex('Abductor machine', 3, '15', 60, 'forza'),
          ex('Calf raises', 4, '15', 60, 'forza'),
        ],
      },
      {
        dayOfWeek: 1, dayName: 'Martedì - Upper Body A',
        notes: 'Push focus',
        exercises: [
          ex('Panca piana manubri', 4, '10-12', 90, 'forza'),
          ex('Military press manubri', 4, '10-12', 90, 'forza'),
          ex('Lat machine', 4, '10-12', 90, 'forza'),
          ex('Alzate laterali', 4, '15', 60, 'forza'),
          ex('Croci ai cavi', 3, '12', 60, 'forza'),
          ex('Curl + Pushdown', 3, '12', 60, 'forza'),
        ],
      },
      {
        dayOfWeek: 3, dayName: 'Giovedì - Lower Body B',
        notes: 'Femorali e glutei',
        exercises: [
          ex('Stacco rumeno', 4, '10-12', 90, 'forza'),
          ex('Squat bulgaro', 3, '10/gamba', 90, 'forza'),
          ex('Leg curl', 4, '10-12', 60, 'forza'),
          ex('Hip thrust monopodalico', 3, '12/gamba', 60, 'forza'),
          ex('Good morning', 3, '12', 60, 'forza'),
          ex('Kickback glutei', 3, '15/gamba', 45, 'forza'),
        ],
      },
      {
        dayOfWeek: 4, dayName: 'Venerdì - Upper Body B',
        notes: 'Pull focus',
        exercises: [
          ex('Trazioni assistite', 4, '8-10', 90, 'forza'),
          ex('Rematore con manubri', 4, '10-12', 60, 'forza'),
          ex('Panca inclinata manubri', 3, '12', 60, 'forza'),
          ex('Face pull', 3, '15', 60, 'forza'),
          ex('Alzate posteriori', 3, '15', 45, 'forza'),
          ex('Curl a martello', 3, '12', 45, 'forza'),
        ],
      },
    ],
  },

  // 5. PILATES FUSION
  {
    id: 'female-pilates-fusion',
    name: 'Pilates Fusion - Core & Tono',
    description: 'Combinazione di Pilates e pesi leggeri per core, postura e tonicità. 3 giorni.',
    gender: 'female',
    category: 'Pilates',
    weeklySchedule: [
      {
        dayOfWeek: 0, dayName: 'Lunedì - Core & Lower',
        notes: 'Pilates + lavoro gambe',
        exercises: [
          ex('Hundred', 3, '100 battiti', 30, 'posturale'),
          ex('Roll-up', 3, '10', 30, 'posturale'),
          ex('Single leg circle', 3, '10/gamba', 30, 'posturale'),
          ex('Ponte glutei Pilates', 3, '15', 30, 'posturale', 'Salire vertebra per vertebra'),
          ex('Side-lying leg series', 3, '15/gamba', 30, 'posturale'),
          ex('Squat con manubri leggeri', 3, '15', 60, 'forza'),
          ex('Hip thrust', 3, '15', 60, 'forza'),
        ],
      },
      {
        dayOfWeek: 2, dayName: 'Mercoledì - Core & Upper',
        notes: 'Pilates + tonificazione braccia',
        exercises: [
          ex('Plank con variazioni', 3, '30s', 30, 'funzionale'),
          ex('Swimming', 3, '30s', 30, 'posturale'),
          ex('Teaser', 3, '8', 45, 'posturale'),
          ex('Push-up con ginocchia', 3, '10', 45, 'funzionale'),
          ex('Shoulder press leggero', 3, '15', 45, 'forza'),
          ex('Rematore con elastico', 3, '15', 45, 'forza'),
          ex('Curl con manubri leggeri', 3, '15', 45, 'forza'),
        ],
      },
      {
        dayOfWeek: 4, dayName: 'Venerdì - Stretch & Tone',
        notes: 'Mobilità + tonificazione leggera',
        exercises: [
          ex('Cat-cow', 3, '10', 30, 'mobilita'),
          ex('Thread the needle', 3, '8/lato', 30, 'mobilita'),
          ex('Mermaid stretch', 3, '8/lato', 30, 'stretching'),
          ex('Standing Pilates series', 3, '10/esercizio', 30, 'posturale'),
          ex('Sumo squat pulsato', 3, '20', 45, 'forza'),
          ex('Affondi con rotazione', 3, '10/gamba', 45, 'funzionale'),
          ex('Stretching completo', 1, '10min', 0, 'stretching'),
        ],
      },
    ],
  },

  // 6. POSTURALE DONNA
  {
    id: 'female-posturale',
    name: 'Posturale e Benessere',
    description: 'Programma per migliorare postura, ridurre dolori e aumentare il benessere. 3 giorni.',
    gender: 'female',
    category: 'Posturale',
    weeklySchedule: [
      {
        dayOfWeek: 0, dayName: 'Lunedì - Mobilità e Stabilità',
        notes: 'Lavoro correttivo e preventivo',
        exercises: [
          ex('Respirazione diaframmatica', 3, '10 respiri', 30, 'posturale', 'Espirare completamente'),
          ex('Cat-cow', 3, '10', 30, 'mobilita'),
          ex('Bird-dog', 3, '10/lato', 30, 'posturale'),
          ex('Dead bug', 3, '10/lato', 30, 'posturale'),
          ex('Clamshell con elastico', 3, '15/lato', 30, 'posturale'),
          ex('Wall angel', 3, '10', 30, 'posturale'),
          ex('Child pose', 3, '30s', 30, 'stretching'),
        ],
      },
      {
        dayOfWeek: 2, dayName: 'Mercoledì - Rinforzo',
        notes: 'Rinforzo muscoli posturali',
        exercises: [
          ex('Ponte glutei', 3, '15', 45, 'posturale'),
          ex('Band pull-apart', 3, '15', 30, 'posturale'),
          ex('Face pull con elastico', 3, '12', 30, 'posturale'),
          ex('Plank frontale', 3, '20-30s', 45, 'funzionale'),
          ex('Superman', 3, '10', 45, 'posturale'),
          ex('Squat al muro', 3, '30s', 30, 'funzionale'),
          ex('Stretching flessori anca', 3, '30s/lato', 30, 'stretching'),
        ],
      },
      {
        dayOfWeek: 4, dayName: 'Venerdì - Rilascio e Flessibilità',
        notes: 'Rilascio tensioni e allungamento',
        exercises: [
          ex('Foam rolling schiena', 1, '3min', 0, 'mobilita'),
          ex('Foam rolling glutei e TFL', 1, '2min/lato', 0, 'mobilita'),
          ex('Stretching pettorali', 3, '30s/lato', 30, 'stretching'),
          ex('Stretching trapezio', 3, '30s/lato', 30, 'stretching'),
          ex('Pigeon stretch', 3, '30s/lato', 30, 'stretching'),
          ex('Stretching quadricipiti', 3, '30s/gamba', 30, 'stretching'),
          ex('Savasana con respirazione', 1, '5min', 0, 'stretching'),
        ],
      },
    ],
  },

  // 7. FORZA DONNA
  {
    id: 'female-forza',
    name: 'Forza Femminile - Fondamentali',
    description: 'Programma di forza per donne che vogliono diventare più forti. 3 giorni.',
    gender: 'female',
    category: 'Forza',
    weeklySchedule: [
      {
        dayOfWeek: 0, dayName: 'Lunedì - Squat Day',
        notes: 'Focus squat + accessori',
        exercises: [
          ex('Squat con bilanciere', 5, '5', 180, 'forza', 'Progressione lineare'),
          ex('Squat con fermo', 3, '5', 90, 'forza', '2s fermo in buca'),
          ex('Hip thrust pesante', 4, '8', 90, 'forza'),
          ex('Leg curl', 3, '10', 60, 'forza'),
          ex('Plank', 3, '30-45s', 45, 'funzionale'),
        ],
      },
      {
        dayOfWeek: 2, dayName: 'Mercoledì - Bench Day',
        notes: 'Focus panca + upper body',
        exercises: [
          ex('Panca piana bilanciere', 5, '5', 180, 'forza'),
          ex('Military press', 4, '6', 120, 'forza'),
          ex('Rematore con bilanciere', 4, '6-8', 120, 'forza'),
          ex('Trazioni assistite', 3, '8', 90, 'forza'),
          ex('Face pull', 3, '15', 60, 'forza'),
        ],
      },
      {
        dayOfWeek: 4, dayName: 'Venerdì - Deadlift Day',
        notes: 'Focus stacco + accessori',
        exercises: [
          ex('Stacco da terra', 5, '5', 180, 'forza'),
          ex('Stacco rumeno', 3, '8', 90, 'forza'),
          ex('Squat bulgaro', 3, '8/gamba', 90, 'forza'),
          ex('Good morning', 3, '10', 60, 'forza'),
          ex('Ab wheel rollout', 3, '8-10', 60, 'funzionale'),
        ],
      },
    ],
  },

  // 8. PRINCIPIANTE DONNA
  {
    id: 'female-principiante',
    name: 'Principiante - Primo Approccio',
    description: 'Per donne che iniziano ad allenarsi. Esercizi semplici e sicuri. 3 giorni.',
    gender: 'female',
    category: 'Principiante',
    weeklySchedule: [
      {
        dayOfWeek: 0, dayName: 'Lunedì - Total Body A',
        notes: 'Esercizi base, carichi leggeri',
        exercises: [
          ex('Squat a corpo libero', 3, '15', 60, 'funzionale', 'Seduta su una sedia immaginaria'),
          ex('Push-up al muro o inclinati', 3, '10', 60, 'funzionale'),
          ex('Rematore con manubrio leggero', 3, '12/braccio', 60, 'forza'),
          ex('Ponte glutei', 3, '15', 45, 'funzionale'),
          ex('Plank sulle ginocchia', 3, '15-20s', 30, 'funzionale'),
          ex('Camminata', 1, '10min', 0, 'cardio'),
        ],
      },
      {
        dayOfWeek: 2, dayName: 'Mercoledì - Total Body B',
        notes: 'Variazioni base',
        exercises: [
          ex('Goblet squat con kettlebell', 3, '12', 60, 'forza'),
          ex('Affondi sul posto', 3, '10/gamba', 60, 'forza'),
          ex('Lat machine (leggero)', 3, '12', 60, 'forza'),
          ex('Shoulder press manubri seduta', 3, '10', 60, 'forza'),
          ex('Crunch', 3, '12', 30, 'funzionale'),
          ex('Stretching', 1, '5min', 0, 'stretching'),
        ],
      },
      {
        dayOfWeek: 4, dayName: 'Venerdì - Total Body C',
        notes: 'Consolidamento movimenti',
        exercises: [
          ex('Leg press (leggero)', 3, '12', 60, 'forza'),
          ex('Step-up su gradino basso', 3, '10/gamba', 60, 'funzionale'),
          ex('Panca piana manubri leggeri', 3, '12', 60, 'forza'),
          ex('Pulley basso', 3, '12', 60, 'forza'),
          ex('Ponte glutei monopodalico', 3, '10/gamba', 45, 'funzionale'),
          ex('Plank laterale (ginocchia)', 3, '15s/lato', 30, 'funzionale'),
        ],
      },
    ],
  },

  // 9. HOME WORKOUT DONNA
  {
    id: 'female-home',
    name: 'Home Workout - Casa con Elastici',
    description: 'Allenamento a casa con elastici e corpo libero. 4 giorni a settimana.',
    gender: 'female',
    category: 'Home Workout',
    weeklySchedule: [
      {
        dayOfWeek: 0, dayName: 'Lunedì - Lower Body',
        notes: 'Gambe e glutei con elastici',
        exercises: [
          ex('Squat con elastico', 4, '15', 45, 'forza'),
          ex('Sumo squat pulsato', 3, '20', 30, 'forza'),
          ex('Donkey kick con elastico', 3, '15/gamba', 30, 'forza'),
          ex('Fire hydrant', 3, '15/gamba', 30, 'forza'),
          ex('Clamshell con elastico', 3, '15/lato', 30, 'forza'),
          ex('Ponte glutei con elastico', 3, '20', 30, 'forza'),
          ex('Wall sit', 3, '30s', 30, 'funzionale'),
        ],
      },
      {
        dayOfWeek: 1, dayName: 'Martedì - Upper Body',
        notes: 'Braccia e schiena con elastici',
        exercises: [
          ex('Push-up', 3, '10-15', 45, 'funzionale'),
          ex('Band row', 3, '15', 30, 'forza'),
          ex('Band press overhead', 3, '12', 30, 'forza'),
          ex('Band pull-apart', 3, '15', 30, 'forza'),
          ex('Band bicep curl', 3, '15', 30, 'forza'),
          ex('Tricep dip su sedia', 3, '12', 30, 'funzionale'),
          ex('Plank', 3, '30-45s', 30, 'funzionale'),
        ],
      },
      {
        dayOfWeek: 3, dayName: 'Giovedì - Glutei Focus',
        notes: 'Sessione dedicata ai glutei',
        exercises: [
          ex('Hip thrust a terra con elastico', 4, '20', 30, 'forza'),
          ex('Single leg hip thrust', 3, '12/gamba', 30, 'forza'),
          ex('Squat bulgaro senza peso', 3, '12/gamba', 60, 'funzionale'),
          ex('Affondi laterali', 3, '12/lato', 45, 'funzionale'),
          ex('Frog pump', 3, '25', 30, 'forza'),
          ex('Standing kickback con elastico', 3, '15/gamba', 30, 'forza'),
        ],
      },
      {
        dayOfWeek: 5, dayName: 'Sabato - Cardio & Core',
        notes: 'Cardio a casa + addominali',
        exercises: [
          ex('Jumping jack', 3, '45s', 15, 'cardio'),
          ex('Mountain climber', 3, '30s', 15, 'cardio'),
          ex('Squat jump', 3, '10', 30, 'cardio'),
          ex('Bicycle crunch', 3, '15/lato', 30, 'funzionale'),
          ex('Leg raise', 3, '12', 30, 'funzionale'),
          ex('Russian twist', 3, '15/lato', 30, 'funzionale'),
          ex('Plank to push-up', 3, '10', 30, 'funzionale'),
        ],
      },
    ],
  },

  // 10. OVER 40 DONNA
  {
    id: 'female-over40',
    name: 'Over 40 - Salute e Vitalità',
    description: 'Programma per donne over 40: ossa forti, articolazioni sane, metabolismo attivo. 3 giorni.',
    gender: 'female',
    category: 'Over 40',
    weeklySchedule: [
      {
        dayOfWeek: 0, dayName: 'Lunedì - Forza e Ossa',
        notes: 'Esercizi con carico per densità ossea',
        exercises: [
          ex('Squat con manubri', 3, '12', 90, 'forza', 'Profondità comoda'),
          ex('Panca piana manubri', 3, '12', 90, 'forza'),
          ex('Stacco rumeno manubri', 3, '12', 90, 'forza', 'Leggera flessione ginocchia'),
          ex('Shoulder press seduta', 3, '12', 60, 'forza'),
          ex('Rematore seduta al cavo', 3, '12', 60, 'forza'),
          ex('Camminata veloce', 1, '10min', 0, 'cardio'),
        ],
      },
      {
        dayOfWeek: 2, dayName: 'Mercoledì - Equilibrio e Core',
        notes: 'Stabilità, equilibrio, core',
        exercises: [
          ex('Equilibrio monopodalico', 3, '30s/gamba', 30, 'funzionale'),
          ex('Step-up su gradino', 3, '10/gamba', 60, 'funzionale'),
          ex('Ponte glutei', 3, '15', 45, 'funzionale'),
          ex('Bird-dog', 3, '10/lato', 30, 'posturale'),
          ex('Plank (anche ginocchia)', 3, '20-30s', 45, 'funzionale'),
          ex('Pallof press con elastico', 3, '10/lato', 45, 'funzionale'),
          ex('Cat-cow', 3, '10', 30, 'mobilita'),
        ],
      },
      {
        dayOfWeek: 4, dayName: 'Venerdì - Mobilità e Tono',
        notes: 'Mobilità articolare + tonificazione leggera',
        exercises: [
          ex('Squat a corpo libero', 3, '15', 45, 'funzionale'),
          ex('Affondi leggeri', 3, '8/gamba', 60, 'forza'),
          ex('Alzate laterali leggere', 3, '12', 45, 'forza'),
          ex('Lat machine leggera', 3, '12', 60, 'forza'),
          ex('Stretching completo', 1, '10min', 0, 'stretching'),
          ex('Respirazione e rilassamento', 1, '5min', 0, 'stretching'),
        ],
      },
    ],
  },
];

// Tutti i template combinati
export const allTemplates: WorkoutTemplate[] = [...maleTemplates, ...femaleTemplates];
