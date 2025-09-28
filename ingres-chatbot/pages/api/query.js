import { processWithGemini, detectLanguage } from '../../utils/geminiProcessor';

let sessionHistory = {};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, sessionId } = req.body;
    
    console.log('=== API Query Debug ===');
    console.log('User message:', message);
    console.log('Session ID:', sessionId);
    
    // Initialize session
    if (!sessionHistory[sessionId]) {
      sessionHistory[sessionId] = {
        messages: [],
        language: 'english',
        lastDataQuery: null
      };
    }
    
    // Detect and update language preference
    const currentLanguage = detectLanguage(message);
    sessionHistory[sessionId].language = currentLanguage;
    
    // Add user message to context
    sessionHistory[sessionId].messages.push({
      type: 'user',
      content: message,
      timestamp: new Date()
    });
    
    // Keep last 12 messages for better context
    if (sessionHistory[sessionId].messages.length > 12) {
      sessionHistory[sessionId].messages = sessionHistory[sessionId].messages.slice(-12);
    }
    
    console.log('Processing with context length:', sessionHistory[sessionId].messages.length);
    console.log('User language:', currentLanguage);
    
    // Process with AI
    const aiResult = await processWithGemini(message, sessionHistory[sessionId].messages);
    console.log('AI Result:', aiResult);
    
    let finalResponse;
    
    if (aiResult.type === 'conversation') {
      finalResponse = {
        reply: aiResult.response,
        type: 'conversation',
        language: aiResult.user_language,
        confidence: aiResult.confidence
      };
    }
    else if (aiResult.type === 'clarification') {
      finalResponse = {
        reply: aiResult.response,
        type: 'clarification',
        language: aiResult.user_language,
        confidence: aiResult.confidence
      };
    }
    else if (aiResult.type === 'data_query') {
      if (!aiResult.location) {
        finalResponse = {
          reply: generateLocationRequest(aiResult.user_language),
          type: 'location_request',
          language: aiResult.user_language
        };
      } else {
        // Store data query details
        sessionHistory[sessionId].lastDataQuery = aiResult;
        
        const mockData = generateConsistentMockData(aiResult);
        const reply = formatDataResponse(mockData, aiResult);
        
        finalResponse = {
          reply,
          type: 'data',
          rawData: mockData,
          queryParams: aiResult,
          language: aiResult.user_language,
          confidence: aiResult.confidence
        };
        
        // Add metadata to session for context
        sessionHistory[sessionId].messages[sessionHistory[sessionId].messages.length - 1].metadata = {
          action: 'showed_data',
          location: aiResult.location,
          year: aiResult.year,
          component: aiResult.component,
          wasDefault: aiResult.isDefault
        };
      }
    }
    else {
      finalResponse = {
        reply: generateFallbackResponse(currentLanguage),
        type: 'text'
      };
    }
    
    // Add bot response to context with metadata
    sessionHistory[sessionId].messages.push({
      type: 'bot',
      content: finalResponse.reply,
      timestamp: new Date(),
      metadata: finalResponse.queryParams || { type: finalResponse.type }
    });
    
    console.log('Final response type:', finalResponse.type);
    console.log('=== End Debug ===');
    
    return res.json(finalResponse);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      reply: "Sorry, I'm having some technical difficulties. Could you please try again?",
      type: 'error'
    });
  }
}

function generateLocationRequest(language) {
  const requests = {
    hinglish: [
      "Location batao please! Jaise Maharashtra, Punjab, Delhi ya koi district. 🗺️",
      "Kaunse state ya district ka data chahiye? Naam batao toh main data de sakta hu! 📍",
      "Pehle location toh batao! State ya district ka naam - jaise Mumbai, Pune, Chennai... 🌍"
    ],
    english: [
      "Please specify a location! Like Maharashtra, Punjab, Delhi or any district. 🗺️",
      "Which state or district's data would you like? Name the location and I'll get the data! 📍",
      "I need a location first! State or district name - like Mumbai, Pune, Chennai... 🌍"
    ]
  };
  
  const options = requests[language] || requests.english;
  return options[Math.floor(Math.random() * options.length)];
}

function generateFallbackResponse(language) {
  const responses = {
    hinglish: "Main INGRES Assistant hu! India ke groundwater data ke liye puch sakte ho. Location batao aur main data de dunga! 💧",
    english: "I'm INGRES Assistant! Ask me about India's groundwater data. Specify a location and I'll provide the information! 💧"
  };
  
  return responses[language] || responses.english;
}

function formatDataResponse(data, params) {
  if (!data || data.length === 0) {
    const noDataMsg = {
      hinglish: `${params.location} ke liye ${params.year} ka data nahi mila. Kisi aur year ya location ke liye try karo?`,
      english: `No data found for ${params.location} in ${params.year}. Try another year or location?`
    };
    return noDataMsg[params.user_language] || noDataMsg.english;
  }

  const summary = data.reduce((acc, item) => {
    acc.total += parseFloat(item.value || 0);
    acc.count += 1;
    return acc;
  }, { total: 0, count: 0 });

  const dataPoints = data.map(item => `• ${item.name}: ${item.value} ${item.unit}`).join('\n');
  
  // Build response based on language
  if (params.user_language === 'hinglish') {
    let response = `📊 **${params.location} ka ${params.component.toUpperCase()} Data** (${params.year})\n\n`;
    response += `🔹 **Total**: ${summary.total.toFixed(2)} MCM\n`;
    response += `🔹 **Records**: ${summary.count}\n\n`;
    response += `${dataPoints}\n\n`;
    response += `📍 ${params.location} | 📅 ${params.year} | 🔄 ${params.component}\n\n`;
    
    // Add explanation if default year was used
    if (params.isDefault) {
      response += `ℹ️ *Note: Maine current year (2024-2025) ka data dikhaya hai kyunki aapne year specify nahi kiya tha. ";
      response += "Agar koi aur year chahiye toh batao!*\n\n`;
    }
    
    response += `Aur kuch chahiye? Different year, location ya component ka data manga sakte ho! 😊`;
    
    return response;
  }

  // English response
  let response = `📊 **${params.component.toUpperCase()} Data for ${params.location}** (${params.year})\n\n`;
  response += `🔹 **Total Value**: ${summary.total.toFixed(2)} MCM\n`;
  response += `🔹 **Records Found**: ${summary.count}\n\n`;
  response += `${dataPoints}\n\n`;
  response += `📍 Location: ${params.location}\n`;
  response += `📅 Year: ${params.year}\n`;
  response += `🔄 Component: ${params.component}\n\n`;
  
  // Add explanation if default year was used
  if (params.isDefault) {
    response += `ℹ️ *Note: I've shown current year (2024-2025) data as you didn't specify a year. `;
    response += `Let me know if you need data for a different year!*\n\n`;
  }
  
  response += `Need more? You can ask for different years, locations, or components! 😊`;
  
  return response;
}

function generateConsistentMockData(params) {
  const queryString = `${params.location}_${params.component}_${params.year}_${params.period}`.toLowerCase();
  const hash = simpleHash(queryString);
  const baseValue = (hash % 1000) + 200;
  
  const data = [];
  
  if (params.period === 'annual' || params.period === 'monsoon') {
    data.push({
      name: `${params.location} ${params.component} (Monsoon)`,
      value: baseValue.toFixed(2),
      unit: 'MCM',
      year: params.year,
      period: 'monsoon'
    });
  }
  
  if (params.period === 'annual' || params.period === 'non-monsoon') {
    data.push({
      name: `${params.location} ${params.component} (Non-Monsoon)`,
      value: (baseValue * 0.6).toFixed(2),
      unit: 'MCM',
      year: params.year,
      period: 'non-monsoon'
    });
  }
  
  if (params.period === 'annual') {
    data.push({
      name: `${params.location} ${params.component} (Annual Total)`,
      value: (baseValue * 1.6).toFixed(2),
      unit: 'MCM',
      year: params.year,
      period: 'annual'
    });
  }
  
  return data;
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}