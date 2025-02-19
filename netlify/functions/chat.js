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
    const completion = await openai.chat.completions.create({
      messages: [{
          role: "system",
          content: `You are a helpful assistant for Thanh Duong's personal website. 

                   You help visitors learn more about Thanh, who is a Machine Learning Engineer at VNNIC.

                   His expertise includes Computer Vision, Deep Learning, and MLOps.

                   He studied at Hanoi University of Science and Technology.

                   Keep responses concise, friendly, and focused on Thanh's professional background.

                   If you're not sure about specific details, recommend visitors to contact Thanh directly.`
        }, { role: "user", content: message }],
      model: "omni-moderation-latest",
      max_tokens: 150,
      temperature: 0.7,
      response_format: { type: "text" }
    });

    const content = completion.choices[0].message.content;
    
    // Check if content contains image/video markdown
    const hasMedia = content.includes('![') || content.includes('[video]');
    
    return {
      content: content,
      source: 'ChatGPT',
      model: 'GPT-3.5 Turbo',
      provider: 'OpenAI',
      mediaType: hasMedia ? 'media' : 'text'
    };
  } catch (error) {
    console.error('ChatGPT Error:', error);
    if (error.message?.includes('rate_limit') || error.message?.includes('quota')) {
      throw new Error('ChatGPT API quota exceeded. Please try again in a few minutes.');
    }
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
    // Check for quota exceeded error
    if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      throw new Error('Gemini API quota exceeded. Please try again in a few minutes.');
    }
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

    const content = response.content[0].text;
    const hasMedia = content.includes('![') || content.includes('[video]');

    return {
      content: content,
      source: 'Claude',
      model: 'Claude 3 Sonnet',
      provider: 'Anthropic',
      mediaType: hasMedia ? 'media' : 'text'
    };
  } catch (error) {
    console.error('Claude Error:', error);
    if (error.message?.includes('rate_limit') || error.message?.includes('quota')) {
      throw new Error('Claude API quota exceeded. Please try again in a few minutes.');
    }
    throw error;
  }
};


const mockResponses = {
  default: "Hi! I'm here to help you learn more about Thanh Duong. What would you like to know?",
  greetings: ["hi", "hello", "hey"],
  skills: ["skills", "expertise", "tech", "technology", "experience"],
  background: ["background", "education", "study", "university"],
  projects: ["project", "work", "portfolio"],
  contact: ["contact", "email", "reach"]
};

const getMockResponse = (message) => {
  const lowerMessage = message.toLowerCase();
  
  if (mockResponses.greetings.some(word => lowerMessage.includes(word))) {
    return "Hello! How can I assist you today?";
  }
  
  if (mockResponses.skills.some(word => lowerMessage.includes(word))) {
    return "Thanh Duong specializes in Machine Learning Engineering, with expertise in Computer Vision, Deep Learning, and MLOps. He's proficient in PyTorch, Python, and various ML frameworks.";
  }
  
  if (mockResponses.background.some(word => lowerMessage.includes(word))) {
    return "Thanh Duong is a MLE at VNNIC. He studied at Hanoi University of Science and Technology.";
  }
  
  if (mockResponses.projects.some(word => lowerMessage.includes(word))) {
    return "Thanh has worked on various ML projects including computer vision applications and deep learning model optimization. You can check out his projects in the Projects section.";
  }
  
  if (mockResponses.contact.some(word => lowerMessage.includes(word))) {
    return "You can contact Thanh through the Contact form on this website. He'll get back to you as soon as possible!";
  }
  
  return "I understand you're interested in learning more about Thanh. Could you please be more specific about what you'd like to know?";
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
app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    let response;
    let currentModel = 0;
    const models = [
      { fn: getChatGPTResponse, name: 'ChatGPT' },
      { fn: getGeminiResponse, name: 'Gemini' },
      { fn: getClaudeResponse, name: 'Claude' }
    ];

    while (currentModel < models.length) {
      try {
        response = await models[currentModel].fn(message);
        break;
      } catch (error) {
        console.log(`${models[currentModel].name} failed:`, error.message);
        if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
          currentModel++;
          continue;
        }
        throw error;
      }
    }

    if (!response) {
      response = {
        content: "All AI services are currently at capacity. Please try again in a few minutes.",
        source: 'System',
        model: 'Fallback',
        provider: 'Local',
        mediaType: 'text'
      };
    }

    res.json({
      success: true,
      message: response.content,
      source: response.source,
      model: response.model,
      provider: response.provider,
      mediaType: response.mediaType || 'text'
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while processing your request',
      source: 'Error',
      model: 'N/A',
      provider: 'System'
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