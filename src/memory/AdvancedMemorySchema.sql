-- Advanced Memory Analytics Schema Extensions
-- Enhances the unified_memories table with comprehensive analytics tracking

-- Create analytics tracking table for access patterns
CREATE TABLE IF NOT EXISTS memory_access_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memory_id TEXT NOT NULL,
    access_type TEXT NOT NULL CHECK (access_type IN ('read', 'search_match', 'context_load', 'update')),
    access_timestamp INTEGER NOT NULL, -- Unix timestamp for efficient queries
    context_type TEXT, -- 'project_init', 'search_query', 'mode_activation', etc.
    query_terms TEXT, -- JSON array of search terms that matched this memory
    relevance_score REAL, -- 0-1 score indicating relevance of this access
    session_id TEXT, -- Group related accesses
    user_metadata TEXT DEFAULT '{}', -- JSON for extensible tracking

    FOREIGN KEY (memory_id) REFERENCES unified_memories(id) ON DELETE CASCADE
);

-- Create behavioral pattern analysis table
CREATE TABLE IF NOT EXISTS memory_behavioral_patterns (
    memory_id TEXT PRIMARY KEY,

    -- Access Pattern Metrics
    access_frequency_score REAL DEFAULT 0.0, -- Weighted frequency considering recency
    access_regularity_score REAL DEFAULT 0.0, -- How regular/predictable access patterns are
    co_access_memories TEXT DEFAULT '[]', -- JSON array of memory IDs frequently accessed together

    -- Temporal Patterns
    peak_access_hours TEXT DEFAULT '[]', -- JSON array of hours when most accessed
    access_day_pattern TEXT DEFAULT '{}', -- JSON: {"monday": 0.3, "tuesday": 0.1, ...}
    seasonal_pattern REAL DEFAULT 0.0, -- Long-term usage trend

    -- Context Patterns
    primary_contexts TEXT DEFAULT '[]', -- JSON array of main contexts where accessed
    context_diversity REAL DEFAULT 0.0, -- How many different contexts this memory appears in

    -- Content Evolution
    content_stability REAL DEFAULT 1.0, -- How often content changes (1.0 = never changes)
    last_content_hash TEXT, -- SHA256 of content for change detection
    update_frequency REAL DEFAULT 0.0, -- Updates per day

    -- Predictive Scores
    predicted_next_access INTEGER, -- Unix timestamp of predicted next access
    tier_optimization_score REAL DEFAULT 0.0, -- Score for optimal tier placement
    archival_probability REAL DEFAULT 0.0, -- Probability this memory should be archived

    -- Learning Metadata
    last_analysis_timestamp INTEGER DEFAULT 0,
    analysis_confidence REAL DEFAULT 0.0, -- Confidence in behavioral predictions

    FOREIGN KEY (memory_id) REFERENCES unified_memories(id) ON DELETE CASCADE
);

-- Create memory relationships table for semantic clustering
CREATE TABLE IF NOT EXISTS memory_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memory_a_id TEXT NOT NULL,
    memory_b_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('semantic', 'temporal', 'contextual', 'causal')),
    strength REAL NOT NULL CHECK (strength >= 0.0 AND strength <= 1.0),
    confidence REAL NOT NULL DEFAULT 0.5 CHECK (confidence >= 0.0 AND confidence <= 1.0),
    created_timestamp INTEGER NOT NULL,
    last_validated_timestamp INTEGER,
    validation_count INTEGER DEFAULT 0,

    FOREIGN KEY (memory_a_id) REFERENCES unified_memories(id) ON DELETE CASCADE,
    FOREIGN KEY (memory_b_id) REFERENCES unified_memories(id) ON DELETE CASCADE,

    UNIQUE(memory_a_id, memory_b_id, relationship_type)
);

-- Create system performance metrics table
CREATE TABLE IF NOT EXISTS system_performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('search_latency', 'storage_operation', 'tier_migration', 'memory_usage')),

    -- Performance Metrics
    operation_duration_ms REAL NOT NULL,
    memory_usage_mb REAL,
    cpu_usage_percent REAL,
    io_operations_count INTEGER,

    -- Context Information
    operation_context TEXT NOT NULL, -- 'search', 'store', 'migrate', 'analyze'
    data_size_bytes INTEGER,
    result_count INTEGER,
    cache_hit_ratio REAL,

    -- Optimization Indicators
    efficiency_score REAL, -- 0-1 score for operation efficiency
    bottleneck_indicator TEXT, -- 'cpu', 'io', 'memory', 'network'
    optimization_applied TEXT DEFAULT '[]' -- JSON array of optimizations in effect
);

-- Create memory usage sessions table
CREATE TABLE IF NOT EXISTS memory_sessions (
    id TEXT PRIMARY KEY, -- UUID
    start_timestamp INTEGER NOT NULL,
    end_timestamp INTEGER,
    session_type TEXT NOT NULL CHECK (session_type IN ('interactive', 'batch', 'background')),

    -- Session Statistics
    memories_accessed INTEGER DEFAULT 0,
    searches_performed INTEGER DEFAULT 0,
    memories_created INTEGER DEFAULT 0,
    memories_updated INTEGER DEFAULT 0,

    -- Performance Metrics
    total_search_time_ms INTEGER DEFAULT 0,
    total_storage_time_ms INTEGER DEFAULT 0,
    cache_efficiency REAL DEFAULT 0.0,

    -- Context Information
    project_id TEXT,
    user_agent TEXT,
    session_metadata TEXT DEFAULT '{}'
);

-- Indexes for optimal analytics performance
CREATE INDEX IF NOT EXISTS idx_access_log_memory_time ON memory_access_log(memory_id, access_timestamp);
CREATE INDEX IF NOT EXISTS idx_access_log_type_time ON memory_access_log(access_type, access_timestamp);
CREATE INDEX IF NOT EXISTS idx_access_log_session ON memory_access_log(session_id, access_timestamp);

CREATE INDEX IF NOT EXISTS idx_behavioral_frequency ON memory_behavioral_patterns(access_frequency_score DESC);
CREATE INDEX IF NOT EXISTS idx_behavioral_optimization ON memory_behavioral_patterns(tier_optimization_score DESC);
CREATE INDEX IF NOT EXISTS idx_behavioral_archival ON memory_behavioral_patterns(archival_probability DESC);

CREATE INDEX IF NOT EXISTS idx_relationships_strength ON memory_relationships(relationship_type, strength DESC);
CREATE INDEX IF NOT EXISTS idx_relationships_memory_a ON memory_relationships(memory_a_id, strength DESC);

CREATE INDEX IF NOT EXISTS idx_performance_type_time ON system_performance_metrics(metric_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_efficiency ON system_performance_metrics(efficiency_score, timestamp);

-- Enhanced unified_memories table with analytics columns
-- (This would be an ALTER TABLE in practice)
/*
ALTER TABLE unified_memories ADD COLUMN access_velocity REAL DEFAULT 0.0; -- Accesses per hour trend
ALTER TABLE unified_memories ADD COLUMN last_search_match_timestamp INTEGER;
ALTER TABLE unified_memories ADD COLUMN search_hit_rate REAL DEFAULT 0.0; -- Percentage of searches that find this memory
ALTER TABLE unified_memories ADD COLUMN context_breadth INTEGER DEFAULT 0; -- Number of different contexts accessed from
ALTER TABLE unified_memories ADD COLUMN content_embedding_version INTEGER DEFAULT 0; -- For semantic search optimization
ALTER TABLE unified_memories ADD COLUMN tier_stability_score REAL DEFAULT 1.0; -- How stable the current tier assignment is
ALTER TABLE unified_memories ADD COLUMN predicted_access_pattern TEXT DEFAULT '{}'; -- JSON: next likely access times
ALTER TABLE unified_memories ADD COLUMN optimization_flags TEXT DEFAULT '[]'; -- JSON: applied optimizations
*/

-- Views for common analytics queries
CREATE VIEW IF NOT EXISTS memory_analytics_summary AS
SELECT
    um.id,
    um.tier,
    um.scope,
    um.content_size,
    um.access_count,
    um.accessed_at,
    mbp.access_frequency_score,
    mbp.tier_optimization_score,
    mbp.archival_probability,
    COUNT(mal.id) as detailed_access_count,
    AVG(mal.relevance_score) as avg_relevance_score,
    MAX(mal.access_timestamp) as last_detailed_access
FROM unified_memories um
LEFT JOIN memory_behavioral_patterns mbp ON um.id = mbp.memory_id
LEFT JOIN memory_access_log mal ON um.id = mal.memory_id
GROUP BY um.id;

CREATE VIEW IF NOT EXISTS tier_performance_analysis AS
SELECT
    tier,
    COUNT(*) as memory_count,
    AVG(content_size) as avg_size,
    AVG(access_count) as avg_access_count,
    AVG(mbp.access_frequency_score) as avg_frequency_score,
    AVG(mbp.tier_optimization_score) as avg_optimization_score,
    COUNT(CASE WHEN mbp.tier_optimization_score < 0.3 THEN 1 END) as misplaced_count
FROM unified_memories um
LEFT JOIN memory_behavioral_patterns mbp ON um.id = mbp.memory_id
GROUP BY tier;

-- Triggers for automatic analytics updates
CREATE TRIGGER IF NOT EXISTS update_access_patterns_on_read
    AFTER UPDATE OF accessed_at ON unified_memories
    FOR EACH ROW
    WHEN NEW.accessed_at > OLD.accessed_at
BEGIN
    -- Log the access
    INSERT INTO memory_access_log (
        memory_id,
        access_type,
        access_timestamp,
        context_type,
        session_id
    ) VALUES (
        NEW.id,
        'read',
        strftime('%s', NEW.accessed_at),
        'direct_access',
        'system_generated'
    );

    -- Initialize behavioral pattern if not exists
    INSERT OR IGNORE INTO memory_behavioral_patterns (memory_id) VALUES (NEW.id);
END;

-- Analytics Functions (as SQL functions where supported, or as application logic)

-- Function to calculate access frequency score (implemented in application)
/*
FUNCTION calculate_access_frequency_score(memory_id TEXT) RETURNS REAL:
    - Weight recent accesses higher (exponential decay)
    - Consider access regularity
    - Factor in total access count
    - Return score 0.0-1.0
*/

-- Function to predict optimal tier placement
/*
FUNCTION predict_optimal_tier(memory_id TEXT) RETURNS TEXT:
    - Analyze access patterns, content size, and context
    - Apply ML-inspired rules based on Letta framework
    - Return 'core' or 'longterm' recommendation
*/

-- Performance optimization hints
PRAGMA journal_mode = WAL; -- Better for concurrent read/write
PRAGMA synchronous = NORMAL; -- Balance between safety and performance
PRAGMA cache_size = 10000; -- Larger cache for analytics queries
PRAGMA temp_store = MEMORY; -- Use memory for temporary tables

-- Maintenance procedures (to be run periodically)
/*
PROCEDURE cleanup_old_analytics_data():
    - Remove access logs older than 90 days
    - Archive behavioral patterns for deleted memories
    - Compress performance metrics older than 30 days
    - Update aggregated statistics
*/