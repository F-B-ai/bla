// ============================================================
// ESSĒRE - AI SERVICE (Claude Anthropic API)
// Analisi posturale con visione + Progressioni allenamento
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PosturalFinding, Exercise, WorkoutPlan } from '../types';
import { auth } from '../config/firebase';
import type { PostureMetrics } from '../domain/posture';

// Le misure oggettive che il motore posturale passa all'AI da spiegare.
export type PostureMetricsInput = PostureMetrics;

// La chiave API va impostata in config. In produzione usare un backend proxy.
// MAI esporre la chiave in un'app client in produzione.
const API_URL = 'https://api.anthropic.com/v1/messages';
// M1 — AI Gateway server-side: la chiave Anthropic vive in Secret Manager,
// il modello viene scelto dal server in base alla feature (03 §0.3).
const AI_GATEWAY_URL = 'https://europe-west1-essere-3fe6f.cloudfunctions.net/aiMessages';
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

// Carica la chiave API da AsyncStorage all'avvio; se assente, fallback
// al documento Firestore config/aiKey (impostato dall'owner) così tutti
// i dispositivi degli allievi la ricevono senza configurazione manuale.
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
  if (!API_KEY) {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      const snap = await getDoc(doc(db, 'config', 'aiKey'));
      const remote = snap.exists() ? (snap.data().key as string) : '';
      if (remote) {
        API_KEY = remote;
        AsyncStorage.setItem(AI_KEY_STORAGE, remote).catch(() => {});
      }
    } catch {
      // offline o regole: si riproverà alla prossima chiamata
      _keyLoaded = false;
      return API_KEY;
    }
  }
  _keyLoaded = true;
  return API_KEY;
};

// Caricamento automatico all'import del modulo
loadAIApiKey();

// --- Helper per chiamata Claude ---
export const callClaude = async (
  messages: Array<{ role: string; content: any }>,
  systemPrompt: string,
  maxTokens: number = 2000,
  prefill?: string,
  model: string = 'claude-sonnet-4-5',
  feature: string = 'generic'
): Promise<string> => {
  // GDPR art. 9: ogni chiamata AI richiede il consenso "AI esterna"
  // dell'utente corrente (choke point unico: tutte le funzioni AI passano di qui)
  const { ensureOwnConsent } = await import('./consentService');
  await ensureOwnConsent('externalAI');

  // --- M1: prima scelta = gateway server-side ---
  // Se il gateway risponde, la chiave non serve sul client. Il fallback
  // diretto resta SOLO per la settimana di transizione (poi si revoca
  // la chiave client e si rimuove il ramo legacy).
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (idToken) {
      const gwRes = await fetch(AI_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ feature, messages, system: systemPrompt, maxTokens, prefill }),
      });
      if (gwRes.ok) {
        const gwData = await gwRes.json();
        const gwText = gwData?.text;
        if (!gwText) throw new Error('AI_FATAL: Il servizio AI ha restituito una risposta vuota. Riprova.');
        return prefill ? prefill + gwText : gwText;
      }
      if (gwRes.status === 401) {
        // Login scaduto. Ripiegare sulla chiamata diretta non lo
        // risolve e produce il messaggio sbagliato («chiave scaduta»):
        // qui si dice la verità, e che cosa fare.
        throw new Error(
          'AI_FATAL: La tua sessione è scaduta. Esci e rientra nell\'app '
          + '(Profilo → Esci), poi riprova. Non c\'è nessuna chiave da cambiare.'
        );
      }
      if (gwRes.status === 502) {
        // Il gateway ha parlato con Anthropic e Anthropic ha rifiutato.
        // Il caso che capita davvero — e che non deve mai cogliere di
        // sorpresa davanti a un cliente — è il credito esaurito.
        const err = await gwRes.json().catch(() => ({} as any));
        const dettaglio = `${err?.detail || ''} ${err?.message || ''}`.toLowerCase();
        if (dettaglio.includes('credit') || dettaglio.includes('billing')
          || dettaglio.includes('quota') || dettaglio.includes('payment')) {
          throw new Error(
            'AI_FATAL: Il credito del servizio AI è esaurito (o l\'ultimo pagamento '
            + 'non è andato a buon fine). Ricarica l\'account Anthropic: appena il '
            + 'credito rientra, tutto riparte da solo. Non c\'è nulla da cambiare nell\'app.'
          );
        }
        // altri 502: si tenta comunque il ramo legacy
      }
      if (gwRes.status === 403 || gwRes.status === 429) {
        // Consenso mancante o quota esaurita: errori definitivi, niente fallback
        const err = await gwRes.json().catch(() => ({}));
        throw new Error(`AI_FATAL: ${err?.message || 'Richiesta non consentita.'}`);
      }
      // 404 (gateway non ancora deployato) o 5xx → si tenta il ramo legacy
    }
  } catch (e) {
    const msg = (e as Error)?.message || '';
    if (msg.startsWith('AI_FATAL: ')) {
      throw new Error(msg.slice('AI_FATAL: '.length));
    }
    // errore di rete verso il gateway → fallback legacy
  }

  // --- Ramo legacy (transizione M1): chiamata diretta con chiave client ---
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
        model,
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
      // Il 401 arriva da DUE cause diverse, e confonderle costa tempo:
      //  · il token di accesso (login) scaduto — succede dopo ore di app
      //    aperta, e si risolve uscendo e rientrando;
      //  · la chiave AI vera e propria non valida.
      // Il gateway le distingue nel corpo della risposta: qui si legge.
      const corpo = errorBody.toLowerCase();
      if (corpo.includes('token') || corpo.includes('autenticazione')) {
        throw new Error(
          'La tua sessione è scaduta. Esci e rientra nell\'app (Profilo → Esci), '
          + 'poi riprova: non c\'è nessuna chiave da cambiare.'
        );
      }
      throw new Error('Chiave AI non valida o scaduta. Aggiornala in Impostazioni AI.');
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
  /** misure oggettive per vista (v3), quando disponibili */
  measured?: PostureMetricsInput[];
}

export const analyzePostureWithAI = async (
  images: {
    front?: string;
    side?: string;
    back?: string;
  },
  manualFindings?: PosturalFinding[],
  studentInfo?: { name: string; goals: string; medicalNotes?: string },
  // v3: MISURE OGGETTIVE già calcolate on-device (posture.ts) dai
  // landmark scheletrici. Quando presenti, l'AI NON stima più a
  // occhio: spiega questi numeri. È il salto di precisione.
  measured?: PostureMetricsInput[]
): Promise<AIPosturalAnalysis> => {
  const hasMeasured = Array.isArray(measured) && measured.length > 0;

  const systemPrompt = `Sei l'assistente di screening posturale di una palestra (valutazione funzionale wellness, MAI clinica). Il coach ha gli occhi sulla persona: tu sei un secondo sguardo PRUDENTE.

${hasMeasured ?
    `HAI A DISPOSIZIONE MISURE OGGETTIVE calcolate dallo scheletro (angoli reali in gradi, scostamenti in %), NON stime a occhio. Il tuo compito NON è rimisurare guardando le foto: è SPIEGARE questi numeri al coach. Le foto servono solo per il contesto (vestiti, luce, appoggio). Se un numero dice "normale", NON trasformarlo in un rilievo perché "ti sembra". Fidati della misura; l'occhio umano sbaglia gli angoli, il calcolo no.` :
    `Non hai misure strumentali: sei un secondo sguardo PRUDENTE sulle foto, non un oracolo. Segnala SOLO ciò che è chiaramente visibile; in dubbio, "normal".`}

RISPONDI SEMPRE in formato JSON valido con questa struttura:
{
  "findings": [
    {
      "area": "head_neck|shoulders|upper_back|lower_back|pelvis|knees|ankles_feet|spine_alignment",
      "observation": "spiegazione in italiano del rilievo${hasMeasured ? ' — cita il numero misurato, es. \\"spalla sinistra più alta di 6°\\"' : ' di ciò che SI VEDE'}",
      "severity": "normal|mild|moderate|severe"
    }
  ],
  "summary": "riassunto onesto in italiano (incertezze incluse)",
  "recommendations": ["raccomandazione 1", ...],
  "exerciseProgram": ["esercizio 1 con serie/reps", ...]
}

MAPPATURA gravità misure → severity: normale→normal, lieve→mild, moderato→moderate. "severe" solo per quadri macroscopici oltre le misure.

REGOLE DI PRUDENZA (più importanti di tutto):
${hasMeasured ?
    `- Basa i findings sulle MISURE. Un\'area con misura "normale" resta "normal", anche se la foto "ti insospettisce".
- Puoi aggiungere UN rilievo visivo solo se macroscopico e non coperto dalle misure (es. piede palesemente ruotato), segnalando che è a occhio.
- Le misure sono proxy 2D da foto: se una vista era di qualità insufficiente te lo diciamo nei dati — in quel caso dillo nel summary e non forzare rilievi su quella vista.` :
    `- Da foto non si valutano in modo affidabile differenze sotto i ~5°, rotazioni vertebrali, appoggio fine del piede. NON inventarli.
- Le asimmetrie vanno descritte col DUBBIO quando la foto non è perfettamente frontale.`}
- "severe" è raro. Meglio 2 rilievi solidi che 8 suggestioni.
- MAI diagnosi, mai nomi di patologie: il giudizio resta al professionista.
- Esercizi: generici da sala, prudenti, con serie/reps.`;

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
  let contextText = hasMeasured ?
    'Spiega al coach queste MISURE OGGETTIVE della postura (angoli reali calcolati dallo scheletro). Le foto sono solo contesto.' :
    'Analizza la postura di questo paziente basandoti sulle immagini fornite.';

  if (hasMeasured) {
    contextText += '\n\n=== MISURE OGGETTIVE (calcolate on-device, deterministiche) ===';
    for (const mv of measured!) {
      contextText += `\n\nVista ${mv.view.toUpperCase()} — qualità: ${mv.quality}`;
      if (mv.quality === 'insufficiente') {
        contextText += ` (${(mv.quality_notes || []).join('; ') || 'foto non adatta'})`;
        continue;
      }
      for (const f of mv.findings) {
        const val = f.value_deg != null ? `${f.value_deg}°` :
          f.value_pct != null ? `${f.value_pct}%` : '—';
        contextText += `\n- ${f.label}: ${val} [${f.severity}]${f.direction ? ` (${f.direction})` : ''}`;
      }
    }
    contextText += '\n\nNON rimisurare a occhio: spiega questi numeri.';
  }

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
    4096
  ,
    undefined,
    'claude-sonnet-4-5',
    'postural'
  );

  // Le misure oggettive viaggiano SEMPRE col risultato (v3), qualunque
  // sia l'esito del parsing: la UI mostra i numeri veri accanto al testo.
  const withMeasured = (a: AIPosturalAnalysis): AIPosturalAnalysis =>
    hasMeasured ? { ...a, measured } : a;

  // Parse JSON dalla risposta
  try {
    // Strip markdown code fences if present
    const cleaned = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Risposta non valida');
    return withMeasured(JSON.parse(jsonMatch[0]));
  } catch {
    // Try to extract structured data from truncated/malformed JSON
    try {
      const cleaned = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      const findingsMatch = cleaned.match(/"findings"\s*:\s*\[([\s\S]*?)\]/);
      const summaryMatch = cleaned.match(/"summary"\s*:\s*"([\s\S]*?)"/);
      const recsMatch = cleaned.match(/"recommendations"\s*:\s*\[([\s\S]*?)\]/);

      const findings: AIPosturalAnalysis['findings'] = [];
      if (findingsMatch) {
        const findingBlocks = findingsMatch[1].match(/\{[^}]+\}/g) || [];
        for (const block of findingBlocks) {
          try {
            findings.push(JSON.parse(block));
          } catch { /* skip malformed finding */ }
        }
      }

      const summary = summaryMatch ? summaryMatch[1] : '';
      const recommendations: string[] = [];
      if (recsMatch) {
        const recItems = recsMatch[1].match(/"([^"]+)"/g) || [];
        for (const item of recItems) {
          recommendations.push(item.replace(/^"|"$/g, ''));
        }
      }

      if (findings.length > 0 || summary) {
        return withMeasured({ findings, summary, recommendations, exerciseProgram: [] });
      }
    } catch { /* fallback below */ }

    // Final fallback: strip JSON artifacts for readable text
    const readableText = responseText
      .replace(/```json\s*/g, '').replace(/```\s*/g, '')
      .replace(/[{}\[\]"]/g, '')
      .replace(/,\s*$/gm, '')
      .replace(/^\s*\w+\s*:\s*/gm, '')
      .trim();
    return withMeasured({
      findings: [],
      summary: readableText || 'Analisi completata',
      recommendations: [],
      exerciseProgram: [],
    });
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
    // Niente prefill '{': la feature postural gira su Claude Fable 5,
    // che non accetta il prefill assistant. extractJSON gestisce
    // comunque eventuali fence markdown attorno al JSON.
    undefined,
    'claude-sonnet-4-5',
    'postural'
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
  posturalNotes?: string,
  /**
   * Il briefing del motore di progressione (src/domain/progressione.ts):
   * i fatti MISURATI dell'allievo e l'ASSE già deciso dalle formule.
   * Quando c'è, l'AI non sceglie più che cosa aumentare: lo traduce
   * in scheda. È la differenza fra un consiglio e una progressione.
   */
  briefingProgressione?: string
): Promise<AIProgressionSuggestion> => {
  const days = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

  const systemPrompt = `Sei il preparatore del Metodo Mind Movement™. Crea la progressione della scheda di allenamento.

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

LA GERARCHIA DELLA PROGRESSIONE (questo metodo, non il senso comune)
La parola più potente NON è Overload: è Progressive Demand — la progressione della
domanda complessiva imposta al sistema. Il sovraccarico è solo UNO degli undici modi
di aumentarla, ed è quello che costa di più al tessuto.

Il ciclo: ESPOSIZIONE → DOMANDA → ADATTAMENTO → CAPACITÀ → PROGRESSIONE → nuovo adattamento.

Gli undici assi:
1. Sovraccarico — più carico esterno
2. Esposizione — più ROM, velocità, instabilità, durata
3. Adattamento — stesso stimolo ripetuto finché diventa capacità
4. Complessità — compito motorio più difficile a parità di peso
5. Domanda meccanica — momento articolare, leve, profilo di resistenza
6. Volume — serie × ripetizioni × carico
7. Intensità — relativa al massimale, non solo assoluta
8. Prossimità al cedimento — RIR che scende a parità di peso
9. Densità — stesso lavoro in meno tempo
10. Richiesta tecnica — stesso carico gestito meglio: traiettoria, ROM, meno compensi
11. Capacità — ciò che la persona sa fare oggi e prima non faceva

REGOLE NON NEGOZIABILI
- Non aggiungere carico se l'asse indicato non è il carico.
- Non aggiungere carico su uno schema che sta peggiorando: prima la qualità.
- Se il sistema non ha ancora risposto, la progressione è RIPETERE lo stesso stimolo.
- Muovi UN asse alla volta: tutto il resto resta identico, così si capisce che cosa ha funzionato.
- Non inventare numeri che non ti sono stati dati. Nessuna diagnosi.
- Mantieni equilibrio agonisti/antagonisti e i tempi di recupero.
- In "reasoning" scrivi PRIMA quale asse hai mosso e perché, poi le modifiche.`;

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

  if (briefingProgressione) {
    prompt += `\n${briefingProgressione}\n`;
    prompt += '\nCrea la nuova scheda muovendo SOLO l\'asse indicato qui sopra, '
      + 'lasciando invariato tutto il resto della struttura settimanale.';
  } else {
    prompt += '\nNon ci sono ancora sedute registrate per questo allievo: '
      + 'non puoi sapere se il sistema ha risposto. Mantieni la struttura, '
      + 'lavora sull\'esposizione e sulla qualità dell\'esecuzione, e dichiara '
      + 'in "reasoning" che senza dati registrati non si aumenta il carico.';
  }

  const responseText = await callClaude(
    [{ role: 'user', content: prompt }],
    systemPrompt,
    4000
  ,
    undefined,
    'claude-sonnet-4-5',
    'progression'
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
    '{',
    'claude-sonnet-4-5',
    'workoutplan'
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
  ,
    undefined,
    'claude-sonnet-4-5',
    'weekly_summary'
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
  ,
    undefined,
    'claude-sonnet-4-5',
    'progression'
  );

  try {
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Risposta non valida');
    return JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
};

// ============================================================
// 6. STIMA COMPOSIZIONE CORPOREA CON AI VISION
// ============================================================

export interface AIBodyCompositionResult {
  estimatedBodyFat: number;
  muscleMassQuality: string;
  muscleDistribution: string;
  strengths: string[];
  areasToImprove: string[];
  summary: string;
  recommendations: string[];
}

export const estimateBodyComposition = async (
  images: {
    front: string;
    sideLeft: string;
    sideRight: string;
    back: string;
  },
  studentInfo?: { name?: string; goals?: string; weight?: number; height?: number }
): Promise<AIBodyCompositionResult> => {
  const systemPrompt = `Sei un esperto nutrizionista sportivo e analista della composizione corporea italiana. Analizza le 4 fotografie fornite (frontale, laterale sinistro, laterale destro, posteriore) per stimare la composizione corporea del soggetto.

RISPONDI SEMPRE in formato JSON valido con questa struttura:
{
  "estimatedBodyFat": <numero percentuale stimata di grasso corporeo, es. 18.5>,
  "muscleMassQuality": "<valutazione qualitativa della massa muscolare: scarsa, sufficiente, buona, ottima, eccellente>",
  "muscleDistribution": "<descrizione della distribuzione muscolare, simmetria, proporzioni tra i gruppi muscolari>",
  "strengths": ["punto di forza 1", "punto di forza 2", ...],
  "areasToImprove": ["area da migliorare 1", "area da migliorare 2", ...],
  "summary": "<riassunto complessivo della valutazione della composizione corporea in italiano>",
  "recommendations": ["raccomandazione 1", "raccomandazione 2", ...]
}

Analizza attentamente:
- Percentuale stimata di grasso corporeo visibile (pliche cutanee visibili, definizione muscolare, accumuli adiposi)
- Qualità della massa muscolare (tono, volume, definizione)
- Distribuzione muscolare (simmetria destra/sinistra, proporzioni arti superiori/inferiori/tronco)
- Aree di sviluppo muscolare più evidenti (punti di forza)
- Aree che necessitano maggiore lavoro (punti deboli)
- Valutazione complessiva del fisico

Sii specifico, professionale e costruttivo. Fornisci raccomandazioni pratiche per l'allenamento e la nutrizione.`;

  const content: any[] = [];

  const viewLabels: Record<string, string> = {
    front: 'Vista frontale',
    sideLeft: 'Vista laterale sinistra',
    sideRight: 'Vista laterale destra',
    back: 'Vista posteriore',
  };

  for (const [view, uri] of Object.entries(images)) {
    if (!uri) continue;
    try {
      const base64 = await imageUriToBase64(uri);
      content.push({
        type: 'text',
        text: `${viewLabels[view]}:`,
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
      // Salta immagine se la conversione fallisce
    }
  }

  let contextText = 'Analizza la composizione corporea di questo soggetto basandoti sulle 4 immagini fornite.';

  if (studentInfo) {
    contextText += '\n\nInformazioni soggetto:';
    if (studentInfo.name) contextText += `\n- Nome: ${studentInfo.name}`;
    if (studentInfo.goals) contextText += `\n- Obiettivi: ${studentInfo.goals}`;
    if (studentInfo.weight) contextText += `\n- Peso: ${studentInfo.weight} kg`;
    if (studentInfo.height) contextText += `\n- Altezza: ${studentInfo.height} cm`;
  }

  content.push({ type: 'text', text: contextText });

  if (content.length === 0) {
    throw new Error('Fornisci almeno un\'immagine per la stima della composizione corporea');
  }

  const responseText = await callClaude(
    [{ role: 'user', content }],
    systemPrompt,
    3000
  ,
    undefined,
    'claude-sonnet-4-5',
    'bodycomp'
  );

  const parsed = extractJSON<AIBodyCompositionResult>(responseText);
  if (parsed) return parsed;

  // Fallback: restituisci risultato generico se il parsing fallisce
  return {
    estimatedBodyFat: 0,
    muscleMassQuality: 'Non determinabile',
    muscleDistribution: 'Non determinabile',
    strengths: [],
    areasToImprove: [],
    summary: responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').replace(/[{}\[\]"]/g, '').trim() || 'Analisi completata',
    recommendations: [],
  };
};

// ============================================================
// 7. AI COACH PERSONALE - Analisi completa studente
// ============================================================

export interface AICoachInsights {
  overallScore: number;
  status: 'eccellente' | 'buono' | 'attenzione' | 'critico';
  insights: Array<{
    category: 'allenamento' | 'recupero' | 'umore' | 'progressi' | 'nutrizione' | 'costanza';
    title: string;
    description: string;
    priority: 'alta' | 'media' | 'bassa';
  }>;
  weeklyTip: string;
  warnings: string[];
  encouragement: string;
}

export const generateAICoachInsights = async (params: {
  studentName: string;
  goals: string;
  medicalNotes?: string;
  workoutLogs: Array<{
    date: string;
    duration: number;
    exerciseCount: number;
    totalVolume: number;
    avgRpe: number;
    completed: boolean;
  }>;
  diaryEntries: Array<{
    date: string;
    mood: string;
    painLevel: number;
    content: string;
  }>;
  measurements: Array<{
    date: string;
    weight?: number;
    bodyFat?: number;
    muscleMass?: number;
  }>;
  sessionsAttendance: {
    completed: number;
    total: number;
    cancelledLate: number;
    noShow: number;
  };
  currentStreak: number;
  totalWorkouts: number;
}): Promise<AICoachInsights> => {
  const systemPrompt = `Sei un esperto AI fitness coach che analizza dati completi degli studenti. Genera insight personalizzati, rileva pattern, segnala criticità e fornisci raccomandazioni pratiche.

Concentrati su:
- Costanza nell'allenamento e presenza alle sessioni
- Necessità di recupero e segni di sovrallenamento
- Pattern di umore ed energia
- Tasso di progressione (peso, composizione corporea, volume)
- Rischio infortuni (livello di dolore, carico eccessivo)
- Nutrizione e composizione corporea

Rispondi SEMPRE in italiano con un JSON valido con questa struttura:
{
  "overallScore": <numero 1-100>,
  "status": "eccellente|buono|attenzione|critico",
  "insights": [
    {
      "category": "allenamento|recupero|umore|progressi|nutrizione|costanza",
      "title": "titolo breve",
      "description": "descrizione dettagliata dell'insight",
      "priority": "alta|media|bassa"
    }
  ],
  "weeklyTip": "consiglio pratico per la prossima settimana",
  "warnings": ["avviso critico 1", "avviso 2"],
  "encouragement": "messaggio motivazionale personalizzato"
}

Regole:
- overallScore: 80-100 = eccellente, 60-79 = buono, 40-59 = attenzione, 1-39 = critico
- Genera 3-6 insights significativi ordinati per priorità
- warnings: solo se ci sono situazioni che richiedono attenzione immediata (dolore alto, assenze frequenti, calo drastico). Array vuoto se tutto ok.
- Sii specifico e basati sui dati forniti, non generico
- Il messaggio di incoraggiamento deve essere personalizzato e motivante`;

  let prompt = `Analizza i dati di questo allievo e genera insight personalizzati.

PROFILO ALLIEVO:
- Nome: ${params.studentName}
- Obiettivi: ${params.goals}`;

  if (params.medicalNotes) {
    prompt += `\n- Note mediche: ${params.medicalNotes}`;
  }

  prompt += `\n\nSTATISTICHE GENERALI:
- Allenamenti totali: ${params.totalWorkouts}
- Streak attuale: ${params.currentStreak} giorni
- Sessioni completate: ${params.sessionsAttendance.completed}/${params.sessionsAttendance.total}
- Cancellazioni tardive: ${params.sessionsAttendance.cancelledLate}
- No-show: ${params.sessionsAttendance.noShow}`;

  if (params.workoutLogs.length > 0) {
    prompt += `\n\nULTIMI ALLENAMENTI (${params.workoutLogs.length} sessioni):`;
    for (const log of params.workoutLogs.slice(0, 20)) {
      prompt += `\n- ${log.date}: ${log.duration}min, ${log.exerciseCount} esercizi, volume ${log.totalVolume}kg, RPE ${log.avgRpe}, ${log.completed ? 'completato' : 'incompleto'}`;
    }
  } else {
    prompt += `\n\nNessun log di allenamento disponibile.`;
  }

  if (params.diaryEntries.length > 0) {
    prompt += `\n\nDIARIO RECENTE (${params.diaryEntries.length} voci):`;
    for (const entry of params.diaryEntries.slice(0, 15)) {
      prompt += `\n- ${entry.date}: Umore ${entry.mood}, Dolore ${entry.painLevel}/10`;
      if (entry.content) prompt += ` | "${entry.content.substring(0, 100)}"`;
    }
  } else {
    prompt += `\n\nNessuna voce di diario disponibile.`;
  }

  if (params.measurements.length > 0) {
    prompt += `\n\nMISURAZIONI CORPOREE (${params.measurements.length} rilevazioni):`;
    for (const m of params.measurements.slice(0, 10)) {
      prompt += `\n- ${m.date}:`;
      if (m.weight != null) prompt += ` Peso ${m.weight}kg`;
      if (m.bodyFat != null) prompt += ` BF ${m.bodyFat}%`;
      if (m.muscleMass != null) prompt += ` MM ${m.muscleMass}kg`;
    }
  } else {
    prompt += `\n\nNessuna misurazione corporea disponibile.`;
  }

  prompt += `\n\nGenera un'analisi completa con insight, avvisi e incoraggiamento personalizzato.`;

  const responseText = await callClaude(
    [{ role: 'user', content: prompt }],
    systemPrompt,
    3000,
    '{',
    'claude-sonnet-4-5',
    'coach'
  );

  const parsed = extractJSON<AICoachInsights>(responseText);
  if (parsed && typeof parsed.overallScore === 'number' && parsed.status) {
    return parsed;
  }

  // Fallback se il parsing fallisce
  return {
    overallScore: 50,
    status: 'attenzione',
    insights: [],
    weeklyTip: 'Continua ad allenarti con costanza e registra i tuoi progressi.',
    warnings: ['Impossibile generare un\'analisi dettagliata. Riprova.'],
    encouragement: responseText.replace(/^\{/, '').substring(0, 200) || 'Continua così!',
  };
};
