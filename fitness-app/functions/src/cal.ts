import * as admin from "firebase-admin";
import {onRequest, onCall, HttpsError} from "firebase-functions/v2/https";
import * as crypto from "crypto";

// ============================================================
// CAL INGEST — POST /v1/cal
// ------------------------------------------------------------
// Il ponte che mancava: chi riceve le richieste su WhatsApp (il bot,
// o una persona) le scrive DIRETTAMENTE nella coda dell'app, e il
// titolare se le trova pronte da gestire — senza più copiare a mano.
//
// REGOLE FERREE
//  · Qui NON nasce nessun appuntamento. Si creano solo richieste
//    «in_attesa»: l'agenda cambia soltanto quando il titolare tocca
//    Conferma nell'app. Un ponte che prenota da solo è un ponte che
//    può sbagliare al posto tuo.
//  · Serve la chiave. La genera il titolare dall'app, si vede una
//    volta sola, e qui dentro vive solo la sua impronta (SHA-256).
//    Chi ha la chiave può SCRIVERE richieste, non leggere niente.
//  · Nessun campo viene indovinato: quello che manca fa rifiutare
//    il blocco, con il motivo scritto in chiaro.
// ============================================================

const db = () => admin.firestore();

const CONFIG_DOC = "config/calIngest";
const MAX_BLOCCHI = 20;

const impronta = (chiave: string): string =>
  crypto.createHash("sha256").update(chiave, "utf8").digest("hex");

// ------------------------------------------------------------
// Il lettore dei pacchetti CAL.
// La fonte della grammatica è src/domain/agenda.ts (leggiCAL):
// qui ne vive una copia MINIMA, perché le Functions hanno un loro
// build. Se la grammatica cambia lì, va allineata anche qui.
// ------------------------------------------------------------

const COMANDI = ["chiedi-liberi", "prenota", "sposta", "cancella"];
const TIPI = ["visita", "allenamento", "consulenza", "altro"];

const ALIAS: Record<string, string> = {
  persona: "persona", nome: "persona", allievo: "persona", cliente: "persona",
  telefono: "telefono", tel: "telefono", cellulare: "telefono",
  giorno: "giorno", data: "giorno",
  ora: "ora", orario: "ora",
  tipo: "tipo",
  note: "note", nota: "note",
  whatsapp: "whatsapp", wa: "whatsapp",
  "nuovo giorno": "nuovoGiorno", "nuova data": "nuovoGiorno",
  "nuova ora": "nuovaOra", "nuovo orario": "nuovaOra",
};

const giornoValido = (g: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(g)) return false;
  const [a, m, d] = g.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

const oraValida = (o: string): boolean => /^([01]\d|2[0-3]):([0-5]\d)$/.test(o);

interface Letto {
  ok: boolean;
  problemi: string[];
  campi: Record<string, string>;
  comando: string;
}

const leggiBlocco = (testo: string): Letto => {
  const problemi: string[] = [];
  const righe = testo.split("\n").map((r) => r.trim()).filter(Boolean);
  const testa = (righe[0] || "").replace(/[{}]/g, " ").trim();
  const m = testa.match(/^CAL\s+([a-z-]+)/i);
  const comando = m ? m[1].toLowerCase() : "";
  if (!m) problemi.push("La prima riga deve iniziare con «CAL» e il comando.");
  else if (!COMANDI.includes(comando)) problemi.push(`Comando «${comando}» sconosciuto.`);

  const campi: Record<string, string> = {};
  for (const riga of righe.slice(m ? 1 : 0)) {
    const sep = riga.indexOf(":");
    if (sep < 0) continue;
    const chiave = riga.slice(0, sep).trim().toLowerCase();
    const valore = riga.slice(sep + 1).replace(/^[«"'\s]+|[»"'\s]+$/g, "").trim();
    const campo = ALIAS[chiave];
    if (campo && valore) campi[campo] = valore;
  }

  if (campi.giorno && !giornoValido(campi.giorno)) {
    problemi.push(`Il giorno «${campi.giorno}» non è una data valida: serve AAAA-MM-GG.`);
  }
  if (campi.ora && !oraValida(campi.ora)) {
    problemi.push(`L'ora «${campi.ora}» non è valida: serve HH:MM.`);
  }
  if (campi.tipo && !TIPI.includes(campi.tipo.toLowerCase())) {
    problemi.push(`Tipo «${campi.tipo}» non previsto.`);
  }

  // Solo «prenota» entra in coda: gli altri comandi si guardano
  // nell'app, non creano richieste da confermare.
  if (comando === "prenota") {
    if (!campi.persona) problemi.push("Manca la persona.");
    if (!campi.giorno) problemi.push("Manca il giorno.");
    if (!campi.ora) problemi.push("Manca l'ora.");
  }

  return {ok: problemi.length === 0, problemi, campi, comando};
};

const separaBlocchi = (testo: string): string[] => {
  const righe = (testo || "").split("\n");
  const blocchi: string[][] = [];
  for (const riga of righe) {
    if (/^\s*CAL\s+/i.test(riga)) blocchi.push([riga]);
    else if (blocchi.length) blocchi[blocchi.length - 1].push(riga);
  }
  return blocchi.map((b) => b.join("\n"));
};

// ------------------------------------------------------------
// L'ingresso
// ------------------------------------------------------------

export const calIngest = onRequest(
  {region: "europe-west1", cors: true, maxInstances: 5},
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({errore: "Serve POST."});
      return;
    }

    const chiave = String(
      req.get("x-cal-key") || (req.body && req.body.chiave) || ""
    ).trim();
    if (!chiave) {
      res.status(401).json({errore: "Chiave mancante."});
      return;
    }

    const cfg = await db().doc(CONFIG_DOC).get();
    const attesa = cfg.exists ? (cfg.data()?.hash as string | undefined) : undefined;
    if (!attesa) {
      res.status(503).json({
        errore: "Nessuna chiave impostata: il titolare deve generarla dall'app.",
      });
      return;
    }
    if (impronta(chiave) !== attesa) {
      res.status(403).json({errore: "Chiave non valida."});
      return;
    }

    const testo = String((req.body && (req.body.testo || req.body.text)) || "");
    const blocchi = separaBlocchi(testo);
    if (!blocchi.length) {
      res.status(400).json({errore: "Nessun pacchetto CAL trovato nel testo."});
      return;
    }
    if (blocchi.length > MAX_BLOCCHI) {
      res.status(400).json({errore: `Troppi pacchetti in una volta (max ${MAX_BLOCCHI}).`});
      return;
    }

    const creati: string[] = [];
    const scartati: Array<{blocco: number; problemi: string[]}> = [];

    for (let i = 0; i < blocchi.length; i++) {
      const letto = leggiBlocco(blocchi[i]);
      if (!letto.ok) {
        scartati.push({blocco: i + 1, problemi: letto.problemi});
        continue;
      }
      if (letto.comando !== "prenota") {
        scartati.push({
          blocco: i + 1,
          problemi: [`«${letto.comando}» non entra in coda: si gestisce nell'app.`],
        });
        continue;
      }
      const c = letto.campi;
      const doc = await db().collection("bookingRequests").add({
        persona: c.persona,
        telefono: c.telefono || "",
        whatsapp: c.whatsapp || c.telefono || "",
        giorno: c.giorno,
        ora: c.ora,
        tipo: (c.tipo || "visita").toLowerCase(),
        note: c.note || "",
        stato: "in_attesa",
        // Da dove è arrivata: il titolare deve poterlo vedere.
        creataDa: "bot",
        canale: "cal-ingest",
        creataIl: admin.firestore.Timestamp.now(),
      });
      creati.push(doc.id);
    }

    res.status(200).json({
      ok: true,
      create: creati.length,
      scartate: scartati.length,
      dettagli: scartati,
      // Nessun dato dell'agenda esce da qui: chi scrive non legge.
    });
  }
);

// ------------------------------------------------------------
// La chiave: la genera il titolare, si vede una volta sola
// ------------------------------------------------------------

export const calKeyRotate = onCall({region: "europe-west1"}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Devi essere autenticato.");
  const uid = request.auth.uid;
  const utente = await db().collection("users").doc(uid).get();
  if (!utente.exists || utente.data()?.role !== "owner") {
    throw new HttpsError("permission-denied", "Solo il titolare può generare la chiave.");
  }

  // 32 byte casuali: si consegna in chiaro una volta, poi resta
  // solo l'impronta. Rigenerarla invalida subito la precedente.
  const chiave = crypto.randomBytes(24).toString("base64url");
  await db().doc(CONFIG_DOC).set({
    hash: impronta(chiave),
    aggiornataIl: admin.firestore.Timestamp.now(),
    aggiornataDa: uid,
  });

  return {chiave};
});
