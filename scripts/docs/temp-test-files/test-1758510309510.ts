// Memory system types
interface Memory {
  id?: string;
  content: string;
  layer: MemoryLayer;
  tags: string[];
  created_at?: Date;
  accessed_at?: Date;
  access_count: number;
  metadata?: Record<string, any>;
}

type MemoryLayer = 'preference' | 'project' | 'prompt' | 'system';

interface MemorySearchOptions {
  layer?: MemoryLayer;
  tags?: string[];
  limit?: number;
  includeMetadata?: boolean;
}

interface MemorySearchResult {
  memory: Memory;
  similarity_score?: number;
  match_type: 'exact' | 'partial' | 'semantic';
  context: string;
}

// Chat mode types
interface ChatModeRequest {
  name: string;
  description: string;
  systemPrompt: string;
  tools?: string[];
  temperature?: number;
}