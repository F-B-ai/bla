import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { Modello3D, Tinte } from '../../domain/posture3d';
import { PostureMetrics, cambiamenti } from '../../domain/posture';
import {
  Inquadratura, giudicaInquadratura, confrontaInquadrature,
  altezzaObiettivoCm, parteDelCorpo,
} from '../../domain/inquadratura';
import { LetturaLinea, AVVERTENZA_LINEE } from '../../domain/lineeMiofasciali';
import { Modello3DView } from './Modello3DView';

// ============================================================
// IL RISULTATO DELL'ANALISI 3D — tutto quello che si è letto, e
// quanto ci si può fidare
// ------------------------------------------------------------
// Quattro blocchi, nell'ordine in cui servono a chi lavora:
//
//  1. COM'È STATA PRESA LA FOTO. Prima di ogni numero: distanza,
//     altezza del telefono, centratura. Se c'è una valutazione
//     precedente, dice se le due foto sono confrontabili — e se no,
//     come rifarla uguale. Un confronto fra foto prese in modo
//     diverso non è un confronto.
//  2. IL MODELLO, col «prima» in ombra e le linee.
//  3. LE MISURE, ognuna con di quanto ha oscillato.
//  4. CHE COSA È CAMBIATO — solo quello che supera il margine.
//
// Questo componente non calcola niente: mette in pagina quello che
// ha calcolato il dominio.
// ============================================================

export type ChiaveFotoVista = 'frontale' | 'posteriore' | 'lateraleSx' | 'lateraleDx';

const NOME: Record<ChiaveFotoVista, string> = {
  frontale: 'Frontale',
  lateraleSx: 'Laterale SX',
  lateraleDx: 'Laterale DX',
  posteriore: 'Posteriore',
};
const ORDINE: ChiaveFotoVista[] = ['frontale', 'lateraleSx', 'lateraleDx', 'posteriore'];

export interface DatiPostura3D {
  modello: Modello3D;
  tinte?: Tinte;
  misure?: PostureMetrics[];
  inquadrature?: Partial<Record<ChiaveFotoVista, Inquadratura>>;
  distanze?: Partial<Record<ChiaveFotoVista, number>>;
  linee?: LetturaLinea[];
  motore?: 'accurato' | 'standard';
  letturePerFoto?: number;
}

interface Props {
  dati: DatiPostura3D;
  /** la valutazione precedente con cui confrontare, se c'è */
  prima?: DatiPostura3D | null;
  primaQuando?: string;
  staturaCm?: number | null;
}

const pct = (x: number): string => `${Math.round(x * 100)}%`;
const numero = (x: number): string => String(x).replace('.', ',');

export const RisultatoPostura3D: React.FC<Props> = ({ dati, prima, primaQuando, staturaCm }) => {
  const inq = dati.inquadrature || {};
  const fotoLette = ORDINE.filter((k) => inq[k]);
  const diff = prima ? cambiamenti(prima.misure, dati.misure) : [];
  const oltre = diff.filter((c) => c.esito !== 'entro il margine');
  const statura = staturaCm ?? (dati.modello.staturaDichiarata ? dati.modello.statura_m * 100 : null);

  return (
    <View>
      {/* 1 — com'è stata presa la foto */}
      {fotoLette.length > 0 && (
        <View style={styles.blocco}>
          <Text style={styles.titolo}>Inquadratura</Text>
          <Text style={styles.sotto}>
            Distanza e altezza del telefono, lette dalla foto. Per confrontare due
            valutazioni vanno rifatte uguali.
          </Text>
          {fotoLette.map((k) => {
            const i = inq[k] as Inquadratura;
            const g = giudicaInquadratura(i);
            const cm = altezzaObiettivoCm(i, statura);
            const metri = dati.distanze?.[k];
            const c = prima ? confrontaInquadrature(prima.inquadrature?.[k], i) : null;
            const haPrima = !!prima?.inquadrature?.[k];
            return (
              <View key={k} style={styles.foto}>
                <View style={styles.riga}>
                  <Text style={styles.fotoNome}>{NOME[k]}</Text>
                  <Text style={[styles.esito, { color: g.ok ? colors.success : colors.warning }]}>
                    {g.ok ? 'va bene' : 'da rifare meglio'}
                  </Text>
                </View>
                <Text style={styles.dato}>
                  Distanza: il corpo occupa il {pct(i.riempimento)} della foto
                  {metri ? ` · circa ${numero(metri)} m` : ''}
                </Text>
                <Text style={styles.dato}>
                  Telefono: il centro cade {parteDelCorpo(i.quotaCentro)}
                  {cm ? ` · circa ${cm} cm da terra, se era dritto` : ''}
                </Text>
                {g.consigli.map((x, n) => (
                  <Text key={n} style={styles.consiglio}>→ {x}</Text>
                ))}
                {haPrima && c ? (
                  c.confrontabili ? (
                    <Text style={[styles.dato, { color: colors.success }]}>
                      Presa come la volta scorsa: le misure si possono confrontare.
                    </Text>
                  ) : (
                    c.motivi.map((x, n) => (
                      <Text key={n} style={styles.avviso}>⚠ {x}</Text>
                    ))
                  )
                ) : null}
              </View>
            );
          })}
          <Text style={styles.nota}>
            I metri sono una stima: valgono per l'obiettivo principale del telefono,
            senza zoom e senza ritaglio. Il dato che conta è la percentuale.
          </Text>
        </View>
      )}

      {/* 2 — il modello */}
      <Modello3DView
        modello={dati.modello}
        tinte={dati.tinte}
        linee={dati.linee}
        prima={prima?.modello}
        primaQuando={primaQuando}
        nomeFile="modello-posturale"
      />

      {/* 3 — le misure, con di quanto oscillano */}
      {dati.misure && dati.misure.some((m) => m.quality === 'ok') && (
        <View style={styles.blocco}>
          <Text style={styles.titolo}>Misure</Text>
          <Text style={styles.sotto}>
            {dati.letturePerFoto && dati.letturePerFoto > 1
              ? `Ogni foto è stata letta ${dati.letturePerFoto} volte. Il ± è di quanto la misura ha oscillato da una lettura all'altra: dice quanto è stabile, non quanto è vicina al vero.`
              : 'Calcolate dallo scheletro. Screening: non è una valutazione clinica.'}
            {dati.motore === 'standard' ? ' Su questo dispositivo ha lavorato il modello di lettura standard, non quello accurato.' : ''}
          </Text>
          {dati.misure.filter((m) => m.quality === 'ok').map((m, vi) => (
            <View key={vi} style={styles.foto}>
              <Text style={styles.fotoNome}>Vista {m.view}</Text>
              {m.findings.map((f, fi) => {
                const c = f.severity === 'moderato' ? colors.error
                  : f.severity === 'lieve' ? colors.warning : colors.success;
                const unita = f.value_deg != null ? '°' : '%';
                const v = f.value_deg != null ? f.value_deg : f.value_pct;
                return (
                  <View key={fi} style={styles.riga}>
                    <Text style={styles.misuraNome}>
                      {f.label}{f.direction ? ` · ${f.direction}` : ''}
                    </Text>
                    <Text style={[styles.misuraValore, { color: c }]}>
                      {v != null ? `${numero(v)}${unita}` : '—'}
                      {f.tolerance != null ? ` ±${numero(f.tolerance)}` : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      )}

      {/* le linee, a parole */}
      {dati.linee && dati.linee.length > 0 && (
        <View style={styles.blocco}>
          <Text style={styles.titolo}>Linee miofasciali</Text>
          {dati.linee.map((l) => (
            <View key={l.id} style={styles.foto}>
              <View style={styles.riga}>
                <Text style={styles.fotoNome}>{l.nome}</Text>
                <Text style={[styles.esito, { color: l.stato === 'da osservare' ? colors.warning : colors.success }]}>
                  {l.stato}
                </Text>
              </View>
              {l.perche.map((x, n) => (
                <Text key={n} style={styles.dato}>· {x}</Text>
              ))}
            </View>
          ))}
          <Text style={styles.nota}>{AVVERTENZA_LINEE}</Text>
        </View>
      )}

      {/* 4 — che cosa è cambiato */}
      {prima && diff.length > 0 && (
        <View style={styles.blocco}>
          <Text style={styles.titolo}>
            Rispetto a prima{primaQuando ? ` (${primaQuando})` : ''}
          </Text>
          <Text style={styles.sotto}>
            Conta solo quello che supera il margine. Sotto il margine non è un
            cambiamento: è la normale oscillazione fra due foto.
          </Text>
          {diff.map((c, n) => {
            const col = c.esito === 'ridotta' ? colors.success
              : c.esito === 'aumentata' ? colors.error : colors.textSecondary;
            return (
              <View key={n} style={styles.cambio}>
                <Text style={styles.misuraNome}>{c.label}</Text>
                <Text style={styles.dato}>
                  {numero(c.prima)}{c.unita} → {numero(c.dopo)}{c.unita}
                  {'  '}(margine ±{numero(c.margine)}{c.unita})
                </Text>
                <Text style={[styles.esito, { color: col }]}>
                  {c.esito === 'entro il margine'
                    ? 'entro il margine: non si può dire che sia cambiata'
                    : `deviazione ${c.esito} di ${numero(Math.abs(c.delta))}${c.unita}`}
                </Text>
              </View>
            );
          })}
          {oltre.length === 0 && (
            <Text style={styles.nota}>
              Nessuna misura è cambiata oltre il margine.
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  blocco: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, marginTop: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  titolo: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  sotto: { fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 16, marginTop: 3 },
  foto: { marginTop: spacing.md, gap: 3 },
  riga: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'baseline', gap: spacing.sm,
  },
  fotoNome: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, textTransform: 'capitalize' },
  esito: { fontSize: fontSize.sm, fontWeight: '700' },
  dato: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 17 },
  consiglio: { fontSize: fontSize.sm, color: colors.warning, lineHeight: 17 },
  avviso: { fontSize: fontSize.sm, color: colors.error, lineHeight: 17 },
  nota: { fontSize: fontSize.xs, color: colors.textLight, lineHeight: 16, marginTop: spacing.md },
  misuraNome: { fontSize: fontSize.sm, color: colors.text, flex: 1, lineHeight: 17 },
  misuraValore: { fontSize: fontSize.sm, fontWeight: '700', fontVariant: ['tabular-nums'] },
  cambio: { marginTop: spacing.md, gap: 2 },
});
