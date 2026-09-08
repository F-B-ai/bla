import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, RefreshControl, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { getQuadro } from '../../services/humanInterfaceService';
import { Quadro, Traccia, Direzione } from '../../domain/humanInterface';

// ============================================================
// HUMAN INTERFACE — il quadro che si forma da solo
// ------------------------------------------------------------
// Ogni valutazione era un punto. Qui i punti diventano una linea.
// Regola: con una misura sola NON si disegna una tendenza — si
// dice "prima misura". Una freccia su un dato solo è una bugia.
// ============================================================

const AREE: Record<Traccia['area'], { nome: string; icona: string }> = {
  postura:  { nome: 'Postura',   icona: 'body-outline' },
  cammino:  { nome: 'Cammino',   icona: 'walk-outline' },
  squat:    { nome: 'Squat',     icona: 'barbell-outline' },
  corpo:    { nome: 'Corpo',     icona: 'scale-outline' },
  stellato: { nome: 'Sistema Stellato', icona: 'star-outline' },
};

const segnoDi = (d: Direzione): { colore: string; icona: string; parola: string } => {
  switch (d) {
    case 'migliora':    return { colore: colors.success, icona: 'arrow-up', parola: 'in miglioramento' };
    case 'peggiora':    return { colore: colors.warning, icona: 'arrow-down', parola: 'da guardare' };
    case 'stabile':     return { colore: colors.textSecondary, icona: 'remove', parola: 'stabile' };
    default:            return { colore: colors.textSecondary, icona: 'ellipse-outline', parola: 'prima misura' };
  }
};

const dataBreve = (d: Date) =>
  d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });

/** Sparkline essenziale: i punti nel tempo, senza assi né numeri. */
const Linea: React.FC<{ t: Traccia; colore: string }> = ({ t, colore }) => {
  if (t.punti.length < 2) return null;
  const vals = t.punti.map((p) => p.valore);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  return (
    <View style={s.linea}>
      {t.punti.map((p, i) => {
        const h = 6 + ((p.valore - min) / range) * 22;
        const ultimo = i === t.punti.length - 1;
        return (
          <View
            key={i}
            style={{
              width: 6, height: h, borderRadius: 3,
              backgroundColor: ultimo ? colore : colors.border,
            }}
          />
        );
      })}
    </View>
  );
};

export function HumanInterfaceScreen() {
  const { user } = useAuth();
  const [quadro, setQuadro] = useState<Quadro | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carica = useCallback(async () => {
    if (!user) return;
    try {
      setQuadro(await getQuadro(user.id));
    } catch {
      setQuadro(null);
    }
  }, [user]);

  useFocusEffect(useCallback(() => {
    let vivo = true;
    setLoading(true);
    carica().finally(() => { if (vivo) setLoading(false); });
    return () => { vivo = false; };
  }, [carica]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await carica(); setRefreshing(false);
  }, [carica]);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  }

  const fatte = quadro?.valutazioni.filter((v) => v.quante > 0) || [];
  const mancanti = quadro?.valutazioni.filter((v) => v.quante === 0) || [];

  // raggruppa le tracce per area, mantenendo l'ordine
  const perArea = (quadro?.tracce || []).reduce((acc, t) => {
    (acc[t.area] = acc[t.area] || []).push(t);
    return acc;
  }, {} as Record<string, Traccia[]>);

  return (
    <ScrollView
      style={s.wrap}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* ——— nessuna valutazione ancora ——— */}
      {!quadro || quadro.tracce.length === 0 ? (
        <View style={s.card}>
          <Text style={s.titolo}>Il quadro è ancora bianco.</Text>
          <Text style={s.muted}>
            Si forma da solo, valutazione dopo valutazione: postura, cammino,
            squat, composizione, Mind Movement™. La prima misura è il primo tratto.
          </Text>
        </View>
      ) : (
        <>
          {/* ——— l'arco di tempo ——— */}
          <View style={s.card}>
            <Text style={s.occhiello}>IL TUO QUADRO</Text>
            <Text style={s.titolo}>
              {quadro.haTraiettoria
                ? `Dal ${dataBreve(quadro.inizio!)} a oggi.`
                : 'Il primo tratto è tracciato.'}
            </Text>
            <Text style={s.muted}>
              {quadro.areeCoperte} aree misurate su {quadro.areeTotali}
              {quadro.haTraiettoria ? '' : ' · servono due misure per vedere una direzione'}
            </Text>
          </View>

          {/* ——— le tracce, per area ——— */}
          {Object.entries(perArea).map(([area, tracce]) => {
            const info = AREE[area as Traccia['area']];
            return (
              <View key={area} style={s.card}>
                <View style={s.areaHead}>
                  <Ionicons name={info.icona as any} size={18} color={colors.accent} />
                  <Text style={s.areaNome}>{info.nome}</Text>
                </View>
                {tracce.map((t) => {
                  const sg = segnoDi(t.direzione);
                  return (
                    <View key={t.chiave} style={s.traccia}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.tracciaNome}>{t.etichetta}</Text>
                        <View style={s.valori}>
                          {t.punti.length >= 2 && (
                            <>
                              <Text style={s.storico}>
                                {t.primo.valore}{t.unita} · {dataBreve(t.primo.data)}
                              </Text>
                              <Ionicons name="arrow-forward" size={11} color={colors.textLight} />
                            </>
                          )}
                          <Text style={[s.attuale, { color: sg.colore }]}>
                            {t.ultimo.valore}{t.unita}
                          </Text>
                          <Text style={s.storico}>{dataBreve(t.ultimo.data)}</Text>
                        </View>
                        <View style={s.segnoRiga}>
                          <Ionicons name={sg.icona as any} size={12} color={sg.colore} />
                          <Text style={[s.segnoTxt, { color: sg.colore }]}>
                            {sg.parola}
                            {t.direzione !== 'prima_volta' && t.delta !== 0
                              ? ` · ${t.delta > 0 ? '+' : ''}${t.delta}${t.unita}`
                              : ''}
                          </Text>
                          {t.punti.length >= 2 && (
                            <Text style={s.quante}>{t.punti.length} misure</Text>
                          )}
                        </View>
                      </View>
                      <Linea t={t} colore={sg.colore} />
                    </View>
                  );
                })}
              </View>
            );
          })}
        </>
      )}

      {/* ——— cosa è stato fatto, cosa manca ——— */}
      <View style={s.card}>
        <Text style={s.areaNome}>Le valutazioni</Text>
        {fatte.map((v) => (
          <View key={v.tipo} style={s.valRiga}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={s.valNome}>{v.etichetta}</Text>
            <Text style={s.valQuando}>
              {v.quante}× · ultima {dataBreve(v.ultima!)}
            </Text>
          </View>
        ))}
        {mancanti.map((v) => (
          <View key={v.tipo} style={s.valRiga}>
            <Ionicons name="ellipse-outline" size={16} color={colors.textLight} />
            <Text style={[s.valNome, { color: colors.textSecondary }]}>{v.etichetta}</Text>
            <Text style={s.valQuando}>mai fatta</Text>
          </View>
        ))}
      </View>

      <Text style={s.disclaimer}>
        Misure di screening del benessere raccolte nel tempo. Non costituiscono
        diagnosi: l'interpretazione resta al professionista.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  occhiello: { color: colors.accent, fontSize: 10, letterSpacing: 2.5, fontWeight: '700' },
  titolo: {
    color: colors.text, fontSize: 24, fontWeight: '300',
    marginTop: 6, letterSpacing: -0.3, lineHeight: 30,
  },
  muted: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 8, lineHeight: 20 },

  areaHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  areaNome: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },

  traccia: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.divider,
  },
  tracciaNome: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  valori: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  storico: { color: colors.textLight, fontSize: fontSize.xs },
  attuale: { fontSize: fontSize.md, fontWeight: '800' },
  segnoRiga: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  segnoTxt: { fontSize: fontSize.xs, fontWeight: '600' },
  quante: { color: colors.textLight, fontSize: fontSize.xs, marginLeft: 4 },
  linea: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 30 },

  valRiga: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.divider,
  },
  valNome: { color: colors.text, fontSize: fontSize.sm, flex: 1 },
  valQuando: { color: colors.textLight, fontSize: fontSize.xs },

  disclaimer: {
    color: colors.textLight, fontSize: fontSize.xs, textAlign: 'center',
    lineHeight: 16, marginTop: spacing.sm,
  },
});

export default HumanInterfaceScreen;
