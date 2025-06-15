'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from 'ai/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { Send, Paperclip, X, Edit2, Trash2, Check, X as XIcon, ImageIcon, Loader2 } from 'lucide-react';
import { ModelSelector } from './ModelSelector';
import { Message } from 'ai';

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
  size?: number;
}

export function ChatInterface({ user, isDemo = false, chatId, onChatCreated }: ChatInterfaceProps) {
  const [selectedModelId, setSelectedModelId] = useState<string>('gpt-4-turbo');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [currentChatId, setCurrentChatId] = useState<string>(chatId || '');
  const [models, setModels] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  


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
        setCurrentChatId(newChatId);
        onChatCreated?.(newChatId);
      }
    },
    onFinish: async (message) => {
      // Files are already cleared in onSubmit, don't clear again here
      
      if (currentChatId && message) {
        try {
          await fetch(`/api/chats/${currentChatId}`, {
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
      

    },
    onError: (error) => {
      console.error('useChat onError:', error);
      // Clear uploaded files on error too
      setUploadedFiles([]);
    },
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

  // Load existing chat if chatId is provided
  useEffect(() => {
    if (chatId && chatId !== currentChatId) {
      loadChat(chatId);
    } else if (!chatId && currentChatId) {
      setMessages([]);
      setCurrentChatId('');
      setUploadedFiles([]);
    }
  }, [chatId, currentChatId]);

  const loadChat = async (chatIdToLoad: string) => {
    try {
      const response = await fetch(`/api/chats/${chatIdToLoad}`);
      if (response.ok) {
        const chatData = await response.json();

        console.log('Loading chat messages:', chatData.messages?.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content.substring(0, 30),
          hasAttachments: !!(msg.attachments?.length),
          attachmentCount: msg.attachments?.length || 0
        })));
        setMessages(chatData.messages || []);
        setSelectedModelId(chatData.modelId || 'gpt-4-turbo');
        setCurrentChatId(chatIdToLoad);
      }
    } catch (error) {
      console.error('Failed to load chat:', error);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Auto-resize edit textarea
  useEffect(() => {
    if (editTextareaRef.current) {
      editTextareaRef.current.style.height = 'auto';
      editTextareaRef.current.style.height = `${editTextareaRef.current.scrollHeight}px`;
    }
  }, [editingContent]);

  const selectedModel = models.find(m => m.id === selectedModelId);
  const supportsImages = selectedModel?.image;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!supportsImages && file.type.startsWith('image/')) {
      alert('Current model does not support image uploads. Please select a vision-enabled model.');
      return;
    }

    setIsUploading(true);
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
      setUploadedFiles(prev => [...prev, {
        url: result.url,
        name: file.name,
        type: file.type,
        size: file.size,
      }]);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() && uploadedFiles.length === 0) return;
    if (isUploading) return; // Don't submit while uploading

    // Store current attachments before clearing
    const currentAttachments = uploadedFiles.map(file => ({
      url: file.url,
      name: file.name,
      contentType: file.type,
      type: file.type,
    }));

    // Use handleSubmit with experimental_attachments
    handleSubmit(e, {
      experimental_attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
    });

    // Clear files immediately after submit to remove from preview
    setTimeout(() => {
      setUploadedFiles([]);
    }, 100);
  };

  const startEditing = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const saveEdit = async () => {
    if (!editingMessageId || !editingContent.trim()) return;

    try {
      const updatedMessages = messages.map(msg => 
        msg.id === editingMessageId 
          ? { ...msg, content: editingContent }
          : msg
      );
      
      setMessages(updatedMessages);
      
      const editedMessage = messages.find(msg => msg.id === editingMessageId);
      if (editedMessage?.role === 'user') {
        const messageIndex = messages.findIndex(msg => msg.id === editingMessageId);
        const messagesUpToEdit = updatedMessages.slice(0, messageIndex + 1);
        setMessages(messagesUpToEdit);
        
        setTimeout(() => {
          reload();
        }, 100);
      }
      
      if (currentChatId) {
        await fetch(`/api/chats/${currentChatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: updatedMessages }),
        });
      }
      
      cancelEditing();
    } catch (error) {
      console.error('Failed to save edit:', error);
      alert('Failed to save edit. Please try again.');
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      const updatedMessages = messages.filter(msg => msg.id !== messageId);
      
      if (messages[messageIndex]?.role === 'user' && messages[messageIndex + 1]?.role === 'assistant') {
        const assistantMessageId = messages[messageIndex + 1].id;
        updatedMessages.splice(messageIndex, 1);
      }
      
      setMessages(updatedMessages);
      
      if (currentChatId) {
        await fetch(`/api/chats/${currentChatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: updatedMessages }),
        });
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Failed to delete message. Please try again.');
    }
  };

  const userName = user?.firstName || 'You';

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
              <p>Send a message to begin chatting with AI</p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => {
                const messageWithAttachments = message as any;
                
                // Log messages being rendered
                if (messageWithAttachments.attachments?.length > 0) {
                  console.log('Rendering message with attachments:', {
                    id: message.id,
                    role: message.role,
                    attachmentCount: messageWithAttachments.attachments.length,
                    attachmentUrls: messageWithAttachments.attachments.map((att: any) => att.url)
                  });
                }
                

                return (
                  <div
                    key={message.id}
                    className={`flex gap-4 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 bg-[#10a37f] rounded-full flex items-center justify-center text-white text-sm font-medium">
                        AI
                      </div>
                    )}
                    
                    <div className={`max-w-2xl ${message.role === 'user' ? 'order-first' : ''}`}>
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-[#10a37f] text-white ml-auto'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {(messageWithAttachments.attachments || messageWithAttachments.experimental_attachments) && (messageWithAttachments.attachments?.length > 0 || messageWithAttachments.experimental_attachments?.length > 0) && (
                          <div className="mb-3 space-y-2">
                            {(messageWithAttachments.attachments || messageWithAttachments.experimental_attachments)?.map((attachment: any, idx: number) => (
                              <div key={idx}>
                                {(attachment.type || attachment.contentType)?.startsWith('image/') ? (
                                  <div className="rounded-lg overflow-hidden max-w-md">
                                    <img 
                                      src={attachment.url} 
                                      alt={attachment.name}
                                      className="w-full h-auto max-h-96 object-contain"
                                      loading="lazy"
                                    />
                                    <div className={`text-xs p-2 ${
                                      message.role === 'user' 
                                        ? 'bg-white/10 text-white/80' 
                                        : 'bg-muted text-muted-foreground'
                                    }`}>
                                      {attachment.name}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-sm p-2 border rounded">
                                    <ImageIcon className="w-4 h-4" />
                                    <span>{attachment.name}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {editingMessageId === message.id ? (
                          <div className="space-y-2">
                            <Textarea
                              ref={editTextareaRef}
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              className="min-h-[60px] resize-none border-none bg-transparent p-0 focus-visible:ring-0"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={saveEdit} className="h-6 px-2 text-xs">
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEditing} className="h-6 px-2 text-xs">
                                <XIcon className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="relative group">
                            <div className="whitespace-pre-wrap">{message.content}</div>
                            
                            {message.role === 'user' && (
                              <div className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => startEditing(message)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteMessage(message.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className={`text-xs text-muted-foreground mt-1 ${
                        message.role === 'user' ? 'text-right' : 'text-left'
                      }`}>
                        {message.role === 'user' ? userName : 'Assistant'}
                      </div>
                    </div>

                    {message.role === 'user' && (
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-medium">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {(status === 'submitted') && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 bg-[#10a37f] rounded-full flex items-center justify-center text-white text-sm font-medium">
                    AI
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3 max-w-2xl">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t bg-background/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto p-4">
          {/* Model Selector */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ModelSelector
                selectedModelId={selectedModelId}
                onModelChange={setSelectedModelId}
              />
              {supportsImages && (
                <div className="flex items-center gap-1 text-xs text-[#10a37f] bg-[#10a37f]/10 px-2 py-1 rounded-full">
                  <ImageIcon className="w-3 h-3" />
                  <span>Vision</span>
                </div>
              )}
            </div>
          </div>

          {/* Uploaded Files Preview */}
          {uploadedFiles.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-3">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="relative group">
                  <div className="relative max-w-xs">
                    <img 
                      src={file.url} 
                      alt={file.name}
                      className="w-full h-32 object-cover rounded-lg border"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 rounded-b-lg">
                      <div className="truncate">{file.name}</div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Message Input Form */}
          <form onSubmit={onSubmit} className="relative">
            <div className="relative flex items-end space-x-2">
              <div className="relative flex-1">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Message ChatGPT..."
                  disabled={isLoading || isUploading}
                  className="min-h-[60px] max-h-32 resize-none pr-16 rounded-xl border-border focus:ring-2 focus:ring-[#10a37f] focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (!isUploading) {
                        onSubmit(e as any);
                      }
                    }
                  }}
                />
                
                <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={supportsImages ? "image/*" : ""}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  
                  {supportsImages && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || isLoading}
                      className="h-8 w-8 p-0 hover:bg-muted"
                    >
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Paperclip className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                  
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isLoading || isUploading || (!input.trim() && uploadedFiles.length === 0)}
                    className="h-8 w-8 p-0 bg-[#10a37f] hover:bg-[#0d8a6b] disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 