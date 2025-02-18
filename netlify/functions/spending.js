import express from 'express';
import cors from 'cors';
import { connectToDatabase } from '../utils/db';
import serverless from 'serverless-http';

const app = express();
app.use(cors());

// Spending endpoints
app.post('/api/spending', async (req, res) => {
  // ... spending creation logic
});

app.get('/api/spending/list', async (req, res) => {
  // ... spending list logic
});

app.get('/api/spending/stats', async (req, res) => {
  // ... spending stats logic
});

export const handler = serverless(app); 