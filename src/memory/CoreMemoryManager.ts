/**
 * Core Memory Manager - 2KB Letta-style memory blocks with compression
 * Implements fast, always-accessible memory blocks similar to Letta/MemGPT
 */

import * as zlib from 'zlib';
import { promisify } from 'util';
import { Memory, MemoryLayer } from '../types/index.js';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export interface MemoryBlock {
  id: string;
  content: string;
  compressed_content?: Buffer;
  is_compressed: boolean;
  priority: number;
  last_modified: Date;
  access_count: number;
  size_bytes: number;
  tags: string[];
  metadata?: Record<string, any>;
}

export interface CoreMemoryStats {
  total_blocks: number;
  total_size_bytes: number;
  max_size_bytes: number;
  compression_ratio: number;
  active_blocks: number;
  avg_access_count: number;
}

/**
 * Core Memory Manager implementing Letta-style memory blocks
 * - 2KB total limit (configurable)
 * - Automatic compression when approaching limits
 * - LRU eviction with intelligent prioritization
 * - Tool-based memory editing for GitHub Copilot
 */
export class CoreMemoryManager {
  private blocks: Map<string, MemoryBlock> = new Map();
  private maxTotalSize: number;
  private compressionThreshold: number;
  private currentSize: number = 0;

  constructor(maxSizeBytes: number = 2048, compressionThreshold: number = 0.8) {
    this.maxTotalSize = maxSizeBytes;
    this.compressionThreshold = compressionThreshold;
  }

  /**
   * Create or edit a memory block (Letta-style tool interface)
   * GitHub Copilot can call this through MCP tools
   */
  async editBlock(id: string, content: string, priority: number = 5, tags: string[] = []): Promise<void> {
    const contentSize = Buffer.byteLength(content, 'utf8');

    // Check if content exceeds maximum block size
    if (contentSize > this.maxTotalSize) {
      throw new Error(`Content size (${contentSize} bytes) exceeds maximum core memory limit (${this.maxTotalSize} bytes)`);
    }

    // Remove existing block if updating
    if (this.blocks.has(id)) {
      const existingBlock = this.blocks.get(id)!;
      this.currentSize -= existingBlock.size_bytes;
    }

    // Make space if needed
    await this.ensureSpace(contentSize);

    // Create new block
    const block: MemoryBlock = {
      id,
      content,
      is_compressed: false,
      priority,
      last_modified: new Date(),
      access_count: this.blocks.has(id) ? this.blocks.get(id)!.access_count : 0,
      size_bytes: contentSize,
      tags,
      metadata: {}
    };

    // Compress if we're approaching the limit
    if (this.currentSize + contentSize > this.maxTotalSize * this.compressionThreshold) {
      await this.compressBlock(block);
    }

    this.blocks.set(id, block);
    this.currentSize += block.size_bytes;

    console.log(`[CORE_MEMORY] Block ${id} edited: ${contentSize} bytes, priority ${priority}`);
  }

  /**
   * Get content from a memory block
   */
  async getBlock(id: string): Promise<string | null> {
    const block = this.blocks.get(id);
    if (!block) return null;

    // Update access pattern
    block.access_count++;
    block.last_modified = new Date();

    // Decompress if needed
    if (block.is_compressed && block.compressed_content) {
      const decompressed = await gunzip(block.compressed_content);
      return decompressed.toString('utf8');
    }

    return block.content;
  }

  /**
   * Delete a memory block
   */
  deleteBlock(id: string): boolean {
    const block = this.blocks.get(id);
    if (!block) return false;

    this.currentSize -= block.size_bytes;
    this.blocks.delete(id);

    console.log(`[CORE_MEMORY] Block ${id} deleted`);
    return true;
  }

  /**
   * List all memory blocks with metadata
   */
  listBlocks(): Array<{id: string, size: number, priority: number, compressed: boolean, tags: string[]}> {
    return Array.from(this.blocks.entries()).map(([id, block]) => ({
      id,
      size: block.size_bytes,
      priority: block.priority,
      compressed: block.is_compressed,
      tags: block.tags
    }));
  }

  /**
   * Search memory blocks by content or tags
   */
  async searchBlocks(query: string): Promise<Array<{id: string, content: string, score: number}>> {
    const results: Array<{id: string, content: string, score: number}> = [];
    const queryLower = query.toLowerCase();

    for (const [id, block] of this.blocks) {
      const content = await this.getBlock(id);
      if (!content) continue;

      let score = 0;
      const contentLower = content.toLowerCase();

      // Exact match bonus
      if (contentLower.includes(queryLower)) score += 100;

      // Tag match bonus
      if (block.tags.some(tag => tag.toLowerCase().includes(queryLower))) score += 80;

      // Word overlap scoring
      const contentWords = contentLower.split(/\s+/);
      const queryWords = queryLower.split(/\s+/);
      const overlap = queryWords.filter(word =>
        contentWords.some(cWord => cWord.includes(word))
      );
      score += (overlap.length / queryWords.length) * 60;

      // Priority and access frequency bonus
      score += block.priority * 2;
      score += Math.min(block.access_count, 20);

      if (score > 20) { // Threshold for relevance
        results.push({ id, content, score });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Get core memory statistics
   */
  getStats(): CoreMemoryStats {
    const blocks = Array.from(this.blocks.values());
    const compressedBlocks = blocks.filter(b => b.is_compressed);
    const totalUncompressedSize = blocks.reduce((sum, block) => {
      return sum + (block.is_compressed ? Buffer.byteLength(block.content, 'utf8') : block.size_bytes);
    }, 0);

    return {
      total_blocks: blocks.length,
      total_size_bytes: this.currentSize,
      max_size_bytes: this.maxTotalSize,
      compression_ratio: totalUncompressedSize > 0 ? this.currentSize / totalUncompressedSize : 1,
      active_blocks: blocks.filter(b => !b.is_compressed).length,
      avg_access_count: blocks.length > 0 ? blocks.reduce((sum, b) => sum + b.access_count, 0) / blocks.length : 0
    };
  }

  /**
   * Smart compression of memory blocks
   */
  private async compressBlock(block: MemoryBlock): Promise<void> {
    if (block.is_compressed) return;

    try {
      const compressed = await gzip(Buffer.from(block.content, 'utf8'));
      const originalSize = block.size_bytes;

      // Only compress if we get significant savings
      if (compressed.length < originalSize * 0.8) {
        block.compressed_content = compressed;
        block.is_compressed = true;
        block.size_bytes = compressed.length;

        // Clear uncompressed content to save memory
        block.content = '';

        console.log(`[CORE_MEMORY] Block ${block.id} compressed: ${originalSize} -> ${compressed.length} bytes`);
      }
    } catch (error) {
      console.error(`[CORE_MEMORY] Failed to compress block ${block.id}:`, error);
    }
  }

  /**
   * Ensure there's enough space for new content
   * Uses LRU eviction with priority weighting
   */
  private async ensureSpace(requiredBytes: number): Promise<void> {
    while (this.currentSize + requiredBytes > this.maxTotalSize) {
      // Find least valuable block to evict
      let minScore = Infinity;
      let victimId: string | null = null;

      for (const [id, block] of this.blocks) {
        // Score calculation: lower is worse (more likely to be evicted)
        // High priority and recent access = high score (keep)
        const daysSinceAccess = (Date.now() - block.last_modified.getTime()) / (1000 * 60 * 60 * 24);
        const score = (block.priority * 10) + (block.access_count * 2) - (daysSinceAccess * 5);

        if (score < minScore) {
          minScore = score;
          victimId = id;
        }
      }

      if (victimId) {
        const victim = this.blocks.get(victimId)!;
        this.currentSize -= victim.size_bytes;
        this.blocks.delete(victimId);
        console.log(`[CORE_MEMORY] Evicted block ${victimId} (score: ${minScore.toFixed(1)})`);
      } else {
        // No blocks to evict
        throw new Error('Cannot make space: no blocks available for eviction');
      }
    }

    // Try compressing existing blocks if we're still tight on space
    if (this.currentSize + requiredBytes > this.maxTotalSize * this.compressionThreshold) {
      await this.compressAllBlocks();
    }
  }

  /**
   * Compress all uncompressed blocks
   */
  private async compressAllBlocks(): Promise<void> {
    for (const block of this.blocks.values()) {
      if (!block.is_compressed) {
        await this.compressBlock(block);
      }
    }
  }

  /**
   * Convert core memory to standard Memory format for compatibility
   */
  async exportAsMemories(): Promise<Memory[]> {
    const memories: Memory[] = [];

    for (const [id, block] of this.blocks) {
      const content = await this.getBlock(id);
      if (content) {
        memories.push({
          id,
          content,
          layer: 'preference' as MemoryLayer, // Core memory maps to preferences
          tags: block.tags,
          created_at: block.last_modified,
          accessed_at: block.last_modified,
          access_count: block.access_count,
          metadata: {
            ...block.metadata,
            core_memory: true,
            priority: block.priority,
            compressed: block.is_compressed,
            size_bytes: block.size_bytes
          }
        });
      }
    }

    return memories;
  }

  /**
   * Clear all memory blocks
   */
  clear(): void {
    this.blocks.clear();
    this.currentSize = 0;
    console.log('[CORE_MEMORY] All blocks cleared');
  }
}