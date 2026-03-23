# Continuous Listening Feature

## Overview
WIN Assist now supports **continuous listening** that automatically handles pauses in speech without stopping the transcription. This is essential for real conversations where speakers naturally pause between sentences.

---

## How It Works

### Auto-Restart on Pause
When you click "Start Listening", the system enters **continuous mode**:

1. Speech recognition starts
2. You can speak naturally with pauses
3. When you pause, the browser's speech recognition may stop
4. **Automatic restart**: The system immediately restarts recognition (100ms delay)
5. Your transcript continues to build up
6. Stops only when you click "Stop Listening"

### Visual Indicators

**While listening (not speaking):**
```
🔴 Listening (pauses OK)
```

**While you're actively speaking:**
```
🔴 Recording    🟢 Speaking... [animated bars]
```

**In the transcript area (when waiting):**
```
🎤 Listening continuously... Pauses are OK. Mention a ZIP code like 33101
```

---

## Use Case: Getting Property Information

### Before (Without Continuous Listening)
```
User: "Hi, I need a home inspection for..."
[pauses]
❌ Recognition stops
User: [has to restart manually]
```

### After (With Continuous Listening)
```
User: "Hi, I need a home inspection for..."
[pauses - system keeps listening]
User: "...a property in Miami, ZIP code 33101"
[pauses - system keeps listening]
User: "It's about 40 years old"
✅ Full transcript captured with all pauses
✅ ZIP code detected automatically
```

---

## Technical Details

### Auto-Restart Logic

**File:** `src/hooks/useSpeechRecognition.ts`

```typescript
const shouldBeListeningRef = useRef(false);

// On start
shouldBeListeningRef.current = true;

// On recognition end
recognition.onend = () => {
  if (shouldBeListeningRef.current) {
    // Auto-restart after 100ms
    setTimeout(() => {
      recognition.start();
    }, 100);
  }
};

// On stop (user clicks Stop)
shouldBeListeningRef.current = false;
recognition.stop(); // Won't restart
```

### Error Handling

**No-speech errors** are ignored:
```typescript
if (errorEvent.error === 'no-speech') {
  // Don't treat as error - just continue listening
  return;
}
```

**Aborted errors** are handled gracefully:
```typescript
if (errorEvent.error === 'aborted') {
  // Will restart automatically
  return;
}
```

---

## User Experience

### Starting a Session
1. Click "Start Listening"
2. See "🔴 Listening (pauses OK)" indicator
3. Begin speaking naturally
4. Take pauses whenever you need
5. Transcript builds up continuously

### During Conversation
- **Speaking**: Green bars animate, shows "Speaking..."
- **Pausing**: Red dot pulses, shows "Listening (pauses OK)"
- **Silent**: Blue icon pulses, shows "Listening continuously..."

### Stopping
1. Click "Stop Listening"
2. System stops immediately
3. No auto-restart occurs
4. Final transcript is preserved

---

## Benefits

### For Service Providers
✅ Natural conversation flow
✅ No need to worry about pauses
✅ Can think between sentences
✅ Better client experience

### For ZIP Code Detection
✅ Client can take time to remember address
✅ System waits patiently for full information
✅ Captures: "Let me check... okay it's 33101"

### For Training
✅ New SPs don't need to learn "perfect" speech patterns
✅ Works like a normal conversation
✅ Reduces cognitive load during calls

---

## Known Behavior

### Normal Pauses
- ✅ 1-2 second pauses: Handled seamlessly
- ✅ 3-5 second pauses: Auto-restarts smoothly
- ✅ 5+ second pauses: May see brief "restarting" in console

### What Doesn't Stop It
- ❌ Short pauses between words
- ❌ Thinking pauses (3-5 seconds)
- ❌ Background noise during pauses
- ❌ Client speaking then pausing

### What Does Stop It
- ✅ Clicking "Stop Listening" button
- ✅ Clicking "Reset" button
- ✅ Critical errors (mic disconnected, permissions revoked)

---

## Console Logs

When working correctly, you'll see:

```
Started listening with auto-restart enabled
Speech recognition ended, shouldBeListening: true
Auto-restarting speech recognition after pause...
Speech recognition restarted successfully
Speech recognition ended, shouldBeListening: true
Auto-restarting speech recognition after pause...
Speech recognition restarted successfully
[user clicks Stop]
Stopping listening, auto-restart disabled
Speech recognition ended, shouldBeListening: false
```

---

## Troubleshooting

### "Transcript stops after every sentence"
**Solution:** Make sure you're on the latest code with auto-restart feature
- Check that `shouldBeListeningRef` exists in useSpeechRecognition.ts
- Restart dev server: `npm run dev`

### "I see 'No speech detected' errors"
**Solution:** This is normal and handled automatically
- These errors are ignored
- Auto-restart continues regardless
- No action needed

### "Recognition restarts too quickly"
**Solution:** Adjust the restart delay
```typescript
// In useSpeechRecognition.ts
setTimeout(() => {
  recognition.start();
}, 500); // Increase from 100ms to 500ms
```

### "Still stops unexpectedly"
**Check:**
1. Browser console for errors
2. `shouldBeListeningRef.current` value
3. Microphone permissions
4. Try Chrome/Edge (best support)

---

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Excellent | Best performance |
| Edge | ✅ Excellent | Chromium-based |
| Safari | ⚠️ Good | May have longer pauses |
| Firefox | ❌ No | Web Speech API not supported |

---

## Future Enhancements

### Planned Features

**1. Smart Restart Timing**
- Detect if user is mid-sentence vs done speaking
- Faster restart for mid-sentence pauses
- Longer delay for natural conversation pauses

**2. Visual Feedback**
- Show "Resuming..." during auto-restart
- Countdown timer showing remaining listen time
- Waveform visualization

**3. Session Management**
- Auto-stop after X minutes of silence
- "Keep listening" prompt after long pauses
- Save/resume sessions

---

## Summary

✅ Continuous listening with auto-restart
✅ Handles natural pauses seamlessly
✅ Clear visual indicators
✅ Only stops when user explicitly clicks Stop
✅ Essential for real conversations with clients
✅ ZIP code detection works even with pauses

**Key Benefit:** Service Providers can now have natural, flowing conversations without worrying about keeping the transcription active. The system handles all the technical complexity of continuous listening automatically.
