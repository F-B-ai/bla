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
import { createNotification } from './notificationService';
import { getOwner } from './authService';

const GAMIFICATION_COLLECTION = 'gamification';

const PRIZE_THRESHOLDS: Record<number, string> = {
  15: 'Sessione di Mindfulness Personalizzata',
  30: 'T-Shirt Esclusiva Mind Movement Lab',
  40: 'Sessione di Myofascial Release & Mobility',
  50: 'Sessione di Personal Training 1-on-1',
};

const notifyOwnerOfMilestone = async (
  studentId: string,
  totalBadges: number
): Promise<void> => {
  const prize = PRIZE_THRESHOLDS[totalBadges];
  if (!prize) return;
  try {
    const owner = await getOwner();
    if (!owner) return;
    const usersSnapshot = await getDocs(
      query(collection(db, 'users'), where('__name__', '==', studentId))
    );
    const studentName = usersSnapshot.empty
      ? 'Un allievo'
      : (usersSnapshot.docs[0].data().displayName as string) || 'Un allievo';
    await createNotification(
      owner.id,
      'badge_milestone',
      `🏆 Traguardo ${totalBadges}/50 raggiunto!`,
      `${studentName} ha sbloccato ${totalBadges} traguardi e ha vinto: ${prize}`,
      { studentId, milestone: String(totalBadges) }
    );
  } catch {
    // Non bloccare il flusso se la notifica fallisce
  }
};

// --- Definizioni badge (50 traguardi) ---
const BADGE_DEFINITIONS: Record<BadgeId, Omit<Badge, 'unlockedAt'>> = {
  // === ALLENAMENTI (10) ===
  first_workout: {
    id: 'first_workout',
    name: 'Prima Sessione',
    description: 'Hai completato il tuo primo allenamento!',
    icon: '🏋️',
  },
  five_workouts: {
    id: 'five_workouts',
    name: 'Primi Passi',
    description: '5 allenamenti completati!',
    icon: '👟',
  },
  ten_workouts: {
    id: 'ten_workouts',
    name: 'Decathleta',
    description: '10 allenamenti completati!',
    icon: '💪',
  },
  twenty_five_workouts: {
    id: 'twenty_five_workouts',
    name: 'Costante',
    description: '25 allenamenti completati!',
    icon: '⚡',
  },
  fifty_workouts: {
    id: 'fifty_workouts',
    name: 'Guerriero',
    description: '50 allenamenti completati!',
    icon: '⚔️',
  },
  seventy_five_workouts: {
    id: 'seventy_five_workouts',
    name: 'Instancabile',
    description: '75 allenamenti completati!',
    icon: '🔋',
  },
  hundred_workouts: {
    id: 'hundred_workouts',
    name: 'Leggenda',
    description: '100 allenamenti completati!',
    icon: '👑',
  },
  hundred_fifty_workouts: {
    id: 'hundred_fifty_workouts',
    name: 'Titano',
    description: '150 allenamenti completati!',
    icon: '🗿',
  },
  two_hundred_workouts: {
    id: 'two_hundred_workouts',
    name: 'Immortale',
    description: '200 allenamenti completati!',
    icon: '⭐',
  },
  five_hundred_workouts: {
    id: 'five_hundred_workouts',
    name: 'Olimpionico',
    description: '500 allenamenti completati!',
    icon: '🏛️',
  },

  // === COSTANZA / STREAK (10) ===
  streak_3: {
    id: 'streak_3',
    name: 'Tre di Fila',
    description: '3 giorni consecutivi!',
    icon: '🎯',
  },
  streak_7: {
    id: 'streak_7',
    name: 'Settimana Perfetta',
    description: '7 giorni di fila!',
    icon: '🔥',
  },
  streak_14: {
    id: 'streak_14',
    name: 'Due Settimane',
    description: '14 giorni consecutivi!',
    icon: '💫',
  },
  streak_21: {
    id: 'streak_21',
    name: 'Tre Settimane',
    description: '21 giorni consecutivi!',
    icon: '🌊',
  },
  streak_30: {
    id: 'streak_30',
    name: 'Mese di Fuoco',
    description: '30 giorni consecutivi!',
    icon: '🌟',
  },
  streak_60: {
    id: 'streak_60',
    name: 'Bimestre di Ferro',
    description: '60 giorni consecutivi!',
    icon: '🛡️',
  },
  streak_90: {
    id: 'streak_90',
    name: "Trimestre d'Oro",
    description: '90 giorni consecutivi!',
    icon: '🏆',
  },
  streak_180: {
    id: 'streak_180',
    name: 'Sei Mesi di Acciaio',
    description: '180 giorni consecutivi!',
    icon: '⚜️',
  },
  streak_270: {
    id: 'streak_270',
    name: 'Nove Mesi di Disciplina',
    description: '270 giorni consecutivi!',
    icon: '🔱',
  },
  streak_365: {
    id: 'streak_365',
    name: 'Inarrestabile',
    description: '365 giorni di fila!',
    icon: '💎',
  },

  // === DIARIO (8) ===
  diary_writer: {
    id: 'diary_writer',
    name: 'Scrittore',
    description: 'Prima nota nel diario',
    icon: '✏️',
  },
  diary_seven: {
    id: 'diary_seven',
    name: 'Cronista',
    description: '7 note nel diario',
    icon: '📝',
  },
  diary_fifteen: {
    id: 'diary_fifteen',
    name: 'Narratore',
    description: '15 note nel diario',
    icon: '📖',
  },
  diary_faithful: {
    id: 'diary_faithful',
    name: 'Diarista Fedele',
    description: '30 note nel diario',
    icon: '📓',
  },
  diary_fifty: {
    id: 'diary_fifty',
    name: 'Memorialista',
    description: '50 note nel diario',
    icon: '📚',
  },
  diary_hundred: {
    id: 'diary_hundred',
    name: 'Biografo',
    description: '100 note nel diario',
    icon: '🖋️',
  },
  diary_two_hundred: {
    id: 'diary_two_hundred',
    name: 'Storico',
    description: '200 note nel diario',
    icon: '📜',
  },
  diary_365: {
    id: 'diary_365',
    name: 'Diario Completo',
    description: '365 note nel diario',
    icon: '🏅',
  },

  // === ORARI (4) ===
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
  lunch_trainer: {
    id: 'lunch_trainer',
    name: 'Pausa Attiva',
    description: 'Allenamento in pausa pranzo (12-14)',
    icon: '🌞',
  },
  dawn_warrior: {
    id: 'dawn_warrior',
    name: "Guerriero dell'Alba",
    description: 'Allenamento prima delle 6:00',
    icon: '🌄',
  },

  // === PROGRAMMI (5) ===
  first_program: {
    id: 'first_program',
    name: 'Inizio Percorso',
    description: 'Primo programma completato',
    icon: '📋',
  },
  three_programs: {
    id: 'three_programs',
    name: 'Esploratore',
    description: '3 programmi completati',
    icon: '🧭',
  },
  five_programs: {
    id: 'five_programs',
    name: 'Veterano',
    description: '5 programmi completati',
    icon: '🎯',
  },
  ten_programs: {
    id: 'ten_programs',
    name: 'Maestro',
    description: '10 programmi completati',
    icon: '🎓',
  },
  twenty_programs: {
    id: 'twenty_programs',
    name: 'Gran Maestro',
    description: '20 programmi completati',
    icon: '🏰',
  },

  // === LIVELLI (5) ===
  level_5: {
    id: 'level_5',
    name: 'Livello 5',
    description: 'Hai raggiunto il livello 5!',
    icon: '🎖️',
  },
  level_10: {
    id: 'level_10',
    name: 'Doppia Cifra',
    description: 'Hai raggiunto il livello 10!',
    icon: '🔟',
  },
  level_15: {
    id: 'level_15',
    name: 'Esperto',
    description: 'Hai raggiunto il livello 15!',
    icon: '🧠',
  },
  level_20: {
    id: 'level_20',
    name: 'Élite',
    description: 'Hai raggiunto il livello 20!',
    icon: '💠',
  },
  level_25: {
    id: 'level_25',
    name: 'Supremo',
    description: 'Hai raggiunto il livello 25!',
    icon: '👁️',
  },

  // === XP (5) ===
  xp_500: {
    id: 'xp_500',
    name: 'Primo Traguardo XP',
    description: 'Hai accumulato 500 XP!',
    icon: '🎪',
  },
  xp_1000: {
    id: 'xp_1000',
    name: 'Mille Punti',
    description: 'Hai accumulato 1.000 XP!',
    icon: '✨',
  },
  xp_2500: {
    id: 'xp_2500',
    name: 'Accumulatore',
    description: 'Hai accumulato 2.500 XP!',
    icon: '💰',
  },
  xp_5000: {
    id: 'xp_5000',
    name: 'XP Master',
    description: 'Hai accumulato 5.000 XP!',
    icon: '💫',
  },
  xp_10000: {
    id: 'xp_10000',
    name: 'Leggendario',
    description: 'Hai accumulato 10.000 XP!',
    icon: '🌠',
  },

  // === SPECIALI (3) ===
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
  check('five_workouts', gamification.totalWorkouts >= 5);
  check('ten_workouts', gamification.totalWorkouts >= 10);
  check('twenty_five_workouts', gamification.totalWorkouts >= 25);
  check('fifty_workouts', gamification.totalWorkouts >= 50);
  check('seventy_five_workouts', gamification.totalWorkouts >= 75);
  check('hundred_workouts', gamification.totalWorkouts >= 100);
  check('hundred_fifty_workouts', gamification.totalWorkouts >= 150);
  check('two_hundred_workouts', gamification.totalWorkouts >= 200);
  check('five_hundred_workouts', gamification.totalWorkouts >= 500);

  // Badge streak
  check('streak_3', gamification.currentStreak >= 3);
  check('streak_7', gamification.currentStreak >= 7);
  check('streak_14', gamification.currentStreak >= 14);
  check('streak_21', gamification.currentStreak >= 21);
  check('streak_30', gamification.currentStreak >= 30);
  check('streak_60', gamification.currentStreak >= 60);
  check('streak_90', gamification.currentStreak >= 90);
  check('streak_180', gamification.currentStreak >= 180);
  check('streak_270', gamification.currentStreak >= 270);
  check('streak_365', gamification.currentStreak >= 365);

  // Badge diario
  check('diary_writer', gamification.totalDiaryEntries >= 1);
  check('diary_seven', gamification.totalDiaryEntries >= 7);
  check('diary_fifteen', gamification.totalDiaryEntries >= 15);
  check('diary_faithful', gamification.totalDiaryEntries >= 30);
  check('diary_fifty', gamification.totalDiaryEntries >= 50);
  check('diary_hundred', gamification.totalDiaryEntries >= 100);
  check('diary_two_hundred', gamification.totalDiaryEntries >= 200);
  check('diary_365', gamification.totalDiaryEntries >= 365);

  // Badge orari
  const now = new Date();
  const hour = now.getHours();
  check('dawn_warrior', hour < 6 && gamification.totalWorkouts >= 1);
  check('early_bird', hour < 8 && gamification.totalWorkouts >= 1);
  check('lunch_trainer', hour >= 12 && hour < 14 && gamification.totalWorkouts >= 1);
  check('night_owl', hour >= 21 && gamification.totalWorkouts >= 1);

  // Badge livelli
  check('level_5', gamification.level >= 5);
  check('level_10', gamification.level >= 10);
  check('level_15', gamification.level >= 15);
  check('level_20', gamification.level >= 20);
  check('level_25', gamification.level >= 25);

  // Badge XP
  check('xp_500', gamification.xp >= 500);
  check('xp_1000', gamification.xp >= 1000);
  check('xp_2500', gamification.xp >= 2500);
  check('xp_5000', gamification.xp >= 5000);
  check('xp_10000', gamification.xp >= 10000);

  return newBadges;
};

// --- Aggiorna dopo un allenamento completato ---
export const updateAfterWorkout = async (
  studentId: string
): Promise<StudentGamification> => {
  const gamification = await getStudentGamification(studentId);
  const now = new Date();

  gamification.totalWorkouts += 1;

  // Aggiorna streak
  if (gamification.lastWorkoutDate) {
    const lastDate = gamification.lastWorkoutDate instanceof Date
      ? gamification.lastWorkoutDate
      : new Date(gamification.lastWorkoutDate);

    if (isToday(lastDate)) {
      // Già allenato oggi
    } else if (isYesterday(lastDate)) {
      gamification.currentStreak += 1;
    } else {
      gamification.currentStreak = 1;
    }
  } else {
    gamification.currentStreak = 1;
  }

  if (gamification.currentStreak > gamification.longestStreak) {
    gamification.longestStreak = gamification.currentStreak;
  }

  gamification.lastWorkoutDate = now;

  let xpGained = 50;
  if (gamification.currentStreak > 1) {
    xpGained += 20;
  }
  gamification.xp += xpGained;
  gamification.level = calculateLevel(gamification.xp);

  const prevBadgeCount = gamification.badges.length;
  const newBadges = checkAndAwardBadges(gamification);
  gamification.badges = [...gamification.badges, ...newBadges];

  gamification.updatedAt = now;

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

  if (newBadges.length > 0) {
    const totalNow = gamification.badges.length;
    for (const t of Object.keys(PRIZE_THRESHOLDS).map(Number)) {
      if (prevBadgeCount < t && totalNow >= t) {
        notifyOwnerOfMilestone(studentId, t);
      }
    }
  }

  return gamification;
};

// --- Assegna XP generici (es. check-in Stato ESSĒRE) ---
export const awardXp = async (
  studentId: string,
  amount: number
): Promise<void> => {
  const gamification = await getStudentGamification(studentId);
  gamification.xp += amount;
  gamification.level = calculateLevel(gamification.xp);
  const newBadges = checkAndAwardBadges(gamification);
  gamification.badges = [...gamification.badges, ...newBadges];
  await updateDoc(doc(db, GAMIFICATION_COLLECTION, gamification.id), {
    xp: gamification.xp,
    level: gamification.level,
    badges: gamification.badges.map((b) => ({
      ...b,
      unlockedAt: b.unlockedAt ? Timestamp.fromDate(b.unlockedAt) : null,
    })),
    updatedAt: Timestamp.now(),
  });
};

// --- Aggiorna dopo una nuova nota nel diario ---
export const updateAfterDiaryEntry = async (
  studentId: string
): Promise<StudentGamification> => {
  const gamification = await getStudentGamification(studentId);

  gamification.totalDiaryEntries += 1;
  gamification.xp += 10;
  gamification.level = calculateLevel(gamification.xp);

  const prevBadgeCount = gamification.badges.length;
  const newBadges = checkAndAwardBadges(gamification);
  gamification.badges = [...gamification.badges, ...newBadges];

  gamification.updatedAt = new Date();

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

  if (newBadges.length > 0) {
    const totalNow = gamification.badges.length;
    for (const t of Object.keys(PRIZE_THRESHOLDS).map(Number)) {
      if (prevBadgeCount < t && totalNow >= t) {
        notifyOwnerOfMilestone(studentId, t);
      }
    }
  }

  return gamification;
};
