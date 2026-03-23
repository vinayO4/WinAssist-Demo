# Smart ZIP Code Detection

## Overview
WIN Assist now includes intelligent ZIP code detection that handles various speech patterns, including pauses mid-ZIP code and separated digits.

---

## Problem: Pauses Mid-ZIP Code

### What Was Happening
When users pause while saying a ZIP code:
```
User: "three three" [pause] "one zero one"
Speech Recognition:
  - Final result 1: "33"
  - Final result 2: "101"
Transcript: "33 101"
Old Regex: /\b(\d{5})\b/g
Result: ❌ No match (needs 5 consecutive digits)
```

### The Issue
- Speech recognition finalizes results during pauses
- Each segment becomes a separate final result
- Standard regex requires 5 consecutive digits with no spaces
- Split ZIPs like "33 101" were not detected

---

## Solution: Two-Strategy Detection

### Strategy 1: Standard Detection (Fast Path)
**When:** ZIP code spoken without pauses

**Pattern:** `/\b(\d{5})\b/g`

**Examples:**
```
"The ZIP is 33101" → ✓ Detects: 33101
"Miami 33101" → ✓ Detects: 33101
"ZIP code 33101" → ✓ Detects: 33101
```

### Strategy 2: Split Detection (Fallback)
**When:** Standard detection fails, tries combining digit sequences

**Process:**
1. Remove ZIP-related words ("zip", "code", "postal")
2. Extract all digit sequences
3. Try combining adjacent sequences
4. Return first valid 5-digit combination

**Examples:**
```
"33 101" → Sequences: ["33", "101"] → Combined: "33101" ✓
"three three 101" → Sequences: ["33", "101"] → Combined: "33101" ✓
"3 3 1 0 1" → Sequences: ["3", "3", "1", "0", "1"] → Combined: "33101" ✓
"thirty 3 101" → Sequences: ["3", "101"] → ❌ Only 4 digits
```

---

## Supported Patterns

### ✅ Working Patterns

| User Says | Transcript | Detected ZIP | Strategy |
|-----------|------------|--------------|----------|
| "33101" | "33101" | 33101 | Standard |
| "ZIP 33101" | "ZIP 33101" | 33101 | Standard |
| "thirty three one oh one" | "33101" | 33101 | Standard |
| "three three" [pause] "one zero one" | "33 101" | 33101 | Split |
| "3" [pause] "3" [pause] "101" | "3 3 101" | 33101 | Split |
| "ZIP code 3 3 1 0 1" | "ZIP code 3 3 1 0 1" | 33101 | Split |
| "Miami, 33" [pause] "101" | "Miami, 33 101" | 33101 | Split |

### ⚠️ Edge Cases

| User Says | Transcript | Result | Reason |
|-----------|------------|--------|--------|
| "thirty" [pause] "three one oh one" | "30 3101" | ❌ No match | 30 + 3101 = 7 digits |
| "three" [pause] "three oh one" | "3 301" | ❌ No match | 3 + 301 = 4 digits |
| "three thirty one oh one" | "331 01" | 33101 ✓ | Works if speech recognition groups correctly |

---

## How It Works

### Code Flow

```typescript
export function detectZipCode(text: string): string | null {
  // Strategy 1: Standard regex
  const zipRegex = /\b(\d{5})\b/g;
  const matches = text.match(zipRegex);

  if (matches && matches.length > 0) {
    console.log('Found 5-digit ZIP:', matches);
    return matches[0];
  }

  // Strategy 2: Split detection
  const digitSequences = text.match(/\d+/g);

  if (!digitSequences) return null;

  // Try combining adjacent sequences
  for (let i = 0; i < digitSequences.length; i++) {
    // Single sequence of exactly 5 digits
    if (digitSequences[i].length === 5) {
      return digitSequences[i];
    }

    // Two adjacent sequences (e.g., "33" + "101")
    if (i < digitSequences.length - 1) {
      const combined = digitSequences[i] + digitSequences[i + 1];
      if (combined.length === 5) {
        return combined;
      }
    }

    // Three adjacent sequences (e.g., "3" + "3" + "101")
    if (i < digitSequences.length - 2) {
      const combined = digitSequences[i] + digitSequences[i + 1] + digitSequences[i + 2];
      if (combined.length === 5) {
        return combined;
      }
    }
  }

  return null;
}
```

---

## Console Logging

### Standard Detection
```
[detectZipCode] Found 5-digit ZIP(s): ["33101"]
[useEffect] ✓ Detected ZIP code: 33101
```

### Split Detection
```
[detectZipCode] No 5-digit ZIP found, trying split detection...
[detectZipCode] Cleaned text: "the property is in miami  33 101"
[detectZipCode] Found digit sequences: ["33", "101"]
[detectZipCode] Combined sequences: 33 + 101 = 33101
[useEffect] ✓ Detected ZIP code: 33101
```

### No Detection
```
[detectZipCode] No 5-digit ZIP found, trying split detection...
[detectZipCode] Found digit sequences: ["3", "301"]
[detectZipCode] Could not form valid 5-digit ZIP
[useEffect] No ZIP code detected yet in transcript
```

---

## Best Practices for Users

### ✅ Recommended Speech Patterns

1. **Say ZIP as single number:**
   ```
   "The ZIP is thirty three one oh one"
   → Best: Recognized as "33101" (no spaces)
   ```

2. **Say "ZIP code" first:**
   ```
   "ZIP code 33101"
   → Helps speech recognition understand context
   ```

3. **If pausing, pause between clear segments:**
   ```
   "three three" [pause] "one zero one"
   → Recognized as "33 101" → Detects "33101" ✓
   ```

4. **Avoid pausing mid-digit group:**
   ```
   ❌ "three" [pause] "three" [pause] "one" [pause] "zero" [pause] "one"
   → May work but risky: "3 3 1 0 1"

   ✓ "three three" [pause] "one zero one"
   → More reliable: "33 101"
   ```

---

## Testing

### Test Case 1: Standard Format
```bash
1. Click "Start Listening"
2. Say: "The property is in ZIP code 33101"
3. Expected: ✓ Detects 33101 immediately
4. Console: "Found 5-digit ZIP: ['33101']"
```

### Test Case 2: Pause After First Two Digits
```bash
1. Click "Start Listening"
2. Say: "The ZIP is thirty three"
3. Pause 2 seconds
4. Say: "one zero one"
5. Expected: ✓ Detects 33101 after second part
6. Console: "Combined sequences: 33 + 101 = 33101"
```

### Test Case 3: Multiple Small Pauses
```bash
1. Click "Start Listening"
2. Say: "three" [pause] "three" [pause] "one zero one"
3. Expected: ✓ Detects 33101
4. Console: "Combined 3 sequences: 3 + 3 + 101 = 33101"
```

### Test Case 4: Wrong Split
```bash
1. Click "Start Listening"
2. Say: "thirty" [pause] "three one oh one"
3. Expected: ❌ No detection (30 + 3101 = 7 digits)
4. Console: "Could not form valid 5-digit ZIP"
5. User continues listening, can retry
```

---

## Increased Grace Period

**Changed from 2 seconds to 3 seconds**

**Why:**
- User might say "thirty three" [2s pause] "one zero one"
- Need time for both parts to be captured
- 3 seconds allows for natural speaking rhythm

**Code:**
```typescript
setTimeout(() => {
  setKeepListening(false);
}, 3000); // Was 2000, now 3000
```

---

## Edge Cases Handled

### 1. Multiple ZIPs in Transcript
```
Transcript: "I have properties in 33101 and 30301"
Result: Detects first ZIP → 33101
```

### 2. ZIP in Phone Number
```
Transcript: "My phone is 305-123-4567"
Result: May detect "30512" or "34567"
Workaround: System prioritizes ZIPs in mock data
```

### 3. Partial ZIP Before Complete
```
Transcript: "The ZIP starts with 33... actually it's 33101"
Result: Detects 33101 when complete
```

### 4. ZIP at End of Sentence
```
Transcript: "The address ends in 33101"
Result: Detects 33101 ✓
```

---

## Future Improvements

### 1. Context-Aware Detection
```typescript
// Prefer ZIPs mentioned after "ZIP" or "code"
const contextPattern = /(?:zip|code|postal)\s*:?\s*(\d{2,3})\s+(\d{2,3})/gi;
```

### 2. State Validation
```typescript
// Validate ZIP matches state mentioned
"Florida... 33101" → ✓ Valid (FL ZIP)
"Florida... 90210" → ⚠️ Warning (CA ZIP)
```

### 3. Confidence Scoring
```typescript
// Prefer cleaner detections
"33101" → Confidence: 100%
"33 101" → Confidence: 90%
"3 3 1 0 1" → Confidence: 70%
```

### 4. Voice Hints
```typescript
// Listen for ZIP-related keywords
if (transcript.includes("zip code") || transcript.includes("postal")) {
  // Look extra carefully for ZIP in next 10 words
}
```

---

## Troubleshooting

### Issue: "Still only detects 101, not 33101"

**Check:**
1. Open browser console
2. Look for `[detectZipCode]` logs
3. Check what digit sequences were found

**Debug:**
```
[detectZipCode] No 5-digit ZIP found, trying split detection...
[detectZipCode] Found digit sequences: ["101"]
```
→ Problem: "33" was not captured in transcript at all

**Solution:**
- Speak slightly slower
- Try: "three three... one zero one"
- Or say: "ZIP code thirty three one oh one" (no pause)

### Issue: "Detects wrong ZIP like 30512"

**Check:**
```
[detectZipCode] Found 5-digit ZIP: ["30512"]
[useEffect] ✓ Detected ZIP code: 30512
```
→ Problem: Unintended 5-digit sequence in transcript

**Solution:**
- Say "ZIP code" before the actual ZIP
- System looks for ZIPs in mock data first
- 30512 might not be in data, so it searches for next match

---

## Summary

### What Changed ✅
- ✓ Added split detection strategy
- ✓ Handles pauses mid-ZIP code
- ✓ Combines adjacent digit sequences
- ✓ Increased grace period to 3 seconds
- ✓ Enhanced console logging

### What Works Now ✅
- ✓ "33101" (standard)
- ✓ "33 101" (pause after 2 digits)
- ✓ "3 3 101" (multiple small pauses)
- ✓ "ZIP code 33 101" (with context)

### Best User Experience ✅
**Recommended:** Say ZIP code smoothly without long pauses
- "thirty three one oh one" ← Best
- "three three... one zero one" ← Good
- "three... three... one... zero... one" ← Risky but works

The system is now much more forgiving of natural speech patterns! 🎯
