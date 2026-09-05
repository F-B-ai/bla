import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { perId, PERIMETRO } from '../../data/assistenza';

// ============================================================
// UN ARTICOLO DELL'ASSISTENZA
// ------------------------------------------------------------
// Ogni articolo finisce, dove ha senso, con un bottone che porta
// alla schermata di cui parla: leggere e poi dover ritrovare da
// soli il posto giusto è metà del lavoro lasciato all'allievo.
// ============================================================

export const ArticoloAssistenzaScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const articolo = perId(route.params?.id);

  if (!articolo) {
    return (
      <View style={styles.vuoto}>
        <Ionicons name="help-circle-outline" size={40} color={colors.textLight} />
        <Text style={styles.vuotoTesto}>Questo argomento non esiste più.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Text style={styles.vuotoLink}>Torna all'assistenza</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const vai = () => {
    const d = articolo.vaiA!;
    if (d.tab) navigation.navigate(d.tab, { screen: d.route });
    else navigation.navigate(d.route);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.titolo}>{articolo.titolo}</Text>
      <Text style={styles.sommario}>{articolo.sommario}</Text>

      {articolo.sezioni.map((s, i) => (
        <View key={`${articolo.id}-${i}`} style={styles.sezione}>
          {s.titolo ? <Text style={styles.sezioneTitolo}>{s.titolo}</Text> : null}
          <Text style={styles.sezioneTesto}>{s.testo}</Text>
        </View>
      ))}

      {articolo.vaiA ? (
        <TouchableOpacity style={styles.bottone} onPress={vai} activeOpacity={0.85}>
          <Text style={styles.bottoneTesto}>{articolo.vaiA.etichetta}</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.textOnAccent} />
        </TouchableOpacity>
      ) : null}

      <Text style={styles.piede}>{PERIMETRO}</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  titolo: { fontSize: fontSize.xl, fontWeight: '600', color: colors.text, lineHeight: 30 },
  sommario: {
    fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20,
    marginTop: spacing.xs, marginBottom: spacing.lg,
  },

  sezione: {
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: spacing.md, marginBottom: spacing.md,
  },
  sezioneTitolo: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  sezioneTesto: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22 },

  bottone: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.accent, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, marginTop: spacing.lg, marginBottom: spacing.xl,
  },
  bottoneTesto: { color: colors.textOnAccent, fontSize: fontSize.md, fontWeight: '600' },

  piede: {
    fontSize: fontSize.xs, color: colors.textLight, lineHeight: 18,
    borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.lg,
  },

  vuoto: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  vuotoTesto: { fontSize: fontSize.md, color: colors.textSecondary },
  vuotoLink: { fontSize: fontSize.md, color: colors.accent, fontWeight: '600' },
});
