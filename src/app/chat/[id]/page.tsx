'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter, useParams } from 'next/navigation';
import { ChatInterface } from '@/components/chat/ChatInterface';

export default function ChatPage() {
  const { user } = useUser();
  const router = useRouter();
  const params = useParams();
  const chatId = params.id as string;

  // Handle when user creates a new chat from here
  const handleChatCreated = (newChatId: string) => {
    console.log('Chat created from existing chat page, redirecting to:', newChatId);
    router.push(`/chat/${newChatId}`);
  };

  // Check if we have valid Clerk keys
  const hasValidClerkKeys = 
    typeof window !== 'undefined' && 
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && 
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== 'your_clerk_publishable_key_here';

  return (
    <ChatInterface 
      user={hasValidClerkKeys && user ? user : null}
      isDemo={!hasValidClerkKeys}
      chatId={chatId}
      onChatCreated={handleChatCreated}
    />
  );
} 