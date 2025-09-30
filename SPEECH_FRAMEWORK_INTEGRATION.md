# Speech Framework 語音控制整合指南

## Speech Framework 整合概述

本應用程式已完整整合 Speech Framework 語音辨識系統，完全移除 Apple Intelligence 和 Siri 依賴，提供純淨的語音辨識體驗，並支援跨平台語音控制功能。

### 重要更新
- 完全移除 Apple Intelligence 整合
- 完全移除 Siri 快捷指令
- 純 Speech Framework 實現
- 跨平台語音辨識支援
- 統一的授權流程

## 系統需求

### iOS 平台
- **iOS 版本**: iOS 10.0 或更新版本
- **硬體需求**: 支援麥克風的 iOS 裝置
- **權限需求**: 語音辨識權限 + 麥克風權限

### Android 平台
- **Android 版本**: Android 6.0 (API 23) 或更新版本
- **權限需求**: RECORD_AUDIO 權限

### Web 平台
- **瀏覽器支援**: Chrome, Edge, Safari
- **權限需求**: 麥克風權限

## 分階段開發實現

### 階段 1：授權與環境設定

#### iOS 實現
```typescript
// 請求語音辨識授權
const authStatus = await SFSpeechRecognizer.requestAuthorization();

// 請求麥克風權限
const micPermission = await AVAudioSession.sharedInstance().requestRecordPermission();
```

#### Android 實現
```typescript
// 請求麥克風權限
const granted = await PermissionsAndroid.request(
  PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
);
```

#### Web 實現
```typescript
// 請求麥克風權限
await navigator.mediaDevices.getUserMedia({ audio: true });
```

#### UI 授權引導
- 清楚的權限請求流程
- 授權狀態即時顯示
- 錯誤提示與解決方案

### 階段 2：語音辨識基礎流程

#### iOS Speech Framework 初始化
```typescript
// 初始化 SFSpeechRecognizer（語言預設 zh-TW）
const locale = language === 'zh-TW' ? 'zh-TW' : 
              language === 'zh-CN' ? 'zh-CN' : 
              language === 'ja' ? 'ja-JP' : 
              language === 'ko' ? 'ko-KR' : 'en-US';

const recognizer = new SFSpeechRecognizer(locale);

// 初始化 AVAudioEngine
const audioEngine = new AVAudioEngine();
```

#### Web Speech API 初始化
```typescript
const recognition = new SpeechRecognition();
recognition.continuous = false;
recognition.interimResults = true;
recognition.lang = language || 'zh-TW';
recognition.maxAlternatives = 1;
```

### 階段 3：語音指令解析與影片控制

#### iOS 音訊處理流程
```typescript
// 建立 SFSpeechAudioBufferRecognitionRequest
const request = new SFSpeechAudioBufferRecognitionRequest();

// 設定音訊引擎
const inputNode = audioEngine.inputNode;
const recordingFormat = inputNode.outputFormatForBus(0);

// 安裝音訊 tap
inputNode.installTapOnBus(0, 1024, recordingFormat, (buffer, when) => {
  request.appendAudioPCMBuffer(buffer);
});

// 啟動 recognitionTask
const task = recognizer.recognitionTaskWithRequest(request, (result, error) => {
  if (result) {
    const text = result.bestTranscription.formattedString;
    // 處理辨識結果
  }
});
```

#### 指令對照表
| 中文指令 | 英文指令 | 功能 |
|---------|---------|------|
| 播放 | play | Player.play() |
| 暫停 | pause | Player.pause() |
| 快轉10秒 | forward 10 | Player.seek(+10) |
| 音量調高 | volume up | Player.volumeUp() |

### 階段 4：UI/UX 強化

#### 語音按鈕狀態管理
- **未授權** → 顯示「請授權」引導
- **已授權** → 正常使用
- **辨識中** → 顯示動畫（波紋/呼吸效果）
- **處理中** → 顯示載入指示器

#### 即時視覺回饋
- 辨識文字即時顯示
- 成功/失敗狀態指示
- 動畫效果與狀態同步

### 階段 5：錯誤處理與限制管理

#### 授權失敗處理
- **拒絕授權** → 顯示設定引導
- **裝置不支援** → 降級到 Web API
- **權限撤銷** → 重新請求授權

#### 辨識失敗處理
- **網路不穩定** → 自動重試機制
- **無法辨識** → 提示重新說話
- **超時限制** → 分段辨識重啟

#### 分段辨識管理
- 每次辨識 ≤ 1 分鐘
- 自動重啟避免超時
- 持續監聽模式支援

## 支援的語音指令

### 播放控制
| 中文指令 | 英文指令 | 其他語言 |
|---------|---------|---------|
| 播放 | play, start | 재생, reproducir |
| 暫停 | pause | 일시정지, pausar |
| 停止 | stop | 정지, parar |

### 跳轉控制
| 中文指令 | 英文指令 | 功能 |
|---------|---------|------|
| 快轉10秒 | forward 10, skip 10 | 向前跳轉10秒 |
| 快轉20秒 | forward 20, skip 20 | 向前跳轉20秒 |
| 快轉30秒 | forward 30, skip 30 | 向前跳轉30秒 |
| 倒轉10秒 | backward 10, back 10 | 向後跳轉10秒 |
| 倒轉20秒 | backward 20, back 20 | 向後跳轉20秒 |
| 倒轉30秒 | backward 30, back 30 | 向後跳轉30秒 |

### 音量控制
| 中文指令 | 英文指令 | 功能 |
|---------|---------|------|
| 音量調高 | volume up, louder | 增加音量 |
| 音量調低 | volume down, quieter | 降低音量 |
| 最大音量 | max volume | 設定最大音量 |
| 靜音 | mute | 靜音 |
| 解除靜音 | unmute | 取消靜音 |

### 播放速度控制
| 中文指令 | 英文指令 | 功能 |
|---------|---------|------|
| 0.5倍速 | half speed, slow | 設定0.5倍播放速度 |
| 正常速度 | normal speed | 設定1倍播放速度 |
| 1.25倍速 | 1.25x speed | 設定1.25倍播放速度 |
| 1.5倍速 | 1.5x speed, fast | 設定1.5倍播放速度 |
| 2倍速 | double speed | 設定2倍播放速度 |

### 其他功能
| 中文指令 | 英文指令 | 功能 |
|---------|---------|------|
| 全螢幕 | fullscreen | 進入全螢幕模式 |
| 離開全螢幕 | exit fullscreen | 離開全螢幕模式 |
| 書籤 | bookmark | 添加書籤 |
| 最愛 | favorite | 添加到最愛 |

## 使用步驟

### 1. 授權語音辨識
1. 開啟應用程式
2. 點擊「Speech Framework」授權按鈕
3. 允許語音辨識權限
4. 允許麥克風權限
5. 等待狀態變為「已授權」

### 2. 載入影片
1. 點擊「載入範例影片」進行快速測試
2. 或使用「從 URL 載入」輸入影片網址
3. 或選擇本地影片檔案

### 3. 使用語音指令
#### 單次語音辨識
1. 點擊綠色麥克風按鈕
2. 等待「正在語音辨識...」狀態
3. 說出指令（例如：「播放」、「暫停」）
4. 查看執行結果

#### 持續語音辨識
1. 啟用「持續語音辨識」開關
2. 系統會持續監聽語音指令
3. 直接說出指令即可執行
4. 關閉開關停止監聽

### 4. 多語言支援
1. 在右上角語言選擇器中選擇語言
2. 語音辨識會自動切換到對應語言
3. 使用該語言的指令進行控制

## 疑難排解

### 語音辨識無法啟動
1. **檢查權限設定**
   - iOS: 設定 > 隱私權與安全性 > 語音辨識
   - Android: 設定 > 應用程式權限 > 麥克風
   - Web: 瀏覽器麥克風權限

2. **檢查裝置相容性**
   - 確認裝置支援語音辨識
   - 檢查麥克風硬體功能

3. **重新啟動應用程式**
   - 完全關閉應用程式
   - 重新開啟並重新授權

### 語音指令無法識別
1. **改善語音清晰度**
   - 在安靜環境中說話
   - 清楚發音，語速適中
   - 使用支援的指令格式

2. **檢查語言設定**
   - 確認選擇正確的語言
   - 使用對應語言的指令

3. **網路連線檢查**
   - 確保網路連線穩定
   - Web 平台需要網路支援

### 應用程式無回應
1. **確認影片已載入**
   - 語音控制需要先載入影片
   - 檢查影片是否正常播放

2. **檢查授權狀態**
   - 確認語音辨識已授權
   - 重新授權如果需要

## 技術特色

### 核心優勢
- **原生效能** - iOS 使用 Speech Framework 獲得最佳辨識準確度
- **即時回饋** - 無延遲的語音指令執行
- **智慧錯誤恢復** - 自動重試和降級處理
- **跨平台相容** - iOS、Android、Web 統一體驗

### 技術實現
- **分階段開發** - 按照需求文件逐步實現
- **完善錯誤處理** - 涵蓋所有可能的錯誤情況
- **使用者友善** - 清楚的狀態顯示和引導
- **效能優化** - 記憶體洩漏防護和資源管理

### 多語言支援
- **12 種語言** - 涵蓋主要使用語言
- **智慧切換** - 根據使用者選擇自動調整
- **本地化指令** - 每種語言都有對應的指令集

## 隱私權與安全性

### Speech Framework 隱私權
- **本地處理** - iOS 語音辨識在裝置上進行
- **無資料傳輸** - 不會將語音資料傳送到伺服器
- **符合 Apple 標準** - 遵循 Apple 隱私權政策

### 應用程式權限
- **最小權限原則** - 僅請求必要的麥克風權限
- **透明化處理** - 清楚說明權限用途
- **使用者控制** - 可隨時撤銷權限

---

**注意**: Speech Framework 是 Apple Inc. 的技術。本應用程式與 Apple Inc. 無關聯。