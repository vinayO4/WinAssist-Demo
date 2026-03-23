/**
 * Property Data API Service
 * Fetches detailed property information using Zillow or similar APIs
 *
 * API Options:
 * 1. RapidAPI - Zillow API: https://rapidapi.com/apimaker/api/zillow-com1
 * 2. RapidAPI - Realty in US: https://rapidapi.com/datascraper/api/realty-in-us
 * 3. Attom Data Solutions: https://api.attomdata.com/
 */

export interface PropertyDetails {
  address: string;
  city: string;
  state: string;
  zip: string;

  // Property characteristics
  yearBuilt: number | null;
  propertyAge: number | null;
  livingArea: number | null; // Square feet
  lotSize: number | null; // Square feet
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string | null; // Single Family, Condo, Townhouse, etc.

  // Condition indicators
  lastSoldDate: string | null;
  lastSoldPrice: number | null;
  estimatedValue: number | null;

  // Risk factors we can infer
  hasBasement: boolean | null;
  hasGarage: boolean | null;
  hasPool: boolean | null;
  heatingType: string | null;
  coolingType: string | null;
  roofType: string | null;

  // Data source
  source: 'zillow' | 'realtor' | 'attom' | 'mock';
}

/**
 * Parse address from transcript
 * Extracts: street address, city, state, ZIP
 */
export function parseAddressFromTranscript(transcript: string): {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
} | null {
  console.log('[parseAddress] Parsing address from transcript:', transcript);

  // Clean up voice recognition errors
  let cleanedTranscript = transcript
    .replace(/\b(as|ass|s\.)\s+(main|man)/gi, 'S Main') // "as Main" -> "S Main"
    .replace(/\bgoing\s+(tennessee|tennesse|tn)/gi, 'Covington TN') // "going tennessee" -> "Covington TN"
    .replace(/\bzip\s+code\s+is\s+/gi, '') // Remove "zip code is" phrase
    .replace(/\band\s+the\s+zip\s+is\s+/gi, ' '); // Remove "and the zip is"

  console.log('[parseAddress] Cleaned transcript:', cleanedTranscript);

  // Look for ZIP code
  const zipMatch = cleanedTranscript.match(/\b(\d{5})\b/);
  const zip = zipMatch ? zipMatch[1] : null;

  // Pattern 1: "located at [address]" format with conversational ZIP mention
  // Example: "property at 503 S Main Street Covington TN 38019"
  const conversationalPattern = /(property at|located at|address is|at my property|at)\s+([0-9]+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Circle|Cir|Lane|Ln|Boulevard|Blvd|Court|Ct|Way)?)\s+([A-Za-z\s]+?)\s+([A-Z]{2}|tennessee|tennesse|texas|florida|georgia)\s*(\d{5})?/i;
  let match = cleanedTranscript.match(conversationalPattern);

  if (match) {
    console.log('[parseAddress] ✓ Found conversational address format');
    let state = match[4].trim().toUpperCase();
    // Convert full state names to abbreviations
    if (state === 'TENNESSEE' || state === 'TENNESSE') state = 'TN';
    if (state === 'TEXAS') state = 'TX';
    if (state === 'FLORIDA') state = 'FL';
    if (state === 'GEORGIA') state = 'GA';

    return {
      street: match[2]?.trim().replace(/\s+/g, ' '),
      city: match[3]?.trim(),
      state: state,
      zip: match[5] || zip || undefined,
    };
  }

  // Pattern 2: With trigger phrases (property at, located at, etc.)
  const addressPhrasesPattern = /(property at|located at|address is|home at|house at|inspecting)\s+([^,]+),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})?/i;
  match = cleanedTranscript.match(addressPhrasesPattern);

  if (match) {
    console.log('[parseAddress] ✓ Found address with trigger phrase');
    return {
      street: match[2]?.trim(),
      city: match[3]?.trim(),
      state: match[4]?.trim(),
      zip: match[5] || zip || undefined,
    };
  }

  // Pattern 3: Direct format without trigger (Street, City, STATE ZIP)
  const directAddressPattern = /\b([0-9]+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Circle|Cir|Lane|Ln|Boulevard|Blvd|Court|Ct|Way))\s*,?\s*([A-Za-z\s]+),?\s*([A-Z]{2})\s*(\d{5})\b/i;
  match = cleanedTranscript.match(directAddressPattern);

  if (match) {
    console.log('[parseAddress] ✓ Found direct address format');
    return {
      street: match[1]?.trim(),
      city: match[2]?.trim(),
      state: match[3]?.trim(),
      zip: match[4],
    };
  }

  // Pattern 4: More flexible - any street pattern followed by city, state, zip
  const flexiblePattern = /([0-9]+\s+[A-Za-z\s]+)\s*,?\s*([A-Za-z\s]+)\s*,?\s*([A-Z]{2})\s*(\d{5})/i;
  match = cleanedTranscript.match(flexiblePattern);

  if (match) {
    console.log('[parseAddress] ✓ Found flexible address format');
    return {
      street: match[1]?.trim(),
      city: match[2]?.trim(),
      state: match[3]?.trim(),
      zip: match[4],
    };
  }

  // Fallback: just extract ZIP
  if (zip) {
    console.log('[parseAddress] Only ZIP detected, no full address');
    return { zip };
  }

  console.log('[parseAddress] No address or ZIP found');
  return null;
}

/**
 * Fetch property details using RapidAPI - Private Zillow endpoint
 */
export async function fetchPropertyFromZillow(address: string, city: string, state: string, zip: string): Promise<PropertyDetails | null> {
  const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY;

  if (!RAPIDAPI_KEY) {
    console.warn('[Zillow API] No RapidAPI key found in environment variables');
    console.log('[Zillow API] Add VITE_RAPIDAPI_KEY to .env file');
    return null;
  }

  try {
    const fullAddress = `${address}, ${city}, ${state} ${zip}`;
    console.log(`[Zillow API] Fetching property: ${fullAddress}`);

    // Private Zillow API endpoint - search by address
    const url = 'https://private-zillow.p.rapidapi.com/byaddress';
    const params = new URLSearchParams({
      propertyaddress: fullAddress,
    });

    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'private-zillow.p.rapidapi.com',
        'x-rapidapi-key': RAPIDAPI_KEY,
      },
    });

    if (!response.ok) {
      console.error('[Zillow API] Response error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('[Zillow API] Error details:', errorText);
      return null;
    }

    const data = await response.json();
    console.log('[Zillow API] Received property data:', data);

    return transformZillowData(data);
  } catch (error) {
    console.error('[Zillow API] Error fetching property:', error);
    return null;
  }
}

/**
 * Fetch property by Zillow Property ID (ZPID)
 */
export async function fetchPropertyByZPID(zpid: string): Promise<PropertyDetails | null> {
  const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY;

  if (!RAPIDAPI_KEY) {
    console.warn('[Zillow API] No RapidAPI key found');
    return null;
  }

  try {
    console.log(`[Zillow API] Fetching property by ZPID: ${zpid}`);

    const url = 'https://private-zillow.p.rapidapi.com/byzpid';
    const params = new URLSearchParams({
      zpid: zpid,
    });

    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'private-zillow.p.rapidapi.com',
        'x-rapidapi-key': RAPIDAPI_KEY,
      },
    });

    if (!response.ok) {
      console.error('[Zillow API] Response error:', response.status);
      return null;
    }

    const data = await response.json();
    console.log(`[Zillow API] Received property data for ZPID ${zpid}`);

    return transformZillowData(data);
  } catch (error) {
    console.error('[Zillow API] Error fetching property by ZPID:', error);
    return null;
  }
}

/**
 * Transform Zillow API response to our PropertyDetails format
 * Handles the Private Zillow API response structure
 */
function transformZillowData(data: any): PropertyDetails {
  const currentYear = new Date().getFullYear();

  console.log('[transformZillowData] Transforming data:', data);

  // Handle PropertyAddress nested structure
  const addressData = data.PropertyAddress || {};

  // Extract address components
  const address = addressData.streetAddress || data.streetAddress || '';
  const city = addressData.city || data.city || '';
  const state = addressData.state || data.state || '';
  const zip = addressData.zipcode || data.zipcode || data.zip || '';

  // Extract year built and calculate age
  const yearBuilt = data.yearBuilt || data.year_built || null;
  const propertyAge = yearBuilt ? currentYear - yearBuilt : null;

  // Extract property details (note the exact field names from API)
  const livingArea = data['Area(sqft)'] || data.livingArea || data.Area || null;
  const bedrooms = data.Bedrooms || data.bedrooms || null;
  const bathrooms = data.Bathrooms || data.bathrooms || null;

  // Extract pricing info
  const listingPrice = data.Price || data.price || null;
  const zestimate = data.zestimate || null;

  // Use zestimate if available, otherwise use listing price
  const estimatedValue = zestimate || listingPrice;

  // Property type from subdivision/neighborhood or default
  const propertyType = data.homeType || data.propertyType || 'Single Family';

  const transformedData = {
    address,
    city,
    state,
    zip,

    yearBuilt,
    propertyAge,
    livingArea,
    lotSize: null, // Not provided in this API response
    bedrooms,
    bathrooms,
    propertyType,

    lastSoldDate: null, // Not provided in this response
    lastSoldPrice: null, // Not provided in this response
    estimatedValue,

    hasBasement: null, // Not provided in this response
    hasGarage: null, // Not provided in this response
    hasPool: null, // Not provided in this response
    heatingType: null,
    coolingType: null,
    roofType: null,

    source: 'zillow' as const,
  };

  console.log('[transformZillowData] Returning transformed property:', transformedData);
  console.log('[transformZillowData] Has all required fields:', {
    address: !!transformedData.address,
    city: !!transformedData.city,
    state: !!transformedData.state,
    zip: !!transformedData.zip,
    yearBuilt: !!transformedData.yearBuilt,
    livingArea: !!transformedData.livingArea,
    bedrooms: !!transformedData.bedrooms,
    bathrooms: !!transformedData.bathrooms
  });

  return transformedData;
}

/**
 * Generate service recommendations based on property details
 */
export function generatePropertyBasedRecommendations(property: PropertyDetails): string[] {
  const recommendations: string[] = [];

  // Age-based recommendations
  if (property.propertyAge && property.propertyAge > 30) {
    recommendations.push('4-Point Inspection (insurance requirement for 30+ year homes)');
    recommendations.push('Electrical panel inspection (older wiring systems)');
    recommendations.push('Plumbing inspection (aging pipes)');
  }

  if (property.propertyAge && property.propertyAge > 20) {
    recommendations.push('HVAC system inspection (typical 15-20 year lifespan)');
    recommendations.push('Water heater inspection');
  }

  if (property.propertyAge && property.propertyAge > 15) {
    recommendations.push('Roof inspection (typical 20-25 year lifespan)');
  }

  // Size-based recommendations
  if (property.livingArea && property.livingArea > 3000) {
    recommendations.push('Comprehensive HVAC inspection (large home)');
    recommendations.push('Multiple sewer scope points');
  }

  if (property.lotSize && property.lotSize > 10000) {
    recommendations.push('Septic system inspection (large lot, possible septic)');
    recommendations.push('Well water testing');
  }

  // Feature-based recommendations
  if (property.hasBasement) {
    recommendations.push('Basement moisture and foundation inspection');
    recommendations.push('Sump pump inspection');
  }

  if (property.hasPool) {
    recommendations.push('Pool equipment inspection');
    recommendations.push('Pool safety barrier inspection');
  }

  if (property.hasGarage) {
    recommendations.push('Garage door safety inspection');
  }

  // Property type recommendations
  if (property.propertyType?.toLowerCase().includes('condo')) {
    recommendations.push('HOA document review');
    recommendations.push('Common area inspection');
  }

  return recommendations;
}

/**
 * Enhanced coaching context with property details
 */
export function generateEnhancedContext(
  property: PropertyDetails | null,
  areaData: any
): string {
  if (!property) {
    return `Area: ${areaData.city}, ${areaData.state} (ZIP ${areaData.zip})`;
  }

  const context = [];

  context.push(`Property: ${property.address}, ${property.city}, ${property.state}`);

  if (property.propertyAge) {
    context.push(`Age: ${property.propertyAge} years old (built ${property.yearBuilt})`);
  }

  if (property.livingArea) {
    context.push(`Size: ${property.livingArea.toLocaleString()} sq ft`);
  }

  if (property.propertyType) {
    context.push(`Type: ${property.propertyType}`);
  }

  if (property.bedrooms && property.bathrooms) {
    context.push(`${property.bedrooms} bed, ${property.bathrooms} bath`);
  }

  const features = [];
  if (property.hasBasement) features.push('basement');
  if (property.hasPool) features.push('pool');
  if (property.hasGarage) features.push('garage');
  if (features.length > 0) {
    context.push(`Features: ${features.join(', ')}`);
  }

  // Combine with area data
  context.push(`Area avg home age: ${areaData.homeProfile.avgAge} years`);
  context.push(`Humidity: ${areaData.homeProfile.humidity}`);
  context.push(`Flood zone: ${areaData.homeProfile.floodZone}`);

  return context.join(' | ');
}

/**
 * Mock property data for testing (when API not available)
 */
export function getMockPropertyData(zip: string): PropertyDetails {
  const currentYear = new Date().getFullYear();
  const mockProperties: Record<string, Partial<PropertyDetails>> = {
    '33101': {
      address: '123 Ocean Drive',
      city: 'Miami',
      state: 'FL',
      zip: '33101',
      yearBuilt: 1982,
      propertyAge: currentYear - 1982,
      livingArea: 2100,
      lotSize: 6500,
      bedrooms: 3,
      bathrooms: 2,
      propertyType: 'Single Family',
      hasBasement: false,
      hasGarage: true,
      hasPool: true,
      source: 'mock',
    },
    '30301': {
      address: '456 Peachtree St',
      city: 'Atlanta',
      state: 'GA',
      zip: '30301',
      yearBuilt: 1995,
      propertyAge: currentYear - 1995,
      livingArea: 1850,
      lotSize: 8200,
      bedrooms: 3,
      bathrooms: 2.5,
      propertyType: 'Single Family',
      hasBasement: true,
      hasGarage: true,
      hasPool: false,
      source: 'mock',
    },
    '77001': {
      address: '789 Main Street',
      city: 'Houston',
      state: 'TX',
      zip: '77001',
      yearBuilt: 2005,
      propertyAge: currentYear - 2005,
      livingArea: 2400,
      lotSize: 7500,
      bedrooms: 4,
      bathrooms: 3,
      propertyType: 'Single Family',
      hasBasement: false,
      hasGarage: true,
      hasPool: true,
      source: 'mock',
    },
  };

  const mockData = mockProperties[zip] || mockProperties['33101'];

  return {
    ...mockData,
    lastSoldDate: null,
    lastSoldPrice: null,
    estimatedValue: null,
    heatingType: null,
    coolingType: null,
    roofType: null,
  } as PropertyDetails;
}
