import { useState, useEffect, useRef } from 'react';

interface PresentationSliderProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDemo: () => void;
}

// Animated counter hook
function useCountUp(end: number, duration: number = 2000, isActive: boolean = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setCount(0);
      return;
    }

    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, isActive]);

  return count;
}

export function PresentationSlider({ isOpen, onClose, onStartDemo }: PresentationSliderProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward');

  const slides = [
    {
      id: 'intro',
      title: 'WIN Assist',
      subtitle: 'AI-Powered Lead Conversion Intelligence',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            {/* Icon */}
            <div className="relative inline-block mb-6">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl shadow-lg">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            </div>

            <h3 className="text-4xl font-bold mb-5 text-gray-900">
              Turn Every Service Provider Into a Local Expert
            </h3>

            <p className="text-lg text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Real-time AI coaching that helps home inspection professionals <span className="font-semibold text-green-600">increase lead conversion</span> by demonstrating instant expertise about the client's specific property and neighborhood.
            </p>

            {/* Key stats badges */}
            <div className="flex justify-center items-center gap-6 mt-8">
              <div className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-xl shadow-md border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">3x+</div>
                <div className="text-xs text-gray-600 font-medium">Estimated Conversions</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-xl shadow-md border border-green-200">
                <div className="text-2xl font-bold text-green-600">Majority</div>
                <div className="text-xs text-gray-600 font-medium">Expected Success</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-xl shadow-md border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">$XXM+</div>
                <div className="text-xs text-gray-600 font-medium">Potential Impact</div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'problem',
      title: 'The Problem',
      subtitle: 'Most Leads Are Lost',
      content: (
        <div className="space-y-5">
          {/* Main stat */}
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 border border-red-200 shadow-md">
            <div className="text-center">
              <div className="text-5xl font-bold text-red-600 mb-3">Low Conversion</div>
              <div className="text-xl font-semibold text-gray-900 mb-2">Industry Average</div>
              <div className="text-base text-gray-700">
                <span className="bg-red-100 px-4 py-2 rounded-full">Most leads choose competitors</span>
              </div>
            </div>
          </div>

          {/* Pain points */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="text-2xl mb-2">📞</div>
              <div className="font-semibold text-gray-900 mb-1 text-sm">Generic Responses</div>
              <div className="text-xs text-gray-600">"Let me send you a quote..."</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="text-2xl mb-2">⏰</div>
              <div className="font-semibold text-gray-900 mb-1 text-sm">Slow Response</div>
              <div className="text-xs text-gray-600">"I'll get back to you in 24 hours..."</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="text-2xl mb-2">❓</div>
              <div className="font-semibold text-gray-900 mb-1 text-sm">No Local Knowledge</div>
              <div className="text-xs text-gray-600">"Not familiar with that area..."</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="text-2xl mb-2">💸</div>
              <div className="font-semibold text-gray-900 mb-1 text-sm">Revenue Loss</div>
              <div className="text-xs text-gray-600">Every lost lead = lost revenue opportunity</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'solution',
      title: 'The Solution',
      subtitle: 'Instant Property & Area Intelligence',
      content: (
        <div className="space-y-5">
          {/* Main success stat */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200 shadow-md">
            <div className="text-center">
              <div className="text-5xl font-bold text-green-600 mb-3">Higher Conversion</div>
              <div className="text-xl font-semibold text-gray-900 mb-2">With WIN Assist</div>
              <div className="text-base text-gray-700 mb-4">
                <span className="bg-green-100 px-4 py-2 rounded-full">Majority of leads convert</span>
              </div>

              {/* Comparison bar */}
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex flex-col items-center">
                  <div className="text-xs font-medium text-gray-600 mb-2">Before</div>
                  <div className="w-16 h-24 bg-red-400 rounded-lg flex items-center justify-center">
                    <div className="text-white font-semibold text-sm">Low</div>
                  </div>
                </div>
                <div className="text-2xl text-gray-400">→</div>
                <div className="flex flex-col items-center">
                  <div className="text-xs font-medium text-gray-600 mb-2">After</div>
                  <div className="w-16 h-36 bg-gradient-to-t from-green-600 to-emerald-500 rounded-lg flex items-center justify-center shadow-md">
                    <div className="text-white font-semibold text-sm">High</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 shadow-sm">
              <div className="text-2xl mb-2">🏠</div>
              <div className="font-semibold text-gray-900 mb-1 text-sm">Property Intelligence</div>
              <div className="text-xs text-gray-600">Instant property details from Zillow API</div>
            </div>
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200 shadow-sm">
              <div className="text-2xl mb-2">📊</div>
              <div className="font-semibold text-gray-900 mb-1 text-sm">Area Expertise</div>
              <div className="text-xs text-gray-600">Real inspection data from local ZIP codes</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 shadow-sm">
              <div className="text-2xl mb-2">💬</div>
              <div className="font-semibold text-gray-900 mb-1 text-sm">AI Coaching</div>
              <div className="text-xs text-gray-600">Powered by Claude Sonnet 4</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'ai-coaching-types',
      title: 'AI Coaching Intelligence',
      subtitle: '4 Types of Real-Time Suggestions',
      content: (
        <div className="space-y-5">
          <div className="text-center mb-4">
            <p className="text-base text-gray-700 max-w-3xl mx-auto">
              WIN Assist analyzes the conversation and provides contextual suggestions in four key categories
            </p>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* Build Trust */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200 shadow-sm">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="font-bold text-gray-900 text-base">Build Trust</div>
              </div>
              <div className="text-sm text-gray-700 mb-3 italic">"We've inspected 136 homes in your ZIP code. We know exactly what to look for in that neighborhood."</div>
              <div className="text-sm text-green-700 font-semibold">Establishes credibility immediately with specific local data</div>
            </div>

            {/* Show Expertise */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 shadow-sm">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="font-bold text-gray-900 text-base">Show Expertise</div>
              </div>
              <div className="text-sm text-gray-700 mb-3 italic">"For a 1996 home in your area, 24% have roof issues. That's why we focus extra attention on the roof structure and shingles."</div>
              <div className="text-sm text-blue-700 font-semibold">Demonstrates knowledge competitors don't have</div>
            </div>

            {/* Address Concerns */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-5 border border-orange-200 shadow-sm">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="font-bold text-gray-900 text-base">Address Concerns</div>
              </div>
              <div className="text-sm text-gray-700 mb-3 italic">"I know you're comparing options. We deliver same-day reports while most companies take 3 days. Plus, our reports are insurance-ready."</div>
              <div className="text-sm text-orange-700 font-semibold">Handles objections before they become deal-breakers</div>
            </div>

            {/* Close */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200 shadow-sm">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="font-bold text-gray-900 text-base">Close</div>
              </div>
              <div className="text-sm text-gray-700 mb-3 italic">"I can schedule you for this week. Does Tuesday or Thursday work better for you?"</div>
              <div className="text-sm text-purple-700 font-semibold">Moves conversation toward commitment with confidence</div>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-200">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🤖</div>
              <div className="text-sm text-gray-700">
                <span className="font-bold text-indigo-900">AI adapts in real-time:</span> Suggestions change based on what the client says, their property details, and local inspection data.
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'what-makes-different',
      title: 'What Makes WIN Assist Different',
      subtitle: 'Not Just Another AI Tool',
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            {/* Real Data */}
            <div className="bg-white rounded-xl p-5 border-2 border-blue-300 shadow-sm">
              <div className="flex items-start space-x-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <div className="text-white text-xl font-bold">1</div>
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-base mb-2">Real Property Data</div>
                  <div className="text-sm text-gray-700">Pulls live data from Zillow API - actual property age, size, and characteristics</div>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 mt-2">
                <div className="text-sm text-blue-900 font-semibold">✓ Not generic - specific to THIS property</div>
              </div>
            </div>

            {/* Real Inspections */}
            <div className="bg-white rounded-xl p-5 border-2 border-indigo-300 shadow-sm">
              <div className="flex items-start space-x-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
                  <div className="text-white text-xl font-bold">2</div>
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-base mb-2">Real Inspection History</div>
                  <div className="text-sm text-gray-700">Analyzes actual inspection reports from that ZIP code (e.g., 136 homes in ZIP 38019)</div>
                </div>
              </div>
              <div className="bg-indigo-50 rounded-lg p-3 mt-2">
                <div className="text-sm text-indigo-900 font-semibold">✓ Real patterns, not assumptions</div>
              </div>
            </div>

            {/* Voice Recognition */}
            <div className="bg-white rounded-xl p-5 border-2 border-purple-300 shadow-sm">
              <div className="flex items-start space-x-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0">
                  <div className="text-white text-xl font-bold">3</div>
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-base mb-2">Voice-Activated</div>
                  <div className="text-sm text-gray-700">Auto-detects addresses from conversation - no typing, no interruptions to the call</div>
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 mt-2">
                <div className="text-sm text-purple-900 font-semibold">✓ Hands-free during calls</div>
              </div>
            </div>

            {/* Context Aware */}
            <div className="bg-white rounded-xl p-5 border-2 border-green-300 shadow-sm">
              <div className="flex items-start space-x-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
                  <div className="text-white text-xl font-bold">4</div>
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-base mb-2">Context-Aware AI</div>
                  <div className="text-sm text-gray-700">Adapts suggestions based on conversation flow, client concerns, and property specifics</div>
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 mt-2">
                <div className="text-sm text-green-900 font-semibold">✓ Dynamic, not scripted responses</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white text-center shadow-md">
            <div className="font-bold text-lg mb-2">The Result: Instant Local Expert</div>
            <div className="text-sm opacity-95">Every service provider sounds like they've been working in that neighborhood for years - from the very first call.</div>
          </div>
        </div>
      ),
    },
    {
      id: 'before-after',
      title: 'The Transformation',
      subtitle: 'How Conversations Change With WIN Assist',
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            {/* Without WIN Assist */}
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-5 border-2 border-red-300 shadow-md">
              <div className="text-center mb-4">
                <div className="inline-block bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold mb-2">
                  ❌ Without WIN Assist
                </div>
                <div className="text-xs text-red-700 font-medium">Generic, uninformed response</div>
              </div>

              <div className="bg-white rounded-lg p-4 mb-3 border border-red-200">
                <div className="text-sm text-gray-800 italic mb-3">
                  "Our standard inspection is $350. We can schedule you for next week."
                </div>
                <div className="text-xs text-gray-600">
                  → No local knowledge demonstrated<br/>
                  → No property-specific insights<br/>
                  → Sounds like every other inspector
                </div>
              </div>

              <div className="bg-red-100 rounded-lg p-3">
                <div className="font-bold text-red-900 text-sm mb-1">Result:</div>
                <div className="text-xs text-red-800">Client compares quotes from 5 companies, chooses lowest price. <span className="font-bold">Lead lost.</span></div>
              </div>
            </div>

            {/* With WIN Assist */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-300 shadow-md">
              <div className="text-center mb-4">
                <div className="inline-block bg-green-600 text-white px-4 py-2 rounded-full text-sm font-bold mb-2">
                  ✓ With WIN Assist
                </div>
                <div className="text-xs text-green-700 font-medium">Data-backed, expert response</div>
              </div>

              <div className="bg-white rounded-lg p-4 mb-3 border border-green-200">
                <div className="text-sm text-gray-800 italic mb-3">
                  "I can help you right away. I see your home was built in 1996. We've inspected 136 homes in your ZIP - 24% had roof issues due to age. We know exactly what to check for homes like yours."
                </div>
                <div className="text-xs text-gray-600">
                  → Demonstrates local expertise immediately<br/>
                  → Shows knowledge of their specific property<br/>
                  → Differentiates from competitors instantly
                </div>
              </div>

              <div className="bg-green-100 rounded-lg p-3">
                <div className="font-bold text-green-900 text-sm mb-1">Result:</div>
                <div className="text-xs text-green-800">Client feels confident choosing WIN - "They really know this area!" <span className="font-bold">Lead converted.</span></div>
              </div>
            </div>
          </div>

          {/* Key Insight */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 text-white shadow-md">
            <div className="text-center mb-2">
              <div className="font-bold text-base mb-1">The Difference: Instant Credibility Wins Leads</div>
              <div className="text-sm opacity-95">WIN Assist transforms generic responses into expert consultations - winning leads in the first 60 seconds.</div>
            </div>
            <div className="text-xs opacity-90 mt-3 pt-3 border-t border-white/30 text-center">
              <span className="font-semibold">Bonus:</span> Once the lead converts, trust enables better recommendations (e.g., relevant add-ons based on area data)
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'how-it-works',
      title: 'How It Works',
      subtitle: 'From Lead Call to Conversion in 60 Seconds',
      content: (
        <div className="space-y-4">
          {/* Timeline */}
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-600 via-purple-600 to-green-600"></div>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-semibold text-sm shadow-md flex-shrink-0 z-10">
                  1
                </div>
                <div className="flex-1 bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-gray-900 text-sm">Client Mentions Address</div>
                    <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">0 sec</div>
                  </div>
                  <div className="text-xs text-gray-600 mb-1">"I need an inspection for 503 S Main St, Covington TN 38019"</div>
                  <div className="text-xs text-blue-700">Voice recognition auto-detects address</div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-md flex-shrink-0 z-10">
                  2
                </div>
                <div className="flex-1 bg-white rounded-lg p-4 border border-indigo-200 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-gray-900 text-sm">Instant Data Fetch</div>
                    <div className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full text-xs font-medium">3 sec</div>
                  </div>
                  <div className="text-xs text-gray-600 mb-1">Zillow property data + 136 inspection reports from ZIP</div>
                  <div className="text-xs text-indigo-700">1996 home, 1512 sq ft • 24% roof issues • 18% HVAC problems</div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-md flex-shrink-0 z-10">
                  3
                </div>
                <div className="flex-1 bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-gray-900 text-sm">AI-Powered Response</div>
                    <div className="bg-purple-50 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">30 sec</div>
                  </div>
                  <div className="text-xs text-gray-600 mb-1">"We've inspected 136 homes in your ZIP. For a 1996 home, we focus on roofs and HVAC..."</div>
                  <div className="text-xs text-purple-700">Demonstrates local expertise instantly</div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center text-white font-semibold text-sm shadow-md flex-shrink-0 z-10">
                  ✓
                </div>
                <div className="flex-1 bg-green-600 rounded-lg p-4 border border-green-500 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-white text-sm">Lead Converted</div>
                    <div className="bg-green-700 text-green-100 px-2 py-1 rounded-full text-xs font-medium">60 sec</div>
                  </div>
                  <div className="text-xs text-white mb-1">"I'll schedule you for Tuesday at 2pm."</div>
                  <div className="text-xs text-green-100">Inspection booked successfully</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'roi',
      title: 'Business Impact',
      subtitle: 'Real Numbers, Real Results',
      content: (
        <div className="space-y-3">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-200 shadow-md">
            <div className="text-center mb-3">
              <div className="text-lg font-semibold text-gray-900 mb-0.5">Estimated Business Impact</div>
              <div className="text-xs text-gray-600">For a mid-size franchise network</div>
            </div>

            {/* Math breakdown */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-white rounded-lg p-3 shadow-sm border border-blue-200">
                <div className="text-xs text-gray-600 mb-0.5 font-medium">Daily Leads per SP</div>
                <div className="text-3xl font-bold text-blue-600">~10</div>
                <div className="text-xs text-gray-500 mt-0.5">Industry average</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm border border-red-200">
                <div className="text-xs text-gray-600 mb-0.5 font-medium">Before</div>
                <div className="text-3xl font-bold text-red-600">Low</div>
                <div className="text-xs text-gray-500 mt-0.5">Most leads lost</div>
              </div>
              <div className="bg-green-600 rounded-lg p-3 shadow-sm border border-green-500">
                <div className="text-xs text-white mb-0.5 font-medium">With WIN Assist</div>
                <div className="text-3xl font-bold text-white">High</div>
                <div className="text-xs text-green-100 mt-0.5">Majority convert</div>
              </div>
            </div>

            {/* Impact numbers */}
            <div className="bg-green-600 rounded-xl p-3 text-white shadow-md">
              <div className="text-center">
                <div className="text-sm font-semibold mb-0.5">Estimated Additional Conversions</div>
                <div className="text-3xl font-bold mb-0.5">XXX,XXX+</div>
                <div className="text-xs opacity-90 mb-2">Potential annual inspections gained</div>

                <div className="pt-2 border-t border-white/30">
                  <div className="text-sm font-semibold mb-0.5">Estimated Revenue Impact</div>
                  <div className="text-3xl font-bold mb-0.5">$XXM+</div>
                  <div className="text-xs opacity-90">Potential additional annual revenue</div>
                </div>
              </div>
            </div>
          </div>

          {/* Key insight - highlighted */}
          <div className="relative">
            <div className="absolute inset-0 bg-yellow-400 rounded-xl blur-md opacity-30"></div>
            <div className="relative bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-400 rounded-xl p-4 shadow-md">
              <div className="flex items-center space-x-3">
                <div className="text-2xl flex-shrink-0">⚡</div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 text-base mb-1">From the same number of leads</div>
                  <div className="text-xs text-gray-800 font-medium">No additional marketing spend. Just better conversion through instant expertise.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'live-demo',
      title: 'See It In Action',
      subtitle: 'Live Demo',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            {/* Play button */}
            <div className="inline-block mb-6">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 rounded-2xl shadow-lg">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <h3 className="text-3xl font-bold mb-3 text-gray-900">
              Ready to See WIN Assist in Action?
            </h3>
            <p className="text-base text-gray-700 mb-3 max-w-2xl mx-auto">
              Watch how a service provider converts a lead using voice input, property intelligence, and AI-powered conversation coaching.
            </p>
          </div>

          {/* Demo features grid */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 shadow-sm">
            <div className="text-center mb-4">
              <div className="text-sm font-semibold text-gray-900">What You'll See:</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2 bg-white rounded-lg p-3 shadow-sm border border-blue-200">
                <div className="text-xl">🎤</div>
                <div>
                  <div className="text-xs font-semibold text-gray-900">Voice Recognition</div>
                  <div className="text-xs text-gray-600">Real-time transcription</div>
                </div>
              </div>
              <div className="flex items-center space-x-2 bg-white rounded-lg p-3 shadow-sm border border-indigo-200">
                <div className="text-xl">🏠</div>
                <div>
                  <div className="text-xs font-semibold text-gray-900">Property Data</div>
                  <div className="text-xs text-gray-600">Live from Zillow API</div>
                </div>
              </div>
              <div className="flex items-center space-x-2 bg-white rounded-lg p-3 shadow-sm border border-purple-200">
                <div className="text-xl">📊</div>
                <div>
                  <div className="text-xs font-semibold text-gray-900">Inspection Data</div>
                  <div className="text-xs text-gray-600">Real reports analyzed</div>
                </div>
              </div>
              <div className="flex items-center space-x-2 bg-white rounded-lg p-3 shadow-sm border border-green-200">
                <div className="text-xl">💬</div>
                <div>
                  <div className="text-xs font-semibold text-gray-900">AI Coaching</div>
                  <div className="text-xs text-gray-600">Claude Sonnet 4</div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => {
              onStartDemo();
              onClose();
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-semibold py-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-colors shadow-lg"
          >
            <div className="flex items-center justify-center space-x-3">
              <span>Start Live Demo</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </button>
        </div>
      ),
    },
  ];

  // Keyboard navigation with direction tracking
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentSlide < slides.length - 1) {
        setSlideDirection('forward');
        setCurrentSlide(currentSlide + 1);
      } else if (e.key === 'ArrowLeft' && currentSlide > 0) {
        setSlideDirection('backward');
        setCurrentSlide(currentSlide - 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentSlide, slides.length, onClose]);

  // Reset slide when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentSlideData = slides[currentSlide];
  const progress = ((currentSlide + 1) / slides.length) * 100;

  return (
    <>
      {/* Custom animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .slide-content {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>

      <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center">
      <div className="relative w-full h-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm z-50 transition-colors border border-gray-200"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-200">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Slide counter */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-gray-700 shadow-sm border border-gray-200">
          {currentSlide + 1} / {slides.length}
        </div>

        {/* Content */}
        <div className="h-full flex flex-col pt-12 pb-20 px-16">
          {/* Slide title */}
          <div className="text-center mb-6 flex-shrink-0">
            <div className="inline-block bg-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-medium mb-2">
              {currentSlideData.subtitle}
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              {currentSlideData.title}
            </h2>
          </div>

          {/* Slide content with animation */}
          <div key={currentSlide} className="max-w-5xl mx-auto w-full flex-1 flex items-center slide-content overflow-hidden">
            <div className="w-full">
              {currentSlideData.content}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200 px-16 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSlideDirection('backward');
                setCurrentSlide(Math.max(0, currentSlide - 1));
              }}
              disabled={currentSlide === 0}
              className="flex items-center space-x-2 px-5 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-900 font-medium rounded-lg transition-colors disabled:cursor-not-allowed text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Previous</span>
            </button>

            {/* Dot indicators */}
            <div className="flex items-center space-x-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSlideDirection(index > currentSlide ? 'forward' : 'backward');
                    setCurrentSlide(index);
                  }}
                  className={`rounded-full transition-all ${
                    index === currentSlide
                      ? 'bg-blue-600 w-6 h-2'
                      : 'bg-gray-300 hover:bg-gray-400 w-2 h-2'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => {
                if (currentSlide < slides.length - 1) {
                  setSlideDirection('forward');
                  setCurrentSlide(currentSlide + 1);
                } else {
                  onStartDemo();
                  onClose();
                }
              }}
              className="flex items-center space-x-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
            >
              <span>{currentSlide === slides.length - 1 ? 'Start Demo' : 'Next'}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
