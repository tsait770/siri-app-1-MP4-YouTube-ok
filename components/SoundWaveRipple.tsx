import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useAudioLevel } from '@/hooks/use-audio-level';
import { useTheme } from '@/hooks/use-theme';

interface SoundWaveRippleProps {
  isActive: boolean;
  size?: number;
}

export function SoundWaveRipple({ isActive, size = 80 }: SoundWaveRippleProps) {
  const { theme } = useTheme();
  const { audioLevel, isDetecting, startDetection, stopDetection } = useAudioLevel();
  
  // Animation values for multiple ripple rings
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;
  const ripple3 = useRef(new Animated.Value(0)).current;
  const opacity1 = useRef(new Animated.Value(0)).current;
  const opacity2 = useRef(new Animated.Value(0)).current;
  const opacity3 = useRef(new Animated.Value(0)).current;
  
  // Base breathing animation
  const breathingScale = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (isActive) {
      startDetection();
      startBreathingAnimation();
      startRippleAnimations();
    } else {
      stopDetection();
      stopAllAnimations();
    }
    
    return () => {
      stopDetection();
      stopAllAnimations();
    };
  }, [isActive]);
  
  // Breathing animation - natural human breathing rhythm (4-6 breaths per minute)
  const startBreathingAnimation = () => {
    const breathingAnimation = Animated.loop(
      Animated.sequence([
        // Inhale - slower and gentler
        Animated.timing(breathingScale, {
          toValue: 1.02, // Further reduced from 1.04 to 1.02 for even gentler effect
          duration: 4500, // Matched with VoiceButton timing
          useNativeDriver: true,
        }),
        // Brief pause at peak
        Animated.timing(breathingScale, {
          toValue: 1.02,
          duration: 500, // 0.5 second pause
          useNativeDriver: true,
        }),
        // Exhale - slower and gentler
        Animated.timing(breathingScale, {
          toValue: 1,
          duration: 5000, // Matched with VoiceButton timing
          useNativeDriver: true,
        }),
        // Brief pause at bottom
        Animated.timing(breathingScale, {
          toValue: 1,
          duration: 1000, // 1 second pause before next breath
          useNativeDriver: true,
        }),
      ])
    );
    breathingAnimation.start();
  };
  
  // Ripple animations - triggered by audio level, synchronized with breathing rhythm
  const startRippleAnimations = () => {
    // Staggered ripple effect - slower to match breathing rhythm
    const createRipple = (scale: Animated.Value, opacity: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 2,
              duration: 2500, // Increased from 1500 to 2500ms for slower ripples
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(opacity, {
                toValue: 0.4, // Reduced from 0.6 to 0.4 for gentler effect
                duration: 300, // Slightly increased fade-in
                useNativeDriver: true,
              }),
              Animated.timing(opacity, {
                toValue: 0,
                duration: 2200, // Increased fade-out duration
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.timing(scale, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };
    
    createRipple(ripple1, opacity1, 0).start();
    createRipple(ripple2, opacity2, 800).start(); // Increased delay for slower rhythm
    createRipple(ripple3, opacity3, 1600).start(); // Increased delay for slower rhythm
  };
  
  const stopAllAnimations = () => {
    ripple1.stopAnimation();
    ripple2.stopAnimation();
    ripple3.stopAnimation();
    opacity1.stopAnimation();
    opacity2.stopAnimation();
    opacity3.stopAnimation();
    breathingScale.stopAnimation();
    
    // Reset values
    ripple1.setValue(0);
    ripple2.setValue(0);
    ripple3.setValue(0);
    opacity1.setValue(0);
    opacity2.setValue(0);
    opacity3.setValue(0);
    breathingScale.setValue(1);
  };
  
  // Dynamic scale based on audio level - further reduced for gentler effect
  const audioScale = 1 + (audioLevel * 0.1); // Scale between 1 and 1.1 (even smaller range)
  const audioOpacity = 0.3 + (audioLevel * 0.2); // Opacity between 0.3 and 0.5 (more subtle)
  
  if (!isActive) {
    return null;
  }
  
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Ripple rings */}
      <Animated.View
        style={[
          styles.ripple,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: '#10b981',
            transform: [{ scale: ripple1 }],
            opacity: opacity1,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ripple,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: '#10b981',
            transform: [{ scale: ripple2 }],
            opacity: opacity2,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ripple,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: '#10b981',
            transform: [{ scale: ripple3 }],
            opacity: opacity3,
          },
        ]}
      />
      
      {/* Central breathing circle */}
      <Animated.View
        style={[
          styles.centralCircle,
          {
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: (size * 0.4) / 2,
            backgroundColor: '#10b981',
            transform: [
              { scale: Animated.multiply(breathingScale, audioScale) },
            ],
            opacity: audioOpacity,
          },
        ]}
      />
      
      {/* Inner glow effect */}
      <Animated.View
        style={[
          styles.innerGlow,
          {
            width: size * 0.6,
            height: size * 0.6,
            borderRadius: (size * 0.6) / 2,
            backgroundColor: '#10b981',
            transform: [
              { scale: Animated.multiply(breathingScale, audioScale * 0.8) },
            ],
            opacity: audioOpacity * 0.3,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  ripple: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  centralCircle: {
    position: 'absolute',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  innerGlow: {
    position: 'absolute',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
});