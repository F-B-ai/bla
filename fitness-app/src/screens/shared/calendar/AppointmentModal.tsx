import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../../config/theme';
import { Student, Collaborator } from '../../../types';
import { InputField } from '../../../components/common/InputField';
import { ModalHeader } from '../../../components/common/ModalHeader';
import { Button } from '../../../components/common/Button';
import { StudentSearchPicker } from '../../../components/common/StudentSearchPicker';
import {
  PERSONE_POSSIBILI, incassoSeduta, confrontaConIndividuale, controllaGruppo,
} from '../../../domain/gruppo';

type AppointmentKind = 'training' | 'nutrition' | 'consulenza' | 'gruppo';

type AppointmentItem = {
  id: string;
  kind: AppointmentKind;
  studentId: string;
  staffId: string;
  date: Date;
  dateStr: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string;
  sessionCost?: number;
  isCountedAsCompleted: boolean;
  persone?: number;
  quotaPersona?: number;
};

const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00',
];

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export interface AppointmentModalProps {
  visible: boolean;
  editingItem: AppointmentItem | null;
  formKind: AppointmentKind;
  setFormKind: (v: AppointmentKind) => void;
  formStudentId: string;
  setFormStudentId: (v: string) => void;
  formCollabId: string;
  setFormCollabId: (v: string) => void;
  formDate: string;
  setFormDate: (v: string) => void;
  formCustomDate: string;
  setFormCustomDate: (v: string) => void;
  formStartTime: string;
  setFormStartTime: (v: string) => void;
  formEndTime: string;
  setFormEndTime: (v: string) => void;
  formCost: string;
  setFormCost: (v: string) => void;
  formNotes: string;
  setFormNotes: (v: string) => void;
  /** solo per il personal di gruppo: quante persone, 2-5 */
  formPersone: number;
  setFormPersone: (v: number) => void;
  /** solo per il personal di gruppo: quanto paga ciascuna, a seduta */
  formQuota: string;
  setFormQuota: (v: string) => void;
  /** tariffa individuale del conduttore, per il confronto */
  prezzoIndividuale: number;
  /** solo per la consulenza: il nome di chi viene, se non è in anagrafica */
  formNomeOspite: string;
  setFormNomeOspite: (v: string) => void;
  students: Student[];
  collaborators: Collaborator[];
  canSeeAll: boolean;
  isOwner: boolean;
  isManager: boolean;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  visible,
  editingItem,
  formKind,
  setFormKind,
  formStudentId,
  setFormStudentId,
  formCollabId,
  setFormCollabId,
  formDate,
  setFormDate,
  formCustomDate,
  setFormCustomDate,
  formStartTime,
  setFormStartTime,
  formEndTime,
  setFormEndTime,
  formCost,
  setFormCost,
  formNotes,
  setFormNotes,
  formPersone,
  setFormPersone,
  formQuota,
  setFormQuota,
  prezzoIndividuale,
  formNomeOspite,
  setFormNomeOspite,
  students,
  collaborators,
  canSeeAll,
  isOwner,
  isManager,
  saving,
  onSave,
  onClose,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <ScrollView style={styles.modalContent}>
          <ModalHeader
            title={editingItem ? 'Modifica Appuntamento' : 'Nuovo Appuntamento'}
            onClose={onClose}
          />

          {/* Type */}
          {!editingItem && (
            <>
              <Text style={styles.fieldLabel}>Tipo</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={{
                    ...styles.typeChip,
                    ...(formKind === 'training' ? styles.typeChipActive : {}),
                  }}
                  onPress={() => setFormKind('training')}
                >
                  <Ionicons name="barbell" size={16} color={formKind === 'training' ? colors.accent : colors.textSecondary} />
                  <Text style={{ ...styles.typeChipText, ...(formKind === 'training' ? { color: colors.accent } : {}) }}>Training</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    ...styles.typeChip,
                    ...(formKind === 'nutrition' ? styles.typeChipActiveGreen : {}),
                  }}
                  onPress={() => setFormKind('nutrition')}
                >
                  <Ionicons name="nutrition" size={16} color={formKind === 'nutrition' ? colors.success : colors.textSecondary} />
                  <Text style={{ ...styles.typeChipText, ...(formKind === 'nutrition' ? { color: colors.success } : {}) }}>Nutrizione</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={{
                    ...styles.typeChip,
                    ...(formKind === 'consulenza' ? styles.typeChipActive : {}),
                  }}
                  onPress={() => setFormKind('consulenza')}
                >
                  <Ionicons name="chatbubbles-outline" size={16} color={formKind === 'consulenza' ? colors.accent : colors.textSecondary} />
                  <Text style={{ ...styles.typeChipText, ...(formKind === 'consulenza' ? { color: colors.accent } : {}) }}>Consulenza</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    ...styles.typeChip,
                    ...(formKind === 'gruppo' ? styles.typeChipActive : {}),
                  }}
                  onPress={() => setFormKind('gruppo')}
                >
                  <Ionicons name="people-outline" size={16} color={formKind === 'gruppo' ? colors.accent : colors.textSecondary} />
                  <Text style={{ ...styles.typeChipText, ...(formKind === 'gruppo' ? { color: colors.accent } : {}) }}>Gruppo</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* --- personal di gruppo: quante persone, e quanto paga ciascuna --- */}
          {formKind === 'gruppo' && (() => {
            const quota = parseFloat((formQuota || '').replace(',', '.'));
            const seduta = { persone: formPersone, quotaPersona: quota };
            const ok = controllaGruppo(seduta).valido;
            const conf = ok ? confrontaConIndividuale(seduta, prezzoIndividuale) : null;
            return (
              <View style={styles.gruppoBox}>
                <Text style={styles.fieldLabel}>Quante persone</Text>
                <View style={styles.typeRow}>
                  {PERSONE_POSSIBILI.map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={{
                        ...styles.personaChip,
                        ...(formPersone === n ? styles.typeChipActive : {}),
                      }}
                      onPress={() => setFormPersone(n)}
                    >
                      <Text
                        style={{
                          ...styles.typeChipText,
                          ...(formPersone === n ? { color: colors.accent } : {}),
                        }}
                      >
                        {n}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <InputField
                  label="Quota a persona (€)"
                  value={formQuota}
                  onChangeText={setFormQuota}
                  keyboardType="decimal-pad"
                  placeholder="25"
                />

                {ok && conf && (
                  <>
                    <Text style={styles.gruppoTotale}>
                      La seduta vale {incassoSeduta(seduta)} € in tutto
                      · questa persona ne paga {quota}
                    </Text>
                    <Text
                      style={{
                        ...styles.gruppoNota,
                        ...(conf.esito === 'non_conviene' ? { color: colors.error } : {}),
                      }}
                    >
                      {conf.spiegazione}
                    </Text>
                  </>
                )}

                <Text style={styles.gruppoAiuto}>
                  Nel costo di questo appuntamento entra la quota di questa persona,
                  non l'incasso del gruppo. Per gli altri partecipanti si crea un
                  appuntamento ciascuno: così ognuno ha la sua storia, e il totale
                  torna da solo.
                </Text>
              </View>
            );
          })()}

          {/* Student */}
          <StudentSearchPicker
            students={students}
            selectedId={formStudentId}
            onSelect={(id) => setFormStudentId(id)}
            label={formKind === 'consulenza' ? 'Allievo (se è già in anagrafica)' : 'Allievo'}
          />

          {/* --- consulenza: quasi sempre è il primo contatto, e la
                 persona in anagrafica non c'è ancora --- */}
          {formKind === 'consulenza' && !formStudentId && (
            <View style={styles.ospiteBox}>
              <InputField
                label="Oppure: chi viene"
                value={formNomeOspite}
                onChangeText={setFormNomeOspite}
                placeholder="Nome e cognome"
              />
              <Text style={styles.ospiteAiuto}>
                Se la persona non è ancora in anagrafica scrivi solo il nome:
                l'appuntamento occupa il posto in agenda come ospite. Quando si
                iscrive la colleghi da «Richieste WhatsApp», e diventa una
                sessione vera con la sua scheda.
              </Text>
            </View>
          )}

          {/* Staff picker (owner/manager only) */}
          {canSeeAll && (
            <>
              <Text style={styles.fieldLabel}>
                {formKind === 'training' ? 'Collaboratore' : 'Nutrizionista'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {collaborators.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={{
                        ...styles.chip,
                        ...(formCollabId === c.id ? styles.chipActive : {}),
                      }}
                      onPress={() => setFormCollabId(c.id)}
                    >
                      <Text style={{
                        ...styles.chipText,
                        ...(formCollabId === c.id ? styles.chipTextActive : {}),
                      }}>
                        {c.name} {c.surname}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {/* Date */}
          <Text style={styles.fieldLabel}>Data</Text>
          <View style={styles.customDateRow}>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={formDate}
                onChange={(e: any) => {
                  const val = e.target.value;
                  if (val) {
                    setFormDate(val);
                    const d = new Date(val);
                    setFormCustomDate(d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }));
                  }
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#1A1A1A',
                  color: colors.white,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 16,
                  WebkitAppearance: 'none' as any,
                  colorScheme: 'dark',
                } as any}
              />
            ) : (
              <TextInput
                style={styles.customDateInput}
                placeholder="GG/MM/AAAA"
                placeholderTextColor={colors.textLight}
                value={formCustomDate}
                onChangeText={(raw) => {
                  const digits = raw.replace(/\D/g, '').slice(0, 8);
                  let formatted = '';
                  if (digits.length <= 2) formatted = digits;
                  else if (digits.length <= 4) formatted = digits.slice(0, 2) + '/' + digits.slice(2);
                  else formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
                  setFormCustomDate(formatted);
                  if (digits.length === 8) {
                    const dd = digits.slice(0, 2);
                    const mm = digits.slice(2, 4);
                    const yyyy = digits.slice(4, 8);
                    const dateStr = `${yyyy}-${mm}-${dd}`;
                    const parsed = new Date(dateStr);
                    if (!isNaN(parsed.getTime())) {
                      setFormDate(dateStr);
                    }
                  }
                }}
                keyboardType="number-pad"
                maxLength={10}
              />
            )}
            <TouchableOpacity
              style={styles.todayBtn}
              onPress={() => {
                const today = toDateStr(new Date());
                setFormDate(today);
                setFormCustomDate('');
              }}
            >
              <Text style={styles.todayBtnText}>Oggi</Text>
            </TouchableOpacity>
          </View>
          {formDate ? (
            <Text style={styles.selectedDateLabel}>
              {new Date(formDate + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {new Date(formDate) < new Date(toDateStr(new Date())) ? '  (passato)' : ''}
            </Text>
          ) : null}

          {/* Time */}
          <View style={styles.timeSection}>
            <View style={styles.timeField}>
              <Text style={styles.fieldLabel}>Inizio</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {TIME_SLOTS.map((t) => (
                    <TouchableOpacity
                      key={`s-${t}`}
                      style={{
                        ...styles.timeChip,
                        ...(formStartTime === t ? styles.chipActive : {}),
                      }}
                      onPress={() => setFormStartTime(t)}
                    >
                      <Text style={{
                        ...styles.chipText,
                        ...(formStartTime === t ? styles.chipTextActive : {}),
                      }}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            <View style={styles.timeField}>
              <Text style={styles.fieldLabel}>Fine</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {TIME_SLOTS.map((t) => (
                    <TouchableOpacity
                      key={`e-${t}`}
                      style={{
                        ...styles.timeChip,
                        ...(formEndTime === t ? styles.chipActive : {}),
                      }}
                      onPress={() => setFormEndTime(t)}
                    >
                      <Text style={{
                        ...styles.chipText,
                        ...(formEndTime === t ? styles.chipTextActive : {}),
                      }}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>

          {/* Cost */}
          {(isOwner || isManager) && (
            <InputField
              label="Costo sessione (€)"
              value={formCost}
              onChangeText={setFormCost}
              placeholder="0"
              keyboardType="numeric"
            />
          )}

          <InputField
            label="Note (opzionale)"
            value={formNotes}
            onChangeText={setFormNotes}
            placeholder="Note..."
            multiline
            numberOfLines={3}
          />

          <View style={styles.modalButtons}>
            <Button
              title="Annulla"
              onPress={onClose}
              variant="outline"
              style={styles.modalButton}
            />
            <Button
              title={saving ? 'Salvataggio...' : editingItem ? 'Aggiorna' : 'Crea'}
              onPress={onSave}
              style={styles.modalButton}
              loading={saving}
            />
          </View>
          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
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
  typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  typeChipActive: { borderColor: colors.accent, backgroundColor: colors.accent + '15' },
  typeChipActiveGreen: { borderColor: colors.success, backgroundColor: colors.success + '15' },
  ospiteBox: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  ospiteAiuto: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 16,
    marginTop: spacing.xs,
  },
  gruppoBox: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  personaChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gruppoTotale: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  gruppoNota: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  gruppoAiuto: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
    lineHeight: 16,
  },
  typeChipText: { fontSize: fontSize.md, fontWeight: '600', color: colors.textSecondary },
  chipRow: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: colors.textOnAccent },
  customDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  customDateInput: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  todayBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  todayBtnText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  selectedDateLabel: {
    fontSize: fontSize.md,
    color: colors.accent,
    fontWeight: '600',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    textTransform: 'capitalize',
  },
  timeSection: { gap: spacing.sm },
  timeField: {},
  timeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  modalButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalButton: { flex: 1 },
});
