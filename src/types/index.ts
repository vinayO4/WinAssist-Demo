// Transcript message types
export type TranscriptMessage = {
  id: string;
  timestamp: number;
  speaker: 'sp' | 'client' | 'unknown'; // sp = Service Provider
  text: string;
}

export type SpeakerMode = 'manual' | 'automatic' | 'off';

// ZIP code data types
export type ZipData = {
  zip: string;
  city: string;
  state: string;
  homeProfile: HomeProfile;
  riskFactors: RiskFactor[];
  serviceFrequencies: ServiceFrequency[];
  avgAddOnRevenue: number;
  // WinSpect API data
  totalReports?: number;
  topIssues?: TopIssue[];
  servicesWithMostFindings?: ServiceWithFindings[];
}

export type TopIssue = {
  serviceName: string;
  categoryName: string;
  subCategoryName: string;
  remarkTitle: string;
  severity: string;
  count: number;
  percentage: number;
  serviceUsageCount?: number; // How many times this service was used
  totalCategoryRepairs?: number; // Total repairs in this category across all services
}

export type ServiceWithFindings = {
  serviceName: string;
  usageCount: number;
  remarkCount: number;
  usagePercentage: number;
}

export type HomeProfile = {
  avgAge: number;
  humidity: 'low' | 'medium' | 'high' | 'very high';
  floodZone: string;
  predominantFoundation?: string;
}

export type RiskFactor = {
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  statValue?: string;
}

export type ServiceFrequency = {
  serviceName: string;
  frequency: number; // 0-100 percentage
  avgRevenue: number;
  description: string;
}

// Claude API suggestion types - Lead Conversion Focus
export type CoachingSuggestion = {
  id: string;
  text: string;
  tag: 'Build Trust' | 'Show Expertise' | 'Address Concerns' | 'Close';
  confidence: number;
  reasoning?: string;
}

// Speech recognition types
export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export interface ISpeechRecognitionConstructor {
  new (): ISpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: ISpeechRecognitionConstructor;
    webkitSpeechRecognition?: ISpeechRecognitionConstructor;
  }
}
