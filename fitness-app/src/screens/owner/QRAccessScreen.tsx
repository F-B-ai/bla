import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../../config/theme';
import { getTodayCheckins, getRecentCheckins, CheckinRecord } from '../../services/checkinService';
import QRCode from 'qrcode';

const CHECKIN_URL = 'https://essere-3fe6f.web.app/?checkin=ESSERE_ACCESS';

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
};

const groupByDate = (records: CheckinRecord[]): Record<string, CheckinRecord[]> => {
  const groups: Record<string, CheckinRecord[]> = {};
  for (const r of records) {
    const key = r.timestamp.toLocaleDateString('it-IT');
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  return groups;
};

export const QRAccessScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [todayCheckins, setTodayCheckins] = useState<CheckinRecord[]>([]);
  const [recentCheckins, setRecentCheckins] = useState<CheckinRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecent, setShowRecent] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(CHECKIN_URL, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    }).then(setQrDataUrl).catch(() => {});
  }, []);

  const loadCheckins = useCallback(async () => {
    try {
      setLoading(true);
      const [today, recent] = await Promise.all([
        getTodayCheckins(),
        getRecentCheckins(7),
      ]);
      setTodayCheckins(today);
      setRecentCheckins(recent);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCheckins();
  }, [loadCheckins]);

  const handlePrint = () => {
    if (Platform.OS !== 'web') return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Check-in ESSĒRE</title>
        <style>
          @page { size: A4; margin: 0; }
          body {
            margin: 0;
            padding: 40px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #fff;
            box-sizing: border-box;
          }
          .brand {
            font-size: 48px;
            font-weight: 800;
            letter-spacing: 8px;
            color: #0A0A0A;
            margin-bottom: 8px;
          }
          .subtitle {
            font-size: 18px;
            color: #666;
            margin-bottom: 40px;
            letter-spacing: 2px;
          }
          .qr-container {
            padding: 24px;
            border: 3px solid #0A0A0A;
            border-radius: 20px;
            margin-bottom: 32px;
          }
          .qr-container img {
            width: 300px;
            height: 300px;
            display: block;
          }
          .instructions {
            text-align: center;
            max-width: 400px;
          }
          .instructions h2 {
            font-size: 22px;
            color: #D40000;
            margin-bottom: 16px;
          }
          .step {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
            font-size: 16px;
            color: #333;
          }
          .step-num {
            width: 32px;
            height: 32px;
            border-radius: 16px;
            background: #D40000;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
            flex-shrink: 0;
          }
          .footer {
            margin-top: 40px;
            font-size: 12px;
            color: #999;
            letter-spacing: 1px;
          }
        </style>
      </head>
      <body>
        <div class="brand">ESSĒRE</div>
        <div class="subtitle">MIND MOVEMENT LAB</div>
        <div class="qr-container">
          <img src="${qrDataUrl}" alt="QR Check-in" />
        </div>
        <div class="instructions">
          <h2>Registra il tuo accesso</h2>
          <div class="step">
            <div class="step-num">1</div>
            <span>Apri la fotocamera del telefono</span>
          </div>
          <div class="step">
            <div class="step-num">2</div>
            <span>Inquadra il QR code</span>
          </div>
          <div class="step">
            <div class="step-num">3</div>
            <span>Accesso registrato!</span>
          </div>
        </div>
        <div class="footer">ESSĒRE — MIND MOVEMENT LAB</div>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const grouped = groupByDate(recentCheckins);

  return (
    <View style={styles.container}>
      <View style={{ ...styles.header, paddingTop: insets.top + spacing.md }}>
        <Text style={styles.headerTitle}>QR Accesso</Text>
        {Platform.OS === 'web' && qrDataUrl && (
          <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
            <Ionicons name="print" size={20} color={colors.accent} />
            <Text style={styles.printBtnText}>Stampa</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* QR Code */}
        <View style={styles.qrSection}>
          <View style={styles.qrCard}>
            {qrDataUrl ? (
              <Image source={{ uri: qrDataUrl }} style={styles.qrImage} resizeMode="contain" />
            ) : (
              <ActivityIndicator size="large" color={colors.accent} />
            )}
          </View>
          <Text style={styles.qrLabel}>Scansiona per registrare l'accesso</Text>
          <Text style={styles.qrSublabel}>
            Gli allievi inquadrano il QR con la fotocamera del telefono
          </Text>
        </View>

        {/* Today's checkins */}
        <View style={styles.sectionHeader}>
          <Ionicons name="today" size={20} color={colors.accent} />
          <Text style={styles.sectionTitle}>Accessi Oggi</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{todayCheckins.length}</Text>
          </View>
          <TouchableOpacity onPress={loadCheckins} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.lg }} />
        ) : todayCheckins.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="log-in-outline" size={32} color={colors.textLight} />
            <Text style={styles.emptyText}>Nessun accesso oggi</Text>
          </View>
        ) : (
          <View style={styles.checkinList}>
            {todayCheckins.map((c) => (
              <View key={c.id} style={styles.checkinItem}>
                <View style={styles.checkinAvatar}>
                  <Text style={styles.checkinAvatarText}>
                    {c.studentName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </Text>
                </View>
                <Text style={styles.checkinName}>{c.studentName}</Text>
                <Text style={styles.checkinTime}>{formatTime(c.timestamp)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recent checkins toggle */}
        <TouchableOpacity
          style={styles.recentToggle}
          onPress={() => setShowRecent(!showRecent)}
          activeOpacity={0.7}
        >
          <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.recentToggleText}>Ultimi 7 giorni</Text>
          <Ionicons
            name={showRecent ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {showRecent && (
          <View style={styles.recentSection}>
            {Object.entries(grouped).map(([dateStr, records]) => (
              <View key={dateStr} style={styles.dayGroup}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayLabel}>{dateStr}</Text>
                  <Text style={styles.dayCount}>{records.length} accessi</Text>
                </View>
                {records.map((c) => (
                  <View key={c.id} style={styles.checkinItemSmall}>
                    <Text style={styles.checkinNameSmall}>{c.studentName}</Text>
                    <Text style={styles.checkinTimeSmall}>{formatTime(c.timestamp)}</Text>
                  </View>
                ))}
              </View>
            ))}
            {Object.keys(grouped).length === 0 && (
              <Text style={styles.emptyText}>Nessun accesso negli ultimi 7 giorni</Text>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
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
  headerTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  printBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.accent,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },

  qrSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  qrLabel: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  qrSublabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  countBadge: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  countText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: '#fff',
  },
  refreshBtn: {
    padding: spacing.xs,
  },

  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textLight,
  },

  checkinList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  checkinItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.md,
  },
  checkinAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkinAvatarText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.accent,
  },
  checkinName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  checkinTime: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  recentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  recentToggleText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },

  recentSection: {
    gap: spacing.md,
  },
  dayGroup: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surfaceLight,
  },
  dayLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  dayCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  checkinItemSmall: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  checkinNameSmall: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  checkinTimeSmall: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
});
