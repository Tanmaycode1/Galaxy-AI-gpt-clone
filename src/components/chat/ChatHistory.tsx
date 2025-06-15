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
  Clock,
  Calendar,
  ChevronDown,
  User,
  Bot
} from 'lucide-react';
import Image from 'next/image';
import { format, isToday, isYesterday, isThisWeek, isThisMonth, subDays } from 'date-fns';

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
}

export function ChatHistory({ 
  currentChatId, 
  onChatSelect, 
  onNewChat, 
  isCollapsed = false, 
  sidebarWidth = 320 
}: ChatHistoryProps) {
  const { isSignedIn, userId } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Real-time responsive breakpoints based on actual sidebar width
  const getBreakpoint = useCallback(() => {
    if (isCollapsed) return 'collapsed';
    if (sidebarWidth < 300) return 'xs';
    if (sidebarWidth < 350) return 'sm';
    if (sidebarWidth < 450) return 'md';
    return 'lg';
  }, [isCollapsed, sidebarWidth]);

  const breakpoint = getBreakpoint();

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

  // Group chats by time periods
  const groupChatsByTime = (chats: Chat[]) => {
    const now = new Date();
    const groups: { [key: string]: Chat[] } = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'This Month': [],
      'Older': []
    };

    chats.forEach(chat => {
      const chatDate = new Date(chat.updatedAt);
      
      if (isToday(chatDate)) {
        groups['Today'].push(chat);
      } else if (isYesterday(chatDate)) {
        groups['Yesterday'].push(chat);
      } else if (isThisWeek(chatDate)) {
        groups['This Week'].push(chat);
      } else if (isThisMonth(chatDate)) {
        groups['This Month'].push(chat);
      } else {
        groups['Older'].push(chat);
      }
    });

    return groups;
  };

  // Filter chats based on search
  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.messages.some(msg => 
      msg.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const groupedChats = groupChatsByTime(filteredChats);

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

  // Responsive text helpers
  const getDateFormat = (date: Date) => {
    switch (breakpoint) {
      case 'xs': return format(date, 'd');
      case 'sm': return format(date, 'M/d');
      case 'md': return format(date, 'MMM d');
      default: return format(date, 'MMM d');
    }
  };

  const getTimeFormat = (date: Date) => {
    switch (breakpoint) {
      case 'xs': return format(date, 'H:mm');
      case 'sm': return format(date, 'H:mm');
      case 'md': return format(date, 'h:mm');
      default: return format(date, 'h:mm a');
    }
  };

  const getMessageCount = (count: number) => {
    switch (breakpoint) {
      case 'xs': return count.toString();
      case 'sm': return count.toString();
      case 'md': return `${count} msg${count !== 1 ? 's' : ''}`;
      default: return `${count} message${count !== 1 ? 's' : ''}`;
    }
  };

  const getPreviewLength = () => {
    switch (breakpoint) {
      case 'xs': return 15;
      case 'sm': return 25;
      case 'md': return 40;
      default: return 60;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Collapsed view (icons only)
  if (isCollapsed) {
    return (
      <div className="flex flex-col h-full">
        {/* Logo Header - Collapsed */}
        <div className="p-2 flex justify-center">
          <Image
            src="/icons/favicon.ico"
            alt="Galaxy AI"
            width={20}
            height={20}
            className="rounded-sm"
          />
        </div>
        
        {/* New Chat Button - Collapsed */}
        <div className="p-2">
          <button
            onClick={onNewChat}
            className="w-full p-3 hover:bg-muted rounded-xl transition-all group"
            title="New Chat"
          >
            <div className="w-5 h-5 border-2 border-foreground/60 rounded-full flex items-center justify-center group-hover:rotate-90 transition-transform mx-auto">
              <Plus className="w-3 h-3" />
            </div>
          </button>
        </div>

        {/* Chat List - Collapsed */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {filteredChats.slice(0, 10).map((chat) => (
            <button
              key={chat._id}
              onClick={() => onChatSelect(chat._id)}
              className={`w-full p-3 rounded-xl transition-all hover:bg-muted/80 ${
                currentChatId === chat._id 
                  ? 'bg-primary/10 border-l-2 border-primary' 
                  : ''
              }`}
              title={chat.title}
            >
              <MessageSquare className="w-4 h-4 mx-auto" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Expanded view
  return (
    <div className="flex flex-col h-full">
      {/* New Chat Button - Expanded */}
      <div className={breakpoint === 'xs' ? 'p-2' : 'p-4'}>
        <button
          onClick={onNewChat}
          className="flex items-center justify-center space-x-3 w-full p-3 text-sm font-medium text-foreground bg-gradient-to-r from-muted/50 to-muted/30 hover:from-muted/70 hover:to-muted/50 rounded-xl transition-all group shadow-sm hover:shadow-md"
        >
          <div className="w-5 h-5 border-2 border-foreground/60 rounded-full flex items-center justify-center group-hover:rotate-90 transition-transform">
            <Plus className="w-3 h-3" />
          </div>
          {breakpoint !== 'xs' && <span>New Chat</span>}
        </button>
      </div>

             {/* Search - Always visible */}
       <div className={`${breakpoint === 'xs' ? 'px-2 pb-2' : 'px-4 pb-4'}`}>
         <div className="relative">
           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
           <input
             type="text"
             placeholder={breakpoint === 'xs' ? 'Search...' : 'Search chats...'}
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
           />
         </div>
       </div>

      {/* Chat List - Expanded */}
      <div className="flex-1 overflow-y-auto">
        <div className={`space-y-1 ${breakpoint === 'xs' ? 'px-1' : 'px-2'}`}>
          {Object.entries(groupedChats).map(([timeGroup, groupChats]) => {
            if (groupChats.length === 0) return null;

            return (
              <div key={timeGroup}>
                {/* Section Header - Only show on larger breakpoints */}
                {['md', 'lg'].includes(breakpoint) && (
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider flex items-center">
                    <span>{timeGroup}</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-border/50 to-transparent ml-3"></div>
                  </div>
                )}

                {groupChats.map((chat) => {
                  const lastMessage = chat.messages[chat.messages.length - 1];
                  const isEditing = editingId === chat._id;

                  return (
                    <div
                      key={chat._id}
                      className={`group relative rounded-xl transition-all ${
                        currentChatId === chat._id
                          ? 'bg-gradient-to-r from-primary/10 to-primary/5 border-l-2 border-primary shadow-sm'
                          : 'hover:bg-muted/60'
                      }`}
                    >
                      <div
                        className="flex items-center justify-between p-3 cursor-pointer"
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
                              className="w-full bg-transparent border-b border-primary focus:outline-none text-sm font-semibold"
                              autoFocus
                            />
                          ) : (
                            <>
                              {/* Chat Title */}
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-semibold text-foreground truncate flex-1 pr-2">
                                  {chat.title}
                                </p>
                                <span className="text-xs text-muted-foreground/70 flex-shrink-0">
                                  {getDateFormat(new Date(chat.updatedAt))}
                                </span>
                              </div>

                              {/* Last Message Preview - Only show on larger breakpoints */}
                              {lastMessage && ['sm', 'md', 'lg'].includes(breakpoint) && (
                                <p className="text-xs text-muted-foreground/80 truncate leading-relaxed mb-1">
                                  {['md', 'lg'].includes(breakpoint) && (
                                    <span className="font-medium">
                                      {lastMessage.role === 'user' ? 'You: ' : 'AI: '}
                                    </span>
                                  )}
                                  {lastMessage.content.substring(0, getPreviewLength())}
                                  {lastMessage.content.length > getPreviewLength() ? '...' : ''}
                                </p>
                              )}

                              {/* Chat Metadata */}
                              <div className="flex items-center justify-between text-xs text-muted-foreground/60">
                                <span>{getMessageCount(chat.messages.length)}</span>
                                <span>{getTimeFormat(new Date(chat.updatedAt))}</span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Actions Dropdown - Show on all breakpoints */}
                        {!isEditing && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdown(openDropdown === chat._id ? null : chat._id);
                              }}
                              className="p-1 hover:bg-muted rounded-md transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {openDropdown === chat._id && (
                              <div className="absolute right-0 top-8 bg-popover border border-border rounded-lg shadow-lg z-10 min-w-[120px]">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingId(chat._id);
                                    setEditTitle(chat.title);
                                    setOpenDropdown(null);
                                  }}
                                  className="flex items-center space-x-2 w-full px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Rename</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteChat(chat._id);
                                  }}
                                  className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
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
              </div>
            );
          })}
        </div>

        {filteredChats.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No chats found' : 'No chats yet'}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {searchQuery ? 'Try a different search term' : 'Start a new conversation'}
            </p>
          </div>
        )}
      </div>

      {/* Click outside handler for dropdown */}
      {openDropdown && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setOpenDropdown(null)}
        />
      )}
    </div>
  );
} 