import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  preferences: {
    defaultModel: string;
    theme: 'light' | 'dark' | 'system';
    language: string;
  };
  usage: {
    totalChats: number;
    totalMessages: number;
    totalTokensUsed: number;
  };
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
}

const UserSchema = new Schema<IUser>({
  clerkId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  firstName: { type: String },
  lastName: { type: String },
  imageUrl: { type: String },
  preferences: {
    defaultModel: { type: String, default: 'gpt-4o' },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    language: { type: String, default: 'en' }
  },
  usage: {
    totalChats: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    totalTokensUsed: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now }
});

// Update the updatedAt field on save
UserSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create indexes for better performance
UserSchema.index({ clerkId: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ lastActiveAt: -1 });

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema); 