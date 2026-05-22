import {
  collection,
  doc,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { PosturalAssessment, PosturalFinding, PosturalArea } from '../types';

const ASSESSMENTS_COLLECTION = 'posturalAssessments';

export const createAssessment = async (
  assessment: Omit<PosturalAssessment, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, ASSESSMENTS_COLLECTION), {
    ...assessment,
    date: Timestamp.fromDate(assessment.date),
  });
  return docRef.id;
};

export const getStudentAssessments = async (
  studentId: string
): Promise<PosturalAssessment[]> => {
  const q = query(
    collection(db, ASSESSMENTS_COLLECTION),
    where('studentId', '==', studentId)
  );
  const snapshot = await getDocs(q);
  const results = snapshot.docs.map(
    (d) => ({ ...d.data(), id: d.id } as PosturalAssessment)
  );
  results.sort((a, b) => {
    const da = a.date && typeof a.date === 'object' && 'seconds' in a.date
      ? (a.date as any).seconds : new Date(a.date as any).getTime() / 1000;
    const db2 = b.date && typeof b.date === 'object' && 'seconds' in b.date
      ? (b.date as any).seconds : new Date(b.date as any).getTime() / 1000;
    return db2 - da;
  });
  return results;
};

export const uploadPosturalImage = async (
  studentId: string,
  imageUri: string,
  view: 'front' | 'side_left' | 'side_right' | 'back'
): Promise<string> => {
  const timestamp = Date.now();
  const imageRef = ref(
    storage,
    `postural/${studentId}/${view}_${timestamp}.jpg`
  );

  const response = await fetch(imageUri);
  const blob = await response.blob();
  await uploadBytes(imageRef, blob);

  return getDownloadURL(imageRef);
};

export const deleteAssessment = async (assessmentId: string): Promise<void> => {
  await deleteDoc(doc(db, ASSESSMENTS_COLLECTION, assessmentId));
};

// Analisi posturale base tramite punti di riferimento
export const analyzePosture = (
  findings: PosturalFinding[]
): {
  summary: string;
  riskAreas: PosturalArea[];
  recommendations: string[];
} => {
  const riskAreas: PosturalArea[] = [];
  const recommendations: string[] = [];

  for (const finding of findings) {
    if (finding.severity === 'moderate' || finding.severity === 'severe') {
      riskAreas.push(finding.area);
    }
  }

  // Raccomandazioni base per area
  const areaRecommendations: Record<PosturalArea, string> = {
    head_neck: 'Esercizi di retrazione cervicale e stretching del trapezio superiore',
    shoulders: 'Rinforzo dei muscoli scapolari e stretching dei pettorali',
    upper_back: 'Esercizi di estensione toracica e mobilità',
    lower_back: 'Core stability e stretching dei flessori dell\'anca',
    pelvis: 'Esercizi di allineamento pelvico e rinforzo glutei',
    knees: 'Rinforzo del quadricipite e propriocezione',
    ankles_feet: 'Esercizi di mobilità della caviglia e rinforzo intrinseci del piede',
    spine_alignment: 'Programma posturale globale con focus sull\'allineamento',
  };

  for (const area of riskAreas) {
    recommendations.push(areaRecommendations[area]);
  }

  const severeCount = findings.filter((f) => f.severity === 'severe').length;
  const moderateCount = findings.filter((f) => f.severity === 'moderate').length;

  let summary = 'Valutazione posturale: ';
  if (severeCount > 0) {
    summary += `${severeCount} area/e con problematiche importanti. `;
  }
  if (moderateCount > 0) {
    summary += `${moderateCount} area/e con problematiche moderate. `;
  }
  if (severeCount === 0 && moderateCount === 0) {
    summary += 'Postura nella norma con eventuali lievi compensi.';
  } else {
    summary += 'Si consiglia un programma correttivo mirato.';
  }

  return { summary, riskAreas, recommendations };
};

export const generateProgressReport = (
  assessments: PosturalAssessment[]
): { timeline: { date: Date; severityScore: number; areas: string[] }[]; improvements: string[]; persistent: string[] } => {
  const sorted = [...assessments].sort((a, b) => {
    const da = a.date && typeof a.date === 'object' && 'seconds' in a.date
      ? (a.date as any).seconds : new Date(a.date as any).getTime() / 1000;
    const db2 = b.date && typeof b.date === 'object' && 'seconds' in b.date
      ? (b.date as any).seconds : new Date(b.date as any).getTime() / 1000;
    return da - db2;
  });

  const severityScore = (f: PosturalFinding[]): number => {
    return f.reduce((score, finding) => {
      const weights = { normal: 0, mild: 1, moderate: 2, severe: 3 };
      return score + (weights[finding.severity] || 0);
    }, 0);
  };

  const timeline = sorted.map((a) => ({
    date: a.date,
    severityScore: severityScore(a.findings),
    areas: a.findings.filter((f) => f.severity !== 'normal').map((f) => f.area),
  }));

  const improvements: string[] = [];
  const persistent: string[] = [];

  if (sorted.length >= 2) {
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const firstAreas = new Map(first.findings.map((f) => [f.area, f.severity]));
    const lastAreas = new Map(last.findings.map((f) => [f.area, f.severity]));
    const severityOrder = ['normal', 'mild', 'moderate', 'severe'];

    for (const [area, firstSev] of firstAreas) {
      const lastSev = lastAreas.get(area);
      if (lastSev && severityOrder.indexOf(lastSev) < severityOrder.indexOf(firstSev)) {
        improvements.push(area);
      } else if (lastSev && severityOrder.indexOf(lastSev) >= severityOrder.indexOf(firstSev) && firstSev !== 'normal') {
        persistent.push(area);
      }
    }
  }

  return { timeline, improvements, persistent };
};
