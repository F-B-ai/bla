import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Badge, BadgeId, StudentGamification } from '../types';

const GAMIFICATION_COLLECTION = 'gamification';

// --- Definizioni badge (italiano) ---
const BADGE_DEFINITIONS: Record<BadgeId, Omit<Badge, 'unlockedAt'>> = {
  first_workout: {
    id: 'first_workout',
    name: 'Prima Sessione',
    description: 'Hai completato il tuo primo allenamento!',
    icon: '🏋️',
  },
  ten_workouts: {
    id: 'ten_workouts',
    name: 'Decathleta',
    description: '10 allenamenti completati!',
    icon: '💪',
  },
  fifty_workouts: {
    id: 'fifty_workouts',
    name: 'Guerriero',
    description: '50 allenamenti completati!',
    icon: '⚔️',
  },
  hundred_workouts: {
    id: 'hundred_workouts',
    name: 'Leggenda',
    description: '100 allenamenti completati!',
    icon: '👑',
  },
  streak_7: {
    id: 'streak_7',
    name: 'Settimana Perfetta',
    description: '7 giorni di fila!',
    icon: '🔥',
  },
  streak_30: {
    id: 'streak_30',
    name: 'Mese di Fuoco',
    description: '30 giorni consecutivi!',
    icon: '🌟',
  },
  streak_90: {
    id: 'streak_90',
    name: "Trimestre d'Oro",
    description: '90 giorni consecutivi!',
    icon: '🏆',
  },
  streak_365: {
    id: 'streak_365',
    name: 'Inarrestabile',
    description: '365 giorni di fila!',
    icon: '💎',
  },
  early_bird: {
    id: 'early_bird',
    name: 'Mattiniero',
    description: 'Allenamento prima delle 8:00',
    icon: '🌅',
  },
  night_owl: {
    id: 'night_owl',
    name: 'Nottambulo',
    description: 'Allenamento dopo le 21:00',
    icon: '🦉',
  },
  first_program: {
    id: 'first_program',
    name: 'Inizio Percorso',
    description: 'Primo programma completato',
    icon: '📋',
  },
  five_programs: {
    id: 'five_programs',
    name: 'Veterano',
    description: '5 programmi completati',
    icon: '🎯',
  },
  diary_writer: {
    id: 'diary_writer',
    name: 'Scrittore',
    description: 'Prima nota nel diario',
    icon: '✏️',
  },
  diary_faithful: {
    id: 'diary_faithful',
    name: 'Diarista Fedele',
    description: '30 note nel diario',
    icon: '📓',
  },
  payment_punctual: {
    id: 'payment_punctual',
    name: 'Puntuale',
    description: 'Sempre in regola con i pagamenti',
    icon: '✅',
  },
  heavy_lifter: {
    id: 'heavy_lifter',
    name: 'Forza Bruta',
    description: 'Hai sollevato oltre 1000kg in una sessione',
    icon: '🦍',
  },
  consistency_king: {
    id: 'consistency_king',
    name: 'Re della Costanza',
    description: '80%+ presenze in un mese',
    icon: '👊',
  },
};

export const getAllBadgeDefinitions = (): Record<BadgeId, Omit<Badge, 'unlockedAt'>> => {
  return BADGE_DEFINITIONS;
};

// --- Calcola livello da XP ---
// Ogni livello richiede livello*100 XP
// Livello 1 = 100xp, Livello 2 = 300xp totale (100+200), Livello 3 = 600xp totale (100+200+300), ecc.
export const calculateLevel = (xp: number): number => {
  let level = 0;
  let xpRequired = 0;
  while (xpRequired <= xp) {
    level++;
    xpRequired += level * 100;
  }
  return level;
};

// XP totali necessari per raggiungere un livello
export const xpForLevel = (level: number): number => {
  let total = 0;
  for (let i = 1; i <= level; i++) {
    total += i * 100;
  }
  return total;
};

// --- Helper: converte Firestore data a StudentGamification ---
const fromFirestore = (id: string, data: Record<string, unknown>): StudentGamification => {
  return {
    id,
    studentId: data.studentId as string,
    currentStreak: (data.currentStreak as number) || 0,
    longestStreak: (data.longestStreak as number) || 0,
    lastWorkoutDate: data.lastWorkoutDate
      ? (data.lastWorkoutDate as Timestamp).toDate()
      : undefined,
    totalWorkouts: (data.totalWorkouts as number) || 0,
    totalDiaryEntries: (data.totalDiaryEntries as number) || 0,
    badges: ((data.badges as Badge[]) || []).map((b) => ({
      ...b,
      unlockedAt: b.unlockedAt
        ? (b.unlockedAt as unknown as Timestamp).toDate
          ? (b.unlockedAt as unknown as Timestamp).toDate()
          : new Date(b.unlockedAt as unknown as string)
        : undefined,
    })),
    level: (data.level as number) || 1,
    xp: (data.xp as number) || 0,
    updatedAt: data.updatedAt
      ? (data.updatedAt as Timestamp).toDate()
      : new Date(),
  };
};

// --- Carica o crea il documento gamification per uno studente ---
export const getStudentGamification = async (
  studentId: string
): Promise<StudentGamification> => {
  const q = query(
    collection(db, GAMIFICATION_COLLECTION),
    where('studentId', '==', studentId)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const d = snapshot.docs[0];
    return fromFirestore(d.id, d.data() as Record<string, unknown>);
  }

  // Crea un nuovo documento di default
  const defaultData = {
    studentId,
    currentStreak: 0,
    longestStreak: 0,
    lastWorkoutDate: null,
    totalWorkouts: 0,
    totalDiaryEntries: 0,
    badges: [],
    level: 1,
    xp: 0,
    updatedAt: Timestamp.now(),
  };

  const docRef = await addDoc(collection(db, GAMIFICATION_COLLECTION), defaultData);
  return {
    id: docRef.id,
    ...defaultData,
    lastWorkoutDate: undefined,
    updatedAt: new Date(),
  };
};

// --- Helper: controlla se una data è "ieri" rispetto a oggi ---
const isYesterday = (date: Date): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  );
};

// --- Helper: controlla se una data è "oggi" ---
const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

// --- Controlla e assegna badge ---
export const checkAndAwardBadges = (
  gamification: StudentGamification
): Badge[] => {
  const existingIds = new Set(gamification.badges.map((b) => b.id));
  const newBadges: Badge[] = [];

  const check = (id: BadgeId, condition: boolean) => {
    if (!existingIds.has(id) && condition) {
      const def = BADGE_DEFINITIONS[id];
      newBadges.push({ ...def, unlockedAt: new Date() });
    }
  };

  // Badge allenamenti
  check('first_workout', gamification.totalWorkouts >= 1);
  check('ten_workouts', gamification.totalWorkouts >= 10);
  check('fifty_workouts', gamification.totalWorkouts >= 50);
  check('hundred_workouts', gamification.totalWorkouts >= 100);

  // Badge streak
  check('streak_7', gamification.currentStreak >= 7);
  check('streak_30', gamification.currentStreak >= 30);
  check('streak_90', gamification.currentStreak >= 90);
  check('streak_365', gamification.currentStreak >= 365);

  // Badge orari (controllati al momento dell'allenamento)
  const now = new Date();
  const hour = now.getHours();
  check('early_bird', hour < 8 && gamification.totalWorkouts >= 1);
  check('night_owl', hour >= 21 && gamification.totalWorkouts >= 1);

  // Badge diario
  check('diary_writer', gamification.totalDiaryEntries >= 1);
  check('diary_faithful', gamification.totalDiaryEntries >= 30);

  return newBadges;
};

// --- Aggiorna dopo un allenamento completato ---
export const updateAfterWorkout = async (
  studentId: string
): Promise<StudentGamification> => {
  const gamification = await getStudentGamification(studentId);
  const now = new Date();

  // Incrementa totale allenamenti
  gamification.totalWorkouts += 1;

  // Aggiorna streak
  if (gamification.lastWorkoutDate) {
    const lastDate = gamification.lastWorkoutDate instanceof Date
      ? gamification.lastWorkoutDate
      : new Date(gamification.lastWorkoutDate);

    if (isToday(lastDate)) {
      // Già allenato oggi, nessun cambiamento streak
    } else if (isYesterday(lastDate)) {
      // Allenamento consecutivo
      gamification.currentStreak += 1;
    } else {
      // Streak interrotta
      gamification.currentStreak = 1;
    }
  } else {
    // Primo allenamento
    gamification.currentStreak = 1;
  }

  // Aggiorna record streak
  if (gamification.currentStreak > gamification.longestStreak) {
    gamification.longestStreak = gamification.currentStreak;
  }

  gamification.lastWorkoutDate = now;

  // Calcola XP: +50 per allenamento, +20 bonus per giorno di streak
  let xpGained = 50;
  if (gamification.currentStreak > 1) {
    xpGained += 20;
  }
  gamification.xp += xpGained;

  // Ricalcola livello
  gamification.level = calculateLevel(gamification.xp);

  // Controlla badge
  const newBadges = checkAndAwardBadges(gamification);
  gamification.badges = [...gamification.badges, ...newBadges];

  gamification.updatedAt = now;

  // Salva su Firestore
  await updateDoc(doc(db, GAMIFICATION_COLLECTION, gamification.id), {
    totalWorkouts: gamification.totalWorkouts,
    currentStreak: gamification.currentStreak,
    longestStreak: gamification.longestStreak,
    lastWorkoutDate: Timestamp.fromDate(now),
    xp: gamification.xp,
    level: gamification.level,
    badges: gamification.badges.map((b) => ({
      ...b,
      unlockedAt: b.unlockedAt ? Timestamp.fromDate(b.unlockedAt) : null,
    })),
    updatedAt: Timestamp.now(),
  });

  return gamification;
};

// --- Aggiorna dopo una nuova nota nel diario ---
export const updateAfterDiaryEntry = async (
  studentId: string
): Promise<StudentGamification> => {
  const gamification = await getStudentGamification(studentId);

  // Incrementa totale note diario
  gamification.totalDiaryEntries += 1;

  // +10 XP per nota diario
  gamification.xp += 10;
  gamification.level = calculateLevel(gamification.xp);

  // Controlla badge diario
  const newBadges = checkAndAwardBadges(gamification);
  gamification.badges = [...gamification.badges, ...newBadges];

  gamification.updatedAt = new Date();

  // Salva su Firestore
  await updateDoc(doc(db, GAMIFICATION_COLLECTION, gamification.id), {
    totalDiaryEntries: gamification.totalDiaryEntries,
    xp: gamification.xp,
    level: gamification.level,
    badges: gamification.badges.map((b) => ({
      ...b,
      unlockedAt: b.unlockedAt ? Timestamp.fromDate(b.unlockedAt) : null,
    })),
    updatedAt: Timestamp.now(),
  });

  return gamification;
};
