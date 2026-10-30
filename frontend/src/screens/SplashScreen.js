import React, { useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const LOGO_SIZE = 120;
const HOLD_MS = 1400; // how long the logo stays after it appears

export default function SplashScreen({ onGetStarted }) {
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(1)).current;

  // Keep the latest callback without restarting the animation
  const doneRef = useRef(onGetStarted);
  doneRef.current = onGetStarted;

  useEffect(() => {
    let cancelled = false;
    let rings;
    let timer;

    const finish = (delay) => {
      timer = setTimeout(() => {
        if (cancelled) return;
        Animated.timing(exit, {
          toValue: 0,
          duration: 350,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }).start(() => {
          if (!cancelled && doneRef.current) doneRef.current();
        });
      }, delay);
    };

    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;

      // Reduced motion: logo simply appears, then moves on
      if (reduce) {
        opacity.setValue(1);
        scale.setValue(1);
        finish(1200);
        return;
      }

      // 1. Logo fades and springs into place
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();

      // 2. Two soft rings ripple outward behind the logo
      const ripple = (value, delay) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(value, {
              toValue: 1,
              duration: 1800,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(value, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        );

      rings = Animated.parallel([ripple(ring1, 500), ripple(ring2, 1300)]);
      rings.start();

      // 3. Hold, fade out, hand off
      finish(HOLD_MS + 700);
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (rings) rings.stop();
    };
  }, []);

  const ringStyle = (value) => ({
    opacity: value.interpolate({
      inputRange: [0, 1],
      outputRange: [0.35, 0],
    }),
    transform: [
      {
        scale: value.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 2.1],
        }),
      },
    ],
  });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FF" />
      <LinearGradient
        colors={["#F4F7FF", "#FFFFFF", "#EEF4FF"]}
        style={styles.container}
      >
        <Animated.View style={[styles.center, { opacity: exit }]}>
          <View style={styles.stage}>
            <Animated.View style={[styles.ring, ringStyle(ring1)]} />
            <Animated.View style={[styles.ring, ringStyle(ring2)]} />

            <Animated.Image
              source={require("../../assets/jobify.png")}
              style={[styles.logo, { opacity, transform: [{ scale }] }]}
              accessibilityLabel="Jobify"
            />
          </View>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F7FF" },
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  stage: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 30,
  },
  ring: {
    position: "absolute",
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#1F5EFF",
  },
});