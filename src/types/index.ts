/**
 * Core type definitions for the Copilot MCP Toolset - Simplified
 */

import { z } from 'zod';

// ==================== Memory System Types ====================

// New dual-tier, bifurcated memory architecture
export type MemoryTier = 'core' | 'longterm';
export type MemoryScope = 'global' | 'project';

// Legacy layers for backward compatibility
export type MemoryLayer = 'preference' | 'project' | 'prompt' | 'system';

export interface UnifiedMemory {
  id: string;
  content: string;
  tier: MemoryTier; // core (2KB limit) or longterm (unlimited)
  scope: MemoryScope; // global (cross-project) or project (project-specific)
  project_id?: string; // Required for project-scoped memories
  tags?: string[];
  created_at: Date;
  accessed_at: Date;
  access_count: number;
  metadata?: Record<string, any>;
  // Size tracking for core tier limit enforcement
  content_size: number;
}

// Legacy Memory interface for backward compatibility
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

// New unified memory store schema
export const UnifiedMemoryStoreSchema = z.object({
  content: z.string().min(1),
  tier: z.enum(['core', 'longterm']).describe('Memory tier: core (2KB limit, always accessible) or longterm (unlimited storage)'),
  scope: z.enum(['global', 'project']).describe('Memory scope: global (cross-project) or project (project-specific)'),
  project_id: z.string().optional().describe('Required for project-scoped memories'),
  tags: z.array(z.string()).optional().default([]),
  metadata: z.record(z.any()).optional(),
});

// Legacy schema for backward compatibility
export const MemoryStoreSchema = z.object({
  content: z.string().min(1),
  layer: z.enum(['preference', 'project', 'prompt', 'system']),
  tags: z.array(z.string()).optional().default([]),
});

// Updated search schema supporting both new and legacy approaches
export const MemorySearchSchema = z.object({
  query: z.string().min(1),
  tier: z.enum(['core', 'longterm']).optional().describe('Filter by memory tier'),
  scope: z.enum(['global', 'project']).optional().describe('Filter by memory scope'),
  project_id: z.string().optional().describe('Filter by specific project (for project-scoped search)'),
  // Legacy support
  layer: z.enum(['preference', 'project', 'prompt', 'system']).optional(),
  limit: z.number().min(1).max(100).optional().default(10),
  minScore: z.number().min(0).max(1).optional().default(0.5),
});

export const ProjectInitSchema = z.object({
  project_path: z.string().min(1),
  force: z.boolean().optional().default(false),
  skipGitAnalysis: z.boolean().optional().default(false),
});