import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { AcademyCourse, AcademyModule, AcademyLesson, AcademyProgress } from '../types';

const COURSES_COLLECTION = 'academyCourses';
const MODULES_COLLECTION = 'academyModules';
const LESSONS_COLLECTION = 'academyLessons';
const PROGRESS_COLLECTION = 'academyProgress';

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
