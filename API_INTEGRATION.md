# WinSpect API Integration

## Overview
WIN Assist now integrates with the real WinSpect API to fetch actual inspection report data instead of using mock data. The system automatically falls back to demo data if the API is unavailable or returns no results.

---

## Setup

### 1. Environment Variables
Add your WinSpect API token to `.env`:

```bash
VITE_WINSPECT_API_URL=https://staging.winspectdev.com/be/reportwriter/api/v1
VITE_WINSPECT_API_TOKEN=your-bearer-token-here
```

**To get an API token:**
- Contact your WinSpect administrator
- Or use the staging environment credentials provided

### 2. Testing
The integration works automatically once the environment variables are set:

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# The app will automatically:
# 1. Try to fetch real data from WinSpect API
# 2. Fall back to demo data if API unavailable
# 3. Show a badge indicating data source (Live/Demo)
```

---

## How It Works

### Data Flow

```
User speaks ZIP code (e.g., "33101")
    ↓
App detects ZIP from transcript
    ↓
fetchZipData() called
    ↓
┌─────────────────────────────────────┐
│ Try: fetchReportsByZip(zip)        │
│ → POST /poc-report/list            │
│ → Authorization: Bearer [token]     │
│ → Body: { "zip": "33101" }         │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Success: Got inspection reports     │
│ → aggregateReportData(reports)     │
│ → Calculate service frequencies     │
│ → Calculate avg home age, revenue   │
│ → convertToZipData(aggregated)     │
└─────────────────────────────────────┘
    ↓
Display area profile with "✓ Live Data" badge

OR (if API fails)
    ↓
┌─────────────────────────────────────┐
│ Fallback: getZipData(zip)          │
│ → Use hardcoded demo data          │
└─────────────────────────────────────┘
    ↓
Display area profile with "Demo Data" badge
```

### API Endpoint

**POST** `https://staging.winspectdev.com/be/reportwriter/api/v1/poc-report/list`

**Headers:**
```json
{
  "Authorization": "Bearer [your-token]",
  "Content-Type": "application/json",
  "Accept": "application/json",
  "client_type": "Desktop"
}
```

**Request Body:**
```json
{
  "zip": "33101"
}
```

**Response:**
```json
{
  "data": [
    {
      "zip": "33101",
      "propertyAge": 42,
      "yearBuilt": 1982,
      "radonIssue": true,
      "moldIssue": false,
      "services": ["Wind Mitigation", "Radon Testing"],
      "totalCost": 450,
      "inspectionDate": "2024-01-15"
    },
    // ... more reports
  ],
  "total": 150,
  "success": true
}
```

---

## File Structure

### Key Files

**`src/services/winspectApi.ts`**
- API client for WinSpect integration
- Functions:
  - `fetchReportsByZip(zip)` - Fetch reports from API
  - `aggregateReportData(reports)` - Calculate statistics
  - `convertToZipData(aggregated, city, state)` - Transform to app format
  - `parseReports(response)` - Parse API response
  - `normalizeServiceName(name)` - Standardize service names

**`src/utils/geocoding.ts`**
- ZIP code to city/state lookup
- Uses lookup table for common ZIPs
- Falls back to state inference from ZIP prefix

**`src/App.tsx`**
- Main integration point
- `fetchZipData()` function orchestrates API call and fallback
- Shows loading/error states
- Displays "Live Data" vs "Demo Data" badge

**`src/data/mockZipData.ts`**
- Fallback demo data
- Used when API unavailable or no token provided

---

## Data Transformation

### 1. Raw API Reports → Aggregated Data

**Input:** Array of inspection reports
```typescript
[
  { zip: "33101", radonIssue: true, moldIssue: false, totalCost: 450 },
  { zip: "33101", radonIssue: true, moldIssue: true, totalCost: 380 },
  // ... 148 more reports
]
```

**Output:** Aggregated statistics
```typescript
{
  zip: "33101",
  totalInspections: 150,
  serviceFrequencies: {
    "Wind Mitigation": 69,      // 69% of inspections
    "Radon Testing": 68,
    "4-Point Inspection": 44,
    "Mold Inspection": 31,
    "Sewer Scope": 22
  },
  avgHomeAge: 42,
  avgRevenue: 420,
  commonIssues: {
    "Radon": 68,
    "Mold": 31,
    "HVAC": 15,
    "Foundation": 12,
    "Sewer": 10
  }
}
```

### 2. Aggregated Data → App Format

**Output:** Full ZIP data for UI display
```typescript
{
  zip: "33101",
  city: "Miami",
  state: "FL",
  homeProfile: {
    avgAge: 42,
    humidity: "high",          // Inferred from mold frequency
    floodZone: "X",           // Default (can be enhanced)
    predominantFoundation: "Slab"
  },
  riskFactors: [
    {
      name: "Radon Risk",
      severity: "high",
      description: "Elevated radon levels detected",
      statValue: "68% above EPA limits"
    }
  ],
  serviceFrequencies: [
    {
      serviceName: "Wind Mitigation",
      frequency: 69,
      avgRevenue: 150,
      description: "Insurance discounts for wind-resistant features"
    }
  ],
  avgAddOnRevenue: 420
}
```

---

## Service Name Normalization

The API may return service names in various formats. We normalize them:

| API Response | Normalized |
|-------------|-----------|
| "wind medication", "win mitigation" | "Wind Mitigation" |
| "ray don testing", "radar testing" | "Radon Testing" |
| "mold in section", "mole inspection" | "Mold Inspection" |
| "sue or scope", "sewer scoop" | "Sewer Scope" |

This is done in `normalizeServiceName()` function.

---

## Error Handling

### No API Token
```
⚠️ VITE_WINSPECT_API_TOKEN not found
→ Using mock data automatically
→ Badge shows "Demo Data"
```

### API Error (Network, 500, etc.)
```
❌ Error fetching WinSpect data: [error]
→ Falling back to mock data
→ Badge shows "Demo Data"
```

### No Reports for ZIP
```
⚠️ No inspection reports found for ZIP 99999
→ Using mock data if available
→ Otherwise show "No data available" error
```

### ZIP Not in Mock Data
```
❌ No data available for ZIP 99999
→ Show error state in UI
→ User can try different ZIP
```

---

## Visual Indicators

### Loading State
```
┌─────────────────────────────────────┐
│ Area Profile                        │
│                                     │
│        [spinning icon]              │
│  Loading inspection data for        │
│  ZIP 33101...                       │
└─────────────────────────────────────┘
```

### Live Data Badge
```
┌─────────────────────────────────────┐
│ Area Profile          [✓ Live Data] │  ← Green badge
└─────────────────────────────────────┘
```

### Demo Data Badge
```
┌─────────────────────────────────────┐
│ Area Profile          [Demo Data]   │  ← Gray badge
└─────────────────────────────────────┘
```

---

## Testing

### With Real API

1. Set `VITE_WINSPECT_API_TOKEN` in `.env`
2. Start app: `npm run dev`
3. Say: "The property is in ZIP code 38019"
4. Should see:
   - Loading spinner
   - "✓ Live Data" badge
   - Real inspection statistics
   - Console: "✓ Loaded X inspection reports for ZIP 38019 from WinSpect API"

### Without API Token (Demo Mode)

1. Remove or comment out `VITE_WINSPECT_API_TOKEN`
2. Start app: `npm run dev`
3. Say: "The property is in Miami 33101"
4. Should see:
   - "Demo Data" badge
   - Hardcoded statistics from mockZipData.ts
   - Console: "VITE_WINSPECT_API_TOKEN not found. Using mock data."

### Test ZIPs

**ZIPs with real data (staging):**
- 38019 - Covington, TN
- (Add more as provided by WinSpect team)

**ZIPs with demo data (fallback):**
- 33101 - Miami, FL
- 30301 - Atlanta, GA
- 77001 - Houston, TX

---

## Future Enhancements

### 1. Caching
Add Redis or local storage to cache API responses:
```typescript
const cachedData = localStorage.getItem(`zip_${zip}`);
if (cachedData && !isStale(cachedData)) {
  return JSON.parse(cachedData);
}
```

### 2. Real Geocoding
Replace simple ZIP lookup with Google Maps API:
```typescript
const location = await geocodeZip(zip);
// Returns: { city: "Miami", state: "FL", lat: 25.7617, lng: -80.1918 }
```

### 3. Additional Data Sources
- Flood zone data from FEMA API
- Climate data from NOAA API
- Home age from tax assessor APIs

### 4. Batch Requests
Fetch multiple ZIPs at once for nearby areas:
```typescript
const nearbyZips = ['33101', '33109', '33139'];
const allReports = await Promise.all(
  nearbyZips.map(z => fetchReportsByZip(z))
);
```

---

## Troubleshooting

### "CORS error when calling API"
- **Cause:** API doesn't allow requests from localhost
- **Solution:** Contact WinSpect team to whitelist your domain

### "401 Unauthorized"
- **Cause:** Invalid or expired API token
- **Solution:** Get a new token from WinSpect admin

### "No data showing for any ZIP"
- **Cause:** Both API and mock data failing
- **Solution:** Check console for errors, verify .env file

### "Demo data showing even with valid token"
- **Cause:** API returning empty array for that ZIP
- **Solution:** Try a different ZIP or check with WinSpect team

---

## Summary

✅ Real WinSpect API integration complete
✅ Automatic fallback to demo data
✅ Loading and error states
✅ Visual indicators for data source
✅ Easy to test with/without API token
✅ Production-ready error handling

**Next Steps:**
1. Get API token from WinSpect team
2. Add to `.env` file
3. Test with real ZIPs
4. Deploy with confidence!
