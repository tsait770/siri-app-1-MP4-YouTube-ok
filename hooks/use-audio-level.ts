import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';

interface AudioLevelHookReturn {
  audioLevel: number; // 0-1 range
  isDetecting: boolean;
  startDetection: () => void;
  stopDetection: () => void;
}

export function useAudioLevel(): AudioLevelHookReturn {
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const animationRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const startDetection = useCallback(async () => {
    if (isDetecting) return;

    try {
      setIsDetecting(true);

      if (Platform.OS === 'web') {
        // Web implementation using Web Audio API
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        mediaStreamRef.current = stream;
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;
        
        const microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(new ArrayBuffer(bufferLength));
        dataArrayRef.current = dataArray;
        
        const updateAudioLevel = () => {
          if (!analyserRef.current || !dataArrayRef.current || !isDetecting) {
            return;
          }
          
          analyserRef.current.getByteFrequencyData(dataArrayRef.current);
          
          // 增強音訊分析以提供更好的語音辨識回應
          let sum = 0;
          let peakLevel = 0;
          
          // Calculate both RMS and peak levels for more dynamic response
          for (let i = 0; i < dataArrayRef.current.length; i++) {
            const amplitude = dataArrayRef.current[i] / 255;
            sum += amplitude * amplitude;
            peakLevel = Math.max(peakLevel, amplitude);
          }
          
          const rms = Math.sqrt(sum / dataArrayRef.current.length);
          
          // Combine RMS and peak for more responsive animation
          const combinedLevel = (rms * 0.7) + (peakLevel * 0.3);
          
          // Apply enhanced logarithmic scaling with better sensitivity
          const logLevel = Math.log10(combinedLevel * 19 + 1) / Math.log10(20); // More sensitive scaling
          const smoothedLevel = Math.min(1, Math.max(0, logLevel * 1.2)); // Boost sensitivity
          
          setAudioLevel(smoothedLevel);
          
          if (isDetecting) {
            animationRef.current = requestAnimationFrame(updateAudioLevel);
          }
        };
        
        updateAudioLevel();
      } else {
        // Enhanced mobile simulation with more realistic patterns
        console.log('Mobile audio level detection - using enhanced simulation');
        
        let simulationTime = 0;
        
        const simulateAudioLevel = () => {
          simulationTime += 16; // ~60fps
          
          // Create more realistic breathing patterns
          const breathingCycle = Math.sin(simulationTime * 0.001) * 0.3 + 0.3; // Slow breathing
          const speechBurst = Math.random() > 0.85 ? Math.random() * 0.7 : 0; // Less frequent, more intense bursts
          const microVariations = (Math.random() - 0.5) * 0.1; // Small random variations
          
          const level = Math.min(1, Math.max(0.1, breathingCycle + speechBurst + microVariations));
          
          setAudioLevel(level);
          
          if (isDetecting) {
            animationRef.current = requestAnimationFrame(simulateAudioLevel);
          }
        };
        
        simulateAudioLevel();
      }
    } catch (error) {
      console.error('Error starting audio level detection:', error);
      setIsDetecting(false);
      
      // Enhanced fallback simulation with realistic patterns
      let fallbackTime = 0;
      
      const simulateAudioLevel = () => {
        fallbackTime += 16;
        
        // Create natural audio patterns even in fallback mode
        const baseLevel = 0.2 + Math.sin(fallbackTime * 0.002) * 0.15; // Gentle wave
        const randomSpikes = Math.random() > 0.9 ? Math.random() * 0.5 : 0; // Occasional spikes
        const level = Math.min(1, Math.max(0.1, baseLevel + randomSpikes));
        
        setAudioLevel(level);
        
        if (isDetecting) {
          animationRef.current = requestAnimationFrame(simulateAudioLevel);
        }
      };
      
      simulateAudioLevel();
    }
  }, [isDetecting]);

  const stopDetection = useCallback(() => {
    setIsDetecting(false);
    setAudioLevel(0);
    
    // Cancel animation frame
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Clean up Web Audio API resources
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    // Clear references
    analyserRef.current = null;
    dataArrayRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return {
    audioLevel,
    isDetecting,
    startDetection,
    stopDetection,
  };
}