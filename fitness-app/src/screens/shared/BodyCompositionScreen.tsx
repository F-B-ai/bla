import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { crossAlert } from '../../utils/alert';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { StudentSearchPicker } from '../../components/common/StudentSearchPicker';
import { BodyCompositionEstimate, Student } from '../../types';
import {
  uploadBodyCompImage,
  saveEstimate,
  getStudentEstimates,
  deleteEstimate,
} from '../../services/bodyCompositionService';
import {
  estimateBodyComposition,
  AIBodyCompositionResult,
  ensureAIApiKey,
} from '../../services/aiService';
import { useAuth } from '../../hooks/useAuth';
import { getStudents } from '../../services/authService';
import { isStudentAssignedTo } from '../../utils/helpers';

type PhotoView = 'front' | 'sideLeft' | 'sideRight' | 'back';

const PHOTO_VIEWS: { key: PhotoView; label: string }[] = [
  { key: 'front', label: 'Frontale' },
  { key: 'sideLeft', label: 'Lato Sinistro' },
  { key: 'sideRight', label: 'Lato Destro' },
  { key: 'back', label: 'Retro' },
];

const toDate = (d: any): Date => {
  if (!d) return new Date();
  if (d instanceof Date) return d;
  if (typeof d === 'object' && 'toDate' in d) return d.toDate();
  if (typeof d === 'object' && 'seconds' in d) return new Date(d.seconds * 1000);
  return new Date(d);
};

export const BodyCompositionScreen: React.FC = () => {
  const { user, isOwner, isManager, isCollaborator } = useAuth();
  const insets = useSafeAreaInsets();

  // Students
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Photos
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [sideLeftImage, setSideLeftImage] = useState<string | null>(null);
  const [sideRightImage, setSideRightImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);

  // Optional fields
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');

  // AI
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIBodyCompositionResult | null>(null);

  // Save
  const [saving, setSaving] = useState(false);

  // History
  const [previousEstimates, setPreviousEstimates] = useState<BodyCompositionEstimate[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [detailEstimate, setDetailEstimate] = useState<BodyCompositionEstimate | null>(null);

  // Refresh
  const [refreshing, setRefreshing] = useState(false);

  // -----------------------------------------------------------------------
  // Load students
  // -----------------------------------------------------------------------
  const loadStudents = useCallback(async () => {
    if (!user) return;
    try {
      const allStudents = await getStudents();
      if (isOwner) {
        setStudents(allStudents);
      } else if (isManager) {
        setStudents(
          allStudents.filter(
            (s) => isStudentAssignedTo(s, user.id) || (s as any).assignedManagerId === user.id
          )
        );
      } else if (isCollaborator) {
        setStudents(allStudents.filter((s) => isStudentAssignedTo(s, user.id)));
      }
    } catch {
      // Silently handle
    }
  }, [user, isOwner, isManager, isCollaborator]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Load history when student changes
  useEffect(() => {
    if (selectedStudentId) {
      getStudentEstimates(selectedStudentId)
        .then(setPreviousEstimates)
        .catch(() => setPreviousEstimates([]));
    } else {
      setPreviousEstimates([]);
    }
    setShowHistory(false);
  }, [selectedStudentId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStudents();
    if (selectedStudentId) {
      try {
        const estimates = await getStudentEstimates(selectedStudentId);
        setPreviousEstimates(estimates);
      } catch {
        // ignore
      }
    }
    setRefreshing(false);
  }, [loadStudents, selectedStudentId]);

  // -----------------------------------------------------------------------
  // Image picker
  // -----------------------------------------------------------------------
  const setImageForView = (view: PhotoView, uri: string) => {
    switch (view) {
      case 'front': setFrontImage(uri); break;
      case 'sideLeft': setSideLeftImage(uri); break;
      case 'sideRight': setSideRightImage(uri); break;
      case 'back': setBackImage(uri); break;
    }
  };

  const getImageForView = (view: PhotoView): string | null => {
    switch (view) {
      case 'front': return frontImage;
      case 'sideLeft': return sideLeftImage;
      case 'sideRight': return sideRightImage;
      case 'back': return backImage;
    }
  };

  const pickImage = async (view: PhotoView) => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        crossAlert('Permesso negato', 'Serve il permesso per accedere alla galleria');
        return;
      }
    }

    if (Platform.OS === 'web') {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: false,
      });
      if (!result.canceled && result.assets[0]) {
        setImageForView(view, result.assets[0].uri);
      }
      return;
    }

    crossAlert('Seleziona immagine', 'Scegli da dove caricare l\'immagine', [
      {
        text: 'Fotocamera',
        onPress: async () => {
          const camStatus = await ImagePicker.requestCameraPermissionsAsync();
          if (camStatus.status !== 'granted') {
            crossAlert('Permesso negato', 'Serve il permesso per usare la fotocamera');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.7,
          });
          if (!result.canceled && result.assets[0]) {
            setImageForView(view, result.assets[0].uri);
          }
        },
      },
      {
        text: 'Galleria',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.7,
          });
          if (!result.canceled && result.assets[0]) {
            setImageForView(view, result.assets[0].uri);
          }
        },
      },
      { text: 'Annulla', style: 'cancel' },
    ]);
  };

  // -----------------------------------------------------------------------
  // AI Analysis
  // -----------------------------------------------------------------------
  const handleAIAnalysis = async () => {
    if (!frontImage || !sideLeftImage || !sideRightImage || !backImage) {
      crossAlert('Errore', 'Carica tutte e 4 le foto per l\'analisi AI (frontale, lato sinistro, lato destro, retro)');
      return;
    }
    if (!(await ensureAIApiKey())) {
      crossAlert(
        'API Key mancante',
        'Inserisci la chiave API Anthropic nelle impostazioni per usare l\'analisi AI.'
      );
      return;
    }

    setAiAnalyzing(true);
    try {
      const student = students.find((s) => s.id === selectedStudentId);
      const result = await estimateBodyComposition(
        {
          front: frontImage,
          sideLeft: sideLeftImage,
          sideRight: sideRightImage,
          back: backImage,
        },
        {
          name: student ? `${student.name} ${student.surname}` : undefined,
          goals: student?.goals,
          weight: weight ? parseFloat(weight) : undefined,
          height: height ? parseFloat(height) : undefined,
        }
      );
      setAiResult(result);
      crossAlert('Analisi completata', result.summary);
    } catch (err: unknown) {
      crossAlert(
        'Errore AI',
        err instanceof Error ? err.message : 'Errore durante l\'analisi AI'
      );
    } finally {
      setAiAnalyzing(false);
    }
  };

  // -----------------------------------------------------------------------
  // Save
  // -----------------------------------------------------------------------
  const handleSave = async () => {
    if (!user) {
      crossAlert('Errore', 'Utente non autenticato');
      return;
    }
    if (!selectedStudentId) {
      crossAlert('Errore', 'Seleziona un allievo');
      return;
    }
    if (!aiResult) {
      crossAlert('Errore', 'Esegui prima l\'analisi AI');
      return;
    }

    setSaving(true);
    try {
      const isLocalUri = (uri: string) =>
        uri.startsWith('file://') || uri.startsWith('blob:') || uri.startsWith('data:');

      let frontUrl = frontImage || '';
      let sideLeftUrl = sideLeftImage || '';
      let sideRightUrl = sideRightImage || '';
      let backUrl = backImage || '';

      if (frontImage && isLocalUri(frontImage))
        frontUrl = await uploadBodyCompImage(selectedStudentId, 'front', frontImage);
      if (sideLeftImage && isLocalUri(sideLeftImage))
        sideLeftUrl = await uploadBodyCompImage(selectedStudentId, 'sideLeft', sideLeftImage);
      if (sideRightImage && isLocalUri(sideRightImage))
        sideRightUrl = await uploadBodyCompImage(selectedStudentId, 'sideRight', sideRightImage);
      if (backImage && isLocalUri(backImage))
        backUrl = await uploadBodyCompImage(selectedStudentId, 'back', backImage);

      // Build readable AI summary
      let aiSummaryText = aiResult.summary || '';
      if (aiSummaryText.includes('{') && aiSummaryText.includes('"estimatedBodyFat"')) {
        aiSummaryText = `Grasso corporeo stimato: ${aiResult.estimatedBodyFat}% | Massa muscolare: ${aiResult.muscleMassQuality}`;
      }

      await saveEstimate({
        studentId: selectedStudentId,
        assessorId: user.id,
        date: new Date(),
        frontImageUrl: frontUrl,
        sideLeftImageUrl: sideLeftUrl,
        sideRightImageUrl: sideRightUrl,
        backImageUrl: backUrl,
        estimatedBodyFat: aiResult.estimatedBodyFat,
        estimatedMuscleMass: aiResult.muscleMassQuality,
        muscleDistribution: aiResult.muscleDistribution,
        aiAnalysis: aiSummaryText,
        recommendations: aiResult.recommendations,
        createdAt: new Date(),
      });

      crossAlert('Successo', 'Valutazione composizione corporea salvata!');

      // Reset form
      setFrontImage(null);
      setSideLeftImage(null);
      setSideRightImage(null);
      setBackImage(null);
      setWeight('');
      setHeight('');
      setAiResult(null);

      // Refresh history
      if (selectedStudentId) {
        const estimates = await getStudentEstimates(selectedStudentId);
        setPreviousEstimates(estimates);
      }
    } catch (err) {
      crossAlert(
        'Errore',
        `Impossibile salvare: ${err instanceof Error ? err.message : 'Errore sconosciuto'}`
      );
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------------------------------------------------
  // Delete
  // -----------------------------------------------------------------------
  const handleDeleteEstimate = (id: string) => {
    crossAlert('Conferma eliminazione', 'Vuoi davvero eliminare questa valutazione?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEstimate(id);
            setPreviousEstimates((prev) => prev.filter((e) => e.id !== id));
            if (detailEstimate?.id === id) setDetailEstimate(null);
            crossAlert('Eliminata', 'Valutazione eliminata con successo');
          } catch {
            crossAlert('Errore', 'Impossibile eliminare la valutazione');
          }
        },
      },
    ]);
  };

  // -----------------------------------------------------------------------
  // RENDER
  // -----------------------------------------------------------------------
  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Composizione Corporea</Text>
        <Text style={styles.subtitle}>Stima composizione corporea con analisi AI</Text>
      </View>

      {/* Student selector */}
      <StudentSearchPicker
        students={students}
        selectedId={selectedStudentId}
        onSelect={(id) => setSelectedStudentId(id)}
      />

      {/* Photo grid 2x2 */}
      <Text style={styles.sectionTitle}>Fotografie</Text>
      <View style={styles.photoGrid}>
        {PHOTO_VIEWS.map((pv) => {
          const img = getImageForView(pv.key);
          return (
            <TouchableOpacity
              key={pv.key}
              style={styles.photoBox}
              onPress={() => pickImage(pv.key)}
            >
              {img ? (
                <Image source={{ uri: img }} style={styles.photoImage} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera-outline" size={32} color={colors.accent} />
                  <Text style={styles.photoPlaceholderText}>{pv.label}</Text>
                  <Text style={styles.photoPlaceholderHint}>Tocca per caricare</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Optional fields */}
      <Text style={styles.sectionTitle}>Dati Opzionali</Text>
      <View style={styles.optionalFieldsRow}>
        <View style={styles.optionalField}>
          <InputField
            label="Peso (kg)"
            value={weight}
            onChangeText={setWeight}
            placeholder="es. 75"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.optionalField}>
          <InputField
            label="Altezza (cm)"
            value={height}
            onChangeText={setHeight}
            placeholder="es. 178"
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* AI Analysis button */}
      <Button
        title={aiAnalyzing ? 'Analisi in corso...' : 'Analizza con AI'}
        onPress={handleAIAnalysis}
        variant="primary"
        style={{ marginTop: spacing.lg }}
        loading={aiAnalyzing}
        disabled={!frontImage || !sideLeftImage || !sideRightImage || !backImage || aiAnalyzing}
        icon={<Ionicons name="sparkles" size={18} color={colors.textOnAccent} />}
      />

      {aiAnalyzing && (
        <Card variant="outlined">
          <View style={styles.aiLoadingContainer}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.aiLoadingText}>
              L'AI sta analizzando le immagini... Potrebbe richiedere fino a 30 secondi.
            </Text>
          </View>
        </Card>
      )}

      {/* AI Results */}
      {aiResult && (
        <>
          <Text style={styles.sectionTitle}>Risultati Analisi</Text>

          {/* Body fat card */}
          <Card variant="elevated">
            <View style={styles.resultCardHeader}>
              <Ionicons name="analytics-outline" size={22} color={colors.accent} />
              <Text style={styles.resultCardTitle}>Grasso Corporeo Stimato</Text>
            </View>
            <Text style={styles.bodyFatValue}>
              {aiResult.estimatedBodyFat > 0 ? `${aiResult.estimatedBodyFat}%` : 'N/D'}
            </Text>
          </Card>

          {/* Muscle quality card */}
          <Card variant="elevated">
            <View style={styles.resultCardHeader}>
              <Ionicons name="fitness-outline" size={22} color={colors.accent} />
              <Text style={styles.resultCardTitle}>Qualita Massa Muscolare</Text>
            </View>
            <Text style={styles.resultCardValue}>{aiResult.muscleMassQuality}</Text>
          </Card>

          {/* Muscle distribution card */}
          <Card variant="outlined">
            <View style={styles.resultCardHeader}>
              <Ionicons name="body-outline" size={22} color={colors.accent} />
              <Text style={styles.resultCardTitle}>Distribuzione Muscolare</Text>
            </View>
            <Text style={styles.resultCardDescription}>{aiResult.muscleDistribution}</Text>
          </Card>

          {/* Summary */}
          {aiResult.summary ? (
            <Card variant="outlined">
              <View style={styles.resultCardHeader}>
                <Ionicons name="document-text-outline" size={22} color={colors.accent} />
                <Text style={styles.resultCardTitle}>Riepilogo</Text>
              </View>
              <Text style={styles.resultCardDescription}>{aiResult.summary}</Text>
            </Card>
          ) : null}

          {/* Strengths */}
          {aiResult.strengths.length > 0 && (
            <Card variant="outlined">
              <View style={styles.resultCardHeader}>
                <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
                <Text style={[styles.resultCardTitle, { color: colors.success }]}>Punti di Forza</Text>
              </View>
              {aiResult.strengths.map((item, i) => (
                <Text key={i} style={styles.listItem}>
                  {'•'} {item}
                </Text>
              ))}
            </Card>
          )}

          {/* Areas to improve */}
          {aiResult.areasToImprove.length > 0 && (
            <Card variant="outlined">
              <View style={styles.resultCardHeader}>
                <Ionicons name="trending-up-outline" size={22} color={colors.warning} />
                <Text style={[styles.resultCardTitle, { color: colors.warning }]}>Aree da Migliorare</Text>
              </View>
              {aiResult.areasToImprove.map((item, i) => (
                <Text key={i} style={styles.listItem}>
                  {'•'} {item}
                </Text>
              ))}
            </Card>
          )}

          {/* Recommendations */}
          {aiResult.recommendations.length > 0 && (
            <Card variant="outlined">
              <View style={styles.resultCardHeader}>
                <Ionicons name="bulb-outline" size={22} color={colors.info} />
                <Text style={[styles.resultCardTitle, { color: colors.info }]}>Raccomandazioni</Text>
              </View>
              {aiResult.recommendations.map((rec, i) => (
                <Text key={i} style={styles.listItem}>
                  {i + 1}. {rec}
                </Text>
              ))}
            </Card>
          )}

          {/* Save button */}
          <Button
            title={saving ? 'Salvataggio...' : 'Salva Valutazione'}
            onPress={handleSave}
            style={{ marginTop: spacing.lg }}
            loading={saving}
            disabled={saving || !selectedStudentId}
          />
        </>
      )}

      {/* ================================================================= */}
      {/* STORICO                                                           */}
      {/* ================================================================= */}
      {selectedStudentId && previousEstimates.length > 0 && (
        <>
          <TouchableOpacity
            onPress={() => setShowHistory(!showHistory)}
            style={styles.historyToggle}
          >
            <Text style={styles.sectionTitle}>
              Storico ({previousEstimates.length})
            </Text>
            <Ionicons
              name={showHistory ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={colors.text}
            />
          </TouchableOpacity>

          {showHistory && (
            <>
              {previousEstimates.map((estimate) => {
                const dateStr = toDate(estimate.date).toLocaleDateString('it-IT', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                });

                return (
                  <Card key={estimate.id} variant="outlined" style={styles.historyCard}>
                    <View style={styles.historyCardRow}>
                      <View style={styles.historyCardInfo}>
                        <Text style={styles.historyDate}>{dateStr}</Text>
                        <Text style={styles.historyMeta}>
                          {estimate.estimatedBodyFat
                            ? `BF: ${estimate.estimatedBodyFat}%`
                            : ''}
                          {estimate.estimatedMuscleMass
                            ? ` | Massa: ${estimate.estimatedMuscleMass}`
                            : ''}
                        </Text>
                      </View>
                      <View style={styles.historyThumbnails}>
                        {estimate.frontImageUrl ? (
                          <Image
                            source={{ uri: estimate.frontImageUrl }}
                            style={styles.historyThumb}
                          />
                        ) : null}
                        {estimate.backImageUrl ? (
                          <Image
                            source={{ uri: estimate.backImageUrl }}
                            style={styles.historyThumb}
                          />
                        ) : null}
                      </View>
                    </View>
                    {estimate.aiAnalysis ? (
                      <Text style={styles.historyAiNote} numberOfLines={2}>
                        {estimate.aiAnalysis}
                      </Text>
                    ) : null}
                    <View style={styles.historyActions}>
                      <TouchableOpacity
                        style={styles.detailBtn}
                        onPress={() => setDetailEstimate(estimate)}
                      >
                        <Ionicons name="eye-outline" size={14} color={colors.accent} />
                        <Text style={styles.detailBtnText}>Dettaglio</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.detailBtn}
                        onPress={() => handleDeleteEstimate(estimate.id)}
                      >
                        <Ionicons name="trash-outline" size={14} color={colors.error} />
                        <Text style={[styles.detailBtnText, { color: colors.error }]}>
                          Elimina
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                );
              })}
            </>
          )}
        </>
      )}

      {/* ================================================================= */}
      {/* DETAIL MODAL                                                      */}
      {/* ================================================================= */}
      <Modal
        visible={!!detailEstimate}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailEstimate(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dettaglio Valutazione</Text>
              <TouchableOpacity onPress={() => setDetailEstimate(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {detailEstimate && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.detailDate}>
                  {toDate(detailEstimate.date).toLocaleDateString('it-IT', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>

                {/* Photos */}
                <Text style={styles.detailSectionTitle}>Fotografie</Text>
                <View style={styles.detailPhotoGrid}>
                  {[
                    { url: detailEstimate.frontImageUrl, label: 'Frontale' },
                    { url: detailEstimate.sideLeftImageUrl, label: 'Lato SX' },
                    { url: detailEstimate.sideRightImageUrl, label: 'Lato DX' },
                    { url: detailEstimate.backImageUrl, label: 'Retro' },
                  ].map(
                    (photo, i) =>
                      photo.url ? (
                        <View key={i} style={styles.detailPhotoCol}>
                          <Image
                            source={{ uri: photo.url }}
                            style={styles.detailPhoto}
                          />
                          <Text style={styles.detailPhotoLabel}>{photo.label}</Text>
                        </View>
                      ) : null
                  )}
                </View>

                {/* Metrics */}
                {detailEstimate.estimatedBodyFat ? (
                  <View style={styles.detailMetric}>
                    <Ionicons name="analytics-outline" size={18} color={colors.accent} />
                    <Text style={styles.detailMetricLabel}>Grasso corporeo:</Text>
                    <Text style={styles.detailMetricValue}>
                      {detailEstimate.estimatedBodyFat}%
                    </Text>
                  </View>
                ) : null}
                {detailEstimate.estimatedMuscleMass ? (
                  <View style={styles.detailMetric}>
                    <Ionicons name="fitness-outline" size={18} color={colors.accent} />
                    <Text style={styles.detailMetricLabel}>Massa muscolare:</Text>
                    <Text style={styles.detailMetricValue}>
                      {detailEstimate.estimatedMuscleMass}
                    </Text>
                  </View>
                ) : null}
                {detailEstimate.muscleDistribution ? (
                  <>
                    <Text style={styles.detailSectionTitle}>Distribuzione Muscolare</Text>
                    <Text style={styles.detailText}>
                      {detailEstimate.muscleDistribution}
                    </Text>
                  </>
                ) : null}

                {/* AI Analysis */}
                {detailEstimate.aiAnalysis ? (
                  <>
                    <Text style={styles.detailSectionTitle}>Analisi AI</Text>
                    <Text style={styles.detailText}>{detailEstimate.aiAnalysis}</Text>
                  </>
                ) : null}

                {/* Recommendations */}
                {detailEstimate.recommendations &&
                  detailEstimate.recommendations.length > 0 && (
                    <>
                      <Text style={styles.detailSectionTitle}>Raccomandazioni</Text>
                      {detailEstimate.recommendations.map((rec, i) => (
                        <Text key={i} style={styles.detailListItem}>
                          {i + 1}. {rec}
                        </Text>
                      ))}
                    </>
                  )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  header: {
    paddingTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  // Photo grid 2x2
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoBox: {
    width: '48%',
    aspectRatio: 0.75,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.small,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
  },
  photoPlaceholderText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  photoPlaceholderHint: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: 4,
  },

  // Optional fields
  optionalFieldsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionalField: {
    flex: 1,
  },

  // AI loading
  aiLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  aiLoadingText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    flex: 1,
  },

  // Result cards
  resultCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  resultCardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.accent,
  },
  bodyFatValue: {
    fontSize: fontSize.hero,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  resultCardValue: {
    fontSize: fontSize.xxl,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
  resultCardDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  listItem: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },

  // History
  historyToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  historyCard: {
    marginBottom: spacing.sm,
  },
  historyCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  historyCardInfo: {
    flex: 1,
  },
  historyDate: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  historyMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  historyThumbnails: {
    flexDirection: 'row',
    gap: 4,
  },
  historyThumb: {
    width: 36,
    height: 48,
    borderRadius: borderRadius.sm,
  },
  historyAiNote: {
    fontSize: fontSize.xs,
    color: colors.info,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  historyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailBtnText: {
    fontSize: fontSize.xs,
    color: colors.accent,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },

  // Detail modal content
  detailDate: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: spacing.md,
  },
  detailSectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  detailPhotoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  detailPhotoCol: {
    alignItems: 'center',
  },
  detailPhoto: {
    width: 80,
    height: 110,
    borderRadius: borderRadius.md,
  },
  detailPhotoLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 4,
  },
  detailMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailMetricLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    flex: 1,
  },
  detailMetricValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  detailText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  detailListItem: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },

  bottomSpacer: {
    height: spacing.xxl * 2,
  },
});
