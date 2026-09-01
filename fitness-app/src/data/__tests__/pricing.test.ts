import { TIERS, PRICING_NOTES } from '../pricingData';
import { CONDUTTORI, PREZZO_VALUTAZIONE, conduttore } from '../../domain/protocollo';

// ============================================================
// I PREZZI DETTI ALL'ALLIEVO E QUELLI USATI NEL PROTOCOLLO
// ------------------------------------------------------------
// Il difetto trovato: il listino da cui rispondeva l'Assistente
// diceva ancora «Personal 35 €» e «Analisi posturale 49 €», mentre
// il protocollo componeva i percorsi a 40/35/25 e la valutazione
// a 150 €. Un allievo poteva sentirsi dire un prezzo e vederne un
// altro sul documento da firmare.
//
// Questi test tengono insieme le due fonti: se una cambia e l'altra
// no, la suite si ferma prima che lo scopra un cliente.
// ============================================================

const tier = (id: string) => TIERS.find((t) => t.id === id);

describe('il personal costa quanto è stato deciso', () => {
  it('il listino apre a 40 €, come il direttore tecnico', () => {
    const pt = tier('personal_training')!;
    expect(pt.amount).toBe(40);
    expect(pt.amount).toBe(conduttore('francesco').prezzo);
    expect(pt.priceLabel).toContain('40');
  });

  it('le tariffe dello staff sono dette, e sono quelle del protocollo', () => {
    const note = PRICING_NOTES.join(' ');
    CONDUTTORI.forEach((c) => {
      expect(note).toContain(`€${c.prezzo}`);
    });
    expect(note).toContain('programma resta unico');
  });
});

describe('la valutazione completa', () => {
  it('costa 150 €, come nel protocollo', () => {
    const v = tier('valutazione_mind_movement')!;
    expect(v.amount).toBe(PREZZO_VALUTAZIONE);
    expect(v.priceLabel).toContain('150');
  });

  it('dice che cosa comprende, protocollo firmato incluso', () => {
    const v = tier('valutazione_mind_movement')!;
    const testo = v.features.join(' ').toLowerCase();
    expect(testo).toContain('lettura integrata');
    expect(testo).toContain('protocollo');
    expect(testo).toContain('composizione corporea');
  });

  it('l\'analisi posturale isolata a 49 € non esiste più', () => {
    expect(tier('postural_standalone')).toBeUndefined();
    const tutto = JSON.stringify(TIERS);
    expect(tutto).not.toContain('€49');
  });

  it('il perimetro sanitario è dichiarato anche nel listino', () => {
    const note = PRICING_NOTES.join(' ').toLowerCase();
    expect(note).toContain('screening');
    expect(note).toContain('professionista sanitario');
  });
});

describe('nessun prezzo resta a zero per distrazione', () => {
  it('ogni voce del listino ha un importo e un\'etichetta coerenti', () => {
    TIERS.forEach((t) => {
      expect(t.amount).toBeGreaterThan(0);
      expect(t.priceLabel.replace(/[^0-9]/g, '').length).toBeGreaterThan(0);
    });
  });
});
