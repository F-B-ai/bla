import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { crossAlert } from '../../utils/alert';
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createBulkNotifications,
  getNotificationIcon,
  getNotificationColor,
} from '../../services/notificationService';
import { getStudents, getCollaborators, getManagers } from '../../services/authService';
import { AppNotification, NotificationType } from '../../types';

export const NotificationsScreen: React.FC = () => {
  const { user, isOwner, isManager } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertBody, setAlertBody] = useState('');
  const [alertTarget, setAlertTarget] = useState<'all' | 'students' | 'staff'>('all');
  const [sending, setSending] = useState(false);

  const isStaff = isOwner || isManager || user?.role === 'collaborator';

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const notifs = await getUserNotifications(user.id);
      setNotifications(notifs);
    } catch (err) {
      console.warn('Errore caricamento notifiche:', err);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleMarkRead = async (notif: AppNotification) => {
    if (notif.read) return;
    try {
      await markAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
    } catch {}
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await markAllAsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  const handleDelete = async (notifId: string) => {
    try {
      await deleteNotification(notifId);
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    } catch {}
  };

  const handleSendAlert = async () => {
    if (!alertTitle.trim() || !alertBody.trim()) {
      crossAlert('Errore', 'Inserisci titolo e messaggio');
      return;
    }
    setSending(true);
    try {
      const results = await Promise.allSettled([
        getStudents(),
        getCollaborators(),
        getManagers(),
      ]);
      const students = results[0].status === 'fulfilled' ? results[0].value : [];
      const collabs = results[1].status === 'fulfilled' ? results[1].value : [];
      const managers = results[2].status === 'fulfilled' ? results[2].value : [];

      let targetIds: string[] = [];
      if (alertTarget === 'all') {
        targetIds = [
          ...students.map((s) => s.id),
          ...collabs.map((c) => c.id),
          ...managers.map((m) => m.id),
        ];
      } else if (alertTarget === 'students') {
        targetIds = students.map((s) => s.id);
      } else {
        targetIds = [
          ...collabs.map((c) => c.id),
          ...managers.map((m) => m.id),
        ];
      }

      if (targetIds.length === 0) {
        crossAlert('Info', 'Nessun destinatario trovato');
        setSending(false);
        return;
      }

      await createBulkNotifications(
        targetIds,
        'custom_alert' as NotificationType,
        alertTitle.trim(),
        alertBody.trim()
      );

      crossAlert('Inviato', `Avviso inviato a ${targetIds.length} utenti`);
      setShowSendModal(false);
      setAlertTitle('');
      setAlertBody('');
    } catch (err: any) {
      const msg = err?.message || err?.code || String(err);
      crossAlert('Errore', `Impossibile inviare l'avviso: ${msg}`);
    } finally {
      setSending(false);
    }
  };

  const formatDate = (date: any): string => {
    try {
      const d = date?.toDate?.() || new Date(date?.seconds ? date.seconds * 1000 : date);
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Adesso';
      if (mins < 60) return `${mins} min fa`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h fa`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}g fa`;
      return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderNotification = ({ item }: { item: AppNotification }) => {
    const iconName = getNotificationIcon(item.type) as any;
    const iconColor = getNotificationColor(item.type);

    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.read && styles.notifUnread]}
        onPress={() => handleMarkRead(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.notifIcon, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={iconName} size={20} color={iconColor} />
        </View>
        <View style={styles.notifContent}>
          <View style={styles.notifHeader}>
            <Text style={[styles.notifTitle, !item.read && styles.notifTitleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.notifTime}>{formatDate(item.createdAt)}</Text>
          </View>
          <Text style={styles.notifBody} numberOfLines={3}>
            {item.body}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={16} color={colors.textLight} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifiche</Text>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Segna tutte lette</Text>
          </TouchableOpacity>
        )}
      </View>

      {(isOwner || isManager) && (
        <TouchableOpacity
          style={styles.sendAlertBtn}
          onPress={() => setShowSendModal(true)}
        >
          <Ionicons name="megaphone" size={18} color={colors.textOnAccent} />
          <Text style={styles.sendAlertText}>Invia Avviso</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.textLight} />
            <Text style={styles.emptyText}>Nessuna notifica</Text>
          </View>
        }
      />

      {/* Modal Invia Avviso */}
      <Modal
        visible={showSendModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSendModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Invia Avviso</Text>

            <Text style={styles.fieldLabel}>Destinatari</Text>
            <View style={styles.targetRow}>
              {(['all', 'students', 'staff'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.targetBtn, alertTarget === t && styles.targetBtnActive]}
                  onPress={() => setAlertTarget(t)}
                >
                  <Text style={[styles.targetBtnText, alertTarget === t && styles.targetBtnTextActive]}>
                    {t === 'all' ? 'Tutti' : t === 'students' ? 'Allievi' : 'Staff'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Titolo</Text>
            <TextInput
              style={styles.input}
              value={alertTitle}
              onChangeText={setAlertTitle}
              placeholder="Es: Chiusura festiva"
              placeholderTextColor={colors.textLight}
            />

            <Text style={styles.fieldLabel}>Messaggio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={alertBody}
              onChangeText={setAlertBody}
              placeholder="Scrivi il messaggio dell'avviso..."
              placeholderTextColor={colors.textLight}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={[styles.sendBtn, sending && { opacity: 0.6 }]}
              onPress={handleSendAlert}
              disabled={sending}
            >
              <Ionicons name="send" size={18} color={colors.textOnAccent} />
              <Text style={styles.sendBtnText}>
                {sending ? 'Invio in corso...' : 'Invia a tutti'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowSendModal(false)}
            >
              <Text style={styles.cancelBtnText}>Annulla</Text>
            </TouchableOpacity>
          </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  markAllBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  markAllText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  sendAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  sendAlertText: {
    color: colors.textOnAccent,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.background,
  },
  notifUnread: {
    backgroundColor: colors.surface,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  notifContent: {
    flex: 1,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  notifTitle: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textSecondary,
    flex: 1,
  },
  notifTitleUnread: {
    fontWeight: '700',
    color: colors.text,
  },
  notifTime: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginLeft: spacing.sm,
  },
  notifBody: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  deleteBtn: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    color: colors.textLight,
    fontSize: fontSize.md,
    marginTop: spacing.md,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  targetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  targetBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  targetBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  targetBtnText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  targetBtnTextActive: {
    color: colors.textOnAccent,
  },
  input: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    padding: spacing.md + 2,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
  },
  sendBtnText: {
    color: colors.textOnAccent,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  cancelBtn: {
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
});
