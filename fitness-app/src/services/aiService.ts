// ============================================================
// ESSĒRE - AI SERVICE (Claude Anthropic API)
// Analisi posturale con visione + Progressioni allenamento
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PosturalFinding, Exercise, WorkoutPlan } from '../types';

// La chiave API va impostata in config. In produzione usare un backend proxy.
// MAI esporre la chiave in un'app client in produzione.
const API_URL = 'https://api.anthropic.com/v1/messages';
const AI_KEY_STORAGE = '@essère_ai_key';

let API_KEY = '';
let _keyLoaded = false;

export const setAIApiKey = (key: string) => {
  API_KEY = key;
};

export const getAIApiKey = () => API_KEY;

export const ensureAIApiKey = async (): Promise<string> => {
  if (!API_KEY) {
    await loadAIApiKey();
  }
  return API_KEY;
};

// Carica la chiave API da AsyncStorage all'avvio
export const loadAIApiKey = async (): Promise<string> => {
  if (_keyLoaded) return API_KEY;
  try {
    const key = await AsyncStorage.getItem(AI_KEY_STORAGE);
    if (key) {
      API_KEY = key;
    }
  } catch {
    // ignore
  }
  _keyLoaded = true;
  return API_KEY;
};

// Caricamento automatico all'import del modulo
loadAIApiKey();

// --- Helper per chiamata Claude ---
const callClaude = async (
  messages: Array<{ role: string; content: any }>,
  systemPrompt: string,
  maxTokens: number = 2000,
  prefill?: string
): Promise<string> => {
  if (!API_KEY) {
    await loadAIApiKey();
  }

  if (!API_KEY) {
    throw new Error('API key Anthropic non configurata. Vai in Impostazioni AI per inserirla.');
  }

  if (!API_KEY.startsWith('sk-ant-') && !API_KEY.startsWith('sk-')) {
    throw new Error('Chiave API non valida. Deve iniziare con "sk-ant-" o "sk-". Controlla le impostazioni.');
  }

  const allMessages = [...messages];
  if (prefill) {
    allMessages.push({ role: 'assistant', content: prefill });
  }

  let response: Response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: allMessages,
      }),
    });
  } catch (networkError) {
    throw new Error(
      'Impossibile connettersi al server AI. Controlla la connessione internet e riprova.'
    );
  }

  if (!response.ok) {
    let errorBody = '';
    try {
      errorBody = await response.text();
    } catch {
      // ignore
    }

    if (response.status === 401) {
      throw new Error('Chiave API non valida o scaduta. Aggiorna la chiave nelle impostazioni AI.');
    }
    if (response.status === 429) {
      throw new Error('Troppe richieste. Attendi qualche secondo e riprova.');
    }
    if (response.status === 400) {
      if (errorBody.includes('image') || errorBody.includes('base64')) {
        throw new Error('Errore nell\'invio delle immagini. Prova con foto più piccole o in formato JPEG.');
      }
      throw new Error(`Errore API 400: ${errorBody.substring(0, 300)}`);
    }
    if (response.status >= 500) {
      throw new Error('Il server AI è temporaneamente non disponibile. Riprova tra qualche minuto.');
    }
    throw new Error(`Errore API (${response.status}): ${errorBody.substring(0, 200)}`);
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new Error('Risposta non valida dal server AI. Riprova.');
  }

  const text = data?.content?.[0]?.text;
  if (!text) {
    throw new Error('Il server AI ha restituito una risposta vuota. Riprova.');
  }

  return prefill ? prefill + text : text;
};

// --- Converte immagine URI in base64 ---
const imageUriToBase64 = async (uri: string): Promise<string> => {
  // Se l'URI è già base64, estrarre i dati
  if (uri.startsWith('data:')) {
    const base64Part = uri.split(',')[1];
    if (base64Part) return base64Part;
    throw new Error('Formato immagine base64 non valido');
  }

  try {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Impossibile caricare l'immagine (${response.status})`);
    }
    const blob = await response.blob();

    // Controlla dimensione (max 20MB per l'API)
    if (blob.size > 20 * 1024 * 1024) {
      throw new Error('Immagine troppo grande. Usa foto con dimensioni inferiori a 20MB.');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        if (!base64) {
          reject(new Error('Conversione immagine fallita'));
          return;
        }
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Errore nella lettura dell\'immagine'));
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('Immagine')) {
      throw err;
    }
    throw new Error('Impossibile elaborare l\'immagine. Riprova con un\'altra foto.');
  }
};

// --- Helper per estrarre JSON dalla risposta AI ---
const extractJSON = <T>(text: string): T | null => {
  // Remove markdown code blocks if present
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {
    // ignore
  }

  // Try to find JSON object
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch {
      // Try to fix truncated JSON by closing open brackets
      let fixedJson = objMatch[0];
      const openBraces = (fixedJson.match(/\{/g) || []).length;
      const closeBraces = (fixedJson.match(/\}/g) || []).length;
      const openBrackets = (fixedJson.match(/\[/g) || []).length;
      const closeBrackets = (fixedJson.match(/\]/g) || []).length;

      // Remove trailing comma or incomplete value
      fixedJson = fixedJson.replace(/,\s*$/, '');
      fixedJson = fixedJson.replace(/,\s*"[^"]*"?\s*$/, '');
      fixedJson = fixedJson.replace(/:\s*"[^"]*$/, ': ""');
      fixedJson = fixedJson.replace(/:\s*$/, ': ""');

      for (let i = 0; i < openBrackets - closeBrackets; i++) fixedJson += ']';
      for (let i = 0; i < openBraces - closeBraces; i++) fixedJson += '}';

      try {
        return JSON.parse(fixedJson);
      } catch {
        // ignore
      }
    }
  }

  // Try to find JSON array
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      return JSON.parse(arrMatch[0]) as T;
    } catch {
      // ignore
    }
  }

  return null;
};

// ============================================================
// 1. ANALISI POSTURALE CON AI VISION
// ============================================================

export interface AIPosturalAnalysis {
  findings: Array<{
    area: string;
    observation: string;
    severity: 'normal' | 'mild' | 'moderate' | 'severe';
  }>;
  summary: string;
  recommendations: string[];
  exerciseProgram: string[];
}

export const analyzePostureWithAI = async (
  images: {
    front?: string;
    side?: string;
    back?: string;
  },
  manualFindings?: PosturalFinding[],
  studentInfo?: { name: string; goals: string; medicalNotes?: string }
): Promise<AIPosturalAnalysis> => {
  const systemPrompt = `Sei un esperto fisioterapista e posturologo italiano. Analizza le immagini posturali del paziente e fornisci una valutazione dettagliata.

RISPONDI SEMPRE in formato JSON valido con questa struttura:
{
  "findings": [
    {
      "area": "head_neck|shoulders|upper_back|lower_back|pelvis|knees|ankles_feet|spine_alignment",
      "observation": "descrizione dettagliata dell'osservazione in italiano",
      "severity": "normal|mild|moderate|severe"
    }
  ],
  "summary": "riassunto generale della valutazione posturale in italiano",
  "recommendations": ["raccomandazione 1", "raccomandazione 2", ...],
  "exerciseProgram": ["esercizio correttivo 1 con serie/reps", "esercizio 2", ...]
}

Analizza attentamente:
- Allineamento della testa e del collo
- Simmetria delle spalle
- Cifosi/lordosi toracica
- Lordosi/rettilineizzazione lombare
- Inclinazione del bacino (antiversione/retroversione)
- Valgismo/varismo delle ginocchia
- Appoggio dei piedi (pronazione/supinazione)
- Allineamento generale della colonna

Sii specifico e professionale. Suggerisci esercizi correttivi concreti con serie e ripetizioni.`;

  const content: any[] = [];

  // Aggiungi le immagini
  const imageEntries = Object.entries(images).filter(([_, uri]) => uri);
  for (const [view, uri] of imageEntries) {
    if (!uri) continue;
    try {
      const base64 = await imageUriToBase64(uri);
      const labels: Record<string, string> = {
        front: 'Vista frontale',
        side: 'Vista laterale',
        back: 'Vista posteriore',
      };
      content.push({
        type: 'text',
        text: `${labels[view]}:`,
      });
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: base64,
        },
      });
    } catch {
      // Skip image if conversion fails
    }
  }

  // Aggiungi contesto testuale
  let contextText = 'Analizza la postura di questo paziente basandoti sulle immagini fornite.';

  if (studentInfo) {
    contextText += `\n\nInformazioni paziente:
- Nome: ${studentInfo.name}
- Obiettivi: ${studentInfo.goals}`;
    if (studentInfo.medicalNotes) {
      contextText += `\n- Note mediche: ${studentInfo.medicalNotes}`;
    }
  }

  if (manualFindings && manualFindings.length > 0) {
    contextText += '\n\nOsservazioni manuali del valutatore:';
    for (const f of manualFindings) {
      contextText += `\n- ${f.area}: ${f.observation} (${f.severity})`;
    }
    contextText += '\n\nConferma o integra queste osservazioni con la tua analisi visiva.';
  }

  content.push({ type: 'text', text: contextText });

  if (content.length === 0) {
    throw new Error('Fornisci almeno un\'immagine per l\'analisi AI');
  }

  const responseText = await callClaude(
    [{ role: 'user', content }],
    systemPrompt,
    3000
  );

  // Parse JSON dalla risposta
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Risposta non valida');
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {
      findings: [],
      summary: responseText,
      recommendations: ['Analisi completata - leggi il riassunto sopra'],
      exerciseProgram: [],
    };
  }
};

// ============================================================
// 1b. AI CONFRONTO POSTURALE NEL TEMPO (PRIMA/DOPO)
// ============================================================

export interface AIPosturalComparison {
  verdict: 'miglioramento' | 'stabile' | 'peggioramento' | 'misto';
  summary: string;
  improvements: string[];
  worsened: string[];
  unchanged: string[];
  recommendations: string[];
}

export const comparePostureWithAI = async (
  before: {
    date: string;
    front?: string;
    side?: string;
    back?: string;
    findings?: Array<{ area: string; observation: string; severity: string }>;
    aiAnalysis?: string;
  },
  after: {
    date: string;
    front?: string;
    side?: string;
    back?: string;
    findings?: Array<{ area: string; observation: string; severity: string }>;
    aiAnalysis?: string;
  },
  studentInfo?: { name: string; goals: string; medicalNotes?: string }
): Promise<AIPosturalComparison> => {
  const systemPrompt = `Sei un esperto fisioterapista e posturologo italiano specializzato nel monitoraggio del progresso nel tempo.

Il tuo compito è CONFRONTARE due valutazioni posturali dello STESSO paziente fatte in date diverse, per valutare l'EVOLUZIONE della postura e della composizione corporea.

IMPORTANTE:
- NON valutare ogni valutazione in modo assoluto. Il focus è il CONFRONTO tra PRIMA e DOPO.
- Cerca attivamente i MIGLIORAMENTI: maggiore simmetria, migliore allineamento, tono muscolare aumentato, riduzione asimmetrie, postura più eretta, definizione muscolare, riduzione del grasso.
- Sii incoraggiante ma onesto. Se c'è un miglioramento evidente, dillo chiaramente e con entusiasmo.
- Considera anche i cambiamenti estetici e di composizione corporea (tono, definizione, dimagrimento), non solo gli aspetti clinici.
- Puoi basarti su FOTO (se disponibili) e/o su DATI TESTUALI delle valutazioni precedenti (findings, severità, note AI).
- ATTENZIONE: Se la valutazione "PRIMA" ha pochi o nessun finding registrato, NON significa che il paziente stava meglio. Significa che la valutazione era meno approfondita. In quel caso, NON interpretare nuovi findings come peggioramento — piuttosto valuta lo stato attuale in modo positivo e nota che i dati precedenti erano incompleti.

RISPONDI SEMPRE in formato JSON valido:
{"verdict":"miglioramento|stabile|peggioramento|misto","summary":"riassunto confronto","improvements":["..."],"worsened":["..."],"unchanged":["..."],"recommendations":["..."]}

Sii specifico, professionale e motivante.`;

  const content: any[] = [];
  const labels: Record<string, string> = {
    front: 'frontale',
    side: 'laterale',
    back: 'posteriore',
  };

  let hasImages = false;

  // PRIMA - foto
  for (const view of ['front', 'side', 'back'] as const) {
    const uri = before[view];
    if (!uri) continue;
    try {
      const base64 = await imageUriToBase64(uri);
      if (!hasImages) content.push({ type: 'text', text: `=== FOTO "PRIMA" (${before.date}) ===` });
      content.push({ type: 'text', text: `PRIMA - vista ${labels[view]}:` });
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
      });
      hasImages = true;
    } catch {
      // skip failed image
    }
  }

  // DOPO - foto
  let hasAfterImages = false;
  for (const view of ['front', 'side', 'back'] as const) {
    const uri = after[view];
    if (!uri) continue;
    try {
      const base64 = await imageUriToBase64(uri);
      if (!hasAfterImages) content.push({ type: 'text', text: `=== FOTO "DOPO" (${after.date}) ===` });
      content.push({ type: 'text', text: `DOPO - vista ${labels[view]}:` });
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
      });
      hasAfterImages = true;
      hasImages = true;
    } catch {
      // skip failed image
    }
  }

  // Dati testuali - sempre inclusi come contesto aggiuntivo (o unico se le foto non si caricano)
  let textData = '';

  if (before.findings && before.findings.length > 0) {
    textData += `\n\n=== VALUTAZIONE "PRIMA" (${before.date}) - Dati ===\n`;
    for (const f of before.findings) {
      textData += `- ${f.area}: ${f.observation} (severità: ${f.severity})\n`;
    }
  }
  if (before.aiAnalysis) {
    textData += `Analisi AI precedente (${before.date}): ${before.aiAnalysis}\n`;
  }

  if (after.findings && after.findings.length > 0) {
    textData += `\n=== VALUTAZIONE "DOPO" (${after.date}) - Dati ===\n`;
    for (const f of after.findings) {
      textData += `- ${f.area}: ${f.observation} (severità: ${f.severity})\n`;
    }
  }
  if (after.aiAnalysis) {
    textData += `Analisi AI recente (${after.date}): ${after.aiAnalysis}\n`;
  }

  const hasTextData = textData.length > 10;

  if (!hasImages && !hasTextData) {
    throw new Error('Nessun dato disponibile per il confronto. Servono foto o valutazioni salvate.');
  }

  let contextText = '';
  if (hasImages) {
    contextText = `Confronta le foto e i dati posturali dello stesso paziente. PRIMA: ${before.date}. DOPO: ${after.date}. Valuta l'evoluzione e il progresso nel tempo.`;
  } else {
    contextText = `Non hai foto disponibili, ma confronta i dati delle valutazioni posturali dello stesso paziente. PRIMA: ${before.date}. DOPO: ${after.date}. Valuta l'evoluzione basandoti sulle severità e le osservazioni.`;
  }
  if (textData) contextText += textData;
  if (studentInfo) {
    contextText += `\n\nPaziente: ${studentInfo.name}\nObiettivi: ${studentInfo.goals}`;
    if (studentInfo.medicalNotes) contextText += `\nNote mediche: ${studentInfo.medicalNotes}`;
  }
  content.push({ type: 'text', text: contextText });

  const responseText = await callClaude(
    [{ role: 'user', content: hasImages ? content : contextText }],
    systemPrompt,
    3000,
    '{'
  );

  const parsed = extractJSON<AIPosturalComparison>(responseText);
  if (!parsed || !parsed.verdict) {
    return {
      verdict: 'misto',
      summary: responseText.replace(/^\{/, ''),
      improvements: [],
      worsened: [],
      unchanged: [],
      recommendations: [],
    };
  }
  return parsed;
};

// ============================================================
// 2. AI PROGRESSIONI ALLENAMENTO
// ============================================================

export interface AIProgressionSuggestion {
  title: string;
  reasoning: string;
  weeklySchedule: Array<{
    day: string;
    exercises: Array<{
      name: string;
      sets: number;
      reps: string;
      restSeconds: number;
      notes: string;
      category: string;
    }>;
  }>;
  generalNotes: string;
}

export const suggestWorkoutProgression = async (
  currentPlan: {
    title: string;
    weeklySchedule: Array<{
      dayOfWeek: number;
      exercises: Exercise[];
    }>;
  },
  studentInfo: {
    name: string;
    goals: string;
    medicalNotes?: string;
  },
  weekNumber: number,
  posturalNotes?: string
): Promise<AIProgressionSuggestion> => {
  const days = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

  const systemPrompt = `Sei un preparatore atletico e personal trainer esperto italiano. Crea la progressione della scheda di allenamento.

RISPONDI SEMPRE in formato JSON valido con questa struttura:
{
  "title": "titolo della nuova scheda",
  "reasoning": "spiegazione delle modifiche apportate e perché",
  "weeklySchedule": [
    {
      "day": "Lunedì",
      "exercises": [
        {
          "name": "nome esercizio",
          "sets": 4,
          "reps": "8-10",
          "restSeconds": 90,
          "notes": "note sull'esecuzione",
          "category": "forza|cardio|mobilita|stretching|funzionale|posturale|altro"
        }
      ]
    }
  ],
  "generalNotes": "note generali sulla progressione e consigli"
}

Principi di progressione:
- Sovraccarico progressivo (aumento volume o intensità ogni 2-3 settimane)
- Periodizzazione (variare stimoli per evitare plateau)
- Considerare eventuali problemi posturali
- Inserire esercizi correttivi se necessario
- Mantenere equilibrio muscolare (agonisti/antagonisti)
- Rispettare i tempi di recupero`;

  let currentPlanDescription = `Scheda attuale: "${currentPlan.title}" (settimana ${weekNumber})\n\n`;
  for (const day of currentPlan.weeklySchedule) {
    if (day.exercises.length === 0) continue;
    currentPlanDescription += `${days[day.dayOfWeek]}:\n`;
    for (const ex of day.exercises) {
      currentPlanDescription += `  - ${ex.name}: ${ex.sets}x${ex.reps} (rec ${ex.restSeconds}s) [${ex.category}]`;
      if (ex.notes) currentPlanDescription += ` | Note: ${ex.notes}`;
      currentPlanDescription += '\n';
    }
    currentPlanDescription += '\n';
  }

  let prompt = `Crea la progressione per la settimana ${weekNumber + 1} di questo allievo.

Informazioni allievo:
- Nome: ${studentInfo.name}
- Obiettivi: ${studentInfo.goals}`;

  if (studentInfo.medicalNotes) {
    prompt += `\n- Note mediche: ${studentInfo.medicalNotes}`;
  }
  if (posturalNotes) {
    prompt += `\n- Note posturali: ${posturalNotes}`;
  }

  prompt += `\n\n${currentPlanDescription}`;
  prompt += `\nCrea la nuova scheda progressiva mantenendo la stessa struttura settimanale ma con progressioni appropriate.`;

  const responseText = await callClaude(
    [{ role: 'user', content: prompt }],
    systemPrompt,
    4000
  );

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Risposta non valida');
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {
      title: `Progressione Settimana ${weekNumber + 1}`,
      reasoning: responseText,
      weeklySchedule: [],
      generalNotes: 'Generazione automatica non riuscita. Leggi il ragionamento sopra.',
    };
  }
};

// ============================================================
// 3. AI GENERA SCHEDA COMPLETA
// ============================================================

export interface AIGeneratedWorkoutPlan {
  title: string;
  weeklySchedule: Array<{
    dayOfWeek: number;
    exercises: Array<{
      name: string;
      sets: number;
      reps: string;
      restSeconds: number;
      description: string;
      notes: string;
      category: string;
    }>;
    notes: string;
  }>;
}

export const generateWorkoutPlan = async (params: {
  studentName: string;
  goals: string;
  level: 'principiante' | 'intermedio' | 'avanzato';
  daysPerWeek: number;
  equipment: string;
  medicalNotes?: string;
  posturalNotes?: string;
}): Promise<AIGeneratedWorkoutPlan> => {
  const systemPrompt = `Sei un personal trainer italiano esperto. Genera schede in JSON puro.

FORMATO OBBLIGATORIO (JSON puro, nessun testo prima o dopo):
{"title":"...","weeklySchedule":[{"dayOfWeek":0,"exercises":[{"name":"...","sets":4,"reps":"8-12","restSeconds":90,"description":"...","notes":"...","category":"forza"}],"notes":"..."}]}

REGOLE:
- dayOfWeek: 0=Lunedì, 1=Martedì, ..., 6=Domenica
- category: forza|cardio|mobilita|stretching|funzionale|posturale|altro
- Genera SOLO ${params.daysPerWeek} giorni distribuiti nella settimana
- 5-7 esercizi per giorno (incluso riscaldamento e stretching)
- Descrizioni BREVI (max 10 parole)
- Testi in ITALIANO
- SOLO JSON, niente markdown, niente spiegazioni`;

  let prompt = `Scheda per: ${params.studentName}
Obiettivi: ${params.goals}
Livello: ${params.level}
Giorni/settimana: ${params.daysPerWeek}
Attrezzatura: ${params.equipment}`;

  if (params.medicalNotes) prompt += `\nNote mediche: ${params.medicalNotes}`;
  if (params.posturalNotes) prompt += `\nNote posturali: ${params.posturalNotes}`;

  const responseText = await callClaude(
    [{ role: 'user', content: prompt }],
    systemPrompt,
    8192,
    '{'
  );

  const parsed = extractJSON<AIGeneratedWorkoutPlan>(responseText);
  if (!parsed || !parsed.weeklySchedule || parsed.weeklySchedule.length === 0) {
    throw new Error('L\'AI non ha restituito un programma valido. Riprova.');
  }
  return parsed;
};

// ============================================================
// 4. AI RIEPILOGO SETTIMANALE COACH
// ============================================================

export const generateWeeklySummary = async (params: {
  coachName: string;
  students: { name: string; sessionsCompleted: number; sessionsPlanned: number; notes: string }[];
  period: string;
}): Promise<string> => {
  const systemPrompt = `Sei un assistente AI per un centro di personal training italiano. Genera un riepilogo settimanale conciso e professionale per il titolare/coach.

Il riepilogo deve essere in ITALIANO e includere:
1. Panoramica generale dell'andamento
2. Allievi in linea con gli obiettivi vs allievi in ritardo
3. Pattern di presenza/assenza
4. Suggerimenti di focus per la settimana successiva
5. Una breve nota motivazionale

Rispondi in testo semplice, ben formattato con sezioni chiare. Usa emoji sparingly per i punti chiave.`;

  let prompt = `Genera il riepilogo settimanale per ${params.coachName}.
Periodo: ${params.period}

Allievi:`;

  for (const student of params.students) {
    const attendance = student.sessionsPlanned > 0
      ? Math.round((student.sessionsCompleted / student.sessionsPlanned) * 100)
      : 0;
    prompt += `\n- ${student.name}: ${student.sessionsCompleted}/${student.sessionsPlanned} sessioni (${attendance}% presenza)`;
    if (student.notes) {
      prompt += ` | Note: ${student.notes}`;
    }
  }

  prompt += `\n\nGenera un riepilogo utile e pratico.`;

  return await callClaude(
    [{ role: 'user', content: prompt }],
    systemPrompt,
    1500
  );
};

// ============================================================
// 5. AI SUGGERIMENTO ESERCIZI
// ============================================================

export const suggestExercises = async (
  muscle: string,
  goal: string,
  equipment: string = 'palestra completa'
): Promise<Array<{
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  description: string;
  category: string;
}>> => {
  const systemPrompt = `Sei un personal trainer esperto italiano. Suggerisci esercizi specifici.
RISPONDI in JSON array con questa struttura:
[{"name":"nome","sets":4,"reps":"8-12","restSeconds":90,"description":"come eseguirlo","category":"forza|cardio|mobilita|stretching|funzionale|posturale|altro"}]`;

  const responseText = await callClaude(
    [{ role: 'user', content: `Suggerisci 5 esercizi per ${muscle} con obiettivo ${goal}. Attrezzatura: ${equipment}.` }],
    systemPrompt,
    1500
  );

  try {
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Risposta non valida');
    return JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
};
