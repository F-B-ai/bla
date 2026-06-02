import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize } from '../../config/theme';

export const OfflineIndicator: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    let wasOffline = false;

    const goOffline = () => {
      wasOffline = true;
      setIsOffline(true);
      setShowReconnected(false);
    };

    const goOnline = () => {
      setIsOffline(false);
      if (wasOffline) {
        wasOffline = false;
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 3000);
      }
    };

    if (!navigator.onLine) {
      wasOffline = true;
      setIsOffline(true);
    }

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!isOffline && !showReconnected) return null;

  return (
    <View style={[styles.bar, isOffline ? styles.offline : styles.online]}>
      <Ionicons
        name={isOffline ? 'cloud-offline-outline' : 'checkmark-circle-outline'}
        size={16}
        color="#FFF"
      />
      <Text style={styles.text}>
        {isOffline ? 'Sei offline — i dati saranno sincronizzati al ritorno' : 'Connessione ripristinata'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  offline: {
    backgroundColor: colors.warning,
  },
  online: {
    backgroundColor: colors.success,
  },
  text: {
    color: '#FFF',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
