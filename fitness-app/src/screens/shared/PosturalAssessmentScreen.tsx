import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { crossAlert } from '../../utils/alert';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { StudentSearchPicker } from '../../components/common/StudentSearchPicker';
import {
  PosturalAssessment,
  PosturalFinding,
  PosturalArea,
  Student,
} from '../../types';
import {
  uploadPosturalImage,
  analyzePosture,
  createAssessment,
  getStudentAssessments,
  generateProgressReport,
} from '../../services/posturalService';
import { analyzePostureWithAI, comparePostureWithAI, AIPosturalAnalysis, AIPosturalComparison, ensureAIApiKey } from '../../services/aiService';
import { useAuth } from '../../hooks/useAuth';
import { getStudents } from '../../services/authService';
import { isStudentAssignedTo } from '../../utils/helpers';

const POSTURAL_AREAS: { value: PosturalArea; label: string }[] = [
  { value: 'head_neck', label: 'Testa/Collo' },
  { value: 'shoulders', label: 'Spalle' },
  { value: 'upper_back', label: 'Dorso' },
  { value: 'lower_back', label: 'Lombare' },
  { value: 'pelvis', label: 'Bacino' },
  { value: 'knees', label: 'Ginocchia' },
  { value: 'ankles_feet', label: 'Caviglie/Piedi' },
  { value: 'spine_alignment', label: 'Allineamento colonna' },
];

const SEVERITY_OPTIONS = [
  { value: 'normal' as const, label: 'Normale', color: colors.success },
  { value: 'mild' as const, label: 'Lieve', color: colors.info },
  { value: 'moderate' as const, label: 'Moderato', color: colors.warning },
  { value: 'severe' as const, label: 'Severo', color: colors.error },
];

const SEVERITY_ORDER = ['normal', 'mild', 'moderate', 'severe'];

type PhotoView = 'front' | 'side_left' | 'side_right' | 'back';
const PHOTO_VIEWS: { key: PhotoView; label: string }[] = [
  { key: 'front', label: 'Frontale' },
  { key: 'side_left', label: 'Laterale SX' },
  { key: 'side_right', label: 'Laterale DX' },
  { key: 'back', label: 'Posteriore' },
];

const toDate = (d: any): Date => {
  if (!d) return new Date();
  if (d instanceof Date) return d;
  if (typeof d === 'object' && 'toDate' in d) return d.toDate();
  if (typeof d === 'object' && 'seconds' in d) return new Date(d.seconds * 1000);
  return new Date(d);
};

const getSideLeftUrl = (a: any): string => a.sideLeftImageUrl || a.sideImageUrl || '';
const getSideRightUrl = (a: any): string => a.sideRightImageUrl || '';

export const PosturalAssessmentScreen: React.FC = () => {
  const { user, isOwner, isManager, isCollaborator } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Photos
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [sideLeftImage, setSideLeftImage] = useState<string | null>(null);
  const [sideRightImage, setSideRightImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);

  // Findings
  const [findings, setFindings] = useState<PosturalFinding[]>([]);
  const [overallNotes, setOverallNotes] = useState('');
  const [selectedArea, setSelectedArea] = useState<PosturalArea | null>(null);
  const [currentObservation, setCurrentObservation] = useState('');
  const [currentSeverity, setCurrentSeverity] = useState<PosturalFinding['severity']>('normal');

  // AI
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIPosturalAnalysis | null>(null);

  // Save
  const [saving, setSaving] = useState(false);

  // History & comparison
  const [previousAssessments, setPreviousAssessments] = useState<PosturalAssessment[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonNotes, setComparisonNotes] = useState('');
  const [aiComparing, setAiComparing] = useState(false);
  const [aiComparison, setAiComparison] = useState<AIPosturalComparison | null>(null);

  // Evolution report
  const [showEvolution, setShowEvolution] = useState(false);

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
        setStudents(allStudents.filter((s) => isStudentAssignedTo(s, user.id) || s.assignedManagerId === user.id));
      } else if (isCollaborator) {
        setStudents(allStudents.filter((s) => isStudentAssignedTo(s, user.id)));
      }
    } catch {
      // Silently handle
    }
  }, [user, isOwner, isManager, isCollaborator]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  useEffect(() => {
    if (selectedStudentId) {
      getStudentAssessments(selectedStudentId)
        .then(setPreviousAssessments)
        .catch(() => setPreviousAssessments([]));
    } else {
      setPreviousAssessments([]);
    }
    setSelectedForComparison([]);
    setShowComparison(false);
    setShowEvolution(false);
  }, [selectedStudentId]);

  // -----------------------------------------------------------------------
  // Image picker
  // -----------------------------------------------------------------------
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
        allowsEditing: true,
        quality: 0.8,
        base64: true,
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
            quality: 0.8,
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
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            setImageForView(view, result.assets[0].uri);
          }
        },
      },
      { text: 'Annulla', style: 'cancel' },
    ]);
  };

  const setImageForView = (view: PhotoView, uri: string) => {
    switch (view) {
      case 'front': setFrontImage(uri); break;
      case 'side_left': setSideLeftImage(uri); break;
      case 'side_right': setSideRightImage(uri); break;
      case 'back': setBackImage(uri); break;
    }
  };

  const getImageForView = (view: PhotoView): string | null => {
    switch (view) {
      case 'front': return frontImage;
      case 'side_left': return sideLeftImage;
      case 'side_right': return sideRightImage;
      case 'back': return backImage;
    }
  };

  // -----------------------------------------------------------------------
  // AI Analysis
  // -----------------------------------------------------------------------
  const handleAIAnalysis = async () => {
    if (!frontImage && !sideLeftImage && !sideRightImage && !backImage) {
      crossAlert('Errore', 'Carica almeno una foto per l\'analisi AI');
      return;
    }
    if (!(await ensureAIApiKey())) {
      crossAlert('API Key mancante', 'Inserisci la chiave API Anthropic nelle impostazioni per usare l\'analisi AI.');
      return;
    }

    setAiAnalyzing(true);
    try {
      const student = students.find((s) => s.id === selectedStudentId);
      const result = await analyzePostureWithAI(
        {
          front: frontImage || undefined,
          side: sideLeftImage || sideRightImage || undefined,
          back: backImage || undefined,
        },
        findings.length > 0 ? findings : undefined,
        student ? { name: `${student.name} ${student.surname}`, goals: student.goals, medicalNotes: student.medicalNotes } : undefined,
      );
      setAiResult(result);
      if (findings.length === 0 && result.findings.length > 0) {
        setFindings(result.findings.map((f) => ({
          area: f.area as PosturalArea,
          observation: f.observation,
          severity: f.severity,
        })));
      }
      crossAlert('Analisi AI completata', result.summary);
    } catch (err: unknown) {
      crossAlert('Errore AI', err instanceof Error ? err.message : 'Errore durante l\'analisi AI');
    } finally {
      setAiAnalyzing(false);
    }
  };

  // -----------------------------------------------------------------------
  // Findings
  // -----------------------------------------------------------------------
  const addFinding = () => {
    if (!selectedArea || !currentObservation.trim()) {
      crossAlert('Errore', 'Seleziona un\'area e aggiungi un\'osservazione');
      return;
    }
    setFindings([...findings, { area: selectedArea, observation: currentObservation, severity: currentSeverity }]);
    setSelectedArea(null);
    setCurrentObservation('');
    setCurrentSeverity('normal');
  };

  const removeFinding = (index: number) => {
    setFindings(findings.filter((_, i) => i !== index));
  };

  const handleAnalyze = () => {
    if (findings.length === 0) { crossAlert('Errore', 'Aggiungi almeno un\'osservazione'); return; }
    const analysis = analyzePosture(findings);
    crossAlert('Analisi Posturale', `${analysis.summary}\n\nRaccomandazioni:\n- ${analysis.recommendations.join('\n- ')}`);
  };

  // -----------------------------------------------------------------------
  // Save
  // -----------------------------------------------------------------------
  const handleSave = async () => {
    if (!user || findings.length === 0) { crossAlert('Errore', 'Aggiungi almeno un\'osservazione'); return; }
    if (!selectedStudentId) { crossAlert('Errore', 'Seleziona un allievo'); return; }

    setSaving(true);
    try {
      let frontUrl = frontImage || '';
      let sideLeftUrl = sideLeftImage || '';
      let sideRightUrl = sideRightImage || '';
      let backUrl = backImage || '';

      const isLocalUri = (uri: string) =>
        uri.startsWith('file://') || uri.startsWith('blob:') || uri.startsWith('data:');

      if (frontImage && isLocalUri(frontImage))
        frontUrl = await uploadPosturalImage(selectedStudentId, frontImage, 'front');
      if (sideLeftImage && isLocalUri(sideLeftImage))
        sideLeftUrl = await uploadPosturalImage(selectedStudentId, sideLeftImage, 'side_left');
      if (sideRightImage && isLocalUri(sideRightImage))
        sideRightUrl = await uploadPosturalImage(selectedStudentId, sideRightImage, 'side_right');
      if (backImage && isLocalUri(backImage))
        backUrl = await uploadPosturalImage(selectedStudentId, backImage, 'back');

      await createAssessment({
        studentId: selectedStudentId,
        assessorId: user.id,
        date: new Date(),
        frontImageUrl: frontUrl,
        sideLeftImageUrl: sideLeftUrl,
        sideRightImageUrl: sideRightUrl,
        backImageUrl: backUrl,
        findings,
        overallNotes,
        recommendations: analyzePosture(findings).recommendations.join('\n'),
        aiAnalysis: aiResult?.summary || undefined,
        aiRecommendations: aiResult?.recommendations || undefined,
        aiExerciseProgram: aiResult?.exerciseProgram || undefined,
      });

      crossAlert('Successo', 'Valutazione posturale salvata!');
      setSelectedStudentId('');
      setFrontImage(null);
      setSideLeftImage(null);
      setSideRightImage(null);
      setBackImage(null);
      setFindings([]);
      setOverallNotes('');
      setAiResult(null);
    } catch (err) {
      crossAlert('Errore', `Impossibile salvare: ${err instanceof Error ? err.message : 'Errore sconosciuto'}`);
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------------------------------------------------
  // Comparison helpers
  // -----------------------------------------------------------------------
  const toggleComparisonSelection = (id: string) => {
    setAiComparison(null);
    setSelectedForComparison((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 4 ? prev : [...prev, id]
    );
  };

  const comparisonAssessments = useMemo(() =>
    previousAssessments
      .filter((a) => selectedForComparison.includes(a.id))
      .sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime()),
    [previousAssessments, selectedForComparison],
  );

  const getAssessmentImageUrl = (a: any, view: PhotoView): string => {
    switch (view) {
      case 'front': return a.frontImageUrl || '';
      case 'side_left': return getSideLeftUrl(a);
      case 'side_right': return getSideRightUrl(a);
      case 'back': return a.backImageUrl || '';
    }
  };

  const getSeverityForArea = (a: PosturalAssessment, area: PosturalArea): string => {
    const f = a.findings.find((f) => f.area === area);
    return f?.severity || '-';
  };

  const getSeverityColor = (sev: string): string => {
    const opt = SEVERITY_OPTIONS.find((o) => o.value === sev);
    return opt?.color || colors.textLight;
  };

  const handleAICompare = async () => {
    if (comparisonAssessments.length < 2) {
      crossAlert('Errore', 'Seleziona almeno due valutazioni da confrontare.');
      return;
    }
    if (!(await ensureAIApiKey())) {
      crossAlert('API Key mancante', 'Inserisci la chiave API Anthropic nelle impostazioni per usare il confronto AI.');
      return;
    }

    // Prima = più vecchia, Dopo = più recente (comparisonAssessments è ordinato per data crescente)
    const beforeA = comparisonAssessments[0];
    const afterA = comparisonAssessments[comparisonAssessments.length - 1];

    setAiComparing(true);
    setAiComparison(null);
    try {
      const student = students.find((s) => s.id === selectedStudentId);
      const result = await comparePostureWithAI(
        {
          date: toDate(beforeA.date).toLocaleDateString('it-IT'),
          front: beforeA.frontImageUrl || undefined,
          side: getSideLeftUrl(beforeA) || getSideRightUrl(beforeA) || undefined,
          back: beforeA.backImageUrl || undefined,
          findings: beforeA.findings || [],
          aiAnalysis: beforeA.aiAnalysis || undefined,
        },
        {
          date: toDate(afterA.date).toLocaleDateString('it-IT'),
          front: afterA.frontImageUrl || undefined,
          side: getSideLeftUrl(afterA) || getSideRightUrl(afterA) || undefined,
          back: afterA.backImageUrl || undefined,
          findings: afterA.findings || [],
          aiAnalysis: afterA.aiAnalysis || undefined,
        },
        student ? { name: `${student.name} ${student.surname}`, goals: student.goals, medicalNotes: student.medicalNotes } : undefined,
      );
      setAiComparison(result);
    } catch (err: unknown) {
      crossAlert('Errore AI', err instanceof Error ? err.message : 'Errore durante il confronto AI');
    } finally {
      setAiComparing(false);
    }
  };

  const verdictColor = (v: string): string => {
    switch (v) {
      case 'miglioramento': return colors.success;
      case 'peggioramento': return colors.error;
      case 'misto': return colors.warning;
      default: return colors.textLight;
    }
  };

  const verdictLabel = (v: string): string => {
    switch (v) {
      case 'miglioramento': return '✅ Miglioramento';
      case 'peggioramento': return '⚠️ Peggioramento';
      case 'misto': return '➗ Risultati Misti';
      case 'stabile': return '➖ Stabile';
      default: return v;
    }
  };

  // -----------------------------------------------------------------------
  // Evolution report
  // -----------------------------------------------------------------------
  const evolutionReport = useMemo(() => {
    if (previousAssessments.length < 2) return null;
    return generateProgressReport(previousAssessments);
  }, [previousAssessments]);

  const areaLabel = (area: string) =>
    POSTURAL_AREAS.find((a) => a.value === area)?.label || area;

  // -----------------------------------------------------------------------
  // RENDER
  // -----------------------------------------------------------------------
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Test Posturale</Text>
        <Text style={styles.subtitle}>Analisi posturale con immagini</Text>
      </View>

      {/* Selezione allievo */}
      <StudentSearchPicker
        students={students}
        selectedId={selectedStudentId}
        onSelect={(id) => setSelectedStudentId(id)}
      />

      {/* Fotografie - griglia 2x2 */}
      <Text style={styles.sectionTitle}>Fotografie</Text>
      <View style={styles.photoGrid}>
        {PHOTO_VIEWS.map((pv) => {
          const img = getImageForView(pv.key);
          return (
            <TouchableOpacity key={pv.key} style={styles.photoBox} onPress={() => pickImage(pv.key)}>
              {img ? (
                <Image source={{ uri: img }} style={styles.photoImage} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderIcon}>+</Text>
                  <Text style={styles.photoPlaceholderText}>{pv.label}</Text>
                  <Text style={styles.photoPlaceholderHint}>Tocca per caricare</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Osservazioni */}
      <Text style={styles.sectionTitle}>Osservazioni</Text>
      <Card variant="outlined">
        <Text style={styles.fieldLabel}>Area corporea</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.areaRow}>
            {POSTURAL_AREAS.map((area) => (
              <TouchableOpacity
                key={area.value}
                style={[styles.areaChip, selectedArea === area.value && styles.areaChipActive]}
                onPress={() => setSelectedArea(area.value)}
              >
                <Text style={[styles.areaChipText, selectedArea === area.value && styles.areaChipTextActive]}>
                  {area.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.fieldLabel}>Severità</Text>
        <View style={styles.severityRow}>
          {SEVERITY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.severityChip,
                currentSeverity === opt.value && { backgroundColor: opt.color + '20', borderColor: opt.color },
              ]}
              onPress={() => setCurrentSeverity(opt.value)}
            >
              <View style={[styles.severityDot, { backgroundColor: opt.color }]} />
              <Text style={[styles.severityText, currentSeverity === opt.value && { color: opt.color }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <InputField
          label="Osservazione"
          value={currentObservation}
          onChangeText={setCurrentObservation}
          placeholder="Descrivi ciò che osservi..."
          multiline
          numberOfLines={3}
        />
        <Button title="Aggiungi Osservazione" onPress={addFinding} variant="secondary" />
      </Card>

      {/* Lista osservazioni */}
      {findings.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Osservazioni Registrate ({findings.length})</Text>
          {findings.map((finding, index) => {
            const al = POSTURAL_AREAS.find((a) => a.value === finding.area)?.label ?? '';
            const si = SEVERITY_OPTIONS.find((s) => s.value === finding.severity)!;
            return (
              <Card key={index} variant="outlined">
                <View style={styles.findingHeader}>
                  <View style={styles.findingInfo}>
                    <Text style={styles.findingArea}>{al}</Text>
                    <View style={[styles.severityBadge, { backgroundColor: si.color + '20' }]}>
                      <Text style={[styles.severityBadgeText, { color: si.color }]}>{si.label}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => removeFinding(index)}>
                    <Ionicons name="close-circle" size={22} color={colors.error} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.findingObservation}>{finding.observation}</Text>
              </Card>
            );
          })}
        </>
      )}

      {/* Note generali */}
      <InputField
        label="Note generali"
        value={overallNotes}
        onChangeText={setOverallNotes}
        placeholder="Note aggiuntive sulla valutazione..."
        multiline
        numberOfLines={4}
      />

      {/* Azioni */}
      <View style={styles.actionButtons}>
        <Button title="Analizza Postura" onPress={handleAnalyze} variant="secondary" style={styles.actionButton} />
        <Button
          title={aiAnalyzing ? 'Analisi AI...' : 'Analisi AI'}
          onPress={handleAIAnalysis}
          variant="primary"
          style={styles.actionButton}
          loading={aiAnalyzing}
          disabled={(!frontImage && !sideLeftImage && !sideRightImage && !backImage) || aiAnalyzing}
        />
      </View>

      {aiAnalyzing && (
        <Card variant="outlined">
          <Text style={styles.aiLoadingText}>L'AI sta analizzando le immagini... Potrebbe richiedere fino a 30 secondi.</Text>
        </Card>
      )}

      <Button
        title={saving ? 'Salvataggio...' : 'Salva Valutazione'}
        onPress={handleSave}
        style={{ marginTop: spacing.sm }}
        loading={saving}
      />

      {/* Risultato AI */}
      {aiResult && (
        <>
          <Text style={styles.sectionTitle}>Risultato Analisi AI</Text>
          <Card variant="elevated">
            <Text style={styles.aiSummary}>{aiResult.summary}</Text>
          </Card>
          {aiResult.recommendations.length > 0 && (
            <Card variant="outlined">
              <Text style={styles.aiSubtitle}>Raccomandazioni</Text>
              {aiResult.recommendations.map((rec, i) => (
                <Text key={i} style={styles.aiListItem}>{'•'} {rec}</Text>
              ))}
            </Card>
          )}
          {aiResult.exerciseProgram.length > 0 && (
            <Card variant="outlined">
              <Text style={styles.aiSubtitle}>Programma Esercizi Correttivi</Text>
              {aiResult.exerciseProgram.map((ex, i) => (
                <Text key={i} style={styles.aiListItem}>{i + 1}. {ex}</Text>
              ))}
            </Card>
          )}
        </>
      )}

      {/* ================================================================= */}
      {/* STORICO E CONFRONTO                                               */}
      {/* ================================================================= */}
      {selectedStudentId && previousAssessments.length > 0 && (
        <>
          <TouchableOpacity onPress={() => setShowHistory(!showHistory)} style={styles.historyToggle}>
            <Text style={styles.sectionTitle}>
              Storico Valutazioni ({previousAssessments.length})
            </Text>
            <Ionicons name={showHistory ? 'chevron-up' : 'chevron-down'} size={22} color={colors.text} />
          </TouchableOpacity>

          {showHistory && (
            <>
              <Text style={styles.helperText}>Seleziona fino a 4 valutazioni per confrontarle</Text>
              {previousAssessments.map((assessment) => {
                const isSelected = selectedForComparison.includes(assessment.id);
                const dateStr = toDate(assessment.date).toLocaleDateString('it-IT', {
                  day: 'numeric', month: 'long', year: 'numeric',
                });
                const severeCount = assessment.findings.filter((f) => f.severity === 'severe').length;
                const moderateCount = assessment.findings.filter((f) => f.severity === 'moderate').length;

                return (
                  <TouchableOpacity
                    key={assessment.id}
                    onPress={() => toggleComparisonSelection(assessment.id)}
                    style={[styles.historyCard, isSelected && styles.historyCardSelected]}
                  >
                    <View style={styles.historyCardRow}>
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={isSelected ? colors.accent : colors.textSecondary}
                      />
                      <View style={styles.historyCardInfo}>
                        <Text style={styles.historyDate}>{dateStr}</Text>
                        <Text style={styles.historyMeta}>
                          {assessment.findings.length} osservazioni
                          {severeCount > 0 && ` · ${severeCount} severe`}
                          {moderateCount > 0 && ` · ${moderateCount} moderate`}
                        </Text>
                      </View>
                      <View style={styles.historyThumbnails}>
                        {assessment.frontImageUrl ? (
                          <Image source={{ uri: assessment.frontImageUrl }} style={styles.historyThumb} />
                        ) : null}
                        {(getSideLeftUrl(assessment) || getSideRightUrl(assessment)) ? (
                          <Image source={{ uri: getSideLeftUrl(assessment) || getSideRightUrl(assessment) }} style={styles.historyThumb} />
                        ) : null}
                      </View>
                    </View>
                    {assessment.aiAnalysis && (
                      <Text style={styles.historyAiNote} numberOfLines={2}>AI: {assessment.aiAnalysis}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}

              {selectedForComparison.length >= 2 && (
                <Button
                  title={`Confronta ${selectedForComparison.length} Valutazioni`}
                  onPress={() => setShowComparison(true)}
                  style={{ marginTop: spacing.sm }}
                />
              )}
            </>
          )}
        </>
      )}

      {/* ================================================================= */}
      {/* MODAL CONFRONTO                                                   */}
      {/* ================================================================= */}
      <Modal visible={showComparison} animationType="slide" transparent onRequestClose={() => setShowComparison(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confronto Valutazioni</Text>
              <TouchableOpacity onPress={() => setShowComparison(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Foto per vista */}
              {PHOTO_VIEWS.map((pv) => {
                const images = comparisonAssessments
                  .map((a) => ({ url: getAssessmentImageUrl(a, pv.key), date: toDate(a.date) }))
                  .filter((x) => !!x.url);
                if (images.length === 0) return null;
                return (
                  <View key={pv.key} style={styles.compViewSection}>
                    <Text style={styles.compViewLabel}>{pv.label}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.compImageRow}>
                        {images.map((img, i) => (
                          <View key={i} style={styles.compImageCol}>
                            <Image source={{ uri: img.url }} style={styles.compImage} />
                            <Text style={styles.compImageDate}>
                              {img.date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: '2-digit' })}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                );
              })}

              {/* Tabella severità per area */}
              <Text style={styles.compTableTitle}>Severità per Area</Text>
              <View style={styles.compTable}>
                {/* Header */}
                <View style={styles.compTableRow}>
                  <View style={styles.compTableCellArea}><Text style={styles.compTableHeader}>Area</Text></View>
                  {comparisonAssessments.map((a) => (
                    <View key={a.id} style={styles.compTableCellDate}>
                      <Text style={styles.compTableHeader}>
                        {toDate(a.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                  ))}
                </View>
                {/* Rows */}
                {POSTURAL_AREAS.map((area) => {
                  const severities = comparisonAssessments.map((a) => getSeverityForArea(a, area.value));
                  const first = severities[0];
                  const last = severities[severities.length - 1];
                  let rowBg = 'transparent';
                  if (first !== '-' && last !== '-' && severities.length >= 2) {
                    if (SEVERITY_ORDER.indexOf(last) < SEVERITY_ORDER.indexOf(first)) rowBg = colors.success + '15';
                    else if (SEVERITY_ORDER.indexOf(last) > SEVERITY_ORDER.indexOf(first)) rowBg = colors.error + '15';
                  }

                  return (
                    <View key={area.value} style={[styles.compTableRow, { backgroundColor: rowBg }]}>
                      <View style={styles.compTableCellArea}>
                        <Text style={styles.compTableAreaText}>{area.label}</Text>
                      </View>
                      {severities.map((sev, i) => (
                        <View key={i} style={styles.compTableCellDate}>
                          <View style={[styles.compSevDot, { backgroundColor: getSeverityColor(sev) }]} />
                          <Text style={[styles.compSevText, { color: getSeverityColor(sev) }]}>
                            {SEVERITY_OPTIONS.find((o) => o.value === sev)?.label || '-'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>

              {/* Note AI di ogni valutazione */}
              {comparisonAssessments.some((a) => a.aiAnalysis) && (
                <>
                  <Text style={styles.compTableTitle}>Note AI</Text>
                  {comparisonAssessments.filter((a) => a.aiAnalysis).map((a) => (
                    <Card key={a.id} variant="outlined" style={styles.compAiCard}>
                      <Text style={styles.compAiDate}>
                        {toDate(a.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </Text>
                      <Text style={styles.compAiText}>{a.aiAnalysis}</Text>
                    </Card>
                  ))}
                </>
              )}

              {/* Confronto AI Prima/Dopo */}
              <Text style={styles.compTableTitle}>Confronto AI nel Tempo</Text>
              <Card variant="outlined" style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                  <Ionicons name="sparkles" size={18} color={colors.accent} style={{ marginRight: 6 }} />
                  <Text style={{ color: colors.textLight, fontSize: fontSize.sm, flex: 1 }}>
                    L'AI confronta la prima e l'ultima valutazione selezionata per valutare i progressi reali.
                  </Text>
                </View>
                <Button
                  title={aiComparing ? 'Analisi in corso...' : 'Confronta con AI'}
                  onPress={handleAICompare}
                  disabled={aiComparing}
                  variant="primary"
                />
                {aiComparing && (
                  <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.sm }} />
                )}

                {aiComparison && (
                  <View style={{ marginTop: spacing.md }}>
                    <View style={{
                      alignSelf: 'flex-start',
                      backgroundColor: verdictColor(aiComparison.verdict) + '22',
                      borderRadius: borderRadius.md,
                      paddingVertical: 4,
                      paddingHorizontal: 10,
                      marginBottom: spacing.sm,
                    }}>
                      <Text style={{ color: verdictColor(aiComparison.verdict), fontWeight: '700', fontSize: fontSize.md }}>
                        {verdictLabel(aiComparison.verdict)}
                      </Text>
                    </View>

                    <Text style={{ color: colors.text, fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.sm }}>
                      {aiComparison.summary}
                    </Text>

                    {aiComparison.improvements.length > 0 && (
                      <View style={{ marginBottom: spacing.sm }}>
                        <Text style={{ color: colors.success, fontWeight: '700', marginBottom: 4 }}>Miglioramenti</Text>
                        {aiComparison.improvements.map((it, i) => (
                          <Text key={i} style={{ color: colors.text, fontSize: fontSize.sm, lineHeight: 19 }}>• {it}</Text>
                        ))}
                      </View>
                    )}

                    {aiComparison.worsened.length > 0 && (
                      <View style={{ marginBottom: spacing.sm }}>
                        <Text style={{ color: colors.error, fontWeight: '700', marginBottom: 4 }}>Da monitorare</Text>
                        {aiComparison.worsened.map((it, i) => (
                          <Text key={i} style={{ color: colors.text, fontSize: fontSize.sm, lineHeight: 19 }}>• {it}</Text>
                        ))}
                      </View>
                    )}

                    {aiComparison.unchanged.length > 0 && (
                      <View style={{ marginBottom: spacing.sm }}>
                        <Text style={{ color: colors.textLight, fontWeight: '700', marginBottom: 4 }}>Stabile</Text>
                        {aiComparison.unchanged.map((it, i) => (
                          <Text key={i} style={{ color: colors.textLight, fontSize: fontSize.sm, lineHeight: 19 }}>• {it}</Text>
                        ))}
                      </View>
                    )}

                    {aiComparison.recommendations.length > 0 && (
                      <View>
                        <Text style={{ color: colors.accent, fontWeight: '700', marginBottom: 4 }}>Consigli</Text>
                        {aiComparison.recommendations.map((it, i) => (
                          <Text key={i} style={{ color: colors.text, fontSize: fontSize.sm, lineHeight: 19 }}>• {it}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </Card>

              {/* Note confronto */}
              <InputField
                label="Tue considerazioni sul confronto"
                value={comparisonNotes}
                onChangeText={setComparisonNotes}
                placeholder="Aggiungi le tue considerazioni..."
                multiline
                numberOfLines={4}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* REPORT EVOLUZIONE                                                  */}
      {/* ================================================================= */}
      {selectedStudentId && previousAssessments.length >= 2 && (
        <>
          <Button
            title="Report Evoluzione Percorso"
            onPress={() => setShowEvolution(true)}
            variant="primary"
            style={{ marginTop: spacing.lg }}
          />
        </>
      )}

      <Modal visible={showEvolution} animationType="slide" transparent onRequestClose={() => setShowEvolution(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Evoluzione Percorso</Text>
              <TouchableOpacity onPress={() => setShowEvolution(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {evolutionReport && (
                <>
                  {/* Timeline punteggio */}
                  <Text style={styles.evoSubtitle}>Andamento Severità</Text>
                  <Text style={styles.evoHint}>Punteggio più basso = postura migliore</Text>
                  <View style={styles.evoTimeline}>
                    {evolutionReport.timeline.map((point, i) => {
                      const maxScore = Math.max(...evolutionReport.timeline.map((t) => t.severityScore), 1);
                      const pct = (point.severityScore / maxScore) * 100;
                      return (
                        <View key={i} style={styles.evoTimePoint}>
                          <Text style={styles.evoTimeDate}>
                            {toDate(point.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                          </Text>
                          <View style={styles.evoBarContainer}>
                            <View style={{
                              ...styles.evoBar,
                              width: `${Math.max(pct, 5)}%`,
                              backgroundColor: pct <= 33 ? colors.success : pct <= 66 ? colors.warning : colors.error,
                            }} />
                          </View>
                          <Text style={styles.evoTimeScore}>{point.severityScore}</Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Miglioramenti */}
                  {evolutionReport.improvements.length > 0 && (
                    <>
                      <Text style={styles.evoSubtitle}>Aree Migliorate</Text>
                      {evolutionReport.improvements.map((area, i) => (
                        <View key={i} style={styles.evoAreaRow}>
                          <Ionicons name="trending-down" size={18} color={colors.success} />
                          <Text style={[styles.evoAreaText, { color: colors.success }]}>{areaLabel(area)}</Text>
                        </View>
                      ))}
                    </>
                  )}

                  {/* Aree persistenti */}
                  {evolutionReport.persistent.length > 0 && (
                    <>
                      <Text style={styles.evoSubtitle}>Aree da Monitorare</Text>
                      {evolutionReport.persistent.map((area, i) => (
                        <View key={i} style={styles.evoAreaRow}>
                          <Ionicons name="alert-circle" size={18} color={colors.warning} />
                          <Text style={[styles.evoAreaText, { color: colors.warning }]}>{areaLabel(area)}</Text>
                        </View>
                      ))}
                    </>
                  )}

                  {/* Evoluzione per area */}
                  <Text style={styles.evoSubtitle}>Dettaglio per Area</Text>
                  {POSTURAL_AREAS.map((area) => {
                    const sorted = [...previousAssessments].sort(
                      (a, b) => toDate(a.date).getTime() - toDate(b.date).getTime(),
                    );
                    const severities = sorted.map((a) => {
                      const f = a.findings.find((f) => f.area === area.value);
                      return f?.severity || 'normal';
                    });
                    const first = severities[0];
                    const last = severities[severities.length - 1];
                    const improved = SEVERITY_ORDER.indexOf(last) < SEVERITY_ORDER.indexOf(first);
                    const worsened = SEVERITY_ORDER.indexOf(last) > SEVERITY_ORDER.indexOf(first);

                    return (
                      <View key={area.value} style={styles.evoDetailRow}>
                        <Text style={styles.evoDetailArea}>{area.label}</Text>
                        <View style={styles.evoDetailDots}>
                          {severities.map((s, i) => (
                            <View key={i} style={[styles.evoDetailDot, { backgroundColor: getSeverityColor(s) }]} />
                          ))}
                        </View>
                        <Ionicons
                          name={improved ? 'arrow-down' : worsened ? 'arrow-up' : 'remove'}
                          size={16}
                          color={improved ? colors.success : worsened ? colors.error : colors.textLight}
                        />
                      </View>
                    );
                  })}

                  {/* Cronologia note */}
                  <Text style={styles.evoSubtitle}>Cronologia Osservazioni</Text>
                  {[...previousAssessments]
                    .sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime())
                    .map((a) => (
                      <Card key={a.id} variant="outlined" style={styles.evoNoteCard}>
                        <Text style={styles.evoNoteDate}>
                          {toDate(a.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </Text>
                        {a.overallNotes ? <Text style={styles.evoNoteText}>{a.overallNotes}</Text> : null}
                        {a.aiAnalysis ? (
                          <Text style={styles.evoNoteAi}>AI: {a.aiAnalysis}</Text>
                        ) : null}
                        {a.recommendations ? (
                          <Text style={styles.evoNoteRec}>Raccomandazioni: {a.recommendations}</Text>
                        ) : null}
                      </Card>
                    ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  header: { paddingTop: spacing.lg, marginBottom: spacing.lg },
  title: { fontSize: fontSize.title, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.xs },
  sectionTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  fieldLabel: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.sm, marginTop: spacing.sm },

  // Photo grid 2x2
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoBox: { width: '48%', aspectRatio: 0.75, borderRadius: borderRadius.lg, overflow: 'hidden', ...shadows.small },
  photoImage: { width: '100%', height: '100%' },
  photoPlaceholder: {
    flex: 1, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, borderRadius: borderRadius.lg,
  },
  photoPlaceholderIcon: { fontSize: fontSize.hero, color: colors.accent, fontWeight: '300' },
  photoPlaceholderText: { fontSize: fontSize.md, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.xs },
  photoPlaceholderHint: { fontSize: fontSize.xs, color: colors.textLight, marginTop: 4 },

  // Areas & severity
  areaRow: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.sm },
  areaChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.round, borderWidth: 1, borderColor: colors.border },
  areaChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  areaChipText: { fontSize: fontSize.sm, color: colors.textSecondary },
  areaChipTextActive: { color: colors.textOnAccent, fontWeight: '600' },
  severityRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' },
  severityChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.round, borderWidth: 1, borderColor: colors.border },
  severityDot: { width: 8, height: 8, borderRadius: 4 },
  severityText: { fontSize: fontSize.sm, color: colors.textSecondary },

  // Findings
  findingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  findingInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  findingArea: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  severityBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.round },
  severityBadgeText: { fontSize: fontSize.xs, fontWeight: '600' },
  findingObservation: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 20 },

  // Actions
  actionButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  actionButton: { flex: 1 },
  aiLoadingText: { color: colors.accent, fontSize: fontSize.sm, textAlign: 'center', fontStyle: 'italic', padding: spacing.sm },
  aiSummary: { fontSize: fontSize.md, color: colors.text, lineHeight: 20 },
  aiSubtitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.accent, marginBottom: spacing.sm },
  aiListItem: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.xs },

  // History
  historyToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg },
  helperText: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm, fontStyle: 'italic' },
  historyCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm,
  },
  historyCardSelected: { borderColor: colors.accent, backgroundColor: colors.primaryLight },
  historyCardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  historyCardInfo: { flex: 1 },
  historyDate: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  historyMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  historyThumbnails: { flexDirection: 'row', gap: 4 },
  historyThumb: { width: 36, height: 48, borderRadius: borderRadius.sm },
  historyAiNote: { fontSize: fontSize.xs, color: colors.info, marginTop: spacing.xs, fontStyle: 'italic' },

  // Comparison modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.lg, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },

  compViewSection: { marginBottom: spacing.md },
  compViewLabel: { fontSize: fontSize.md, fontWeight: '700', color: colors.accent, marginBottom: spacing.xs },
  compImageRow: { flexDirection: 'row', gap: spacing.sm },
  compImageCol: { alignItems: 'center' },
  compImage: { width: 100, height: 140, borderRadius: borderRadius.md },
  compImageDate: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 4 },

  compTableTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  compTable: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, overflow: 'hidden' },
  compTableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  compTableCellArea: { flex: 2, padding: spacing.xs, justifyContent: 'center' },
  compTableCellDate: { flex: 1, padding: spacing.xs, alignItems: 'center', justifyContent: 'center' },
  compTableHeader: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' },
  compTableAreaText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  compSevDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  compSevText: { fontSize: fontSize.xs, fontWeight: '600' },

  compAiCard: { marginBottom: spacing.sm },
  compAiDate: { fontSize: fontSize.sm, fontWeight: '700', color: colors.accent, marginBottom: spacing.xs },
  compAiText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18 },

  // Evolution
  evoSubtitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  evoHint: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: spacing.sm, fontStyle: 'italic' },
  evoTimeline: { gap: spacing.xs },
  evoTimePoint: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  evoTimeDate: { fontSize: fontSize.xs, color: colors.textSecondary, width: 60 },
  evoBarContainer: { flex: 1, height: 12, backgroundColor: colors.border, borderRadius: 6, overflow: 'hidden' as const },
  evoBar: { height: '100%' as const, borderRadius: 6 },
  evoTimeScore: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, width: 30, textAlign: 'right' as const },

  evoAreaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  evoAreaText: { fontSize: fontSize.md, fontWeight: '600' },

  evoDetailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  evoDetailArea: { flex: 2, fontSize: fontSize.sm, color: colors.text },
  evoDetailDots: { flex: 3, flexDirection: 'row', gap: 6, alignItems: 'center' },
  evoDetailDot: { width: 10, height: 10, borderRadius: 5 },

  evoNoteCard: { marginBottom: spacing.sm },
  evoNoteDate: { fontSize: fontSize.sm, fontWeight: '700', color: colors.accent, marginBottom: spacing.xs },
  evoNoteText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 18, marginBottom: spacing.xs },
  evoNoteAi: { fontSize: fontSize.sm, color: colors.info, fontStyle: 'italic', marginBottom: spacing.xs },
  evoNoteRec: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs },

  bottomSpacer: { height: spacing.xxl * 2 },
});
