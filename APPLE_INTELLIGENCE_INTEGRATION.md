> 已移除：本文件原描述 Apple Intelligence 與 Siri 的整合。依產品決策，已全面改採 Apple Speech Framework 實現語音辨識與控制。

# 重要說明

- 本應用程式現已完全移除 Apple Intelligence、Siri、Shortcuts 等所有相依。
- 請改閱新的整合指南：`SPEECH_FRAMEWORK_INTEGRATION.md`。

## 遷移指引（從 Apple Intelligence 到 Speech Framework）

1. 權限：於 iOS `Info.plist` 增加 `NSSpeechRecognitionUsageDescription` 與 `NSMicrophoneUsageDescription`。
2. 授權流程：使用 `SFSpeechRecognizer.requestAuthorization` 與 `AVAudioSession.sharedInstance().requestRecordPermission`。
3. 音訊管線：以 `AVAudioEngine` + `SFSpeechAudioBufferRecognitionRequest` 建立即時辨識。
4. 指令解析：以應用內對照表（播放/暫停/快轉/音量）綁定播放器 API。
5. UI：以授權引導、辨識中動畫、即時文字回饋強化體驗。

更多細節請參考 `SPEECH_FRAMEWORK_INTEGRATION.md`。