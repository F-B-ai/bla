import * as admin from "firebase-admin";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {
  costruisciRapporto,
  giornoRoma,
  spostaGiorno,
  RapportoMattino,
  PianoIn,
  MovimentoIn,
  SedutaIn,
  PersonaIn,
  RataIn,
} from "./domain/rapportoMattino";

// ============================================================
// IL RAPPORTO DEL MATTINO — lettura dei dati e consegna al titolare
// ------------------------------------------------------------
// La LOGICA non sta qui: sta in src/domain/rapportoMattino.ts, pura e
// provata. Qui ci sono solo tre cose:
//
//  1. LEGGERE dal database quello che serve, in sola lettura
//     (piani di pagamento, movimenti, sedute, anagrafica).
//  2. SCRIVERE il rapporto in `rapportiMattino/{giorno}`.
//  3. CONSEGNARLO al titolare, e solo a lui.
//
// CHI LO PUÒ LEGGERE. La collezione `rapportiMattino` non compare
// nelle regole di sicurezza, e senza una regola Firestore nega tutto:
// dall'applicazione non la legge NESSUNO, nemmeno il titolare. L'unica
// porta è la funzione `rapportoMattino` qui sotto, che controlla sul
// server che chi chiama sia il titolare. Niente regole nuove da
// scrivere, niente regole da sbagliare.
//
// Non manda messaggi, non modifica piani né movimenti, non chiama
// nessuna intelligenza artificiale: legge, somma e scrive un foglio.
// ============================================================

const db = () => admin.firestore();

export const COLLEZIONE_RAPPORTI = "rapportiMattino";

/** Quanti giorni di sedute si leggono: il mese in corso e i 30 giorni. */
const GIORNI_SEDUTE_LETTE = 40;

type Doc = Record<string, unknown>;

/** Una data scritta in qualunque dei modi che il database conosce. */
const comeData = (x: unknown): Date | null => {
  if (!x) return null;
  if (x instanceof Date) return isNaN(x.getTime()) ? null : x;
  const t = x as {toDate?: () => Date; seconds?: number};
  if (typeof t.toDate === "function") return t.toDate();
  if (typeof t.seconds === "number") return new Date(t.seconds * 1000);
  if (typeof x === "string" || typeof x === "number") {
    const d = new Date(x);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const testo = (x: unknown): string | undefined =>
  typeof x === "string" && x ? x : undefined;
const numero = (x: unknown): number | undefined =>
  typeof x === "number" && isFinite(x) ? x : undefined;

/** Legge tutto quello che serve e lo riduce alle forme del dominio. */
export const leggiDatiRapporto = async (adesso: Date): Promise<{
  piani: PianoIn[];
  movimenti: MovimentoIn[];
  sedute: SedutaIn[];
  persone: PersonaIn[];
}> => {
  const daSedute = new Date(
    `${spostaGiorno(giornoRoma(adesso), -GIORNI_SEDUTE_LETTE)}T00:00:00Z`
  );
  const [pianiSnap, movSnap, seduteSnap, personeSnap] = await Promise.all([
    db().collection("paymentPlans").get(),
    db().collection("financialTransactions").get(),
    db().collection("sessions")
      .where("date", ">=", admin.firestore.Timestamp.fromDate(daSedute)).get(),
    db().collection("users").get(),
  ]);

  const piani: PianoIn[] = pianiSnap.docs.map((d) => {
    const x = d.data() as Doc;
    const rate = Array.isArray(x.installments) ? x.installments as Doc[] : [];
    return {
      id: d.id,
      studentId: testo(x.studentId),
      collaboratorId: testo(x.collaboratorId),
      installments: rate.filter(Boolean).map((r): RataIn => ({
        id: testo(r.id),
        amount: numero(r.amount),
        dueDate: comeData(r.dueDate),
        paidDate: comeData(r.paidDate),
        status: testo(r.status),
        transferPending: r.transferPending === true,
      })),
    };
  });

  const movimenti: MovimentoIn[] = movSnap.docs.map((d) => {
    const x = d.data() as Doc;
    return {
      type: testo(x.type),
      amount: numero(x.amount),
      date: comeData(x.date),
      collaboratorId: testo(x.collaboratorId),
      studentId: testo(x.studentId),
    };
  });

  const sedute: SedutaIn[] = seduteSnap.docs.map((d) => {
    const x = d.data() as Doc;
    return {
      id: d.id,
      studentId: testo(x.studentId),
      collaboratorId: testo(x.collaboratorId),
      date: comeData(x.date),
      status: testo(x.status),
      isCountedAsCompleted: x.isCountedAsCompleted === true,
      scaloDaFare: x.scaloDaFare === true,
    };
  });

  const persone: PersonaIn[] = personeSnap.docs.map((d) => {
    const x = d.data() as Doc;
    return {
      id: d.id,
      role: testo(x.role),
      name: testo(x.name),
      surname: testo(x.surname),
      isActive: x.isActive === false ? false : undefined,
      commissionPercentage: numero(x.commissionPercentage),
      assignedCollaboratorIds: Array.isArray(x.assignedCollaboratorIds) ?
        (x.assignedCollaboratorIds as unknown[]).filter(
          (v): v is string => typeof v === "string") : undefined,
      assignedCollaboratorId: testo(x.assignedCollaboratorId),
      coachCommissionPercentage: numero(x.coachCommissionPercentage),
    };
  });

  return {piani, movimenti, sedute, persone};
};

/** Firestore rifiuta `undefined`: il rapporto passa per JSON. */
const pulito = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/**
 * Calcola il rapporto di oggi e lo scrive. Lo chiama il motore
 * notturno delle 04:00; il titolare può rilanciarlo a mano.
 * Rilanciarlo riscrive il foglio del giorno: non ne crea due.
 */
export const generaRapportoMattino = async (
  adesso: Date = new Date(),
  origine: "notturno" | "manuale" = "notturno"
): Promise<RapportoMattino> => {
  const dati = await leggiDatiRapporto(adesso);
  const rapporto = costruisciRapporto({adesso, ...dati});
  await db().collection(COLLEZIONE_RAPPORTI).doc(rapporto.giorno).set({
    ...pulito(rapporto),
    origine,
    scrittoIl: admin.firestore.FieldValue.serverTimestamp(),
  });
  return rapporto;
};

async function soloTitolare(uid: string): Promise<void> {
  const utente = await db().collection("users").doc(uid).get();
  if (!utente.exists || utente.data()?.role !== "owner") {
    throw new HttpsError(
      "permission-denied", "Il rapporto del mattino è riservato al titolare.");
  }
}

/**
 * La porta del titolare. Senza argomenti restituisce l'ultimo rapporto
 * scritto; con `{aggiorna: true}` lo ricalcola adesso. Chi non è il
 * titolare riceve un rifiuto, qualunque cosa chieda.
 */
export const rapportoMattino = onCall(
  {region: "europe-west1", timeoutSeconds: 120, memory: "256MiB"},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Devi essere autenticato.");
    }
    await soloTitolare(request.auth.uid);

    try {
      if (request.data?.aggiorna === true) {
        return pulito(await generaRapportoMattino(new Date(), "manuale"));
      }
      const ultimo = await db().collection(COLLEZIONE_RAPPORTI)
        .orderBy("giorno", "desc").limit(1).get();
      if (ultimo.empty) {
        // Mai girato (appena installato): lo si calcola al volo.
        return pulito(await generaRapportoMattino(new Date(), "manuale"));
      }
      const dati = ultimo.docs[0].data();
      delete dati.scrittoIl; // un Timestamp non attraversa la chiamata
      return dati;
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      const motivo = (err as {code?: string; message?: string})?.code ||
        (err as Error)?.message || String(err);
      throw new HttpsError("internal", `Rapporto del mattino: ${motivo}`);
    }
  }
);
