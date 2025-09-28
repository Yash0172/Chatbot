import { GoogleGenerativeAI } from '@google/generative-ai';
import { STATES, DISTRICTS, COMPONENTS } from './constants';

// Initialize Gemini
let model = null;
let geminiAvailable = false;

if (process.env.GEMINI_API_KEY) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-pro" });
    geminiAvailable = true;
    console.log('✅ Gemini initialized successfully');
  } catch (error) {
    console.log('❌ Gemini not initialized:', error.message);
    geminiAvailable = false;
  }
} else {
  console.log('❌ GEMINI_API_KEY not found in .env.local');
}

export async function processWithGemini(userMessage, sessionContext = []) {
  console.log('Processing message:', userMessage);
  console.log('Session context length:', sessionContext.length);

  // Try Gemini first if available
  if (geminiAvailable && model) {
    try {
      console.log('Attempting Gemini processing...');
      const result = await processWithGeminiAI(userMessage, sessionContext);
      console.log('Gemini success:', result);
      return result;
    } catch (error) {
      console.log('Gemini failed, using smart fallback:', error.message);
    }
  }

  // Smart fallback system with context awareness
  console.log('Using smart fallback system');
  return smartFallbackProcessor(userMessage, sessionContext);
}

// Gemini AI processing
async function processWithGeminiAI(userMessage, sessionContext = []) {
  const conversationHistory = sessionContext.slice(-10).map(msg => 
    `${msg.type === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
  ).join('\n');

  const systemPrompt = `
You are INGRES Virtual Assistant for India's groundwater data. You must maintain context of the entire conversation and respond naturally.

CONVERSATION HISTORY:
${conversationHistory}

CURRENT MESSAGE: "${userMessage}"

IMPORTANT RULES:
1. Remember the entire conversation context
2. If user asks "why" about your previous action, explain your reasoning
3. If you chose default values (like year 2024-2025), explain why and ask if they want different values
4. Distinguish between new data requests and questions about previous responses
5. Maintain the language the user is using (English/Hinglish/Hindi)
6. If user switches language, switch with them
7. Be conversational and natural

Analyze if this is:
- A question about your previous response (like "why did you...")
- A new data request
- A general conversation

Respond with JSON:
For DATA: {"type": "data_query", "location": "name", "component": "recharge/extraction/stage", "year": "YYYY-YYYY", "period": "annual", "user_language": "hinglish/english", "confidence": 0.8}

For CONVERSATION/EXPLANATION: {"type": "conversation", "response": "natural response explaining your actions or answering their question", "user_language": "hinglish/english", "confidence": 0.9}

For CLARIFICATION: {"type": "clarification", "response": "explain what you didn't understand and ask for clarity", "user_language": "hinglish/english", "confidence": 0.7}`;

  const result = await model.generateContent(systemPrompt);
  const response = await result.response;
  const text = response.text();

  try {
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.log('JSON parse failed');
  }
  
  return {
    type: "conversation",
    response: text.trim(),
    user_language: detectLanguage(userMessage),
    confidence: 0.7
  };
}

// Smart fallback processor with context awareness
function smartFallbackProcessor(userMessage, sessionContext = []) {
  const text = userMessage.toLowerCase().trim();
  const language = detectLanguage(userMessage);
  const lastBotMessage = getLastBotMessage(sessionContext);
  
  console.log('Smart fallback processing:', text, 'Language:', language);
  console.log('Last bot message type:', lastBotMessage?.type);

  // Check if this is a follow-up question about previous response
  if (isFollowUpQuestion(text, lastBotMessage)) {
    return handleFollowUpQuestion(text, language, sessionContext);
  }

  // Check for data queries
  const isDataQuery = checkForDataQuery(text);
  if (isDataQuery && !isQuestionAboutData(text)) {
    return {
      type: "data_query",
      location: extractLocation(text),
      component: extractComponent(text) || 'recharge',
      year: extractYear(text) || '2024-2025',
      period: extractPeriod(text) || 'annual',
      user_language: language,
      confidence: 0.7,
      isDefault: !extractYear(text)
    };
  }

  // Check if user is confused or asking for clarification
  if (isConfusedQuery(text)) {
    return {
      type: "clarification",
      response: generateClarificationResponse(text, language, sessionContext),
      user_language: language,
      confidence: 0.8
    };
  }

  // Handle general conversation
  const response = handleConversationPatterns(text, language, sessionContext);
  
  return {
    type: "conversation",
    response: response,
    user_language: language,
    confidence: 0.8
  };
}

// Check if this is a follow-up question about previous response
function isFollowUpQuestion(text, lastBotMessage) {
  const followUpIndicators = [
    'kyu', 'kyun', 'why', 'kaise', 'how', 'matlab', 'mean',
    'samjha nahi', "didn't understand", 'phir se', 'again',
    'iska matlab', 'what do you mean'
  ];
  
  return followUpIndicators.some(indicator => text.includes(indicator)) && lastBotMessage;
}

// Check if user is asking about data shown
function isQuestionAboutData(text) {
  const questionWords = ['kyu', 'kyun', 'why', 'kaise', 'how', 'kis liye', 'for what'];
  const dataWords = ['data', 'dikhaya', 'showed', 'display', 'bataya'];
  
  const hasQuestion = questionWords.some(word => text.includes(word));
  const hasDataRef = dataWords.some(word => text.includes(word));
  
  return hasQuestion && hasDataRef;
}

// Handle follow-up questions about previous responses
function handleFollowUpQuestion(text, language, sessionContext) {
  const lastBotAction = getLastBotAction(sessionContext);
  
  if (!lastBotAction) {
    return {
      type: "conversation",
      response: language === 'hinglish' 
        ? "Sorry, mujhe samajh nahi aaya ki aap kis baare me puch rahe ho. Kya aap phir se puch sakte ho?"
        : "I'm not sure what you're referring to. Could you please clarify your question?",
      user_language: language,
      confidence: 0.6
    };
  }

  // If asking about location choice
  if ((text.includes('pune') || text.includes('location')) && 
      (text.includes('kyu') || text.includes('why'))) {
    return {
      type: "conversation",
      response: generateLocationExplanation(language, sessionContext),
      user_language: language,
      confidence: 0.9
    };
  }

  // If asking about year choice
  if ((text.includes('2024') || text.includes('year') || text.includes('saal')) && 
      (text.includes('kyu') || text.includes('why'))) {
    return {
      type: "conversation",
      response: generateYearExplanation(language, lastBotAction),
      user_language: language,
      confidence: 0.9
    };
  }

  // Generic follow-up
  return {
    type: "conversation",
    response: generateGenericExplanation(language, lastBotAction),
    user_language: language,
    confidence: 0.8
  };
}

// Generate location explanation
function generateLocationExplanation(language, sessionContext) {
  const userRequests = sessionContext.filter(msg => msg.type === 'user');
  const locationRequest = userRequests.reverse().find(msg => 
    msg.content.toLowerCase().includes('pune') || 
    msg.content.toLowerCase().includes('data')
  );

  if (language === 'hinglish') {
    if (locationRequest) {
      return `Maine Pune ka data isliye dikhaya kyunki aapne "${locationRequest.content}" me Pune ka data manga tha. Agar aapko kisi aur location ka data chahiye, toh batayiye - main uska data bhi de sakta hu! 😊`;
    }
    return "Maine jo location ka data dikhaya, wo aapke request ke according tha. Agar aapko kisi aur jagah ka data chahiye, bas naam batao!";
  }
  
  if (locationRequest) {
    return `I showed Pune's data because you requested it when you said "${locationRequest.content}". If you'd like data for a different location, just let me know! 😊`;
  }
  return "I showed the data based on your request. If you'd like data for a different location, please specify!";
}

// Generate year explanation
function generateYearExplanation(language, lastBotAction) {
  if (language === 'hinglish') {
    return `Maine 2024-2025 ka data isliye dikhaya kyunki:\n\n` +
           `1. Ye current financial year hai (April 2024 - March 2025)\n` +
           `2. Aapne koi specific year nahi bataya tha\n` +
           `3. Latest data usually sabse relevant hota hai\n\n` +
           `Agar aapko kisi aur year ka data chahiye (jaise 2023-2024, 2022-2023), toh bas batao! Main wo bhi de sakta hu. 📅`;
  }
  
  return `I showed 2024-2025 data because:\n\n` +
         `1. It's the current financial year (April 2024 - March 2025)\n` +
         `2. You didn't specify a particular year\n` +
         `3. Latest data is usually most relevant\n\n` +
         `If you'd like data for a different year (like 2023-2024, 2022-2023), just let me know! 📅`;
}

// Generate generic explanation
function generateGenericExplanation(language, lastBotAction) {
  if (language === 'hinglish') {
    return "Main aapke previous message ke response me ye action liya tha. Agar kuch clear nahi hai ya aapko kuch aur chahiye, please batayiye!";
  }
  return "I took that action based on your previous message. If something isn't clear or you need something different, please let me know!";
}

// Check if user is confused
function isConfusedQuery(text) {
  const confusionIndicators = [
    'samajh nahi', 'samjha nahi', 'confused', 'clear nahi',
    "don't understand", 'kya matlab', 'what mean', 'galat'
  ];
  
  return confusionIndicators.some(indicator => text.includes(indicator));
}

// Generate clarification response
function generateClarificationResponse(text, language, sessionContext) {
  if (language === 'hinglish') {
    return "Mujhe samajh nahi aaya ki aap kya puch rahe hain. 🤔\n\n" +
           "Kya aap ye puchna chahte hain:\n" +
           "• Kisi state/district ka groundwater data?\n" +
           "• Mere previous response ke baare me koi question?\n" +
           "• Kuch aur information?\n\n" +
           "Please thoda detail me batayiye!";
  }
  
  return "I didn't quite understand what you're asking. 🤔\n\n" +
         "Are you trying to:\n" +
         "• Get groundwater data for a state/district?\n" +
         "• Ask about my previous response?\n" +
         "• Get some other information?\n\n" +
         "Please provide more details!";
}

// Get last bot message from context
function getLastBotMessage(sessionContext) {
  const botMessages = sessionContext.filter(msg => msg.type === 'bot');
  return botMessages[botMessages.length - 1];
}

// Get last bot action details
function getLastBotAction(sessionContext) {
  const lastBot = getLastBotMessage(sessionContext);
  if (!lastBot) return null;
  
  // Try to parse action from bot message
  if (lastBot.metadata) {
    return lastBot.metadata;
  }
  
  return {
    type: 'unknown',
    content: lastBot.content
  };
}

// Check for data queries (improved)
function checkForDataQuery(text) {
  const dataIndicators = [
    'data', 'show', 'get', 'find', 'chahiye', 'batao', 'dikhao', 
    'levels', 'recharge', 'extraction', 'de do', 'bata do'
  ];
  
  const hasDataWords = dataIndicators.some(word => text.includes(word));
  const hasLocation = STATES.some(state => text.includes(state.toLowerCase())) ||
                     DISTRICTS.some(district => text.includes(district.toLowerCase()));
  
  // Don't treat as data query if it's a question about data
  const isQuestion = ['kyu', 'kyun', 'why', 'kaise', 'how'].some(word => text.includes(word));
  
  return (hasDataWords || hasLocation) && !isQuestion;
}

// Enhanced conversation patterns
function handleConversationPatterns(text, language, sessionContext) {
  console.log('Handling conversation pattern for:', text);

  // Get conversation language preference
  const convLang = language || getConversationLanguage(sessionContext);

  // Hinglish/Hindi responses
  if (convLang === 'hinglish') {
    // Greetings
    if (text.match(/^(hi|hello|hey|hii|namaste|namaskar)$/i)) {
      const greetings = [
        "Namaste! Main INGRES Virtual Assistant hu! 😊 India ke groundwater data me madad kar sakta hu.",
        "Hello ji! Kaisa hai aap? Main yaha hu groundwater data ke liye help karne!",
        "Namaste! Batayiye kaunsa state ya district ka paani ka data chahiye?"
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    // Identity questions
    if (text.match(/(kon ho|kaun ho|tum kon|aap kaun|kya ho)/i)) {
      return "Main INGRES Virtual Assistant hu! 🌊 India ke sabhi states aur districts ka groundwater data provide karta hu. " +
             "Main aapko water recharge, extraction levels, aur seasonal variations ke baare me bata sakta hu. " +
             "Kisi bhi location ka naam batao aur main uska complete water data de dunga!";
    }
    
    // Capabilities
    if (text.match(/(kya kar|help kar|kaam kya|kya de sakte|capabilities)/i)) {
      return "Main ye sab kar sakta hu! 💧\n\n" +
             "• Kisi bhi state/district ka water recharge data\n" +
             "• Groundwater extraction levels\n" +
             "• Monsoon vs Non-monsoon comparison\n" +
             "• Different years ka historical data\n" +
             "• Water stage aur availability info\n\n" +
             "Bas location aur year batao, baki main sambhal lunga!";
    }
    
    // Thanks
    if (text.match(/(thanks|dhanyawad|shukriya|thank)/i)) {
      const thanks = [
        "Aapka swagat hai! 😊 Kabhi bhi help chahiye toh yaad karna!",
        "Koi baat nahi ji! Groundwater data ke liye hamesha ready! 💧",
        "Welcome! Aur kuch puchna ho toh bejhijhak pucho!"
      ];
      return thanks[Math.floor(Math.random() * thanks.length)];
    }
    
    // Default Hinglish
    return "Main INGRES Assistant hu, India ke groundwater expert! 💧\n\n" +
           "Mujhse pucho:\n" +
           "• 'Maharashtra ka water data dikhao'\n" +
           "• 'Punjab 2023 ka recharge batao'\n" +
           "• 'Mumbai ka extraction level kya hai'\n\n" +
           "Koi bhi state ya district ka naam batao!";
  }

  // English responses
  if (convLang === 'english') {
    // Greetings
    if (text.match(/^(hi|hello|hey|greetings|good morning|good evening)$/i)) {
      const greetings = [
        "Hello! I'm INGRES Virtual Assistant, your guide to India's groundwater data! 😊",
        "Greetings! How can I help you with groundwater information today?",
        "Hello there! Ready to explore India's water resources data?"
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    // Identity
    if (text.match(/(who are you|what are you|introduce yourself)/i)) {
      return "I'm INGRES Virtual Assistant! 🌊 I specialize in providing comprehensive groundwater data " +
             "for all Indian states and districts. I can help you with water recharge rates, extraction levels, " +
             "seasonal variations, and historical trends. Just name any location in India!";
    }
    
    // Capabilities
    if (text.match(/(what can you do|capabilities|help me|features)/i)) {
      return "I can help you with! 📊\n\n" +
             "• Groundwater recharge data for any location\n" +
             "• Water extraction and usage statistics\n" +
             "• Monsoon vs Non-monsoon comparisons\n" +
             "• Historical data trends (multiple years)\n" +
             "• Water availability stages\n\n" +
             "Just specify a location and I'll provide comprehensive data!";
    }
    
    // Thanks
    if (text.match(/(thank|appreciate|grateful)/i)) {
      const thanks = [
        "You're welcome! Feel free to ask about any location's water data! 😊",
        "My pleasure! Always here to help with groundwater information! 💧",
        "Glad to help! Need data for any other location?"
      ];
      return thanks[Math.floor(Math.random() * thanks.length)];
    }
    
    // Default English
    return "I'm INGRES Assistant, your groundwater data expert! 💧\n\n" +
           "Try asking:\n" +
           "• 'Show Maharashtra water data'\n" +
           "• 'Punjab recharge levels for 2023'\n" +
           "• 'What's Mumbai's extraction rate'\n\n" +
           "Just name any Indian state or district!";
  }

  // Generic fallback
  return "Hello! I'm INGRES Virtual Assistant. I can provide groundwater data for any Indian state or district. " +
         "Just tell me which location you're interested in! 🌊";
}

// Get conversation language from context
function getConversationLanguage(sessionContext) {
  if (!sessionContext || sessionContext.length === 0) return 'english';
  
  // Check last few messages for language pattern
  const recentMessages = sessionContext.slice(-3);
  let hinglishCount = 0;
  let englishCount = 0;
  
  recentMessages.forEach(msg => {
    if (msg.type === 'user') {
      const lang = detectLanguage(msg.content);
      if (lang === 'hinglish') hinglishCount++;
      else englishCount++;
    }
  });
  
  return hinglishCount > englishCount ? 'hinglish' : 'english';
}

// Enhanced language detection
function detectLanguage(text) {
  const hinglishWords = [
    'tum', 'main', 'mein', 'kar', 'hai', 'ho', 'ka', 'ki', 'ke', 
    'aap', 'kya', 'kon', 'kaun', 'chahiye', 'batao', 'kaise', 
    'kyu', 'kyun', 'namaste', 'shukriya', 'dhanyawad', 'haan', 
    'nahi', 'theek', 'accha', 'bolo', 'puch', 'dikha', 'bata',
    'mujhe', 'mujh', 'tumhe', 'aapko', 'iska', 'uska', 'ye', 'wo'
  ];
  
  const textLower = text.toLowerCase();
  const words = textLower.split(/\s+/);
  const hinglishMatches = words.filter(word => 
    hinglishWords.some(hw => word.includes(hw))
  ).length;
  
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  
  // If more than 20% words are hinglish or has devanagari
  if (hasDevanagari || (hinglishMatches / words.length) > 0.2) {
    return 'hinglish';
  }
  
  return 'english';
}

// Helper functions remain the same
function extractLocation(text) {
  const textLower = text.toLowerCase();
  
  for (const state of STATES) {
    if (textLower.includes(state.toLowerCase())) return state;
  }
  for (const district of DISTRICTS) {
    if (textLower.includes(district.toLowerCase())) return district;
  }
  return null;
}

function extractComponent(text) {
  const textLower = text.toLowerCase();
  
  if (textLower.includes('recharge') || textLower.includes('rainfall')) return 'recharge';
  if (textLower.includes('extraction') || textLower.includes('pumping') || textLower.includes('usage')) return 'extraction';
  if (textLower.includes('level') || textLower.includes('stage') || textLower.includes('depth')) return 'stage';
  
  return null;
}

function extractYear(text) {
  // Look for year patterns
  const yearMatch = text.match(/20[1-2][0-9]/);
  if (yearMatch) {
    const year = parseInt(yearMatch[0]);
    return `${year}-${year + 1}`;
  }
  
  // Look for financial year pattern
  const fyMatch = text.match(/(\d{4})-(\d{2,4})/);
  if (fyMatch) {
    return fyMatch[0];
  }
  
  return null;
}

function extractPeriod(text) {
  const textLower = text.toLowerCase();
  
  if (textLower.includes('non-monsoon') || textLower.includes('non monsoon') || textLower.includes('rabi')) {
    return 'non-monsoon';
  }
  if (textLower.includes('monsoon') || textLower.includes('kharif') || textLower.includes('barish')) {
    return 'monsoon';
  }
  
  return 'annual';
}

export { detectLanguage };