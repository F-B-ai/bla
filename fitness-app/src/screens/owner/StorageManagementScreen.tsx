import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { crossAlert } from '../../utils/alert';
import {
  listAllFiles,
  summarizeByFolder,
  totalSize,
  deleteFiles,
  formatBytes,
  StorageFile,
  FREE_TIER_BYTES,
} from '../../services/storageService';

const FOLDER_LABELS: Record<string, { label: string; icon: string }> = {
  postural: { label: 'Foto Posturali', icon: 'body' },
  content: { label: 'Contenuti', icon: 'folder' },
  nutritionTeam: { label: 'Note Team Nutrizione', icon: 'nutrition' },
  avatars: { label: 'Foto Profilo', icon: 'person-circle' },
  bodyComposition: { label: 'Composizione Corporea', icon: 'scan' },
  '(root)': { label: 'Altri file', icon: 'document' },
};

const folderInfo = (folder: string) =>
  FOLDER_LABELS[folder] || { label: folder, icon: 'folder-outline' };

const formatDate = (d: Date | null): string =>
  d ? d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';

export const StorageManagementScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanCount, setScanCount] = useState(0);
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setScanCount(0);
    try {
      const all = await listAllFiles((c) => setScanCount(c));
      setFiles(all);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      crossAlert('Errore', `Impossibile leggere lo spazio di archiviazione.\n\nDettaglio: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const used = useMemo(() => totalSize(files), [files]);
  const folders = useMemo(() => summarizeByFolder(files), [files]);
  const usedPct = Math.min((used / FREE_TIER_BYTES) * 100, 100);

  const filesInFolder = useCallback(
    (folder: string) =>
      files
        .filter((f) => f.folder === folder)
        .sort((a, b) => {
          const ta = a.created ? a.created.getTime() : 0;
          const tb = b.created ? b.created.getTime() : 0;
          return ta - tb; // più vecchi prima
        }),
    [files]
  );

  const confirmDelete = (paths: string[], description: string) => {
    if (paths.length === 0) return;
    crossAlert(
      'Conferma eliminazione',
      `Stai per eliminare ${description}. L'operazione non può essere annullata. Procedere?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const { deleted, failed } = await deleteFiles(paths);
              await load();
              crossAlert(
                'Completato',
                `${deleted} file eliminati${failed > 0 ? `, ${failed} non eliminati` : ''}.`
              );
            } catch {
              crossAlert('Errore', 'Impossibile eliminare i file.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const deleteOlderThan = (folder: string, months: number) => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const paths = filesInFolder(folder)
      .filter((f) => f.created && f.created.getTime() < cutoff.getTime())
      .map((f) => f.path);
    if (paths.length === 0) {
      crossAlert('Nessun file', `Nessun file più vecchio di ${months} mesi in questa cartella.`);
      return;
    }
    confirmDelete(paths, `${paths.length} file più vecchi di ${months} mesi`);
  };

  return (
    <View style={styles.container}>
      <View style={{ ...styles.header, paddingTop: insets.top + spacing.md }}>
        <Text style={styles.headerTitle}>Gestione Spazio</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={load} disabled={loading || deleting}>
          <Ionicons name="refresh" size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>
              Analisi dello spazio... {scanCount > 0 ? `${scanCount} file` : ''}
            </Text>
          </View>
        ) : (
          <>
            {/* Riepilogo spazio */}
            <View style={styles.usageCard}>
              <View style={styles.usageRow}>
                <Text style={styles.usageUsed}>{formatBytes(used)}</Text>
                <Text style={styles.usageTotal}>/ {formatBytes(FREE_TIER_BYTES)}</Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${usedPct}%`,
                      backgroundColor:
                        usedPct > 90 ? colors.error : usedPct > 70 ? colors.warning : colors.success,
                    },
                  ]}
                />
              </View>
              <Text style={styles.usageHint}>
                {usedPct.toFixed(1)}% dello spazio gratuito utilizzato · {files.length} file totali
              </Text>
              {usedPct > 90 && (
                <View style={styles.warnBanner}>
                  <Ionicons name="warning" size={16} color={colors.error} />
                  <Text style={styles.warnText}>
                    Spazio quasi esaurito. Elimina i file vecchi per liberare spazio.
                  </Text>
                </View>
              )}
            </View>

            {/* Cartelle */}
            {folders.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="cloud-done-outline" size={40} color={colors.textLight} />
                <Text style={styles.emptyText}>Nessun file presente nello Storage</Text>
              </View>
            ) : (
              folders.map((f) => {
                const info = folderInfo(f.folder);
                const isExpanded = expandedFolder === f.folder;
                const folderFiles = isExpanded ? filesInFolder(f.folder) : [];
                return (
                  <View key={f.folder} style={styles.folderCard}>
                    <TouchableOpacity
                      style={styles.folderHeader}
                      onPress={() => setExpandedFolder(isExpanded ? null : f.folder)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.folderIconBox}>
                        <Ionicons name={info.icon as any} size={20} color={colors.accent} />
                      </View>
                      <View style={styles.folderInfo}>
                        <Text style={styles.folderName}>{info.label}</Text>
                        <Text style={styles.folderMeta}>
                          {f.fileCount} file · {formatBytes(f.totalSize)}
                        </Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.folderBody}>
                        {/* Azioni rapide */}
                        <View style={styles.quickActions}>
                          <TouchableOpacity
                            style={styles.quickBtn}
                            onPress={() => deleteOlderThan(f.folder, 6)}
                            disabled={deleting}
                          >
                            <Ionicons name="time-outline" size={14} color={colors.warning} />
                            <Text style={styles.quickBtnText}>Elimina &gt; 6 mesi</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.quickBtn, styles.quickBtnDanger]}
                            onPress={() =>
                              confirmDelete(
                                filesInFolder(f.folder).map((x) => x.path),
                                `tutti i ${f.fileCount} file di "${info.label}"`
                              )
                            }
                            disabled={deleting}
                          >
                            <Ionicons name="trash-outline" size={14} color={colors.error} />
                            <Text style={[styles.quickBtnText, { color: colors.error }]}>
                              Svuota cartella
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Elenco file */}
                        {folderFiles.map((file) => (
                          <View key={file.path} style={styles.fileRow}>
                            <View style={styles.fileInfo}>
                              <Text style={styles.fileName} numberOfLines={1}>
                                {file.name}
                              </Text>
                              <Text style={styles.fileMeta}>
                                {formatDate(file.created)} · {formatBytes(file.size)}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={styles.deleteFileBtn}
                              onPress={() => confirmDelete([file.path], `il file "${file.name}"`)}
                              disabled={deleting}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="trash" size={16} color={colors.error} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })
            )}

            <View style={styles.infoNote}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoNoteText}>
                Eliminando i file liberi spazio immediatamente. Le foto rimosse non saranno più
                visibili nelle valutazioni, ma i dati testuali restano salvati.
              </Text>
            </View>

            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>

      {deleting && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.overlayText}>Eliminazione in corso...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
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
  headerTitle: { fontSize: fontSize.title, fontWeight: '700', color: colors.text },
  refreshBtn: { padding: spacing.xs },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing.lg },

  loadingBox: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md },
  loadingText: { color: colors.textSecondary, fontSize: fontSize.md },

  usageCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  usageRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  usageUsed: { fontSize: fontSize.hero, fontWeight: '800', color: colors.text },
  usageTotal: { fontSize: fontSize.lg, color: colors.textSecondary },
  barTrack: {
    height: 10,
    backgroundColor: colors.surfaceLight,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  barFill: { height: '100%', borderRadius: 5 },
  usageHint: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.sm },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  warnText: { flex: 1, fontSize: fontSize.sm, color: colors.error, fontWeight: '600' },

  emptyBox: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md },
  emptyText: { color: colors.textSecondary, fontSize: fontSize.md },

  folderCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  folderHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  folderIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderInfo: { flex: 1 },
  folderName: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  folderMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  folderBody: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    padding: spacing.md,
  },
  quickActions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  quickBtnDanger: { borderColor: colors.error + '40' },
  quickBtnText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.warning },

  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  fileInfo: { flex: 1 },
  fileName: { fontSize: fontSize.md, color: colors.text },
  fileMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  deleteFileBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },

  infoNote: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  infoNoteText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18 },

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  overlayText: { color: colors.white, fontSize: fontSize.md, fontWeight: '600' },
});
