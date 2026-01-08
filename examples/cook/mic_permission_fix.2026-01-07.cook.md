# Cooking Result

## Dish
Fix microphone permission crash on Android 13+

## Status
ready-for-merge

## Cooking Mode
microwave

---

## Problem Statement
App crashes when requesting microphone permission on Android 13+ devices. The crash occurs because Android 13 requires `POST_NOTIFICATIONS` permission to be requested alongside audio permissions, and our permission handler doesn't account for this.

**Reproduction steps:**
1. Install app on Android 13+ device
2. Navigate to voice recording feature
3. Tap "Start Recording"
4. App crashes with `SecurityException`

**Stack trace:**
```
java.lang.SecurityException: Permission Denial
  at PermissionHandler.requestMicrophoneAccess()
  at VoiceRecorder.startRecording()
```

## Fix Plan
Update `PermissionHandler.kt` to check Android version and request `POST_NOTIFICATIONS` permission on Android 13+ before requesting microphone access.

Changes:
- Add version check in `requestMicrophoneAccess()`
- Request `POST_NOTIFICATIONS` on API 33+
- Chain permission requests properly

## Why Safe
This is a targeted fix to an existing permission flow with no changes to business logic or data handling.

## Pre-mortem (1 scenario)
1. Permission request order causes UX confusion -> mitigation: Show explanatory dialog before requesting notifications permission

## Tests
- Unit test: `PermissionHandlerTest.requestMicrophoneAccess_android13_requestsNotificationFirst()`
- Manual test: Verify on Android 13 emulator and physical device

## Security Status
- Reviewed: yes
- Issues found: none

Permission changes are additive and follow Android best practices. No new data access.

## Next Actions
- [x] Implement fix in PermissionHandler.kt
- [x] Add unit test
- [x] Manual QA on Android 13 device
- [ ] Merge to main
- [ ] Release hotfix
