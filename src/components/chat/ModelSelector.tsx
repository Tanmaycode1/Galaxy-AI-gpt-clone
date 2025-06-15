'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Check, Sparkles, FileImage, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  model: string;
  description?: string;
  image: boolean;
  context_window: number;
  pricing?: {
    input: number;
    output: number;
  };
}

interface ModelSelectorProps {
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
}

export function ModelSelector({ selectedModelId, onModelChange }: ModelSelectorProps) {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await fetch('/api/chat');
        if (response.ok) {
          const modelsData = await response.json();
          setModels(modelsData);
          // Set default model if none selected
          if (!selectedModelId && modelsData.length > 0) {
            onModelChange(modelsData[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchModels();
  }, [selectedModelId, onModelChange]);

  const selectedModel = models.find(m => m.id === selectedModelId);

  if (loading) {
    return (
      <div className="h-8 px-3 bg-muted/50 border border-border/50 rounded-lg flex items-center space-x-2">
        <div className="w-4 h-4 bg-muted animate-pulse rounded" />
        <div className="w-20 h-3 bg-muted animate-pulse rounded" />
        <div className="w-3 h-3 bg-muted animate-pulse rounded ml-auto" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 px-3 justify-between bg-muted/50 hover:bg-muted border border-border/50 rounded-lg shadow-sm"
        >
          <div className="flex items-center space-x-2">
            <div className={`w-4 h-4 rounded flex items-center justify-center ${
              selectedModel?.provider === 'openai' 
                ? 'bg-green-500' 
                : 'bg-orange-500'
            }`}>
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-sm font-medium text-foreground">
              {selectedModel?.name?.replace(/^GPT-/, '').replace(/^Claude /, '') || 'Select Model'}
            </span>
          </div>
          <ChevronDown className="w-3 h-3 text-muted-foreground ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[400px] p-2">
        {models.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => onModelChange(model.id)}
            className="flex items-center justify-between p-3 rounded-lg cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                model.provider === 'openai' 
                  ? 'bg-green-100 dark:bg-green-900/30' 
                  : 'bg-orange-100 dark:bg-orange-900/30'
              }`}>
                <Sparkles className={`w-4 h-4 ${
                  model.provider === 'openai' 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-orange-600 dark:text-orange-400'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-foreground">{model.name}</span>
                  <div className="flex items-center space-x-1">
                    {model.image && (
                      <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center">
                        <FileImage className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                    <div className="w-4 h-4 bg-purple-100 dark:bg-purple-900/30 rounded flex items-center justify-center">
                      <Zap className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {model.provider.toUpperCase()} • {model.context_window.toLocaleString()} tokens
                </div>
                {model.description && (
                  <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {model.description}
                  </div>
                )}
              </div>
            </div>
            {selectedModelId === model.id && (
              <Check className="w-4 h-4 text-[#10a37f]" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 