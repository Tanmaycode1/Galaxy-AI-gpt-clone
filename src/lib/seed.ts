import { connectDB } from './db';
import { User } from './models/User';
import { Chat } from './models/Chat';

export async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to database
    await connectDB();
    
    // Check if data already exists
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      console.log('📊 Database already contains data. Skipping seed.');
      return;
    }
    
    // Create demo user for testing
    const demoUser = new User({
      clerkId: 'demo_user_123',
      email: 'demo@example.com',
      firstName: 'Demo',
      lastName: 'User',
      preferences: {
        defaultModel: 'gpt-4o',
        theme: 'system',
        language: 'en'
      },
      usage: {
        totalChats: 2,
        totalMessages: 6,
        totalTokensUsed: 1500
      }
    });
    
    await demoUser.save();
    console.log('✅ Created demo user');
    
    // Create sample chat conversations
    const sampleChat1 = new Chat({
      userId: 'demo_user_123',
      title: 'Getting Started with AI',
      modelId: 'gpt-4o',
      messages: [
        {
          id: 'msg_1',
          role: 'user',
          content: 'Hello! Can you help me understand how AI works?',
          timestamp: new Date(Date.now() - 86400000) // 1 day ago
        },
        {
          id: 'msg_2',
          role: 'assistant',
          content: 'Hello! I\'d be happy to help you understand AI. Artificial Intelligence refers to computer systems that can perform tasks that typically require human intelligence, such as learning, reasoning, problem-solving, and understanding language.\n\nThere are several key concepts:\n\n1. **Machine Learning**: AI systems learn from data to improve their performance\n2. **Neural Networks**: Computing systems inspired by biological neural networks\n3. **Natural Language Processing**: AI\'s ability to understand and generate human language\n4. **Computer Vision**: AI\'s ability to interpret and understand visual information\n\nWould you like me to dive deeper into any of these areas?',
          timestamp: new Date(Date.now() - 86400000 + 30000) // 1 day ago + 30 seconds
        },
        {
          id: 'msg_3',
          role: 'user',
          content: 'That\'s fascinating! Can you tell me more about how neural networks work?',
          timestamp: new Date(Date.now() - 86400000 + 120000) // 1 day ago + 2 minutes
        },
        {
          id: 'msg_4',
          role: 'assistant',
          content: 'Great question! Neural networks are inspired by how the human brain processes information. Here\'s a simplified explanation:\n\n**Basic Structure:**\n- **Neurons (Nodes)**: Basic processing units that receive inputs, process them, and produce outputs\n- **Layers**: Networks are organized in layers - input layer, hidden layers, and output layer\n- **Connections**: Neurons are connected with weights that determine the strength of connections\n\n**How They Learn:**\n1. **Forward Pass**: Data flows from input to output through the network\n2. **Loss Calculation**: The network\'s output is compared to the expected result\n3. **Backpropagation**: Errors are propagated backward to adjust weights\n4. **Iteration**: This process repeats thousands of times to improve accuracy\n\n**Types of Neural Networks:**\n- **Feedforward**: Information flows in one direction\n- **Convolutional (CNNs)**: Great for image processing\n- **Recurrent (RNNs)**: Good for sequential data like text\n- **Transformers**: The architecture behind modern language models like me!\n\nThe key insight is that through this training process, neural networks can learn complex patterns and relationships in data that would be difficult to program explicitly.',
          timestamp: new Date(Date.now() - 86400000 + 180000) // 1 day ago + 3 minutes
        }
      ]
    });
    
    const sampleChat2 = new Chat({
      userId: 'demo_user_123',
      title: 'Creative Writing Help',
      modelId: 'claude-3-5-sonnet-20241022',
      messages: [
        {
          id: 'msg_5',
          role: 'user',
          content: 'I need help writing a short story about a robot who discovers emotions. Can you help me brainstorm?',
          timestamp: new Date(Date.now() - 3600000) // 1 hour ago
        },
        {
          id: 'msg_6',
          role: 'assistant',
          content: 'What a wonderful concept! A robot discovering emotions offers rich storytelling possibilities. Here are some brainstorming ideas:\n\n**Possible Triggers for Emotional Discovery:**\n- Malfunction that creates unexpected responses\n- Exposure to art, music, or literature\n- Caring for a human or animal\n- Witnessing injustice or beauty\n- Making a difficult moral choice\n\n**Emotional Journey Arc:**\n1. **Confusion**: "What is this strange new processing pattern?"\n2. **Fear**: Worrying about being "broken" or different\n3. **Wonder**: Discovering the richness of emotional experience\n4. **Conflict**: Struggling between logic and feeling\n5. **Acceptance**: Integrating emotions as part of their identity\n\n**Potential Themes:**\n- What makes us human vs. artificial?\n- The value of emotions in decision-making\n- Acceptance of change and growth\n- The beauty of imperfection\n\n**Story Structure Ideas:**\n- Start with a routine day that gets disrupted\n- Show the robot\'s analytical attempts to understand emotions\n- Include a moment where emotions help solve a problem logic couldn\'t\n\nWhat aspect interests you most? Would you like to develop the character, plot, or explore a specific emotional discovery?',
          timestamp: new Date(Date.now() - 3600000 + 45000) // 1 hour ago + 45 seconds
        }
      ]
    });
    
    await sampleChat1.save();
    await sampleChat2.save();
    console.log('✅ Created sample chat conversations');
    
    console.log('🎉 Database seeding completed successfully!');
    console.log(`📊 Created: 1 user, 2 chats with 6 total messages`);
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

// Function to clear all data (useful for development)
export async function clearDatabase() {
  try {
    console.log('🧹 Clearing database...');
    await connectDB();
    
    await User.deleteMany({});
    await Chat.deleteMany({});
    
    console.log('✅ Database cleared successfully');
  } catch (error) {
    console.error('❌ Failed to clear database:', error);
    throw error;
  }
}

// Function to get database statistics
export async function getDatabaseStats() {
  try {
    await connectDB();
    
    const userCount = await User.countDocuments();
    const chatCount = await Chat.countDocuments();
    const totalMessages = await Chat.aggregate([
      { $unwind: '$messages' },
      { $count: 'total' }
    ]);
    
    return {
      users: userCount,
      chats: chatCount,
      messages: totalMessages[0]?.total || 0
    };
  } catch (error) {
    console.error('❌ Failed to get database stats:', error);
    return { users: 0, chats: 0, messages: 0 };
  }
} 