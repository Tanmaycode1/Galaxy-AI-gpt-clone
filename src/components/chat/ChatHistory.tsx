'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
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
  currentChatId?: string;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  isCollapsed?: boolean;
  sidebarWidth?: number;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function ChatHistory({ 
  currentChatId, 
  onChatSelect, 
  onNewChat, 
  isCollapsed = false, 
  sidebarWidth = 260,
  onCollapsedChange
}: ChatHistoryProps) {
  const { isSignedIn, userId } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Fetch chats
  const fetchChats = useCallback(async () => {
    if (!isSignedIn || !userId) return;

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

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Handle chat operations
  const handleDeleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setChats(chats.filter(chat => chat._id !== chatId));
        if (currentChatId === chatId) {
          onNewChat();
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
        setChats(chats.map(chat => 
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <div 
        className={`flex flex-col h-full text-white bg-[#171717] transition-all duration-300 ${
          isCollapsed ? 'w-12' : 'w-full'
        }`} 
        style={{ fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif' }}
      >
        {/* Header - Just logo like original */}
        <div className="flex items-center justify-between p-3 mb-3">
          <div className="flex items-center">
            <img src="/icons/favicon.ico" alt="Galaxy AI" className="w-7 h-7" />
          </div>
          <button 
            onClick={() => {
              const newCollapsed = !isCollapsed;
              onCollapsedChange?.(newCollapsed);
            }}
            className="p-1 hover:bg-white/10 rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {!isCollapsed && (
          <>
            {/* New Chat Button */}
            <div className="px-2 mb-1">
              <button
                onClick={onNewChat}
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
            <div className="space-y-0.5">
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
                      onClick={() => !isEditing && onChatSelect(chat._id)}
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
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdown(openDropdown === chat._id ? null : chat._id);
                            }}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4 text-gray-400" />
                          </button>

                          {openDropdown === chat._id && (
                            <div className="absolute right-0 top-8 bg-[#2f2f2f] border border-white/20 rounded-lg shadow-lg z-10 min-w-[120px]">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingId(chat._id);
                                  setEditTitle(chat.title);
                                  setOpenDropdown(null);
                                }}
                                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Rename</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteChat(chat._id);
                                }}
                                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
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

        {/* Click outside handler for dropdown */}
        {openDropdown && (
          <div
            className="fixed inset-0 z-5"
            onClick={() => setOpenDropdown(null)}
          />
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
                          onChatSelect(chat._id);
                          setShowSearchModal(false);
                          setSearchQuery('');
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
}