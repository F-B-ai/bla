import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { crossAlert } from '../../utils/alert';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { ModalHeader } from '../../components/common/ModalHeader';
import { Exercise, ExerciseCategory } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import {
  getCustomTemplates,
  createCustomTemplate,
  updateCustomTemplate,
  deleteCustomTemplate,
  CustomWorkoutTemplate,
} from '../../services/programService';
import { allTemplates, WorkoutTemplate } from '../../data/workoutTemplates';

const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

const CATEGORIES: { value: ExerciseCategory; label: string }[] = [
  { value: 'forza', label: 'Forza' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'mobilita', label: 'Mobilità' },
  { value: 'stretching', label: 'Stretching' },
  { value: 'funzionale', label: 'Funzionale' },
  { value: 'posturale', label: 'Posturale' },
  { value: 'altro', label: 'Altro' },
];

const TEMPLATE_CATEGORIES = [
  'Ipertrofia', 'Forza', 'Dimagrimento', 'Funzionale', 'Posturale',
  'Calisthenics', 'Tonificazione', 'Principiante', 'Sport', 'Altro',
];

type ViewMode = 'list' | 'detail';
type TabMode = 'custom' | 'builtin';

export const ManageTemplatesScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [customTemplates, setCustomTemplates] = useState<CustomWorkoutTemplate[]>([]);
  const [tabMode, setTabMode] = useState<TabMode>('custom');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // View detail state (for viewing built-in templates)
  const [viewingTemplate, setViewingTemplate] = useState<WorkoutTemplate | CustomWorkoutTemplate | null>(null);
  const [viewDay, setViewDay] = useState(0);

  // Edit/Create modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CustomWorkoutTemplate | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplDescription, setTplDescription] = useState('');
  const [tplGender, setTplGender] = useState<'male' | 'female'>('male');
  const [tplCategory, setTplCategory] = useState('Altro');
  const [tplExercises, setTplExercises] = useState<Record<number, Omit<Exercise, 'id'>[]>>({});
  const [tplSelectedDay, setTplSelectedDay] = useState(0);
  const [saving, setSaving] = useState(false);

  // Exercise form
  const [showExForm, setShowExForm] = useState(false);
  const [editingExIndex, setEditingExIndex] = useState<number | null>(null);
  const [exName, setExName] = useState('');
  const [exDescription, setExDescription] = useState('');
  const [exSets, setExSets] = useState('');
  const [exReps, setExReps] = useState('');
  const [exRest, setExRest] = useState('');
  const [exCategory, setExCategory] = useState<ExerciseCategory>('forza');
  const [exNotes, setExNotes] = useState('');

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const templates = await getCustomTemplates();
      setCustomTemplates(templates);
    } catch {
      crossAlert('Errore', 'Impossibile caricare i template');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const resetExForm = () => {
    setExName('');
    setExDescription('');
    setExSets('');
    setExReps('');
    setExRest('');
    setExCategory('forza');
    setExNotes('');
    setEditingExIndex(null);
  };

  const resetEditForm = () => {
    setTplName('');
    setTplDescription('');
    setTplGender('male');
    setTplCategory('Altro');
    setTplExercises({});
    setTplSelectedDay(0);
    setEditingTemplate(null);
  };

  const openCreateModal = () => {
    resetEditForm();
    setShowEditModal(true);
  };

  const openEditModal = (template: CustomWorkoutTemplate) => {
    setEditingTemplate(template);
    setTplName(template.name);
    setTplDescription(template.description);
    setTplGender(template.gender);
    setTplCategory(template.category);
    const exMap: Record<number, Omit<Exercise, 'id'>[]> = {};
    for (const day of template.weeklySchedule) {
      exMap[day.dayOfWeek] = [...day.exercises];
    }
    setTplExercises(exMap);
    setTplSelectedDay(0);
    setShowEditModal(true);
  };

  const duplicateBuiltinTemplate = (template: WorkoutTemplate) => {
    resetEditForm();
    setTplName(`${template.name} (copia)`);
    setTplDescription(template.description);
    setTplGender(template.gender);
    setTplCategory(template.category);
    const exMap: Record<number, Omit<Exercise, 'id'>[]> = {};
    for (const day of template.weeklySchedule) {
      exMap[day.dayOfWeek] = [...day.exercises];
    }
    setTplExercises(exMap);
    setTplSelectedDay(0);
    setShowEditModal(true);
  };

  const openExForm = (index?: number) => {
    if (index !== undefined) {
      const ex = tplExercises[tplSelectedDay]?.[index];
      if (ex) {
        setExName(ex.name);
        setExDescription(ex.description || '');
        setExSets(String(ex.sets));
        setExReps(ex.reps);
        setExRest(String(ex.restSeconds));
        setExCategory(ex.category);
        setExNotes(ex.notes || '');
        setEditingExIndex(index);
      }
    } else {
      resetExForm();
    }
    setShowExForm(true);
  };

  const saveExercise = () => {
    if (!exName || !exSets || !exReps) {
      crossAlert('Errore', 'Compila nome, serie e ripetizioni');
      return;
    }

    const newEx: Omit<Exercise, 'id'> = {
      name: exName,
      description: exDescription,
      sets: parseInt(exSets, 10),
      reps: exReps,
      restSeconds: parseInt(exRest, 10) || 60,
      notes: exNotes,
      category: exCategory,
    };

    setTplExercises((prev) => {
      const dayExs = [...(prev[tplSelectedDay] || [])];
      if (editingExIndex !== null) {
        dayExs[editingExIndex] = newEx;
      } else {
        dayExs.push(newEx);
      }
      return { ...prev, [tplSelectedDay]: dayExs };
    });

    resetExForm();
    setShowExForm(false);
  };

  const removeExercise = (dayIndex: number, exIndex: number) => {
    setTplExercises((prev) => ({
      ...prev,
      [dayIndex]: prev[dayIndex]?.filter((_, i) => i !== exIndex) || [],
    }));
  };

  const moveExercise = (dayIndex: number, exIndex: number, direction: 'up' | 'down') => {
    setTplExercises((prev) => {
      const dayExs = [...(prev[dayIndex] || [])];
      const targetIndex = direction === 'up' ? exIndex - 1 : exIndex + 1;
      if (targetIndex < 0 || targetIndex >= dayExs.length) return prev;
      [dayExs[exIndex], dayExs[targetIndex]] = [dayExs[targetIndex], dayExs[exIndex]];
      return { ...prev, [dayIndex]: dayExs };
    });
  };

  const saveTemplate = async () => {
    if (!tplName.trim()) {
      crossAlert('Errore', 'Inserisci un nome per il template');
      return;
    }
    if (!user) return;

    const totalExercises = Object.values(tplExercises).reduce((sum, exs) => sum + exs.length, 0);
    if (totalExercises === 0) {
      crossAlert('Errore', 'Aggiungi almeno un esercizio');
      return;
    }

    setSaving(true);
    try {
      const weeklySchedule = Object.entries(tplExercises)
        .filter(([, exs]) => exs.length > 0)
        .map(([dayIdx, exs]) => ({
          dayOfWeek: parseInt(dayIdx, 10),
          dayName: DAYS[parseInt(dayIdx, 10)],
          exercises: exs,
          notes: '',
        }));

      if (editingTemplate) {
        await updateCustomTemplate(editingTemplate.id, {
          name: tplName,
          description: tplDescription,
          gender: tplGender,
          category: tplCategory,
          weeklySchedule,
        });
        crossAlert('Successo', 'Template aggiornato!');
      } else {
        await createCustomTemplate({
          name: tplName,
          description: tplDescription,
          gender: tplGender,
          category: tplCategory,
          weeklySchedule,
          createdBy: user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        crossAlert('Successo', 'Template creato!');
      }

      setShowEditModal(false);
      resetEditForm();
      loadTemplates();
    } catch {
      crossAlert('Errore', 'Impossibile salvare il template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (template: CustomWorkoutTemplate) => {
    crossAlert(
      'Elimina Template',
      `Sei sicuro di voler eliminare "${template.name}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCustomTemplate(template.id);
              crossAlert('Eliminato', 'Template eliminato');
              loadTemplates();
            } catch {
              crossAlert('Errore', 'Impossibile eliminare');
            }
          },
        },
      ]
    );
  };

  const viewTemplateDetail = (template: WorkoutTemplate | CustomWorkoutTemplate) => {
    setViewingTemplate(template);
    setViewDay(0);
    setViewMode('detail');
  };

  const getViewSchedule = () => {
    if (!viewingTemplate) return [];
    return viewingTemplate.weeklySchedule;
  };

  const getViewDayExercises = (): Omit<Exercise, 'id'>[] => {
    const schedule = getViewSchedule();
    const day = schedule.find((d) => d.dayOfWeek === viewDay);
    return day?.exercises || [];
  };

  const isCustomTemplate = (t: any): t is CustomWorkoutTemplate => 'createdBy' in t;

  // --- Render ---

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Caricamento template...</Text>
      </View>
    );
  }

  if (viewMode === 'detail' && viewingTemplate) {
    const dayExercises = getViewDayExercises();
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{viewingTemplate.name}</Text>
          <Text style={styles.subtitle}>{viewingTemplate.description}</Text>
        </View>
        <View style={styles.content}>
          <View style={styles.detailMeta}>
            <View style={[styles.genderBadge, { backgroundColor: viewingTemplate.gender === 'male' ? '#4A90D9' : '#D94A8C' }]}>
              <Text style={styles.genderBadgeText}>{viewingTemplate.gender === 'male' ? 'Uomo' : 'Donna'}</Text>
            </View>
            <Text style={styles.detailCategory}>{viewingTemplate.category}</Text>
            <Text style={styles.detailDays}>{viewingTemplate.weeklySchedule.length} giorni</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
            {DAYS.map((day, index) => {
              const hasExercises = viewingTemplate.weeklySchedule.some((d) => d.dayOfWeek === index && d.exercises.length > 0);
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayButton, viewDay === index && styles.dayButtonActive, !hasExercises && styles.dayButtonEmpty]}
                  onPress={() => setViewDay(index)}
                >
                  <Text style={[styles.dayText, viewDay === index && styles.dayTextActive]}>
                    {day.substring(0, 3)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.sectionTitle}>{DAYS[viewDay]}</Text>

          {dayExercises.length === 0 ? (
            <Card><Text style={styles.emptyText}>Riposo</Text></Card>
          ) : (
            dayExercises.map((ex, i) => (
              <Card key={i} variant="outlined">
                <View style={styles.exerciseRow}>
                  <View style={styles.exerciseNumber}>
                    <Text style={styles.exerciseNumberText}>{i + 1}</Text>
                  </View>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{ex.name}</Text>
                    <Text style={styles.exerciseDetails}>
                      {ex.sets}x{ex.reps} | Rec: {ex.restSeconds}s
                    </Text>
                    {ex.description ? <Text style={styles.exerciseDesc}>{ex.description}</Text> : null}
                    {ex.notes ? <Text style={styles.exerciseNotes}>Note: {ex.notes}</Text> : null}
                  </View>
                </View>
              </Card>
            ))
          )}

          <View style={styles.detailActions}>
            <Button
              title="Torna alla lista"
              onPress={() => { setViewMode('list'); setViewingTemplate(null); }}
              variant="outline"
              style={styles.detailBtn}
            />
            {isCustomTemplate(viewingTemplate) ? (
              <>
                <Button
                  title="Modifica"
                  onPress={() => { setViewMode('list'); openEditModal(viewingTemplate as CustomWorkoutTemplate); }}
                  style={styles.detailBtn}
                />
                <Button
                  title="Elimina"
                  onPress={() => handleDelete(viewingTemplate as CustomWorkoutTemplate)}
                  variant="outline"
                  style={[styles.detailBtn, { borderColor: colors.error }]}
                />
              </>
            ) : (
              <Button
                title="Duplica e Modifica"
                onPress={() => { setViewMode('list'); duplicateBuiltinTemplate(viewingTemplate as WorkoutTemplate); }}
                style={styles.detailBtn}
              />
            )}
          </View>
        </View>
        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestione Template</Text>
        <Text style={styles.subtitle}>Crea, modifica ed elimina i template di allenamento</Text>
      </View>

      <View style={styles.content}>
        {/* Tab switch */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tabMode === 'custom' && styles.tabBtnActive]}
            onPress={() => setTabMode('custom')}
          >
            <Text style={[styles.tabText, tabMode === 'custom' && styles.tabTextActive]}>
              Personalizzati ({customTemplates.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tabMode === 'builtin' && styles.tabBtnActive]}
            onPress={() => setTabMode('builtin')}
          >
            <Text style={[styles.tabText, tabMode === 'builtin' && styles.tabTextActive]}>
              Predefiniti ({allTemplates.length})
            </Text>
          </TouchableOpacity>
        </View>

        {tabMode === 'custom' ? (
          <>
            <Button
              title="+ Nuovo Template"
              onPress={openCreateModal}
              style={{ marginBottom: spacing.md }}
            />

            {customTemplates.length === 0 ? (
              <Card>
                <Text style={styles.emptyText}>
                  Nessun template personalizzato.{'\n'}Creane uno nuovo o duplica un template predefinito!
                </Text>
              </Card>
            ) : (
              customTemplates.map((tpl) => (
                <TouchableOpacity key={tpl.id} onPress={() => viewTemplateDetail(tpl)}>
                  <Card variant="outlined">
                    <View style={styles.templateRow}>
                      <View style={[styles.templateGenderBadge, { backgroundColor: tpl.gender === 'male' ? '#4A90D9' : '#D94A8C' }]}>
                        <Text style={styles.templateGenderText}>{tpl.gender === 'male' ? 'M' : 'F'}</Text>
                      </View>
                      <View style={styles.templateInfo}>
                        <Text style={styles.templateName}>{tpl.name}</Text>
                        <Text style={styles.templateCategory}>{tpl.category}</Text>
                        <Text style={styles.templateDesc} numberOfLines={2}>{tpl.description}</Text>
                        <Text style={styles.templateDays}>{tpl.weeklySchedule.length} giorni/settimana</Text>
                      </View>
                      <View style={styles.templateActions}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => openEditModal(tpl)}>
                          <Text style={styles.iconBtnText}>✎</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.iconBtn, styles.iconBtnDanger]} onPress={() => handleDelete(tpl)}>
                          <Text style={[styles.iconBtnText, { color: colors.error }]}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))
            )}
          </>
        ) : (
          <>
            <Text style={styles.builtinHint}>
              I template predefiniti non sono modificabili, ma puoi duplicarli per creare versioni personalizzate.
            </Text>
            {allTemplates.map((tpl) => (
              <TouchableOpacity key={tpl.id} onPress={() => viewTemplateDetail(tpl)}>
                <Card variant="outlined">
                  <View style={styles.templateRow}>
                    <View style={[styles.templateGenderBadge, { backgroundColor: tpl.gender === 'male' ? '#4A90D9' : '#D94A8C' }]}>
                      <Text style={styles.templateGenderText}>{tpl.gender === 'male' ? 'M' : 'F'}</Text>
                    </View>
                    <View style={styles.templateInfo}>
                      <Text style={styles.templateName}>{tpl.name}</Text>
                      <Text style={styles.templateCategory}>{tpl.category}</Text>
                      <Text style={styles.templateDesc} numberOfLines={2}>{tpl.description}</Text>
                      <Text style={styles.templateDays}>{tpl.weeklySchedule.length} giorni/settimana</Text>
                    </View>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => duplicateBuiltinTemplate(tpl)}>
                      <Text style={styles.iconBtnText}>⧉</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}
      </View>

      {/* Modal Crea/Modifica Template */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <ModalHeader
              title={editingTemplate ? 'Modifica Template' : 'Nuovo Template'}
              onClose={() => { setShowEditModal(false); resetEditForm(); }}
            />

            <InputField
              label="Nome Template"
              value={tplName}
              onChangeText={setTplName}
              placeholder="Es: Ipertrofia Upper/Lower"
            />

            <InputField
              label="Descrizione"
              value={tplDescription}
              onChangeText={setTplDescription}
              placeholder="Descrizione del programma..."
              multiline
              numberOfLines={3}
            />

            {/* Gender */}
            <Text style={styles.fieldLabel}>Genere</Text>
            <View style={styles.genderRow}>
              <TouchableOpacity
                style={[styles.genderBtn, tplGender === 'male' && styles.genderBtnMaleActive]}
                onPress={() => setTplGender('male')}
              >
                <Text style={[styles.genderBtnText, tplGender === 'male' && styles.genderBtnTextActive]}>Uomo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderBtn, tplGender === 'female' && styles.genderBtnFemaleActive]}
                onPress={() => setTplGender('female')}
              >
                <Text style={[styles.genderBtnText, tplGender === 'female' && styles.genderBtnTextActive]}>Donna</Text>
              </TouchableOpacity>
            </View>

            {/* Category */}
            <Text style={styles.fieldLabel}>Categoria</Text>
            <View style={styles.categoryRow}>
              {TEMPLATE_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, tplCategory === cat && styles.categoryChipActive]}
                  onPress={() => setTplCategory(cat)}
                >
                  <Text style={[styles.categoryChipText, tplCategory === cat && styles.categoryChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Day selector */}
            <Text style={styles.fieldLabel}>Esercizi per Giorno</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
              {DAYS.map((day, index) => {
                const count = tplExercises[index]?.length || 0;
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayButton, tplSelectedDay === index && styles.dayButtonActive]}
                    onPress={() => setTplSelectedDay(index)}
                  >
                    <Text style={[styles.dayText, tplSelectedDay === index && styles.dayTextActive]}>
                      {day.substring(0, 3)}
                    </Text>
                    {count > 0 && (
                      <View style={styles.dayBadge}>
                        <Text style={styles.dayBadgeText}>{count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Exercises for selected day */}
            <View style={styles.exerciseHeader}>
              <Text style={styles.sectionTitle}>{DAYS[tplSelectedDay]}</Text>
              <Button title="+ Esercizio" onPress={() => openExForm()} variant="primary" />
            </View>

            {(!tplExercises[tplSelectedDay] || tplExercises[tplSelectedDay].length === 0) ? (
              <Card>
                <Text style={styles.emptyText}>Nessun esercizio per questo giorno</Text>
              </Card>
            ) : (
              tplExercises[tplSelectedDay].map((ex, i) => (
                <Card key={`${tplSelectedDay}-${i}`} variant="outlined">
                  <View style={styles.exerciseRow}>
                    <View style={styles.exerciseNumber}>
                      <Text style={styles.exerciseNumberText}>{i + 1}</Text>
                    </View>
                    <View style={styles.exerciseInfo}>
                      <Text style={styles.exerciseName}>{ex.name}</Text>
                      <Text style={styles.exerciseDetails}>
                        {ex.sets}x{ex.reps} | Rec: {ex.restSeconds}s
                      </Text>
                      {ex.description ? <Text style={styles.exerciseDesc}>{ex.description}</Text> : null}
                    </View>
                    <View style={styles.exActions}>
                      <TouchableOpacity onPress={() => moveExercise(tplSelectedDay, i, 'up')} style={styles.moveBtn}>
                        <Text style={styles.moveBtnText}>▲</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => moveExercise(tplSelectedDay, i, 'down')} style={styles.moveBtn}>
                        <Text style={styles.moveBtnText}>▼</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => openExForm(i)} style={styles.moveBtn}>
                        <Text style={[styles.moveBtnText, { color: colors.accent }]}>✎</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeExercise(tplSelectedDay, i)} style={styles.moveBtn}>
                        <Text style={[styles.moveBtnText, { color: colors.error }]}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              ))
            )}

            <View style={styles.modalButtons}>
              <Button
                title="Annulla"
                onPress={() => { setShowEditModal(false); resetEditForm(); }}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title={saving ? 'Salvataggio...' : (editingTemplate ? 'Aggiorna' : 'Crea Template')}
                onPress={saveTemplate}
                loading={saving}
                style={styles.modalButton}
              />
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </Modal>

      {/* Modal Aggiungi/Modifica Esercizio */}
      <Modal visible={showExForm} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <ModalHeader
              title={editingExIndex !== null ? 'Modifica Esercizio' : 'Nuovo Esercizio'}
              onClose={() => { setShowExForm(false); resetExForm(); }}
            />

            <InputField
              label="Nome esercizio"
              value={exName}
              onChangeText={setExName}
              placeholder="Es: Panca piana con bilanciere"
            />

            <InputField
              label="Descrizione"
              value={exDescription}
              onChangeText={setExDescription}
              placeholder="Come eseguire l'esercizio..."
              multiline
              numberOfLines={3}
            />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <InputField label="Serie" value={exSets} onChangeText={setExSets} keyboardType="number-pad" placeholder="4" />
              </View>
              <View style={styles.halfField}>
                <InputField label="Ripetizioni" value={exReps} onChangeText={setExReps} placeholder="8-12" />
              </View>
            </View>

            <InputField
              label="Recupero (secondi)"
              value={exRest}
              onChangeText={setExRest}
              keyboardType="number-pad"
              placeholder="90"
            />

            <Text style={styles.fieldLabel}>Categoria</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[styles.categoryChip, exCategory === cat.value && styles.categoryChipActive]}
                  onPress={() => setExCategory(cat.value)}
                >
                  <Text style={[styles.categoryChipText, exCategory === cat.value && styles.categoryChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <InputField
              label="Note (opzionale)"
              value={exNotes}
              onChangeText={setExNotes}
              placeholder="Note aggiuntive..."
              multiline
            />

            <View style={styles.modalButtons}>
              <Button
                title="Annulla"
                onPress={() => { setShowExForm(false); resetExForm(); }}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title={editingExIndex !== null ? 'Aggiorna' : 'Aggiungi'}
                onPress={saveExercise}
                style={styles.modalButton}
              />
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </Modal>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { color: colors.textSecondary, marginTop: spacing.md, fontSize: fontSize.md },
  header: { backgroundColor: colors.primary, padding: spacing.lg, paddingTop: spacing.xxl },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textOnPrimary },
  subtitle: { fontSize: fontSize.md, color: colors.textLight, marginTop: spacing.xs },
  content: { padding: spacing.md },

  // Tabs
  tabRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  tabBtn: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: colors.textOnAccent },

  // Template list
  templateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  templateGenderBadge: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  templateGenderText: { color: '#FFF', fontWeight: '700', fontSize: fontSize.md },
  templateInfo: { flex: 1 },
  templateName: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  templateCategory: { fontSize: fontSize.xs, color: colors.accent, fontWeight: '600', marginTop: 2 },
  templateDesc: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  templateDays: { fontSize: fontSize.xs, color: colors.textLight, marginTop: 4 },
  templateActions: { gap: spacing.xs },
  iconBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceLight,
    justifyContent: 'center', alignItems: 'center',
  },
  iconBtnDanger: { backgroundColor: colors.error + '20' },
  iconBtnText: { fontSize: fontSize.lg, color: colors.accent, fontWeight: '700' },

  builtinHint: {
    fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.md,
    fontStyle: 'italic', lineHeight: 18,
  },

  // Detail view
  detailMeta: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, alignItems: 'center' },
  genderBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.round },
  genderBadgeText: { color: '#FFF', fontWeight: '700', fontSize: fontSize.sm },
  detailCategory: { fontSize: fontSize.md, color: colors.accent, fontWeight: '600' },
  detailDays: { fontSize: fontSize.sm, color: colors.textSecondary },
  detailActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, flexWrap: 'wrap' },
  detailBtn: { flex: 1, minWidth: 100 },

  // Day selector
  dayScroll: { marginBottom: spacing.md },
  dayButton: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.round,
    backgroundColor: colors.surface, marginRight: spacing.sm, ...shadows.small, alignItems: 'center',
  },
  dayButtonActive: { backgroundColor: colors.accent },
  dayButtonEmpty: { opacity: 0.5 },
  dayText: { fontSize: fontSize.md, fontWeight: '600', color: colors.textSecondary },
  dayTextActive: { color: colors.textOnAccent },
  dayBadge: {
    backgroundColor: colors.success, borderRadius: 10, width: 20, height: 20,
    justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },
  dayBadgeText: { color: '#FFF', fontSize: fontSize.xs, fontWeight: '700' },

  // Exercise list
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  exerciseHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm,
  },
  exerciseRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  exerciseNumber: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  exerciseNumberText: { color: '#FFF', fontWeight: '700', fontSize: fontSize.sm },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  exerciseDetails: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  exerciseDesc: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4 },
  exerciseNotes: { fontSize: fontSize.sm, color: colors.warning, marginTop: 4, fontStyle: 'italic' },
  exActions: { gap: 2 },
  moveBtn: { padding: 4 },
  moveBtnText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '700' },
  emptyText: { color: colors.textSecondary, textAlign: 'center', padding: spacing.lg, lineHeight: 22 },

  // Form styles
  fieldLabel: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  genderRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  genderBtn: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  genderBtnMaleActive: { backgroundColor: '#4A90D9', borderColor: '#4A90D9' },
  genderBtnFemaleActive: { backgroundColor: '#D94A8C', borderColor: '#D94A8C' },
  genderBtnText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '600' },
  genderBtnTextActive: { color: '#FFF' },
  categoryRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.md },
  categoryChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.round,
    borderWidth: 1, borderColor: colors.border,
  },
  categoryChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  categoryChipText: { fontSize: fontSize.sm, color: colors.textSecondary },
  categoryChipTextActive: { color: colors.textOnAccent },
  row: { flexDirection: 'row', gap: spacing.md },
  halfField: { flex: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl, padding: spacing.lg, maxHeight: '90%',
  },
  modalButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  modalButton: { flex: 1 },
  bottomSpacer: { height: spacing.xxl * 2 },
});
