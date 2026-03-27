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
export interface Owner extends User {
  role: 'owner';
  assignedStudents: string[]; // allievi diretti seguiti dall'owner come Personal
  specializations: string[];
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
  assignedCollaboratorId: string; // coach o manager che lo segue direttamente
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
  // Se cancellato < 10 ore prima => considerato eseguito
  isCountedAsCompleted: boolean;
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
export type PaymentType = 'full' | 'installment';
export type PaymentStatus = 'pending' | 'paid' | 'overdue';

export interface PaymentPlan {
  id: string;
  studentId: string;
  collaboratorId: string;
  totalAmount: number;
  paymentType: PaymentType;
  installments: Installment[];
  createdAt: Date;
}

export interface Installment {
  id: string;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: PaymentStatus;
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
  participants: string[]; // user IDs
  type: 'direct' | 'group';
  chatType?: 'training' | 'nutrition'; // tipo di chat: allenamento o nutrizione
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
export type ContentType = 'podcast' | 'video' | 'article' | 'resource';

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
  sideImageUrl: string;
  backImageUrl: string;
  findings: PosturalFinding[];
  overallNotes: string;
  recommendations: string;
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
  cancelledAt?: Date;
  isCountedAsCompleted: boolean; // Se cancellato < 10 ore prima
  createdAt: Date;
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

// --- Notifiche ---
export type NotificationType =
  | 'payment_due'
  | 'payment_reminder_week'
  | 'payment_reminder_3days'
  | 'payment_reminder_1day'
  | 'session_reminder'
  | 'new_program'
  | 'new_message'
  | 'session_cancelled'
  | 'new_content';

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
  Content: undefined;
  Chat: undefined;
};

export type ManagerTabParamList = {
  Dashboard: undefined;
  Team: undefined;
  Sessions: undefined;
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
