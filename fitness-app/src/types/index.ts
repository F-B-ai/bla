// ============================================================
// FITNESS COACHING APP - DATA MODELS
// ============================================================

// --- Ruoli utente ---
export type UserRole = 'owner' | 'manager' | 'collaborator' | 'student' | 'academy_student';

// --- Utente base ---
export interface User {
  id: string;
  email: string;
  name: string;
  surname: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: Date;
  isActive: boolean;
}

// --- Titolare (Owner) ---
export interface BankDetails {
  iban: string;
  accountHolder: string;
  bankName: string;
}

export interface Owner extends User {
  role: 'owner';
  assignedStudents: string[]; // allievi diretti seguiti dall'owner come Personal
  specializations: string[];
  bankDetails?: BankDetails;
}

// --- Manager ---
export interface Manager extends User {
  role: 'manager';
  assignedCollaborators: string[]; // collaborator IDs gestiti dal manager
  assignedStudents: string[]; // student IDs (allievi diretti del manager)
  assignedNutritionists: string[]; // nutrizionisti coach sotto il manager nutrizionista
  commissionPercentage: number; // % commissione manager per allievi dei suoi coach
  specializations: string[];
}

// --- Tipo collaboratore ---
export type CollaboratorType = 'coach' | 'nutritionist';

// --- Collaboratore ---
export interface Collaborator extends User {
  role: 'collaborator';
  collaboratorType?: CollaboratorType; // default 'coach' se assente
  commissionPercentage: number; // Es: 60 = il collaboratore tiene il 60%
  specializations: string[];
  assignedStudents: string[]; // student IDs
}

// --- Allievo ---
export interface Student extends User {
  role: 'student';
  assignedCollaboratorIds: string[]; // coach che lo seguono (può avere più coach)
  /** @deprecated usa assignedCollaboratorIds - campo legacy per retrocompatibilità Firestore */
  assignedCollaboratorId?: string;
  assignedManagerId?: string; // manager responsabile (se assegnato a un coach sotto un manager)
  assignedNutritionistId?: string; // nutrizionista coach assegnato
  assignedNutritionManagerId?: string; // manager nutrizionista responsabile
  managerCommissionPercentage?: number; // % commissione per il manager
  coachCommissionPercentage?: number; // % commissione per il coach
  startDate: Date;
  goals: string;
  medicalNotes?: string;
  nutritionalConsultations: number;
}

// --- Studente Academy ---
export interface AcademyStudent extends User {
  role: 'academy_student';
}

// --- Sessione di allenamento ---
export type SessionStatus = 'scheduled' | 'completed' | 'cancelled_by_student' | 'cancelled_late' | 'no_show';

export interface TrainingSession {
  id: string;
  studentId: string;
  collaboratorId: string;
  date: Date;
  startTime: string; // "09:00"
  endTime: string;   // "10:00"
  status: SessionStatus;
  program?: TrainingProgram;
  notes: string;
  cancelledAt?: Date;
  sessionCost?: number;
  // Se cancellato < 10 ore prima => considerato eseguito
  isCountedAsCompleted: boolean;
  /** true quando la seduta ha già scalato una lezione dal percorso:
   *  impedisce di toglierne una seconda se si rimarca «completata». */
  planDecremented?: boolean;
}

// --- Programma di allenamento ---
export interface TrainingProgram {
  id: string;
  studentId: string;
  collaboratorId: string;
  createdAt: Date;
  title: string;
  description: string;
  exercises: Exercise[];
  sessionNumber: number;
  progressNotes: string;
}

// --- Esercizio ---
export type ExerciseTechnique =
  | 'standard'
  | 'rest_pause'
  | 'rest_pause_failure'
  | 'stripping'
  | 'pyramid'
  | 'tempo'
  | 'myo_reps'
  | 'isometric'
  | 'twentyone'
  | 'cluster'
  | 'negative'
  | 'emom'
  | 'cumulative'
  | 'superset'
  | 'compound_set'
  | 'giant_set';

// Esercizio concatenato dentro una Serie Gigante
export interface GiantSetExercise {
  name: string;
  reps: string;
}

export interface Exercise {
  id: string;
  name: string;
  description: string;
  sets: number;
  reps: string; // "12" o "8-12" o "AMRAP"
  restSeconds: number;
  videoUrl?: string;
  imageUrl?: string;
  notes: string;
  category: ExerciseCategory;
  technique?: ExerciseTechnique;
  // Serie Interrotte (rest-pause)
  miniSets?: number;
  miniReps?: string;
  miniRestSeconds?: number;
  // Rest-Pause a cedimento: solo la prima serie ha un target,
  // le mini-serie dopo ogni pausa sono a cedimento (reps libere)
  rpPauses?: number;
  rpRestSeconds?: number;
  // Super Set (antagonista) / Superflusso (stesso muscolo):
  // secondo esercizio eseguito SUBITO dopo, senza pausa
  pairedExerciseName?: string;
  pairedReps?: string;
  // Serie Gigante: N esercizi concatenati senza pausa;
  // la pausa tra un giro e l'altro è restSeconds dell'esercizio
  giantExercises?: GiantSetExercise[];
  // Stripping (drop sets)
  stripDrops?: number;
  stripRepsPerDrop?: string;
  stripMaxDropPct?: number;
  // Piramidali
  pyramidType?: 'ascending' | 'descending' | 'triangular';
  // Tempo controllato (es. "4-1-2-0" = 4s ecc, 1s pausa bassa, 2s conc, 0s pausa alta)
  tempoNotation?: string;
  // Myo-reps
  myoActivationReps?: string;
  myoMiniReps?: string;
  myoMiniSets?: number;
  myoRestSeconds?: number;
  // Isometria
  isometricHoldSeconds?: number;
  // Cluster set
  clusterReps?: number;
  clusterSets?: number;
  clusterRestSeconds?: number;
  // Negativa enfatizzata
  negativeSeconds?: number;
  // EMOM
  emomMinutes?: number;
  emomRepsPerMinute?: string;
  // Serie cumulative "a scala" (1 rip → attesa → 2 rip → attesa → ... → obiettivo)
  cumulativeTargetReps?: number;   // gradino più alto (es. 10)
  cumulativeRestSeconds?: number;  // attesa tra un gradino e l'altro
  // Superset/Giant set grouping
  supersetGroupId?: string;
}

export type ExerciseCategory =
  | 'forza'
  | 'cardio'
  | 'mobilita'
  | 'stretching'
  | 'funzionale'
  | 'posturale'
  | 'altro';

// --- Programmazione (piano settimanale/mensile) ---
export interface WorkoutPlan {
  id: string;
  studentId: string;
  collaboratorId: string;
  title: string;
  startDate: Date;
  endDate: Date;
  weeklySchedule: WeeklyDay[];
  createdAt: Date;
  isActive: boolean;
}

export interface WeeklyDay {
  dayOfWeek: number; // 0=Lunedì, 6=Domenica
  exercises: Exercise[];
  notes: string;
}

// --- Pagamenti e rate ---
export type PaymentType = 'full' | 'installment' | 'monthly_course';
export type PaymentStatus = 'pending' | 'paid' | 'overdue';

export interface PaymentPlan {
  id: string;
  studentId: string;
  collaboratorId: string;
  totalAmount: number;
  paymentType: PaymentType;
  installments: Installment[];
  createdAt: Date;
  // Percorso: lezioni e consulenze incluse
  includedLessons: number;
  usedLessons: number;
  includedConsultations: number;
  usedConsultations: number;
  startDate: Date;
  endDate: Date;
  // Corso mensile (only for paymentType === 'monthly_course')
  courseType?: string;
  subscriptionType?: string;
}

export interface Installment {
  id: string;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: PaymentStatus;
  receiptUrl?: string;
  transferPending?: boolean;
  transferMarkedAt?: Date;
}

// --- Calcolo commissione collaboratore ---
export interface CollaboratorEarning {
  collaboratorId: string;
  paymentPlanId: string;
  studentId: string;
  totalPaid: number;
  collaboratorShare: number; // Percentuale del collaboratore
  ownerShare: number;        // Da versare al titolare
  period: string;            // "2026-03"
}

// --- Sezione economica del titolare ---
export type TransactionType = 'income' | 'expense';
export type TransactionCategory =
  | 'collaborator_payment'
  | 'student_payment'
  | 'rent'
  | 'equipment'
  | 'marketing'
  | 'insurance'
  | 'utilities'
  | 'other';

export interface FinancialTransaction {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description: string;
  date: Date;
  collaboratorId?: string;
  studentId?: string;
  receiptUrl?: string;
}

// --- Chat ---
export interface ChatRoom {
  id: string;
  participants: string[];
  type: 'direct' | 'group';
  chatType?: 'training' | 'nutrition' | 'team';
  name?: string;
  createdAt: Date;
  lastMessage?: ChatMessage;
  studentId: string;
  collaboratorId: string;
}

export interface ChatMessage {
  id: string;
  chatRoomId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
  isAnonymousOwner: boolean; // Se il titolare sta leggendo in anonimo
  readBy: string[];
  attachmentUrl?: string;
}

// --- Contenuti speciali ---
export type ContentType = 'podcast' | 'video' | 'article' | 'resource' | 'pdf' | 'audio';

export interface SpecialContent {
  id: string;
  title: string;
  description: string;
  type: ContentType;
  url: string;
  thumbnailUrl?: string;
  createdBy: string; // user ID
  createdAt: Date;
  assignedTo: string[]; // student IDs (vuoto = tutti)
  tags: string[];
}

// --- Diario allievo ---
export interface DiaryEntry {
  id: string;
  studentId: string;
  date: Date;
  content: string;
  mood?: 'great' | 'good' | 'ok' | 'tired' | 'bad';
  painLevel?: number; // 0-10
  createdAt: Date;
}

// --- Test posturale ---
export interface PosturalAssessment {
  id: string;
  studentId: string;
  assessorId: string; // chi fa la valutazione
  date: Date;
  frontImageUrl: string;
  sideLeftImageUrl: string;
  sideRightImageUrl: string;
  backImageUrl: string;
  findings: PosturalFinding[];
  overallNotes: string;
  recommendations: string;
  aiAnalysis?: string;
  aiRecommendations?: string[];
  aiExerciseProgram?: string[];
  comparisonNotes?: string;
}

export interface PosturalFinding {
  area: PosturalArea;
  observation: string;
  severity: 'normal' | 'mild' | 'moderate' | 'severe';
  imageAnnotations?: ImageAnnotation[];
}

export type PosturalArea =
  | 'head_neck'
  | 'shoulders'
  | 'upper_back'
  | 'lower_back'
  | 'pelvis'
  | 'knees'
  | 'ankles_feet'
  | 'spine_alignment';

export interface ImageAnnotation {
  x: number;
  y: number;
  label: string;
  color: string;
}

// --- Consulenza nutrizionale ---
export interface NutritionalConsultation {
  id: string;
  studentId: string;
  collaboratorId: string;
  date: Date;
  notes: string;
  recommendations: string;
  nextAppointment?: Date;
}

// --- Nutrizionista ---
export type NutritionistAppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'cancelled_late';

export interface NutritionistAppointment {
  id: string;
  studentId: string;
  nutritionistId?: string; // nutrizionista coach che gestisce la visita
  nutritionManagerId?: string; // manager nutrizionista responsabile
  date: Date;
  startTime: string; // "09:00"
  endTime: string;   // "10:00"
  status: NutritionistAppointmentStatus;
  notes: string;
  sessionCost?: number;
  cancelledAt?: Date;
  isCountedAsCompleted: boolean; // Se cancellato < 10 ore prima
  createdAt: Date;
  /** true quando la visita ha già scalato una consulenza dal percorso */
  planDecremented?: boolean;
}

export interface BodyMeasurement {
  id: string;
  studentId: string;
  date: Date;
  weight?: number;       // kg
  height?: number;       // cm
  bodyFat?: number;      // %
  muscleMass?: number;   // kg
  waist?: number;        // cm
  hips?: number;         // cm
  chest?: number;        // cm
  arms?: number;         // cm
  thighs?: number;       // cm
  notes: string;
  createdAt: Date;
}

export interface BiaDocument {
  id: string;
  studentId: string;
  date: Date;
  pdfUrl: string;
  fileName: string;
  notes: string;
  createdAt: Date;
}

// --- Team Nutrizionisti (bacheca condivisa) ---
export type NutritionNoteCategory = 'protocollo' | 'linea_guida' | 'aggiornamento' | 'caso_studio' | 'altro';

export interface NutritionTeamNote {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  category: NutritionNoteCategory;
  isPinned: boolean;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: Date;
  updatedAt: Date;
}

// --- Richieste modifica credenziali ---
export type CredentialRequestStatus = 'pending' | 'approved' | 'denied';
export type CredentialRequestType = 'email' | 'password' | 'info';

export interface CredentialChangeRequest {
  id: string;
  userId: string;
  userName: string;
  userSurname: string;
  requestType: CredentialRequestType;
  currentEmail: string;
  newEmail?: string;
  newPassword?: string;
  newInfo?: string;
  status: CredentialRequestStatus;
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  denialReason?: string;
}

// --- Task giornalieri (solo owner) ---
export type TaskPriority = 'low' | 'medium' | 'high';

export interface DailyTask {
  id: string;
  ownerId: string;
  date: Date;
  title: string;
  description: string;
  priority: TaskPriority;
  isCompleted: boolean;
  completedAt?: Date;
  createdAt: Date;
  startTime?: string;
  endTime?: string;
}

// --- Notifiche ---
export type NotificationType =
  | 'payment_due'
  | 'payment_reminder_15days'
  | 'payment_reminder_week'
  | 'payment_reminder_3days'
  | 'payment_reminder_1day'
  | 'session_reminder'
  | 'new_program'
  | 'new_message'
  | 'session_cancelled'
  | 'new_content'
  | 'workout_renewal'
  | 'custom_alert'
  | 'badge_milestone';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: Date;
}

// --- Academy (FB Mind Movement Academy) ---
export type AcademyCourseCategory = 'mind' | 'movement' | 'nutrition' | 'lifestyle' | 'recovery';

export type AcademyLessonType = 'video' | 'audio' | 'article' | 'exercise' | 'pdf' | 'quiz';

export interface AcademyCourse {
  id: string;
  title: string;
  description: string;
  category: AcademyCourseCategory;
  thumbnailUrl?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPublished: boolean;
  assignedTo: string[]; // student IDs (vuoto = tutti)
  tags: string[];
  lessonsCount: number;
  durationMinutes: number; // durata totale stimata
  order: number; // ordine di visualizzazione
}

export interface AcademyModule {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  createdAt: Date;
}

export interface AcademyLesson {
  id: string;
  courseId: string;
  moduleId?: string; // opzionale per compatibilità
  title: string;
  description: string;
  type: AcademyLessonType;
  contentUrl: string; // URL video/audio/articolo
  thumbnailUrl?: string;
  durationMinutes: number;
  order: number;
  isFree: boolean; // lezione gratuita/anteprima
  createdAt: Date;
}

export interface AcademyProgress {
  id: string;
  studentId: string;
  courseId: string;
  lessonId: string;
  completedAt: Date;
  progressPercent: number; // 0-100
}

// --- Quiz Academy ---
export interface AcademyQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

export interface AcademyQuiz {
  id: string;
  lessonId: string;
  courseId: string;
  questions: AcademyQuizQuestion[];
  passingScore: number; // percentuale minima per superare (es. 70)
  createdAt: Date;
}

export interface AcademyQuizAttempt {
  id: string;
  studentId: string;
  quizId: string;
  lessonId: string;
  courseId: string;
  answers: number[]; // indice risposta scelta per ogni domanda
  score: number; // percentuale corrette
  passed: boolean;
  completedAt: Date;
}

// --- Note studente per lezione ---
export interface AcademyNote {
  id: string;
  studentId: string;
  lessonId: string;
  courseId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// --- Valutazione corso ---
export interface AcademyRating {
  id: string;
  studentId: string;
  courseId: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: Date;
}

// --- Certificato completamento ---
export interface AcademyCertificate {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  completedAt: Date;
  certificateCode: string; // codice univoco
}

// --- Workout Log (registrazione serie in tempo reale) ---
export type WorkoutLogStatus = 'in_progress' | 'completed' | 'abandoned';

export interface WorkoutLog {
  id: string;
  studentId: string;
  collaboratorId: string;
  workoutPlanId?: string;
  dayOfWeek: number;
  date: Date;
  startedAt: Date;
  completedAt?: Date;
  status: WorkoutLogStatus;
  exerciseLogs: ExerciseLog[];
  notes: string;
  durationMinutes?: number;
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  targetSets: number;
  targetReps: string;
  sets: SetLog[];
  technique?: ExerciseTechnique;
  // Serie Interrotte (rest-pause)
  targetMiniSets?: number;
  targetMiniReps?: string;
  targetMiniRestSeconds?: number;
  // Rest-Pause a cedimento
  targetRpPauses?: number;
  targetRpRestSeconds?: number;
  // Super Set / Superflusso
  targetPairedExerciseName?: string;
  targetPairedReps?: string;
  // Serie Gigante
  targetGiantExercises?: GiantSetExercise[];
  // Stripping (drop sets)
  targetStripDrops?: number;
  targetStripRepsPerDrop?: string;
  targetStripMaxDropPct?: number;
  // Piramidali
  targetPyramidType?: 'ascending' | 'descending' | 'triangular';
  // Tempo controllato
  targetTempoNotation?: string;
  // Myo-reps
  targetMyoActivationReps?: string;
  targetMyoMiniReps?: string;
  targetMyoMiniSets?: number;
  targetMyoRestSeconds?: number;
  // Isometria
  targetIsometricHoldSeconds?: number;
  // Cluster set
  targetClusterReps?: number;
  targetClusterSets?: number;
  targetClusterRestSeconds?: number;
  // Serie cumulative
  targetCumulativeReps?: number;
  targetCumulativeRestSeconds?: number;
  // Negativa enfatizzata
  targetNegativeSeconds?: number;
  // EMOM
  targetEmomMinutes?: number;
  targetEmomRepsPerMinute?: string;
  // Superset
  supersetGroupId?: string;
}

// Dettaglio singola mini serie (per Serie Interrotte) o parte di una
// serie concatenata (Super Set / Superflusso / Serie Gigante)
export interface MiniSetLog {
  reps: number;
  restSeconds: number; // recupero preso dopo questa mini serie (0 per l'ultima)
  weight?: number; // peso della singola parte (tecniche con esercizi diversi)
  label?: string; // nome dell'esercizio della parte (tecniche concatenate)
}

// Dettaglio singolo drop (per Stripping)
export interface DropSetLog {
  weight: number; // peso usato in questo drop (kg)
  reps: number; // ripetizioni eseguite
}

export interface SetLog {
  setNumber: number;
  reps: number;
  weight: number; // kg
  completed: boolean;
  rpe?: number; // Rate of Perceived Exertion 1-10
  notes?: string;
  completedAt: Date;
  // Serie Interrotte: dettaglio mini serie completate
  miniSetsCompleted?: number;
  miniSetDetails?: MiniSetLog[];
  // Stripping: dettaglio drop completati
  dropSetsCompleted?: number;
  dropSetDetails?: DropSetLog[];
  // Isometria: tempo di tenuta effettivo
  holdSeconds?: number;
}

// --- Gamification ---
export type BadgeId =
  // Allenamenti (10)
  | 'first_workout' | 'five_workouts' | 'ten_workouts' | 'twenty_five_workouts'
  | 'fifty_workouts' | 'seventy_five_workouts' | 'hundred_workouts'
  | 'hundred_fifty_workouts' | 'two_hundred_workouts' | 'five_hundred_workouts'
  // Costanza / Streak (10)
  | 'streak_3' | 'streak_7' | 'streak_14' | 'streak_21' | 'streak_30'
  | 'streak_60' | 'streak_90' | 'streak_180' | 'streak_270' | 'streak_365'
  // Diario (8)
  | 'diary_writer' | 'diary_seven' | 'diary_fifteen' | 'diary_faithful'
  | 'diary_fifty' | 'diary_hundred' | 'diary_two_hundred' | 'diary_365'
  // Orari (4)
  | 'early_bird' | 'night_owl' | 'lunch_trainer' | 'dawn_warrior'
  // Programmi (5)
  | 'first_program' | 'three_programs' | 'five_programs' | 'ten_programs' | 'twenty_programs'
  // Livelli (5)
  | 'level_5' | 'level_10' | 'level_15' | 'level_20' | 'level_25'
  // XP (5)
  | 'xp_500' | 'xp_1000' | 'xp_2500' | 'xp_5000' | 'xp_10000'
  // Speciali (3)
  | 'payment_punctual' | 'heavy_lifter' | 'consistency_king';

export interface Badge {
  id: BadgeId;
  name: string;
  description: string;
  icon: string; // emoji
  unlockedAt?: Date;
}

export interface StudentGamification {
  id: string;
  studentId: string;
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate?: Date;
  totalWorkouts: number;
  totalDiaryEntries: number;
  badges: Badge[];
  level: number;
  xp: number;
  updatedAt: Date;
}

// --- Stima composizione corporea ---
export interface BodyCompositionEstimate {
  id: string;
  studentId: string;
  assessorId: string;
  date: Date;
  frontImageUrl: string;
  sideLeftImageUrl: string;
  sideRightImageUrl: string;
  backImageUrl: string;
  estimatedBodyFat?: number;
  estimatedMuscleMass?: string;
  muscleDistribution?: string;
  aiAnalysis: string;
  recommendations: string[];
  createdAt: Date;
}

// --- Navigation types ---
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  OwnerTabs: undefined;
  ManagerTabs: undefined;
  CollaboratorTabs: undefined;
  StudentTabs: undefined;
};

export type OwnerTabParamList = {
  Dashboard: undefined;
  Team: undefined;
  Sessions: undefined;
  Financial: undefined;
  Pagamenti: undefined;
  Content: undefined;
  Chat: undefined;
};

export type ManagerTabParamList = {
  Dashboard: undefined;
  Team: undefined;
  Sessions: undefined;
  Pagamenti: undefined;
  Content: undefined;
  Chat: undefined;
};

export type CollaboratorTabParamList = {
  MyStudents: undefined;
  Schedule: undefined;
  Programs: undefined;
  Postura: undefined;
  Earnings: undefined;
  Chat: undefined;
};

export type StudentTabParamList = {
  MyProgram: undefined;
  Sessions: undefined;
  Diary: undefined;
  Payments: undefined;
  Content: undefined;
  Chat: undefined;
};
