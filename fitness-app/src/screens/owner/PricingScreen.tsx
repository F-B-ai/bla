import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';

const ACCENT = colors.accent;
const GOLD = '#C5A55A';
const GREEN = colors.success;

const PlanCard = ({
  title,
  price,
  priceNote,
  features,
  highlight,
  highlightColor,
  icon,
}: {
  title: string;
  price: string;
  priceNote?: string;
  features: string[];
  highlight?: string;
  highlightColor?: string;
  icon: string;
}) => (
  <View style={[styles.planCard, highlight ? { borderColor: highlightColor || ACCENT, borderWidth: 1.5 } : {}]}>
    {highlight && (
      <View style={[styles.highlightBadge, { backgroundColor: highlightColor || ACCENT }]}>
        <Text style={styles.highlightText}>{highlight}</Text>
      </View>
    )}
    <Text style={styles.planIcon}>{icon}</Text>
    <Text style={styles.planTitle}>{title}</Text>
    <Text style={styles.planPrice}>{price}</Text>
    {priceNote && <Text style={styles.planPriceNote}>{priceNote}</Text>}
    <View style={styles.featuresList}>
      {features.map((f, i) => (
        <View key={i} style={styles.featureRow}>
          <Ionicons name="checkmark-circle" size={16} color={GREEN} />
          <Text style={styles.featureText}>{f}</Text>
        </View>
      ))}
    </View>
  </View>
);

export const PricingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={{ ...styles.header, paddingTop: insets.top + spacing.md }}>
        <Text style={styles.headerTitle}>Listino Prezzi</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* --- SECTION 1: Piani Palestra --- */}
        <View style={styles.sectionHeader}>
          <Ionicons name="barbell" size={22} color={ACCENT} />
          <Text style={styles.sectionTitle}>Piani Palestra</Text>
        </View>
        <View style={styles.registrationNote}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.registrationText}>
            Quota di iscrizione: <Text style={styles.bold}>€35</Text> (una tantum)
          </Text>
        </View>

        <PlanCard
          icon="📅"
          title="Mensile"
          price="€60/mese"
          priceNote="+ €35 iscrizione"
          features={[
            'Accesso alla palestra',
            'Flessibilità mensile',
            'Nessun vincolo',
          ]}
        />
        <PlanCard
          icon="📆"
          title="Trimestrale"
          price="€165"
          priceNote="+ €35 iscrizione · €55/mese"
          features={[
            'Accesso alla palestra',
            'Risparmio di €15 rispetto al mensile',
            'Durata 3 mesi',
          ]}
        />
        <PlanCard
          icon="🗓️"
          title="Semestrale"
          price="€300"
          priceNote="+ €35 iscrizione · €50/mese"
          features={[
            'Accesso alla palestra',
            'Risparmio di €60 rispetto al mensile',
            'Durata 6 mesi',
          ]}
        />

        {/* --- SECTION 2: ESSĒRE PREMIUM Annuale --- */}
        <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
          <Ionicons name="diamond" size={22} color={GOLD} />
          <Text style={[styles.sectionTitle, { color: GOLD }]}>ESSĒRE PREMIUM — Annuale</Text>
        </View>

        <PlanCard
          icon="⭐"
          title="Full Access"
          price="€480/anno"
          priceNote="€40/mese"
          highlight="Più Popolare"
          highlightColor={GOLD}
          features={[
            'Accesso full alla palestra',
            'Esame posturale incluso',
            'Prima programmazione inclusa',
            'App ESSĒRE PREMIUM',
          ]}
        />
        <PlanCard
          icon="📌"
          title="Martedì e Giovedì"
          price="€360/anno"
          priceNote="€30/mese"
          features={[
            'Accesso Martedì e Giovedì',
            'Esame posturale incluso',
            'App ESSĒRE PREMIUM',
          ]}
        />

        {/* --- BONUS ANNUALE --- */}
        <View style={styles.bonusCard}>
          <View style={styles.bonusHeader}>
            <Text style={styles.bonusIcon}>🎁</Text>
            <Text style={styles.bonusTitle}>Bonus Pagamento Annuale</Text>
          </View>
          <Text style={styles.bonusSubtitle}>Pagando la quota annuale in un'unica soluzione:</Text>
          <View style={styles.featureRow}>
            <Ionicons name="gift" size={16} color={GOLD} />
            <Text style={styles.bonusFeature}>1 mese in regalo</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="shirt" size={16} color={GOLD} />
            <Text style={styles.bonusFeature}>T-Shirt ESSĒRE in omaggio</Text>
          </View>
          <View style={styles.bonusDivider} />
          <View style={styles.featureRow}>
            <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.bonusNote}>
              Opzione pagamento semestrale tramite contratto — nessun bonus incluso
            </Text>
          </View>
        </View>

        {/* --- SECTION 3: Analisi Posturale --- */}
        <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
          <Ionicons name="body" size={22} color={colors.info} />
          <Text style={styles.sectionTitle}>Analisi Posturale</Text>
        </View>

        <View style={styles.posturalCard}>
          <View style={styles.posturalRow}>
            <View style={styles.posturalLeft}>
              <Text style={styles.posturalTitle}>Analisi Posturale Singola</Text>
              <Text style={styles.posturalDesc}>Senza programma di allenamento</Text>
            </View>
            <View style={styles.posturalPricing}>
              <Text style={styles.posturalOldPrice}>€100</Text>
              <Text style={styles.posturalNewPrice}>€49</Text>
            </View>
          </View>
          <View style={styles.posturalDivider} />
          <View style={styles.posturalBonusRow}>
            <Ionicons name="star" size={18} color={GREEN} />
            <Text style={styles.posturalBonusText}>
              Con qualsiasi abbonamento, l'analisi posturale è{' '}
              <Text style={[styles.bold, { color: GREEN }]}>GRATUITA</Text> come bonus!
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'web' ? spacing.lg : 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },

  registrationNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  registrationText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  bold: {
    fontWeight: '700',
    color: colors.text,
  },

  planCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  highlightBadge: {
    position: 'absolute',
    top: -1,
    right: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
  },
  highlightText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  planTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  planPrice: {
    fontSize: fontSize.hero,
    fontWeight: '800',
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  planPriceNote: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  featuresList: {
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    flex: 1,
  },

  bonusCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: GOLD + '40',
  },
  bonusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  bonusIcon: {
    fontSize: 22,
  },
  bonusTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: GOLD,
  },
  bonusSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  bonusFeature: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: GOLD,
    flex: 1,
  },
  bonusDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  bonusNote: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },

  posturalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.info + '40',
  },
  posturalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  posturalLeft: {
    flex: 1,
  },
  posturalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  posturalDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  posturalPricing: {
    alignItems: 'flex-end',
  },
  posturalOldPrice: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textDecorationLine: 'line-through',
  },
  posturalNewPrice: {
    fontSize: fontSize.hero,
    fontWeight: '800',
    color: colors.info,
  },
  posturalDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  posturalBonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  posturalBonusText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
});
