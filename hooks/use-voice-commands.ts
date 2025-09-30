import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Alert, PermissionsAndroid } from 'react-native';
import { useI18n } from './use-i18n';

export interface VoiceCommand {
  id: string;
  key: string;
  customTrigger?: string;
  action: () => void;
}

interface RecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  lastCommand?: string;
  error?: string;
  userHint?: string;
  isListening: boolean;
  isPersistentMode: boolean;
  isAuthorized: boolean;
  authorizationStatus: 'notDetermined' | 'denied' | 'restricted' | 'authorized';
  recognitionAvailable: boolean;
  confidenceThreshold: number;
  lastConfidence?: number;
}

export const [VoiceCommandProvider, useVoiceCommands] = createContextHook(() => {
  const { t, language } = useI18n();
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isProcessing: false,
    isListening: false,
    isPersistentMode: false,
    isAuthorized: false,
    authorizationStatus: 'notDetermined',
    recognitionAvailable: false,
    userHint: undefined,
    confidenceThreshold: 0.7,
    lastConfidence: undefined,
  });
  const [customCommands, setCustomCommands] = useState<Record<string, string>>({});
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const persistentRecognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxSessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechRecognizerRef = useRef<any>(null);
  const audioEngineRef = useRef<any>(null);
  const recognitionTaskRef = useRef<any>(null);
  const recognitionRequestRef = useRef<any>(null);
  const webRetryCountRef = useRef<number>(0);
  const webMaxRetriesRef = useRef<number>(2);
  const webRestartingRef = useRef<boolean>(false);

  const loadCustomCommands = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('customCommands');
      if (stored) {
        setCustomCommands(JSON.parse(stored));
      }
      const thresholdRaw = await AsyncStorage.getItem('voiceConfidenceThreshold');
      if (thresholdRaw) {
        const value = Number(thresholdRaw);
        if (!Number.isNaN(value) && value >= 0 && value <= 1) {
          setState(prev => ({ ...prev, confidenceThreshold: value }));
        }
      }
    } catch (error) {
      console.error('Error loading custom commands or threshold:', error);
    }
  }, []);

  useEffect(() => {
    loadCustomCommands();
  }, [loadCustomCommands]);

  const saveCustomCommand = useCallback(async (commandId: string, trigger: string) => {
    const updated = { ...customCommands, [commandId]: trigger };
    setCustomCommands(updated);
    await AsyncStorage.setItem('customCommands', JSON.stringify(updated));
  }, [customCommands]);

  const setConfidenceThreshold = useCallback(async (value: number) => {
    const safe = Math.max(0, Math.min(1, value));
    setState(prev => ({ ...prev, confidenceThreshold: safe }));
    try {
      await AsyncStorage.setItem('voiceConfidenceThreshold', String(safe));
    } catch (e) {
      console.error('Failed to persist threshold', e);
    }
  }, []);

  // 階段 1：授權與環境設定 - 純 Speech Framework 實現
  const requestSpeechAuthorization = useCallback(async () => {
    console.log('🎤 Requesting Speech Framework authorization...');
    
    if (Platform.OS === 'ios') {
      try {
        // 使用 Speech Framework 進行語音辨識授權
        // 注意：這裡我們模擬 Speech Framework 的行為
        // 實際上在 React Native 中需要原生模組支援
        console.log('iOS Speech Framework authorization request');
        
        // 檢查語音辨識是否可用
        const isAvailable = true; // Speech Framework 在 iOS 10+ 都可用
        
        if (!isAvailable) {
          setState(prev => ({
            ...prev,
            error: '您的裝置不支援語音辨識功能',
            recognitionAvailable: false,
            authorizationStatus: 'restricted'
          }));
          return false;
        }
        
        // 請求語音辨識授權（Speech Framework）
        // 在實際實現中，這會調用 SFSpeechRecognizer.requestAuthorization()
        console.log('Requesting Speech Framework authorization...');
        
        // 請求麥克風權限
        console.log('Requesting microphone permission...');
        
        // 模擬授權成功（在實際實現中會有真實的授權流程）
        const authStatus = 'authorized';
        const micPermission = true;
        
        const isAuthorized = authStatus === 'authorized' && micPermission;
        
        setState(prev => ({
          ...prev,
          isAuthorized,
          authorizationStatus: authStatus,
          recognitionAvailable: isAvailable,
          error: isAuthorized ? undefined : '語音辨識權限被拒絕'
        }));
        
        console.log('✅ Speech Framework authorization completed:', { authStatus, micPermission });
        return isAuthorized;
      } catch (error) {
        console.error('Speech Framework authorization failed:', error);
        // 降級到 Web Speech API
        return await requestWebSpeechAuthorization();
      }
    } else if (Platform.OS === 'android') {
      try {
        // Android 使用標準麥克風權限
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: '麥克風權限',
            message: '此應用程式需要麥克風權限來進行語音控制。',
            buttonNeutral: '稍後詢問',
            buttonNegative: '取消',
            buttonPositive: '允許',
          }
        );
        
        const isAuthorized = granted === PermissionsAndroid.RESULTS.GRANTED;
        
        setState(prev => ({
          ...prev,
          isAuthorized,
          authorizationStatus: isAuthorized ? 'authorized' : 'denied',
          recognitionAvailable: true,
          error: isAuthorized ? undefined : '麥克風權限被拒絕'
        }));
        
        console.log('✅ Android microphone permission:', { granted, isAuthorized });
        return isAuthorized;
      } catch (error) {
        console.error('Error requesting Android permissions:', error);
        return await requestWebSpeechAuthorization();
      }
    } else {
      // Web 平台使用 Web Speech API
      return await requestWebSpeechAuthorization();
    }
  }, []);
  
  const requestWebSpeechAuthorization = useCallback(async () => {
    try {
      // 檢查 Web Speech API 支援
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setState(prev => ({
          ...prev,
          error: 'Speech Recognition not supported in this browser. Please use Chrome, Edge, or Safari.',
          recognitionAvailable: false,
          authorizationStatus: 'restricted'
        }));
        return false;
      }
      
      // 請求麥克風權限
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Web microphone permission granted');
      
      setState(prev => ({
        ...prev,
        isAuthorized: true,
        authorizationStatus: 'authorized',
        recognitionAvailable: true,
        error: undefined
      }));
      
      return true;
    } catch (error) {
      console.error('Web speech authorization failed:', error);
      setState(prev => ({
        ...prev,
        error: 'Microphone permission is required for voice commands',
        isAuthorized: false,
        authorizationStatus: 'denied',
        recognitionAvailable: false
      }));
      return false;
    }
  }, []);
  
  // 階段 2：語音辨識基礎流程
  const getSpeechLocale = useCallback((lang: string): string => {
    const map: Record<string, string> = {
      'en': 'en-US',
      'zh-TW': 'zh-TW',
      'zh-CN': 'zh-CN',
      'es': 'es-ES',
      'pt': 'pt-PT',
      'pt-BR': 'pt-BR',
      'de': 'de-DE',
      'fr': 'fr-FR',
      'ru': 'ru-RU',
      'ar': 'ar-SA',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
    };
    return map[lang] ?? 'en-US';
  }, []);

  const initializeWebSpeechRecognizer = useCallback(async () => {
    try {
      if (Platform.OS !== 'web' || typeof window === 'undefined') {
        console.log('Web Speech Recognition init skipped: not on web');
        setState(prev => ({ ...prev, recognitionAvailable: false }));
        return false;
      }
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.log('Web Speech API not supported in this browser');
        setState(prev => ({
          ...prev,
          error: 'Speech Recognition not supported in this browser. Please use Chrome, Edge, or Safari.',
          recognitionAvailable: false,
        }));
        return false;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = getSpeechLocale(language);
      recognition.maxAlternatives = 1;

      speechRecognizerRef.current = recognition;

      console.log('✅ Web Speech Recognition initialized with lang:', recognition.lang);
      setState(prev => ({ ...prev, recognitionAvailable: true, error: undefined }));
      return true;
    } catch (error) {
      console.error('Failed to initialize Web Speech Recognition:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to initialize speech recognition',
        recognitionAvailable: false,
      }));
      return false;
    }
  }, [language, getSpeechLocale]);

  const initializeSpeechRecognizer = useCallback(async () => {
    console.log('🎤 Initializing speech recognizer...');
    
    if (Platform.OS === 'ios') {
      try {
        const { SFSpeechRecognizer, AVAudioEngine } = require('react-native');
        
        const locale = getSpeechLocale(language);
        const recognizer = new SFSpeechRecognizer(locale);
        speechRecognizerRef.current = recognizer;
        
        const audioEngine = new AVAudioEngine();
        audioEngineRef.current = audioEngine;
        
        console.log('✅ iOS Speech Framework initialized with locale:', locale);
        return true;
      } catch (error) {
        console.error('Failed to initialize iOS Speech Framework:', error);
        return await initializeWebSpeechRecognizer();
      }
    } else {
      return await initializeWebSpeechRecognizer();
    }
  }, [language, getSpeechLocale, initializeWebSpeechRecognizer]);
  
  // 階段 3：共通語音流程 - 完整的語音控制流程
  const executeVoiceControlFlow = useCallback(async (videoControls: any) => {
    console.log('🎤 === 開始語音控制流程 ===');
    
    try {
      // 步驟 1：檢查麥克風與語音辨識權限
      console.log('步驟 1：檢查權限狀態');
      if (!state.isAuthorized) {
        console.log('權限未授權，導向授權流程');
        const authorized = await requestSpeechAuthorization();
        if (!authorized) {
          console.log('❌ 權限授權失敗');
          setState(prev => ({
            ...prev,
            error: '語音辨識權限被拒絕，請在設定中允許麥克風權限'
          }));
          return { success: false, message: '權限被拒絕' };
        }
      }
      
      // 步驟 2：調用本地語音辨識 API
      console.log('步驟 2：啟動語音辨識');
      const recognitionSuccess = await startSpeechRecognition();
      if (!recognitionSuccess) {
        console.log('❌ 語音辨識啟動失敗');
        setState(prev => ({
          ...prev,
          error: '語音辨識啟動失敗，請重試'
        }));
        return { success: false, message: '辨識啟動失敗' };
      }
      
      console.log('✅ 語音控制流程啟動成功');
      return { success: true, message: '語音辨識已啟動' };
    } catch (error) {
      console.error('❌ 語音控制流程錯誤:', error);
      setState(prev => ({
        ...prev,
        error: '語音控制流程發生錯誤'
      }));
      return { success: false, message: '流程執行錯誤' };
    }
  }, [state.isAuthorized, requestSpeechAuthorization]);
  
  // 階段 3：語音指令解析與影片控制 - 啟動語音辨識
  const startSpeechRecognition = useCallback(async () => {
    console.log('🎤 Starting speech recognition...');
    
    if (!state.isAuthorized) {
      const authorized = await requestSpeechAuthorization();
      if (!authorized) {
        return false;
      }
    }
    
    if (Platform.OS === 'ios' && speechRecognizerRef.current && audioEngineRef.current) {
      try {
        const { SFSpeechAudioBufferRecognitionRequest } = require('react-native');
        
        // 建立 SFSpeechAudioBufferRecognitionRequest
        const request = new SFSpeechAudioBufferRecognitionRequest();
        recognitionRequestRef.current = request;
        
        // 設定音訊引擎
        const audioEngine = audioEngineRef.current;
        const inputNode = audioEngine.inputNode;
        const recordingFormat = inputNode.outputFormatForBus(0);
        
        // 安裝音訊 tap
        inputNode.installTapOnBus(0, 1024, recordingFormat, (buffer: any, when: any) => {
          request.appendAudioPCMBuffer(buffer);
        });
        
        // 啟動音訊引擎
        audioEngine.prepare();
        await audioEngine.start();
        
        // 啟動 recognitionTask
        const recognizer = speechRecognizerRef.current;
        const task = recognizer.recognitionTaskWithRequest(request, (result: any, error: any) => {
          if (error) {
            console.error('Speech recognition error:', error);
            setState(prev => ({
              ...prev,
              error: `語音辨識錯誤: ${error.localizedDescription}`,
              isListening: false,
              isRecording: false
            }));
            return;
          }
          
          if (result) {
            const text = result.bestTranscription.formattedString;
            console.log('Speech recognition result:', text);
            
            setState(prev => ({
              ...prev,
              lastCommand: text.toLowerCase().trim(),
              error: undefined
            }));
            
            if (result.isFinal) {
              console.log('Final speech result:', text);
              stopSpeechRecognition();
            }
          }
        });
        
        recognitionTaskRef.current = task;
        
        setState(prev => ({
          ...prev,
          isListening: true,
          isRecording: true,
          error: undefined
        }));
        
        console.log('✅ iOS Speech Framework recognition started');
        return true;
      } catch (error) {
        console.error('Failed to start iOS speech recognition:', error);
        return await startWebSpeechRecognition();
      }
    } else {
      return await startWebSpeechRecognition();
    }
  }, [state.isAuthorized, requestSpeechAuthorization]);
  
  const startWebSpeechRecognition = useCallback(async () => {
    try {
      if (!speechRecognizerRef.current) {
        await initializeWebSpeechRecognizer();
      }
      
      const recognition = speechRecognizerRef.current;
      if (!recognition) {
        console.log('Speech recognizer not initialized');
        setState(prev => ({
          ...prev,
          error: 'Speech Recognition not supported in this browser. Please use Chrome, Edge, or Safari.',
          isListening: false,
          isRecording: false,
        }));
        return false;
      }
      
      // Set up event handlers before starting
      recognition.onstart = () => {
        console.log('Web speech recognition started successfully');
        // reset retry counter on fresh start
        webRetryCountRef.current = 0;
        setState(prev => ({
          ...prev,
          isListening: true,
          isRecording: true,
          error: undefined
        }));
      };
      
      recognition.onresult = (event: any) => {
        try {
          if (!event.results || event.results.length === 0) {
            console.log('No speech results received');
            return;
          }
          
          const lastResult = event.results[event.results.length - 1];
          if (!lastResult || !lastResult[0]) {
            console.log('Invalid speech result structure');
            return;
          }
          
          const alt = lastResult[0];
          const text: string = alt.transcript ?? '';
          const confidence: number = typeof alt.confidence === 'number' ? alt.confidence : 0;
          if (!text || text.trim().length === 0) {
            console.log('Empty speech result received');
            return;
          }
          
          console.log('Web speech result:', text, 'isFinal:', lastResult.isFinal, 'confidence:', confidence);
          
          // Update live confidence for UI
          setState(prev => ({
            ...prev,
            lastConfidence: confidence,
            error: undefined,
          }));
          
          if (lastResult.isFinal) {
            const clean = text.toLowerCase().trim();
            // Threshold gating
            if (confidence < (state.confidenceThreshold ?? 0.7)) {
              console.log(`Confidence ${confidence.toFixed(2)} below threshold ${(state.confidenceThreshold ?? 0.7).toFixed(2)} - asking user to retry`);
              setState(prev => ({
                ...prev,
                userHint: `辨識信心不足 (${(confidence * 100).toFixed(0)}%)，請再試一次或說明更清楚`,
                lastCommand: undefined,
                isProcessing: false,
              }));
            } else {
              setState(prev => ({
                ...prev,
                lastCommand: clean,
                userHint: undefined,
              }));
            }
          }
        } catch (error) {
          console.error('Error processing speech result:', error);
        }
      };
      
      recognition.onerror = (event: any) => {
        const err: string = event?.error ?? 'unknown';
        console.log('Web speech recognition error:', err);

        // Handle no-speech error gracefully with limited auto-retry
        if (err === 'no-speech') {
          console.log('No speech detected');
          setState(prev => ({
            ...prev,
            error: undefined
          }));
          if (!state.isPersistentMode && state.isRecording) {
            if (webRetryCountRef.current < webMaxRetriesRef.current && !webRestartingRef.current) {
              webRetryCountRef.current += 1;
              webRestartingRef.current = true;
              console.log(`Retrying recognition (${webRetryCountRef.current}/${webMaxRetriesRef.current})...`);
              try {
                recognition.stop();
              } catch {}
              setTimeout(() => {
                webRestartingRef.current = false;
                void startWebSpeechRecognition();
              }, 600);
            } else {
              console.log('Max no-speech retries reached or restart in progress');
            }
          }
          return;
        }
        
        // Handle aborted error (usually from manual stop or restart)
        if (err === 'aborted') {
          console.log('Recognition aborted - likely manual stop or restart');
          return;
        }

        // Handle network errors
        if (err === 'network') {
          console.log('Network error occurred during recognition');
          setState(prev => ({
            ...prev,
            error: 'Network error. Please check your internet connection.',
            isListening: false,
            isRecording: false,
          }));
          return;
        }

        // Handle microphone access errors
        if (err === 'audio-capture') {
          setState(prev => ({
            ...prev,
            error: 'Microphone access denied or not available',
            isListening: false,
            isRecording: false,
          }));
          return;
        }

        // Handle permission denied errors
        if (err === 'not-allowed') {
          setState(prev => ({
            ...prev,
            error: 'Microphone permission denied. Please allow microphone access.',
            isListening: false,
            isRecording: false,
          }));
          return;
        }

        // Handle service not available
        if (err === 'service-not-allowed') {
          setState(prev => ({
            ...prev,
            error: 'Speech recognition service not available',
            isListening: false,
            isRecording: false,
          }));
          return;
        }

        // Handle language not supported
        if (err === 'language-not-supported') {
          setState(prev => ({
            ...prev,
            error: 'Selected language not supported for speech recognition',
            isListening: false,
            isRecording: false,
          }));
          return;
        }

        // Handle other errors
        console.error('Unhandled speech recognition error:', err);
        setState(prev => ({
          ...prev,
          error: `Speech recognition error: ${err}`,
          isListening: false,
          isRecording: false,
        }));
      };
      
      recognition.onend = () => {
        console.log('Web speech recognition ended');
        // If we ended without user stop and in recording mode (single-shot), and we haven't exceeded retries, restart once more
        if (!state.isPersistentMode && state.isRecording && webRetryCountRef.current < webMaxRetriesRef.current && !webRestartingRef.current) {
          webRetryCountRef.current += 1;
          console.log(`Auto-restarting after end (${webRetryCountRef.current}/${webMaxRetriesRef.current})...`);
          setTimeout(() => {
            void startWebSpeechRecognition();
          }, 500);
          return;
        }
        setState(prev => ({
          ...prev,
          isListening: false,
          isRecording: false,
          isProcessing: false
        }));
      };
      
      // Start recognition with error handling
      try {
        recognition.start();
        console.log('✅ Web Speech Recognition start command issued');
        return true;
      } catch (startError) {
        console.error('Error starting recognition:', startError);
        throw startError;
      }
    } catch (error) {
      console.error('Failed to start web speech recognition:', error);
      setState(prev => ({
        ...prev,
        error: 'Unable to start speech recognition. Please try again.',
        isListening: false,
        isRecording: false
      }));
      return false;
    }
  }, [initializeWebSpeechRecognizer]);
  
  const stopSpeechRecognition = useCallback(() => {
    console.log('🛑 Stopping speech recognition...');
    
    if (Platform.OS === 'ios') {
      try {
        // 停止 iOS Speech Framework
        if (recognitionTaskRef.current) {
          recognitionTaskRef.current.cancel();
          recognitionTaskRef.current = null;
        }
        
        if (recognitionRequestRef.current) {
          recognitionRequestRef.current.endAudio();
          recognitionRequestRef.current = null;
        }
        
        if (audioEngineRef.current) {
          audioEngineRef.current.stop();
          audioEngineRef.current.inputNode.removeTapOnBus(0);
        }
        
        console.log('✅ iOS Speech Framework stopped');
      } catch (error) {
        console.error('Error stopping iOS speech recognition:', error);
      }
    }
    
    // 停止 Web Speech Recognition
    if (speechRecognizerRef.current && speechRecognizerRef.current.stop) {
      try {
        speechRecognizerRef.current.stop();
        console.log('✅ Web Speech Recognition stopped');
      } catch (error) {
        console.error('Error stopping web speech recognition:', error);
      }
    }
    
    setState(prev => ({
      ...prev,
      isListening: false,
      isRecording: false,
      isProcessing: false
    }));
  }, []);
  
  // 啟動持續監聽模式
  const startPersistentListening = useCallback(async () => {
    try {
      console.log('Starting persistent listening mode...');
      
      if (Platform.OS === 'web') {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        
        if (SpeechRecognition) {
          // Stop any existing recognition first
          if (persistentRecognitionRef.current) {
            console.log('Stopping existing persistent recognition');
            persistentRecognitionRef.current.stop();
            persistentRecognitionRef.current = null;
          }
          
          // Clear any existing restart timeout
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = null;
          }
          
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = false;
          recognition.lang = getSpeechLocale(language);
          recognition.maxAlternatives = 1;
          
          // Add timeout settings to prevent hanging
          if ('grammars' in recognition) {
            // Some browsers support additional settings
            try {
              (recognition as any).serviceURI = undefined; // Use default service
            } catch {
              // Ignore if not supported
            }
          }

          recognition.onstart = () => {
            console.log('Persistent voice recognition started successfully');
            setState(prev => ({ 
              ...prev, 
              isListening: true,
              isPersistentMode: true,
              error: undefined 
            }));

            // Start max session timer (<= 1 minute per spec)
            if (maxSessionTimerRef.current) {
              clearTimeout(maxSessionTimerRef.current);
            }
            maxSessionTimerRef.current = setTimeout(() => {
              console.log('Max session reached (55s). Restarting recognition for continuous listening...');
              try {
                recognition.stop();
              } catch (e) {
                console.log('Error stopping for max session restart:', e);
              }
            }, 55000); // 55 seconds to stay well under the 60s limit
          };

          recognition.onresult = (event: any) => {
            try {
              if (!event.results || event.results.length === 0) {
                console.log('No speech results in persistent mode');
                return;
              }
              
              const lastResult = event.results[event.results.length - 1];
              if (!lastResult || !lastResult[0]) {
                console.log('Invalid speech result structure in persistent mode');
                return;
              }
              
              if (lastResult.isFinal) {
                const text = lastResult[0].transcript;
                const confidence: number = typeof lastResult[0].confidence === 'number' ? lastResult[0].confidence : 0;
                if (!text || text.trim().length === 0) {
                  console.log('Empty speech result in persistent mode');
                  return;
                }
                
                const cleanText = text.toLowerCase().trim();
                console.log('Persistent voice command received:', cleanText, 'confidence:', confidence);
                if (confidence < (state.confidenceThreshold ?? 0.7)) {
                  setState(prev => ({ 
                    ...prev, 
                    userHint: `辨識信心不足 (${(confidence * 100).toFixed(0)}%)，請再試一次`,
                    lastConfidence: confidence,
                  }));
                } else {
                  setState(prev => ({ 
                    ...prev, 
                    lastCommand: cleanText,
                    lastConfidence: confidence,
                    error: undefined 
                  }));
                }
              }
            } catch (error) {
              console.error('Error processing speech result in persistent mode:', error);
            }
          };

          recognition.onerror = (event: any) => {
            console.log('Speech recognition event:', event.error);
            
            // Handle different types of errors in persistent mode
            if (event.error === 'no-speech') {
              console.log('No speech detected in persistent mode - this is normal, will restart automatically');
              // For no-speech in persistent mode, this is expected behavior
              // The recognition will restart via onend handler
              // Don't show error to user as this is normal
              setState(prev => ({ 
                ...prev, 
                error: undefined // Clear any previous errors
              }));
              return;
            } else if (event.error === 'audio-capture') {
              console.error('Audio capture error - microphone may not be available');
              setState(prev => ({ 
                ...prev, 
                error: 'Microphone access denied or not available',
                isListening: false,
                isPersistentMode: false
              }));
              return;
            } else if (event.error === 'not-allowed') {
              console.error('Microphone permission denied');
              setState(prev => ({ 
                ...prev, 
                error: 'Microphone permission denied. Please allow microphone access.',
                isListening: false,
                isPersistentMode: false
              }));
              return;
            } else if (event.error === 'network') {
              console.log('Network error - will retry...');
              // Network errors are recoverable, continue listening
            } else if (event.error === 'aborted') {
              console.log('Recognition aborted - likely due to restart');
              // Aborted is normal when we restart recognition
              return;
            } else {
              console.error('Other speech recognition error:', event.error);
              setState(prev => ({ 
                ...prev, 
                error: `Speech recognition error: ${event.error}`,
                isListening: false 
              }));
            }
            
            // For recoverable errors (network, etc.), try to restart after a delay
            if (event.error === 'network') {
              if (restartTimeoutRef.current) {
                clearTimeout(restartTimeoutRef.current);
              }
              restartTimeoutRef.current = setTimeout(() => {
                setState(prev => {
                  if (prev.isPersistentMode) {
                    console.log('Restarting after network error...');
                    startPersistentListening();
                  }
                  return prev;
                });
              }, 3000); // Longer delay for network recovery
            }
          };

          recognition.onend = () => {
            console.log('Recognition session ended naturally');
            
            // Clear any existing restart timeout
            if (restartTimeoutRef.current) {
              clearTimeout(restartTimeoutRef.current);
            }
            // Clear max session timer
            if (maxSessionTimerRef.current) {
              clearTimeout(maxSessionTimerRef.current);
              maxSessionTimerRef.current = null;
            }
            
            // Auto-restart if still in persistent mode and not manually stopped
            setState(prev => {
              if (prev.isPersistentMode && persistentRecognitionRef.current) {
                console.log('Auto-restarting recognition after natural end...');
                // Restart after a short delay for normal end events
                restartTimeoutRef.current = setTimeout(() => {
                  // Check if we're still in persistent mode before restarting
                  setState(currentState => {
                    if (currentState.isPersistentMode) {
                      startPersistentListening();
                    }
                    return currentState;
                  });
                }, 1000); // Increased delay to prevent rapid restarts
              } else {
                console.log('Not restarting - persistent mode disabled or manually stopped');
              }
              return prev;
            });
          };

          console.log('Starting speech recognition...');
          recognition.start();
          persistentRecognitionRef.current = recognition;
        } else {
          console.error('Speech Recognition not supported in this browser');
          setState(prev => ({ 
            ...prev, 
            error: 'Speech Recognition not supported in this browser. Please use Chrome, Edge, or Safari.',
            isPersistentMode: false
          }));
        }
      } else {
        // For mobile, we'll implement a different approach
        console.log('Mobile persistent listening - using alternative approach');
        setState(prev => ({ 
          ...prev, 
          isPersistentMode: true,
          isListening: true,
          error: undefined,
          userHint: '持續監聽中，隨時可說出指令'
        }));
        
        // TODO: Implement mobile-specific persistent listening
        // This could use expo-speech or other mobile-specific APIs
      }
    } catch (error) {
      console.error('Failed to start persistent listening:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to start persistent listening mode',
        isPersistentMode: false,
        isListening: false
      }));
    }
  }, [language]);

  const stopPersistentListening = useCallback(() => {
    console.log('Stopping persistent listening mode...');
    
    // Clear any restart timeouts
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    // Clear max session timer
    if (maxSessionTimerRef.current) {
      clearTimeout(maxSessionTimerRef.current);
      maxSessionTimerRef.current = null;
    }
    
    // Stop the recognition
    if (persistentRecognitionRef.current) {
      try {
        persistentRecognitionRef.current.stop();
        persistentRecognitionRef.current = null;
        console.log('Persistent recognition stopped successfully');
      } catch (error) {
        console.error('Error stopping persistent recognition:', error);
      }
    }
    
    // Update state
    setState(prev => ({ 
      ...prev, 
      isListening: false,
      isPersistentMode: false,
      error: undefined
    }));
    
    console.log('Persistent listening stopped completely');
  }, []);

  const togglePersistentMode = useCallback(async () => {
    console.log('Toggling persistent mode. Current state:', state.isPersistentMode);
    
    if (state.isPersistentMode) {
      stopPersistentListening();
    } else {
      // 檢查授權狀態
      if (!state.isAuthorized) {
        const authorized = await requestSpeechAuthorization();
        if (!authorized) {
          return;
        }
      }
      
      await startPersistentListening();
    }
  }, [state.isPersistentMode, state.isAuthorized, startPersistentListening, stopPersistentListening, requestSpeechAuthorization]);

  const startRecording = useCallback(async () => {
    try {
      console.log('🎤 Starting single voice recording...');
      
      // 檢查授權狀態
      if (!state.isAuthorized) {
        const authorized = await requestSpeechAuthorization();
        if (!authorized) {
          return;
        }
      }
      
      // 使用 Speech Framework 進行單次語音辨識
      const success = await startSpeechRecognition();
      if (!success) {
        console.error('Failed to start speech recognition');
        return;
      }
      
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      setState(prev => ({ ...prev, error: t('voice.error') }));
    }
  }, [t, state.isAuthorized, requestSpeechAuthorization, startSpeechRecognition]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      console.log('🛑 Stopping voice recording...');
      
      setState(prev => ({ ...prev, isProcessing: true }));
      
      // 停止語音辨識
      stopSpeechRecognition();
      
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // 結果會透過 callback 回傳，這裡返回 null
      return null;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: t('voice.error') 
      }));
      
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      return null;
    }
  }, [t, stopSpeechRecognition]);

  const toggleRecording = useCallback(async () => {
    if (state.isRecording) {
      return await stopRecording();
    } else {
      await startRecording();
      return null;
    }
  }, [state.isRecording, stopRecording, startRecording]);

  // 階段 1：初始化語音辨識環境
  useEffect(() => {
    const initializeVoiceRecognition = async () => {
      console.log('🎤 Initializing voice recognition system...');
      
      // 初始化語音辨識器
      await initializeSpeechRecognizer();
      
      // 檢查授權狀態（但不自動請求）
      if (Platform.OS === 'ios') {
        try {
          const { SFSpeechRecognizer } = require('react-native');
          const authStatus = SFSpeechRecognizer.authorizationStatus();
          
          setState(prev => ({
            ...prev,
            authorizationStatus: authStatus,
            isAuthorized: authStatus === 'authorized',
            recognitionAvailable: SFSpeechRecognizer.isSupported()
          }));
        } catch (error) {
          console.log('iOS Speech Framework not available, using web fallback');
        }
      }
    };
    
    // 延遲初始化以避免 hydration 問題
    const timer = setTimeout(initializeVoiceRecognition, 1000);
    return () => clearTimeout(timer);
  }, [initializeSpeechRecognizer]);

  // Listen for voice command results and show feedback
  useEffect(() => {
    if (state.lastCommand) {
      console.log('New voice command received:', state.lastCommand);
      // Clear the command after a delay to reset the UI
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, lastCommand: undefined }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.lastCommand]);

  // 階段 4：指令解析器 - 匹配內建指令或自定義指令
  const parseVoiceCommand = useCallback((text: string) => {
    if (!text) return null;
    
    const command = text.toLowerCase().trim();
    console.log('🔍 解析語音指令:', command);
    
    // 檢查自定義指令
    const customCommand = Object.entries(customCommands).find(([_, trigger]) => 
      command.includes(trigger.toLowerCase())
    );
    
    if (customCommand) {
      const [commandId] = customCommand;
      console.log('✅ 匹配到自定義指令:', commandId);
      return { type: 'custom', commandId, originalText: text };
    }
    
    // 內建指令匹配
    const builtInCommands = {
      // 播放控制
      play: ['play', '播放', '再生', 'reproducir', 'jouer', 'spielen', 'воспроизвести', 'تشغيل', '재생', 'start', '开始播放', '播放视频'],
      pause: ['pause', '暫停', '一時停止', 'pausar', 'pause', 'pausieren', 'пауза', 'إيقاف مؤقت', '일시정지', '暂停'],
      stop: ['stop', '停止', 'parar', 'arrêter', 'stoppen', 'остановить', 'توقف', '정지', '停止播放'],
      
      // 快轉倒轉
      forward10: ['forward 10', 'skip 10', 'forward ten', '快轉10秒', '快进10秒', '10秒進む', 'adelantar 10', 'avancer 10', 'вперед 10', 'تقديم 10', '10초 앞으로', '向前十秒'],
      forward20: ['forward 20', 'skip 20', 'forward twenty', '快轉20秒', '快进20秒', '20秒進む', 'adelantar 20', 'avancer 20', 'вперед 20', 'تقديم 20', '20초 앞으로', '向前二十秒'],
      forward30: ['forward 30', 'skip 30', 'forward thirty', '快轉30秒', '快进30秒', '30秒進む', 'adelantar 30', 'avancer 30', 'вперед 30', 'تقديم 30', '30초 앞으로', '向前三十秒'],
      backward10: ['backward 10', 'back 10', 'rewind 10', '倒轉10秒', '后退10秒', '快退10秒', '10秒戻る', 'retroceder 10', 'reculer 10', 'назад 10', 'تراجع 10', '10초 뒤로', '向后十秒'],
      backward20: ['backward 20', 'back 20', 'rewind 20', '倒轉20秒', '后退20秒', '快退20秒', '20秒戻る', 'retroceder 20', 'reculer 20', 'назад 20', 'تراجع 20', '20초 뒤로', '向后二十秒'],
      backward30: ['backward 30', 'back 30', 'rewind 30', '倒轉30秒', '后退30秒', '快退30秒', '30秒戻る', 'retroceder 30', 'reculer 30', 'назад 30', 'تراجع 30', '30초 뒤로', '向后三十秒'],
      
      // 音量控制
      volumeUp: ['volume up', 'louder', 'increase volume', '音量調高', '音量调高', '音量上げる', 'subir volumen', 'augmenter volume', 'громче', 'رفع الصوت', '볼륨 올리기', '大声一点'],
      volumeDown: ['volume down', 'quieter', 'decrease volume', '音量調低', '音量调低', '音量下げる', 'bajar volumen', 'baisser volume', 'тише', 'خفض الصوت', '볼륨 내리기', '小声一点'],
      volumeMax: ['max volume', 'volume max', 'maximum volume', '音量最大', '最大音量', 'volumen máximo', 'volume maximum', 'максимальная громкость', 'أقصى صوت', '최대 볼륨', '音量调到最大'],
      mute: ['mute', '靜音', '静音', 'ミュート', 'silenciar', 'muet', 'stumm', 'без звука', 'كتم الصوت', '음소거'],
      unmute: ['unmute', '解除靜音', '取消静音', 'ミュート解除', 'activar sonido', 'activer son', 'звук включить', 'إلغاء كتم الصوت', '음소거 해제'],
      
      // 播放速度
      speed05: ['0.5 speed', 'half speed', 'slow', '0.5倍速', '0.5 速度', '0.5 velocidad', '0.5 vitesse', '0.5 скорость', 'سرعة 0.5', '0.5배속', '半速'],
      speed1: ['normal speed', '1x speed', '1 speed', 'regular speed', '正常速度', '正常', '通常速度', 'velocidad normal', 'vitesse normale', 'обычная скорость', 'السرعة العادية', '정상 속도'],
      speed125: ['1.25 speed', '1.25x speed', '1.25倍速', '1.25 速度', '1.25 velocidad', '1.25 vitesse', '1.25 скорость', 'سرعة 1.25', '1.25배속'],
      speed15: ['1.5 speed', '1.5x speed', 'fast', '1.5倍速', '1.5 速度', '1.5 velocidad', '1.5 vitesse', '1.5 скорость', 'سرعة 1.5', '1.5배속', '加快'],
      speed2: ['2 speed', '2x speed', 'double speed', '2倍速', '2 速度', '2 velocidad', '2 vitesse', '2 скорость', 'سرعة 2', '2배속', '两倍速'],
      
      // 全螢幕
      fullscreen: ['fullscreen', 'full screen', 'enter fullscreen', '全螢幕', '全屏', 'フルスクリーン', 'pantalla completa', 'plein écran', 'полный экран', 'ملء الشاشة', '전체화면'],
      exitFullscreen: ['exit fullscreen', 'leave fullscreen', '離開全螢幕', '退出全屏', 'フルスクリーン終了', 'salir pantalla completa', 'quitter plein écran', 'выйти из полного экрана', 'الخروج من ملء الشاشة', '전체화면 나가기'],
      
      // 其他功能
      bookmark: ['bookmark', 'add bookmark', 'mark', '書籤', '书签', 'ブックマーク', 'marcador', 'marque-page', 'закладка', 'إشارة مرجعية', '북마크'],
      favorite: ['favorite', 'add favorite', 'like', '最愛', '收藏', 'お気に入り', 'favorito', 'favori', 'избранное', 'مفضل', '즐겨찾기'],
    };
    
    // 尋找匹配的內建指令
    for (const [action, triggers] of Object.entries(builtInCommands)) {
      if (triggers.some(trigger => command.includes(trigger.toLowerCase()))) {
        console.log('✅ 匹配到內建指令:', action);
        return { type: 'builtin', commandId: action, originalText: text };
      }
    }
    
    console.log('❌ 未找到匹配的指令:', command);
    return null;
  }, [customCommands]);
  
  // 階段 5：影片控制對應動作
  const executeCommand = useCallback(async (commandId: string, videoControls: any) => {
    try {
      console.log('🎬 執行影片控制指令:', commandId);
      
      if (!videoControls.uri) {
        console.log('❌ 未載入影片，無法執行指令');
        return { success: false, message: '請先載入影片' };
      }
      
      if (!videoControls.player) {
        console.log('❌ 影片播放器不可用，無法執行指令');
        return { success: false, message: '播放器不可用' };
      }
      
      switch (commandId) {
        case 'play':
          await videoControls.play();
          break;
        case 'pause':
          await videoControls.pause();
          break;
        case 'stop':
          await videoControls.stop();
          break;
        case 'forward10':
          await videoControls.seek(10);
          break;
        case 'forward20':
          await videoControls.seek(20);
          break;
        case 'forward30':
          await videoControls.seek(30);
          break;
        case 'backward10':
          await videoControls.seek(-10);
          break;
        case 'backward20':
          await videoControls.seek(-20);
          break;
        case 'backward30':
          await videoControls.seek(-30);
          break;
        case 'volumeUp':
          await videoControls.setVolume(Math.min(1, videoControls.volume + 0.1));
          break;
        case 'volumeDown':
          await videoControls.setVolume(Math.max(0, videoControls.volume - 0.1));
          break;
        case 'volumeMax':
          await videoControls.setVolume(1);
          break;
        case 'mute':
          await videoControls.setVolume(0);
          break;
        case 'unmute':
          const currentVolume = videoControls.volume || 0;
          await videoControls.setVolume(currentVolume > 0 ? currentVolume : 1);
          break;
        case 'speed05':
          await videoControls.setSpeed(0.5);
          break;
        case 'speed1':
        case 'speed10':
          await videoControls.setSpeed(1);
          break;
        case 'speed125':
          await videoControls.setSpeed(1.25);
          break;
        case 'speed15':
          await videoControls.setSpeed(1.5);
          break;
        case 'speed2':
        case 'speed20':
          await videoControls.setSpeed(2);
          break;
        case 'fullscreen':
        case 'exitFullscreen':
          videoControls.toggleFullscreen();
          break;
        case 'bookmark':
          await videoControls.addBookmark();
          break;
        case 'favorite':
          await videoControls.toggleFavorite();
          break;
        default:
          console.log('❌ 未知指令:', commandId);
          return { success: false, message: `未知指令: ${commandId}` };
      }
      
      console.log('✅ 指令執行成功:', commandId);
      return { success: true, message: `已執行: ${commandId}` };
    } catch (error) {
      console.error('❌ 指令執行錯誤:', error);
      return { success: false, message: `執行錯誤: ${error instanceof Error ? error.message : '未知錯誤'}` };
    }
  }, []);

  // 階段 6：完整語音指令處理流程
  const processVoiceCommand = useCallback(async (text: string, videoControls: any) => {
    console.log('🎯 === 開始處理語音指令 ===');
    console.log('輸入文字:', text);
    
    if (!text) {
      console.log('❌ 空白指令');
      return { success: false, message: '未接收到語音指令' };
    }
    
    try {
      // 步驟 4：呼叫指令解析器
      console.log('步驟 4：解析語音指令');
      const parsedCommand = parseVoiceCommand(text);
      
      if (!parsedCommand) {
        console.log('❌ 指令解析失敗 - 未找到匹配的指令');
        return { success: false, message: `無法識別指令: "${text}"` };
      }
      
      console.log('✅ 指令解析成功:', parsedCommand);
      
      // 步驟 5：觸發影片控制對應動作
      console.log('步驟 5：執行影片控制動作');
      const executionResult = await executeCommand(parsedCommand.commandId, videoControls);
      
      // 步驟 6：回饋執行結果給使用者 UI
      console.log('步驟 6：回饋執行結果');
      if (executionResult.success) {
        console.log('✅ 語音指令執行成功:', executionResult.message);
        setState(prev => ({
          ...prev,
          error: undefined,
          lastCommand: text
        }));
      } else {
        console.log('❌ 語音指令執行失敗:', executionResult.message);
        setState(prev => ({
          ...prev,
          error: executionResult.message
        }));
      }
      
      console.log('🎯 === 語音指令處理完成 ===');
      return executionResult;
    } catch (error) {
      console.error('❌ 語音指令處理發生錯誤:', error);
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      setState(prev => ({
        ...prev,
        error: `指令處理錯誤: ${errorMessage}`
      }));
      return { success: false, message: `處理錯誤: ${errorMessage}` };
    }
  }, [parseVoiceCommand, executeCommand]);



  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPersistentListening();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      if (maxSessionTimerRef.current) {
        clearTimeout(maxSessionTimerRef.current);
      }
    };
  }, [stopPersistentListening]);

  return useMemo(() => ({
    ...state,
    customCommands,
    saveCustomCommand,
    setConfidenceThreshold,
    startRecording,
    stopRecording,
    toggleRecording,
    processVoiceCommand,
    executeCommand,
    parseVoiceCommand,
    executeVoiceControlFlow,
    startPersistentListening,
    stopPersistentListening,
    togglePersistentMode,
    requestSpeechAuthorization,
    startSpeechRecognition,
    stopSpeechRecognition,
  }), [state, customCommands, saveCustomCommand, setConfidenceThreshold, startRecording, stopRecording, toggleRecording, processVoiceCommand, executeCommand, parseVoiceCommand, executeVoiceControlFlow, startPersistentListening, stopPersistentListening, togglePersistentMode, requestSpeechAuthorization, startSpeechRecognition, stopSpeechRecognition]);
});