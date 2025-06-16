import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db';

interface RouteParams {
  params: {
    chatId: string;
  };
}

// GET /api/chats/[chatId] - Get a specific chat with all messages
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await auth();
    const { chatId } = params;
    
    if (!authResult?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    await connectDB();
    const { Chat } = await import('@/lib/models/Chat');

    const chat = await Chat.findOne({
      _id: chatId,
      userId: authResult.userId
    }).lean();

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Debug: Log what's being loaded from database
    console.log('DEBUG: Loading chat from DB:', {
      chatId: chatId,
      messageCount: chat.messages?.length || 0,
      messagesWithAttachments: chat.messages?.filter((msg: any) => msg.attachments && msg.attachments.length > 0).length || 0
    });
    
    if (chat.messages) {
      chat.messages.forEach((msg: any, index: number) => {
        if (msg.attachments && msg.attachments.length > 0) {
          console.log(`  Message ${index + 1} has ${msg.attachments.length} attachments:`);
          msg.attachments.forEach((att: any, attIndex: number) => {
            console.log(`    ${attIndex + 1}. ${att.name} (${att.type}) - ${att.url}`);
          });
        }
      });
    }

    return NextResponse.json({
      ...chat,
      _id: (chat as any)._id.toString(),
    });
  } catch (error) {
    console.error('Get Chat API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await auth();
    const { chatId } = params;
    const updateData = await req.json();
    
    if (!authResult?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    await connectDB();
    const { Chat } = await import('@/lib/models/Chat');

    // Build update object
    const updateObject: any = {
      updatedAt: new Date()
    };

    if (updateData.title !== undefined) {
      updateObject.title = updateData.title;
    }

    if (updateData.messages !== undefined) {
      updateObject.messages = updateData.messages.map((msg: any) => ({
        id: msg.id || `msg_${Date.now()}_${Math.random()}`,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp || new Date(),
        attachments: msg.attachments || undefined,
      }));
    }

    if (updateData.addMessage !== undefined) {
      // Use $push to append a single message (same approach as main chat API)
      const newMessage = {
        id: updateData.addMessage.id || `msg_${Date.now()}_${Math.random()}`,
        role: updateData.addMessage.role,
        content: updateData.addMessage.content,
        timestamp: updateData.addMessage.timestamp || new Date(),
        attachments: updateData.addMessage.attachments || undefined,
      };
      
      console.log('DEBUG: Adding message via PATCH endpoint:', {
        chatId,
        messageId: newMessage.id,
        role: newMessage.role,
        hasAttachments: !!(newMessage.attachments?.length)
      });
      
      // Use $push to append the message instead of replacing entire array
      const updatedChat = await Chat.findOneAndUpdate(
        { _id: chatId, userId: authResult.userId },
        { 
          $push: { messages: newMessage },
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      ).lean();

      if (!updatedChat) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
      }

      return NextResponse.json({
        ...updatedChat,
        _id: (updatedChat as any)._id.toString(),
      });
    }

    if (updateData.modelId !== undefined) {
      updateObject.modelId = updateData.modelId;
    }

    if (updateData.isArchived !== undefined) {
      updateObject.isArchived = updateData.isArchived;
    }

    const updatedChat = await Chat.findOneAndUpdate(
      { _id: chatId, userId: authResult.userId },
      updateObject,
      { new: true, runValidators: true }
    ).lean();

    if (!updatedChat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...updatedChat,
      _id: (updatedChat as any)._id.toString(),
    });
  } catch (error) {
    console.error('Update Chat API Error:', error);
    return NextResponse.json(
      { error: 'Failed to update chat' },
      { status: 500 }
    );
  }
}

// DELETE /api/chats/[chatId] - Delete a chat (archive it)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await auth();
    const { chatId } = params;
    
    if (!authResult?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    await connectDB();
    const { Chat } = await import('@/lib/models/Chat');
    const { User } = await import('@/lib/models/User');

    const deletedChat = await Chat.findOneAndDelete({
      _id: chatId,
      userId: authResult.userId
    });

    if (!deletedChat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Update user's chat count
    try {
      await User.findOneAndUpdate(
        { clerkId: authResult.userId },
        { 
          $inc: { 'usage.totalChats': -1 },
          $set: { updatedAt: new Date() }
        },
        { upsert: true }
      );
    } catch (userError) {
      console.error('Failed to update user chat count:', userError);
      // Don't fail the deletion if user update fails
    }

    return NextResponse.json({ 
      message: 'Chat deleted successfully',
      deletedChatId: chatId 
    });
  } catch (error) {
    console.error('Delete Chat API Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat' },
      { status: 500 }
    );
  }
} 