import type { ZipData } from '../types/index';

export const MOCK_ZIP_DATA: Record<string, ZipData> = {
  '33101': {
    zip: '33101',
    city: 'Miami',
    state: 'FL',
    homeProfile: {
      avgAge: 42,
      humidity: 'high',
      floodZone: 'AE',
      predominantFoundation: 'Slab'
    },
    riskFactors: [
      {
        name: 'Hurricane Risk',
        severity: 'critical',
        description: 'High wind exposure in coastal area',
        statValue: 'Category 3+'
      },
      {
        name: 'Flood Risk',
        severity: 'high',
        description: 'Located in FEMA flood zone AE',
        statValue: 'Zone AE'
      },
      {
        name: 'Humidity Damage',
        severity: 'high',
        description: 'High humidity leads to mold growth',
        statValue: '85% avg'
      }
    ],
    serviceFrequencies: [
      {
        serviceName: 'Wind Mitigation',
        frequency: 69,
        avgRevenue: 150,
        description: 'Insurance discounts for wind-resistant features'
      },
      {
        serviceName: 'Radon Testing',
        frequency: 68,
        avgRevenue: 175,
        description: 'Required for many lenders in this area'
      },
      {
        serviceName: '4-Point Inspection',
        frequency: 44,
        avgRevenue: 125,
        description: 'Insurance requirement for homes 30+ years'
      },
      {
        serviceName: 'Mold Inspection',
        frequency: 31,
        avgRevenue: 200,
        description: 'Common in humid climates'
      },
      {
        serviceName: 'Sewer Scope',
        frequency: 22,
        avgRevenue: 180,
        description: 'Aging infrastructure in this neighborhood'
      }
    ],
    avgAddOnRevenue: 420
  },
  '30301': {
    zip: '30301',
    city: 'Atlanta',
    state: 'GA',
    homeProfile: {
      avgAge: 38,
      humidity: 'high',
      floodZone: 'X',
      predominantFoundation: 'Crawl Space'
    },
    riskFactors: [
      {
        name: 'Crawl Space Issues',
        severity: 'high',
        description: 'Moisture and pest problems common',
        statValue: '52% have issues'
      },
      {
        name: 'Mold Risk',
        severity: 'medium',
        description: 'Humid summers promote mold growth',
        statValue: '38% frequency'
      }
    ],
    serviceFrequencies: [
      {
        serviceName: 'Crawl Space Inspection',
        frequency: 52,
        avgRevenue: 160,
        description: 'Moisture and structural issues'
      },
      {
        serviceName: 'Sewer Scope',
        frequency: 41,
        avgRevenue: 180,
        description: 'Clay pipes common in older homes'
      },
      {
        serviceName: 'Mold Inspection',
        frequency: 38,
        avgRevenue: 200,
        description: 'High humidity area'
      },
      {
        serviceName: 'Radon Testing',
        frequency: 29,
        avgRevenue: 175,
        description: 'EPA recommends testing'
      },
      {
        serviceName: 'Wind Mitigation',
        frequency: 18,
        avgRevenue: 150,
        description: 'Insurance discounts available'
      }
    ],
    avgAddOnRevenue: 310
  },
  '77001': {
    zip: '77001',
    city: 'Houston',
    state: 'TX',
    homeProfile: {
      avgAge: 35,
      humidity: 'very high',
      floodZone: 'AE',
      predominantFoundation: 'Slab'
    },
    riskFactors: [
      {
        name: 'Flood Risk',
        severity: 'critical',
        description: 'Hurricane storm surge and heavy rainfall',
        statValue: 'Zone AE'
      },
      {
        name: 'Foundation Issues',
        severity: 'high',
        description: 'Expansive clay soil causes settling',
        statValue: '48% homes'
      },
      {
        name: 'HVAC Strain',
        severity: 'medium',
        description: 'Extreme heat and humidity stress systems',
        statValue: '61% failures'
      }
    ],
    serviceFrequencies: [
      {
        serviceName: 'HVAC Inspection',
        frequency: 61,
        avgRevenue: 140,
        description: 'Critical in Houston climate'
      },
      {
        serviceName: 'Sewer Scope',
        frequency: 55,
        avgRevenue: 180,
        description: 'Tree root intrusion common'
      },
      {
        serviceName: 'Foundation Inspection',
        frequency: 48,
        avgRevenue: 250,
        description: 'Expansive soil issues'
      },
      {
        serviceName: 'Mold Inspection',
        frequency: 44,
        avgRevenue: 200,
        description: 'Very high humidity'
      },
      {
        serviceName: 'Radon Testing',
        frequency: 18,
        avgRevenue: 175,
        description: 'Lower risk but still recommended'
      }
    ],
    avgAddOnRevenue: 380
  }
};

// Helper function to detect ZIP code from text
export function detectZipCode(text: string): string | null {
  // Strategy 1: Look for 5 consecutive digits (standard format)
  const zipRegex = /\b(\d{5})\b/g;
  const matches = text.match(zipRegex);

  if (matches && matches.length > 0) {
    console.log('[detectZipCode] Found 5-digit ZIP(s):', matches);
    // Return first valid ZIP that exists in our mock data
    for (const zip of matches) {
      if (MOCK_ZIP_DATA[zip]) {
        return zip;
      }
    }
    return matches[0]; // Return first ZIP even if not in our data
  }

  // Strategy 2: Look for digits separated by spaces (handles pauses mid-ZIP)
  // Remove common words and extract just digit sequences
  const cleanedText = text
    .toLowerCase()
    .replace(/\b(zip|code|postal|area)\b/gi, '') // Remove ZIP-related words
    .replace(/\s+/g, ' '); // Normalize spaces

  console.log('[detectZipCode] No 5-digit ZIP found, trying split detection...');
  console.log('[detectZipCode] Cleaned text:', cleanedText);

  // Extract all digit sequences
  const digitSequences = cleanedText.match(/\d+/g);

  if (!digitSequences) {
    console.log('[detectZipCode] No digit sequences found');
    return null;
  }

  console.log('[detectZipCode] Found digit sequences:', digitSequences);

  // Try combining adjacent digit sequences to make 5 digits
  for (let i = 0; i < digitSequences.length; i++) {
    // Try single sequence (in case it's exactly 5 digits)
    if (digitSequences[i].length === 5) {
      console.log('[detectZipCode] Found 5-digit sequence:', digitSequences[i]);
      return digitSequences[i];
    }

    // Try combining current with next sequence
    if (i < digitSequences.length - 1) {
      const combined = digitSequences[i] + digitSequences[i + 1];
      if (combined.length === 5) {
        console.log('[detectZipCode] Combined sequences:', digitSequences[i], '+', digitSequences[i + 1], '=', combined);
        return combined;
      }
    }

    // Try combining current with next two sequences (e.g., "3" "3" "101")
    if (i < digitSequences.length - 2) {
      const combined = digitSequences[i] + digitSequences[i + 1] + digitSequences[i + 2];
      if (combined.length === 5) {
        console.log('[detectZipCode] Combined 3 sequences:', digitSequences[i], '+', digitSequences[i + 1], '+', digitSequences[i + 2], '=', combined);
        return combined;
      }
    }
  }

  console.log('[detectZipCode] Could not form valid 5-digit ZIP');
  return null;
}

// Helper function to get ZIP data
export function getZipData(zip: string): ZipData | null {
  return MOCK_ZIP_DATA[zip] || null;
}
