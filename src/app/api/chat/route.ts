import { NextRequest, NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { getAllModels, getModelConfig } from '@/lib/models';
import { connectDB } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Retrieve relevant messages from older chats for context
async function getOlderChatsContext(userId: string, currentChatId: string | null, maxOlderMessages: number = 30): Promise<any[]> {
  try {
    await connectDB();
    const { Chat } = await import('@/lib/models/Chat');
    
    // Get recent chats (excluding current chat) - last 10 chats
    const query: any = {
      userId,
      isArchived: false
    };
    
    if (currentChatId) {
      query._id = { $ne: currentChatId };
    }
    
    const recentChats = await (Chat as any).find(query)
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

    if (!recentChats.length) {
      return [];
    }

    // Collect all messages from older chats with chat metadata
    let allOlderMessages: any[] = [];
    
    for (const chat of recentChats) {
      const chatMessages = (chat.messages || []).map((msg: any) => ({
        ...msg,
        chatId: chat._id.toString(),
        chatTitle: chat.title,
        chatUpdatedAt: chat.updatedAt
      }));
      allOlderMessages.push(...chatMessages);
    }

    // Sort by timestamp (most recent first)
    allOlderMessages.sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return bTime - aTime;
    });

    // Sample messages intelligently
    if (allOlderMessages.length <= maxOlderMessages) {
      console.log(`Including all ${allOlderMessages.length} messages from older chats`);
      return allOlderMessages;
    }

    // Intelligent sampling: More from recent chats, fewer from older ones
    const sampledMessages: any[] = [];
    const chatGroups = new Map<string, any[]>();
    
    // Group messages by chat
    allOlderMessages.forEach(msg => {
      const chatId = msg.chatId;
      if (!chatGroups.has(chatId)) {
        chatGroups.set(chatId, []);
      }
      chatGroups.get(chatId)!.push(msg);
    });

    // Allocate messages per chat (more recent chats get more messages)
    const chatIds = Array.from(chatGroups.keys());
    const totalChats = chatIds.length;
    
    for (let i = 0; i < totalChats && sampledMessages.length < maxOlderMessages; i++) {
      const chatId = chatIds[i];
      const chatMessages = chatGroups.get(chatId)!;
      
      // Allocate more messages to more recent chats
      const weight = Math.max(1, totalChats - i); // Recent chats get higher weight
      const allocatedSlots = Math.min(
        chatMessages.length,
        Math.max(1, Math.floor((maxOlderMessages * weight) / (totalChats * (totalChats + 1) / 2)))
      );
      
      // Take the most recent messages from this chat
      const selectedFromChat = chatMessages.slice(0, allocatedSlots);
      sampledMessages.push(...selectedFromChat);
      
      console.log(`Chat "${chatMessages[0]?.chatTitle?.substring(0, 30)}...": ${selectedFromChat.length}/${chatMessages.length} messages`);
    }

    // Sort final selection by timestamp (chronological order)
    sampledMessages.sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return aTime - bTime;
    });

    console.log(`Older chats context: ${allOlderMessages.length} → ${sampledMessages.length} messages from ${recentChats.length} chats`);
    return sampledMessages;
    
  } catch (error) {
    console.error('Error retrieving older chats context:', error);
    return [];
  }
}

// Intelligent context management: Current chat + older chats context
async function manageContextWithHistory(
  currentMessages: any[], 
  userId: string | null, 
  currentChatId: string | null,
  maxMessages: number = 65
): Promise<any[]> {
  // Always keep the most recent 4 messages from current chat
  const recentCurrentMessages = currentMessages.slice(-4);
  const olderCurrentMessages = currentMessages.slice(0, -4);
  
  // Calculate available slots for older context
  const availableForOlder = maxMessages - recentCurrentMessages.length;
  
  if (availableForOlder <= 0) {
    console.log('Context management: Only recent messages fit');
    return recentCurrentMessages;
  }

  let contextMessages: any[] = [];
  
  // Add older messages from current chat (if any)
  const currentChatOlderSlots = Math.min(olderCurrentMessages.length, Math.floor(availableForOlder * 0.6)); // 60% for current chat older messages
  if (currentChatOlderSlots > 0 && olderCurrentMessages.length > 0) {
    if (olderCurrentMessages.length <= currentChatOlderSlots) {
      contextMessages.push(...olderCurrentMessages);
    } else {
      // Sample older messages from current chat
      const step = Math.max(1, Math.floor(olderCurrentMessages.length / currentChatOlderSlots));
      for (let i = olderCurrentMessages.length - currentChatOlderSlots * step; i < olderCurrentMessages.length; i += step) {
        if (i >= 0 && i < olderCurrentMessages.length) {
          contextMessages.push(olderCurrentMessages[i]);
        }
      }
    }
  }

  // Add messages from older chats (if user is authenticated)
  if (userId) {
    const remainingSlots = availableForOlder - contextMessages.length;
    if (remainingSlots > 0) {
      const olderChatsMessages = await getOlderChatsContext(userId, currentChatId, remainingSlots);
      contextMessages.push(...olderChatsMessages);
    }
  }

  // Sort all context messages chronologically
  contextMessages.sort((a, b) => {
    const aTime = new Date(a.timestamp || 0).getTime();
    const bTime = new Date(b.timestamp || 0).getTime();
    return aTime - bTime;
  });

  // Combine: older context + recent current messages
  const result = [...contextMessages, ...recentCurrentMessages];
  
  console.log(`Cross-chat context: ${currentMessages.length} current + older chats → ${result.length} total messages`);
  console.log(`  - Recent current: ${recentCurrentMessages.length}`);
  console.log(`  - Older current: ${contextMessages.filter(m => !m.chatId).length}`);
  console.log(`  - From older chats: ${contextMessages.filter(m => m.chatId).length}`);
  
  return result;
}

// Convert PDF to images using Cloudinary's built-in PDF transformation
async function convertPdfToImages(pdfUrl: string, maxPages: number = 10): Promise<string[]> {
  try {
    console.log('Converting PDF to images for LLM:', pdfUrl);
    
    // Extract public_id from the PDF URL
    const urlMatch = pdfUrl.match(/\/raw\/upload\/(?:v\d+\/)?(.+)$/);
    if (!urlMatch) {
      console.error('Could not extract public_id from PDF URL:', pdfUrl);
      return [];
    }
    
    const publicId = urlMatch[1];
    console.log('Extracted public_id for conversion:', publicId);
    
    const imageUrls: string[] = [];
    
    // Try to convert each page using Cloudinary's PDF page transformation
    for (let page = 1; page <= maxPages; page++) {
      try {
        // Generate image URL for this page using Cloudinary transformation
        // This converts the raw PDF to an image format
        const imageUrl = cloudinary.url(publicId, {
          resource_type: 'raw',
          format: 'jpg',
          page: page,
          width: 800,
          quality: 'auto',
          flags: 'progressive'
        });
        
        console.log(`Testing page ${page} conversion with URL:`, imageUrl);
        
        // Test if the page conversion works
        const testResponse = await fetch(imageUrl, { method: 'HEAD' });
        if (testResponse.ok) {
          imageUrls.push(imageUrl);
          console.log(`Page ${page} converted successfully`);
        } else {
          console.log(`Page ${page} conversion failed (${testResponse.status}), trying upload method...`);
          
          // Try alternative: Re-upload the PDF as an image resource type
          try {
            const reuploadResult = await cloudinary.uploader.upload(pdfUrl, {
              resource_type: 'image',
              format: 'jpg',
              page: page,
              folder: 'chatgpt-clone/temp-pdf-pages',
              quality: 'auto',
            });
            
            imageUrls.push(reuploadResult.secure_url);
            console.log(`Page ${page} converted via re-upload successfully`);
          } catch (reuploadError) {
            console.log(`Page ${page} re-upload also failed, stopping conversion`);
            break;
          }
        }
      } catch (pageError) {
        console.log(`Page ${page} conversion error:`, pageError);
        break;
      }
    }
    
    console.log(`PDF converted to ${imageUrls.length} images for LLM`);
    return imageUrls;
    
  } catch (error) {
    console.error('PDF conversion error for LLM:', error);
    return [];
  }
}

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

    // Apply intelligent context management with cross-chat history
    // Work for BOTH existing and new chats
    console.log(`Original messages count: ${messagesWithAttachments.length}`);
    if (authResult?.userId) {
      // Apply context management for authenticated users (both new and existing chats)
      console.log(`Applying context management for user: ${authResult.userId}`);
      messagesWithAttachments = await manageContextWithHistory(
        messagesWithAttachments, 
        authResult.userId, 
        currentChatId // null for new chats, chatId for existing chats
      );
      console.log(`✅ Context managed messages count: ${messagesWithAttachments.length}`);
    } else {
      // For demo/unauthenticated users, keep messages clean
      console.log(`Demo user - keeping messages clean: ${messagesWithAttachments.length}`);
    }
    

    
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

    // Check if we have attachments (images or PDFs) that need processing for the LLM
    // Only process attachments from the LAST message (current user input), ignore context attachments
    const lastMessage = messagesWithAttachments[messagesWithAttachments.length - 1];
    const hasAttachments = lastMessage && (lastMessage as any).attachments?.length > 0 && selectedModel.config.image;

    if (hasAttachments && selectedModel.config.provider === 'openai') {
      // Use AI SDK with proper image format for OpenAI
      console.log('Using AI SDK with attachments for OpenAI');
      
      const coreMessages = await Promise.all(messagesWithAttachments.map(async (msg, index) => {
        // Only process attachments for the LAST message (current user input)
        if (index === messagesWithAttachments.length - 1 && (msg as any).attachments?.length > 0) {
          const attachments = (msg as any).attachments;
          const content: any[] = [
            { type: "text", text: msg.content }
          ];
          
          // Process each attachment
          for (const att of attachments) {
            if (att.type.startsWith('image/')) {
              // Regular image - add directly
              content.push({
                type: "image",
                image: att.url
              });
            } else if (att.type === 'application/pdf') {
              // PDF - convert to images in background
              console.log('Converting PDF to images for LLM:', att.name);
              const pdfImages = await convertPdfToImages(att.url, 10);
              
              if (pdfImages.length > 10) {
                // Skip if too many pages
                console.log('PDF too large, skipping:', pdfImages.length, 'pages');
                continue;
              }
              
              // Add each page as an image
              pdfImages.forEach((imageUrl) => {
                content.push({
                  type: "image",
                  image: imageUrl
                });
              });
            }
          }
          
          console.log('AI SDK message with attachments:', { role: msg.role, content: content.length + ' items' });
          
          return {
            role: msg.role,
            content: content,
          };
        }
        
        return {
          role: msg.role,
          content: msg.content,
        };
      }));

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
      
      console.log('Successfully created AI SDK streaming response with attachments for chat:', currentChatId);
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