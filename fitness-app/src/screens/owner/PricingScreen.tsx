import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { getStudents } from '../../services/authService';
import { createPaymentPlan } from '../../services/paymentService';
import { createNotification } from '../../services/notificationService';
import { crossAlert } from '../../utils/alert';
import { Student } from '../../types';

const ACCENT = colors.accent;
const GOLD = '#C5A55A';
const GREEN = colors.success;

interface PricingTier {
  id: string;
  title: string;
  amount: number;
  registrationFee: number;
  durationMonths: number;
  icon: string;
  category: 'gym' | 'premium' | 'postural';
  features: string[];
  highlight?: string;
  highlightColor?: string;
  priceLabel: string;
  priceNote?: string;
  courseType?: string;
}

const TIERS: PricingTier[] = [
  {
    id: 'gym_monthly',
    title: 'Mensile Palestra',
    amount: 60,
    registrationFee: 35,
    durationMonths: 1,
    icon: '📅',
    category: 'gym',
    priceLabel: '€60/mese',
    priceNote: '+ €35 iscrizione',
    features: ['Accesso alla palestra', 'Flessibilità mensile', 'Nessun vincolo'],
  },
  {
    id: 'gym_quarterly',
    title: 'Trimestrale Palestra',
    amount: 165,
    registrationFee: 35,
    durationMonths: 3,
    icon: '📆',
    category: 'gym',
    priceLabel: '€165',
    priceNote: '+ €35 iscrizione · €55/mese',
    features: ['Accesso alla palestra', 'Risparmio di €15 rispetto al mensile', 'Durata 3 mesi'],
  },
  {
    id: 'gym_semester',
    title: 'Semestrale Palestra',
    amount: 300,
    registrationFee: 35,
    durationMonths: 6,
    icon: '🗓️',
    category: 'gym',
    priceLabel: '€300',
    priceNote: '+ €35 iscrizione · €50/mese',
    features: ['Accesso alla palestra', 'Risparmio di €60 rispetto al mensile', 'Durata 6 mesi'],
  },
  {
    id: 'premium_full',
    title: 'ESSĒRE PREMIUM Full Access',
    amount: 480,
    registrationFee: 0,
    durationMonths: 12,
    icon: '⭐',
    category: 'premium',
    priceLabel: '€480/anno',
    priceNote: '€40/mese',
    highlight: 'Più Popolare',
    highlightColor: GOLD,
    courseType: 'ESSĒRE PREMIUM Full Access',
    features: [
      'Accesso full alla palestra',
      'Esame posturale incluso',
      'Prima programmazione inclusa',
      'App ESSĒRE PREMIUM',
    ],
  },
  {
    id: 'premium_biweekly',
    title: 'ESSĒRE PREMIUM Mar/Gio',
    amount: 360,
    registrationFee: 0,
    durationMonths: 12,
    icon: '📌',
    category: 'premium',
    priceLabel: '€360/anno',
    priceNote: '€30/mese',
    courseType: 'ESSĒRE PREMIUM Martedì e Giovedì',
    features: [
      'Accesso Martedì e Giovedì',
      'Esame posturale incluso',
      'App ESSĒRE PREMIUM',
    ],
  },
  {
    id: 'postural_standalone',
    title: 'Analisi Posturale Singola',
    amount: 49,
    registrationFee: 0,
    durationMonths: 1,
    icon: '🧍',
    category: 'postural',
    priceLabel: '€49',
    priceNote: 'invece di €100',
    courseType: 'Analisi Posturale',
    features: ['Esame posturale completo', 'Senza programmazione'],
  },
];

const PlanCard = ({
  tier,
  onCreatePlan,
}: {
  tier: PricingTier;
  onCreatePlan: (tier: PricingTier) => void;
}) => (
  <View style={[styles.planCard, tier.highlight ? { borderColor: tier.highlightColor || ACCENT, borderWidth: 1.5 } : {}]}>
    {tier.highlight && (
      <View style={[styles.highlightBadge, { backgroundColor: tier.highlightColor || ACCENT }]}>
        <Text style={styles.highlightText}>{tier.highlight}</Text>
      </View>
    )}
    <Text style={styles.planIcon}>{tier.icon}</Text>
    <Text style={styles.planTitle}>{tier.title}</Text>
    <Text style={styles.planPrice}>{tier.priceLabel}</Text>
    {tier.priceNote && <Text style={styles.planPriceNote}>{tier.priceNote}</Text>}
    <View style={styles.featuresList}>
      {tier.features.map((f, i) => (
        <View key={i} style={styles.featureRow}>
          <Ionicons name="checkmark-circle" size={16} color={GREEN} />
          <Text style={styles.featureText}>{f}</Text>
        </View>
      ))}
    </View>
    <TouchableOpacity
      style={[styles.createBtn, tier.category === 'premium' ? { backgroundColor: GOLD } : {}]}
      onPress={() => onCreatePlan(tier)}
      activeOpacity={0.7}
    >
      <Ionicons name="add-circle" size={18} color="#fff" />
      <Text style={styles.createBtnText}>Crea Piano</Text>
    </TouchableOpacity>
  </View>
);

export const PricingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [includeRegistration, setIncludeRegistration] = useState(true);
  const [paymentMode, setPaymentMode] = useState<'full' | 'semester'>('full');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getStudents()
      .then(setStudents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openCreateModal = useCallback((tier: PricingTier) => {
    setSelectedTier(tier);
    setSelectedStudentId('');
    setIncludeRegistration(tier.registrationFee > 0);
    setPaymentMode('full');
    setSearchQuery('');
    setShowModal(true);
  }, []);

  const handleCreate = async () => {
    if (!selectedTier || !selectedStudentId) {
      crossAlert('Errore', 'Seleziona un allievo.');
      return;
    }

    const tier = selectedTier;
    const regFee = includeRegistration ? tier.registrationFee : 0;
    const totalAmount = tier.amount + regFee;

    const now = new Date();
    const startDate = new Date(now);
    const endDate = new Date(now);

    if (tier.category === 'premium' && paymentMode === 'semester') {
      endDate.setMonth(endDate.getMonth() + 6);
    } else {
      endDate.setMonth(endDate.getMonth() + tier.durationMonths);
    }

    let installments;
    if (tier.category === 'premium' && paymentMode === 'semester') {
      const half = Math.round((totalAmount / 2) * 100) / 100;
      const secondDue = new Date(now);
      secondDue.setMonth(secondDue.getMonth() + 6);
      installments = [
        { id: `${Date.now()}_0`, amount: half, dueDate: now, status: 'pending' as const },
        { id: `${Date.now()}_1`, amount: totalAmount - half, dueDate: secondDue, status: 'pending' as const },
      ];
    } else {
      installments = [
        { id: `${Date.now()}_0`, amount: totalAmount, dueDate: now, status: 'pending' as const },
      ];
    }

    const subscriptionType = tier.category === 'premium'
      ? (paymentMode === 'full' ? 'Annuale (unica soluzione)' : 'Annuale (semestrale)')
      : tier.durationMonths === 1 ? 'Mensile'
      : tier.durationMonths === 3 ? 'Trimestrale'
      : tier.durationMonths === 6 ? 'Semestrale'
      : 'Annuale';

    try {
      setSaving(true);
      await createPaymentPlan({
        studentId: selectedStudentId,
        collaboratorId: user?.id || '',
        totalAmount,
        paymentType: (tier.category === 'premium' && paymentMode === 'semester') ? 'installment' : 'full',
        installments,
        createdAt: now,
        includedLessons: 0,
        usedLessons: 0,
        includedConsultations: 0,
        usedConsultations: 0,
        startDate,
        endDate,
        courseType: tier.courseType || tier.title,
        subscriptionType,
      });

      const studentName = students.find(s => s.id === selectedStudentId);
      const label = studentName ? `${studentName.name} ${studentName.surname}` : '';

      createNotification(
        selectedStudentId,
        'payment_due',
        'Nuovo piano di pagamento',
        `Ti è stato assegnato il piano "${tier.title}" di €${totalAmount}. Controlla i dettagli nella sezione Pagamenti.`
      ).catch(() => {});

      setShowModal(false);
      crossAlert('Successo', `Piano "${tier.title}" creato per ${label}.\nTotale: €${totalAmount}${regFee > 0 ? ` (di cui €${regFee} iscrizione)` : ''}`);
    } catch {
      crossAlert('Errore', 'Impossibile creare il piano.');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = searchQuery.trim()
    ? students.filter(s =>
        `${s.name} ${s.surname}`.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : students;

  const gymTiers = TIERS.filter(t => t.category === 'gym');
  const premiumTiers = TIERS.filter(t => t.category === 'premium');
  const posturalTier = TIERS.find(t => t.category === 'postural')!;

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
        {/* --- Piani Palestra --- */}
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

        {gymTiers.map(t => (
          <PlanCard key={t.id} tier={t} onCreatePlan={openCreateModal} />
        ))}

        {/* --- ESSĒRE PREMIUM Annuale --- */}
        <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
          <Ionicons name="diamond" size={22} color={GOLD} />
          <Text style={[styles.sectionTitle, { color: GOLD }]}>ESSĒRE PREMIUM — Annuale</Text>
        </View>

        {premiumTiers.map(t => (
          <PlanCard key={t.id} tier={t} onCreatePlan={openCreateModal} />
        ))}

        {/* --- Bonus Annuale --- */}
        <View style={styles.bonusCard}>
          <View style={styles.bonusHeader}>
            <Text style={styles.bonusIconText}>🎁</Text>
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

        {/* --- Analisi Posturale --- */}
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
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.info, marginTop: spacing.md }]}
            onPress={() => openCreateModal(posturalTier)}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.createBtnText}>Crea Piano Posturale</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* --- CREATE PLAN MODAL --- */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Crea Piano</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedTier && (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {/* Selected plan summary */}
                <View style={styles.selectedPlanSummary}>
                  <Text style={styles.selectedPlanIcon}>{selectedTier.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedPlanName}>{selectedTier.title}</Text>
                    <Text style={styles.selectedPlanPrice}>{selectedTier.priceLabel}</Text>
                  </View>
                </View>

                {/* Registration fee toggle (gym plans only) */}
                {selectedTier.registrationFee > 0 && (
                  <TouchableOpacity
                    style={styles.toggleRow}
                    onPress={() => setIncludeRegistration(!includeRegistration)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={includeRegistration ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={includeRegistration ? ACCENT : colors.textLight}
                    />
                    <Text style={styles.toggleText}>
                      Includi iscrizione (€{selectedTier.registrationFee})
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Payment mode (premium plans only) */}
                {selectedTier.category === 'premium' && (
                  <View style={styles.paymentModeSection}>
                    <Text style={styles.paymentModeLabel}>Modalità di pagamento:</Text>
                    <View style={styles.paymentModeRow}>
                      <TouchableOpacity
                        style={[styles.paymentModeBtn, paymentMode === 'full' && styles.paymentModeBtnActive]}
                        onPress={() => setPaymentMode('full')}
                      >
                        <Text style={[styles.paymentModeBtnText, paymentMode === 'full' && styles.paymentModeBtnTextActive]}>
                          Unica soluzione
                        </Text>
                        <Text style={[styles.paymentModeBtnNote, paymentMode === 'full' && { color: GOLD }]}>
                          + bonus
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.paymentModeBtn, paymentMode === 'semester' && styles.paymentModeBtnActive]}
                        onPress={() => setPaymentMode('semester')}
                      >
                        <Text style={[styles.paymentModeBtnText, paymentMode === 'semester' && styles.paymentModeBtnTextActive]}>
                          Semestrale
                        </Text>
                        <Text style={[styles.paymentModeBtnNote, paymentMode === 'semester' && { color: colors.textSecondary }]}>
                          no bonus
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Total */}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Totale:</Text>
                  <Text style={styles.totalValue}>
                    €{selectedTier.amount + (includeRegistration ? selectedTier.registrationFee : 0)}
                  </Text>
                </View>

                {/* Student selector */}
                <Text style={styles.selectLabel}>Seleziona Allievo:</Text>
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={16} color={colors.textLight} />
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Cerca allievo..."
                    placeholderTextColor={colors.textLight}
                  />
                </View>

                {loading ? (
                  <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.lg }} />
                ) : (
                  <View style={styles.studentList}>
                    {filteredStudents.map(s => (
                      <TouchableOpacity
                        key={s.id}
                        style={[
                          styles.studentItem,
                          selectedStudentId === s.id && styles.studentItemActive,
                        ]}
                        onPress={() => setSelectedStudentId(s.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[
                          styles.studentAvatar,
                          selectedStudentId === s.id && { backgroundColor: ACCENT + '30' },
                        ]}>
                          <Text style={[
                            styles.studentAvatarText,
                            selectedStudentId === s.id && { color: ACCENT },
                          ]}>
                            {s.name[0]}{s.surname[0]}
                          </Text>
                        </View>
                        <Text style={[
                          styles.studentName,
                          selectedStudentId === s.id && { color: colors.text },
                        ]}>
                          {s.name} {s.surname}
                        </Text>
                        {selectedStudentId === s.id && (
                          <Ionicons name="checkmark-circle" size={20} color={ACCENT} />
                        )}
                      </TouchableOpacity>
                    ))}
                    {filteredStudents.length === 0 && (
                      <Text style={styles.noResults}>Nessun allievo trovato</Text>
                    )}
                  </View>
                )}

                {/* Confirm button */}
                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    (!selectedStudentId || saving) && { opacity: 0.5 },
                    selectedTier.category === 'premium' && { backgroundColor: GOLD },
                  ]}
                  onPress={handleCreate}
                  disabled={!selectedStudentId || saving}
                  activeOpacity={0.7}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.confirmBtnText}>Conferma Piano</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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

  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: ACCENT,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  createBtnText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#fff',
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
  bonusIconText: {
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'web' ? spacing.lg : 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  modalScroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },

  selectedPlanSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  selectedPlanIcon: {
    fontSize: 32,
  },
  selectedPlanName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  selectedPlanPrice: {
    fontSize: fontSize.md,
    color: colors.accent,
    fontWeight: '600',
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  toggleText: {
    fontSize: fontSize.md,
    color: colors.text,
  },

  paymentModeSection: {
    marginBottom: spacing.md,
  },
  paymentModeLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  paymentModeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  paymentModeBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  paymentModeBtnActive: {
    borderColor: GOLD,
    backgroundColor: GOLD + '15',
  },
  paymentModeBtnText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  paymentModeBtnTextActive: {
    color: colors.text,
  },
  paymentModeBtnNote: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.xs,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.accent,
  },

  selectLabel: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    padding: 0,
  },

  studentList: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
  },
  studentItemActive: {
    backgroundColor: ACCENT + '15',
    borderWidth: 1,
    borderColor: ACCENT + '40',
  },
  studentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentAvatarText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  studentName: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    flex: 1,
  },
  noResults: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },

  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: ACCENT,
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.lg,
  },
  confirmBtnText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#fff',
  },
});
