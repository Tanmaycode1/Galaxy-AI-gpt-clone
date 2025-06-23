'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { ChatInterface } from '@/components/chat/ChatInterface';

export default function NewChatPage() {
  const { user } = useUser();
  const router = useRouter();



  // Handle smooth redirect to new chat when created
  const handleChatCreated = (newChatId: string) => {
    console.log('New chat created, redirecting to:', newChatId);
    // Use replace to avoid back button issues
    router.replace(`/chat/${newChatId}`);
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
      chatId={undefined} // Always undefined for new chats
      onChatCreated={handleChatCreated}
    />
  );
} 