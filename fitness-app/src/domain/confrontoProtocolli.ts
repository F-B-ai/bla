import { PrioritaScelta, Scelte, SCELTE_VUOTE } from './protocolloScelte';

// ============================================================
// SETTEMBRE ACCANTO A GENNAIO
// ------------------------------------------------------------
// L'archivio dei protocolli, da solo, è una pila di fogli. Il
// valore non sta nel singolo protocollo: sta nella DIFFERENZA fra
// due, perché quella differenza è il percorso della persona.
//
// ------------------------------------------------------------
// LA DISTINZIONE CHE NON SI PUÒ PERDERE
// ------------------------------------------------------------
// Una priorità che c'era e non c'è più può voler dire due cose
// opposte:
//
//  · la misura non la accende più — qualcosa si è mosso;
//  · il direttore tecnico l'ha messa da parte — la decisione è
//    sua, e il motivo è scritto.
//
// Confonderle sarebbe grave in tutte e due le direzioni: farebbe
// passare per miglioramento una scelta di lavoro, o per scelta un
// miglioramento vero. Il sistema sa quale delle due è, perché le
// messe da parte sono registrate: quindi lo deve dire.
//
// ------------------------------------------------------------
// E NON SI DICE «MIGLIORATO»
// ------------------------------------------------------------
// Che una priorità non si accenda più è un fatto. Che la persona
// stia meglio è un'interpretazione, e la fa chi guarda, non il
// software. Qui si scrive «non compare più fra le priorità»: è
// vero, ed è sufficiente.
// ============================================================

export const CONFRONTO_VERSION = 1;

/** Un protocollo, ridotto a quello che serve per confrontarlo. */
export interface ProtocolloDaConfrontare {
  data: Date;
  priorita: PrioritaScelta[];
  scelte?: Scelte;
  piano?: {
    totaleSedute?: number;
    settimane?: number;
    totaleEuro?: number;
    seduteASettimana?: number;
  } | null;
}

export type MotivoUscita = 'messa_da_parte' | 'non_si_accende_piu';

export interface Uscita {
  titolo: string;
  motivoUscita: MotivoUscita;
  /** il perché scritto, quando è stata una decisione */
  motivo?: string;
}

export interface Differenza {
  giorni: number;
  entrate: PrioritaScelta[];
  uscite: Uscita[];
  rimaste: string[];
  sedutePrima: number;
  seduteDopo: number;
  settimanePrima: number;
  settimaneDopo: number;
  euroPrima: number;
  euroDopo: number;
}

const titoli = (p: PrioritaScelta[]): string[] => (p || []).map((x) => x.titolo);

const giorniFra = (a: Date, b: Date): number => {
  if (!(a instanceof Date) || !(b instanceof Date)) return 0;
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.round(Math.abs(b.getTime() - a.getTime()) / 86400000);
};

/**
 * Che cosa è cambiato fra due protocolli della stessa persona.
 *
 * `prima` è il più vecchio, `dopo` il più recente. Se arrivano al
 * contrario il confronto direbbe il rovescio della verità, quindi
 * li si rimette in ordine qui: la data la sanno tutti e due.
 */
export const confronta = (
  a: ProtocolloDaConfrontare,
  b: ProtocolloDaConfrontare
): Differenza => {
  const inOrdine = a.data.getTime() <= b.data.getTime();
  const prima = inOrdine ? a : b;
  const dopo = inOrdine ? b : a;

  const titoliPrima = titoli(prima.priorita);
  const titoliDopo = titoli(dopo.priorita);
  const messeDaParte = (dopo.scelte || SCELTE_VUOTE).messeDaParte || [];

  const uscite: Uscita[] = titoliPrima
    .filter((t) => !titoliDopo.includes(t))
    .map((t) => {
      const scelta = messeDaParte.find((m) => m.titolo === t);
      return scelta
        ? { titolo: t, motivoUscita: 'messa_da_parte' as MotivoUscita, motivo: scelta.motivo }
        : { titolo: t, motivoUscita: 'non_si_accende_piu' as MotivoUscita };
    });

  return {
    giorni: giorniFra(prima.data, dopo.data),
    entrate: (dopo.priorita || []).filter((p) => !titoliPrima.includes(p.titolo)),
    uscite,
    rimaste: titoliDopo.filter((t) => titoliPrima.includes(t)),
    sedutePrima: prima.piano?.totaleSedute || 0,
    seduteDopo: dopo.piano?.totaleSedute || 0,
    settimanePrima: prima.piano?.settimane || 0,
    settimaneDopo: dopo.piano?.settimane || 0,
    euroPrima: prima.piano?.totaleEuro || 0,
    euroDopo: dopo.piano?.totaleEuro || 0,
  };
};

const mesi = (giorni: number): string => {
  if (giorni < 45) return `${giorni} giorni`;
  const m = Math.round(giorni / 30);
  return `${m} mesi`;
};

/**
 * Il confronto a parole.
 *
 * Righe corte, una per fatto. Niente «migliorato»: quello lo dice
 * chi guarda la persona, non il software.
 */
export const raccontaDifferenza = (d: Differenza): string[] => {
  const righe: string[] = [];
  righe.push(`Fra i due protocolli sono passati ${mesi(d.giorni)}.`);

  d.uscite.forEach((u) => {
    righe.push(u.motivoUscita === 'messa_da_parte'
      ? `«${u.titolo}» l'hai messa da parte${u.motivo ? `: ${u.motivo}` : ''}.`
      : `«${u.titolo}» non compare più fra le priorità: le misure non la accendono.`);
  });

  d.entrate.forEach((p) => {
    righe.push(p.origine === 'riferita'
      ? `«${p.titolo}» è entrata: l'hai aggiunta tu${p.motivo ? ` — ${p.motivo}` : ''}.`
      : `«${p.titolo}» è entrata: l'hanno accesa le misure nuove.`);
  });

  if (d.rimaste.length) {
    righe.push(d.rimaste.length === 1
      ? `Resta aperta: ${d.rimaste[0]}.`
      : `Restano aperte: ${d.rimaste.join(', ')}.`);
  }

  const pianoCambiato = d.sedutePrima !== d.seduteDopo && (d.sedutePrima || d.seduteDopo);
  if (pianoCambiato) {
    righe.push(`Le sedute passano da ${d.sedutePrima} a ${d.seduteDopo}`
      + (d.settimaneDopo ? `, su circa ${d.settimaneDopo} settimane.` : '.'));
  }

  // «Restano aperte» non è un cambiamento: è il contrario. Senza
  // questo, un protocollo identico al precedente si leggeva come se
  // qualcosa si fosse mosso.
  if (!d.entrate.length && !d.uscite.length && !pianoCambiato) {
    righe.push('Per il resto non è cambiato niente: stesse priorità, stesso piano.');
  }
  return righe;
};

/** Una riga sola, per la lista dell'archivio. */
export const riassumiDifferenza = (d: Differenza): string => {
  const pezzi: string[] = [];
  if (d.entrate.length) pezzi.push(`${d.entrate.length} in più`);
  const via = d.uscite.filter((u) => u.motivoUscita === 'non_si_accende_piu').length;
  const daParte = d.uscite.length - via;
  if (via) pezzi.push(`${via} non si ${via === 1 ? 'accende' : 'accendono'} più`);
  if (daParte) pezzi.push(`${daParte} da parte`);
  if (!pezzi.length) return `Nessun cambiamento nelle priorità in ${mesi(d.giorni)}.`;
  return `In ${mesi(d.giorni)}: ${pezzi.join(', ')}.`;
};
