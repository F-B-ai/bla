import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Ellipse, Text as SvgText, Defs, LinearGradient, Stop, G } from 'react-native-svg';

interface AcademyLogoProps {
  size?: number;
}

const GOLD = '#C5A55A';
const GOLD_LIGHT = '#E8D5A0';
const GOLD_DARK = '#8B7335';
const RED = '#D40000';
const RED_DARK = '#8B0000';

export const AcademyLogo: React.FC<AcademyLogoProps> = ({ size = 160 }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <LinearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={GOLD_LIGHT} />
            <Stop offset="50%" stopColor={GOLD} />
            <Stop offset="100%" stopColor={GOLD_DARK} />
          </LinearGradient>
          <LinearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FF1A1A" />
            <Stop offset="50%" stopColor={RED} />
            <Stop offset="100%" stopColor={RED_DARK} />
          </LinearGradient>
          <LinearGradient id="globeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#2A2A2A" />
            <Stop offset="50%" stopColor="#1A1A1A" />
            <Stop offset="100%" stopColor="#0A0A0A" />
          </LinearGradient>
        </Defs>

        {/* Outer gold orbital rings */}
        <Ellipse
          cx="100" cy="100" rx="82" ry="38"
          stroke="url(#goldGrad)" strokeWidth="3" fill="none"
          transform="rotate(-30, 100, 100)"
          opacity={0.9}
        />
        <Ellipse
          cx="100" cy="100" rx="82" ry="38"
          stroke="url(#goldGrad)" strokeWidth="3" fill="none"
          transform="rotate(30, 100, 100)"
          opacity={0.9}
        />
        <Ellipse
          cx="100" cy="100" rx="82" ry="38"
          stroke="url(#goldGrad)" strokeWidth="2.5" fill="none"
          transform="rotate(90, 100, 100)"
          opacity={0.8}
        />

        {/* Globe background */}
        <Circle cx="100" cy="100" r="48" fill="url(#globeGrad)" />
        <Circle cx="100" cy="100" r="48" stroke={GOLD_DARK} strokeWidth="1.5" fill="none" opacity={0.6} />

        {/* Globe grid lines */}
        <Ellipse cx="100" cy="100" rx="48" ry="20" stroke={GOLD_DARK} strokeWidth="0.5" fill="none" opacity={0.3} />
        <Ellipse cx="100" cy="100" rx="20" ry="48" stroke={GOLD_DARK} strokeWidth="0.5" fill="none" opacity={0.3} />
        <Path d="M 52 100 L 148 100" stroke={GOLD_DARK} strokeWidth="0.5" opacity={0.3} />
        <Path d="M 100 52 L 100 148" stroke={GOLD_DARK} strokeWidth="0.5" opacity={0.3} />

        {/* Continent-like gold shapes */}
        <Path
          d="M 78 78 C 82 72, 92 70, 98 74 C 104 78, 108 82, 106 88 C 104 92, 96 94, 90 90 C 84 86, 76 84, 78 78Z"
          fill={GOLD_DARK} opacity={0.4}
        />
        <Path
          d="M 108 96 C 112 92, 120 90, 126 94 C 130 98, 128 106, 122 110 C 116 114, 108 112, 106 106 C 104 100, 106 98, 108 96Z"
          fill={GOLD_DARK} opacity={0.35}
        />
        <Path
          d="M 72 98 C 76 94, 84 96, 86 102 C 88 108, 84 114, 78 116 C 72 118, 66 112, 68 106 C 70 100, 72 98, 72 98Z"
          fill={GOLD_DARK} opacity={0.3}
        />

        {/* FB Letters */}
        <G>
          {/* F letter */}
          <SvgText
            x="82" y="115"
            fill="url(#redGrad)"
            fontSize="42"
            fontWeight="900"
            textAnchor="middle"
            fontFamily="Arial Black, Arial, sans-serif"
          >
            F
          </SvgText>
          {/* B letter */}
          <SvgText
            x="118" y="115"
            fill="url(#redGrad)"
            fontSize="42"
            fontWeight="900"
            textAnchor="middle"
            fontFamily="Arial Black, Arial, sans-serif"
          >
            B
          </SvgText>
        </G>

        {/* Heartbeat line across the middle */}
        <Path
          d="M 75 98 L 85 98 L 90 88 L 95 108 L 100 92 L 105 104 L 110 98 L 125 98"
          stroke={RED}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.8}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
