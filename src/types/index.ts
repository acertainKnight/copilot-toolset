/**
 * Core type definitions for the Copilot MCP Toolset - Simplified
 */

import { z } from 'zod';

// ==================== Memory System Types ====================

export type MemoryLayer = 'preference' | 'project' | 'prompt' | 'system';

export interface Memory {
  id?: string;
  content: string;
  layer: MemoryLayer;
  tags?: string[];
  created_at?: Date;
  accessed_at?: Date;
  access_count?: number;
  metadata?: Record<string, any>;
}

export interface MemorySearchResult {
  memory: Memory;
  similarity_score?: number;
  match_type: 'exact' | 'fuzzy' | 'semantic';
  score?: number;
  context?: string;
}

export interface MemoryStats {
  core_memory_size: number;
  warm_storage_count: number;
  cold_storage_count: number;
  total_access_count: number;
  last_cleanup: Date;
  storage_size_bytes: number;
  storage_locations: {
    core: string;
    warm: string;
    cold: string;
    project: string;
  };
  // Legacy compatibility
  totalMemories?: number;
  byLayer?: Record<MemoryLayer, number>;
  averageAccessCount?: number;
  recentActivity?: number;
  storageSize?: {
    core: number;
    warm: number;
    cold: number;
  };
}

// ==================== Project Context Types ====================

export interface ProjectContext {
  type: string;
  framework?: string;
  language: string;
  packageManager?: string;
  testFramework?: string;
  buildTool?: string;
  projectName?: string;
  structure: ProjectStructureNode[];
  dependencies: DependencyInfo[];
  conventions: CodingConvention[];
  patterns: ArchitecturePattern[];
  commands: ProjectCommand[];
  gitInfo?: {
    totalCommits: number;
    recentCommits: Array<{
      hash: string;
      message: string;
      date: string;
    }>;
    currentBranch: string;
    branches: string[];
    remotes: Array<{
      name: string;
      url: string;
    }>;
    isClean: boolean;
  };
}

export interface ProjectStructureNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  importance: 'critical' | 'important' | 'normal' | 'low';
  description?: string;
  children?: ProjectStructureNode[];
}

export interface DependencyInfo {
  name: string;
  version: string;
  type: 'dependency' | 'devDependency' | 'peerDependency';
  description?: string;
}

export interface CodingConvention {
  category: string;
  rule: string;
  example?: string;
  source: 'detected' | 'config' | 'inferred';
}

export interface ArchitecturePattern {
  name: string;
  type: string;
  description: string;
  confidence: number;
  files: string[];
}

export interface ProjectCommand {
  name: string;
  command: string;
  type: 'build' | 'test' | 'dev' | 'deploy' | 'other';
  description: string;
}

// ==================== Memory Search Types ====================

export interface MemorySearchOptions {
  layer?: MemoryLayer;
  tags?: string[];
  limit?: number;
  similarity_threshold?: number;
  search_type?: 'semantic' | 'text' | 'hybrid';
}

// ==================== Utility Types ====================

export interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, error?: Error, meta?: any): void;
}

export interface StoragePaths {
  root: string;
  database: string;
  cache: string;
  modeDefinitions: string;
  projectContexts: string;
  backups: string;
  logs: string;
}

// ==================== MCP Tool Response Types ====================

export interface MCPToolCallResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

// ==================== Validation Schemas ====================

export const MemoryStoreSchema = z.object({
  content: z.string().min(1),
  layer: z.enum(['preference', 'project', 'prompt', 'system']),
  tags: z.array(z.string()).optional().default([]),
});

export const MemorySearchSchema = z.object({
  query: z.string().min(1),
  layer: z.enum(['preference', 'project', 'prompt', 'system']).optional(),
  limit: z.number().min(1).max(100).optional().default(10),
  minScore: z.number().min(0).max(1).optional().default(0.5),
});

export const ProjectInitSchema = z.object({
  project_path: z.string().min(1),
  force: z.boolean().optional().default(false),
  skipGitAnalysis: z.boolean().optional().default(false),
});