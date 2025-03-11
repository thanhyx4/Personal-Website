import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import { promises as fs } from 'fs';
import { join } from 'path';
import { parse as parseDate } from 'date-fns';
import { MongoClient } from 'mongodb';

const app = express();
app.use(cors({
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
}));

// Add preflight handling
app.options('*', cors());

app.use(express.json());

// Complete SPENDING_CATEGORIES with Vietnamese support
const SPENDING_CATEGORIES = {
  food: ['food', 'meal', 'restaurant', 'grocery', 'lunch', 'dinner', 'breakfast', 'eat', 'snack', 'cafe',
         'ăn', 'cơm', 'bữa', 'nhà hàng', 'quán', 'ăn sáng', 'ăn trưa', 'ăn tối', 'đồ ăn', 'thức ăn', 'cafe'],
  transport: ['transport', 'bus', 'taxi', 'grab', 'fuel', 'gas', 'parking', 'car', 'bike', 'train', 'fare',
              'xe', 'đi lại', 'xăng', 'đổ xăng', 'gửi xe', 'đỗ xe', 'taxi', 'grab', 'xe bus', 'xe buýt'],
  shopping: ['shopping', 'clothes', 'shoes', 'accessories', 'electronics', 'buy', 'purchase', 'mart', 'market',
             'mua', 'sắm', 'quần áo', 'giày dép', 'phụ kiện', 'điện tử', 'siêu thị', 'chợ'],
  utilities: ['utilities', 'electricity', 'water', 'internet', 'phone', 'bill', 'wifi', 'gas', 'power',
              'điện', 'nước', 'internet', 'điện thoại', 'hóa đơn', 'wifi', 'gas', 'tiền điện', 'tiền nước'],
  entertainment: ['entertainment', 'movie', 'game', 'book', 'music', 'concert', 'show', 'ticket', 'fun',
                 'giải trí', 'phim', 'game', 'sách', 'nhạc', 'concert', 'show', 'vé', 'vui chơi'],
  health: ['health', 'medicine', 'doctor', 'hospital', 'pharmacy', 'medical', 'clinic', 'dental', 'healthcare',
           'sức khỏe', 'thuốc', 'bác sĩ', 'bệnh viện', 'nhà thuốc', 'khám', 'nha sĩ', 'y tế'],
  education: ['education', 'course', 'book', 'tuition', 'training', 'class', 'school', 'study', 'learn',
              'học', 'khóa học', 'sách', 'học phí', 'đào tạo', 'lớp', 'trường', 'học tập'],
  other: ['other', 'khác']
};

// Complete date patterns with Vietnamese support
const datePatterns = [
  // Today, yesterday (English & Vietnamese)
  { regex: /(?:today|hôm nay)/i, handler: () => new Date() },
  { regex: /(?:yesterday|hôm qua)/i, handler: () => { const d = new Date(); d.setDate(d.getDate() - 1); return d; }},
  // DD/MM/YYYY or DD-MM-YYYY
  { regex: /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/, handler: (match) => parseDate(`${match[1]}/${match[2]}/${match[3]}`, 'dd/MM/yyyy', new Date()) },
  // Natural language dates (English & Vietnamese)
  { regex: /(?:last|qua) (monday|tuesday|wednesday|thursday|friday|saturday|sunday|thứ hai|thứ ba|thứ tư|thứ năm|thứ sáu|thứ bảy|chủ nhật)/i, 
    handler: (match) => {
      const days = {
        'sunday': 0, 'chủ nhật': 0,
        'monday': 1, 'thứ hai': 1,
        'tuesday': 2, 'thứ ba': 2,
        'wednesday': 3, 'thứ tư': 3,
        'thursday': 4, 'thứ năm': 4,
        'friday': 5, 'thứ sáu': 5,
        'saturday': 6, 'thứ bảy': 6
      };
      const targetDay = days[match[1].toLowerCase()];
      const today = new Date();
      const currentDay = today.getDay();
      let diff = targetDay - currentDay;
      if (diff >= 0) diff -= 7;
      today.setDate(today.getDate() + diff);
      return today;
    }
  }
];

// Complete parsing functions
const parseSpendingInput = (text) => {
  try {
    // Convert to lowercase for easier matching
    text = text.toLowerCase();
    
    // Try to find date in the text
    let date = new Date();
    for (const pattern of datePatterns) {
      const match = text.match(pattern.regex);
      if (match) {
        date = pattern.handler(match);
        break;
      }
    }

    // Find amount (support both formats: 50k, 50.000, 50,000)
    const amountMatch = text.match(/(\d+(?:[.,]\d+)*k?)/);
    let amount = 0;
    if (amountMatch) {
      let amountStr = amountMatch[1].replace(/[.,]/g, '');
      if (amountStr.endsWith('k')) {
        amountStr = amountStr.slice(0, -1) + '000';
      }
      amount = parseInt(amountStr);
    }

    // Determine category based on keywords
    let category = 'other';
    for (const [cat, keywords] of Object.entries(SPENDING_CATEGORIES)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        category = cat;
        break;
      }
    }

    // Extract description (everything that's not date or amount)
    let description = text
      .replace(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/, '') // Remove date
      .replace(/(\d+(?:[.,]\d+)*k?)/, '')              // Remove amount
      .replace(/\s+/g, ' ')                            // Normalize spaces
      .trim();

    return {
      date: date.toISOString(),
      amount,
      category,
      description,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error parsing spending input:', error);
    throw new Error('Failed to parse spending input. Please check the format.');
  }
};

const parseComplexSpendingInput = (text) => {
  try {
    // Split input by "and" or semicolon or comma
    const entries = text.split(/(?:,\s*|\s+and\s+|;\s*)/);
    const results = [];

    for (const entry of entries) {
      if (!entry.trim()) continue;
      
      // Parse each entry
      const spendingData = parseSpendingInput(entry.trim());
      if (spendingData.amount > 0) { // Only add valid entries
        results.push(spendingData);
      }
    }

    return results;
  } catch (error) {
    console.error('Error parsing complex spending input:', error);
    throw new Error('Failed to parse complex spending input. Please check the format.');
  }
};

// Update the file paths to use /tmp for serverless environment
const getTempFilePath = () => join('/tmp', 'spending.json');

// MongoDB connection
const uri = process.env.MONGODB_URI;
let cachedDb = null;

async function connectToDatabase() {
  try {
    if (cachedDb) return cachedDb;

    const client = await MongoClient.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // 5 second timeout
    });
    
    const db = client.db('spending-tracker');
    cachedDb = db;
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw new Error('Failed to connect to database');
  }
}

// Update endpoints to use MongoDB
app.post('/api/spending', async (req, res) => {
  try {
    const { text } = req.body;
    const spendingDataList = parseComplexSpendingInput(text);

    if (spendingDataList.length === 0) {
      throw new Error('No valid spending entries found in input');
    }

    // Convert date strings to Date objects
    const processedSpendingData = spendingDataList.map(spending => ({
      ...spending,
      date: new Date(spending.date)
    }));

    const db = await connectToDatabase();
    const collection = db.collection('spendings');
    await collection.insertMany(processedSpendingData);

    res.json({ 
      success: true, 
      message: `Successfully recorded ${spendingDataList.length} spending entries!`,
      data: processedSpendingData
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + (error.message || 'Unknown error')
    });
  }
});

app.get('/api/spending/list', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('spendings');
    
    const spendings = await collection
      .find({})
      .sort({ date: -1 })
      .toArray();

    res.json({ 
      success: true, 
      spendings
    });
  } catch (error) {
    console.error('Error fetching spendings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch spending information.'
    });
  }
});

app.get('/api/spending/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const db = await connectToDatabase();
    const collection = db.collection('spendings');
    
    // Create date filter with proper date objects
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate + 'T00:00:00.000Z');
    if (endDate) dateFilter.$lte = new Date(endDate + 'T23:59:59.999Z');

    const query = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};

    // Get all relevant spendings
    const spendings = await collection
      .find(query)
      .sort({ date: -1 })
      .toArray();

    // Calculate statistics
    const stats = {
      total: 0,
      byCategory: {},
      byDate: {},
      recentTransactions: []
    };

    // Process spendings
    for (const spending of spendings) {
      // Add to total
      stats.total += spending.amount;

      // Group by category
      if (!stats.byCategory[spending.category]) {
        stats.byCategory[spending.category] = 0;
      }
      stats.byCategory[spending.category] += spending.amount;

      // Group by date
      const dateStr = spending.date.toISOString().split('T')[0];
      if (!stats.byDate[dateStr]) {
        stats.byDate[dateStr] = 0;
      }
      stats.byDate[dateStr] += spending.amount;
    }

    // Get recent transactions
    stats.recentTransactions = spendings.slice(0, 5).map(s => ({
      ...s,
      date: s.date.toISOString() // Convert date to ISO string for consistent format
    }));

    res.json({ 
      success: true, 
      stats
    });
  } catch (error) {
    console.error('Error getting spending stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get spending statistics.'
    });
  }
});


// Function to handle storing contact information in MongoDB
const storeContactInfo = async (contactData) => {
  const uri = process.env.MONGODB_URI; // MongoDB connection string from environment variables
  const client = new MongoClient(uri);

  try {
    // Connect to the MongoDB client
    await client.connect();
    const database = client.db("contact-db"); // Replace with your database name
    const contactsCollection = database.collection("contacts"); // Collection to store contacts

    // Insert the contact data into the collection
    const result = await contactsCollection.insertOne(contactData);
    console.log(`New contact created with the following id: ${result.insertedId}`);
  } catch (error) {
    console.error("Error storing contact information:", error);
    throw new Error("Failed to store contact information.");
  } finally {
    // Ensure the client is closed after the operation
    await client.close();
  }
};

// Example usage of the storeContactInfo function
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;
    const timestamp = new Date().toISOString();
    const contactData = {
      timestamp,
      name,
      email,
      message,
    };

    // Call the function to store contact information in MongoDB
    await storeContactInfo(contactData);

    res.json({ success: true, message: "Contact information saved successfully!" });
  } catch (error) {
    console.error("Error saving contact:", error);
    res.status(500).json({ success: false, message: "Failed to save contact information." });
  }
});


// Update CORS configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or your specific domain in production
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

// Export the serverless handler
export const handler = serverless(app); 