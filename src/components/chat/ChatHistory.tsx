'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  MoreHorizontal,
  X,
  Send,
  BookOpen,
  Play,
  LayoutGrid,
  CheckCircle,
  Sparkles,
  SquarePen,
  Library,
  Grid3X3
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Chat {
  _id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  userId: string;
}

interface ChatHistoryProps {
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onMobileClose?: () => void;
}

const ChatHistoryComponent = function ChatHistory({ 
  isCollapsed = false, 
  onCollapsedChange,
  onMobileClose
}: ChatHistoryProps) {
  const { isSignedIn, userId } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentChatId, setCurrentChatId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Fetch chats - only once when component mounts
  const fetchChats = useCallback(async () => {
    if (!isSignedIn || !userId) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/chats');
      if (response.ok) {
        const data = await response.json();
        setChats(data);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, userId]);

  // Track current chat from URL
  useEffect(() => {
    const path = window.location.pathname;
    const chatIdMatch = path.match(/\/chat\/([^/]+)$/);
    if (chatIdMatch) {
      setCurrentChatId(chatIdMatch[1]);
    } else {
      setCurrentChatId('');
    }
  }, [router]);

  // Only fetch chats once when component mounts or user changes
  useEffect(() => {
    fetchChats();
  }, [isSignedIn, userId]); // Removed fetchChats dependency to prevent re-fetching

  // Handle chat operations
  const handleDeleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setChats(prevChats => prevChats.filter(chat => chat._id !== chatId));
        if (currentChatId === chatId) {
          router.push('/chat');
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
    setOpenDropdown(null);
  };

  const handleRenameChat = async (chatId: string, newTitle: string) => {
    if (!newTitle.trim()) return;

    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle.trim() }),
      });

      if (response.ok) {
        setChats(prevChats => prevChats.map(chat => 
          chat._id === chatId 
            ? { ...chat, title: newTitle.trim() }
            : chat
        ));
      }
    } catch (error) {
      console.error('Error renaming chat:', error);
    }
    
    setEditingId(null);
    setEditTitle('');
  };

  // Filter chats based on search
  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.messages.some(msg => 
      msg.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );



  return (
    <>
      <div 
        className={`flex flex-col h-full text-white bg-[#171717] transition-all duration-300 ${
          isCollapsed ? 'w-12' : 'w-full'
        }`} 
        style={{ fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif' }}
      >
        {/* Header - Unified close/collapse */}
        <div className="flex items-center justify-between p-3 mb-3">
          <div className="flex items-center">
            <img src="/icons/favicon.ico" alt="Galaxy AI" className="w-7 h-7" />
          </div>
          <button 
            onClick={() => {
              // Simple logic: if we're on mobile screen size, close sidebar
              // Otherwise, toggle collapse
              if (window.innerWidth < 768) {
                onMobileClose?.();
              } else {
                const newCollapsed = !isCollapsed;
                onCollapsedChange?.(newCollapsed);
              }
            }}
            className="p-1 hover:bg-white/10 rounded-md transition-colors"
          >
            {/* Always use X icon - same for mobile and desktop */}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!isCollapsed && (
          <>
            {/* New Chat Button */}
            <div className="px-2 mb-1">
              <button
                onClick={() => {
                  router.push('/chat');
                  onMobileClose?.();
                }}
                className="flex items-center space-x-2 w-full px-2 py-1.5 text-[15px] hover:bg-white/10 rounded-lg transition-colors"
              >
                <SquarePen className="w-4 h-4" />
                <span>New chat</span>
              </button>
            </div>

            {/* Search Button */}
            <div className="px-2 mb-1">
              <button
                onClick={() => setShowSearchModal(true)}
                className="flex items-center space-x-2 w-full px-2 py-1.5 text-[15px] hover:bg-white/10 rounded-lg transition-colors text-left"
              >
                <Search className="w-4 h-4" />
                <span>Search chats</span>
              </button>
            </div>

                        {/* Library Section */}
            <div className="px-2 mb-3">
              <button className="flex items-center space-x-2 w-full px-2 py-1.5 text-[15px] hover:bg-white/10 rounded-lg transition-colors text-left">
                <Library className="w-4 h-4" />
                <span>Library</span>
              </button>
            </div>

            {/* Sora Section */}
            <div className="px-2 mb-1">
              <button className="flex items-center space-x-2 w-full px-2 py-1.5 text-[15px] hover:bg-white/10 rounded-lg transition-colors text-left">
                <Play className="w-4 h-4" />
                <span>Sora</span>
              </button>
            </div>

            {/* GPTs Section */}
            <div className="px-2 mb-4">
              <button className="flex items-center space-x-2 w-full px-2 py-1.5 text-[15px] hover:bg-white/10 rounded-lg transition-colors text-left">
                <Grid3X3 className="w-4 h-4" />
                <span>GPTs</span>
              </button>
            </div>

            {/* Chats Section Header */}
            <div className="px-2 py-1.5 mb-1">
              <h3 className="text-sm font-medium text-gray-400 tracking-wide px-2">Chats</h3>
            </div>
          </>
        )}

        {/* Chat List */}
        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto px-2">
            <div className="space-y-0.5 relative">
              {chats.map((chat) => {
                const isEditing = editingId === chat._id;
                const isActive = currentChatId === chat._id;

                return (
                  <div
                    key={chat._id}
                    className={`group relative rounded-lg transition-colors ${
                      isActive ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <div
                      className="flex items-center justify-between px-2 py-1 cursor-pointer"
                      onClick={() => {
                        if (!isEditing) {
                          router.push(`/chat/${chat._id}`);
                          // Close mobile sidebar when chat is selected
                          onMobileClose?.();
                        }
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={() => handleRenameChat(chat._id, editTitle)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleRenameChat(chat._id, editTitle);
                              } else if (e.key === 'Escape') {
                                setEditingId(null);
                                setEditTitle('');
                              }
                            }}
                            className="w-full bg-transparent border-b border-white/30 focus:outline-none text-[15px] text-white"
                            autoFocus
                          />
                        ) : (
                          <div className="text-[15px] text-white truncate">
                            {chat.title}
                          </div>
                        )}
                      </div>

                      {/* Actions Dropdown */}
                      {!isEditing && (
                        <div 
                          className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 relative"
                          onMouseEnter={(e) => {
                            console.log('Hover enter for chat:', chat._id);
                            
                            // Calculate position relative to the button
                            const buttonRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            const sidebarRect = (e.currentTarget as HTMLElement).closest('[data-sidebar]')?.getBoundingClientRect();
                            
                            if (buttonRect && sidebarRect) {
                              setDropdownPosition({
                                top: buttonRect.bottom - sidebarRect.top + 5,
                                right: sidebarRect.right - buttonRect.left - 120
                              });
                            }
                            
                            setOpenDropdown(chat._id);
                          }}
                          onMouseLeave={() => {
                            console.log('Hover leave for chat:', chat._id);
                            // Small delay to allow moving to dropdown
                            setTimeout(() => {
                              if (!document.querySelector('.dropdown-menu:hover')) {
                                setOpenDropdown(null);
                              }
                            }, 100);
                          }}
                        >
                          <div className="p-1 hover:bg-white/10 rounded transition-colors">
                            <MoreHorizontal className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {chats.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <MessageSquare className="w-8 h-8 text-gray-500 mb-2" />
                  <p className="text-sm text-gray-400">No chats yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dropdown Menu - Rendered outside to avoid conflicts */}
        {openDropdown && (
          <div 
            className="dropdown-menu absolute z-50 bg-[#2f2f2f] border border-white/20 rounded-lg shadow-lg min-w-[120px]"
            style={{
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`
            }}
            onMouseEnter={() => {
              console.log('Dropdown hover enter');
            }}
            onMouseLeave={() => {
              console.log('Dropdown hover leave');
              setOpenDropdown(null);
            }}
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Rename clicked');
                setEditingId(openDropdown);
                setEditTitle(chats.find(c => c._id === openDropdown)?.title || '');
                setOpenDropdown(null);
              }}
              className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors text-left rounded-t-lg"
            >
              <Edit3 className="w-3 h-3" />
              <span>Rename</span>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Delete clicked');
                if (openDropdown) {
                  handleDeleteChat(openDropdown);
                }
              }}
              className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left rounded-b-lg"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          </div>
        )}

        {/* Bottom Section - Upgrade Plan */}
        {!isCollapsed && (
          <div className="p-2">
            <button className="flex items-center space-x-2 w-full px-2 py-1.5 text-sm hover:bg-white/10 rounded-lg transition-colors text-left">
              <div className="w-4 h-4 rounded border border-white/30 flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">Upgrade plan</div>
                <div className="text-xs text-gray-400">More access to the best models</div>
              </div>
            </button>
          </div>
        )}


      </div>

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
          <div className="bg-[#2f2f2f] rounded-lg border border-white/20 w-full max-w-md mx-4">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium">Search chats</h3>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-white/30"
                  autoFocus
                />
              </div>

              {/* Search Results */}
              <div className="max-h-60 overflow-y-auto">
                {filteredChats.length > 0 ? (
                  <div className="space-y-1">
                    {filteredChats.map((chat) => (
                      <button
                        key={chat._id}
                        onClick={() => {
                          router.push(`/chat/${chat._id}`);
                          setShowSearchModal(false);
                          setSearchQuery('');
                          onMobileClose?.();
                        }}
                        className="w-full text-left p-3 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <div className="text-sm text-white truncate">
                          {chat.title}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    No chats found
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const ChatHistory = memo(ChatHistoryComponent, (prevProps, nextProps) => {
  // Only re-render if isCollapsed changes - ignore everything else
  return prevProps.isCollapsed === nextProps.isCollapsed;
});