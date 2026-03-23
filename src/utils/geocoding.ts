// Simple ZIP to City/State lookup
// For production, consider using a geocoding API like Google Maps or Mapbox

interface LocationInfo {
  city: string;
  state: string;
}

// Common ZIPs for quick lookup
const ZIP_LOOKUP: Record<string, LocationInfo> = {
  // Florida
  '33101': { city: 'Miami', state: 'FL' },
  '33109': { city: 'Miami Beach', state: 'FL' },
  '33139': { city: 'Miami Beach', state: 'FL' },
  '33160': { city: 'North Miami Beach', state: 'FL' },
  '33125': { city: 'Miami', state: 'FL' },

  // Georgia
  '30301': { city: 'Atlanta', state: 'GA' },
  '30303': { city: 'Atlanta', state: 'GA' },
  '30305': { city: 'Atlanta', state: 'GA' },
  '30309': { city: 'Atlanta', state: 'GA' },

  // Texas
  '77001': { city: 'Houston', state: 'TX' },
  '77002': { city: 'Houston', state: 'TX' },
  '77019': { city: 'Houston', state: 'TX' },
  '77098': { city: 'Houston', state: 'TX' },

  // Tennessee
  '38019': { city: 'Covington', state: 'TN' },
  '38103': { city: 'Memphis', state: 'TN' },

  // Add more ZIPs as needed
};

/**
 * Get city and state from ZIP code
 * Uses local lookup table with fallback to state-only inference
 */
export function getLocationFromZip(zip: string): LocationInfo {
  // Check lookup table first
  if (ZIP_LOOKUP[zip]) {
    return ZIP_LOOKUP[zip];
  }

  // Fallback: Infer state from ZIP prefix
  const prefix = zip.substring(0, 2);
  const state = getStateFromZipPrefix(prefix);

  return {
    city: `ZIP ${zip}`,
    state: state || 'Unknown',
  };
}

/**
 * Get state abbreviation from ZIP code prefix
 */
function getStateFromZipPrefix(prefix: string): string | null {
  const stateMap: Record<string, string> = {
    '00': 'PR', '01': 'MA', '02': 'MA', '03': 'NH', '04': 'ME', '05': 'VT',
    '06': 'CT', '07': 'NJ', '08': 'NJ', '09': 'NJ', '10': 'NY', '11': 'NY',
    '12': 'NY', '13': 'NY', '14': 'NY', '15': 'PA', '16': 'PA', '17': 'PA',
    '18': 'PA', '19': 'PA', '20': 'DC', '21': 'MD', '22': 'VA', '23': 'VA',
    '24': 'VA', '25': 'WV', '26': 'WV', '27': 'NC', '28': 'NC', '29': 'SC',
    '30': 'GA', '31': 'GA', '32': 'FL', '33': 'FL', '34': 'FL', '35': 'AL',
    '36': 'AL', '37': 'TN', '38': 'TN', '39': 'OH', '40': 'KY', '41': 'KY',
    '42': 'KY', '43': 'OH', '44': 'OH', '45': 'OH', '46': 'IN', '47': 'IN',
    '48': 'MI', '49': 'MI', '50': 'IA', '51': 'IA', '52': 'IA', '53': 'WI',
    '54': 'WI', '55': 'MN', '56': 'MN', '57': 'SD', '58': 'ND', '59': 'MT',
    '60': 'IL', '61': 'IL', '62': 'IL', '63': 'MO', '64': 'MO', '65': 'MO',
    '66': 'KS', '67': 'KS', '68': 'NE', '69': 'NE', '70': 'LA', '71': 'LA',
    '72': 'AR', '73': 'OK', '74': 'OK', '75': 'TX', '76': 'TX', '77': 'TX',
    '78': 'TX', '79': 'TX', '80': 'CO', '81': 'CO', '82': 'WY', '83': 'ID',
    '84': 'UT', '85': 'AZ', '86': 'AZ', '87': 'NM', '88': 'NM', '89': 'NV',
    '90': 'CA', '91': 'CA', '92': 'CA', '93': 'CA', '94': 'CA', '95': 'CA',
    '96': 'CA', '97': 'OR', '98': 'WA', '99': 'AK',
  };

  return stateMap[prefix] || null;
}
