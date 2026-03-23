# Smart Listening - Automatic ZIP Detection

## Overview
WIN Assist now features **smart listening** that automatically continues listening until it detects a ZIP code or property address, then stops. This makes the conversation flow natural without requiring the Service Provider to manually stop recording.

---

## How It Works

### 1. Start Listening
Click "Start Listening" → System enters continuous mode

### 2. Waiting for ZIP Code
```
🎤 Listening for property ZIP code or address...
Take your time. Pauses are OK. Will stop automatically when ZIP detected.
```

The system:
- ✅ Keeps listening continuously
- ✅ Auto-restarts after pauses
- ✅ Waits patiently for ZIP code
- ✅ Builds up full transcript

### 3. ZIP Code Detected
```
✓ ZIP Code 33101 detected! Loading area data...
Will stop listening in 2 seconds
```

The system:
- ✅ Detects ZIP code from transcript
- ✅ Fetches area data from API
- ✅ Displays area profile on right panel
- ✅ Stops listening after 2 seconds

### 4. Auto-Stop
After 2 seconds, listening stops automatically and the full transcript is preserved.

---

## Example Conversation Flow

### Real-World Example

**Service Provider starts listening:**
```
🔴 Listening for property ZIP code or address...
```

**Client speaks naturally:**
```
Client: "Hi, um... I need a home inspection for..."
[3 second pause]
Client: "...a property I'm buying in Miami..."
[2 second pause]
Client: "Let me check the address... okay it's..."
[4 second pause]
Client: "...ZIP code 33101"
```

**System automatically:**
```
✓ ZIP Code 33101 detected! Loading area data...
[Fetches inspection report data]
[Displays: Miami, FL - 42 year avg age, High humidity, etc.]
[Stops listening after 2 seconds]
```

**Result:**
- Full conversation captured ✅
- ZIP code detected ✅
- Area data loaded ✅
- No manual stop needed ✅

---

## Visual Indicators

### Before ZIP Detection
```
┌──────────────────────────────────────────────────┐
│ 🔴 Listening (pauses OK)   [Stop Listening]     │
├──────────────────────────────────────────────────┤
│                                                  │
│  🎤 Listening for property ZIP code or address  │
│     Take your time. Pauses are OK.              │
│     Will stop automatically when ZIP detected.  │
│                                                  │
└──────────────────────────────────────────────────┘
```

### When Speaking
```
┌──────────────────────────────────────────────────┐
│ 🔴 Recording  🟢 Speaking... [bars] [Stop]      │
├──────────────────────────────────────────────────┤
│                                                  │
│  "Hi, I need a home inspection for..."          │
│                                                  │
└──────────────────────────────────────────────────┘
```

### ZIP Detected
```
┌──────────────────────────────────────────────────┐
│ 🔴 Listening (pauses OK)   [Stop Listening]     │
├──────────────────────────────────────────────────┤
│ ✓ ZIP Code 33101 detected! Loading area data... │
│   Will stop listening in 2 seconds              │
├──────────────────────────────────────────────────┤
│                                                  │
│  "...the property is in Miami, ZIP code 33101"  │
│                                                  │
└──────────────────────────────────────────────────┘
```

### After Auto-Stop
```
┌──────────────────────────────────────────────────┐
│ [Start Listening]  [Reset]                      │
├──────────────────────────────────────────────────┤
│                                                  │
│  Full transcript preserved                       │
│                                                  │
├──────────────────────────────────────────────────┤
│ Area Profile          [✓ Live Data]             │
│ Miami, FL - ZIP 33101                           │
│ Home Age: 42 yrs | Humidity: High              │
│ Wind Mitigation: 69% | Radon: 68%              │
└──────────────────────────────────────────────────┘
```

---

## Technical Implementation

### File: `src/hooks/useSpeechRecognition.ts`

**New Function:**
```typescript
setKeepListening(keep: boolean): void
```

Controls whether recognition should auto-restart:
- `true` = Keep listening (auto-restart on pause)
- `false` = Stop listening (no auto-restart)

### File: `src/App.tsx`

**ZIP Detection Logic:**
```typescript
useEffect(() => {
  if (transcript) {
    const zip = detectZipCode(transcript);
    if (zip && zip !== detectedZip) {
      console.log('✓ Detected ZIP code:', zip);
      setDetectedZip(zip);
      fetchZipData(zip);

      // Stop listening after 2 seconds
      setTimeout(() => {
        if (isListening) {
          setKeepListening(false);
        }
      }, 2000);
    }
  }
}, [transcript, detectedZip, isListening]);
```

**Why 2 seconds?**
- Allows client to finish their sentence
- Prevents cutting off mid-word
- Gives system time to show notification
- Feels natural to user

---

## Supported ZIP Patterns

The system detects various ZIP code formats:

| Format | Example | Detected |
|--------|---------|----------|
| 5 digits | "33101" | ✅ |
| With "ZIP" | "ZIP 33101" | ✅ |
| With "code" | "ZIP code 33101" | ✅ |
| In sentence | "property in 33101" | ✅ |
| With hyphen | "33101-4567" | ✅ (first 5) |
| Multiple | "33101 or 30301" | ✅ (first) |

**Regex:** `/\b(\d{5})\b/g`

---

## Edge Cases Handled

### 1. Multiple ZIPs Mentioned
```
Client: "I have two properties, one in 33101 and one in 30301"
→ Detects: 33101 (first occurrence)
→ Loads data for: Miami 33101
```

### 2. Partial ZIP During Pause
```
Client: "The ZIP is 331..."
[pause]
Client: "...01"
→ Waits for complete 5-digit ZIP
→ Detects: 33101 when complete
```

### 3. ZIP in Address
```
Client: "123 Main Street, Miami, Florida 33101"
→ Detects: 33101
→ Loads: Miami area data
```

### 4. No ZIP Mentioned
```
Client: "I need a home inspection in Miami"
→ No ZIP detected
→ Continues listening indefinitely
→ User must click "Stop" manually
```

### 5. Manual Stop Before ZIP
```
User clicks "Stop Listening" before mentioning ZIP
→ Stops immediately
→ No area data loaded
→ Transcript preserved
```

---

## User Control

### Manual Override
User can always **manually stop** listening at any time:
- Click "Stop Listening" button
- Overrides automatic detection
- Stops immediately

### Manual Start
To continue after auto-stop:
- Click "Start Listening" again
- Continues building transcript
- Can detect additional ZIPs if mentioned

### Reset
To clear everything and start over:
- Click "Reset" button
- Clears transcript
- Clears detected ZIP
- Clears area data

---

## Benefits

### For Service Providers
✅ **Hands-free operation** - No need to manually stop
✅ **Natural flow** - Focus on client, not buttons
✅ **Automatic data** - ZIP triggers data loading
✅ **Less cognitive load** - System handles the mechanics

### For Clients
✅ **Take time** - No rush to provide information
✅ **Natural pauses** - Think between sentences
✅ **No interruptions** - SP not clicking buttons during call

### For Efficiency
✅ **Faster calls** - Less time managing recording
✅ **Better data** - Always captures ZIP when mentioned
✅ **Reduced errors** - Automatic detection is reliable

---

## Console Logs

When working correctly:

```
[startListening] Starting speech recognition with continuous mode
[onstart] Speech recognition started (restart #0)

[User speaks: "The property is in..."]
[3 second pause]

[onend] Speech recognition ended
[onend] shouldBeListening: true
[onend] AUTO-RESTARTING (attempt #1)...
[onstart] Speech recognition started (restart #1)

[User continues: "...Miami, ZIP code 33101"]

[useEffect] ✓ Detected ZIP code: 33101
[useEffect] ZIP found - will stop listening after loading data
[fetchZipData] Starting fetch for ZIP: 33101
[WinSpect API] fetchReportsByZip called with ZIP: 33101

[2 seconds pass]

[useEffect] Stopping listening - ZIP code captured
[setKeepListening] Setting keep listening to: false
[setKeepListening] Stopping recognition because keep=false
[stopListening] Stopping listening, auto-restart disabled
[onend] Speech recognition ended
[onend] shouldBeListening: false
[onend] NOT restarting - user stopped manually
```

---

## Troubleshooting

### "System stops before I mention ZIP"
**Check:**
- Is there a 5-digit number in your transcript?
- System may detect phone numbers or addresses as ZIPs
- Use "Reset" and try again

### "System keeps listening after ZIP mentioned"
**Check:**
- Browser console for errors
- ZIP detection regex: `/\b(\d{5})\b/g`
- Try saying "ZIP code 33101" explicitly

### "ZIP detected but wrong city shown"
**Check:**
- ZIP code accuracy (e.g., 33101 vs 33110)
- Geocoding lookup table in `src/utils/geocoding.ts`
- May need to add ZIP to lookup table

---

## Customization

### Change Auto-Stop Delay

**File:** `src/App.tsx`

```typescript
// Current: 2 seconds
setTimeout(() => {
  setKeepListening(false);
}, 2000);

// Make it 5 seconds:
setTimeout(() => {
  setKeepListening(false);
}, 5000);

// Make it instant:
setKeepListening(false);
```

### Disable Auto-Stop

**Option 1:** Remove the auto-stop logic entirely
```typescript
// Comment out or remove:
// setTimeout(() => {
//   setKeepListening(false);
// }, 2000);
```

**Option 2:** Add a toggle in UI
```typescript
const [autoStop, setAutoStop] = useState(true);

if (autoStop) {
  setTimeout(() => setKeepListening(false), 2000);
}
```

### Detect Multiple ZIPs

Currently detects only the first ZIP. To detect all:

**File:** `src/data/mockZipData.ts`

```typescript
// Current: returns first match
export function detectZipCode(text: string): string | null {
  const zipRegex = /\b(\d{5})\b/g;
  const matches = text.match(zipRegex);
  return matches?.[0] || null;
}

// Modified: returns all matches
export function detectAllZipCodes(text: string): string[] {
  const zipRegex = /\b(\d{5})\b/g;
  return text.match(zipRegex) || [];
}
```

---

## Summary

🎯 **Smart Listening** = Automatic + Intelligent + User-Friendly

✅ Starts listening when user clicks "Start"
✅ Continues through pauses automatically
✅ Detects ZIP code from conversation
✅ Loads area data automatically
✅ Stops after ZIP detected (2 seconds)
✅ User can always manually override

**Result:** Service Providers can focus on the conversation while the system handles transcription, detection, and data loading automatically.
