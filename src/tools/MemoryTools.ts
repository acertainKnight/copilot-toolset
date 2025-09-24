/**
 * Memory Tools with MCP Decorator Registration
 *
 * Implements official MCP patterns for automatic tool discovery
 * Based on GitHub Copilot and VS Code MCP documentation
 */

import { z } from 'zod';
import { MCPTool, TOOL_CATEGORIES, TOOL_PERMISSIONS } from '../server/MCPToolDecorator.js';
import { MemoryManager } from '../memory/MemoryManager.js';
import { UnifiedMemoryManager } from '../memory/UnifiedMemoryManager.js';
import type { MemoryLayer, MemoryTier, MemoryScope, ToolExecutionContext } from '../types/index.js';

/**
 * Memory Tools with automatic MCP registration
 */
export class MemoryTools {
  private memoryManager: MemoryManager;
  private unifiedMemoryManager: UnifiedMemoryManager;

  constructor() {
    // Initialize with default paths - will be overridden by context
    this.memoryManager = new MemoryManager();
    this.unifiedMemoryManager = new UnifiedMemoryManager();
  }

  /**
   * Store memory in the unified dual-tier system
   * Following official MCP tool registration patterns
   */
  @MCPTool({
    name: 'store_unified_memory',
    title: 'Store Unified Memory',
    description: 'Store information in the dual-tier, bifurcated memory system with core (2KB limit, high priority) and long-term (unlimited) tiers, supporting both global and project scopes',
    category: TOOL_CATEGORIES.MEMORY,
    permissions: [TOOL_PERMISSIONS.DATABASE_WRITE],
    rateLimit: 10, // 10 calls per second
    inputSchema: {
      content: z.string().min(1).describe('Content to store - be specific and actionable'),
      tier: z.enum(['core', 'longterm']).describe('Memory tier: core (2KB limit, high priority) or longterm (unlimited storage)'),
      scope: z.enum(['global', 'project']).describe('Memory scope: global (cross-project) or project (project-specific)')
    }
  })
  async storeUnifiedMemory({
    content,
    tier,
    scope,
    project_id,
    tags,
    metadata
  }: {
    content: string;
    tier: MemoryTier;
    scope: MemoryScope;
    project_id?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }, context: ToolExecutionContext) {
    try {
      const memoryId = await this.unifiedMemoryManager.store({
        content,
        tier,
        scope,
        project_id: scope === 'project' ? (project_id || context.workspacePath || 'default') : undefined,
        tags: tags || [],
        metadata: metadata || {}
      });

      const storageDescription = this.getUnifiedStorageDescription(tier, scope);

      return {
        content: [{
          type: 'text' as const,
          text: `Memory stored successfully in ${storageDescription}!

📍 Memory ID: ${memoryId}
📊 Tier: ${tier} (${tier === 'core' ? '2KB limit, high priority' : 'unlimited storage'})
🎯 Scope: ${scope} (${scope === 'global' ? 'cross-project' : 'project-specific'})
🏷️ Tags: ${tags?.join(', ') || 'none'}

The memory is now available for search and retrieval across the system.`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Failed to store memory: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Search unified memory system
   */
  @MCPTool({
    name: 'search_unified_memory',
    title: 'Search Unified Memory',
    description: 'Search the dual-tier memory system with advanced filtering by tier, scope, and semantic similarity',
    category: TOOL_CATEGORIES.MEMORY,
    permissions: [TOOL_PERMISSIONS.DATABASE_READ],
    rateLimit: 20, // 20 calls per second for search
    inputSchema: {
      query: z.string().min(1).describe('Search query - can be keywords, phrases, or semantic concepts'),
      tier: z.enum(['core', 'longterm', 'both']).optional().describe('Memory tier to search: core, longterm, or both'),
      scope: z.enum(['global', 'project', 'both']).optional().describe('Memory scope to search: global, project, or both'),
      limit: z.number().min(1).max(50).optional().describe('Maximum number of results (default: 10, max: 50)')
    }
  })
  async searchUnifiedMemory({
    query,
    tier,
    scope,
    limit,
    project_id
  }: {
    query: string;
    tier?: 'core' | 'longterm' | 'both';
    scope?: 'global' | 'project' | 'both';
    limit?: number;
    project_id?: string;
  }, context: ToolExecutionContext) {
    try {
      const results = await this.unifiedMemoryManager.search({
        query,
        tier: tier === 'both' ? undefined : tier,
        scope: scope === 'both' ? undefined : scope,
        project_id: scope === 'project' ? (project_id || context.workspacePath || 'default') : undefined,
        limit: limit || 10
      });

      if (results.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `No memories found for query: "${query}"\n\nTry:\n- Using different keywords\n- Searching across different tiers/scopes\n- Using broader search terms`
          }]
        };
      }

      const resultText = results.map((result, index) => {
        const tierIcon = result.tier === 'core' ? '⭐' : '📚';
        const scopeIcon = result.scope === 'global' ? '🌐' : '📁';

        return `${index + 1}. ${tierIcon}${scopeIcon} **${result.tier}/${result.scope}**
Content: ${result.content}
Tags: ${result.tags.join(', ') || 'none'}
Created: ${new Date(result.created_at).toLocaleString()}
Score: ${result.score?.toFixed(3) || 'N/A'}`;
      }).join('\n\n');

      return {
        content: [{
          type: 'text' as const,
          text: `Found ${results.length} memory entries for "${query}":

${resultText}

Legend: ⭐ = Core tier, 📚 = Long-term tier, 🌐 = Global scope, 📁 = Project scope`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Failed to search memory: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Get comprehensive memory statistics
   */
  @MCPTool({
    name: 'get_unified_memory_stats',
    title: 'Get Unified Memory Statistics',
    description: 'Get comprehensive statistics about the dual-tier memory system including storage usage, tier distribution, and performance metrics',
    category: TOOL_CATEGORIES.MEMORY,
    permissions: [TOOL_PERMISSIONS.DATABASE_READ],
    rateLimit: 5, // 5 calls per second
    inputSchema: {}
  })
  async getUnifiedMemoryStats(_: {}, context: ToolExecutionContext) {
    try {
      const stats = await this.unifiedMemoryManager.getStats();

      return {
        content: [{
          type: 'text' as const,
          text: `📊 **Unified Memory System Statistics**

**Storage Overview:**
- Total Memories: ${stats.total_memories}
- Core Tier: ${stats.core_memories} memories (2KB limit each)
- Long-term Tier: ${stats.longterm_memories} memories (unlimited)

**Scope Distribution:**
- Global Scope: ${stats.global_memories} memories
- Project Scope: ${stats.project_memories} memories

**Size Statistics:**
- Total Storage: ${this.formatBytes(stats.total_size)}
- Core Tier Size: ${this.formatBytes(stats.core_size)}
- Long-term Tier Size: ${this.formatBytes(stats.longterm_size)}
- Average Memory Size: ${this.formatBytes(stats.average_size)}

**Performance Metrics:**
- Database Size: ${this.formatBytes(stats.database_size)}
- Last Cleanup: ${stats.last_cleanup ? new Date(stats.last_cleanup).toLocaleString() : 'Never'}
- System Health: ${this.getSystemHealthStatus(stats)}

**Recent Activity:**
- Memories Created Today: ${stats.memories_created_today || 0}
- Most Active Project: ${stats.most_active_project || 'None'}
- Popular Tags: ${stats.popular_tags?.slice(0, 5).join(', ') || 'None'}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Failed to get memory statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Legacy memory storage (backward compatibility)
   */
  @MCPTool({
    name: 'store_memory',
    title: 'Store Memory (Legacy)',
    description: 'Legacy memory storage in three-tier system. Consider using store_unified_memory for better performance.',
    category: TOOL_CATEGORIES.MEMORY,
    permissions: [TOOL_PERMISSIONS.DATABASE_WRITE],
    rateLimit: 5,
    inputSchema: {
      content: z.string().min(1).describe('Content to store'),
      layer: z.enum(['preference', 'project', 'prompt', 'system']).describe('Memory layer'),
      tags: z.array(z.string()).optional().describe('Tags for categorization'),
      metadata: z.record(z.any()).optional().describe('Additional metadata')
    }
  })
  async storeLegacyMemory({
    content,
    layer,
    tags,
    metadata
  }: {
    content: string;
    layer: MemoryLayer;
    tags?: string[];
    metadata?: Record<string, any>;
  }, context: ToolExecutionContext) {
    try {
      const memoryId = await this.memoryManager.store(content, layer, tags || [], metadata);

      return {
        content: [{
          type: 'text' as const,
          text: `Legacy memory stored successfully!

📍 Memory ID: ${memoryId}
📊 Layer: ${layer}
🏷️ Tags: ${tags?.join(', ') || 'none'}

⚠️ Consider migrating to unified memory system using store_unified_memory for better performance.`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Failed to store legacy memory: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Helper methods
   */
  private getUnifiedStorageDescription(tier: MemoryTier, scope: MemoryScope): string {
    const tierDesc = tier === 'core' ? 'Core tier (2KB limit, high priority)' : 'Long-term tier (unlimited storage)';
    const scopeDesc = scope === 'global' ? 'Global scope (cross-project)' : 'Project scope (project-specific)';
    return `${tierDesc} with ${scopeDesc}`;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private getSystemHealthStatus(stats: any): string {
    if (stats.total_memories === 0) return '🟡 Empty';
    if (stats.database_size > 100 * 1024 * 1024) return '🟡 Large Database';
    if (stats.core_memories > 1000) return '🟡 Many Core Memories';
    return '🟢 Healthy';
  }
}