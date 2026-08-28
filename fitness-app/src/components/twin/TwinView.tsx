import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, RadialGradient, Stop, G, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps, useDerivedValue,
  withRepeat, withTiming, withSpring, Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { colors } from '../../config/theme';

// ============================================================
// TWINVIEW — un solo organismo, tutte le schermate.
// ------------------------------------------------------------
// Non è una decorazione: è il gemello che si vede. Vive in UN
// componente solo, così non può essere duplicato schermata per
// schermata (è già successo col respiro: mai più).
//
// TRE OROLOGI, indipendenti:
//  1. RESPIRO ~6.5s — scintilla: opacity + scale (native driver)
//  2. ELICA FASCIALE ~21s — perspective + rotateY (native driver).
//     È una rotazione nello spazio, NON un logo che gira in 2D.
//  3. GATE, una volta — l'ensō si chiude (strokeDashoffset) e
//     diventa la S, poi compare il wordmark.
//
// GESTO: Pan — la seta si piega e torna con withSpring.
// Geometria SVG: gira sul thread JS, per questo i fili sono
// pochi (14, non 76).
//
// DNA da non tradire: ensō cremisi + onda S. Niente globo,
// niente anelli, niente nebulosa.
// ============================================================

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Lunghezza approssimata del tratto dell'ensō, per il dash del gate. */
const ENSO_LEN = 430;

export type TwinTono = 'pronto' | 'misura' | 'recupero' | 'neutro';

interface TwinViewProps {
  size?: number;
  /** lo stato del gemello modula intensità e ritmo — non inventa nulla */
  tono?: TwinTono;
  /** true = esegue una volta l'apertura (ensō → S → wordmark) */
  gate?: boolean;
  onGateComplete?: () => void;
  /** false = organismo fermo (per chi ha animazioni ridotte) */
  animato?: boolean;
  /** lente Academy: stesso organismo, scintilla più oro. MAI un globo. */
  oroLente?: boolean;
}

/**
 * Il respiro NON è un metronomo: l'inspirazione è più corta
 * dell'espirazione, come in un corpo. Rapporto 0.42 / 0.58 —
 * sul ciclo quieto di 6.5s fa 2.73s dentro e 3.77s fuori.
 * Il tono cambia il ritmo, mai i colori del marchio.
 *
 * Le due buste sono quelle esatte del contratto visivo
 * (silk.js · breathEnvelope / sparkEnvelope): coseno asimmetrico
 * per il respiro, gaussiana sulla cresta per la scintilla d'oro,
 * che compare UNA volta per respiro nel punto di incrocio.
 */
const INHALE_FRAC = 0.42;

/** 0 → 1 sull'inspirazione, 1 → 0 sull'espirazione. */
const bustaRespiro = (phase: number): number => {
  'worklet';
  if (phase < INHALE_FRAC) {
    return 0.5 - 0.5 * Math.cos(Math.PI * (phase / INHALE_FRAC));
  }
  return 0.5 + 0.5 * Math.cos(Math.PI * ((phase - INHALE_FRAC) / (1 - INHALE_FRAC)));
};

/** Una scintilla per respiro, sulla cresta dell'inspirazione. */
const bustaScintilla = (phase: number): number => {
  'worklet';
  const d = Math.min(
    Math.abs(phase - INHALE_FRAC),
    Math.abs(phase - INHALE_FRAC + 1),
    Math.abs(phase - INHALE_FRAC - 1)
  );
  return Math.exp(-(d * 12.2) * (d * 12.2));
};

/** L'oro della scintilla: nucleo → alone → bordo. */
const ORO = { nucleo: colors.twinOroNucleo, mezzo: colors.twinOroMezzo, bordo: colors.twinOroBordo };

const perTono = (t: TwinTono) => {
  switch (t) {
    case 'pronto':   return { respiroMs: 5200, ampiezza: 0.075, presenza: 1.0 };
    case 'misura':   return { respiroMs: 6500, ampiezza: 0.055, presenza: 0.85 };
    case 'recupero': return { respiroMs: 8200, ampiezza: 0.040, presenza: 0.7 };
    default:         return { respiroMs: 6500, ampiezza: 0.05,  presenza: 0.8 };
  }
};

export const TwinView: React.FC<TwinViewProps> = ({
  size = 300,
  tono = 'neutro',
  gate = false,
  onGateComplete,
  animato = true,
  oroLente = false,
}) => {
  const { respiroMs, ampiezza, presenza } = perTono(tono);

  // --- orologio 1: il respiro (native driver) ---
  const respiro = useSharedValue(0);
  // --- orologio 2: l'elica fasciale (native driver) ---
  const elica = useSharedValue(0);
  // --- orologio 3: il gate (una volta, thread JS: è geometria SVG) ---
  const chiusura = useSharedValue(gate ? 1 : 0); // 1 = aperto/non disegnato
  const wordmark = useSharedValue(gate ? 0 : 1);
  // --- gesto: piega della seta ---
  const piega = useSharedValue(0);

  useEffect(() => {
    if (!animato) { respiro.value = 0.5; elica.value = 0; return; }
    // fase lineare 0→1: la forma la danno le buste, non l'easing
    respiro.value = withRepeat(
      withTiming(1, { duration: respiroMs, easing: Easing.linear }),
      -1, false
    );
    elica.value = withRepeat(
      withTiming(1, { duration: 21000, easing: Easing.linear }),
      -1, false
    );
  }, [animato, respiroMs, respiro, elica]);

  useEffect(() => {
    if (!gate) return;
    // l'ensō si chiude…
    chiusura.value = withTiming(0, { duration: 1600, easing: Easing.out(Easing.cubic) });
    // …poi il nome
    wordmark.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.ease) });
    const t = setTimeout(() => onGateComplete?.(), 2600);
    return () => clearTimeout(t);
  }, [gate, chiusura, wordmark, onGateComplete]);

  // Pan: la seta si piega, e torna con withSpring
  const pan = Gesture.Pan()
    .onChange((e) => { piega.value = Math.max(-26, Math.min(26, e.translationX * 0.35)); })
    .onEnd(() => { piega.value = withSpring(0, { damping: 12, stiffness: 90 }); });

  // --- le due buste, derivate dalla fase ---
  const b = useDerivedValue(() => bustaRespiro(respiro.value));
  const scintilla = useDerivedValue(() => bustaScintilla(respiro.value));

  // --- stile: respiro (scale + opacity, native driver) ---
  const stileRespiro = useAnimatedStyle(() => ({
    opacity: (0.72 + b.value * 0.28) * presenza,
    transform: [{ scale: 1 - ampiezza / 2 + b.value * ampiezza }],
  }));

  // --- la scintilla d'oro all'incrocio: mote quieto + cresta ---
  const moteBase = oroLente ? 0.34 : 0.20;
  const stileScintilla = useAnimatedStyle(() => ({
    opacity: Math.min(1, moteBase + scintilla.value * 0.8),
    transform: [{ scale: 0.7 + scintilla.value * 0.75 }],
  }));

  // --- i fili si ispessiscono sull'inspirazione (silk.js: 0.58 + b*1.05) ---
  const propsFili = useAnimatedProps(() => ({
    strokeWidth: 0.6 * (0.58 + b.value * 1.05),
  }));

  // --- stile: elica nello spazio (perspective + rotateY) ---
  const stileElica = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { rotateY: `${elica.value * 360}deg` },
    ],
  }));

  // --- gate: l'ensō che si chiude ---
  const propsEnso = useAnimatedProps(() => ({
    strokeDashoffset: chiusura.value * ENSO_LEN,
  }));

  // --- la S che si piega sotto il dito ---
  const propsOnda = useAnimatedProps(() => {
    const p = piega.value;
    return {
      d: `M 42 82 C ${55 + p} ${72 - p * 0.35}, ${68 + p} ${72 - p * 0.35}, 80 80`
        + ` C ${92 - p} ${88 + p * 0.35}, ${105 - p} ${88 + p * 0.35}, 118 78`,
    } as any;
  });

  const stileWordmark = useAnimatedStyle(() => ({ opacity: wordmark.value }));

  // I fili della seta: pochi e sottili, dietro. 14, non 76.
  const fili = Array.from({ length: 14 }, (_, i) => i);

  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.box, { width: size, height: size }]}>
        {/* elica: rotazione nello spazio dell'intero organismo */}
        <Animated.View style={[styles.pieno, stileElica]}>
          {/* respiro: la scintilla */}
          <Animated.View style={[styles.pieno, stileRespiro]}>
            <Svg width={size} height={size} viewBox="0 0 160 160">
              <Defs>
                <LinearGradient id="setaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={colors.twinSeta1} />
                  <Stop offset="50%" stopColor={colors.twinSeta2} />
                  <Stop offset="100%" stopColor={colors.twinSeta3} />
                </LinearGradient>
                <LinearGradient id="ondaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor={colors.twinAvorio} stopOpacity="0.08" />
                  <Stop offset="35%" stopColor={colors.twinAvorio} stopOpacity="1" />
                  <Stop offset="70%" stopColor={colors.twinAvorio} stopOpacity="1" />
                  <Stop offset="100%" stopColor={colors.twinAvorio} stopOpacity="0.15" />
                </LinearGradient>
              </Defs>

              {/* i fili dietro: la seta, non una nebulosa */}
              <G opacity={0.16}>
                {fili.map((i) => {
                  const off = (i - 7) * 2.4;
                  return (
                    <AnimatedPath
                      key={i}
                      animatedProps={propsFili}
                      d={`M ${42 + off * 0.4} ${82 + off}
                          C ${55 + off} ${72 + off}, ${68 + off} ${72 + off}, ${80 + off * 0.3} ${80 + off}
                          C ${92 - off * 0.2} ${88 + off}, ${105 - off} ${88 + off}, ${118 - off * 0.4} ${78 + off}`}
                      stroke={colors.twinSeta2}
                      strokeLinecap="round"
                      fill="none"
                    />
                  );
                })}
              </G>

              {/* l'ensō — con il dash che lo chiude durante il gate */}
              <AnimatedPath
                d="M 95 22 C 120 28, 142 52, 144 80 C 146 108, 130 136, 100 144
                   C 70 152, 36 140, 22 114 C 8 88, 14 54, 36 34 C 52 20, 74 18, 88 22"
                stroke="url(#setaGrad)"
                strokeWidth={11}
                strokeLinecap="round"
                fill="none"
                opacity={0.95}
                strokeDasharray={ENSO_LEN}
                animatedProps={propsEnso}
              />

              {/* l'onda S — si piega sotto il dito */}
              <AnimatedPath
                animatedProps={propsOnda}
                stroke="url(#ondaGrad)"
                strokeWidth={3.5}
                strokeLinecap="round"
                fill="none"
              />
              <Path
                d="M 116 79 C 120 76, 124 74, 126 74"
                stroke={colors.twinAvorio}
                strokeWidth={1.4}
                strokeLinecap="round"
                fill="none"
                opacity={0.5}
              />
            </Svg>
          </Animated.View>
        </Animated.View>

        {/* la scintilla d'oro all'incrocio: una per respiro */}
        <Animated.View style={[styles.scintillaBox, stileScintilla]} pointerEvents="none">
          <Svg width={size} height={size} viewBox="0 0 160 160">
            <Defs>
              <RadialGradient id="oroGrad" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={ORO.nucleo} stopOpacity="1" />
                <Stop offset="42%" stopColor={ORO.mezzo} stopOpacity="0.75" />
                <Stop offset="100%" stopColor={ORO.bordo} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx={80} cy={80} r={oroLente ? 13 : 10} fill="url(#oroGrad)" />
            <Circle cx={80} cy={80} r={1.6} fill={ORO.nucleo} />
          </Svg>
        </Animated.View>

        {/* il nome, solo durante il gate */}
        {gate && (
          <Animated.View style={[styles.wordmarkBox, stileWordmark]} pointerEvents="none">
            <Animated.Text style={styles.wordmark}>ESSĒRE</Animated.Text>
          </Animated.View>
        )}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  pieno: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  scintillaBox: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  wordmarkBox: { position: 'absolute', bottom: -6 },
  wordmark: {
    color: colors.twinAvorio, fontSize: 15, letterSpacing: 7, fontWeight: '300',
  },
});

export default TwinView;
