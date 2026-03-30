import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { crossAlert } from '../../utils/alert';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { ModalHeader } from '../../components/common/ModalHeader';
import { NutritionTeamNote, NutritionNoteCategory } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import {
  addTeamNote,
  getTeamNotes,
  updateTeamNote,
  deleteTeamNote,
  togglePinNote,
  uploadTeamAttachment,
} from '../../services/nutritionTeamService';
import { getAllAppointments } from '../../services/nutritionistService';
import { NutritionistAppointment } from '../../types';

const CATEGORIES: { key: NutritionNoteCategory; label: string; icon: string; color: string }[] = [
  { key: 'protocollo', label: 'Protocollo', icon: 'clipboard-outline', color: colors.info },
  { key: 'linea_guida', label: 'Linea Guida', icon: 'book-outline', color: colors.success },
  { key: 'aggiornamento', label: 'Aggiornamento', icon: 'megaphone-outline', color: colors.warning },
  { key: 'caso_studio', label: 'Caso Studio', icon: 'school-outline', color: colors.accent },
  { key: 'altro', label: 'Altro', icon: 'ellipsis-horizontal-outline', color: colors.textSecondary },
];

type ActiveTab = 'bacheca' | 'agenda';

export const NutritionTeamScreen: React.FC = () => {
  const { user, isOwner } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('bacheca');
  const [notes, setNotes] = useState<NutritionTeamNote[]>([]);
  const [appointments, setAppointments] = useState<NutritionistAppointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [editingNote, setEditingNote] = useState<NutritionTeamNote | null>(null);
  const [filterCategory, setFilterCategory] = useState<NutritionNoteCategory | 'all'>('all');

  const [noteForm, setNoteForm] = useState({
    title: '',
    content: '',
    category: 'aggiornamento' as NutritionNoteCategory,
  });

  const [selectedFileUri, setSelectedFileUri] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [teamNotes, allAppts] = await Promise.all([
        getTeamNotes(),
        getAllAppointments(),
      ]);
      setNotes(teamNotes);
      // Mostra solo appuntamenti futuri
      const now = new Date();
      setAppointments(
        allAppts.filter((a) => {
          const d = new Date(a.date as unknown as string);
          return d >= now && a.status === 'scheduled';
        })
      );
    } catch (err) {
      console.error('Errore caricamento dati team nutrizionisti:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handlePickFile = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            const url = URL.createObjectURL(file);
            setSelectedFileUri(url);
            setSelectedFileName(file.name);
          }
        };
        input.click();
      } else {
        const DocumentPicker = require('expo-document-picker');
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*', 'application/msword'],
        });
        if (!result.canceled && result.assets?.[0]) {
          setSelectedFileUri(result.assets[0].uri);
          setSelectedFileName(result.assets[0].name || 'allegato');
        }
      }
    } catch {
      crossAlert('Errore', 'Impossibile selezionare il file');
    }
  };

  const resetForm = () => {
    setNoteForm({ title: '', content: '', category: 'aggiornamento' });
    setSelectedFileUri('');
    setSelectedFileName('');
    setEditingNote(null);
  };

  const handleSaveNote = async () => {
    if (!noteForm.title.trim() || !noteForm.content.trim()) {
      crossAlert('Errore', 'Inserisci titolo e contenuto');
      return;
    }
    if (!user) return;

    setSavingNote(true);
    try {
      let attachmentUrl: string | undefined;
      let attachmentName: string | undefined;
      if (selectedFileUri) {
        attachmentUrl = await uploadTeamAttachment(selectedFileUri, selectedFileName);
        attachmentName = selectedFileName;
      }

      if (editingNote) {
        await updateTeamNote(editingNote.id, {
          title: noteForm.title,
          content: noteForm.content,
          category: noteForm.category,
          ...(attachmentUrl ? { attachmentUrl, attachmentName } : {}),
        });
        crossAlert('Successo', 'Nota aggiornata!');
      } else {
        await addTeamNote({
          authorId: user.id,
          authorName: `${user.name} ${user.surname}`,
          title: noteForm.title,
          content: noteForm.content,
          category: noteForm.category,
          isPinned: false,
          attachmentUrl,
          attachmentName,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        crossAlert('Successo', 'Nota pubblicata per il team!');
      }

      setShowNoteModal(false);
      resetForm();
      loadData();
    } catch {
      crossAlert('Errore', 'Impossibile salvare la nota');
    } finally {
      setSavingNote(false);
    }
  };

  const handleEditNote = (note: NutritionTeamNote) => {
    setEditingNote(note);
    setNoteForm({
      title: note.title,
      content: note.content,
      category: note.category,
    });
    if (note.attachmentUrl) {
      setSelectedFileName(note.attachmentName || 'allegato');
    }
    setShowNoteModal(true);
  };

  const handleDeleteNote = (noteId: string) => {
    crossAlert('Conferma', 'Eliminare questa nota?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTeamNote(noteId);
            loadData();
          } catch {
            crossAlert('Errore', 'Impossibile eliminare');
          }
        },
      },
    ]);
  };

  const handleTogglePin = async (note: NutritionTeamNote) => {
    try {
      await togglePinNote(note.id, note.isPinned);
      loadData();
    } catch {
      crossAlert('Errore', 'Impossibile aggiornare');
    }
  };

  const handleOpenAttachment = (url: string) => {
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  const getCategoryInfo = (key: NutritionNoteCategory) =>
    CATEGORIES.find((c) => c.key === key) || CATEGORIES[4];

  const filteredNotes = filterCategory === 'all'
    ? notes
    : notes.filter((n) => n.category === filterCategory);

  const tabs: { key: ActiveTab; label: string; icon: string }[] = [
    { key: 'bacheca', label: 'Bacheca', icon: 'clipboard-outline' },
    { key: 'agenda', label: 'Agenda Visite', icon: 'calendar-outline' },
  ];

  const renderBacheca = () => (
    <>
      <View style={styles.addButtonContainer}>
        <Button
          title="+ Nuova Nota"
          onPress={() => {
            resetForm();
            setShowNoteModal(true);
          }}
        />
      </View>

      {/* Filtro categorie */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, filterCategory === 'all' && styles.chipActive]}
            onPress={() => setFilterCategory('all')}
          >
            <Text style={[styles.chipText, filterCategory === 'all' && styles.chipTextActive]}>
              Tutte
            </Text>
          </TouchableOpacity>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.chip, filterCategory === cat.key && styles.chipActive]}
              onPress={() => setFilterCategory(cat.key)}
            >
              <Ionicons
                name={cat.icon as any}
                size={14}
                color={filterCategory === cat.key ? colors.textOnAccent : cat.color}
              />
              <Text style={[styles.chipText, filterCategory === cat.key && styles.chipTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {filteredNotes.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>
            Nessuna nota pubblicata. Condividi protocolli, linee guida o aggiornamenti con il team!
          </Text>
        </Card>
      ) : (
        filteredNotes.map((note) => {
          const cat = getCategoryInfo(note.category);
          const createdAt = new Date(note.createdAt as unknown as string);
          const isAuthor = note.authorId === user?.id;

          return (
            <Card key={note.id} variant="elevated">
              {/* Header nota */}
              <View style={styles.noteHeader}>
                <View style={styles.noteHeaderLeft}>
                  {note.isPinned && (
                    <Ionicons name="pin" size={14} color={colors.accent} style={styles.pinIcon} />
                  )}
                  <View style={[styles.categoryBadge, { backgroundColor: cat.color + '20' }]}>
                    <Ionicons name={cat.icon as any} size={12} color={cat.color} />
                    <Text style={[styles.categoryText, { color: cat.color }]}>{cat.label}</Text>
                  </View>
                </View>
                {(isAuthor || isOwner) && (
                  <View style={styles.noteActions}>
                    <TouchableOpacity onPress={() => handleTogglePin(note)} style={styles.noteActionBtn}>
                      <Ionicons
                        name={note.isPinned ? 'pin' : 'pin-outline'}
                        size={16}
                        color={note.isPinned ? colors.accent : colors.textLight}
                      />
                    </TouchableOpacity>
                    {isAuthor && (
                      <TouchableOpacity onPress={() => handleEditNote(note)} style={styles.noteActionBtn}>
                        <Ionicons name="create-outline" size={16} color={colors.info} />
                      </TouchableOpacity>
                    )}
                    {(isAuthor || isOwner) && (
                      <TouchableOpacity onPress={() => handleDeleteNote(note.id)} style={styles.noteActionBtn}>
                        <Ionicons name="trash-outline" size={16} color={colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {/* Titolo e contenuto */}
              <Text style={styles.noteTitle}>{note.title}</Text>
              <Text style={styles.noteContent}>{note.content}</Text>

              {/* Allegato */}
              {note.attachmentUrl && (
                <TouchableOpacity
                  style={styles.attachmentRow}
                  onPress={() => handleOpenAttachment(note.attachmentUrl!)}
                >
                  <Ionicons name="attach" size={16} color={colors.info} />
                  <Text style={styles.attachmentText}>{note.attachmentName || 'Allegato'}</Text>
                  <Ionicons name="open-outline" size={14} color={colors.info} />
                </TouchableOpacity>
              )}

              {/* Footer */}
              <View style={styles.noteFooter}>
                <Text style={styles.noteAuthor}>{note.authorName}</Text>
                <Text style={styles.noteDate}>
                  {createdAt.toLocaleDateString('it-IT', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </Card>
          );
        })
      )}
    </>
  );

  const renderAgenda = () => (
    <>
      <View style={styles.agendaInfo}>
        <Ionicons name="information-circle-outline" size={16} color={colors.info} />
        <Text style={styles.agendaInfoText}>
          Panoramica di tutte le visite nutrizionali programmate per il team.
        </Text>
      </View>

      {appointments.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>Nessuna visita programmata.</Text>
        </Card>
      ) : (
        appointments.map((appt) => {
          const apptDate = new Date(appt.date as unknown as string);
          return (
            <Card key={appt.id} variant="elevated">
              <View style={styles.agendaRow}>
                <View style={styles.agendaDateBox}>
                  <Text style={styles.agendaDay}>
                    {apptDate.toLocaleDateString('it-IT', { day: 'numeric' })}
                  </Text>
                  <Text style={styles.agendaMonth}>
                    {apptDate.toLocaleDateString('it-IT', { month: 'short' })}
                  </Text>
                </View>
                <View style={styles.agendaDetails}>
                  <Text style={styles.agendaTime}>
                    {appt.startTime} - {appt.endTime}
                  </Text>
                  <Text style={styles.agendaWeekday}>
                    {apptDate.toLocaleDateString('it-IT', { weekday: 'long' })}
                  </Text>
                  {appt.notes ? (
                    <Text style={styles.agendaNotes} numberOfLines={2}>{appt.notes}</Text>
                  ) : null}
                </View>
              </View>
            </Card>
          );
        })
      )}
    </>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Team Nutrizionisti</Text>
        <Text style={styles.subtitle}>
          Bacheca condivisa e agenda visite del team
        </Text>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.key ? colors.accent : colors.textLight}
            />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Contenuto */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'bacheca' ? renderBacheca() : renderAgenda()}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Modale Nuova/Modifica Nota */}
      <Modal visible={showNoteModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <ModalHeader
              title={editingNote ? 'Modifica Nota' : 'Nuova Nota per il Team'}
              onClose={() => {
                setShowNoteModal(false);
                resetForm();
              }}
            />

            <InputField
              label="Titolo"
              value={noteForm.title}
              onChangeText={(v) => setNoteForm({ ...noteForm, title: v })}
              placeholder="Es: Protocollo integrazione vitamina D"
            />

            <Text style={styles.fieldLabel}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[styles.chip, noteForm.category === cat.key && styles.chipActive]}
                    onPress={() => setNoteForm({ ...noteForm, category: cat.key })}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={14}
                      color={noteForm.category === cat.key ? colors.textOnAccent : cat.color}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        noteForm.category === cat.key && styles.chipTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <InputField
              label="Contenuto"
              value={noteForm.content}
              onChangeText={(v) => setNoteForm({ ...noteForm, content: v })}
              placeholder="Scrivi il contenuto della nota..."
              multiline
              numberOfLines={8}
            />

            {/* Allegato */}
            <Text style={styles.fieldLabel}>Allegato (opzionale)</Text>
            <TouchableOpacity style={styles.filePicker} onPress={handlePickFile}>
              <Ionicons
                name={selectedFileUri ? 'document-text' : 'cloud-upload-outline'}
                size={28}
                color={selectedFileUri ? colors.accent : colors.textLight}
              />
              <Text style={[styles.filePickerText, selectedFileUri && { color: colors.text }]}>
                {selectedFileName || 'Tocca per allegare un file'}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <Button
                title="Annulla"
                onPress={() => {
                  setShowNoteModal(false);
                  resetForm();
                }}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title={savingNote ? 'Salvataggio...' : editingNote ? 'Aggiorna' : 'Pubblica'}
                onPress={handleSaveNote}
                style={styles.modalButton}
                loading={savingNote}
              />
            </View>
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.accent + '20',
    borderColor: colors.accent,
  },
  tabLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textLight,
  },
  tabLabelActive: {
    color: colors.accent,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  addButtonContainer: {
    marginBottom: spacing.md,
  },
  filterScroll: {
    marginBottom: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.textOnAccent,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.lg,
    lineHeight: 22,
  },

  // Note
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  noteHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pinIcon: {
    marginRight: 2,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
  },
  categoryText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  noteActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  noteActionBtn: {
    padding: 4,
  },
  noteTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  noteContent: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.info + '10',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  attachmentText: {
    fontSize: fontSize.sm,
    color: colors.info,
    fontWeight: '600',
    flex: 1,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  noteAuthor: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  noteDate: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },

  // Agenda
  agendaInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.info + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  agendaInfoText: {
    fontSize: fontSize.sm,
    color: colors.info,
    flex: 1,
    lineHeight: 18,
  },
  agendaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  agendaDateBox: {
    backgroundColor: colors.accent + '15',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minWidth: 56,
  },
  agendaDay: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.accent,
  },
  agendaMonth: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.accent,
    textTransform: 'uppercase',
  },
  agendaDetails: {
    flex: 1,
  },
  agendaTime: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  agendaWeekday: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  agendaNotes: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    fontStyle: 'italic',
    marginTop: 4,
  },

  // Modal
  fieldLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  filePicker: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  filePickerText: {
    fontSize: fontSize.md,
    color: colors.textLight,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
  },
  bottomSpacer: {
    height: spacing.xxl * 2,
  },
});
