import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  AppState,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { ChatRoom, ChatMessage, User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import {
  sendMessage,
  subscribeToMessages,
  markMessagesAsRead,
  setTypingStatus,
  subscribeToTypingStatus,
  updatePresence,
  subscribeToPresence,
} from '../../services/chatService';

interface Props {
  room: ChatRoom;
  isAnonymous: boolean;
  onBack: () => void;
  participants: Record<string, User>;
}

export const ChatConversationScreen: React.FC<Props> = ({
  room,
  isAnonymous,
  onBack,
  participants,
}) => {
  const { user, isOwner } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<{ userId: string; userName: string }[]>([]);
  const [presence, setPresence] = useState<Record<string, { isOnline: boolean; lastSeen: Date | null }>>({});
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sottoscrizione messaggi real-time
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToMessages(room.id, (msgs) => {
      setMessages(msgs);
      if (!isAnonymous) {
        markMessagesAsRead(room.id, user.id);
      }
    });

    return () => unsubscribe();
  }, [room.id, user, isAnonymous]);

  // Sottoscrizione typing indicators
  useEffect(() => {
    if (!user || isAnonymous) return;

    const unsubscribe = subscribeToTypingStatus(room.id, user.id, setTypingUsers);
    return () => unsubscribe();
  }, [room.id, user, isAnonymous]);

  // Sottoscrizione presenza online dei partecipanti
  useEffect(() => {
    const otherIds = room.participants.filter((id) => id !== user?.id);
    if (otherIds.length === 0) return;

    const unsubscribe = subscribeToPresence(otherIds, setPresence);
    return () => unsubscribe();
  }, [room.participants, user?.id]);

  // Aggiorna la propria presenza quando si entra/esce dalla chat
  useEffect(() => {
    if (!user || isAnonymous) return;

    updatePresence(user.id, true);

    const handleAppState = (state: string) => {
      updatePresence(user.id, state === 'active');
    };
    const sub = AppState.addEventListener('change', handleAppState);

    return () => {
      sub.remove();
      updatePresence(user.id, false);
      setTypingStatus(room.id, user.id, '', false);
    };
  }, [user, isAnonymous, room.id]);

  // Gestione typing indicator con debounce
  const handleTextChange = useCallback((text: string) => {
    setNewMessage(text);

    if (!user || isAnonymous) return;

    if (text.trim()) {
      setTypingStatus(room.id, user.id, `${user.name}`, true);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTypingStatus(room.id, user.id, '', false);
      }, 3000);
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setTypingStatus(room.id, user.id, '', false);
    }
  }, [user, isAnonymous, room.id]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || isAnonymous) return;

    // Ferma typing indicator
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTypingStatus(room.id, user.id, '', false);

    try {
      await sendMessage(
        room.id,
        user.id,
        `${user.name} ${user.surname}`,
        newMessage.trim(),
        false
      );
      setNewMessage('');
    } catch {
      // Silently handle
    }
  };

  // Stato online dell'altro partecipante
  const getOnlineStatus = (): { isOnline: boolean; lastSeenText: string } => {
    const otherId = room.participants.find((id) => id !== user?.id);
    if (!otherId || !presence[otherId]) return { isOnline: false, lastSeenText: '' };

    const p = presence[otherId];
    if (p.isOnline) return { isOnline: true, lastSeenText: 'online' };

    if (p.lastSeen) {
      const diff = Date.now() - p.lastSeen.getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return { isOnline: false, lastSeenText: 'visto ora' };
      if (minutes < 60) return { isOnline: false, lastSeenText: `visto ${minutes} min fa` };
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return { isOnline: false, lastSeenText: `visto ${hours}h fa` };
      return { isOnline: false, lastSeenText: `visto ${p.lastSeen.toLocaleDateString('it-IT')}` };
    }

    return { isOnline: false, lastSeenText: '' };
  };

  const getSenderName = (msg: ChatMessage): string => {
    if (msg.senderId === user?.id) return 'Tu';
    const sender = participants[msg.senderId];
    return sender ? `${sender.name}` : msg.senderName;
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === user?.id;

    return (
      <View
        style={[
          styles.messageBubble,
          isMe ? styles.myMessage : styles.theirMessage,
        ]}
      >
        {!isMe && (
          <Text style={styles.senderName}>{getSenderName(item)}</Text>
        )}
        <Text style={[styles.messageText, isMe && styles.myMessageText]}>
          {item.text}
        </Text>
        <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
          {(() => {
            const ts = item.timestamp as any;
            const date = ts?.toDate ? ts.toDate() : ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
            return date.toLocaleTimeString('it-IT', {
              hour: '2-digit',
              minute: '2-digit',
            });
          })()}
        </Text>
      </View>
    );
  };

  // Titolo della conversazione
  const getTitle = (): string => {
    if (isOwner) {
      const student = participants[room.studentId];
      const collab = participants[room.collaboratorId];
      const sName = student ? `${student.name} ${student.surname}` : 'Allievo';
      const cName = collab ? `${collab.name} ${collab.surname}` : 'Collaboratore';
      return `${sName} ↔ ${cName}`;
    }
    const otherId = room.participants.find((id) => id !== user?.id);
    if (otherId && participants[otherId]) {
      const p = participants[otherId];
      return `${p.name} ${p.surname}`;
    }
    return 'Chat';
  };

  const onlineStatus = getOnlineStatus();

  // Sottotitolo header con stato online e typing
  const getSubtitle = (): string => {
    if (isAnonymous) return 'Modalità anonima - solo lettura';
    if (typingUsers.length > 0) {
      const names = typingUsers.map((u) => u.userName).join(', ');
      return `${names} sta scrivendo...`;
    }
    if (!isOwner && onlineStatus.lastSeenText) {
      return onlineStatus.lastSeenText;
    }
    return '';
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header con stato online */}
      <ScreenHeader
        title={getTitle()}
        subtitle={getSubtitle() || undefined}
        onBack={onBack}
      />

      {/* Indicatore online */}
      {!isOwner && !isAnonymous && onlineStatus.isOnline && (
        <View style={styles.onlineBanner}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineBannerText}>Online</Text>
        </View>
      )}

      {/* Messaggi */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Nessun messaggio. Inizia la conversazione!
            </Text>
          </View>
        }
      />

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <View style={styles.typingContainer}>
          <View style={styles.typingDots}>
            <View style={[styles.typingDot, styles.typingDot1]} />
            <View style={[styles.typingDot, styles.typingDot2]} />
            <View style={[styles.typingDot, styles.typingDot3]} />
          </View>
          <Text style={styles.typingText}>
            {typingUsers.map((u) => u.userName).join(', ')} sta scrivendo...
          </Text>
        </View>
      )}

      {/* Input messaggio (nascosto in modalità anonima) */}
      {!isAnonymous && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={handleTextChange}
            placeholder="Scrivi un messaggio..."
            placeholderTextColor={colors.textLight}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !newMessage.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!newMessage.trim()}
          >
            <Text style={styles.sendButtonText}>Invia</Text>
          </TouchableOpacity>
        </View>
      )}

      {isAnonymous && (
        <View style={styles.anonBar}>
          <Text style={styles.anonBarText}>
            Stai osservando in modalità anonima
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    paddingTop: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: spacing.md,
  },
  backText: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  anonLabel: {
    fontSize: fontSize.xs,
    color: colors.warning,
    marginTop: 2,
  },
  messageList: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
    borderBottomRightRadius: spacing.xs,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderBottomLeftRadius: spacing.xs,
  },
  senderName: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.collaboratorBadge,
    marginBottom: spacing.xs,
  },
  messageText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 20,
  },
  myMessageText: {
    color: colors.textOnAccent,
  },
  messageTime: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    paddingTop: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    marginLeft: spacing.sm,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: colors.textOnAccent,
    fontWeight: '700',
    fontSize: fontSize.md,
  },
  anonBar: {
    backgroundColor: colors.warning + '20',
    padding: spacing.md,
    alignItems: 'center',
  },
  anonBarText: {
    color: colors.warning,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  onlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    backgroundColor: colors.success + '15',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: spacing.xs,
  },
  onlineBannerText: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontWeight: '600',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  typingDots: {
    flexDirection: 'row',
    marginRight: spacing.sm,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textSecondary,
    marginHorizontal: 1,
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.7,
  },
  typingDot3: {
    opacity: 1,
  },
  typingText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
});
