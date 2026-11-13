// ============================================================
// IL CONTROLLO ACCESSI — chi può entrare, e da quando
// ------------------------------------------------------------
// 11 novembre 2026. Dopo il buco sulle funzioni amministrative il
// titolare deve poter rispondere da solo a una domanda semplice:
// «chi ha le chiavi di casa, e qualcuno le ha toccate?».
//
// Questa logica mette accanto due elenchi che nell'applicazione non
// si erano mai guardati insieme: gli ACCESSI (gli account con cui si
// entra, tenuti da Firebase) e l'ANAGRAFICA (le schede delle persone).
// Dove non combaciano, lo dice.
//
// Che cosa NON può dire: chi ha fatto una modifica prima di oggi. Le
// date di Firebase dicono QUANDO un account è stato creato, quando è
// entrato l'ultima volta e quando le sue sessioni sono state chiuse;
// non dicono da chi. Da oggi in poi, il «chi» lo scrive il Registro.
// ============================================================

export const CONTROLLO_ACCESSI_VERSIONE = 1;

/** Un account di accesso, come lo restituisce Firebase (date in ISO). */
export interface AccountIn {
  uid: string;
  email?: string;
  disabilitato?: boolean;
  creato?: string | null;
  ultimoIngresso?: string | null;
  ultimaAttivita?: string | null;
  /** da questo momento valgono solo le sessioni aperte dopo */
  sessioniValideDal?: string | null;
  /** il ruolo scritto nel token: le regole dei FILE si fidano di questo */
  ruoloToken?: string;
}

/** Una scheda dell'anagrafica. */
export interface SchedaIn {
  id: string;
  email?: string;
  role?: string;
  name?: string;
  surname?: string;
  isActive?: boolean;
}

export type Gravita = 'alta' | 'media' | 'bassa';

export interface Segnalazione {
  gravita: Gravita;
  testo: string;
}

export interface RigaAccesso {
  uid: string;
  nome: string;
  ruolo: string;
  emailAccesso: string;
  emailScheda: string;
  creato: string | null;
  ultimoIngresso: string | null;
  ultimaAttivita: string | null;
  sessioniValideDal: string | null;
  disabilitato: boolean;
  /** la scheda dice che la persona non è più attiva */
  schedaDisattivata: boolean;
  /**
   * l'accesso non ha nessuna scheda in anagrafica: è l'unico caso in
   * cui lo schermo offre «Elimina accesso». Facoltativo perché una
   * fotografia fatta da un server più vecchio non lo porta: assente
   * vale «no», e il pulsante non compare.
   */
  senzaScheda?: boolean;
  staff: boolean;
  segnalazioni: Segnalazione[];
}

export interface ControlloAccessi {
  versione: number;
  generatoIl: string;
  righe: RigaAccesso[];
  /** schede di staff che non hanno nessun accesso */
  staffSenzaAccesso: Array<{ id: string; nome: string; ruolo: string }>;
  conteggi: {
    accessi: number;
    staff: number;
    titolari: number;
    conSegnalazioni: number;
  };
  /** problemi di tutto l'insieme, non di una persona sola */
  generali: Segnalazione[];
}

const STAFF = new Set(['owner', 'manager', 'collaborator']);

/** Quanti giorni indietro una chiusura delle sessioni si segnala. */
export const GIORNI_SESSIONI_RECENTI = 30;
/** Uno staff che non entra da più di tanto si segnala. */
export const GIORNI_SENZA_INGRESSO = 30;

const NOME_RUOLO: Record<string, string> = {
  owner: 'titolare',
  manager: 'manager',
  collaborator: 'collaboratore',
  student: 'allievo',
  academy_student: 'allievo Academy',
};

const data = (s: string | null | undefined): Date | null => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const giorni = (da: Date, a: Date): number => Math.floor((a.getTime() - da.getTime()) / 86400000);

const norm = (e: string | undefined): string => (e || '').trim().toLowerCase();

const quando = (d: Date): string => d.toLocaleDateString('it-IT', {
  day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Rome',
});

const ORDINE_GRAVITA: Record<Gravita, number> = { alta: 0, media: 1, bassa: 2 };
// A parità di gravità, prima chi non ha una scheda: un accesso che
// nessuno sa a chi appartenga viene prima di tutto, titolare compreso.
const ORDINE_RUOLO = (r: string): number =>
  r === '' ? -1 : r === 'owner' ? 0 : r === 'manager' ? 1 : r === 'collaborator' ? 2 : 4;

/**
 * Mette accanto accessi e anagrafica. Funzione pura: non legge niente,
 * non scrive niente.
 */
export const analizzaAccessi = (
  accounts: AccountIn[],
  schede: SchedaIn[],
  adesso: Date
): ControlloAccessi => {
  const perId = new Map<string, SchedaIn>();
  for (const s of schede || []) if (s && s.id) perId.set(s.id, s);

  const righe: RigaAccesso[] = [];
  const uidConAccesso = new Set<string>();

  for (const a of accounts || []) {
    if (!a || !a.uid) continue;
    uidConAccesso.add(a.uid);
    const scheda = perId.get(a.uid);
    const ruolo = scheda?.role || '';
    const staff = STAFF.has(ruolo);
    const segnalazioni: Segnalazione[] = [];

    if (!scheda) {
      segnalazioni.push({
        gravita: 'alta',
        testo: 'Accesso che non corrisponde a nessuna persona in anagrafica: chi entra con questo account non ha una scheda.',
      });
    }

    const eA = norm(a.email);
    const eS = norm(scheda?.email);
    if (scheda && eA && eS && eA !== eS) {
      segnalazioni.push({
        gravita: staff ? 'alta' : 'media',
        testo: `L'email con cui entra («${a.email}») non è quella della scheda («${scheda.email}»).`,
      });
    }

    // Il ruolo nel token decide i permessi sui file (foto, documenti).
    // Se non è quello della scheda, una persona declassata può tenere
    // poteri che non ha più.
    if (scheda && a.ruoloToken && a.ruoloToken !== ruolo) {
      const potente = STAFF.has(a.ruoloToken);
      segnalazioni.push({
        gravita: potente ? 'alta' : 'media',
        testo: `Il ruolo scritto nel suo accesso («${NOME_RUOLO[a.ruoloToken] || a.ruoloToken}») non è quello della scheda («${NOME_RUOLO[ruolo] || ruolo || 'nessuno'}»): i permessi sui file seguono l'accesso. Allinea i ruoli da Team.`,
      });
    }

    const schedaDisattivata = scheda?.isActive === false;
    if (schedaDisattivata && !a.disabilitato) {
      segnalazioni.push({
        gravita: staff ? 'alta' : 'media',
        testo: 'La scheda è disattivata ma l\'accesso è ancora abilitato: può ancora entrare, anche se il database gli nega i dati.',
      });
    }

    const creato = data(a.creato);
    const sessioni = data(a.sessioniValideDal);
    if (sessioni && giorni(sessioni, adesso) <= GIORNI_SESSIONI_RECENTI
      && (!creato || sessioni.getTime() - creato.getTime() > 60000)) {
      segnalazioni.push({
        gravita: staff ? 'media' : 'bassa',
        testo: `Le sessioni sono state chiuse il ${quando(sessioni)}: succede quando la password viene cambiata o le sessioni vengono revocate. Se non è stata una tua scelta, va chiarito.`,
      });
    }

    const ingresso = data(a.ultimoIngresso);
    if (staff && !a.disabilitato && !schedaDisattivata) {
      if (!ingresso) {
        segnalazioni.push({ gravita: 'bassa', testo: 'Non è mai entrato.' });
      } else if (giorni(ingresso, adesso) > GIORNI_SENZA_INGRESSO) {
        segnalazioni.push({
          gravita: 'bassa',
          testo: `Non entra da ${giorni(ingresso, adesso)} giorni.`,
        });
      }
    }

    segnalazioni.sort((x, y) => ORDINE_GRAVITA[x.gravita] - ORDINE_GRAVITA[y.gravita]);
    const nome = scheda ? `${scheda.name || ''} ${scheda.surname || ''}`.trim() : '';
    righe.push({
      uid: a.uid,
      senzaScheda: !scheda,
      nome: nome || (scheda ? 'Senza nome' : 'Non in anagrafica'),
      ruolo: NOME_RUOLO[ruolo] || (ruolo ? ruolo : 'nessuno'),
      emailAccesso: a.email || '',
      emailScheda: scheda?.email || '',
      creato: a.creato || null,
      ultimoIngresso: a.ultimoIngresso || null,
      ultimaAttivita: a.ultimaAttivita || null,
      sessioniValideDal: a.sessioniValideDal || null,
      disabilitato: a.disabilitato === true,
      schedaDisattivata,
      staff,
      segnalazioni,
    });
  }

  const generali: Segnalazione[] = [];
  const titolari = righe.filter((r) => perId.get(r.uid)?.role === 'owner');
  if (titolari.length > 1) {
    generali.push({
      gravita: 'alta',
      testo: `Ci sono ${titolari.length} accessi con ruolo di titolare: ${titolari.map((t) => `${t.nome} (${t.emailAccesso})`).join(', ')}. Ogni titolare ha tutti i poteri.`,
    });
  }
  if (titolari.length === 0 && righe.length > 0) {
    generali.push({
      gravita: 'alta',
      testo: 'Nessun accesso ha il ruolo di titolare.',
    });
  }

  const staffSenzaAccesso = (schede || [])
    .filter((s) => s && STAFF.has(s.role || '') && s.isActive !== false && !uidConAccesso.has(s.id))
    .map((s) => ({
      id: s.id,
      nome: `${s.name || ''} ${s.surname || ''}`.trim() || 'Senza nome',
      ruolo: NOME_RUOLO[s.role || ''] || s.role || '',
    }));

  const peso = (r: RigaAccesso): number =>
    r.segnalazioni.length ? ORDINE_GRAVITA[r.segnalazioni[0].gravita] : 9;
  righe.sort((x, y) =>
    peso(x) - peso(y)
    || ORDINE_RUOLO(perId.get(x.uid)?.role || '') - ORDINE_RUOLO(perId.get(y.uid)?.role || '')
    || x.nome.localeCompare(y.nome));

  return {
    versione: CONTROLLO_ACCESSI_VERSIONE,
    generatoIl: adesso.toISOString(),
    righe,
    staffSenzaAccesso,
    conteggi: {
      accessi: righe.length,
      staff: righe.filter((r) => r.staff).length,
      titolari: titolari.length,
      conSegnalazioni: righe.filter((r) => r.segnalazioni.some((s) => s.gravita !== 'bassa')).length,
    },
    generali,
  };
};
