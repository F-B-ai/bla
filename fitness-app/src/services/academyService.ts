import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  doc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../config/firebase';
import {
  AcademyCourse,
  AcademyModule,
  AcademyLesson,
  AcademyProgress,
  AcademyQuiz,
  AcademyQuizAttempt,
  AcademyNote,
  AcademyRating,
  AcademyCertificate,
  AcademyStudent,
} from '../types';

const COURSES_COLLECTION = 'academyCourses';
const MODULES_COLLECTION = 'academyModules';
const LESSONS_COLLECTION = 'academyLessons';
const PROGRESS_COLLECTION = 'academyProgress';
const QUIZZES_COLLECTION = 'academyQuizzes';
const QUIZ_ATTEMPTS_COLLECTION = 'academyQuizAttempts';
const NOTES_COLLECTION = 'academyNotes';
const RATINGS_COLLECTION = 'academyRatings';
const CERTIFICATES_COLLECTION = 'academyCertificates';

// ─── Corsi ───

export const addCourse = async (
  course: Omit<AcademyCourse, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, COURSES_COLLECTION), {
    ...course,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateCourse = async (
  courseId: string,
  data: Partial<AcademyCourse>
): Promise<void> => {
  await updateDoc(doc(db, COURSES_COLLECTION, courseId), {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteCourse = async (courseId: string): Promise<void> => {
  // Elimina tutti i moduli del corso
  const modulesSnap = await getDocs(
    query(collection(db, MODULES_COLLECTION), where('courseId', '==', courseId))
  );
  for (const moduleDoc of modulesSnap.docs) {
    await deleteDoc(moduleDoc.ref);
  }
  // Elimina tutte le lezioni del corso
  const lessonsSnap = await getDocs(
    query(collection(db, LESSONS_COLLECTION), where('courseId', '==', courseId))
  );
  for (const lessonDoc of lessonsSnap.docs) {
    await deleteDoc(lessonDoc.ref);
  }
  await deleteDoc(doc(db, COURSES_COLLECTION, courseId));
};

export const getAllCourses = async (): Promise<AcademyCourse[]> => {
  const snapshot = await getDocs(
    query(collection(db, COURSES_COLLECTION), orderBy('order', 'asc'))
  );
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as AcademyCourse));
};

export const getCoursesForStudent = async (
  studentId: string
): Promise<AcademyCourse[]> => {
  const snapshot = await getDocs(
    query(collection(db, COURSES_COLLECTION), orderBy('order', 'asc'))
  );
  return snapshot.docs
    .map((d) => ({ ...d.data(), id: d.id } as AcademyCourse))
    .filter(
      (c) =>
        c.isPublished &&
        (c.assignedTo.length === 0 || c.assignedTo.includes(studentId))
    );
};

// ─── Moduli ───

export const addModule = async (
  module: Omit<AcademyModule, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, MODULES_COLLECTION), {
    ...module,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateModule = async (
  moduleId: string,
  data: Partial<AcademyModule>
): Promise<void> => {
  await updateDoc(doc(db, MODULES_COLLECTION, moduleId), data);
};

export const deleteModule = async (moduleId: string): Promise<void> => {
  // Rimuovi moduleId dalle lezioni associate
  const lessonsSnap = await getDocs(
    query(collection(db, LESSONS_COLLECTION), where('moduleId', '==', moduleId))
  );
  for (const lessonDoc of lessonsSnap.docs) {
    await updateDoc(lessonDoc.ref, { moduleId: '' });
  }
  await deleteDoc(doc(db, MODULES_COLLECTION, moduleId));
};

export const getCourseModules = async (
  courseId: string
): Promise<AcademyModule[]> => {
  const snapshot = await getDocs(
    query(
      collection(db, MODULES_COLLECTION),
      where('courseId', '==', courseId),
      orderBy('order', 'asc')
    )
  );
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as AcademyModule));
};

// ─── Lezioni ───

export const addLesson = async (
  lesson: Omit<AcademyLesson, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, LESSONS_COLLECTION), {
    ...lesson,
    createdAt: Timestamp.now(),
  });
  // Aggiorna conteggio lezioni nel corso
  const courseRef = doc(db, COURSES_COLLECTION, lesson.courseId);
  const courseSnap = await getDoc(courseRef);
  if (courseSnap.exists()) {
    const current = courseSnap.data();
    await updateDoc(courseRef, {
      lessonsCount: (current.lessonsCount || 0) + 1,
      durationMinutes: (current.durationMinutes || 0) + lesson.durationMinutes,
      updatedAt: Timestamp.now(),
    });
  }
  return docRef.id;
};

export const updateLesson = async (
  lessonId: string,
  data: Partial<AcademyLesson>
): Promise<void> => {
  await updateDoc(doc(db, LESSONS_COLLECTION, lessonId), data);
};

export const deleteLesson = async (lessonId: string): Promise<void> => {
  const lessonSnap = await getDoc(doc(db, LESSONS_COLLECTION, lessonId));
  if (lessonSnap.exists()) {
    const lesson = lessonSnap.data();
    // Aggiorna conteggio nel corso
    const courseRef = doc(db, COURSES_COLLECTION, lesson.courseId);
    const courseSnap = await getDoc(courseRef);
    if (courseSnap.exists()) {
      const current = courseSnap.data();
      await updateDoc(courseRef, {
        lessonsCount: Math.max(0, (current.lessonsCount || 1) - 1),
        durationMinutes: Math.max(0, (current.durationMinutes || 0) - (lesson.durationMinutes || 0)),
        updatedAt: Timestamp.now(),
      });
    }
  }
  await deleteDoc(doc(db, LESSONS_COLLECTION, lessonId));
};

export const getCourseLessons = async (
  courseId: string
): Promise<AcademyLesson[]> => {
  const snapshot = await getDocs(
    query(
      collection(db, LESSONS_COLLECTION),
      where('courseId', '==', courseId),
      orderBy('order', 'asc')
    )
  );
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as AcademyLesson));
};

// ─── Progresso studente ───

export const markLessonComplete = async (
  studentId: string,
  courseId: string,
  lessonId: string
): Promise<void> => {
  // Controlla se già completata
  const existing = await getDocs(
    query(
      collection(db, PROGRESS_COLLECTION),
      where('studentId', '==', studentId),
      where('lessonId', '==', lessonId)
    )
  );
  if (!existing.empty) return;

  await addDoc(collection(db, PROGRESS_COLLECTION), {
    studentId,
    courseId,
    lessonId,
    completedAt: Timestamp.now(),
    progressPercent: 100,
  });
};

export const getStudentProgress = async (
  studentId: string,
  courseId?: string
): Promise<AcademyProgress[]> => {
  let q;
  if (courseId) {
    q = query(
      collection(db, PROGRESS_COLLECTION),
      where('studentId', '==', studentId),
      where('courseId', '==', courseId)
    );
  } else {
    q = query(
      collection(db, PROGRESS_COLLECTION),
      where('studentId', '==', studentId)
    );
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as AcademyProgress));
};

// ─── Upload file su Firebase Storage ───

export const uploadAcademyFile = async (
  courseId: string,
  fileUri: string,
  fileName: string,
  folder: 'video' | 'audio' | 'pdf' | 'extra'
): Promise<string> => {
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileRef = ref(
    storage,
    `academy/${courseId}/${folder}/${timestamp}_${sanitizedName}`
  );

  const response = await fetch(fileUri);
  const blob = await response.blob();
  await uploadBytes(fileRef, blob);

  return getDownloadURL(fileRef);
};

// ─── Quiz ───

export const saveQuiz = async (
  quiz: Omit<AcademyQuiz, 'id'>
): Promise<string> => {
  // Cerca quiz esistente per questa lezione
  const existing = await getDocs(
    query(collection(db, QUIZZES_COLLECTION), where('lessonId', '==', quiz.lessonId))
  );
  if (!existing.empty) {
    const existingId = existing.docs[0].id;
    await updateDoc(doc(db, QUIZZES_COLLECTION, existingId), {
      ...quiz,
      createdAt: Timestamp.now(),
    });
    return existingId;
  }
  const docRef = await addDoc(collection(db, QUIZZES_COLLECTION), {
    ...quiz,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getQuizForLesson = async (
  lessonId: string
): Promise<AcademyQuiz | null> => {
  const snapshot = await getDocs(
    query(collection(db, QUIZZES_COLLECTION), where('lessonId', '==', lessonId))
  );
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { ...d.data(), id: d.id } as AcademyQuiz;
};

export const deleteQuiz = async (quizId: string): Promise<void> => {
  await deleteDoc(doc(db, QUIZZES_COLLECTION, quizId));
};

export const submitQuizAttempt = async (
  attempt: Omit<AcademyQuizAttempt, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, QUIZ_ATTEMPTS_COLLECTION), {
    ...attempt,
    completedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getQuizAttempts = async (
  studentId: string,
  lessonId: string
): Promise<AcademyQuizAttempt[]> => {
  const snapshot = await getDocs(
    query(
      collection(db, QUIZ_ATTEMPTS_COLLECTION),
      where('studentId', '==', studentId),
      where('lessonId', '==', lessonId)
    )
  );
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as AcademyQuizAttempt));
};

export const getBestQuizAttempt = async (
  studentId: string,
  lessonId: string
): Promise<AcademyQuizAttempt | null> => {
  const attempts = await getQuizAttempts(studentId, lessonId);
  if (attempts.length === 0) return null;
  return attempts.reduce((best, a) => (a.score > best.score ? a : best), attempts[0]);
};

// ─── Note studente ───

export const saveNote = async (
  note: Omit<AcademyNote, 'id'>
): Promise<string> => {
  // Cerca nota esistente per questo studente/lezione
  const existing = await getDocs(
    query(
      collection(db, NOTES_COLLECTION),
      where('studentId', '==', note.studentId),
      where('lessonId', '==', note.lessonId)
    )
  );
  if (!existing.empty) {
    const existingId = existing.docs[0].id;
    await updateDoc(doc(db, NOTES_COLLECTION, existingId), {
      content: note.content,
      updatedAt: Timestamp.now(),
    });
    return existingId;
  }
  const docRef = await addDoc(collection(db, NOTES_COLLECTION), {
    ...note,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getNote = async (
  studentId: string,
  lessonId: string
): Promise<AcademyNote | null> => {
  const snapshot = await getDocs(
    query(
      collection(db, NOTES_COLLECTION),
      where('studentId', '==', studentId),
      where('lessonId', '==', lessonId)
    )
  );
  if (snapshot.empty) return null;
  return { ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as AcademyNote;
};

export const getStudentNotes = async (
  studentId: string,
  courseId?: string
): Promise<AcademyNote[]> => {
  let q;
  if (courseId) {
    q = query(
      collection(db, NOTES_COLLECTION),
      where('studentId', '==', studentId),
      where('courseId', '==', courseId)
    );
  } else {
    q = query(
      collection(db, NOTES_COLLECTION),
      where('studentId', '==', studentId)
    );
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as AcademyNote));
};

// ─── Valutazioni corso ───

export const saveCourseRating = async (
  rating: Omit<AcademyRating, 'id'>
): Promise<string> => {
  // Una sola valutazione per studente/corso
  const existing = await getDocs(
    query(
      collection(db, RATINGS_COLLECTION),
      where('studentId', '==', rating.studentId),
      where('courseId', '==', rating.courseId)
    )
  );
  if (!existing.empty) {
    const existingId = existing.docs[0].id;
    await updateDoc(doc(db, RATINGS_COLLECTION, existingId), {
      rating: rating.rating,
      comment: rating.comment || '',
      createdAt: Timestamp.now(),
    });
    return existingId;
  }
  const docRef = await addDoc(collection(db, RATINGS_COLLECTION), {
    ...rating,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getCourseRatings = async (
  courseId: string
): Promise<AcademyRating[]> => {
  const snapshot = await getDocs(
    query(collection(db, RATINGS_COLLECTION), where('courseId', '==', courseId))
  );
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as AcademyRating));
};

export const getStudentCourseRating = async (
  studentId: string,
  courseId: string
): Promise<AcademyRating | null> => {
  const snapshot = await getDocs(
    query(
      collection(db, RATINGS_COLLECTION),
      where('studentId', '==', studentId),
      where('courseId', '==', courseId)
    )
  );
  if (snapshot.empty) return null;
  return { ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as AcademyRating;
};

export const getCourseAverageRating = async (
  courseId: string
): Promise<{ average: number; count: number }> => {
  const ratings = await getCourseRatings(courseId);
  if (ratings.length === 0) return { average: 0, count: 0 };
  const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
  return { average: sum / ratings.length, count: ratings.length };
};

// ─── Certificati ───

const generateCertificateCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'CERT-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const generateCertificate = async (
  studentId: string,
  studentName: string,
  courseId: string,
  courseTitle: string
): Promise<AcademyCertificate> => {
  // Controlla se già esiste
  const existing = await getDocs(
    query(
      collection(db, CERTIFICATES_COLLECTION),
      where('studentId', '==', studentId),
      where('courseId', '==', courseId)
    )
  );
  if (!existing.empty) {
    return { ...existing.docs[0].data(), id: existing.docs[0].id } as AcademyCertificate;
  }

  const certData = {
    studentId,
    studentName,
    courseId,
    courseTitle,
    completedAt: Timestamp.now(),
    certificateCode: generateCertificateCode(),
  };
  const docRef = await addDoc(collection(db, CERTIFICATES_COLLECTION), certData);
  return { id: docRef.id, ...certData, completedAt: new Date() } as AcademyCertificate;
};

export const getStudentCertificates = async (
  studentId: string
): Promise<AcademyCertificate[]> => {
  const snapshot = await getDocs(
    query(collection(db, CERTIFICATES_COLLECTION), where('studentId', '==', studentId))
  );
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as AcademyCertificate));
};

export const verifyCertificate = async (
  code: string
): Promise<AcademyCertificate | null> => {
  const snapshot = await getDocs(
    query(collection(db, CERTIFICATES_COLLECTION), where('certificateCode', '==', code))
  );
  if (snapshot.empty) return null;
  return { ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as AcademyCertificate;
};

// ─── Studenti Academy ───

export const registerAcademyStudent = async (
  email: string,
  password: string,
  name: string,
  surname: string,
  phone: string
): Promise<AcademyStudent> => {
  // Usa la REST API per non disconnettere l'admin
  const apiKey = auth.app.options.apiKey;
  if (!apiKey) throw new Error('Firebase API key non trovata');

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: false }),
    }
  );
  const data = await response.json();
  if (!response.ok) {
    const errorCode = data?.error?.message || '';
    if (errorCode === 'EMAIL_EXISTS') throw { code: 'auth/email-already-in-use' };
    if (errorCode === 'WEAK_PASSWORD') throw { code: 'auth/weak-password' };
    throw new Error(data?.error?.message || 'Errore durante la creazione');
  }

  const uid = data.localId;
  const studentData: Omit<AcademyStudent, 'id'> = {
    email,
    name,
    surname,
    phone,
    role: 'academy_student',
    createdAt: new Date(),
    isActive: true,
  };

  await setDoc(doc(db, 'users', uid), {
    ...studentData,
    createdAt: Timestamp.now(),
  });

  return { id: uid, ...studentData };
};

export const getAcademyStudents = async (): Promise<AcademyStudent[]> => {
  const snapshot = await getDocs(
    query(collection(db, 'users'), where('role', '==', 'academy_student'))
  );
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as AcademyStudent));
};

// ─── Analytics ───

export const getAcademyAnalytics = async (): Promise<{
  totalCourses: number;
  publishedCourses: number;
  totalLessons: number;
  totalStudents: number;
  totalCompletions: number;
  courseStats: Array<{
    courseId: string;
    courseTitle: string;
    lessonsCount: number;
    completionCount: number;
    avgRating: number;
    ratingCount: number;
  }>;
}> => {
  const [coursesSnap, lessonsSnap, progressSnap, studentsSnap, ratingsSnap] = await Promise.all([
    getDocs(collection(db, COURSES_COLLECTION)),
    getDocs(collection(db, LESSONS_COLLECTION)),
    getDocs(collection(db, PROGRESS_COLLECTION)),
    getDocs(query(collection(db, 'users'), where('role', 'in', ['student', 'academy_student']))),
    getDocs(collection(db, RATINGS_COLLECTION)),
  ]);

  const courses = coursesSnap.docs.map((d) => ({ ...d.data(), id: d.id } as AcademyCourse));
  const progressDocs = progressSnap.docs.map((d) => d.data());
  const ratingDocs = ratingsSnap.docs.map((d) => d.data());

  const courseStats = courses.map((course) => {
    const completions = progressDocs.filter((p) => p.courseId === course.id);
    const courseRatings = ratingDocs.filter((r) => r.courseId === course.id);
    const avgRating = courseRatings.length > 0
      ? courseRatings.reduce((acc, r) => acc + (r.rating || 0), 0) / courseRatings.length
      : 0;

    return {
      courseId: course.id,
      courseTitle: course.title,
      lessonsCount: course.lessonsCount,
      completionCount: completions.length,
      avgRating: Math.round(avgRating * 10) / 10,
      ratingCount: courseRatings.length,
    };
  });

  return {
    totalCourses: courses.length,
    publishedCourses: courses.filter((c) => c.isPublished).length,
    totalLessons: lessonsSnap.docs.length,
    totalStudents: studentsSnap.docs.length,
    totalCompletions: progressSnap.docs.length,
    courseStats,
  };
};

// ─── Ricerca corsi ───

export const searchCourses = async (
  searchTerm: string,
  studentId?: string
): Promise<AcademyCourse[]> => {
  const allCourses = studentId
    ? await getCoursesForStudent(studentId)
    : await getAllCourses();

  const term = searchTerm.toLowerCase().trim();
  if (!term) return allCourses;

  return allCourses.filter(
    (c) =>
      c.title.toLowerCase().includes(term) ||
      c.description.toLowerCase().includes(term) ||
      c.tags.some((t) => t.toLowerCase().includes(term)) ||
      c.category.toLowerCase().includes(term)
  );
};
