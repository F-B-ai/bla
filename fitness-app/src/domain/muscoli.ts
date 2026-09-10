// ============================================================
// I GRUPPI MUSCOLARI — come si cerca un esercizio davvero
// ------------------------------------------------------------
// La libreria era ordinata per TIPO di esercizio: forza, cardio,
// mobilità, posturale. È una classificazione corretta e inutile al
// momento in cui serve, perché nessun coach pensa «adesso mi serve
// un esercizio di forza». Pensa: **adesso mi servono i glutei**.
//
// Il titolare, il 10 settembre 2026: «Le categorie sono i muscoli
// che voglio allenare».
//
// Qui vivono i gruppi, il loro ordine, e il modo in cui la libreria
// si divide. In un posto solo: se domani si aggiunge un gruppo, si
// aggiunge qui e compare ovunque.
// ============================================================

export const MUSCOLI_VERSION = 1;

export type GruppoMuscolare =
  | 'pettorali'
  | 'dorsali'
  | 'spalle'
  | 'bicipiti'
  | 'tricipiti'
  | 'glutei'
  | 'quadricipiti'
  | 'femorali'
  | 'polpacci'
  | 'addome'
  | 'lombari'
  | 'totalBody'
  | 'cardio'
  | 'mobilita'
  /** l'esercizio aggiunto dal coach senza scegliere un gruppo */
  | 'daClassificare';

export interface Gruppo {
  id: GruppoMuscolare;
  nome: string;
  /** dove sta nel corpo: serve a raggrupparli nella schermata */
  zona: 'Parte superiore' | 'Parte inferiore' | 'Centro' | 'Generale' | 'Da sistemare';
  icona: string;
  /** una riga che dice che cosa ci si allena, per chi non è del mestiere */
  cosaAllena: string;
}

/**
 * L'ordine non è alfabetico: è quello con cui si compone una scheda.
 * Prima la parte superiore dai grandi ai piccoli, poi la inferiore,
 * poi il centro, poi ciò che non appartiene a un muscolo solo.
 */
export const GRUPPI: Gruppo[] = [
  { id: 'pettorali', nome: 'Pettorali', zona: 'Parte superiore', icona: 'body-outline',
    cosaAllena: 'Spinta orizzontale: panca, croci, piegamenti.' },
  { id: 'dorsali', nome: 'Dorsali e schiena', zona: 'Parte superiore', icona: 'arrow-down-outline',
    cosaAllena: 'Tirate verticali e orizzontali: trazioni, rematori, lat machine.' },
  { id: 'spalle', nome: 'Spalle e trapezio', zona: 'Parte superiore', icona: 'triangle-outline',
    cosaAllena: 'Spinta sopra la testa, alzate, e la parte alta del dorso.' },
  { id: 'bicipiti', nome: 'Bicipiti', zona: 'Parte superiore', icona: 'barbell-outline',
    cosaAllena: 'Flessione del gomito: tutte le forme di curl.' },
  { id: 'tricipiti', nome: 'Tricipiti', zona: 'Parte superiore', icona: 'barbell-outline',
    cosaAllena: 'Estensione del gomito: pushdown, french press, dip.' },

  { id: 'glutei', nome: 'Glutei', zona: 'Parte inferiore', icona: 'ellipse-outline',
    cosaAllena: 'Estensione e abduzione dell\'anca: ponte, hip thrust, kickback, abduzioni.' },
  { id: 'quadricipiti', nome: 'Quadricipiti', zona: 'Parte inferiore', icona: 'walk-outline',
    cosaAllena: 'Estensione del ginocchio: squat, pressa, affondi frontali.' },
  { id: 'femorali', nome: 'Femorali', zona: 'Parte inferiore', icona: 'walk-outline',
    cosaAllena: 'Catena posteriore della coscia: stacco rumeno, leg curl, good morning.' },
  { id: 'polpacci', nome: 'Polpacci', zona: 'Parte inferiore', icona: 'footsteps-outline',
    cosaAllena: 'Flessione plantare: calf raise in tutte le varianti.' },

  { id: 'addome', nome: 'Addome e core', zona: 'Centro', icona: 'shield-outline',
    cosaAllena: 'Flessione, rotazione e soprattutto anti-movimento: plank, crunch, hollow.' },
  { id: 'lombari', nome: 'Lombari', zona: 'Centro', icona: 'shield-half-outline',
    cosaAllena: 'Estensori della colonna e controllo del bacino.' },

  { id: 'totalBody', nome: 'Total body', zona: 'Generale', icona: 'flash-outline',
    cosaAllena: 'Esercizi che non appartengono a un muscolo solo: stacco, swing, burpees.' },
  { id: 'cardio', nome: 'Cardio', zona: 'Generale', icona: 'heart-outline',
    cosaAllena: 'Lavoro sulla capacità: vogatore, cyclette, camminata, salti.' },
  { id: 'mobilita', nome: 'Mobilità e respiro', zona: 'Generale', icona: 'leaf-outline',
    cosaAllena: 'Articolarità, scarico e respiro: la parte che quasi nessuno programma.' },

  // Ultimo apposta: chi non ha scelto un gruppo finisce qui, in fondo
  // e ben visibile. Un esercizio senza muscolo non si nasconde dentro
  // «mobilità» facendo finta di niente — si sistema.
  { id: 'daClassificare', nome: 'Da classificare', zona: 'Da sistemare', icona: 'help-circle-outline',
    cosaAllena: 'Esercizi aggiunti senza scegliere il gruppo muscolare: assegnalo e spariscono da qui.' },
];

const PER_ID = new Map(GRUPPI.map((g) => [g.id, g]));

export const gruppo = (id?: GruppoMuscolare | null): Gruppo =>
  (id && PER_ID.get(id)) || GRUPPI[GRUPPI.length - 1];

export const nomeGruppo = (id?: GruppoMuscolare | null): string => gruppo(id).nome;

/** L'ordine in cui i gruppi compaiono: quello di GRUPPI, non l'alfabeto. */
export const ordineGruppo = (id?: GruppoMuscolare | null): number => {
  const i = GRUPPI.findIndex((g) => g.id === id);
  return i === -1 ? GRUPPI.length : i;
};

export const ZONE: Gruppo['zona'][] =
  ['Parte superiore', 'Parte inferiore', 'Centro', 'Generale', 'Da sistemare'];

// ------------------------------------------------------------
// Dividere la libreria
// ------------------------------------------------------------

export type Sesso = 'male' | 'female' | 'unisex';

export interface EsercizioDaDividere {
  name: string;
  muscolo?: GruppoMuscolare;
  gender?: Sesso;
}

export interface SezioneMuscolo<T> {
  gruppo: Gruppo;
  esercizi: T[];
}

/**
 * Che cosa vede chi cerca per «uomo» o per «donna».
 *
 * Un esercizio unisex compare in tutti e due: la panca piana non
 * cambia perché la fa una donna. Filtrare via l'unisex svuoterebbe
 * metà libreria, ed è l'errore facile da fare qui.
 */
export const perSesso = <T extends EsercizioDaDividere>(
  esercizi: T[],
  sesso: Sesso | 'tutti'
): T[] => {
  const lista = esercizi || [];
  if (sesso === 'tutti') return lista;
  return lista.filter((e) => e.gender === sesso || e.gender === 'unisex' || !e.gender);
};

/**
 * Divide la libreria in sezioni, una per gruppo muscolare, nell'ordine
 * con cui si compone una scheda. I gruppi senza esercizi non compaiono:
 * una sezione vuota è rumore, non informazione.
 */
export const dividiPerMuscolo = <T extends EsercizioDaDividere>(
  esercizi: T[],
  sesso: Sesso | 'tutti' = 'tutti'
): SezioneMuscolo<T>[] => {
  const lista = perSesso(esercizi, sesso);
  const per = new Map<GruppoMuscolare, T[]>();

  lista.forEach((e) => {
    const id = e.muscolo || 'daClassificare';
    if (!per.has(id)) per.set(id, []);
    per.get(id)!.push(e);
  });

  return GRUPPI
    .filter((g) => (per.get(g.id) || []).length > 0)
    .map((g) => ({
      gruppo: g,
      esercizi: (per.get(g.id) || [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'it')),
    }));
};

/** Quanti esercizi per gruppo: serve a mostrare il numero accanto al nome. */
export const conteggioPerMuscolo = <T extends EsercizioDaDividere>(
  esercizi: T[],
  sesso: Sesso | 'tutti' = 'tutti'
): Record<string, number> => {
  const out: Record<string, number> = {};
  dividiPerMuscolo(esercizi, sesso).forEach((s) => {
    out[s.gruppo.id] = s.esercizi.length;
  });
  return out;
};

/**
 * I gruppi rimasti senza un solo esercizio per quel sesso.
 * Non è un errore: è la lista della spesa di chi cura la libreria.
 */
export const gruppiScoperti = <T extends EsercizioDaDividere>(
  esercizi: T[],
  sesso: Sesso | 'tutti' = 'tutti'
): Gruppo[] => {
  const pieni = new Set(dividiPerMuscolo(esercizi, sesso).map((s) => s.gruppo.id));
  return GRUPPI.filter((g) => !pieni.has(g.id));
};
