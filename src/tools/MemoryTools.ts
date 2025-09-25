/**
 * Memory Tools with MCP Decorator Registration
 *
 * Implements official MCP patterns for automatic tool discovery
 * Based on GitHub Copilot and VS Code MCP documentation
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';
import { MCPTool, TOOL_CATEGORIES, TOOL_PERMISSIONS } from '../server/MCPToolDecorator.js';
import { MemoryManager } from '../memory/MemoryManager.js';
import { UnifiedMemoryManager } from '../memory/UnifiedMemoryManager.js';
import type { MemoryLayer, MemoryTier, MemoryScope } from '../types/index.js';
import type { ToolExecutionContext } from '../types/MCPCompliant.js';

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
      const memoryId = await this.unifiedMemoryManager.store(
        content,
        tier,
        scope,
        scope === 'project' ? (project_id || context.workspacePath || 'default') : undefined,
        tags || [],
        metadata || {}
      );

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
      const results = await this.unifiedMemoryManager.search(
        query,
        {
          tier: tier === 'both' ? undefined : tier,
          scope: scope === 'both' ? undefined : scope,
          project_id: scope === 'project' ? (project_id || context.workspacePath || 'default') : undefined,
          limit: limit || 10
        }
      );

      if (results.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `No memories found for query: "${query}"\n\nTry:\n- Using different keywords\n- Searching across different tiers/scopes\n- Using broader search terms`
          }]
        };
      }

      const resultText = results.map((result, index) => {
        const tierIcon = result.memory.tier === 'core' ? '⭐' : '📚';
        const scopeIcon = result.memory.scope === 'global' ? '🌐' : '📁';

        return `${index + 1}. ${tierIcon}${scopeIcon} **${result.memory.tier}/${result.memory.scope}**
Content: ${result.memory.content}
Tags: ${result.memory.tags?.join(', ') || 'none'}
Created: ${new Date(result.memory.created_at).toLocaleString()}
Score: ${result.similarity_score?.toFixed(3) || 'N/A'}`;
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
  async getUnifiedMemoryStats(_: {}) {
    try {
      const stats = await this.unifiedMemoryManager.getMemoryStats();

      return {
        content: [{
          type: 'text' as const,
          text: `📊 **Unified Memory System Statistics**

**Storage Overview:**
- Total Memories: ${stats.totalMemories || 0}
- Core Memory Size: ${this.formatBytes(stats.core_memory_size)}
- Warm Storage: ${stats.warm_storage_count} items
- Cold Storage: ${stats.cold_storage_count} items

**Performance Metrics:**
- Total Access Count: ${stats.total_access_count}
- Storage Size: ${this.formatBytes(stats.storage_size_bytes)}
- Last Cleanup: ${stats.last_cleanup ? new Date(stats.last_cleanup).toLocaleString() : 'Never'}
- System Health: ${this.getSystemHealthStatus(stats)}

**Storage Locations:**
- Core: ${stats.storage_locations.core}
- Warm: ${stats.storage_locations.warm}
- Cold: ${stats.storage_locations.cold}
- Project: ${stats.storage_locations.project}`
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
  }) {
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
   * Delete memory with cascade handling for related memories
   */
  @MCPTool({
    name: 'delete_memory',
    title: 'Delete Memory',
    description: 'Delete memory by ID with optional cascade deletion of related memories using semantic similarity',
    category: TOOL_CATEGORIES.MEMORY,
    permissions: [TOOL_PERMISSIONS.DATABASE_WRITE],
    rateLimit: 5,
    inputSchema: {
      memory_id: z.string().min(1).describe('ID of the memory to delete'),
      cascade_related: z.boolean().optional().default(false).describe('Whether to delete related memories (70% similarity threshold)')
    }
  })
  async deleteMemory({
    memory_id,
    cascade_related
  }: {
    memory_id: string;
    cascade_related?: boolean;
  }) {
    try {
      const result = await this.unifiedMemoryManager.deleteMemory(memory_id, cascade_related || false);

      if (result.deleted) {
        return {
          content: [{
            type: 'text' as const,
            text: `🗑️ **Memory Deletion Successful**

✅ Primary memory deleted: ${memory_id}
${result.relatedDeleted ? `🔗 Related memories deleted: ${result.relatedDeleted}` : ''}

${result.message}

The memory and${result.relatedDeleted ? ` ${result.relatedDeleted} related memories have` : ' has'} been permanently removed from the system.`
          }]
        };
      } else {
        return {
          content: [{
            type: 'text' as const,
            text: `❌ **Memory Deletion Failed**

${result.message}

Please check the memory ID and try again.`
          }],
          isError: true
        };
      }
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Failed to delete memory: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Check for duplicate memories using semantic similarity
   */
  @MCPTool({
    name: 'check_duplicate_memory',
    title: 'Check Duplicate Memory',
    description: 'Check if content would create duplicate memories using semantic similarity analysis',
    category: TOOL_CATEGORIES.MEMORY,
    permissions: [TOOL_PERMISSIONS.DATABASE_READ],
    rateLimit: 10,
    inputSchema: {
      content: z.string().min(1).describe('Content to check for duplicates'),
      tier: z.enum(['core', 'longterm']).optional().describe('Memory tier to search within'),
      scope: z.enum(['global', 'project']).optional().describe('Memory scope to search within'),
      similarity_threshold: z.number().min(0).max(1).optional().default(0.8).describe('Similarity threshold (0-1, default: 0.8)')
    }
  })
  async checkDuplicateMemory({
    content,
    tier,
    scope,
    similarity_threshold,
    project_id
  }: {
    content: string;
    tier?: MemoryTier;
    scope?: MemoryScope;
    similarity_threshold?: number;
    project_id?: string;
  }, context: ToolExecutionContext) {
    try {
      const result = await this.unifiedMemoryManager.checkDuplicateMemory(
        content,
        tier,
        scope,
        project_id || context.workspacePath,
        similarity_threshold || 0.8
      );

      if (result.isDuplicate) {
        const duplicatesList = result.duplicates.map((dup, index) => {
          const tierIcon = dup.memory.tier === 'core' ? '⭐' : '📚';
          const scopeIcon = dup.memory.scope === 'global' ? '🌐' : '📁';

          return `${index + 1}. ${tierIcon}${scopeIcon} **${dup.memory.tier}/${dup.memory.scope}**
Content: "${dup.memory.content.substring(0, 100)}${dup.memory.content.length > 100 ? '...' : ''}"
Similarity: ${(dup.similarity_score || 0).toFixed(3)}
ID: ${dup.memory.id}`;
        }).join('\n\n');

        return {
          content: [{
            type: 'text' as const,
            text: `⚠️ **Potential Duplicate Content Detected**

${result.recommendation}

**Found ${result.duplicates.length} similar memory(ies):**

${duplicatesList}

**Recommendation:** Consider updating existing memory instead of creating a new one.

Legend: ⭐ = Core tier, 📚 = Long-term tier, 🌐 = Global scope, 📁 = Project scope`
          }]
        };
      } else {
        return {
          content: [{
            type: 'text' as const,
            text: `✅ **No Duplicates Found**

${result.recommendation}

The content is unique enough to be stored as a new memory.

**Search Parameters:**
- Similarity Threshold: ${similarity_threshold || 0.8}
- Tier Filter: ${tier || 'all'}
- Scope Filter: ${scope || 'all'}`
          }]
        };
      }
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Failed to check for duplicates: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Migrate memory between tiers (core ↔ long-term)
   */
  @MCPTool({
    name: 'migrate_memory_tier',
    title: 'Migrate Memory Tier',
    description: 'Migrate memory between core and long-term tiers with automatic validation',
    category: TOOL_CATEGORIES.MEMORY,
    permissions: [TOOL_PERMISSIONS.DATABASE_WRITE],
    rateLimit: 5,
    inputSchema: {
      memory_id: z.string().min(1).describe('ID of the memory to migrate'),
      target_tier: z.enum(['core', 'longterm']).describe('Target tier: core (2KB limit, high priority) or longterm (unlimited)'),
      reason: z.string().optional().describe('Optional reason for migration')
    }
  })
  async migrateMemoryTier({
    memory_id,
    target_tier,
    reason
  }: {
    memory_id: string;
    target_tier: MemoryTier;
    reason?: string;
  }) {
    try {
      const result = await this.unifiedMemoryManager.migrateMemoryTier(memory_id, target_tier, reason);

      if (result.migrated) {
        return {
          content: [{
            type: 'text' as const,
            text: `🔄 **Memory Tier Migration Successful**

✅ Memory migrated successfully!
- **From:** ${result.fromTier} tier
- **To:** ${result.toTier} tier
- **Memory ID:** ${memory_id}
- **Reason:** ${reason || 'Manual migration'}

${result.message}

The memory is now available in the ${target_tier} tier with appropriate access patterns.`
          }]
        };
      } else {
        return {
          content: [{
            type: 'text' as const,
            text: `❌ **Memory Tier Migration Failed**

**From:** ${result.fromTier} tier
**To:** ${result.toTier} tier
**Memory ID:** ${memory_id}

${result.message}

Please check the memory ID and tier constraints.`
          }],
          isError: true
        };
      }
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Failed to migrate memory tier: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Get comprehensive memory analytics including access patterns and trends
   */
  @MCPTool({
    name: 'get_memory_analytics',
    title: 'Get Memory Analytics',
    description: 'Get comprehensive memory analytics including access patterns, trends, and storage optimization recommendations',
    category: TOOL_CATEGORIES.MEMORY,
    permissions: [TOOL_PERMISSIONS.DATABASE_READ],
    rateLimit: 3,
    inputSchema: {}
  })
  async getMemoryAnalytics(_: {}) {
    try {
      const analytics = await this.unifiedMemoryManager.getMemoryAnalytics();

      // Format top tags
      const topTagsList = analytics.trends.topTags.length > 0
        ? analytics.trends.topTags.map(tag => `${tag.tag} (${tag.count})`).join(', ')
        : 'None';

      // Format active projects
      const activeProjectsList = analytics.trends.activeProjects.length > 0
        ? analytics.trends.activeProjects.slice(0, 5).map(p => `${p.project} (${p.memoryCount})`).join(', ')
        : 'None';

      // Calculate health metrics
      const healthWarnings: string[] = [];
      if (analytics.storageAnalytics.coreTierUtilization > 0.8) {
        healthWarnings.push('🟡 Core tier approaching capacity limit');
      }
      if (analytics.accessPatterns.leastAccessed.length > analytics.totalMemories * 0.3) {
        healthWarnings.push('🟡 Many memories are rarely accessed');
      }
      if (analytics.trends.memoriesCreatedToday === 0) {
        healthWarnings.push('🔵 No new memories created today');
      }

      const healthStatus = healthWarnings.length === 0 ? '🟢 System Healthy' : healthWarnings.join('\n');

      return {
        content: [{
          type: 'text' as const,
          text: `📊 **Comprehensive Memory Analytics**

**📈 Overview:**
- Total Memories: ${analytics.totalMemories}
- System Health: ${healthStatus}

**🗂️ Storage Distribution:**
- Core Tier: ${analytics.tierDistribution.core} memories (${(analytics.storageAnalytics.coreTierUtilization * 100).toFixed(1)}% of limit)
- Long-term Tier: ${analytics.tierDistribution.longterm} memories
- Global Scope: ${analytics.scopeDistribution.global} memories
- Project Scope: ${analytics.scopeDistribution.project} memories

**💾 Storage Analytics:**
- Total Size: ${this.formatBytes(analytics.storageAnalytics.totalSize)}
- Average Memory Size: ${this.formatBytes(analytics.storageAnalytics.averageSize)}
- Core Tier Utilization: ${(analytics.storageAnalytics.coreTierUtilization * 100).toFixed(1)}%

**🔍 Access Patterns:**
- Most Accessed: ${analytics.accessPatterns.mostAccessed.length} memories (avg: ${analytics.accessPatterns.averageAccessCount.toFixed(1)} accesses)
- Recently Active: ${analytics.accessPatterns.recentlyAccessed.length} memories
- Never Accessed: ${analytics.accessPatterns.leastAccessed.length} memories

**📅 Activity Trends:**
- Created Today: ${analytics.trends.memoriesCreatedToday}
- Created This Week: ${analytics.trends.memoriesCreatedThisWeek}
- Popular Tags: ${topTagsList}
- Active Projects: ${activeProjectsList}

**🎯 Optimization Recommendations:**
${analytics.accessPatterns.leastAccessed.length > 10 ? '• Consider reviewing rarely accessed memories for archival' : ''}
${analytics.storageAnalytics.coreTierUtilization > 0.7 ? '• Core tier is getting full - consider migrating less critical memories to long-term' : ''}
${analytics.trends.memoriesCreatedToday === 0 ? '• No activity today - consider adding new insights or learnings' : ''}
${analytics.trends.topTags.length === 0 ? '• Consider adding tags to memories for better organization' : ''}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Failed to get memory analytics: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Get user preferences from global core memory
   */
  @MCPTool({
    name: 'get_user_preferences',
    title: 'Get User Preferences',
    description: 'Extract ALL user preferences from global core memory including coding style, testing approach, libraries, patterns, and documentation preferences',
    category: TOOL_CATEGORIES.MEMORY,
    permissions: [TOOL_PERMISSIONS.DATABASE_READ],
    rateLimit: 5,
    inputSchema: {}
  })
  async getUserPreferences(_: {}, context: ToolExecutionContext) {
    try {
      // Search for preference-related memories in global core tier
      const preferenceResults = await this.unifiedMemoryManager.search(
        'prefer preference style pattern library framework testing documentation approach convention rule always never',
        {
          tier: 'core',
          scope: 'global',
          limit: 50
        }
      );

      if (preferenceResults.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `📋 **User Preferences**

🔍 **No user preferences found in global core memory.**

**Recommendations:**
- Start a new chat session and mention your preferences (e.g., "I prefer TypeScript over JavaScript")
- Use \`extract_coding_preferences\` to analyze existing conversations
- Manually store preferences with \`store_unified_memory\` using tier='core', scope='global'

**Example preference storage:**
\`\`\`
"I prefer functional programming patterns with immutable data structures, TypeScript for all new projects, Jest for testing, and detailed JSDoc comments for all public APIs."
\`\`\``
          }]
        };
      }

      // Categorize preferences
      const categories = {
        'Coding Style & Patterns': [] as typeof preferenceResults,
        'Languages & Frameworks': [] as typeof preferenceResults,
        'Testing Approach': [] as typeof preferenceResults,
        'Documentation': [] as typeof preferenceResults,
        'Architecture & Design': [] as typeof preferenceResults,
        'Tools & Libraries': [] as typeof preferenceResults,
        'General Preferences': [] as typeof preferenceResults
      };

      // Smart categorization based on content
      for (const result of preferenceResults) {
        const content = result.memory.content.toLowerCase();

        if (content.includes('test') || content.includes('spec') || content.includes('jest') || content.includes('mocha') || content.includes('cypress')) {
          categories['Testing Approach'].push(result);
        } else if (content.includes('document') || content.includes('comment') || content.includes('jsdoc') || content.includes('readme')) {
          categories['Documentation'].push(result);
        } else if (content.includes('react') || content.includes('vue') || content.includes('angular') || content.includes('typescript') || content.includes('javascript') || content.includes('python') || content.includes('java')) {
          categories['Languages & Frameworks'].push(result);
        } else if (content.includes('architecture') || content.includes('pattern') || content.includes('design') || content.includes('mvc') || content.includes('component')) {
          categories['Architecture & Design'].push(result);
        } else if (content.includes('library') || content.includes('package') || content.includes('dependency') || content.includes('tool') || content.includes('eslint') || content.includes('prettier')) {
          categories['Tools & Libraries'].push(result);
        } else if (content.includes('style') || content.includes('format') || content.includes('convention') || content.includes('indent') || content.includes('camel') || content.includes('snake')) {
          categories['Coding Style & Patterns'].push(result);
        } else {
          categories['General Preferences'].push(result);
        }
      }

      // Format output with rich categorization
      const formattedCategories = Object.entries(categories)
        .filter(([_, prefs]) => prefs.length > 0)
        .map(([category, prefs]) => {
          const categoryIcon = this.getCategoryIcon(category);
          const prefList = prefs.slice(0, 5).map((pref, index) => {
            return `  ${index + 1}. ${pref.memory.content} ${pref.memory.tags && pref.memory.tags.length > 0 ? `[${pref.memory.tags.join(', ')}]` : ''}`;
          }).join('\n');

          return `${categoryIcon} **${category}** (${prefs.length} preference${prefs.length > 1 ? 's' : ''}):
${prefList}${prefs.length > 5 ? `\n  ... and ${prefs.length - 5} more` : ''}`;
        }).join('\n\n');

      return {
        content: [{
          type: 'text' as const,
          text: `📋 **User Preferences Summary**

Found **${preferenceResults.length}** user preferences in global core memory:

${formattedCategories}

**💡 Usage Tips:**
- These preferences are automatically loaded for each chat session
- Use \`curate_context\` to combine preferences with project-specific context
- Update preferences with \`store_unified_memory\` (tier='core', scope='global')
- Extract new preferences from conversations with \`extract_coding_preferences\`

**🎯 Context Priority:** User Preferences → Project Patterns → General Knowledge`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Failed to get user preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Extract coding preferences from conversation history and code examples
   */
  @MCPTool({
    name: 'extract_coding_preferences',
    title: 'Extract Coding Preferences',
    description: 'Analyze conversation history and code to detect implicit user preferences, storing discovered patterns automatically in global core memory',
    category: TOOL_CATEGORIES.MEMORY,
    permissions: [TOOL_PERMISSIONS.DATABASE_WRITE],
    rateLimit: 3, // Lower rate limit for analysis-intensive operation
    inputSchema: {
      conversation_text: z.string().min(1).describe('Conversation text or code examples to analyze for preferences'),
      context_description: z.string().optional().describe('Optional context about what was being discussed or implemented'),
      auto_store: z.boolean().optional().default(true).describe('Whether to automatically store discovered preferences (default: true)')
    }
  })
  async extractCodingPreferences({
    conversation_text,
    context_description,
    auto_store
  }: {
    conversation_text: string;
    context_description?: string;
    auto_store?: boolean;
  }) {
    try {
      const preferences: string[] = [];
      const text = conversation_text.toLowerCase();

      // Pattern recognition for explicit preferences
      const explicitPatterns = [
        /i prefer (?:to )?(.+?)(?:\.|$|,|\n)/g,
        /i like (?:to )?(.+?)(?:\.|$|,|\n)/g,
        /i always (?:use )?(.+?)(?:\.|$|,|\n)/g,
        /i never (?:use )?(.+?)(?:\.|$|,|\n)/g,
        /my preference is (?:to )?(.+?)(?:\.|$|,|\n)/g,
        /we should (?:always )?(.+?)(?:\.|$|,|\n)/g,
        /let's use (.+?)(?:\.|$|,|\n)/g,
        /make sure (?:to )?(.+?)(?:\.|$|,|\n)/g
      ];

      for (const pattern of explicitPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          if (match[1] && match[1].trim().length > 5 && match[1].trim().length < 200) {
            preferences.push(`Prefers to ${match[1].trim()}`);
          }
        }
      }

      // Code pattern analysis
      const codePatterns = {
        'TypeScript over JavaScript': /\.ts[x]?|typescript|interface \w+|type \w+/,
        'Functional programming patterns': /\.map\(|\.filter\(|\.reduce\(|const.*=.*=>|pure function/,
        'ESLint configuration': /eslint|\.eslintrc/,
        'Prettier formatting': /prettier|\.prettierrc/,
        'Jest testing framework': /jest|describe\(|it\(|test\(/,
        'React with hooks': /usestate|useeffect|usereact|react hooks/,
        'Component-based architecture': /component|\.component\.|export.*component/,
        'Async/await over promises': /async.*await|await.*async/,
        'Destructuring syntax': /const \{.*\} =|const \[.*\] =/,
        'JSDoc documentation': /\/\*\*.*@param|\/\*\*.*@returns|jsdoc/
      };

      for (const [preference, pattern] of Object.entries(codePatterns)) {
        if (pattern.test(text)) {
          preferences.push(`Uses ${preference}`);
        }
      }

      // Framework/library detection
      const frameworkPatterns = {
        'React development': /react|jsx|usestate|useeffect/,
        'Vue.js development': /vue|@vue|\.vue/,
        'Angular development': /angular|@angular|\.component\.ts/,
        'Node.js backend': /express|fastify|node\.js|npm/,
        'Python development': /python|\.py|def |import /,
        'Docker containerization': /docker|dockerfile|docker-compose/,
        'Git workflow': /git commit|pull request|merge|branch/
      };

      for (const [preference, pattern] of Object.entries(frameworkPatterns)) {
        if (pattern.test(text)) {
          preferences.push(`Works with ${preference}`);
        }
      }

      // Remove duplicates and filter quality
      const uniquePreferences = [...new Set(preferences)]
        .filter(pref => pref.length > 10 && pref.length < 150)
        .slice(0, 10); // Limit to top 10 most relevant

      if (uniquePreferences.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `🔍 **Preference Extraction Results**

❌ **No clear preferences detected** in the provided text.

**To improve detection, provide text that includes:**
- Explicit statements like "I prefer...", "I always use...", "I never..."
- Code examples showing patterns and choices
- Discussions about tools, frameworks, or methodologies
- Architecture or design decision explanations

**Manual preference storage:**
Use \`store_unified_memory\` with tier='core', scope='global' to manually add preferences.`
          }]
        };
      }

      let storedCount = 0;
      if (auto_store !== false) {
        // Store each preference in global core memory
        for (const preference of uniquePreferences) {
          try {
            await this.unifiedMemoryManager.store(
              preference,
              'core',
              'global',
              undefined,
              ['user-preference', 'extracted', context_description ? `context:${context_description}` : 'general'],
              { extracted_at: new Date().toISOString(), source: 'conversation_analysis' }
            );
            storedCount++;
          } catch (error) {
            // Continue with other preferences if one fails
            console.error(`Failed to store preference: ${preference}`, error);
          }
        }
      }

      const extractedList = uniquePreferences.map((pref, index) => `${index + 1}. ${pref}`).join('\n');

      return {
        content: [{
          type: 'text' as const,
          text: `🎯 **Preference Extraction Results**

✅ **Discovered ${uniquePreferences.length} coding preferences:**

${extractedList}

${auto_store !== false ? `📥 **Stored ${storedCount}/${uniquePreferences.length} preferences** in global core memory` : '🔄 **Analysis only** - preferences not stored (auto_store=false)'}

${context_description ? `📝 **Context:** ${context_description}` : ''}

**💡 Next Steps:**
- Use \`get_user_preferences\` to see all stored preferences
- Use \`curate_context\` to apply these preferences to project work
- Continue conversations mentioning preferences to improve detection

**🏷️ Tags:** user-preference, extracted${context_description ? `, context:${context_description}` : ', general'}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Failed to extract coding preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Curate comprehensive context combining user preferences, project context, and codebase insights
   */
  @MCPTool({
    name: 'curate_context',
    title: 'Curate Context',
    description: 'Generate comprehensive context for agent initialization by combining user preferences, project patterns, and codebase search with priority-weighted context',
    category: TOOL_CATEGORIES.MEMORY,
    permissions: [TOOL_PERMISSIONS.DATABASE_READ],
    rateLimit: 2, // Lower rate limit for comprehensive operation
    inputSchema: {
      task_description: z.string().min(1).describe('Description of the task or area of focus'),
      include_preferences: z.boolean().optional().default(true).describe('Include user preferences from global core memory'),
      include_project_patterns: z.boolean().optional().default(true).describe('Include project-specific patterns and conventions'),
      context_depth: z.enum(['minimal', 'standard', 'comprehensive']).optional().default('standard').describe('Depth of context to generate')
    }
  })
  async curateContext({
    task_description,
    include_preferences,
    include_project_patterns,
    context_depth
  }: {
    task_description: string;
    include_preferences?: boolean;
    include_project_patterns?: boolean;
    context_depth?: 'minimal' | 'standard' | 'comprehensive';
  }, context: ToolExecutionContext) {
    try {
      const contextSections: string[] = [];
      const currentProject = context.workspacePath || 'default';
      const maxResults = context_depth === 'minimal' ? 5 : (context_depth === 'comprehensive' ? 20 : 10);

      // 1. User Preferences (Highest Priority)
      let preferences: any[] = [];
      if (include_preferences !== false) {
        preferences = await this.unifiedMemoryManager.search(
          'prefer preference style pattern approach convention rule always never',
          {
            tier: 'core',
            scope: 'global',
            limit: maxResults
          }
        );

        if (preferences.length > 0) {
          const prefList = preferences.map(pref => `- ${pref.memory.content}`).join('\n');
          contextSections.push(`🎯 **User Preferences** (${preferences.length} items):
${prefList}`);
        }
      }

      // 2. Task-Specific Memory Search
      const taskMemories = await this.unifiedMemoryManager.search(
        task_description,
        {
          // Search both tiers and scopes for task-specific memories
          limit: maxResults
        }
      );

      if (taskMemories.length > 0) {
        const taskList = taskMemories.slice(0, context_depth === 'minimal' ? 3 : 8).map((mem, index) => {
          const tierIcon = mem.memory.tier === 'core' ? '⭐' : '📚';
          const scopeIcon = mem.memory.scope === 'global' ? '🌐' : '📁';
          return `${index + 1}. ${tierIcon}${scopeIcon} ${mem.memory.content}`;
        }).join('\n');

        contextSections.push(`🔍 **Task-Related Memories** (${taskMemories.length} found):
${taskList}`);
      }

      // 3. Project-Specific Patterns (if enabled)
      let projectMemories: any[] = [];
      if (include_project_patterns !== false) {
        projectMemories = await this.unifiedMemoryManager.search(
          'pattern convention architecture structure framework library',
          {
            scope: 'project',
            project_id: currentProject,
            limit: context_depth === 'comprehensive' ? 15 : 8
          }
        );

        if (projectMemories.length > 0) {
          const projectList = projectMemories.map(mem => `- ${mem.memory.content}`).join('\n');
          contextSections.push(`📁 **Project Patterns** (${projectMemories.length} items):
${projectList}`);
        }
      }

      // 4. Generate Context Summary
      const totalMemories = (include_preferences !== false ? preferences.length : 0) +
                           taskMemories.length +
                           (include_project_patterns !== false ? projectMemories.length : 0);

      if (contextSections.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `📋 **Curated Context for: "${task_description}"**

⚠️ **No relevant context found.**

**Recommendations:**
1. Store your preferences: \`get_user_preferences\` or \`extract_coding_preferences\`
2. Add project patterns: Use \`store_unified_memory\` with scope='project'
3. Provide more specific task description
4. Initialize project memory with \`init_project\`

**Current Search Coverage:**
- User Preferences: ${include_preferences !== false ? 'Enabled' : 'Disabled'}
- Project Patterns: ${include_project_patterns !== false ? 'Enabled' : 'Disabled'}
- Context Depth: ${context_depth}`
          }]
        };
      }

      // Generate comprehensive guidance
      const guidanceSection = this.generateContextGuidance(task_description, totalMemories, context_depth || 'standard');

      return {
        content: [{
          type: 'text' as const,
          text: `📋 **Curated Context for: "${task_description}"**

${contextSections.join('\n\n')}

${guidanceSection}

**🎯 Context Priority:** User Preferences → Project Patterns → Task-Specific Knowledge → General Expertise

**💡 Usage:** Apply this context when planning, implementing, and documenting your work to ensure consistency with established patterns and preferences.`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Failed to curate context: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Memorize permanent instructions for the agent
   * This modifies the copilot instructions file to add ALWAYS-remembered patterns
   */
  @MCPTool({
    name: 'memorize',
    title: 'Memorize Permanent Instructions',
    description: 'Add permanent instructions to copilot instructions that the agent must ALWAYS remember and follow',
    category: TOOL_CATEGORIES.PROJECT,
    permissions: [TOOL_PERMISSIONS.WRITE_FILES],
    rateLimit: 3, // 3 calls per second - limited for safety
    inputSchema: {
      instruction: z.string().min(1).describe('The permanent instruction/pattern the agent should ALWAYS remember'),
      category: z.enum(['coding-rules', 'architecture-patterns', 'never-do', 'always-do', 'project-specific', 'general']).describe('Category of the instruction'),
      priority: z.enum(['high', 'medium', 'low']).optional().default('medium').describe('Priority level (high instructions are shown more prominently)')
    }
  })
  async memorize({
    instruction,
    category,
    priority
  }: {
    instruction: string;
    category: 'coding-rules' | 'architecture-patterns' | 'never-do' | 'always-do' | 'project-specific' | 'general';
    priority?: 'high' | 'medium' | 'low';
  }) {
    try {
      const projectRoot = process.cwd();
      const copilotInstructionsPath = path.join(projectRoot, '.github', 'copilot-instructions.md');
      const copilotMdPath = path.join(projectRoot, 'COPILOT.md');

      // Check if instruction files exist
      const instructionsExist = await fs.access(copilotInstructionsPath).then(() => true).catch(() => false);
      const copilotMdExists = await fs.access(copilotMdPath).then(() => true).catch(() => false);

      if (!instructionsExist && !copilotMdExists) {
        return {
          content: [{
            type: 'text' as const,
            text: `❌ **Memorization Failed**

No copilot instruction files found in this project.

Please run \`init_project\` first to create the instruction files, then use the memorize tool.`
          }],
          isError: true
        };
      }

      // Create the memorization entry with metadata
      const timestamp = new Date().toISOString();
      const priorityIcon = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
      const categoryIcon = this.getCategoryIcon(category);

      const memorizedEntry = `
## ${priorityIcon} ${categoryIcon} MEMORIZED: ${this.formatCategoryName(category)}

**Added**: ${new Date().toLocaleDateString()}
**Priority**: ${priority?.toUpperCase()}

${instruction}

---
`;

      let filesUpdated = 0;
      const results: string[] = [];

      // Update ONLY .github/copilot-instructions.md (GitHub Copilot's instruction file)
      if (instructionsExist) {
        const instructionsContent = await fs.readFile(copilotInstructionsPath, 'utf8');

        // Find the memorized instructions section or create it
        let updatedContent;
        if (instructionsContent.includes('# 🧠 MEMORIZED INSTRUCTIONS')) {
          // Add to existing section
          const memorizedSectionIndex = instructionsContent.indexOf('# 🧠 MEMORIZED INSTRUCTIONS');
          const nextSectionIndex = instructionsContent.indexOf('\n#', memorizedSectionIndex + 1);

          if (nextSectionIndex === -1) {
            // Add to end of memorized section
            updatedContent = instructionsContent + memorizedEntry;
          } else {
            // Insert before next section
            updatedContent = instructionsContent.slice(0, nextSectionIndex) +
                             memorizedEntry +
                             instructionsContent.slice(nextSectionIndex);
          }
        } else {
          // Create new memorized section after the main protocol
          const protocolEndIndex = instructionsContent.indexOf('## Memory System Usage for GitHub Copilot');
          if (protocolEndIndex !== -1) {
            const insertionPoint = instructionsContent.indexOf('\n## ', protocolEndIndex + 1);
            const memorizedSection = `
# 🧠 MEMORIZED INSTRUCTIONS

**These are PERMANENT instructions that must ALWAYS be followed:**
${memorizedEntry}
`;
            if (insertionPoint !== -1) {
              updatedContent = instructionsContent.slice(0, insertionPoint) +
                               memorizedSection +
                               instructionsContent.slice(insertionPoint);
            } else {
              updatedContent = instructionsContent + memorizedSection;
            }
          } else {
            // Fallback: add at the end
            updatedContent = instructionsContent + `
# 🧠 MEMORIZED INSTRUCTIONS

**These are PERMANENT instructions that must ALWAYS be followed:**
${memorizedEntry}
`;
          }
        }

        await fs.writeFile(copilotInstructionsPath, updatedContent);
        filesUpdated++;
        results.push('✅ Updated .github/copilot-instructions.md');
      } else if (copilotMdExists) {
        // If GitHub Copilot instructions don't exist but COPILOT.md does,
        // suggest creating the proper instructions file
        return {
          content: [{
            type: 'text' as const,
            text: `⚠️ **GitHub Copilot Instructions Missing**

Found COPILOT.md but .github/copilot-instructions.md doesn't exist.

The memorize tool only updates .github/copilot-instructions.md (GitHub Copilot's instruction file).

Please run \`init_project\` to create the proper GitHub Copilot instruction file.`
          }],
          isError: true
        };
      }

      // DO NOT update COPILOT.md - memorize tool only affects GitHub Copilot instructions

      // Also store in core memory for immediate access
      await this.unifiedMemoryManager.store(
        `MEMORIZED ${category.toUpperCase()}: ${instruction}`,
        'core',
        'project',
        projectRoot,
        ['memorized', category, priority || 'medium'],
        {
          memorized: true,
          category,
          priority: priority || 'medium',
          timestamp,
          permanent: true
        }
      );

      return {
        content: [{
          type: 'text' as const,
          text: `🧠 **Instruction Memorized Successfully!**

**Instruction**: ${instruction}
**Category**: ${this.formatCategoryName(category)}
**Priority**: ${priority?.toUpperCase()} ${priorityIcon}

**Files Updated** (${filesUpdated}):
${results.join('\n')}

✅ **Added to GitHub Copilot instructions** (.github/copilot-instructions.md)
✅ **Stored in core memory** for immediate access

This instruction will now ALWAYS be followed by GitHub Copilot in this project.`
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Failed to memorize instruction: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }


  /**
   * Helper methods
   */
  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'coding-rules': '📝',
      'architecture-patterns': '🏗️',
      'never-do': '🚫',
      'always-do': '✅',
      'project-specific': '📁',
      'general': '💡'
    };
    return icons[category] || '💡';
  }

  private formatCategoryName(category: string): string {
    const names: Record<string, string> = {
      'coding-rules': 'Coding Rules',
      'architecture-patterns': 'Architecture Patterns',
      'never-do': 'Never Do This',
      'always-do': 'Always Do This',
      'project-specific': 'Project-Specific Rules',
      'general': 'General Instructions'
    };
    return names[category] || category;
  }


  private getCategoryDescriptor(categoryName: string): string {
    const descriptors: Record<string, string> = {
      'Coding Style & Patterns': '🎨',
      'Languages & Frameworks': '⚡',
      'Testing Approach': '🧪',
      'Documentation': '📚',
      'Architecture & Design': '🏗️',
      'Tools & Libraries': '🔧',
      'General Preferences': '⚙️'
    };
    return descriptors[categoryName] || '📋';
  }

  private generateContextGuidance(taskDescription: string, totalMemories: number, depth: string): string {
    const depthGuidance = {
      'minimal': 'Focus on core preferences and immediate requirements',
      'standard': 'Balance between thoroughness and practicality',
      'comprehensive': 'Include all relevant context and background information'
    };

    return `📊 **Context Summary:**
- Total Relevant Memories: ${totalMemories}
- Context Depth: ${depth} (${depthGuidance[depth as keyof typeof depthGuidance]})
- Task Focus: ${taskDescription.length > 50 ? taskDescription.substring(0, 50) + '...' : taskDescription}

**🎯 Implementation Guidance:**
- Apply user preferences consistently across all code
- Follow established project patterns and conventions
- Reference task-specific memories for context and constraints
- Maintain consistency with previous decisions and implementations`;
  }

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