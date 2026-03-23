import Anthropic from '@anthropic-ai/sdk';
import type { CoachingSuggestion, ZipData } from '../types/index';

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.warn('VITE_ANTHROPIC_API_KEY not found in environment variables');
}

const client = new Anthropic({
  apiKey: API_KEY,
  dangerouslyAllowBrowser: true, // Note: For production, use a backend proxy
});

export interface GenerateSuggestionsParams {
  transcript: string;
  zipData: ZipData | null;
  context?: string;
}

export async function generateCoachingSuggestions({
  transcript,
  zipData,
  context = '',
}: GenerateSuggestionsParams): Promise<CoachingSuggestion[]> {
  if (!API_KEY) {
    // Return mock suggestions if no API key
    return getMockSuggestions(zipData);
  }

  try {
    const prompt = buildPrompt(transcript, zipData, context);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return parseSuggestions(content.text);
    }

    return getMockSuggestions(zipData);
  } catch (error) {
    console.error('Error calling Claude API:', error);
    return getMockSuggestions(zipData);
  }
}

function buildPrompt(
  transcript: string,
  zipData: ZipData | null,
  context: string
): string {
  let prompt = `You are an AI sales coach helping a home inspection service provider WIN this lead and convert them into a customer.

CRITICAL CONTEXT:
- This is a SALES CALL - the client hasn't hired us yet
- They're calling 3-5 competitors to compare quotes
- Our goal: Make them choose WIN Inspection over competitors
- Industry average: Only 20% of leads convert
- We need to stand out by demonstrating INSTANT EXPERTISE

YOUR MISSION:
Help the service provider convert this lead by:
1. Building instant credibility (show we know their specific property/area)
2. Demonstrating local expertise (reference real inspection data from their ZIP)
3. Creating urgency (insurance requirements, common issues in the area)
4. Differentiating from competitors (faster, more thorough, insurance-ready)
5. Addressing objections before they arise (price, timing, qualifications)

Call transcript so far:
"${transcript}"

`;

  if (zipData) {
    const totalReports = zipData.totalReports || 0;
    prompt += `
PROPERTY LOCATION: ${zipData.city}, ${zipData.state} (ZIP ${zipData.zip})

LOCAL EXPERTISE DATA (use this to build credibility):
- We've inspected ${totalReports} homes in this exact ZIP code
- Average home age in area: ${zipData.homeProfile.avgAge} years
- Area characteristics: ${zipData.homeProfile.humidity} humidity, Flood zone ${zipData.homeProfile.floodZone}
`;

    if (zipData.topIssues && zipData.topIssues.length > 0) {
      prompt += `\nMOST COMMON ISSUES IN THIS ZIP (${totalReports} inspections):
${zipData.topIssues.slice(0, 3).map(issue =>
  `- ${issue.categoryName}: ${issue.percentage}% of homes have ${issue.categoryName.toLowerCase()} issues`
).join('\n')}
`;
    }

    if (zipData.serviceFrequencies && zipData.serviceFrequencies.length > 0) {
      prompt += `\nTOP SERVICES REQUESTED IN THIS AREA:
${zipData.serviceFrequencies.slice(0, 3).map(s =>
  `- ${s.serviceName}: ${s.frequency}% of homeowners choose this (${s.description})`
).join('\n')}
`;
    }
  }

  if (context) {
    prompt += `\nADDITIONAL PROPERTY DETAILS:\n${context}\n`;
  }

  prompt += `
Provide exactly 3 conversation suggestions with these tags:
- "Build Trust" - Establish credibility and rapport by showing you know their property/area
- "Show Expertise" - Demonstrate specific local knowledge that competitors don't have
- "Address Concerns" - Preemptively handle common objections (price, timing, quality)
- "Close" - Move toward scheduling/commitment with confidence

For each suggestion:
1. Reference specific data points (property age, area patterns, number of inspections we've done)
2. Create differentiation vs generic competitors
3. Build urgency without being pushy
4. Sound knowledgeable and consultative, not salesy

Format your response as JSON array:
[
  {
    "tag": "Build Trust|Show Expertise|Address Concerns|Close",
    "text": "What the service provider should say to win this lead",
    "reasoning": "Why this converts leads better than generic responses"
  }
]`;

  return prompt;
}

function parseSuggestions(response: string): CoachingSuggestion[] {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.map((item: any, index: number) => ({
      id: `suggestion-${Date.now()}-${index}`,
      text: item.text,
      tag: item.tag,
      confidence: 0.9,
      reasoning: item.reasoning,
    }));
  } catch (error) {
    console.error('Error parsing Claude response:', error);
    return [];
  }
}

function getMockSuggestions(zipData: ZipData | null): CoachingSuggestion[] {
  if (!zipData) {
    return [
      {
        id: 'mock-1',
        text: "I'd be happy to help you with that inspection. Can you tell me the property address so I can give you specific insights about that home and area?",
        tag: 'Build Trust',
        confidence: 0.9,
        reasoning: 'Shows eagerness to help while positioning yourself as knowledgeable about specific properties',
      },
      {
        id: 'mock-2',
        text: "I'm familiar with that area and we've done hundreds of inspections there. What concerns or questions do you have about the property?",
        tag: 'Show Expertise',
        confidence: 0.85,
        reasoning: 'Demonstrates local expertise and invites client to share concerns, building trust',
      },
      {
        id: 'mock-3',
        text: "I know you're probably calling a few companies. What matters most to you in choosing an inspector - speed, thoroughness, or experience in the area?",
        tag: 'Address Concerns',
        confidence: 0.8,
        reasoning: 'Acknowledges competition while positioning yourself to address their specific priorities',
      },
    ];
  }

  // Return area-specific lead conversion suggestions
  const totalReports = zipData.totalReports || 0;
  const topIssue = zipData.topIssues && zipData.topIssues[0];

  return [
    {
      id: 'mock-1',
      text: `Great! I can actually tell you about your area right now. We've inspected ${totalReports} homes in ${zipData.city}, ZIP ${zipData.zip}. We know exactly what to look for in that neighborhood.`,
      tag: 'Build Trust',
      confidence: 0.95,
      reasoning: `Immediately demonstrates local expertise with specific data - sets you apart from competitors who say "I'll send you a quote"`,
    },
    {
      id: 'mock-2',
      text: topIssue
        ? `Based on our ${totalReports} inspections in your ZIP, ${topIssue.percentage}% of homes have ${topIssue.categoryName.toLowerCase()} issues. That's why we pay special attention to that during every inspection in your area.`
        : `We've found that homes in ZIP ${zipData.zip} typically have specific patterns - our inspectors know exactly what to check based on ${totalReports} local inspections.`,
      tag: 'Show Expertise',
      confidence: 0.9,
      reasoning: 'Uses real data to prove local expertise - makes client feel confident choosing you over generic competitors',
    },
    {
      id: 'mock-3',
      text: `I know you're comparing options. Here's what makes us different: we've inspected ${totalReports} homes in your exact ZIP, we deliver same-day reports, and our inspections are insurance-ready. Most companies send generic reports 3 days later. I can schedule you for this week - does Tuesday or Thursday work better?`,
      tag: 'Close',
      confidence: 0.85,
      reasoning: 'Differentiates from competitors, creates urgency, and moves to close with specific options - increases conversion',
    },
  ];
}
