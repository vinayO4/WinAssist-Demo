import { useState, useEffect, useCallback } from 'react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { generateCoachingSuggestions } from './services/claudeService';
import { detectZipCode, getZipData } from './data/mockZipData';
import { fetchReportsByZip, aggregateReportData, convertToZipData } from './services/winspectApi';
import { getLocationFromZip } from './utils/geocoding';
import {
  fetchPropertyFromZillow,
  getMockPropertyData,
  generatePropertyBasedRecommendations,
  parseAddressFromTranscript,
  type PropertyDetails,
} from './services/propertyDataApi';
import type { ZipData, CoachingSuggestion } from './types/index';
import { PresentationSlider } from './components/PresentationSlider';

function App() {
  const {
    transcript,
    interimTranscript,
    isListening,
    isSpeaking,
    isSupported,
    isProcessing,
    confidence,
    error,
    currentSpeaker,
    speakerMode,
    startListening,
    stopListening,
    resetTranscript,
    setSpeaker,
    setSpeakerMode,
  } = useSpeechRecognition();

  const [detectedZip, setDetectedZip] = useState<string | null>(null);
  const [zipData, setZipData] = useState<ZipData | null>(null);
  const [propertyData, setPropertyData] = useState<PropertyDetails | null>(null);

  // Debug: Log whenever zipData changes
  useEffect(() => {
    console.log('[App] zipData state updated:', zipData);
  }, [zipData]);
  const [isLoadingZipData, setIsLoadingZipData] = useState(false);
  const [zipDataError, setZipDataError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'real' | 'mock' | null>(null);
  const [suggestions, setSuggestions] = useState<CoachingSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [lastSuggestionUpdate, setLastSuggestionUpdate] = useState<Date | null>(null);
  const [lastTranscriptLength, setLastTranscriptLength] = useState(0);
  const [initialContextSent, setInitialContextSent] = useState(false);
  const [suggestionMode, setSuggestionMode] = useState<'script' | 'bullets'>(() => {
    // Load preference from localStorage
    const saved = localStorage.getItem('suggestionMode');
    return (saved as 'script' | 'bullets') || 'script';
  });

  // Save preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('suggestionMode', suggestionMode);
    console.log('[SuggestionMode] Mode changed to:', suggestionMode);
  }, [suggestionMode]);

  // Manual refresh function for suggestions
  const manualRefreshSuggestions = useCallback(() => {
    if (!detectedZip || !zipData || isLoadingSuggestions) {
      console.log('[Manual Refresh] Cannot refresh - missing requirements');
      return;
    }

    console.log('[Manual Refresh] Forcing suggestion regeneration...');
    // Reset flags to force regeneration
    setInitialContextSent(false);
    setLastTranscriptLength(0);

    // The useEffect that monitors transcript changes will handle the actual generation
  }, [detectedZip, zipData, isLoadingSuggestions]);

  // Auto-scroll transcript to bottom when it updates
  useEffect(() => {
    const transcriptElements = document.querySelectorAll('.transcript-display');
    transcriptElements.forEach(el => {
      el.scrollTop = el.scrollHeight;
    });

    // Log transcript updates for debugging
    if (transcript) {
      console.log('[Transcript Update] Length:', transcript.length, 'Last 100 chars:', transcript.slice(-100));
    }
  }, [transcript, interimTranscript]);

  // Regenerate suggestions when mode changes (if we have ZIP data)
  useEffect(() => {
    if (detectedZip && zipData && transcript.length > 0 && !isLoadingSuggestions) {
      console.log('[SuggestionMode] Mode changed, regenerating suggestions in new format');
      // Reset the initial context flag to force regeneration
      setInitialContextSent(false);
      // Trigger regeneration by updating last transcript length
      setLastTranscriptLength(0);
    }
  }, [suggestionMode]);

  // Manual input state
  const [manualInput, setManualInput] = useState('');
  const [questionResponse, setQuestionResponse] = useState('');

  // Presentation slider state
  const [showPresentation, setShowPresentation] = useState(false);

  // Google Places Autocomplete state
  const [autocompleteService, setAutocompleteService] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

    if (GOOGLE_API_KEY && !autocompleteService) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('[Google Places] API loaded successfully');
        const service = new (window as any).google.maps.places.AutocompleteService();
        setAutocompleteService(service);
      };
      script.onerror = () => {
        console.error('[Google Places] Failed to load API');
      };
      document.head.appendChild(script);
    }
  }, [autocompleteService]);

  // Handle autocomplete input changes
  const handleAutocompleteInput = (value: string) => {
    setManualInput(value);

    if (value.length > 3 && autocompleteService) {
      autocompleteService.getPlacePredictions(
        {
          input: value,
          types: ['address'],
          componentRestrictions: { country: 'us' }
        },
        (predictions: any, status: any) => {
          if (status === 'OK' && predictions) {
            console.log('[Google Places] Found', predictions.length, 'predictions');
            setPredictions(predictions);
            setShowPredictions(true);
          } else {
            setPredictions([]);
            setShowPredictions(false);
          }
        }
      );
    } else {
      setPredictions([]);
      setShowPredictions(false);
    }
  };

  // Handle address selection from autocomplete
  const handleSelectAddress = (prediction: any) => {
    console.log('[Google Places] Selected:', prediction.description);
    setShowPredictions(false);
    setPredictions([]);

    // Create a PlacesService to fetch place details (including ZIP code)
    if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
      const service = new (window as any).google.maps.places.PlacesService(document.createElement('div'));

      service.getDetails(
        {
          placeId: prediction.place_id,
          fields: ['address_components', 'formatted_address']
        },
        (place: any, status: any) => {
          if (status === 'OK' && place && place.address_components) {
            console.log('[Google Places] Place details:', place);

            // Extract address components
            let streetNumber = '';
            let route = '';
            let city = '';
            let state = '';
            let zip = '';

            place.address_components.forEach((component: any) => {
              const types = component.types;
              if (types.includes('street_number')) {
                streetNumber = component.long_name;
              } else if (types.includes('route')) {
                route = component.long_name;
              } else if (types.includes('locality')) {
                city = component.long_name;
              } else if (types.includes('administrative_area_level_1')) {
                state = component.short_name;
              } else if (types.includes('postal_code')) {
                zip = component.long_name;
              }
            });

            const street = `${streetNumber} ${route}`.trim();
            const fullAddress = `${street}, ${city}, ${state} ${zip}`;

            console.log('[Google Places] Extracted:', { street, city, state, zip });

            setManualInput(fullAddress);

            if (zip) {
              setDetectedZip(zip);

              // ALWAYS fetch ZIP/area data from WinSpect API first
              fetchZipData(zip);

              // Fetch property data from Zillow (independent, won't block WinSpect)
              if (street && city && state) {
                console.log('[Google Places] Fetching property data from Zillow...');
                console.log('[Google Places] Zillow params:', { street, city, state, zip });
                fetchPropertyFromZillow(street, city, state, zip)
                  .then(data => {
                    console.log('[Google Places] Zillow API response data:', data);
                    if (data) {
                      console.log('[Google Places] ✓ Property data fetched successfully from Zillow');
                      console.log('[Google Places] Setting propertyData state:', data);
                      setPropertyData(data);
                    } else {
                      console.log('[Google Places] No property data found from Zillow (returned null/undefined)');
                      setPropertyData(null);
                    }
                  })
                  .catch(error => {
                    console.error('[Google Places] Zillow API error:', error);
                    setPropertyData(null);
                  });
              } else {
                console.log('[Google Places] Incomplete address - skipping Zillow lookup');
                console.log('[Google Places] Address components:', { street, city, state, zip });
              }
            } else {
              console.warn('[Google Places] No ZIP code found in place details');
            }
          } else {
            console.error('[Google Places] Failed to get place details:', status);
            setManualInput(prediction.description);
          }
        }
      );
    } else {
      // Fallback if Google API not loaded
      setManualInput(prediction.description);
    }
  };

  // Flexible address parser - handles various formats
  const parseFlexibleAddress = useCallback((input: string): {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null => {
    console.log('[parseFlexibleAddress] Parsing:', input);

    // Extract ZIP code first
    const zipMatch = input.match(/\b(\d{5})(?:-\d{4})?\b/);
    const zip = zipMatch ? zipMatch[1] : null;

    if (!zip) {
      console.log('[parseFlexibleAddress] No ZIP found');
      return null;
    }

    console.log('[parseFlexibleAddress] Found ZIP:', zip);

    // Remove ZIP from string for easier parsing
    let remaining = input.replace(/\b\d{5}(?:-\d{4})?\b/, '').trim();

    // List of US state abbreviations
    const stateAbbreviations = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'];

    // Find state abbreviation (case insensitive)
    let state = null;
    for (const stateAbbr of stateAbbreviations) {
      const stateRegex = new RegExp(`\\b${stateAbbr}\\b`, 'i');
      const match = remaining.match(stateRegex);
      if (match) {
        state = match[0].toUpperCase();
        // Remove state from string
        remaining = remaining.replace(stateRegex, '').trim();
        break;
      }
    }

    console.log('[parseFlexibleAddress] Found state:', state);

    // Split remaining by comma or multiple spaces
    const parts = remaining.split(/[,]+/).map(p => p.trim()).filter(p => p);

    let street = null;
    let city = null;

    if (parts.length === 2) {
      // Format: "Street, City"
      street = parts[0];
      city = parts[1];
    } else if (parts.length === 1) {
      // Format: "Street City" (no commas)
      // Split by common street suffixes
      const streetPattern = /^(.+?(?:street|st|avenue|ave|road|rd|drive|dr|circle|cir|lane|ln|boulevard|blvd|court|ct|way|place|pl)\s*)(.+)$/i;
      const match = parts[0].match(streetPattern);
      if (match) {
        street = match[1].trim();
        city = match[2].trim();
      } else {
        // Last resort: split at last word that could be city
        const words = parts[0].split(/\s+/);
        if (words.length >= 2) {
          street = words.slice(0, -1).join(' ');
          city = words[words.length - 1];
        }
      }
    } else if (parts.length > 2) {
      // Format: "Street, Something, City" - take first and last
      street = parts[0];
      city = parts[parts.length - 1];
    }

    console.log('[parseFlexibleAddress] Parsed:', { street, city, state, zip });

    if (street && city && state && zip) {
      return { street, city, state, zip };
    } else if (zip) {
      return { zip };
    }

    return null;
  }, []);

  // Build comprehensive context for Claude (called only once)
  const buildComprehensiveContext = useCallback(() => {
    if (!zipData) return '';

    let context = '\n\n=== COMPREHENSIVE PROPERTY & AREA CONTEXT ===\n\n';

    // Property-specific information
    if (propertyData) {
      context += '📍 PROPERTY DETAILS:\n';
      context += `Address: ${propertyData.address}, ${propertyData.city}, ${propertyData.state} ${propertyData.zip}\n`;

      if (propertyData.yearBuilt && propertyData.propertyAge) {
        context += `Age: ${propertyData.propertyAge} years old (Built ${propertyData.yearBuilt})\n`;
        context += `⚠️ CRITICAL: `;
        if (propertyData.propertyAge > 30) {
          context += `This is an OLDER home (30+ years). STRONGLY recommend:\n`;
          context += `  - 4-Point Inspection (INSURANCE REQUIREMENT for 30+ year homes)\n`;
          context += `  - Electrical panel inspection (older wiring systems are common)\n`;
          context += `  - Plumbing inspection (aging pipes)\n`;
        } else if (propertyData.propertyAge > 20) {
          context += `Home is 20+ years old. Recommend:\n`;
          context += `  - HVAC system inspection (typical 15-20 year lifespan)\n`;
          context += `  - Water heater inspection\n`;
        }
        if (propertyData.propertyAge > 15) {
          context += `  - Roof inspection (typical 20-25 year lifespan)\n`;
        }
      }

      if (propertyData.livingArea) {
        context += `Size: ${propertyData.livingArea.toLocaleString()} sq ft`;
        if (propertyData.livingArea > 3000) {
          context += ` (LARGE home - recommend comprehensive HVAC inspection)\n`;
        } else {
          context += `\n`;
        }
      }

      if (propertyData.bedrooms && propertyData.bathrooms) {
        context += `Layout: ${propertyData.bedrooms} bed, ${propertyData.bathrooms} bath\n`;
      }

      if (propertyData.estimatedValue) {
        context += `Estimated Value: $${(propertyData.estimatedValue / 1000000).toFixed(2)}M (High-value property)\n`;
      }

      context += `Property Type: ${propertyData.propertyType || 'Single Family'}\n\n`;
    }

    // Area inspection data
    if (zipData.totalReports) {
      context += `📊 AREA INSPECTION DATA (${zipData.city}, ${zipData.state} - ZIP ${zipData.zip}):\n`;
      context += `Based on ${zipData.totalReports} REAL inspection reports in this area.\n\n`;

      // Top services used in area
      if (zipData.serviceFrequencies && zipData.serviceFrequencies.length > 0) {
        context += `MOST COMMON SERVICES IN THIS ZIP (use these for upselling):\n`;
        zipData.serviceFrequencies.slice(0, 5).forEach((service: any) => {
          context += `  • ${service.serviceName}: ${service.frequency}% of inspections\n`;
          context += `    "${service.description}"\n`;
        });
        context += `\n`;
      }

      // Services with most findings (high-priority)
      if (zipData.servicesWithMostFindings && zipData.servicesWithMostFindings.length > 0) {
        context += `⚠️ SERVICES WITH MOST ISSUES FOUND (high-value upsells):\n`;
        zipData.servicesWithMostFindings.slice(0, 5).forEach((service: any) => {
          context += `  • ${service.serviceName}: ${service.remarkCount} issues found in ${service.usagePercentage}% of reports\n`;
        });
        context += `\n`;
      }

      // Top repair categories
      if (zipData.topIssues && zipData.topIssues.length > 0) {
        context += `🔧 MOST COMMON REPAIR ISSUES IN THIS AREA:\n`;
        zipData.topIssues.slice(0, 5).forEach((issue: any, index: number) => {
          const displayPercentage = Math.min(issue.percentage, 100);
          context += `  ${index + 1}. ${issue.categoryName} (${displayPercentage}% of homes)\n`;
          context += `     "${issue.remarkTitle}" - Found in ${issue.count} reports\n`;
          context += `     Most common in: ${issue.serviceName}\n`;
        });
        context += `\n`;
      }
    }

    context += `\n=== COACHING INSTRUCTIONS ===\n`;
    context += `Use the above data to:\n`;
    context += `1. Reference specific statistics (e.g., "31% of homes in your area get X service")\n`;
    context += `2. Create urgency with property age and common issues\n`;
    context += `3. Suggest services that are both relevant to this property AND common in this area\n`;
    context += `4. Mention specific issues found in this ZIP to build credibility\n`;
    context += `5. Use exact percentages and counts to sound data-driven\n\n`;

    console.log('[buildComprehensiveContext] Built context:', context.length, 'characters');
    return context;
  }, [zipData, propertyData]);

  // Fetch property data for enhanced suggestions
  const fetchPropertyData = useCallback(async (zip: string, address?: string, city?: string, state?: string) => {
    console.log(`[fetchPropertyData] Attempting to fetch property details for ZIP: ${zip}`);
    if (address) {
      console.log(`[fetchPropertyData] Full address provided: ${address}, ${city}, ${state}`);
    }

    try {
      const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY;
      console.log('[fetchPropertyData] RapidAPI Key present:', !!RAPIDAPI_KEY);
      console.log('[fetchPropertyData] Address provided:', address);
      console.log('[fetchPropertyData] City provided:', city);
      console.log('[fetchPropertyData] State provided:', state);

      let propertyData = null;

      // Try real API if key is available and address is provided
      if (RAPIDAPI_KEY && address && city && state) {
        console.log('[fetchPropertyData] ✓ All conditions met, calling Zillow API...');
        propertyData = await fetchPropertyFromZillow(address, city, state, zip);

        if (propertyData) {
          console.log('[fetchPropertyData] ✓ Loaded real property data from Zillow API');

          // Set the ZIP from property data so it can trigger area data fetch
          if (propertyData.zip && propertyData.zip !== detectedZip) {
            console.log('[fetchPropertyData] ✓ Setting ZIP from property:', propertyData.zip);
            setDetectedZip(propertyData.zip);
            // The useEffect will automatically fetch area data when detectedZip changes
          }
        } else {
          console.log('[fetchPropertyData] Zillow API returned no data, falling back to mock');
        }
      } else {
        if (!RAPIDAPI_KEY) {
          console.log('[fetchPropertyData] No RapidAPI key found, using mock data');
        } else {
          console.log('[fetchPropertyData] No full address provided, using mock data');
        }
      }

      // Fallback to mock data if real API failed or not available
      if (!propertyData) {
        propertyData = getMockPropertyData(zip);
        console.log('[fetchPropertyData] ✓ Loaded mock property data');
      }

      setPropertyData(propertyData);

      // Show property-based recommendations
      const recommendations = generatePropertyBasedRecommendations(propertyData);
      console.log('[fetchPropertyData] Property-based recommendations:', recommendations);
    } catch (error) {
      console.error('[fetchPropertyData] Error fetching property data:', error);
      // Fallback to mock on error
      const mockProperty = getMockPropertyData(zip);
      setPropertyData(mockProperty);
    }
  }, [detectedZip]);

  // Fetch ZIP data from real API or fallback to mock
  const fetchZipData = useCallback(async (zip: string) => {
    console.log(`[fetchZipData] Starting fetch for ZIP: ${zip}`);
    setIsLoadingZipData(true);
    setZipDataError(null);
    setDataSource(null);

    try {
      console.log('[fetchZipData] Calling fetchReportsByZip...');
      const reports = await fetchReportsByZip(zip);
      console.log(`[fetchZipData] Received reports:`, reports);

      // Check for service data (WinSpect API attaches metadata to empty array)
      const hasServiceData = reports && (reports as any).__serviceData;
      console.log('[fetchZipData] Has service data:', hasServiceData);

      if (hasServiceData) {
        console.log('[fetchZipData] Aggregating report data from WinSpect API...');
        const aggregated = aggregateReportData(reports);
        const location = getLocationFromZip(zip);

        if (aggregated) {
          console.log('[fetchZipData] Successfully aggregated data:', aggregated);
          const data = convertToZipData(aggregated, location.city, location.state);
          console.log('[fetchZipData] Converted to zipData:', data);
          setZipData(data);
          setDataSource('real');
          console.log(`✓ Loaded ${aggregated.totalInspections} inspection reports for ZIP ${zip} from WinSpect API`);

          // Also fetch property data for enhanced suggestions
          fetchPropertyData(zip);
        } else {
          console.warn('Could not aggregate report data, using mock data');
          const mockData = getZipData(zip);
          setZipData(mockData);
          setDataSource('mock');
          fetchPropertyData(zip);
        }
      } else {
        console.warn(`No inspection reports found for ZIP ${zip}, using mock data`);
        const mockData = getZipData(zip);
        setZipData(mockData);
        setDataSource('mock');
        fetchPropertyData(zip);
      }
    } catch (error) {
      console.error('Error fetching WinSpect data:', error);
      console.log('Falling back to mock data');

      const mockData = getZipData(zip);
      if (mockData) {
        setZipData(mockData);
        setDataSource('mock');
        fetchPropertyData(zip);
      } else {
        setZipDataError(`No data available for ZIP ${zip}`);
      }
    } finally {
      setIsLoadingZipData(false);
    }
  }, [fetchPropertyData]);

  // Detect ZIP code and address from transcript and fetch data
  useEffect(() => {
    if (transcript) {
      console.log('[useEffect] Checking transcript for ZIP/address:', transcript);

      // Try to parse full address first
      const addressInfo = parseAddressFromTranscript(transcript);

      if (addressInfo && addressInfo.zip) {
        const zip = addressInfo.zip;

        if (zip !== detectedZip) {
          console.log(`[useEffect] ✓ Detected ZIP code: ${zip}`);

          // Check if we have full address
          if (addressInfo.street && addressInfo.city && addressInfo.state) {
            console.log('[useEffect] ✓ Full address detected from voice:', addressInfo);
            console.log('[useEffect] Will fetch both area data AND property details');

            // AUTO-POPULATE the input field with detected address
            const fullAddress = `${addressInfo.street}, ${addressInfo.city}, ${addressInfo.state} ${zip}`;
            console.log('[useEffect] Auto-populating input field:', fullAddress);
            setManualInput(fullAddress);

            // Show a brief notification that address was detected
            setQuestionResponse(`✓ Address detected from voice: ${fullAddress}\n\nFetching property details...`);
            setTimeout(() => setQuestionResponse(''), 5000); // Clear after 5 seconds
          } else {
            console.log('[useEffect] Only ZIP detected from voice, no full address');
          }

          console.log('[useEffect] ZIP found - will CONTINUE listening for real-time coaching');
          setDetectedZip(zip);
          fetchZipData(zip);

          // Fetch property data (with address if available)
          if (addressInfo.street && addressInfo.city && addressInfo.state) {
            fetchPropertyData(zip, addressInfo.street, addressInfo.city, addressInfo.state);
          }
        }
      } else {
        // Fallback to old ZIP detection
        const zip = detectZipCode(transcript);

        if (zip && zip !== detectedZip) {
          console.log(`[useEffect] ✓ Detected ZIP code (fallback): ${zip}`);
          console.log('[useEffect] ZIP found - will CONTINUE listening for real-time coaching');
          setDetectedZip(zip);
          fetchZipData(zip);

          // Auto-populate just the ZIP
          setManualInput(zip);
        } else if (!zip) {
          console.log('[useEffect] No ZIP code or address detected yet in transcript');
        }
      }
    }
  }, [transcript, detectedZip, fetchZipData, fetchPropertyData]);

  // Reset initial context flag when ZIP changes
  useEffect(() => {
    if (detectedZip) {
      console.log('[Context] ZIP changed, resetting initial context flag');
      setInitialContextSent(false);
    }
  }, [detectedZip]);

  // Generate suggestions in real-time after ZIP code is detected
  useEffect(() => {
    if (!detectedZip || !zipData) {
      console.log('[Suggestions] Waiting for ZIP code and data before generating suggestions');
      return;
    }

    // For first request after ZIP data loads, allow immediately even with short transcript
    // For subsequent requests, require minimum transcript length
    if (initialContextSent && transcript.length < 50) {
      console.log('[Suggestions] Transcript too short for subsequent request, waiting for more content');
      return;
    }

    if (isLoadingSuggestions) {
      console.log('[Suggestions] Already loading, skipping this update');
      return;
    }

    // For first request, allow immediately after data loads
    // For subsequent requests, require significant new content
    const newContentLength = transcript.length - lastTranscriptLength;
    if (initialContextSent && lastTranscriptLength > 0 && newContentLength < 100) {
      console.log('[Suggestions] Not enough new content (only', newContentLength, 'chars), skipping update');
      return;
    }

    console.log('[Suggestions] ZIP detected and data loaded, will generate real-time suggestions');

    const generateSuggestions = async () => {
      setIsLoadingSuggestions(true);
      console.log('[Suggestions] Calling Claude API for real-time coaching...');
      console.log('[Suggestions] Full transcript length:', transcript.length, 'chars');

      try {
        const recentTranscript = transcript.length > 800
          ? '...' + transcript.slice(-800)
          : transcript;

        console.log('[Suggestions] Sending recent transcript:', recentTranscript.length, 'chars');

        // Determine what context to send based on whether this is the first request
        let contextPrompt = '';

        // Add response format instructions based on mode
        const formatInstructions = suggestionMode === 'script'
          ? `\n\nFORMAT: Provide COMPLETE SENTENCES that the service provider can read verbatim. Each suggestion should be a full script they can say naturally during the call.

Example format:
"I see you're in [location]. Based on the [X] inspection reports in your area, I'd recommend [specific service] because we commonly find [specific issue] in [Y]% of homes here. This is critical for [reason]."`
          : `\n\nFORMAT REQUIREMENT: Provide SHORT ONE-LINE TALKING POINTS (maximum 10-12 words per bullet). These are conversation starters, NOT full sentences to read.

CORRECT Examples:
• We've inspected 136 homes in your exact ZIP code
• Property built 1982 - focus on roof and HVAC
• 24% of homes here have roof issues
• 4-Point inspection required for insurance (homes 30+ years)
• Same-day reports while competitors take 3 days

INCORRECT Examples (DO NOT DO THIS):
✗ "I can tell you that based on our 136 inspections in your ZIP, we know exactly what to look for in homes like yours, which is why we recommend these specific services." (TOO LONG - multiple sentences)
✗ Full paragraphs or multiple sentences (NOT ALLOWED)

CRITICAL: Each bullet is a brief talking point (10-12 words max) that the service provider will expand on naturally. Do not write complete scripts.`;

        if (!initialContextSent) {
          // FIRST REQUEST: Send comprehensive context with ALL data
          console.log('[Suggestions] 🎯 FIRST REQUEST - Sending comprehensive context');
          console.log('[Suggestions] Mode:', suggestionMode);
          const comprehensiveContext = buildComprehensiveContext();
          contextPrompt = `This is a live sales call in progress.

${comprehensiveContext}

Based on the MOST RECENT conversation below and ALL the property/area data above, provide 3 coaching suggestions to help improve upsell opportunities and convert this lead.

Your suggestions should:
1. Reference specific statistics (e.g., "31% of homes in your area...")
2. Mention the property's age and relevant services
3. Reference actual issues found in this ZIP code
4. Create urgency with data-driven insights

Focus on the current conversation stage.${formatInstructions}`;

          console.log('[Suggestions] Comprehensive context size:', contextPrompt.length, 'chars');

          // Mark that we've sent the initial context
          setInitialContextSent(true);
        } else {
          // SUBSEQUENT REQUESTS: Send minimal context (already sent comprehensive data)
          console.log('[Suggestions] 📝 FOLLOW-UP REQUEST - Using cached context');
          console.log('[Suggestions] Mode:', suggestionMode);
          contextPrompt = `This is a live sales call in progress.

Context: ${zipData.city}, ${zipData.state} (ZIP ${zipData.zip})`;

          if (propertyData) {
            contextPrompt += ` | Property: ${propertyData.address}, Age: ${propertyData.propertyAge} years`;
          }

          contextPrompt += `\n\nBased on the MOST RECENT conversation below (you already have the full property and area data from earlier), provide 3 coaching suggestions for the current conversation stage.${formatInstructions}`;

          console.log('[Suggestions] Minimal context size:', contextPrompt.length, 'chars');
        }

        const newSuggestions = await generateCoachingSuggestions({
          transcript: recentTranscript,
          zipData,
          context: contextPrompt,
        });
        console.log(`[Suggestions] Received ${newSuggestions.length} real-time suggestions from Claude`);
        setSuggestions(newSuggestions);
        setLastSuggestionUpdate(new Date());
        setLastTranscriptLength(transcript.length);
      } catch (err) {
        console.error('[Suggestions] Error generating suggestions:', err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    const initialTimer = setTimeout(() => {
      console.log('[Suggestions] Generating initial suggestions...');
      generateSuggestions();
    }, 3000);

    let updateInterval: NodeJS.Timeout | null = null;

    if (isListening) {
      updateInterval = setInterval(() => {
        console.log('[Suggestions] Checking if update needed...');

        const newContent = transcript.length - lastTranscriptLength;
        if (newContent >= 100) {
          console.log('[Suggestions] Enough new content (', newContent, 'chars), updating suggestions...');
          generateSuggestions();
        } else {
          console.log('[Suggestions] Not enough new content yet, waiting...');
        }
      }, 20000);
    }

    return () => {
      clearTimeout(initialTimer);
      if (updateInterval) {
        clearInterval(updateInterval);
      }
    };
  }, [transcript, zipData, propertyData, detectedZip, isListening, isLoadingSuggestions, lastTranscriptLength]);

  const handleReset = () => {
    resetTranscript();
    setDetectedZip(null);
    setZipData(null);
    setPropertyData(null);
    setIsLoadingZipData(false);
    setZipDataError(null);
    setDataSource(null);
    setSuggestions([]);
    setManualInput('');
    setQuestionResponse('');
  };

  // Smart handler that detects input type
  const handleManualSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!manualInput.trim()) return;

    const input = manualInput.trim();
    console.log('[Manual Input] Processing:', input);

    // Check if it's just a ZIP code (5 digits only)
    if (/^\d{5}$/.test(input)) {
      console.log('[Manual Input] Detected: ZIP code');
      setDetectedZip(input);
      fetchZipData(input);
      return;
    }

    // Try to parse as address using flexible parser
    const parsed = parseFlexibleAddress(input);

    if (parsed && parsed.zip) {
      console.log('[Manual Input] Detected: Address with ZIP');
      setDetectedZip(parsed.zip);
      fetchZipData(parsed.zip);

      if (parsed.street && parsed.city && parsed.state) {
        console.log('[Manual Input] ✓ Parsed full address:', parsed);
        fetchPropertyData(parsed.zip, parsed.street, parsed.city, parsed.state);
      } else {
        console.log('[Manual Input] ⚠ Only ZIP detected, no full address - using mock data');
        fetchPropertyData(parsed.zip);
      }
      return;
    }

    // Otherwise, treat it as a question
    console.log('[Manual Input] Detected: Question');
    setIsLoadingSuggestions(true);
    setQuestionResponse('');

    try {
      const context = zipData
        ? `The user has asked a question about a property in ${zipData.city}, ${zipData.state} (ZIP ${zipData.zip}).

Based on ${zipData.totalReports || 0} inspection reports in this area, provide a helpful answer.

${zipData.topIssues && zipData.topIssues.length > 0 ? `
Common issues in this area include:
${zipData.topIssues.slice(0, 5).map((issue: any) =>
  `- ${issue.remarkTitle} (found in ${Math.min(issue.percentage, 100)}% of homes)`
).join('\n')}` : ''}

User question: ${input}`
        : `The user has asked a general question about home inspections. Provide a helpful answer.

User question: ${input}`;

      const response = await generateCoachingSuggestions({
        transcript: input,
        zipData: zipData || ({} as any),
        context,
      });

      if (response && response.length > 0) {
        setQuestionResponse(response[0].text);
      }
    } catch (err) {
      console.error('[Question] Error:', err);
      setQuestionResponse('Sorry, I encountered an error processing your question.');
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-3xl blur-2xl opacity-20"></div>
          <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-10 max-w-md text-center border border-white/20">
            <div className="bg-gradient-to-br from-red-500 to-orange-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Browser Not Supported
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Speech recognition is not supported in your browser. Please use
              Chrome, Edge, or Safari on desktop.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header with Gradient */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                  WIN Assist
                </h1>
              </div>
              <p className="text-gray-600 text-sm ml-[52px]">
                AI-Powered Lead Conversion Intelligence
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {isListening && (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
                <div className="relative flex items-center space-x-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/20 shadow-xl">
                  <div className="relative">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {isSpeaking ? 'Recording' : detectedZip ? 'Live Coaching' : 'Listening'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {detectedZip ? 'Active' : 'Waiting for ZIP'}
                    </p>
                  </div>
                </div>
              </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Column - Input, Transcript & Suggestions */}
          <div className="space-y-6">
            {/* Modern Glass Input Section */}
            <div className="relative group z-40">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Quick Input</h2>
                <p className="text-sm text-gray-600">
                  Enter a ZIP code, full address, or ask a question
                </p>
              </div>

              {/* Quick ZIP Presets */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-gray-500 mr-1">Quick ZIPs:</span>
                {['38019', '33101', '30301', '77001'].map((zip) => (
                  <button
                    key={zip}
                    onClick={() => {
                      setManualInput(zip);
                      setDetectedZip(zip);
                      fetchZipData(zip);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white/50 hover:bg-white hover:scale-105 rounded-xl transition-all duration-200 border border-gray-200/50 shadow-sm"
                  >
                    {zip}
                  </button>
                ))}
              </div>
            </div>

            {/* Single Smart Input with Modern Design */}
            <form onSubmit={handleManualSubmit} className="space-y-4 relative z-50">
              <div className="relative">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => handleAutocompleteInput(e.target.value)}
                  onFocus={() => predictions.length > 0 && setShowPredictions(true)}
                  onBlur={() => setTimeout(() => setShowPredictions(false), 200)}
                  placeholder="503 S Main St Covington TN 38019  |  38019  |  What services do I need?"
                  className="w-full px-6 py-4 pr-32 bg-white/80 backdrop-blur-sm border-2 border-gray-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm placeholder:text-gray-400 transition-all shadow-sm hover:shadow-md"
                  disabled={isLoadingSuggestions}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={!manualInput.trim() || isLoadingSuggestions}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all text-sm font-semibold shadow-lg disabled:shadow-none hover:shadow-xl"
                >
                  {isLoadingSuggestions ? (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'Submit'
                  )}
                </button>

                {/* Google Places Autocomplete Dropdown */}
                {showPredictions && predictions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-gray-200/50 max-h-80 overflow-y-auto z-[9999]">
                    {predictions.map((prediction, index) => (
                      <button
                        key={prediction.place_id}
                        type="button"
                        onClick={() => handleSelectAddress(prediction)}
                        className={`w-full text-left px-6 py-4 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0 ${
                          index === 0 ? 'rounded-t-2xl' : ''
                        } ${index === predictions.length - 1 ? 'rounded-b-2xl' : ''}`}
                      >
                        <div className="flex items-start space-x-3">
                          <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {prediction.structured_formatting?.main_text || prediction.description}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {prediction.structured_formatting?.secondary_text || ''}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Helper Text */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Flexible format: Works with or without commas</span>
                </div>
                {autocompleteService && (
                  <div className="flex items-center space-x-1 text-green-600">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">Address Autocomplete Active</span>
                  </div>
                )}
              </div>
            </form>

            {/* Question Response with Modern Design */}
            {questionResponse && (
              <div className="mt-6 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur-xl opacity-20"></div>
                <div className="relative p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200/50 rounded-2xl">
                  <div className="flex items-start space-x-4">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-blue-900 mb-2">AI Response:</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{questionResponse}</p>
                    </div>
                    <button
                      onClick={() => setQuestionResponse('')}
                      className="text-blue-600 hover:text-blue-800 p-2 hover:bg-white/50 rounded-lg transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

            {/* Modern Controls Card */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl blur-2xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Live Transcript</h2>
                  <p className="text-sm text-gray-600">Real-time conversation</p>
                </div>
                <select
                  value={speakerMode}
                  onChange={(e) => setSpeakerMode(e.target.value as any)}
                  className="bg-white/80 backdrop-blur-sm text-gray-700 text-sm border-2 border-gray-200/50 rounded-xl px-5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm hover:shadow-md transition-all font-medium"
                  disabled={isListening}
                >
                  <option value="off">Single Speaker</option>
                  <option value="manual">Two Speakers (Manual)</option>
                  <option value="automatic">Two Speakers (Auto)</option>
                </select>
              </div>

              {error && (
                <div className="mb-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl blur-xl opacity-20"></div>
                  <div className="relative p-4 bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200/50 rounded-2xl">
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              )}

              {/* Modern ZIP Detected Notification */}
              {detectedZip && isListening && (
                <div className="mb-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl blur-xl opacity-20 animate-pulse"></div>
                  <div className="relative p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200/50 rounded-2xl">
                    <div className="flex items-center">
                      <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2 rounded-xl mr-4 shadow-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-green-900">
                          ZIP Code {detectedZip} Detected
                        </p>
                        <p className="text-xs text-green-700 mt-0.5 font-medium">
                          Real-time coaching activated
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modern Control Buttons */}
              <div className="space-y-4">
                <div className="flex space-x-4">
                  {!isListening ? (
                    <button
                      onClick={startListening}
                      className="flex-1 relative group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                      <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] flex items-center justify-center space-x-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        <span>Start Listening</span>
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={stopListening}
                      className="flex-1 relative group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                      <div className="relative bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] flex items-center justify-center space-x-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        </svg>
                        <span>Stop</span>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={handleReset}
                    className="bg-white/80 backdrop-blur-sm hover:bg-white text-gray-700 font-semibold py-4 px-8 rounded-2xl transition-all border-2 border-gray-200/50 shadow-lg hover:shadow-xl hover:scale-[1.02]"
                  >
                    Reset
                  </button>
                </div>

                {/* Modern Speaker Controls */}
                {isListening && speakerMode === 'manual' && (
                  <div className="flex items-center space-x-3 bg-gradient-to-br from-gray-50 to-blue-50 border-2 border-gray-200/50 rounded-2xl p-4">
                    <span className="text-sm text-gray-700 font-bold">Speaker:</span>
                    <button
                      onClick={() => setSpeaker('sp')}
                      className={`flex-1 py-3 px-5 rounded-xl font-semibold text-sm transition-all ${
                        currentSpeaker === 'sp'
                          ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg scale-105'
                          : 'bg-white/80 backdrop-blur-sm text-gray-600 hover:bg-white border-2 border-gray-200/50 shadow-sm hover:shadow-md'
                      }`}
                    >
                      Service Provider
                    </button>
                    <button
                      onClick={() => setSpeaker('client')}
                      className={`flex-1 py-3 px-5 rounded-xl font-semibold text-sm transition-all ${
                        currentSpeaker === 'client'
                          ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg scale-105'
                          : 'bg-white/80 backdrop-blur-sm text-gray-600 hover:bg-white border-2 border-gray-200/50 shadow-sm hover:shadow-md'
                      }`}
                    >
                      Client
                    </button>
                  </div>
                )}
              </div>

              {/* Modern Transcript Display */}
              <div className="transcript-display mt-6 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl p-6 min-h-[300px] max-h-[500px] overflow-y-auto border-2 border-gray-200/50 shadow-inner">
                {transcript || interimTranscript ? (
                  speakerMode === 'off' ? (
                    <div key={transcript.length} className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                      <span className="font-medium">{transcript}</span>
                      {interimTranscript && (
                        <span className="text-gray-500 italic ml-1">
                          {interimTranscript}
                        </span>
                      )}
                      {!interimTranscript && transcript && (
                        <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse"></span>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {transcript && (
                        <div className={`flex ${currentSpeaker === 'sp' ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-lg ${
                            currentSpeaker === 'sp'
                              ? 'bg-white/80 backdrop-blur-sm border-2 border-gray-200/50'
                              : 'bg-gradient-to-br from-gray-800 to-gray-900 text-white'
                          }`}>
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`text-xs font-bold ${
                                currentSpeaker === 'sp' ? 'text-gray-600' : 'text-gray-300'
                              }`}>
                                {currentSpeaker === 'sp' ? 'Service Provider' : 'Client'}
                              </span>
                            </div>
                            <p className={`whitespace-pre-wrap leading-relaxed ${
                              currentSpeaker === 'sp' ? 'text-gray-900' : 'text-white'
                            }`}>
                              {transcript}
                            </p>
                          </div>
                        </div>
                      )}
                      {interimTranscript && (
                        <div className={`flex ${currentSpeaker === 'sp' ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[85%] rounded-2xl px-5 py-4 border-2 ${
                            currentSpeaker === 'sp'
                              ? 'bg-gray-50/50 backdrop-blur-sm border-gray-200/50'
                              : 'bg-gray-100/50 backdrop-blur-sm border-gray-300/50'
                          }`}>
                            <p className="text-gray-500 italic whitespace-pre-wrap leading-relaxed">
                              {interimTranscript}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <div className="text-center py-20">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-200 rounded-full mb-4">
                      <svg className="w-7 h-7 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 mb-1">
                      Click "Start Listening" to begin
                    </p>
                    <p className="text-sm text-gray-500">
                      Mention a ZIP code to activate coaching
                    </p>
                  </div>
                )}
              </div>

              {/* Stats Bar */}
              {transcript && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500">Accuracy:</span>
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                        confidence === 'high'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : confidence === 'medium'
                          ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {confidence === 'high' ? 'High' : confidence === 'medium' ? 'Medium' : 'Low'}
                      </span>
                    </div>
                    {isProcessing && (
                      <span className="text-gray-600 text-xs flex items-center">
                        <svg className="animate-spin h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing
                      </span>
                    )}
                  </div>
                  <div className="text-gray-500">
                    {transcript.split(' ').filter(w => w).length} words
                  </div>
                </div>
              )}
            </div>

            {/* Modern AI Coaching Suggestions */}
            {(suggestions.length > 0 || isLoadingSuggestions || (transcript && !detectedZip)) && (
              <div className="relative group mt-5">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl blur-2xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
                <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">
                            💬 Conversation Intelligence
                          </h2>
                          <p className="text-sm text-gray-600 mt-0.5">
                            What to say to win this lead
                          </p>
                          {lastSuggestionUpdate && detectedZip && (
                            <p className="text-xs text-gray-500 mt-1 font-medium">
                              Updated {lastSuggestionUpdate.toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mode Toggle and Status */}
                    <div className="flex items-center space-x-3">
                      {/* Suggestion Mode Toggle */}
                      <div className="flex items-center bg-white/70 backdrop-blur-sm rounded-xl border-2 border-gray-200/50 p-1 shadow-lg">
                        <button
                          onClick={() => setSuggestionMode('script')}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            suggestionMode === 'script'
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                          title="Full sentences you can read verbatim"
                        >
                          📄 Script
                        </button>
                        <button
                          onClick={() => setSuggestionMode('bullets')}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            suggestionMode === 'bullets'
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                          title="Key points to frame your own sentences"
                        >
                          • Bullets
                        </button>
                      </div>

                      {/* Manual Refresh Button */}
                      {detectedZip && zipData && !isLoadingSuggestions && (
                        <button
                          onClick={manualRefreshSuggestions}
                          className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all"
                          title="Refresh suggestions based on latest conversation"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>Refresh</span>
                        </button>
                      )}

                      {/* Loading indicator */}
                      {isLoadingSuggestions && (
                        <div className="flex items-center text-sm text-gray-600 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-200/50">
                          <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="font-semibold">Analyzing</span>
                        </div>
                      )}
                    </div>
                  </div>

                {/* Mode Description */}
                {suggestionMode === 'bullets' && suggestions.length > 0 && (
                  <div className="mb-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl p-3">
                    <p className="text-xs text-indigo-900 font-medium">
                      💡 <span className="font-bold">Bullet Mode:</span> Use these talking points to frame your own natural sentences during the call.
                    </p>
                  </div>
                )}

                {/* Waiting for ZIP */}
                {transcript && !detectedZip && suggestions.length === 0 && !isLoadingSuggestions && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="bg-gray-100 p-5 rounded-full mb-4">
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <p className="text-gray-900 font-medium mb-1">Waiting for ZIP Code</p>
                    <p className="text-sm text-gray-500">
                      Mention a ZIP code to activate coaching
                    </p>
                  </div>
                )}

                {/* Loading State */}
                {isLoadingSuggestions && suggestions.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="relative">
                      <div className="w-12 h-12 border-3 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
                    </div>
                    <p className="text-gray-600 mt-4 text-sm">Generating suggestions</p>
                  </div>
                )}

                {/* Modern Suggestions List */}
                <div className="space-y-4">
                  {suggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="relative group/card"
                    >
                      <div className={`absolute inset-0 rounded-2xl blur-xl opacity-0 group-hover/card:opacity-30 transition-opacity ${
                        suggestion.tag === 'Build Trust'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                          : suggestion.tag === 'Show Expertise'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                          : suggestion.tag === 'Address Concerns'
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                          : 'bg-gradient-to-r from-purple-500 to-pink-500'
                      }`}></div>
                      <div className={`relative bg-gradient-to-br rounded-2xl p-5 border-2 transition-all hover:scale-[1.02] hover:shadow-xl ${
                        suggestion.tag === 'Build Trust'
                          ? 'from-green-50 to-emerald-50 border-green-200/50'
                          : suggestion.tag === 'Show Expertise'
                          ? 'from-blue-50 to-indigo-50 border-blue-200/50'
                          : suggestion.tag === 'Address Concerns'
                          ? 'from-orange-50 to-amber-50 border-orange-200/50'
                          : 'from-purple-50 to-pink-50 border-purple-200/50'
                      }`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm ${
                              suggestion.tag === 'Build Trust'
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                                : suggestion.tag === 'Show Expertise'
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                                : suggestion.tag === 'Address Concerns'
                                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white'
                                : 'bg-gradient-to-r from-purple-500 to-pink-600 text-white'
                            }`}>
                              {suggestion.tag}
                            </span>
                            {suggestionMode === 'bullets' && (
                              <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 px-2 py-1 rounded-lg">
                                Talking Points
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-gray-700 bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                            {Math.round(suggestion.confidence * 100)}%
                          </span>
                        </div>

                        {/* Different display based on mode */}
                        {suggestionMode === 'script' ? (
                          <p className="text-gray-900 font-bold mb-3 leading-relaxed text-base">
                            "{suggestion.text}"
                          </p>
                        ) : (
                          <div className="text-gray-900 font-bold mb-3 leading-relaxed text-base space-y-2">
                            {suggestion.text.split('\n').filter(line => line.trim()).map((line, idx) => (
                              <div key={idx} className="flex items-start space-x-2">
                                <span className="text-indigo-600 font-bold mt-0.5">•</span>
                                <span className="flex-1">{line.replace(/^[•\-\*]\s*/, '')}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {suggestion.reasoning && (
                          <p className="text-sm text-gray-700 leading-relaxed bg-white/40 backdrop-blur-sm rounded-xl p-3">
                            <span className="font-semibold text-gray-900">Why: </span>
                            {suggestion.reasoning}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            )}
          </div>
          </div>

          {/* Right Column - Modern Area Profile */}
          <div className="sticky top-6 self-start space-y-6">
            {/* Property Details Card - Independent of Area Data */}
            {propertyData && (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-emerald-600 rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Property Details</h2>
                    {propertyData.source === 'zillow' && (
                      <span className="text-xs px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold shadow-sm">
                        Live Data
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    {propertyData.address && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                        <div className="text-xs text-blue-700 mb-1 font-semibold">Address</div>
                        <div className="text-sm text-gray-900 font-bold">{propertyData.address}</div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {propertyData.city}, {propertyData.state} {propertyData.zip}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      {propertyData.yearBuilt && (
                        <div className="bg-white border-2 border-gray-200 rounded-xl p-3">
                          <div className="text-xs text-gray-500 mb-1">Year Built</div>
                          <div className="text-lg font-bold text-gray-900">{propertyData.yearBuilt}</div>
                          <div className="text-xs text-gray-600">{propertyData.propertyAge} years old</div>
                        </div>
                      )}

                      {propertyData.livingArea && (
                        <div className="bg-white border-2 border-gray-200 rounded-xl p-3">
                          <div className="text-xs text-gray-500 mb-1">Living Area</div>
                          <div className="text-lg font-bold text-gray-900">
                            {propertyData.livingArea.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600">sq ft</div>
                        </div>
                      )}

                      {propertyData.bedrooms && (
                        <div className="bg-white border-2 border-gray-200 rounded-xl p-3">
                          <div className="text-xs text-gray-500 mb-1">Bedrooms</div>
                          <div className="text-lg font-bold text-gray-900">{propertyData.bedrooms}</div>
                        </div>
                      )}

                      {propertyData.bathrooms && (
                        <div className="bg-white border-2 border-gray-200 rounded-xl p-3">
                          <div className="text-xs text-gray-500 mb-1">Bathrooms</div>
                          <div className="text-lg font-bold text-gray-900">{propertyData.bathrooms}</div>
                        </div>
                      )}
                    </div>

                    {propertyData.estimatedValue && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                        <div className="text-xs text-green-700 mb-1 font-semibold">Estimated Value</div>
                        <div className="text-2xl font-bold text-gray-900">
                          ${(propertyData.estimatedValue / 1000).toLocaleString()}K
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Zillow Price</div>
                      </div>
                    )}

                    {propertyData.propertyType && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-xs text-gray-600 font-medium">Property Type</span>
                        <span className="text-sm text-gray-900 font-bold">{propertyData.propertyType}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Why WIN? Panel */}
            {zipData && zipData.totalReports && zipData.totalReports > 0 && (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-white/20">
                  <h3 className="font-bold text-indigo-900 mb-4 text-lg">🏆 Why Choose WIN (For This Property)</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">1</div>
                      <div>
                        <div className="font-bold text-gray-900">Local Experience That Matters</div>
                        <div className="text-gray-700 text-xs">
                          We've inspected {zipData.totalReports} homes in ZIP {zipData.zip}. We know exactly what to look for{propertyData && propertyData.yearBuilt ? ` in ${propertyData.yearBuilt}-era construction` : ' in this area'}.
                        </div>
                      </div>
                    </div>

                    {propertyData && propertyData.propertyAge && propertyData.propertyAge > 30 && (
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">2</div>
                        <div>
                          <div className="font-bold text-gray-900">Insurance-Ready Reports</div>
                          <div className="text-gray-700 text-xs">
                            Your {propertyData.propertyAge}-year home needs documentation for insurance. Our reports are pre-approved by major carriers.
                          </div>
                        </div>
                      </div>
                    )}

                    {zipData.topIssues && zipData.topIssues[0] && (
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{propertyData && propertyData.propertyAge && propertyData.propertyAge > 30 ? '3' : '2'}</div>
                        <div>
                          <div className="font-bold text-gray-900">Area-Specific Focus</div>
                          <div className="text-gray-700 text-xs">
                            {Math.min(zipData.topIssues[0].percentage, 100)}% of homes in your area have {zipData.topIssues[0].categoryName.toLowerCase()} issues. We spend extra time on this because we know local patterns.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Area Profile Card */}
            {isLoadingZipData ? (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl blur-2xl opacity-20"></div>
                <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Area Profile</h2>
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="relative">
                      <div className="w-12 h-12 border-3 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
                    </div>
                    <p className="text-gray-600 mt-4 text-sm">Loading ZIP {detectedZip}</p>
                  </div>
                </div>
              </div>
            ) : zipDataError && !propertyData ? (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-3xl blur-2xl opacity-20"></div>
                <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Area Profile</h2>
                  <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200/50 rounded-2xl p-8 text-center shadow-lg">
                    <div className="bg-gradient-to-br from-red-500 to-orange-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <p className="text-red-900 font-bold mb-2 text-lg">Area Data Not Available</p>
                    <p className="text-sm text-red-700">{zipDataError}</p>
                  </div>
                </div>
              </div>
            ) : zipData ? (
              <div className="relative group sticky top-6">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Area Profile</h2>
                    {dataSource && (
                      <span className={`text-xs px-3 py-1.5 rounded-xl font-bold shadow-sm ${
                        dataSource === 'real'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                          : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                      }`}>
                        {dataSource === 'real' ? 'Live' : 'Demo'}
                      </span>
                    )}
                  </div>

                {/* Modern Location */}
                <div className="mb-6 pb-6 border-b-2 border-gradient-to-r from-blue-200 to-purple-200">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                    </div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
                      {zipData.city}, {zipData.state}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 font-medium ml-11">ZIP {zipData.zip}</div>
                </div>

                {/* Area Statistics - Only show if we have real data */}
                {zipData.totalReports && zipData.totalReports > 0 && (
                  <div className="mb-6 pb-6 border-b-2 border-gray-200">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
                      <div className="text-xs text-blue-700 font-semibold mb-2">Area Data</div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {zipData.totalReports} Inspections
                      </div>
                      <div className="text-xs text-gray-600">
                        Real inspection reports analyzed in this ZIP code
                      </div>
                    </div>
                  </div>
                )}

                {/* Modern Top Services */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Top Services
                  </h3>
                  <div className="space-y-4">
                    {zipData.serviceFrequencies.slice(0, 5).map((service: any, index: number) => (
                      <div key={service.serviceName}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-700 font-semibold">{service.serviceName}</span>
                          <span className="font-bold text-gray-900 bg-white/50 backdrop-blur-sm px-2 py-0.5 rounded-lg">
                            {service.frequency}%
                          </span>
                        </div>
                        <div className="relative w-full bg-gray-200/50 backdrop-blur-sm rounded-full h-2.5 overflow-hidden shadow-inner">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-700 shadow-lg ${
                              index === 0
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                : index === 1
                                ? 'bg-gradient-to-r from-purple-500 to-pink-600'
                                : index === 2
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                                : index === 3
                                ? 'bg-gradient-to-r from-orange-500 to-amber-600'
                                : 'bg-gradient-to-r from-gray-600 to-gray-700'
                            }`}
                            style={{ width: `${service.frequency}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modern Top Issues */}
                {zipData.topIssues && zipData.topIssues.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Top Repair Categories
                    </h3>
                    <p className="text-xs text-gray-600 mb-4">
                      Based on {zipData.totalReports} inspection reports • Top 5 categories needing repairs
                    </p>
                    <div className="space-y-3">
                      {zipData.topIssues.slice(0, 5).map((issue: any, index: number) => (
                        <div
                          key={`${issue.serviceName}-${issue.remarkTitle}-${index}`}
                          className="relative group/issue"
                        >
                          <div className={`absolute inset-0 rounded-2xl blur-lg opacity-0 group-hover/issue:opacity-30 transition-opacity ${
                            issue.severity === 'Repairs Recommended'
                              ? 'bg-gradient-to-r from-orange-500 to-red-500'
                              : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                          }`}></div>
                          <div className={`relative p-4 rounded-2xl text-xs shadow-lg hover:shadow-xl transition-all bg-gradient-to-br border-2 ${
                            issue.severity === 'Repairs Recommended'
                              ? 'from-orange-50 to-red-50 border-orange-200/50'
                              : 'from-blue-50 to-indigo-50 border-blue-200/50'
                          }`}>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className={`font-bold text-base mb-1 ${
                                  issue.severity === 'Repairs Recommended'
                                    ? 'text-orange-900'
                                    : 'text-blue-900'
                                }`}>
                                  {issue.categoryName}
                                </div>
                                <div className="text-gray-700 text-xs font-medium mb-1">
                                  {issue.remarkTitle}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  From: {issue.serviceName}
                                </div>
                              </div>
                              <div className="flex flex-col items-end ml-2 flex-shrink-0">
                                <span className={`text-xs font-bold px-2 py-1 rounded-lg shadow-sm ${
                                  issue.severity === 'Repairs Recommended'
                                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white'
                                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                                }`}>
                                  {Math.min(issue.percentage, 100)}%
                                </span>
                                <span className="text-xs text-gray-500 mt-1">of homes</span>
                              </div>
                            </div>
                            <div className="text-gray-500 text-xs">
                              {issue.totalCategoryRepairs ? (
                                <>
                                  <span className="font-semibold text-gray-700">{issue.totalCategoryRepairs} total repairs</span> in this category
                                  {issue.count && ` • Most common: "${issue.remarkTitle}" (${issue.count}x)`}
                                </>
                              ) : (
                                `Found in ${issue.count} reports`
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
              </div>
            ) : (
              <div className="relative group sticky top-6">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-400 to-gray-500 rounded-3xl blur-2xl opacity-10"></div>
                <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
                  <h2 className="text-2xl font-bold text-gray-900 mb-8">Area Profile</h2>
                  <div className="text-center py-12">
                    <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-6 rounded-3xl inline-block mb-6 shadow-lg">
                      <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-700 font-bold mb-6 text-lg">Waiting for ZIP code</p>
                    <div className="space-y-3 text-sm text-gray-600">
                      <p className="font-bold">Try saying:</p>
                      <ul className="list-none space-y-3 mt-4">
                        <li className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200/50 rounded-2xl py-3 px-4 font-semibold shadow-sm hover:shadow-md transition-all">Miami, 33101</li>
                        <li className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200/50 rounded-2xl py-3 px-4 font-semibold shadow-sm hover:shadow-md transition-all">ZIP code 30301</li>
                        <li className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200/50 rounded-2xl py-3 px-4 font-semibold shadow-sm hover:shadow-md transition-all">Houston 77001</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Presentation Icon */}
      <button
        onClick={() => setShowPresentation(true)}
        className="fixed top-4 right-4 w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 z-50 group flex items-center justify-center"
        title="View Presentation"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"></div>
      </button>

      {/* Presentation Slider */}
      <PresentationSlider
        isOpen={showPresentation}
        onClose={() => setShowPresentation(false)}
        onStartDemo={() => {
          // Optional: You can add any demo initialization logic here
          console.log('Starting demo...');
        }}
      />
    </div>
  );
}

export default App;
