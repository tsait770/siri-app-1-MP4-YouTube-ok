# 影片語音控制 App - 共通語音流程實現

## 概述

本文檔詳細說明了影片語音控制 App 中實現的完整語音控制流程，包括權限檢查、語音辨識、指令解析、影片控制和結果回饋等七個主要階段。

## 完整語音控制流程

### 階段 1：使用者點擊「語音控制按鈕」

**觸發位置：** `components/VoiceButton.tsx`

```typescript
// 主要語音控制按鈕點擊處理
onPress={async () => {
  console.log('語音控制按鈕被點擊');
  
  if (!isRecording) {
    console.log('開始語音控制流程...');
    const flowResult = await executeVoiceControlFlow(videoControls);
    if (!flowResult.success) {
      setCommandResult({ 
        success: false, 
        message: flowResult.message 
      });
    }
  } else {
    await toggleRecording();
  }
}}
```

**功能：**
- 檢測按鈕點擊事件
- 判斷當前狀態（錄音中/空閒）
- 啟動完整語音控制流程

### 階段 2：檢查麥克風與語音辨識權限

**實現位置：** `hooks/use-voice-commands.ts` - `executeVoiceControlFlow()`

```typescript
const executeVoiceControlFlow = useCallback(async (videoControls: any) => {
  console.log('開始語音控制流程');
  
  try {
    // 步驟 1：檢查麥克風與語音辨識權限
    console.log('步驟 1：檢查權限狀態');
    if (!state.isAuthorized) {
      console.log('權限未授權，導向授權流程');
      const authorized = await requestSpeechAuthorization();
      if (!authorized) {
        return { success: false, message: '權限被拒絕' };
      }
    }
    
    // 繼續後續流程...
  } catch (error) {
    return { success: false, message: '流程執行錯誤' };
  }
}, [state.isAuthorized, requestSpeechAuthorization]);
```

**權限檢查邏輯：**
- **iOS：** 使用 Speech Framework 進行語音辨識授權
- **Android：** 請求 `RECORD_AUDIO` 權限
- **Web：** 使用 Web Speech API 和MediaDevices API

**處理結果：**
- 已授權 → 繼續流程
- 未授權 → 提示並導向系統設定

### 階段 3：調用本地語音辨識 API

**實現位置：** `hooks/use-voice-commands.ts` - `startSpeechRecognition()`

```typescript
const startSpeechRecognition = useCallback(async () => {
  console.log('Starting speech recognition...');
  
  if (Platform.OS === 'ios' && speechRecognizerRef.current) {
    // iOS Speech Framework 實現
    const { SFSpeechAudioBufferRecognitionRequest } = require('react-native');
    const request = new SFSpeechAudioBufferRecognitionRequest();
    // ... iOS 特定實現
  } else {
    // Web Speech API 實現
    return await startWebSpeechRecognition();
  }
}, [state.isAuthorized, requestSpeechAuthorization]);
```

**平台特定實現：**

#### iOS (Speech Framework)
- 使用 `SFSpeechRecognizer` + `SFSpeechAudioBufferRecognitionRequest`
- 完全離線處理語音
- 支援自訂詞彙加入辨識器詞庫
- 返回信心分數 (confidenceScore)

#### Web (Web Speech API)
- 使用 `SpeechRecognition` 或 `webkitSpeechRecognition`
- 支援多語言辨識
- 自動重試機制處理 "no-speech" 錯誤
- 錯誤處理和恢復機制

### 階段 4：取得文字結果與 confidenceScore

**結果處理：** 語音辨識完成後，系統會自動更新 `lastCommand` 狀態

```typescript
// iOS Speech Framework 結果處理
const task = recognizer.recognitionTaskWithRequest(request, (result: any, error: any) => {
  if (result) {
    const text = result.bestTranscription.formattedString;
    setState(prev => ({
      ...prev,
      lastCommand: text.toLowerCase().trim(),
      error: undefined
    }));
  }
});

// Web Speech API 結果處理
recognition.onresult = (event: any) => {
  const lastResult = event.results[event.results.length - 1];
  const text = lastResult[0].transcript;
  setState(prev => ({
    ...prev,
    lastCommand: text.toLowerCase().trim(),
    error: undefined
  }));
};
```

### 階段 5：呼叫「指令解析器」

**實現位置：** `hooks/use-voice-commands.ts` - `parseVoiceCommand()`

```typescript
const parseVoiceCommand = useCallback((text: string) => {
  if (!text) return null;
  
  const command = text.toLowerCase().trim();
  console.log('解析語音指令:', command);
  
  // 檢查自定義指令
  const customCommand = Object.entries(customCommands).find(([_, trigger]) => 
    command.includes(trigger.toLowerCase())
  );
  
  if (customCommand) {
    const [commandId] = customCommand;
    return { type: 'custom', commandId, originalText: text };
  }
  
  // 內建指令匹配（支援多語言）
  const builtInCommands = {
    play: ['play', '播放', '再生', 'reproducir', 'jouer', '재생'],
    pause: ['pause', '暫停', '一時停止', 'pausar', '일시정지'],
    // ... 更多指令
  };
  
  // 尋找匹配的內建指令
  for (const [action, triggers] of Object.entries(builtInCommands)) {
    if (triggers.some(trigger => command.includes(trigger.toLowerCase()))) {
      return { type: 'builtin', commandId: action, originalText: text };
    }
  }
  
  return null;
}, [customCommands]);
```

**支援的指令類型：**

#### 播放控制
- `play` - 播放影片
- `pause` - 暫停影片
- `stop` - 停止影片

#### 快轉倒轉
- `forward10/20/30` - 快轉 10/20/30 秒
- `backward10/20/30` - 倒轉 10/20/30 秒

#### 音量控制
- `volumeUp/Down` - 音量調高/調低
- `volumeMax` - 最大音量
- `mute/unmute` - 靜音/解除靜音

#### 播放速度
- `speed05/1/125/15/2` - 設定播放速度

#### 全螢幕
- `fullscreen/exitFullscreen` - 進入/離開全螢幕

#### 其他功能
- `bookmark` - 添加書籤
- `favorite` - 加入最愛

### 階段 6：觸發影片控制對應動作

**實現位置：** `hooks/use-voice-commands.ts` - `executeCommand()`

```typescript
const executeCommand = useCallback(async (commandId: string, videoControls: any) => {
  try {
    console.log('執行影片控制指令:', commandId);
    
    if (!videoControls.uri) {
      return { success: false, message: '請先載入影片' };
    }
    
    switch (commandId) {
      case 'play':
        await videoControls.play();
        break;
      case 'pause':
        await videoControls.pause();
        break;
      case 'forward10':
        await videoControls.seek(10);
        break;
      case 'volumeUp':
        await videoControls.setVolume(Math.min(1, videoControls.volume + 0.1));
        break;
      // ... 更多指令實現
    }
    
    return { success: true, message: `已執行: ${commandId}` };
  } catch (error) {
    return { success: false, message: `執行錯誤: ${error.message}` };
  }
}, []);
```

### 階段 7：回饋執行結果給使用者 UI

**實現位置：** `components/VoiceButton.tsx` - `useEffect` 監聽 `lastCommand`

```typescript
// 階段 7：回饋執行結果給使用者 UI - 處理語音指令結果
useEffect(() => {
  if (lastCommand) {
    const processCommand = async () => {
      console.log('開始完整語音控制流程');
      
      try {
        // 執行完整的語音指令處理流程
        const result = await processVoiceCommand(lastCommand, videoControls);
        
        if (result.success) {
          setCommandResult({ 
            success: true, 
            message: `執行成功: "${lastCommand}"` 
          });
        } else {
          setCommandResult({ 
            success: false, 
            message: `執行失敗: "${lastCommand}" - ${result.message}` 
          });
        }
      } catch (error) {
        setCommandResult({ 
          success: false, 
          message: `處理錯誤: "${lastCommand}"` 
        });
      }
      
      // 清除結果顯示（4秒後）
      const timer = setTimeout(() => setCommandResult(null), 4000);
      return timer;
    };
    
    processCommand();
  }
}, [lastCommand, processVoiceCommand, videoControls]);
```

**UI 回饋機制：**

#### 成功執行
- 綠色成功圖示
- 顯示「執行成功: [指令]」訊息
- 4秒後自動消失

#### 執行失敗
- 紅色錯誤圖示
- 顯示具體錯誤原因
- 4秒後自動消失

#### 狀態指示
- 正在錄製語音
- 處理語音指令中
- 持續監聽模式
- 等待載入影片

## 持續語音控制模式

除了單次語音控制外，系統還支援持續監聽模式：

```typescript
const togglePersistentMode = useCallback(async () => {
  if (state.isPersistentMode) {
    stopPersistentListening();
  } else {
    if (!state.isAuthorized) {
      const authorized = await requestSpeechAuthorization();
      if (!authorized) return;
    }
    await startPersistentListening();
  }
}, [state.isPersistentMode, state.isAuthorized]);
```

**持續模式特點：**
- 自動重啟語音辨識
- 55秒會話限制管理
- Web 平台專用實現
- "no-speech" 錯誤自動處理

## 錯誤處理與重試機制

### Web Speech API 錯誤處理

```typescript
recognition.onerror = (event: any) => {
  const err: string = event?.error ?? 'unknown';
  
  switch (err) {
    case 'no-speech':
      // 自動重試機制
      if (webRetryCountRef.current < webMaxRetriesRef.current) {
        webRetryCountRef.current += 1;
        setTimeout(() => startWebSpeechRecognition(), 600);
      }
      break;
      
    case 'not-allowed':
      setState(prev => ({
        ...prev,
        error: 'Microphone permission denied',
        isListening: false
      }));
      break;
      
    case 'network':
      setState(prev => ({
        ...prev,
        error: 'Network error. Please check connection.'
      }));
      break;
  }
};
```

### iOS Speech Framework 錯誤處理

```typescript
const task = recognizer.recognitionTaskWithRequest(request, (result: any, error: any) => {
  if (error) {
    setState(prev => ({
      ...prev,
      error: `語音辨識錯誤: ${error.localizedDescription}`,
      isListening: false,
      isRecording: false
    }));
    return;
  }
  // 處理成功結果...
});
```

## 多語言支援

系統支援以下語言的語音指令：

- **中文（繁體）：** 播放、暫停、快轉10秒、音量調高
- **中文（簡體）：** 播放、暂停、快进10秒、音量调高
- **英文：** play, pause, forward 10 seconds, volume up
- **日文：** 再生、一時停止、10秒進む、音量上げる
- **韓文：** 재생, 일시정지, 10초 앞으로, 볼륨 올리기
- **西班牙文：** reproducir, pausar, adelantar 10, subir volumen
- **法文：** jouer, pause, avancer 10, augmenter volume
- **德文：** spielen, pausieren, vorwärts 10, lauter
- **俄文：** воспроизвести, пауза, вперед 10, громче
- **阿拉伯文：** تشغيل, إيقاف مؤقت, تقديم 10, رفع الصوت

## 平台兼容性

### iOS
- Speech Framework (SFSpeechRecognizer)
- 完全離線語音辨識
- 自訂詞彙支援
- 信心分數判斷

### Android
- 標準麥克風權限
- Web Speech API 降級
- 權限管理

### Web
- Web Speech API
- 持續監聽模式
- 自動重試機制
- 錯誤恢復

## 自定義指令

使用者可以添加自定義語音指令：

```typescript
const saveCustomCommand = useCallback(async (commandId: string, trigger: string) => {
  const updated = { ...customCommands, [commandId]: trigger };
  setCustomCommands(updated);
  await AsyncStorage.setItem('customCommands', JSON.stringify(updated));
}, [customCommands]);
```

**自定義指令特點：**
- 本地儲存（AsyncStorage）
- 即時載入和保存
- 優先匹配（在內建指令之前）
- 支援任何語言觸發詞

## 性能優化

### 記憶體管理
- 自動清理語音辨識資源
- 定時器管理和清除
- 組件卸載時的資源釋放

### 網路優化
- Web 平台網路錯誤重試
- 會話時間限制管理
- 自動重啟機制

### 用戶體驗
- 視覺回饋動畫
- 觸覺回饋（iOS/Android）
- 響應式設計適配

## 測試與調試

系統提供詳細的控制台日誌：

```typescript
console.log('開始語音控制流程');
console.log('步驟 1：檢查權限狀態');
console.log('步驟 2：啟動語音辨識');
console.log('解析語音指令:', command);
console.log('執行影片控制指令:', commandId);
console.log('語音指令執行成功');
console.log('語音控制流程完成');
```

**調試功能：**
- 詳細的流程日誌
- 階段性狀態追蹤
- 錯誤原因分析
- 性能指標監控

## 未來擴展

### 計劃功能
- AI 語音理解增強
- 音樂播放控制
- 多媒體內容支援
- 更多語言支援
- 遊戲控制整合

### 技術改進
- 更快的語音辨識響應
- 更高的指令識別準確率
- 更好的電池優化
- 更多平台支援

---

**總結：** 本實現提供了一個完整、健壯且用戶友好的語音控制系統，支援多平台、多語言，具備完善的錯誤處理和用戶回饋機制。通過模組化設計，系統易於維護和擴展。