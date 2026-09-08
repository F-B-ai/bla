import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { crossAlert } from '../../utils/alert';
import { getStudents } from '../../services/authService';
import { Student } from '../../types';
import { StudentSearchPicker } from '../../components/common/StudentSearchPicker';
import {
  STELLATO_TESTS, RED_FLAGS, CHAINS, Sessione, StellatoTest,
  VALIDATION_LABEL, CATALOG_VERSION, Blocco,
} from '../../data/stellatoProtocol';
import { TestResult, computeStellato } from '../../domain/stellato';
import {
  saveStellatoSession, getStudentStellatoSessions, computeCombined, StellatoSession,
} from '../../services/stellatoService';

// ============================================================
// ESAME DEL SISTEMA STELLATO — somministrazione in due sessioni
// Metodo Mind Movement™ (specifica F. Busanca §2-§6).
// Sessione 1: struttura e movimento · Sessione 2: recettori.
// Il software PROPONE, l'operatore VALIDA e firma (§5).
// ============================================================

const BLOCCO_LABEL: Record<Blocco, string> = {
  anamnesi: 'Anamnesi e respiro',
  pattern: 'Pattern fondamentali',
  articolarita: 'Articolarità e linee',
  forza: 'Forza e attivazione',
  podalico: 'Recettore podalico',
  oculare: 'Recettore oculare',
  atm: 'ATM e stomatognatico',
  vestibolare: 'Vestibolare e neuromuscolare',
  viscerale: 'Viscerale',
};

const chainColor = (score: number | null): string => {
  if (score === null) return colors.textSecondary;
  if (score < 55) return colors.error;
  if (score < 70) return colors.warning;
  return colors.success;
};

export default function StellatoScreen() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [sessione, setSessione] = useState<Sessione>(1);
  const [phase, setPhase] = useState<'compile' | 'results'>('compile');

  // valori: testId → {value} oppure {left,right} oppure {cambia}
  const [vals, setVals] = useState<Record<string, TestResult>>({});
  const [flags, setFlags] = useState<string[]>([]);
  const [openTest, setOpenTest] = useState<string | null>(null);
  const [prevSessions, setPrevSessions] = useState<StellatoSession[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notaFirma, setNotaFirma] = useState('');

  useEffect(() => {
    getStudents()
      .then(setStudents)
      .catch(() => crossAlert('Errore', 'Non riesco a caricare gli allievi'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!student) { setPrevSessions([]); return; }
    getStudentStellatoSessions(student.id).then(setPrevSessions).catch(() => setPrevSessions([]));
  }, [student]);

  const testsOfSession = useMemo(
    () => STELLATO_TESTS.filter((t) => t.sessione === sessione),
    [sessione]
  );

  const blocchi = useMemo(() => {
    const map: Record<string, StellatoTest[]> = {};
    testsOfSession.forEach((t) => {
      if (!map[t.blocco]) map[t.blocco] = [];
      map[t.blocco].push(t);
    });
    return Object.entries(map) as Array<[Blocco, StellatoTest[]]>;
  }, [testsOfSession]);

  const results: TestResult[] = useMemo(
    () => Object.values(vals).filter((r) =>
      r.value !== undefined || r.left !== undefined || r.right !== undefined || r.cambia !== undefined
    ),
    [vals]
  );

  // Esito della sessione corrente + esito combinato con l'altra sessione salvata
  const outcome = useMemo(
    () => computeStellato({ results, redFlags: flags }),
    [results, flags]
  );
  const combined = useMemo(() => {
    const merged: StellatoSession[] = [
      ...prevSessions.filter((s) => s.sessione !== sessione),
      {
        id: 'draft', studentId: student?.id || '', assessorId: user?.id || '',
        sessione, date: new Date(), results, redFlags: flags, catalogVersion: CATALOG_VERSION,
      },
    ];
    return computeCombined(merged);
  }, [prevSessions, results, flags, sessione, student, user]);

  const setVal = (testId: string, patch: Partial<TestResult>) =>
    setVals((p) => ({ ...p, [testId]: { ...p[testId], ...patch, testId } }));

  const handleSave = async (accetta: boolean) => {
    if (!student || !user) { crossAlert('Errore', 'Seleziona un allievo'); return; }
    if (results.length === 0 && flags.length === 0) {
      crossAlert('Errore', 'Compila almeno un test');
      return;
    }
    setSaving(true);
    try {
      await saveStellatoSession({
        studentId: student.id,
        studentName: `${student.name} ${student.surname}`,
        assessorId: user.id,
        sessione,
        results,
        redFlags: flags,
        firmaOperatore: {
          operatorId: user.id,
          accettata: accetta,
          prescrizioneFinale: accetta ? outcome.decision.prescrizione : [],
          nota: notaFirma || undefined,
        },
      });
      crossAlert(
        'Sessione salvata',
        accetta
          ? 'Proposta confermata e firmata.'
          : 'Sessione registrata. La proposta NON è stata confermata.'
      );
      setVals({}); setFlags([]); setNotaFirma(''); setPhase('compile');
      getStudentStellatoSessions(student.id).then(setPrevSessions).catch(() => {});
    } catch {
      crossAlert('Errore', 'Salvataggio non riuscito');
    } finally {
      setSaving(false);
    }
  };

  // ---------------- input per tipo di test ----------------
  const renderInput = (t: StellatoTest) => {
    const v = vals[t.id];
    if (t.input === 'confronto') {
      return (
        <View style={s.row}>
          {[['Non cambia (adattivo)', false], ['Cambia (causativo)', true]].map(([lab, val]) => (
            <TouchableOpacity
              key={String(val)}
              style={[s.opt, v?.cambia === val && s.optOn]}
              onPress={() => setVal(t.id, { cambia: val as boolean })}
            >
              <Text style={[s.optTxt, v?.cambia === val && s.optTxtOn]}>{lab as string}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }
    if (t.input === 'category') {
      return (
        <View style={s.col}>
          {(t.opzioni || []).map((o, i) => (
            <TouchableOpacity
              key={o.label}
              style={[s.opt, v?.value === i && s.optOn]}
              onPress={() => setVal(t.id, { value: i })}
            >
              <Text style={[s.optTxt, v?.value === i && s.optTxtOn]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }
    // numerici / scale
    const ph = t.input === 'scale03' ? '0-3' : t.input === 'scale05' ? '0-5' : t.unita || 'valore';
    if (t.bilaterale) {
      return (
        <View style={s.row}>
          {(['left', 'right'] as const).map((side) => (
            <View key={side} style={s.sideBox}>
              <Text style={s.sideLab}>{side === 'left' ? 'SX' : 'DX'}</Text>
              <TextInput
                style={s.num}
                keyboardType="numeric"
                placeholder={ph}
                placeholderTextColor={colors.textSecondary}
                value={v?.[side] !== undefined ? String(v[side]) : ''}
                onChangeText={(txt) => {
                  const n = parseFloat(txt.replace(',', '.'));
                  setVal(t.id, { [side]: isNaN(n) ? undefined : n } as Partial<TestResult>);
                }}
              />
            </View>
          ))}
        </View>
      );
    }
    return (
      <TextInput
        style={[s.num, { alignSelf: 'flex-start', minWidth: 130 }]}
        keyboardType="numeric"
        placeholder={ph}
        placeholderTextColor={colors.textSecondary}
        value={v?.value !== undefined ? String(v.value) : ''}
        onChangeText={(txt) => {
          const n = parseFloat(txt.replace(',', '.'));
          setVal(t.id, { value: isNaN(n) ? undefined : n });
        }}
      />
    );
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  }

  // ==================== RISULTATI ====================
  if (phase === 'results') {
    const d = combined.outcome.decision;
    const sc = combined.outcome.scores;
    return (
      <ScrollView style={s.wrap} contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}>
        <TouchableOpacity style={s.back} onPress={() => setPhase('compile')}>
          <Ionicons name="chevron-back" size={18} color={colors.accent} />
          <Text style={s.backTxt}>Torna ai test</Text>
        </TouchableOpacity>

        {!combined.completa && (
          <View style={[s.card, { borderColor: colors.warning }]}>
            <Text style={[s.cardTitle, { color: colors.warning }]}>Valutazione incompleta</Text>
            <Text style={s.muted}>
              Una valutazione è completa solo con entrambe le sessioni.
              {combined.hasS1 ? '' : ' Manca la Sessione 1 (struttura e movimento).'}
              {combined.hasS2 ? '' : ' Manca la Sessione 2 (recettori e integrazione).'}
            </Text>
          </View>
        )}

        {d.bloccato && (
          <View style={[s.card, { borderColor: colors.error, backgroundColor: colors.error + '12' }]}>
            <Text style={[s.cardTitle, { color: colors.error }]}>⛔ Red flag — nessuna prescrizione</Text>
            <Text style={s.muted}>{d.motivoBlocco}</Text>
          </View>
        )}

        {/* Punteggi delle cinque catene */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Esame del Sistema Stellato</Text>
          {sc.chains.map((c) => (
            <View key={c.key} style={s.chainRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.chainName}>
                  <Text style={{ color: colors.accent, fontWeight: '800' }}>{c.sigla}</Text>  {c.nome}
                </Text>
                <View style={s.barBg}>
                  <View style={[s.barFill, {
                    width: `${c.score ?? 0}%`, backgroundColor: chainColor(c.score),
                  }]} />
                </View>
                {c.asimmetria !== null && (
                  <Text style={s.asym}>
                    asimmetria {c.asimmetria} pt{c.asimmetria >= 15 ? ' · rilevante' : ''}
                  </Text>
                )}
              </View>
              <Text style={[s.chainScore, { color: chainColor(c.score) }]}>
                {c.score === null ? '—' : Math.round(c.score)}
              </Text>
            </View>
          ))}
          <Text style={s.muted}>
            Catena più restrittiva: {sc.catenaPiuRestrittiva ? CHAINS.find((x) => x.key === sc.catenaPiuRestrittiva)?.sigla : '—'}
            {'   ·   '}Dominante: {sc.catenaDominante ? CHAINS.find((x) => x.key === sc.catenaDominante)?.sigla : '—'}
          </Text>
        </View>

        {/* Relazioni della stella */}
        {sc.relazioni.some((r) => r.rilevante) && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Relazioni della stella</Text>
            {sc.relazioni.filter((r) => r.rilevante).map((r) => (
              <View key={`${r.a}${r.b}`} style={{ marginBottom: spacing.sm }}>
                <Text style={s.linkTitle}>
                  {CHAINS.find((c) => c.key === r.a)?.sigla} ↔ {CHAINS.find((c) => c.key === r.b)?.sigla}
                  {r.differenziale !== null ? `  (Δ ${r.differenziale > 0 ? '+' : ''}${r.differenziale})` : ''}
                </Text>
                <Text style={s.muted}>{r.lettura}</Text>
                <Text style={[s.muted, { color: colors.text }]}>{r.conseguenza}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recettore causativo */}
        {d.recettoreCausativo && (
          <View style={[s.card, { borderColor: colors.accent }]}>
            <Text style={s.cardTitle}>Recettore causativo: {d.recettoreCausativo.recettore}</Text>
            <Text style={s.muted}>
              Il test “{d.recettoreCausativo.testNome}” ha modificato il quadro di riferimento.
              Va affrontato per primo, o inviato allo specialista competente.
            </Text>
            <Text style={s.badgeLow}>validazione: {VALIDATION_LABEL[d.recettoreCausativo.validazione as keyof typeof VALIDATION_LABEL]}</Text>
          </View>
        )}

        {/* Priorità */}
        {d.priorita.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Priorità di trattamento</Text>
            {d.priorita.map((p) => (
              <View key={p.ordine} style={{ marginBottom: spacing.sm }}>
                <Text style={s.prioTitle}>{p.ordine}. {p.titolo}</Text>
                <Text style={s.muted}>{p.motivo}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Prescrizione proposta */}
        {d.prescrizione.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Prescrizione proposta dal sistema</Text>
            {d.prescrizione.map((p, i) => (
              <Text key={i} style={s.li}>• {p}</Text>
            ))}
          </View>
        )}

        {/* Misure oggettive */}
        {sc.misureOggettive.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Misure oggettive (confrontabili nel tempo)</Text>
            {sc.misureOggettive.map((m) => (
              <View key={m.testId} style={s.mRow}>
                <Text style={s.muted}>{m.nome}</Text>
                <Text style={s.mVal}>{m.valore} {m.unita || ''}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Consulti */}
        {d.consulti.length > 0 && (
          <View style={[s.card, { borderColor: colors.info }]}>
            <Text style={[s.cardTitle, { color: colors.info }]}>Raccomandazioni di consulto</Text>
            {d.consulti.map((c, i) => <Text key={i} style={s.li}>• {c}</Text>)}
          </View>
        )}

        {sc.esclusiDaDefinire.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Esclusi dal punteggio</Text>
            <Text style={s.muted}>
              Test ancora da definire col Direttore Tecnico: {sc.esclusiDaDefinire.join(', ')}.
              Registrati ma non conteggiati.
            </Text>
          </View>
        )}

        {/* FIRMA OPERATORE — regola d'oro §5 */}
        <View style={[s.card, { borderColor: colors.accent }]}>
          <Text style={s.cardTitle}>Validazione dell'operatore</Text>
          <Text style={s.muted}>
            Il sistema propone, l'operatore decide. Nessuna prescrizione è consegnabile
            senza questa conferma.
          </Text>
          <TextInput
            style={s.nota}
            placeholder="Nota o modifica dell'operatore (facoltativa)"
            placeholderTextColor={colors.textSecondary}
            value={notaFirma}
            onChangeText={setNotaFirma}
            multiline
          />
          <View style={s.row}>
            <TouchableOpacity
              style={[s.btn, s.btnGhost]}
              disabled={saving}
              onPress={() => handleSave(false)}
            >
              <Text style={s.btnGhostTxt}>Salva senza confermare</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, s.btnPrimary, d.bloccato && { opacity: 0.5 }]}
              disabled={saving || d.bloccato}
              onPress={() => handleSave(true)}
            >
              {saving
                ? <ActivityIndicator color={colors.textOnAccent} />
                : <Text style={s.btnPrimaryTxt}>Confermo e firmo</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={s.disclaimer}>
          Screening e orientamento educativo-motorio. Non costituisce atto diagnostico.
          Catalogo v{sc.catalogVersion} · motore v{sc.scoringVersion}.
        </Text>
      </ScrollView>
    );
  }

  // ==================== COMPILAZIONE ====================
  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}>
      <StudentSearchPicker
        students={students}
        selectedId={student?.id}
        onSelect={(id) => setStudent(students.find((x) => x.id === id) || null)}
        label="Allievo"
        placeholder="Cerca allievo…"
      />

      {student && (
        <>
          {/* Selettore sessione */}
          <View style={s.sessRow}>
            {([1, 2] as Sessione[]).map((n) => {
              const done = prevSessions.some((p) => p.sessione === n);
              return (
                <TouchableOpacity
                  key={n}
                  style={[s.sessBtn, sessione === n && s.sessBtnOn]}
                  onPress={() => setSessione(n)}
                >
                  <Text style={[s.sessTitle, sessione === n && s.sessTitleOn]}>
                    Sessione {n} {done ? '✓' : ''}
                  </Text>
                  <Text style={[s.sessSub, sessione === n && { color: colors.textOnAccent }]}>
                    {n === 1 ? 'Struttura e movimento' : 'Recettori e integrazione'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Red flag — solo sessione 1 */}
          {sessione === 1 && (
            <View style={[s.card, flags.length > 0 && { borderColor: colors.error }]}>
              <Text style={s.cardTitle}>Screening red flag</Text>
              <Text style={s.muted}>
                Se positivo, il sistema blocca la prescrizione e propone l'invio.
              </Text>
              {RED_FLAGS.map((f) => {
                const on = flags.includes(f.id);
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[s.flagRow, on && { borderColor: colors.error }]}
                    onPress={() => setFlags((p) =>
                      on ? p.filter((x) => x !== f.id) : [...p, f.id])}
                  >
                    <Ionicons
                      name={on ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={on ? colors.error : colors.textSecondary}
                    />
                    <Text style={[s.flagTxt, on && { color: colors.error }]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Test per blocco */}
          {blocchi.map(([blocco, tests]) => (
            <View key={blocco} style={s.card}>
              <Text style={s.cardTitle}>{BLOCCO_LABEL[blocco]}</Text>
              {tests.map((t) => {
                const open = openTest === t.id;
                const compiled = vals[t.id] && (
                  vals[t.id].value !== undefined || vals[t.id].left !== undefined ||
                  vals[t.id].right !== undefined || vals[t.id].cambia !== undefined
                );
                return (
                  <View key={t.id} style={s.test}>
                    <TouchableOpacity
                      style={s.testHead}
                      onPress={() => setOpenTest(open ? null : t.id)}
                    >
                      <Ionicons
                        name={compiled ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color={compiled ? colors.success : colors.textSecondary}
                      />
                      <Text style={s.testName}>{t.nome}</Text>
                      <Text style={[
                        s.badge,
                        t.validazione === 'alta' && s.badgeHigh,
                        (t.validazione === 'bassa' || t.validazione === 'bassa_media') && s.badgeLowInline,
                      ]}>
                        {VALIDATION_LABEL[t.validazione]}
                      </Text>
                      <Ionicons
                        name={open ? 'chevron-up' : 'chevron-down'}
                        size={16} color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                    {open && (
                      <View style={s.testBody}>
                        <Text style={s.muted}>{t.cosaMisura}</Text>
                        {!!t.comeSiEsegue && <Text style={s.how}>{t.comeSiEsegue}</Text>}
                        {!!t.daDefinire && (
                          <Text style={s.warn}>⚠︎ Da definire: {t.daDefinire} — registrato ma escluso dal punteggio.</Text>
                        )}
                        {!!t.note && <Text style={s.note}>{t.note}</Text>}
                        {renderInput(t)}
                        {t.catene.length > 0 && (
                          <Text style={s.feeds}>
                            Alimenta: {t.catene.map((c) =>
                              `${CHAINS.find((x) => x.key === c.chain)?.sigla} (peso ${c.peso})`).join(' · ')}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))}

          <TouchableOpacity
            style={[s.btn, s.btnPrimary, { marginTop: spacing.md }]}
            onPress={() => setPhase('results')}
          >
            <Text style={s.btnPrimaryTxt}>
              Vedi l'Esame del Sistema Stellato ({results.length} test)
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, marginTop: spacing.md,
  },
  cardTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700', marginBottom: spacing.xs },
  muted: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 19 },
  how: { color: colors.textSecondary, fontSize: fontSize.xs, fontStyle: 'italic', marginTop: 2 },
  note: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 4 },
  warn: { color: colors.warning, fontSize: fontSize.xs, marginTop: 4 },
  sessRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  sessBtn: {
    flex: 1, padding: spacing.sm, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  sessBtnOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  sessTitle: { color: colors.text, fontWeight: '700', fontSize: fontSize.sm },
  sessTitleOn: { color: colors.textOnAccent },
  sessSub: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  flagRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  flagTxt: { color: colors.text, fontSize: fontSize.sm },
  test: { borderTopWidth: 1, borderTopColor: colors.divider, paddingVertical: 6 },
  testHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  testName: { color: colors.text, fontSize: fontSize.sm, flex: 1, fontWeight: '600' },
  badge: {
    fontSize: 10, color: colors.textSecondary, borderWidth: 1, borderColor: colors.border,
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden',
  },
  badgeHigh: { color: colors.success, borderColor: colors.success },
  badgeLowInline: { color: colors.warning, borderColor: colors.warning },
  badgeLow: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 4 },
  testBody: { paddingTop: spacing.xs, gap: 6 },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  col: { gap: 6 },
  opt: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm,
    paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.surfaceLight,
  },
  optOn: { borderColor: colors.accent, backgroundColor: colors.accent + '22' },
  optTxt: { color: colors.textSecondary, fontSize: fontSize.sm },
  optTxtOn: { color: colors.text, fontWeight: '700' },
  sideBox: { flex: 1 },
  sideLab: { color: colors.textSecondary, fontSize: fontSize.xs, marginBottom: 2 },
  num: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm,
    color: colors.text, paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: colors.surfaceLight, fontSize: fontSize.sm,
  },
  feeds: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 4 },
  chainRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  chainName: { color: colors.text, fontSize: fontSize.sm, marginBottom: 4 },
  barBg: { height: 8, backgroundColor: colors.surfaceLight, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  chainScore: { fontSize: fontSize.lg, fontWeight: '800', minWidth: 46, textAlign: 'right' },
  asym: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 3 },
  linkTitle: { color: colors.accent, fontWeight: '700', fontSize: fontSize.sm },
  prioTitle: { color: colors.text, fontWeight: '700', fontSize: fontSize.sm },
  li: { color: colors.text, fontSize: fontSize.sm, lineHeight: 20 },
  mRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  mVal: { color: colors.text, fontWeight: '700', fontSize: fontSize.sm },
  nota: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm,
    color: colors.text, padding: 10, minHeight: 60, marginTop: spacing.sm,
    backgroundColor: colors.surfaceLight, textAlignVertical: 'top',
  },
  btn: { flex: 1, paddingVertical: 13, borderRadius: borderRadius.md, alignItems: 'center', marginTop: spacing.sm },
  btnPrimary: { backgroundColor: colors.accent },
  btnPrimaryTxt: { color: colors.textOnAccent, fontWeight: '700', fontSize: fontSize.sm },
  btnGhost: { borderWidth: 1, borderColor: colors.border },
  btnGhostTxt: { color: colors.textSecondary, fontWeight: '600', fontSize: fontSize.sm },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backTxt: { color: colors.accent, fontSize: fontSize.sm, fontWeight: '600' },
  disclaimer: {
    color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.md,
    textAlign: 'center', lineHeight: 16,
  },
});
