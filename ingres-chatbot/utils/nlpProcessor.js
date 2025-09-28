import { GoogleGenerativeAI } from '@google/generative-ai';
import { STATES, DISTRICTS, COMPONENTS } from './constants';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export async function processWithGemini(userMessage, sessionContext = []) {
  try {
    // Create a comprehensive prompt for Gemini
    const systemPrompt = `
You are INGRES Virtual Assistant, an expert AI chatbot for India's groundwater data system.

ROLE: Help users access groundwater data and have natural conversations about water resources.

CAPABILITIES:
1. Extract groundwater data queries from natural language
2. Provide conversational responses
3. Educate about water conservation

AVAILABLE DATA:
- States: ${STATES.join(', ')}
- Districts: ${DISTRICTS.join(', ')}
- Components: recharge, extraction, stage (water level)
- Years: 2020-2025
- Periods: monsoon, non-monsoon, annual

RESPONSE FORMAT:
For data queries, respond with JSON:
{
  "type": "data_query",
  "location": "state/district name",
  "component": "recharge/extraction/stage", 
  "year": "YYYY-YYYY format",
  "period": "monsoon/non-monsoon/annual",
  "confidence": 0.8
}

For conversation, respond with JSON:
{
  "type": "conversation",
  "response": "your conversational response",
  "confidence": 0.9
}

USER MESSAGE: "${userMessage}"

Analyze the message and respond appropriately. Be friendly, knowledgeable, and helpful!`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON response
    try {
      const parsed = JSON.parse(text);
      return parsed;
    } catch (parseError) {
      // If JSON parsing fails, treat as conversation
      return {
        type: "conversation",
        response: text,
        confidence: 0.7
      };
    }

  } catch (error) {
    console.error('Gemini API Error:', error);
    // Fallback to simple NLP
    return fallbackNLP(userMessage);
  }
}

// Fallback NLP when Gemini fails
function fallbackNLP(message) {
  const text = message.toLowerCase().trim();
  
  // Check if it's a greeting
  if (/^(hi|hello|hey|namaste)$/i.test(text)) {
    return {
      type: "conversation",
      response: "Hello! 👋 I'm your INGRES Virtual Assistant. Ask me about India's groundwater data!",
      confidence: 0.9
    };
  }
  
  // Check for data query patterns
  const hasLocation = STATES.some(state => text.includes(state.toLowerCase())) ||
                     DISTRICTS.some(district => text.includes(district.toLowerCase()));
  
  if (hasLocation) {
    return {
      type: "data_query",
      location: extractLocation(text),
      component: extractComponent(text) || 'recharge',
      year: extractYear(text) || '2024-2025',
      period: extractPeriod(text) || 'annual',
      confidence: 0.6
    };
  }
  
  return {
    type: "conversation", 
    response: "I'm here to help with groundwater data! Try asking about a specific state or district.",
    confidence: 0.5
  };
}

// Helper functions (same as before but simpler)
function extractLocation(text) {
  for (const state of STATES) {
    if (text.includes(state.toLowerCase())) return state;
  }
  for (const district of DISTRICTS) {
    if (text.includes(district.toLowerCase())) return district;
  }
  return null;
}

function extractComponent(text) {
  if (text.includes('recharge') || text.includes('rainfall')) return 'recharge';
  if (text.includes('extraction') || text.includes('pumping')) return 'extraction';
  if (text.includes('level') || text.includes('stage') || text.includes('depth')) return 'stage';
  return 'recharge';
}

function extractYear(text) {
  const yearMatch = text.match(/20[2-3]\d/);
  return yearMatch ? `${yearMatch[0]}-${parseInt(yearMatch[0]) + 1}` : null;
}

function extractPeriod(text) {
  if (text.includes('non-monsoon') || text.includes('rabi')) return 'non-monsoon';
  if (text.includes('monsoon') || text.includes('kharif')) return 'monsoon';
  return 'annual';
}