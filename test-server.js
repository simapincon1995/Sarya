const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Simple test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!', timestamp: new Date() });
});

// Test the attendance check-in route (without auth for debugging)
app.post('/api/test-checkin', (req, res) => {
  console.log('Test check-in received:', req.body);
  res.json({ 
    message: 'Test check-in successful', 
    receivedData: req.body,
    timestamp: new Date()
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});

module.exports = app;