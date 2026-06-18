import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { crossAlert } from '../../utils/alert';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { ModalHeader } from '../../components/common/ModalHeader';
import { StudentSearchPicker } from '../../components/common/StudentSearchPicker';
import { SpecialContent, ContentType, Student } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { addContent, getAllContent, deleteContent, uploadContentFile } from '../../services/contentService';
import { getStudents } from '../../services/authService';
import { createBulkNotifications } from '../../services/notificationService';
import { Ionicons } from '@expo/vector-icons';

const CONTENT_TYPES: { value: ContentType; label: string; color: string; icon: string }[] = [
  { value: 'video', label: 'Video', color: '#F44336', icon: 'videocam' },
  { value: 'audio', label: 'Audio', color: '#FF9800', icon: 'musical-notes' },
  { value: 'pdf', label: 'PDF', color: '#4CAF50', icon: 'document-text' },
  { value: 'podcast', label: 'Podcast', color: '#9C27B0', icon: 'mic' },
  { value: 'article', label: 'Articolo', color: '#2196F3', icon: 'newspaper' },
  { value: 'resource', label: 'Risorsa', color: '#607D8B', icon: 'link' },
];

type InputMode = 'url' | 'file';

const FILE_TYPES_MAP: Record<string, string[]> = {
  video: ['video/mp4', 'video/quicktime', 'video/x-m4v', 'video/*'],
  audio: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/*'],
  pdf: ['application/pdf'],
};

const canUploadFile = (type: ContentType): boolean =>
  type === 'video' || type === 'audio' || type === 'pdf';

export const ContentManagementScreen: React.FC = () => {
  const { user } = useAuth();
  const [contents, setContents] = useState<SpecialContent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [contentType, setContentType] = useState<ContentType>('video');
  const [tags, setTags] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [allContent, allStudents] = await Promise.all([
        getAllContent(),
        getStudents(),
      ]);
      setContents(allContent);
      setStudents(allStudents);
    } catch {
      // Silently handle
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

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handlePickFile = async () => {
    try {
      const mimeTypes = FILE_TYPES_MAP[contentType] || ['*/*'];
      const result = await DocumentPicker.getDocumentAsync({
        type: mimeTypes,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType || 'application/octet-stream',
        });
        if (!title) {
          const nameWithoutExt = asset.name.replace(/\.[^/.]+$/, '');
          setTitle(nameWithoutExt);
        }
      }
    } catch {
      crossAlert('Errore', 'Impossibile selezionare il file');
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (inputMode === 'url' && !url) {
      crossAlert('Errore', 'Inserisci un URL');
      return;
    }
    if (inputMode === 'file' && !selectedFile) {
      crossAlert('Errore', 'Seleziona un file');
      return;
    }
    if (!title) {
      crossAlert('Errore', 'Inserisci un titolo');
      return;
    }

    setSaving(true);
    try {
      let finalUrl = url;

      if (inputMode === 'file' && selectedFile) {
        setUploadProgress('Caricamento file...');
        finalUrl = await uploadContentFile(
          selectedFile.uri,
          selectedFile.name,
          selectedFile.mimeType
        );
        setUploadProgress('');
      }

      await addContent({
        title,
        description,
        type: contentType,
        url: finalUrl,
        createdBy: user.id,
        createdAt: new Date(),
        assignedTo: selectedStudentIds,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      });

      const notifTargets = selectedStudentIds.length > 0
        ? selectedStudentIds
        : students.map((s) => s.id);
      if (notifTargets.length > 0) {
        const typeLabel = CONTENT_TYPES.find((t) => t.value === contentType)?.label || contentType;
        createBulkNotifications(
          notifTargets.filter((id) => id !== user.id),
          'new_content',
          'Nuovo contenuto disponibile',
          `${title} — ${typeLabel}`
        ).catch(() => {});
      }

      crossAlert('Successo', 'Contenuto pubblicato!');
      resetForm();
      setShowModal(false);
      loadData();
    } catch {
      crossAlert('Errore', 'Impossibile salvare il contenuto');
    } finally {
      setSaving(false);
      setUploadProgress('');
    }
  };

  const handleDelete = (id: string) => {
    crossAlert(
      'Conferma',
      'Sei sicuro di voler eliminare questo contenuto?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteContent(id);
              await loadData();
            } catch {
              crossAlert('Errore', 'Impossibile eliminare');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setUrl('');
    setContentType('video');
    setTags('');
    setSelectedStudentIds([]);
    setSelectedFile(null);
    setInputMode('file');
    setUploadProgress('');
  };

  const getTypeInfo = (type: ContentType) =>
    CONTENT_TYPES.find((t) => t.value === type) || CONTENT_TYPES[5];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestione Contenuti</Text>
        <Text style={styles.subtitle}>
          {contents.length} contenuti pubblicati
        </Text>
      </View>

      <View style={styles.addButtonContainer}>
        <Button
          title="+ Nuovo Contenuto"
          onPress={() => setShowModal(true)}
        />
      </View>

      <FlatList
        data={contents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => {
          const typeInfo = getTypeInfo(item.type);
          return (
            <Card variant="elevated">
              <View style={styles.contentRow}>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: typeInfo.color + '20' },
                  ]}
                >
                  <Ionicons name={typeInfo.icon as any} size={18} color={typeInfo.color} />
                  <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>
                    {typeInfo.label}
                  </Text>
                </View>
                <View style={styles.contentInfo}>
                  <Text style={styles.contentTitle}>{item.title}</Text>
                  {item.description ? (
                    <Text style={styles.contentDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                  <Text style={styles.contentMeta}>
                    {item.assignedTo.length === 0
                      ? 'Tutti gli allievi'
                      : `${item.assignedTo.length} allievi`}
                    {item.tags.length > 0 && ` · ${item.tags.join(', ')}`}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item.id)}
                >
                  <Text style={styles.deleteBtnText}>X</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          <Card>
            <Text style={styles.emptyText}>
              Nessun contenuto pubblicato.{'\n'}Aggiungi video, audio, PDF, podcast e articoli per i tuoi allievi.
            </Text>
          </Card>
        }
      />

      {/* Modale nuovo contenuto */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <ModalHeader title="Nuovo Contenuto" onClose={() => { setShowModal(false); resetForm(); }} />

            {/* Tipo */}
            <Text style={styles.fieldLabel}>Tipo</Text>
            <View style={styles.typeRow}>
              {CONTENT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[
                    styles.typeChip,
                    contentType === t.value && { backgroundColor: t.color + '20', borderColor: t.color },
                  ]}
                  onPress={() => {
                    setContentType(t.value);
                    setSelectedFile(null);
                    setUrl('');
                    if (canUploadFile(t.value)) {
                      setInputMode('file');
                    } else {
                      setInputMode('url');
                    }
                  }}
                >
                  <Ionicons
                    name={t.icon as any}
                    size={14}
                    color={contentType === t.value ? t.color : colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.typeChipText,
                      contentType === t.value && { color: t.color },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <InputField
              label="Titolo"
              value={title}
              onChangeText={setTitle}
              placeholder="Es: Tecnica di respirazione diaframmatica"
            />

            <InputField
              label="Descrizione"
              value={description}
              onChangeText={setDescription}
              placeholder="Breve descrizione del contenuto..."
              multiline
              numberOfLines={3}
            />

            {/* Upload / URL toggle */}
            {canUploadFile(contentType) && (
              <View style={styles.modeToggle}>
                <TouchableOpacity
                  style={[styles.modeBtn, inputMode === 'file' && styles.modeBtnActive]}
                  onPress={() => { setInputMode('file'); setUrl(''); }}
                >
                  <Ionicons name="cloud-upload-outline" size={16} color={inputMode === 'file' ? colors.textOnAccent : colors.textSecondary} />
                  <Text style={[styles.modeBtnText, inputMode === 'file' && styles.modeBtnTextActive]}>
                    Carica File
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, inputMode === 'url' && styles.modeBtnActive]}
                  onPress={() => { setInputMode('url'); setSelectedFile(null); }}
                >
                  <Ionicons name="link-outline" size={16} color={inputMode === 'url' ? colors.textOnAccent : colors.textSecondary} />
                  <Text style={[styles.modeBtnText, inputMode === 'url' && styles.modeBtnTextActive]}>
                    URL Esterno
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {inputMode === 'file' && canUploadFile(contentType) ? (
              <View style={styles.filePickerSection}>
                <TouchableOpacity style={styles.filePickerBtn} onPress={handlePickFile}>
                  <Ionicons
                    name={selectedFile ? 'checkmark-circle' : 'cloud-upload-outline'}
                    size={28}
                    color={selectedFile ? colors.success : colors.accent}
                  />
                  <Text style={styles.filePickerText}>
                    {selectedFile ? selectedFile.name : `Seleziona ${contentType === 'video' ? 'video' : contentType === 'audio' ? 'audio' : 'PDF'}...`}
                  </Text>
                  {selectedFile && (
                    <TouchableOpacity onPress={() => setSelectedFile(null)}>
                      <Ionicons name="close-circle" size={20} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
                <Text style={styles.fileHint}>
                  {contentType === 'video' ? 'MP4, MOV' : contentType === 'audio' ? 'MP3, M4A, WAV' : 'PDF'}
                </Text>
              </View>
            ) : (
              <InputField
                label="URL"
                value={url}
                onChangeText={setUrl}
                placeholder="Link al contenuto (YouTube, Spotify, ecc.)"
                autoCapitalize="none"
              />
            )}

            <InputField
              label="Tag (separati da virgola)"
              value={tags}
              onChangeText={setTags}
              placeholder="respirazione, benessere, tecnica"
            />

            {/* Assegnazione allievi */}
            <StudentSearchPicker
              students={students}
              selectedIds={selectedStudentIds}
              onSelect={(id) => toggleStudent(id)}
              multiSelect
              label="Assegna a (vuoto = tutti gli allievi)"
            />

            {uploadProgress ? (
              <View style={styles.uploadProgressRow}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={styles.uploadProgressText}>{uploadProgress}</Text>
              </View>
            ) : null}

            <View style={styles.modalButtons}>
              <Button
                title="Annulla"
                onPress={() => { setShowModal(false); resetForm(); }}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title={saving ? 'Caricamento...' : 'Pubblica'}
                onPress={handleSave}
                style={styles.modalButton}
                loading={saving}
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
  addButtonContainer: {
    padding: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    gap: 2,
    minWidth: 52,
  },
  typeBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  contentInfo: {
    flex: 1,
  },
  contentTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  contentDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  contentMeta: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: 4,
  },
  deleteBtn: {
    padding: spacing.xs,
  },
  deleteBtnText: {
    color: colors.error,
    fontWeight: '700',
    fontSize: fontSize.lg,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.lg,
    lineHeight: 22,
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
  fieldLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  // Mode toggle
  modeToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  modeBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  modeBtnText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modeBtnTextActive: {
    color: colors.textOnAccent,
  },

  // File picker
  filePickerSection: {
    marginBottom: spacing.md,
  },
  filePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  filePickerText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  fileHint: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },

  // Upload progress
  uploadProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  uploadProgressText: {
    fontSize: fontSize.md,
    color: colors.accent,
    fontWeight: '500',
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
