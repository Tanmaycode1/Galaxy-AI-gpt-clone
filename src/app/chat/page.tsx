'use client';

import { useAuth, useUser, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
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
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | undefined>();
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  // Resize functionality
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = Math.max(isCollapsed ? 80 : 280, Math.min(600, e.clientX));
      setSidebarWidth(newWidth);
      
      // Auto-expand when dragging to a larger size
      if (newWidth > 120 && isCollapsed) {
        setIsCollapsed(false);
      }
      // Auto-collapse when dragging to a very small size
      if (newWidth < 120 && !isCollapsed) {
        setIsCollapsed(true);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.body.style.pointerEvents = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.pointerEvents = '';
    };
  }, [isResizing, isCollapsed]);

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

  const handleChatSelect = (chatId: string) => {
    setCurrentChatId(chatId);
    setSidebarOpen(false); // Close sidebar on mobile
  };

  const handleNewChat = () => {
    setCurrentChatId(undefined);
    setSidebarOpen(false); // Close sidebar on mobile
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleDoubleClick = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setSidebarWidth(320);
    } else {
      setIsCollapsed(true);
      setSidebarWidth(80);
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    setSidebarWidth(isCollapsed ? 320 : 80);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 antialiased">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        data-sidebar
        className={`fixed left-0 top-0 h-full bg-gradient-to-b from-[hsl(var(--sidebar-background))] to-[hsl(var(--sidebar-background))]/95 backdrop-blur-xl border-r border-border/80 z-50 transform ${
          isResizing ? '' : 'transition-all duration-300 ease-in-out'
        } ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 shadow-xl`}
        style={{ width: isCollapsed ? 80 : sidebarWidth }}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-b border-border flex-shrink-0`}>
            <div className="flex items-center justify-between min-w-0">
              <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'space-x-3'} min-w-0 flex-1`}>
                <div className={`${isCollapsed ? 'w-6 h-6' : 'w-8 h-8'} bg-gradient-to-br from-[#10a37f] to-[#0d8f6e] rounded-lg flex items-center justify-center flex-shrink-0 transition-all p-1`}>
                  <Image
                    src="/icons/favicon.ico"
                    alt="Galaxy AI"
                    width={isCollapsed ? 16 : 20}
                    height={isCollapsed ? 16 : 20}
                    className="rounded-sm"
                  />
                </div>
                {!isCollapsed && (
                  <span className="font-semibold text-foreground truncate">
                    Galaxy AI
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={toggleSidebar}
                    className="hidden md:flex p-1.5 hover:bg-muted rounded-lg transition-colors"
                    title="Collapse sidebar"
                  >
                    <Sidebar className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="md:hidden p-1 hover:bg-muted rounded-md transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            {isCollapsed && (
              <button
                onClick={toggleSidebar}
                className="hidden md:flex w-full justify-center mt-2 p-1 hover:bg-muted rounded-lg transition-colors"
                title="Expand sidebar"
              >
                <Sidebar className="w-3 h-3 rotate-180" />
              </button>
            )}
          </div>



          {/* Chat History */}
          <div className="flex-1 overflow-hidden">
            <ChatHistory
              currentChatId={currentChatId}
              onChatSelect={handleChatSelect}
              onNewChat={handleNewChat}
              isCollapsed={isCollapsed}
              sidebarWidth={sidebarWidth}
            />
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-border space-y-3 flex-shrink-0">
            <button
              onClick={cycleTheme}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'space-x-3 px-3'} py-2 hover:bg-muted rounded-lg transition-colors min-h-[36px]`}
              title={isCollapsed ? `${theme} theme` : ""}
            >
              <ThemeIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              {!isCollapsed && (
                <span className="text-sm text-muted-foreground capitalize">
                  {theme} theme
                </span>
              )}
            </button>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} min-w-0`}>
              <div className="flex-shrink-0">
                {hasValidClerkKeys && user ? (
                  <UserButton 
                    appearance={{
                      elements: {
                        avatarBox: "w-8 h-8",
                      },
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-[#10a37f] to-[#0d8f6e] rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {hasValidClerkKeys && user ? (user?.firstName || 'User') : 'Demo User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {hasValidClerkKeys && user ? user?.primaryEmailAddress?.emailAddress : 'demo@example.com'}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Resize Handle */}
          <div
            className={`absolute right-0 top-0 w-2 h-full cursor-col-resize bg-transparent hover:bg-[#10a37f]/20 transition-colors group hidden md:flex items-center justify-center ${
              isResizing ? 'bg-[#10a37f]/30' : ''
            }`}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            title="Drag to resize • Double-click to toggle collapse"
          >
            <div className={`w-1 h-16 bg-border/50 group-hover:bg-[#10a37f] rounded-full transition-all duration-200 ${
              isResizing ? 'bg-[#10a37f] scale-110' : ''
            }`} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div 
        className={`${isResizing ? '' : 'md:transition-all md:duration-300'}`}
        style={{ marginLeft: typeof window !== 'undefined' && window.innerWidth >= 768 ? (isCollapsed ? 80 : sidebarWidth) : 0 }}
      >
        {/* Top Bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 hover:bg-muted rounded-xl transition-all duration-200 hover:scale-105"
          >
            <Sidebar className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 dark:bg-green-950/30 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-sm" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                {hasValidClerkKeys ? 'AI Ready' : 'Demo Mode'}
              </span>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="h-[calc(100vh-85px)] bg-gradient-to-b from-transparent to-muted/5">
          <ChatInterface 
            user={hasValidClerkKeys && user ? user : null}
            isDemo={!hasValidClerkKeys}
            chatId={currentChatId}
            onChatCreated={setCurrentChatId}
          />
        </div>
      </div>
    </div>
  );
} 