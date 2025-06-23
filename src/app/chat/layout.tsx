'use client';

import { useAuth, useUser, UserButton } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChatHistory } from '@/components/chat/ChatHistory';
import { Loader2, Sidebar } from 'lucide-react';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [sidebarOpen]);

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



  if (hasValidClerkKeys && !isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#212121] antialiased">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Stable across all chat routes */}
      <div 
        data-sidebar
        className={`fixed left-0 top-0 h-full bg-[#171717] z-50 transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'md:-translate-x-full' : 'md:translate-x-0'}`}
        style={{ width: 260 }}
      >
        <ChatHistory
          isCollapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          onMobileClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main Content Area */}
      <div 
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'md:ml-0' : 'md:ml-[260px]'
        }`}
      >
        {/* Desktop Top Bar */}
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

        {/* Mobile Top Bar */}
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

        {/* Page Content */}
        <div className="h-[calc(100vh-73px)] bg-[#212121]">
          {children}
        </div>
      </div>
    </div>
  );
} 