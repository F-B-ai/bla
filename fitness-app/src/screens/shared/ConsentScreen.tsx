import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { brand } from '../../config/brand';
import { crossAlert } from '../../utils/alert';
import {
  ConsentChoices,
  ConsentKey,
  CONSENT_LABELS,
  getConsents,
  saveConsents,
} from '../../services/consentService';

// ============================================================
// CONSENSI PRIVACY — GDPR art. 9
// Mostrata al primo accesso (o quando cambia la versione del
// testo) e riapribile dal Profilo per rivedere le scelte.
// Checkbox separate e NON pre-spuntate; "secondaryUse" è
// dichiaratamente facoltativo. Rifiutare non blocca l'app:
// disattiva solo le funzioni collegate.
// ============================================================

const CONSENT_ORDER: ConsentKey[] = [
  'wellness',
  'posturalAI',
  'bodyComp',
  'externalAI',
  'secondaryUse',
];

interface ConsentScreenProps {
  userId: string;
  /** true quando riaperta dal profilo per rivedere le scelte */
  reviewMode?: boolean;
  onDone: () => void;
}

export const ConsentScreen: React.FC<ConsentScreenProps> = ({ userId, reviewMode, onDone }) => {
  const [choices, setChoices] = useState<ConsentChoices>({
    wellness: false,
    posturalAI: false,
    bodyComp: false,
    externalAI: false,
    secondaryUse: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getConsents(userId)
      .then((record) => {
        if (record) setChoices(record.choices);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const toggle = (key: ConsentKey) =>
    setChoices((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveConsents(userId, choices);
      const refused = CONSENT_ORDER.filter((k) => !choices[k] && k !== 'secondaryUse');
      if (refused.length > 0) {
        crossAlert(
          'Scelte salvate',
          'Le funzioni per cui non hai dato il consenso saranno disattivate. Puoi cambiare idea quando vuoi dal Profilo.'
        );
      }
      onDone();
    } catch {
      crossAlert('Errore', 'Impossibile salvare le scelte. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>La tua privacy</Text>
      <Text style={styles.intro}>
        {brand.appName} tratta dati legati alla tua salute e al tuo benessere
        (per il GDPR sono "categorie particolari", art. 9): per questo ti
        chiediamo un consenso esplicito, voce per voce. Nessuna casella è
        pre-selezionata e puoi cambiare idea in qualsiasi momento dal tuo
        Profilo. Se rifiuti una voce, la funzione collegata si disattiva —
        il resto dell'app continua a funzionare.
      </Text>

      {CONSENT_ORDER.map((key) => {
        const label = CONSENT_LABELS[key];
        return (
          <Card key={key} variant="elevated" style={styles.consentCard}>
            <View style={styles.consentRow}>
              <View style={styles.consentTextCol}>
                <Text style={styles.consentTitle}>{label.title}</Text>
                <Text style={styles.consentDesc}>{label.description}</Text>
                {label.optionalNote ? (
                  <Text style={styles.optionalNote}>{label.optionalNote}</Text>
                ) : null}
              </View>
              <Switch
                value={choices[key]}
                onValueChange={() => toggle(key)}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.surface}
              />
            </View>
          </Card>
        );
      })}

      <Text style={styles.footer}>
        Titolare del trattamento: {brand.appName}. Informativa completa
        disponibile in palestra e nel Profilo. Le tue scelte vengono
        registrate con data e versione del testo (art. 7 GDPR).
      </Text>

      <Button
        title={saving ? 'Salvataggio...' : reviewMode ? 'Salva le modifiche' : 'Conferma le mie scelte'}
        onPress={handleSave}
        loading={saving}
        style={styles.confirmBtn}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  intro: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  consentCard: {
    marginBottom: spacing.md,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  consentTextCol: {
    flex: 1,
  },
  consentTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  consentDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  optionalNote: {
    fontSize: fontSize.sm,
    color: colors.accent,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  footer: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    lineHeight: 18,
    marginVertical: spacing.md,
  },
  confirmBtn: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
  },
});
