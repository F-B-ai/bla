import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../config/theme';
import { Student } from '../../types';

interface StudentSearchPickerProps {
  students: Student[];
  selectedId?: string;
  selectedIds?: string[];
  onSelect: (studentId: string) => void;
  multiSelect?: boolean;
  placeholder?: string;
  label?: string;
}

export const StudentSearchPicker: React.FC<StudentSearchPickerProps> = ({
  students,
  selectedId,
  selectedIds,
  onSelect,
  multiSelect = false,
  placeholder = 'Cerca allievo per nome...',
  label = 'Seleziona Allievo',
}) => {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return students;
    const q = query.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.surname.toLowerCase().includes(q) ||
        `${s.name} ${s.surname}`.toLowerCase().includes(q)
    );
  }, [students, query]);

  const isSelected = (id: string) =>
    multiSelect ? selectedIds?.includes(id) : selectedId === id;

  const selectedStudent = !multiSelect
    ? students.find((s) => s.id === selectedId)
    : null;

  const selectedCount = multiSelect ? selectedIds?.length || 0 : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {/* Selected preview (single mode) */}
      {!multiSelect && selectedStudent && !expanded && (
        <TouchableOpacity
          style={styles.selectedPreview}
          onPress={() => setExpanded(true)}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {selectedStudent.name[0]}{selectedStudent.surname[0]}
            </Text>
          </View>
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedName}>
              {selectedStudent.name} {selectedStudent.surname}
            </Text>
            {selectedStudent.goals ? (
              <Text style={styles.selectedGoals} numberOfLines={1}>
                {selectedStudent.goals}
              </Text>
            ) : null}
          </View>
          <Ionicons name="swap-horizontal" size={18} color={colors.accent} />
        </TouchableOpacity>
      )}

      {/* Multi-select summary */}
      {multiSelect && selectedCount > 0 && !expanded && (
        <TouchableOpacity
          style={styles.selectedPreview}
          onPress={() => setExpanded(true)}
        >
          <Ionicons name="people" size={20} color={colors.accent} />
          <Text style={styles.selectedName}>
            {selectedCount} alliev{selectedCount === 1 ? 'o' : 'i'} selezionat{selectedCount === 1 ? 'o' : 'i'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.accent} />
        </TouchableOpacity>
      )}

      {/* Show search when no selection or expanded */}
      {(expanded || (!selectedStudent && !multiSelect) || (multiSelect && (selectedCount === 0 || expanded))) && (
        <View>
          {/* Search input */}
          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={colors.textLight} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder={placeholder}
              placeholderTextColor={colors.textLight}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textLight} />
              </TouchableOpacity>
            )}
          </View>

          {/* Results */}
          <ScrollView
            style={styles.resultsList}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {filtered.length === 0 ? (
              <Text style={styles.emptyText}>
                {students.length === 0
                  ? 'Nessun allievo disponibile'
                  : 'Nessun risultato per la ricerca'}
              </Text>
            ) : (
              filtered.map((s) => {
                const selected = isSelected(s.id);
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.resultItem, selected && styles.resultItemActive]}
                    onPress={() => {
                      onSelect(s.id);
                      if (!multiSelect) {
                        setExpanded(false);
                        setQuery('');
                      }
                    }}
                  >
                    <View style={[styles.avatar, selected && styles.avatarActive]}>
                      <Text style={[styles.avatarText, selected && styles.avatarTextActive]}>
                        {s.name[0]}{s.surname[0]}
                      </Text>
                    </View>
                    <View style={styles.resultInfo}>
                      <Text style={[styles.resultName, selected && styles.resultNameActive]}>
                        {s.name} {s.surname}
                      </Text>
                      {s.goals ? (
                        <Text style={styles.resultGoals} numberOfLines={1}>{s.goals}</Text>
                      ) : null}
                    </View>
                    {selected && (
                      <Ionicons
                        name={multiSelect ? 'checkbox' : 'checkmark-circle'}
                        size={22}
                        color={colors.accent}
                      />
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Collapse button when expanded */}
          {expanded && (
            <TouchableOpacity
              style={styles.collapseBtn}
              onPress={() => { setExpanded(false); setQuery(''); }}
            >
              <Ionicons name="chevron-up" size={16} color={colors.accent} />
              <Text style={styles.collapseBtnText}>Chiudi</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent + '40',
    ...shadows.small,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  selectedGoals: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  resultsList: {
    maxHeight: 220,
    marginTop: spacing.sm,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: 2,
  },
  resultItemActive: {
    backgroundColor: colors.accent + '15',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  avatarText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  avatarTextActive: {
    color: '#FFF',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  resultNameActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  resultGoals: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.lg,
    fontSize: fontSize.md,
  },
  collapseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  collapseBtnText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
