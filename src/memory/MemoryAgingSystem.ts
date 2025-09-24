/**
 * Memory Aging and Relevance Scoring System
 *
 * Implements sophisticated aging algorithms that consider:
 * - Content type and temporal relevance
 * - Usage patterns and access frequency decay
 * - Contextual importance scoring
 * - Adaptive aging rates based on memory characteristics
 * - Cross-memory relationship strength
 */

import Database from 'better-sqlite3';
import { UnifiedMemory, MemoryTier, MemoryScope } from '../types/index.js';

// Core aging types
export interface AgingProfile {
  memory_id: string;
  content_type: ContentType;
  aging_rate: number; // 0-1, higher = ages faster
  temporal_decay: number; // Time-based relevance decay
  usage_based_score: number; // Relevance based on usage patterns
  contextual_relevance: number; // Current context relevance
  relationship_boost: number; // Boost from related memories
  composite_score: number; // Final relevance score
  aging_phase: AgingPhase;
  half_life_days: number; // Days until relevance drops by 50%
  next_evaluation: Date;
}

export type ContentType =
  | 'code_snippet'
  | 'configuration'
  | 'documentation'
  | 'user_preference'
  | 'project_context'
  | 'temporary_note'
  | 'system_state'
  | 'learning_data'
  | 'reference_material'
  | 'workflow_pattern';

export type AgingPhase =
  | 'fresh' // Recently created, high relevance
  | 'active' // Regularly accessed, stable relevance
  | 'stable' // Mature, predictable access patterns
  | 'declining' // Decreasing relevance
  | 'dormant' // Rarely accessed but may have value
  | 'stale' // Very low relevance, archival candidate
  | 'deprecated'; // Explicitly marked for removal

export interface RelevanceFactors {
  temporal: number; // Time-based relevance (0-1)
  usage: number; // Access-based relevance (0-1)
  contextual: number; // Current context relevance (0-1)
  semantic: number; // Content semantic value (0-1)
  relationship: number; // Connected memories boost (0-1)
  system: number; // System importance (0-1)
}

export interface AgingConfiguration {
  content_type_multipliers: Map<ContentType, number>;
  phase_transition_thresholds: Map<AgingPhase, number>;
  decay_functions: Map<ContentType, (age: number, access: number) => number>;
  relationship_decay_rate: number;
  context_relevance_window_hours: number;
  minimum_archival_age_days: number;
}

/**
 * Advanced Memory Aging Engine
 *
 * Features:
 * - Content-aware aging rates
 * - Multi-factor relevance scoring
 * - Adaptive half-life calculation
 * - Cross-memory relationship consideration
 * - Context-sensitive relevance adjustment
 */
export class MemoryAgingSystem {
  private database: Database.Database;
  private config: AgingConfiguration;

  // Content-type specific aging configurations
  private readonly CONTENT_TYPE_CONFIGS = new Map<ContentType, {
    base_half_life_days: number;
    usage_sensitivity: number;
    context_importance: number;
    relationship_factor: number;
  }>([
    ['code_snippet', { base_half_life_days: 30, usage_sensitivity: 0.8, context_importance: 0.9, relationship_factor: 0.7 }],
    ['configuration', { base_half_life_days: 90, usage_sensitivity: 0.3, context_importance: 0.8, relationship_factor: 0.5 }],
    ['documentation', { base_half_life_days: 180, usage_sensitivity: 0.4, context_importance: 0.6, relationship_factor: 0.8 }],
    ['user_preference', { base_half_life_days: 365, usage_sensitivity: 0.9, context_importance: 0.5, relationship_factor: 0.2 }],
    ['project_context', { base_half_life_days: 60, usage_sensitivity: 0.7, context_importance: 1.0, relationship_factor: 0.9 }],
    ['temporary_note', { base_half_life_days: 7, usage_sensitivity: 0.9, context_importance: 0.3, relationship_factor: 0.1 }],
    ['system_state', { base_half_life_days: 1, usage_sensitivity: 0.1, context_importance: 0.4, relationship_factor: 0.0 }],
    ['learning_data', { base_half_life_days: 120, usage_sensitivity: 0.6, context_importance: 0.7, relationship_factor: 0.8 }],
    ['reference_material', { base_half_life_days: 365, usage_sensitivity: 0.2, context_importance: 0.5, relationship_factor: 0.9 }],
    ['workflow_pattern', { base_half_life_days: 45, usage_sensitivity: 0.8, context_importance: 0.8, relationship_factor: 0.6 }],
  ]);

  constructor(database: Database.Database) {
    this.database = database;
    this.config = this.initializeConfiguration();
  }

  /**
   * Calculate comprehensive relevance score for a memory
   */
  public async calculateRelevanceScore(memoryId: string, currentContext?: string): Promise<RelevanceFactors> {
    // Get memory and behavioral data
    const memory = this.database.prepare(`
      SELECT um.*, mbp.access_frequency_score, mbp.access_regularity_score
      FROM unified_memories um
      LEFT JOIN memory_behavioral_patterns mbp ON um.id = mbp.memory_id
      WHERE um.id = ?
    `).get(memoryId) as any;

    if (!memory) {
      throw new Error(`Memory ${memoryId} not found`);
    }

    const contentType = this.inferContentType(memory);
    const config = this.CONTENT_TYPE_CONFIGS.get(contentType)!;

    // Calculate individual relevance factors
    const temporal = this.calculateTemporalRelevance(memory, config);
    const usage = this.calculateUsageRelevance(memory, config);
    const contextual = await this.calculateContextualRelevance(memory, currentContext, config);
    const semantic = this.calculateSemanticRelevance(memory, config);
    const relationship = await this.calculateRelationshipBoost(memory, config);
    const system = this.calculateSystemImportance(memory, config);

    return {
      temporal,
      usage,
      contextual,
      semantic,
      relationship,
      system
    };
  }

  /**
   * Generate aging profile for a memory
   */
  public async generateAgingProfile(memoryId: string, currentContext?: string): Promise<AgingProfile> {
    const memory = this.database.prepare(`
      SELECT * FROM unified_memories WHERE id = ?
    `).get(memoryId) as any;

    const relevanceFactors = await this.calculateRelevanceScore(memoryId, currentContext);
    const contentType = this.inferContentType(memory);
    const config = this.CONTENT_TYPE_CONFIGS.get(contentType)!;

    // Calculate composite relevance score
    const weights = {
      temporal: 0.25,
      usage: 0.30,
      contextual: 0.20,
      semantic: 0.10,
      relationship: 0.10,
      system: 0.05
    };

    const composite_score = Object.entries(relevanceFactors).reduce((sum, [factor, value]) => {
      return sum + value * weights[factor as keyof RelevanceFactors];
    }, 0);

    // Calculate aging rate (higher composite score = lower aging rate)
    const aging_rate = Math.max(0.1, 1.0 - composite_score);

    // Determine aging phase
    const aging_phase = this.determineAgingPhase(memory, relevanceFactors, composite_score);

    // Calculate adaptive half-life
    const base_half_life = config.base_half_life_days;
    const usage_modifier = 1.0 + (relevanceFactors.usage - 0.5) * config.usage_sensitivity;
    const context_modifier = 1.0 + (relevanceFactors.contextual - 0.5) * config.context_importance;
    const half_life_days = base_half_life * usage_modifier * context_modifier;

    // Schedule next evaluation
    const evaluation_interval = Math.max(1, Math.floor(half_life_days / 4)); // Evaluate 4 times per half-life
    const next_evaluation = new Date(Date.now() + evaluation_interval * 24 * 60 * 60 * 1000);

    const profile: AgingProfile = {
      memory_id: memoryId,
      content_type: contentType,
      aging_rate,
      temporal_decay: relevanceFactors.temporal,
      usage_based_score: relevanceFactors.usage,
      contextual_relevance: relevanceFactors.contextual,
      relationship_boost: relevanceFactors.relationship,
      composite_score,
      aging_phase,
      half_life_days,
      next_evaluation
    };

    // Store aging profile in database
    await this.storeAgingProfile(profile);

    return profile;
  }

  /**
   * Update aging profiles for all memories
   */
  public async updateAllAgingProfiles(currentContext?: string): Promise<{
    updated: number;
    phase_transitions: Map<AgingPhase, number>;
    archival_candidates: string[];
    promotion_candidates: string[];
  }> {
    const memories = this.database.prepare(`
      SELECT id FROM unified_memories
    `).all() as Array<{id: string}>;

    let updated = 0;
    const phase_transitions = new Map<AgingPhase, number>();
    const archival_candidates: string[] = [];
    const promotion_candidates: string[] = [];

    for (const memory of memories) {
      try {
        const oldProfile = await this.getStoredAgingProfile(memory.id);
        const newProfile = await this.generateAgingProfile(memory.id, currentContext);

        // Track phase transitions
        if (oldProfile && oldProfile.aging_phase !== newProfile.aging_phase) {
          phase_transitions.set(
            newProfile.aging_phase,
            (phase_transitions.get(newProfile.aging_phase) || 0) + 1
          );
        }

        // Identify candidates for tier changes
        if (newProfile.aging_phase === 'stale' || newProfile.aging_phase === 'deprecated') {
          archival_candidates.push(memory.id);
        } else if (newProfile.composite_score > 0.8 && newProfile.aging_phase === 'active') {
          promotion_candidates.push(memory.id);
        }

        updated++;
      } catch (error) {
        console.error(`Error updating aging profile for ${memory.id}:`, error);
      }
    }

    return {
      updated,
      phase_transitions,
      archival_candidates,
      promotion_candidates
    };
  }

  /**
   * Get memories requiring immediate attention based on aging analysis
   */
  public async getMemoriesRequiringAction(): Promise<{
    stale_memories: Array<{memory_id: string, aging_profile: AgingProfile, days_since_access: number}>;
    over_promoted: Array<{memory_id: string, current_tier: MemoryTier, suggested_tier: MemoryTier}>;
    under_promoted: Array<{memory_id: string, current_tier: MemoryTier, suggested_tier: MemoryTier}>;
    relationship_updates: Array<{memory_id: string, related_memories: string[], strength_change: number}>;
  }> {
    // Get all memories with aging profiles
    const results = this.database.prepare(`
      SELECT
        um.id,
        um.tier,
        um.accessed_at,
        ap.aging_phase,
        ap.composite_score,
        ap.half_life_days
      FROM unified_memories um
      LEFT JOIN aging_profiles ap ON um.id = ap.memory_id
      WHERE ap.memory_id IS NOT NULL
    `).all() as Array<{
      id: string;
      tier: MemoryTier;
      accessed_at: string;
      aging_phase: AgingPhase;
      composite_score: number;
      half_life_days: number;
    }>;

    const stale_memories: Array<{memory_id: string, aging_profile: AgingProfile, days_since_access: number}> = [];
    const over_promoted: Array<{memory_id: string, current_tier: MemoryTier, suggested_tier: MemoryTier}> = [];
    const under_promoted: Array<{memory_id: string, current_tier: MemoryTier, suggested_tier: MemoryTier}> = [];

    for (const memory of results) {
      const days_since_access = (Date.now() - new Date(memory.accessed_at).getTime()) / (24 * 60 * 60 * 1000);

      // Identify stale memories
      if (memory.aging_phase === 'stale' || days_since_access > memory.half_life_days * 2) {
        const profile = await this.getStoredAgingProfile(memory.id);
        if (profile) {
          stale_memories.push({
            memory_id: memory.id,
            aging_profile: profile,
            days_since_access
          });
        }
      }

      // Identify tier mismatches
      if (memory.tier === 'core' && memory.composite_score < 0.4) {
        over_promoted.push({
          memory_id: memory.id,
          current_tier: memory.tier,
          suggested_tier: 'longterm'
        });
      } else if (memory.tier === 'longterm' && memory.composite_score > 0.8) {
        under_promoted.push({
          memory_id: memory.id,
          current_tier: memory.tier,
          suggested_tier: 'core'
        });
      }
    }

    return {
      stale_memories,
      over_promoted,
      under_promoted,
      relationship_updates: [] // Would implement relationship analysis
    };
  }

  // Private calculation methods

  private calculateTemporalRelevance(memory: any, config: any): number {
    const age_hours = (Date.now() - new Date(memory.created_at).getTime()) / (60 * 60 * 1000);
    const half_life_hours = config.base_half_life_days * 24;

    // Exponential decay function
    return Math.pow(0.5, age_hours / half_life_hours);
  }

  private calculateUsageRelevance(memory: any, config: any): number {
    const access_count = memory.access_count || 0;
    const frequency_score = memory.access_frequency_score || 0;

    // Combine access count and frequency with diminishing returns
    const count_score = Math.min(1.0, access_count / 20.0); // Normalize to 20 accesses
    const combined_score = (count_score * 0.4) + (frequency_score * 0.6);

    return Math.pow(combined_score, 1.0 - config.usage_sensitivity);
  }

  private async calculateContextualRelevance(memory: any, currentContext?: string, config?: any): Promise<number> {
    if (!currentContext) return 0.5; // Neutral if no context provided

    // Get recent accesses in similar contexts
    const contextual_accesses = this.database.prepare(`
      SELECT COUNT(*) as count
      FROM memory_access_log
      WHERE memory_id = ?
        AND context_type LIKE ?
        AND access_timestamp > ?
    `).get(
      memory.id,
      `%${currentContext}%`,
      Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000) // Last 24 hours
    ) as {count: number};

    const base_relevance = Math.min(1.0, contextual_accesses.count / 5.0);

    // Check for content keywords matching current context
    const content_relevance = this.calculateContentContextMatch(memory.content, currentContext);

    return (base_relevance * 0.6) + (content_relevance * 0.4);
  }

  private calculateSemanticRelevance(memory: any, config: any): number {
    // Analyze content quality and information density
    const content = memory.content || '';
    const word_count = content.split(/\s+/).length;
    const unique_words = new Set(content.toLowerCase().split(/\s+/)).size;

    // Information density score
    const density_score = word_count > 0 ? unique_words / word_count : 0;

    // Content structure score (presence of structured data)
    const structure_indicators = ['{', '}', '[', ']', ':', '=', '->', '=>'];
    const structure_score = structure_indicators.reduce((score, indicator) => {
      return score + (content.includes(indicator) ? 0.1 : 0);
    }, 0);

    return Math.min(1.0, density_score + structure_score);
  }

  private async calculateRelationshipBoost(memory: any, config: any): Promise<number> {
    // Get strongly related memories and their relevance scores
    const relationships = this.database.prepare(`
      SELECT mr.strength, ap.composite_score
      FROM memory_relationships mr
      LEFT JOIN aging_profiles ap ON (
        CASE
          WHEN mr.memory_a_id = ? THEN mr.memory_b_id
          ELSE mr.memory_a_id
        END = ap.memory_id
      )
      WHERE (mr.memory_a_id = ? OR mr.memory_b_id = ?)
        AND mr.strength > 0.3
    `).all(memory.id, memory.id, memory.id) as Array<{strength: number, composite_score: number | null}>;

    if (relationships.length === 0) return 0.0;

    // Calculate weighted average of related memory relevance
    const weighted_sum = relationships.reduce((sum, rel) => {
      const related_score = rel.composite_score || 0.5;
      return sum + (rel.strength * related_score);
    }, 0);

    const total_weight = relationships.reduce((sum, rel) => sum + rel.strength, 0);

    return total_weight > 0 ? weighted_sum / total_weight : 0.0;
  }

  private calculateSystemImportance(memory: any, config: any): number {
    // System memories and configurations have higher importance
    if (memory.scope === 'global') return 0.3;
    if (memory.tags && memory.tags.includes('system')) return 0.5;
    if (memory.tags && memory.tags.includes('config')) return 0.4;

    return 0.1; // Base system importance
  }

  private determineAgingPhase(memory: any, factors: RelevanceFactors, composite_score: number): AgingPhase {
    const age_days = (Date.now() - new Date(memory.created_at).getTime()) / (24 * 60 * 60 * 1000);
    const access_count = memory.access_count || 0;

    // Fresh phase: recently created
    if (age_days < 1) return 'fresh';

    // Deprecated: explicitly marked
    if (memory.tags && memory.tags.includes('deprecated')) return 'deprecated';

    // Stale: very low relevance or very old with no access
    if (composite_score < 0.2 || (age_days > 180 && access_count === 0)) return 'stale';

    // Dormant: low usage but potentially valuable
    if (factors.usage < 0.3 && factors.semantic > 0.6) return 'dormant';

    // Declining: decreasing usage trend
    if (factors.usage < 0.4 && age_days > 30) return 'declining';

    // Active: regular access and good relevance
    if (factors.usage > 0.6 && composite_score > 0.5) return 'active';

    // Stable: predictable patterns
    if (composite_score > 0.4 && age_days > 7) return 'stable';

    return 'stable'; // Default case
  }

  private inferContentType(memory: any): ContentType {
    const content = memory.content.toLowerCase();
    const tags = memory.tags || [];

    // Rule-based content type inference
    if (content.includes('function') || content.includes('class') || content.includes('import')) return 'code_snippet';
    if (content.includes('config') || content.includes('setting') || tags.includes('config')) return 'configuration';
    if (content.includes('documentation') || content.includes('readme') || tags.includes('docs')) return 'documentation';
    if (content.includes('preference') || content.includes('setting') || memory.scope === 'global') return 'user_preference';
    if (content.includes('project') || memory.scope === 'project') return 'project_context';
    if (content.includes('todo') || content.includes('note') || content.includes('reminder')) return 'temporary_note';
    if (content.includes('state') || content.includes('status') || tags.includes('system')) return 'system_state';
    if (content.includes('learn') || content.includes('pattern') || tags.includes('learning')) return 'learning_data';
    if (content.includes('reference') || content.includes('doc') || tags.includes('reference')) return 'reference_material';
    if (content.includes('workflow') || content.includes('process') || content.includes('step')) return 'workflow_pattern';

    return 'temporary_note'; // Default fallback
  }

  private calculateContentContextMatch(content: string, context: string): number {
    const content_words = new Set(content.toLowerCase().split(/\s+/));
    const context_words = new Set(context.toLowerCase().split(/\s+/));

    const intersection = new Set([...content_words].filter(word => context_words.has(word)));
    const union = new Set([...content_words, ...context_words]);

    return intersection.size / Math.max(union.size, 1);
  }

  private async storeAgingProfile(profile: AgingProfile): Promise<void> {
    this.database.prepare(`
      INSERT OR REPLACE INTO aging_profiles (
        memory_id, content_type, aging_rate, temporal_decay,
        usage_based_score, contextual_relevance, relationship_boost,
        composite_score, aging_phase, half_life_days, next_evaluation,
        last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      profile.memory_id,
      profile.content_type,
      profile.aging_rate,
      profile.temporal_decay,
      profile.usage_based_score,
      profile.contextual_relevance,
      profile.relationship_boost,
      profile.composite_score,
      profile.aging_phase,
      profile.half_life_days,
      Math.floor(profile.next_evaluation.getTime() / 1000),
      Math.floor(Date.now() / 1000)
    );
  }

  private async getStoredAgingProfile(memoryId: string): Promise<AgingProfile | null> {
    const row = this.database.prepare(`
      SELECT * FROM aging_profiles WHERE memory_id = ?
    `).get(memoryId) as any;

    if (!row) return null;

    return {
      memory_id: row.memory_id,
      content_type: row.content_type,
      aging_rate: row.aging_rate,
      temporal_decay: row.temporal_decay,
      usage_based_score: row.usage_based_score,
      contextual_relevance: row.contextual_relevance,
      relationship_boost: row.relationship_boost,
      composite_score: row.composite_score,
      aging_phase: row.aging_phase,
      half_life_days: row.half_life_days,
      next_evaluation: new Date(row.next_evaluation * 1000)
    };
  }

  private initializeConfiguration(): AgingConfiguration {
    return {
      content_type_multipliers: new Map([
        ['temporary_note', 2.0],
        ['system_state', 3.0],
        ['user_preference', 0.1],
        ['reference_material', 0.2],
      ]),
      phase_transition_thresholds: new Map([
        ['fresh', 0.8],
        ['active', 0.6],
        ['stable', 0.4],
        ['declining', 0.3],
        ['dormant', 0.2],
        ['stale', 0.1],
      ]),
      decay_functions: new Map(),
      relationship_decay_rate: 0.95,
      context_relevance_window_hours: 24,
      minimum_archival_age_days: 30
    };
  }
}

// Extend database schema for aging profiles
export const AGING_PROFILE_SCHEMA = `
CREATE TABLE IF NOT EXISTS aging_profiles (
  memory_id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  aging_rate REAL NOT NULL,
  temporal_decay REAL NOT NULL,
  usage_based_score REAL NOT NULL,
  contextual_relevance REAL NOT NULL,
  relationship_boost REAL NOT NULL,
  composite_score REAL NOT NULL,
  aging_phase TEXT NOT NULL,
  half_life_days REAL NOT NULL,
  next_evaluation INTEGER NOT NULL,
  last_updated INTEGER NOT NULL,

  FOREIGN KEY (memory_id) REFERENCES unified_memories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_aging_phase_score ON aging_profiles(aging_phase, composite_score);
CREATE INDEX IF NOT EXISTS idx_aging_evaluation_due ON aging_profiles(next_evaluation);
CREATE INDEX IF NOT EXISTS idx_aging_composite_score ON aging_profiles(composite_score DESC);
`;