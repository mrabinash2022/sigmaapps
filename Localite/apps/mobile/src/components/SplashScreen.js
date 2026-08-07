import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

function LoadingDots({ dotStyle }) {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (value, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ]),
      );

    const a1 = pulse(dot1, 0);
    const a2 = pulse(dot2, 150);
    const a3 = pulse(dot3, 300);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.dotsRow}>
      {[dot1, dot2, dot3].map((opacity, i) => (
        <Animated.View key={i} style={[dotStyle, { opacity }]} />
      ))}
    </View>
  );
}

export default function SplashScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(16)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const intro = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(titleY, { toValue: 0, duration: 450, useNativeDriver: true }),
        Animated.timing(taglineOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]),
    ]);
    intro.start();

    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    const breatheDelay = setTimeout(() => breathe.start(), 600);
    return () => {
      intro.stop();
      breathe.stop();
      clearTimeout(breatheDelay);
    };
  }, [logoOpacity, logoScale, titleOpacity, titleY, taglineOpacity, pulse]);

  const combinedScale = Animated.multiply(logoScale, pulse);

  return (
    <View style={styles.screen}>
      <View style={styles.glow} />
      <Animated.View
        style={[
          styles.logoWrap,
          { opacity: logoOpacity, transform: [{ scale: combinedScale }] },
        ]}
      >
        <Image
          source={require('../../assets/localite-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Localite logo"
        />
      </Animated.View>

      <Animated.Text
        style={[
          styles.title,
          { opacity: titleOpacity, transform: [{ translateY: titleY }] },
        ]}
      >
        Localite
      </Animated.Text>

      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        Your neighborhood stores
      </Animated.Text>

      <LoadingDots dotStyle={styles.dot} />
    </View>
  );
}

const styles = StyleSheet.create({
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
});

function createStyles(colors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.headerBg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    glow: {
      position: 'absolute',
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: 'rgba(255,255,255,0.08)',
      top: '28%',
    },
    logoWrap: {
      width: 120,
      height: 120,
      borderRadius: 28,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.brandDark,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 10,
      marginBottom: 24,
    },
    logo: {
      width: 88,
      height: 88,
    },
    title: {
      fontSize: 36,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    tagline: {
      fontSize: 15,
      color: 'rgba(255,255,255,0.85)',
      fontWeight: '500',
      marginBottom: 32,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#fff',
    },
  });
}
