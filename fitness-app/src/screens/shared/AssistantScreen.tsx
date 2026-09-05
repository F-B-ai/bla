import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { brand } from '../../config/brand';
import { useAuth } from '../../hooks/useAuth';
import { crossAlert } from '../../utils/alert';
import {
  AssistantMessage,
  askAssistant,
  getAssistantInfo,
  saveAssistantInfo,
} from '../../services/assistantService';

const QUICK_QUESTIONS = [
  'Quanto costa l\'abbonamento?',
  'Come funziona il check-in?',
  'Cosa include ESSĒRE PREMIUM?',
  'Come funzionano i Traguardi?',
];

export const AssistantScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user, isOwner } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // Pannello owner: modifica informazioni palestra
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoText, setInfoText] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);

  useEffect(() => {
    if (isOwner) {
      getAssistantInfo().then(setInfoText).catch(() => {});
    }
  }, [isOwner]);

  const scrollToEnd = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  };

  const send = useCallback(async (text: string) => {
    const question = text.trim();
    if (!question || sending) return;
    setInput('');
    const newHistory: AssistantMessage[] = [...messages, { role: 'user', content: question }];
    setMessages(newHistory);
    setSending(true);
    scrollToEnd();
    try {
      const name = user?.name || '';
      const reply = await askAssistant(newHistory, name);
      setMessages([...newHistory, { role: 'assistant', content: reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Errore sconosciuto';
      setMessages([
        ...newHistory,
        { role: 'assistant', content: `Mi dispiace, non riesco a rispondere in questo momento. (${msg})` },
      ]);
    } finally {
      setSending(false);
      scrollToEnd();
    }
  }, [messages, sending, user]);

  const handleSaveInfo = async () => {
    // Protezione anti-cancellazione: se il campo è vuoto ma su Firestore
    // esistono informazioni, chiedi conferma esplicita prima di sovrascrivere.
    if (!infoText.trim()) {
      try {
        const saved = await getAssistantInfo();
        if (saved && saved.trim()) {
          crossAlert(
            'Attenzione',
            'Il campo è vuoto ma ci sono informazioni salvate. Per cancellarle davvero, scrivi "CANCELLA TUTTO" nel campo e salva di nuovo.'
          );
          return;
        }
      } catch { /* in dubbio, non bloccare */ }
    }
    const toSave = infoText.trim() === 'CANCELLA TUTTO' ? '' : infoText;
    setSavingInfo(true);
    try {
      await saveAssistantInfo(toSave);
      setShowInfoModal(false);
      crossAlert('Salvato', 'Le informazioni della palestra sono state aggiornate. L\'assistente le userà da subito.');
    } catch {
      crossAlert('Errore', 'Impossibile salvare le informazioni.');
    } finally {
      setSavingInfo(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={{ ...styles.header, paddingTop: insets.top + spacing.md }}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Ionicons name="sparkles" size={20} color={colors.white} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Assistente {brand.appName}</Text>
            <Text style={styles.headerSub}>Prezzi · Servizi · Info palestra</Text>
          </View>
        </View>
        {isOwner && (
          <TouchableOpacity
            style={styles.editInfoBtn}
            onPress={async () => {
              setShowInfoModal(true);
              // Ricarica SEMPRE il testo salvato all'apertura: il caricamento
              // al mount può fallire (auth/rete non pronte) e lasciare il campo
              // vuoto — salvare in quello stato cancellerebbe le informazioni.
              try {
                const saved = await getAssistantInfo();
                if (saved) {
                  setInfoText((current) => (current.trim() ? current : saved));
                }
              } catch { /* si mantiene il testo attuale */ }
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="create-outline" size={20} color={colors.accent} />
          </TouchableOpacity>
        )}
      </View>

      {/* Messaggi */}
      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && (
          <View style={styles.welcome}>
            <View style={styles.welcomeIcon}>
              <Ionicons name="chatbubble-ellipses" size={40} color={colors.accent} />
            </View>
            <Text style={styles.welcomeTitle}>Ciao{user?.name ? ` ${user.name}` : ''}! 👋</Text>
            <Text style={styles.welcomeText}>
              Sono l'assistente di {brand.appName}. Chiedimi di prezzi, abbonamenti,
              check-in o come usare l'app.
            </Text>
            <View style={styles.quickWrap}>
              {QUICK_QUESTIONS.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={styles.quickChip}
                  onPress={() => send(q)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickChipText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {messages.map((m, i) => (
          <View
            key={i}
            style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}
          >
            <Text style={m.role === 'user' ? styles.bubbleUserText : styles.bubbleAssistantText}>
              {m.content}
            </Text>
          </View>
        ))}

        {sending && (
          <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.typingText}>sta scrivendo…</Text>
          </View>
        )}

        <View style={{ height: 12 }} />
      </ScrollView>

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Scrivi una domanda…"
          placeholderTextColor={colors.textLight}
          multiline
          maxLength={500}
          onSubmitEditing={() => send(input)}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.4 }]}
          onPress={() => send(input)}
          disabled={!input.trim() || sending}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-up" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Modal owner: informazioni palestra */}
      <Modal visible={showInfoModal} animationType="slide" transparent onRequestClose={() => setShowInfoModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Informazioni palestra</Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHint}>
              Scrivi qui orari, regole, contatti e FAQ. L'assistente userà queste
              informazioni per rispondere agli allievi.
            </Text>
            <TextInput
              style={styles.infoInput}
              value={infoText}
              onChangeText={setInfoText}
              placeholder={'Es:\nORARI: Lun-Ven 7:00-21:30, Sab 9:00-13:00\nCONTATTI: 333 1234567\nREGOLE: portare asciugamano e scarpe pulite…'}
              placeholderTextColor={colors.textLight}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.saveInfoBtn, savingInfo && { opacity: 0.6 }]}
              onPress={handleSaveInfo}
              disabled={savingInfo}
              activeOpacity={0.8}
            >
              {savingInfo ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.saveInfoBtnText}>Salva</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'web' ? spacing.lg : 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 1 },
  editInfoBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },

  chatArea: { flex: 1 },
  chatContent: { padding: spacing.lg },

  welcome: { alignItems: 'center', paddingTop: spacing.xl },
  welcomeIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.accent + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  welcomeTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  welcomeText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    maxWidth: 300,
    lineHeight: 20,
  },
  quickWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  quickChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent + '40',
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  quickChipText: { fontSize: fontSize.sm, color: colors.accent, fontWeight: '600' },

  bubble: {
    maxWidth: '85%',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleUserText: { color: colors.white, fontSize: fontSize.md, lineHeight: 20 },
  bubbleAssistantText: { color: colors.text, fontSize: fontSize.md, lineHeight: 20 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  typingText: { color: colors.textSecondary, fontSize: fontSize.sm },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: Platform.OS === 'web' ? spacing.md : spacing.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    maxHeight: 110,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalOverlay: { flex: 1, backgroundColor: colors.overlayDark, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  modalHint: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 18 },
  infoInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
    minHeight: 220,
    maxHeight: 340,
  },
  saveInfoBtn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  saveInfoBtnText: { color: colors.white, fontSize: fontSize.lg, fontWeight: '700' },
});
