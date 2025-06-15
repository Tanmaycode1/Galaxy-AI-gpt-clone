// Message types
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  files?: FileAttachment[];
  timestamp: Date;
  edited?: boolean;
  model?: string;
}

// File attachment types
export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  publicId?: string; // Cloudinary public ID
  width?: number;
  height?: number;
}

// Conversation types
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  userId: string;
  model: string;
  createdAt: Date;
  updatedAt: Date;
  isArchived?: boolean;
  tags?: string[];
}

// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt: Date;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultModel: string;
  language: string;
  enableSounds: boolean;
  enableNotifications: boolean;
}

// Chat UI types
export interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  error: string | null;
  isStreamingResponse: boolean;
  selectedModel: string;
}

// API response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ChatResponse {
  message: Message;
  conversationId: string;
  model: string;
  tokensUsed?: number;
}

// Upload types
export interface UploadProgress {
  fileId: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

// Model configuration types (re-export from lib/models)
export type { ModelConfig, ModelsConfig } from '@/lib/models';

// Component prop types
export interface ChatInterfaceProps {
  conversationId?: string;
  initialMessages?: Message[];
}

export interface MessageProps {
  message: Message;
  onEdit?: (messageId: string, newContent: string) => void;
  onRegenerate?: (messageId: string) => void;
  onCopy?: (content: string) => void;
}

export interface FileUploadProps {
  onFileUpload: (files: FileAttachment[]) => void;
  allowedTypes: string[];
  maxFileSize: number;
  modelSupportsImages: boolean;
}

// Theme types
export type Theme = 'light' | 'dark' | 'system';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

// Error types
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export type WithId<T> = T & { id: string };

// Database model types
export interface ConversationDocument extends Omit<Conversation, 'id'> {
  _id: string;
}

export interface MessageDocument extends Omit<Message, 'id'> {
  _id: string;
} 