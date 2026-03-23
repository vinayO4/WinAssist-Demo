# WIN Assist - Complete Workflow

## Overview
WIN Assist follows a smart, sequential workflow that ensures all necessary information is gathered before providing AI coaching suggestions.

---

## Complete Flow

### Step 1: Start Listening
**User Action:** Click "Start Listening"

**System Response:**
- 🔴 Microphone activates
- 🎤 Status: "Listening for ZIP code"
- Continuous listening mode enabled
- Auto-restart on pauses activated

**Visual Indicators:**
```
┌────────────────────────────────────────────┐
│ 🔴 Listening for ZIP code         [Stop]  │
│    Pauses OK - will stop when ZIP detected│
└────────────────────────────────────────────┘
```

---

### Step 2: Waiting for ZIP Code
**What Happens:**
- System listens continuously
- Auto-restarts after every pause
- Transcript builds up incrementally
- No AI suggestions generated yet

**Console Logs:**
```
[startListening] Starting speech recognition with continuous mode
[onstart] Speech recognition started (restart #0)
[Suggestions] Waiting for ZIP code and data before generating suggestions
```

**User Experience:**
```
Client: "Hi, I need a home inspection..."
[pause]
System: Auto-restarts, keeps listening
Client: "...for a property I'm buying in..."
[pause]
System: Auto-restarts, keeps listening
Client: "...Miami..."
[pause]
System: Auto-restarts, keeps listening
```

**Visual State:**
```
Live Transcript Panel:
┌────────────────────────────────────────────┐
│ "Hi, I need a home inspection for a       │
│  property I'm buying in Miami..."          │
└────────────────────────────────────────────┘

AI Coaching Suggestions Panel:
┌────────────────────────────────────────────┐
│ 🔒 Waiting for Property Information       │
│                                            │
│ AI suggestions will appear once ZIP code  │
│ is detected                                │
└────────────────────────────────────────────┘

Area Profile Panel:
┌────────────────────────────────────────────┐
│ Mention a ZIP code to see area insights   │
└────────────────────────────────────────────┘
```

---

### Step 3: ZIP Code Detected! 🎯

**Trigger:**
- Client mentions 5-digit ZIP code
- System detects pattern: `/\b(\d{5})\b/g`
- Examples: "33101", "ZIP 30301", "code 77001"

**System Actions (Automatic):**
1. ✓ Detects ZIP code
2. ✓ Shows green notification
3. ✓ Fetches data from WinSpect API
4. ✓ Waits 2 seconds for final words
5. ✓ Stops listening automatically

**Console Logs:**
```
[useEffect] ✓ Detected ZIP code: 33101
[useEffect] ZIP found - will stop listening after loading data
[fetchZipData] Starting fetch for ZIP: 33101
[WinSpect API] fetchReportsByZip called with ZIP: 33101
[WinSpect API] Response status: 200 OK
[WinSpect API] Parsed reports count: 150
✓ Loaded 150 inspection reports for ZIP 33101 from WinSpect API

[2 seconds pass]

[useEffect] Stopping listening - ZIP code captured
[setKeepListening] Setting keep listening to: false
[stopListening] Stopping listening, auto-restart disabled
```

**Visual State:**
```
Notification:
┌────────────────────────────────────────────┐
│ ✓ ZIP Code 33101 detected!                │
│   Loading area data...                    │
│   Will stop listening in 2 seconds        │
└────────────────────────────────────────────┘

Status Bar:
┌────────────────────────────────────────────┐
│ 🔴 Listening (stopping soon)       [Stop] │
└────────────────────────────────────────────┘
```

---

### Step 4: Area Data Loaded 📊

**System Actions:**
- Processes inspection reports
- Calculates statistics
- Displays area profile

**Visual State:**
```
Area Profile Panel:
┌────────────────────────────────────────────┐
│ Area Profile              [✓ Live Data]   │
│                                            │
│ Miami, FL                                  │
│ ZIP 33101                                  │
│                                            │
│ ┌──────────┬──────────┐                   │
│ │ Home Age │ Humidity │                    │
│ │  42 yrs  │   High   │                    │
│ └──────────┴──────────┘                    │
│ ┌──────────┬──────────┐                    │
│ │FloodZone │Foundation│                    │
│ │    AE    │   Slab   │                    │
│ └──────────┴──────────┘                    │
│                                            │
│ Top Services:                              │
│ Wind Mitigation     [████████░] 69%        │
│ Radon Testing       [████████░] 68%        │
│ 4-Point Inspection  [████░░░░░] 44%        │
│ Mold Inspection     [███░░░░░░] 31%        │
│ Sewer Scope         [██░░░░░░░] 22%        │
│                                            │
│ Avg Add-on Revenue: $420                   │
└────────────────────────────────────────────┘
```

---

### Step 5: AI Suggestions Generated 🤖

**Trigger:**
- ZIP code detected ✓
- ZIP data loaded ✓
- Transcript length > 50 characters ✓
- 2 second debounce completed ✓

**System Actions:**
- Calls Claude API
- Generates context-aware suggestions
- Displays coaching recommendations

**Console Logs:**
```
[Suggestions] ZIP detected and data loaded, will generate suggestions
[Suggestions] Calling Claude API for coaching suggestions...
[Suggestions] Received 3 suggestions from Claude
```

**Visual State:**
```
AI Coaching Suggestions Panel:
┌────────────────────────────────────────────┐
│ AI Coaching Suggestions                    │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ [Discovery] 95% confidence             │ │
│ │ "I see you're in Miami where 69% of    │ │
│ │  homes get wind mitigation inspections.│ │
│ │  Have you considered that for your     │ │
│ │  property?"                            │ │
│ │                                        │ │
│ │ Based on high wind mitigation frequency│ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ [Upsell] 88% confidence                │ │
│ │ "With homes averaging 42 years old in  │ │
│ │  this area, I'd recommend our 4-point  │ │
│ │  inspection bundle."                   │ │
│ │                                        │ │
│ │ Based on home age and insurance needs  │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ [Discovery] 82% confidence             │ │
│ │ "Given the high humidity in this area, │ │
│ │  would you like to add mold inspection?│ │
│ │                                        │ │
│ │ Based on humidity level and mold risks │ │
│ └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

---

## Complete Timeline

```
Time    Event                           Status
──────────────────────────────────────────────────────────────
0:00    User clicks "Start Listening"   🔴 Listening for ZIP
0:03    User: "Hi, I need..."          🎤 Transcribing
0:05    [pause]                         🔄 Auto-restart
0:08    User: "...inspection for..."   🎤 Transcribing
0:10    [pause]                         🔄 Auto-restart
0:13    User: "...property in Miami"   🎤 Transcribing
0:15    [pause]                         🔄 Auto-restart
0:18    User: "ZIP code 33101"         ✓ ZIP DETECTED!
0:18    API call starts                📡 Fetching data
0:19    Area data loaded               📊 Data displayed
0:20    [2 second grace period]        🔴 Stopping soon...
0:22    Listening stops automatically  ⏹️ Stopped
0:24    Claude API call starts         🤖 Generating...
0:26    Suggestions displayed          ✅ Complete!
```

---

## Key Rules

### 🚫 DON'T Generate Suggestions Before:
1. ❌ ZIP code is detected
2. ❌ ZIP data is loaded
3. ❌ Both conditions must be true

### ✅ DO Generate Suggestions After:
1. ✓ ZIP code detected
2. ✓ ZIP data loaded
3. ✓ Transcript has meaningful content (>50 chars)
4. ✓ 2 second debounce completed

### 🔄 Auto-Restart Triggers:
- Speech recognition ends naturally
- User pauses mid-sentence
- No speech detected for duration
- Only while `shouldBeListening = true`

### 🛑 Auto-Stop Triggers:
- ZIP code detected + 2 second grace period
- User clicks "Stop Listening" manually
- Critical error (mic disconnected)

---

## Error Handling

### No ZIP Detected
```
User speaks but never mentions ZIP
→ System keeps listening indefinitely
→ User must click "Stop Listening" manually
→ No area data loaded
→ No AI suggestions generated
```

### Invalid ZIP
```
User mentions "12345" (invalid ZIP)
→ System detects as ZIP
→ API returns no data
→ Falls back to mock data (if available)
→ Generates suggestions based on fallback
```

### API Failure
```
WinSpect API unavailable
→ Falls back to mock data
→ Shows "Demo Data" badge
→ Generates suggestions normally
```

### Claude API Failure
```
Claude API unavailable
→ Falls back to mock suggestions
→ Shows hardcoded recommendations
→ User can still see area data
```

---

## Console Debug Guide

### Healthy Flow
```
✓ [startListening] Starting...
✓ [onstart] Started (restart #0)
✓ [onend] AUTO-RESTARTING (attempt #1)
✓ [onstart] Started (restart #1)
✓ [useEffect] ✓ Detected ZIP: 33101
✓ [fetchZipData] Calling API...
✓ [WinSpect API] Response: 200 OK
✓ [Suggestions] Calling Claude API...
✓ [Suggestions] Received 3 suggestions
```

### Premature Stop Issue (Fixed)
```
❌ [onend] NOT restarting - user stopped manually
   (Before ZIP detected - BAD!)

Fixed by: shouldBeListeningRef.current = true until ZIP found
```

### Premature Suggestions Issue (Fixed)
```
❌ [Suggestions] Calling Claude API...
   (Before ZIP detected - BAD!)

Fixed by: Check detectedZip && zipData before calling API
```

---

## Summary

**The Golden Rule:**
> Listen continuously → Detect ZIP → Load Data → Generate Suggestions

**3 Required Conditions for AI Suggestions:**
1. ✓ ZIP code detected
2. ✓ ZIP data loaded
3. ✓ Meaningful transcript

**User Experience:**
- ✅ Natural conversation flow
- ✅ No manual intervention needed
- ✅ Smart auto-stop when info captured
- ✅ Context-aware coaching suggestions
- ✅ Real-time area insights

**Result:**
Service Providers can focus 100% on the conversation while WIN Assist handles:
- ✓ Transcription
- ✓ ZIP detection
- ✓ Data fetching
- ✓ AI coaching
- ✓ Automatic stop

All automatically, intelligently, seamlessly. 🎯
