/**
 * Initialize default templates
 * Run this script once to create default templates in the database
 * Usage: node init-templates.js
 */

const mongoose = require('mongoose');
const Template = require('./models/Template');
require('dotenv').config({ path: './config.env' });

async function initializeTemplates() {
  try {
    // Connect to MongoDB
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hrms';
    
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Create a dummy admin user ID (you can replace this with an actual admin ID)
    const dummyAdminId = new mongoose.Types.ObjectId();

    // Create default templates
    console.log('Creating default templates...');
    await Template.createDefaultTemplates(dummyAdminId);

    console.log('✓ Default templates created successfully!');
    
    // List created templates
    const templates = await Template.find({});
    console.log('\nCreated templates:');
    templates.forEach(t => {
      console.log(`  - ${t.name} (${t.type}) ${t.isDefault ? '[DEFAULT]' : ''}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error initializing templates:', error);
    process.exit(1);
  }
}

initializeTemplates();
