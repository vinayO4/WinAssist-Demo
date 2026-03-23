import Anthropic from '@anthropic-ai/sdk';

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

const client = API_KEY ? new Anthropic({
  apiKey: API_KEY,
  dangerouslyAllowBrowser: true,
}) : null;

// Common home inspection terms that speech recognition often gets wrong
const DOMAIN_VOCABULARY = {
  // Inspection types
  'wind mitigation': ['wind medication', 'win mitigation', 'wind midi gation'],
  'radon testing': ['ray don testing', 'radar testing', 'radon chest thing'],
  'mold inspection': ['mold in section', 'mole inspection', 'bold inspection'],
  'sewer scope': ['sue or scope', 'sewer scoop', 'sue her scope'],
  '4-point inspection': ['four point inspection', 'for point inspection', '4 point inspection'],
  'crawl space': ['crawl space', 'crawlspace', 'crawler space'],
  'hvac inspection': ['h vac inspection', 'hvac in section'],

  // Common locations
  'miami': ['my army', 'my ami', 'miammi'],
  'atlanta': ['at lanta', 'at lana'],
  'houston': ['hue ston', 'use ton'],

  // Common terms
  'inspection': ['in section', 'and section'],
  'property': ['proper tea', 'property'],
  'foundation': ['found asian', 'foundation'],
  'moisture': ['moist sure', 'moisture'],
};

// Simple fuzzy matching correction
function correctCommonMistakes(text: string): string {
  let corrected = text.toLowerCase();

  for (const [correct, mistakes] of Object.entries(DOMAIN_VOCABULARY)) {
    for (const mistake of mistakes) {
      const regex = new RegExp(mistake, 'gi');
      corrected = corrected.replace(regex, correct);
    }
  }

  return corrected;
}

// Use Claude to intelligently correct and clean up the transcript
export async function correctTranscript(rawTranscript: string): Promise<{
  correctedText: string;
  confidence: 'high' | 'medium' | 'low';
  corrections: string[];
}> {
  // First apply simple corrections
  const simpleCorrection = correctCommonMistakes(rawTranscript);

  // If no Claude API, return simple correction
  if (!client) {
    return {
      correctedText: simpleCorrection,
      confidence: 'medium',
      corrections: [],
    };
  }

  try {
    const prompt = `You are a transcript correction assistant for a home inspection business.

Raw transcript from speech recognition:
"${rawTranscript}"

Your task:
1. Fix any speech recognition errors (especially home inspection terms like "wind mitigation", "radon testing", "4-point inspection", "mold inspection", "sewer scope", "HVAC", "crawl space")
2. Correct grammar and punctuation
3. Preserve ZIP codes exactly as spoken (5-digit numbers)
4. Keep the meaning and intent intact
5. Return ONLY the corrected transcript, no explanations

Common errors to watch for:
- "my army" → "Miami"
- "wind medication" → "wind mitigation"
- "ray don" → "radon"
- "in section" → "inspection"
- "crawl space" variations

Corrected transcript:`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const correctedText = content.text.trim();

      // Calculate confidence based on how much was changed
      const similarity = calculateSimilarity(rawTranscript, correctedText);
      let confidence: 'high' | 'medium' | 'low';

      if (similarity > 0.9) confidence = 'high';
      else if (similarity > 0.7) confidence = 'medium';
      else confidence = 'low';

      // Track what was corrected
      const corrections: string[] = [];
      if (rawTranscript.toLowerCase() !== correctedText.toLowerCase()) {
        corrections.push(`Original: "${rawTranscript}"`);
        corrections.push(`Corrected: "${correctedText}"`);
      }

      return {
        correctedText,
        confidence,
        corrections,
      };
    }
  } catch (error) {
    console.error('Error correcting transcript with Claude:', error);
  }

  // Fallback to simple correction
  return {
    correctedText: simpleCorrection,
    confidence: 'medium',
    corrections: [],
  };
}

// Calculate similarity between two strings (0-1)
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// Levenshtein distance algorithm
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Extract confidence from speech recognition alternative
export function getTranscriptConfidence(
  results: SpeechRecognitionResult[]
): number {
  if (results.length === 0) return 0;

  let totalConfidence = 0;
  let count = 0;

  for (const result of results) {
    if (result[0]?.confidence !== undefined) {
      totalConfidence += result[0].confidence;
      count++;
    }
  }

  return count > 0 ? totalConfidence / count : 0.8; // Default to 0.8 if not available
}
