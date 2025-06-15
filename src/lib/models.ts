import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

export interface ModelConfig {
  name: string;
  provider: 'openai' | 'anthropic';
  model_id: string;
  image: boolean;
  max_tokens: number;
  context_window: number;
  pricing: {
    input: number;
    output: number;
  };
  description: string;
}

export interface ModelsConfig {
  models: {
    openai: Record<string, ModelConfig>;
    anthropic: Record<string, ModelConfig>;
  };
  default_model: string;
  image_upload_enabled: boolean;
  max_file_size_mb: number;
  supported_file_types: string[];
}

let cachedConfig: ModelsConfig | null = null;

export function loadModelsConfig(): ModelsConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const configPath = path.join(process.cwd(), 'config', 'models.yaml');
    const configFile = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(configFile) as ModelsConfig;
    
    cachedConfig = config;
    return config;
  } catch (error) {
    console.error('Error loading models config:', error);
    throw new Error('Failed to load models configuration');
  }
}

export function getModelConfig(modelKey: string): ModelConfig | null {
  const config = loadModelsConfig();
  
  // Check OpenAI models
  if (config.models.openai[modelKey]) {
    return config.models.openai[modelKey];
  }
  
  // Check Anthropic models
  if (config.models.anthropic[modelKey]) {
    return config.models.anthropic[modelKey];
  }
  
  return null;
}

export function getAllModels(): Array<{ key: string; config: ModelConfig }> {
  const config = loadModelsConfig();
  const models: Array<{ key: string; config: ModelConfig }> = [];
  
  // Add OpenAI models
  Object.entries(config.models.openai).forEach(([key, modelConfig]) => {
    models.push({ key, config: modelConfig });
  });
  
  // Add Anthropic models
  Object.entries(config.models.anthropic).forEach(([key, modelConfig]) => {
    models.push({ key, config: modelConfig });
  });
  
  return models;
}

export function getModelsWithImageSupport(): Array<{ key: string; config: ModelConfig }> {
  return getAllModels().filter(({ config }) => config.image);
}

export function canModelHandleImages(modelKey: string): boolean {
  const modelConfig = getModelConfig(modelKey);
  return modelConfig?.image ?? false;
}

export function getDefaultModel(): string {
  const config = loadModelsConfig();
  return config.default_model;
}

export function isImageUploadEnabled(): boolean {
  const config = loadModelsConfig();
  return config.image_upload_enabled;
}

export function getMaxFileSize(): number {
  const config = loadModelsConfig();
  return config.max_file_size_mb;
}

export function getSupportedFileTypes(): string[] {
  const config = loadModelsConfig();
  return config.supported_file_types;
} 