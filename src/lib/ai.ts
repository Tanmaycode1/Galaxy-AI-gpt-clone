import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { getModelConfig } from './models';

// Initialize AI providers with proper configuration
const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropicProvider = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Get the appropriate AI model based on model key
export function getAIModel(modelKey: string) {
  const modelConfig = getModelConfig(modelKey);
  
  if (!modelConfig) {
    throw new Error(`Model ${modelKey} not found in configuration`);
  }

  if (modelConfig.provider === 'openai') {
    return openaiProvider(modelConfig.model_id);
  } else if (modelConfig.provider === 'anthropic') {
    return anthropicProvider(modelConfig.model_id);
  } else {
    throw new Error(`Unsupported provider: ${modelConfig.provider}`);
  }
}

// Chat configuration
export const chatConfig = {
  maxTokens: 4096,
  temperature: 0.7,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

// Token estimation (rough calculation)
export function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English
  return Math.ceil(text.length / 4);
}

// Validate if model can handle the current context
export function validateContextWindow(modelKey: string, totalTokens: number): boolean {
  const modelConfig = getModelConfig(modelKey);
  if (!modelConfig) return false;
  
  return totalTokens <= modelConfig.context_window;
}

// Create system message for the AI
export function createSystemMessage(): string {
  return `You are ChatGPT, a large language model trained by OpenAI. You are a helpful, harmless, and honest AI assistant. You should give helpful, detailed, and polite answers to the user's questions.

Current date: ${new Date().toLocaleDateString()}

Guidelines:
- Be conversational and helpful
- If you're unsure about something, admit it
- Provide detailed explanations when asked
- Use markdown formatting for better readability
- If the user asks about images, analyze them carefully and provide detailed descriptions`;
}

// Export providers for direct use if needed
export { openaiProvider, anthropicProvider }; 