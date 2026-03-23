# Property Data Integration Setup

## Overview
WIN Assist now integrates property data APIs (Zillow, Realtor, etc.) to provide enhanced AI coaching suggestions based on specific property characteristics like age, size, features, and more.

---

## Why Property Data?

### Better Suggestions
With property details, AI can suggest:
- **Age-based services**: 4-point inspections for 30+ year homes
- **Size-based services**: Comprehensive HVAC for large homes
- **Feature-based services**: Basement inspection, pool inspection, septic system checks
- **Type-based services**: HOA reviews for condos

### Example Enhancement

**Without Property Data:**
```
"Consider offering wind mitigation inspection (69% frequency in this area)"
```

**With Property Data:**
```
"This 42-year-old, 2,100 sq ft home with a pool needs:
1. 4-Point Inspection (insurance requirement for 30+ year homes)
2. HVAC inspection (typical 15-20 year lifespan)
3. Pool equipment inspection
4. Wind mitigation (69% frequency in Miami)"
```

---

## API Options

### Option 1: RapidAPI - Zillow (Recommended)

**Pros:**
- Easy to use
- Comprehensive property data
- Pay-as-you-go pricing
- Good documentation

**Setup:**
1. Go to https://rapidapi.com/apimaker/api/zillow-com1
2. Sign up for RapidAPI (free account)
3. Subscribe to Zillow API (has free tier)
4. Copy your API key
5. Add to `.env`:
   ```
   VITE_RAPIDAPI_KEY=your_rapidapi_key_here
   ```

**Pricing:**
- Free tier: 100 requests/month
- Basic: $9.99/month - 500 requests
- Pro: $29.99/month - 2,500 requests

### Option 2: RapidAPI - Realty in US

**Alternative Zillow API:**
https://rapidapi.com/datascraper/api/realty-in-us

Similar pricing and features.

### Option 3: Attom Data Solutions

**Enterprise Option:**
- More comprehensive data
- Higher cost
- Better for production apps
- https://api.attomdata.com/

---

## Current Implementation

### Mock Data (Default)
Currently uses mock property data for testing:

```typescript
// src/services/propertyDataApi.ts - getMockPropertyData()
{
  '33101': {
    address: '123 Ocean Drive',
    city: 'Miami',
    propertyAge: 42,
    livingArea: 2100,
    bedrooms: 3,
    bathrooms: 2,
    hasPool: true,
    hasGarage: true,
  }
}
```

### Real API Integration
When `VITE_RAPIDAPI_KEY` is set, the system will:
1. Detect ZIP code from speech
2. Call WinSpect API for area inspection data
3. Call Zillow API for property details
4. Combine both datasets
5. Generate enhanced AI suggestions

---

## How to Activate Real API

### Step 1: Get RapidAPI Key
```bash
1. Visit: https://rapidapi.com/apimaker/api/zillow-com1
2. Click "Subscribe to Test"
3. Choose plan (Free tier available)
4. Copy your API key from the dashboard
```

### Step 2: Add to Environment
Edit `.env`:
```bash
# Uncomment and add your key
VITE_RAPIDAPI_KEY=abc123your-actual-key-here
```

### Step 3: Restart Server
```bash
npm run dev
```

### Step 4: Test
1. Start listening
2. Say: "Property at 123 Ocean Drive, Miami, 33101"
3. Check console for:
   ```
   [Zillow API] Fetching property: 123 Ocean Drive, Miami, FL
   [Zillow API] Received property data: {...}
   [fetchPropertyData] ✓ Loaded property data
   ```

---

## What Gets Fetched

### From Zillow API:
- **Basic Info**: Address, city, state, ZIP
- **Size**: Living area (sq ft), lot size
- **Age**: Year built, calculated age
- **Layout**: Bedrooms, bathrooms
- **Type**: Single Family, Condo, Townhouse, etc.
- **Features**: Basement, garage, pool, heating/cooling systems
- **Value**: Last sold price, estimated value

### Combined with WinSpect Data:
- Area risk factors (flood zone, humidity)
- Service frequencies in the area
- Common inspection issues
- Average add-on revenue

---

## How It Works

### 1. Address Detection
System listens for address patterns:
```
"Property at 123 Main Street, Houston, Texas"
"Located at 456 Oak Ave, Atlanta, GA 30301"
"Home at 789 Elm St, Miami 33101"
```

### 2. Data Fetch Flow
```
ZIP detected (33101)
    ↓
Fetch WinSpect data (area statistics)
    ↓
Fetch property data (Zillow API)
    ↓
Combine datasets
    ↓
Generate property-specific recommendations
    ↓
Pass to Claude API with enhanced context
    ↓
Display improved suggestions
```

### 3. Enhanced Context Sent to Claude
```
Property: 123 Ocean Drive, Miami, FL
Age: 42 years old (built 1982)
Size: 2,100 sq ft
Type: Single Family
3 bed, 2 bath
Features: garage, pool
Area avg home age: 42 years
Humidity: high
Flood zone: AE

PROPERTY-SPECIFIC SERVICES TO CONSIDER:
1. 4-Point Inspection (insurance requirement for 30+ year homes)
2. Electrical panel inspection (older wiring systems)
3. HVAC system inspection (typical 15-20 year lifespan)
4. Roof inspection (typical 20-25 year lifespan)
5. Pool equipment inspection
6. Garage door safety inspection

[Conversation transcript follows...]
```

---

## UI Display

### Property Details Card
When property data is available, shows:
```
┌─────────────────────────────────────┐
│ Property Details                    │
├─────────────────────────────────────┤
│ Address      123 Ocean Drive        │
│ Property Age 42 years (Built 1982)  │
│ Living Area  2,100 sq ft           │
│ Type         Single Family          │
│ Bed/Bath     3 bed, 2 bath         │
│ Features     Garage, Pool           │
└─────────────────────────────────────┘
```

---

## Testing Without Real API

### Mock Data Locations
Three ZIP codes have mock property data:
- **33101** (Miami): 42-year-old, 2,100 sq ft, pool
- **30301** (Atlanta): 29-year-old, 1,850 sq ft, basement
- **77001** (Houston): 21-year-old, 2,400 sq ft, pool

### Test Flow
```bash
1. Start listening
2. Say: "Property in Miami, ZIP 33101"
3. System uses mock property data automatically
4. Check console:
   [fetchPropertyData] ✓ Loaded property data: {...}
   [Suggestions] Property-based recommendations: [...]
5. See enhanced suggestions in UI
```

---

## Code Structure

### Main Files

**`src/services/propertyDataApi.ts`**
- Zillow API integration
- Address parsing
- Property data transformation
- Mock data for testing
- Recommendation generation

**`src/App.tsx`**
- Integrated property data state
- Fetches property data after ZIP detected
- Passes to Claude API for suggestions
- Displays property details in UI

### Key Functions

```typescript
// Fetch from Zillow API
fetchPropertyFromZillow(address, city, state)

// Get mock data (fallback)
getMockPropertyData(zip)

// Generate service recommendations
generatePropertyBasedRecommendations(propertyData)

// Create enhanced context for Claude
generateEnhancedContext(propertyData, areaData)

// Parse address from speech
parseAddressFromTranscript(transcript)
```

---

## Cost Estimation

### API Calls per Session
- 1 ZIP code detection
- 1 WinSpect API call (free)
- 1 Zillow API call (if address provided)
- ~20-40 Claude API calls (real-time suggestions)

### Monthly Costs (Example: 100 calls)
- Zillow API: Free tier (up to 100/month)
- Claude API: ~$5-10 (depends on usage)
- **Total: $5-10/month for testing**

### Production Costs (Example: 1,000 calls/month)
- Zillow API: $29.99 (Pro plan - 2,500 requests)
- Claude API: ~$50-100
- **Total: ~$80-130/month**

---

## Troubleshooting

### Issue: "No RapidAPI key found"
**Console:**
```
[Zillow API] No RapidAPI key found in environment variables
[Zillow API] Add VITE_RAPIDAPI_KEY to .env file
```

**Solution:**
1. Check `.env` file has `VITE_RAPIDAPI_KEY=...`
2. Restart dev server: `npm run dev`
3. Key should NOT have quotes around it

### Issue: "Property data not showing"
**Check:**
1. ZIP code detected? (Green notification)
2. Console shows property data fetch?
3. Mock data should work without API key

**Debug:**
```javascript
// Check browser console for:
[fetchPropertyData] Attempting to fetch property details for ZIP: 33101
[fetchPropertyData] ✓ Loaded property data: {address: "...", age: 42, ...}
```

### Issue: API rate limit exceeded
**Error:** `429 Too Many Requests`

**Solution:**
1. Upgrade RapidAPI plan
2. Or use mock data for testing
3. System automatically falls back to mock data

---

## Future Enhancements

### Planned Features
1. **Address autocomplete** - Suggest addresses as user speaks
2. **Multiple property comparison** - Compare with similar homes
3. **Historical trend data** - Show how home has changed over time
4. **Neighborhood insights** - School ratings, crime stats, etc.
5. **Real-time valuation** - Estimated property value during call

### Alternative APIs to Consider
- **Google Maps API** - Geocoding and address validation
- **Census Bureau API** - Demographic and housing data
- **FEMA Flood Maps API** - Detailed flood risk data
- **EPA Radon Map** - Radon risk by location

---

## Summary

### What's Working Now ✅
- ✓ Mock property data for 3 ZIP codes
- ✓ Property-based recommendation engine
- ✓ Enhanced Claude API context
- ✓ Property details display in UI
- ✓ Graceful fallback if no API key

### To Activate Real Data ✅
1. Get RapidAPI key (free tier available)
2. Add `VITE_RAPIDAPI_KEY` to `.env`
3. Restart server
4. Test with real addresses

### Result 🎯
**AI suggestions now include property-specific services like:**
- "This 42-year-old home needs a 4-point inspection"
- "Pool equipment inspection recommended for this property"
- "Basement moisture check critical for this home type"

**Better conversion rates with precise, property-specific coaching!** 🚀
