import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import serverless from 'serverless-http';

const app = express();

// Add proper CORS and body parsing middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request logging for debugging
app.use((req, res, next) => {
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  next();
});

// Initialize AI models
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-pro" });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});



// Add the missing response functions
const getChatGPTResponse = async (message) => {
  try {
    console.log(message);
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: message }],
      model: "gpt-3.5-turbo",
      max_tokens: 150,
      temperature: 0.7
    });

    return {
      content: completion.choices[0].message.content,
      source: 'ChatGPT',
      model: 'GPT-3.5 Turbo',
      provider: 'OpenAI'
    };
  } catch (error) {
    console.error('ChatGPT Error:', error);
    throw error;
  }
};

const getGeminiResponse = async (message) => {
  try {
    const result = await geminiModel.generateContent(message);
    const response = await result.response;
    return {
      content: response.text(),
      source: 'Gemini',
      model: 'Gemini Pro',
      provider: 'Google'
    };
  } catch (error) {
    console.error('Gemini Error:', error);
    throw error;
  }
};

const getClaudeResponse = async (message) => {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 150,
      messages: [{ role: "user", content: message }]
    });

    return {
      content: response.content[0].text,
      source: 'Claude',
      model: 'Claude 3 Sonnet',
      provider: 'Anthropic'
    };
  } catch (error) {
    console.error('Claude Error:', error);
    throw error;
  }
};

const getMockResponse = (message) => {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('hi') || lowerMessage.includes('hello')) {
    return {
      content: "Hello! How can I assist you today?",
      source: 'Mock',
      model: 'Rule-based',
      provider: 'System'
    };
  }
  
  return {
    content: "I understand you're interested in learning more. Could you please be more specific?",
    source: 'Mock',
    model: 'Rule-based',
    provider: 'System'
  };
};

const getAIResponse = async (message) => {
  const models = [
    { fn: getChatGPTResponse, name: 'ChatGPT' },
    { fn: getGeminiResponse, name: 'Gemini' },
    { fn: getClaudeResponse, name: 'Claude' }
  ];

  for (const model of models) {
    try {
      const response = await model.fn(message);
      console.log(`Successfully got response from ${model.name}`);
      return response;
    } catch (error) {
      console.log(`${model.name} failed, trying next model...`);
      continue;
    }
  }

  // If all AI models fail, return mock response
  return getMockResponse(message);
};

// Chat endpoints with better error handling
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      console.error('No message provided in request body');
      return res.status(400).json({ 
        success: false, 
        message: 'Message is required'
      });
    }

    console.log('Processing message:', message);
    const response = await getAIResponse(message);
    
    console.log('AI Response:', response);
    res.json({ 
      success: true, 
      message: response.content,
      source: response.source,
      model: response.model,
      provider: response.provider
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process chat message',
      error: error.message
    });
  }
});

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

// Export the serverless handler
export const handler = serverless(app); 