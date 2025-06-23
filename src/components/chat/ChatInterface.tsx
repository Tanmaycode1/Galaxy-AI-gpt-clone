'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useChat } from 'ai/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, X, Settings, Copy, Loader2, RotateCcw, Edit, Trash2, Globe, RefreshCw } from 'lucide-react';
import { ModelSelector } from './ModelSelector';
import { Message } from 'ai';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatInterfaceProps {
  user?: {
    firstName?: string | null;
    imageUrl?: string;
  } | null;
  isDemo?: boolean;
  chatId?: string;
  onChatCreated?: (chatId: string) => void;
}

interface UploadedFile {
  url: string;
  name: string;
  type: string;
  size: number;
  file?: File;
  uploading?: boolean;
}

// Image Modal Component
const ImageModal = ({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="relative max-w-4xl max-h-4xl p-4">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
};

// PDF Modal Component
const PDFModal = ({ src, name, onClose }: { src: string; name: string; onClose: () => void }) => {
  const [pdfError, setPdfError] = React.useState(false);
  const [useProxy, setUseProxy] = React.useState(false);
  
  // Create proxy URL for PDF viewing
  const getProxyUrl = (originalUrl: string) => {
    return `/api/pdf-proxy?url=${encodeURIComponent(originalUrl)}`;
  };
  
  // Try different PDF viewing methods
  const tryAlternativeViewer = () => {
    // Try using Google Docs viewer as fallback
    const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(src)}&embedded=true`;
    return googleDocsUrl;
  };
  
  React.useEffect(() => {
    // Check if this is a raw PDF from Cloudinary - these need special handling
    if (src.includes('/raw/upload/')) {
      console.log('Raw PDF detected, using proxy for viewing');
      setUseProxy(true);
    } else {
      // First try direct access, then fall back to proxy
      const checkPdfAccess = async () => {
        try {
          const response = await fetch(src, { method: 'HEAD' });
          if (!response.ok && (response.status === 401 || response.status === 403)) {
            console.log('PDF direct access denied, trying proxy');
            setUseProxy(true);
          }
        } catch (error) {
          console.log('Error checking PDF access, trying proxy:', error);
          setUseProxy(true);
        }
      };
      
      checkPdfAccess();
    }
  }, [src]);
  
  const pdfUrl = useProxy ? getProxyUrl(src) : src;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="relative w-full h-full max-w-6xl max-h-6xl p-4">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="w-full h-full bg-white rounded-lg overflow-hidden">
          {pdfError ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">PDF Preview Not Available</h3>
              <p className="text-gray-600 mb-4">Unable to preview this PDF due to access restrictions.</p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    window.open(tryAlternativeViewer(), '_blank');
                  }}
                  className="block w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                >
                  Try Google Docs Viewer
                </button>
                <a 
                  href={src} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                >
                  Open PDF in New Tab
                </a>
                <a 
                  href={src} 
                  download={name}
                  className="block bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                >
                  Download PDF
                </a>
              </div>
            </div>
          ) : (
            <iframe
              src={pdfUrl}
              className="w-full h-full"
              title={name}
              onClick={(e) => e.stopPropagation()}
              onError={() => {
                console.log('PDF iframe failed to load:', pdfUrl);
                if (!useProxy) {
                  console.log('Trying proxy instead...');
                  setUseProxy(true);
                } else {
                  setPdfError(true);
                }
              }}
              onLoad={(e) => {
                console.log('PDF iframe loaded successfully:', pdfUrl);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export function ChatInterface({ user, isDemo = false, chatId, onChatCreated }: ChatInterfaceProps) {
  const [selectedModelId, setSelectedModelId] = useState<string>('gpt-4-turbo');
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>('');
  
  // Debug: Log chatId prop changes
  console.log('ChatInterface render - chatId prop:', chatId, 'currentChatId:', currentChatId);
  const [models, setModels] = useState<any[]>([]);
  const [modalImage, setModalImage] = useState<{ src: string; alt: string } | null>(null);
  const [modalPdf, setModalPdf] = useState<{ src: string; name: string } | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showRegenerateOptions, setShowRegenerateOptions] = useState<string | null>(null);
  const [showToolsDropdown, setShowToolsDropdown] = useState<boolean>(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  const [inputAreaHeight, setInputAreaHeight] = useState<number>(0);

  // Store the latest chat ID from response headers
  const latestChatIdRef = useRef<string | null>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    setMessages,
    reload,
    status,
    append,
  } = useChat({
    api: '/api/chat',
    body: {
      modelId: selectedModelId,
      chatId: currentChatId,
      saveToChat: true,
    },
    onResponse: async (response) => {
      const newChatId = response.headers.get('x-chat-id');
      
      if (newChatId && !currentChatId) {
        console.log('New chat created, ID received:', newChatId);
        latestChatIdRef.current = newChatId;
        setCurrentChatId(newChatId);
        // DON'T redirect here - let user see the streaming first
      }
    },
    onFinish: async (message) => {
      const chatIdToUse = latestChatIdRef.current || currentChatId;
      
      if (chatIdToUse && message) {
        try {
          const response = await fetch(`/api/chats/${chatIdToUse}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              addMessage: {
                id: message.id,
                role: message.role,
                content: message.content,
                timestamp: new Date(),
              }
            }),
          });
        } catch (error) {
          console.error('Failed to save chat after streaming:', error);
        }
      }

      // Smooth redirect AFTER streaming is complete for new chats
      if (latestChatIdRef.current && !chatId) {
        console.log('Streaming complete, redirecting to new chat:', latestChatIdRef.current);
        setTimeout(() => {
          onChatCreated?.(latestChatIdRef.current!);
        }, 1500); // 1.5 second delay to let user appreciate the response
      }
    },
    onError: (error) => {
      console.error('useChat onError:', error);
      setSelectedFiles([]);
    },
    // Clear any previous messages for new chats
    initialMessages: chatId ? undefined : [],
  });

  // Load models on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await fetch('/api/chat');
        if (response.ok) {
          const modelsData = await response.json();
          setModels(modelsData);
          
          if (!selectedModelId && modelsData.length > 0) {
            setSelectedModelId(modelsData[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to load models:', error);
      }
    };
    
    loadModels();
  }, [selectedModelId]);

  // Load existing chat if chatId is provided, or ensure clean state for new chats
  useEffect(() => {
    if (chatId && chatId !== currentChatId) {
      console.log('Loading existing chat:', chatId);
      loadChat(chatId);
    } else if (!chatId) {
      console.log('New chat mode - ensuring clean state');
      // Ensure completely clean state for new chats
      setMessages([]);
      setCurrentChatId('');
      setSelectedFiles([]);
      latestChatIdRef.current = null;
    }
  }, [chatId]);

  const loadChat = async (chatIdToLoad: string) => {
    try {
      console.log('Fetching chat data from API:', chatIdToLoad);
      const response = await fetch(`/api/chats/${chatIdToLoad}`);
      console.log('API response status:', response.status);
      if (response.ok) {
        const chatData = await response.json();
        console.log('Chat data received:', { 
          messagesCount: chatData.messages?.length || 0, 
          title: chatData.title,
          modelId: chatData.modelId 
        });
        setMessages(chatData.messages || []);
        setSelectedModelId(chatData.modelId || 'gpt-4-turbo');
        setCurrentChatId(chatIdToLoad);
      } else {
        console.error('Failed to fetch chat:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to load chat:', error);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea and update input area height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
    
    // Update input area height for dynamic spacing
    if (inputAreaRef.current) {
      const height = inputAreaRef.current.offsetHeight;
      setInputAreaHeight(height);
    }
  }, [input, selectedFiles]);

  // Close regenerate options and tools dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showRegenerateOptions) {
        setShowRegenerateOptions(null);
      }
      if (showToolsDropdown) {
        setShowToolsDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showRegenerateOptions, showToolsDropdown]);

  const selectedModel = models.find(m => m.id === selectedModelId);
  const supportsImages = selectedModel?.image;

  // Handle file selection and upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      // Check if image is supported by current model
      if (file.type.startsWith('image/') && !supportsImages) {
        alert('Current model does not support image uploads. Please select a vision-enabled model.');
        continue;
      }

      // Add file to selected files with uploading state
      const fileWithMeta: UploadedFile = {
        url: URL.createObjectURL(file),
        name: file.name,
        type: file.type,
        size: file.size,
        file: file,
        uploading: true,
      };

      setSelectedFiles(prev => [...prev, fileWithMeta]);

      // Upload file
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const result = await response.json();

        // Update file with uploaded URL (PDFs stay as PDFs in UI)
        console.log('Upload result for', file.name, ':', {
          url: result.url,
          format: result.format
        });
        
        setSelectedFiles(prev => prev.map(f => 
          f.file === file 
            ? { 
                ...f, 
                url: result.url, 
                uploading: false
              }
            : f
        ));
      } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload file. Please try again.');
        // Remove failed upload
        setSelectedFiles(prev => prev.filter(f => f.file !== file));
      }
    }

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove file
  const removeFile = (index: number) => {
    const file = selectedFiles[index];
    if (file.url.startsWith('blob:')) {
      URL.revokeObjectURL(file.url);
    }
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle form submission
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() && selectedFiles.length === 0) return;
    
    // Check if any files are still uploading
    const uploadingFiles = selectedFiles.filter(f => f.uploading);
    if (uploadingFiles.length > 0) {
      alert('Please wait for all files to finish uploading.');
      return;
    }

    // Simple clean approach - just user message and attachments
    const userMessage = input.trim();

    // Prepare attachments (include ALL files, including PDFs)
    const attachments = selectedFiles.map(file => ({
      url: file.url,
      name: file.name,
      contentType: file.type,
      type: file.type,
    }));

    console.log('Prepared attachments:', attachments);
    console.log('Selected files:', selectedFiles);
    console.log('User message to send:', userMessage);
    console.log('About to call append with:', {
      content: userMessage,
      attachments: attachments,
      attachmentsCount: attachments.length
    });

    // Clear input field and selected files immediately
    if (textareaRef.current) {
      textareaRef.current.value = '';
    }
    handleInputChange({ target: { value: '' } } as any);
    
    selectedFiles.forEach(file => {
      if (file.url.startsWith('blob:')) {
        URL.revokeObjectURL(file.url);
      }
    });
    setSelectedFiles([]);

    // Use append function directly - simple and clean
    e.preventDefault();
    
    try {
      // Send user message with attachments (PDFs are now converted to images)
      await append({
        role: 'user',
        content: userMessage,
      }, {
        experimental_attachments: attachments.length > 0 ? attachments : undefined,
      });
      console.log('Append completed successfully');
    } catch (error) {
      console.error('Append failed:', error);
    }
  };

  // Handle key down for textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && (input.trim() || selectedFiles.length > 0)) {
        onSubmit(e as any);
      }
    }
  };

  // Handle regenerate with different model
  const handleRegenerate = async (messageIndex: number, newModelId?: string) => {
    const targetModel = newModelId || selectedModelId;
    setShowRegenerateOptions(null);
    
    // Get all messages up to the one we want to regenerate
    const messagesToKeep = messages.slice(0, messageIndex);
    setMessages(messagesToKeep);
    
    // Change model if specified
    if (newModelId && newModelId !== selectedModelId) {
      setSelectedModelId(newModelId);
    }
    
    // Regenerate from the last user message
    const lastUserMessage = messagesToKeep[messagesToKeep.length - 1];
    if (lastUserMessage) {
      reload();
    }
  };

  // Handle message deletion
  const handleDeleteMessage = (messageIndex: number) => {
    const updatedMessages = messages.filter((_, index) => index !== messageIndex);
    setMessages(updatedMessages);
  };

  // Handle message editing
  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  };

  const handleSaveEdit = async (messageIndex: number) => {
    if (!editContent.trim()) return;
    
    const message = messages[messageIndex];
    const isUserMessage = message.role === 'user';
    
    // Update the message content
    const updatedMessages = [...messages];
    updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], content: editContent.trim() };
    
    // If editing user message, remove subsequent AI response and regenerate
    if (isUserMessage) {
      // Remove all messages after this user message
      const messagesToKeep = updatedMessages.slice(0, messageIndex + 1);
      setMessages(messagesToKeep);
      setEditingMessageId(null);
      setEditContent('');
      
      // Update database with edited message
      if (currentChatId) {
        try {
          await fetch(`/api/chats/${currentChatId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              updateMessage: {
                id: message.id,
                content: editContent.trim()
              }
            }),
          });
        } catch (error) {
          console.error('Failed to update message:', error);
        }
      }
      
      // Trigger regeneration
      setTimeout(() => reload(), 100);
    } else {
      // For assistant messages, just update locally
      setMessages(updatedMessages);
      setEditingMessageId(null);
      setEditContent('');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  // Handle deleting user message and subsequent AI response
  const handleDeleteUserMessage = async (messageIndex: number) => {
    const message = messages[messageIndex];
    
    // Find the next assistant message after this user message
    let messagesToRemove = [messageIndex];
    if (messageIndex + 1 < messages.length && messages[messageIndex + 1].role === 'assistant') {
      messagesToRemove.push(messageIndex + 1);
    }
    
    // Remove messages from state
    const updatedMessages = messages.filter((_, index) => !messagesToRemove.includes(index));
    setMessages(updatedMessages);
    
    // Update database
    if (currentChatId) {
      try {
        const messageIdsToDelete = messagesToRemove.map(idx => messages[idx].id);
        await fetch(`/api/chats/${currentChatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            deleteMessages: messageIdsToDelete
          }),
        });
      } catch (error) {
        console.error('Failed to delete messages:', error);
      }
    }
  };

  // Handle try again with current model
  const handleTryAgain = () => {
    setShowToolsDropdown(false);
    if (messages.length > 0) {
      const lastUserMessage = messages[messages.length - 2]; // Get the user message before last assistant message
      if (lastUserMessage && lastUserMessage.role === 'user') {
        // Remove the last assistant message and regenerate
        const messagesWithoutLast = messages.slice(0, -1);
        setMessages(messagesWithoutLast);
        reload();
      }
    }
  };

  // Handle model switch
  const handleModelSwitch = (modelId: string) => {
    setSelectedModelId(modelId);
    setShowToolsDropdown(false);
  };

  // Get model description for display
  const getModelDescription = (modelId: string) => {
    const descriptions: { [key: string]: string } = {
      'gpt-4-turbo': 'Great for most tasks',
      'gpt-4': 'Great for most tasks',
      'gpt-4o': 'Great for most tasks',
      'gpt-4o-mini': 'Faster for everyday tasks',
      'o1-mini': 'Fastest at advanced reasoning',
      'o1-preview': 'Best at advanced reasoning',
      'claude-3-sonnet': 'Balanced performance',
      'claude-3-opus': 'Most capable',
      'claude-3-haiku': 'Fast and efficient',
    };
    return descriptions[modelId] || 'AI model';
  };

  const userName = user?.firstName || 'You';
  const hasUploadingFiles = selectedFiles.some(f => f.uploading);

  // Custom markdown components for code blocks
  const markdownComponents = {
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      
      if (!inline && language) {
        return (
          <div className="relative group my-4 bg-[#1a1a1a] rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1a]">
              <span className="text-sm text-gray-300 font-medium">{language}</span>
              <button
                onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-2 py-1 hover:bg-gray-700/50 rounded text-sm text-gray-300 hover:text-white"
                title="Copy code"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
            </div>
            <SyntaxHighlighter
              style={oneDark}
              language={language}
              PreTag="div"
              customStyle={{
                margin: 0,
                borderRadius: 0,
                background: '#1a1a1a',
                border: 'none',
                fontSize: '14px',
                lineHeight: '1.6',
                padding: '16px',
              }}
              codeTagProps={{
                style: {
                  background: 'transparent',
                  fontSize: 'inherit',
                }
              }}
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          </div>
        );
      }
      
      // Inline code
      return (
        <code 
          className="bg-gray-700 text-gray-100 px-1.5 py-0.5 rounded text-sm font-mono" 
          {...props}
        >
          {children}
        </code>
      );
    },
    pre: ({ children }: any) => {
      return <>{children}</>;
    },
  };

  return (
    <div className="flex flex-col h-full bg-[#212121] relative">
      {/* Image Modal */}
      {modalImage && (
        <ImageModal
          src={modalImage.src}
          alt={modalImage.alt}
          onClose={() => setModalImage(null)}
        />
      )}

      {/* PDF Modal */}
      {modalPdf && (
        <PDFModal
          src={modalPdf.src}
          name={modalPdf.name}
          onClose={() => setModalPdf(null)}
        />
      )}

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto"
        style={{ 
          paddingBottom: messages.length === 0 ? 0 : Math.max(inputAreaHeight + 32, 208) + 'px' 
        }}
      >
        {messages.length === 0 && !chatId ? (
          /* Empty State - Only show for new chats */
          <div className="flex flex-col items-center justify-center h-full px-4 pb-64">
            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-normal text-gray-200 mb-8">
                What are you working on?
              </h1>
            </div>
          </div>
        ) : messages.length > 0 ? (
          /* Messages */
          <div className="w-full">
            {messages.map((message, index) => {
              const messageWithAttachments = message as any;
              // Handle both experimental_attachments (new messages) and attachments (from database)
              const attachments = messageWithAttachments.experimental_attachments || messageWithAttachments.attachments || [];
              const hasAttachments = attachments && attachments.length > 0;
            
              return (
                <div 
                  key={message.id} 
                  className="group w-full py-4 md:py-8 px-3 md:px-4 relative"
                  onMouseEnter={() => setHoveredMessageId(message.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  <div className="max-w-full md:max-w-3xl mx-auto">
                    {message.role === 'user' ? (
                      /* User Message */
                      <div className="flex flex-col items-end relative">
                        {/* Display attached files outside bubble */}
                        {hasAttachments && (
                          <div className="mb-2 flex flex-wrap gap-2 justify-end">
                            {attachments.map((attachment: any, attachIndex: number) => {
                              const isImage = attachment.contentType?.startsWith('image/') || 
                                            attachment.type?.startsWith('image/') ||
                                            (attachment.url && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(attachment.url));
                              const isPdf = attachment.contentType === 'application/pdf' || 
                                          attachment.type === 'application/pdf' ||
                                          (attachment.url && /\.pdf(\?|$)/i.test(attachment.url));

                              if (isImage) {
                                return (
                                  <div key={attachIndex} className="relative">
                                    <img
                                      src={attachment.url}
                                      alt={attachment.name || 'Uploaded image'}
                                      className="max-w-[250px] max-h-[250px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity shadow-lg"
                                      onClick={() => setModalImage({ src: attachment.url, alt: attachment.name || 'Uploaded image' })}
                                      onError={(e) => {
                                        console.error('Failed to load image:', attachment.url);
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                );
                              } else if (isPdf) {
                                return (
                                  <div key={attachIndex} className="relative">
                                    <div 
                                      className="bg-[#3f3f3f] rounded-xl p-3 cursor-pointer hover:bg-[#4f4f4f] transition-colors border border-white/10 hover:border-white/20 max-w-[300px]"
                                      onClick={() => setModalPdf({ src: attachment.url, name: attachment.name || 'PDF' })}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                          </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-white text-sm font-medium truncate">
                                            {attachment.name || 'Document.pdf'}
                                          </div>
                                          <div className="text-gray-400 text-xs">
                                            PDF
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        )}
                        
                        {/* Text bubble */}
                        {message.content && (
                          <div className="bg-[#2f2f2f] rounded-3xl px-4 md:px-5 py-3 max-w-[85%] md:max-w-[70%]">
                            {editingMessageId === message.id ? (
                              <div className="text-white text-base leading-6">
                                <textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="w-full bg-transparent text-white resize-none border-none outline-none"
                                  rows={3}
                                  autoFocus
                                />
                                <div className="flex items-center gap-2 mt-2">
                                  <button
                                    onClick={() => handleSaveEdit(index)}
                                    className="px-3 py-1 bg-white text-black rounded text-sm hover:bg-gray-200 transition-colors"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="px-3 py-1 text-white rounded text-sm hover:bg-white/10 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-white text-base leading-6">
                                <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Message Actions - Under message like in screenshot */}
                        {hoveredMessageId === message.id && editingMessageId !== message.id && (
                          <div className="absolute -bottom-8 right-4 flex items-center gap-1">
                            <button
                              onClick={() => navigator.clipboard.writeText(message.content)}
                              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                              title="Copy"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditMessage(message.id, message.content)}
                              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUserMessage(index)}
                              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Assistant Message */
                      <div className="w-full relative">
                        {/* Display attached files for assistant messages (if any) */}
                        {hasAttachments && (
                          <div className="mb-2 flex flex-wrap gap-2">
                            {attachments.map((attachment: any, attachIndex: number) => {
                              const isImage = attachment.contentType?.startsWith('image/') || 
                                            attachment.type?.startsWith('image/') ||
                                            (attachment.url && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(attachment.url));
                              const isPdf = attachment.contentType === 'application/pdf' || 
                                          attachment.type === 'application/pdf' ||
                                          (attachment.url && /\.pdf(\?|$)/i.test(attachment.url));

                              if (isImage) {
                                return (
                                  <div key={attachIndex} className="relative">
                                    <img
                                      src={attachment.url}
                                      alt={attachment.name || 'Image'}
                                      className="max-w-[350px] max-h-[350px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity shadow-lg"
                                      onClick={() => setModalImage({ src: attachment.url, alt: attachment.name || 'Image' })}
                                      onError={(e) => {
                                        console.error('Failed to load image:', attachment.url);
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                );
                              } else if (isPdf) {
                                return (
                                  <div key={attachIndex} className="relative">
                                    <div 
                                      className="bg-[#2f2f2f] rounded-xl p-3 cursor-pointer hover:bg-[#3f3f3f] transition-colors border border-white/10 hover:border-white/20 max-w-[300px]"
                                      onClick={() => setModalPdf({ src: attachment.url, name: attachment.name || 'PDF' })}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                          </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-white text-sm font-medium truncate">
                                            {attachment.name || 'Document.pdf'}
                                          </div>
                                          <div className="text-gray-400 text-xs">
                                            PDF
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        )}
                        
                        {/* Display text content */}
                        {message.content && (
                          <div className="text-white text-base leading-7">
                            <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
                          </div>
                        )}

                        {/* Message Actions - Under message like in screenshot */}
                        {hoveredMessageId === message.id && (
                          <div className="absolute -bottom-8 left-0 flex items-center gap-1">
                            <button
                              onClick={() => navigator.clipboard.writeText(message.content)}
                              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                              title="Copy"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            
                            {/* Regenerate Button Group */}
                            <div className="flex items-center bg-white/5 rounded-lg">
                              <button
                                onClick={() => handleRegenerate(index)}
                                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-l-lg transition-colors"
                                title="Try again"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setShowRegenerateOptions(showRegenerateOptions === message.id ? null : message.id)}
                                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-r-lg border-l border-white/10 transition-colors"
                                title="Try again with different model"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Regenerate Options */}
                        {showRegenerateOptions === message.id && (
                          <div className="absolute left-8 top-0 bg-[#2f2f2f] rounded-xl shadow-2xl border border-white/10 py-2 w-[200px] z-20">
                            {/* Switch Model Section */}
                            <div className="px-3 py-1">
                              <div className="text-white text-sm font-medium mb-2 px-1">Switch model</div>
                              
                              {/* Auto Option */}
                              <button
                                onClick={() => {
                                  handleRegenerate(index, 'auto');
                                  setShowRegenerateOptions(null);
                                }}
                                className="w-full text-left p-2 hover:bg-white/5 rounded-lg transition-colors"
                              >
                                <div className="text-white font-medium text-sm">Auto</div>
                              </button>
                              
                              {/* Model Options */}
                              {models.map((model) => (
                                <button
                                  key={model.id}
                                  onClick={() => {
                                    handleRegenerate(index, model.id);
                                    setShowRegenerateOptions(null);
                                  }}
                                  className={`w-full text-left p-2 hover:bg-white/5 rounded-lg transition-colors group ${
                                    selectedModelId === model.id ? 'bg-white/5' : ''
                                  }`}
                                >
                                  <div className="text-white font-medium text-sm">{model.name}</div>
                                  <div className="text-gray-400 text-xs mt-0.5">
                                    {model.description || getModelDescription(model.id)}
                                  </div>
                                </button>
                              ))}
                            </div>

                            {/* Divider */}
                            <div className="border-t border-white/10 my-1"></div>

                            {/* Try Again Section */}
                            <button
                              onClick={() => {
                                handleRegenerate(index);
                                setShowRegenerateOptions(null);
                              }}
                              className="w-full text-left p-2 mx-1 hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2"
                            >
                              <RotateCcw className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="text-white font-medium text-sm">Try again</div>
                                <div className="text-gray-400 text-xs">{selectedModel?.name || 'Current model'}</div>
                              </div>
                            </button>

                            {/* Search the web */}
                            <button
                              onClick={() => {
                                setShowRegenerateOptions(null);
                                alert('Web search feature coming soon!');
                              }}
                              className="w-full text-left p-2 mx-1 hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0 9c-5 0-9-4-9-9s4-9 9-9m0 9v9" />
                              </svg>
                              <div className="text-white font-medium text-sm">Search the web</div>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Thinking Animation */}
            {status === 'submitted' && (
              <div className="w-full py-4 md:py-8 px-3 md:px-4">
                <div className="max-w-full md:max-w-3xl mx-auto">
                  <div className="text-white">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        ) : (
          /* Empty existing chat - no messages UI, just empty space */
          <div className="w-full">
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className={`w-full bg-[#212121] ${
        messages.length === 0 && !chatId ? 'absolute bottom-1/2 left-0 right-0 transform translate-y-1/2' : 'absolute bottom-0 left-0 right-0'
      }`}>
        <div 
          ref={inputAreaRef}
          className="group w-full py-4 md:py-8 px-3 md:px-4 relative"
        >
                      <div className={`${
            messages.length === 0 && !chatId ? 'max-w-4xl' : 'max-w-3xl'
          } mx-auto`}>
          <form onSubmit={onSubmit} className="w-full">
            <div className="bg-[#2f2f2f] rounded-[30px] p-4">
              {/* File Previews - Show inside input area */}
              {selectedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      {file.type.startsWith('image/') ? (
                        <div className="relative">
                          <div 
                            className="w-16 h-16 rounded-2xl overflow-hidden border border-white/20 cursor-pointer hover:border-white/40 transition-colors"
                            onClick={() => !file.uploading && setModalImage({ src: file.url, alt: file.name })}
                          >
                            <img 
                              src={file.url} 
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                            {file.uploading && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Loader2 className="w-4 h-4 text-white animate-spin" />
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-white text-black rounded-full flex items-center justify-center text-xs hover:bg-gray-200 transition-colors shadow-sm"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : file.type === 'application/pdf' ? (
                        <div className="relative">
                          <div 
                            className="bg-[#3f3f3f] rounded-xl p-3 cursor-pointer hover:bg-[#4f4f4f] transition-colors border border-white/10 hover:border-white/20 max-w-[250px]"
                            onClick={() => !file.uploading && setModalPdf({ src: file.url, name: file.name })}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                </svg>
                                {file.uploading && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-white text-sm font-medium truncate">
                                  {file.name}
                                </div>
                                <div className="text-gray-400 text-xs">
                                  PDF
                                </div>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-white text-black rounded-full flex items-center justify-center text-xs hover:bg-gray-200 transition-colors shadow-sm"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 pr-8">
                          <Paperclip className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-white truncate max-w-[100px]">{file.name}</span>
                          {file.uploading && (
                            <Loader2 className="w-3 h-3 text-white animate-spin ml-1" />
                          )}
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute right-1 top-1 w-4 h-4 bg-white text-black rounded-full flex items-center justify-center text-xs hover:bg-gray-200 transition-colors"
                          >
                            <X className="w-2 h-2" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Text Input Row */}
              <div className="mb-3">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={messages.length === 0 && !chatId ? "Ask anything" : "Message Galaxy AI"}
                  className="w-full bg-transparent text-white placeholder-gray-400 resize-none min-h-[24px] max-h-[200px] text-base leading-6"
                  rows={1}
                  disabled={isLoading}
                  style={{ 
                    fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif',
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none'
                  }}
                />
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between">
                {/* Left Side Buttons */}
                <div className="flex items-center gap-2">
                  {/* Plus Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 text-white hover:text-gray-300 hover:bg-white/10 rounded-lg transition-colors"
                    title="Attach files"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>

                  {/* Tools Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowToolsDropdown(!showToolsDropdown);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-white hover:text-gray-300 hover:bg-white/10 rounded-lg transition-colors text-sm whitespace-nowrap"
                      title="Tools"
                      style={{ fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                      </svg>
                      <span>Tools</span>
                    </button>

                    {/* Tools Dropdown */}
                    {showToolsDropdown && (
                      <div 
                        className="absolute bottom-full left-0 mb-2 bg-[#2f2f2f] rounded-xl shadow-2xl border border-white/10 py-1 min-w-[240px] z-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Switch Model Section */}
                        <div className="px-2 py-1">
                          <div className="text-white text-xs font-medium mb-2 px-2">Switch model</div>
                          
                          {/* Auto Option */}
                          <button
                            onClick={() => handleModelSwitch('auto')}
                            className="w-full text-left p-2 hover:bg-white/5 rounded-lg transition-colors group"
                          >
                            <div className="text-white font-medium text-sm">Auto</div>
                          </button>

                          {/* Model Options */}
                          {models.map((model) => (
                            <button
                              key={model.id}
                              onClick={() => handleModelSwitch(model.id)}
                              className={`w-full text-left p-2 hover:bg-white/5 rounded-lg transition-colors group ${
                                selectedModelId === model.id ? 'bg-white/5' : ''
                              }`}
                            >
                              <div className="text-white font-medium text-sm">{model.name}</div>
                              <div className="text-gray-400 text-xs mt-0.5">
                                {model.description || getModelDescription(model.id)}
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Divider */}
                        <div className="border-t border-white/10 my-1"></div>

                        {/* Try Again Section */}
                        {messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && (
                          <>
                            <button
                              onClick={handleTryAgain}
                              className="w-full text-left p-2 mx-1 hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                              <div>
                                <div className="text-white font-medium text-sm">Try again</div>
                                <div className="text-gray-400 text-xs">{selectedModel?.name || 'Current model'}</div>
                              </div>
                            </button>
                            <div className="border-t border-white/10 my-1"></div>
                          </>
                        )}

                        {/* Additional Tools */}
                        <button
                          onClick={() => {
                            setShowToolsDropdown(false);
                            // TODO: Implement web search functionality
                            alert('Web search feature coming soon!');
                          }}
                          className="w-full text-left p-2 mx-1 hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Globe className="w-3.5 h-3.5 text-gray-400" />
                          <div className="text-white font-medium text-sm">Search the web</div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side Buttons */}
                <div className="flex items-center gap-2">
                  {/* Microphone Button */}
                  <button
                    type="button"
                    className="p-1.5 text-white hover:text-gray-300 hover:bg-white/10 rounded-lg transition-colors"
                    title="Voice input"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={(!input.trim() && selectedFiles.length === 0) || isLoading || hasUploadingFiles}
                    className="w-8 h-8 bg-gray-600 text-white rounded-full hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 transition-colors flex items-center justify-center"
                    title={hasUploadingFiles ? "Uploading files..." : "Send message"}
                  >
                    {hasUploadingFiles ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span className="text-sm font-bold">↑</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Footer Text */}
          <div className="text-center text-xs text-gray-500 mt-4">
            Galaxy AI can make mistakes. Check important info.{' '}
            <button className="underline hover:text-gray-400 transition-colors">
              Cookie Preferences
            </button>
            .
          </div>
          </div>
        </div>
      </div>
    </div>
  );
} 