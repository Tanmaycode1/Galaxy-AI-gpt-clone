import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: {
    type: string; // MIME type like 'image/jpeg', 'image/png', etc.
    url: string;
    name: string;
    size?: number;
  }[];
}

export interface IChat extends Document {
  userId: string;
  title: string;
  messages: IMessage[];
  modelId: string;
  createdAt: Date;
  updatedAt: Date;
  isArchived: boolean;
}

const MessageSchema = new Schema<IMessage>({
  id: { type: String, required: true },
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  attachments: [{
    type: { type: String }, // Accept any MIME type
    url: { type: String, required: true },
    name: { type: String, required: true },
    size: { type: Number }
  }]
});

const ChatSchema = new Schema<IChat>({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  messages: [MessageSchema],
  modelId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isArchived: { type: Boolean, default: false }
});

// Update the updatedAt field on save
ChatSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create indexes for better performance
ChatSchema.index({ userId: 1, createdAt: -1 });
ChatSchema.index({ userId: 1, isArchived: 1, updatedAt: -1 });

export const Chat = mongoose.models.Chat || mongoose.model<IChat>('Chat', ChatSchema); 