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

// ============================================================
// CAL LIBERI — GET /v1/cal/liberi
// ------------------------------------------------------------
// Il titolare, il 14 settembre 2026:
//
//   «Devi fare in modo che Grok Bot possa avere anche la lettura del
//    calendario, ma non scrivere: sono io a confermare la scrittura.
//    Devono aiutarmi a vedere gli spazi liberi secondo la nostra
//    regola [...] e farmi una proposta di inserimento che io posso
//    confermare oppure no.»
//
// Fin qui la chiave permetteva di SCRIVERE richieste e basta —
// «chi scrive non legge». Adesso permette anche di leggere UNA cosa
// sola: quali mezz'ore sono libere, in un giorno, secondo la regola
// della giornata.
//
// REGOLE FERREE
//  · Non escono nomi, telefoni, note, tipi di seduta: soltanto ore.
//    Chi ha la chiave non deve poter ricostruire chi viene e quando.
//  · Non si scrive niente. Nemmeno una richiesta: per quella c'è
//    /v1/cal, ed è un'altra porta.
//  · La regola della giornata NON vive qui: sta in
//    src/domain/orariStudio.ts, copiata a ogni build da
//    copy-domain.js. Una copia scritta a mano divergerebbe.
// ============================================================

import {
  slotLiberi, descriviSlot, regolaDellaGiornata, AVVISO_SOLA_LETTURA,
  APERTURA, ULTIMO_INIZIO, ULTIMO_INIZIO_ECCEZIONE,
} from "./domain/orariStudio";

const MAX_GIORNI = 14;

// `giornoValido` esiste già più in alto, e controlla anche che la data
// esista davvero (31 febbraio no). Scriverne un secondo, più debole,
// sarebbe stata la solita seconda copia.

/** Gli estremi del giorno, per pescare gli impegni da Firestore. */
const estremi = (giorno: string): {da: Date; a: Date} => {
  const [y, m, d] = giorno.split("-").map(Number);
  return {
    da: new Date(y, m - 1, d, 0, 0, 0, 0),
    a: new Date(y, m - 1, d, 23, 59, 59, 999),
  };
};

const oraDi = (v: unknown, fallback: string): string =>
  typeof v === "string" && /^\d{1,2}:\d{2}$/.test(v) ? v : fallback;

/** Tutto ciò che occupa lo studio quel giorno, ridotto a due ore. */
async function impegniDelGiorno(giorno: string) {
  const {da, a} = estremi(giorno);
  const inizio = admin.firestore.Timestamp.fromDate(da);
  const fine = admin.firestore.Timestamp.fromDate(a);

  const occupato: Array<{inizio: string; fine: string}> = [];
  const aggiungi = (docs: FirebaseFirestore.QueryDocumentSnapshot[]) => {
    for (const d of docs) {
      const x = d.data();
      // Una seduta annullata libera il posto: è il senso di annullarla.
      const stato = String(x.status || "");
      if (stato.startsWith("cancelled")) continue;
      occupato.push({
        inizio: oraDi(x.startTime, "00:00"),
        fine: oraDi(x.endTime, "23:59"),
      });
    }
  };

  const [sedute, visite] = await Promise.all([
    db().collection("sessions")
      .where("date", ">=", inizio).where("date", "<=", fine).get(),
    db().collection("nutritionistAppointments")
      .where("date", ">=", inizio).where("date", "<=", fine).get(),
  ]);
  aggiungi(sedute.docs);
  aggiungi(visite.docs);

  // Gli ospiti confermati (persone non ancora in anagrafica) occupano
  // il posto come tutti gli altri: dimenticarli vorrebbe dire
  // proporre un'ora che in realtà è presa.
  const ospiti = await db().collection("bookingRequests")
    .where("giorno", "==", giorno).where("stato", "==", "confermata").get();
  for (const d of ospiti.docs) {
    const ora = oraDi(d.data().ora, "");
    if (!ora) continue;
    const [h, mm] = ora.split(":").map(Number);
    const fineMin = h * 60 + mm + 60;
    occupato.push({
      inizio: ora,
      fine: `${String(Math.floor(fineMin / 60) % 24).padStart(2, "0")}:` +
        `${String(fineMin % 60).padStart(2, "0")}`,
    });
  }

  return occupato;
}

export const calLiberi = onRequest(
  {region: "europe-west1", cors: true, maxInstances: 5},
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "GET" && req.method !== "POST") {
      res.status(405).json({errore: "Serve GET o POST."});
      return;
    }

    const chiave = String(
      req.get("x-cal-key") ||
      (req.query && req.query.chiave) ||
      (req.body && req.body.chiave) || ""
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

    const dati = req.method === "GET" ? req.query : (req.body || {});
    const giorni = String(dati.giorno || dati.giorni || "")
      .split(",").map((g) => g.trim()).filter(Boolean);

    if (!giorni.length) {
      res.status(400).json({
        errore: "Serve almeno un giorno, nel formato AAAA-MM-GG.",
        regola: regolaDellaGiornata(),
      });
      return;
    }
    if (giorni.length > MAX_GIORNI) {
      res.status(400).json({errore: `Troppi giorni in una volta (max ${MAX_GIORNI}).`});
      return;
    }
    const storti = giorni.filter((g) => !giornoValido(g));
    if (storti.length) {
      res.status(400).json({
        errore: `Giorno non valido: ${storti.join(", ")}. Serve AAAA-MM-GG.`,
      });
      return;
    }

    const durata = Number(dati.durata) > 0 ? Number(dati.durata) : undefined;
    const conEccezioni = String(dati.eccezioni || "") === "1" ||
      dati.eccezioni === true;

    const risposta = [];
    for (const giorno of giorni) {
      const impegni = await impegniDelGiorno(giorno);
      const liberi = slotLiberi({impegni, durata, conEccezioni});
      risposta.push({
        giorno,
        liberi: liberi.map((s) => ({
          inizio: s.inizio, fine: s.fine, eccezione: s.eccezione,
        })),
        occupate: impegni.length,
        testo: descriviSlot(liberi, giorno),
      });
    }

    res.status(200).json({
      ok: true,
      regola: {
        apertura: APERTURA,
        ultimoInizio: ULTIMO_INIZIO,
        ultimoInizioEccezione: ULTIMO_INIZIO_ECCEZIONE,
        testo: regolaDellaGiornata(),
      },
      giorni: risposta,
      // Il limite viaggia INSIEME ai dati: chi legge la risposta —
      // persona o modello — lo trova lì dentro, non altrove.
      avviso: AVVISO_SOLA_LETTURA,
    });
  }
);
