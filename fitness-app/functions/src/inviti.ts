import * as admin from "firebase-admin";
import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";

// ============================================================
// VALIDA INVITO — la porta che sostituisce «allow read: if true»
// ------------------------------------------------------------
// Il buco, trovato l'8 settembre 2026: la regola sulla collezione
// studentInvites permetteva la lettura a chiunque, senza credenziali.
// Verificato in produzione: HTTP 200 su una richiesta anonima.
// Uscivano nome, cognome, email di ogni invitato e i codici con cui
// ci si registra.
//
// La regola non si poteva chiudere e basta: il codice va validato
// PRIMA che la persona esista come utente. Quindi la lettura serviva
// davvero — serviva UNA lettura, di UN codice, non l'elenco.
//
// Questa funzione fa esattamente quello:
//  · risponde su un codice per volta, mai in blocco
//  · restituisce solo i campi che servono a finire la registrazione
//  · dice la stessa cosa per «non esiste» e «già usato», perché
//    distinguerli direbbe a un estraneo quando ha trovato un codice vero
//  · rallenta chi tenta a raffica, per indirizzo di provenienza
//
// La grammatica vive in src/domain/invito.ts, con i suoi test. Qui ne
// esiste una copia minima, perché le Functions hanno un build proprio:
// se cambia lì, va allineata anche qui.
// ============================================================

const db = () => admin.firestore();

const TENTATIVI_MAX = 8;
const FINESTRA_MINUTI = 15;
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LUNGHEZZA = 6;

const normalizzaCodice = (input?: string | null): string | null => {
  const pulito = (input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (pulito.length !== LUNGHEZZA) return null;
  for (const c of pulito) if (!ALFABETO.includes(c)) return null;
  return pulito;
};

interface StatoTentativi {
  falliti: number;
  inizioFinestra: number;
}

const valutaFreno = (stato: StatoTentativi | null, adesso: number) => {
  const finestraMs = FINESTRA_MINUTI * 60 * 1000;
  const scaduta = !stato || adesso - stato.inizioFinestra >= finestraMs;
  if (scaduta) {
    return {consentito: true, nuovoStato: {falliti: 0, inizioFinestra: adesso}, riprovaFra: 0};
  }
  if (stato.falliti >= TENTATIVI_MAX) {
    const restano = finestraMs - (adesso - stato.inizioFinestra);
    return {consentito: false, nuovoStato: stato, riprovaFra: Math.ceil(restano / 1000)};
  }
  return {consentito: true, nuovoStato: stato, riprovaFra: 0};
};

/**
 * Chi sta chiamando, ai soli fini del freno.
 * Non è un'identità: è una chiave per contare i tentativi. Viene
 * ricavata dall'indirizzo di provenienza e ridotta a un'impronta, così
 * nel database non finisce un indirizzo IP in chiaro.
 */
const chiaveChiamante = (req: CallableRequest): string => {
  const raw = req.rawRequest;
  const ip = (raw?.headers?.["x-forwarded-for"] as string || raw?.ip || "ignoto")
    .split(",")[0]
    .trim();
  // Impronta breve: serve a distinguere, non a identificare.
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(ip, "utf8").digest("hex").slice(0, 24);
};

export const validaInvito = onCall(
  {region: "europe-west1", maxInstances: 10},
  async (request) => {
    const codice = normalizzaCodice(request.data?.codice);

    const chiave = chiaveChiamante(request);
    const rif = db().collection("inviteAttempts").doc(chiave);
    const adesso = Date.now();

    const snap = await rif.get();
    const stato = snap.exists ? (snap.data() as StatoTentativi) : null;
    const freno = valutaFreno(stato, adesso);

    if (!freno.consentito) {
      throw new HttpsError(
        "resource-exhausted",
        "Troppi tentativi.",
        {riprovaFra: freno.riprovaFra}
      );
    }

    // Un codice malformato non merita nemmeno una lettura del
    // database, ma conta come tentativo: è il caso più frequente
    // di chi sta provando a caso.
    const fallisci = async () => {
      await rif.set(
        {falliti: freno.nuovoStato.falliti + 1, inizioFinestra: freno.nuovoStato.inizioFinestra},
        {merge: true}
      );
      return {valido: false as const};
    };

    if (!codice) return fallisci();

    const q = await db()
      .collection("studentInvites")
      .where("inviteCode", "==", codice)
      .where("isUsed", "==", false)
      .limit(1)
      .get();

    if (q.empty) return fallisci();

    const d = q.docs[0];
    const dati = d.data();

    await rif.set({falliti: 0, inizioFinestra: adesso}, {merge: true});

    // Solo questi campi: ciò che riguarda la persona invitata,
    // compreso il coach che le è stato assegnato — glielo conferma
    // che il codice è suo. Non escono chi ha creato l'invito, la data
    // di creazione, né il codice stesso.
    return {
      valido: true as const,
      invito: {
        id: d.id,
        email: dati.email || "",
        nome: dati.name || "",
        cognome: dati.surname || "",
        collaboratoreId: dati.assignedCollaboratorId || "",
        collaboratoreNome: dati.assignedCollaboratorName || "",
      },
    };
  }
);
