import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize } from '../../config/theme';

export const OfflineIndicator: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const slideAnim = useRef(new Animated.Value(-40)).current;
  const wasOffline = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const goOffline = () => {
      wasOffline.current = true;
      setIsOffline(true);
      setShowReconnected(false);
    };

    const goOnline = () => {
      setIsOffline(false);
      if (wasOffline.current) {
        wasOffline.current = false;
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 3000);
      }
    };

    if (!navigator.onLine) {
      wasOffline.current = true;
      setIsOffline(true);
    }

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  const shouldShow = isOffline || showReconnected;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: shouldShow ? 0 : -40,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [shouldShow, slideAnim]);

  if (!shouldShow && slideAnim._value !== 0) return null;

  return (
    <Animated.View
      style={[
        styles.bar,
        isOffline ? styles.offline : styles.online,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Ionicons
        name={isOffline ? 'cloud-offline-outline' : 'checkmark-circle-outline'}
        size={16}
        color="#FFF"
      />
      <Text style={styles.text}>
        {isOffline ? 'Sei offline — i dati saranno sincronizzati al ritorno' : 'Connessione ripristinata'}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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
