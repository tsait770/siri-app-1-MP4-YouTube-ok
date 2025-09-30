import { Mic, MicOff, CheckCircle, XCircle, Headphones, Power, PowerOff } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  View, 
  Text, 
  Animated,
  ActivityIndicator,
  useWindowDimensions
} from 'react-native';
import { useVoiceCommands } from '@/hooks/use-voice-commands';
import { useVideoPlayer } from '@/hooks/use-video-player';

import { SoundWaveRipple } from './SoundWaveRipple';

export function VoiceButton() {

  const {
    isRecording,
    isProcessing,
    isListening,
    isPersistentMode,
    lastCommand,
    error,
    userHint,
    isAuthorized,
    authorizationStatus,
    recognitionAvailable,
    toggleRecording,
    togglePersistentMode,
    processVoiceCommand,
    executeVoiceControlFlow,
    requestSpeechAuthorization,
  } = useVoiceCommands();
  const videoControls = useVideoPlayer();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const toggleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const breathingAnim = useRef(new Animated.Value(1)).current;
  const [commandResult, setCommandResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (lastCommand) {
      const processCommand = async () => {
        console.log('開始完整語音控制流程');
        console.log('接收到語音指令:', lastCommand);
        
        try {
          const result = await processVoiceCommand(lastCommand, videoControls);
          
          if (result.success) {
            console.log('語音指令執行成功:', result.message);
            setCommandResult({ 
              success: true, 
              message: `執行成功: "${lastCommand}"` 
            });
          } else {
            console.log('語音指令執行失敗:', result.message);
            setCommandResult({ 
              success: false, 
              message: `執行失敗: "${lastCommand}" - ${result.message}` 
            });
          }
        } catch (error) {
          console.error('語音控制流程發生錯誤:', error);
          setCommandResult({ 
            success: false, 
            message: `處理錯誤: "${lastCommand}"` 
          });
        }
        
        console.log('語音控制流程完成');
        
        const timer = setTimeout(() => setCommandResult(null), 4000);
        return timer;
      };
      
      const timer = processCommand();
      return () => {
        if (timer instanceof Promise) {
          timer.then(clearTimeout);
        }
      };
    }
  }, [lastCommand, processVoiceCommand, videoControls]);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  useEffect(() => {
    const startBreathingAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathingAnim, {
            toValue: 1.03,
            duration: 4500,
            useNativeDriver: true,
          }),
          Animated.timing(breathingAnim, {
            toValue: 1.03,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(breathingAnim, {
            toValue: 1,
            duration: 5000,
            useNativeDriver: true,
          }),
          Animated.timing(breathingAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    if (isPersistentMode || isListening || isRecording) {
      startBreathingAnimation();
    } else {
      breathingAnim.setValue(1);
    }
  }, [isPersistentMode, isListening, isRecording, breathingAnim]);

  useEffect(() => {
    Animated.timing(toggleAnim, {
      toValue: isPersistentMode ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isPersistentMode, toggleAnim]);

  useEffect(() => {
    if (isPersistentMode && isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      glowAnim.setValue(0);
    }
  }, [isPersistentMode, isListening, glowAnim]);

  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;
  const isMediumScreen = width >= 768 && width < 1024;

  return (
    <View style={[styles.container, isSmallScreen && styles.containerSmall]}>
      <View style={[styles.authorizationContainer, isSmallScreen && styles.authorizationContainerSmall]}>
        <TouchableOpacity
          style={[
            styles.authorizationButton,
            isSmallScreen && styles.authorizationButtonSmall,
            isAuthorized && styles.authorizationButtonEnabled
          ]}
          onPress={async () => {
            console.log('步驟 1：使用者點擊語音控制按鈕');
            console.log('開始權限檢查與授權流程...');
            
            const result = await requestSpeechAuthorization();
            if (result) {
              console.log('權限授權成功，語音控制已準備就緒');
            } else {
              console.log('權限授權失敗');
            }
          }}
          activeOpacity={0.8}
          disabled={isAuthorized}
        >
          <View style={[styles.authorizationIcon, {
            backgroundColor: isAuthorized ? '#10b98120' : '#6b728040',
            borderColor: isAuthorized ? '#10b98140' : '#6b728060'
          }]}>
            <Mic color={isAuthorized ? '#10b981' : '#6b7280'} size={isSmallScreen ? 20 : 24} />
          </View>
          
          <View style={styles.authorizationLabelContainer}>
            <Text style={[
              styles.authorizationLabel,
              isSmallScreen && styles.authorizationLabelSmall,
              isAuthorized && styles.authorizationLabelEnabled
            ]}>
              語音辨識權限
            </Text>
            <Text style={[
              styles.authorizationStatus,
              isSmallScreen && styles.authorizationStatusSmall
            ]}>
              {authorizationStatus === 'authorized' ? '已授權 - 可使用語音控制' :
               authorizationStatus === 'denied' ? '權限被拒絕 - 請在設定中允許' :
               authorizationStatus === 'restricted' ? '裝置不支援語音辨識' :
               '點擊授權麥克風權限'}
            </Text>
          </View>
          
          <View style={[styles.statusIndicator, {
            backgroundColor: isAuthorized ? '#10b981' : 
                           authorizationStatus === 'denied' ? '#ef4444' : '#6b7280'
          }]} />
        </TouchableOpacity>
        
        <Text style={[
          styles.authorizationDescription,
          isSmallScreen && styles.authorizationDescriptionSmall
        ]}>
          {isAuthorized ? 
            '語音控制已準備就緒。支援多語言指令：「播放」、「暫停」、「快轉10秒」、「音量調高」、「全螢幕」等。' :
            authorizationStatus === 'denied' ? 
              '麥克風權限被拒絕。請前往系統設定 > 隱私權 > 麥克風，允許此應用程式使用麥克風。' :
            authorizationStatus === 'restricted' ? 
              '您的裝置不支援語音辨識功能，或功能被限制使用。' :
            '點擊上方按鈕授權麥克風權限，開始使用語音控制功能。'
          }
        </Text>
      </View>
      
      <View style={[styles.persistentContainer, isSmallScreen && styles.persistentContainerSmall]} testID="persistent-mode-toggle">
        <TouchableOpacity
          style={[
            styles.toggleButton,
            isSmallScreen && styles.toggleButtonSmall
          ]}
          onPress={async () => {
            console.log('切換持續語音控制模式');
            console.log('當前狀態:', { isPersistentMode, isAuthorized });
            
            if (!isAuthorized) {
              console.log('權限未授權，無法啟用持續模式');
              setCommandResult({ 
                success: false, 
                message: '請先授權語音辨識權限' 
              });
              return;
            }
            
            await togglePersistentMode();
          }}
          activeOpacity={0.8}
          disabled={!isAuthorized}
        >
          <Animated.View style={[
            styles.toggleTrack,
            isSmallScreen && styles.toggleTrackSmall,
            {
              backgroundColor: toggleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['rgba(107, 114, 128, 0.3)', '#10b981']
              }),
              opacity: isAuthorized ? 1 : 0.5
            }
          ]}>
            <Animated.View style={[
              styles.toggleThumb,
              isSmallScreen && styles.toggleThumbSmall,
              {
                transform: [{
                  translateX: toggleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [2, isSmallScreen ? 26 : 32]
                  })
                }]
              }
            ]}>
              {isPersistentMode ? (
                <Power color="#10b981" size={isSmallScreen ? 12 : 14} />
              ) : (
                <PowerOff color="#6b7280" size={isSmallScreen ? 12 : 14} />
              )}
            </Animated.View>
            
            {isPersistentMode && isListening && (
              <Animated.View style={[
                styles.toggleGlow,
                isSmallScreen && styles.toggleGlowSmall,
                {
                  opacity: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 0.8]
                  }),
                  transform: [{
                    scale: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.1]
                    })
                  }]
                }
              ]} />
            )}
          </Animated.View>
          
          <View style={styles.toggleLabelContainer}>
            <Text style={[
              styles.toggleLabel,
              isPersistentMode && styles.toggleLabelActive,
              isSmallScreen && styles.toggleLabelSmall,
              !isAuthorized && styles.toggleLabelDisabled
            ]}>
              持續語音監聽
            </Text>
            <Text style={[
              styles.toggleStatus,
              isSmallScreen && styles.toggleStatusSmall
            ]}>
              {!isAuthorized ? '需要先授權權限' :
               isPersistentMode ? 
                 (isListening ? '正在監聽語音指令' : '啟動中...') : 
                 '點擊啟用持續監聽模式'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={[styles.buttonContainer, isSmallScreen && styles.buttonContainerSmall]}>
        <View style={styles.voiceButtonContainer}>
          <Animated.View style={[
            styles.buttonWrapper, 
            { 
              transform: [
                { scale: isRecording ? pulseAnim : breathingAnim }
              ] 
            }
          ]}>
            <TouchableOpacity testID="voice-button"
              style={[
                styles.button,
                isRecording && styles.recording,
                isProcessing && styles.processing,
                isListening && styles.listening,
                isSmallScreen && styles.buttonSmall,
                isMediumScreen && styles.buttonMedium
              ]}
              onPress={async () => {
                console.log('語音控制按鈕被點擊');
                
                if (isPersistentMode) {
                  console.log('持續模式已啟用，忽略手動錄音');
                  return;
                }
                
                if (isProcessing) {
                  console.log('正在處理中，忽略點擊');
                  return;
                }
                
                if (!isRecording) {
                  console.log('開始語音控制流程');
                  const flowResult = await executeVoiceControlFlow(videoControls);
                  if (!flowResult.success) {
                    console.log('語音控制流程啟動失敗:', flowResult.message);
                    setCommandResult({ 
                      success: false, 
                      message: flowResult.message 
                    });
                  }
                } else {
                  console.log('停止語音錄製');
                  await toggleRecording();
                }
              }}
              disabled={isProcessing}
            >
              <View style={[styles.buttonInner, isSmallScreen && styles.buttonInnerSmall]}>
                {isProcessing ? (
                  <ActivityIndicator color="#fff" size={isSmallScreen ? "small" : "large"} />
                ) : isListening ? (
                  <Headphones color="#fff" size={isSmallScreen ? 28 : 36} />
                ) : isRecording ? (
                  <MicOff color="#fff" size={isSmallScreen ? 28 : 36} />
                ) : (
                  <Mic color="#fff" size={isSmallScreen ? 28 : 36} />
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>
          
          <SoundWaveRipple 
            isActive={isPersistentMode && isListening} 
            size={isSmallScreen ? 60 : 80}
          />
        </View>
        
        {isRecording && (
          <View style={[styles.pulseRing, isSmallScreen && styles.pulseRingSmall]}>
            <Animated.View style={[
              styles.pulseRingInner, 
              isSmallScreen && styles.pulseRingInnerSmall,
              { 
                transform: [
                  { scale: pulseAnim }
                ] 
              }
            ]} />
          </View>
        )}
      </View>

      <View style={[styles.statusContainer, isSmallScreen && styles.statusContainerSmall]}>
        <Text style={[styles.statusText, isSmallScreen && styles.statusTextSmall]}>
          {!isAuthorized ? 
            '請先授權語音辨識權限才能使用語音指令。' :
           !recognitionAvailable ?
            '您的裝置或瀏覽器不支援語音辨識功能。' :
           isProcessing ? '處理語音指令中...' : 
           isPersistentMode && isListening ? (userHint ?? '持續監聽模式 - 正在等待語音指令...') :
           isRecording ? (userHint ?? '正在錄製語音 - 請說出指令...') :
           error ? `錯誤: ${error}` :
           userHint ? userHint :
           lastCommand ? `最後執行指令: "${lastCommand}"` :
           videoControls.uri ? 
             (isPersistentMode ? '語音控制已啟用 - 隨時可說出指令' : '點擊麥克風開始語音控制') : 
             '請先載入影片才能使用語音控制'}
        </Text>

        {lastCommand && (
          <View style={[styles.commandBadge, isSmallScreen && styles.commandBadgeSmall]}>
            <Text style={[styles.commandText, isSmallScreen && styles.commandTextSmall]}>最後指令: {lastCommand}</Text>
          </View>
        )}
        
        {!videoControls.uri && (
          <Text style={[styles.hintText, isSmallScreen && styles.hintTextSmall]}>
            語音控制功能需要先載入影片才能使用。支援的指令包括：播放、暫停、快轉、音量調整等。
          </Text>
        )}
        
        {videoControls.uri && isAuthorized && (
          <Text style={[styles.hintText, isSmallScreen && styles.hintTextSmall]}>
            可用指令：「播放」、「暫停」、「快轉10秒」、「音量調高」、「全螢幕」等
          </Text>
        )}
        
        {commandResult && (
          <View style={[
            styles.resultBadge, 
            commandResult.success ? styles.successBadge : styles.errorBadge,
            isSmallScreen && styles.resultBadgeSmall
          ]}
            testID="command-result"
          >
            {commandResult.success ? (
              <CheckCircle color="#10b981" size={isSmallScreen ? 14 : 16} />
            ) : (
              <XCircle color="#ef4444" size={isSmallScreen ? 14 : 16} />
            )}
            <Text style={[
              styles.resultText, 
              commandResult.success ? styles.successText : styles.errorText,
              isSmallScreen && styles.resultTextSmall
            ]}>
              {commandResult.message}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  authorizationContainer: {
    marginBottom: 24,
    alignItems: 'center',
    width: '100%',
  },
  authorizationContainerSmall: {
    marginBottom: 20,
  },
  authorizationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.1)',
    width: '100%',
    maxWidth: 400,
  },
  authorizationButtonSmall: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 12,
  },
  authorizationButtonEnabled: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  authorizationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  authorizationLabelContainer: {
    flex: 1,
  },
  authorizationLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  authorizationLabelSmall: {
    fontSize: 14,
  },
  authorizationLabelEnabled: {
    color: '#10b981',
  },
  authorizationStatus: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  authorizationStatusSmall: {
    fontSize: 11,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  authorizationDescription: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  authorizationDescriptionSmall: {
    fontSize: 12,
    marginTop: 10,
    paddingHorizontal: 16,
    lineHeight: 16,
  },
  containerSmall: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  persistentContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  persistentContainerSmall: {
    marginBottom: 20,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  toggleButtonSmall: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 12,
  },
  toggleTrack: {
    width: 56,
    height: 32,
    borderRadius: 16,
    position: 'relative',
    justifyContent: 'center',
  },
  toggleTrackSmall: {
    width: 48,
    height: 28,
    borderRadius: 14,
  },
  toggleThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  toggleThumbSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  toggleGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 20,
    backgroundColor: '#10b981',
  },
  toggleGlowSmall: {
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 17,
  },
  toggleLabelContainer: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  toggleLabelSmall: {
    fontSize: 14,
  },
  toggleLabelActive: {
    color: '#10b981',
  },
  toggleLabelDisabled: {
    color: '#9ca3af',
  },
  toggleStatus: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  toggleStatusSmall: {
    fontSize: 11,
  },
  buttonContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  voiceButtonContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainerSmall: {
    marginBottom: 20,
  },
  buttonWrapper: {
    position: 'relative',
    zIndex: 2,
  },
  button: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonSmall: {
    width: 80,
    height: 80,
    borderRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 2,
  },
  buttonMedium: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  buttonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonInnerSmall: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  recording: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  processing: {
    backgroundColor: '#6b7280',
    shadowColor: '#6b7280',
  },
  listening: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
  },
  pulseRing: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    zIndex: 1,
  },
  pulseRingSmall: {
    top: -16,
    left: -16,
    right: -16,
    bottom: -16,
  },
  pulseRingInner: {
    flex: 1,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  pulseRingInnerSmall: {
    borderRadius: 56,
  },
  statusContainer: {
    alignItems: 'center',
    gap: 12,
  },
  statusContainerSmall: {
    gap: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#1f2937',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 24,
  },
  statusTextSmall: {
    fontSize: 14,
    lineHeight: 20,
  },
  commandBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  commandBadgeSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  commandText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  commandTextSmall: {
    fontSize: 12,
  },
  hintText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  hintTextSmall: {
    fontSize: 12,
    marginTop: 6,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    marginTop: 8,
  },
  resultBadgeSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginTop: 6,
  },
  successBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  errorBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  resultText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultTextSmall: {
    fontSize: 12,
  },
  successText: {
    color: '#10b981',
  },
  errorText: {
    color: '#ef4444',
  },
});
