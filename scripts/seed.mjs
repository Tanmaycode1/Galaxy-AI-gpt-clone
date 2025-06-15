#!/usr/bin/env node

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const dotenv = require('dotenv');
dotenv.config({ path: join(__dirname, '../.env.local') });

async function main() {
  const args = process.argv.slice(2);
  const action = args[0] || 'seed';

  console.log('🚀 ChatGPT Clone Database Seeder');
  console.log('================================');

  // Check if MongoDB URI is set
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env.local');
    console.error('💡 Please create .env.local file with your MongoDB connection string');
    console.error('   Example: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatgpt-clone');
    process.exit(1);
  }

  try {
    // We need to use the API route approach since we can't directly import TypeScript modules
    const baseUrl = 'http://localhost:3000';
    
    if (action === 'stats') {
      console.log('📊 Getting database statistics...');
      const response = await fetch(`${baseUrl}/api/seed`);
      const data = await response.json();
      
      if (data.success) {
        console.log(`📈 Database Statistics:`);
        console.log(`   👥 Users: ${data.stats.users}`);
        console.log(`   💬 Chats: ${data.stats.chats}`);
        console.log(`   📝 Messages: ${data.stats.messages}`);
      } else {
        throw new Error(data.error || 'Failed to get stats');
      }
      return;
    }
    
    // For seed and clear operations
    const response = await fetch(`${baseUrl}/api/seed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.details || data.error || 'Operation failed');
    }

    // Action-specific logging (the actual work is done above)
    switch (action) {
      case 'seed':
        console.log('🌱 Database seeded with sample data!');
        break;

      case 'clear':
        const confirm = process.env.NODE_ENV === 'production' ? false : true;
        if (!confirm) {
          console.log('⚠️  Skipping clear in production. Use NODE_ENV=development to force.');
          process.exit(0);
        }
        console.log('🧹 Database cleared successfully!');
        break;

      case 'help':
      default:
        console.log('📖 Available commands:');
        console.log('   npm run seed        - Seed database with sample data');
        console.log('   npm run seed clear  - Clear all database data');
        console.log('   npm run seed stats  - Show database statistics');
        console.log('   npm run seed help   - Show this help message');
        if (action !== 'help') {
          process.exit(1);
        }
        process.exit(0);
    }

    console.log('✅ Operation completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Operation failed:', error.message);
    
    if (error.message.includes('auth')) {
      console.error('🔐 Authentication failed. Please check:');
      console.error('   1. Your MongoDB username and password are correct');
      console.error('   2. Your IP address is whitelisted in MongoDB Atlas');
      console.error('   3. Your connection string format is correct');
    } else if (error.message.includes('network')) {
      console.error('🌐 Network error. Please check your internet connection');
    }
    
    console.error('💡 Make sure your MONGODB_URI is correctly set in .env.local');
    process.exit(1);
  }
}

main(); 