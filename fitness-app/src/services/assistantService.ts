import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { brand } from '../config/brand';
import { TIERS, PRICING_NOTES } from '../data/pricingData';
import { callClaude } from './aiService';

// ============================================================
// ASSISTENTE ESSĒRE
// ------------------------------------------------------------
// Chatbot di supporto per gli allievi: risponde su prezzi,
// servizi, check-in e informazioni della palestra. La conoscenza
// viene da: listino condiviso (pricingData), configurazione brand
// e un testo libero modificabile dall'owner (config/assistantInfo:
// orari, regole, FAQ, contatti).
// ============================================================

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

const INFO_DOC = 'assistantInfo';

// --- Info palestra modificabili dall'owner ---
export const getAssistantInfo = async (): Promise<string> => {
  try {
    const snap = await getDoc(doc(db, 'config', INFO_DOC));
    return snap.exists() ? ((snap.data().content as string) || '') : '';
  } catch {
    return '';
  }
};

export const saveAssistantInfo = async (content: string): Promise<void> => {
  await setDoc(
    doc(db, 'config', INFO_DOC),
    { content, updatedAt: Timestamp.now() },
    { merge: true }
  );
};

// --- Costruzione del contesto ---
const buildPricingText = (): string => {
  const lines: string[] = [];
  for (const t of TIERS) {
    const reg = t.registrationFee > 0 ? ` + €${t.registrationFee} iscrizione (una tantum)` : '';
    lines.push(`- ${t.title}: ${t.priceLabel}${reg}${t.priceNote ? ` (${t.priceNote})` : ''}. Include: ${t.features.join(', ')}.`);
  }
  lines.push('');
  for (const n of PRICING_NOTES) lines.push(`- ${n}`);
  return lines.join('\n');
};

const buildSystemPrompt = (gymInfo: string, userName: string): string => `Sei l'Assistente ${brand.appName}, l'assistente virtuale ufficiale della palestra ${brand.appName} — ${brand.tagline}.

Stai parlando con ${userName || 'un allievo'} della palestra tramite l'app ${brand.appName}.

## Il tuo ruolo
Rispondi in italiano, in modo cordiale, chiaro e conciso, alle domande su: prezzi e abbonamenti, servizi, come usare l'app, check-in in palestra, e informazioni pratiche della palestra. Sei un assistente informativo, non un coach.

## LISTINO PREZZI UFFICIALE
${buildPricingText()}

## COME FUNZIONA L'APP (per gli allievi)
- Check-in in palestra: tab "Check-in" → scansiona il QR alla reception oppure inserisci il codice ${brand.checkinManualCode.toUpperCase()}.
- Stato ${brand.appName}: nella tab "${brand.appName}" ogni giorno l'allievo registra come sta (sonno, energia, umore, dolori) e riceve un consiglio di allenamento; include anche esercizi di respirazione guidata.
- Scheda: tab "Scheda" mostra il programma di allenamento assegnato dal coach.
- Allenamento: tab "Allenamento" per registrare la seduta dal vivo.
- Traguardi: 50 badge da sbloccare con premi reali a 15, 30, 40 e 50 traguardi (Mindfulness, T-shirt, Myofascial Release & Mobility, Personal Training 1-on-1).
- Pagamenti: tab "Paga" per vedere piani e rate; possibile segnalare bonifici.
- Diario, Calendario, Chat col coach, AI Coach e contenuti extra sono nelle rispettive tab.

## INFORMAZIONI DELLA PALESTRA (fornite dal titolare)
${gymInfo || '(nessuna informazione aggiuntiva ancora inserita)'}

## Regole
- Rispondi SOLO su argomenti legati alla palestra, ai suoi servizi e all'app. Se la domanda è fuori tema, riportala gentilmente in tema.
- NON dare consigli medici, diagnosi o programmi di allenamento personalizzati: per quello invita a parlare col proprio coach (in app: tab Chat) o a usare l'AI Coach.
- Se non conosci una risposta (es. un orario non indicato sopra), dillo onestamente e suggerisci di chiedere in reception o al coach via chat — non inventare informazioni.
- Prezzi e promozioni: cita SOLO quelli del listino ufficiale sopra. Non inventare sconti.
- Risposte brevi e utili: massimo qualche frase, elenchi puntati quando aiutano.`;

// --- Chiamata principale ---
export const askAssistant = async (
  history: AssistantMessage[],
  userName: string
): Promise<string> => {
  const gymInfo = await getAssistantInfo();
  const system = buildSystemPrompt(gymInfo, userName);
  // Limita la storia alle ultime 12 battute per contenere i costi
  const recent = history.slice(-12).map((m) => ({ role: m.role, content: m.content }));
  return callClaude(recent, system, 1000, undefined, 'claude-opus-4-8');
};
