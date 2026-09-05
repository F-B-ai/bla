import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { crossAlert } from '../../utils/alert';
import { getFullExerciseLibrary, LibraryExercise } from '../../services/programService';
import { VideoEsercizio } from '../../components/common/VideoEsercizio';
import { trovaFilm } from '../../domain/filmEsercizio';

// ============================================================
// FILMATI DEGLI ESERCIZI — la vista del titolare
// ------------------------------------------------------------
// Da titolare la scheda dell'allievo non esiste: l'app resta su
// Studio, e i filmati non si vedevano da nessuna parte. Qui ci
// sono tutti, si cercano per nome e si guardano dentro l'app —
// per controllarli prima di darli a qualcuno.
// ============================================================

export function FilmatiScreen() {
  const [libreria, setLibreria] = useState<LibraryExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [cerca, setCerca] = useState('');
  const [aperto, setAperto] = useState<string | null>(null);

  useEffect(() => {
    getFullExerciseLibrary()
      .then(setLibreria)
      .catch(() => crossAlert('Errore', 'Non riesco a leggere la libreria'))
      .finally(() => setLoading(false));
  }, []);

  const conFilm = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    return libreria
      .filter((e) => e.videoUrl)
      .filter((e) => !q || e.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [libreria, cerca]);

  const senzaFilm = useMemo(
    () => libreria.filter((e) => !e.videoUrl).length,
    [libreria]
  );

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  }

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}>
      <Text style={s.intro}>
        Tutti i filmati della libreria, riproducibili qui dentro. Sono gli stessi
        che l'allievo vede nella sua scheda: se qui parte, parte anche a lui.
      </Text>

      <View style={s.cerca}>
        <Ionicons name="search" size={18} color={colors.textLight} />
        <TextInput
          style={s.cercaInput}
          value={cerca}
          onChangeText={setCerca}
          placeholder="Cerca un esercizio…"
          placeholderTextColor={colors.textLight}
        />
        {cerca.length > 0 && (
          <TouchableOpacity onPress={() => setCerca('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={s.conta}>
        {conFilm.length} {conFilm.length === 1 ? 'esercizio col filmato' : 'esercizi col filmato'}
        {senzaFilm > 0 ? ` · ${senzaFilm} ancora senza` : ''}
      </Text>

      {conFilm.length === 0 && (
        <View style={s.card}>
          <Text style={s.muted}>
            Nessun filmato trovato{cerca ? ' con questo nome' : ''}.
          </Text>
        </View>
      )}

      {conFilm.map((e) => {
        const apertoQui = aperto === e.id;
        return (
          <View key={e.id} style={s.card}>
            <TouchableOpacity
              style={s.testa}
              onPress={() => setAperto(apertoQui ? null : e.id)}
              activeOpacity={0.85}
            >
              <Ionicons
                name={apertoQui ? 'chevron-down' : 'play-circle'}
                size={22}
                color={colors.accent}
              />
              <View style={{ flex: 1 }}>
                <Text style={s.nome}>{e.name}</Text>
                <Text style={s.nota}>
                  {e.category}
                  {e.videoUrlAlt ? ' · due versioni' : ''}
                  {e.fromFirestore ? ' · aggiunto in palestra' : ' · canone'}
                </Text>
              </View>
            </TouchableOpacity>

            {apertoQui && (
              <VideoEsercizio
                compatto={false}
                film={trovaFilm({ nome: e.name, libreria })}
              />
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  intro: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20 },
  cerca: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    backgroundColor: colors.surface, paddingHorizontal: spacing.md,
    paddingVertical: 9, marginTop: spacing.md,
  },
  cercaInput: { flex: 1, color: colors.text, fontSize: fontSize.sm, paddingVertical: 2 },
  conta: { color: colors.textLight, fontSize: fontSize.xs, marginTop: spacing.sm },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, marginTop: spacing.sm,
  },
  testa: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nome: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  nota: { color: colors.textLight, fontSize: fontSize.xs, marginTop: 2 },
  muted: { color: colors.textSecondary, fontSize: fontSize.sm },
});

export default FilmatiScreen;
