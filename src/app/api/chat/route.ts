import { NextRequest, NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { getAllModels, getModelConfig } from '@/lib/models';
import { connectDB } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import fs from 'fs';
import path from 'path';

// Configure AI providers
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Helper function to convert local image to base64
async function getImageBase64(imageUrl: string): Promise<string | null> {
  try {
    if (imageUrl.startsWith('/uploads/')) {
      // Local file
      const filePath = path.join(process.cwd(), 'public', imageUrl);
      const imageBuffer = fs.readFileSync(filePath);
      const base64 = imageBuffer.toString('base64');
      
      // Determine MIME type from file extension
      const ext = path.extname(imageUrl).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : 
                     ext === '.gif' ? 'image/gif' : 
                     ext === '.webp' ? 'image/webp' : 'image/jpeg';
      
      return `data:${mimeType};base64,${base64}`;
    } else if (imageUrl.startsWith('http')) {
      // External URL - fetch and convert to base64
      const response = await fetch(imageUrl);
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      return `data:${contentType};base64,${base64}`;
    }
    return null;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await auth();
    const body = await req.json();
    
    const { 
      messages, 
      modelId, 
      chatId, 
      saveToChat,
      experimental_attachments 
    } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    console.log('Request received:', {
      messagesCount: messages.length,
      attachmentsCount: experimental_attachments?.length || 0,
      modelId,
      chatId
    });

    // Debug: Log experimental_attachments details
    if (experimental_attachments && experimental_attachments.length > 0) {
      console.log('Experimental attachments:', JSON.stringify(experimental_attachments, null, 2));
    } else {
      console.log('No experimental_attachments received');
    }

    // Get available models
    const models = getAllModels();
    const selectedModel = modelId ? models.find(m => m.key === modelId) : models[0];

    if (!selectedModel) {
      return NextResponse.json({ error: 'Model not found' }, { status: 400 });
    }

    // Prepare the AI provider and model
    let provider;
    let model;

    if (selectedModel.config.provider === 'openai') {
      provider = openai;
      model = selectedModel.config.model_id;
    } else if (selectedModel.config.provider === 'anthropic') {
      provider = anthropic;
      model = selectedModel.config.model_id;
    } else {
      return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
    }

    let currentChatId = chatId;
    let chatTitle = '';

        // Process messages to add attachments to new messages
    let messagesWithAttachments = messages.map(msg => ({
      ...msg,
      attachments: (msg as any).attachments || (msg as any).experimental_attachments || []
    }));
    

    
    if (experimental_attachments && experimental_attachments.length > 0) {
      // Find the last user message and add attachments
      const lastMessageIndex = messagesWithAttachments.length - 1;
      if (lastMessageIndex >= 0 && messagesWithAttachments[lastMessageIndex].role === 'user') {
        messagesWithAttachments[lastMessageIndex] = {
          ...messagesWithAttachments[lastMessageIndex],
          attachments: experimental_attachments.map((att: any) => ({
            url: att.url,
            name: att.name,
            type: att.contentType,
          }))
        };
        console.log('Added attachments to last user message:', experimental_attachments.length);
      }
    }

    // Handle chat persistence for authenticated users
    if (authResult?.userId && saveToChat) {
      try {
        await connectDB();
        const { Chat } = await import('@/lib/models/Chat');
        
        if (!currentChatId) {
          // Create a new chat
          const firstUserMessage = messagesWithAttachments.find(msg => msg.role === 'user');
          chatTitle = firstUserMessage 
            ? firstUserMessage.content.substring(0, 50).replace(/\n/g, ' ').trim()
            : 'New Chat';
          
          if (chatTitle.length > 50) {
            chatTitle = chatTitle.substring(0, 47) + '...';
          }

          const newChat = new Chat({
            userId: authResult.userId,
            title: chatTitle,
            messages: messagesWithAttachments.map(msg => ({
              id: msg.id || `msg_${Date.now()}_${Math.random()}`,
              role: msg.role,
              content: msg.content,
              timestamp: (msg as any).timestamp || new Date(),
              attachments: (msg as any).attachments || [],
            })),
            modelId: selectedModel.key,
            createdAt: new Date(),
            updatedAt: new Date(),
            isArchived: false,
          });

          const savedChat = await newChat.save();
          currentChatId = savedChat._id.toString();
          console.log('Created new chat with ID:', currentChatId);
        } else {
          // For existing chats, only append the last message (which is the new one)
          // The useChat hook sends ALL messages, but we only want to save the newest one
          const lastMessage = messagesWithAttachments[messagesWithAttachments.length - 1];
          
          if (lastMessage) {
            console.log('DEBUG: Appending last message to existing chat');
            console.log(`  Total incoming messages: ${messagesWithAttachments.length}`);
            console.log(`  Last message ID: ${lastMessage.id}`);
            console.log(`  Last message role: ${lastMessage.role}`);
            console.log(`  Last message has attachments: ${!!((lastMessage as any).attachments?.length)}`);
            
            // Prepare the last message for database
            const messageToAdd = {
              id: lastMessage.id || `msg_${Date.now()}_${Math.random()}`,
              role: lastMessage.role,
              content: lastMessage.content,
              timestamp: (lastMessage as any).timestamp || new Date(),
              attachments: (lastMessage as any).attachments || [],
            };
            
            // Append only the last message to existing chat using $push
            await (Chat as any).findByIdAndUpdate(
              currentChatId,
              { 
                $push: { messages: messageToAdd },
                modelId: selectedModel.key,
                updatedAt: new Date()
              },
              { upsert: false }
            );
            
            console.log(`Successfully appended 1 new message to chat ${currentChatId}`);
            
            // Debug: Log if the new message has attachments
            if (messageToAdd.attachments && messageToAdd.attachments.length > 0) {
              console.log(`DEBUG: New message added with ${messageToAdd.attachments.length} attachments`);
            }
          } else {
            console.log('No message to add to chat');
          }
        }
      } catch (error) {
        console.error('Failed to save chat:', error);
      }
    }

    // Check if we have image messages that need direct OpenAI handling
    const hasImages = messagesWithAttachments.some((msg: any) => 
      msg.attachments?.some((att: any) => att.type.startsWith('image/')) && selectedModel.config.image
    );

    if (hasImages && selectedModel.config.provider === 'openai') {
      // Use AI SDK with proper image format for OpenAI
      console.log('Using AI SDK with images for OpenAI');
      
      const coreMessages = messagesWithAttachments.map((msg) => {
        if ((msg as any).attachments?.length > 0) {
          const imageAttachments = (msg as any).attachments.filter((att: any) => att.type.startsWith('image/'));
          
          if (imageAttachments.length > 0) {
            const content: any[] = [
              { type: "text", text: msg.content }
            ];
            
            imageAttachments.forEach((att: any) => {
              content.push({
                type: "image",
                image: att.url
              });
            });
            
            console.log('AI SDK message with images:', { role: msg.role, content });
            
            return {
              role: msg.role,
              content: content,
            };
          }
        }
        
        return {
          role: msg.role,
          content: msg.content,
        };
      });

      // Use AI SDK streamText with image support
      const result = await streamText({
        model: provider(selectedModel.config.model_id),
        messages: coreMessages,
        temperature: 0.7,
        maxTokens: selectedModel.config.max_tokens || 4000,
      });

      // Create response with chat ID in headers
      const response = result.toDataStreamResponse();
      
      if (currentChatId) {
        response.headers.set('x-chat-id', currentChatId);
      }
      
      console.log('Successfully created AI SDK streaming response with images for chat:', currentChatId);
      return response;
    }

    // Process messages for AI SDK - text only
    console.log('Processing messages for AI SDK:', messagesWithAttachments.length);
    
    let processedMessages = messagesWithAttachments.map((msg) => {
      return {
        role: msg.role,
        content: msg.content,
      };
    });

    console.log('Processed messages for AI SDK:', processedMessages.length);

    // Create streaming response
    const result = await streamText({
      model: provider(model),
      messages: processedMessages,
      temperature: 0.7,
      maxTokens: selectedModel.config.max_tokens || 4000,
    });

    // Create response with chat ID in headers
    const response = result.toDataStreamResponse();
    
    if (currentChatId) {
      response.headers.set('x-chat-id', currentChatId);
    }
    
    console.log('Successfully created streaming response for chat:', currentChatId);
    
    return response;
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const models = getAllModels();
    const transformedModels = models.map(({ key, config }) => ({
      id: key,
      name: config.name,
      provider: config.provider,
      model: config.model_id,
      description: config.description,
      image: config.image,
      context_window: config.context_window,
      max_tokens: config.max_tokens,
      pricing: config.pricing,
    }));
    return NextResponse.json(transformedModels);
  } catch (error) {
    console.error('Models API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
} 