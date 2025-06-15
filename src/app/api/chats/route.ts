import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/User';

// GET /api/chats - Get all chats for the current user
export async function GET(req: NextRequest) {
  try {
    const authResult = await auth();
    
    if (!authResult?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { Chat } = await import('@/lib/models/Chat');

    // Fetch user's chats, sorted by most recent
    const chats = await Chat.find({ 
      userId: authResult.userId 
    })
    .sort({ updatedAt: -1 })
    .lean();

    // Transform the data for frontend consumption
    const transformedChats = chats.map(chat => ({
      ...chat,
      _id: (chat._id as any).toString(),
    }));

    return NextResponse.json(transformedChats);
  } catch (error) {
    console.error('Chats API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chats' },
      { status: 500 }
    );
  }
}

// POST /api/chats - Create a new chat
export async function POST(req: NextRequest) {
  try {
    const authResult = await auth();
    
    if (!authResult?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, messages, modelId } = await req.json();

    if (!title || !messages || !modelId) {
      return NextResponse.json(
        { error: 'Title, messages, and modelId are required' },
        { status: 400 }
      );
    }

    await connectDB();
    const { Chat } = await import('@/lib/models/Chat');

    const newChat = new Chat({
      userId: authResult.userId,
      title,
      messages: messages.map((msg: any) => ({
        id: msg.id || `msg_${Date.now()}_${Math.random()}`,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(),
        attachments: msg.attachments || undefined,
      })),
      modelId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false,
    });

    const savedChat = await newChat.save();

    // Update user's chat count
    await User.findOneAndUpdate(
      { clerkId: authResult.userId },
      { 
        $inc: { 'usage.totalChats': 1 },
        $set: { lastActiveAt: new Date() }
      },
      { upsert: true }
    );

    return NextResponse.json({
      ...savedChat.toObject(),
      _id: savedChat._id.toString(),
    });
  } catch (error) {
    console.error('Create Chat API Error:', error);
    return NextResponse.json(
      { error: 'Failed to create chat' },
      { status: 500 }
    );
  }
} 