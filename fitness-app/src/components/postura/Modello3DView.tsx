import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, PanResponder, LayoutChangeEvent,
} from 'react-native';
import Svg, { Line, Circle, Ellipse } from 'react-native-svg';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import {
  Modello3D, Tinte, Vista3D, VISTE, scena, TrattoScena, LineaScena,
} from '../../domain/posture3d';
import { LetturaLinea, tracciaLinea, AVVERTENZA_LINEE } from '../../domain/lineeMiofasciali';
import { creaUsdz } from '../../domain/modelloAR';
import { supportoAR, apriUsdz } from '../../utils/realtaAumentata';
import { crossAlert } from '../../utils/alert';

// ============================================================
// IL MODELLO 3D, DA GUARDARE
// ------------------------------------------------------------
// Lo scheletro schematico ricostruito dalle foto: si gira col dito,
// e su iPhone/iPad si mette in piedi nella stanza a grandezza
// naturale.
//
// Sotto il disegno ci sono SEMPRE i limiti di quel modello (piatto
// se manca il profilo, scala indicativa se manca la statura…): chi
// lo mostra a un allievo deve poterli leggere senza cercarli.
// ============================================================

interface Props {
  modello: Modello3D;
  tinte?: Tinte;
  /** nome del file AR, senza estensione */
  nomeFile?: string;
  /** il modello di una valutazione precedente: si disegna in ombra, dietro */
  prima?: Modello3D | null;
  /** quando è stato preso il «prima», da scrivere in legenda */
  primaQuando?: string;
  /** le linee lette su questo modello (lineeMiofasciali.ts) */
  linee?: LetturaLinea[];
}

const ALTEZZA = 380;
const MARGINE = 22;

const coloreDi = (s: TrattoScena['severita']): string =>
  s === 'moderato' ? colors.error : s === 'lieve' ? colors.warning : colors.text;

const PULSANTI: Array<{ chiave: keyof typeof VISTE; etichetta: string }> = [
  { chiave: 'fronte', etichetta: 'Fronte' },
  { chiave: 'profiloSx', etichetta: 'Profilo sx' },
  { chiave: 'dietro', etichetta: 'Dietro' },
  { chiave: 'profiloDx', etichetta: 'Profilo dx' },
];

export const Modello3DView: React.FC<Props> = ({
  modello, tinte, nomeFile, prima, primaQuando, linee,
}) => {
  const [larghezza, setLarghezza] = useState(320);
  const [mostraLinee, setMostraLinee] = useState(false);
  const [mostraPrima, setMostraPrima] = useState(true);
  const [vista, setVista] = useState<Vista3D>({ imbardata: 30, beccheggio: 8 });
  const partenza = useRef(vista);
  const corrente = useRef(vista);
  corrente.current = vista;

  // Trascinando in orizzontale si gira; in verticale la pagina scorre.
  const dito = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => { partenza.current = corrente.current; },
      onPanResponderMove: (_e, g) => {
        setVista({
          imbardata: partenza.current.imbardata + g.dx * 0.6,
          beccheggio: partenza.current.beccheggio,
        });
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const scala = (ALTEZZA - MARGINE * 2) / (modello.statura_m * 1.06);
  const cx = larghezza / 2;
  const suolo = ALTEZZA - MARGINE;
  const X = (m: number): number => cx + m * scala;
  const Y = (m: number): number => suolo - m * scala;

  // Quello che si aggiunge al modello: il «prima» e le linee, se
  // richiesti. Lo stesso `extra` va al disegno E al file AR: in AR si
  // vede esattamente quello che si vede qui.
  const extra = useMemo(() => {
    const tracciate: LineaScena[] = mostraLinee
      ? (linee || []).map((l) => ({
        id: l.id,
        rami: tracciaLinea(modello, l.id),
        daOsservare: l.stato === 'da osservare',
      }))
      : [];
    return { prima: mostraPrima ? prima || null : null, linee: tracciate };
  }, [modello, prima, linee, mostraLinee, mostraPrima]);

  const tratti = useMemo(
    () => scena(modello, vista, tinte || {}, extra),
    [modello, vista, tinte, extra]
  );

  const ar = supportoAR();
  const apriAR = (): void => {
    try {
      const fatto = apriUsdz(
        creaUsdz(modello, tinte || {}, extra),
        `${nomeFile || 'modello-posturale'}.usdz`
      );
      if (fatto === 'scarica') {
        crossAlert(
          'Modello scaricato',
          'Su questo dispositivo la realtà aumentata non si apre da sola. Il file .usdz si apre in AR su iPhone e iPad.'
        );
      }
    } catch (e) {
      crossAlert('Modello AR', e instanceof Error ? e.message : 'Non sono riuscito a creare il file.');
    }
  };

  const raggioBase = 0.3 * scala;
  const schiaccio = Math.max(1.5, raggioBase * Math.sin((vista.beccheggio * Math.PI) / 180));

  return (
    <View style={styles.scatola}>
      <View style={styles.testata}>
        <Text style={styles.titolo}>Modello 3D</Text>
        <View style={[styles.targhetta, modello.profondita === 'assente' && styles.targhettaPiatta]}>
          <Text style={styles.targhettaTesto}>
            {modello.profondita === 'due profili' ? 'due profili: un lato per foto'
              : modello.profondita === 'profilo' ? 'un profilo'
                : 'piatto · manca il profilo'}
          </Text>
        </View>
      </View>

      <View
        style={[styles.tela, { touchAction: 'pan-y', userSelect: 'none', cursor: 'grab' } as any]}
        onLayout={(e: LayoutChangeEvent) => setLarghezza(e.nativeEvent.layout.width)}
        {...dito.panHandlers}
      >
        <Svg width={larghezza} height={ALTEZZA}>
          <Ellipse
            cx={cx} cy={suolo} rx={raggioBase} ry={schiaccio}
            fill={colors.surfaceLight} stroke={colors.border} strokeWidth={1}
          />
          {tratti.map((t) => {
            if (t.tipo === 'piombo') {
              return (
                <Line
                  key={t.id}
                  x1={X(t.x1)} y1={Y(t.y1)} x2={X(t.x2 as number)} y2={Y(t.y2 as number)}
                  stroke={colors.info} strokeWidth={1.5} strokeDasharray="5 5"
                />
              );
            }
            if (t.tipo === 'ombra') {
              return t.raggio !== undefined ? (
                <Circle
                  key={t.id}
                  cx={X(t.x1)} cy={Y(t.y1)} r={t.raggio * scala}
                  fill="none" stroke={colors.textLight} strokeWidth={3}
                />
              ) : (
                <Line
                  key={t.id}
                  x1={X(t.x1)} y1={Y(t.y1)} x2={X(t.x2 as number)} y2={Y(t.y2 as number)}
                  stroke={colors.textLight} strokeWidth={5} strokeLinecap="round"
                />
              );
            }
            if (t.tipo === 'linea') {
              return (
                <Line
                  key={t.id}
                  x1={X(t.x1)} y1={Y(t.y1)} x2={X(t.x2 as number)} y2={Y(t.y2 as number)}
                  stroke={t.severita === 'lieve' ? colors.warning : colors.success}
                  strokeWidth={2} strokeDasharray="2 4" strokeLinecap="round"
                />
              );
            }
            if (t.tipo === 'osso') {
              return (
                <Line
                  key={t.id}
                  x1={X(t.x1)} y1={Y(t.y1)} x2={X(t.x2 as number)} y2={Y(t.y2 as number)}
                  stroke={coloreDi(t.severita)} strokeWidth={5} strokeLinecap="round"
                />
              );
            }
            if (t.tipo === 'testa') {
              return (
                <Circle
                  key={t.id}
                  cx={X(t.x1)} cy={Y(t.y1)} r={(t.raggio as number) * scala}
                  fill={colors.surface} stroke={coloreDi(t.severita)} strokeWidth={4}
                />
              );
            }
            return (
              <Circle
                key={t.id}
                cx={X(t.x1)} cy={Y(t.y1)} r={4.5}
                fill={colors.background} stroke={colors.text} strokeWidth={2}
              />
            );
          })}
        </Svg>
        <Text style={styles.suggerimento}>Trascina per girarlo</Text>
      </View>

      <View style={styles.viste}>
        {PULSANTI.map((p) => (
          <TouchableOpacity
            key={p.chiave}
            style={styles.vistaBottone}
            onPress={() => setVista(VISTE[p.chiave])}
          >
            <Text style={styles.vistaTesto}>{p.etichetta}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {(prima || (linee && linee.length > 0)) && (
        <View style={styles.viste}>
          {prima ? (
            <TouchableOpacity
              style={[styles.vistaBottone, mostraPrima && styles.interruttoreAcceso]}
              onPress={() => setMostraPrima((x) => !x)}
            >
              <Text style={styles.vistaTesto}>
                {mostraPrima ? 'Prima: visibile' : 'Prima: nascosto'}
              </Text>
            </TouchableOpacity>
          ) : null}
          {linee && linee.length > 0 ? (
            <TouchableOpacity
              style={[styles.vistaBottone, mostraLinee && styles.interruttoreAcceso]}
              onPress={() => setMostraLinee((x) => !x)}
            >
              <Text style={styles.vistaTesto}>
                {mostraLinee ? 'Linee miofasciali: visibili' : 'Linee miofasciali'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      <View style={styles.legenda}>
        {prima && mostraPrima ? (
          <View style={styles.voce}>
            <View style={[styles.pallino, { backgroundColor: colors.textLight }]} />
            <Text style={styles.voceTesto}>prima{primaQuando ? ` (${primaQuando})` : ''}</Text>
          </View>
        ) : null}
        {mostraLinee ? (
          <>
            <View style={styles.voce}>
              <View style={[styles.pallino, { backgroundColor: colors.success }]} />
              <Text style={styles.voceTesto}>linea nella norma</Text>
            </View>
            <View style={styles.voce}>
              <View style={[styles.pallino, { backgroundColor: colors.warning }]} />
              <Text style={styles.voceTesto}>linea da osservare</Text>
            </View>
          </>
        ) : null}
        <View style={styles.voce}>
          <View style={[styles.pallino, { backgroundColor: colors.text }]} />
          <Text style={styles.voceTesto}>nella norma</Text>
        </View>
        <View style={styles.voce}>
          <View style={[styles.pallino, { backgroundColor: colors.warning }]} />
          <Text style={styles.voceTesto}>lieve</Text>
        </View>
        <View style={styles.voce}>
          <View style={[styles.pallino, { backgroundColor: colors.error }]} />
          <Text style={styles.voceTesto}>moderato</Text>
        </View>
        <View style={styles.voce}>
          <View style={[styles.pallino, { backgroundColor: colors.info }]} />
          <Text style={styles.voceTesto}>filo a piombo</Text>
        </View>
      </View>

      {ar !== 'nessuno' && (
        <TouchableOpacity style={styles.bottoneAR} onPress={apriAR}>
          <Text style={styles.bottoneARTesto}>
            {ar === 'ar' ? 'Vedi in realtà aumentata' : 'Scarica il modello AR (.usdz)'}
          </Text>
          <Text style={styles.bottoneARSotto}>
            {ar === 'ar'
              ? `In piedi nella stanza, alto ${Math.round(modello.statura_m * 100)} cm${extra.prima ? ' · con il prima sovrapposto' : ''}${extra.linee.length ? ' · con le linee' : ''}`
              : 'Si apre in realtà aumentata su iPhone e iPad'}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.limiti}>
        <Text style={styles.limitiTesto}>
          Schema ricostruito dalle foto: non è una scansione del corpo né una
          valutazione clinica. Serve a far vedere e a orientare il lavoro.
        </Text>
        {modello.note.map((n, i) => (
          <Text key={i} style={styles.limitiTesto}>· {n}</Text>
        ))}
        {mostraLinee ? <Text style={styles.limitiTesto}>· {AVVERTENZA_LINEE}</Text> : null}
        {prima && mostraPrima ? (
          <Text style={styles.limitiTesto}>
            · Prima e adesso sono sovrapposti sulle caviglie e portati alla stessa statura: si confrontano le forme, non i centimetri.
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  scatola: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, marginTop: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  testata: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm,
  },
  titolo: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  targhetta: {
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.success,
  },
  targhettaPiatta: { borderColor: colors.warning },
  targhettaTesto: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '600' },

  tela: {
    height: ALTEZZA, backgroundColor: colors.background,
    borderRadius: borderRadius.sm, overflow: 'hidden',
  },
  suggerimento: {
    position: 'absolute', top: 8, right: 10,
    fontSize: fontSize.xs, color: colors.textLight,
  },

  viste: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  vistaBottone: {
    flex: 1, paddingVertical: 8, alignItems: 'center',
    borderRadius: borderRadius.sm, backgroundColor: colors.surfaceLight,
  },
  vistaTesto: { fontSize: fontSize.xs, color: colors.text, fontWeight: '600' },
  interruttoreAcceso: { borderWidth: 1, borderColor: colors.primary },

  legenda: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  voce: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pallino: { width: 9, height: 9, borderRadius: 5 },
  voceTesto: { fontSize: fontSize.xs, color: colors.textSecondary },

  bottoneAR: {
    marginTop: spacing.md, paddingVertical: 12, paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm, backgroundColor: colors.primary, alignItems: 'center',
  },
  bottoneARTesto: { fontSize: fontSize.md, fontWeight: '700', color: colors.textOnPrimary },
  bottoneARSotto: { fontSize: fontSize.xs, color: colors.textOnPrimary, marginTop: 2, opacity: 0.85 },

  limiti: { marginTop: spacing.md, gap: 4 },
  limitiTesto: { fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 17 },
});
