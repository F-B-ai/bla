import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Linking, ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { crossAlert } from '../../utils/alert';
import { FilmTrovato, riproducibile } from '../../domain/filmEsercizio';

// ============================================================
// IL FILM DELL'ESERCIZIO, DENTRO L'APP
// ------------------------------------------------------------
// Prima il filmato si apriva con un link esterno: si usciva da
// ESSĒRE, e su molti telefoni restava una pagina bianca. Qui il
// lettore si monta in pagina, sotto l'esercizio, e parte al tocco.
//
// Le pagine (YouTube e simili) non si montano: quelle restano un
// link, dichiarato come tale. Un file che non parte non lascia
// l'utente davanti al nulla: compare il modo di aprirlo fuori.
// ============================================================

interface Props {
  film: FilmTrovato;
  /** compatto: un tasto che apre il lettore. esteso: lettore subito visibile */
  compatto?: boolean;
}

export const VideoEsercizio: React.FC<Props> = ({ film, compatto = true }) => {
  const [aperto, setAperto] = useState(!compatto);
  const [scelto, setScelto] = useState<'principale' | 'alt'>('principale');
  const [errore, setErrore] = useState(false);
  const [caricando, setCaricando] = useState(true);

  const url = scelto === 'alt' && film.alternativo ? film.alternativo : film.url;
  if (!url) return null;

  // Una pagina non si monta: si apre, e lo si dice.
  if (!riproducibile(url)) {
    return (
      <TouchableOpacity
        style={s.tasto}
        onPress={() => Linking.openURL(url).catch(
          () => crossAlert('Errore', 'Non riesco ad aprire il filmato')
        )}
        activeOpacity={0.85}
      >
        <Ionicons name="open-outline" size={18} color={colors.accent} />
        <Text style={s.tastoTxt}>Apri il filmato</Text>
      </TouchableOpacity>
    );
  }

  if (!aperto) {
    return (
      <TouchableOpacity style={s.tasto} onPress={() => setAperto(true)} activeOpacity={0.85}>
        <Ionicons name="play-circle" size={20} color={colors.accent} />
        <Text style={s.tastoTxt}>Guarda come si esegue</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={s.wrap}>
      <View style={s.telaio}>
        <Video
          source={{ uri: url }}
          style={s.video}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          isLooping={false}
          onLoadStart={() => { setCaricando(true); setErrore(false); }}
          onLoad={() => setCaricando(false)}
          onError={() => { setErrore(true); setCaricando(false); }}
        />
        {caricando && !errore && (
          <View style={s.sopra}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}
      </View>

      {errore && (
        <TouchableOpacity
          style={s.tasto}
          onPress={() => Linking.openURL(url).catch(
            () => crossAlert('Errore', 'Non riesco ad aprire il filmato')
          )}
          activeOpacity={0.85}
        >
          <Ionicons name="open-outline" size={17} color={colors.accent} />
          <Text style={s.tastoTxt}>Il lettore non parte: aprilo fuori</Text>
        </TouchableOpacity>
      )}

      {/* Due versioni (donna e uomo): si sceglie qui */}
      {!!film.alternativo && (
        <View style={s.scelta}>
          <TouchableOpacity
            style={[s.chip, scelto === 'principale' && s.chipAttivo]}
            onPress={() => setScelto('principale')}
            activeOpacity={0.85}
          >
            <Text style={[s.chipTxt, scelto === 'principale' && s.chipTxtAttivo]}>
              {film.etichetta || 'Versione 1'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.chip, scelto === 'alt' && s.chipAttivo]}
            onPress={() => setScelto('alt')}
            activeOpacity={0.85}
          >
            <Text style={[s.chipTxt, scelto === 'alt' && s.chipTxtAttivo]}>
              {film.etichettaAlternativo || 'Versione 2'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {film.fonte === 'libreria' && (
        <Text style={s.nota}>Filmato della libreria esercizi.</Text>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { marginTop: spacing.sm },
  telaio: {
    width: '100%',
    aspectRatio: 9 / 16,
    maxHeight: 420,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.black,
    alignSelf: 'center',
  },
  video: { width: '100%', height: '100%' },
  sopra: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tasto: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.accent, borderRadius: borderRadius.md,
    paddingVertical: 11, marginTop: spacing.sm,
  },
  tastoTxt: { color: colors.accent, fontWeight: '700', fontSize: fontSize.sm },
  scelta: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    flex: 1, alignItems: 'center', paddingVertical: 7,
    borderRadius: borderRadius.round, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipAttivo: { borderColor: colors.accent, backgroundColor: colors.surfaceLight },
  chipTxt: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: '600' },
  chipTxtAttivo: { color: colors.accent },
  nota: { color: colors.textLight, fontSize: fontSize.xs, marginTop: 6, textAlign: 'center' },
});

export default VideoEsercizio;
