'use client';

import { useAuth, useUser, UserButton } from '@clerk/nextjs';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { ChatHistory } from '@/components/chat/ChatHistory';
import { 
  Loader2, 
  MessageSquare, 
  Sparkles, 
  Moon, 
  Sun, 
  Monitor,
  FileImage,
  Zap,
  Brain,
  Settings,
  Plus,
  Sidebar,
  X,
  User
} from 'lucide-react';
import Image from 'next/image';

export default function ChatPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const params = useParams();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Get chat ID from URL params
  const chatId = params.id as string;
  
  // Debug: Log the chat ID from URL params
  console.log('ChatPage [id] - chatId from params:', chatId);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if we have valid Clerk keys
  const hasValidClerkKeys = 
    typeof window !== 'undefined' && 
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && 
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== 'your_clerk_publishable_key_here';

  useEffect(() => {
    if (hasValidClerkKeys && isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [hasValidClerkKeys, isLoaded, isSignedIn, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <Loader2 className="w-10 h-10 animate-spin text-[#10a37f]" />
            <div className="absolute inset-0 w-10 h-10 border-2 border-[#10a37f]/20 rounded-full animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-foreground">Loading Galaxy AI</p>
            <p className="text-sm text-muted-foreground">Preparing your AI assistant...</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasValidClerkKeys && !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <Loader2 className="w-10 h-10 animate-spin text-[#10a37f]" />
            <div className="absolute inset-0 w-10 h-10 border-2 border-[#10a37f]/20 rounded-full animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-foreground">Loading Galaxy AI</p>
            <p className="text-sm text-muted-foreground">Preparing your AI assistant...</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasValidClerkKeys && !isSignedIn) {
    return null;
  }

  const themeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const ThemeIcon = themeIcon;

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  };



  const handleChatCreated = (newChatId: string) => {
    console.log('Chat created from existing chat page, redirecting to:', newChatId);
    router.push(`/chat/${newChatId}`);
  };

  return (
    <div className="min-h-screen bg-[#212121] antialiased">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Exact ChatGPT Style */}
      <div 
        data-sidebar
        className={`fixed left-0 top-0 h-full bg-[#171717] z-50 transition-all duration-300 ${
          sidebarOpen && !sidebarCollapsed ? 'translate-x-0' : '-translate-x-full'
        } ${!sidebarCollapsed ? 'md:translate-x-0' : 'md:-translate-x-full'}`}
        style={{ width: 260 }}
      >
        <div className="flex flex-col h-full">
          {/* Chat History */}
          <div className="flex-1 overflow-hidden">
            <ChatHistory
              isCollapsed={sidebarCollapsed}
              onCollapsedChange={setSidebarCollapsed}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div 
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'md:ml-0' : 'md:ml-[260px]'
        }`}
      >
        {/* Desktop Top Bar - Only show on desktop */}
        <div className="hidden md:flex sticky top-0 z-30 items-center justify-between px-4 py-3 bg-[#212121]">
          <div className="flex items-center gap-3">
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                title="Open sidebar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <span className="text-white font-medium text-lg">Galaxy AI</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 text-sm">Saved memory full</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </button>
            
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            
            {hasValidClerkKeys && user ? (
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8 rounded-full",
                  },
                }}
              />
            ) : (
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                T
              </div>
            )}
          </div>
        </div>

        {/* Mobile Top Bar - Simple header with hamburger and profile */}
        <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#212121]">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
            >
              <Sidebar className="w-5 h-5" />
            </button>
            <span className="text-white font-medium text-lg">Galaxy AI</span>
          </div>
          
          {hasValidClerkKeys && user ? (
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8 rounded-full",
                },
              }}
            />
          ) : (
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              T
            </div>
          )}
        </div>

        {/* Chat Interface */}
        <div className="h-[calc(100vh-73px)] bg-[#212121]">
          <ChatInterface 
            user={hasValidClerkKeys && user ? user : null}
            isDemo={!hasValidClerkKeys}
            chatId={chatId}
            onChatCreated={handleChatCreated}
          />
        </div>
      </div>
    </div>
  );
} 